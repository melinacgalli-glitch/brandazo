// Automatización «Gracias por tu primera compra» contra el emulador de Firestore (el envío se simula).
// Desde la raíz: firebase emulators:exec --only firestore --project demo-brandazo "node --test functions/test/automatizacion.test.js"
const { test, before } = require('node:test');
const assert = require('node:assert');
const admin = require('firebase-admin');
const { runAutomations, handleAuto, renderMail, cleanCfg } = require('../src/automations');
let db; const TS = admin.firestore.Timestamp, TID = 'cafeauto', T = () => db.collection('tenants').doc(TID);
const at = (iso, h) => Date.parse(`${iso}T${String(h + 3).padStart(2, '0')}:05:00Z`); // hora de Córdoba
const mailer = () => { const sent = []; return { sent, fetch: async (url, o) => { sent.push(JSON.parse(o.body)); return { ok: true, status: 200, json: async () => ({ id: 'm' + sent.length }) }; } }; };
const MAIL = { provider: 'resend', apiKey: 're_x', from: 'Brandazo <avisos@brandazo.com.ar>' };
const run = (m, iso, h) => runAutomations({ db, Timestamp: TS, fetch: m.fetch, now: () => at(iso, h), resend: MAIL, tenantIds: [TID] });
const order = (id, d) => T().collection('orders').doc(id).set({ brand: 'Cafelito Cakes', status: 'paid', counted: true, totalMinor: 6300000, ...d });
before(async () => {
  admin.initializeApp({ projectId: 'demo-brandazo' }); db = admin.firestore();
  await T().collection('settings').doc('auto-primera-compra').set({ ...cleanCfg({ enabled: true, replyTo: 'administracion@cafelito.co', since: '2026-11-23' }) });
  await T().collection('contacts').doc('cat').set({ name: 'Catalina Bellezze', email: 'cata@example.com' });
  await T().collection('contacts').doc('lui').set({ name: 'Luisina Magris', email: 'lui@example.com' });
  await T().collection('contacts').doc('sin').set({ name: 'Sin Mail' });
  await T().collection('contacts').doc('rep').set({ name: 'Repite', email: 'rep@example.com' });
  await order('o-cat', { contactId: 'cat', customerName: 'Catalina Bellezze', pickup: { date: '2026-11-24' }, paidAt: TS.fromMillis(at('2026-11-22', 10)) });
  await order('o-lui', { contactId: 'lui', pickup: { date: '2026-11-21' }, paidAt: TS.fromMillis(at('2026-11-20', 10)) });
  await order('o-sin', { contactId: 'sin', pickup: { date: '2026-11-24' }, paidAt: TS.fromMillis(at('2026-11-22', 10)) });
  await order('o-rep1', { contactId: 'rep', pickup: { date: '2026-11-10' }, paidAt: TS.fromMillis(at('2026-11-08', 10)) });
  await order('o-rep2', { contactId: 'rep', pickup: { date: '2026-11-24' }, paidAt: TS.fromMillis(at('2026-11-22', 10)) });
  await order('o-can', { contactId: 'cat', status: 'cancelled', counted: false, pickup: { date: '2026-11-24' } });
});

test('el día del retiro y antes de la hora no manda nada', async () => {
  const m = mailer(); await run(m, '2026-11-24', 11); await run(m, '2026-11-25', 9); assert.strictEqual(m.sent.length, 0);
});
test('al día siguiente del retiro: un mail a la primera compra, con código, remitente Cafelito y responder a administración', async () => {
  const m = mailer(); const r = await run(m, '2026-11-25', 10);
  assert.strictEqual(m.sent.length, 1, JSON.stringify(r)); const b = m.sent[0];
  assert.deepStrictEqual(b.to, ['cata@example.com']); assert.strictEqual(b.from, 'Cafelito <avisos@brandazo.com.ar>'); assert.strictEqual(b.reply_to, 'administracion@cafelito.co');
  assert.strictEqual(b.subject, '¡Cafelito tiene un regalo especial para vos! 🎁'); assert.match(b.html, /¡Hola, Catalina!/); assert.match(b.html, /<b>Cafelito Cakes<\/b>/);
  const code = b.html.match(/GRACIAS-[A-Z0-9]{4}/)[0]; assert.match(b.html, /Válido hasta el 25\/12\/2026/);
  const c = (await T().collection('coupons').doc(code).get()).data(); assert.strictEqual(c.contactId, 'cat'); assert.strictEqual(c.expires, '2026-12-25'); assert.strictEqual(c.status, 'active');
  assert.strictEqual((await T().collection('autoSends').doc('primera-compra_sin').get()).data().skipped, 'sin email');
  assert.ok(!(await T().collection('autoSends').doc('primera-compra_lui').get()).exists, 'Luisina (retiró antes de activarla) no');
  assert.ok(!(await T().collection('autoSends').doc('primera-compra_rep').get()).exists, 'quien ya había comprado antes no');
  const again = mailer(); await run(again, '2026-11-26', 12); assert.strictEqual(again.sent.length, 0, 'una sola vez por cliente');
});
test('canjear el código: válido una vez, después usado; uno inventado no existe; vencido no', async () => {
  const code = (await T().collection('coupons').get()).docs[0].id;
  const ctx = { deps: { db, Timestamp: TS, now: () => new Date(at('2026-12-02', 12)) }, user: { uid: 'u' }, by: 'Caja', tenantRef: T(), role: 'Ventas' };
  let r = await handleAuto({ kind: 'coupon-check', code: code.toLowerCase() }, ctx); assert.strictEqual(r.body.state, 'valido'); assert.strictEqual(r.body.name, 'Catalina Bellezze');
  r = await handleAuto({ kind: 'coupon-redeem', code, where: 'local', amountMinor: 4500000 }, ctx); assert.strictEqual(r.body.state, 'canjeado');
  r = await handleAuto({ kind: 'coupon-redeem', code, where: 'local' }, ctx); assert.strictEqual(r.body.state, 'usado');
  r = await handleAuto({ kind: 'coupon-check', code: 'GRACIAS-ZZZZ' }, ctx); assert.strictEqual(r.body.state, 'inexistente');
  await T().collection('coupons').doc('GRACIAS-OLD1').set({ code: 'GRACIAS-OLD1', status: 'active', expires: '2026-11-30', name: 'X' });
  r = await handleAuto({ kind: 'coupon-redeem', code: 'GRACIAS-OLD1' }, ctx); assert.strictEqual(r.body.state, 'vencido');
});
test('solo Dueño o Admin cambian la configuración; el texto se arma con nombre y regalo', async () => {
  const ctx = { deps: { db, Timestamp: TS, now: () => new Date() }, user: { uid: 'u' }, by: 'X', tenantRef: T(), role: 'Marketing' };
  assert.strictEqual((await handleAuto({ kind: 'auto-save', config: { enabled: false } }, ctx)).status, 403);
  const { html } = renderMail(cleanCfg({}), { name: 'juana pérez', code: 'GRACIAS-AB12', expires: '2026-12-31' });
  assert.match(html, /¡Hola, Juana!/); assert.match(html, /GRACIAS-AB12/); assert.match(html, /respondé «BAJA»/);
});
