// Salas de coworking: disponibilidad y reservas sin superposición, contra el emulador de Firestore.
// Desde la raíz: firebase emulators:exec --only firestore --project demo-brandazo "node --test functions/test/coworking.test.js"
const { test, before } = require('node:test');
const assert = require('node:assert');
const admin = require('firebase-admin');
const { handlePublicCoworking, handleCwManual, availability, reserveFromWeb, DEFAULTS } = require('../src/coworking');
let db; const TS = admin.firestore.Timestamp, FV = admin.firestore.FieldValue, TID = 'cafecw', T = () => db.collection('tenants').doc(TID);
const at = (iso, hh, mm = 0) => Date.parse(`${iso}T${String(hh + 3).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00Z`); // hora de Córdoba
const NOW = at('2026-11-27', 10);                     // viernes 27/11, 10:00
const deps = (now = NOW) => ({ db, Timestamp: TS, FieldValue: FV, now: () => new Date(now), nowMs: now, fetch: async () => ({ json: async () => ({ success: true }) }) });
const body = (id, x = {}) => ({ eventId: id, contact: { name: 'Sofía Ruiz', phone: '351 555-0001' }, people: 4, date: '2026-11-30', from: '10:00', to: '12:00', ...x });
const web = (b, now) => reserveFromWeb(deps(now), T(), b, b.eventId, 'h-' + JSON.stringify(b)).then(([r]) => r);
const pub = (what, { origin = 'https://www.cafelito.com.ar', b, q, ip = '1.2.3.4', now } = {}) => { const raw = Buffer.from(JSON.stringify(b || {}));
  const h = { origin, 'x-forwarded-for': ip, 'idempotency-key': b && b.eventId };
  return handlePublicCoworking({ method: what === 'availability' ? 'GET' : 'POST', query: q || {}, rawBody: raw, get: k => h[k.toLowerCase()] }, deps(now), 'cafelito-test', what); };
const ctx = (role = 'Atención') => ({ deps: deps(), user: { uid: 'u1' }, by: 'Camila', tenantRef: T(), role });
before(async () => {
  admin.initializeApp({ projectId: 'demo-brandazo' }); db = admin.firestore();
  await T().collection('settings').doc('coworking').set({ rooms: DEFAULTS.rooms, hours: DEFAULTS.hours, stepMin: 30, minMin: 120, maxMin: 480 });
  await db.collection('publicSites').doc('cafelito-test').set({ tenantId: TID, origins: ['https://www.cafelito.com.ar', 'https://cafelito.com.ar'] });
});

