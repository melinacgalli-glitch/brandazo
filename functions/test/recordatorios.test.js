// Recordatorios de seguimiento contra el emulador de Firestore (sin mandar mails: el envío se simula).
// Desde la raíz: firebase emulators:exec --only firestore --project demo-brandazo "node --test functions/test/recordatorios.test.js"
const { test, before } = require('node:test');
const assert = require('node:assert');
const admin = require('firebase-admin');
const { sendReminders } = require('../src/reminders');
let db; const TS = admin.firestore.Timestamp;
const NOW = Date.parse('2026-11-18T11:00:00Z'); // 8:00 en Córdoba
before(async () => {
  admin.initializeApp({ projectId: 'demo-brandazo' }); db = admin.firestore();
  const T = 'tenants/cafelito';
  await db.doc(T).set({ name: 'Cafelito Coffee House' });
  await db.doc(`${T}/members/u1`).set({ uid: 'u1', name: 'Melina Galli', email: 'melina@cafelito.test', role: 'Dueño' });
  await db.doc(`${T}/members/u2`).set({ uid: 'u2', name: 'Juli Ventas', email: 'juli@cafelito.test', role: 'Ventas' });
  await db.doc(`${T}/contacts/c1`).set({ name: 'Azafrán escuela de gastronomía', phoneE164: '+5493513061277' });
  const op = (id, d) => db.doc(`${T}/opportunities/${id}`).set({ pipeline: 'cafelito-eventos', brand: 'Cafelito Ambulante', event: { type: 'Lanzamiento o activación', date: '2026-12-12' }, estimate: { brandazoSubtotalMinor: 67000000 }, ...d });
  await op('hoy', { stage: 'contactado', owner: 'Melina Galli', contactId: 'c1', nextFollowUpAt: TS.fromMillis(Date.parse('2026-11-18T12:00:00Z')), nextAction: 'Escribirle por WhatsApp para ver si leyó la propuesta' });
  await op('vencido', { stage: 'propuesta-enviada', owner: 'Melina Galli', contactId: 'c1', nextFollowUpAt: TS.fromMillis(Date.parse('2026-11-15T12:00:00Z')), proposal: { amountMinor: 70000000 } });
  await op('manana', { stage: 'contactado', owner: 'Melina Galli', contactId: 'c1', nextFollowUpAt: TS.fromMillis(Date.parse('2026-11-19T12:00:00Z')) });
  await op('ganada', { stage: 'ganada', owner: 'Melina Galli', contactId: 'c1', nextFollowUpAt: TS.fromMillis(Date.parse('2026-11-17T12:00:00Z')) });
  await op('dejuli', { stage: 'en-negociacion', owner: 'Juli Ventas', contactId: 'c1', nextFollowUpAt: TS.fromMillis(Date.parse('2026-11-18T20:00:00Z')) });
  await op('sinresp', { stage: 'nueva-cotizacion', owner: '', contactId: 'c1', nextFollowUpAt: TS.fromMillis(Date.parse('2026-11-18T13:00:00Z')) });
  await db.collection(`${T}/activities`).add({ opportunityId: 'hoy', at: TS.fromMillis(NOW - 864e5), text: 'Se le envió un mensaje el 16/11, no respondió', type: 'contacto' });
});

