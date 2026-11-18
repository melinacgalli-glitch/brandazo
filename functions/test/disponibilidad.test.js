// Disponibilidad de fechas para el cotizador, contra los emuladores de Functions y Firestore.
// Desde la raíz: firebase emulators:exec --only functions,firestore --project demo-brandazo "node --test functions/test/disponibilidad.test.js"
const { test, before } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const admin = require('firebase-admin');
const { sign } = require('../src/sign');
const { signAvailability } = require('../src/availability');
const KEYS = JSON.parse(fs.readFileSync(path.join(__dirname, '../.secret.local'), 'utf8').split('\n').find(l => l.startsWith('INTEGRATION_KEYS=')).replace(/^INTEGRATION_KEYS=/, '').replace(/^'|'$/g, '').trim());
const KEY_ID = 'cafelito-web-test', { secret: SECRET, tenantId: TID } = KEYS[KEY_ID];
const BASE = 'http://127.0.0.1:5001/demo-brandazo/southamerica-east1/api/api/v1/integrations/cafelito';
const tz = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Cordoba', year: 'numeric', month: '2-digit', day: '2-digit' });
const TODAY = tz.format(new Date()), plus = n => new Date(Date.parse(TODAY + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const D_BOOKED = plus(30), D_NODEPOSIT = plus(31), D_BLOCK = plus(40), D_FREE = plus(50);
let db;
async function avail(query, { secret = SECRET, keyId = KEY_ID, ts = Math.floor(Date.now() / 1000) } = {}) {
  const url = new URL(`${BASE}/availability${query ? '?' + query : ''}`); // se firma la ruta y la consulta tal como viajan (codificadas)
  const canon = `GET /api/v1/integrations/cafelito/availability${url.search}`;
  const r = await fetch(url, { headers: { 'X-Brandazo-Key-Id': keyId, 'X-Brandazo-Timestamp': String(ts), 'X-Brandazo-Signature': signAvailability(secret, ts, canon) } });
  return { status: r.status, body: await r.json() };
}
before(async () => {
  admin.initializeApp({ projectId: 'demo-brandazo' }); db = admin.firestore(); const T = `tenants/${TID}`;
  const op = (id, date, d) => db.doc(`${T}/opportunities/${id}`).set({ pipeline: 'cafelito-eventos', event: { date, type: 'Corporativo' }, ...d });
  await op('con-sena', D_BOOKED, { stage: 'ganada', won: { amountMinor: 1, depositMinor: 1, depositPaid: true } });
  await op('sin-sena', D_NODEPOSIT, { stage: 'ganada', won: { amountMinor: 1, depositMinor: 1, depositPaid: false } });
  await op('perdida-con-sena', D_FREE, { stage: 'perdida', won: { amountMinor: 1, depositMinor: 1, depositPaid: true } });
  await db.doc(`${T}/settings/cafelito-eventos`).set({ blockedDates: [{ date: D_BLOCK, note: 'Vacaciones' }] }, { merge: true });
});

test('devuelve las fechas ocupadas con seña, las bloqueadas y la semana mínima (solo fechas)', async () => {
  const r = await avail(`from=${TODAY}&to=${plus(60)}`); assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  const reason = Object.fromEntries(r.body.unavailable.map(x => [x.date, x.reason]));
  assert.strictEqual(reason[D_BOOKED], 'booked'); assert.strictEqual(reason[D_BLOCK], 'blocked');
  assert.ok(!(D_NODEPOSIT in reason), 'ganada sin seña: sigue disponible'); assert.ok(!(D_FREE in reason), 'perdida: no ocupa');
  for (let i = 0; i < 7; i++) assert.strictEqual(reason[plus(i)], 'min_notice', 'día ' + i);
  assert.ok(!(plus(7) in reason), 'el día 7 ya se puede elegir'); assert.strictEqual(r.body.earliestBookableDate, plus(7));
  assert.deepStrictEqual(r.body.unavailableDates, r.body.unavailable.map(x => x.date));
  assert.ok(!JSON.stringify(r.body).includes('Corporativo') && !JSON.stringify(r.body).includes('Vacaciones'), 'no expone datos de eventos ni notas');
});
test('firma, clave, hora y parámetros', async () => {
  assert.strictEqual((await avail(`from=${TODAY}&to=${plus(10)}`, { secret: 'otro' })).body.error.code, 'INVALID_SIGNATURE');
  assert.strictEqual((await avail(`from=${TODAY}&to=${plus(10)}`, { keyId: 'nadie' })).body.error.code, 'UNKNOWN_KEY');
  assert.strictEqual((await avail(`from=${TODAY}&to=${plus(10)}`, { ts: Math.floor(Date.now() / 1000) - 900 })).body.error.code, 'TIMESTAMP_OUT_OF_RANGE');
  assert.strictEqual((await avail(`from=${TODAY}&to=${plus(500)}`)).status, 422);
  assert.strictEqual((await avail(`from=mañana&to=${plus(5)}`)).status, 422);
  const sinRango = await avail(''); assert.strictEqual(sinRango.status, 200); assert.strictEqual(sinRango.body.from, TODAY);
});
test('una cotización para un día tomado llega igual, con el aviso DATE_UNAVAILABLE', async () => {
  const quoteId = crypto.randomUUID();
  const body = { schemaVersion: '1.0', quoteId, submittedAt: new Date().toISOString(), source: { site: 'cafelito.com.ar', form: 'cafelito-ambulante' }, contact: { name: 'Prueba disponibilidad', phone: '351 555-7788' },
    event: { type: 'Corporativo', date: D_BOOKED, startTime: '18:00', durationHours: 3, inCapital: true, place: 'Córdoba', guests: 60 }, selection: { plan: 'esencial', addonIds: [], customizationIds: [], wantsCake: false, wantsColdBrew: false } };
  const raw = JSON.stringify(body), ts = Math.floor(Date.now() / 1000);
  const r = await fetch(`${BASE}/event-quotes`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Brandazo-Key-Id': KEY_ID, 'X-Brandazo-Timestamp': String(ts), 'X-Brandazo-Signature': sign(SECRET, ts, Buffer.from(raw)), 'Idempotency-Key': quoteId }, body: raw });
  const j = await r.json(); assert.strictEqual(r.status, 201, JSON.stringify(j));
  assert.ok(j.warnings.some(w => w.code === 'DATE_UNAVAILABLE'), JSON.stringify(j.warnings));
});
