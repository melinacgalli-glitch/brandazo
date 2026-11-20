'use strict';
/* Recordatorios de seguimiento por mail (CRM · Cafelito Eventos).
   Todos los días a las 8 (Córdoba): a cada responsable, un mail con los seguimientos de hoy y los vencidos
   de cotizaciones abiertas, con «qué hay que hacer», botón de WhatsApp y enlace a la ficha.
   - Responsable = campo `owner` (nombre) → miembro con ese nombre o email. Sin responsable → Dueño/Admin.
   - Un solo mail por persona y día (tenants/{t}/reminders/{fecha}_{hash}), aunque la función se reintente.
   - Envío con Resend (secreto RESEND = {"apiKey","from"}). Sin configurar: no manda nada y lo deja anotado. */
const crypto = require('node:crypto');
const { sendMail } = require('./mailer');
const OPEN = ['nueva-cotizacion', 'contactado', 'en-negociacion'];
const STAGE = { 'nueva-cotizacion': 'Nueva cotización', contactado: 'Contactado', 'en-negociacion': 'En negociación' };
const TZ_OFFSET_H = 3; // Córdoba: UTC−3 todo el año
const APP = 'https://www.brandazo.com.ar';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dLocal = ms => new Date(ms - TZ_OFFSET_H * 36e5); // fecha «de reloj» en Córdoba (usar getUTC*)
const isoLocal = ms => dLocal(ms).toISOString().slice(0, 10);
const fmtDay = iso => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return `${d} ${MES[m - 1]}`; };
const money = m => m == null ? '' : '$ ' + Math.round(m / 100).toLocaleString('es-AR');
const amount = o => (o.won && o.won.amountMinor) || (o.proposal && o.proposal.amountMinor) || (o.estimate && o.estimate.brandazoSubtotalMinor) || null;
const parseCfg = raw => { try { const j = JSON.parse(raw || '{}'); return j && typeof j === 'object' ? j : {}; } catch { return {}; } };

