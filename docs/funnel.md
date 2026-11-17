# Funnel de conversión

_Última actualización: 2026-11-17 · versión 0.2.0_

Pertenece a **Estrategia** (solapa «Funnel de conversión», después de Buyer personas). Las campañas usan sus proyecciones; el funnel no es parte del módulo de Campañas.

## Dónde está el código
| Archivo | Qué tiene |
|---|---|
| `public/js/4-funnel.js` | Modelo, cálculo, vistas, historial, integración con Estrategia y Campañas. |
| `public/js/2-modulos.js` | Asistente de campaña (paso «Audiencia y canales»: funnel + aporte) y detalle de campaña. |
| `public/css/estilos.css` | Sección `Funnel de conversión`. |

## Modelo (`M().funnels`, por empresa)
```
{ id, name, objectiveId, goal (entero), goalType,
  stages: [{ id, name, type, source, campOnly, real }],   // la última es la conversión final
  scenarios: { cons|esp|opt: { rates: { stageId: % }, costs: { cpc, cpl, cpa } } },
  active: 'esp',
  campaigns: [{ id, mode: 'pct'|'qty', value }],           // única fuente de la relación funnel ↔ campaña
  history: [{ at, by, sc, what, from, to, proj[], names[], period }],
  created }
```
- **Marca y período** no se guardan en el funnel: se leen del objetivo (`objectiveId`). Cambiar el período desde el funnel cambia el del objetivo y queda en el historial de todos sus funnels.
- `type`: alcance, clic, lead, oportunidad, conversion, otra. Se usa en el simulador (clic → CPC, lead → CPL).
- `source` del resultado real: `manual`, `crm-contacts`, `crm-clients`, `crm-won`, `camp-reach`, `camp-clicks`, `camp-conv`. Google Ads y GA4 figuran como «próximamente».

## Cálculo
- La tasa de una etapa es la conversión **desde la etapa anterior**.
- Meta etapa anterior = `REDONDEAR.HACIA.ARRIBA(meta siguiente / tasa)`, en enteros (`fBack`): sin errores de coma flotante (4 / 20 % = 20, no 21).
- Tasas válidas: mayores que 0 % y hasta 100 %. Sin tasa o con 0 %: la etapa queda «Falta la tasa» y las anteriores sin meta (no se divide por cero).
- Tasa real = real etapa / real etapa anterior. Las tasas cargadas a mano se muestran como **estimadas**.
- Inversión: se usa el costo más cercano al resultado (CPA, luego CPL, luego CPC). Si falta un dato, se explica qué falta («Sin datos»), nunca `$ 0`.
- Inversión real = gasto de las campañas vinculadas (cada campaña una vez).

## Sin duplicar conversiones
El resultado real se guarda **una vez por etapa**. El «real informado» de cada campaña es solo referencia y no se suma al total. Desde el CRM, cada contacto u oportunidad se cuenta una sola vez (por id), dentro del período del objetivo.

## Historial
Se registra al salir del campo (no por tecla): meta, tipo de conversión, tasas, costos, etapas (alta, edición, orden, baja), escenario activo, período, campañas y aportes. Cada entrada guarda la proyección de ese momento para compararla con el real.

## Pendiente (etapa posterior)
- Integración con Google Ads, GA4 y CRM externo.
- Guardado en Firebase (hoy el prototipo guarda en el navegador).
