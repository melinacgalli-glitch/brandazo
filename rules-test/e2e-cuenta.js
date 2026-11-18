// Pantallas de los enlaces de cuenta (/accion): cambiar contraseña, enlace vencido, verificar email. Emuladores auth+firestore.
// firebase emulators:exec --only auth,firestore --project brandazo "node rules-test/e2e-cuenta.js"   (sitio en 8410)
const { chromium } = require('playwright'); const os = require('node:os'), path = require('node:path');
const BASE = 'http://localhost:8410/', P = 'brandazo', AU = 'http://127.0.0.1:9099';
const fails = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };
const codes = async (email, type) => (await (await fetch(`${AU}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.filter(c => c.email === email && c.requestType === type).pop();
(async () => {
  const EMAIL = 'cuenta@cafelito.test';
  const su = await (await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: 'Vieja-clave-2026', returnSecureToken: true }) })).json();
  await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: su.idToken }) });
  await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: EMAIL }) });
  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + '?emu=1#/login'); await page.waitForSelector('#f');
  const rp = await codes(EMAIL, 'PASSWORD_RESET');
  await page.goto(`${BASE}accion?mode=resetPassword&oobCode=${rp.oobCode}&apiKey=x&lang=es`); await page.waitForSelector('#axf', { timeout: 15000 });
  ok(/cuenta@cafelito\.test/.test(await page.textContent('#root')) && /Brandazo/.test(await page.evaluate(() => document.querySelector('.auth-art') ? 'Brandazo' : '')), 'cambiar contraseña: pantalla con el diseño de Brandazo y el email');
  ok(page.url().endsWith('/#/accion'), 'la dirección queda limpia (sin el código a la vista)');
  await page.screenshot({ path: path.join(os.tmpdir(), 'e2e-nueva-clave.png') });
  await page.fill('#n1', 'Nueva-clave-2026'); await page.fill('#n2', 'Otra-distinta'); await page.click('#axf button.btn-primary');
  ok(/no coinciden/.test(await page.textContent('#axf')), 'avisa si las contraseñas no coinciden');
  await page.fill('#n2', 'Nueva-clave-2026'); await page.click('#axf button.btn-primary'); await page.waitForSelector('text=Contraseña actualizada', { timeout: 15000 }); ok(true, 'contraseña cambiada');
  const login = await (await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: 'Nueva-clave-2026', returnSecureToken: true }) })).json();
  ok(!!login.idToken, 'la contraseña nueva funciona');
  await page.goto(`${BASE}accion?mode=resetPassword&oobCode=${rp.oobCode}`); await page.waitForSelector('text=El enlace venció o ya se usó', { timeout: 15000 }); ok(true, 'el mismo enlace usado de nuevo: «venció o ya se usó»');
  const ve = await codes(EMAIL, 'VERIFY_EMAIL');
  await page.goto(`${BASE}accion?mode=verifyEmail&oobCode=${ve.oobCode}`); await page.waitForSelector('text=Email verificado', { timeout: 15000 }); ok(true, 'verificar email con el diseño de Brandazo');
  await page.goto(`${BASE}accion`); await page.waitForSelector('text=Enlace incompleto'); ok(true, 'enlace sin código: mensaje claro');
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`${BASE}accion?mode=resetPassword&oobCode=x`); await page.waitForSelector('h1'); ok(await page.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin desborde en celular');
  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
