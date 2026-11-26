// Parte B: suscripciones (Cafelito Work) e inscripciones a cursos (Cafelito Academy), de punta a punta.
// Desde la raíz, con el sitio en 8410: firebase emulators:exec --only functions,auth,firestore --project brandazo "node rules-test/e2e-work-academy.js"
const { chromium } = require('playwright');
const BASE = 'http://localhost:8410/', P = 'brandazo';
const FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`, AU = 'http://127.0.0.1:9099';
const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const enc = v => v === null ? { nullValue: null } : v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const put = (p, d) => fetch(`${FS}/${p}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: enc(d).mapValue.fields }) });
const list = p => fetch(`${FS}/${p}?pageSize=100`, { headers: H }).then(r => r.json()).then(j => j.documents || []);
const fails = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };
const waitText = (page, sel, re, t = 15000) => page.waitForFunction(([s, r]) => new RegExp(r).test((document.querySelector(s) || {}).textContent || ''), [sel, re.source], { timeout: t }).catch(() => {});
(async () => {
  const EMAIL = 'duena@cafelito.test', NOW = new Date(), Q = `Q${Math.floor(NOW.getMonth() / 3) + 1} ${NOW.getFullYear()}`;
  await put('tenants/cafelito', { name: 'Cafelito Coffee House' });
  await put(`invites/${EMAIL}__cafelito`, { email: EMAIL, tenantId: 'cafelito', tenantName: 'Cafelito', role: 'Dueño', invitedBy: 'alta' });
  await put('tenants/cafelito/state/base', { json: JSON.stringify({ brands: [{ name: 'Cafelito Ambulante', color: '#1E9BD7' }, { name: 'Cafelito Work', color: '#22C55E', sells: 'suscripcion' }, { name: 'Cafelito Academy', color: '#A855F7', sells: 'inscripcion' }], workspaces: [{ name: 'General' }] }), by: 'alta' });
  await put('tenants/cafelito/state/m_objectives', { json: JSON.stringify([
    { id: 'ow', title: 'Llenar el cowork', brand: 'Cafelito Work', period: Q, owner: 'Melina', krs: [{ t: 'Ingreso mensual', target: 500000, unit: '$', cur: 0, src: 'sub-mrr' }, { t: 'Activas', target: 10, unit: '', cur: 0, src: 'sub-active' }] },
    { id: 'oa', title: 'Vender cursos', brand: 'Cafelito Academy', period: Q, owner: 'Melina', krs: [{ t: 'Inscripciones', target: 20, unit: '', cur: 0, src: 'enr-count' }, { t: 'Algo a mano', target: 5, unit: '', cur: 1 }] }]), by: 'alta' });
  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + '?emu=1#/registro'); await page.waitForSelector('#pw2');
  await page.fill('#em', EMAIL); await page.fill('#pw2', 'Clave-segura-2026'); await page.check('#tos'); await page.click('#f button.btn-primary'); await page.waitForSelector('#vok');
  let vc; for (let i = 0; i < 40 && !vc; i++) { vc = (await (await fetch(`${AU}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.find(c => c.email === EMAIL); if (!vc) await new Promise(r => setTimeout(r, 250)); }
  await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:update?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode: vc.oobCode }) });
  await page.click('#vok'); await page.waitForSelector('.app', { timeout: 20000 });

  // Suscripciones
  await page.goto(BASE + '#/app/crm/suscripciones'); await page.waitForSelector('[data-lcnewsub]', { timeout: 15000 });
  ok(/Todavía no cargaste planes/.test(await page.textContent('#root')), 'sin planes, lo dice y explica cómo empezar');
  await page.click('[data-lcplan]'); await page.waitForSelector('#plok2'); await page.fill('#pln2', 'Full time'); await page.fill('#plp', '85.000'); await page.click('#plok2'); await page.waitForTimeout(400);
  ok(/Full time[\s\S]*\$ 85\.000\/mes/.test(await page.textContent('#root')), 'agregar un plan');
  await page.click('[data-lcnewsub]'); await page.waitForSelector('#sbok'); ok(await page.inputValue('#sbpr') === '85.000', 'el precio se completa con el del plan');
  await page.fill('#mnn', 'Sofía Ruiz'); await page.fill('#mnp', '3515550001'); await page.fill('#sbmp', '2c938084abc'); await page.click('#sbok');
  await waitText(page, '#root', /Activas\s*1[\s\S]*Sofía Ruiz/);
  const t1 = await page.textContent('#root');
  ok(/Activas\s*1/.test(t1) && /Ingreso mensual\s*\$ 85\.000/.test(t1) && /Altas\s*1/.test(t1), 'la suscripción suma: 1 activa, $ 85.000 por mes, 1 alta');
  await page.click('[data-lcnewsub]'); await page.waitForSelector('#sbok'); await page.fill('#mnn', 'Sofía Ruiz'); await page.fill('#mnp', '3515550001'); await page.fill('#sbmp', '2c938084abc'); await page.click('#sbok');
  await waitText(page, '#layer', /Ya hay una carga con este n\.º/); ok(/Ya hay una carga con este n\.º/.test(await page.textContent('#layer')), 'no deja cargar dos veces la misma suscripción de Mercado Pago');
  await page.click('#layer .modal-foot [data-close]'); await page.waitForTimeout(200); if (await page.$('[data-discard]')) await page.click('[data-discard]');
  const sid = (await list('tenants/cafelito/subscriptions'))[0].name.split('/').pop();
  await page.click(`[data-lcs="${sid}|paused"]`); await page.waitForSelector('#lsok'); await page.click('#lsok'); await waitText(page, '#root', /Pausada/);
  ok(/Activas\s*0/.test(await page.textContent('#root')) && /Pausada/.test(await page.textContent('#root')), 'pausar la saca de las activas');
  await page.click(`[data-lcs="${sid}|active"]`); await page.waitForSelector('#lsok'); await page.click('#lsok'); await waitText(page, '#root', /Activas\s*1/);
  ok(/Activas\s*1/.test(await page.textContent('#root')), 'reactivar la vuelve a sumar');

  // Cursos
  await page.goto(BASE + '#/app/crm/cursos'); await page.waitForSelector('[data-lcnewenr]', { timeout: 15000 });
  await page.click('[data-lccourse]'); await page.waitForSelector('#cook'); await page.fill('#con', 'Barista inicial'); await page.fill('#cos', '2030-03-02'); await page.fill('#coe', '2030-03-30'); await page.fill('#cop', '120.000'); await page.fill('#coq', '1'); await page.click('#cook'); await page.waitForTimeout(400);
  ok(/Barista inicial[\s\S]*Próximo/.test(await page.textContent('#root')), 'agregar un curso');
  await page.click('[data-lcnewenr]'); await page.waitForSelector('#enok'); ok(await page.inputValue('#enam') === '120.000', 'el importe se completa con el precio del curso');
  await page.fill('#mnn', 'Sofía Ruiz'); await page.fill('#mnp', '+54 9 351 555-0001'); await page.waitForTimeout(300);
  ok(/Ya tenés a Sofía Ruiz/.test(await page.textContent('#layer')), 'reconoce al contacto existente por el teléfono');
  await page.fill('#enmp', '777888'); await page.click('#enok'); await waitText(page, '#root', /1 de 1 inscripto/);
  const t2 = await page.textContent('#root');
  ok(/Inscripciones\s*1/.test(t2) && /Facturación\s*\$ 120\.000/.test(t2) && /curso lleno/.test(t2), 'la inscripción suma y avisa que el curso se llenó');
  await page.click('[data-lcnewenr]'); await page.waitForSelector('#enok'); ok(/El curso está lleno/.test(await page.textContent('#layer')), 'al inscribir avisa que no quedan lugares');
  await page.click('#layer .modal-foot [data-close]'); await page.waitForTimeout(200); if (await page.$('[data-discard]')) await page.click('[data-discard]');
  const contacts = await list('tenants/cafelito/contacts'); ok(contacts.length === 1 && contacts[0].fields.type.stringValue === 'Cliente', 'un solo contacto, como Cliente');
  const tags = contacts[0].fields.tags.arrayValue.values.map(v => v.stringValue); ok(tags.includes('Cafelito Work') && tags.includes('Cafelito Academy'), 'el contacto queda en las dos unidades');

  // Ficha del contacto y «Registrar venta»
  await page.goto(BASE + '#/app/crm/contactos'); await page.waitForSelector('[data-evc]'); await page.click('[data-evc]'); await page.waitForSelector('#layer .drawer'); await waitText(page, '#layer', /Cursos \(1\)/);
  const f = await page.textContent('#layer');
  ok(/Cliente · Cafelito Work, Cafelito Academy/.test(f) && /Suscripciones \(1\)[\s\S]*Full time/.test(f) && /Cursos \(1\)[\s\S]*Barista inicial/.test(f), 'la ficha muestra unidades, suscripción y curso');
  await page.click('[data-regsale]'); await page.waitForSelector('[data-rs="suscripcion"]');
  ok(!!(await page.$('[data-rs="inscripcion"]')) && !/próximamente/.test(await page.textContent('#layer')), '«Registrar venta» ofrece suscripción e inscripción');
  await page.click('[data-rs="inscripcion"]'); await page.waitForSelector('#enok'); ok(await page.inputValue('#mnn') === 'Sofía Ruiz', 'con los datos de la persona ya cargados');
  await page.click('#layer .modal-foot [data-close]'); await page.waitForTimeout(200); if (await page.$('[data-discard]')) await page.click('[data-discard]');

  // Objetivos automáticos
  await page.goto(BASE + '#/app/estrategia/okr'); await waitText(page, '#root', /\$ 85\.000 de \$ 500\.000/);
  const ob = await page.textContent('#root');
  ok(/\$ 85\.000 de \$ 500\.000/.test(ob) && /1 de 10/.test(ob) && /1 de 20/.test(ob), 'los objetivos de Work y Academy se completan solos');
  ok(/«Algo a mano» se carga a mano/.test(ob), 'avisa cuando un resultado de una unidad que vende se carga a mano');
  // Celular
  await page.setViewportSize({ width: 390, height: 844 });
  for (const r of ['suscripciones', 'cursos']) { await page.goto(BASE + '#/app/crm/' + r); await page.waitForTimeout(1200); ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${r}: sin desborde en celular`); }
  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
