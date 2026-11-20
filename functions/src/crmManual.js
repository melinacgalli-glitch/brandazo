'use strict';
/* Carga manual en el CRM (contactos y pedidos de presupuesto que llegan por WhatsApp, teléfono, Instagram…).
   POST /api/v1/crm/manual con «Authorization: Bearer <token de Firebase>».
   Lo usa cualquier miembro de la empresa. El servidor hace lo mismo que con una cotización de la web:
   contacto sin duplicar (por teléfono), oportunidad en «Nueva cotización», tarea de primer contacto,
   nota en la historia y auditoría, todo en UNA transacción. Los contactos y oportunidades siguen sin
   poder crearse desde el navegador (reglas): solo por acá, con la sesión verificada. */
const { normalizePhoneAR } = require('./phone');
const { PIPELINE, todayInTZ } = require('./eventQuotes');

const CHANNELS = ['WhatsApp', 'Teléfono', 'Instagram', 'Facebook', 'Mail', 'Recomendación', 'En persona', 'Otro'];
const EVENT_TYPES = ['Corporativo', 'Cumpleaños', 'Casamiento', 'Lanzamiento o activación', 'Otro']; // los mismos del cotizador
const str = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T12:00:00Z'));
const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function fail(status, code, message, details) { return { status, body: { error: { code, message, ...(details ? { details } : {}) } } }; }

