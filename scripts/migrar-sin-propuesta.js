// Quita la etapa «Propuesta enviada» (decisión de Melina, 2026-11-19): pasa a «En negociación» conservando el importe
// (proposal.amountMinor = importe actualizado), deja nota en la historia y actualiza las etapas guardadas del tablero.
const admin = require('/home/user/brandazo/functions/node_modules/firebase-admin');
admin.initializeApp({ projectId: 'brandazo' }); const db = admin.firestore(); const TS = admin.firestore.Timestamp;
const STAGES = [['nueva-cotizacion', 'Nueva cotización'], ['contactado', 'Contactado'], ['en-negociacion', 'En negociación'], ['ganada', 'Ganada'], ['perdida', 'Perdida']];
(async () => {
  for (const t of await db.collection('tenants').listDocuments()) {
    const q = await t.collection('opportunities').where('stage', '==', 'propuesta-enviada').get();
    for (const d of q.docs) { const o = d.data(), b = db.batch(), now = TS.now();
      b.update(d.ref, { stage: 'en-negociacion', negotiation: o.negotiation || { topic: 'Otro' }, updatedAt: now });
      b.set(t.collection('activities').doc(), { opportunityId: d.id, contactId: o.contactId || null, at: now, by: 'soporte', byName: 'Brandazo', type: 'etapa', via: null, from: 'propuesta-enviada', to: 'en-negociacion', text: 'Se quitó la etapa «Propuesta enviada» del tablero: la cotización pasó a «En negociación» con el mismo importe.', details: null });
      await b.commit(); console.log('movida:', t.id, d.id); }
    const p = t.collection('pipelines').doc('cafelito-eventos'); if ((await p.get()).exists) { await p.update({ stages: STAGES.map(([id, name], i) => ({ id, name, order: i })) }); console.log('etapas del tablero actualizadas:', t.id); }
  }
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
