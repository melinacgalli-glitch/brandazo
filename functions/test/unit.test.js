'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { normalizePhoneAR } = require('../src/phone');
const { sign, verify } = require('../src/sign');
const { recalcular } = require('../src/estimate');

const DOCS = path.join(__dirname, '../../docs/integraciones/cafelito-cotizador');

test('teléfonos argentinos → formato internacional de WhatsApp', () => {
  const casos = [
    ['351 555-0142', '+5493515550142'],
    ['+54 9 351 555-0142', '+5493515550142'],
    ['0351 15 555-0142', '+5493515550142'],
    ['(0351) 155550142', '+5493515550142'],
    ['54 351 5550142', '+5493515550142'],
    ['0054 9 351 555 0142', '+5493515550142'],
    ['11 5555-0142', '+5491155550142'],
    ['011 15 5555 0142', '+5491155550142'],
    ['+54 9 3543 55-0142', '+5493543550142']
  ];
  for (const [raw, e164] of casos) assert.equal(normalizePhoneAR(raw).e164, e164, raw);
  assert.equal(normalizePhoneAR('351 555-0142').display, '+54 9 351 555-0142');
  const malo = normalizePhoneAR('555-0142');
  assert.equal(malo.normalized, false);
  assert.match(malo.key, /^raw-/);
});

test('firma HMAC: coincide con el vector de prueba publicado en el contrato', () => {
  const c = '{"schemaVersion":"1.0","quoteId":"5b0f9c1e-8a2d-4c3b-9f1e-2d7a6c4b8e10"}';
  const s = sign('brz_test_secreto_SOLO_PARA_VERIFICAR_LA_FIRMA', 1795000000, Buffer.from(c));
  assert.equal(s, 'v1=fbb1e23abadfa3e9d628c4e34036c55250196ad1366058b059624eaed4fadc91');
  assert.equal(verify('brz_test_secreto_SOLO_PARA_VERIFICAR_LA_FIRMA', '1795000000', Buffer.from(c), s, 1795000100), null);
  assert.equal(verify('otro', '1795000000', Buffer.from(c), s, 1795000100), 'INVALID_SIGNATURE');
  assert.equal(verify('brz_test_secreto_SOLO_PARA_VERIFICAR_LA_FIRMA', '1795000000', Buffer.from(c), s, 1795000301), 'TIMESTAMP_OUT_OF_RANGE');
  assert.equal(verify('brz_test_secreto_SOLO_PARA_VERIFICAR_LA_FIRMA', '1795000000', Buffer.from(c + ' '), s, 1795000100), 'INVALID_SIGNATURE');
});

test('presupuesto: mismo resultado que el ejemplo del contrato y reglas de la web', () => {
  const ej = JSON.parse(readFileSync(path.join(DOCS, 'ejemplos/solicitud-completa.json'), 'utf8'));
  assert.equal(recalcular(ej).subtotalMinor, ej.estimate.subtotalMinor);
  assert.equal(recalcular(ej).subtotalMinor, 142000000);
  const min = JSON.parse(readFileSync(path.join(DOCS, 'ejemplos/solicitud-minima.json'), 'utf8'));
  assert.equal(recalcular(min).subtotalMinor, 67000000);
  const jarabe = { ...min, selection: { ...min.selection, addonIds: ['jarabe'] } };
  assert.equal(recalcular(jarabe).warnings[0].code, 'ADDON_NOT_IN_PLAN');
});

test('el servidor usa exactamente los mismos esquemas y tarifas que el contrato publicado', () => {
  for (const f of ['event-quote.request.json', 'event-quote.response.json', 'error.json']) {
    assert.equal(readFileSync(path.join(__dirname, '../contract', f), 'utf8'), readFileSync(path.join(DOCS, 'schemas', f), 'utf8'), f);
  }
  assert.equal(readFileSync(path.join(__dirname, '../contract/web-2026-11.json'), 'utf8'), readFileSync(path.join(DOCS, 'tarifas/web-2026-11.json'), 'utf8'));
});
