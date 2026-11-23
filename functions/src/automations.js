'use strict';
/* Automatizaciones reales (por ahora una): «Gracias por tu primera compra» de la tienda.
   - Configuración en tenants/{t}/settings/auto-primera-compra (solo la guarda el servidor; Dueño/Admin).
   - Se manda UNA vez por cliente, al día siguiente del retiro (a la hora elegida), si es su primera compra
     en la unidad, si la venta sigue vigente (pagada o retirada), si tiene email y no rechazó promociones.
   - Cada mail lleva un código personal de descuento (un solo uso, vence a los N días): tenants/{t}/coupons/{código}.
   - Lo enviado: tenants/{t}/autoSends/{automatización}_{contacto}. Canje: «Canjear código» (local o web). */
const { randomBytes } = require('node:crypto');
const { sendMail } = require('./mailer');
const { isoLocal } = require('./reminders');

const KEY = 'primera-compra';
const DEFAULT = {
  enabled: false, unit: 'Cafelito Cakes', fromName: 'Cafelito', replyTo: '', sendHour: 10, pct: 10, validDays: 30, prefix: 'GRACIAS', since: '',
  subject: '¡Cafelito tiene un regalo especial para vos! 🎁',
  body: '¡Hola, {{nombre}}!\n\nGracias por elegir **Cafelito Cakes** para ser parte de tu celebración. Esperamos que hayas disfrutado tu torta tanto como nosotros disfrutamos preparándola.\n\nNos encanta acompañarte en esos momentos especiales. Cada torta que hacemos tiene mucho de lo que nos apasiona: sabores únicos, dedicación y amor por los detalles.\n\nY como queremos volver a verte, tenemos un regalo para vos: **¡un 10% de descuento!** Podés usarlo en tu próximo pedido de tortas o para disfrutar de lo que más te guste en **Cafelito Coffee House**.\n\n{{regalo}}\n\n**P. D.: ¿Qué te pareció tu torta?** Nos encantaría conocer tu opinión. ¡Podés responder directamente a este mail!\n\nUn abrazo,\n**El equipo de Cafelito**'
};
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const first = s => { const w = String(s || '').trim().split(/\s+/)[0] || ''; return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); };
const plusDays = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const fmtDate = iso => { const [y, m, d] = iso.split('-'); return `${+d}/${+m}/${y}`; };
const hourLocal = ms => +new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Argentina/Cordoba', hour: '2-digit', hour12: false }).format(new Date(ms)) % 24;
const randCode = prefix => { let s = ''; for (const b of randomBytes(4)) s += ALPHA[b % ALPHA.length]; return `${prefix}-${s}`; };
const str = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';

