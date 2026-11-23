// Avisos de planificaciones contra el emulador de Firestore (el envío de mails se simula).
// Desde la raíz: firebase emulators:exec --only firestore --project demo-brandazo "node --test functions/test/planificacion.test.js"
const { test, before } = require('node:test');
const assert = require('node:assert');
const admin = require('firebase-admin');
const { sendPlanAlerts } = require('../src/planAlerts');
let db; const TS = admin.firestore.Timestamp, T = 'tenants/cafeplan';
const at = iso => Date.parse(iso + 'T11:30:00Z'); // 8:30 en Córdoba
const C = (id, date, status, owner = 'lourdes miranda') => ({ id, planId: 'p1', title: 'Contenido ' + id, brand: 'Cafelito Coffee House', format: 'Historia', channel: 'Instagram', date, ideaSt: 'aprobada', status, owner });
const putState = (part, v) => db.doc(`${T}/state/${part}`).set({ json: JSON.stringify(v), by: 'test' });
const mailer = () => { const sent = []; return { sent, fetch: async (url, o) => { sent.push(JSON.parse(o.body)); return { ok: true, status: 202, headers: { get: () => 'id' + sent.length }, json: async () => ({}) }; } }; };
const run = (m, iso) => sendPlanAlerts({ db, Timestamp: TS, fetch: m.fetch, now: () => at(iso), resend: { provider: 'sendgrid', apiKey: 'SG.x', from: 'Brandazo <avisos@brandazo.com.ar>' }, tenantIds: ['cafeplan'] });
before(async () => {
  admin.initializeApp({ projectId: 'demo-brandazo' }); db = admin.firestore();
  await db.doc(T).set({ name: 'Cafelito Coffee House' });
  await db.doc(`${T}/members/u1`).set({ name: 'Melina Galli', email: 'melina@cafe.test', role: 'Dueño' });
  await db.doc(`${T}/members/u2`).set({ name: 'lourdes miranda', email: 'lourdes@cafe.test', role: 'Marketing' });
  await putState('m_mainBrand', { name: 'Cafelito' });
  await putState('m_editorialPlans', [{ id: 'p1', name: 'Semana del 23 nov', brand: '__marca', start: '2026-11-23', end: '2026-11-29', owner: 'Melina Galli', approver: 'Melina Galli', version: 1 }]);
  await putState('m_contents', [C('a', '2026-11-23', 'Idea'), C('b', '2026-11-24', 'Borrador'), C('c', '2026-11-25', 'Revisión'), { ...C('x', '2026-11-26', 'Idea'), ideaSt: 'sin-presentar' }]);
});

test('recordatorio a quien produce: solo lo aprobado y sin terminar, una vez por día', async () => {
  const m = mailer(); await run(m, '2026-11-23');
  assert.strictEqual(m.sent.length, 1); const b = m.sent[0];
  assert.strictEqual(b.personalizations[0].to[0].email, 'lourdes@cafe.test');
  assert.match(b.subject, /Tenés 2 contenidos para producir · Semana del 23 nov/);
  const html = b.content[0].value;
  assert.match(html, /Hola Lourdes/); assert.match(html, /Contenido a/); assert.match(html, /Contenido b/);
  assert.doesNotMatch(html, /Contenido c/, 'el que ya está en revisión no aparece'); assert.doesNotMatch(html, /Contenido x/, 'el no aprobado no aparece');
  assert.match(html, /Cafelito · Planificación «Semana del 23 nov» \(23 al 29 de nov\)/);
  const again = mailer(); await run(again, '2026-11-23'); assert.strictEqual(again.sent.length, 0, 'no repite el mismo día');
  const next = mailer(); await run(next, '2026-11-24'); assert.strictEqual(next.sent.length, 1, 'al día siguiente vuelve a avisar');
});
test('cuando está todo terminado: aviso a quien aprobó, una sola vez, y no más recordatorios', async () => {
  await putState('m_contents', [C('a', '2026-11-23', 'Revisión'), C('b', '2026-11-24', 'Programado'), C('c', '2026-11-25', 'Revisión'), { ...C('x', '2026-11-26', 'Idea'), ideaSt: 'sin-presentar' }]);
  const m = mailer(); await run(m, '2026-11-25');
  assert.strictEqual(m.sent.length, 1); assert.strictEqual(m.sent[0].personalizations[0].to[0].email, 'melina@cafe.test');
  assert.match(m.sent[0].subject, /Lourdes terminó los 3 contenidos de «Semana del 23 nov»/);
  assert.match(m.sent[0].content[0].value, /Hola Melina/);
  const again = mailer(); await run(again, '2026-11-25'); await run(again, '2026-11-26'); assert.strictEqual(again.sent.length, 0, 'el aviso de terminado sale una sola vez');
});
test('sin la clave de mails no envía nada ni lo marca como enviado', async () => {
  await putState('m_contents', [C('n', '2026-11-27', 'Idea')]);
  const r = await sendPlanAlerts({ db, Timestamp: TS, fetch: async () => { throw new Error('no debería llamar'); }, now: () => at('2026-11-27'), resend: {}, tenantIds: ['cafeplan'] });
  assert.ok(r.some(x => x.skipped === 'falta configurar el envío'));
  const m = mailer(); await run(m, '2026-11-27'); assert.strictEqual(m.sent.length, 1, 'cuando se configura, ese día sí sale');
});
test('planificación terminada hace días: no avisa', async () => {
  const m = mailer(); await run(m, '2026-12-05'); assert.strictEqual(m.sent.length, 0);
});
