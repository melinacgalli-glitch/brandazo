// Carga manual en el CRM: pedido que llegó por WhatsApp → contacto sin duplicar + cotización + tarea + nota.
// Desde la raíz, con el sitio en 8410: firebase emulators:exec --only functions,auth,firestore --project brandazo "node rules-test/e2e-manual.js"
const { chromium } = require('playwright');
const BASE = 'http://localhost:8410/', P = 'brandazo';
const FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`, AU = 'http://127.0.0.1:9099';
const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const enc = v => v === null ? { nullValue: null } : v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const put = (p, d) => fetch(`${FS}/${p}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: enc(d).mapValue.fields }) });
const list = p => fetch(`${FS}/${p}?pageSize=100`, { headers: H }).then(r => r.json()).then(j => j.documents || []);
const fails = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };
(async () => {
  const EMAIL = 'duena@cafelito.test';
  await put('tenants/cafelito', { name: 'Cafelito Coffee House' });
  await put(`invites/${EMAIL}__cafelito`, { email: EMAIL, tenantId: 'cafelito', tenantName: 'Cafelito', role: 'Dueño', invitedBy: 'alta' });
  await put('tenants/cafelito/state/base', { json: JSON.stringify({ brands: [{ name: 'Cafelito Ambulante', color: '#1E9BD7' }], workspaces: [{ name: 'General' }] }), by: 'alta' });
  await put('tenants/cafelito/settings/cafelito-eventos', { brand: 'Cafelito Ambulante' });
  await put('tenants/cafelito/contacts/c1', { name: 'Estudio Ruiz', phoneE164: '+5493515550187', phoneRaw: '351 555-0187' });
  await put('tenants/cafelito/contactsByPhone/5493515550187', { contactId: 'c1' });
  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + '?emu=1#/registro'); await page.waitForSelector('#pw2');
  await page.fill('#em', EMAIL); await page.fill('#pw2', 'Clave-segura-2026'); await page.check('#tos'); await page.click('#f button.btn-primary'); await page.waitForSelector('#vok');
  let vc; for (let i = 0; i < 40 && !vc; i++) { vc = (await (await fetch(`${AU}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.find(c => c.email === EMAIL); if (!vc) await new Promise(r => setTimeout(r, 250)); }
  await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:update?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode: vc.oobCode }) });
  await page.click('#vok'); await page.waitForSelector('.app', { timeout: 20000 });
  await page.goto(BASE + '#/app/crm/eventos'); await page.waitForSelector('[data-mannew]', { timeout: 15000 });
  // Validación
  await page.click('[data-mannew]'); await page.waitForSelector('#mnok'); await page.click('#mnok');
  ok(/Escribí el nombre/.test(await page.textContent('#layer')) && /Elegí la fecha/.test(await page.textContent('#layer')), 'pide nombre, teléfono y fecha');
  // Pedido nuevo por WhatsApp
  await page.fill('#mnn', 'Juan Gómez'); await page.fill('#mnp', '0351 15 444-1234'); await page.selectOption('#mnc', 'WhatsApp');
  await page.selectOption('#mnt', 'Cumpleaños'); await page.fill('#mnd', '2030-03-14'); await page.fill('#mng', '80'); await page.selectOption('#mnz', '1');
  await page.fill('#mnx', 'Barra de café para su cumple de 40.'); await page.fill('#mnm', 'mucho'); await page.click('#mnok'); await page.waitForTimeout(300);
  ok(/Revisá el importe/.test(await page.textContent('#layer')), 'un importe mal escrito se marca');
  await page.fill('#mnm', '850.000'); await page.click('#mnok');
  await page.waitForSelector('#layer .drawer', { timeout: 15000 });
  await page.waitForFunction(() => /Pedido cargado a mano por/.test(document.querySelector('#layer').textContent), null, { timeout: 15000 }).catch(() => {});
  const f = await page.textContent('#layer');
  ok(/Juan Gómez/.test(f) && /14 mar 2030/.test(f) && /80/.test(f) && /Carga manual · WhatsApp/.test(f), 'se crea la cotización y se abre su ficha con los datos y el canal');
  ok(/Importe estimado cargado a mano: \$ 850\.000/.test(f) && !/La web no mandó/.test(f) && !/Plan Full|Torta: no/.test(f), 'la ficha muestra el importe cargado y no inventa plan');
  ok(/Pedido cargado a mano por/.test(f), 'queda la nota en la historia');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok(/Juan Gómez/.test(await page.textContent('[data-evstage="nueva-cotizacion"]')), 'aparece en «Nueva cotización»');
  const tasks = await list('tenants/cafelito/tasks'); ok(tasks.some(t => /Juan Gómez/.test(t.fields.title.stringValue)), 'crea la tarea de seguimiento');
  const ph = await list('tenants/cafelito/contactsByPhone'); ok(ph.some(d => d.name.endsWith('/5493514441234')), 'normaliza el teléfono (+54 9 351 444-1234)');
  // Mismo teléfono que un contacto existente: no duplica
  await page.click('[data-mannew]'); await page.waitForSelector('#mnok');
  await page.fill('#mnn', 'Estudio Ruiz (Pablo)'); await page.fill('#mnp', '+54 9 351 555 0187'); await page.waitForFunction(() => Object.values(EV.contacts).some(c => c.name === 'Estudio Ruiz'), null, { timeout: 10000 }).catch(() => {}); await page.dispatchEvent('#mnp', 'input');
  { const lt = await page.textContent('#layer'); ok(/Ya tenés a Estudio Ruiz/.test(lt), 'avisa que el teléfono ya es de un contacto' + (/Ya tenés/.test(lt) ? '' : ' · ' + lt.replace(/\s+/g, ' ').slice(0, 300) + ' · ' + await page.evaluate(() => Object.values(EV.contacts).map(c => c.name + ':' + c.phoneRaw).join(', ')))); }
  await page.fill('#mnd', '2030-05-02'); await page.click('#mnok'); await page.waitForSelector('#layer .drawer', { timeout: 15000 });
  const contacts = await list('tenants/cafelito/contacts');
  ok(contacts.length === 2, 'no duplica el contacto: ' + contacts.length);
  ok(/todavía no tiene importe/.test(await page.textContent('#layer')), 'sin importe, la ficha lo dice (no muestra $ 0)');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // Solo contacto
  await page.goto(BASE + '#/app/crm/contactos'); await page.waitForSelector('[data-mannew="contacto"]'); await page.click('[data-mannew="contacto"]'); await page.waitForSelector('#mnok');
  ok(!(await page.$('#mnd')), 'el contacto solo no pide datos del evento');
  ok(/Web/.test(await page.textContent('#mnc')) && !!(await page.$('#mnty')) && (await page.$$('[data-mnu]')).length >= 1, 'el contacto pide tipo, unidades y tiene el canal Web');
  await page.fill('#mnn', 'Laura Paz'); await page.fill('#mnp', '3516667788'); await page.fill('#mne', 'laura@example.com'); await page.selectOption('#mnty', 'Cliente'); await page.selectOption('#mnc', 'Web'); await page.click('#mnok'); await page.waitForFunction(() => /Laura Paz/.test(document.querySelector('#root').textContent), null, { timeout: 15000 }).catch(() => {}); await page.screenshot({ path: (process.env.SHOT || '/tmp/x.png').replace('.png', '-contactos.png') });
  console.log('hash', await page.evaluate(() => location.hash), 'layer', await page.evaluate(() => $('#layer').innerText.slice(0, 200)));
  const rootTxt = await page.textContent('#root'); ok(/Laura Paz/.test(rootTxt), 'el contacto aparece en Contactos' + (/Laura Paz/.test(rootTxt) ? '' : ': ' + rootTxt.slice(0, 400) + ' | contactos en memoria: ' + await page.evaluate(() => Object.values(EV.contacts).map(c => c.name).join(', '))));
  ok((await list('tenants/cafelito/opportunities')).length === 2, 'el contacto solo no crea cotización');
  { const all = await list('tenants/cafelito/contacts'); const lp = all.find(d => d.fields.name.stringValue === 'Laura Paz'); if (!lp) console.log('DIAG laura no guardada · capa:', (await page.textContent('#layer')).replace(/\s+/g, ' ').slice(0, 500), '· avisos:', (await page.evaluate(() => [...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | '))), '· marcas:', await page.evaluate(() => S.brands.map(b => b.name).join(',')));
    if (lp) ok(lp.fields.type.stringValue === 'Cliente' && lp.fields.firstSource.mapValue.fields.channel.stringValue === 'Carga manual · Web', 'guarda el tipo Cliente y el canal Web'); }
  // El navegador sigue sin poder crear contactos directo (reglas)
  const direct = await page.evaluate(async () => { try { await fbDb.collection(`tenants/${S.company.tid}/contacts`).add({ name: 'x' }); return 'ok'; } catch (e) { return e.code; } });
  ok(direct === 'permission-denied', 'desde el navegador no se pueden crear contactos sin pasar por el servidor');
  // Venta de la tienda cargada a mano (ya pagada)
  await page.evaluate(() => { S.brands.push({ name: 'Cafelito Cakes', color: '#FF2D87', sells: 'tienda' }); });
  await page.goto(BASE + '#/app/crm/tienda'); await page.waitForSelector('[data-mansale]', { timeout: 15000 }); await page.click('[data-mansale]'); await page.waitForSelector('#slok');
  await page.click('#slok'); ok(/Cada producto necesita/.test(await page.textContent('#layer')), 'pide los productos con precio');
  await page.fill('#mnn', 'Luisina Magris'); await page.fill('#mnp', '3385448801'); await page.fill('#mne', 'luisinasmagris@gmail.com'); await page.fill('#slpay', '189604761267');
  await page.fill('#slrows [data-sin]', 'Pistacho & Frambuesa'); await page.fill('#slrows [data-sp]', '63.000');
  ok(/\$ 63\.000/.test(await page.textContent('#sltot')), 'calcula el total');
  await page.fill('#slrd', '2030-11-21'); await page.fill('#slts', 'Mañana'); await page.click('#slok'); await page.waitForTimeout(2500);
  const tt = await page.textContent('#root');
  ok(/Pedidos pagados\s*1/.test(tt) && /Facturación\s*\$ 63\.000/.test(tt) && /Por retirar\s*1/.test(tt), 'la venta suma en la Tienda (1 pedido, $ 63.000, por retirar)');
  const ords = await list('tenants/cafelito/orders'); ok(ords.length === 1 && ords[0].name.endsWith('/MP-189604761267'), 'se guarda con el n.º de pago de Mercado Pago');
  await page.click('[data-mansale]'); await page.waitForSelector('#slok'); await page.waitForTimeout(500); await page.fill('#mnn', 'Luisina Magris'); await page.fill('#mnp', '3385448801'); await page.fill('#slpay', '189604761267');
  await page.fill('#slrows [data-sin]', 'Pistacho & Frambuesa'); await page.fill('#slrows [data-sp]', '63.000'); await page.click('#slok'); await page.waitForFunction(() => /Ya hay una venta/.test(document.querySelector('#layer').textContent), null, { timeout: 15000 }).catch(() => {});
  { const lt = await page.textContent('#layer'); ok(/Ya hay una venta con este n\.º de pago/.test(lt), 'no deja cargar dos veces la misma compra' + (/Ya hay una venta/.test(lt) ? '' : ' · ' + lt.replace(/\s+/g, ' ').slice(0, 400) + ' · ventas: ' + (await list('tenants/cafelito/orders')).length)); }
  await page.click('#layer .modal-foot [data-close]'); await page.waitForTimeout(200); if (await page.$('[data-discard]')) await page.click('[data-discard]');
  // Ficha del contacto: Cliente de Cakes, con su compra y «Registrar venta»
  await page.goto(BASE + '#/app/crm/contactos'); await page.waitForSelector('[data-evc]'); const lid = (await list('tenants/cafelito/contacts')).find(d => d.fields.name.stringValue === 'Luisina Magris').name.split('/').pop();
  await page.click(`[data-evc="${lid}"]`); await page.waitForSelector('#layer .drawer'); await page.waitForFunction(() => /Compras en la tienda \(1\)/.test(document.querySelector('#layer').textContent), null, { timeout: 15000 }).catch(() => {});
  const lf = await page.textContent('#layer');
  ok(/Cliente · Cafelito Cakes/.test(lf), 'la ficha dice Cliente · Cafelito Cakes');
  ok(/Compras en la tienda \(1\)[\s\S]*Pistacho & Frambuesa[\s\S]*\$ 63\.000/.test(lf), 'la ficha muestra su compra de la tienda');
  await page.click('[data-regsale]'); await page.waitForSelector('[data-rs="tienda"]'); await page.click('[data-rs="tienda"]'); await page.waitForSelector('#slok');
  ok(await page.inputValue('#mnn') === 'Luisina Magris', '«Registrar venta» abre la venta con el cliente ya cargado');
  await page.click('#layer .modal-foot [data-close]'); await page.waitForTimeout(200); if (await page.$('[data-discard]')) await page.click('[data-discard]');
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(BASE + '#/app/crm/eventos'); await page.waitForSelector('[data-mannew]'); await page.click('[data-mannew]'); await page.waitForSelector('#mnok');
  ok(await page.evaluate(() => document.querySelector('#layer .modal').scrollWidth <= document.querySelector('#layer .modal').clientWidth + 1), 'el formulario entra en el celular');
  await page.screenshot({ path: process.env.SHOT || '/tmp/manual-390.png' });
  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
