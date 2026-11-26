// Envío de un mail a un segmento, contra el emulador de Firestore (el envío se simula: no sale ningún mail).
// Desde la raíz: firebase emulators:exec --only firestore --project demo-brandazo "node --test functions/test/envios.test.js"
const { test, before } = require('node:test');
const assert = require('node:assert');
const admin = require('firebase-admin');
const { handleMailing, runMailings, handleUnsubscribe, unsubUrl } = require('../src/mailings');
let db; const TS = admin.firestore.Timestamp, TID = 'cafeenvios', T = () => db.collection('tenants').doc(TID);
const MAIL = { provider: 'resend', apiKey: 're_x', from: 'Brandazo <avisos@brandazo.com.ar>' };
const at = (iso, h) => Date.parse(`${iso}T${String(h + 3).padStart(2, '0')}:05:00Z`); // hora de Córdoba
const mailer = (failTo) => { const sent = []; return { sent, fetch: async (url, o) => { const b = JSON.parse(o.body); if (failTo && b.to[0] === failTo) return { ok: false, status: 422, json: async () => ({ message: 'rebotó' }) }; sent.push({ ...b, idem: o.headers['Idempotency-Key'] }); return { ok: true, status: 200, json: async () => ({ id: 'm' + sent.length }) }; } }; };
const ctx = (m, now, role = 'Dueño') => ({ deps: { db, Timestamp: TS, fetch: m.fetch, now: () => now, resend: MAIL }, user: { uid: 'u1', email: 'melina@example.com' }, by: 'Melina Galli', tenantRef: T(), role });
const DRAFT = { subject: 'Feliz Navidad, {{nombre}} 🎄', body: '¡Hola, {{nombre}}!\n\nGracias por hacer tu evento con nosotros.\n\n{{regalo}}\n\n¡Felices fiestas!', fromName: 'Cafelito Avisos', replyTo: 'administracion@cafelito.co', campaign: 'navidad-2026',
  gift: { on: true, pct: 10, expires: '2026-12-31', prefix: 'NAVIDAD' } };
const OK = { granted: true, source: 'test' };
before(async () => {
  admin.initializeApp({ projectId: 'demo-brandazo' }); db = admin.firestore();
  await T().collection('contacts').doc('dani').set({ name: 'Daniela Katch', email: 'dani@example.com', marketingConsent: OK });
  await T().collection('contacts').doc('ana').set({ name: 'Ana Sol', email: 'ana@example.com', marketingConsent: OK });
  await T().collection('contacts').doc('nocon').set({ name: 'Sin Permiso', email: 'np@example.com' });
  await T().collection('contacts').doc('nomail').set({ name: 'Sin Mail', marketingConsent: OK });
  await T().collection('contacts').doc('baja').set({ name: 'Dio De Baja', email: 'b@example.com', marketingConsent: { granted: false } });
  await T().collection('contacts').doc('rebota').set({ name: 'Rebota', email: 'rebota@example.com', marketingConsent: OK });
});
const NOW = at('2026-11-27', 11);

