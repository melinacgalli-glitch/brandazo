'use strict';
/* Servidor de Brandazo (Firebase Cloud Functions, 2.ª generación).
   Única función HTTP «api», servida también por Hosting en /api/v1/**.
   Las claves de integración viven en Secret Manager (INTEGRATION_KEYS): nunca en el código ni en el repositorio. */
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { handleEventQuote, loadKeys } = require('./src/eventQuotes');

initializeApp();
const INTEGRATION_KEYS = defineSecret('INTEGRATION_KEYS');

exports.api = onRequest({ region: 'southamerica-east1', secrets: [INTEGRATION_KEYS], cors: false, maxInstances: 5, timeoutSeconds: 30, memory: '256MiB' }, async (req, res) => {
  const path = req.path.replace(/\/+$/, '');
  if (path !== '/api/v1/integrations/cafelito/event-quotes' && path !== '/v1/integrations/cafelito/event-quotes') {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta inexistente.', requestId: 'req_sin_ruta', retryable: false } }); return;
  }
  const out = await handleEventQuote(req, {
    db: getFirestore(), FieldValue, Timestamp,
    keys: loadKeys(INTEGRATION_KEYS.value()),
    staging: process.env.BRANDAZO_ENV === 'staging' || process.env.FUNCTIONS_EMULATOR === 'true'
  });
  res.set(out.headers || {}).status(out.status).json(out.body);
});
