// CRM unificado · etapa 1: solapa «Ventas» (cotizaciones + pedidos + suscripciones + inscripciones en una sola planilla).
// Desde la raíz, con el sitio en 8410: firebase emulators:exec --only functions,auth,firestore --project brandazo "node rules-test/e2e-crm-ventas.js"
const { chromium } = require('playwright');
const BASE = 'http://localhost:8410/', P = 'brandazo';
const FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`, AU = 'http://127.0.0.1:9099';
const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const enc = v => v === null ? { nullValue: null } : v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const put = (p, d) => fetch(`${FS}/${p}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: enc(d).mapValue.fields }) });
const fails = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };
(async () => {
  const EMAIL = 'duena@cafelito.test', NOW = new Date();
  await put('tenants/cafelito', { name: 'Cafelito Coffee House' });
  await put(`invites/${EMAIL}__cafelito`, { email: EMAIL, tenantId: 'cafelito', tenantName: 'Cafelito', role: 'Dueño', invitedBy: 'alta' });
  await put('tenants/cafelito/state/base', { json: JSON.stringify({ brands: [{ name: 'Cafelito Ambulante' }, { name: 'Cafelito Cakes' }, { name: 'Cafelito Work' }, { name: 'Cafelito Academy' }], workspaces: [{ name: 'General' }] }), by: 'alta' });
  await put('tenants/cafelito/contacts/c1', { name: 'Daniela Katch', phoneE164: '+5493515550101', type: 'Cliente', marketingConsent: { granted: true } });
  await put('tenants/cafelito/contacts/c2', { name: 'Azafrán', phoneE164: '+5493515550102', type: 'Lead' });
  await put('tenants/cafelito/contacts/c3', { name: 'Catalina Paz', phoneE164: '+5493515550103', type: 'Cliente' });
  await put('tenants/cafelito/contacts/c4', { name: 'Sofía Ruiz', phoneE164: '+5493515550104', type: 'Lead', tags: ['Cafelito Work'] });
  const op = (id, d) => put(`tenants/cafelito/opportunities/${id}`, { pipeline: 'cafelito-eventos', brand: 'Cafelito Ambulante', owner: '', event: { type: 'Cumpleaños', date: '2030-01-10', guests: 40 }, estimate: { brandazoSubtotalMinor: 9000000 }, createdAt: NOW, ...d });
  await op('op1', { stage: 'ganada', contactId: 'c1', title: 'Cumpleaños · Daniela Katch', won: { amountMinor: 9000000, depositMinor: 4500000, depositPaid: false, balancePaid: false } });
  await op('op2', { stage: 'en-negociacion', contactId: 'c2', title: 'Corporativo · Azafrán', event: { type: 'Corporativo', date: '2030-02-01', guests: 100 }, estimate: { brandazoSubtotalMinor: 67000000 } });
  await op('op3', { stage: 'perdida', contactId: 'c2', title: 'Boda · Azafrán', lostReason: 'Precio', estimate: { brandazoSubtotalMinor: 164500000 } });
  await put('tenants/cafelito/orders/P-1', { orderId: 'P-1', brand: 'Cafelito Cakes', contactId: 'c3', customerName: 'Catalina Paz', items: [{ name: 'Torta Tiramisú', quantity: 1, unitPriceMinor: 6000000 }], totalMinor: 6000000, status: 'paid', counted: true, paidAt: NOW, statusAt: NOW, updatedAt: NOW, createdAt: NOW, pickup: { date: '2030-01-05' }, history: [], warnings: [] });
  await put('tenants/cafelito/subscriptions/s1', { brand: 'Cafelito Work', contactId: 'c4', customerName: 'Sofía Ruiz', planName: 'Escritorio flexible', priceMinor: 3550000, status: 'active', startDate: '2026-11-01', updatedAt: NOW, createdAt: NOW });
  await put('tenants/cafelito/enrollments/e1', { brand: 'Cafelito Academy', contactId: 'c3', customerName: 'Catalina Paz', courseName: 'Barismo inicial', amountMinor: 8000000, status: 'paid', paidDate: '2026-11-20', updatedAt: NOW, createdAt: NOW });

  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + '?emu=1#/registro'); await page.waitForSelector('#pw2');
  await page.fill('#em', EMAIL); await page.fill('#pw2', 'Clave-segura-2026'); await page.check('#tos'); await page.click('#f button.btn-primary'); await page.waitForSelector('#vok');
  let vc; for (let i = 0; i < 40 && !vc; i++) { vc = (await (await fetch(`${AU}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.find(c => c.email === EMAIL); if (!vc) await new Promise(r => setTimeout(r, 250)); }
  await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:update?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode: vc.oobCode }) });
  await page.click('#vok'); await page.waitForSelector('.app', { timeout: 20000 });

  await page.goto(BASE + '#/app/crm'); await page.waitForFunction(() => document.querySelectorAll('[data-vnop]').length >= 6, null, { timeout: 20000 });
  const tabs = await page.$$eval('.tabs .tab', x => x.map(t => t.textContent));
  ok(tabs[0] === 'Ventas' && tabs.includes('Oportunidades') && tabs.includes('Tienda'), 'la primera solapa es Ventas y las anteriores siguen: ' + tabs.join(', '));
  ok((await page.getAttribute('.tabs .tab', 'aria-selected')) === 'true', 'el CRM abre en Ventas');
  ok((await page.$$('[data-vnop]')).length === 6, '6 operaciones de 4 orígenes en una sola lista');
  const tot = await page.textContent('.vn-tot');
  // Cobrado: pedido 60.000 + curso 80.000 (la seña sin cobrar no suma). Vendido: 90.000 + 60.000 + 80.000. En juego: 670.000. Mensual: 35.500
  ok(/Cobrado \$ 140\.000/.test(tot), 'cobrado = lo pagado de verdad: ' + tot);
  ok(/Vendido \$ 230\.000/.test(tot), 'vendido = ganadas sin la suscripción');
  ok(/En juego \$ 670\.000/.test(tot), 'en juego = abiertas');
  ok(/Mensual fijo \$ 35\.500/.test(tot), 'mensual fijo = suscripciones activas');
  const row = id => page.textContent(`[data-vnop="${id}"]`);
  ok(/Ganada[\s\S]*Seña sin cobrar[\s\S]*Cobrar seña/.test(await row('q-op1')), 'evento ganado: seña sin cobrar y botón Cobrar seña');
  ok(/Ganada[\s\S]*por retirar[\s\S]*Retirado/.test(await row('o-P-1')), 'pedido pagado: por retirar y botón Retirado');
  ok(/por mes/.test(await row('s-s1')), 'suscripción: importe por mes');
  // Filtros
  await page.selectOption('#vnu', 'Cafelito Ambulante'); await page.waitForTimeout(200);
  ok((await page.$$('[data-vnop]')).length === 3, 'filtro por unidad: 3 de Ambulante');
  await page.selectOption('#vns', 'p'); await page.waitForTimeout(200);
  ok((await page.$$('[data-vnop]')).length === 1 && /Precio/i.test(await row('q-op3')), 'filtro por estado: la perdida, con el motivo');
  await page.selectOption('#vns', ''); await page.selectOption('#vnu', '');
  await page.fill('#vnq', 'catal'); await page.waitForTimeout(200);
  ok((await page.$$('[data-vnop]')).length === 2 && (await page.inputValue('#vnq')) === 'catal', 'búsqueda por cliente sin perder lo escrito');
  await page.fill('#vnq', '');
  // Acción: cobrar seña abre el formulario de cobro (no escribe nada sin confirmar)
  await page.click('[data-vnact="q-op1"]'); await page.waitForSelector('#layer .modal, #layer .drawer');
  ok(/seña/i.test(await page.textContent('#layer')), 'Cobrar seña abre el formulario de cobro');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // Abrir una fila → ficha
  await page.click('[data-vnop="o-P-1"]'); await page.waitForSelector('#layer .drawer');
  ok(/Torta Tiramisú/.test(await page.textContent('#layer')), 'clic en el pedido abre su ficha');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // Por cliente
  await page.click('[data-vnm="cl"]'); await page.waitForSelector('[data-vncli]');
  const cl = id => page.textContent(`[data-vncli="${id}"]`);
  ok(/Cliente[\s\S]*Cakes[\s\S]*Academy[\s\S]*\$ 140\.000/.test(await cl('c3')), 'Catalina: cliente de Cakes y Academy, aportó $ 140.000');
  ok(/Lead[\s\S]*Ambulante[\s\S]*1 en curso/.test(await cl('c2')), 'Azafrán: lead de Ambulante con 1 en curso');
  ok(/Cliente[\s\S]*Work[\s\S]*\$ 35\.500 por mes/.test(await cl('c4')), 'Sofía: cliente de Work por la suscripción');
  ok(/Cobrar la seña/.test(await cl('c1')) && /Sí/.test(await cl('c1')), 'Daniela: pendiente de cobrar la seña y acepta promociones');
  await page.click('[data-vncli="c3"]'); await page.waitForSelector('#layer .drawer');
  ok(/Catalina Paz/.test(await page.textContent('#layer')), 'clic en el cliente abre su ficha');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // Celular
  await page.setViewportSize({ width: 390, height: 844 }); await page.click('[data-vnm="op"]'); await page.waitForTimeout(300);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok(ov <= 0, 'en celular no se desborda (' + ov + ' px)');
  await page.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/ventas-movil.png' : '/dev/null' });
  await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(200);
  if (process.env.SHOT_DIR) await page.screenshot({ path: process.env.SHOT_DIR + '/ventas-escritorio.png', fullPage: true });
  ok(!errs.length, 'sin errores en la página ' + errs.join(' | '));
  await b.close();
  console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
