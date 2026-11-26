# Formularios de la web → contactos de Brandazo

> Para el equipo de desarrollo de cafelito.com.ar. Versión 1.0 · 2026-11-26.
> Misma clave, firma y reintentos que el cotizador (`../cafelito-cotizador/README.md`, sección 3) y que la tienda.

## 1. Qué resuelve

Cada vez que alguien completa un formulario de la web, la persona queda como **contacto del CRM de Brandazo**: sin duplicarse (por WhatsApp o email), con la unidad de negocio y con lo que pidió. Sobre esos contactos Cafelito arma automatizaciones, campañas, ofertas y newsletters.

| Formulario | `source` | Cómo queda en Brandazo |
|---|---|---|
| Coworking («Reservar») | `coworking` | **Cliente** de Cafelito Work, con la reserva en su ficha |
| Contacto («Enviar mensaje») | `contacto` | Lead (si ya era cliente, sigue siendo cliente), con el tema y el mensaje |
| Newsletter (si se agrega) | `newsletter` | Lead |

Las reservas de coworking **las siguen confirmando las chicas por el WhatsApp de Cafelito**, como hoy. Esto solo suma a la persona al CRM.

## 2. Qué hay que cambiar en la web

1. **En el servidor**, donde hoy se procesan `/api/coworking` (y `/api/contact`), después de mandar el mail, enviar el aviso a Brandazo (sección 3). Si Brandazo falla, **no tiene que afectar** a la persona ni al mail: registrar el error y reintentar en segundo plano.
2. **Sumar al formulario de coworking** (recomendado, para poder mandarle novedades):
   - un campo **«Email (opcional)»**;
   - la casilla **«Quiero recibir novedades y promociones de Cafelito»**, sin marcar por defecto. Se manda en `consent`. Sin esa casilla marcada, Brandazo guarda el contacto pero **no lo incluye en promociones ni newsletters**.
3. **Mandar `attribution`** con los `utm_*` / `fbclid` / `gclid` con los que llegó la persona (los mismos que ya guarda el cotizador), para saber qué campaña trajo cada contacto.

## 3. Enviar el contacto

`POST https://www.brandazo.com.ar/api/v1/integrations/cafelito/contacts`

Encabezados: `Content-Type: application/json`, `X-Brandazo-Key-Id`, `X-Brandazo-Timestamp`, `X-Brandazo-Signature` (HMAC del cuerpo, igual que el cotizador) y `Idempotency-Key` = `eventId`.

Ejemplo de coworking (los campos `people`, `date`, `from`, `to` son los que la web ya arma hoy):

```json
{
  "schemaVersion": "1.0",
  "eventId": "cw_7f3c2a90-1d4e-4c8b-9a51-0b6e2f8d4c11",
  "source": "coworking",
  "submittedAt": "2026-11-26T14:05:00-03:00",
  "contact": { "name": "Sofía Ruiz", "phone": "351 15 777-1234", "email": "sofia@example.com" },
  "coworking": { "people": 6, "date": "2026-12-02", "from": "10:00 hs", "to": "14:00 hs" },
  "source_page": "https://www.cafelito.com.ar/#coworking",
  "attribution": { "utmSource": "instagram", "utmMedium": "paid_social", "utmCampaign": "cowork-dic" },
  "consent": { "marketing": true, "text": "Quiero recibir novedades y promociones de Cafelito", "capturedAt": "2026-11-26T14:04:50-03:00" }
}
```

Ejemplo del formulario de contacto:

```json
{
  "schemaVersion": "1.0", "eventId": "ct_2b8e…", "source": "contacto", "submittedAt": "2026-11-26T15:00:00-03:00",
  "contact": { "name": "Juan Pérez", "email": "juan@example.com" },
  "topic": "Torta", "message": "Quiero una torta para 20 personas el sábado"
}
```

Reglas:
- `contact.name` y **al menos** `phone` o `email`.
- `eventId`: uno nuevo (UUID) por cada envío del formulario; reenviar el mismo `eventId` con el mismo cuerpo no duplica nada (`200 duplicate`); con otro cuerpo da `409`.
- Esquema completo: `schemas/contact.request.json` (campos de más se rechazan con `422` y el detalle).

Respuesta `201`:

```json
{ "status": "created", "eventId": "cw_7f3c…", "contact": { "id": "…", "match": "new", "type": "Cliente" } }
```

Errores: `4xx` = dato mal (no reintentar sin corregir; `422` dice qué campo) · `429` / `5xx` = reintentar con el mismo cuerpo e `Idempotency-Key` (1 s, 5 s, 30 s, 2 min).

## 4. Pruebas

Con la clave de pruebas (`cafelito-web-test`, en la variable de Preview) los contactos van a una empresa ficticia. Mandar el ejemplo de coworking → `201`; reenviarlo → `200 duplicate`; mandar otro con el mismo WhatsApp → `201` con `"match": "existing"`. Con la clave de producción, el contacto aparece en Brandazo → CRM → Contactos, con «Desde la web» en su ficha.
