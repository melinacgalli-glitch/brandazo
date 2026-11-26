// Pruebas de firestore.rules contra el emulador (no toca la base real).
// Correr desde la raíz: firebase emulators:exec --only firestore --project demo-brandazo "cd rules-test && npm test"
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, collectionGroup, query, where, getDocs, serverTimestamp, Timestamp, arrayUnion, writeBatch } = require('firebase/firestore');

let env;
const dueno = { uid: 'u-dueno', email: 'duena@cafelito.test', email_verified: true };
const ventas = { uid: 'u-ventas', email: 'ventas@cafelito.test', email_verified: true };
const invitada = { uid: 'u-inv', email: 'nueva@cafelito.test', email_verified: true };
const sinVerificar = { uid: 'u-nover', email: 'nueva@cafelito.test', email_verified: false };
const extrana = { uid: 'u-ext', email: 'otra@empresa.test', email_verified: true };
const adminPlat = { uid: 'u-plat', email: 'plataforma@brandazo.test', email_verified: true };
const db = u => env.authenticatedContext(u.uid, { email: u.email, email_verified: u.email_verified }).firestore();

before(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({ projectId: 'demo-brandazo', firestore: { host, port: +port, rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') } });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const a = ctx.firestore();
    await setDoc(doc(a, 'config/platform'), { admins: ['plataforma@brandazo.test'] });
    await setDoc(doc(a, 'tenants/cafelito'), { name: 'Cafelito', ownerUid: 'u-dueno' });
    await setDoc(doc(a, 'tenants/cafelito/members/u-dueno'), { uid: 'u-dueno', email: dueno.email, role: 'Dueño' });
    await setDoc(doc(a, 'tenants/cafelito/members/u-ventas'), { uid: 'u-ventas', email: ventas.email, role: 'Ventas' });
    await setDoc(doc(a, 'tenants/otra'), { name: 'Otra', ownerUid: 'u-ext' });
    await setDoc(doc(a, 'tenants/otra/members/u-ext'), { uid: 'u-ext', email: extrana.email, role: 'Dueño' });
    await setDoc(doc(a, 'tenants/otra/state/base'), { json: '{}', by: 'u-ext' });
    await setDoc(doc(a, 'tenants/cafelito/opportunities/op1'), { pipeline: 'cafelito-eventos', stage: 'nueva-cotizacion', owner: '', title: 'x', estimate: { brandazoSubtotalMinor: 100 } });
    await setDoc(doc(a, 'tenants/cafelito/contacts/c1'), { name: 'Cliente' });
    await setDoc(doc(a, 'tenants/cafelito/idempotency/q1'), { bodyHash: 'h' });
    await setDoc(doc(a, 'invites/nueva@cafelito.test__cafelito'), { email: 'nueva@cafelito.test', tenantId: 'cafelito', tenantName: 'Cafelito', role: 'Marketing', invitedBy: 'u-dueno' });
  });
});

test('sin sesión no se lee nada', async () => {
  const anon = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anon, 'tenants/cafelito')));
  await assertFails(getDoc(doc(anon, 'tenants/cafelito/opportunities/op1')));
});

test('una empresa no ve los datos de otra', async () => {
  await assertSucceeds(getDoc(doc(db(dueno), 'tenants/cafelito')));
  await assertFails(getDoc(doc(db(dueno), 'tenants/otra')));
  await assertFails(getDoc(doc(db(dueno), 'tenants/otra/state/base')));
  await assertFails(setDoc(doc(db(dueno), 'tenants/otra/state/base'), { json: '{}', by: 'u-dueno', updatedAt: serverTimestamp() }));
  await assertFails(getDocs(collection(db(extrana), 'tenants/cafelito/opportunities')));
});

test('"mis empresas" solo devuelve mis membresías', async () => {
  const r = await assertSucceeds(getDocs(query(collectionGroup(db(ventas), 'members'), where('uid', '==', 'u-ventas'))));
  assert.strictEqual(r.size, 1);
  await assertFails(getDocs(query(collectionGroup(db(ventas), 'members'), where('uid', '==', 'u-dueno'))));
});

