'use strict';
// Pruebas de punta a punta contra los emuladores de Functions y Firestore (nada real).
// Ejecutar: npm run test:emulador   (requiere functions/.secret.local con una clave de pruebas)
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const Ajv2020 = require('ajv/dist/2020.js');
const addFormats = require('ajv-formats');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { sign } = require('../src/sign');

const KEYS = JSON.parse(readFileSync(path.join(__dirname, '../.secret.local'), 'utf8').replace(/^INTEGRATION_KEYS=/, '').trim());
const KEY_ID = 'cafelito-web-test', SECRET = KEYS[KEY_ID].secret, TENANT = KEYS[KEY_ID].tenantId;
const URL = 'http://127.0.0.1:5001/demo-brandazo/southamerica-east1/api/api/v1/integrations/cafelito/event-quotes';
const DOCS = path.join(__dirname, '../../docs/integraciones/cafelito-cotizador');
initializeApp({ projectId: 'demo-brandazo' });
const db = getFirestore();
const T = db.collection('tenants').doc(TENANT);

const ajv = new Ajv2020({ allErrors: true, strict: false }); addFormats(ajv);
const vOk = ajv.compile(require('../contract/event-quote.response.json'));
const vErr = ajv.compile(require('../contract/error.json'));

const futuro = d => { const x = new Date(Date.now() + d * 864e5); return x.toISOString().slice(0, 10); };
function ejemplo(nombre, cambios = {}) {
  const q = JSON.parse(readFileSync(path.join(DOCS, 'ejemplos', nombre), 'utf8'));
  q.quoteId = randomUUID(); q.event.date = futuro(30);
  return Object.assign(q, cambios);
}
async function enviar(body, { secret = SECRET, ts = Math.floor(Date.now() / 1000), idem, headers = {}, raw } = {}) {
  const cuerpo = raw != null ? raw : JSON.stringify(body);
  const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Brandazo-Key-Id': KEY_ID, 'X-Brandazo-Timestamp': String(ts), 'X-Brandazo-Signature': sign(secret, ts, Buffer.from(cuerpo)), 'Idempotency-Key': idem != null ? idem : (body && body.quoteId), ...headers }, body: cuerpo });
  return { status: res.status, body: await res.json(), headers: res.headers };
}
const okSchema = r => assert.ok(vOk(r.body), JSON.stringify(vOk.errors));
const errSchema = r => assert.ok(vErr(r.body), JSON.stringify(vErr.errors));

