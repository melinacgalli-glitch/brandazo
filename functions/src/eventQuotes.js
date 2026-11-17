'use strict';
/* Recepción de cotizaciones de Cafelito Ambulante (contrato docs/integraciones/cafelito-cotizador).
   Todo lo que se crea (cotización, contacto, oportunidad, tarea, aviso, auditoría y registro de idempotencia)
   se escribe en UNA transacción de Firestore: o queda todo guardado, o no queda nada. La respuesta de éxito
   se devuelve solo después de confirmar la transacción. */
const Ajv2020 = require('ajv/dist/2020.js');
const addFormats = require('ajv-formats');
const { randomBytes } = require('node:crypto');
const { verify, sha256 } = require('./sign');
const { normalizePhoneAR } = require('./phone');
const { recalcular } = require('./estimate');

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateRequest = ajv.compile(require('../contract/event-quote.request.json'));

const MAX_BYTES = 32 * 1024;
const RATE_PER_MIN = 60;
const IDEM_DAYS = 30;
const TZ = 'America/Argentina/Cordoba';
const PIPELINE = {
  id: 'cafelito-eventos', name: 'Cafelito Eventos',
  stages: [['nueva-cotizacion', 'Nueva cotización'], ['contactado', 'Contactado'], ['propuesta-enviada', 'Propuesta enviada'], ['en-negociacion', 'En negociación'], ['ganada', 'Ganada'], ['perdida', 'Perdida']]
};

const rid = (prefix, n = 20) => { const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; const b = randomBytes(n); let s = ''; for (const x of b) s += a[x % a.length]; return prefix + s; };
const todayInTZ = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);

class ApiError extends Error {
  constructor(status, code, message, { retryable = false, details, headers } = {}) { super(message); Object.assign(this, { status, code, retryable, details, headers }); }
}
const errorBody = (e, requestId) => ({ error: { code: e.code, message: e.message, requestId, retryable: !!e.retryable, ...(e.details ? { details: e.details } : {}) } });

