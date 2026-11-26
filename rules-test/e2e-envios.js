// Enviar un mail a un grupo desde CRM → Ventas (4 pasos), historial en Automatizaciones y ficha del contacto.
// Los mails no salen: el emulador los manda a un receptor local (RESEND_URL = 127.0.0.1:5999).
// Desde la raíz, con el sitio en 8410: firebase emulators:exec --only functions,auth,firestore --project brandazo "node rules-test/e2e-envios.js"
const { chromium } = require('playwright');
const http = require('http');
const BASE = 'http://localhost:8410/', P = 'brandazo';
const FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`, AU = 'http://127.0.0.1:9099';
const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const enc = v => v === null ? { nullValue: null } : v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const put = (p, d) => fetch(`${FS}/${p}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: enc(d).mapValue.fields }) });
const list = async p => ((await (await fetch(`${FS}/${p}`, { headers: H })).json()).documents || []);
const val = f => f.stringValue ?? f.integerValue ?? f.booleanValue ?? f.timestampValue;
const fails = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };
(async () => {
  const mails = []; const srv = http.createServer((q, r) => { let b = ''; q.on('data', d => b += d); q.on('end', () => { mails.push(JSON.parse(b || '{}')); r.writeHead(200, { 'Content-Type': 'application/json' }); r.end(JSON.stringify({ id: 'm' + mails.length })); }); }).listen(5999, '127.0.0.1');
  const EMAIL = 'duena@cafelito.test', NOW = new Date();
  await put('tenants/cafelito', { name: 'Cafelito Coffee House' });
  await put(`invites/${EMAIL}__cafelito`, { email: EMAIL, tenantId: 'cafelito', tenantName: 'Cafelito', role: 'Dueño', invitedBy: 'alta' });
  await put('tenants/cafelito/state/base', { json: JSON.stringify({ brands: [{ name: 'Cafelito Ambulante' }], workspaces: [{ name: 'General' }] }), by: 'alta' });
  await put('tenants/cafelito/contacts/c1', { name: 'Daniela Katch', email: 'dani@example.com', phoneE164: '+5493515550101', type: 'Cliente', marketingConsent: { granted: true } });
  await put('tenants/cafelito/contacts/c2', { name: 'Azafrán', phoneE164: '+5493515550102', type: 'Lead' });
  await put('tenants/cafelito/opportunities/op1', { pipeline: 'cafelito-eventos', brand: 'Cafelito Ambulante', owner: '', stage: 'ganada', contactId: 'c1', title: 'Cumpleaños · Daniela Katch', event: { type: 'Cumpleaños', date: '2026-11-10', guests: 40 }, won: { amountMinor: 9000000, depositMinor: 4500000, depositPaid: true, balancePaid: true }, createdAt: NOW });
  await put('tenants/cafelito/opportunities/op2', { pipeline: 'cafelito-eventos', brand: 'Cafelito Ambulante', owner: '', stage: 'en-negociacion', contactId: 'c2', title: 'Corporativo · Azafrán', event: { type: 'Corporativo', date: '2030-02-01', guests: 100 }, estimate: { brandazoSubtotalMinor: 67000000 }, createdAt: NOW });

  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + '?emu=1#/registro'); await page.waitForSelector('#pw2');
  await page.fill('#em', EMAIL); await page.fill('#pw2', 'Clave-segura-2026'); await page.check('#tos'); await page.click('#f button.btn-primary'); await page.waitForSelector('#vok');
  let vc; for (let i = 0; i < 40 && !vc; i++) { vc = (await (await fetch(`${AU}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.find(c => c.email === EMAIL); if (!vc) await new Promise(r => setTimeout(r, 250)); }
  await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:update?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode: vc.oobCode }) });
  await page.click('#vok'); await page.waitForSelector('.app', { timeout: 20000 });
  mails.length = 0;

  await page.goto(BASE + '#/app/crm/ventas'); await page.waitForSelector('[data-vnop]', { timeout: 20000 });
  await page.click('[data-vnm="cl"]'); await page.waitForSelector('[data-vncli]');
  await page.check('[data-vnchk="c1"]'); await page.check('[data-vnchk="c2"]');
  ok(!!(await page.$('[data-vnb="send"]')), 'la barra de selección tiene «Enviar mail»');
  await page.click('[data-vnb="send"]'); await page.waitForSelector('#envsub');
  await page.waitForFunction(() => /de 2 lo recibe/.test(document.querySelector('#envaud').textContent), null, { timeout: 15000 });
  const aud = await page.textContent('#envaud');
  ok(/1\s*de 2 lo recibe/.test(aud) && /1 quedan afuera/.test(aud) && /no aceptaron promociones/.test(aud), 'paso 1: 1 de 2 lo recibe, explica por qué la otra no');
  ok(await page.isDisabled('#envsend'), 'sin prueba, «Enviar» está apagado');
  await page.fill('#envsub', 'Feliz Navidad, {{nombre}} 🎄'); await page.fill('#envbody', '¡Hola, {{nombre}}!\n\nGracias por hacer tu evento con **Cafelito Ambulante**.\n\n{{regalo}}\n\n¡Felices fiestas!');
  await page.check('#envgift'); await page.fill('#envpct', '10'); await page.fill('#envexp', '2026-12-31'); await page.fill('#envpre', 'NAVIDAD');
  await page.click('#envtest'); await page.waitForFunction(() => /Prueba enviada/.test(document.querySelector('#envtestok').textContent), null, { timeout: 15000 });
  ok(mails.length === 1 && mails[0].to[0] === EMAIL && /^\[Prueba\]/.test(mails[0].subject) && /NAVIDAD-MUESTRA/.test(mails[0].html), 'paso 3: la prueba llega a la dueña con código de muestra');
  ok(!(await page.isDisabled('#envsend')) && /Enviar a 1 persona/.test(await page.textContent('#envsend')), 'con la prueba hecha se habilita «Enviar a 1 persona»');
  await page.fill('#envpct', '15'); await page.waitForTimeout(100);
  ok(await page.isDisabled('#envsend') && /mandate otra prueba/.test(await page.textContent('#envtestok')), 'si cambia algo, pide otra prueba');
  await page.fill('#envpct', '10'); await page.waitForTimeout(100); ok(!(await page.isDisabled('#envsend')), 'volviendo a lo probado, se habilita de nuevo');
  await page.check('input[name=envwhen][value=later]'); await page.fill('#envat', '2026-12-01T10:00');
  await page.click('#envsend'); ok(/Sí, programar/.test(await page.textContent('#envsend')), 'pide confirmar');
  await page.click('#envsend'); await page.waitForFunction(() => location.hash.includes('automatizaciones'), null, { timeout: 15000 });
  let ml = await list('tenants/cafelito/mailings');
  ok(ml.length === 1 && val(ml[0].fields.status) === 'scheduled' && val(ml[0].fields.recipients) === '1', 'queda programado para 1 persona');
  ok(mails.length === 1, 'programado: todavía no salió nada');
  await page.waitForSelector('[data-envcancel]', { timeout: 15000 });
  const hist = await page.textContent('#root'); ok(/Envíos a grupos/.test(hist) && /Feliz Navidad/.test(hist) && /Programado/.test(hist) && /Sale el 1 dic/.test(hist), 'historial: programado, sale el 1 dic');
  await page.click('[data-envcancel]'); await page.click('#envcok'); await page.waitForFunction(() => /Cancelado/.test(document.querySelector('#root').textContent), null, { timeout: 15000 });
  ok(true, 'cancelar lo deja «Cancelado»');
  // Envío ahora (sin regalo)
  await page.goto(BASE + '#/app/crm/ventas'); await page.waitForSelector('[data-vncli], [data-vnop]'); if (!(await page.$('[data-vncli]'))) await page.click('[data-vnm="cl"]');
  await page.waitForSelector('[data-vnchk="c1"]'); await page.check('[data-vnchk="c1"]'); await page.click('[data-vnb="send"]'); await page.waitForSelector('#envsub');
  await page.waitForFunction(() => /lo recibe/.test(document.querySelector('#envaud').textContent), null, { timeout: 15000 });
  await page.fill('#envsub', 'Novedades de diciembre'); await page.fill('#envbody', '¡Hola, {{nombre}}!\n\nYa abrimos los pedidos de Navidad.');
  await page.click('#envtest'); await page.waitForFunction(() => /Prueba enviada/.test(document.querySelector('#envtestok').textContent), null, { timeout: 15000 });
  await page.click('#envsend'); await page.click('#envsend'); await page.waitForFunction(() => location.hash.includes('automatizaciones'), null, { timeout: 15000 });
  const real = mails.filter(m => m.to[0] === 'dani@example.com');
  ok(real.length === 1 && real[0].subject === 'Novedades de diciembre' && /¡Hola, Daniela!/.test(real[0].html) && !/Tu regalo/.test(real[0].html), 'envío ahora: le llega a Daniela, sin regalo');
  ok(/\/api\/v1\/baja\?t=cafelito&amp;c=c1&amp;s=/.test(real[0].html) && real[0].headers && /baja/.test(real[0].headers['List-Unsubscribe']), 'lleva el link de baja');
  ok(!mails.some(m => m.to[0] !== EMAIL && m.to[0] !== 'dani@example.com'), 'a Azafrán (sin permiso) no le llega nada');
  await page.waitForFunction(() => /Enviado/.test(document.querySelector('#root').textContent), null, { timeout: 15000 });
  // Ficha
  await page.goto(BASE + '#/app/crm/contactos'); await page.waitForSelector('[data-evc]'); await page.evaluate(() => evContacto('c1')); await page.waitForSelector('#layer .drawer');
  await page.waitForFunction(() => /Recibió Novedades de diciembre/.test(document.querySelector('#layer').textContent), null, { timeout: 15000 }).catch(() => {});
  const f = await page.textContent('#layer'); ok(/Acepta promociones/.test(f) && /Recibió Novedades de diciembre/.test(f), 'la ficha muestra que acepta promociones y el mail que recibió');
  await page.keyboard.press('Escape');
  ok(!errs.length, 'sin errores en la página ' + errs.join(' | '));
  await b.close(); srv.close();
  console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
