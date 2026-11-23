'use strict';
/* Avisos de las planificaciones de contenido (Contenidos → Planificaciones).
   - A quien produce (responsable del contenido): recordatorio diario con los contenidos APROBADOS que todavía
     no pasó a revisión, de las planificaciones que están en curso o empiezan dentro de 7 días. Uno por persona y día.
   - A quien aprueba la planificación: un aviso, una sola vez, cuando TODOS los contenidos aprobados ya están
     terminados (pasaron a «En revisión» o más adelante).
   Lee los datos que guarda la app (tenants/{t}/state/m_editorialPlans y m_contents) y no los modifica:
   lo enviado se registra aparte (tenants/{t}/planAlerts) para no repetir. */
const crypto = require('node:crypto');
const { sendMail } = require('./mailer');
const { isoLocal } = require('./reminders');

const APP = 'https://www.brandazo.com.ar';
const DONE = new Set(['Revisión', 'Aprobado', 'Programado', 'Publicado']);
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const day = iso => { if (!iso) return 'Sin fecha'; const d = new Date(iso + 'T12:00:00Z'); return `${DIA[d.getUTCDay()]} ${d.getUTCDate()}`; };
const range = p => { const a = new Date(p.start + 'T12:00:00Z'), b = new Date(p.end + 'T12:00:00Z'); return `${a.getUTCDate()}${a.getUTCMonth() !== b.getUTCMonth() ? ' de ' + MES[a.getUTCMonth()] : ''} al ${b.getUTCDate()} de ${MES[b.getUTCMonth()]}`; };
const plusDays = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const norm = s => String(s || '').trim().toLowerCase();
const first = s => { const w = String(s || '').trim().split(/\s+/)[0] || ''; return w.charAt(0).toUpperCase() + w.slice(1); };
const kind = c => [c.format, c.channel].filter(Boolean).join(' de ').replace(/^Historia de Instagram$/, 'Historia de Instagram');