function emailHtml({ who, company, items, today }) {
  const late = items.filter(i => i.due < today).length;
  const rows = items.map(i => `
    <tr><td style="padding:16px 0;border-top:1px solid #E4E4E7">
      <div style="font:600 16px/22px Arial,sans-serif;color:#0E0E10">${esc(i.name)}</div>
      <div style="font:14px/20px Arial,sans-serif;color:#5C5C66">${esc(i.event)} · ${esc(i.stage)}${i.amount ? ' · ' + esc(i.amount) : ''}</div>
      <div style="margin:8px 0;font:14px/20px Arial,sans-serif;color:#0E0E10">${i.due < today ? `<span style="color:#C0291C;font-weight:600">Vencido desde el ${esc(fmtDay(i.due))}</span>` : '<span style="color:#C2005F;font-weight:600">Para hoy</span>'}${i.action ? ` · <b>Qué hacer:</b> ${esc(i.action)}` : ' · <span style="color:#5C5C66">Sin indicación: revisá la ficha</span>'}</div>
      ${i.lastNote ? `<div style="font:13px/18px Arial,sans-serif;color:#5C5C66">Último registro: ${esc(i.lastNote)}</div>` : ''}
      <div style="margin-top:10px">${i.wa ? `<a href="${esc(i.wa)}" style="display:inline-block;background:#FF2D87;color:#0E0E10;text-decoration:none;font:600 14px Arial,sans-serif;padding:9px 14px;border-radius:8px;margin-right:8px">Escribir por WhatsApp</a>` : ''}<a href="${esc(i.link)}" style="display:inline-block;border:1px solid #0E0E10;color:#0E0E10;text-decoration:none;font:600 14px Arial,sans-serif;padding:8px 14px;border-radius:8px">Abrir en Brandazo</a></div>
    </td></tr>`).join('');
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F4F4F5"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F4F5;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;padding:24px">
   <tr><td style="font:800 22px Arial,sans-serif;color:#0E0E10"><span style="color:#FF2D87">/</span>brandazo</td></tr>
   <tr><td style="padding-top:16px;font:600 20px/26px Arial,sans-serif;color:#0E0E10">Hola ${esc(who)}, ${items.length === 1 ? 'hoy tenés 1 seguimiento' : `hoy tenés ${items.length} seguimientos`}${late ? ` (${late} vencido${late > 1 ? 's' : ''})` : ''}</td></tr>
   <tr><td style="padding:4px 0 8px;font:14px/20px Arial,sans-serif;color:#5C5C66">${esc(company)} · CRM · Cafelito Eventos</td></tr>
   ${rows}
   <tr><td style="padding-top:16px;border-top:1px solid #E4E4E7;font:12px/18px Arial,sans-serif;color:#5C5C66">Te llega porque sos responsable de estas cotizaciones en Brandazo. Para cambiar la fecha o lo que hay que hacer, abrí la ficha y guardá el nuevo seguimiento.</td></tr>
  </table></td></tr></table></body></html>`;
}

async function sendReminders(deps) {
  const now = deps.now(), today = isoLocal(now);
  const endOfDay = Date.parse(today + 'T23:59:59Z') + TZ_OFFSET_H * 36e5;
  const cfg = deps.resend || {}, configured = !!(cfg.apiKey && cfg.from);
  const out = [];
  const tenants = deps.tenantIds || (await deps.db.collection('tenants').get()).docs.map(d => d.id);
  for (const tid of tenants) {
    const T = `tenants/${tid}`;
    const ops = (await deps.db.collection(`${T}/opportunities`).where('nextFollowUpAt', '<=', deps.Timestamp.fromMillis(endOfDay)).get()).docs
      .map(d => ({ id: d.id, ...d.data() })).filter(o => OPEN.includes(o.stage));
    if (!ops.length) continue;
    const [tSnap, memSnap] = await Promise.all([deps.db.doc(T).get(), deps.db.collection(`${T}/members`).get()]);
    const company = (tSnap.exists && tSnap.data().name) || tid;
    const members = memSnap.docs.map(d => d.data()).filter(m => m.email);
    const admins = members.filter(m => ['Dueño', 'Admin'].includes(m.role));
    const byEmail = new Map();
    for (const o of ops) {
      const own = members.filter(m => o.owner && (m.name === o.owner || m.email === String(o.owner).toLowerCase()));
      for (const m of (own.length ? own : admins)) { if (!byEmail.has(m.email)) byEmail.set(m.email, { m, ops: [] }); byEmail.get(m.email).ops.push(o); }
    }
    for (const [email, { m, ops: list }] of byEmail) {
      const key = `${today}_${crypto.createHash('sha256').update(email).digest('hex').slice(0, 16)}`;
      const ref = deps.db.doc(`${T}/reminders/${key}`);
      if ((await ref.get()).exists) { out.push({ tid, email, skipped: 'ya enviado hoy' }); continue; }
      const items = [];
      for (const o of list.sort((a, b) => a.nextFollowUpAt.toMillis() - b.nextFollowUpAt.toMillis())) {
        const c = o.contactId ? (await deps.db.doc(`${T}/contacts/${o.contactId}`).get()).data() || {} : {};
        const last = (await deps.db.collection(`${T}/activities`).where('opportunityId', '==', o.id).get()).docs.map(d => d.data()).filter(a => a.text).sort((a, b) => (b.at ? b.at.toMillis() : 0) - (a.at ? a.at.toMillis() : 0))[0];
        const digits = String(c.phoneE164 || '').replace(/\D/g, ''), first = String(c.name || '').split(' ')[0];
        items.push({ name: c.name || (o.title || '').split(' · ')[1] || 'Sin nombre', event: `${(o.event && o.event.type) || 'Evento'} · ${o.event && o.event.date ? fmtDay(o.event.date) : 'sin fecha'}`,
          stage: STAGE[o.stage] || o.stage, amount: money(amount(o)), due: isoLocal(o.nextFollowUpAt.toMillis()), action: o.nextAction || '', lastNote: last ? String(last.text).slice(0, 160) : '',
          wa: digits ? `https://wa.me/${digits}?text=${encodeURIComponent(`Hola ${first}, te escribo de ${o.brand || 'Cafelito'} por el presupuesto del evento.`)}` : '',
          link: `${APP}/#/app/crm/eventos?t=${encodeURIComponent(tid)}&op=${encodeURIComponent(o.id)}` });
      }
      const late = items.filter(i => i.due < today).length;
      const subject = `${items.length === 1 ? 'Hoy tenés 1 seguimiento' : `Hoy tenés ${items.length} seguimientos`}${late ? ` (${late} vencido${late > 1 ? 's' : ''})` : ''} · ${company}`;
      const html = emailHtml({ who: (m.name || email).split(' ')[0], company, items, today });
      if (!configured) { out.push({ tid, email, items: items.length, skipped: 'falta configurar el envío' }); continue; }
      let sentId; try { sentId = (await sendMail(deps, cfg, { to: email, subject, html, idempotencyKey: `${tid}-${key}` })).id; }
      catch (e) { out.push({ tid, email, error: e.message.replace(/^(Resend|SendGrid) /, '') }); continue; }

      await ref.set({ at: deps.Timestamp.fromMillis(now), to: email, count: items.length, opportunities: items.length, providerId: sentId || null });
      out.push({ tid, email, sent: items.length });
    }
  }
  return out;
}

module.exports = { sendReminders, emailHtml, parseCfg, isoLocal };
