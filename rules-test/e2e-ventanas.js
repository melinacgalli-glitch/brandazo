// Ventanas con cambios sin guardar: tocar afuera, Escape o la X no cierran sin preguntar. Prototipo local (sin nube).
// Con el sitio servido en 8401: node rules-test/e2e-ventanas.js
const { chromium } = require('playwright');
const BASE = process.env.BZ_BASE || 'http://localhost:8401/';
const fails = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '#/login'); await p.evaluate(() => { saveOff = true; }); await p.click('[data-google]'); await p.waitForSelector('.app');
  await p.goto(BASE + '#/app/estrategia/personas'); await p.waitForSelector('#newpersona'); await p.click('#newpersona'); await p.waitForSelector('#pn');
  // vacío: tocar afuera cierra directo
  await p.mouse.click(15, 15); await p.waitForTimeout(200); ok(!(await p.$('#pn')), 'sin nada escrito, tocar afuera cierra directo');
  await p.click('#newpersona'); await p.waitForSelector('#pn'); await p.fill('#pn', 'Carolina'); await p.fill('#pa', '38 años');
  await p.mouse.click(15, 15); await p.waitForTimeout(200);
  ok(await p.isVisible('#pn') && await p.isVisible('.discard-bar'), 'con datos escritos, tocar afuera NO cierra: pregunta');
  await p.click('[data-keep]'); ok(await p.inputValue('#pn') === 'Carolina' && !(await p.$('.discard-bar')), '«Seguir editando» mantiene lo escrito');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(await p.isVisible('.discard-bar') && await p.inputValue('#pa') === '38 años', 'Escape también pregunta');
  await p.click('[data-keep]'); await p.click('.modal-head [data-close]'); await p.waitForTimeout(200); ok(await p.isVisible('.discard-bar'), 'la X también pregunta');
  await p.click('[data-discard]'); await p.waitForTimeout(200); ok(!(await p.$('#pn')), '«Salir sin guardar» cierra');
  // Cancelar es explícito
  await p.click('#newpersona'); await p.waitForSelector('#pn'); await p.fill('#pn', 'Otra'); await p.click('.modal-foot [data-close]'); await p.waitForTimeout(200); ok(!(await p.$('#pn')), '«Cancelar» cierra directo');
  // Guardar sigue funcionando
  await p.click('#newpersona'); await p.waitForSelector('#pn'); await p.fill('#pn', 'Martín'); await p.click('.modal-foot .btn-primary'); await p.waitForTimeout(400);
  ok(!(await p.$('#pn')) && /Martín/.test(await p.textContent('#root')), 'guardar cierra la ventana y la persona aparece');
  // panel lateral (drawer) del CRM de ejemplo
  await p.goto(BASE + '#/app/crm/contactos'); await p.waitForTimeout(400); const row = await p.$('[data-c]');
  if (row) { await row.click(); await p.waitForSelector('#layer .drawer'); await p.mouse.click(15, 400); await p.waitForTimeout(200); ok(!(await p.$('#layer .drawer')), 'panel lateral sin cambios: tocar afuera cierra'); }
  await p.setViewportSize({ width: 390, height: 844 }); await p.goto(BASE + '#/app/estrategia/personas'); await p.waitForSelector('#newpersona'); await p.click('#newpersona'); await p.waitForSelector('#pn'); await p.fill('#pn', 'Celu');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(await p.isVisible('.discard-bar') && await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'en celular el aviso se ve sin desbordes');
  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
