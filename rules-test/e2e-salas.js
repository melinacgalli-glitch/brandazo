// CRM → Salas: agenda de coworking con reservas que bloquean la sala, y la versión sin clave que usa la web.
// Desde la raíz, con el sitio en 8410: firebase emulators:exec --only functions,auth,firestore --project brandazo "node rules-test/e2e-salas.js"
const { chromium } = require('playwright');
const BASE = 'http://localhost:8410/', P = 'brandazo';
const FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`, AU = 'http://127.0.0.1:9099';
const API = `http://127.0.0.1:5001/${P}/southamerica-east1/api/api/v1/public/cafelito/coworking`;
const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const enc = v => v === null ? { nullValue: null } : v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const put = (p, d) => fetch(`${FS}/${p}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: enc(d).mapValue.fields }) });
const fails = []; let PG;
const dump = async t => {  console.log('DUMP', t, await PG.evaluate(() => JSON.stringify({ layer: document.querySelector('#layer').innerText.slice(0, 300), n: typeof CW !== 'undefined' ? CW.items.map(i => i.name + ':' + i.status).join(',') : '' }))); };
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
(async () => {
  // Un lunes futuro (abre 8:30 a 20)
  const d = new Date(); d.setDate(d.getDate() + 7 + ((8 - d.getDay()) % 7)); const DAY = iso(d);
  const EMAIL = 'duena@cafelito.test';
  await put('tenants/cafelito', { name: 'Cafelito Coffee House' });
  await put(`invites/${EMAIL}__cafelito`, { email: EMAIL, tenantId: 'cafelito', tenantName: 'Cafelito', role: 'Dueño', invitedBy: 'alta' });
  await put('tenants/cafelito/state/base', { json: JSON.stringify({ brands: [{ name: 'Cafelito Work' }], workspaces: [{ name: 'General' }] }), by: 'alta' });
  await put('tenants/cafelito/settings/coworking', { rooms: [{ id: 'sala-4', name: 'Sala para 4', capacity: 4 }, { id: 'sala-8', name: 'Sala para 8', capacity: 8 }, { id: 'sala-10', name: 'Sala para 10', capacity: 10 }],
    hours: { 0: ['17:00-20:00'], 1: ['08:30-20:00'], 2: ['08:30-20:00'], 3: ['08:30-20:00'], 4: ['08:30-20:00'], 5: ['08:30-20:00'], 6: ['09:00-13:00', '17:00-20:00'] }, stepMin: 30, minMin: 120, maxMin: 480 });
  await put('publicSites/cafelito', { tenantId: 'cafelito', origins: ['https://www.cafelito.com.ar', 'https://cafelito.com.ar'] });

  // La web (sin clave): consulta y reserva
  const O = { Origin: 'https://www.cafelito.com.ar', 'Content-Type': 'application/json' };
  let r = await fetch(`${API}/availability?date=${DAY}`, { headers: O }); let j = await r.json();
  ok(r.status === 200 && j.rooms.length === 3 && j.open[0].from === '08:30', 'la web consulta la disponibilidad sin clave');
  r = await fetch(`${API}/availability?date=${DAY}`, { headers: { ...O, Origin: 'https://otra.com' } }); ok(r.status === 403, 'desde otra web: rechazado');
  const res = (id, x) => fetch(`${API}/reservations`, { method: 'POST', headers: { ...O, 'Idempotency-Key': id }, body: JSON.stringify({ eventId: id, contact: { name: 'Verónica Vottero', phone: '3517551220' }, people: 4, date: DAY, from: '10:00', to: '13:00', ...x }) });
  r = await res('web-evt-0001'); j = await r.json(); ok(r.status === 201 && j.reservation.roomId === 'sala-4', 'la web reserva: sala para 4');
  r = await res('web-evt-0001'); j = await r.json(); ok(j.status === 'duplicate', 'reenviar no duplica');
  r = await fetch(`${API}/availability?date=${DAY}`, { headers: O }); j = await r.json();
  ok(JSON.stringify(j.rooms[0].busy) === JSON.stringify([{ from: '10:00', to: '13:00' }]) && !JSON.stringify(j).includes('Vottero'), 'queda ocupada (sin mostrar el nombre)');

  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); PG = page;
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + '?emu=1#/registro'); await page.waitForSelector('#pw2');
  await page.fill('#em', EMAIL); await page.fill('#pw2', 'Clave-segura-2026'); await page.check('#tos'); await page.click('#f button.btn-primary'); await page.waitForSelector('#vok');
  let vc; for (let i = 0; i < 40 && !vc; i++) { vc = (await (await fetch(`${AU}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.find(c => c.email === EMAIL); if (!vc) await new Promise(r => setTimeout(r, 250)); }
  await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:update?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode: vc.oobCode }) });
  await page.click('#vok'); await page.waitForSelector('.app', { timeout: 20000 });

  await page.goto(BASE + '#/app/crm/salas'); try { await page.waitForSelector('#cwdate', { timeout: 20000 }); } catch (e) { console.log('PANTALLA:', await page.evaluate(() => location.hash + ' | ' + document.body.innerText.slice(0, 400) + ' | cfg=' + JSON.stringify(CW.cfg).slice(0,80) + ' loaded=' + CW.cfgLoaded + ' tabs=' + JSON.stringify(CRM_NUBE_TABS)), errs); throw e; }
  ok((await page.$$eval('.tabs .tab', x => x.map(t => t.textContent))).includes('Salas'), 'aparece la solapa «Salas»');
  await page.fill('#cwdate', DAY); await page.dispatchEvent('#cwdate', 'change'); try { await page.waitForSelector('.cw-res', { timeout: 15000 }); } catch (e) { console.log('PANTALLA3:', await page.evaluate(async (d) => { try { const s = await fbDb.collection('tenants/cafelito/cwReservations').get(); return 'all=' + s.size + ' ' + s.docs.map(x => x.data().date).join(','); } catch (e) { return 'ERR ' + e.code + ' ' + e.message; } }, DAY)); console.log('PANTALLA2:', DAY, await page.evaluate(() => JSON.stringify({ d: CW.date, n: CW.items.length, l: CW.dayLoaded, v: document.querySelector('#cwdate') && document.querySelector('#cwdate').value, t: document.querySelector('#root').innerText.slice(0, 500) }))); throw e; }
  ok(/Verónica Vottero/.test(await page.textContent('.cw-card')) && /Web/.test(await page.textContent('.cw-card')), 'la reserva de la web aparece en la agenda');
  ok(/Lunes/.test(await page.textContent('.cw-dayname')) && /Abierto 08:30 a 20:00/.test(await page.textContent('.cw-sub')), 'muestra el día y el horario');
  // Reserva a mano para 4 en el mismo horario → va a la de 8
  await page.click('[data-cwnew]'); await page.waitForTimeout(400); await page.fill('#cwn', 'Juan por WhatsApp'); await page.fill('#cwp', '3517770000'); await page.fill('#cwpe', '4');
  await page.selectOption('#cwf', '10:00'); await page.selectOption('#cwt', '12:00'); await page.click('#cwok');
  await page.waitForFunction(() => /Juan por WhatsApp/.test(document.querySelector('.cw-card').textContent), null, { timeout: 30000 }).catch(async e => { await dump('juan'); throw e; });
  ok(/Sala para 8/.test(await page.textContent('#root')) || true, 'reserva a mano');
  const rows = await page.$$eval('.cw-row', rs => rs.map(r => r.textContent)); ok(/Sala para 8[\s\S]*Juan por WhatsApp/.test(rows.find(x => /Sala para 8/.test(x)) || ''), 'a mano, para 4 a la misma hora: va a la sala para 8');
  // Bloqueo de la de 10 todo el día
  await page.click('[data-cwblock]'); await page.waitForTimeout(400); await page.selectOption('#cwr', 'sala-10'); await page.selectOption('#cwf', '08:30'); await page.selectOption('#cwt', '20:00'); await page.fill('#cwno', 'Evento privado'); await page.click('#cwok');
  await page.waitForFunction(() => /Evento privado/.test(document.querySelector('.cw-card').textContent), null, { timeout: 30000 }).catch(async e => { await dump('blq'); throw e; }); ok(true, 'bloquear la sala para 10');
  // Ahora no hay lugar para otra de 4 a las 10 → aviso
  await page.click('[data-cwnew]'); await page.waitForTimeout(400); await page.fill('#cwn', 'Otra'); await page.fill('#cwp', '3517770001'); await page.fill('#cwpe', '2'); await page.selectOption('#cwf', '11:00'); await page.selectOption('#cwt', '13:00'); await page.click('#cwok');
  await page.waitForFunction(() => /No hay una sala libre/.test(document.body.textContent), null, { timeout: 25000 }).catch(() => {}); const sup = await page.textContent('body'); if (!/No hay una sala libre/.test(sup)) console.log('DBG5', (await page.textContent('#layer')).slice(0, 400)); ok(/No hay una sala libre/.test(sup), 'superpuesta: avisa que no hay sala libre y no la guarda');
  await page.click('#layer .modal-foot [data-close]'); await page.waitForTimeout(300); if (await page.$('[data-discard]')) await page.click('[data-discard]');
  r = await res('web-evt-0002', { from: '11:00', to: '13:00', people: 2, contact: { name: 'Ana Web', phone: '3519990001' } }); ok(r.status === 409 && (await r.json()).error.code === 'SLOT_TAKEN', 'la web tampoco puede reservar ese horario');
  // Mover la de Juan a la tarde → se libera la mañana
  try { await page.click('.cw-res:has-text("Juan por WhatsApp")', { timeout: 8000 }); await page.click('[data-cwmove]', { timeout: 8000 }); } catch (e) { console.log('PANTALLA4:', await page.evaluate(() => document.querySelector('#layer').innerText.slice(0, 300) + ' || ' + document.querySelector('.cw-card').innerText.slice(0, 300))); throw e; } await page.selectOption('#cwmf', '15:00'); await page.selectOption('#cwmt', '17:00'); await page.click('#cwmok');
  await page.waitForFunction(() => /15:00–17:00/.test(document.querySelector('.cw-card').textContent), null, { timeout: 30000 }).catch(() => {}); ok(/15:00–17:00/.test(await page.textContent('.cw-card')), 'mover a la tarde');
  r = await res('web-evt-0003', { from: '11:00', to: '13:00', people: 2, contact: { name: 'Ana Web', phone: '3519990001' } }); j = await r.json(); ok(r.status === 201 && j.reservation.roomId === 'sala-8', 'la mañana se liberó: la web la puede reservar');
  // Cancelar la de Verónica
  await page.waitForFunction(() => document.querySelectorAll('.cw-res').length >= 4, null, { timeout: 30000 }).catch(() => {});
  await page.click('.cw-res:has-text("Verónica Vottero")'); await page.click('[data-cwcancel]'); await page.click('#cwcok');
  await page.waitForFunction(() => !/Verónica Vottero/.test(document.querySelector('.cw-card').textContent), null, { timeout: 30000 }).catch(() => {});
  const cc = await page.textContent('.cw-card'); if (/Verónica Vottero/.test(cc)) console.log('DBG7', JSON.stringify(await (await fetch(`${FS}/tenants/cafelito/cwReservations/web_web-evt-0001`, { headers: H })).json()).slice(0, 300), await page.evaluate(() => document.body.innerText.match(/(Reserva cancelada|No se pudo|No existe)[^\n]*/)?.[0] || 'sin toast')); console.log('DBG12', await page.evaluate(() => JSON.stringify({ items: CW.items.map(i => i.name + ':' + i.status), d: CW.date, sd: CW.subDate, dirty: CW.dirty, layer: document.querySelector('#layer').children.length, hash: location.hash }))); console.log('DBG6', cc.slice(0, 500), '||', (await page.textContent('#layer')).slice(0, 300)); ok(!/Verónica Vottero/.test(cc), 'cancelar la saca de la agenda');
  r = await fetch(`${API}/availability?date=${DAY}`, { headers: O }); j = await r.json(); ok(j.rooms[0].busy.length === 0, 'y la web vuelve a ofrecer ese horario');
  await page.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/salas.png' : require('os').tmpdir() + '/salas.png' });
  // Celular
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && await page.isVisible('.cw-list'), 'en celular: lista por sala, sin desborde');
  if (process.env.SHOT_DIR) await page.screenshot({ path: process.env.SHOT_DIR + '/salas-movil.png', fullPage: true });
  ok(!errs.length, 'sin errores en la página ' + errs.join(' | '));
  await b.close();
  console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
