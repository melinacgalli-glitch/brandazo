'use strict';
/* Carga manual en el CRM (contactos y pedidos de presupuesto que llegan por WhatsApp, teléfono, Instagram…).
   POST /api/v1/crm/manual con «Authorization: Bearer <token de Firebase>».
   Lo usa cualquier miembro de la empresa. El servidor hace lo mismo que con una cotización de la web:
   contacto sin duplicar (por teléfono), oportunidad en «Nueva cotización», tarea de primer contacto,
   nota en la historia y auditoría, todo en UNA transacción. Los contactos y oportunidades siguen sin
   poder crearse desde el navegador (reglas): solo por acá, con la sesión verificada. */
const { normalizePhoneAR } = require('./phone');
const { PIPELINE, todayInTZ } = require('./eventQuotes');

const CHANNELS = ['Web', 'WhatsApp', 'Teléfono', 'Instagram', 'Facebook', 'Mail', 'Recomendación', 'En persona', 'Otro'];
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
  if (b.kind === 'order') return handleManualOrder(b, { deps, user, by, tenantRef });
  if (b.kind === 'order-status') return handleOrderStatus(b, { deps, user, by, tenantRef });
  if (['auto-save', 'auto-test', 'coupon-check', 'coupon-redeem'].includes(b.kind)) return require('./automations').handleAuto(b, { deps, user, by, tenantRef, role: member.data().role });
  if (['mail-audience', 'mail-test', 'mail-send', 'mail-cancel'].includes(b.kind)) return require('./mailings').handleMailing(b, { deps, user, by, tenantRef, role: member.data().role });
  if (['subscription', 'enrollment', 'sub-status', 'enr-status'].includes(b.kind)) return require('./crmSales').handleSale(b, { deps, user, by, tenantRef });

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
    // Contacto solo: tipo (Lead/Cliente) y unidades de negocio elegidas; con evento: Lead de la unidad del tablero
    const units = !ev && Array.isArray(b.units) ? [...new Set(b.units.map(u => str(u, 120)).filter(Boolean))].slice(0, 10) : [];
    const cBrand = ev ? brand : (units[0] || brand), cTags = ev ? [brand] : (units.length ? units : [brand]), cType = !ev && b.type === 'Cliente' ? 'Cliente' : 'Lead';
    if (contact) {
      const tags = [...new Set([...(Array.isArray(contact.tags) ? contact.tags : []), ...cTags])];
      tx.update(contactRef, { updatedAt: at, tags, ...(cType === 'Cliente' ? { type: 'Cliente' } : {}), ...(email && !contact.email ? { email } : {}), ...(ev ? { quoteCount: deps.FieldValue.increment(1), lastQuoteAt: at } : {}) });
    } else {
      tx.set(contactRef, { name, phoneRaw, phoneE164: phone.e164, phoneDisplay: phone.display, phoneNormalized: phone.normalized, email: email || null,
        brand: cBrand, type: cType, tags: cTags, firstSource: { ...source, at }, marketingConsent: null, quoteCount: ev ? 1 : 0, lastQuoteAt: ev ? at : null, createdAt: at, updatedAt: at });
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


/* Venta de la tienda cargada a mano (ya pagada). Queda en tenants/{t}/orders igual que las que manda la web:
   suma en CRM → Tienda, campañas, funnel y objetivos. Si tiene el n.º de pago de Mercado Pago, la usa como
   clave: cargarla dos veces da error, y cuando la web mande esa compra se actualiza la misma (no se duplica). */
async function handleManualOrder(b, { deps, user, by, tenantRef }) {
  const c = b.contact || {}, o = b.order || {}, details = [];
  const name = str(c.name, 120), phoneRaw = str(c.phone, 30), email = str(c.email, 200).toLowerCase();
  if (!name) details.push({ field: 'contact.name', issue: 'Escribí el nombre' });
  if (!phoneRaw && !email) details.push({ field: 'contact.phone', issue: 'Escribí el teléfono o el email' });
  if (phoneRaw && phoneRaw.replace(/\D/g, '').length < 6) details.push({ field: 'contact.phone', issue: 'Revisá el teléfono' });
  if (email && !isEmail(email)) details.push({ field: 'contact.email', issue: 'El email no es válido' });
  const paymentId = str(String(o.paymentId == null ? '' : o.paymentId), 40).replace(/[^0-9A-Za-z-]/g, '');
  const items = (Array.isArray(o.items) ? o.items : []).slice(0, 50).map(i => ({ name: str(i && i.name, 160), quantity: Math.trunc(+(i && i.quantity)), unitPriceMinor: Math.trunc(+(i && i.unitPriceMinor)), ...(str(i && i.variant, 160) ? { variant: str(i.variant, 160) } : {}) }));
  if (!items.length || items.some(i => !i.name || !(i.quantity >= 1 && i.quantity <= 1000) || !(i.unitPriceMinor > 0 && i.unitPriceMinor < 1e12)))
    details.push({ field: 'order.items', issue: 'Cada producto necesita nombre, cantidad y precio' });
  const paidDate = str(o.paidDate, 10);
  if (!isDate(paidDate)) details.push({ field: 'order.paidDate', issue: 'Elegí la fecha de pago' });
  else if (paidDate > todayInTZ(deps.now ? deps.now() : new Date())) details.push({ field: 'order.paidDate', issue: 'La fecha de pago no puede ser futura' });
  const pickupDate = str(o.pickupDate, 10);
  if (pickupDate && !isDate(pickupDate)) details.push({ field: 'order.pickupDate', issue: 'Revisá la fecha de retiro' });
  const status = o.status === 'picked_up' ? 'picked_up' : 'paid';
  if (details.length) return fail(422, 'VALIDATION_FAILED', 'Revisá los datos marcados.', details);

  const now = deps.now ? deps.now() : new Date(), at = deps.Timestamp.fromDate(now);
  const total = items.reduce((a, i) => a + i.quantity * i.unitPriceMinor, 0);
  const paidAt = deps.Timestamp.fromDate(new Date(paidDate + 'T12:00:00-03:00'));
  const brand = str(b.brand, 120) || 'Cafelito Cakes';
  const orderRef = tenantRef.collection('orders').doc(paymentId ? 'MP-' + paymentId : 'MAN-' + now.getTime().toString(36) + Math.random().toString(36).slice(2, 6));
  const phone = phoneRaw ? normalizePhoneAR(phoneRaw) : null;
  const phoneRef = phone ? tenantRef.collection('contactsByPhone').doc(phone.key) : null;
  const mailRef = email ? tenantRef.collection('contactsByEmail').doc(email) : null;
  const dupQ = paymentId ? tenantRef.collection('orders').where('payment.paymentId', '==', paymentId).limit(1) : null;
  const utm = str(o.utmCampaign, 120).toLowerCase() || null;

  const out = await deps.db.runTransaction(async tx => {
    const [exist, dup, byPhone, byMail] = await Promise.all([tx.get(orderRef), dupQ ? tx.get(dupQ) : null, phoneRef ? tx.get(phoneRef) : null, mailRef ? tx.get(mailRef) : null]);
    if (exist.exists || (dup && !dup.empty)) return { dup: true };
    let contactId = byPhone && byPhone.exists ? byPhone.data().contactId : byMail && byMail.exists ? byMail.data().contactId : null;
    const contactRef = contactId ? tenantRef.collection('contacts').doc(contactId) : tenantRef.collection('contacts').doc();
    const prev = contactId ? await tx.get(contactRef) : null, contact = prev && prev.exists ? prev.data() : null;
    const source = { channel: 'Carga manual · Tienda', manual: true, createdBy: user.uid, createdByName: by };
    tx.set(orderRef, { orderId: paymentId || orderRef.id, brand, status, counted: true, statusAt: at, createdAt: paidAt, paidAt, paidMonth: paidDate.slice(0, 7),
      totalMinor: total, discountMinor: 0, currency: 'ARS', items, pickup: pickupDate || str(o.timeSlot, 40) ? { date: pickupDate || null, timeSlot: str(o.timeSlot, 40) || null, place: str(o.place, 120) || null } : null,
      contactId: contactRef.id, customerName: contact ? contact.name : name, payment: paymentId ? { provider: 'mercadopago', paymentId } : null,
      attribution: utm ? { utmCampaign: utm } : null, utmCampaign: utm, source, notes: str(o.notes, 1000), warnings: [],
      history: [{ status, at: now.toISOString(), eventId: 'manual', stale: false, by }], firstReceivedAt: at, updatedAt: at });
    if (contact) tx.update(contactRef, { updatedAt: at, lastOrderAt: at, orderCount: deps.FieldValue.increment(1), orderSpentMinor: deps.FieldValue.increment(total), type: 'Cliente',
      ...(email && !contact.email ? { email } : {}), ...(Array.isArray(contact.tags) && !contact.tags.includes(brand) ? { tags: [...contact.tags, brand] } : {}) });
    else tx.set(contactRef, { name, phoneRaw: phoneRaw || null, phoneE164: phone ? phone.e164 : null, phoneDisplay: phone ? phone.display : null, phoneNormalized: phone ? phone.normalized : false,
      email: email || null, brand, type: 'Cliente', tags: [brand], firstSource: { ...source, at }, marketingConsent: null, orderCount: 1, orderSpentMinor: total, lastOrderAt: at, quoteCount: 0, createdAt: at, updatedAt: at });
    if (phoneRef && !byPhone.exists) tx.set(phoneRef, { contactId: contactRef.id, createdAt: at });
    if (mailRef && !byMail.exists) tx.set(mailRef, { contactId: contactRef.id, createdAt: at });
    tx.set(tenantRef.collection('audit').doc(), { at, by: user.uid, byName: by, action: 'venta-tienda-manual', orderId: orderRef.id, contactId: contactRef.id });
    return { orderId: orderRef.id, contactId: contactRef.id, match: contact ? 'existing' : 'new', existingName: contact ? contact.name : null, totalMinor: total };
  });
  if (out.dup) return fail(409, 'ORDER_EXISTS', 'Esa venta ya está cargada (mismo n.º de pago de Mercado Pago).', [{ field: 'order.paymentId', issue: 'Ya hay una venta con este n.º de pago' }]);
  return { status: 201, body: out };
}

/* Cambio de estado de una venta de la tienda hecho a mano: retirado, cancelado o devuelto (o volver a «por retirar»).
   Cancelado o devuelto deja de contar como venta y se descuenta del cliente; queda en la historia con quién lo hizo. */
async function handleOrderStatus(b, { deps, user, by, tenantRef }) {
  const id = str(b.id, 120), status = str(b.status, 20);
  if (!id || id.includes('/')) return fail(400, 'BAD_ID', 'Falta la venta.');
  if (!['paid', 'picked_up', 'cancelled', 'refunded'].includes(status)) return fail(422, 'VALIDATION_FAILED', 'Estado no válido.', [{ field: 'status', issue: 'Estado no válido' }]);
  const now = deps.now ? deps.now() : new Date(), at = deps.Timestamp.fromDate(now);
  const ref = tenantRef.collection('orders').doc(id);
  const out = await deps.db.runTransaction(async tx => {
    const s = await tx.get(ref); if (!s.exists) return { missing: true };
    const o = s.data(); if (o.status === status) return { same: true };
    const was = !!o.counted, counted = status === 'paid' || status === 'picked_up';
    const cRef = o.contactId ? tenantRef.collection('contacts').doc(o.contactId) : null, cSnap = cRef ? await tx.get(cRef) : null;
    tx.update(ref, { status, counted, statusAt: at, updatedAt: at, history: [...(o.history || []), { status, at: now.toISOString(), eventId: 'manual', stale: false, by }].slice(-30) });
    if (cSnap && cSnap.exists && was !== counted) tx.update(cRef, { orderCount: deps.FieldValue.increment(counted ? 1 : -1), orderSpentMinor: deps.FieldValue.increment(counted ? (o.totalMinor || 0) : -(o.totalMinor || 0)), updatedAt: at });
    tx.set(tenantRef.collection('audit').doc(), { at, by: user.uid, byName: by, action: `venta-${status}`, orderId: id, contactId: o.contactId || null });
    return { ok: true };
  });
  if (out.missing) return fail(404, 'NOT_FOUND', 'No se encontró la venta.');
  return { status: 200, body: { id, status, unchanged: !!out.same } };
}

module.exports = { handleManual, handleManualOrder, handleOrderStatus, CHANNELS, EVENT_TYPES };
