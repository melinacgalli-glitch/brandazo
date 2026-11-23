'use strict';
/* Consulta de códigos de descuento desde la web (checkout).
   POST /api/v1/integrations/cafelito/coupons/check   cuerpo: {"code":"GRACIAS-7KQ4"}
   Misma firma que los pedidos (X-Brandazo-Key-Id / -Timestamp / -Signature sobre el cuerpo).
   Solo CONSULTA: no lo marca como usado. Se marca usado cuando llega el pedido pagado con ese código.
   No devuelve datos personales (ni nombre ni email de a quién se le mandó). */
const { verify } = require('./sign');
const { ApiError, errorBody } = require('./eventQuotes');
const { isoLocal } = require('./reminders');

const RATE_PER_MIN = 30;

async function handleCouponCheck(req, deps) {
  const now = deps.now ? deps.now() : new Date(), requestId = 'req_' + Math.random().toString(36).slice(2, 14);
  try {
    if (req.method !== 'POST') throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usá POST.');
    const raw = req.rawBody || Buffer.from(''); if (raw.length > 2048) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Cuerpo demasiado grande.');
    const keyId = req.get('x-brandazo-key-id'), ts = req.get('x-brandazo-timestamp'), sig = req.get('x-brandazo-signature');
    if (!keyId || !ts || !sig) throw new ApiError(401, 'MISSING_SIGNATURE', 'Faltan los encabezados de firma.');
    const key = deps.keys[keyId]; if (!key || !key.secret || !key.tenantId) throw new ApiError(401, 'UNKNOWN_KEY', 'La clave no existe o está deshabilitada.');
    const e = verify(key.secret, ts, raw, sig, Math.floor(now.getTime() / 1000)); if (e) throw new ApiError(401, e, e === 'TIMESTAMP_OUT_OF_RANGE' ? 'Revisá el reloj del servidor.' : 'La firma no coincide.');
    const T = deps.db.collection('tenants').doc(key.tenantId), minute = Math.floor(now.getTime() / 60000);
    const rl = T.collection('rateLimits').doc(`${keyId}_coupon_${minute}`);
    const used = await deps.db.runTransaction(async tx => { const s = await tx.get(rl); const n = (s.exists ? s.data().n : 0) + 1; tx.set(rl, { n, expireAt: deps.Timestamp.fromMillis((minute + 2) * 60000) }); return n; });
    if (used > RATE_PER_MIN) throw new ApiError(429, 'RATE_LIMITED', 'Demasiadas consultas por minuto.', { retryable: true, headers: { 'Retry-After': '60' } });
    let body; try { body = JSON.parse(raw.toString('utf8')); } catch { throw new ApiError(400, 'INVALID_JSON', 'El cuerpo no es JSON válido.'); }
    const code = String((body && body.code) || '').trim().toUpperCase();
    if (!/^[A-Z0-9]+-[A-Z0-9]+$/.test(code) || code.length > 40) return { status: 200, body: { code, valid: false, state: 'invalid_format' }, headers: { 'X-Request-Id': requestId } };
    const s = await T.collection('coupons').doc(code).get(); const today = isoLocal(now.getTime());
    if (!s.exists) return { status: 200, body: { code, valid: false, state: 'not_found' }, headers: { 'X-Request-Id': requestId } };
    const c = s.data(), state = c.status === 'used' ? 'used' : c.expires < today ? 'expired' : 'valid';
    return { status: 200, body: { code, valid: state === 'valid', state, percentOff: c.pct || null, expiresOn: c.expires || null }, headers: { 'X-Request-Id': requestId } };
  } catch (err) {
    const x = err instanceof ApiError ? err : new ApiError(500, 'INTERNAL_ERROR', 'Error interno de Brandazo. Reintentá.', { retryable: true });
    if (!(err instanceof ApiError)) console.error('[coupons]', requestId, err && err.stack || err);
    return { status: x.status, body: errorBody(x, requestId), headers: { 'X-Request-Id': requestId, ...(x.headers || {}) } };
  }
}
module.exports = { handleCouponCheck };
