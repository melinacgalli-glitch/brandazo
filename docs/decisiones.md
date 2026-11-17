# Decisiones

_Última actualización: 2026-11-17_

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-11-17 | Publicar el prototipo navegable en Firebase Hosting, en un repositorio propio separado de Cafelito. | Tener una demo compartible de todas las pantallas mientras se definen stack y backend. |
| 2026-11-17 | Separar el archivo único en `index.html`, `css/estilos.css` y tres archivos de `js/` sin cambiar el código. | Mantenibilidad; el comportamiento queda idéntico al prototipo original. |
| 2026-11-17 | El prototipo no se presenta como producto terminado: los datos son de ejemplo y no se guardan. | Regla del proyecto: no presentar funcionalidades simuladas como terminadas. |
| 2026-11-17 | Estrategia: cada solapa se puede usar aunque no haya objetivos; si la empresa no tiene marca, se pide crearla antes de cargar objetivos, KPI, buyer personas, hitos o posicionamiento; el presupuesto permite agregar destinos. | Con una empresa nueva no se podía cargar nada: todas las solapas mostraban el mismo aviso y el selector de marca quedaba vacío. |
| 2026-11-17 | Buyer personas: las «unidades de negocio» son las marcas de la empresa (no se crea una entidad nueva); una buyer persona puede pertenecer a varias. La relación con campañas se guarda en la campaña (`personas`) y se edita desde los dos lados. Se agregan editar y eliminar. | Cafelito tiene públicos distintos por unidad (Coffee House, Cakes, Barra de eventos) y cada campaña le habla a buyer personas concretas. Una sola fuente para la relación evita datos duplicados. |
| 2026-11-17 | Guardar todo el estado del prototipo en el navegador (localStorage, clave `bz-data`), con opción «Borrar datos de este navegador» en el menú de usuario. | Se estaban cargando datos reales que se perdían al recargar; el historial del funnel no sirve sin guardado. Lo definitivo será Firebase (Etapa 0). |
| 2026-11-17 | Funnel de conversión dentro de Estrategia (ver `docs/funnel.md`): marca y período se leen del objetivo; la relación con campañas vive en el funnel; el resultado real se cuenta una vez por etapa; escenario esperado activo por defecto; cambiar el período no reparte la meta. | Aprobado por Melina («dale») sobre la propuesta de 7 decisiones. Evita duplicar entidades y conversiones. |
| 2026-11-17 | El funnel arranca con tasas de referencia (marcadas «referencia») para calcular todas las etapas apenas se pone la meta. Los costos no se completan. | Melina espera que con solo la meta (10 ventas) se calculen oportunidades, leads y clics. Son estimaciones explícitas, no datos reales. |
| 2026-11-17 | Integración del cotizador de Cafelito Ambulante: contrato v1.0 (borrador) en `docs/integraciones/cafelito-cotizador/`. Servidor a servidor con firma HMAC-SHA256 + timestamp (5 min), `Idempotency-Key` = `quoteId` (30 días), contacto por teléfono normalizado, una oportunidad por evento en el pipeline «Cafelito Eventos», importe de la web como estimación no confiable recalculado con tarifas versionadas (`web-2026-11`), dinero en centavos. | Aprobado por Melina («dale»). Campos tomados del cotizador real (inspeccionado el 2026-11-17); lo que la web no envía hoy (estimado, UTM, consentimiento, email) queda opcional. |
| 2026-11-17 | Backend de Brandazo en Firebase (Firestore + Cloud Functions + Auth), proyecto de pruebas `brandazo-staging`. Reemplaza la propuesta anterior (PostgreSQL + NestJS), que no se había aprobado. | Aprobado por Melina («dale»). Ya está el hosting en Firebase; requiere plan Blaze y más permisos para la cuenta de servicio. |
| 2026-11-17 | Conservación: datos personales de cotizaciones perdidas se anonimizan a los 24 meses; las ganadas se conservan. | Aprobado por Melina («dale»). |

## Pendientes de definir
- Responsable comercial de eventos de Cafelito (regla de asignación inicial).
- Revisión del contrato de integración por el equipo web y fecha del ambiente de pruebas.
- Stack definitivo de la Etapa 0 (propuesta: Next.js + NestJS + PostgreSQL + Better Auth).
- Modelo multiempresa para agencias (Organización → Espacios de trabajo).
- Servicio de email, textos de Términos y Privacidad.
