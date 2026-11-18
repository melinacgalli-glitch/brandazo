'use strict';
/* Disponibilidad para el cotizador de Cafelito Ambulante.
   GET /api/v1/integrations/cafelito/availability?from=AAAA-MM-DD&to=AAAA-MM-DD
   Firma: «v1=» + hex(HMAC-SHA256(secreto, `${timestamp}.GET ${ruta}?${query}`)) con la misma clave del cotizador.
   Devuelve SOLO fechas (sin nombres ni importes):
   - booked: hay un evento ganado con la seña cobrada (capacidad: 1 por día, configurable)
   - blocked: fecha bloqueada a mano en Brandazo (settings/cafelito-eventos.blockedDates)
   - min_notice: dentro de la anticipación mínima (7 días por defecto) */
const { createHmac, timingSafeEqual } = require('node:crypto');
const { todayInTZ } = require('./eventQuotes');
const TOL = 300, MAX_DAYS = 400;
const isoOk = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(Date.parse(s + 'T12:00:00Z'));
const addDays = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const days = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
const err = (status, code, message) => ({ status, body: { error: { code, message } } });

function canonical(req) { const q = req.originalUrl && req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?') + 1) : ''; return `GET /api/v1/integrations/cafelito/availability${q ? '?' + q : ''}`; }
function signAvailability(secret, ts, canon) { return 'v1=' + createHmac('sha256', secret).update(`${ts}.${canon}`).digest('hex'); }

/** Fechas no disponibles de una empresa entre from y to (incluidas). */
async function computeAvailability(db, tenantId, from, to, now = new Date()) {
  const T = db.collection('tenants').doc(tenantId);
  const st = await T.collection('settings').doc('cafelito-eventos').get(); const cfg = st.exists ? st.data() : {};
  const cap = Number(cfg.dailyCapacity) > 0 ? Number(cfg.dailyCapacity) : 1;
  const notice = Number.isInteger(cfg.minNoticeDays) && cfg.minNoticeDays >= 0 ? cfg.minNoticeDays : 7;
  const today = todayInTZ(now), earliest = addDays(today, notice);
  const snap = await T.collection('opportunities').where('won.depositPaid', '==', true).get();
  const count = {};
  snap.forEach(d => { const o = d.data(); const date = o.event && o.event.date; if (o.stage === 'ganada' && date && date >= from && date <= to) count[date] = (count[date] || 0) + 1; });
  const out = new Map();
  for (const [date, n] of Object.entries(count)) if (n >= cap) out.set(date, 'booked');
  for (const b of (cfg.blockedDates || [])) { const date = typeof b === 'string' ? b : b && b.date; if (isoOk(date) && date >= from && date <= to && !out.has(date)) out.set(date, 'blocked'); }
  for (let d = from; d < earliest && d <= to; d = addDays(d, 1)) if (!out.has(d)) out.set(d, 'min_notice');
  const list = [...out.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, reason]) => ({ date, reason }));
  return { from, to, today, earliestBookableDate: earliest, minNoticeDays: notice, dailyCapacity: cap, unavailableDates: list.map(x => x.date), unavailable: list };
}

/** ¿La fecha está tomada (evento con seña o bloqueo manual)? Para avisar al recibir una cotización. */
async function dateTaken(db, tenantId, date, excludeOppId) {
  const T = db.collection('tenants').doc(tenantId);
  const st = await T.collection('settings').doc('cafelito-eventos').get(); const cfg = st.exists ? st.data() : {};
  if ((cfg.blockedDates || []).some(b => (typeof b === 'string' ? b : b && b.date) === date)) return 'blocked';
  const cap = Number(cfg.dailyCapacity) > 0 ? Number(cfg.dailyCapacity) : 1;
  const snap = await T.collection('opportunities').where('won.depositPaid', '==', true).get();
  const n = snap.docs.filter(d => d.id !== excludeOppId && d.data().stage === 'ganada' && d.data().event && d.data().event.date === date).length;
  return n >= cap ? 'booked' : null;
}

async function handleAvailability(req, deps) {
  if (req.method !== 'GET') return err(405, 'METHOD_NOT_ALLOWED', 'Usá GET.');
  const keyId = req.get('x-brandazo-key-id'), ts = req.get('x-brandazo-timestamp'), sig = req.get('x-brandazo-signature');
  if (!keyId || !ts || !sig) return err(401, 'MISSING_SIGNATURE', 'Faltan los encabezados de firma.');
  const key = deps.keys[keyId]; if (!key || !key.secret || !key.tenantId) return err(401, 'UNKNOWN_KEY', 'La clave no existe o está deshabilitada.');
  const nowS = Math.floor(deps.now().getTime() / 1000);
  if (!/^\d{10}$/.test(ts) || Math.abs(nowS - Number(ts)) > TOL) return err(401, 'TIMESTAMP_OUT_OF_RANGE', 'El timestamp tiene más de 5 minutos de diferencia.');
  const expected = Buffer.from(signAvailability(key.secret, ts, canonical(req))), got = Buffer.from(String(sig));
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return err(401, 'INVALID_SIGNATURE', 'La firma no coincide.');
  const today = todayInTZ(deps.now());
  const from = req.query.from || today, to = req.query.to || addDays(from, 365);
  if (!isoOk(from) || !isoOk(to) || to < from) return err(422, 'VALIDATION_FAILED', 'Usá from y to con formato AAAA-MM-DD (to no puede ser anterior a from).');
  if (days(from, to) > MAX_DAYS) return err(422, 'VALIDATION_FAILED', `Pedí como máximo ${MAX_DAYS} días por consulta.`);
  const body = await computeAvailability(deps.db, key.tenantId, from, to, deps.now());
  return { status: 200, body, headers: { 'Cache-Control': 'private, max-age=60' } };
}
module.exports = { handleAvailability, computeAvailability, dateTaken, signAvailability, canonical };
