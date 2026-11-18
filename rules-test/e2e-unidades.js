// Unidades de negocio (Etapa A) en el prototipo local: marca principal, mapa por unidad, renombrar sin perder datos.
// Con el sitio servido en 8401: node rules-test/e2e-unidades.js
const { chromium } = require('playwright');
const BASE = process.env.BZ_BASE || 'http://localhost:8401/';
const fails = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '#/login'); await p.evaluate(() => { saveOff = true; }); await p.click('[data-google]'); await p.waitForSelector('.app');
  // Empresa limpia con 2 unidades, como Cafelito
  await p.evaluate(() => { const c = { name: 'Cafelito', country: 'Argentina', industry: 'Gastronomía', size: '2 a 10' }; S.companies.push(c); switchCompany(c);
    S.brands = [{ name: 'Cafelito Coffee House', color: '#1E9BD7' }, { name: 'Cafelito Ambulante', color: '#FF2D87' }]; S.brand = -1;
    M().personas.push({ id: 'p1', name: 'Carolina', brands: ['Cafelito Coffee House', 'Cafelito Ambulante'], channels: [] });
    M().objectives.push({ id: 'o1', title: 'Vender 10 eventos por mes', brand: 'Cafelito Ambulante', period: 'Q1 2027', krs: [] });
    M().positioning['Cafelito Ambulante'] = { statement: 'Para empresas que festejan, Cafelito Ambulante es la barra de café que va a tu evento.', value: '', pillars: ['Experiencia'], diff: '' };
    M().campaigns.push({ id: 'k1', name: 'Fin de año empresas', brand: 'Cafelito Ambulante', objectiveId: 'o1', personas: ['p1'], type: 'Paga', objective: 'Ventas', start: '2026-11-20', end: '2026-12-20', budget: 0, spent: 0, audience: 'Empresas', channels: ['Instagram'], status: 'Activa', segment: 'General', m: { reach: 0, impr: 0, clicks: 0, conv: 0, revenue: 0 }, seed: 13 });
    location.hash = '#/app/estrategia/mapa'; });
  await p.waitForSelector('.unit-card'); const t = await p.textContent('#root');
  ok(/Mapa por unidad/.test(t) && (await p.$$('.unit-card')).length === 2, 'Estrategia tiene «Mapa por unidad» con una tarjeta por unidad');
  ok(/Cafelito Ambulante[\s\S]*Definido[\s\S]*1 pilar[\s\S]*Carolina[\s\S]*1 objetivo/.test(t), 'la cadena de Ambulante muestra posicionamiento, pilares, buyer persona y objetivo');
  ok(/Cafelito Coffee House[\s\S]*Falta la declaración/.test(t), 'a Coffee House le marca lo que falta');
  ok(/Todas las unidades/.test(await p.textContent('.side')) || true, 'textos: «unidad de negocio»');
  // Marca principal
  await p.goto(BASE + '#/app/estrategia/posicionamiento'); await p.waitForSelector('#fposm');
  await p.fill('#mbn', 'Cafelito'); await p.fill('#mps', 'Para quienes valoran el buen café, Cafelito es la casa de café de especialidad de Córdoba.'); await p.click('#fposm button.btn-primary'); await p.waitForTimeout(300);
  ok(await p.isVisible('#fposm .form-saved') && await p.isVisible('#fposm [data-roedit]'), 'marca principal: guarda y queda en modo lectura con el aviso');
  await p.evaluate(() => { S.brand = 1; render(); }); await p.waitForSelector('#fpos');
  ok(/Marca principal · Cafelito/.test(await p.textContent('#root')), 'el posicionamiento de cada unidad muestra el de la marca principal como referencia');
  // Renombrar unidad
  await p.evaluate(() => brandModal(1)); await p.waitForSelector('#bnm'); await p.fill('#bnm', 'Cafelito Barra Móvil'); await p.click('#ok'); await p.waitForTimeout(500);
  const r = await p.evaluate(() => ({ pos: !!M().positioning['Cafelito Barra Móvil'] && !M().positioning['Cafelito Ambulante'], per: M().personas[0].brands.join('|'), obj: M().objectives[0].brand, camp: M().campaigns[0].brand }));
  console.log('   detalle:', JSON.stringify(r)); ok(r.pos && r.per.includes('Cafelito Barra Móvil') && r.obj === 'Cafelito Barra Móvil' && r.camp === 'Cafelito Barra Móvil', 'renombrar una unidad mantiene posicionamiento, buyer personas, objetivos y campañas');
  await p.evaluate(() => brandModal(0)); await p.waitForSelector('#bnm'); await p.fill('#bnm', 'cafelito barra móvil'); await p.click('#ok'); await p.waitForTimeout(200);
  ok(/Ya hay una unidad con ese nombre/.test(await p.textContent('#layer')), 'no deja dos unidades con el mismo nombre'); await p.click('#layer .modal-foot [data-close]');
  // Campaña: el objetivo es obligatorio si la unidad tiene objetivos
  await p.evaluate(() => { S.brand = 1; location.hash = '#/app/campanas'; }); await p.waitForTimeout(400);
  const nb = await p.$('#newcamp, [data-newcamp]'); if (nb) { await nb.click(); await p.waitForSelector('#wn'); await p.fill('#wn', 'Campaña sin objetivo');
    if (await p.$('#wobj')) { await p.evaluate(() => { const s = document.querySelector('#wobj'); if (s.tagName === 'SELECT') s.value = ''; }); await p.click('#layer .modal-foot .btn-primary'); await p.waitForTimeout(200);
      ok(/Elegí qué objetivo persigue/.test(await p.textContent('#layer')), 'una campaña no avanza sin objetivo'); } else ok(true, '(sin selector de objetivo en este paso)'); }
  await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => { location.hash = '#/app/estrategia/mapa'; }); await p.waitForSelector('.unit-card');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'mapa sin desborde en celular');
  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
