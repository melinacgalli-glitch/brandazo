'use strict';
/* Contactos desde los formularios de la web (coworking, contacto, newsletter).
   POST /api/v1/integrations/cafelito/contacts — misma clave y firma que el cotizador; Idempotency-Key = eventId.
   - La persona queda como contacto (sin duplicar: por WhatsApp o email) con la unidad de negocio del formulario.
   - Coworking → «Cliente» de Cafelito Work. Contacto / newsletter → «Lead» (salvo que ya fuera cliente). Nunca baja de Cliente a Lead.
   - Lo que pidió queda en tenants/{t}/contactEvents (se ve en la ficha del contacto).
   - El permiso para promociones (consent) se guarda tal cual: sin él, no entra en envíos de promociones. */
const Ajv2020 = require('ajv/dist/2020.js');
const addFormats = require('ajv-formats');
const { randomBytes } = require('node:crypto');
const { verify, sha256 } = require('./sign');
const { normalizePhoneAR } = require('./phone');
const { ApiError, errorBody, ajvDetails } = require('./eventQuotes');

const ajv = new Ajv2020({ allErrors: true, strict: false }); addFormats(ajv);
const validate = ajv.compile(require('../contract/contact.request.json'));
const UNIT = { coworking: 'Cafelito Work' };
const LABEL = { coworking: 'Web · Coworking', contacto: 'Web · Formulario de contacto', newsletter: 'Web · Newsletter', otro: 'Web · Formulario' };
const rid = p => p + randomBytes(9).toString('base64url');

async function captureCore(deps, tenantRef, body, bodyHash, now) {
  const at = deps.Timestamp.fromDate(now);
  const phone = body.contact.phone ? normalizePhoneAR(body.contact.phone) : null, email = body.contact.email ? String(body.contact.email).trim().toLowerCase() : null;
  const unit = UNIT[body.source] || null, client = body.source === 'coworking';
  const idemRef = tenantRef.collection('idempotency').doc('contact_' + body.eventId);
  const phoneRef = phone ? tenantRef.collection('contactsByPhone').doc(phone.key) : null, mailRef = email ? tenantRef.collection('contactsByEmail').doc(email) : null;
  const attribution = body.attribution || null, consent = body.consent ? { granted: !!body.consent.marketing, text: body.consent.text || null, capturedAt: body.consent.capturedAt || null, source: body.source } : null;
  const result = await deps.db.runTransaction(async tx => {
    const [idemS, byPhone, byMail] = await Promise.all([tx.get(idemRef), phoneRef ? tx.get(phoneRef) : null, mailRef ? tx.get(mailRef) : null]);
    if (idemS.exists) { const d = idemS.data(); return d.bodyHash !== bodyHash ? { conflict: true } : { replay: d.response }; }
    const cid = byPhone && byPhone.exists ? byPhone.data().contactId : byMail && byMail.exists ? byMail.data().contactId : null;
    const cRef = cid ? tenantRef.collection('contacts').doc(cid) : tenantRef.collection('contacts').doc();
    const cs = cid ? await tx.get(cRef) : null, prev = cs && cs.exists ? cs.data() : null;
    const source = { channel: LABEL[body.source], site: 'cafelito.com.ar', pageUrl: body.source_page || null, utmSource: attribution && attribution.utmSource || null, utmCampaign: attribution && attribution.utmCampaign || null };
    if (prev) {
      const tags = [...new Set([...(Array.isArray(prev.tags) ? prev.tags : []), ...(unit ? [unit] : [])])];
      tx.update(cRef, { updatedAt: at, lastWebAt: at, webCount: deps.FieldValue.increment(1), tags, ...(client && prev.type !== 'Cliente' ? { type: 'Cliente' } : {}),
        ...(email && !prev.email ? { email } : {}), ...(phone && !prev.phoneE164 && !prev.phoneRaw ? { phoneRaw: body.contact.phone, phoneE164: phone.e164, phoneDisplay: phone.display, phoneNormalized: phone.normalized } : {}),
        ...(consent ? { marketingConsent: consent } : {}) });
    } else {
      tx.set(cRef, { name: body.contact.name, phoneRaw: body.contact.phone || null, phoneE164: phone ? phone.e164 : null, phoneDisplay: phone ? phone.display : null, phoneNormalized: phone ? phone.normalized : false,
        email, brand: unit || 'Cafelito', type: client ? 'Cliente' : 'Lead', tags: unit ? [unit] : [], firstSource: { ...source, attribution, at }, marketingConsent: consent,
        quoteCount: 0, webCount: 1, lastWebAt: at, createdAt: at, updatedAt: at });
    }
    if (phoneRef && !byPhone.exists) tx.set(phoneRef, { contactId: cRef.id, createdAt: at });
    if (mailRef && !byMail.exists) tx.set(mailRef, { contactId: cRef.id, createdAt: at });
    const evRef = tenantRef.collection('contactEvents').doc();
    tx.set(evRef, { contactId: cRef.id, at, source: body.source, unit, coworking: body.coworking || null, topic: body.topic || null, message: body.message || null, attribution, eventId: body.eventId });
    const response = { status: 'created', eventId: body.eventId, contact: { id: cRef.id, match: prev ? 'existing' : 'new', type: client ? 'Cliente' : (prev ? prev.type || 'Lead' : 'Lead') } };
    tx.set(idemRef, { bodyHash, response, createdAt: at, expireAt: deps.Timestamp.fromMillis(now.getTime() + 30 * 864e5) });
    return { ok: response };
  });
  return result;
}

