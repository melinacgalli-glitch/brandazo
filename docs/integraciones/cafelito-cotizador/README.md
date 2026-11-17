# Integración: cotizador de Cafelito Ambulante → Brandazo

_Versión del contrato: **1.0 (borrador para revisar)** · Última actualización: 2026-11-17_

Este documento es para el **equipo web de cafelito.com.ar**. Explica cómo enviar a Brandazo cada pedido de presupuesto del cotizador de la barra móvil para que entre como **oportunidad** en el CRM (pipeline **Cafelito Eventos**).

> Estado: el endpoint **todavía no está publicado**. Primero acordamos este contrato; después se habilita el ambiente de pruebas.

## Archivos

| Archivo | Qué es |
|---|---|
| `openapi.yaml` | Especificación OpenAPI 3.1 del endpoint. |
| `schemas/event-quote.request.json` | Esquema JSON del cuerpo (campos obligatorios y opcionales, formatos y límites). |
| `schemas/event-quote.response.json` | Esquema de la respuesta de éxito. |
| `schemas/error.json` | Esquema único de error. |
| `ejemplos/` | Solicitudes y respuestas de ejemplo. |
| `tarifas/web-2026-11.json` | Tarifas leídas del cotizador publicado (para el recálculo en Brandazo). |
| `herramientas/firmar.mjs` | Firma HMAC de referencia, vector de prueba y envío con reintentos. |
| `herramientas/recalcular.mjs` | Recálculo de referencia del presupuesto. |

## 1. Cómo funciona hoy y qué cambia

Hoy, al tocar **«Pedir presupuesto por WhatsApp»**, el navegador:
1. abre WhatsApp con el resumen, y
2. manda los datos a `POST /api/ambulante` del servidor de la web, que envía un mail. Si falla, solo queda en la consola del navegador.

**Cambio propuesto:** que `/api/ambulante` **además reenvíe a Brandazo** desde el servidor, firmado y con reintentos. El navegador no cambia (salvo generar el `quoteId`, ver abajo).

```
Navegador ──► /api/ambulante (servidor web) ──► mail (como hoy)
                       │
                       └──► POST https://brandazo…/api/v1/integrations/cafelito/event-quotes
                              (firma HMAC + Idempotency-Key, reintentos si falla)
```

## 2. Endpoint

| | |
|---|---|
| Pruebas | `POST https://brandazo-staging.web.app/api/v1/integrations/cafelito/event-quotes` |
| Producción | `POST https://www.brandazo.com.ar/api/v1/integrations/cafelito/event-quotes` |
| Formato | `Content-Type: application/json`, UTF-8, máximo 32 KB |

## 3. Autenticación (firma HMAC)

Cada solicitud lleva:

| Encabezado | Valor |
|---|---|
| `X-Brandazo-Key-Id` | Identificador de la clave, ej. `cafelito-web-2026-11`. |
| `X-Brandazo-Timestamp` | Segundos Unix (UTC) del momento del envío. **Nuevo en cada intento.** |
| `X-Brandazo-Signature` | `v1=` + HMAC-SHA256 en hexadecimal de `` `${timestamp}.${cuerpo}` `` con el secreto. |
| `Idempotency-Key` | El `quoteId` de la solicitud. |

Reglas:
- Se firma **exactamente** el texto del cuerpo que se envía (no volver a serializar después de firmar).
- Brandazo rechaza timestamps con **más de 5 minutos** de diferencia: el reloj del servidor tiene que estar sincronizado.
- El **secreto** se guarda solo en el servidor de la web (variable de entorno o gestor de secretos). Nunca en el código, el repositorio, el navegador, mails ni chats. Lo pasamos por un canal seguro y se puede rotar: por eso existe el `Key-Id`.

**Vector de prueba** (para verificar tu implementación sin conexión; `node herramientas/firmar.mjs vector`):

| | |
|---|---|
| Secreto | `brz_test_secreto_SOLO_PARA_VERIFICAR_LA_FIRMA` |
| Timestamp | `1795000000` |
| Cuerpo | `{"schemaVersion":"1.0","quoteId":"5b0f9c1e-8a2d-4c3b-9f1e-2d7a6c4b8e10"}` |
| Firma esperada | `v1=fbb1e23abadfa3e9d628c4e34036c55250196ad1366058b059624eaed4fadc91` |

## 4. Idempotencia (sin duplicados)

- El **navegador** genera un `quoteId` (UUID v4, `crypto.randomUUID()`) al tocar el botón y lo manda a `/api/ambulante`. Así, si la persona toca dos veces o el servidor reintenta, el identificador es el mismo.
- `Idempotency-Key` = `quoteId`. Brandazo lo recuerda **30 días**.
- Mismo `Idempotency-Key` + mismo cuerpo → `200` con `status: "duplicate"` y la misma respuesta. No se crea nada nuevo.
- Mismo `Idempotency-Key` + cuerpo distinto → `409 IDEMPOTENCY_CONFLICT`.
- Si el `Idempotency-Key` no coincide con `quoteId` → `400 IDEMPOTENCY_KEY_MISMATCH`.

## 5. Campos

