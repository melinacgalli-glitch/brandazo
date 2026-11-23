# Códigos de descuento de Brandazo en la tienda web de Cafelito

> Para el equipo de desarrollo de cafelito.com.ar. Versión 1.0 · 2026-11-23.
> Complementa la integración de pedidos (`README.md` de esta carpeta). Firma y claves: las mismas de esa integración.

## 1. La acción

Cuando alguien hace **su primera compra** en la tienda de Cafelito Cakes, al día siguiente de retirar la torta Brandazo le manda un mail de agradecimiento con un **código personal de descuento**:

| | |
|---|---|
| Formato | `GRACIAS-XXXX` (prefijo + guion + 4 letras/números; puede cambiar el prefijo, siempre `PREFIJO-CÓDIGO`) |
| Descuento | **10 %** (Brandazo informa el porcentaje de cada código; no lo fijen en el código de la web) |
| Validez | **30 días** desde que se envió el mail (Brandazo informa la fecha de vencimiento) |
| Usos | **Uno solo**, en el local **o** en la web |
| Personal | Cada cliente tiene el suyo |

En el **local** lo canjea la caja en Brandazo y aplica el 10 % en Fudo. En la **web** lo tienen que habilitar ustedes, así:

## 2. Qué hay que habilitar en la web

1. **Campo «Código de descuento»** en el checkout, antes de generar el pago de Mercado Pago, con un botón «Aplicar».
2. **Validarlo desde el servidor de la web** (nunca desde el navegador) con la consulta de la sección 3.
3. Si es válido: **aplicar el porcentaje** al total de productos, mostrarlo en el resumen («Descuento GRACIAS-7KQ4 · −$ 6.300») y **crear el pago de Mercado Pago por el importe ya descontado**, calculado en el servidor.
4. **Guardar el código en el pedido.** Justo antes de crear el pago, **volver a consultarlo** (pudo haberse usado en el local mientras tanto).
5. Cuando Mercado Pago aprueba el pago, **mandar el código en el aviso del pedido pagado** (sección 4). Ahí Brandazo lo marca como usado. La consulta **no** lo marca usado.

Mensajes sugeridos para la persona según la respuesta:

| `state` | Mensaje |
|---|---|
| `valid` | «¡Listo! Se aplicó un 10 % de descuento.» |
| `used` | «Este código ya se usó.» |
| `expired` | «Este código venció el 25/12.» (usar `expiresOn` si lo tienen; si no, solo «venció») |
| `not_found` / `invalid_format` | «No encontramos ese código. Revisá que esté bien escrito.» |

## 3. Consultar un código

`POST https://www.brandazo.com.ar/api/v1/integrations/cafelito/coupons/check`

- Encabezados: `Content-Type: application/json`, `X-Brandazo-Key-Id`, `X-Brandazo-Timestamp`, `X-Brandazo-Signature` (HMAC-SHA256 del cuerpo, igual que en los pedidos). No lleva `Idempotency-Key`.
- Cuerpo: `{"code":"GRACIAS-7KQ4"}` (mayúsculas o minúsculas, Brandazo lo normaliza).
- Límite: 30 consultas por minuto por clave (protege contra quien pruebe códigos al azar). Si se supera: `429`.

Respuesta `200`:

```json
{ "code": "GRACIAS-7KQ4", "valid": true, "state": "valid", "percentOff": 10, "expiresOn": "2026-12-25" }
```

`state`: `valid` · `used` · `expired` · `not_found` · `invalid_format`. Solo cuando `valid` es `true` se aplica el descuento. No devuelve datos de la persona.

Ejemplo (Node, servidor):

```js
import { createHmac } from 'node:crypto';
async function consultarCodigo(code) {
  const body = JSON.stringify({ code }), ts = Math.floor(Date.now() / 1000);
  const firma = 'v1=' + createHmac('sha256', process.env.BRANDAZO_SECRET).update(`${ts}.${body}`).digest('hex');
  const r = await fetch('https://www.brandazo.com.ar/api/v1/integrations/cafelito/coupons/check', {
    method: 'POST', body,
    headers: { 'Content-Type': 'application/json', 'X-Brandazo-Key-Id': process.env.BRANDAZO_KEY_ID, 'X-Brandazo-Timestamp': String(ts), 'X-Brandazo-Signature': firma }
  });
  if (!r.ok) throw new Error('Brandazo ' + r.status); // 401 firma · 429 demasiadas consultas · 5xx reintentar
  return r.json(); // { valid, state, percentOff, expiresOn }
}
```

Si Brandazo no responde (error de red o 5xx), **no apliquen el descuento** y muestren «No pudimos validar el código, probá en unos minutos». No bloqueen la compra sin código.

## 4. Avisar el uso (en el pedido pagado)

En el aviso `status: "paid"` de `POST /shop-orders` (ver `README.md`), sumar:

```json
"discountMinor": 630000,
"totalMinor": 5670000,
"coupon": { "code": "GRACIAS-7KQ4", "discountMinor": 630000 }
```

- `totalMinor` es lo cobrado (ya con el descuento); `discountMinor`, el descuento en centavos.
- Brandazo marca el código como **usado en la web**, con la compra y el importe, para medir la acción.
- Si el código ya no servía (se usó en otra compra, venció o no existe), **el pedido se guarda igual** y la respuesta trae un aviso en `warnings`: `COUPON_ALREADY_USED`, `COUPON_EXPIRED` o `COUPON_NOT_FOUND`. El pago ya se cobró: registren el aviso y avisen a administración, pero no lo reintenten ni lo frenen.
- Reenviar el mismo aviso (mismo `eventId`) no lo vuelve a canjear. Los avisos posteriores del mismo pedido (`picked_up`, etc.) pueden repetir el `coupon` sin problema.

## 5. Pruebas

1. Brandazo les da una **clave de pruebas** (empresa ficticia) y crea ahí códigos de prueba: uno válido, uno usado y uno vencido.
2. Consultar los tres → `valid`, `used`, `expired`; un código inventado → `not_found`.
3. Mandar un pedido pagado con el válido → `201` sin avisos; consultarlo de nuevo → `used`.
4. Mandar otro pedido con el mismo código → `201` con `COUPON_ALREADY_USED`.
5. Con la clave de producción, el primer uso real aparece en Brandazo → Automatizaciones («Códigos usados»).

## 6. Seguridad

- La clave (`BRANDAZO_KEY_ID` / `BRANDAZO_SECRET`) vive solo en el servidor (variables de entorno de Vercel, sin `NEXT_PUBLIC_`). Nunca en el navegador ni en el repositorio.
- El importe a cobrar se calcula en el servidor con el `percentOff` que devolvió Brandazo, no con lo que mande el navegador.
- Brandazo entrega una **clave nueva** al equipo actual (la anterior se da de baja). Se pasa por un canal seguro, no por mail ni chat.
