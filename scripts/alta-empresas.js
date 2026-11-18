// Alta inicial (Etapa 0): administradores de la plataforma, empresas y la invitación de su Dueño.
// No guarda emails en el repositorio: se pasan como argumento.
// Uso (desde la raíz, con la clave de la cuenta de servicio fuera del repo):
//   GOOGLE_APPLICATION_CREDENTIALS=<clave.json> node scripts/alta-empresas.js <email-dueño> [--seco]
// --seco: muestra lo que haría sin escribir nada.
// Es idempotente: si la empresa o la invitación ya existen, no las duplica ni pisa datos.
const admin = require('../functions/node_modules/firebase-admin');
const [email, flag] = process.argv.slice(2);
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { console.error('Falta el email del Dueño'); process.exit(1); }
const seco = flag === '--seco';
const em = email.trim().toLowerCase();
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'brandazo' });
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();
const EMPRESAS = [
  { id: 'cafelito', name: 'Cafelito Coffee House', industry: 'Gastronomía' }
  // «cafelito-pruebas» se borró el 18/11/2026 a pedido de Melina (ver docs/decisiones.md)
];

(async () => {
  const ops = [];
  const plat = await db.doc('config/platform').get();
  const admins = new Set((plat.exists && plat.data().admins) || []);
  if (!admins.has(em)) ops.push(['config/platform', 'agregar administrador de la plataforma', () => db.doc('config/platform').set({ admins: admin.firestore.FieldValue.arrayUnion(em) }, { merge: true })]);
  for (const e of EMPRESAS) {
    const t = await db.doc(`tenants/${e.id}`).get();
    if (!t.exists || !t.data().name) ops.push([`tenants/${e.id}`, `crear empresa «${e.name}»`, () => db.doc(`tenants/${e.id}`).set({ name: e.name, country: 'Argentina', industry: e.industry, size: '2 a 10', createdAt: now }, { merge: true })]);
    const s = await db.doc(`tenants/${e.id}/settings/cafelito-eventos`).get();
    if (!s.exists || !s.data().brand) ops.push([`tenants/${e.id}/settings/cafelito-eventos`, 'marca de las cotizaciones: Cafelito Ambulante', () => db.doc(`tenants/${e.id}/settings/cafelito-eventos`).set({ brand: 'Cafelito Ambulante', followUpHours: 24, updatedAt: now, updatedBy: 'alta' }, { merge: true })]);
    const miembros = await db.collection(`tenants/${e.id}/members`).where('email', '==', em).get();
    const inv = await db.doc(`invites/${em}__${e.id}`).get();
    if (miembros.empty && !inv.exists) ops.push([`invites/…__${e.id}`, `invitación como Dueño a «${e.name}»`, () => db.doc(`invites/${em}__${e.id}`).set({ email: em, tenantId: e.id, tenantName: e.name, role: 'Dueño', invitedBy: 'alta', invitedByName: 'Alta inicial', createdAt: now })]);
  }
  if (!ops.length) { console.log('Nada para hacer: ya estaba todo dado de alta.'); return; }
  for (const [p, d, fn] of ops) { console.log((seco ? '[seco] ' : '') + d + ' · ' + p); if (!seco) await fn(); }
  console.log(seco ? 'No se escribió nada.' : 'Listo.');
})().catch(e => { console.error(e.message); process.exit(1); });
