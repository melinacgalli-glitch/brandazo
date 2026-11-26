'use strict';
/* Envío de un mail a un grupo de personas elegido en el CRM (un segmento).
   - Pantalla (POST /api/v1/crm/manual): «mail-audience» (a quién le llega), «mail-test» (prueba a uno mismo),
     «mail-send» (envía ahora o programa), «mail-cancel» (cancela uno programado).
   - Solo a quienes aceptaron promociones (marketingConsent.granted === true) y tienen email.
   - Antes de enviar tiene que haber una prueba de ESE contenido exacto (tenants/{t}/mailTests/{huella}).
   - Solo Dueño o Admin envían. Cualquier integrante puede armarlo y mandarse la prueba.
   - Lo enviado: tenants/{t}/mailings/{id} (el envío) y tenants/{t}/mailSends/{id}_{contacto} (uno por persona:
     nunca se manda dos veces lo mismo a la misma persona). Códigos de regalo: tenants/{t}/coupons (mismo canje).
   - Cada mail lleva «No quiero recibir más mails» (GET/POST /api/v1/baja): deja marketingConsent.granted = false.
   - Tope diario (plan gratis de Resend): DAILY_MAX mails por día; lo que no entra sigue en la próxima vuelta. */
const { createHash, createHmac, timingSafeEqual } = require('node:crypto');
const { sendMail } = require('./mailer');
const { isoLocal } = require('./reminders');
const { renderMail, brandAssets, DEFAULT } = require('./automations');

const DAILY_MAX = 100, MAX_PEOPLE = 3000;
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const str = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T12:00:00Z'));
const isEmail = s => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s || '');
const fail = (status, code, message, details) => ({ status, body: { error: { code, message, ...(details ? { details } : {}) } } });
const fromOf = (mail, name) => { const m = String(mail.from || '').match(/<\s*([^>]+)\s*>/); return `${name} <${m ? m[1] : mail.from}>`; };
const randCode = prefix => { let s = ''; for (const b of require('node:crypto').randomBytes(4)) s += ALPHA[b % ALPHA.length]; return `${prefix}-${s}`; };
const SITE = 'https://www.brandazo.com.ar';

