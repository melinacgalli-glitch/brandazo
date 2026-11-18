// Recorrido en navegador: Marca → logos y biblioteca con archivos reales (emuladores de Auth, Firestore y Storage).
// Desde la raíz, con el sitio en 8410: firebase emulators:exec --only auth,firestore,storage --project brandazo "node rules-test/e2e-archivos.js"
const { chromium } = require('playwright');
const os = require('node:os'), fs = require('node:fs'), path = require('node:path');
const BASE = 'http://localhost:8410/', P = 'brandazo';
const FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`, AU = 'http://127.0.0.1:9099';
const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const enc = v => v === null ? { nullValue: null } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const put = (p, d) => fetch(`${FS}/${p}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: enc(d).mapValue.fields }) });
const get = p => fetch(`${FS}/${p}`, { headers: H }).then(r => r.json());
const objs = () => fetch(`http://127.0.0.1:9199/v0/b/${P}.firebasestorage.app/o?prefix=tenants/cafelito/`, { headers: { Authorization: 'Bearer owner' } }).then(r => r.json()).then(j => (j.items || []).map(i => i.name));
const fails = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-arch-'));
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(path.join(dir, 'logo-cafelito.png'), PNG); fs.writeFileSync(path.join(dir, 'foto barra.png'), PNG);
  fs.writeFileSync(path.join(dir, 'Manual de marca.pdf'), Buffer.from('%PDF-1.4\n%prueba\n'));
  const EMAIL = 'duena@cafelito.test';
  await put('tenants/cafelito', { name: 'Cafelito Coffee House' });
  await put(`invites/${EMAIL}__cafelito`, { email: EMAIL, tenantId: 'cafelito', tenantName: 'Cafelito Coffee House', role: 'Dueño', invitedBy: 'alta' });
  await put('tenants/cafelito/state/base', { json: JSON.stringify({ brands: [{ name: 'Cafelito Ambulante', color: '#FF2D87' }], workspaces: [{ name: 'General' }] }), by: 'alta' });
  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/favicon|status of 400|ERR_CONNECTION_REFUSED/.test(m.text())) errs.push(m.text()); });
  await page.goto(BASE + '?emu=1#/registro'); await page.waitForSelector('#pw2');
  await page.fill('#em', EMAIL); await page.fill('#pw2', 'Clave-segura-2026'); await page.check('#tos'); await page.click('#f button.btn-primary');
  await page.waitForSelector('#vok'); const c = (await (await fetch(`${AU}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.find(x => x.email === EMAIL); await fetch(c.oobLink); await page.click('#vok');
  await page.waitForSelector('.app', { timeout: 20000 });
  await page.evaluate(() => { S.brand = 0; }); await page.goto(BASE + '#/app/marca/identidad'); await page.waitForSelector('[data-logo=principal]', { timeout: 15000 });
  ok(/Sin logo/.test(await page.textContent('.kit-grid')), 'sin logos cargados dice «Sin logo» (no un dibujo inventado)');
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-logo=principal]')]); await fc.setFiles(path.join(dir, 'logo-cafelito.png'));
  await page.waitForSelector('.logo-card img', { timeout: 20000 }); ok(true, 'logo principal subido y visible');
  { const o = await objs(); console.log('   objetos:', JSON.stringify(o)); ok(o.some(n => /marcas\/cafelito-ambulante\/\d+-logo-cafelito\.png$/.test(n)), 'el archivo quedó en la carpeta de la empresa y la marca'); }
  // Biblioteca
  await page.goto(BASE + '#/app/marca/biblioteca'); await page.waitForSelector('#upl2'); await page.click('#upl2'); await page.waitForSelector('#udrop');
  const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.click('#udrop')]); await fc2.setFiles([path.join(dir, 'foto barra.png'), path.join(dir, 'Manual de marca.pdf')]);
  await page.waitForFunction(() => [...document.querySelectorAll('#ulist li span')].filter(s => s.textContent === 'listo').length === 2, null, { timeout: 20000 }).catch(async e => { console.log('   lista:', await page.evaluate(() => (document.querySelector('#ulist') || {}).innerText), '· capa:', await page.evaluate(() => document.querySelector('#layer').innerText.slice(0, 200)), errs); throw e; }); ok(true, 'dos archivos subidos con progreso');
  await page.click('#layer .modal-foot button[data-close]'); await page.waitForTimeout(1500);
  await page.waitForSelector('.lib', { timeout: 8000 }).catch(async () => console.log('   pantalla:', page.url(), (await page.evaluate(() => document.querySelector('#root').innerText)).slice(-400).replace(/\n/g, ' | '), '· capa:', await page.evaluate(() => document.querySelector('#layer').children.length), errs));
  const t = await page.textContent('.lib'); ok(/foto barra\.png/.test(t) && /Manual de marca\.pdf/.test(t) && /Fotos/.test(t) && /Documentos/.test(t), 'la biblioteca muestra los archivos con su categoría automática');
  // persistencia
  await page.reload(); await page.waitForSelector('.app', { timeout: 20000 }); await page.evaluate(() => { S.brand = 0; render(); }); await page.goto(BASE + '#/app/marca/biblioteca'); await page.waitForSelector('.lib', { timeout: 15000 });
  ok(/Manual de marca\.pdf/.test(await page.textContent('.lib')), 'al recargar los archivos siguen ahí');
  const kits = JSON.parse((await get('tenants/cafelito/state/m_kits')).fields.json.stringValue); const k = kits['Cafelito Ambulante'];
  ok(k.logos.principal && k.files.length === 2 && k.files.every(f => f.path && f.url && f.size > 0), 'datos de los archivos guardados en la nube (sin el contenido)');
  // borrar
  const pdfId = k.files.find(f => /pdf$/.test(f.name)).id; await page.click(`[data-fdel="${pdfId}"]`); await page.click('#fok'); await page.waitForTimeout(1500);
  ok(!(await objs()).some(n => /Manual-de-marca|manual-de-marca/i.test(n)), 'borrar quita el archivo de la nube');
  // celular
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin desborde en celular');
  await page.screenshot({ path: path.join(os.tmpdir(), 'e2e-biblioteca-movil.png') });
  await page.setViewportSize({ width: 1280, height: 900 }); await page.goto(BASE + '#/app/marca/identidad'); await page.waitForSelector('.logo-card img'); await page.screenshot({ path: path.join(os.tmpdir(), 'e2e-logos.png') });
  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
