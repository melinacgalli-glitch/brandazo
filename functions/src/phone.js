'use strict';
// Normalización de teléfonos argentinos a formato internacional de WhatsApp (+54 9 <área><número>).
// Si no se puede interpretar con seguridad, se devuelve normalized=false y se usa una clave con los dígitos
// tal cual (el contacto queda marcado «Revisar teléfono»), en lugar de rechazar la cotización.

function normalizePhoneAR(raw) {
  const original = String(raw || '').trim();
  let d = original.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('549')) d = d.slice(3);
  else if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  // Quitar el «15» de celular que va después del código de área (área de 2, 3 o 4 dígitos)
  if (d.length === 12) {
    for (const a of [2, 3, 4]) {
      if (d.slice(a, a + 2) === '15') { d = d.slice(0, a) + d.slice(a + 2); break; }
    }
  }
  if (d.length === 10) {
    return { normalized: true, e164: '+549' + d, display: formatDisplay(d), key: '549' + d };
  }
  const digits = original.replace(/\D/g, '');
  return { normalized: false, e164: null, display: original, key: 'raw-' + (digits || 'vacio') };
}

// Solo para mostrar: +54 9 11 5555-0142 (Buenos Aires) · +54 9 351 555-0142 (resto, área de 3 dígitos).
// Las áreas de 4 dígitos se muestran agrupadas igual; la clave de búsqueda (e164) no depende de esto.
function formatDisplay(d10) {
  const area = d10.startsWith('11') ? 2 : 3;
  const local = d10.slice(area);
  const cut = local.length - 4;
  return `+54 9 ${d10.slice(0, area)} ${local.slice(0, cut)}-${local.slice(cut)}`;
}

module.exports = { normalizePhoneAR };