function cleanCfg(c) {
  const o = { ...DEFAULT, ...(c || {}) };
  return { enabled: !!o.enabled, unit: str(o.unit, 120) || DEFAULT.unit, fromName: str(o.fromName, 60).replace(/[<>"]/g, '') || 'Cafelito', replyTo: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(str(o.replyTo, 200)) ? str(o.replyTo, 200) : '',
    sendHour: Math.min(21, Math.max(8, Math.trunc(+o.sendHour) || 10)), pct: Math.min(90, Math.max(1, Math.trunc(+o.pct) || 10)), validDays: Math.min(365, Math.max(1, Math.trunc(+o.validDays) || 30)),
    prefix: (str(o.prefix, 12).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'GRACIAS'), since: /^\d{4}-\d{2}-\d{2}$/.test(o.since || '') ? o.since : '', subject: str(o.subject, 200) || DEFAULT.subject, body: str(o.body, 6000) || DEFAULT.body };
}
/* Texto → HTML: párrafos por línea en blanco, **negrita**, {{nombre}}, {{regalo}} (recuadro con el código) */
function renderMail(cfg, { name, code, expires }) {
  const nm = first(name) || 'hola';
  const gift = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:6px 0 18px"><tr><td align="center" style="background:#FBEFE6;border-radius:10px;padding:16px">
    <div style="font:700 24px Georgia,serif;color:#8A3B12">${cfg.pct}% de descuento</div>
    <div style="font:15px/22px Arial,sans-serif;color:#2B1D14;margin-top:4px">Mostrá este código en el local o escribilo en las notas de tu pedido web:</div>
    <div style="display:inline-block;margin-top:10px;border:2px dashed #8A3B12;border-radius:8px;padding:6px 16px;font:700 20px monospace;letter-spacing:.08em;color:#8A3B12">${esc(code)}</div>
    <div style="font:12px/18px Arial,sans-serif;color:#7A6A5E;margin-top:8px">Válido hasta el ${esc(fmtDate(expires))} · un solo uso · personal</div></td></tr></table>`;
  const inline = t => esc(t).replace(/\{\{nombre\}\}/g, esc(nm)).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  let usedGift = false;
  const paras = cfg.body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => { if (p === '{{regalo}}') { usedGift = true; return gift; } return `<p style="margin:0 0 14px;font:16px/25px Arial,sans-serif;color:#2B1D14">${inline(p)}</p>`; });
  if (!usedGift) paras.splice(Math.max(1, paras.length - 1), 0, gift);
  const subject = cfg.subject.replace(/\{\{nombre\}\}/g, nm);
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#F6F1EC"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F6F1EC;padding:24px 12px"><tr><td align="center">
   <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;padding:28px 28px 20px"><tr><td>
   <div style="font:700 22px Georgia,serif;color:#2B1D14;margin-bottom:18px">${esc(cfg.fromName)}</div>${paras.join('')}
   <div style="border-top:1px solid #EFE6DE;margin-top:18px;padding-top:12px;font:12px/18px Arial,sans-serif;color:#7A6A5E">Te escribimos porque compraste en ${esc(cfg.unit)}. Si no querés recibir más mails nuestros, respondé «BAJA» y no te escribimos más.</div>
   </td></tr></table></td></tr></table></body></html>`;
  return { subject, html };
}
const fromOf = (cfgMail, name) => { const m = String(cfgMail.from || '').match(/<\s*([^>]+)\s*>/); return `${name} <${m ? m[1] : cfgMail.from}>`; };

async function runAutomations(deps) {
  const now = deps.now(), today = isoLocal(now), hour = hourLocal(now), mail = deps.resend || {}, out = [];
  const tenants = deps.tenantIds || (await deps.db.collection('tenants').get()).docs.map(d => d.id);
  for (const tid of tenants) {
    const T = deps.db.collection('tenants').doc(tid), cs = await T.collection('settings').doc('auto-' + KEY).get();
    if (!cs.exists) continue; const cfg = cleanCfg(cs.data()); if (!cfg.enabled) continue;
    if (hour < cfg.sendHour) { out.push({ tid, skipped: 'todavía no es la hora' }); continue; }
    const orders = (await T.collection('orders').where('brand', '==', cfg.unit).get()).docs.map(d => ({ id: d.id, ...d.data() }));
    const counted = orders.filter(o => o.status === 'paid' || o.status === 'picked_up');
    for (const o of counted) {
      const pick = (o.pickup && o.pickup.date) || (o.status === 'picked_up' && o.statusAt ? isoLocal(o.statusAt.toMillis()) : '');
      if (!pick || pick >= today || (cfg.since && pick < cfg.since) || !o.contactId) continue;            // al día siguiente del retiro
      const mine = counted.filter(x => x.contactId === o.contactId).sort((a, b) => ((a.paidAt && a.paidAt.toMillis()) || 0) - ((b.paidAt && b.paidAt.toMillis()) || 0));
      if (mine[0].id !== o.id) continue;                                                                   // solo la primera compra
      const sendRef = T.collection('autoSends').doc(`${KEY}_${o.contactId}`);
      if ((await sendRef.get()).exists) continue;
      const c = (await T.collection('contacts').doc(o.contactId).get()).data() || {};
      if (!c.email) { await sendRef.set({ at: deps.Timestamp.fromMillis(now), skipped: 'sin email', orderId: o.id, contactId: o.contactId, name: c.name || o.customerName || '' }); out.push({ tid, skipped: 'sin email' }); continue; }
      if (c.marketingConsent && c.marketingConsent.granted === false) { await sendRef.set({ at: deps.Timestamp.fromMillis(now), skipped: 'no acepta promociones', orderId: o.id, contactId: o.contactId, name: c.name || '' }); continue; }
      if (!(mail.apiKey && mail.from)) { out.push({ tid, skipped: 'falta configurar el envío' }); continue; }
      const expires = plusDays(today, cfg.validDays);
      let code; for (let i = 0; i < 8 && !code; i++) { const k = randCode(cfg.prefix); if (!(await T.collection('coupons').doc(k).get()).exists) code = k; }
      const { subject, html } = renderMail(cfg, { name: c.name || o.customerName, code, expires });
      let id; try { id = (await sendMail(deps, { ...mail, from: fromOf(mail, cfg.fromName) }, { to: c.email, subject, html, replyTo: cfg.replyTo || undefined, idempotencyKey: `${tid}-${KEY}-${o.contactId}` })).id; }
      catch (e) { out.push({ tid, error: e.message }); continue; }
      const at = deps.Timestamp.fromMillis(now), b = deps.db.batch();
      b.set(T.collection('coupons').doc(code), { code, automation: KEY, contactId: o.contactId, name: c.name || o.customerName || '', pct: cfg.pct, createdAt: at, sentDate: today, expires, status: 'active', usedAt: null, usedWhere: null, saleAmountMinor: null, orderId: o.id });
      b.set(sendRef, { at, to: c.email, subject, code, expires, orderId: o.id, contactId: o.contactId, name: c.name || '', providerId: id || null });
      await b.commit(); out.push({ tid, sent: c.email, code });
    }
  }
  return out;
}

/* Pantalla (POST /api/v1/crm/manual): guardar configuración, prueba a uno mismo, consultar y canjear códigos */
async function handleAuto(b, { deps, user, by, tenantRef, role }) {
  const fail = (status, code, message) => ({ status, body: { error: { code, message } } });
  const now = deps.now ? deps.now() : new Date(), at = deps.Timestamp.fromDate(now), today = isoLocal(now.getTime());
  if (b.kind === 'auto-save') {
    if (!['Dueño', 'Admin'].includes(role)) return fail(403, 'FORBIDDEN', 'Solo Dueño o Admin pueden cambiar las automatizaciones.');
    const cfg = cleanCfg(b.config); const ref = tenantRef.collection('settings').doc('auto-' + KEY), prev = await ref.get();
    if (cfg.enabled && !cfg.since) cfg.since = (prev.exists && prev.data().since) || today;
    await ref.set({ ...cfg, updatedAt: at, updatedBy: user.uid, updatedByName: by });
    await tenantRef.collection('audit').doc().set({ at, by: user.uid, byName: by, action: 'automatizacion-guardada', automation: KEY, enabled: cfg.enabled });
    return { status: 200, body: { config: cfg } };
  }
  if (b.kind === 'auto-test') {
    const mail = deps.resend || {}; if (!(mail.apiKey && mail.from)) return fail(409, 'NO_MAIL', 'Todavía no está configurado el envío de mails.');
    if (!user.email) return fail(400, 'NO_EMAIL', 'Tu usuario no tiene email.');
    const cfg = cleanCfg(b.config), { subject, html } = renderMail(cfg, { name: by, code: `${cfg.prefix}-PRUEBA`, expires: plusDays(today, cfg.validDays) });
    try { await sendMail(deps, { ...mail, from: fromOf(mail, cfg.fromName) }, { to: user.email, subject: '[Prueba] ' + subject, html, replyTo: cfg.replyTo || undefined }); }
    catch (e) { return fail(502, 'SEND_FAILED', 'No se pudo enviar: ' + e.message); }
    return { status: 200, body: { sentTo: user.email } };
  }
  if (b.kind === 'coupon-check' || b.kind === 'coupon-redeem') {
    const code = str(b.code, 40).toUpperCase().replace(/\s+/g, ''); if (!/^[A-Z0-9]+-[A-Z0-9]+$/.test(code)) return fail(422, 'BAD_CODE', 'Ese código no tiene el formato correcto (ej.: GRACIAS-7KQ4).');
    const ref = tenantRef.collection('coupons').doc(code);
    const out = await deps.db.runTransaction(async tx => {
      const s = await tx.get(ref); if (!s.exists) return { state: 'inexistente' };
      const c = s.data(); const state = c.status === 'used' ? 'usado' : c.expires < today ? 'vencido' : 'valido';
      if (b.kind === 'coupon-redeem' && state === 'valido') {
        const amt = Math.trunc(+b.amountMinor) > 0 ? Math.trunc(+b.amountMinor) : null, where = b.where === 'web' ? 'web' : 'local';
        tx.update(ref, { status: 'used', usedAt: at, usedDate: today, usedWhere: where, saleAmountMinor: amt, usedBy: by });
        tx.set(tenantRef.collection('audit').doc(), { at, by: user.uid, byName: by, action: 'codigo-canjeado', code, where });
        return { state: 'canjeado', coupon: { ...c, usedWhere: where, saleAmountMinor: amt } };
      }
      return { state, coupon: c };
    });
    const c = out.coupon || {};
    return { status: 200, body: { code, state: out.state, name: c.name || null, pct: c.pct || null, expires: c.expires || null, usedDate: c.usedDate || null, usedWhere: c.usedWhere || null } };
  }
  return fail(400, 'BAD_KIND', 'Acción desconocida.');
}

module.exports = { runAutomations, handleAuto, renderMail, cleanCfg, DEFAULT, KEY };
