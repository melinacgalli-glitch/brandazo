'use strict';
/* Servidor de Brandazo (Firebase Cloud Functions, 2.ª generación).
   Única función HTTP «api», servida también por Hosting en /api/v1/**.
   Las claves de integración viven en Secret Manager (INTEGRATION_KEYS): nunca en el código ni en el repositorio. */
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getAuth } = require('firebase-admin/auth');
const { handleEventQuote, loadKeys } = require('./src/eventQuotes');
const conn = require('./src/connections');
const reminders = require('./src/reminders');
const account = require('./src/account');

initializeApp();
const INTEGRATION_KEYS = defineSecret('INTEGRATION_KEYS');
// Conexiones con Meta y Google Ads: JSON en Secret Manager (ver docs/conexiones.md)
const META_APP = defineSecret('META_APP');
const GOOGLE_ADS = defineSecret('GOOGLE_ADS');
// Envío de mails (Resend): {"apiKey","from"}. Ver docs/recordatorios.md
const RESEND = defineSecret('RESEND');

exports.api = onRequest({ region: 'southamerica-east1', secrets: [INTEGRATION_KEYS], cors: false, maxInstances: 5, timeoutSeconds: 30, memory: '256MiB' }, async (req, res) => {
  const path = req.path.replace(/\/+$/, '');
  if (path !== '/api/v1/integrations/cafelito/event-quotes' && path !== '/v1/integrations/cafelito/event-quotes') {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta inexistente.', requestId: 'req_sin_ruta', retryable: false } }); return;
  }
  const out = await handleEventQuote(req, {
    db: getFirestore(), FieldValue, Timestamp,
    keys: loadKeys(INTEGRATION_KEYS.value())
  });
  res.set(out.headers || {}).status(out.status).json(out.body);
});

/* Conexiones reales: Meta (Instagram y Facebook) y Google Ads. Hosting: /api/v1/connect/** */
const connDeps = () => ({
  db: getFirestore(), Timestamp, fetch: globalThis.fetch, now: () => Date.now(), env: process.env,
  verifyIdToken: t => getAuth().verifyIdToken(t),
  meta: conn.parseCfg(META_APP.value()), ads: conn.parseCfg(GOOGLE_ADS.value())
});
exports.conexiones = onRequest({ region: 'southamerica-east1', secrets: [META_APP, GOOGLE_ADS], cors: [/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/], maxInstances: 3, timeoutSeconds: 120, memory: '256MiB' }, async (req, res) => {
  await conn.handleConnect(req, res, connDeps());
});
// Todos los días a las 6 de la mañana (Córdoba) se actualizan redes y anuncios
exports.sincronizarConexiones = onSchedule({ schedule: '0 6 * * *', timeZone: 'America/Argentina/Cordoba', region: 'southamerica-east1', secrets: [META_APP, GOOGLE_ADS], timeoutSeconds: 540, memory: '256MiB', retryCount: 1 }, async () => {
  const r = await conn.syncAll(connDeps());
  console.log('[conexiones] sincronización diaria', JSON.stringify(r));
});

// Recordatorios de seguimiento del CRM: todos los días a las 8 (Córdoba), un mail por responsable
exports.recordatoriosSeguimiento = onSchedule({ schedule: '0 8 * * *', timeZone: 'America/Argentina/Cordoba', region: 'southamerica-east1', secrets: [RESEND], timeoutSeconds: 300, memory: '256MiB', retryCount: 1 }, async () => {
  const r = await reminders.sendReminders({ db: getFirestore(), Timestamp, fetch: globalThis.fetch, now: () => Date.now(), resend: reminders.parseCfg(RESEND.value()) });
  console.log('[recordatorios]', JSON.stringify(r.map(x => ({ ...x, email: x.email ? x.email.replace(/^(.).*@/, '$1…@') : '' }))));
});

// Mails de cuenta con la marca Brandazo (recuperar contraseña, verificar email). Hosting: /api/v1/cuenta/**
exports.cuenta = onRequest({ region: 'southamerica-east1', secrets: [RESEND], cors: [/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/], maxInstances: 3, timeoutSeconds: 30, memory: '256MiB' }, async (req, res) => {
  await account.handleAccount(req, res, { db: getFirestore(), Timestamp, auth: getAuth(), fetch: globalThis.fetch, now: () => Date.now(),
    resend: reminders.parseCfg(RESEND.value()), resendUrl: process.env.FUNCTIONS_EMULATOR ? process.env.RESEND_URL : undefined });
});
