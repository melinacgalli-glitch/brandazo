// Pedidos de la tienda (Cafelito Cakes), contra los emuladores de Functions y Firestore.
// Desde la raíz: firebase emulators:exec --only functions,firestore --project demo-brandazo "node --test functions/test/pedidos.test.js"
const { test, before } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs'), path = require('node:path');
const admin = require('firebase-admin');
const { sign } = require('../src/sign');
const KEYS = JSON.parse(fs.readFileSync(path.join(__dirname, '../.secret.local'), 'utf8').split('\n').find(l => l.startsWith('INTEGRATION_KEYS=')).replace(/^INTEGRATION_KEYS=/, '').replace(/^'|'$/g, '').trim());
const KEY_ID = 'cafelito-web-test', { secret: SECRET, tenantId: TID } = KEYS[KEY_ID];
const URL_ = 'http://127.0.0.1:5001/demo-brandazo/southamerica-east1/api/api/v1/integrations/cafelito/shop-orders';
let db; const T = () => `tenants/${TID}`;
async function send(body, { idem = body.eventId, secret = SECRET, raw } = {}) {
  const b = Buffer.from(raw || JSON.stringify(body)), ts = Math.floor(Date.now() / 1000);
  const r = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Brandazo-Key-Id': KEY_ID, 'X-Brandazo-Timestamp': String(ts), 'X-Brandazo-Signature': sign(secret, ts, b), 'Idempotency-Key': idem }, body: b });
  return { status: r.status, body: await r.json() };
}
const order = (id, status, extra = {}) => ({
  schemaVersion: '1.0', eventId: `${id}:${status}`, orderId: id, status, statusAt: extra.statusAt || '2026-11-20T15:00:00-03:00',
  ...(status === 'paid' ? { paidAt: '2026-11-20T15:00:00-03:00' } : {}), createdAt: '2026-11-20T14:50:00-03:00', currency: 'ARS',
  totalMinor: 4500000, items: [{ sku: 'TOR-CHOCO-20', name: 'Torta de chocolate', variant: '20 porciones', quantity: 1, unitPriceMinor: 4500000 }],
  pickup: { date: '2026-11-25', place: 'Cafelito Coffee House' }, customer: { name: 'Lucía Pérez', phone: '351 15 555-0199', email: 'lucia@example.com' },
  payment: { provider: 'mercadopago', paymentId: '123456789', method: 'credit_card' },
  attribution: { utmSource: 'instagram', utmMedium: 'paid_social', utmCampaign: 'Dia-de-la-Madre' }, consent: { marketing: true, text: 'Quiero recibir novedades' }, ...extra
});
before(() => { admin.initializeApp({ projectId: 'demo-brandazo' }); db = admin.firestore(); });