test('disponibilidad: horarios del día y salas sin nombres', async () => {
  let a = await availability(T(), '2026-11-28', NOW);   // sábado
  assert.deepStrictEqual(a.open, [{ from: '09:00', to: '13:00' }, { from: '17:00', to: '20:00' }]);
  assert.deepStrictEqual(a.rooms.map(r => [r.id, r.capacity]), [['sala-4', 4], ['sala-8', 8], ['sala-10', 10]]);
  a = await availability(T(), '2026-11-29', NOW); assert.deepStrictEqual(a.open, [{ from: '17:00', to: '20:00' }], 'domingo');
  a = await availability(T(), '2026-11-27', NOW); assert.strictEqual(a.notBefore, '10:00', 'hoy: desde ahora'); assert.strictEqual(a.maxPeople, 10);
});
test('reglas: horario, mínimo 2 h, máximo 8 h, más de 10 personas, ya pasó', async () => {
  const bad = async (x, field) => { const r = await web(body('bad-' + Math.random().toString(36).slice(2), x)); assert.strictEqual(r.status, 422, JSON.stringify(x)); assert.ok(r.body.error.details.some(d => d.field === field), JSON.stringify(r.body)); };
  await bad({ from: '07:00', to: '09:00' }, 'from');                     // abre 8:30
  await bad({ from: '10:00', to: '11:30' }, 'to');                       // menos de 2 h
  await bad({ from: '09:00', to: '17:30' }, 'to');                       // más de 8 h
  await bad({ people: 11 }, 'people');
  await bad({ date: '2026-11-27', from: '08:30', to: '10:30' }, 'from'); // hoy, ya pasó
  await bad({ date: '2026-11-28', from: '12:00', to: '14:00' }, 'from'); // sábado: cierra a las 13
  await bad({ from: '10:15', to: '12:15' }, 'from');                      // cada 30 minutos
  const ok = await web(body('hoy-0001', { date: '2026-11-27', from: '10:00', to: '12:00' })); assert.strictEqual(ok.status, 201, 'hoy desde ahora sí');
});
test('cuatro reservas a la vez del mismo horario para 4: se reparten en las 3 salas y la cuarta recibe SLOT_TAKEN', async () => {
  const rs = await Promise.all([1, 2, 3, 4].map(i => web(body('simul-000' + i, { contact: { name: 'P' + i, phone: '351555000' + i } }))));
  const ok = rs.filter(r => r.status === 201), taken = rs.filter(r => r.status === 409);
  assert.strictEqual(ok.length, 3, JSON.stringify(rs.map(r => r.body))); assert.strictEqual(taken.length, 1); assert.strictEqual(taken[0].body.error.code, 'SLOT_TAKEN');
  assert.deepStrictEqual(ok.map(r => r.body.reservation.roomId).sort(), ['sala-10', 'sala-4', 'sala-8']);
  const a = await availability(T(), '2026-11-30', NOW); assert.ok(a.rooms.every(r => r.busy.some(b => b.from === '10:00' && b.to === '12:00')));
  const ov = await web(body('solapa-01', { from: '11:00', to: '13:00', people: 2 })); assert.strictEqual(ov.status, 409, 'superpuesta: tomada');
  const after = await web(body('despues-01', { from: '12:00', to: '14:00', people: 2 })); assert.strictEqual(after.status, 201, 'pegada a otra: sí'); assert.strictEqual(after.body.reservation.roomId, 'sala-4', 'la más chica que entra');
});
test('reenviar no duplica; queda como Cliente de Cafelito Work con la reserva en su ficha', async () => {
  const b = body('dup-00001', { date: '2026-12-01', contact: { name: 'Lucas Paz', phone: '351 444-0001' } });
  const r1 = await web(b), r2 = await web(b);
  assert.strictEqual(r1.status, 201); assert.strictEqual(r2.body.status, 'duplicate'); assert.strictEqual(r2.body.reservation.id, r1.body.reservation.id);
  assert.strictEqual((await T().collection('cwReservations').where('date', '==', '2026-12-01').get()).size, 1);
  const c = (await T().collection('contacts').doc(r1.body.contact.id).get()).data(); assert.strictEqual(c.type, 'Cliente'); assert.deepStrictEqual(c.tags, ['Cafelito Work']);
  const ev = (await T().collection('contactEvents').where('contactId', '==', r1.body.contact.id).get()).docs[0].data(); assert.strictEqual(ev.coworking.room, 'Sala para 4');
  const r3 = await web({ ...b, people: 3 }); assert.strictEqual(r3.status, 409, 'mismo eventId con otros datos: conflicto');
});
test('cancelar libera el horario; mover a otra hora; bloqueo y reserva a mano', async () => {
  const r = await web(body('cancel-001', { date: '2026-12-02', people: 9 })); assert.strictEqual(r.body.reservation.roomId, 'sala-10');
  let x = await web(body('cancel-002', { date: '2026-12-02', people: 9 })); assert.strictEqual(x.status, 409);
  await handleCwManual({ kind: 'cw-cancel', id: r.body.reservation.id }, ctx()); x = await web(body('cancel-003', { date: '2026-12-02', people: 9 })); assert.strictEqual(x.status, 201, 'cancelada: se libera');
  const m = await handleCwManual({ kind: 'cw-move', id: x.body.reservation.id, date: '2026-12-02', from: '15:00', to: '17:00' }, ctx()); assert.strictEqual(m.status, 200, JSON.stringify(m.body));
  const a = await availability(T(), '2026-12-02', NOW); assert.deepStrictEqual(a.rooms.find(r => r.id === 'sala-10').busy, [{ from: '15:00', to: '17:00' }]);
  const blq = await handleCwManual({ kind: 'cw-reserve', mode: 'bloqueo', roomId: 'sala-8', date: '2026-12-02', from: '08:30', to: '20:00', note: 'Evento privado', requestId: 'bloqueo-0001' }, ctx()); assert.strictEqual(blq.status, 201);
  x = await web(body('tras-blq-1', { date: '2026-12-02', people: 6 })); assert.strictEqual(x.body.reservation.roomId, 'sala-10', 'la de 8 está bloqueada: va a la de 10');
  const man = await handleCwManual({ kind: 'cw-reserve', date: '2026-12-02', from: '10:00', to: '12:00', people: 3, contact: { name: 'Juan WhatsApp', phone: '3517770000' }, channel: 'WhatsApp', requestId: 'manual-00001' }, ctx());
  assert.strictEqual(man.body.reservation.roomId, 'sala-4'); assert.ok(man.body.contact && man.body.contact.id);
  const full = await handleCwManual({ kind: 'cw-reserve', date: '2026-12-02', from: '10:00', to: '12:00', people: 2, contact: { name: 'Otra', phone: '3517770001' }, requestId: 'manual-00002' }, ctx()); assert.strictEqual(full.status, 409);
});
test('sin clave: solo desde la web autorizada, robots y abusos frenados', async () => {
  let r = await pub('availability', { q: { date: '2026-11-30' } }); assert.strictEqual(r.status, 200); assert.ok(!JSON.stringify(r.body).includes('Sofía'), 'sin datos personales');
  r = await pub('availability', { origin: 'https://otra-web.com', q: { date: '2026-11-30' } }); assert.strictEqual(r.status, 403);
  r = await pub('reservations', { b: { ...body('trampa-001', { date: '2026-12-03' }), website: 'spam' } }); assert.strictEqual(r.status, 201);
  assert.strictEqual((await T().collection('cwReservations').where('date', '==', '2026-12-03').get()).size, 0, 'el robot no reservó nada');
  r = await pub('reservations', { b: body('pub-00001', { date: '2026-12-03', contact: { name: 'Ana', phone: '3519990000' } }) }); assert.strictEqual(r.status, 201);
  r = await pub('reservations', { b: body('pub-00002', { date: '2026-12-03', from: '13:00', to: '15:00', contact: { name: 'Ana', phone: '3519990000' } }) }); assert.strictEqual(r.status, 201);
  r = await pub('reservations', { b: body('pub-00003', { date: '2026-12-03', from: '16:00', to: '18:00', contact: { name: 'Ana', phone: '+54 9 351 999-0000' } }) }); assert.strictEqual(r.body.error.code, 'TOO_MANY_FOR_PHONE');
  for (let i = 0; i < 4; i++) await pub('reservations', { ip: '9.9.9.9', b: body('ipx-0000' + i, { date: '2026-12-04', contact: { name: 'X', phone: '35100000' + i } }) });
  r = await pub('reservations', { ip: '9.9.9.9', b: body('ipx-00009', { date: '2026-12-05', contact: { name: 'X', phone: '3510000009' } }) });
  const r2 = await pub('reservations', { ip: '9.9.9.9', b: body('ipx-00010', { date: '2026-12-05', from: '14:00', to: '16:00', contact: { name: 'X', phone: '3510000010' } }) });
  const r3 = await pub('reservations', { ip: '9.9.9.9', b: body('ipx-00011', { date: '2026-12-05', from: '16:00', to: '18:00', contact: { name: 'X', phone: '3510000011' } }) });
  assert.strictEqual(r3.status, 429, 'más de 6 reservas por hora desde la misma conexión: frena');
});
