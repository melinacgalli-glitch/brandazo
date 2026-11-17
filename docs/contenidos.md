# Contenidos: planificación editorial y aprobaciones

_Última actualización: 2026-11-17 · versión 0.3.0 (Fase 1)_

## Dónde está el código
| Archivo | Qué tiene |
|---|---|
| `public/js/2-modulos.js` | Módulo existente: calendario (Mes, Semana, Lista), filtros, editor lateral (`contentEditor`), flujo (`flowActions`), vista previa. Campañas (asistente y detalle). |
| `public/js/5-editorial.js` | Fase 1: migración, Planificaciones, edición masiva, aprobación estratégica, bandeja de Aprobaciones, objetivo estratégico de la campaña. Envuelve `vContenidos`, `bContenidos` y `flowActions` sin reescribirlos. |
| `public/css/estilos.css` | Sección «Planificación editorial y aprobaciones». |

## Navegación
`Contenidos → Calendario (Mes · Semana · Lista) | Planificaciones | Aprobaciones`. Rutas: `#/app/contenidos/mes|semana|lista|planificaciones|planificaciones/<id>|aprobaciones`.

## Modelo
- **Una idea es un contenido** (`M().contents`): no hay entidad duplicada. Al aprobarse pasa a producción en el mismo registro.
- Campos nuevos (opcionales) del contenido: `planId`, `ideaSt`, `ideaVersion`, `ideaApproval {by, onBehalfOf, at, version}`, `ideaLegacy`, `desc`, `intent` (`atraer` · `posicionar` · `convertir`), `order`.
- `M().editorialPlans`: `{ id, brand, type: 'semana'|'mes', start, end, name, owner, approver, version, presentedAt, created }`. (No se usa `M().plan`, que son los hitos de Estrategia → Planes.)
- `M().approvals`: registro único `{ id, at, by, kind: 'plan'|'idea', decision: 'presentada'|'aprobada'|'ajustes'|'comentario'|'eliminada', targetId, planId, version, onBehalfOf, comment }`. Lo usará también la aprobación creativa (Fase 2).
- Campaña: `objectiveId` (objetivo estratégico) y `objInferred`. El campo de texto `objective` («Ventas», «Leads») se mantiene como tipo de objetivo de la campaña.

## Estados (separados, compatibles)
| Dimensión | Dónde vive | Valores |
|---|---|---|
| Idea | `ideaSt` (guardado) | sin-presentar · presentada · aprobada · ajustes |
| Producción y aprobación creativa | derivado de `status` | — · Lista para producción · En producción · En revisión creativa · Aprobado |
| Publicación | derivado de `status` | Sin programar · Programado · Publicado |

`status` (Idea, Borrador, Revisión, Aprobado, Programado, Publicado) **no se reemplazó**: lo siguen usando Inicio, Redes, Métricas, Campañas, filtros y colores del calendario.

## Migración (una vez por empresa, idempotente)
- Antes de migrar se guarda `M().contentsBackupV1` (copia de los contenidos) y se marca `M().edV = 1`.
- `status: Idea` → `ideaSt: sin-presentar`. Cualquier otro estado → `ideaSt: aprobada` con `ideaLegacy: true` («Anterior al flujo»): **no se inventan aprobadores ni fechas**.
- Campañas: `objectiveId` se completa solo si hay un único objetivo posible según vínculos existentes (objetivos con `links`, funnels o contenidos de la campaña); si no, queda vacío para elegirlo.
- Verificado: mismos 16 contenidos de ejemplo (ids, estados, títulos y fechas), 13 de 20 pantallas idénticas y las otras 7 solo suman lo nuevo; migrar dos veces no cambia nada.

## Reglas de la Fase 1
- Para presentar una idea: título, fecha, canal, formato y campaña **u** objetivo. No se pide copy ni archivos.
- Al elegir una campaña, la idea hereda el objetivo vinculado (también en el editor).
- «Presentar planificación» sube la versión; las ideas presentadas no se editan mientras están en revisión.
- El aprobador puede aprobar todas, aprobar seleccionadas, pedir ajuste (con comentario obligatorio) o comentar. Los ajustes no frenan a las demás ideas. Una idea corregida se re-presenta sola y sube la versión.
- Prototipo: el aprobador se elige entre los miembros; **Dueño y Admin pueden aprobar en nombre del aprobador** y queda registrado (`onBehalfOf`). Con ingreso real, cada persona verá solo lo suyo.
- Una idea creada desde el calendario queda «sin presentar» y el editor no la deja pasar a producción hasta que se apruebe (se suma a una planificación con «Sumar ideas sueltas»).
- Eliminar una planificación no borra sus ideas: quedan como contenidos sueltos con su historial.

## Pendiente
- **Fase 2:** editor con Modo Idea / Modo Producción, intención editable en el editor, responsables por rol con herencia por marca o campaña, aprobación creativa (copy, material, pieza completa), versiones al modificar elementos aprobados, centro de aprobaciones completo, evitar aprobaciones duplicadas si una persona tiene varios roles.
- **Fase 3:** mejoras de calendario, programación, integraciones y métricas.
