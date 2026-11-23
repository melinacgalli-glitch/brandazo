// Códigos de descuento desde la web: consulta firmada y canje al llegar el pedido pagado.
// Desde la raíz: firebase emulators:exec --only functions,firestore --project demo-brandazo "node --test functions/test/cupones-web.test.js"
const { test, before } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs'), path = require('node:path');
const admin = require('firebase-admin');
const { sign } = require('../src/sign');
const KEYS = JSON.parse(fs.readFileSync(path.join(__dirname, '../.secret.local'), 'utf8').split('\n').find(l => l.startsWith('INTEGRATION_KEYS=')).replace(/^INTEGRATION_KEYS=/, '').replace(/^'|'$/g, '').trim());
const KEY_ID = 'cafelito-web-test', { secret: SECRET, tenantId: TID } = KEYS[KEY_ID];
const BASE = 'http://127.0.0.1:5001/demo-brandazo/southamerica-east1/api/api/v1/integrations/cafelito';
let db; const T = () => db.collection('tenants').doc(TID);
async function post(p, body, idem) { const b = Buffer.from(JSON.stringify(body)), ts = Math.floor(Date.now() / 1000);
  const r = await fetch(`${BASE}/${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Brandazo-Key-Id': KEY_ID, 'X-Brandazo-Timestamp': String(ts), 'X-Brandazo-Signature': sign(SECRET, ts, b), ...(idem ? { 'Idempotency-Key': idem } : {}) }, body: b });
  return { status: r.status, body: await r.json() }; }
const today = new Date().toISOString().slice(0, 10), plus = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const order = (id, code, extra = {}) => ({ schemaVersion: '1.0', eventId: `${id}:paid`, orderId: id, status: 'paid', statusAt: new Date().toISOString(), paidAt: new Date().toISOString(), currency: 'ARS',
  totalMinor: 5670000, discountMinor: 630000, items: [{ name: 'Torta', quantity: 1, unitPriceMinor: 6300000 }], customer: { name: 'Catalina Bellezze', email: 'cata@example.com' }, ...(code ? { coupon: { code, discountMinor: 630000 } } : {}), ...extra });
before(async () => {
  admin.initializeApp({ projectId: 'demo-brandazo' }); db = admin.firestore();
  await T().collection('coupons').doc('GRACIAS-WEB1').set({ code: 'GRACIAS-WEB1', status: 'active', pct: 10, expires: plus(20), name: 'Catalina Bellezze', automation: 'primera-compra' });
  await T().collection('coupons').doc('GRACIAS-OLD2').set({ code: 'GRACIAS-OLD2', status: 'active', pct: 10, expires: plus(-2), name: 'X' });
});
test('consultar: válido, sin datos personales; inexistente; vencido; formato malo; firma mala', async () => {
  let r = await post('coupons/check', { code: 'gracias-web1' }); assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body, { code: 'GRACIAS-WEB1', valid: true, state: 'valid', percentOff: 10, expiresOn: plus(20) });
  r = await post('coupons/check', { code: 'GRACIAS-NADA' }); assert.strictEqual(r.body.state, 'not_found');
  r = await post('coupons/check', { code: 'GRACIAS-OLD2' }); assert.strictEqual(r.body.state, 'expired'); assert.strictEqual(r.body.valid, false);
  r = await post('coupons/check', { code: 'hola' }); assert.strictEqual(r.body.state, 'invalid_format');
  const b = Buffer.from('{"code":"GRACIAS-WEB1"}'), ts = Math.floor(Date.now() / 1000);
  const bad = await fetch(`${BASE}/coupons/check`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Brandazo-Key-Id': KEY_ID, 'X-Brandazo-Timestamp': String(ts), 'X-Brandazo-Signature': sign('otro', ts, b) }, body: b });
  assert.strictEqual(bad.status, 401);
});
test('pedido pagado con el código: lo marca usado (web) y queda en el pedido; reenviar no lo rompe', async () => {
  const o = order('W-9001', 'GRACIAS-WEB1'); let r = await post('shop-orders', o, o.eventId); assert.strictEqual(r.status, 201, JSON.stringify(r.body)); assert.deepStrictEqual(r.body.warnings, []);
  const c = (await T().collection('coupons').doc('GRACIAS-WEB1').get()).data(); assert.strictEqual(c.status, 'used'); assert.strictEqual(c.usedWhere, 'web'); assert.strictEqual(c.orderUsed, 'W-9001'); assert.strictEqual(c.saleAmountMinor, 5670000);
  assert.strictEqual((await T().collection('orders').doc('W-9001').get()).data().coupon.valid, true);
  r = await post('shop-orders', o, o.eventId); assert.strictEqual(r.body.status, 'duplicate');
  const pu = { ...order('W-9001', 'GRACIAS-WEB1'), eventId: 'W-9001:picked_up', status: 'picked_up' }; delete pu.paidAt;
  r = await post('shop-orders', pu, pu.eventId); assert.deepStrictEqual(r.body.warnings, [], 'el mismo pedido puede volver a mandar su código');
  r = await post('coupons/check', { code: 'GRACIAS-WEB1' }); assert.strictEqual(r.body.state, 'used');
});
test('otro pedido con un código ya usado o inexistente: se guarda igual, con aviso', async () => {
  const o = order('W-9002', 'GRACIAS-WEB1'); let r = await post('shop-orders', o, o.eventId); assert.strictEqual(r.status, 201); assert.ok(r.body.warnings.some(w => w.code === 'COUPON_ALREADY_USED'));
  const o2 = order('W-9003', 'GRACIAS-ZZZZ'); r = await post('shop-orders', o2, o2.eventId); assert.ok(r.body.warnings.some(w => w.code === 'COUPON_NOT_FOUND'));
  const o3 = order('W-9004', 'GRACIAS-OLD2'); r = await post('shop-orders', o3, o3.eventId); assert.ok(r.body.warnings.some(w => w.code === 'COUPON_EXPIRED'));
  assert.strictEqual((await T().collection('coupons').doc('GRACIAS-OLD2').get()).data().status, 'active', 'un vencido no se marca usado');
});
