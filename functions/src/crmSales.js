'use strict';
/* Suscripciones (Cafelito Work) e inscripciones a cursos (Cafelito Academy) cargadas a mano.
   Se guardan como las ventas de la tienda: solo las escribe el servidor (reglas), con la sesión verificada.
   - tenants/{t}/subscriptions/{id}: plan, precio mensual, alta, estado (active · paused · cancelled), n.º de suscripción de Mercado Pago.
   - tenants/{t}/enrollments/{id}:   curso (con sus fechas), importe pagado, fecha de pago, n.º de pago de Mercado Pago, estado (paid · cancelled · refunded).
   El n.º de Mercado Pago evita cargar dos veces lo mismo (y servirá para unirlo con lo que mande la web más adelante). */
const { normalizePhoneAR } = require('./phone');
const { todayInTZ } = require('./eventQuotes');

const str = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T12:00:00Z'));
const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const money = v => { const n = Math.trunc(+v); return n > 0 && n < 1e12 ? n : null; };
const mpId = v => str(String(v == null ? '' : v), 60).replace(/[^0-9A-Za-z-]/g, '');
const fail = (status, code, message, details) => ({ status, body: { error: { code, message, ...(details ? { details } : {}) } } });
const SUB_ST = ['active', 'paused', 'cancelled'], ENR_ST = ['paid', 'cancelled', 'refunded'];

function checkContact(c, details) {
  const name = str(c.name, 120), phoneRaw = str(c.phone, 30), email = str(c.email, 200).toLowerCase();
  if (!name) details.push({ field: 'contact.name', issue: 'Escribí el nombre' });
  if (!phoneRaw && !email) details.push({ field: 'contact.phone', issue: 'Escribí el teléfono o el email' });
  if (phoneRaw && phoneRaw.replace(/\D/g, '').length < 6) details.push({ field: 'contact.phone', issue: 'Revisá el teléfono' });
  if (email && !isEmail(email)) details.push({ field: 'contact.email', issue: 'El email no es válido' });
  return { name, phoneRaw, email };
}
/* Busca o crea el contacto dentro de la transacción (por teléfono o email) y lo deja como Cliente de la unidad */
async function upsertClient(tx, tenantRef, { name, phoneRaw, email }, brand, source, at, counter, deps) {
  const phone = phoneRaw ? normalizePhoneAR(phoneRaw) : null;
  const phoneRef = phone ? tenantRef.collection('contactsByPhone').doc(phone.key) : null, mailRef = email ? tenantRef.collection('contactsByEmail').doc(email) : null;
  const [byPhone, byMail] = await Promise.all([phoneRef ? tx.get(phoneRef) : null, mailRef ? tx.get(mailRef) : null]);
  const id = byPhone && byPhone.exists ? byPhone.data().contactId : byMail && byMail.exists ? byMail.data().contactId : null;
  const ref = id ? tenantRef.collection('contacts').doc(id) : tenantRef.collection('contacts').doc();
  const snap = id ? await tx.get(ref) : null, contact = snap && snap.exists ? snap.data() : null;
  return {
    ref, contact,
    write() {
      if (contact) tx.update(ref, { updatedAt: at, type: 'Cliente', [counter]: deps.FieldValue.increment(1), tags: [...new Set([...(Array.isArray(contact.tags) ? contact.tags : []), brand])], ...(email && !contact.email ? { email } : {}) });
      else tx.set(ref, { name, phoneRaw: phoneRaw || null, phoneE164: phone ? phone.e164 : null, phoneDisplay: phone ? phone.display : null, phoneNormalized: phone ? phone.normalized : false,
        email: email || null, brand, type: 'Cliente', tags: [brand], firstSource: { ...source, at }, marketingConsent: null, [counter]: 1, quoteCount: 0, createdAt: at, updatedAt: at });
      if (phoneRef && !byPhone.exists) tx.set(phoneRef, { contactId: ref.id, createdAt: at });
      if (mailRef && !byMail.exists) tx.set(mailRef, { contactId: ref.id, createdAt: at });
    }
  };
}