test('miembros guardan los datos de su empresa (con límites)', async () => {
  const d = db(ventas);
  await assertSucceeds(setDoc(doc(d, 'tenants/cafelito/state/m_contents'), { json: '[]', updatedAt: serverTimestamp(), by: 'u-ventas' }));
  await assertFails(setDoc(doc(d, 'tenants/cafelito/state/m_x'), { json: '[]', updatedAt: serverTimestamp(), by: 'u-dueno' }));
  await assertFails(setDoc(doc(d, 'tenants/cafelito/state/m_x'), { json: [], updatedAt: serverTimestamp(), by: 'u-ventas' }));
  await assertFails(setDoc(doc(d, 'tenants/cafelito/state/m_x'), { json: '[]', otro: 1, updatedAt: serverTimestamp(), by: 'u-ventas' }));
});

test('invitación: solo con email verificado y con el rol de la invitación', async () => {
  await assertFails(setDoc(doc(db(sinVerificar), 'tenants/cafelito/members/u-nover'), { uid: 'u-nover', email: sinVerificar.email, role: 'Marketing' }));
  await assertFails(setDoc(doc(db(invitada), 'tenants/cafelito/members/u-inv'), { uid: 'u-inv', email: invitada.email, role: 'Admin' }));
  await assertFails(setDoc(doc(db(extrana), 'tenants/cafelito/members/u-ext'), { uid: 'u-ext', email: extrana.email, role: 'Marketing' }));
  await assertSucceeds(getDocs(query(collection(db(invitada), 'invites'), where('email', '==', invitada.email))));
  await assertSucceeds(setDoc(doc(db(invitada), 'tenants/cafelito/members/u-inv'), { uid: 'u-inv', email: invitada.email, role: 'Marketing', status: 'Activo' }));
  await assertSucceeds(deleteDoc(doc(db(invitada), 'invites/nueva@cafelito.test__cafelito')));
});

test('nadie se agrega como Dueño de una empresa ajena', async () => {
  await assertFails(setDoc(doc(db(extrana), 'tenants/cafelito/members/u-ext'), { uid: 'u-ext', email: extrana.email, role: 'Dueño' }));
});

test('invitar y cambiar roles: solo Dueño/Admin y nunca como Dueño', async () => {
  const ok = { email: 'x@cafelito.test', tenantId: 'cafelito', tenantName: 'Cafelito', role: 'Ventas', invitedBy: 'u-dueno', createdAt: serverTimestamp() };
  await assertSucceeds(setDoc(doc(db(dueno), 'invites/x@cafelito.test__cafelito'), ok));
  await assertFails(setDoc(doc(db(dueno), 'invites/y@cafelito.test__cafelito'), { ...ok, email: 'y@cafelito.test', role: 'Dueño' }));
  await assertFails(setDoc(doc(db(dueno), 'invites/otro-id'), { ...ok, email: 'z@cafelito.test' }));
  await assertFails(setDoc(doc(db(ventas), 'invites/w@cafelito.test__cafelito'), { ...ok, email: 'w@cafelito.test', invitedBy: 'u-ventas' }));
  await assertFails(setDoc(doc(db(extrana), 'invites/v@cafelito.test__cafelito'), { ...ok, email: 'v@cafelito.test', invitedBy: 'u-ext' }));
  await assertSucceeds(getDocs(query(collection(db(dueno), 'invites'), where('tenantId', '==', 'cafelito'))));
  await assertFails(getDocs(query(collection(db(ventas), 'invites'), where('tenantId', '==', 'cafelito'))));
  await assertSucceeds(updateDoc(doc(db(dueno), 'tenants/cafelito/members/u-ventas'), { role: 'Admin' }));
  await assertFails(updateDoc(doc(db(dueno), 'tenants/cafelito/members/u-ventas'), { role: 'Dueño' }));
  await assertFails(updateDoc(doc(db(ventas), 'tenants/cafelito/members/u-dueno'), { role: 'Ventas' }));
  await assertFails(deleteDoc(doc(db(ventas), 'tenants/cafelito/members/u-dueno')));
});