test('un mail por responsable con lo de hoy y lo vencido, nada de mañana ni de cerradas', async () => {
  const sent = [];
  const fetch = async (url, o) => { sent.push({ url, h: o.headers, b: JSON.parse(o.body) }); return { ok: true, status: 200, json: async () => ({ id: 'msg_' + sent.length }) }; };
  const r = await sendReminders({ db, Timestamp: TS, fetch, now: () => NOW, resend: { apiKey: 'k', from: 'Brandazo <avisos@brandazo.com.ar>' }, tenantIds: ['cafelito'] });
  const mel = sent.find(s => s.b.to[0] === 'melina@cafelito.test'), juli = sent.find(s => s.b.to[0] === 'juli@cafelito.test');
  assert.strictEqual(sent.length, 2, JSON.stringify(r));
  assert.match(mel.b.subject, /Hoy tenés 3 seguimientos \(1 vencido\) · Cafelito Coffee House/);
  assert.match(mel.b.html, /Escribirle por WhatsApp para ver si leyó la propuesta/);
  assert.match(mel.b.html, /Vencido desde el 15 nov/);
  assert.match(mel.b.html, /https:\/\/wa\.me\/5493513061277/);
  assert.match(mel.b.html, /#\/app\/crm\/eventos\?t=cafelito&amp;op=hoy/);
  assert.match(mel.b.html, /Último registro: Se le envió un mensaje/);
  assert.match(mel.b.html, /\$ 700\.000/, 'usa el importe propuesto si existe');
  assert.ok(!/manana|ganada/.test(JSON.stringify(mel.b.html.match(/op=[a-z]+/g))), 'ni lo de mañana ni las ganadas');
  assert.ok(/op=sinresp/.test(mel.b.html), 'sin responsable: le llega al Dueño');
  assert.match(juli.b.subject, /Hoy tenés 1 seguimiento ·/);
  assert.strictEqual(mel.b.from, 'Brandazo <avisos@brandazo.com.ar>');
});

test('no se repite el mismo día aunque la función corra de nuevo', async () => {
  const sent = []; const fetch = async (u, o) => { sent.push(o); return { ok: true, status: 200, json: async () => ({}) }; };
  const r = await sendReminders({ db, Timestamp: TS, fetch, now: () => NOW + 3600e3, resend: { apiKey: 'k', from: 'x <a@b.c>' }, tenantIds: ['cafelito'] });
  assert.strictEqual(sent.length, 0); assert.ok(r.every(x => x.skipped === 'ya enviado hoy'));
});

test('sin configurar el envío no manda nada ni falla', async () => {
  const sent = []; const r = await sendReminders({ db, Timestamp: TS, fetch: async () => { sent.push(1); }, now: () => NOW + 864e5, resend: {}, tenantIds: ['cafelito'] });
  assert.strictEqual(sent.length, 0); assert.ok(r.every(x => x.skipped === 'falta configurar el envío'));
});

test('si Resend rechaza, no marca como enviado (se reintenta)', async () => {
  const fetch = async () => ({ ok: false, status: 403, json: async () => ({ message: 'domain not verified' }) });
  const r = await sendReminders({ db, Timestamp: TS, fetch, now: () => NOW + 2 * 864e5, resend: { apiKey: 'k', from: 'x <a@b.c>' }, tenantIds: ['cafelito'] });
  assert.ok(r.some(x => /403 domain not verified/.test(x.error || '')), JSON.stringify(r));
  const d = await db.collection('tenants/cafelito/reminders').get(); assert.strictEqual(d.size, 2, 'solo los del primer día');
});

test('también manda con SendGrid (clave «SG.»)', async () => {
  const sent = []; const fetch = async (url, o) => { sent.push({ url, b: JSON.parse(o.body) }); return { ok: true, status: 202, headers: { get: () => 'sg-1' }, json: async () => ({}) }; };
  const r = await sendReminders({ db, Timestamp: TS, fetch, now: () => NOW + 3 * 864e5, resend: { apiKey: 'SG.prueba', from: 'Brandazo <avisos@brandazo.com.ar>' }, tenantIds: ['cafelito'] });
  assert.ok(sent.length >= 1, JSON.stringify(r)); assert.strictEqual(sent[0].url, 'https://api.sendgrid.com/v3/mail/send');
  assert.deepStrictEqual(sent[0].b.from, { name: 'Brandazo', email: 'avisos@brandazo.com.ar' }); assert.strictEqual(sent[0].b.content[0].type, 'text/html');
});
