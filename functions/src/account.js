'use strict';
/* Mails de cuenta con la marca Brandazo (en vez de las plantillas de Firebase, que en este proyecto no se pueden editar).
   POST /api/v1/cuenta/recuperar  {email}            → mail «Creá una contraseña nueva»
   POST /api/v1/cuenta/verificar  (sesión de Firebase) → mail «Confirmá tu email»
   - El enlace lleva a https://www.brandazo.com.ar/accion?mode=…&oobCode=… (pantallas propias).
   - Se manda con Resend (secreto RESEND). Si no está configurado responde {fallback:true} y el navegador usa el mail de Firebase.
   - Recuperar responde igual exista o no la cuenta (no revela quién está registrado). Límite: 3 por email por hora. */
const crypto = require('node:crypto');
const { sendMail } = require('./mailer');
const APP = 'https://www.brandazo.com.ar';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
class HttpError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
const emailOk = e => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function ownLink(firebaseLink) {
  const u = new URL(firebaseLink), mode = u.searchParams.get('mode'), code = u.searchParams.get('oobCode');
  if (!mode || !code) throw new Error('Enlace de Firebase sin código');
  return `${APP}/accion?` + new URLSearchParams({ mode, oobCode: code, lang: 'es' });
}
function mailHtml({ title, text, button, link, foot }) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F4F4F5"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F4F5;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#FFFFFF;border-radius:12px;padding:28px">
   <tr><td style="font:800 22px Arial,sans-serif;color:#0E0E10"><span style="color:#FF2D87">/</span>brandazo</td></tr>
   <tr><td style="padding-top:20px;font:700 22px/28px Arial,sans-serif;color:#0E0E10">${esc(title)}</td></tr>
   <tr><td style="padding:8px 0 20px;font:15px/22px Arial,sans-serif;color:#3F3F46">${text}</td></tr>
   <tr><td><a href="${esc(link)}" style="display:inline-block;background:#FF2D87;color:#0E0E10;text-decoration:none;font:700 15px Arial,sans-serif;padding:12px 20px;border-radius:8px">${esc(button)}</a></td></tr>
   <tr><td style="padding-top:20px;font:13px/19px Arial,sans-serif;color:#5C5C66">Si el botón no funciona, copiá este enlace en el navegador:<br><a href="${esc(link)}" style="color:#C2005F;word-break:break-all">${esc(link)}</a></td></tr>
   <tr><td style="padding-top:20px;border-top:1px solid #E4E4E7;margin-top:20px;font:12px/18px Arial,sans-serif;color:#5C5C66">${foot}</td></tr>
  </table></td></tr></table></body></html>`;
}
async function send(deps, to, subject, html) { await sendMail(deps, deps.resend, { to, subject, html }); }
async function limit(deps, email) {
  const hour = Math.floor(deps.now() / 36e5), id = crypto.createHash('sha256').update(email).digest('hex').slice(0, 24) + '_' + hour;
  const ref = deps.db.doc(`accountMailLimits/${id}`);
  const n = await deps.db.runTransaction(async tx => { const s = await tx.get(ref); const v = (s.exists ? s.data().n : 0) + 1; tx.set(ref, { n: v, expireAt: deps.Timestamp.fromMillis((hour + 2) * 36e5) }); return v; });
  if (n > 3) throw new HttpError(429, 'RATE_LIMITED', 'Pediste varios enlaces seguidos. Esperá una hora o revisá los mails que ya te llegaron (también en spam).');
}

async function handleAccount(req, res, deps) {
  const m = req.path.match(/\/cuenta\/(recuperar|verificar)\/?$/);
  try {
    if (!m) throw new HttpError(404, 'NOT_FOUND', 'Ruta inexistente.');
    if (req.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Usá POST.');
    const configured = !!(deps.resend && deps.resend.apiKey && deps.resend.from);
    if (m[1] === 'recuperar') {
      const email = String((req.body || {}).email || '').trim().toLowerCase();
      if (!emailOk(email)) throw new HttpError(400, 'BAD_EMAIL', 'Revisá el formato del email.');
      if (!configured) return res.json({ fallback: true });
      await limit(deps, email);
      let link; try { link = ownLink(await deps.auth.generatePasswordResetLink(email, { url: `${APP}/#/login` })); }
      catch (e) { if (e.code === 'auth/user-not-found' || e.code === 'auth/email-not-found') return res.json({ ok: true }); throw e; }
      await send(deps, email, 'Creá una contraseña nueva para Brandazo', mailHtml({ title: 'Creá una contraseña nueva', text: `Recibimos un pedido para cambiar la contraseña de <b>${esc(email)}</b> en Brandazo. Tocá el botón para elegir una nueva. El enlace sirve una sola vez y vence en una hora.`, button: 'Crear contraseña nueva', link, foot: 'Si no lo pediste vos, ignorá este mail: tu contraseña no cambia.' }));
      return res.json({ ok: true });
    }
    // verificar: necesita la sesión de la persona
    const h = req.get('authorization') || ''; const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!tok) throw new HttpError(401, 'NO_SESSION', 'Iniciá sesión.');
    let user; try { user = await deps.auth.verifyIdToken(tok); } catch { throw new HttpError(401, 'NO_SESSION', 'La sesión venció. Volvé a iniciar sesión.'); }
    if (!user.email) throw new HttpError(400, 'BAD_EMAIL', 'La cuenta no tiene email.');
    if (user.email_verified) return res.json({ ok: true, alreadyVerified: true });
    if (!configured) return res.json({ fallback: true });
    await limit(deps, user.email);
    const link = ownLink(await deps.auth.generateEmailVerificationLink(user.email, { url: `${APP}/#/app/inicio` }));
    await send(deps, user.email, 'Confirmá tu email para entrar a Brandazo', mailHtml({ title: 'Confirmá tu email', text: `Para terminar de crear tu cuenta en Brandazo, confirmá que <b>${esc(user.email)}</b> es tuyo.`, button: 'Confirmar mi email', link, foot: 'Si no creaste una cuenta en Brandazo, ignorá este mail.' }));
    return res.json({ ok: true });
  } catch (e) {
    const err = e instanceof HttpError ? e : new HttpError(502, 'SEND_FAILED', 'No pudimos mandar el mail. Probá de nuevo en unos minutos.');
    if (!(e instanceof HttpError)) console.error('[cuenta]', e.code || '', e.message);
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
}
module.exports = { handleAccount, ownLink, mailHtml };
