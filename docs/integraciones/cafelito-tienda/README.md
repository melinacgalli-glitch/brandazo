# Integración Tienda online de Cafelito Cakes → Brandazo

> Para el equipo web de cafelito.com.ar (Rodri). Versión 1.0 · 2026-11-18.
> Estado: **Etapa C1 (pedidos) publicada en Brandazo** y probada en el servidor de pruebas de Brandazo. **Etapa C2 (recorrido) es una propuesta** para revisar juntos: todavía no está publicada.

## 1. Qué resuelve

La tienda de Cafelito Cakes (carrito + pago con Mercado Pago) le avisa a Brandazo cada pedido. Con eso Brandazo:

- guarda el pedido y al cliente como contacto del CRM (sin duplicarlo si ya pidió un presupuesto o compró antes);
- vincula el pedido a la campaña que lo trajo (por `utm_campaign`);
- completa solo los resultados de campañas, funnel y objetivos de Cafelito Cakes.

**La web es la única fuente.** Brandazo no se conecta a Mercado Pago: la web ya recibe la notificación de pago de Mercado Pago y, cuando el pago queda aprobado, le avisa a Brandazo. Así cada venta llega por un solo lado y no se cuenta dos veces.

**Regla de conteo:** una venta cuenta mientras el pedido esté *pagado* o *retirado*, en el **mes en que se pagó** (`paidAt`, hora de Córdoba). Si después se cancela o se devuelve, deja de contar.

## 2. Qué hace falta del lado de la web

1. **Guardar el origen de la visita hasta el pago.** Cuando alguien entra con parámetros `utm_*` (o `fbclid` / `gclid`), guardarlos (cookie o `localStorage` de primera parte, 30 días; si la persona vuelve con otros parámetros, se reemplazan) y mandarlos en `attribution` del pedido. Es lo que permite saber qué campaña vendió. Es la misma lógica que ya tiene el cotizador.
2. **Casilla de novedades** en el checkout (sin marcar por defecto): «Quiero recibir novedades y promociones de Cafelito». Se manda en `consent`. Sin ella Brandazo no envía promociones a ese cliente (los avisos del propio pedido sí).
3. **Avisar cada cambio de estado del pedido** (sección 3).

## 3. Etapa C1 · Pedidos — `POST /shop-orders`

| | |
|---|---|
| Dirección | `POST https://www.brandazo.com.ar/api/v1/integrations/cafelito/shop-orders` |
| Clave | La misma del cotizador (`cafelito-web`). Para probar, Brandazo vuelve a habilitar una clave de pruebas que escribe en una empresa ficticia. |
| Firma | Igual que el cotizador: `X-Brandazo-Key-Id`, `X-Brandazo-Timestamp`, `X-Brandazo-Signature` = `v1=` + HMAC-SHA256(secreto, `` `${timestamp}.${cuerpo}` ``). Ver `../cafelito-cotizador/README.md` sección 3 y `../cafelito-cotizador/herramientas/firmar.mjs`. |
| `Idempotency-Key` | Igual al `eventId` del cuerpo. |
| Formato | `application/json`, UTF-8, máximo 64 KB. Esquema: `schemas/shop-order.request.json`. |

### Cuándo avisar

| Momento | `status` | `eventId` sugerido |
|---|---|---|
| Mercado Pago aprueba el pago | `paid` (con `paidAt`) | `<orderId>:paid` |
| El cliente retira la torta | `picked_up` | `<orderId>:picked_up` |
| Se anula antes de entregar | `cancelled` | `<orderId>:cancelled` |
| Se devuelve el dinero | `refunded` | `<orderId>:refunded` |

- **No se mandan** los pedidos sin pagar ni los pagos rechazados: eso es del recorrido (Etapa C2).
- Cada aviso lleva el pedido completo (productos, total, cliente). Brandazo actualiza el mismo pedido por `orderId`.
- Si un aviso llega tarde (su `statusAt` es anterior al último recibido), queda en la historia pero no cambia el estado.
- Reenviar el mismo aviso (mismo `eventId` y mismo cuerpo) responde `200 duplicate` y no duplica nada. El mismo `eventId` con otro cuerpo responde `409`.

