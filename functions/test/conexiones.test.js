// Conexiones con Meta y Google Ads contra los emuladores y un simulador local de las APIs (puerto 5999).
// Correr desde la raíz:
//   firebase emulators:exec --only functions,firestore,auth --project demo-brandazo "node --test functions/test/conexiones.test.js"
// Usa functions/.secret.local y functions/.env.local (solo emulador, fuera del repositorio).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const admin = require('firebase-admin');

const P = 'demo-brandazo';
const BASE = `http://127.0.0.1:5001/${P}/southamerica-east1/conexiones/api/v1/connect`;
const { mock, calls } = require('./simulador');
let server, db, tokDueno, tokVentas;

async function idToken(uid, email) {
  const ct = await admin.auth().createCustomToken(uid, { email });
  const r = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: ct, returnSecureToken: true }) });
  return (await r.json()).idToken;
}
const post = (path, tok, body) => fetch(`${BASE}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify(body) });

before(async () => {
  server = http.createServer(mock); await new Promise(r => server.listen(5999, '127.0.0.1', r));
  admin.initializeApp({ projectId: P }); db = admin.firestore();
  await db.doc('tenants/cafelito').set({ name: 'Cafelito' });
  await db.doc('tenants/cafelito/members/u-dueno').set({ uid: 'u-dueno', role: 'Dueño', name: 'Melina' });
  await db.doc('tenants/cafelito/members/u-ventas').set({ uid: 'u-ventas', role: 'Ventas', name: 'Ventas' });
  await admin.auth().createUser({ uid: 'u-dueno', email: 'duena@cafelito.test' }).catch(() => {});
  await admin.auth().createUser({ uid: 'u-ventas', email: 'ventas@cafelito.test' }).catch(() => {});
  tokDueno = await idToken('u-dueno', 'duena@cafelito.test'); tokVentas = await idToken('u-ventas', 'ventas@cafelito.test');
});
after(async () => { server.close(); await admin.app().delete(); });

test('estado: las dos conexiones figuran configuradas', async () => {
  for (const p of ['meta', 'google-ads']) { const j = await (await fetch(`${BASE}/${p}/status`)).json(); assert.strictEqual(j.configured, true, p); }
});

test('sin sesión o sin ser Dueño/Admin no se puede conectar', async () => {
  assert.strictEqual((await post('meta/start', null, { tenantId: 'cafelito' })).status, 401);
  assert.strictEqual((await post('meta/start', 'basura', { tenantId: 'cafelito' })).status, 401);
  assert.strictEqual((await post('meta/start', tokVentas, { tenantId: 'cafelito' })).status, 403);
  assert.strictEqual((await post('meta/start', tokDueno, { tenantId: 'otra-empresa' })).status, 403);
});

test('Meta: conectar, sincronizar y ver los datos', async () => {
  const r = await post('meta/start', tokDueno, { tenantId: 'cafelito', returnTo: 'http://localhost:8410' });
  assert.strictEqual(r.status, 200); const { url } = await r.json();
  const au = new URL(url); const state = au.searchParams.get('state');
  assert.match(au.pathname, /\/v24\.0\/dialog\/oauth$/); assert.strictEqual(au.searchParams.get('client_id'), 'app-prueba');
  assert.match(au.searchParams.get('scope'), /instagram_manage_insights/); assert.ok(state.length > 20);
  // la persona autoriza en Meta y vuelve
  const cb = await fetch(`${BASE}/meta/callback?code=codigo-1&state=${state}`, { redirect: 'manual' });
  assert.strictEqual(cb.status, 302); assert.strictEqual(cb.headers.get('location'), 'http://localhost:8410#/app/redes?conexion=ok');
  const conn = (await db.doc('tenants/cafelito/connections/meta').get()).data();
  assert.strictEqual(conn.status, 'ok'); assert.deepStrictEqual(conn.accounts.map(a => a.net).sort(), ['Facebook', 'Instagram']);
  assert.ok(!JSON.stringify(conn).includes('tok-pagina') && !JSON.stringify(conn).includes('largo'), 'los permisos no quedan en lo que lee el equipo');
  const priv = (await db.doc('tenants/cafelito/private/meta').get()).data(); assert.strictEqual(priv.userToken, 'largo'); assert.strictEqual(priv.pages[0].token, 'tok-pagina');
  const ig = (await db.doc('tenants/cafelito/social/Instagram_ig1').get()).data();
  assert.strictEqual(ig.followers, 5321); assert.strictEqual(ig.posts[0].type, 'Reel'); assert.strictEqual(ig.posts[0].reach, 4300);
  assert.strictEqual(ig.posts[1].reach, null, 'sin alcance queda vacío, no en cero'); assert.strictEqual(ig.reachDaily.length, 2);
  const fb = (await db.doc('tenants/cafelito/social/Facebook_pg1').get()).data(); assert.strictEqual(fb.followers, 950); assert.strictEqual(fb.posts[0].likes, 40);
  const daily = await db.collection('tenants/cafelito/socialDaily').get(); assert.strictEqual(daily.size, 2);
  assert.ok(!(await db.doc(`connectStates/${state}`).get()).exists, 'el pase de un solo uso se borró');
  // reusar el mismo pase no sirve
  const again = await fetch(`${BASE}/meta/callback?code=codigo-1&state=${state}`, { redirect: 'manual' });
  assert.match(again.headers.get('location'), /conexion=vencida$/);
  const fake = await fetch(`${BASE}/meta/callback?code=x&state=inventado`, { redirect: 'manual' });
  assert.match(fake.headers.get('location'), /^https:\/\/www\.brandazo\.com\.ar#\/app\/redes\?conexion=vencida$/);
});

test('Meta: si la persona cancela, no se guarda nada nuevo', async () => {
  const { url } = await (await post('meta/start', tokDueno, { tenantId: 'cafelito', returnTo: 'https://evil.example.com' })).json();
  const state = new URL(url).searchParams.get('state');
  const cb = await fetch(`${BASE}/meta/callback?error=access_denied&state=${state}`, { redirect: 'manual' });
  assert.strictEqual(cb.headers.get('location'), 'https://www.brandazo.com.ar#/app/redes?conexion=cancelada', 'una dirección de vuelta ajena se reemplaza');
});

test('Google Ads: conectar y traer campañas en centavos', async () => {
  const { url } = await (await post('google-ads/start', tokDueno, { tenantId: 'cafelito', returnTo: 'http://localhost:8410' })).json();
  const au = new URL(url); assert.strictEqual(au.searchParams.get('access_type'), 'offline'); assert.match(au.searchParams.get('scope'), /adwords/);
  const cb = await fetch(`${BASE}/google-ads/callback?code=g-codigo&state=${au.searchParams.get('state')}`, { redirect: 'manual' });
  assert.strictEqual(cb.headers.get('location'), 'http://localhost:8410#/app/metricas/anuncios?conexion=ok');
  const conn = (await db.doc('tenants/cafelito/connections/googleAds').get()).data();
  assert.strictEqual(conn.accounts[0].name, 'Cafelito Ads'); assert.strictEqual(conn.accounts[0].currency, 'ARS');
  const ads = (await db.doc('tenants/cafelito/ads/1234567890').get()).data();
  assert.strictEqual(ads.campaigns[0].costMinor, 1500000, '$ 15.000 = 1.500.000 centavos'); assert.strictEqual(ads.campaigns[0].clicks, 640);
  assert.deepStrictEqual(ads.daily.map(d => d.date), ['2026-11-15', '2026-11-16'], 'días ordenados');
  assert.strictEqual(ads.daily[0].conversions, 0);
  assert.strictEqual((await db.doc('tenants/cafelito/private/googleAds').get()).data().refreshToken, 'g-permanente');
  const search = calls.find(c => /googleAds:search/.test(c.p)); assert.strictEqual(search.h['developer-token'], 'dev-prueba');
});

test('actualizar ahora y desconectar', async () => {
  const s = await post('google-ads/sync', tokDueno, { tenantId: 'cafelito' }); assert.strictEqual(s.status, 200);
  assert.ok(calls.some(c => c.p === '/gtoken' && /refresh_token/.test(c.body)), 'usa el permiso permanente para actualizar');
  assert.strictEqual((await post('meta/sync', tokVentas, { tenantId: 'cafelito' })).status, 403);
  const d = await post('meta/disconnect', tokDueno, { tenantId: 'cafelito' }); assert.strictEqual(d.status, 200);
  assert.ok(!(await db.doc('tenants/cafelito/private/meta').get()).exists); assert.ok(!(await db.doc('tenants/cafelito/connections/meta').get()).exists);
  assert.ok(calls.some(c => c.m === 'DELETE' && /me\/permissions/.test(c.p)), 'avisa a Meta que se quitó el permiso');
  const aud = await db.collection('tenants/cafelito/audit').get(); assert.ok(aud.size >= 3);
});

test('rutas y métodos inválidos', async () => {
  assert.strictEqual((await fetch(`${BASE}/tiktok/start`, { method: 'POST' })).status, 404);
  assert.strictEqual((await fetch(`${BASE}/meta/start`)).status, 405);
});
