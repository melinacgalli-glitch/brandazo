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
const applyOob = (code) => fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:update?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode: code }) });
const fails = [];
let page; const reopen = async () => { await page.waitForTimeout(700); if (!(await page.$('#evtl'))) await page.click('[data-op=op1]'); await page.waitForSelector('#evtl', { timeout: 15000 }); }; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };

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
    source: { channel: 'Web · Cotizador Cafelito Ambulante' }, attribution: { utmSource: 'instagram', utmCampaign: 'eventos-fin-de-ano' }, warnings: ['SHORT_NOTICE', 'ADDON_NOT_IN_PLAN', 'PHONE_NOT_NORMALIZED', 'ESTIMATE_MISMATCH'], lostReason: null, nextFollowUpAt: past, createdAt: new Date() });
  await put('tenants/cafelito/tasks/t1', { type: 'primer-contacto', title: 'Primer contacto: Estudio Contable Ruiz', opportunityId: 'op1', contactId: 'c1', assignee: 'Melina Galli', dueAt: past, status: 'pendiente' });
  await put('tenants/cafelito-pruebas/opportunities/opx', { pipeline: 'cafelito-eventos', stage: 'nueva-cotizacion', title: 'Boda · NO DEBE VERSE · 2026-12-20', owner: '', event: { type: 'Boda', date: '2026-12-20', guests: 10 }, estimate: { brandazoSubtotalMinor: 1 } });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/PERMISSION_DENIED|favicon|status of 400|status of 502/.test(m.text())) errs.push(m.text()); }); page.on('response', r => { if (r.status() >= 400 && !/accounts:signInWithPassword|\/cuenta\/(verificar|recuperar)/.test(r.url())) errs.push('HTTP ' + r.status() + ' ' + r.url().slice(0, 120)); });

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
  let vc; for (let i = 0; i < 40 && !vc; i++) { vc = (await (await fetch(`${AU}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.find(c => c.requestType === 'VERIFY_EMAIL' && c.email === EMAIL); if (!vc) await new Promise(r => setTimeout(r, 250)); }
  await applyOob(vc.oobCode); await page.click('#vok');
  await page.waitForSelector('.app', { timeout: 20000 }); ok(true, 'verificado: entra a la app');
  await page.waitForTimeout(800);
  const cos = await page.evaluate(() => S.companies.map(c => (c.cloud ? '☁ ' : '') + c.name));
  ok(cos.includes('☁ Cafelito Coffee House') && !cos.some(n => n.includes('pruebas')), 'aceptó la invitación: ve Cafelito y no ve la empresa de pruebas · ' + cos.join(' | '));
  ok((await get(`invites/${EMAIL}__cafelito`)).error, 'la invitación usada se borró');
  ok(!cos.some(n => !n.startsWith('☁')), 'con sesión iniciada, el selector solo muestra empresas de la nube (no «Estudio Norte» ni otras del navegador)');
  await page.click('#ctx'); ok(!/Estudio Norte|Café del Centro/.test(await page.textContent('#layer')), 'el menú de empresas no muestra la de ejemplo'); await page.keyboard.press('Escape');
  ok(await page.isVisible('#syncst'), 'indicador de guardado en la nube visible');

  // 4) CRM → Cafelito Eventos
  await page.evaluate(() => { const c = S.companies.find(x => x.cloud); switchCompany(c); }); await page.goto(BASE + '#/app/crm'); try { await page.waitForSelector('.kanban', { timeout: 15000 }); } catch (e) { console.log('DBG', await page.evaluate(async () => { try { const s = await fbDb.collection('tenants/cafelito/opportunities').where('pipeline','==','cafelito-eventos').get(); return 'get ok ' + s.size + ' tid=' + EV.tid + ' loaded=' + EV.loaded; } catch (e) { return 'get err ' + e.code + ' ' + e.message; } })); page.on('response', r => { if (r.status() >= 400) console.log('RESP', r.status(), r.url().slice(0, 160)); }); await page.reload(); await page.waitForTimeout(6000); console.log('PANTALLA:', page.url(), (await page.evaluate(() => document.querySelector('#root').innerText)).slice(0, 900), errs); throw e; }
  const board = await page.textContent('.kanban');
  ok(/Estudio Contable Ruiz/.test(board) && !/NO DEBE VERSE/.test(board), 'tablero muestra la cotización real y nada de otra empresa');
  ok(/1\.420\.000/.test(await page.textContent('.stat-grid')), 'presupuesto en pesos desde centavos ($ 1.420.000)');
  ok(await page.isVisible('text=Seguimiento vencido'), 'marca el seguimiento vencido');
  ok(await page.isVisible('.ev-legend') && await page.evaluate(() => getComputedStyle(document.querySelector('.kcol[data-evstage="nueva-cotizacion"]')).borderTopWidth === '4px') && await page.evaluate(() => !!document.querySelector('.stat.st-bad')), 'CRM con colores tipo semáforo (etapas, leyenda y vencidos en rojo)');
  await page.screenshot({ path: require('os').tmpdir() + '/e2e-tablero.png' });
  // tarjetas sin desborde en celular
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => [...document.querySelectorAll('.ev-card, .ev-card *')].every(e => e.scrollWidth <= e.clientWidth + 1 || getComputedStyle(e).overflow === 'visible' && e.getBoundingClientRect().right <= e.closest('.ev-card').getBoundingClientRect().right + 1)), 'tarjeta con 4 avisos: nada sale de la tarjeta en celular');
  await page.screenshot({ path: require('os').tmpdir() + '/e2e-tarjeta-movil.png' });
  await page.setViewportSize({ width: 1280, height: 860 });
  // enlace del mail de recordatorio: abre la ficha
  await page.goto(BASE + '#/app/crm/eventos?t=cafelito&op=op1'); await page.waitForSelector('#evtl', { timeout: 15000 }); ok(!/op=/.test(page.url()), 'el enlace del mail abre la ficha de la cotización'); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // Contactos y Actividades reales
  await page.goto(BASE + '#/app/crm/contactos'); await page.waitForSelector('[data-evc=c1]', { timeout: 15000 });
  ok(!/Tu CRM está vacío/.test(await page.textContent('#root')), 'Contactos muestra los contactos reales (no la pantalla vacía del prototipo)');
  ok(!(await page.$('[data-demo]')), 'en la empresa real no se ofrecen datos de ejemplo');
  await page.click('[data-evc=c1]'); await page.waitForSelector('[data-evop=op1]'); ok(true, 'la ficha del contacto lista sus pedidos'); await page.keyboard.press('Escape');
  await page.goto(BASE + '#/app/crm/actividades'); await page.waitForSelector('[data-evdone=t1]', { timeout: 15000 });
  ok(/Vencida/.test(await page.textContent('#root')), 'Actividades: «Primer contacto» vencida');
  await page.click('[data-evdone=t1]'); await page.waitForTimeout(1500);
  const tk = await get('tenants/cafelito/tasks/t1'); ok(tk.fields.status.stringValue === 'hecha', 'marcar como hecha se guarda');
  await page.goto(BASE + '#/app/crm/leads'); await page.waitForSelector('.kanban', { timeout: 15000 }); ok(true, 'una solapa vieja (Leads) cae en Cafelito Eventos en vez de la pantalla vacía');
  await page.goto(BASE + '#/app/crm'); await page.waitForSelector('.kanban');
  await page.click('[data-op=op1]'); await page.waitForSelector('#evsave');
  const href = await page.getAttribute('a[href^="https://wa.me/"]', 'href'); ok(href && href.startsWith('https://wa.me/5493515550187'), 'botón de WhatsApp con el teléfono normalizado');
  await page.waitForTimeout(600); await page.screenshot({ path: require('os').tmpdir() + '/e2e-ficha.png' }); await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300); await page.screenshot({ path: require('os').tmpdir() + '/e2e-ficha-movil.png' }); await page.setViewportSize({ width: 1280, height: 860 });
  // Ciclo de vida: Contactado (pide próximo seguimiento) → Propuesta → Ganada con seña 50 % → cobros
  await page.click('[data-evmove=perdida]'); await page.waitForSelector('#sok'); await page.click('#sok'); await page.waitForTimeout(300);
  ok(/Elegí por qué/.test(await page.textContent('#layer')), 'pasar a Perdida pide el motivo'); await page.click('#layer [data-close].btn');
  await page.waitForTimeout(300); await page.click('[data-op=op1]'); await page.waitForSelector('[data-evmove=contactado]');
  ok(!(await page.$('.ev-stage-cur + * .btn-primary')) && (await page.textContent('.ev-stage-cur')).includes('Nueva cotización'), 'la etapa actual se ve marcada y ninguna otra aparece resaltada');
  await page.click('[data-evmove=contactado]'); await page.waitForSelector('#svia'); await page.selectOption('#svia', 'WhatsApp'); await page.fill('#snote', 'Le escribí, espera la propuesta'); await page.fill('#sna', 'Escribirle para ver si leyó la propuesta'); await page.click('#sok');
  await page.waitForTimeout(500); ok(!(await page.$('#layer .drawer')), 'al guardar la etapa se cierra la ficha'); await reopen();
  await page.waitForSelector('#evtl li:has-text("Le escribí")', { timeout: 15000 }); ok(true, 'Contactado: queda en la historia con el canal y la nota');
  let op = await get('tenants/cafelito/opportunities/op1');
  ok(op.fields.nextAction && op.fields.nextAction.stringValue === 'Escribirle para ver si leyó la propuesta', '«qué hay que hacer» guardado');
  { const tl = await page.textContent('#evtl'); ok((tl.match(/Le escribí, espera la propuesta/g) || []).length === 1, 'la nota no se repite en la historia'); }
  ok(op.fields.stage.stringValue === 'contactado' && op.fields.nextFollowUpAt.timestampValue, 'cambio de etapa guardado con próximo seguimiento');
  await page.click('[data-evmove=propuesta-enviada]'); await page.waitForSelector('#samt'); await page.fill('#samt', ''); await page.click('#sok'); await page.waitForTimeout(300);
  ok(/Ingresá el importe/.test(await page.textContent('#layer')), 'Propuesta sin importe: lo pide');
  await page.fill('#samt', '1.300.000'); await page.click('#sok'); await reopen(); await page.waitForSelector('text=Propuesta enviada el', { timeout: 15000 });
  op = await get('tenants/cafelito/opportunities/op1'); ok(op.fields.proposal.mapValue.fields.amountMinor.integerValue === '130000000', 'importe de la propuesta en centavos (1.300.000 → 130000000)');
  await page.fill('#evatx', 'Llamé, pide sumar 20 personas'); await page.selectOption('#evat', 'Llamada'); await page.click('#evatok'); await reopen();
  await page.waitForSelector('#evtl li:has-text("pide sumar 20")', { timeout: 15000 }); ok(true, 'Registrar actividad sin cambiar de etapa');
  await page.click('[data-evmove=ganada]'); await page.waitForSelector('#sdep');
  ok(await page.inputValue('#sdep') === '650.000', 'seña del 50 % calculada sola ($ 650.000)');
  ok(/Saldo a cobrar: \$ 650\.000/.test(await page.textContent('#sbal')), 'muestra el saldo a cobrar');
  await page.click('#sok'); await reopen(); await page.waitForSelector('[data-evpay=deposit]', { timeout: 15000 });
  await page.click('[data-evpay=deposit]'); await page.waitForSelector('#pok'); await page.click('#pok'); await reopen(); await page.waitForSelector('[data-evpay=balance]', { timeout: 15000 });
  op = await get('tenants/cafelito/opportunities/op1'); const won = op.fields.won.mapValue.fields;
  ok(won.amountMinor.integerValue === '130000000' && won.depositMinor.integerValue === '65000000' && won.depositPaid.booleanValue === true, 'ganada: total, seña y cobro de la seña guardados');
  const acts = await list('tenants/cafelito/activities'); ok((acts.documents || []).length === 5, 'historia completa: 5 movimientos (' + (acts.documents || []).length + ')');
  await page.waitForTimeout(600); await page.screenshot({ path: require('os').tmpdir() + '/e2e-ciclo.png', fullPage: false }); await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300); ok(await page.evaluate(() => { const d = document.querySelector('#layer .drawer'); return d && d.scrollWidth <= d.clientWidth + 1; }), 'ficha sin desborde en celular'); await page.screenshot({ path: require('os').tmpdir() + '/e2e-ciclo-movil.png' }); await page.setViewportSize({ width: 1280, height: 860 });
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok(/Ganada[\s\S]*Estudio Contable Ruiz[\s\S]*1\.300\.000[\s\S]*Seña cobrada/.test(await page.textContent('.kanban')), 'el tablero muestra el importe final y el estado del cobro');
  // arrastrar una tarjeta abre el formulario de la etapa
  await page.evaluate(() => { const dt = new DataTransfer(), src = document.querySelector('[data-op=op1]'), dst = document.querySelector('[data-evstage=perdida]');
    src.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true })); dst.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    dst.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); src.dispatchEvent(new DragEvent('dragend', { dataTransfer: dt, bubbles: true })); });
  await page.waitForSelector('#slost', { timeout: 5000 }).catch(() => {});
  ok(await page.isVisible('#slost'), 'arrastrar a «Perdida» abre el formulario con el motivo'); await page.click('#layer [data-close].btn');
  const aud = await list('tenants/cafelito/audit'); ok((aud.documents || []).length >= 5, 'quedó registro de auditoría');

  // 5) Configurar marca
  await page.click('#evcfg'); await page.waitForSelector('#evcok'); await page.click('#evcok'); await page.waitForTimeout(800);
  const st = await get('tenants/cafelito/settings/cafelito-eventos'); ok(st.fields && st.fields.brand.stringValue === 'Cafelito Ambulante', 'marca de las cotizaciones guardada');

  // 5b) Redes e integraciones: botón real para Meta y Google Ads, aviso honesto para las demás (sin simulaciones)
  await page.goto(BASE + '#/app/redes'); await page.waitForSelector('[data-cxconn]', { timeout: 15000 });
  ok(true, 'Redes: muestra el botón real «Conectar Instagram y Facebook»'); ok(await page.evaluate(() => !M().accounts.length), 'no se guardó ninguna cuenta inventada');
  await page.goto(BASE + '#/app/integraciones'); await page.waitForSelector('[data-iconn]'); await page.click('[data-iconn="0"]'); await page.waitForFunction(() => location.hash === '#/app/redes');
  ok(true, 'Integraciones: Meta lleva a Redes sociales');
  await page.goto(BASE + '#/app/integraciones'); await page.waitForSelector('[data-iconn="7"]'); await page.click('[data-iconn="7"]'); await page.waitForSelector('#layer .modal');
  ok(/todavía no disponible/.test(await page.textContent('#layer')), 'Integraciones: TikTok avisa que todavía no está disponible'); await page.click('#layer .btn-primary[data-close]');
  // 6) Subir datos del navegador
  await page.click('#me'); await page.waitForSelector('[data-a=subir]'); ok(true, 'menú ofrece "Subir datos de este navegador"');
  await page.click('[data-a=subir]'); await page.waitForSelector('#impok');
  const sel = await page.$$eval('#layer select', s => s.map(x => x.value)); const labels = await page.textContent('#layer'); ok(/Estudio Norte[\s\S]*Empresa de ejemplo/.test(labels) && !/Café del Centro/.test(labels), 'la de ejemplo aparece marcada y las vacías no aparecen'); ok((await page.$$eval('#layer select', s => s.map(x => x.value))).filter(v => v).length === 1, 'la de ejemplo viene en «No subir»'); ok(sel.includes('cafelito'), 'propone la empresa de la nube con el mismo nombre');
  await page.click('#impok'); await page.waitForTimeout(2000);
  const parts = await list('tenants/cafelito/state'); const ids = (parts.documents || []).map(d => d.name.split('/').pop());
  ok(ids.includes('base') && ids.includes('m_objectives'), 'datos subidos por partes: ' + ids.length + ' partes');
  const obj = JSON.parse((await get('tenants/cafelito/state/m_objectives')).fields.json.stringValue); ok(obj[0] && obj[0].name === 'Vender 10 eventos', 'el objetivo del navegador quedó en la nube');
  ok(await page.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('bz-data-respaldo-'))), 'quedó copia de seguridad en el navegador');

  // 7) Recargar: los datos vienen de la nube
  await page.reload(); await page.waitForSelector('.app', { timeout: 20000 }); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const c = S.companies.find(x => x.cloud && x.tid === 'cafelito'); return c && STORE.get(c).m.objectives.some(o => o.name === 'Vender 10 eventos'); }), 'al recargar, los datos se leen de la nube');
  ok(await page.evaluate(() => !JSON.parse(localStorage.getItem('bz-data')).companies.some(c => c.cloud)), 'las empresas de la nube no se duplican en el navegador');
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('bz-data')).companies.some(c => c.name === 'Estudio Norte')), 'las empresas ocultas siguen guardadas en el navegador');
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
  await p2.waitForSelector('#vok'); let c2; for (let i = 0; i < 40 && !c2; i++) { c2 = (await (await fetch(`${AU}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.find(c => c.email === 'intrusa@otra.test' && c.requestType === 'VERIFY_EMAIL'); if (!c2) await new Promise(r => setTimeout(r, 250)); } await applyOob(c2.oobCode); await p2.click('#vok');
  await p2.waitForSelector('text=Todavía no tenés acceso a ninguna empresa', { timeout: 15000 }); ok(true, 'sin invitación: no ve ninguna empresa');

  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close();
  console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO OK');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
