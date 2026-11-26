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
/* Texto → HTML: párrafos por línea en blanco, **negrita**, {{nombre}}, {{regalo}} (cupón con el código).
   Diseño con la identidad de la marca (logo y web de Marca → Cafelito, color terracota del logo). */
// Paleta de cafelito.com.ar: crema, terracota (logo y botones) y verde (títulos en cursiva)
const C = { bg: '#F8F4F0', card: '#FFFFFF', ink: '#3B2E2A', soft: '#7D6A64', accent: '#A4675F', accentDark: '#8A524B', green: '#2F5D45', tint: '#F6ECE7', line: '#EADFD8' };
function renderMail(cfg, { name, code, expires, logoUrl, web, unsubUrl, reason }) {
  const nm = first(name) || 'hola', serif = "'Cormorant Garamond',Georgia,'Times New Roman',serif", sans = "'Jost','Helvetica Neue',Helvetica,Arial,sans-serif";
  const ig = cfg.instagram || 'cafelito.co';
  const site = web ? (/^https?:\/\//.test(web) ? web : 'https://' + web) : '';
  const gift = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 22px"><tr><td style="background:${C.tint};border:2px dashed ${C.accent};border-radius:16px;padding:22px 18px" align="center">
    <div style="display:inline-block;background:${C.accent};color:#FFFFFF;border-radius:999px;padding:5px 14px;font:600 11px ${sans};letter-spacing:.16em;text-transform:uppercase">Tu regalo</div>
    <div style="font:italic 600 46px/50px ${serif};color:${C.green};margin:10px 0 2px">${cfg.pct}% off</div>
    <div style="font:15px/22px ${sans};color:${C.ink}">en tu próxima compra en Cafelito</div>
    <div style="margin:16px auto 6px;display:inline-block;background:${C.card};border-radius:10px;padding:10px 22px;font:700 24px/30px 'Courier New',monospace;letter-spacing:.12em;color:${C.ink};border:1px solid ${C.line}">${esc(code)}</div>
    <div style="font:13px/20px ${sans};color:${C.soft};margin-top:6px">Válido hasta el <b style="color:${C.ink}">${esc(fmtDate(expires))}</b></div>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:14px auto 0"><tr>
      <td style="font:13px/18px ${sans};color:${C.ink};padding:0 10px;border-right:1px solid ${C.line}"><b>En el local</b><br>mostralo en caja</td>
      <td style="font:13px/18px ${sans};color:${C.ink};padding:0 10px"><b>En la web</b><br>escribilo al comprar</td></tr></table>
  </td></tr></table>`;
  const pill = (href, label, solid) => `<tr><td align="center" style="padding:5px 0"><a href="${esc(href)}" style="display:inline-block;white-space:nowrap;min-width:220px;text-align:center;padding:13px 26px;border-radius:999px;font:600 15px ${sans};text-decoration:none;${solid ? `background:${C.accent};color:#FFFFFF;border:1.5px solid ${C.accent}` : `background:transparent;color:${C.green};border:1.5px solid ${C.green}`}">${label}</a></td></tr>`;
  const CTA = site ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:-4px 0 26px"><tr><td align="center"><table role="presentation" cellspacing="0" cellpadding="0">${pill(site, 'Hacé tu próximo pedido', true)}${pill('https://www.instagram.com/' + ig, 'Seguinos en Instagram', false)}</table></td></tr></table>` : '';
  const inline = t => esc(t).replace(/\{\{nombre\}\}/g, esc(nm)).replace(/\*\*(.+?)\*\*/g, `<b style="color:${C.ink}">$1</b>`).replace(/\n/g, '<br>');
  let usedGift = false;
  const blocks = cfg.body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const paras = blocks.map((p, k) => {
    if (p === '{{regalo}}') { usedGift = true; return code ? gift + CTA : CTA; }
    if (k === 0 && p.length < 60) return `<h1 style="margin:0 0 18px;font:italic 600 38px/42px ${serif};color:${C.green}">${inline(p)}</h1>`;
    if (/^\*\*P\. ?D\./.test(p)) return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 18px"><tr><td style="border-left:3px solid ${C.accent};padding:4px 0 4px 14px;font:16px/25px ${sans};color:${C.ink}">${inline(p)}</td></tr></table>`;
    return `<p style="margin:0 0 16px;font:16px/26px ${sans};color:${C.ink}">${inline(p)}</p>`;
  });
  if (!usedGift) paras.splice(Math.max(1, paras.length - 1), 0, code ? gift + CTA : CTA);
  const cta = '';
  const _cta = site ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:4px 0 22px"><tr><td style="background:${C.accent};border-radius:999px"><a href="${esc(site)}" style="display:inline-block;padding:13px 26px;font:700 15px ${sans};color:#FFFFFF;text-decoration:none">Hacé tu próximo pedido</a></td></tr></table>` : '';
  const head = logoUrl ? `<img src="${esc(logoUrl)}" width="180" alt="${esc(cfg.fromName)}" style="display:block;margin:0 auto;width:180px;max-width:60%;height:auto;border:0">`
    : `<div style="font:700 28px ${serif};color:${C.accent};text-align:center">${esc(cfg.fromName)}</div>`;
  const subject = cfg.subject.replace(/\{\{nombre\}\}/g, nm);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,600&family=Jost:wght@400;600&display=swap" rel="stylesheet"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg}">
<div style="display:none;max-height:0;overflow:hidden">${code ? `Tenés ${cfg.pct}% de descuento para tu próxima compra en Cafelito.` : esc(subject)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.bg};padding:28px 12px"><tr><td align="center">
 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px">
  <tr><td style="padding:6px 0 22px" align="center">${head}</td></tr>
  <tr><td style="background:${C.card};border-radius:20px;padding:34px 32px 18px;box-shadow:0 1px 2px rgba(58,38,34,.06)">
   ${paras.join('\n   ')}
   ${cta}
  </td></tr>
  <tr><td style="padding:22px 18px 0;text-align:center;font:12px/19px ${sans};color:${C.soft}">
   <div style="font:italic 600 20px ${serif};color:${C.green};margin-bottom:8px">Let coffee connect us.</div>
   ${site ? `<a href="${esc(site)}" style="color:${C.accent};text-decoration:none;font-weight:600">${esc(String(web).replace(/^https?:\/\//, ''))}</a> · ` : ''}<a href="https://www.instagram.com/${esc(ig)}" style="color:${C.accent};text-decoration:none;font-weight:600">@${esc(ig)}</a><br>
   ${esc(reason || `Te escribimos porque compraste en ${cfg.unit}.`)} ${unsubUrl ? `<a href="${esc(unsubUrl)}" style="color:${C.soft};text-decoration:underline">No quiero recibir más mails</a>` : 'Si no querés recibir más mails nuestros, respondé «BAJA» y no te escribimos más.'}
  </td></tr>
 </table>
</td></tr></table></body></html>`;
  return { subject, html };
}
/* Logo y web de la marca principal (Marca → identidad) para el mail */
async function brandAssets(T) {
  try { const s = await T.collection('state').doc('m_kits').get(); if (!s.exists) return {}; const k = JSON.parse(s.data().json) || {};
    const kit = k.__marca || {}; const l = (kit.logos || {}).principal; return { logoUrl: l && l.url ? l.url : '', web: (kit.info || {}).web || '' }; } catch { return {}; }
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
      const { subject, html } = renderMail(cfg, { name: c.name || o.customerName, code, expires, ...(await brandAssets(T)) });
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
    const cfg = cleanCfg(b.config), { subject, html } = renderMail(cfg, { name: by, code: `${cfg.prefix}-PRUEBA`, expires: plusDays(today, cfg.validDays), ...(await brandAssets(tenantRef)) });
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

module.exports = { runAutomations, handleAuto, renderMail, brandAssets, cleanCfg, DEFAULT, KEY };