function ajvDetails(errors) {
  return (errors || []).slice(0, 20).map(e => {
    const path = (e.instancePath || '').replace(/^\//, '').replace(/\//g, '.');
    let field = path, issue = e.message;
    if (e.keyword === 'required') { field = (path ? path + '.' : '') + e.params.missingProperty; issue = 'es obligatorio'; }
    else if (e.keyword === 'additionalProperties') { field = (path ? path + '.' : '') + e.params.additionalProperty; issue = 'campo no definido en el contrato'; }
    else if (e.keyword === 'minimum') issue = `debe ser al menos ${e.params.limit}`;
    else if (e.keyword === 'maximum') issue = `debe ser como máximo ${e.params.limit}`;
    else if (e.keyword === 'enum') issue = 'valor no permitido';
    else if (e.keyword === 'format') issue = `formato inválido (${e.params.format})`;
    else if (e.keyword === 'pattern') issue = 'formato inválido';
    else if (e.keyword === 'type') issue = `debe ser ${e.params.type}`;
    else if (e.keyword === 'maxLength') issue = `debe tener como máximo ${e.params.limit} caracteres`;
    else if (e.keyword === 'minLength') issue = `debe tener al menos ${e.params.limit} caracter${e.params.limit > 1 ? 'es' : ''}`;
    return { field: field || '(cuerpo)', issue };
  });
}

/** Lee las claves de integración: JSON {"<keyId>": {"secret","tenantId","brand","test"}} guardado en Secret Manager.
    «test: true» = clave de pruebas: escribe en una empresa ficticia y habilita la falla simulada. */
function loadKeys(raw) { try { const k = JSON.parse(raw || '{}'); return k && typeof k === 'object' ? k : {}; } catch { return {}; } }

/**
 * Procesa una solicitud HTTP. `deps` = { db, FieldValue, Timestamp, keys, staging, now }.
 * Devuelve { status, body, headers }.
 */
async function handleEventQuote(req, deps) {
  const requestId = rid('req_', 12);
  const now = deps.now ? deps.now() : new Date();
  let tenantRef = null, keyId = null, quoteId = null;
  const log = async (status, code) => {
    if (!tenantRef) return;
    try { await tenantRef.collection('integrationLog').doc(requestId).set({ at: deps.Timestamp.fromDate(now), source: 'cafelito-cotizador', keyId, quoteId, status, code: code || null }); } catch { /* el registro técnico no debe romper la respuesta */ }
  };
  try {
    if (req.method !== 'POST') throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usá POST.');
    const ct = String(req.get('content-type') || '');
    if (!/^application\/json\b/i.test(ct)) throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Falta Content-Type: application/json.');
    const raw = req.rawBody || Buffer.from('');
    if (raw.length > MAX_BYTES) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo supera los 32 KB.');

    // Autenticación
    keyId = req.get('x-brandazo-key-id'); const ts = req.get('x-brandazo-timestamp'), sig = req.get('x-brandazo-signature');
    if (!keyId || !ts || !sig) throw new ApiError(401, 'MISSING_SIGNATURE', 'Faltan los encabezados de firma (X-Brandazo-Key-Id, X-Brandazo-Timestamp, X-Brandazo-Signature).');
    const key = deps.keys[keyId];
    if (!key || !key.secret || !key.tenantId) throw new ApiError(401, 'UNKNOWN_KEY', 'La clave indicada en X-Brandazo-Key-Id no existe o está deshabilitada.');
    tenantRef = deps.db.collection('tenants').doc(key.tenantId);
    const sigErr = verify(key.secret, ts, raw, sig, Math.floor(now.getTime() / 1000));
    if (sigErr === 'TIMESTAMP_OUT_OF_RANGE') throw new ApiError(401, sigErr, 'El timestamp tiene más de 5 minutos de diferencia con la hora de Brandazo. Revisá el reloj del servidor.');
    if (sigErr) throw new ApiError(401, sigErr, 'La firma no coincide con el cuerpo recibido.');

    // Solo en pruebas: simular una caída para probar los reintentos
    if (key.test === true && req.get('x-brandazo-test-fail') === '503') throw new ApiError(503, 'UNAVAILABLE', 'Falla simulada (solo en pruebas). Reintentá.', { retryable: true });

    // Límite de uso por clave (por minuto)
    const minute = Math.floor(now.getTime() / 60000);
    const rlRef = tenantRef.collection('rateLimits').doc(`${keyId}_${minute}`);
    const used = await deps.db.runTransaction(async tx => { const s = await tx.get(rlRef); const n = (s.exists ? s.data().n : 0) + 1; tx.set(rlRef, { n, expireAt: deps.Timestamp.fromMillis((minute + 2) * 60000) }); return n; });
    if (used > RATE_PER_MIN) throw new ApiError(429, 'RATE_LIMITED', 'Demasiadas solicitudes por minuto con esta clave.', { retryable: true, headers: { 'Retry-After': String(60 - (Math.floor(now.getTime() / 1000) % 60)) } });

    // Formato
    let body; try { body = JSON.parse(raw.toString('utf8')); } catch { throw new ApiError(400, 'INVALID_JSON', 'El cuerpo no es JSON válido.'); }
    const idemKey = req.get('idempotency-key');
    if (!idemKey) throw new ApiError(400, 'MISSING_IDEMPOTENCY_KEY', 'Falta el encabezado Idempotency-Key.');
    if (!validateRequest(body)) throw new ApiError(422, 'VALIDATION_FAILED', 'La solicitud tiene campos inválidos.', { details: ajvDetails(validateRequest.errors) });
    quoteId = body.quoteId;
    if (idemKey !== body.quoteId) throw new ApiError(400, 'IDEMPOTENCY_KEY_MISMATCH', 'El encabezado Idempotency-Key tiene que ser igual al quoteId del cuerpo.');
    const today = todayInTZ(now);
    if (body.event.date < today) throw new ApiError(422, 'EVENT_DATE_IN_PAST', 'La fecha del evento ya pasó.', { details: [{ field: 'event.date', issue: `es anterior a hoy (${today})` }] });

    const bodyHash = sha256(raw);
    const phone = normalizePhoneAR(body.contact.phone);
    const est = recalcular(body);
    const warnings = [...est.warnings];
    if (daysBetween(today, body.event.date) < 7) warnings.push({ code: 'SHORT_NOTICE', field: 'event.date', message: 'El evento es en menos de 7 días.' });
    if (!phone.normalized) warnings.push({ code: 'PHONE_NOT_NORMALIZED', field: 'contact.phone', message: 'No se pudo llevar el teléfono a formato internacional: revisarlo a mano.' });
    const estimateStatus = !body.estimate ? 'not_sent' : body.estimate.subtotalMinor === est.subtotalMinor ? 'match' : 'mismatch';
    if (estimateStatus === 'mismatch') warnings.push({ code: 'ESTIMATE_MISMATCH', field: 'estimate.subtotalMinor', message: `La web informó ${body.estimate.subtotalMinor} y Brandazo calcula ${est.subtotalMinor} (centavos, sin IVA).` });
    if (/https?:\/\/|www\./i.test(body.notes || '') || /https?:\/\//i.test(body.contact.name)) warnings.push({ code: 'POSSIBLE_SPAM', field: 'notes', message: 'El pedido tiene enlaces: revisar antes de contactar.' });

    const idemRef = tenantRef.collection('idempotency').doc(body.quoteId);
    const phoneRef = tenantRef.collection('contactsByPhone').doc(phone.key);
    const settingsRef = tenantRef.collection('settings').doc('cafelito-eventos');
    const pipelineRef = tenantRef.collection('pipelines').doc(PIPELINE.id);
    const at = deps.Timestamp.fromDate(now);

    const result = await deps.db.runTransaction(async tx => {
      const warns = warnings.map(w => ({ ...w })); // copia: la transacción puede reintentarse
      const [idem, byPhone, settingsSnap, pipeSnap] = await Promise.all([tx.get(idemRef), tx.get(phoneRef), tx.get(settingsRef), tx.get(pipelineRef)]);
      if (idem.exists) {
        const d = idem.data();
        if (d.bodyHash !== bodyHash) return { conflict: true };
        return { replay: d.response };
      }
      let contactRef, contact = null;
      if (byPhone.exists) { contactRef = tenantRef.collection('contacts').doc(byPhone.data().contactId); const cs = await tx.get(contactRef); contact = cs.exists ? cs.data() : null; }
      const settings = settingsSnap.exists ? settingsSnap.data() : {};
      const owner = (settings.assignByEventType || {})[body.event.type] || settings.defaultOwner || '';
      const followHours = Number(settings.followUpHours) > 0 ? Number(settings.followUpHours) : 24;
      const brand = settings.brand || key.brand || 'Cafelito Ambulante'; // la marca elegida en Brandazo manda sobre la de la clave
      const receiptId = rid('brz_q_');
      const oppRef = tenantRef.collection('opportunities').doc();
      const quoteRef = tenantRef.collection('eventQuotes').doc(receiptId);
      const taskRef = tenantRef.collection('tasks').doc();
      const match = contact ? 'existing' : 'new';
      if (!contact) contactRef = tenantRef.collection('contacts').doc();

      // Spam: mismo teléfono con muchas cotizaciones en 24 h
      const recent = ((contact && contact.recentQuotes) || []).filter(t => now.getTime() - t < 864e5);
      if (recent.length >= 5) warns.push({ code: 'POSSIBLE_SPAM', field: 'contact.phone', message: 'El mismo teléfono envió muchos pedidos en 24 h.' });

      const attribution = body.attribution || null;
      const source = { channel: 'Web · Cotizador Cafelito Ambulante', site: (body.source && body.source.site) || 'cafelito.com.ar', pageUrl: (body.source && body.source.pageUrl) || null, utmSource: attribution && attribution.utmSource || null, utmCampaign: attribution && attribution.utmCampaign || null };
      const response = {
        status: 'created', receiptId, quoteId: body.quoteId, receivedAt: now.toISOString(),
        contact: { id: contactRef.id, match },
        opportunity: { id: oppRef.id, pipeline: PIPELINE.id, stage: 'nueva-cotizacion' },
        estimate: { status: estimateStatus, tariffVersion: est.tariffVersion, subtotalMinor: est.subtotalMinor, currency: 'ARS' },
        warnings: warns
      };

      if (!pipeSnap.exists) tx.set(pipelineRef, { name: PIPELINE.name, stages: PIPELINE.stages.map(([id, name], i) => ({ id, name, order: i })), createdAt: at });
      if (contact) {
        tx.update(contactRef, { updatedAt: at, quoteCount: deps.FieldValue.increment(1), lastQuoteAt: at, recentQuotes: [...recent, now.getTime()].slice(-10), ...(body.contact.email && !contact.email ? { email: body.contact.email } : {}) });
      } else {
        tx.set(contactRef, {
          name: body.contact.name, phoneRaw: body.contact.phone, phoneE164: phone.e164, phoneDisplay: phone.display, phoneNormalized: phone.normalized,
          email: body.contact.email || null, brand, type: 'Lead', tags: ['Cafelito Ambulante'],
          firstSource: { ...source, attribution, at }, // origen histórico: se guarda una sola vez
          marketingConsent: body.consent ? { granted: !!body.consent.marketing, text: body.consent.text || null, capturedAt: body.consent.capturedAt || null, receiptId } : null,
          quoteCount: 1, lastQuoteAt: at, recentQuotes: [now.getTime()], createdAt: at, updatedAt: at
        });
        tx.set(phoneRef, { contactId: contactRef.id, createdAt: at });
      }
      if (contact && body.consent) tx.update(contactRef, { marketingConsent: { granted: !!body.consent.marketing, text: body.consent.text || null, capturedAt: body.consent.capturedAt || null, receiptId } });

      const ev = body.event;
      tx.set(oppRef, {
        pipeline: PIPELINE.id, stage: 'nueva-cotizacion', title: `${ev.type} · ${body.contact.name} · ${ev.date}`,
        contactId: contactRef.id, receiptId, quoteId: body.quoteId, brand, owner,
        event: { ...ev, endTime: null }, selection: body.selection, dietary: body.dietary || [], notes: body.notes || '',
        estimate: { status: estimateStatus, tariffVersion: est.tariffVersion, brandazoSubtotalMinor: est.subtotalMinor, webSubtotalMinor: body.estimate ? body.estimate.subtotalMinor : null, lines: est.lines, currency: 'ARS', taxIncluded: false, transfer: est.transfer, validated: false },
        source, attribution, warnings: warns.map(w => w.code), lostReason: null,
        nextFollowUpAt: deps.Timestamp.fromMillis(now.getTime() + followHours * 36e5), createdAt: at, updatedAt: at
      });
      tx.set(quoteRef, { quoteId: body.quoteId, receivedAt: at, submittedAt: body.submittedAt, keyId, contactId: contactRef.id, opportunityId: oppRef.id, payload: body, bodyHash, estimate: response.estimate, warnings: warns, attribution, consent: body.consent || null });
      tx.set(taskRef, { type: 'primer-contacto', title: `Primer contacto: ${body.contact.name}`, opportunityId: oppRef.id, contactId: contactRef.id, assignee: owner, dueAt: deps.Timestamp.fromMillis(now.getTime() + followHours * 36e5), status: 'pendiente', createdAt: at });
      tx.set(tenantRef.collection('notifications').doc(), { title: 'Nueva cotización de Cafelito Ambulante', body: `${body.contact.name} · ${ev.type} · ${ev.date} · ${ev.guests} invitados`, opportunityId: oppRef.id, to: owner || null, unread: true, createdAt: at });
      tx.set(tenantRef.collection('audit').doc(), { at, by: `integración:${keyId}`, action: 'cotizacion-recibida', opportunityId: oppRef.id, contactId: contactRef.id, receiptId });
      tx.set(idemRef, { bodyHash, response, createdAt: at, expireAt: deps.Timestamp.fromMillis(now.getTime() + IDEM_DAYS * 864e5) });
      return { created: response };
    });

    if (result.conflict) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'Ese Idempotency-Key ya se usó con un cuerpo distinto.');
    if (result.replay) { await log(200, 'DUPLICATE'); return { status: 200, body: { ...result.replay, status: 'duplicate' }, headers: { 'Idempotent-Replayed': 'true', 'X-Request-Id': requestId } }; }
    await log(201, null);
    return { status: 201, body: result.created, headers: { 'X-Request-Id': requestId } };
  } catch (e) {
    const err = e instanceof ApiError ? e : new ApiError(500, 'INTERNAL_ERROR', 'Error interno de Brandazo. Reintentá con el mismo cuerpo e Idempotency-Key.', { retryable: true });
    if (!(e instanceof ApiError)) console.error('[event-quotes]', requestId, e && e.stack || e); // sin el cuerpo: datos personales
    await log(err.status, err.code);
    return { status: err.status, body: errorBody(err, requestId), headers: { 'X-Request-Id': requestId, ...(err.headers || {}) } };
  }
}

module.exports = { handleEventQuote, loadKeys, ApiError, PIPELINE, todayInTZ };