test('oportunidades: el equipo mueve el seguimiento, no el presupuesto', async () => {
  const d = db(ventas), ref = doc(d, 'tenants/cafelito/opportunities/op1');
  await assertSucceeds(getDoc(ref));
  await assertFails(updateDoc(ref, { stage: 'contactado', owner: 'Ventas', updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(ref, { stage: 'contactado', owner: 'Ventas', nextFollowUpAt: Timestamp.now(), updatedAt: serverTimestamp(), stageHistory: arrayUnion({ from: 'nueva-cotizacion', to: 'contactado', at: Timestamp.now(), by: 'u-ventas' }) }));
  await assertFails(updateDoc(ref, { 'estimate.brandazoSubtotalMinor': 1 }));
  await assertFails(updateDoc(ref, { stage: 'inventada' }));
  await assertFails(updateDoc(ref, { stage: 'perdida' }));
  await assertSucceeds(updateDoc(ref, { stage: 'perdida', lostReason: 'Precio' }));
  await assertFails(deleteDoc(ref));
  await assertFails(setDoc(doc(d, 'tenants/cafelito/opportunities/nueva'), { pipeline: 'cafelito-eventos', stage: 'nueva-cotizacion' }));
});

test('lo del servidor no se toca desde el navegador', async () => {
  const d = db(dueno);
  await assertSucceeds(getDoc(doc(d, 'tenants/cafelito/contacts/c1')));
  await assertFails(updateDoc(doc(d, 'tenants/cafelito/contacts/c1'), { name: 'Otro' }));
  await assertFails(getDoc(doc(d, 'tenants/cafelito/idempotency/q1')));
  await assertFails(setDoc(doc(d, 'tenants/cafelito/eventQuotes/q9'), { a: 1 }));
  await assertSucceeds(getDoc(doc(d, 'tenants/cafelito/orders/P-1')));
  await assertFails(setDoc(doc(d, 'tenants/cafelito/orders/P-2'), { status: 'paid', totalMinor: 1 }));
  await assertFails(getDoc(doc(d, 'tenants/cafelito/contactsByEmail/a@b.com')));
  await assertFails(getDoc(doc(db(extrana), 'tenants/cafelito/orders/P-1')));
  for (const col of ['subscriptions', 'enrollments', 'contactEvents']) { await assertSucceeds(getDoc(doc(d, `tenants/cafelito/${col}/x1`))); await assertFails(setDoc(doc(d, `tenants/cafelito/${col}/x2`), { status: 'active' })); await assertFails(getDoc(doc(db(extrana), `tenants/cafelito/${col}/x1`))); }
});

test('configuración del tablero: solo Dueño/Admin', async () => {
  const data = { brand: 'Cafelito Ambulante', defaultOwner: '', followUpHours: 24, updatedAt: serverTimestamp(), updatedBy: 'x' };
  await assertSucceeds(setDoc(doc(db(dueno), 'tenants/cafelito/settings/cafelito-eventos'), data));
  await assertFails(setDoc(doc(db(ventas), 'tenants/cafelito/settings/cafelito-eventos'), data));
  await assertFails(setDoc(doc(db(dueno), 'tenants/cafelito/settings/cafelito-eventos'), { ...data, followUpHours: 0 }));
});

test('auditoría: se agrega a nombre propio, no se borra', async () => {
  await assertSucceeds(setDoc(doc(db(ventas), 'tenants/cafelito/audit/a1'), { at: serverTimestamp(), by: 'u-ventas', action: 'x' }));
  await assertFails(setDoc(doc(db(ventas), 'tenants/cafelito/audit/a2'), { at: serverTimestamp(), by: 'u-dueno', action: 'x' }));
  await assertFails(deleteDoc(doc(db(dueno), 'tenants/cafelito/audit/a1')));
});

test('crear empresas: solo administradores de la plataforma, quedando como Dueño', async () => {
  await assertFails(setDoc(doc(db(dueno), 'tenants/nueva'), { name: 'Nueva', ownerUid: 'u-dueno' }));
  const p = db(adminPlat);
  await assertSucceeds(setDoc(doc(p, 'tenants/nueva'), { name: 'Nueva', ownerUid: 'u-plat' }));
  await assertSucceeds(setDoc(doc(p, 'tenants/nueva/members/u-plat'), { uid: 'u-plat', email: adminPlat.email, role: 'Dueño' }));
  await assertFails(getDoc(doc(db(dueno), 'config/platform')));
  await assertSucceeds(getDoc(doc(p, 'config/platform')));
});

test('redes y anuncios: el equipo ve los datos, nunca los permisos de acceso', async () => {
  await env.withSecurityRulesDisabled(async ctx => { const a = ctx.firestore();
    await setDoc(doc(a, 'tenants/cafelito/private/meta'), { userToken: 'secreto' });
    await setDoc(doc(a, 'tenants/cafelito/connections/meta'), { status: 'ok' });
    await setDoc(doc(a, 'tenants/cafelito/social/Instagram_1'), { followers: 10 });
    await setDoc(doc(a, 'tenants/cafelito/ads/1'), { campaigns: [] }); });
  await assertFails(getDoc(doc(db(dueno), 'tenants/cafelito/private/meta')));
  await assertSucceeds(getDoc(doc(db(ventas), 'tenants/cafelito/connections/meta')));
  await assertSucceeds(getDoc(doc(db(ventas), 'tenants/cafelito/social/Instagram_1')));
  await assertSucceeds(getDoc(doc(db(ventas), 'tenants/cafelito/ads/1')));
  await assertFails(updateDoc(doc(db(dueno), 'tenants/cafelito/social/Instagram_1'), { followers: 99999 }));
  await assertFails(getDoc(doc(db(extrana), 'tenants/cafelito/social/Instagram_1')));
  await assertFails(getDoc(doc(db(dueno), 'connectStates/x')));
  await assertSucceeds(setDoc(doc(db(dueno), 'tenants/cafelito/settings/social'), { brandByAccount: { Instagram_1: 'Cafelito Ambulante' }, updatedAt: serverTimestamp(), updatedBy: 'u-dueno' }));
  await assertFails(setDoc(doc(db(ventas), 'tenants/cafelito/settings/social'), { brandByAccount: {}, updatedAt: serverTimestamp(), updatedBy: 'u-ventas' }));
});

test('tareas: el equipo las marca como hechas, nada más', async () => {
  await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), 'tenants/cafelito/tasks/t1'), { title: 'Primer contacto', status: 'pendiente', assignee: 'Melina Galli' }); });
  const ref = doc(db(ventas), 'tenants/cafelito/tasks/t1');
  await assertFails(updateDoc(ref, { assignee: 'Otro' }));
  await assertFails(updateDoc(ref, { status: 'hecha', doneAt: serverTimestamp(), doneBy: 'u-dueno' }));
  await assertSucceeds(updateDoc(ref, { status: 'hecha', doneAt: serverTimestamp(), doneBy: 'u-ventas', doneByName: 'Ventas' }));
  await assertFails(deleteDoc(ref));
  await assertFails(updateDoc(doc(db(extrana), 'tenants/cafelito/tasks/t1'), { status: 'hecha', doneAt: serverTimestamp(), doneBy: 'u-ext' }));
});