test('un pedido pagado se guarda con su mes de pago, campaña y el cliente como contacto', async () => {
  const r = await send(order('P-1001', 'paid')); assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  assert.strictEqual(r.body.contact.match, 'new'); assert.deepStrictEqual(r.body.order, { status: 'paid', counted: true });
  const o = (await db.doc(`${T()}/orders/P-1001`).get()).data();
  assert.strictEqual(o.paidMonth, '2026-11'); assert.strictEqual(o.utmCampaign, 'dia-de-la-madre'); assert.strictEqual(o.brand, 'Cafelito Cakes'); assert.strictEqual(o.totalMinor, 4500000);
  const c = (await db.doc(`${T()}/contacts/${o.contactId}`).get()).data();
  assert.strictEqual(c.orderCount, 1); assert.strictEqual(c.orderSpentMinor, 4500000); assert.strictEqual(c.phoneE164, '+5493515550199'); assert.ok(c.marketingConsent.granted);
  const ops = await db.collection(`${T()}/opportunities`).where('contactId', '==', o.contactId).get(); assert.strictEqual(ops.size, 0, 'no crea oportunidad');
});
test('reenviar el mismo aviso no duplica; mismo eventId con otro cuerpo da conflicto', async () => {
  const r = await send(order('P-1001', 'paid')); assert.strictEqual(r.status, 200); assert.strictEqual(r.body.status, 'duplicate');
  const c = await send(order('P-1001', 'paid', { notes: 'otro' })); assert.strictEqual(c.status, 409);
  const n = (await db.collection(`${T()}/orders`).where('orderId', '==', 'P-1001').get()).size; assert.strictEqual(n, 1);
});
test('retirado sigue contando; devuelto descuenta del cliente', async () => {
  let r = await send(order('P-1001', 'picked_up', { statusAt: '2026-11-25T10:00:00-03:00' })); assert.strictEqual(r.status, 200, JSON.stringify(r.body)); assert.strictEqual(r.body.order.counted, true);
  r = await send(order('P-1001', 'refunded', { statusAt: '2026-11-26T10:00:00-03:00' })); assert.strictEqual(r.body.order.counted, false);
  const o = (await db.doc(`${T()}/orders/P-1001`).get()).data(); assert.strictEqual(o.status, 'refunded'); assert.strictEqual(o.paidMonth, '2026-11', 'conserva el mes de pago');
  assert.deepStrictEqual(o.history.map(h => h.status), ['paid', 'picked_up', 'refunded']);
  const c = (await db.doc(`${T()}/contacts/${o.contactId}`).get()).data(); assert.strictEqual(c.orderCount, 0); assert.strictEqual(c.orderSpentMinor, 0);
});
test('un aviso viejo que llega tarde no pisa el estado', async () => {
  const r = await send({ ...order('P-1001', 'picked_up', { statusAt: '2026-11-25T10:00:00-03:00' }), eventId: 'P-1001:picked_up:retry' });
  assert.strictEqual(r.body.status, 'stale'); assert.strictEqual((await db.doc(`${T()}/orders/P-1001`).get()).data().status, 'refunded');
});
test('el mismo cliente con otro pedido (por teléfono o por email) no se duplica', async () => {
  const a = await send(order('P-1002', 'paid', { customer: { name: 'Lucía P.', phone: '+54 9 351 555 0199' } }));
  const b = await send(order('P-1003', 'paid', { customer: { name: 'Lucía', email: 'LUCIA@example.com' } }));
  const first = (await db.doc(`${T()}/orders/P-1001`).get()).data().contactId;
  assert.strictEqual(a.body.contact.id, first); assert.strictEqual(b.body.contact.id, first); assert.strictEqual(b.body.contact.match, 'existing');
  assert.strictEqual((await db.doc(`${T()}/contacts/${first}`).get()).data().orderCount, 2);
});
test('valida: pagado sin paidAt, total que no coincide avisa, campos de más rechaza', async () => {
  const sinPago = order('P-2001', 'paid'); delete sinPago.paidAt; assert.strictEqual((await send(sinPago)).status, 422);
  const r = await send(order('P-2002', 'paid', { totalMinor: 4000000 })); assert.strictEqual(r.status, 201); assert.ok(r.body.warnings.some(w => w.code === 'TOTAL_MISMATCH'));
  assert.strictEqual((await send(order('P-2003', 'paid', { tarjeta: '4111' }))).status, 422, 'no acepta datos de más (ni de tarjetas)');
  const sinContacto = order('P-2004', 'paid', { customer: { name: 'Sin datos' } }); assert.strictEqual((await send(sinContacto)).status, 422);
});
test('firma inválida e Idempotency-Key distinto del eventId se rechazan', async () => {
  assert.strictEqual((await send(order('P-3001', 'paid'), { secret: 'otro' })).status, 401);
  assert.strictEqual((await send(order('P-3002', 'paid'), { idem: 'otra-cosa-123' })).status, 400);
});

test('si la venta ya se había cargado a mano con el mismo n.º de pago, la web la actualiza (no la duplica)', async () => {
  const now = admin.firestore.Timestamp.now();
  await db.doc(`${T()}/orders/MP-777001`).set({ orderId: '777001', brand: 'Cafelito Cakes', status: 'paid', counted: true, statusAt: now, paidAt: now, paidMonth: '2026-11', totalMinor: 6300000, items: [{ name: 'Pistacho & Frambuesa', quantity: 1, unitPriceMinor: 6300000 }], contactId: 'cman', customerName: 'Luisina', payment: { provider: 'mercadopago', paymentId: '777001' }, source: { manual: true }, history: [], updatedAt: now });
  await db.doc(`${T()}/contacts/cman`).set({ name: 'Luisina', orderCount: 1, orderSpentMinor: 6300000 });
  const r = await send(order('W-5001', 'paid', { totalMinor: 6300000, items: [{ name: 'Pistacho & Frambuesa', quantity: 1, unitPriceMinor: 6300000 }], payment: { provider: 'mercadopago', paymentId: '777001' }, customer: { name: 'Luisina Magris', phone: '3385448801' } }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body)); assert.strictEqual(r.body.status, 'updated');
  assert.strictEqual((await db.doc(`${T()}/orders/W-5001`).get()).exists, false, 'no crea otra venta');
  const o = (await db.doc(`${T()}/orders/MP-777001`).get()).data(); assert.strictEqual(o.orderId, 'W-5001'); assert.ok(o.manualMergedAt);
  const c = (await db.doc(`${T()}/contacts/cman`).get()).data(); assert.strictEqual(c.orderCount, 1); assert.strictEqual(c.orderSpentMinor, 6300000);
});
