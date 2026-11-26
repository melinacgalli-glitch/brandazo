// Alta de las salas de coworking de Cafelito (una vez, idempotente) y paso a la agenda de las reservas ya tomadas.
// Uso: GOOGLE_APPLICATION_CREDENTIALS=… node scripts/coworking-alta.js
const admin = require('../functions/node_modules/firebase-admin');
const { book, loadCfg, DEFAULTS } = require('../functions/src/coworking');
admin.initializeApp({ projectId: 'brandazo' });
const db = admin.firestore(), TS = admin.firestore.Timestamp;
const CFG = { rooms: DEFAULTS.rooms, hours: DEFAULTS.hours, stepMin: 30, minMin: 120, maxMin: 480 };
// Reservas que llegaron por mail antes de la agenda (26/11/2026): ocupan su sala desde ya
const EXISTENTES = [
  { id: 'mail_cw_20261126_buonfiglio', name: 'Yair Buonfiglio', phone: '3513830114', people: 6, date: '2026-11-27', from: '17:00', to: '20:00' },
  { id: 'mail_cw_20261126_vottero', name: 'Verónica Vottero', phone: '3517551220', people: 4, date: '2026-11-30', from: '15:30', to: '18:30' },
];
const min = s => +s.slice(0, 2) * 60 + +s.slice(3);
(async () => {
  for (const [tid, origins] of [['cafelito', ['https://www.cafelito.com.ar', 'https://cafelito.com.ar']], ['cafelito-pruebas', ['re:^https://[a-z0-9-]+\\.vercel\\.app$', 're:^http://localhost(:\\d+)?$']]]) {
    const ref = db.doc(`tenants/${tid}/settings/coworking`);
    if (!(await ref.get()).exists) { await ref.set({ ...CFG, updatedAt: TS.now(), updatedBy: 'alta' }); console.log(tid, ': salas configuradas'); } else console.log(tid, ': ya tenía salas');
    await db.doc(`publicSites/${tid}`).set({ tenantId: tid, origins, updatedAt: TS.now() }); console.log(tid, ': sitio público', origins.join(', '));
  }
  const T = db.collection('tenants').doc('cafelito'), cfg = await loadCfg(T);
  for (const r of EXISTENTES) {
    if ((await T.collection('cwReservations').doc(r.id).get()).exists) { console.log(r.name, ': ya estaba en la agenda'); continue; }
    const byPhone = await T.collection('contactsByPhone').where('contactId', '!=', '').get().then(s => s.docs.find(d => d.id.endsWith(r.phone.slice(-10)))).catch(() => null);
    const out = await book({ db, Timestamp: TS, nowMs: Date.now() }, T, cfg, { id: r.id, date: r.date, from: min(r.from), to: min(r.to), people: r.people,
      data: { source: 'web', via: 'mail (cargada antes de la agenda)', name: r.name, phone: r.phone, byName: 'Alta', contactId: byPhone ? byPhone.data().contactId : null } });
    console.log(r.name, ':', out.ok ? `${out.ok.reservation.roomName} ${r.date} ${r.from}-${r.to}` : out.taken ? 'SALA OCUPADA, revisar' : JSON.stringify(out));
  }
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
