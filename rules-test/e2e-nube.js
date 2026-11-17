// Prueba de punta a punta de la Etapa 0 contra los emuladores (auth 9099, firestore 8080). No toca la base real.
const { chromium } = require('playwright');
const BASE = 'http://localhost:8410/';
const P = 'brandazo';
const FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`;
const AU = 'http://127.0.0.1:9099';
const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const enc = v => v === null ? { nullValue: null } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : typeof v === 'number' ? { doubleValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : v instanceof Date ? { timestampValue: v.toISOString() } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const put = (p, data) => fetch(`${FS}/${p}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: enc(data).mapValue.fields }) }).then(async r => { if (!r.ok) throw new Error(p + ' ' + await r.text()); });
const get = p => fetch(`${FS}/${p}`, { headers: H }).then(r => r.json());
const list = p => fetch(`${FS}/${p}?pageSize=100`, { headers: H }).then(r => r.json());
const fails = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };

(async () => {
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${P}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`${AU}/emulator/v1/projects/${P}/accounts`, { method: 'DELETE' });
  const EMAIL = 'duena@cafelito.test';
  await put('tenants/cafelito', { name: 'Cafelito Coffee House', country: 'Argentina' });
  await put('tenants/cafelito-pruebas', { name: 'Cafelito (pruebas)', country: 'Argentina' });
  await put(`invites/${EMAIL}__cafelito`, { email: EMAIL, tenantId: 'cafelito', tenantName: 'Cafelito Coffee House', role: 'Dueño', invitedBy: 'alta' });
  await put('tenants/cafelito/contacts/c1', { name: 'Estudio Contable Ruiz', phoneE164: '+5493515550187', phoneDisplay: '+54 9 351 555-0187', email: 'eventos@ejemplo.com.ar', quoteCount: 1, marketingConsent: { granted: true } });
  const past = new Date(Date.now() - 2 * 864e5);
  await put('tenants/cafelito/opportunities/op1', { pipeline: 'cafelito-eventos', stage: 'nueva-cotizacion', title: 'Corporativo · Estudio Contable Ruiz · 2026-12-12', contactId: 'c1', brand: 'Cafelito Ambulante', owner: '',
    event: { type: 'Corporativo', date: '2026-12-12', startTime: '18:00', durationHours: 5, inCapital: true, place: 'Nueva Córdoba', guests: 80 }, selection: { plan: 'full', addonIds: ['cookies'], customizationIds: [], wantsCake: false, wantsColdBrew: true }, dietary: ['Celíacos'], notes: 'Brindis',
    estimate: { status: 'match', tariffVersion: 'web-2026-11', brandazoSubtotalMinor: 142000000, webSubtotalMinor: 142000000, lines: [{ code: 'plan', label: 'Plan Full', quantity: 80, unitMinor: 700000, totalMinor: 56000000 }], transfer: 'included' },
    source: { channel: 'Web · Cotizador Cafelito Ambulante' }, attribution: { utmSource: 'instagram', utmCampaign: 'eventos-fin-de-ano' }, warnings: ['SHORT_NOTICE'], lostReason: null, nextFollowUpAt: past, createdAt: new Date() });
  await put('tenants/cafelito-pruebas/opportunities/opx', { pipeline: 'cafelito-eventos', stage: 'nueva-cotizacion', title: 'Boda · NO DEBE VERSE · 2026-12-20', owner: '', event: { type: 'Boda', date: '2026-12-20', guests: 10 }, estimate: { brandazoSubtotalMinor: 1 } });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/PERMISSION_DENIED|favicon|status of 400/.test(m.text())) errs.push(m.text()); }); page.on('response', r => { if (r.status() >= 400 && !/accounts:signInWithPassword/.test(r.url())) errs.push('HTTP ' + r.status() + ' ' + r.url().slice(0, 120)); });

  // 1) Prototipo local (sin ?emu): sigue funcionando como antes. Cargamos datos "míos" en el navegador.
  await page.goto(BASE + '#/login'); await page.click('[data-google]'); await page.waitForSelector('.app');
  await page.evaluate(() => { const c = { name: 'Cafelito Coffee House', country: 'Argentina', industry: 'Gastronomía', size: '2 a 10' }; S.companies.push(c); switchCompany(c); S.brands = [{ name: 'Cafelito Ambulante', color: '#FF2D87' }]; M().objectives.push({ id: 'o1', name: 'Vender 10 eventos', brand: 'Cafelito Ambulante' }); M().personas.push({ id: 'p1', name: 'Empresa que festeja' }); persist(); });
  ok((await page.evaluate(() => S.companies.length)) >= 2, 'modo local: el prototipo arranca igual que antes');

  // 2) Modo nube con emuladores: sin sesión → login
  await page.goto(BASE + '?emu=1#/app/inicio'); await page.waitForFunction(() => location.hash === '#/login', null, { timeout: 15000 });
  ok(true, 'sin sesión, /app manda al login');
  ok(await page.isVisible('text=¿Te invitaron a Brandazo?'), 'login dice que es por invitación');
  // contraseña mala
  await page.fill('#em', EMAIL); await page.fill('#pw', 'malamala1'); await page.click('#f button.btn-primary');
  await page.waitForSelector('#formerr .alert'); ok(/incorrectos/.test(await page.textContent('#formerr')), 'credenciales malas: mensaje claro');

  // 3) Registro → verificación
  await page.goto(BASE + '?emu=1#/registro'); await page.waitForSelector('#pw2');
  ok(await page.isVisible('text=usá el mismo email con el que te invitaron'), 'registro avisa que es por invitación');
  await page.fill('#em', EMAIL); await page.fill('#pw2', 'Clave-segura-2026'); await page.check('#tos'); await page.click('#f button.btn-primary');
  await page.waitForSelector('#vok', { timeout: 15000 }); ok(true, 'después de crear la cuenta pide verificar el email');
  await page.click('#vok'); await page.waitForTimeout(800); ok(await page.isVisible('#vok'), 'sin verificar no entra');
  const codes = await (await fetch(`${AU}/emulator/v1/projects/${P}/oobCodes`)).json();
  const link = codes.oobCodes.find(c => c.requestType === 'VERIFY_EMAIL' && c.email === EMAIL).oobLink;
  await fetch(link); await page.click('#vok');
  await page.waitForSelector('.app', { timeout: 20000 }); ok(true, 'verificado: entra a la app');
  await page.waitForTimeout(800);
  const cos = await page.evaluate(() => S.companies.map(c => (c.cloud ? '☁ ' : '') + c.name));
  ok(cos.includes('☁ Cafelito Coffee House') && !cos.some(n => n.includes('pruebas')), 'aceptó la invitación: ve Cafelito y no ve la empresa de pruebas · ' + cos.join(' | '));
  ok((await get(`invites/${EMAIL}__cafelito`)).error, 'la invitación usada se borró');
  ok(await page.isVisible('text=En la nube'), 'indicador "En la nube" visible');

  // 4) CRM → Cafelito Eventos
  await page.evaluate(() => { const c = S.companies.find(x => x.cloud); switchCompany(c); }); await page.goto(BASE + '#/app/crm'); try { await page.waitForSelector('.kanban', { timeout: 15000 }); } catch (e) { console.log('DBG', await page.evaluate(async () => { try { const s = await fbDb.collection('tenants/cafelito/opportunities').where('pipeline','==','cafelito-eventos').get(); return 'get ok ' + s.size + ' tid=' + EV.tid + ' loaded=' + EV.loaded; } catch (e) { return 'get err ' + e.code + ' ' + e.message; } })); page.on('response', r => { if (r.status() >= 400) console.log('RESP', r.status(), r.url().slice(0, 160)); }); await page.reload(); await page.waitForTimeout(6000); console.log('PANTALLA:', page.url(), (await page.evaluate(() => document.querySelector('#root').innerText)).slice(0, 900), errs); throw e; }
  const board = await page.textContent('.kanban');
  ok(/Estudio Contable Ruiz/.test(board) && !/NO DEBE VERSE/.test(board), 'tablero muestra la cotización real y nada de otra empresa');
  ok(/1\.420\.000/.test(await page.textContent('.stat-grid')), 'presupuesto en pesos desde centavos ($ 1.420.000)');
  ok(await page.isVisible('text=Seguimiento vencido'), 'marca el seguimiento vencido');
  await page.screenshot({ path: require('os').tmpdir() + '/e2e-tablero.png' });
  await page.click('[data-op=op1]'); await page.waitForSelector('#evsave');
  const href = await page.getAttribute('a[href^="https://wa.me/"]', 'href'); ok(href && href.startsWith('https://wa.me/5493515550187'), 'botón de WhatsApp con el teléfono normalizado');
  await page.waitForTimeout(600); await page.screenshot({ path: require('os').tmpdir() + '/e2e-ficha.png' }); await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300); await page.screenshot({ path: require('os').tmpdir() + '/e2e-ficha-movil.png' }); await page.setViewportSize({ width: 1280, height: 860 });
  await page.selectOption('#evst', 'perdida'); await page.click('#evsave'); await page.waitForTimeout(300);
  ok(await page.isVisible('#evlostf .err:has-text("Elegí por qué")') || /Elegí por qué/.test(await page.textContent('#evlostf')), 'pasar a Perdida pide el motivo');
  await page.selectOption('#evst', 'contactado'); await page.click('#evsave'); await page.waitForTimeout(1500);
  const op = await get('tenants/cafelito/opportunities/op1');
  ok(op.fields.stage.stringValue === 'contactado' && op.fields.stageHistory.arrayValue.values.length === 1, 'cambio de etapa guardado con historial');
  ok(/Contactado[\s\S]*Estudio Contable Ruiz/.test(await page.textContent('.kanban')), 'el tablero se actualiza en vivo');
  const aud = await list('tenants/cafelito/audit'); ok((aud.documents || []).length === 1, 'quedó registro de auditoría');

  // 5) Configurar marca
  await page.click('#evcfg'); await page.waitForSelector('#evcok'); await page.click('#evcok'); await page.waitForTimeout(800);
  const st = await get('tenants/cafelito/settings/cafelito-eventos'); ok(st.fields && st.fields.brand.stringValue === 'Cafelito Ambulante', 'marca de las cotizaciones guardada');

  // 6) Subir datos del navegador
  await page.click('#me'); await page.waitForSelector('[data-a=subir]'); ok(true, 'menú ofrece "Subir datos de este navegador"');
  await page.click('[data-a=subir]'); await page.waitForSelector('#impok');
  const sel = await page.$$eval('#layer select', s => s.map(x => x.value)); ok(sel.includes('cafelito'), 'propone la empresa de la nube con el mismo nombre');
  await page.click('#impok'); await page.waitForTimeout(2000);
  const parts = await list('tenants/cafelito/state'); const ids = (parts.documents || []).map(d => d.name.split('/').pop());
  ok(ids.includes('base') && ids.includes('m_objectives'), 'datos subidos por partes: ' + ids.length + ' partes');
  const obj = JSON.parse((await get('tenants/cafelito/state/m_objectives')).fields.json.stringValue); ok(obj[0] && obj[0].name === 'Vender 10 eventos', 'el objetivo del navegador quedó en la nube');
  ok(await page.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('bz-data-respaldo-'))), 'quedó copia de seguridad en el navegador');

  // 7) Recargar: los datos vienen de la nube
  await page.reload(); await page.waitForSelector('.app', { timeout: 20000 }); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const c = S.companies.find(x => x.cloud && x.tid === 'cafelito'); return c && STORE.get(c).m.objectives.some(o => o.name === 'Vender 10 eventos'); }), 'al recargar, los datos se leen de la nube');
  ok(await page.evaluate(() => !JSON.parse(localStorage.getItem('bz-data')).companies.some(c => c.cloud)), 'las empresas de la nube no se duplican en el navegador');
  // edición → se guarda en la nube
  await page.evaluate(() => { M().personas.push({ id: 'p2', name: 'Novios' }); persist(); }); await page.waitForTimeout(1500);
  const per = JSON.parse((await get('tenants/cafelito/state/m_personas')).fields.json.stringValue); ok(per.some(p => p.name === 'Novios'), 'un cambio se guarda solo en la nube');

  // 8) Equipo: invitar
  await page.goto(BASE + '#/app/config/usuarios'); await page.waitForTimeout(800);
  await page.evaluate(() => inviteModal()); await page.fill('#layer .invite-row input', 'ventas@cafelito.test'); await page.click('#ok'); await page.waitForTimeout(1200);
  ok(!(await get('invites/ventas@cafelito.test__cafelito')).error, 'invitación creada en la nube');

  // 9) Cerrar sesión
  await page.click('#me'); await page.click('[data-a=salir]'); await page.waitForFunction(() => location.hash === '#/login', null, { timeout: 10000 });
  ok(await page.evaluate(() => !S.companies.some(c => c.cloud)), 'al salir no quedan datos de la nube en pantalla');

  // 10) Otra persona sin invitación
  const p2 = await (await browser.newContext()).newPage();
  await p2.goto(BASE + '?emu=1#/registro'); await p2.waitForSelector('#pw2');
  await p2.fill('#em', 'intrusa@otra.test'); await p2.fill('#pw2', 'Clave-segura-2026'); await p2.check('#tos'); await p2.click('#f button.btn-primary');
  await p2.waitForSelector('#vok'); const c2 = (await (await fetch(`${AU}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.find(c => c.email === 'intrusa@otra.test'); await fetch(c2.oobLink); await p2.click('#vok');
  await p2.waitForSelector('text=Todavía no tenés acceso a ninguna empresa', { timeout: 15000 }); ok(true, 'sin invitación: no ve ninguna empresa');

  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close();
  console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO OK');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