test('a quién le llega: solo quienes aceptaron promociones y tienen email', async () => {
  const r = await handleMailing({ kind: 'mail-audience', contactIds: ['dani', 'ana', 'nocon', 'nomail', 'baja', 'x'] }, ctx(mailer(), NOW));
  assert.deepStrictEqual(r.body.ok.map(p => p.id).sort(), ['ana', 'dani']);
  assert.strictEqual(r.body.noConsent.length, 1); assert.strictEqual(r.body.noEmail.length, 1); assert.strictEqual(r.body.unsub.length, 1); assert.strictEqual(r.body.missing.length, 1);
});
test('sin prueba no se envía; Marketing no puede enviar; datos inválidos, rechazados', async () => {
  let r = await handleMailing({ kind: 'mail-send', draft: DRAFT, contactIds: ['dani'], requestId: 'envio-0001' }, ctx(mailer(), NOW));
  assert.strictEqual(r.status, 409); assert.strictEqual(r.body.error.code, 'NEEDS_TEST');
  r = await handleMailing({ kind: 'mail-send', draft: DRAFT, contactIds: ['dani'], requestId: 'envio-0001' }, ctx(mailer(), NOW, 'Marketing')); assert.strictEqual(r.status, 403);
  r = await handleMailing({ kind: 'mail-test', draft: { ...DRAFT, subject: '', gift: { on: true, pct: 0, expires: '2020-01-01' } } }, ctx(mailer(), NOW));
  assert.strictEqual(r.status, 422); assert.deepStrictEqual(r.body.error.details.map(d => d.field).sort(), ['gift.expires', 'gift.pct', 'subject']);
});
test('la prueba llega a quien la pide, con un código de muestra que no sirve', async () => {
  const m = mailer(); const r = await handleMailing({ kind: 'mail-test', draft: DRAFT }, ctx(m, NOW, 'Marketing'));
  assert.strictEqual(r.status, 200); assert.strictEqual(m.sent.length, 1); assert.deepStrictEqual(m.sent[0].to, ['melina@example.com']);
  assert.match(m.sent[0].subject, /^\[Prueba\] Feliz Navidad, Melina/); assert.match(m.sent[0].html, /NAVIDAD-MUESTRA/); assert.match(m.sent[0].html, /10% off/);
  assert.ok(!(await T().collection('coupons').doc('NAVIDAD-MUESTRA').get()).exists, 'el código de muestra no existe');
});
test('programado para el 1/12 a las 10: no sale antes; a la hora sale uno por persona, con su código y su link de baja', async () => {
  const m = mailer('rebota@example.com');
  let r = await handleMailing({ kind: 'mail-send', draft: DRAFT, contactIds: ['dani', 'ana', 'nocon', 'rebota'], requestId: 'envio-navidad-01', sendAt: '2026-12-01T10:00:00-03:00', segmentName: 'Eventos 2026' }, ctx(m, NOW));
  assert.strictEqual(r.status, 201, JSON.stringify(r.body)); assert.strictEqual(r.body.status, 'scheduled'); assert.strictEqual(r.body.recipients, 3); assert.strictEqual(m.sent.length, 0);
  r = await handleMailing({ kind: 'mail-send', draft: DRAFT, contactIds: ['dani'], requestId: 'envio-navidad-01', sendAt: '2026-12-01T10:00:00-03:00' }, ctx(m, NOW));
  assert.strictEqual(r.body.duplicate, true, 'tocar dos veces no crea otro envío');
  await runMailings({ db, Timestamp: TS, fetch: m.fetch, now: () => at('2026-12-01', 9), resend: MAIL, tenantIds: [TID] }); assert.strictEqual(m.sent.length, 0, 'a las 9 todavía no');
  await runMailings({ db, Timestamp: TS, fetch: m.fetch, now: () => at('2026-12-01', 10), resend: MAIL, tenantIds: [TID] });
  assert.deepStrictEqual(m.sent.map(x => x.to[0]).sort(), ['ana@example.com', 'dani@example.com']);
  const d = m.sent.find(x => x.to[0] === 'dani@example.com');
  assert.strictEqual(d.from, 'Cafelito Avisos <avisos@brandazo.com.ar>'); assert.strictEqual(d.reply_to, 'administracion@cafelito.co'); assert.strictEqual(d.subject, 'Feliz Navidad, Daniela 🎄');
  assert.match(d.html, /¡Hola, Daniela!/); assert.match(d.html, /Válido hasta el <b[^>]*>31\/12\/2026<\/b>/); assert.match(d.html, /No quiero recibir más mails/);
  assert.match(d.headers['List-Unsubscribe'], /\/api\/v1\/baja\?t=cafeenvios&c=dani&s=[a-f0-9]{32}/); assert.ok(d.idem.includes('envio-navidad-01-dani'));
  const code = d.html.match(/NAVIDAD-[A-Z0-9]{4}/)[0], cp = (await T().collection('coupons').doc(code).get()).data();
  assert.strictEqual(cp.contactId, 'dani'); assert.strictEqual(cp.pct, 10); assert.strictEqual(cp.expires, '2026-12-31'); assert.strictEqual(cp.mailingId, 'envio-navidad-01'); assert.strictEqual(cp.status, 'active');
  const ml = (await T().collection('mailings').doc('envio-navidad-01').get()).data();
  assert.strictEqual(ml.status, 'sent'); assert.deepStrictEqual(ml.stats, { sent: 2, failed: 1, skipped: 1 });
  assert.strictEqual((await T().collection('mailSends').doc('envio-navidad-01_nocon').get()).data().reason, 'no aceptó promociones');
  await runMailings({ db, Timestamp: TS, fetch: m.fetch, now: () => at('2026-12-01', 11), resend: MAIL, tenantIds: [TID] }); assert.strictEqual(m.sent.length, 2, 'no se repite');
});
test('cambiar el texto pide otra prueba; enviar ahora sale en el momento; cancelar solo lo programado', async () => {
  const m = mailer();
  let r = await handleMailing({ kind: 'mail-send', draft: { ...DRAFT, body: DRAFT.body + ' Otro.' }, contactIds: ['ana'], requestId: 'envio-0002' }, ctx(m, NOW)); assert.strictEqual(r.body.error.code, 'NEEDS_TEST');
  const nog = { ...DRAFT, subject: 'Novedades', gift: { on: false } }; await handleMailing({ kind: 'mail-test', draft: nog }, ctx(m, NOW));
  r = await handleMailing({ kind: 'mail-send', draft: nog, contactIds: ['ana'], requestId: 'envio-0003' }, ctx(m, NOW));
  assert.strictEqual(r.body.status, 'sent'); const last = m.sent[m.sent.length - 1]; assert.strictEqual(last.subject, 'Novedades'); assert.doesNotMatch(last.html, /Tu regalo/);
  r = await handleMailing({ kind: 'mail-cancel', id: 'envio-0003' }, ctx(m, NOW)); assert.strictEqual(r.status, 409);
  await handleMailing({ kind: 'mail-send', draft: nog, contactIds: ['ana'], requestId: 'envio-0004', sendAt: '2026-12-20T10:00:00-03:00' }, ctx(m, NOW));
  r = await handleMailing({ kind: 'mail-cancel', id: 'envio-0004' }, ctx(m, NOW)); assert.strictEqual(r.body.status, 'cancelled');
});
test('la baja: el link pide confirmar, después marca que no acepta más y queda afuera de los envíos', async () => {
  const u = new URL(unsubUrl(MAIL, TID, 'ana')), q = Object.fromEntries(u.searchParams);
  let r = await handleUnsubscribe({ method: 'GET', query: q }, { db, Timestamp: TS, resend: MAIL }); assert.match(r.html, /No quiero recibir más mails/);
  assert.strictEqual((await T().collection('contacts').doc('ana').get()).data().marketingConsent.granted, true, 'abrir el link no da de baja');
  r = await handleUnsubscribe({ method: 'POST', query: { ...q, s: 'a'.repeat(32) } }, { db, Timestamp: TS, resend: MAIL }); assert.strictEqual(r.status, 400, 'firma falsa');
  r = await handleUnsubscribe({ method: 'POST', query: q }, { db, Timestamp: TS, resend: MAIL }); assert.match(r.html, /Listo/);
  assert.strictEqual((await T().collection('contacts').doc('ana').get()).data().marketingConsent.granted, false);
  const a = await handleMailing({ kind: 'mail-audience', contactIds: ['ana'] }, ctx(mailer(), NOW)); assert.strictEqual(a.body.unsub.length, 1);
});
test('tope diario: lo que no entra sale al día siguiente', async () => {
  const ids = []; for (let i = 0; i < 103; i++) { ids.push('p' + i); await T().collection('contacts').doc('p' + i).set({ name: 'P' + i, email: `p${i}@example.com`, marketingConsent: OK }); }
  const m = mailer(), D2 = at('2026-12-02', 11), nog = { ...DRAFT, subject: 'Masivo', gift: { on: false } };
  await handleMailing({ kind: 'mail-test', draft: nog }, ctx(m, D2));
  const r = await handleMailing({ kind: 'mail-send', draft: nog, contactIds: ids, requestId: 'envio-masivo' }, ctx(m, D2));
  assert.strictEqual(m.sent.length - 1, 100, 'salen 100 (más la prueba)'); assert.strictEqual(r.body.status, 'sending');
  await runMailings({ db, Timestamp: TS, fetch: m.fetch, now: () => at('2026-12-03', 8), resend: MAIL, tenantIds: [TID] });
  assert.strictEqual(m.sent.length - 1, 103); assert.strictEqual((await T().collection('mailings').doc('envio-masivo').get()).data().status, 'sent');
});