test('procedimiento de validación del contrato (pasos 2 a 9) y lo que queda guardado', async t => {
  let primera, q1;
  await t.test('2 · solicitud mínima → 201, contacto nuevo, oportunidad en Nueva cotización', async () => {
    q1 = ejemplo('solicitud-minima.json');
    primera = await enviar(q1);
    assert.equal(primera.status, 201, JSON.stringify(primera.body)); okSchema(primera);
    assert.equal(primera.body.contact.match, 'new');
    assert.equal(primera.body.opportunity.pipeline, 'cafelito-eventos');
    assert.equal(primera.body.estimate.status, 'not_sent');
    assert.equal(primera.body.estimate.subtotalMinor, 67000000);
    const opp = (await T.collection('opportunities').doc(primera.body.opportunity.id).get()).data();
    assert.equal(opp.stage, 'nueva-cotizacion'); assert.equal(opp.event.guests, 60); assert.equal(opp.selection.wantsCake, true);
    const c = (await T.collection('contacts').doc(primera.body.contact.id).get()).data();
    assert.equal(c.phoneE164, '+5493515550142'); assert.equal(c.name, 'Lucía Ferreyra');
    const tareas = await T.collection('tasks').where('opportunityId', '==', primera.body.opportunity.id).get();
    assert.equal(tareas.size, 1); assert.equal(tareas.docs[0].data().type, 'primer-contacto');
    const pipe = (await T.collection('pipelines').doc('cafelito-eventos').get()).data();
    assert.deepEqual(pipe.stages.map(s => s.name), ['Nueva cotización', 'Contactado', 'Propuesta enviada', 'En negociación', 'Ganada', 'Perdida']);
  });
  await t.test('3 · reenvío de la misma solicitud → 200 duplicada, mismo receiptId, sin duplicar nada', async () => {
    const antes = (await T.collection('opportunities').get()).size;
    const r = await enviar(q1);
    assert.equal(r.status, 200); okSchema(r);
    assert.equal(r.body.status, 'duplicate'); assert.equal(r.body.receiptId, primera.body.receiptId);
    assert.equal(r.headers.get('idempotent-replayed'), 'true');
    assert.equal((await T.collection('opportunities').get()).size, antes);
  });
  await t.test('3b · 5 reenvíos simultáneos no duplican', async () => {
    const q = ejemplo('solicitud-minima.json', { contact: { name: 'Simultáneo', phone: '351 444-1111' } });
    const rs = await Promise.all(Array.from({ length: 5 }, () => enviar(q)));
    assert.deepEqual(rs.map(r => r.status).sort(), [200, 200, 200, 200, 201]);
    assert.equal(new Set(rs.map(r => r.body.receiptId)).size, 1);
    const opps = await T.collection('opportunities').where('quoteId', '==', q.quoteId).get();
    assert.equal(opps.size, 1);
  });
  await t.test('4 · mismo quoteId con otro cuerpo → 409 IDEMPOTENCY_CONFLICT', async () => {
    const r = await enviar({ ...q1, notes: 'cambié algo' });
    assert.equal(r.status, 409); errSchema(r); assert.equal(r.body.error.code, 'IDEMPOTENCY_CONFLICT');
  });
  await t.test('5 · otro evento, mismo teléfono (escrito distinto) → contacto existente y OTRA oportunidad', async () => {
    const q = ejemplo('solicitud-completa.json', { contact: { name: 'Lucía Ferreyra', phone: '0351 15 555-0142' } });
    const r = await enviar(q);
    assert.equal(r.status, 201, JSON.stringify(r.body)); okSchema(r);
    assert.equal(r.body.contact.match, 'existing'); assert.equal(r.body.contact.id, primera.body.contact.id);
    assert.notEqual(r.body.opportunity.id, primera.body.opportunity.id);
    assert.equal(r.body.estimate.status, 'match'); assert.equal(r.body.estimate.subtotalMinor, 142000000);
    const c = (await T.collection('contacts').doc(r.body.contact.id).get()).data();
    assert.equal(c.quoteCount, 2);
    assert.equal(c.firstSource.attribution, null, 'el origen histórico (primera cotización, sin UTM) no se pisa');
    assert.equal(c.marketingConsent.granted, true);
    const quote = (await T.collection('eventQuotes').doc(r.body.receiptId).get()).data();
    assert.equal(quote.attribution.fbclid, q.attribution.fbclid); assert.equal(quote.attribution.utmCampaign, 'eventos-fin-de-ano');
    const opps = await T.collection('opportunities').where('contactId', '==', c && r.body.contact.id).get();
    assert.equal(opps.size, 2);
  });
  await t.test('6 · 30 invitados y sin teléfono → 422 con detalle por campo', async () => {
    const q = ejemplo('solicitud-minima.json'); q.event.guests = 30; delete q.contact.phone;
    const r = await enviar(q);
    assert.equal(r.status, 422); errSchema(r); assert.equal(r.body.error.code, 'VALIDATION_FAILED');
    const campos = r.body.error.details.map(d => d.field);
    assert.ok(campos.includes('event.guests') && campos.includes('contact.phone'), JSON.stringify(r.body.error.details));
    assert.equal(r.body.error.retryable, false);
  });
  await t.test('7 · firma con otro secreto → 401 INVALID_SIGNATURE', async () => {
    const r = await enviar(ejemplo('solicitud-minima.json'), { secret: 'otro-secreto' });
    assert.equal(r.status, 401); errSchema(r); assert.equal(r.body.error.code, 'INVALID_SIGNATURE');
  });
  await t.test('8 · timestamp de hace 10 minutos → 401 TIMESTAMP_OUT_OF_RANGE', async () => {
    const r = await enviar(ejemplo('solicitud-minima.json'), { ts: Math.floor(Date.now() / 1000) - 600 });
    assert.equal(r.status, 401); errSchema(r); assert.equal(r.body.error.code, 'TIMESTAMP_OUT_OF_RANGE');
  });
  await t.test('9 · falla simulada 503 y el reintento crea la cotización una sola vez', async () => {
    const q = ejemplo('solicitud-minima.json', { contact: { name: 'Reintento', phone: '351 666-2222' } });
    const f = await enviar(q, { headers: { 'X-Brandazo-Test-Fail': '503' } });
    assert.equal(f.status, 503); errSchema(f); assert.equal(f.body.error.retryable, true);
    const r = await enviar(q);
    assert.equal(r.status, 201); okSchema(r);
  });
});

