// Etapa C1: pedidos de la tienda (Cafelito Cakes) → CRM «Tienda», campaña, funnel y objetivos automáticos.
// Desde la raíz, con el sitio en 8410: firebase emulators:exec --only functions,auth,firestore --project brandazo "node rules-test/e2e-tienda.js"
const { chromium } = require('playwright');
const BASE = 'http://localhost:8410/', P = 'brandazo';
const FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`, AU = 'http://127.0.0.1:9099';
const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const enc = v => v === null ? { nullValue: null } : v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const put = (p, d) => fetch(`${FS}/${p}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: enc(d).mapValue.fields }) });
const fails = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };
(async () => {
  const EMAIL = 'duena@cafelito.test', U = 'Cafelito Cakes', NOW = new Date(), MON = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Cordoba', year: 'numeric', month: '2-digit' }).format(NOW);
  const Q = `Q${Math.floor(NOW.getMonth() / 3) + 1} ${NOW.getFullYear()}`;
  await put('tenants/cafelito', { name: 'Cafelito Coffee House' });
  await put(`invites/${EMAIL}__cafelito`, { email: EMAIL, tenantId: 'cafelito', tenantName: 'Cafelito', role: 'Dueño', invitedBy: 'alta' });
  await put('tenants/cafelito/state/base', { json: JSON.stringify({ brands: [{ name: 'Cafelito Ambulante', color: '#1E9BD7' }, { name: U, color: '#FF2D87' }], workspaces: [{ name: 'General' }] }), by: 'alta' });
  await put('tenants/cafelito/state/m_objectives', { json: JSON.stringify([{ id: 'o1', title: 'Vender tortas online', brand: U, period: Q, owner: 'Melina', krs: [{ t: 'Facturación', target: 200000, unit: '$', cur: 0, src: 'shop-revenue' }, { t: 'Pedidos', target: 10, unit: '', cur: 0, src: 'shop-orders' }] }]), by: 'alta' });
  await put('tenants/cafelito/state/m_campaigns', { json: JSON.stringify([{ id: 'k1', name: 'Día de la Madre', utm: 'dia-de-la-madre', brand: U, objectiveId: 'o1', personas: [], type: 'Paga', objective: 'Ventas', start: '2026-10-01', end: '2026-12-31', budget: 100000, spent: 60000, audience: 'Mamás', channels: ['Instagram'], status: 'Activa', segment: 'General', m: { reach: 0, impr: 0, clicks: 0, conv: 0, revenue: 0 }, seed: 1 }]), by: 'alta' });
  const sc = () => ({ rates: {}, costs: { cpc: null, cpl: null, cpa: null } });
  await put('tenants/cafelito/state/m_funnels', { json: JSON.stringify([{ id: 'f1', name: 'Tortas online', objectiveId: 'o1', goal: 10, goalType: 'Ventas', stages: [{ id: 's1', name: 'Pedidos', type: 'conversion', source: 'shop-paid', campOnly: false, real: null }], scenarios: { cons: sc(), esp: sc(), opt: sc() }, active: 'esp', campaigns: [{ id: 'k1' }], history: [], created: '2026-11-01', refChecked: true }]), by: 'alta' });
  await put('tenants/cafelito/contacts/c1', { name: 'Lucía Pérez', phoneE164: '+5493515550199', type: 'Cliente', orderCount: 2 });
  const ord = (id, d) => put(`tenants/cafelito/orders/${id}`, { orderId: id, brand: U, contactId: 'c1', customerName: 'Lucía Pérez', currency: 'ARS', items: [{ name: 'Torta de chocolate', variant: '20 porciones', quantity: 1, unitPriceMinor: 4500000 }], totalMinor: 4500000, discountMinor: 0, paidAt: NOW, paidMonth: MON, statusAt: NOW, updatedAt: NOW, pickup: { date: '2030-01-10', place: 'Coffee House' }, attribution: { utmSource: 'instagram', utmCampaign: 'dia-de-la-madre' }, utmCampaign: 'dia-de-la-madre', history: [{ status: 'paid', at: NOW.toISOString(), eventId: id + ':paid', stale: false }], warnings: [], ...d });
  await ord('P-1', { status: 'paid', counted: true });
  await ord('P-2', { status: 'picked_up', counted: true, totalMinor: 5500000, items: [{ name: 'Cheesecake', quantity: 1, unitPriceMinor: 5500000 }] });
  await ord('P-3', { status: 'refunded', counted: false, totalMinor: 9900000 });
  await ord('P-4', { status: 'paid', counted: true, totalMinor: 3000000, utmCampaign: null, attribution: null, items: [{ name: 'Brownie', quantity: 2, unitPriceMinor: 1500000 }] });

  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + '?emu=1#/registro'); await page.waitForSelector('#pw2');
  await page.fill('#em', EMAIL); await page.fill('#pw2', 'Clave-segura-2026'); await page.check('#tos'); await page.click('#f button.btn-primary'); await page.waitForSelector('#vok');
  let vc; for (let i = 0; i < 40 && !vc; i++) { vc = (await (await fetch(`${AU}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.find(c => c.email === EMAIL); if (!vc) await new Promise(r => setTimeout(r, 250)); }
  await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:update?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode: vc.oobCode }) });
  await page.click('#vok'); await page.waitForSelector('.app', { timeout: 20000 });
  // CRM → Tienda
  await page.goto(BASE + '#/app/crm/tienda'); await page.waitForSelector('#shm', { timeout: 15000 });
  const t = await page.textContent('#root');
  ok(/Pedidos pagados\s*3/.test(t), 'cuenta 3 pedidos pagados (pagado + retirado + pagado; el devuelto no)');
  ok(/Facturación\s*\$ 130\.000/.test(t), 'factura $ 130.000 (45.000 + 55.000 + 30.000)');
  ok(/Ticket promedio\s*\$ 43\.333(?!,)/.test(t), 'ticket promedio');
  ok(/Por retirar\s*2/.test(t), '2 pagados por retirar');
  ok(/1 pedido cancelado o devuelto/.test(t), 'avisa el devuelto sin sumarlo');
  await page.click('[data-shop="P-1"]'); await page.waitForSelector('#layer .drawer');
  const d = await page.textContent('#layer'); ok(/Torta de chocolate[\s\S]*20 porciones/.test(d) && /Día de la Madre/.test(d) && /10 ene 2030/.test(d), 'la ficha del pedido muestra productos, campaña y retiro');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  // Campaña
  await page.goto(BASE + '#/app/campanas/k1'); await page.waitForSelector('#campsales .stat-grid', { timeout: 15000 });
  const cs = await page.textContent('#campsales');
  ok(/Pedidos pagados\s*2/.test(cs) && /\$ 100\.000/.test(cs), 'la campaña muestra 2 pedidos pagados y $ 100.000');
  ok(/Costo por venta\s*\$ 30\.000/.test(cs), 'costo por venta = inversión ÷ pedidos');
  ok(!/Cotizaciones/.test(cs), 'una unidad de tienda no muestra cotizaciones del CRM');
  // Objetivo con resultados automáticos
  await page.goto(BASE + '#/app/estrategia/okr'); await page.waitForTimeout(2500);
  const ob = await page.textContent('#root');
  ok(/\$ 130\.000 de \$ 200\.000/.test(ob) && /3 de 10/.test(ob), 'los resultados clave se completan solos con la tienda: ' + (ob.match(/\$ [\d.]+ de \$ [\d.]+/) || [''])[0]);
  ok(/Se completan solos/.test(ob), 'avisa que se completan solos');
  await page.click('[data-oedit="o1"]'); await page.waitForSelector('#krrows .kr-row');
  ok((await page.$$('#krrows .kr-row')).length === 2 && await page.inputValue('#krrows .kr-row [data-krs]') === 'shop-revenue', 'el editor del objetivo muestra cómo se mide cada resultado');
  await page.click('#kradd'); const rows = await page.$$('#krrows .kr-row'); const last = rows[rows.length - 1];
  await (await last.$('[data-krs]')).selectOption('shop-ticket'); await (await last.$('[data-krv]')).fill('50000'); await page.click('#eok'); await page.waitForTimeout(500);
  const krs = await page.evaluate(() => M().objectives.find(o => o.id === 'o1').krs);
  ok(krs.length === 3 && krs[2].src === 'shop-ticket' && krs[2].t === 'Ticket promedio' && krs[2].unit === '$', 'agregar un resultado automático se guarda: ' + JSON.stringify(krs[2]));
  // Funnel
  const real = await page.evaluate(() => { const f = M().funnels.find(x => x.id === 'f1'); return fReal(f, f.stages[0]); });
  ok(real === 3, 'el funnel toma los pedidos pagados de la tienda: ' + real);
  // Unidad: cómo vende
  await page.evaluate(() => { const i = S.brands.findIndex(b => b.name === 'Cafelito Ambulante'); brandModal(i); }); await page.waitForSelector('#usells');
  ok(await page.inputValue('#usells') === 'crm', 'Ambulante figura como venta por CRM');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200); if (await page.$('[data-discard]')) await page.click('[data-discard]');
  await page.evaluate(() => { const i = S.brands.findIndex(b => b.name === 'Cafelito Cakes'); brandModal(i); }); await page.waitForSelector('#usells');
  ok(await page.inputValue('#usells') === 'tienda', 'Cakes figura como tienda online (tiene pedidos)');
  await page.click('#ok'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => S.brands.find(b => b.name === 'Cafelito Cakes').sells) === 'tienda', 'guardar la unidad conserva cómo vende');
  // Celular
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(BASE + '#/app/crm/tienda'); await page.waitForSelector('#shm');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desborde en celular');
  await page.screenshot({ path: process.env.SHOT || '/tmp/tienda-390.png', fullPage: true });
  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
