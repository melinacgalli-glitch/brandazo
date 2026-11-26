'use strict';
/* Envío de mails de Brandazo. Un solo secreto (RESEND, por razones históricas) con:
   {"provider":"sendgrid"|"resend","apiKey":"…","from":"Brandazo <avisos@brandazo.com.ar>"}
   Si no dice provider: una clave que empieza con «SG.» es SendGrid; si no, Resend. */
const providerOf = cfg => cfg.provider || (/^SG\./.test(cfg.apiKey || '') ? 'sendgrid' : 'resend');
const ready = cfg => !!(cfg && cfg.apiKey && cfg.from);
function parseFrom(from) { const m = String(from).match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/); return m ? { name: m[1].replace(/^"|"$/g, ''), email: m[2] } : { email: String(from).trim() }; }

/** Manda un mail. Devuelve {id}. Lanza Error con el detalle del proveedor si falla. */
async function sendMail(deps, cfg, { to, subject, html, idempotencyKey, replyTo, headers }) {
  const p = providerOf(cfg);
  if (p === 'sendgrid') {
    const url = deps.sendgridUrl || 'https://api.sendgrid.com/v3/mail/send';
    const r = await deps.fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: parseFrom(cfg.from), ...(replyTo ? { reply_to: { email: replyTo } } : {}), subject, content: [{ type: 'text/html', value: html }], tracking_settings: { click_tracking: { enable: false } } }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(`SendGrid ${r.status} ${((j.errors || [])[0] || {}).message || ''}`.trim()); }
    return { id: (r.headers && r.headers.get && r.headers.get('x-message-id')) || null };
  }
  const r = await deps.fetch(deps.resendUrl || 'https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
    body: JSON.stringify({ from: cfg.from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}), ...(headers ? { headers } : {}) }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Resend ${r.status} ${j.message || j.name || ''}`.trim());
  return { id: j.id || null };
}
module.exports = { sendMail, ready, providerOf, parseFrom };