Correspondencia con el estado actual del cotizador (`t` en el código de la web, inspeccionado el 2026-11-17):

| Cotizador hoy | Contrato | Obligatorio | Formato / valores |
|---|---|---|---|
| — (nuevo) | `quoteId` | Sí | UUID |
| — (nuevo) | `submittedAt` | Sí | ISO 8601 con zona (`2026-11-17T15:42:10-03:00`) |
| — | `schemaVersion` | Sí | `"1.0"` |
| `name` | `contact.name` | Sí | 1–120 caracteres |
| `phone` | `contact.phone` | Sí | Tal como lo escribió la persona; Brandazo lo normaliza |
| `eventType` | `event.type` | Sí | Corporativo · Cumpleaños · Casamiento · Lanzamiento o activación · Otro |
| `date` | `event.date` | Sí | AAAA-MM-DD |
| `start` | `event.startTime` | Sí | HH:MM |
| `hours` | `event.durationHours` | Sí | 2 a 8 |
| `inCapital` | `event.inCapital` | Sí | true = Córdoba Capital |
| `place` | `event.place` | No | hasta 200 caracteres |
| `guests` | `event.guests` | Sí | 60 a 400 |
| `plan` | `selection.plan` | Sí | `esencial` · `full` |
| `addonIds` | `selection.addonIds` | No | jarabe, cookies, alfajor-ddl, alfajor-pistacho, budines, scon, sanguchitos |
| `customizationIds` | `selection.customizationIds` | No | tinta, sticker, barra |
| `wantsCake` | `selection.wantsCake` | No | true / false |
| `wantsColdBrew` | `selection.wantsColdBrew` | No | true / false |
| `dietary` | `dietary` | No | Celíacos · Vegetarianos · Veganos |
| `notes` | `notes` | No | hasta 2000 caracteres |

**Campos opcionales que hoy NO existen en la web** (los proponemos, sin obligación para arrancar):

| Bloque | Para qué |
|---|---|
| `estimate` | Presupuesto que vio la persona (subtotal y desglose en **centavos**, sin IVA, versión de tarifas). Brandazo lo compara con su recálculo. |
| `attribution` | UTM (`utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm`), `gclid`, `gbraid`, `wbraid`, `landingPage`, `referrer`. Se capturan al entrar al sitio (primer toque de la visita) y se guardan en la sesión del navegador. |
| `source.pageUrl` | Página donde se completó el cotizador. |
| `consent` | Si la persona acepta comunicaciones de marketing (texto exacto y fecha). Sin esto, Brandazo solo permite **responder el pedido**. |
| `contact.email` | Si en el futuro se pide el email. |

Ejemplos: `ejemplos/solicitud-minima.json` (solo lo que la web ya tiene) y `ejemplos/solicitud-completa.json`.

## 6. Respuestas

| Código | Significa | ¿Reintentar? |
|---|---|---|
| `201` | Guardada: contacto creado o vinculado y oportunidad creada. | No |
| `200` | Ya estaba (reintento). `status: "duplicate"`. | No |
| `400` | `INVALID_JSON`, `MISSING_IDEMPOTENCY_KEY`, `IDEMPOTENCY_KEY_MISMATCH` | No: corregir |
| `401` | `MISSING_SIGNATURE`, `UNKNOWN_KEY`, `INVALID_SIGNATURE`, `TIMESTAMP_OUT_OF_RANGE` | No: corregir (revisar secreto y reloj) |
| `409` | `IDEMPOTENCY_CONFLICT` (mismo id, otro cuerpo) | No |
| `409` | `REQUEST_IN_PROGRESS` (el mismo id se está procesando) | **Sí** |
| `413` / `415` | Cuerpo muy grande / falta `Content-Type` | No |
| `422` | `VALIDATION_FAILED` o `EVENT_DATE_IN_PAST`, con `details` por campo | No: corregir |
| `429` | `RATE_LIMITED` | **Sí**, después de `Retry-After` |
| `500` / `503` / sin respuesta | Error de Brandazo o de red | **Sí** |

Todos los errores tienen el mismo formato (`schemas/error.json`) con `code`, `message`, `requestId`, `retryable` y, si corresponde, `details`. Al reportar un problema, pasá el `requestId`.

**Avisos que no frenan** (`warnings` en la respuesta de éxito): `SHORT_NOTICE` (menos de 7 días), `PHONE_NOT_NORMALIZED`, `ADDON_NOT_IN_PLAN` (jarabe con plan Full), `ESTIMATE_MISMATCH`, `POSSIBLE_SPAM`. La cotización se guarda igual y queda marcada para revisión en el CRM.

## 7. Reintentos seguros

- Reintentar **solo** si `retryable: true`, ante `429`, `5xx` o si no hubo respuesta (timeout de 10 s).
- En cada intento: **mismo cuerpo y mismo `Idempotency-Key`**, **timestamp y firma nuevos**.
- Espera creciente: 1 s, 4 s, 16 s, 64 s… (o lo que indique `Retry-After`).
- Como `/api/ambulante` hoy se llama sin esperar respuesta (`keepalive`), recomendamos que el servidor web **guarde el pedido en una cola o tabla** y reintente durante hasta 24 h. Si después de eso no se pudo enviar, que avise por mail para cargarlo a mano.