/* Contenido del mail, limpio. Devuelve {draft} o {details} con los errores para la pantalla. */
function cleanDraft(d, today) {
  d = d && typeof d === 'object' ? d : {}; const g = d.gift && typeof d.gift === 'object' ? d.gift : {}, details = [];
  const draft = { subject: str(d.subject, 200), body: str(d.body, 6000), fromName: str(d.fromName, 60).replace(/[<>"]/g, '') || 'Cafelito',
    replyTo: str(d.replyTo, 200), campaign: str(d.campaign, 80),
    gift: g.on ? { on: true, pct: Math.trunc(+g.pct), expires: str(g.expires, 10), prefix: (str(g.prefix, 12).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'REGALO') } : { on: false } };
  if (!draft.subject) details.push({ field: 'subject', issue: 'Escribí el asunto' });
  if (!draft.body) details.push({ field: 'body', issue: 'Escribí el texto del mail' });
  if (draft.replyTo && !isEmail(draft.replyTo)) details.push({ field: 'replyTo', issue: 'El email para responder no es válido' });
  if (draft.gift.on) {
    if (!(draft.gift.pct >= 1 && draft.gift.pct <= 90)) details.push({ field: 'gift.pct', issue: 'El descuento va de 1% a 90%' });
    if (!isDate(draft.gift.expires) || draft.gift.expires < today) details.push({ field: 'gift.expires', issue: 'Elegí hasta cuándo vale (hoy o después)' });
  }
  return details.length ? { details } : { draft };
}
const hashOf = draft => createHash('sha256').update(JSON.stringify([draft.subject, draft.body, draft.fromName, draft.replyTo, draft.gift])).digest('hex').slice(0, 40);

/* Enlace de baja firmado (no se puede armar para otra persona) */
const unsubKey = mail => createHash('sha256').update('baja:' + String(mail.apiKey || '')).digest();
const unsubSig = (mail, tid, cid) => createHmac('sha256', unsubKey(mail)).update(`${tid}.${cid}`).digest('hex').slice(0, 32);
const unsubUrl = (mail, tid, cid) => `${SITE}/api/v1/baja?t=${encodeURIComponent(tid)}&c=${encodeURIComponent(cid)}&s=${unsubSig(mail, tid, cid)}`;

/* ¿A quién le llega? */
async function audience(T, ids) {
  const out = { total: ids.length, ok: [], noConsent: [], noEmail: [], unsub: [], missing: [] };
  for (let i = 0; i < ids.length; i += 300) {
    const snaps = await T.firestore.getAll(...ids.slice(i, i + 300).map(id => T.collection('contacts').doc(id)));
    snaps.forEach(s => { if (!s.exists) { out.missing.push({ id: s.id, name: '' }); return; } const c = s.data(), p = { id: s.id, name: c.name || '' };
      const mc = c.marketingConsent || null;
      if (mc && mc.granted === false) out.unsub.push(p); else if (!(mc && mc.granted === true)) out.noConsent.push(p); else if (!isEmail(c.email)) out.noEmail.push(p); else out.ok.push(p); });
  }
  return out;
}
const reasonOf = (c) => { const mc = c.marketingConsent || null; if (mc && mc.granted === false) return 'pidió no recibir más'; if (!(mc && mc.granted === true)) return 'no aceptó promociones'; if (!isEmail(c.email)) return 'sin email'; return ''; };

function render(draft, { name, code, logoUrl, web, unsub }) {
  const cfg = { ...DEFAULT, fromName: draft.fromName, subject: draft.subject, body: draft.body, pct: draft.gift.on ? draft.gift.pct : 0 };
  return renderMail(cfg, { name, code: draft.gift.on ? code : '', expires: draft.gift.on ? draft.gift.expires : '', logoUrl, web, unsubUrl: unsub,
    reason: `Te llega este mail porque aceptaste recibir novedades de ${draft.fromName}.` });
}

/* Manda lo que falta de un envío (ahora o desde el programador). Nunca dos veces a la misma persona. */
async function processMailing(deps, tid, ref) {
  const T = deps.db.collection('tenants').doc(tid), mail = deps.resend || {}, now = deps.now ? (typeof deps.now() === 'number' ? deps.now() : deps.now().getTime()) : Date.now();
  const today = isoLocal(now), at = deps.Timestamp.fromMillis(now);
  const snap = await ref.get(); if (!snap.exists) return { skipped: 'no existe' };
  const m = snap.data(); if (!['scheduled', 'sending'].includes(m.status)) return { skipped: m.status };
  if (m.sendAtMs > now) return { skipped: 'todavía no es la hora' };
  if (!(mail.apiKey && mail.from)) return { skipped: 'falta configurar el envío' };
  if (m.status === 'scheduled') await ref.update({ status: 'sending', startedAt: at });
  const usedToday = (await T.collection('mailSends').where('day', '==', today).where('status', '==', 'sent').get()).size;
  let room = Math.max(0, DAILY_MAX - usedToday), sent = 0;
  const assets = await brandAssets(T);
  for (const cid of m.contactIds) {
    const sref = T.collection('mailSends').doc(`${ref.id}_${cid}`);
    if ((await sref.get()).exists) continue;
    const cs = await T.collection('contacts').doc(cid).get(), c = cs.exists ? cs.data() : {};
    const why = cs.exists ? reasonOf(c) : 'ya no existe';
    const base = { mailingId: ref.id, contactId: cid, name: c.name || '', subject: m.draft.subject, at, day: today };
    if (why) { await sref.create({ ...base, status: 'skipped', reason: why }).catch(() => {}); continue; }
    if (room <= 0) break;                                     // tope del día: sigue en la próxima vuelta
    try { await sref.create({ ...base, status: 'sending' }); } catch { continue; } // otra vuelta ya la tomó
    let code = null;
    if (m.draft.gift.on) for (let i = 0; i < 8 && !code; i++) { const k = randCode(m.draft.gift.prefix); if (!(await T.collection('coupons').doc(k).get()).exists) code = k; }
    const u = unsubUrl(mail, tid, cid), { subject, html } = render(m.draft, { name: c.name, code, ...assets, unsub: u });
    try {
      const r = await sendMail(deps, { ...mail, from: fromOf(mail, m.draft.fromName) }, { to: c.email, subject, html, replyTo: m.draft.replyTo || undefined, idempotencyKey: `${tid}-mailing-${ref.id}-${cid}`,
        headers: { 'List-Unsubscribe': `<${u}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } });
      const b = deps.db.batch();
      if (code) b.set(T.collection('coupons').doc(code), { code, automation: 'envio', mailingId: ref.id, campaign: m.draft.campaign || null, contactId: cid, name: c.name || '', pct: m.draft.gift.pct, createdAt: at, sentDate: today, expires: m.draft.gift.expires, status: 'active', usedAt: null, usedWhere: null, saleAmountMinor: null, orderId: null });
      b.set(sref, { ...base, status: 'sent', to: c.email, code, providerId: r.id || null });
      await b.commit(); sent++; room--;
    } catch (e) { await sref.set({ ...base, status: 'failed', error: String(e.message).slice(0, 300) }); }
  }
  const all = (await T.collection('mailSends').where('mailingId', '==', ref.id).get()).docs.map(d => d.data());
  const stats = { sent: all.filter(x => x.status === 'sent').length, failed: all.filter(x => x.status === 'failed').length, skipped: all.filter(x => x.status === 'skipped').length };
  const done = all.length >= m.contactIds.length && !all.some(x => x.status === 'sending');
  await ref.update({ stats, status: done ? 'sent' : 'sending', ...(done ? { finishedAt: at } : {}), ...(!done && room <= 0 ? { waiting: 'tope diario' } : { waiting: null }) });
  return { sent, stats, done };
}

/* Programador: envíos programados cuya hora llegó, y los que quedaron a medias (tope diario) */
async function runMailings(deps) {
  const now = typeof deps.now() === 'number' ? deps.now() : deps.now().getTime(), out = [];
  const tenants = deps.tenantIds || (await deps.db.collection('tenants').get()).docs.map(d => d.id);
  for (const tid of tenants) {
    const q = await deps.db.collection('tenants').doc(tid).collection('mailings').where('status', 'in', ['scheduled', 'sending']).get();
    for (const d of q.docs) if ((d.data().sendAtMs || 0) <= now) out.push({ tid, id: d.id, ...(await processMailing(deps, tid, d.ref)) });
  }
  return out;
}

/* Pantalla */
async function handleMailing(b, { deps, user, by, tenantRef, role }) {
  const now = deps.now ? (typeof deps.now() === 'number' ? deps.now() : deps.now().getTime()) : Date.now(), today = isoLocal(now), at = deps.Timestamp.fromMillis(now);
  const mail = deps.resend || {};
  const ids = Array.isArray(b.contactIds) ? [...new Set(b.contactIds.filter(x => typeof x === 'string' && x && !x.includes('/') && x.length < 200))] : [];
  if (b.kind === 'mail-audience') {
    if (!ids.length) return fail(422, 'NO_PEOPLE', 'Elegí al menos una persona.'); if (ids.length > MAX_PEOPLE) return fail(422, 'TOO_MANY', `Hasta ${MAX_PEOPLE} personas por envío.`);
    const a = await audience(tenantRef, ids); return { status: 200, body: { ...a, dailyMax: DAILY_MAX } };
  }
  if (b.kind === 'mail-cancel') {
    if (!['Dueño', 'Admin'].includes(role)) return fail(403, 'FORBIDDEN', 'Solo Dueño o Admin pueden cancelar un envío.');
    const ref = tenantRef.collection('mailings').doc(str(b.id, 100) || '_'); const s = await ref.get();
    if (!s.exists) return fail(404, 'NOT_FOUND', 'No existe ese envío.'); if (s.data().status !== 'scheduled') return fail(409, 'NOT_SCHEDULED', 'Solo se puede cancelar un envío que todavía no salió.');
    await ref.update({ status: 'cancelled', cancelledAt: at, cancelledBy: by });
    await tenantRef.collection('audit').doc().set({ at, by: user.uid, byName: by, action: 'envio-cancelado', mailingId: ref.id });
    return { status: 200, body: { id: ref.id, status: 'cancelled' } };
  }
  const c = cleanDraft(b.draft, today); if (c.details) return fail(422, 'VALIDATION', 'Revisá los datos del mail.', c.details);
  const draft = c.draft, hash = hashOf(draft);
  if (b.kind === 'mail-test') {
    if (!(mail.apiKey && mail.from)) return fail(409, 'NO_MAIL', 'Todavía no está configurado el envío de mails.');
    if (!user.email) return fail(400, 'NO_EMAIL', 'Tu usuario no tiene email.');
    const { subject, html } = render(draft, { name: by, code: `${draft.gift.prefix || 'REGALO'}-MUESTRA`, ...(await brandAssets(tenantRef)), unsub: '#' });
    try { await sendMail(deps, { ...mail, from: fromOf(mail, draft.fromName) }, { to: user.email, subject: '[Prueba] ' + subject, html, replyTo: draft.replyTo || undefined }); }
    catch (e) { return fail(502, 'SEND_FAILED', 'No se pudo enviar la prueba: ' + e.message); }
    await tenantRef.collection('mailTests').doc(hash).set({ at, atMs: now, by: user.uid, byName: by, to: user.email });
    return { status: 200, body: { sentTo: user.email, testHash: hash } };
  }
  if (b.kind === 'mail-send') {
    if (!['Dueño', 'Admin'].includes(role)) return fail(403, 'FORBIDDEN', 'Solo Dueño o Admin pueden enviar. Podés dejarlo armado y avisarles.');
    if (!ids.length) return fail(422, 'NO_PEOPLE', 'Elegí al menos una persona.'); if (ids.length > MAX_PEOPLE) return fail(422, 'TOO_MANY', `Hasta ${MAX_PEOPLE} personas por envío.`);
    const t = await tenantRef.collection('mailTests').doc(hash).get();
    if (!t.exists || now - (t.data().atMs || 0) > 14 * 864e5) return fail(409, 'NEEDS_TEST', 'Primero mandate una prueba de este mail (si cambiaste el texto, hace falta otra).');
    const rid = str(b.requestId, 60); if (!/^[A-Za-z0-9_-]{8,60}$/.test(rid)) return fail(400, 'BAD_REQUEST_ID', 'Falta el identificador del envío.');
    let sendAtMs = now; if (b.sendAt) { const ms = Date.parse(b.sendAt); if (isNaN(ms)) return fail(422, 'VALIDATION', 'Revisá el día y la hora.', [{ field: 'sendAt', issue: 'Fecha u hora inválida' }]);
      if (ms < now - 60e3) return fail(422, 'VALIDATION', 'Revisá el día y la hora.', [{ field: 'sendAt', issue: 'Elegí un momento que no haya pasado' }]); sendAtMs = Math.max(ms, now); }
    if (draft.gift.on && draft.gift.expires < isoLocal(sendAtMs)) return fail(422, 'VALIDATION', 'El regalo vencería antes de que llegue el mail.', [{ field: 'gift.expires', issue: 'Tiene que valer al menos hasta el día del envío' }]);
    const a = await audience(tenantRef, ids); if (!a.ok.length) return fail(422, 'NO_RECIPIENTS', 'Ninguna de las personas elegidas puede recibirlo (tienen que aceptar promociones y tener email).');
    const ref = tenantRef.collection('mailings').doc(rid);
    const created = await deps.db.runTransaction(async tx => { const s = await tx.get(ref); if (s.exists) return false;
      tx.set(ref, { status: 'scheduled', draft, testHash: hash, contactIds: ids, segmentName: str(b.segmentName, 60) || null, recipients: a.ok.length, excluded: ids.length - a.ok.length,
        sendAtMs, sendAt: deps.Timestamp.fromMillis(sendAtMs), createdAt: at, createdBy: user.uid, createdByName: by, stats: { sent: 0, failed: 0, skipped: 0 } });
      tx.set(tenantRef.collection('audit').doc(), { at, by: user.uid, byName: by, action: 'envio-programado', mailingId: rid, recipients: a.ok.length, sendAtMs });
      return true; });
    let r = null; if (created && sendAtMs <= now + 60e3) r = await processMailing({ ...deps, now: () => now }, tenantRef.id, ref);
    const s = (await ref.get()).data();
    return { status: created ? 201 : 200, body: { id: rid, status: s.status, recipients: s.recipients, stats: s.stats, sendAtMs: s.sendAtMs, duplicate: !created, ...(r && r.done === false && s.waiting ? { waiting: s.waiting } : {}) } };
  }
  return fail(400, 'BAD_KIND', 'Acción desconocida.');
}

/* «No quiero recibir más mails» (link del mail o botón de baja del programa de correo) */
const page = (title, msg) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#F8F4F0;font:16px/1.5 'Helvetica Neue',Arial,sans-serif;color:#3B2E2A"><div style="max-width:460px;margin:12vh auto;padding:32px 28px;background:#fff;border-radius:18px;text-align:center">
<h1 style="font:italic 600 30px Georgia,serif;color:#2F5D45;margin:0 0 12px">${title}</h1><p style="margin:0">${msg}</p></div></body></html>`;
async function handleUnsubscribe(req, deps) {
  const q = req.query || {}, tid = str(q.t, 100), cid = str(q.c, 200), sig = str(q.s, 64), mail = deps.resend || {};
  const bad = { status: 400, html: page('Enlace inválido', 'Este enlace no es válido. Si no querés recibir más mails, respondé uno con la palabra «BAJA».') };
  if (!tid || !cid || tid.includes('/') || cid.includes('/') || !/^[a-f0-9]{32}$/.test(sig) || !mail.apiKey) return bad;
  const want = unsubSig(mail, tid, cid); if (!timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return bad;
  const T = deps.db.collection('tenants').doc(tid), ref = T.collection('contacts').doc(cid), s = await ref.get();
  if (!s.exists) return bad;
  if (req.method === 'GET' && !q.ok) {   // confirmación con un botón (los antivirus que abren links no dan de baja a nadie)
    return { status: 200, html: page('¿No querés recibir más mails?', `Tocá el botón y no te mandamos más novedades ni promociones por mail.<br><br><form method="post" action="?t=${encodeURIComponent(tid)}&c=${encodeURIComponent(cid)}&s=${sig}&ok=1"><button style="background:#A4675F;color:#fff;border:0;border-radius:999px;padding:12px 24px;font:600 15px Arial,sans-serif;cursor:pointer">No quiero recibir más mails</button></form>`) };
  }
  const at = deps.Timestamp.fromMillis(Date.now());
  await ref.update({ marketingConsent: { granted: false, source: 'baja-mail', text: 'Pidió no recibir más mails (link del mail)', capturedAt: at }, updatedAt: at });
  await T.collection('audit').doc().set({ at, by: 'contacto', byName: s.data().name || '', action: 'baja-mails', contactId: cid });
  return { status: 200, html: page('Listo', 'No te vamos a mandar más mails con novedades ni promociones. ¡Gracias!') };
}

module.exports = { handleMailing, runMailings, processMailing, handleUnsubscribe, cleanDraft, hashOf, unsubUrl, DAILY_MAX };
