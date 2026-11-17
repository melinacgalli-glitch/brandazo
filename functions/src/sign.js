'use strict';
// Firma HMAC-SHA256 del contrato: «v1=» + hex(HMAC(secreto, `${timestamp}.${cuerpo crudo}`)).
const { createHmac, timingSafeEqual, createHash } = require('node:crypto');

const TOLERANCE_S = 300;

function sign(secret, timestamp, rawBody) {
  return 'v1=' + createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex');
}

/** Devuelve null si es válida, o el código de error del contrato. */
function verify(secret, timestamp, rawBody, signature, nowS = Math.floor(Date.now() / 1000)) {
  if (!/^\d{10}$/.test(String(timestamp || '')) || Math.abs(nowS - Number(timestamp)) > TOLERANCE_S) return 'TIMESTAMP_OUT_OF_RANGE';
  const expected = Buffer.from(sign(secret, timestamp, rawBody));
  const got = Buffer.from(String(signature || ''));
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return 'INVALID_SIGNATURE';
  return null;
}

const sha256 = buf => createHash('sha256').update(buf).digest('hex');

module.exports = { sign, verify, sha256, TOLERANCE_S };