async function handleSale(b, { deps, user, by, tenantRef }) {
  const now = deps.now ? deps.now() : new Date(), at = deps.Timestamp.fromDate(now), today = todayInTZ(now);
  const source = { manual: true, createdBy: user.uid, createdByName: by };

  if (b.kind === 'subscription' || b.kind === 'enrollment') {
    const isSub = b.kind === 'subscription', d = (isSub ? b.sub : b.enr) || {}, details = [];
    const ct = checkContact(b.contact || {}, details), brand = str(b.brand, 120) || (isSub ? 'Cafelito Work' : 'Cafelito Academy');
    const ext = mpId(isSub ? d.mpSubscriptionId : d.paymentId), price = money(isSub ? d.priceMinor : d.amountMinor);
    const label = str(isSub ? d.planName : d.courseName, 160), date = str(isSub ? d.startDate : d.paidDate, 10);
    if (!label) details.push({ field: isSub ? 'sub.planName' : 'enr.courseName', issue: isSub ? 'Elegí el plan' : 'Elegí el curso' });
    if (!price) details.push({ field: isSub ? 'sub.priceMinor' : 'enr.amountMinor', issue: 'Revisá el importe' });
    if (!isDate(date)) details.push({ field: isSub ? 'sub.startDate' : 'enr.paidDate', issue: isSub ? 'Elegí la fecha de alta' : 'Elegí la fecha de pago' });
    else if (!isSub && date > today) details.push({ field: 'enr.paidDate', issue: 'La fecha de pago no puede ser futura' });
    const cs = str(d.courseStart, 10), ce = str(d.courseEnd, 10);
    if (!isSub && ((cs && !isDate(cs)) || (ce && !isDate(ce)))) details.push({ field: 'enr.courseName', issue: 'Revisá las fechas del curso' });
    if (details.length) return fail(422, 'VALIDATION_FAILED', 'Revisá los datos marcados.', details);
    const col = tenantRef.collection(isSub ? 'subscriptions' : 'enrollments');
    const ref = ext ? col.doc((isSub ? 'MPS-' : 'MP-') + ext) : col.doc();
    const dupQ = ext ? col.where(isSub ? 'mpSubscriptionId' : 'paymentId', '==', ext).limit(1) : null;
    const utm = str(d.utmCampaign, 120).toLowerCase() || null;
    const out = await deps.db.runTransaction(async tx => {
      const [exist, dup] = await Promise.all([tx.get(ref), dupQ ? tx.get(dupQ) : null]);
      if (exist.exists || (dup && !dup.empty)) return { dup: true };
      const cl = await upsertClient(tx, tenantRef, ct, brand, { ...source, channel: `Carga manual · ${isSub ? 'Suscripción' : 'Inscripción'}` }, at, isSub ? 'subCount' : 'enrollCount', deps);
      const common = { brand, contactId: cl.ref.id, customerName: cl.contact ? cl.contact.name : ct.name, utmCampaign: utm, attribution: utm ? { utmCampaign: utm } : null, notes: str(d.notes, 1000), source, createdAt: at, updatedAt: at };
      if (isSub) tx.set(ref, { ...common, planId: str(d.planId, 60) || null, planName: label, priceMinor: price, currency: 'ARS', startDate: date, startMonth: date.slice(0, 7), status: 'active', statusDate: date, cancelledDate: null,
        mpSubscriptionId: ext || null, history: [{ status: 'active', date, at: now.toISOString(), by }] });
      else tx.set(ref, { ...common, courseId: str(d.courseId, 60) || null, courseName: label, courseStart: cs || null, courseEnd: ce || null, amountMinor: price, currency: 'ARS', paidDate: date, paidMonth: date.slice(0, 7),
        paidAt: deps.Timestamp.fromDate(new Date(date + 'T12:00:00-03:00')), status: 'paid', counted: true, paymentId: ext || null, history: [{ status: 'paid', date, at: now.toISOString(), by }] });
      cl.write();
      tx.set(tenantRef.collection('audit').doc(), { at, by: user.uid, byName: by, action: isSub ? 'suscripcion-manual' : 'inscripcion-manual', recordId: ref.id, contactId: cl.ref.id });
      return { id: ref.id, contactId: cl.ref.id, match: cl.contact ? 'existing' : 'new', existingName: cl.contact ? cl.contact.name : null };
    });
    if (out.dup) return fail(409, 'ALREADY_EXISTS', 'Eso ya está cargado (mismo n.º de Mercado Pago).', [{ field: isSub ? 'sub.mpSubscriptionId' : 'enr.paymentId', issue: 'Ya hay una carga con este n.º de Mercado Pago' }]);
    return { status: 201, body: out };
  }

  if (b.kind === 'sub-status' || b.kind === 'enr-status') {
    const isSub = b.kind === 'sub-status', id = str(b.id, 120), status = str(b.status, 20), date = str(b.date, 10) || today;
    if (!id || id.includes('/')) return fail(400, 'BAD_ID', 'Falta cuál.');
    if (!(isSub ? SUB_ST : ENR_ST).includes(status)) return fail(422, 'VALIDATION_FAILED', 'Estado no válido.', [{ field: 'status', issue: 'Estado no válido' }]);
    if (!isDate(date) || date > today) return fail(422, 'VALIDATION_FAILED', 'Revisá la fecha.', [{ field: 'date', issue: 'Revisá la fecha (no puede ser futura)' }]);
    const ref = tenantRef.collection(isSub ? 'subscriptions' : 'enrollments').doc(id);
    const out = await deps.db.runTransaction(async tx => {
      const s = await tx.get(ref); if (!s.exists) return { missing: true };
      const r = s.data(); if (r.status === status) return { same: true };
      tx.update(ref, { status, statusDate: date, updatedAt: at, ...(isSub ? { cancelledDate: status === 'cancelled' ? date : null } : { counted: status === 'paid' }),
        history: [...(r.history || []), { status, date, at: now.toISOString(), by }].slice(-50) });
      tx.set(tenantRef.collection('audit').doc(), { at, by: user.uid, byName: by, action: `${isSub ? 'suscripcion' : 'inscripcion'}-${status}`, recordId: id, contactId: r.contactId || null });
      return { ok: true };
    });
    if (out.missing) return fail(404, 'NOT_FOUND', 'No se encontró.');
    return { status: 200, body: { id, status, unchanged: !!out.same } };
  }
  return fail(400, 'BAD_KIND', 'Tipo de carga desconocido.');
}

module.exports = { handleSale };
