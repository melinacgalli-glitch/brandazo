'use strict';
/* Salas de coworking: disponibilidad y reservas que bloquean la sala.
   - Configuración: tenants/{t}/settings/coworking (salas, horarios por día, bloques). Si no existe, no hay agenda.
   - Reserva: tenants/{t}/cwReservations/{id} {roomId, date, from, to, people, status, source, contactId, …}.
   - Bloqueo sin superposición: un documento por media hora ocupada, tenants/{t}/cwSlots/{sala}_{fecha}_{HHMM},
     creado en la MISMA transacción que la reserva. Dos reservas a la vez → una sola gana; la otra recibe SLOT_TAKEN.
   - Web: GET …/coworking/availability?date= (firma como la disponibilidad del cotizador) y
          POST …/coworking/reservations (firma como los contactos; Idempotency-Key = eventId).
   - Pantalla (POST /api/v1/crm/manual): cw-reserve (reserva a mano o bloqueo), cw-cancel, cw-move. */
const { createHmac, timingSafeEqual } = require('node:crypto');
const { verify, sha256 } = require('./sign');
const { todayInTZ } = require('./eventQuotes');
const { captureCore } = require('./contactCapture');

const DEFAULTS = {
  rooms: [{ id: 'sala-4', name: 'Sala para 4', capacity: 4 }, { id: 'sala-8', name: 'Sala para 8', capacity: 8 }, { id: 'sala-10', name: 'Sala para 10', capacity: 10 }],
  hours: { 0: ['17:00-20:00'], 1: ['08:30-20:00'], 2: ['08:30-20:00'], 3: ['08:30-20:00'], 4: ['08:30-20:00'], 5: ['08:30-20:00'], 6: ['09:00-13:00', '17:00-20:00'] }, // 0 = domingo
  stepMin: 30, minMin: 120, maxMin: 480
};
const TOL = 300;
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(Date.parse(s + 'T12:00:00Z'));
const toMin = s => { const m = String(s || '').trim().match(/^(\d{1,2}):(\d{2})(\s*hs)?$/i); if (!m) return null; const h = +m[1], mi = +m[2]; return h <= 24 && mi < 60 && h * 60 + mi <= 1440 ? h * 60 + mi : null; };
const hhmm = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
const nowMinLocal = ms => { const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Argentina/Cordoba', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms)).split(':'); return (+p[0] % 24) * 60 + +p[1]; };
const dow = date => new Date(date + 'T12:00:00Z').getUTCDay();
const str = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const err = (status, code, message, details) => ({ status, body: { error: { code, message, ...(details ? { details } : {}) } } });

async function loadCfg(T) {
  const s = await T.collection('settings').doc('coworking').get(); if (!s.exists) return null;
  const d = s.data(); return { ...DEFAULTS, ...d, rooms: (d.rooms && d.rooms.length ? d.rooms : DEFAULTS.rooms).slice().sort((a, b) => a.capacity - b.capacity), hours: d.hours || DEFAULTS.hours };
}
const openOf = (cfg, date) => (cfg.hours[dow(date)] || cfg.hours[String(dow(date))] || []).map(w => String(w).split('-')).map(([a, b]) => [toMin(a), toMin(b)]).filter(([a, b]) => a != null && b != null && b > a);
const slotsOf = (cfg, from, to) => { const out = []; for (let m = from; m < to; m += cfg.stepMin) out.push(m); return out; };
const slotId = (room, date, m) => `${room}_${date}_${hhmm(m).replace(':', '')}`;

/* Franjas ocupadas por sala (sin nombres) */
async function busyOf(T, cfg, date) {
  const q = await T.collection('cwReservations').where('date', '==', date).get();
  const by = Object.fromEntries(cfg.rooms.map(r => [r.id, []]));
  q.docs.map(d => d.data()).filter(r => r.status === 'active' && by[r.roomId]).forEach(r => by[r.roomId].push([toMin(r.from), toMin(r.to)]));
  for (const k of Object.keys(by)) { const l = by[k].sort((a, b) => a[0] - b[0]), m = []; for (const x of l) { const last = m[m.length - 1]; if (last && x[0] <= last[1]) last[1] = Math.max(last[1], x[1]); else m.push([...x]); } by[k] = m; }
  return by;
}
async function availability(T, date, now) {
  const cfg = await loadCfg(T); if (!cfg) return null;
  const busy = await busyOf(T, cfg, date), today = todayInTZ(new Date(now));
  return { date, today, closed: !openOf(cfg, date).length, open: openOf(cfg, date).map(([a, b]) => ({ from: hhmm(a), to: hhmm(b) })),
    ...(date === today ? { notBefore: hhmm(Math.ceil(nowMinLocal(now) / cfg.stepMin) * cfg.stepMin) } : {}),
    stepMinutes: cfg.stepMin, minMinutes: cfg.minMin, maxMinutes: cfg.maxMin, maxPeople: Math.max(...cfg.rooms.map(r => r.capacity)),
    rooms: cfg.rooms.map(r => ({ id: r.id, name: r.name, capacity: r.capacity, busy: busy[r.id].map(([a, b]) => ({ from: hhmm(a), to: hhmm(b) })) })) };
}

/* Reglas de la web: horario, bloques, duración, cupo, hoy desde ahora */
function checkWeb(cfg, { date, from, to, people }, now) {
  const d = [];
  if (!isDate(date)) d.push({ field: 'date', issue: 'Fecha inválida (AAAA-MM-DD)' });
  if (from == null) d.push({ field: 'from', issue: 'Hora inválida (HH:MM)' }); if (to == null) d.push({ field: 'to', issue: 'Hora inválida (HH:MM)' });
  if (!(Number.isInteger(people) && people >= 1)) d.push({ field: 'people', issue: 'Cantidad de personas inválida' });
  if (d.length) return d;
  const max = Math.max(...cfg.rooms.map(r => r.capacity)), today = todayInTZ(new Date(now));
  if (people > max) d.push({ field: 'people', issue: `No hay salas para más de ${max} personas` });
  if (from % cfg.stepMin || to % cfg.stepMin) d.push({ field: 'from', issue: `Los horarios van cada ${cfg.stepMin} minutos` });
  if (to - from < cfg.minMin) d.push({ field: 'to', issue: `La reserva mínima es de ${cfg.minMin / 60} horas` });
  if (to - from > cfg.maxMin) d.push({ field: 'to', issue: `La reserva máxima es de ${cfg.maxMin / 60} horas` });
  if (date < today || (date === today && from < nowMinLocal(now))) d.push({ field: 'from', issue: 'Ese horario ya pasó' });
  if (!openOf(cfg, date).some(([a, b]) => from >= a && to <= b)) d.push({ field: 'from', issue: 'Fuera del horario del coworking' });
  return d;
}

/* Reserva o bloqueo en UNA transacción. roomId fijo, o la sala más chica que entre y esté libre todo el horario. */
async function book(deps, T, cfg, { id, roomId, date, from, to, people, data, idemRef, bodyHash, excludeId }) {
  const at = deps.Timestamp.fromMillis(deps.nowMs);
  const cands = roomId ? cfg.rooms.filter(r => r.id === roomId) : cfg.rooms.filter(r => r.capacity >= people);
  return deps.db.runTransaction(async tx => {
    if (idemRef) { const s = await tx.get(idemRef); if (s.exists) { const d = s.data(); return d.bodyHash !== bodyHash ? { conflict: true } : { replay: d.response }; } }
    const refs = cands.map(r => slotsOf(cfg, from, to).map(m => T.collection('cwSlots').doc(slotId(r.id, date, m))));
    const snaps = refs.length ? await tx.getAll(...refs.flat()) : [];
    let k = 0, pick = null;
    for (let i = 0; i < cands.length; i++) { const mine = snaps.slice(k, k + refs[i].length); k += refs[i].length;
      if (!pick && mine.every(s => !s.exists || (excludeId && s.data().reservationId === excludeId))) pick = { room: cands[i], refs: refs[i] }; }
    if (!pick) return { taken: true };
    let prev = null; if (excludeId) { const ps = await tx.get(T.collection('cwReservations').doc(excludeId)); prev = ps.exists ? ps.data() : null; }
    const resRef = T.collection('cwReservations').doc(id);
    if (prev) slotsOf(cfg, toMin(prev.from), toMin(prev.to)).forEach(m => { const r = T.collection('cwSlots').doc(slotId(prev.roomId, prev.date, m)); if (!pick.refs.some(x => x.path === r.path)) tx.delete(r); });
    pick.refs.forEach(r => tx.set(r, { reservationId: id, roomId: pick.room.id, date, at }));
    const res = { roomId: pick.room.id, roomName: pick.room.name, capacity: pick.room.capacity, date, from: hhmm(from), to: hhmm(to), people: people || null, status: 'active', updatedAt: at };
    if (prev) tx.update(resRef, { ...res, history: [...(prev.history || []), { at: new Date(deps.nowMs).toISOString(), by: data.byName || '', action: 'movida', from: `${prev.date} ${prev.from}-${prev.to} ${prev.roomId}` }] });
    else tx.set(resRef, { ...res, ...data, createdAt: at, history: [{ at: new Date(deps.nowMs).toISOString(), by: data.byName || data.source, action: 'creada' }] });
    const response = { status: 'created', reservation: { id, roomId: pick.room.id, roomName: pick.room.name, capacity: pick.room.capacity, date, from: hhmm(from), to: hhmm(to) } };
    if (idemRef) tx.set(idemRef, { bodyHash, response, createdAt: at, expireAt: deps.Timestamp.fromMillis(deps.nowMs + 30 * 864e5) });
    return { ok: response };
  });
}

/* ---------- Web ---------- */
function authGet(req, deps, path) {
  const keyId = req.get('x-brandazo-key-id'), ts = req.get('x-brandazo-timestamp'), sig = req.get('x-brandazo-signature');
  if (!keyId || !ts || !sig) return { e: err(401, 'MISSING_SIGNATURE', 'Faltan los encabezados de firma.') };
  const key = deps.keys[keyId]; if (!key || !key.secret || !key.tenantId) return { e: err(401, 'UNKNOWN_KEY', 'La clave no existe o está deshabilitada.') };
  if (!/^\d{10}$/.test(ts) || Math.abs(Math.floor(deps.nowMs / 1000) - Number(ts)) > TOL) return { e: err(401, 'TIMESTAMP_OUT_OF_RANGE', 'El timestamp tiene más de 5 minutos de diferencia.') };
  const q = req.originalUrl && req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?') + 1) : '';
  const want = Buffer.from('v1=' + createHmac('sha256', key.secret).update(`${ts}.GET ${path}${q ? '?' + q : ''}`).digest('hex')), got = Buffer.from(String(sig));
  if (want.length !== got.length || !timingSafeEqual(want, got)) return { e: err(401, 'INVALID_SIGNATURE', 'La firma no coincide.') };
  return { key, keyId };
}
async function handleCwAvailability(req, deps) {
  deps.nowMs = deps.now ? deps.now().getTime() : Date.now();
  if (req.method !== 'GET') return err(405, 'METHOD_NOT_ALLOWED', 'Usá GET.');
  const a = authGet(req, deps, '/api/v1/integrations/cafelito/coworking/availability'); if (a.e) return a.e;
  const date = String(req.query.date || ''); if (!isDate(date)) return err(422, 'VALIDATION_FAILED', 'Usá date con formato AAAA-MM-DD.');
  const out = await availability(deps.db.collection('tenants').doc(a.key.tenantId), date, deps.nowMs);
  if (!out) return err(404, 'NO_COWORKING', 'Esta empresa no tiene salas configuradas.');
  return { status: 200, body: out, headers: { 'Cache-Control': 'no-store' } };
}

async function handleCwReservation(req, deps) {
  deps.nowMs = deps.now ? deps.now().getTime() : Date.now();
  let T = null, keyId = null; const rid = 'req_' + Math.random().toString(36).slice(2, 14);
  const log = async (status, code) => { if (!T) return; try { await T.collection('integrationLog').doc(rid).set({ at: deps.Timestamp.fromMillis(deps.nowMs), source: 'cafelito-coworking', keyId, status, code: code || null }); } catch { /* sin registro */ } };
  const done = async (r, code) => { await log(r.status, code); return { ...r, headers: { 'X-Request-Id': rid, ...(r.headers || {}) } }; };
  if (req.method !== 'POST') return err(405, 'METHOD_NOT_ALLOWED', 'Usá POST.');
  const raw = req.rawBody || Buffer.from(''); if (raw.length > 16 * 1024) return err(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo supera los 16 KB.');
  keyId = req.get('x-brandazo-key-id'); const ts = req.get('x-brandazo-timestamp'), sig = req.get('x-brandazo-signature');
  if (!keyId || !ts || !sig) return err(401, 'MISSING_SIGNATURE', 'Faltan los encabezados de firma.');
  const key = deps.keys[keyId]; if (!key || !key.secret || !key.tenantId) return err(401, 'UNKNOWN_KEY', 'La clave no existe o está deshabilitada.');
  T = deps.db.collection('tenants').doc(key.tenantId);
  const e = verify(key.secret, ts, raw, sig, Math.floor(deps.nowMs / 1000)); if (e) return done(err(401, e, 'La firma no coincide o el timestamp está fuera de rango.'), e);
  const minute = Math.floor(deps.nowMs / 60000), rl = T.collection('rateLimits').doc(`${keyId}_cw_${minute}`);
  const used = await deps.db.runTransaction(async tx => { const s = await tx.get(rl); const n = (s.exists ? s.data().n : 0) + 1; tx.set(rl, { n, expireAt: deps.Timestamp.fromMillis((minute + 2) * 60000) }); return n; });
  if (used > 60) return done({ ...err(429, 'RATE_LIMITED', 'Demasiadas solicitudes por minuto.'), headers: { 'Retry-After': '60' } }, 'RATE_LIMITED');
  let b; try { b = JSON.parse(raw.toString('utf8')); } catch { return done(err(400, 'INVALID_JSON', 'El cuerpo no es JSON válido.'), 'INVALID_JSON'); }
  const idem = req.get('idempotency-key');
  return done(...await reserveFromWeb(deps, T, b, idem, sha256(raw)));
}

/* Núcleo de la reserva desde la web (sirve para la versión con firma y para una versión pública futura) */
async function reserveFromWeb(deps, T, b, idem, bodyHash) {
  b = b && typeof b === 'object' ? b : {};
  const eventId = str(b.eventId, 100), c = b.contact && typeof b.contact === 'object' ? b.contact : {}, d = [];
  if (!/^[A-Za-z0-9_.:-]{8,100}$/.test(eventId)) d.push({ field: 'eventId', issue: 'Falta o es inválido (8 a 100 caracteres: letras, números, _ . : -)' });
  if (idem !== eventId) return [err(400, 'IDEMPOTENCY_KEY_MISMATCH', 'El encabezado Idempotency-Key tiene que ser igual al eventId.'), 'IDEMPOTENCY_KEY_MISMATCH'];
  const name = str(c.name, 120), phone = str(c.phone, 30), email = str(c.email, 200);
  if (!name) d.push({ field: 'contact.name', issue: 'Escribí el nombre' });
  if (!phone && !email) d.push({ field: 'contact.phone', issue: 'Falta el WhatsApp o el email' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) d.push({ field: 'contact.email', issue: 'Email inválido' });
  const cfg = await loadCfg(T); if (!cfg) return [err(404, 'NO_COWORKING', 'Esta empresa no tiene salas configuradas.'), 'NO_COWORKING'];
  const date = str(b.date, 10), from = toMin(b.from), to = toMin(b.to), people = Number.isInteger(b.people) ? b.people : NaN;
  d.push(...checkWeb(cfg, { date, from, to, people }, deps.nowMs));
  if (d.length) return [err(422, 'VALIDATION_FAILED', 'La solicitud tiene campos inválidos.', d), 'VALIDATION_FAILED'];
  const r = await book(deps, T, cfg, { id: 'web_' + eventId.replace(/[^A-Za-z0-9_-]/g, '_'), date, from, to, people, idemRef: T.collection('idempotency').doc('cwres_' + eventId), bodyHash,
    data: { source: 'web', eventId, name, phone: phone || null, email: email || null, byName: 'Web' } });
  if (r.conflict) return [err(409, 'IDEMPOTENCY_CONFLICT', 'Ese eventId ya se usó con otros datos.'), 'IDEMPOTENCY_CONFLICT'];
  if (r.replay) return [{ status: 200, body: { ...r.replay, status: 'duplicate' } }, 'DUPLICATE'];
  if (r.taken) return [err(409, 'SLOT_TAKEN', 'Ese horario se acaba de ocupar. Elegí otro.'), 'SLOT_TAKEN'];
  // La persona queda como contacto (Cliente de Cafelito Work) con la reserva en su ficha
  const res = r.ok.reservation, attribution = b.attribution && typeof b.attribution === 'object' ? b.attribution : null;
  const cbody = { schemaVersion: '1.0', eventId, source: 'coworking', submittedAt: new Date(deps.nowMs).toISOString(), contact: { name, ...(phone ? { phone } : {}), ...(email ? { email } : {}) },
    coworking: { people, date, from: res.from + ' hs', to: res.to + ' hs', room: res.roomName, reservationId: res.id }, attribution,
    ...(b.consent && typeof b.consent === 'object' ? { consent: { marketing: !!b.consent.marketing, text: str(b.consent.text, 300) || null, capturedAt: str(b.consent.capturedAt, 40) || null } } : {}) };
  const cr = await captureCore({ ...deps, FieldValue: deps.FieldValue }, T, cbody, bodyHash, new Date(deps.nowMs)).catch(() => null);
  const contact = cr && (cr.ok || cr.replay) ? (cr.ok || cr.replay).contact : null;
  if (contact) await T.collection('cwReservations').doc(res.id).update({ contactId: contact.id });
  return [{ status: 201, body: { ...r.ok, contact } }, null];
}

/* ---------- Pantalla ---------- */
async function handleCwManual(b, { deps, user, by, tenantRef, role }) {
  deps.nowMs = deps.now ? (typeof deps.now() === 'number' ? deps.now() : deps.now().getTime()) : Date.now();
  const cfg = await loadCfg(tenantRef); if (!cfg) return err(404, 'NO_COWORKING', 'Esta empresa no tiene salas configuradas.');
  const at = deps.Timestamp.fromMillis(deps.nowMs);
  if (b.kind === 'cw-cancel') {
    const ref = tenantRef.collection('cwReservations').doc(str(b.id, 150) || '_');
    const out = await deps.db.runTransaction(async tx => { const s = await tx.get(ref); if (!s.exists) return 'none'; const r = s.data(); if (r.status !== 'active') return 'already';
      slotsOf(cfg, toMin(r.from), toMin(r.to)).forEach(m => tx.delete(tenantRef.collection('cwSlots').doc(slotId(r.roomId, r.date, m))));
      tx.update(ref, { status: 'cancelled', cancelledAt: at, cancelledBy: by, cancelReason: str(b.reason, 200) || null, history: [...(r.history || []), { at: new Date(deps.nowMs).toISOString(), by, action: 'cancelada' }] });
      tx.set(tenantRef.collection('audit').doc(), { at, by: user.uid, byName: by, action: 'coworking-cancelada', reservationId: ref.id }); return 'ok'; });
    if (out === 'none') return err(404, 'NOT_FOUND', 'No existe esa reserva.'); if (out === 'already') return err(409, 'NOT_ACTIVE', 'Esa reserva ya estaba cancelada.');
    return { status: 200, body: { id: ref.id, status: 'cancelled' } };
  }
  const date = str(b.date, 10), from = toMin(b.from), to = toMin(b.to), d = [];
  if (!isDate(date)) d.push({ field: 'date', issue: 'Elegí la fecha' });
  if (from == null) d.push({ field: 'from', issue: 'Elegí la hora de inicio' }); if (to == null) d.push({ field: 'to', issue: 'Elegí la hora de fin' });
  if (from != null && to != null && to <= from) d.push({ field: 'to', issue: 'Termina antes de empezar' });
  if (from != null && to != null && (from % cfg.stepMin || to % cfg.stepMin)) d.push({ field: 'from', issue: `Los horarios van cada ${cfg.stepMin} minutos` });
  const roomId = str(b.roomId, 40) || null; if (roomId && !cfg.rooms.some(r => r.id === roomId)) d.push({ field: 'roomId', issue: 'Esa sala no existe' });
  if (b.kind === 'cw-move') {
    if (d.length) return err(422, 'VALIDATION', 'Revisá los datos.', d);
    const ref = tenantRef.collection('cwReservations').doc(str(b.id, 150) || '_'), s = await ref.get();
    if (!s.exists || s.data().status !== 'active') return err(404, 'NOT_FOUND', 'No existe esa reserva o está cancelada.');
    const r = await book(deps, tenantRef, cfg, { id: ref.id, roomId, date, from, to, people: s.data().people || 1, excludeId: ref.id, data: { byName: by } });
    if (r.taken) return err(409, 'SLOT_TAKEN', roomId ? 'Esa sala está ocupada en ese horario.' : 'No hay una sala libre para ese horario.');
    await tenantRef.collection('audit').doc().set({ at, by: user.uid, byName: by, action: 'coworking-movida', reservationId: ref.id });
    return { status: 200, body: r.ok };
  }
  if (b.kind === 'cw-reserve') {
    const block = b.mode === 'bloqueo', people = Number.isInteger(+b.people) ? +b.people : NaN, c = b.contact || {};
    if (block && !roomId) d.push({ field: 'roomId', issue: 'Elegí la sala' });
    if (!block) { if (!(people >= 1)) d.push({ field: 'people', issue: 'Cantidad de personas' }); else if (people > Math.max(...cfg.rooms.map(r => r.capacity))) d.push({ field: 'people', issue: 'No hay salas para tantas personas' });
      if (!str(c.name, 120)) d.push({ field: 'contact.name', issue: 'Escribí el nombre' }); if (!str(c.phone, 30) && !str(c.email, 200)) d.push({ field: 'contact.phone', issue: 'Escribí el WhatsApp' }); }
    if (d.length) return err(422, 'VALIDATION', 'Revisá los datos.', d);
    const reqId = str(b.requestId, 60); if (!/^[A-Za-z0-9_-]{8,60}$/.test(reqId)) return err(400, 'BAD_REQUEST_ID', 'Falta el identificador.');
    const id = (block ? 'blq_' : 'man_') + reqId;
    if ((await tenantRef.collection('cwReservations').doc(id).get()).exists) return { status: 200, body: { status: 'duplicate', reservation: { id } } };
    const r = await book(deps, tenantRef, cfg, { id, roomId, date, from, to, people: block ? 0 : people,
      data: block ? { source: 'bloqueo', note: str(b.note, 200) || null, byName: by, createdBy: user.uid } : { source: 'manual', channel: str(b.channel, 40) || 'WhatsApp', name: str(c.name, 120), phone: str(c.phone, 30) || null, email: str(c.email, 200) || null, note: str(b.note, 200) || null, byName: by, createdBy: user.uid } });
    if (r.taken) return err(409, 'SLOT_TAKEN', roomId ? 'Esa sala está ocupada en ese horario.' : 'No hay una sala libre para ese horario.');
    if (!block) { const res = r.ok.reservation;
      const cr = await captureCore(deps, tenantRef, { eventId: id, source: 'coworking', contact: { name: str(c.name, 120), ...(str(c.phone, 30) ? { phone: str(c.phone, 30) } : {}), ...(str(c.email, 200) ? { email: str(c.email, 200) } : {}) },
        coworking: { people, date, from: res.from + ' hs', to: res.to + ' hs', room: res.roomName, reservationId: id } }, 'manual_' + id, new Date(deps.nowMs)).catch(() => null);
      const contact = cr && (cr.ok || cr.replay) ? (cr.ok || cr.replay).contact : null; if (contact) await tenantRef.collection('cwReservations').doc(id).update({ contactId: contact.id });
      r.ok.contact = contact; }
    await tenantRef.collection('audit').doc().set({ at, by: user.uid, byName: by, action: block ? 'coworking-bloqueo' : 'coworking-reserva-manual', reservationId: id });
    return { status: 201, body: r.ok };
  }
  return err(400, 'BAD_KIND', 'Acción desconocida.');
}


/* ---------- Versión pública (sin clave), para llamar directo desde la página de la web ----------
   GET  /api/v1/public/{sitio}/coworking/availability?date=AAAA-MM-DD
   POST /api/v1/public/{sitio}/coworking/reservations   (mismo cuerpo que la versión con firma; Idempotency-Key = eventId)
   El sitio (publicSites/{sitio}: tenantId, origins) dice a qué empresa va y desde qué dominios se acepta.
   Protecciones: solo esos dominios (Origin), límites por IP y por WhatsApp, campo trampa para robots,
   y verificación anti-robots de Cloudflare (Turnstile) cuando esté configurada. La disponibilidad no muestra datos personales. */
async function site(deps, slug) { if (!/^[a-z0-9-]{2,40}$/.test(slug || '')) return null; const s = await deps.db.collection('publicSites').doc(slug).get(); return s.exists ? s.data() : null; }
const originOk = (cfg, origin) => !!origin && (cfg.origins || []).some(o => o.startsWith('re:') ? new RegExp(o.slice(3)).test(origin) : o === origin);
async function bump(deps, T, id, ttlMs) { const ref = T.collection('rateLimits').doc(id);
  return deps.db.runTransaction(async tx => { const s = await tx.get(ref); const n = (s.exists ? s.data().n : 0) + 1; tx.set(ref, { n, expireAt: deps.Timestamp.fromMillis(deps.nowMs + ttlMs) }); return n; }); }
async function handlePublicCoworking(req, deps, slug, what) {
  deps.nowMs = deps.now ? deps.now().getTime() : Date.now();
  const sc = await site(deps, slug); if (!sc || !sc.tenantId) return err(404, 'NOT_FOUND', 'Sitio inexistente.');
  const origin = req.get('origin') || '';
  if (!originOk(sc, origin)) return err(403, 'ORIGIN_NOT_ALLOWED', 'Solo se acepta desde la web autorizada.');
  const T = deps.db.collection('tenants').doc(sc.tenantId), ip = String(req.get('x-forwarded-for') || req.ip || '').split(',')[0].trim().slice(0, 60) || 'sin-ip';
  const ipKey = ip.replace(/[^A-Za-z0-9]/g, '_'), hour = Math.floor(deps.nowMs / 3600e3);
  if (what === 'availability') {
    if (req.method !== 'GET') return err(405, 'METHOD_NOT_ALLOWED', 'Usá GET.');
    if (await bump(deps, T, `pub_av_${ipKey}_${Math.floor(deps.nowMs / 60000)}`, 120e3) > 60) return { ...err(429, 'RATE_LIMITED', 'Demasiadas consultas. Esperá un minuto.'), headers: { 'Retry-After': '60' } };
    const date = String((req.query || {}).date || ''); if (!isDate(date)) return err(422, 'VALIDATION_FAILED', 'Usá date con formato AAAA-MM-DD.');
    const out = await availability(T, date, deps.nowMs); if (!out) return err(404, 'NO_COWORKING', 'No hay salas configuradas.');
    return { status: 200, body: out, headers: { 'Cache-Control': 'no-store' } };
  }
  if (req.method !== 'POST') return err(405, 'METHOD_NOT_ALLOWED', 'Usá POST.');
  const raw = req.rawBody || Buffer.from(''); if (raw.length > 16 * 1024) return err(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo supera los 16 KB.');
  let b; try { b = JSON.parse(raw.toString('utf8')); } catch { return err(400, 'INVALID_JSON', 'El cuerpo no es JSON válido.'); }
  if (b && b.website) return { status: 201, body: { status: 'created' } };   // campo trampa: solo lo completa un robot (no se guarda nada)
  if (await bump(deps, T, `pub_rs_${ipKey}_${hour}`, 2 * 3600e3) > 6) return { ...err(429, 'RATE_LIMITED', 'Hiciste demasiadas reservas seguidas. Probá más tarde o escribinos por WhatsApp.'), headers: { 'Retry-After': '3600' } };
  if (deps.turnstile && deps.turnstile.secret) {
    const tok = String((b && b.turnstileToken) || ''); if (!tok) return err(403, 'BOT_CHECK_REQUIRED', 'Falta la verificación anti-robots.');
    const v = await deps.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ secret: deps.turnstile.secret, response: tok, remoteip: ip }).toString() }).then(r => r.json()).catch(() => ({}));
    if (!v.success) return err(403, 'BOT_CHECK_FAILED', 'No pasó la verificación anti-robots. Recargá la página y probá de nuevo.');
  }
  const ph = String(((b || {}).contact || {}).phone || '').replace(/\D/g, '').slice(-10), date = String((b || {}).date || '').slice(0, 10);
  if (ph && isDate(date)) { const q = await T.collection('cwReservations').where('date', '==', date).get();
    if (q.docs.map(d => d.data()).filter(r => r.status === 'active' && String(r.phone || '').replace(/\D/g, '').slice(-10) === ph).length >= 2)
      return err(429, 'TOO_MANY_FOR_PHONE', 'Ya tenés 2 reservas para ese día. Para más, escribinos por WhatsApp.'); }
  const { clean } = { clean: { ...b } }; delete clean.turnstileToken; delete clean.website;
  const [r] = await reserveFromWeb(deps, T, clean, req.get('idempotency-key'), sha256(Buffer.from(JSON.stringify(clean))));
  if (r.status < 300 && r.body.reservation) await T.collection('cwReservations').doc(r.body.reservation.id).update({ via: 'web-publica', ip: ip.slice(0, 45) }).catch(() => {});
  return r;
}

module.exports = { book, loadCfg, handlePublicCoworking, handleCwAvailability, handleCwReservation, handleCwManual, reserveFromWeb, availability, DEFAULTS, toMin, hhmm };