async function handleManual(req, deps) {
  if (req.method === 'OPTIONS') return { status: 204, body: '' };
  if (req.method !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED', 'Usá POST.');
  const m = String(req.get('authorization') || '').match(/^Bearer (.+)$/);
  if (!m) return fail(401, 'NO_SESSION', 'Tenés que iniciar sesión.');
  let user; try { user = await deps.verifyIdToken(m[1]); } catch { return fail(401, 'NO_SESSION', 'La sesión venció: volvé a entrar.'); }
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const tid = str(b.tenantId, 100);
  if (!tid || tid.includes('/')) return fail(400, 'BAD_TENANT', 'Falta la empresa.');
  const tenantRef = deps.db.collection('tenants').doc(tid);
  const member = await tenantRef.collection('members').doc(user.uid).get();
  if (!member.exists) return fail(403, 'NOT_MEMBER', 'No sos parte de esta empresa.');
  const by = member.data().name || user.name || user.email || 'Equipo';

  // Validación (mensajes para la pantalla)
  const c = b.contact || {}, details = [];
  const name = str(c.name, 120), phoneRaw = str(c.phone, 30), email = str(c.email, 200).toLowerCase(), channel = CHANNELS.includes(b.channel) ? b.channel : 'Otro';
  if (!name) details.push({ field: 'contact.name', issue: 'Escribí el nombre' });
  if (!phoneRaw || phoneRaw.replace(/\D/g, '').length < 6) details.push({ field: 'contact.phone', issue: 'Escribí el teléfono' });
  if (email && !isEmail(email)) details.push({ field: 'contact.email', issue: 'El email no es válido' });
  let ev = null;
  if (b.event) {
    const e = b.event, today = todayInTZ(deps.now ? deps.now() : new Date());
    ev = { type: EVENT_TYPES.includes(e.type) ? e.type : 'Otro', date: str(e.date, 10), startTime: /^\d{2}:\d{2}$/.test(e.startTime || '') ? e.startTime : null,
      durationHours: Number(e.durationHours) > 0 && Number(e.durationHours) <= 24 ? Number(e.durationHours) : null,
      guests: Number.isInteger(+e.guests) && +e.guests > 0 && +e.guests <= 5000 ? +e.guests : null,
      place: str(e.place, 200), inCapital: e.inCapital === true ? true : e.inCapital === false ? false : null, endTime: null };
    if (!isDate(ev.date)) details.push({ field: 'event.date', issue: 'Elegí la fecha del evento' });
    else if (ev.date < today) details.push({ field: 'event.date', issue: 'La fecha ya pasó' });
  }
  const amountMinor = b.amountMinor == null ? null : Number(b.amountMinor);
  if (amountMinor != null && !(Number.isInteger(amountMinor) && amountMinor > 0 && amountMinor < 1e12)) details.push({ field: 'amountMinor', issue: 'Revisá el importe' });
  if (details.length) return fail(422, 'VALIDATION_FAILED', 'Revisá los datos marcados.', details);

  const now = deps.now ? deps.now() : new Date(), at = deps.Timestamp.fromDate(now);
  const phone = normalizePhoneAR(phoneRaw), warnings = [];
  if (!phone.normalized) warnings.push('PHONE_NOT_NORMALIZED');
  if (ev) { try { const taken = await require('./availability').dateTaken(deps.db, tid, ev.date); if (taken) warnings.push('DATE_UNAVAILABLE'); } catch { /* solo aviso */ } }
  const phoneRef = tenantRef.collection('contactsByPhone').doc(phone.key);
  const mailRef = email ? tenantRef.collection('contactsByEmail').doc(email) : null;
  const settingsRef = tenantRef.collection('settings').doc('cafelito-eventos');
  const pipelineRef = tenantRef.collection('pipelines').doc(PIPELINE.id);

  const out = await deps.db.runTransaction(async tx => {
    const [byPhone, byMail, sSnap, pSnap] = await Promise.all([tx.get(phoneRef), mailRef ? tx.get(mailRef) : null, tx.get(settingsRef), tx.get(pipelineRef)]);
    const settings = sSnap.exists ? sSnap.data() : {};
    const brand = settings.brand || 'Cafelito Ambulante';
    let contactId = byPhone.exists ? byPhone.data().contactId : byMail && byMail.exists ? byMail.data().contactId : null;
    const contactRef = contactId ? tenantRef.collection('contacts').doc(contactId) : tenantRef.collection('contacts').doc();
    const prev = contactId ? await tx.get(contactRef) : null, contact = prev && prev.exists ? prev.data() : null;
    const source = { channel: `Carga manual · ${channel}`, manual: true, createdBy: user.uid, createdByName: by };
    if (contact) {
      tx.update(contactRef, { updatedAt: at, ...(email && !contact.email ? { email } : {}), ...(ev ? { quoteCount: deps.FieldValue.increment(1), lastQuoteAt: at } : {}) });
    } else {
      tx.set(contactRef, { name, phoneRaw, phoneE164: phone.e164, phoneDisplay: phone.display, phoneNormalized: phone.normalized, email: email || null,
        brand, type: 'Lead', tags: [brand], firstSource: { ...source, at }, marketingConsent: null, quoteCount: ev ? 1 : 0, lastQuoteAt: ev ? at : null, createdAt: at, updatedAt: at });
    }
    if (!byPhone.exists) tx.set(phoneRef, { contactId: contactRef.id, createdAt: at });
    if (mailRef && !(byMail && byMail.exists)) tx.set(mailRef, { contactId: contactRef.id, createdAt: at });
    let oppId = null;
    if (ev) {
      const oppRef = tenantRef.collection('opportunities').doc(); oppId = oppRef.id;
      const owner = str(b.owner, 120) || (settings.assignByEventType || {})[ev.type] || settings.defaultOwner || by;
      const follow = Number(settings.followUpHours) > 0 ? Number(settings.followUpHours) : 24;
      if (!pSnap.exists) tx.set(pipelineRef, { name: PIPELINE.name, stages: PIPELINE.stages.map(([id, n], i) => ({ id, name: n, order: i })), createdAt: at });
      tx.set(oppRef, { pipeline: PIPELINE.id, stage: 'nueva-cotizacion', title: `${ev.type} · ${contact ? contact.name : name} · ${ev.date}`, contactId: contactRef.id, brand, owner,
        event: ev, selection: null, dietary: [], notes: str(b.notes, 2000),
        estimate: { status: 'manual', brandazoSubtotalMinor: ev && amountMinor ? amountMinor : null, lines: [], currency: 'ARS', taxIncluded: false, validated: false },
        source, attribution: null, campaignId: str(b.campaignId, 60) || null, warnings, lostReason: null,
        nextFollowUpAt: deps.Timestamp.fromMillis(now.getTime() + follow * 36e5), createdAt: at, updatedAt: at });
      tx.set(tenantRef.collection('tasks').doc(), { type: 'primer-contacto', title: `Enviar presupuesto: ${contact ? contact.name : name}`, opportunityId: oppRef.id, contactId: contactRef.id, assignee: owner, dueAt: deps.Timestamp.fromMillis(now.getTime() + follow * 36e5), status: 'pendiente', createdAt: at });
      tx.set(tenantRef.collection('activities').doc(), { opportunityId: oppRef.id, contactId: contactRef.id, at, by: user.uid, byName: by, type: 'nota', via: channel, text: `Pedido cargado a mano por ${by} (llegó por ${channel}).`, from: null, to: null, details: null });
    }
    tx.set(tenantRef.collection('audit').doc(), { at, by: user.uid, byName: by, action: ev ? 'cotizacion-manual' : 'contacto-manual', contactId: contactRef.id, opportunityId: oppId });
    return { contactId: contactRef.id, match: contact ? 'existing' : 'new', existingName: contact ? contact.name : null, opportunityId: oppId };
  });
  return { status: 201, body: { ...out, warnings } };
}

module.exports = { handleManual, CHANNELS, EVENT_TYPES };
