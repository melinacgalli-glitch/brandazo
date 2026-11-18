# Recordatorios de seguimiento por mail (CRM · Cafelito Eventos)

_Última actualización: 2026-11-18 · Estado: función `recordatoriosSeguimiento` publicada (todos los días 8:00, Córdoba). **No manda nada** hasta que se cargue el secreto `RESEND`._

## Qué hace
- A las 8 de la mañana busca las cotizaciones **abiertas** con próximo seguimiento **hoy o vencido**.
- Manda **un mail por responsable** (campo `owner` → miembro con ese nombre o email; sin responsable → Dueño/Admin), desde `avisos@brandazo.com.ar`.
- Cada seguimiento trae: contacto, evento y fecha, etapa, importe vigente, «Qué hay que hacer», «vencido desde…», el último registro de la historia, botón **Escribir por WhatsApp** y **Abrir en Brandazo** (abre la ficha: `#/app/crm/eventos?t=<empresa>&op=<cotización>`).
- Un solo mail por persona y día (`tenants/{t}/reminders/{fecha}_{hash}`); si el envío falla, no se marca y se reintenta.
- En la app, «Qué hay que hacer ese día» se carga junto a la fecha de seguimiento (ficha, «Registrar actividad» y formularios de etapa). Campo `opportunities.nextAction` (texto, hasta 200).

## Archivos
`functions/src/reminders.js`, `functions/index.js` (`recordatoriosSeguimiento`), `functions/test/recordatorios.test.js` (4 pruebas, envío simulado).

## Configurar el envío (una vez, lo hace Melina)
1. Crear cuenta en **resend.com**.
2. **Domains → Add domain** → `brandazo.com.ar`, región **São Paulo (sa-east-1)**.
3. Resend muestra 3 registros DNS (MX y TXT de `send`, TXT `resend._domainkey`). Cargarlos en **Cloudflare → DNS** tal cual, con la nube **gris** (solo DNS). Volver a Resend → **Verify**.
4. **API Keys → Create API key** → permiso *Sending access*, dominio `brandazo.com.ar`. Copiarla (empieza con `re_`).
5. Google Cloud → **Secret Manager → RESEND → Nueva versión** → pegar:
   ```json
   {"apiKey":"re_...","from":"Brandazo <avisos@brandazo.com.ar>"}
   ```
6. Avisar para volver a publicar las funciones `recordatoriosSeguimiento` y `cuenta` (los mails de contraseña y verificación también salen por acá) (toma la versión nueva al publicarse) y mandar un mail de prueba.

Nunca pasar la clave por chat ni mail.