Ejemplo para la ruta de Next.js (App Router), solo como referencia:

```ts
// app/api/ambulante/route.ts (fragmento)
import { createHmac } from 'node:crypto';

async function enviarABrandazo(cuerpo: object) {
  const raw = JSON.stringify(cuerpo);                        // se firma exactamente este texto
  for (let intento = 1; intento <= 4; intento++) {
    const ts = Math.floor(Date.now() / 1000).toString();
    const firma = 'v1=' + createHmac('sha256', process.env.BRANDAZO_SECRET!).update(`${ts}.${raw}`).digest('hex');
    try {
      const res = await fetch(process.env.BRANDAZO_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brandazo-Key-Id': process.env.BRANDAZO_KEY_ID!,
                   'X-Brandazo-Timestamp': ts, 'X-Brandazo-Signature': firma, 'Idempotency-Key': (cuerpo as any).quoteId },
        body: raw, signal: AbortSignal.timeout(10_000),
      });
      if (res.status === 200 || res.status === 201) return await res.json();
      const err = await res.json().catch(() => null);
      if (!(res.status === 429 || res.status >= 500 || err?.error?.retryable)) throw new Error(`Brandazo ${res.status} ${err?.error?.code}`);
    } catch (e) { if (intento === 4) throw e; }
    await new Promise(r => setTimeout(r, 1000 * 4 ** (intento - 1)));
  }
}
```

## 8. Qué hace Brandazo al recibir

1. Valida firma, formato e idempotencia y guarda la cotización con su **hora de recepción** y un **identificador interno** (`receiptId`).
2. Normaliza el teléfono a formato internacional (ej.: `351 555-0142` → `+54 9 351 555-0142`). Si ya existe un contacto con ese teléfono, **vincula** la cotización. Si no, **crea** el contacto. No se pisan los datos ni el origen histórico del contacto.
3. Crea una **oportunidad nueva por cada evento** en el pipeline **Cafelito Eventos** (etapas: Nueva cotización → Contactado → Propuesta enviada → En negociación → Ganada / Perdida).
4. Recalcula el presupuesto con `tarifas/web-2026-11.json` y lo marca «A validar» si no coincide con el de la web.
5. Asigna responsable según reglas configurables, crea la tarea de **primer contacto**, registra la fecha del próximo seguimiento y notifica al equipo.
6. Suma la cotización a los resultados reales del **Funnel de conversión** de Estrategia.

## 9. Ambiente de pruebas y procedimiento de validación

Se habilita cuando aprobemos este contrato: proyecto `brandazo-staging`, con datos ficticios y su propia clave (`cafelito-web-test`). El secreto de pruebas se entrega por un canal seguro.

Pasos para validar (con `herramientas/firmar.mjs enviar …` o desde el servidor web):

| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | Calcular la firma del vector de prueba | Coincide con la de la sección 3 |
| 2 | Enviar `solicitud-minima.json` | `201`, `contact.match: "new"` |
| 3 | Reenviar la misma solicitud | `200`, `status: "duplicate"`, mismo `receiptId` |
| 4 | Mismo `quoteId`, otro `notes` | `409 IDEMPOTENCY_CONFLICT` |
| 5 | Nuevo `quoteId`, mismo teléfono, otro evento | `201`, `contact.match: "existing"`, **otra** oportunidad |
| 6 | `guests: 30` | `422` con `details` en `event.guests` |
| 7 | Firma con otro secreto | `401 INVALID_SIGNATURE` |
| 8 | Timestamp de hace 10 minutos | `401 TIMESTAMP_OUT_OF_RANGE` |
| 9 | Encabezado `X-Brandazo-Test-Fail: 503` (solo en pruebas) | `503`, y el reintento posterior responde `201` |
| 10 | Abrir Brandazo (pruebas) → CRM → Cafelito Eventos | La oportunidad aparece en «Nueva cotización» con todos los datos |

## 10. Datos personales y seguridad

- Solo HTTPS. El secreto vive del lado servidor en los dos sistemas (en Brandazo, en Secret Manager).
- Límite: 60 solicitudes por minuto por clave; heurísticas antispam (mismo teléfono muchas veces, textos con links) marcan «Revisar» sin perder el pedido.
- Brandazo registra cada intento (sin guardar el cuerpo completo en los registros técnicos) y audita los cambios comerciales.
- Conservación: cotizaciones **perdidas** → los datos personales se anonimizan a los **24 meses**; las ganadas se conservan como registro comercial.

## 11. Pendiente de definir

- [ ] Revisión de este contrato por el equipo web.
- [ ] Si la web suma `quoteId` en el navegador y el reenvío con cola en el servidor.
- [ ] Si la web suma `estimate`, `attribution` y `consent` (opcionales).
- [ ] Cómo compartir futuras versiones de tarifas (propuesta: la web publica `tariffVersion` y avisa los cambios; Brandazo carga la versión nueva).
- [ ] Responsable comercial de eventos (regla de asignación inicial).