function mailHtml({ title, sub, box, rows, button, link, note }) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F4F4F5"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F4F5;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;padding:24px">
   <tr><td style="font:800 22px Arial,sans-serif;color:#0E0E10"><span style="color:#FF2D87">/</span>brandazo</td></tr>
   <tr><td style="padding-top:16px;font:600 20px/26px Arial,sans-serif;color:#0E0E10">${esc(title)}</td></tr>
   <tr><td style="padding:4px 0 8px;font:14px/20px Arial,sans-serif;color:#5C5C66">${esc(sub)}</td></tr>
   <tr><td style="padding:10px 12px;background:#FFF0F7;border-radius:8px;font:14px/20px Arial,sans-serif;color:#0E0E10">${box}</td></tr>
   ${rows.map(r => `<tr><td style="padding:12px 0;border-top:1px solid #E4E4E7"><table role="presentation" cellspacing="0" cellpadding="0"><tr>
     <td valign="top" style="width:64px;font:600 13px/18px Arial,sans-serif;color:#C2005F">${esc(r.day)}</td>
     <td><div style="font:600 15px/20px Arial,sans-serif;color:#0E0E10">${esc(r.title)}</div><div style="font:13px/18px Arial,sans-serif;color:#5C5C66">${r.meta}</div></td></tr></table></td></tr>`).join('')}
   <tr><td style="padding-top:16px"><a href="${esc(link)}" style="display:inline-block;background:#FF2D87;color:#0E0E10;text-decoration:none;font:600 14px Arial,sans-serif;padding:10px 16px;border-radius:8px">${esc(button)}</a></td></tr>
   <tr><td style="padding-top:16px;margin-top:16px;border-top:1px solid #E4E4E7;font:12px/18px Arial,sans-serif;color:#5C5C66">${esc(note)}</td></tr>
  </table></td></tr></table></body></html>`;
}

async function sendPlanAlerts(deps) {
  const now = deps.now(), today = isoLocal(now), soon = plusDays(today, 7);
  const cfg = deps.resend || {}, configured = !!(cfg.apiKey && cfg.from), out = [];
  const tenants = deps.tenantIds || (await deps.db.collection('tenants').get()).docs.map(d => d.id);
  for (const tid of tenants) {
    const T = `tenants/${tid}`;
    const [pSnap, cSnap] = await Promise.all([deps.db.doc(`${T}/state/m_editorialPlans`).get(), deps.db.doc(`${T}/state/m_contents`).get()]);
    if (!pSnap.exists || !cSnap.exists) continue;
    let plans, contents; try { plans = JSON.parse(pSnap.data().json) || []; contents = JSON.parse(cSnap.data().json) || []; } catch { continue; }
    const live = plans.filter(p => p && p.start && p.end && p.end >= today && p.start <= soon);
    if (!live.length) continue;
    const [tSnap, memSnap, bSnap] = await Promise.all([deps.db.doc(T).get(), deps.db.collection(`${T}/members`).get(), deps.db.doc(`${T}/state/m_mainBrand`).get()]);
    let company = (tSnap.exists && tSnap.data().name) || tid; try { const mb = bSnap.exists ? JSON.parse(bSnap.data().json) : null; if (mb && mb.name) company = mb.name; } catch { /* nombre de la empresa */ }
    const members = memSnap.docs.map(d => d.data()).filter(m => m.email);
    const who = name => members.find(m => norm(m.name) === norm(name) || norm(m.email) === norm(name));
    const send = async (key, to, subject, html, extra) => {
      const ref = deps.db.doc(`${T}/planAlerts/${key}`);
      if ((await ref.get()).exists) { out.push({ tid, key, skipped: 'ya enviado' }); return; }
      if (!configured) { out.push({ tid, key, to: to.email, skipped: 'falta configurar el envío' }); return; }
      let id; try { id = (await sendMail(deps, cfg, { to: to.email, subject, html, idempotencyKey: `${tid}-${key}` })).id; }
      catch (e) { out.push({ tid, key, error: e.message.replace(/^(Resend|SendGrid) /, '') }); return; }
      await ref.set({ at: deps.Timestamp.fromMillis(now), to: to.email, subject, providerId: id || null, ...extra });
      out.push({ tid, key, sent: to.email });
    };
    for (const p of live) {
      const approved = contents.filter(c => c && c.planId === p.id && c.ideaSt === 'aprobada' && !c.ideaLegacy).sort((a, b) => String(a.date).localeCompare(String(b.date)));
      if (!approved.length) continue;
      const link = `${APP}/#/app/contenidos/planificaciones/${encodeURIComponent(p.id)}`;
      const pend = approved.filter(c => !DONE.has(c.status));
      // 1) Recordatorio diario a cada persona que tiene contenidos por producir
      const byOwner = new Map(); pend.forEach(c => { const k = norm(c.owner); if (!byOwner.has(k)) byOwner.set(k, []); byOwner.get(k).push(c); });
      for (const [k, list] of byOwner) {
        const m = who(k); if (!m) { out.push({ tid, plan: p.id, skipped: `sin mail para «${k || 'sin responsable'}»` }); continue; }
        if (p.start > today && plusDays(today, 2) < p.start) continue; // avisa desde 2 días antes de que empiece
        const n = list.length, hoy = list.filter(c => c.date && c.date <= today).length;
        const subject = `Tenés ${n} contenido${n > 1 ? 's' : ''} para producir · ${p.name}`;
        const html = mailHtml({ title: `Hola ${first(m.name || m.email)}, tenés ${n} contenido${n > 1 ? 's' : ''} aprobado${n > 1 ? 's' : ''} para producir`,
          sub: `${company} · Planificación «${p.name}» (${range(p)})`,
          box: `${esc(first(p.approver) || 'Ya')} ${p.approver ? 'ya aprobó' : 'aprobaron'} estas ideas. Falta producirlas y pasarlas a «En revisión».${hoy ? ` <b>${hoy === 1 ? 'Una es' : hoy + ' son'} para hoy o ya ${hoy === 1 ? 'pasó su fecha' : 'pasaron su fecha'}.</b>` : ''}`,
          rows: list.map(c => ({ day: day(c.date), title: c.title || 'Sin título', meta: esc([c.brand, kind(c)].filter(Boolean).join(' · ')) })),
          button: 'Abrir la planificación', link,
          note: 'Te llega porque sos la persona responsable de producir estos contenidos en Brandazo. Cuando termines uno, pasalo a «En revisión» desde la planificación. Mientras te queden pendientes, te vamos a avisar cada mañana.' });
        const key = `rem_${today}_${p.id}_${crypto.createHash('sha256').update(m.email).digest('hex').slice(0, 12)}`;
        await send(key, m, subject, html, { kind: 'recordatorio', planId: p.id, pending: n });
      }
      // 2) Aviso a quien aprobó cuando está todo terminado (una sola vez por versión de la planificación)
      if (!pend.length) {
        const ap = who(p.approver) || members.find(m => m.role === 'Dueño'); if (!ap) continue;
        const makers = [...new Set(approved.map(c => c.owner).filter(Boolean))].map(first);
        const by = makers.length === 1 ? makers[0] : makers.length ? makers.slice(0, -1).join(', ') + ' y ' + makers.slice(-1) : 'El equipo';
        const n = approved.length;
        const html = mailHtml({ title: `Hola ${first(ap.name || ap.email)}, ${by} ${makers.length > 1 ? 'terminaron' : 'terminó'} ${n === 1 ? 'el contenido' : `los ${n} contenidos`} que aprobaste`,
          sub: `${company} · Planificación «${p.name}» (${range(p)})`, box: 'Están listos para tu revisión. Revisalos y, si están bien, aprobalos para programarlos.',
          rows: approved.map(c => ({ day: day(c.date), title: c.title || 'Sin título', meta: `<span style="color:#1A7F37;font-weight:600">✓ Listo</span> · ${esc(kind(c))}` })),
          button: 'Revisar los contenidos', link, note: 'Te llega porque aprobaste esta planificación en Brandazo.' });
        await send(`done_${p.id}_v${p.version || 1}`, ap, `${by} ${makers.length > 1 ? 'terminaron' : 'terminó'} ${n === 1 ? 'el contenido' : `los ${n} contenidos`} de «${p.name}»`, html, { kind: 'terminado', planId: p.id });
      }
    }
  }
  return out;
}

module.exports = { sendPlanAlerts, mailHtml };
