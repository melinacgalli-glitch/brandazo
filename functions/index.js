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
const availability = require('./src/availability');
const { handleShopOrder } = require('./src/shopOrders');
const { handleManual } = require('./src/crmManual');

initializeApp();
const INTEGRATION_KEYS = defineSecret('INTEGRATION_KEYS');
// Conexiones con Meta y Google Ads: JSON en Secret Manager (ver docs/conexiones.md)
const META_APP = defineSecret('META_APP');
const GOOGLE_ADS = defineSecret('GOOGLE_ADS');
// Envío de mails (Resend): {"apiKey","from"}. Ver docs/recordatorios.md
const RESEND = defineSecret('RESEND');

// CORS solo para pruebas locales; en producción la app llama por el mismo dominio (Hosting)
exports.api = onRequest({ region: 'southamerica-east1', secrets: [INTEGRATION_KEYS, RESEND], cors: [/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/], maxInstances: 5, timeoutSeconds: 30, memory: '256MiB' }, async (req, res) => {
  const path = req.path.replace(/\/+$/, '');
  if (/\/integrations\/cafelito\/availability$/.test(path)) { // fechas no disponibles para el calendario del cotizador
    const out = await availability.handleAvailability(req, { db: getFirestore(), keys: loadKeys(INTEGRATION_KEYS.value()), now: () => new Date() });
    res.set(out.headers || {}).status(out.status).json(out.body); return;
  }
  if (/\/integrations\/cafelito\/coupons\/check$/.test(path)) { // la web consulta si un código de descuento sirve
    const out = await require('./src/couponApi').handleCouponCheck(req, { db: getFirestore(), Timestamp, keys: loadKeys(INTEGRATION_KEYS.value()) });
    res.set(out.headers || {}).status(out.status).json(out.body); return;
  }
  if (/\/crm\/manual$/.test(path)) { // carga manual de contactos y pedidos de presupuesto (miembros con sesión)
    const out = await handleManual(req, { db: getFirestore(), FieldValue, Timestamp, verifyIdToken: t => getAuth().verifyIdToken(t), fetch: globalThis.fetch, resend: reminders.parseCfg(RESEND.value()) });
    res.status(out.status).json(out.body); return;
  }
  if (/\/integrations\/cafelito\/shop-orders$/.test(path)) { // pedidos de la tienda online (Cafelito Cakes)
    const out = await handleShopOrder(req, { db: getFirestore(), FieldValue, Timestamp, keys: loadKeys(INTEGRATION_KEYS.value()) });
    res.set(out.headers || {}).status(out.status).json(out.body); return;
  }
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

// Planificaciones de contenido: recordatorio diario a quien produce y aviso a quien aprueba cuando está todo terminado.
// Corre cada hora de 8 a 21 (Córdoba): el recordatorio sale una vez por día; el aviso de «terminado», una sola vez.
exports.avisosPlanificacion = onSchedule({ schedule: '0 8-21 * * *', timeZone: 'America/Argentina/Cordoba', region: 'southamerica-east1', secrets: [RESEND], timeoutSeconds: 300, memory: '256MiB', retryCount: 1 }, async () => {
  const r = await require('./src/planAlerts').sendPlanAlerts({ db: getFirestore(), Timestamp, fetch: globalThis.fetch, now: () => Date.now(), resend: reminders.parseCfg(RESEND.value()) });
  console.log('[planificaciones]', JSON.stringify(r.map(x => ({ ...x, to: x.to ? x.to.replace(/^(.).*@/, '$1…@') : undefined, sent: x.sent ? x.sent.replace(/^(.).*@/, '$1…@') : undefined }))));
});

// Automatizaciones reales (mail de primera compra con código de descuento). Cada hora de 8 a 21 (Córdoba).
exports.automatizaciones = onSchedule({ schedule: '15 8-21 * * *', timeZone: 'America/Argentina/Cordoba', region: 'southamerica-east1', secrets: [RESEND], timeoutSeconds: 300, memory: '256MiB', retryCount: 1 }, async () => {
  const r = await require('./src/automations').runAutomations({ db: getFirestore(), Timestamp, fetch: globalThis.fetch, now: () => Date.now(), resend: reminders.parseCfg(RESEND.value()) });
  console.log('[automatizaciones]', JSON.stringify(r.map(x => ({ ...x, sent: x.sent ? x.sent.replace(/^(.).*@/, '$1…@') : undefined }))));
});

// Mails de cuenta con la marca Brandazo (recuperar contraseña, verificar email). Hosting: /api/v1/cuenta/**
exports.cuenta = onRequest({ region: 'southamerica-east1', secrets: [RESEND], cors: [/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/], maxInstances: 3, timeoutSeconds: 30, memory: '256MiB' }, async (req, res) => {
  await account.handleAccount(req, res, { db: getFirestore(), Timestamp, auth: getAuth(), fetch: globalThis.fetch, now: () => Date.now(),
    resend: reminders.parseCfg(RESEND.value()), resendUrl: process.env.FUNCTIONS_EMULATOR ? process.env.RESEND_URL : undefined });
});
