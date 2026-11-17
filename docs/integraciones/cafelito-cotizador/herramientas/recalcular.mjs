// Recálculo de referencia del presupuesto de Cafelito Ambulante a partir de la tabla de tarifas.
// Es la misma regla que usa el cotizador de la web (versión web-2026-11). Brandazo usa esta lógica
// para comparar el estimado que llega de la web: el de la web se considera NO confiable.
// Uso: node recalcular.mjs ../ejemplos/solicitud-valida.json
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const TARIFAS = JSON.parse(readFileSync(join(here, '../tarifas/web-2026-11.json'), 'utf8'));

/** Devuelve { tariffVersion, currency, subtotalMinor, lines[], warnings[] } en centavos. */
export function recalcular(q, t = TARIFAS) {
  const g = q.event.guests, sel = q.selection, warnings = [];
  const plan = t.plans[sel.plan];
  const lines = [];
  const add = (code, label, quantity, unit) => lines.push({ code, label, quantity, unitMinor: unit * 100, totalMinor: quantity * unit * 100 });
  add('plan', `Plan ${plan.name}`, g, plan.pricePerGuest);
  add('service', t.serviceFee.label, 1, t.serviceFee.amount);
  const extra = Math.max(0, q.event.durationHours - t.includedHours);
  if (extra > 0) add('extra_hours', `Horas extra (${extra})`, extra, t.extraHour.amount);
  for (const id of sel.addonIds || []) {
    const a = t.addons.find(x => x.id === id);
    if (!a) continue;
    if (a.onlyPlan && a.onlyPlan !== sel.plan) { warnings.push({ code: 'ADDON_NOT_IN_PLAN', field: 'selection.addonIds', message: `«${a.name}» ya viene incluido en el plan ${plan.name}: no se cobra.` }); continue; }
    add('addon:' + a.id, a.name, g, a.pricePerGuest);
  }
  const nc = (sel.customizationIds || []).length;
  if (nc > 0) {
    const all = nc === t.customizations.items.length;
    const total = all ? t.customizations.allThreePrice : t.customizations.pricePerItem * nc;
    const names = t.customizations.items.filter(x => sel.customizationIds.includes(x.id)).map(x => x.name).join(', ');
    lines.push({ code: 'customization', label: `Personalización (${names})`, quantity: nc, unitMinor: all ? undefined : t.customizations.pricePerItem * 100, totalMinor: total * 100 });
    if (all) delete lines[lines.length - 1].unitMinor;
  }
  const subtotalMinor = lines.reduce((s, l) => s + l.totalMinor, 0);
  return { tariffVersion: t.tariffVersion, currency: 'ARS', taxIncluded: false, transfer: q.event.inCapital ? 'included' : 'to_quote', subtotalMinor, lines, warnings };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const q = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const r = recalcular(q);
  console.log(JSON.stringify(r, null, 2));
  console.log(`Subtotal: $ ${(r.subtotalMinor / 100).toLocaleString('es-AR')} + IVA · traslado ${r.transfer === 'included' ? 'incluido' : 'a cotizar'}`);
}
