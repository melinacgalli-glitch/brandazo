// Automatización «Gracias por tu primera compra»: configurar, activar, ver enviados y canjear un código.
// Desde la raíz, con el sitio en 8410: firebase emulators:exec --only functions,auth,firestore --project brandazo "node rules-test/e2e-automatizaciones.js"
const { chromium } = require('playwright');
const BASE = 'http://localhost:8410/', P = 'brandazo';
const FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`, AU = 'http://127.0.0.1:9099';
const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const enc = v => v === null ? { nullValue: null } : v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const put = (p, d) => fetch(`${FS}/${p}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: enc(d).mapValue.fields }) });
const get = p => fetch(`${FS}/${p}`, { headers: H }).then(r => r.json());
const fails = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };
const waitText = (page, sel, re, t = 15000) => page.waitForFunction(([s, r]) => new RegExp(r).test((document.querySelector(s) || {}).textContent || ''), [sel, re.source], { timeout: t }).catch(() => {});
(async () => {
  const EMAIL = 'duena@cafelito.test';
  await put('tenants/cafelito', { name: 'Cafelito Coffee House' });
  await put(`invites/${EMAIL}__cafelito`, { email: EMAIL, tenantId: 'cafelito', tenantName: 'Cafelito', role: 'Dueño', invitedBy: 'alta' });
  await put('tenants/cafelito/state/base', { json: JSON.stringify({ brands: [{ name: 'Cafelito Cakes', color: '#FF2D87', sells: 'tienda' }], workspaces: [{ name: 'General' }] }), by: 'alta' });
  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + '?emu=1#/registro'); await page.waitForSelector('#pw2');
  await page.fill('#em', EMAIL); await page.fill('#pw2', 'Clave-segura-2026'); await page.check('#tos'); await page.click('#f button.btn-primary'); await page.waitForSelector('#vok');
  let vc; for (let i = 0; i < 40 && !vc; i++) { vc = (await (await fetch(`${AU}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.find(c => c.email === EMAIL); if (!vc) await new Promise(r => setTimeout(r, 250)); }
  await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:update?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode: vc.oobCode }) });
  await page.click('#vok'); await page.waitForSelector('.app', { timeout: 20000 });

  await page.goto(BASE + '#/app/automatizaciones'); await waitText(page, '#root', /Gracias por tu primera compra/);
  const t0 = await page.textContent('#root');
  if (!/Gracias por tu primera compra/.test(t0)) { console.log('DIAG', t0.replace(/\s+/g, ' ').slice(0, 400), '| errores:', errs.join(' | ')); }
  ok(/Gracias por tu primera compra/.test(t0) && /Apagada/.test(t0) && !/Nuevo flujo/.test(t0), 'muestra la automatización real (apagada) y no el editor de flujos de ejemplo');
  await page.click('[data-autoggle]'); await page.waitForTimeout(400); ok(/completá a qué mail llegan las respuestas/.test(await page.textContent('body')), 'no deja activarla sin el mail para respuestas');
  await page.click('[data-auedit]'); await page.waitForSelector('#auok'); ok(/\{\{nombre\}\}/.test(await page.inputValue('#aub')) && /Cafelito Cakes/.test(await page.inputValue('#aub')), 'el editor trae el texto con {{nombre}}');
  await page.fill('#aurt', 'administracion@cafelito.co'); await page.click('#auok'); await waitText(page, '#root', /respuestas llegan a administracion@cafelito\.co/);
  ok(/respuestas llegan a administracion@cafelito\.co/.test(await page.textContent('#root')), 'guarda a dónde llegan las respuestas');
  await page.click('[data-autoggle]'); await waitText(page, '[data-autoggle]', /Apagar/); await page.waitForTimeout(500);
  const cfg = (await get('tenants/cafelito/settings/auto-primera-compra')).fields;
  ok(cfg.enabled.booleanValue === true && /^\d{4}-\d{2}-\d{2}$/.test(cfg.since.stringValue) && cfg.fromName.stringValue === 'Cafelito', 'activarla guarda la configuración y la fecha desde la que cuenta');
  await page.click('[data-autest]'); await page.waitForTimeout(1500); ok(/Todavía no está configurado el envío|No se pudo enviar|Te mandamos una prueba/.test(await page.textContent('body')), 'la prueba de envío responde con un mensaje claro');

  // Simula un envío del servidor y canjea el código
  const T = 'tenants/cafelito', today = new Date().toISOString().slice(0, 10), exp = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  await put(`${T}/coupons/GRACIAS-AB12`, { code: 'GRACIAS-AB12', automation: 'primera-compra', contactId: 'cat', name: 'Catalina Bellezze', pct: 10, sentDate: today, expires: exp, status: 'active' });
  await put(`${T}/autoSends/primera-compra_cat`, { at: new Date(), to: 'cata@example.com', code: 'GRACIAS-AB12', expires: exp, contactId: 'cat', name: 'Catalina Bellezze' });
  await waitText(page, '#root', /Catalina Bellezze/);
  ok(/Mails enviados\s*1/.test(await page.textContent('#root')) && /GRACIAS-AB12[\s\S]*Vigente/.test(await page.textContent('#root')), 'muestra el envío con su código vigente');
  await page.click('[data-aucoupon]'); await page.waitForSelector('#cpc'); await page.fill('#cpc', 'gracias-zz99'); await page.click('#cpok'); await waitText(page, '#layer', /no existe/);
  ok(/no existe/.test(await page.textContent('#layer')), 'un código inventado no existe');
  await page.fill('#cpc', 'gracias-ab12'); await page.click('#cpok'); await waitText(page, '#layer', /Válido · Catalina/);
  ok(/Válido · Catalina Bellezze · 10% de descuento/.test(await page.textContent('#layer')), 'verifica el código y muestra de quién es');
  await page.fill('#cpa', '45.000'); await page.click('#cpok'); await waitText(page, '#layer', /código canjeado/);
  ok(/código canjeado/.test(await page.textContent('#layer')), 'canjear lo marca como usado');
  await page.click('#layer .modal-foot [data-close]'); await waitText(page, '#root', /Códigos usados\s*1/);
  const t1 = await page.textContent('#root'); ok(/Códigos usados\s*1/.test(t1) && /Ventas con código\s*\$ 45\.000/.test(t1) && /Canjeado/.test(t1), 'mide códigos usados y ventas con código');
  await page.click('[data-aucoupon]'); await page.waitForSelector('#cpc'); await page.fill('#cpc', 'GRACIAS-AB12'); await page.click('#cpok'); await waitText(page, '#layer', /Ya se usó/);
  ok(/Ya se usó/.test(await page.textContent('#layer')), 'no se puede usar dos veces');
  await page.click('#layer .modal-foot [data-close]');
  await page.goto(BASE + '#/app/crm/tienda'); await page.waitForSelector('[data-aucoupon]', { timeout: 15000 }); ok(true, '«Canjear código» también está en CRM → Tienda');
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(BASE + '#/app/automatizaciones'); await page.waitForTimeout(1500);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desborde en celular');
  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
