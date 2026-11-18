// Pruebas de storage.rules (archivos de marca) contra los emuladores de Storage y Firestore.
// Desde la raíz: firebase emulators:exec --only storage,firestore --project demo-brandazo "cd rules-test && node --test archivos.test.js"
const { test, before, after } = require('node:test');
const fs = require('node:fs'); const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { ref, uploadBytes, getBytes, deleteObject } = require('firebase/storage');
let env;
const st = (uid, email) => env.authenticatedContext(uid, { email, email_verified: true }).storage();
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-brandazo',
    firestore: { host: '127.0.0.1', port: 8080, rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') },
    storage: { host: '127.0.0.1', port: 9199, rules: fs.readFileSync(path.join(__dirname, '..', 'storage.rules'), 'utf8') } });
  // Miembros cargados por REST con permisos de administrador del emulador (sin pasar por las reglas)
  for (const [p, uid, role] of [['tenants/cafelito/members/u-dueno', 'u-dueno', 'Dueño'], ['tenants/otra/members/u-ext', 'u-ext', 'Dueño'], ['tenants/cafelito/members/u-ventas', 'u-ventas', 'Ventas']])
    await fetch(`http://127.0.0.1:8080/v1/projects/demo-brandazo/databases/(default)/documents/${p}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { uid: { stringValue: uid }, role: { stringValue: role } } }) });
});
after(async () => { await env.cleanup(); });

test('un miembro sube, lee y borra archivos de su empresa', async () => {
  const s = st('u-dueno', 'duena@cafelito.test'), r = ref(s, 'tenants/cafelito/marcas/cafelito-ambulante/1-logo.png');
  await assertSucceeds(uploadBytes(r, png, { contentType: 'image/png' }));
  await assertSucceeds(getBytes(r));
  await assertSucceeds(uploadBytes(ref(s, 'tenants/cafelito/marcas/cafelito-ambulante/2-manual.pdf'), png, { contentType: 'application/pdf' }));
  await assertSucceeds(uploadBytes(ref(s, 'tenants/cafelito/marcas/cafelito-ambulante/3-precios.xlsx'), png, { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  await assertSucceeds(deleteObject(r));
});
test('otra empresa o alguien sin sesión no ve ni sube', async () => {
  await env.withSecurityRulesDisabled(async c => { await uploadBytes(ref(c.storage(), 'tenants/cafelito/marcas/x/logo.png'), png, { contentType: 'image/png' }); });
  await assertFails(getBytes(ref(st('u-ext', 'otra@empresa.test'), 'tenants/cafelito/marcas/x/logo.png')));
  await assertFails(uploadBytes(ref(st('u-ext', 'otra@empresa.test'), 'tenants/cafelito/marcas/x/intruso.png'), png, { contentType: 'image/png' }));
  await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), 'tenants/cafelito/marcas/x/logo.png')));
  await assertFails(deleteObject(ref(st('u-ext', 'otra@empresa.test'), 'tenants/cafelito/marcas/x/logo.png')));
});
test('tipos y tamaños fuera de lo permitido', async () => {
  const s = st('u-dueno', 'duena@cafelito.test');
  await assertFails(uploadBytes(ref(s, 'tenants/cafelito/marcas/x/pagina.html'), png, { contentType: 'text/html' }));
  await assertFails(uploadBytes(ref(s, 'tenants/cafelito/marcas/x/script.js'), png, { contentType: 'application/javascript' }));
  await assertFails(uploadBytes(ref(s, 'tenants/cafelito/marcas/x/grande.png'), new Uint8Array(25 * 1024 * 1024 + 1), { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(s, 'tenants/cafelito/otra-carpeta/logo.png'), png, { contentType: 'image/png' }));
});

test('logo de la empresa: Dueño/Admin lo cambian, el resto del equipo solo lo ve', async () => {
  const d = st('u-dueno', 'duena@cafelito.test'), v = st('u-ventas', 'ventas@cafelito.test');
  await assertSucceeds(uploadBytes(ref(d, 'tenants/cafelito/empresa/1-logo.png'), png, { contentType: 'image/png' }));
  await assertSucceeds(getBytes(ref(v, 'tenants/cafelito/empresa/1-logo.png')));
  await assertFails(uploadBytes(ref(v, 'tenants/cafelito/empresa/2-logo.png'), png, { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(d, 'tenants/cafelito/empresa/3-doc.pdf'), png, { contentType: 'application/pdf' }));
  await assertFails(deleteObject(ref(v, 'tenants/cafelito/empresa/1-logo.png')));
  await assertSucceeds(deleteObject(ref(d, 'tenants/cafelito/empresa/1-logo.png')));
});