async function handleContactCapture(req, deps) {
  const requestId = rid('req_'), now = deps.now ? deps.now() : new Date();
  let tenantRef = null, keyId = null;
  const log = async (status, code) => { if (!tenantRef) return; try { await tenantRef.collection('integrationLog').doc(requestId).set({ at: deps.Timestamp.fromDate(now), source: 'cafelito-contactos', keyId, status, code: code || null }); } catch { /* no rompe */ } };
  try {
    if (req.method !== 'POST') throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usá POST.');
    if (!/^application\/json\b/i.test(String(req.get('content-type') || ''))) throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Falta Content-Type: application/json.');
    const raw = req.rawBody || Buffer.from(''); if (raw.length > 16 * 1024) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo supera los 16 KB.');
    keyId = req.get('x-brandazo-key-id'); const ts = req.get('x-brandazo-timestamp'), sig = req.get('x-brandazo-signature');
    if (!keyId || !ts || !sig) throw new ApiError(401, 'MISSING_SIGNATURE', 'Faltan los encabezados de firma.');
    const key = deps.keys[keyId]; if (!key || !key.secret || !key.tenantId) throw new ApiError(401, 'UNKNOWN_KEY', 'La clave no existe o está deshabilitada.');
    tenantRef = deps.db.collection('tenants').doc(key.tenantId);
    const e = verify(key.secret, ts, raw, sig, Math.floor(now.getTime() / 1000)); if (e) throw new ApiError(401, e, e === 'TIMESTAMP_OUT_OF_RANGE' ? 'Revisá el reloj del servidor.' : 'La firma no coincide con el cuerpo recibido.');
    const minute = Math.floor(now.getTime() / 60000), rl = tenantRef.collection('rateLimits').doc(`${keyId}_contact_${minute}`);
    const used = await deps.db.runTransaction(async tx => { const s = await tx.get(rl); const n = (s.exists ? s.data().n : 0) + 1; tx.set(rl, { n, expireAt: deps.Timestamp.fromMillis((minute + 2) * 60000) }); return n; });
    if (used > 60) throw new ApiError(429, 'RATE_LIMITED', 'Demasiadas solicitudes por minuto.', { retryable: true, headers: { 'Retry-After': '60' } });
    let body; try { body = JSON.parse(raw.toString('utf8')); } catch { throw new ApiError(400, 'INVALID_JSON', 'El cuerpo no es JSON válido.'); }
    const idem = req.get('idempotency-key'); if (!idem) throw new ApiError(400, 'MISSING_IDEMPOTENCY_KEY', 'Falta el encabezado Idempotency-Key.');
    if (!validate(body)) throw new ApiError(422, 'VALIDATION_FAILED', 'La solicitud tiene campos inválidos.', { details: ajvDetails(validate.errors) });
    if (idem !== body.eventId) throw new ApiError(400, 'IDEMPOTENCY_KEY_MISMATCH', 'El encabezado Idempotency-Key tiene que ser igual al eventId del cuerpo.');
    if (body.source === 'coworking' && !body.coworking) throw new ApiError(422, 'VALIDATION_FAILED', 'Falta lo que pidió.', { details: [{ field: 'coworking', issue: 'es obligatorio cuando source = coworking' }] });

    const result = await captureCore(deps, tenantRef, body, sha256(raw), now);
    if (result.conflict) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'Ese Idempotency-Key ya se usó con un cuerpo distinto.');
    if (result.replay) { await log(200, 'DUPLICATE'); return { status: 200, body: { ...result.replay, status: 'duplicate' }, headers: { 'X-Request-Id': requestId } }; }
    await log(201, null); return { status: 201, body: result.ok, headers: { 'X-Request-Id': requestId } };
  } catch (err) {
    const x = err instanceof ApiError ? err : new ApiError(500, 'INTERNAL_ERROR', 'Error interno de Brandazo. Reintentá con el mismo cuerpo e Idempotency-Key.', { retryable: true });
    if (!(err instanceof ApiError)) console.error('[contacts]', requestId, err && err.stack || err);
    await log(x.status, x.code);
    return { status: x.status, body: errorBody(x, requestId), headers: { 'X-Request-Id': requestId, ...(x.headers || {}) } };
  }
}
module.exports = { handleContactCapture, captureCore };
