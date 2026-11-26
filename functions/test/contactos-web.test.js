// Contactos desde los formularios de la web, contra los emuladores de Functions y Firestore.
// Desde la raíz: firebase emulators:exec --only functions,firestore --project demo-brandazo "node --test functions/test/contactos-web.test.js"
const { test, before } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs'), path = require('node:path');
const admin = require('firebase-admin');
const { sign } = require('../src/sign');
const KEYS = JSON.parse(fs.readFileSync(path.join(__dirname, '../.secret.local'), 'utf8').split('\n').find(l => l.startsWith('INTEGRATION_KEYS=')).replace(/^INTEGRATION_KEYS=/, '').replace(/^'|'$/g, '').trim());
const KEY_ID = 'cafelito-web-test', { secret: SECRET, tenantId: TID } = KEYS[KEY_ID];
const URL_ = 'http://127.0.0.1:5001/demo-brandazo/southamerica-east1/api/api/v1/integrations/cafelito/contacts';
let db, FIRST; const T = () => db.collection('tenants').doc(TID);
async function send(body, idem = body.eventId) { const b = Buffer.from(JSON.stringify(body)), ts = Math.floor(Date.now() / 1000);
  const r = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Brandazo-Key-Id': KEY_ID, 'X-Brandazo-Timestamp': String(ts), 'X-Brandazo-Signature': sign(SECRET, ts, b), 'Idempotency-Key': idem }, body: b });
  return { status: r.status, body: await r.json() }; }
const cw = (id, extra = {}) => ({ schemaVersion: '1.0', eventId: id, source: 'coworking', submittedAt: new Date().toISOString(), contact: { name: 'Sofía Ruiz', phone: '351 15 777-1234' },
  coworking: { people: 6, date: '2026-12-02', from: '10:00 hs', to: '14:00 hs' }, attribution: { utmSource: 'instagram', utmCampaign: 'cowork-dic' }, ...extra });
before(() => { admin.initializeApp({ projectId: 'demo-brandazo' }); db = admin.firestore(); });

test('una reserva de coworking deja a la persona como Cliente de Cafelito Work, con lo que pidió', async () => {
  FIRST = cw('cw-evt-0001'); const r = await send(FIRST); assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  assert.strictEqual(r.body.contact.match, 'new'); assert.strictEqual(r.body.contact.type, 'Cliente');
  const c = (await T().collection('contacts').doc(r.body.contact.id).get()).data();
  assert.strictEqual(c.type, 'Cliente'); assert.deepStrictEqual(c.tags, ['Cafelito Work']); assert.strictEqual(c.phoneE164, '+5493517771234'); assert.strictEqual(c.firstSource.channel, 'Web · Coworking'); assert.strictEqual(c.marketingConsent, null);
  const ev = (await T().collection('contactEvents').where('contactId', '==', r.body.contact.id).get()).docs.map(d => d.data());
  assert.strictEqual(ev.length, 1); assert.strictEqual(ev[0].coworking.people, 6); assert.strictEqual(ev[0].attribution.utmCampaign, 'cowork-dic');
});
test('reenviar no duplica; otra reserva del mismo WhatsApp suma al mismo contacto y guarda el permiso', async () => {
  let r = await send(FIRST); assert.strictEqual(r.body.status, 'duplicate');
  const other = await send({ ...FIRST, submittedAt: '2026-01-01T00:00:00Z' }); assert.strictEqual(other.status, 409, 'mismo eventId con otro contenido: conflicto');
  r = await send(cw('cw-evt-0002', { contact: { name: 'Sofi Ruiz', phone: '+54 9 351 777 1234', email: 'SOFI@example.com' }, consent: { marketing: true, text: 'Quiero recibir novedades' } }));
  assert.strictEqual(r.body.contact.match, 'existing');
  const c = (await T().collection('contacts').doc(r.body.contact.id).get()).data();
  assert.strictEqual(c.email, 'sofi@example.com'); assert.strictEqual(c.marketingConsent.granted, true); assert.strictEqual(c.webCount, 2);
  assert.strictEqual((await T().collection('contactEvents').where('contactId', '==', r.body.contact.id).get()).size, 2);
});
test('formulario de contacto: Lead (no baja a un cliente); datos inválidos, rechazados', async () => {
  let r = await send({ schemaVersion: '1.0', eventId: 'ct-evt-0001', source: 'contacto', submittedAt: new Date().toISOString(), contact: { name: 'Juan', email: 'juan@example.com' }, topic: 'Torta', message: 'Quiero una torta para 20' });
  assert.strictEqual(r.status, 201); assert.strictEqual(r.body.contact.type, 'Lead');
  r = await send({ schemaVersion: '1.0', eventId: 'ct-evt-0002', source: 'contacto', submittedAt: new Date().toISOString(), contact: { name: 'Sofía', phone: '3517771234' }, message: 'Hola' });
  assert.strictEqual(r.body.contact.type, 'Cliente', 'Sofía ya era cliente: sigue siéndolo');
  r = await send({ schemaVersion: '1.0', eventId: 'ct-evt-0003', source: 'coworking', submittedAt: new Date().toISOString(), contact: { name: 'Sin datos' } }); assert.strictEqual(r.status, 422);
});
