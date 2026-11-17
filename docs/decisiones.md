# Decisiones

_Última actualización: 2026-11-17_

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-11-17 | Publicar el prototipo navegable en Firebase Hosting, en un repositorio propio separado de Cafelito. | Tener una demo compartible de todas las pantallas mientras se definen stack y backend. |
| 2026-11-17 | Separar el archivo único en `index.html`, `css/estilos.css` y tres archivos de `js/` sin cambiar el código. | Mantenibilidad; el comportamiento queda idéntico al prototipo original. |
| 2026-11-17 | El prototipo no se presenta como producto terminado: los datos son de ejemplo y no se guardan. | Regla del proyecto: no presentar funcionalidades simuladas como terminadas. |
| 2026-11-17 | Estrategia: cada solapa se puede usar aunque no haya objetivos; si la empresa no tiene marca, se pide crearla antes de cargar objetivos, KPI, buyer personas, hitos o posicionamiento; el presupuesto permite agregar destinos. | Con una empresa nueva no se podía cargar nada: todas las solapas mostraban el mismo aviso y el selector de marca quedaba vacío. |
| 2026-11-17 | Buyer personas: las «unidades de negocio» son las marcas de la empresa (no se crea una entidad nueva); una buyer persona puede pertenecer a varias. La relación con campañas se guarda en la campaña (`personas`) y se edita desde los dos lados. Se agregan editar y eliminar. | Cafelito tiene públicos distintos por unidad (Coffee House, Cakes, Barra de eventos) y cada campaña le habla a buyer personas concretas. Una sola fuente para la relación evita datos duplicados. |

## Pendientes de definir
- Stack definitivo de la Etapa 0 (propuesta: Next.js + NestJS + PostgreSQL + Better Auth).
- Modelo multiempresa para agencias (Organización → Espacios de trabajo).
- Servicio de email, textos de Términos y Privacidad.
