// Etapa B: campaña → código de seguimiento → cotizaciones vinculadas → resultados reales y funnel con datos del CRM.
// Desde la raíz, con el sitio en 8410: firebase emulators:exec --only functions,auth,firestore --project brandazo "node rules-test/e2e-ventas.js"
const { chromium } = require('playwright');
const BASE = 'http://localhost:8410/', P = 'brandazo';
const FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`, AU = 'http://127.0.0.1:9099';
const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const enc = v => v === null ? { nullValue: null } : v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const put = (p, d) => fetch(`${FS}/${p}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: enc(d).mapValue.fields }) });
const get = p => fetch(`${FS}/${p}`, { headers: H }).then(r => r.json());
const fails = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };
(async () => {
  const EMAIL = 'duena@cafelito.test', U = 'Cafelito Ambulante';
  await put('tenants/cafelito', { name: 'Cafelito Coffee House' });
  await put(`invites/${EMAIL}__cafelito`, { email: EMAIL, tenantId: 'cafelito', tenantName: 'Cafelito', role: 'Dueño', invitedBy: 'alta' });
  await put('tenants/cafelito/state/base', { json: JSON.stringify({ brands: [{ name: 'Cafelito Coffee House', color: '#1E9BD7' }, { name: U, color: '#FF2D87' }], workspaces: [{ name: 'General' }] }), by: 'alta' });
  await put('tenants/cafelito/state/m_objectives', { json: JSON.stringify([{ id: 'o1', title: 'Vender 8 eventos', brand: U, period: 'Q4 2026', owner: 'Melina', krs: [] }]), by: 'alta' });
  await put('tenants/cafelito/state/m_campaigns', { json: JSON.stringify([{ id: 'k1', name: 'Fin de año empresas', brand: U, objectiveId: 'o1', personas: [], type: 'Paga', objective: 'Ventas', start: '2026-11-01', end: '2026-12-31', budget: 300000, spent: 200000, audience: 'Empresas', channels: ['Instagram'], status: 'Activa', segment: 'General', m: { reach: 0, impr: 0, clicks: 0, conv: 0, revenue: 0 }, seed: 1 }]), by: 'alta' });
  const sc = () => ({ rates: {}, costs: { cpc: null, cpl: null, cpa: null } });
  await put('tenants/cafelito/state/m_funnels', { json: JSON.stringify([{ id: 'f1', name: 'Barra Eventos', objectiveId: 'o1', goal: 8, goalType: 'Ventas', stages: [{ id: 's1', name: 'Cotizaciones', type: 'lead', source: 'crm-q-all', campOnly: false, real: null }, { id: 's2', name: 'Ventas', type: 'conversion', source: 'crm-q-won', campOnly: false, real: null }], scenarios: { cons: sc(), esp: sc(), opt: sc() }, active: 'esp', campaigns: [{ id: 'k1' }], history: [], created: '2026-11-01', refChecked: true }]), by: 'alta' });
  const T = new Date('2026-11-18T12:00:00Z');
  await put('tenants/cafelito/contacts/c1', { name: 'Estudio Ruiz', phoneE164: '+5493515550187' });
  await put('tenants/cafelito/contacts/c2', { name: 'Azafrán', phoneE164: '+5493513061277' });
  const op = (id, d) => put(`tenants/cafelito/opportunities/${id}`, { pipeline: 'cafelito-eventos', brand: U, owner: 'Melina', event: { type: 'Corporativo', date: '2026-12-12', guests: 80 }, estimate: { brandazoSubtotalMinor: 100000000 }, warnings: [], lostReason: null, nextFollowUpAt: T, createdAt: T, ...d });
  await op('a1', { stage: 'ganada', contactId: 'c1', title: 'x · Estudio Ruiz · 2026-12-12', attribution: { utmSource: 'instagram', utmCampaign: 'fin-de-ano-empresas' }, won: { amountMinor: 130000000, depositMinor: 65000000, depositPaid: true, depositPaidAt: T, balancePaid: false, balancePaidAt: null } });
  await op('a2', { stage: 'contactado', contactId: 'c2', title: 'x · Azafrán · 2026-12-12', attribution: null });

  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + '?emu=1#/registro'); await page.waitForSelector('#pw2');
  await page.fill('#em', EMAIL); await page.fill('#pw2', 'Clave-segura-2026'); await page.check('#tos'); await page.click('#f button.btn-primary'); await page.waitForSelector('#vok');
  let vc; for (let i = 0; i < 40 && !vc; i++) { vc = (await (await fetch(`${AU}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.find(c => c.email === EMAIL); if (!vc) await new Promise(r => setTimeout(r, 250)); }
  await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:update?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode: vc.oobCode }) });
  await page.click('#vok'); await page.waitForSelector('.app', { timeout: 20000 });
  // Campaña
  await page.goto(BASE + '#/app/campanas/k1'); await page.waitForSelector('#campsales', { timeout: 15000 }); await page.waitForSelector('#campsales .stat-grid', { timeout: 15000 });
  const t = await page.textContent('#campsales');
  ok(/fin-de-ano-empresas/.test(t), 'la campaña tiene su código de seguimiento');
  ok(/utm_campaign=fin-de-ano-empresas/.test(await page.inputValue('#clout')) && /utm_source=instagram/.test(await page.inputValue('#clout')), 'arma el link para los anuncios con el código');
  ok(/Cotizaciones\s*1/.test(t) && /Ganadas\s*1/.test(t) && /1\.300\.000/.test(t), 'muestra la cotización que trajo, la venta ganada y la facturación');
  ok(/2\.000\.000|Costo por venta\s*\$/.test(t), 'calcula el costo por venta con la inversión');
  // CRM: etiqueta de campaña y asignación a mano
  await page.goto(BASE + '#/app/crm/eventos'); await page.waitForSelector('.kanban');
  ok(/Fin de año empresas/.test(await page.textContent('[data-op="a1"]')) && !/Fin de año/.test(await page.textContent('[data-op="a2"]')), 'la tarjeta del CRM muestra la campaña que la trajo');
  await page.click('[data-op="a2"]'); await page.waitForSelector('#evcamp'); await page.selectOption('#evcamp', 'k1'); await page.waitForTimeout(1500);
  ok((await get('tenants/cafelito/opportunities/a2')).fields.campaignId.stringValue === 'k1', 'asignar la campaña desde la ficha se guarda');
  await page.keyboard.press('Escape'); await page.goto(BASE + '#/app/campanas/k1'); await page.waitForSelector('#campsales .stat-grid');
  ok(/Cotizaciones\s*2/.test(await page.textContent('#campsales')), 'la campaña suma la cotización asignada a mano');
  // Funnel con datos reales
  await page.evaluate(() => { S.brand = -1; }); await page.goto(BASE + '#/app/estrategia/funnel/f1'); await page.waitForTimeout(2500);
  const real = await page.evaluate(() => { const f = M().funnels.find(x => x.id === 'f1'); return fCalc(f).real; });
  ok(real[0] === 2 && real[1] === 1, 'el funnel toma los resultados reales del CRM (2 cotizaciones, 1 venta): ' + JSON.stringify(real));
  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