test('otros errores del contrato', async t => {
  await t.test('quoteId distinto del Idempotency-Key → 400', async () => {
    const r = await enviar(ejemplo('solicitud-minima.json'), { idem: randomUUID() });
    assert.equal(r.status, 400); errSchema(r); assert.equal(r.body.error.code, 'IDEMPOTENCY_KEY_MISMATCH');
  });
  await t.test('JSON mal formado → 400 (lo responde la plataforma antes de llegar a Brandazo)', async () => {
    const raw = '{no es json', ts = Math.floor(Date.now() / 1000);
    const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Brandazo-Key-Id': KEY_ID, 'X-Brandazo-Timestamp': String(ts), 'X-Brandazo-Signature': sign(SECRET, ts, Buffer.from(raw)), 'Idempotency-Key': randomUUID() }, body: raw });
    assert.equal(res.status, 400);
  });
  await t.test('fecha pasada → 422 EVENT_DATE_IN_PAST', async () => {
    const q = ejemplo('solicitud-minima.json'); q.event.date = '2020-01-10';
    const r = await enviar(q);
    assert.equal(r.status, 422); errSchema(r); assert.equal(r.body.error.code, 'EVENT_DATE_IN_PAST');
  });
  await t.test('clave desconocida → 401 UNKNOWN_KEY', async () => {
    const q = ejemplo('solicitud-minima.json'); const raw = JSON.stringify(q), ts = Math.floor(Date.now() / 1000);
    const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Brandazo-Key-Id': 'no-existe', 'X-Brandazo-Timestamp': String(ts), 'X-Brandazo-Signature': sign(SECRET, ts, Buffer.from(raw)), 'Idempotency-Key': q.quoteId }, body: raw });
    const b = await res.json(); assert.equal(res.status, 401); assert.equal(b.error.code, 'UNKNOWN_KEY');
  });
  await t.test('sin encabezados de firma → 401 MISSING_SIGNATURE', async () => {
    const q = ejemplo('solicitud-minima.json');
    const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': q.quoteId }, body: JSON.stringify(q) });
    assert.equal(res.status, 401); assert.equal((await res.json()).error.code, 'MISSING_SIGNATURE');
  });
  await t.test('avisos que no frenan: evento en 3 días, teléfono raro, jarabe con Full, estimado distinto', async () => {
    const q = ejemplo('solicitud-completa.json', { contact: { name: 'Avisos', phone: '555-0142' } });
    q.event.date = futuro(3); q.selection.addonIds = ['jarabe', 'cookies']; q.estimate.subtotalMinor = 1;
    const r = await enviar(q);
    assert.equal(r.status, 201, JSON.stringify(r.body)); okSchema(r);
    const codes = r.body.warnings.map(w => w.code).sort();
    assert.deepEqual(codes, ['ADDON_NOT_IN_PLAN', 'ESTIMATE_MISMATCH', 'PHONE_NOT_NORMALIZED', 'SHORT_NOTICE']);
    assert.equal(r.body.estimate.status, 'mismatch');
  });
  await t.test('registro técnico sin datos personales', async () => {
    const logs = await T.collection('integrationLog').get();
    assert.ok(logs.size > 10);
    for (const d of logs.docs) { const s = JSON.stringify(d.data()); assert.ok(!/Lucía|Ferreyra|phone|payload|contact/.test(s), s); }
  });
});
