// Contactos desde la web: la ficha del contacto muestra la reserva de coworking que hizo.
// Desde la raíz, con el sitio en 8410: firebase emulators:exec --only functions,auth,firestore --project brandazo "node rules-test/e2e-contactos-web.js"
const { chromium } = require('playwright');
const BASE = 'http://localhost:8410/', P = 'brandazo';
const FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`, AU = 'http://127.0.0.1:9099';
const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const enc = v => v === null ? { nullValue: null } : v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const put = (p, d) => fetch(`${FS}/${p}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: enc(d).mapValue.fields }) });
const fails = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };
(async () => {
  const EMAIL = 'duena@cafelito.test';
  await put('tenants/cafelito', { name: 'Cafelito Coffee House' });
  await put(`invites/${EMAIL}__cafelito`, { email: EMAIL, tenantId: 'cafelito', tenantName: 'Cafelito', role: 'Dueño', invitedBy: 'alta' });
  await put('tenants/cafelito/state/base', { json: JSON.stringify({ brands: [{ name: 'Cafelito Work', color: '#0E7A4F' }], workspaces: [{ name: 'General' }] }), by: 'alta' });
  await put('tenants/cafelito/contacts/sofi', { name: 'Sofía Ruiz', phoneE164: '+5493517771234', phoneDisplay: '+54 9 351 777-1234', type: 'Cliente', tags: ['Cafelito Work'], brand: 'Cafelito Work', firstSource: { channel: 'Web · Coworking' }, createdAt: new Date(), lastWebAt: new Date() });
  await put('tenants/cafelito/contactEvents/e1', { contactId: 'sofi', at: new Date(), source: 'coworking', unit: 'Cafelito Work', coworking: { people: 6, date: '2026-12-02', from: '10:00 hs', to: '14:00 hs' }, attribution: { utmCampaign: 'cowork-dic' } });
  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + '?emu=1#/registro'); await page.waitForSelector('#pw2');
  await page.fill('#em', EMAIL); await page.fill('#pw2', 'Clave-segura-2026'); await page.check('#tos'); await page.click('#f button.btn-primary'); await page.waitForSelector('#vok');
  let vc; for (let i = 0; i < 40 && !vc; i++) { vc = (await (await fetch(`${AU}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes.find(c => c.email === EMAIL); if (!vc) await new Promise(r => setTimeout(r, 250)); }
  await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:update?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode: vc.oobCode }) });
  await page.click('#vok'); await page.waitForSelector('.app', { timeout: 20000 });
  await page.goto(BASE + '#/app/crm/contactos'); await page.waitForSelector('[data-evc="sofi"]', { timeout: 15000 });
  const row = await page.textContent('[data-evc="sofi"]'); ok(/Cliente/.test(row) && /Web · Coworking/.test(row), 'en la lista figura como Cliente, llegada por Coworking');
  await page.click('[data-evc="sofi"]'); await page.waitForFunction(() => /Desde la web \(1\)/.test(document.querySelector('#layer').textContent), null, { timeout: 15000 }).catch(() => {});
  const f = await page.textContent('#layer');
  ok(/Cliente · Cafelito Work/.test(f) && /Reserva de coworking[\s\S]*6 personas · 2 dic 2026 · 10:00 a 14:00[\s\S]*cowork-dic/.test(f), 'la ficha muestra la reserva de coworking con su campaña');
  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fails.length ? `\n${fails.length} FALLAS` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