test('ciclo de vida: cada etapa con sus datos mínimos, en centavos', async () => {
  const ref = doc(db(ventas), 'tenants/cafelito/opportunities/op1'), fu = Timestamp.now();
  await assertFails(updateDoc(ref, { stage: 'propuesta-enviada', nextFollowUpAt: fu, proposal: { amountMinor: 142000000 } })); // etapa eliminada
  await assertFails(updateDoc(ref, { stage: 'en-negociacion', nextFollowUpAt: fu, negotiation: { topic: 'Precio' }, proposal: { amountMinor: 1420000.5 } }));
  await assertSucceeds(updateDoc(ref, { stage: 'en-negociacion', nextFollowUpAt: fu, negotiation: { topic: 'Precio' } }));
  await assertSucceeds(updateDoc(ref, { stage: 'en-negociacion', nextFollowUpAt: fu, negotiation: { topic: 'Precio' }, proposal: { amountMinor: 142000000, sentAt: '2026-11-17', validUntil: null, link: null, source: 'negociacion' } }));
  await assertFails(updateDoc(ref, { stage: 'ganada', nextFollowUpAt: null }));
  await assertFails(updateDoc(ref, { stage: 'ganada', nextFollowUpAt: null, won: { amountMinor: 100, depositMinor: 200 } }));
  await assertSucceeds(updateDoc(ref, { stage: 'ganada', nextFollowUpAt: null, won: { amountMinor: 130000000, depositMinor: 65000000, depositPaid: false, depositPaidAt: null, balancePaid: false, balancePaidAt: null } }));
  await assertSucceeds(updateDoc(ref, { 'won.depositPaid': true, 'won.depositPaidAt': fu }));
  await assertFails(updateDoc(ref, { 'estimate.brandazoSubtotalMinor': 5 }));
});

