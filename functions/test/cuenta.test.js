// Mails de cuenta con la marca Brandazo, con emuladores (auth, firestore, functions) y Resend simulado (puerto 5999).
// Desde la raíz: firebase emulators:exec --only functions,firestore,auth --project demo-brandazo "node --test functions/test/cuenta.test.js"
const { test, before, after } = require('node:test');
const assert = require('node:assert'); const http = require('node:http');
const admin = require('firebase-admin'); const { mock, calls } = require('./simulador');
const P = 'demo-brandazo', BASE = `http://127.0.0.1:5001/${P}/southamerica-east1/cuenta/api/v1/cuenta`, AU = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`;
let server; const mails = () => calls.filter(c => c.p === '/resend').map(c => JSON.parse(c.body));
const post = (p, body, tok) => fetch(`${BASE}/${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify(body || {}) });
before(async () => { server = http.createServer(mock); await new Promise(r => server.listen(5999, '127.0.0.1', r)); admin.initializeApp({ projectId: P });
  await admin.auth().createUser({ uid: 'u1', email: 'melina@cafelito.test', password: 'Vieja-clave-1' }).catch(() => {}); });
after(async () => { server.close(); await admin.app().delete(); });

test('recuperar: mail de Brandazo con enlace a nuestras pantallas, y el código funciona', async () => {
  const r = await post('recuperar', { email: 'Melina@Cafelito.test' }); assert.strictEqual(r.status, 200); assert.deepStrictEqual(await r.json(), { ok: true });
  const m = mails().pop(); assert.deepStrictEqual(m.to, ['melina@cafelito.test']); assert.strictEqual(m.from, 'Brandazo <avisos@brandazo.com.ar>');
  assert.strictEqual(m.subject, 'Creá una contraseña nueva para Brandazo'); assert.match(m.html, /<span style="color:#FF2D87">\/<\/span>brandazo/);
  const link = m.html.match(/href="(https:\/\/www\.brandazo\.com\.ar\/accion\?[^"]+)"/)[1].replace(/&amp;/g, '&'); const u = new URL(link);
  assert.strictEqual(u.searchParams.get('mode'), 'resetPassword');
  const rp = await (await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode: u.searchParams.get('oobCode'), newPassword: 'Nueva-clave-2' }) })).json();
  assert.strictEqual(rp.email, 'melina@cafelito.test', JSON.stringify(rp));
});
test('recuperar: un email que no existe responde igual y no manda nada', async () => {
  const n = mails().length; const r = await post('recuperar', { email: 'nadie@ningun.test' }); assert.deepStrictEqual(await r.json(), { ok: true }); assert.strictEqual(mails().length, n);
  assert.strictEqual((await post('recuperar', { email: 'no-es-email' })).status, 400);
});
test('límite: más de 3 por hora para el mismo email', async () => {
  await post('recuperar', { email: 'melina@cafelito.test' }); await post('recuperar', { email: 'melina@cafelito.test' });
  const r = await post('recuperar', { email: 'melina@cafelito.test' }); assert.strictEqual(r.status, 429);
});
test('verificar: necesita sesión y manda el mail de confirmación', async () => {
  assert.strictEqual((await post('verificar', {})).status, 401);
  await admin.auth().createUser({ uid: 'u2', email: 'nueva@cafelito.test', password: 'Clave-segura-1' }).catch(() => {});
  const s = await (await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'nueva@cafelito.test', password: 'Clave-segura-1', returnSecureToken: true }) })).json();
  const r = await post('verificar', {}, s.idToken); assert.strictEqual(r.status, 200);
  const m = mails().pop(); assert.strictEqual(m.subject, 'Confirmá tu email para entrar a Brandazo'); assert.match(m.html, /\/accion\?mode=verifyEmail&amp;oobCode=/);
});
