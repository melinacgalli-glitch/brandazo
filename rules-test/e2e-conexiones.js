// Recorrido en navegador de Redes sociales (Meta) y Métricas → Google Ads, con emuladores y el simulador de APIs.
// Desde la raíz, con el sitio servido en 8410:
//   firebase emulators:exec --only functions,auth,firestore --project brandazo "node rules-test/e2e-conexiones.js"
const { chromium } = require('playwright');
const http = require('node:http');
const { mock } = require('../functions/test/simulador');
const BASE = 'http://localhost:8410/';
const P = 'brandazo';
const FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`;
const AU = 'http://127.0.0.1:9099';
const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const enc = v => v === null ? { nullValue: null } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const put = (p, data) => fetch(`${FS}/${p}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: enc(data).mapValue.fields }) });
const get = p => fetch(`${FS}/${p}`, { headers: H }).then(r => r.json());
const fails = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };

(async () => {
  const sim = http.createServer(mock); await new Promise(r => sim.listen(5999, '127.0.0.1', r));
  const EMAIL = 'duena@cafelito.test';
  await put('tenants/cafelito', { name: 'Cafelito Coffee House' });
  await put(`invites/${EMAIL}__cafelito`, { email: EMAIL, tenantId: 'cafelito', tenantName: 'Cafelito Coffee House', role: 'Dueño', invitedBy: 'alta' });
  await put('tenants/cafelito/state/base', { json: JSON.stringify({ brands: [{ name: 'Cafelito Ambulante', color: '#FF2D87' }, { name: 'Cafelito Coffee', color: '#7C4DFF' }], workspaces: [{ name: 'General' }] }), by: 'alta' });

  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/PERMISSION_DENIED|favicon|status of 400/.test(m.text())) errs.push(m.text()); });
  await page.goto(BASE + '?emu=1#/registro'); await page.waitForSelector('#pw2');
  await page.fill('#em', EMAIL); await page.fill('#pw2', 'Clave-segura-2026'); await page.check('#tos'); await page.click('#f button.btn-primary');
  await page.waitForSelector('#vok'); const code = (await (await fetch(`${AU}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.find(c => c.email === EMAIL); await fetch(code.oobLink); await page.click('#vok');
  await page.waitForSelector('.app', { timeout: 20000 });

  // Redes: sin conectar
  await page.goto(BASE + '#/app/redes'); await page.waitForSelector('[data-cxconn]', { timeout: 15000 });
  ok(/Brandazo solo leer|solo <b>lee|solo lee/.test(await page.textContent('#root')) || /solo/.test(await page.textContent('.card.empty')), 'explica que Brandazo solo lee');
  await page.screenshot({ path: require('os').tmpdir() + '/cx-redes-vacio.png' });
  // Conectar → simulador de Meta → vuelta
  await page.click('[data-cxconn]');
  await page.waitForURL(/#\/app\/redes/, { timeout: 30000 }); await page.waitForSelector('[data-cxbrand]', { timeout: 30000 });
  ok(!/conexion=/.test(page.url()), 'la dirección queda limpia después de volver');
  ok(await page.isVisible('text=Cuenta conectada'), 'aviso «Cuenta conectada»');
  const txt = await page.textContent('#root');
  ok(/@cafelito\.cba/.test(txt) && /5\.321/.test(txt) && /950/.test(txt), 'muestra Instagram (5.321 seguidores) y Facebook (950)');
  ok(/Reel de la barra/.test(txt) && /4\.300/.test(txt), 'publicaciones con alcance real');
  ok(/Sin datos/.test(txt), 'lo que Meta no informa dice «Sin datos»');
  ok(/2\.500/.test(txt), 'alcance de 28 días sumado (1.000 + 1.500)');
  await page.screenshot({ path: require('os').tmpdir() + '/cx-redes.png', fullPage: true });
  // Asignar marca y filtrar
  await page.selectOption('[data-cxbrand="Instagram_ig1"]', 'Cafelito Ambulante'); await page.waitForTimeout(1200);
  const map = await get('tenants/cafelito/settings/social'); ok(map.fields && map.fields.brandByAccount.mapValue.fields.Instagram_ig1.stringValue === 'Cafelito Ambulante', 'marca de la cuenta guardada');
  await page.evaluate(() => { S.brand = 0; render(); }); await page.waitForTimeout(500);
  const t2 = await page.textContent('#root'); ok(/@cafelito\.cba/.test(t2) && !/Nuevo café de especialidad/.test(t2), 'con la marca elegida solo se ve su cuenta');
  await page.evaluate(() => { S.brand = -1; render(); }); await page.waitForTimeout(300);
  // Actualizar ahora
  await page.click('#cxsync'); await page.waitForSelector('text=Datos actualizados', { timeout: 20000 }); ok(true, '«Actualizar ahora» funciona');

  // Google Ads
  await page.goto(BASE + '#/app/metricas/anuncios'); await page.waitForSelector('[data-gxconn]', { timeout: 15000 }); ok(true, 'Métricas tiene la solapa Google Ads');
  await page.click('[data-gxconn]'); await page.waitForSelector('text=Búsqueda eventos', { timeout: 30000 });
  const g = await page.textContent('#root');
  ok(/Cafelito Ads/.test(g) && /15\.000/.test(g) && /640/.test(g), 'campaña con inversión $ 15.000 y 640 clics');
  ok(/23,44|23\.44/.test(g) || /\$\s?23/.test(g), 'costo por clic calculado');
  await page.screenshot({ path: require('os').tmpdir() + '/cx-ads.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin desborde en celular (Google Ads)');
  await page.screenshot({ path: require('os').tmpdir() + '/cx-ads-movil.png' });
  await page.goto(BASE + '#/app/redes'); await page.waitForSelector('[data-cxbrand]'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin desborde en celular (Redes)');
  await page.setViewportSize({ width: 1280, height: 900 });

  // Integraciones: Meta y Google Ads llevan a sus pantallas; las demás avisan
  await page.goto(BASE + '#/app/integraciones'); await page.waitForSelector('[data-iconn]');
  const n = await page.$$eval('[data-iconn]', b => b.map(x => x.dataset.iconn));
  if (n.includes('7')) { await page.click('[data-iconn="7"]'); await page.waitForSelector('#layer .modal'); ok(/todavía no disponible/.test(await page.textContent('#layer')), 'TikTok sigue diciendo «todavía no disponible»'); await page.click('#layer .btn-primary[data-close]'); }
  // Desconectar Meta
  await page.goto(BASE + '#/app/redes'); await page.waitForSelector('#cxdis'); await page.click('#cxdis'); await page.click('#cxdok'); await page.waitForSelector('#cxconn', { timeout: 15000 });
  ok((await get('tenants/cafelito/private/meta')).error, 'al desconectar se borra el permiso');

  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close(); sim.close();
  console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