test('historia (actividades): se agrega a nombre propio y no se borra', async () => {
  const a = { opportunityId: 'op1', contactId: 'c1', at: serverTimestamp(), by: 'u-ventas', byName: 'Ventas', type: 'contacto', via: 'WhatsApp', text: 'Le pasé el menú' };
  await assertSucceeds(setDoc(doc(db(ventas), 'tenants/cafelito/activities/a1'), a));
  await assertFails(setDoc(doc(db(ventas), 'tenants/cafelito/activities/a2'), { ...a, by: 'u-dueno' }));
  await assertFails(setDoc(doc(db(ventas), 'tenants/cafelito/activities/a3'), { ...a, type: 'inventado' }));
  await assertFails(updateDoc(doc(db(dueno), 'tenants/cafelito/activities/a1'), { text: 'otra cosa' }));
  await assertFails(deleteDoc(doc(db(dueno), 'tenants/cafelito/activities/a1')));
  await assertSucceeds(getDoc(doc(db(dueno), 'tenants/cafelito/activities/a1')));
  await assertFails(getDoc(doc(db(extrana), 'tenants/cafelito/activities/a1')));
});

test('oportunidades: el equipo puede asignar la campaña que la trajo', async () => {
  const ref = doc(db(ventas), 'tenants/cafelito/opportunities/op1');
  await assertSucceeds(updateDoc(ref, { campaignId: 'k1', updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(ref, { campaignId: null }));
  await assertFails(updateDoc(ref, { campaignId: 123 }));
});

test('fechas bloqueadas: solo Dueño/Admin, en la configuración del tablero', async () => {
  const base = { brand: 'Cafelito Ambulante', defaultOwner: '', followUpHours: 24, updatedAt: serverTimestamp(), updatedBy: 'x' };
  await assertSucceeds(setDoc(doc(db(dueno), 'tenants/cafelito/settings/cafelito-eventos'), { ...base, blockedDates: [{ date: '2026-12-24', note: 'Nochebuena' }] }));
  await assertFails(setDoc(doc(db(ventas), 'tenants/cafelito/settings/cafelito-eventos'), { ...base, blockedDates: [] }));
  await assertFails(setDoc(doc(db(dueno), 'tenants/cafelito/settings/cafelito-eventos'), { ...base, blockedDates: 'no-es-lista' }));
});