### Campos principales

| Campo | Obligatorio | Qué es |
|---|---|---|
| `orderId` | Sí | Número de pedido de la tienda. |
| `status`, `statusAt` | Sí | Estado y momento del cambio (ISO 8601 con zona). |
| `paidAt` | Si `status = paid` | Momento en que Mercado Pago aprobó el pago. |
| `totalMinor` | Sí | Total cobrado en **centavos**, IVA incluido. |
| `items[]` | Sí | `name`, `quantity`, `unitPriceMinor` (centavos); opcionales `sku`, `variant` (tamaño/porciones), `category`. |
| `customer` | Sí | `name` y al menos `phone` o `email`. |
| `pickup` | No | `date` (AAAA-MM-DD), `timeSlot`, `place`. |
| `payment` | No | `provider: "mercadopago"`, `paymentId`, `method`, `installments`. **Nunca** datos de tarjeta. |
| `attribution` | No (muy recomendado) | `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm`, `fbclid`, `gclid`, `landingPage`, `capturedAt`. |
| `consent` | No | `marketing` (true/false), `text` (texto exacto de la casilla), `capturedAt`. |
| `discountMinor`, `notes`, `source` | No | Descuento, dedicatoria/aclaraciones, página del checkout. |

Brandazo controla que la suma de los productos menos el descuento dé el total; si no coincide, guarda el pedido igual con el aviso `TOTAL_MISMATCH`.

### Respuestas

| Código | Cuándo |
|---|---|
| `201` | Pedido nuevo (`status: "created"`). |
| `200` | Pedido existente actualizado (`updated`), aviso viejo (`stale`) o reenvío (`duplicate`). |
| `400` / `401` / `409` / `413` / `415` / `422` | Error del pedido: **no reintentar** sin corregir. `422` trae `details` con el campo y el problema. |
| `429` / `500` / `503` | Reintentar con el mismo cuerpo y el mismo `Idempotency-Key` (espera creciente: 1 s, 5 s, 30 s, 2 min…). |

Ejemplos: `ejemplos/pedido-pagado.json`, `ejemplos/pedido-retirado.json`, `ejemplos/respuesta-201-creado.json`.

## 4. Etapa C2 · Recorrido de compra (propuesta, a confirmar)

Objetivo: ver dónde se cae la gente y, en la Etapa C3, mandar mails automáticos (carrito abandonado, pago rechazado). Propuesta: `POST /api/v1/integrations/cafelito/shop-events`, misma firma, un aviso por paso:

| `type` | Cuándo | Datos de la persona |
|---|---|---|
| `visit` | Primera página vista de la sesión | No (solo `sessionId` anónimo y `attribution`) |
| `add_to_cart` | Agrega un producto | No |
| `checkout_started` | Completa nombre y teléfono/email en el checkout | Sí (`customer`, `consent`) |
| `payment_rejected` | Mercado Pago rechaza el pago | Sí |
| `checkout_abandoned` | Pasaron 60 min desde `checkout_started` sin pago | Sí (lo puede calcular Brandazo si la web prefiere no mandarlo) |

Campos comunes: `eventId`, `type`, `occurredAt`, `sessionId` (aleatorio, sin datos personales), `cartId`, `cartTotalMinor`, `items`, `attribution`, `resumeUrl` (link para volver al carrito). Los pasos sin datos de la persona solo se usan como cantidades en el funnel.

Antes de publicarlo lo revisamos juntos: qué pasos ya registra la tienda y si conviene mandarlos uno por uno o agrupados.

## 5. Pruebas antes de producción

1. Brandazo habilita una clave de pruebas (`cafelito-web-test`) y la entrega por canal seguro.
2. La web manda `ejemplos/pedido-pagado.json` (con su propio `orderId` de prueba) → espera `201`.
3. Reenvía el mismo → `200 duplicate`.
4. Manda `pedido-retirado.json` → `200 updated`.
5. Manda uno con un campo mal → `422` con `details`.
6. Con la clave de producción, el primer pedido real aparece en Brandazo en CRM → Tienda.
