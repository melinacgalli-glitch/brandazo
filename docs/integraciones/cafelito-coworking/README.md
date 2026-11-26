# Reservas de coworking con bloqueo de salas (sin clave)

> Para el equipo de desarrollo de cafelito.com.ar. Versión 1.0 · 2026-11-26.
> Reemplaza, **solo para el formulario de coworking**, el aviso a `/contacts`: la reserva ya deja a la persona como contacto en Brandazo. El formulario de contacto sigue igual.

## 1. Qué resuelve

Cada reserva enviada desde la web **ocupa una sala en ese momento**. La web solo ofrece horarios en los que hay una sala libre para esa cantidad de personas, así que ya no se superponen reservas. No hay pago ni confirmación aparte: la reserva queda hecha al enviarla. El mail a administración sigue igual.

- **Salas:** para 4, para 8 y para 10 personas. Brandazo asigna **la más chica que entre** y esté libre todo el horario.
- **Horario:** lunes a viernes de 8:30 a 20; sábados de 9 a 13 y de 17 a 20; domingos de 17 a 20.
- **Reservas:** cada 30 minutos, de **2 a 8 horas**, dentro de una misma franja. Se puede reservar para el mismo día, desde la hora actual. Más de 10 personas: no hay sala.
- Estos valores vienen en la respuesta de disponibilidad: **no los pongan fijos en la web**, así un cambio en Brandazo se ve solo.

## 2. Sin clave: se llama directo desde el navegador

No hace falta ninguna variable en Vercel. La página de reservas llama a Brandazo con `fetch` desde el navegador.

Base: `https://www.brandazo.com.ar/api/v1/public/cafelito/coworking`

- Solo se acepta desde `https://www.cafelito.com.ar` y `https://cafelito.com.ar` (encabezado `Origin`, lo pone el navegador).
- **Pruebas:** desde las vistas previas de Vercel (`https://*.vercel.app`) usen `…/public/cafelito-pruebas/coworking`: va a una empresa ficticia, separada de las reservas reales.

## 3. Consultar disponibilidad

`GET {base}/availability?date=2026-12-07`

```json
{
  "date": "2026-12-07", "today": "2026-11-26", "closed": false,
  "open": [ { "from": "08:30", "to": "20:00" } ],
  "stepMinutes": 30, "minMinutes": 120, "maxMinutes": 480, "maxPeople": 10,
  "rooms": [
    { "id": "sala-4",  "name": "Sala para 4",  "capacity": 4,  "busy": [ { "from": "10:00", "to": "13:00" } ] },
    { "id": "sala-8",  "name": "Sala para 8",  "capacity": 8,  "busy": [] },
    { "id": "sala-10", "name": "Sala para 10", "capacity": 10, "busy": [ { "from": "08:30", "to": "20:00" } ] }
  ]
}
```

- Si la fecha es hoy, viene además `"notBefore": "15:30"`: no ofrecer inicios anteriores.
- `closed: true` → ese día no abre.
- No trae nombres ni teléfonos: solo franjas ocupadas.

**Qué horarios mostrar** para `P` personas: un inicio `S` con duración `D` sirve si
1. `D` está entre `minMinutes` y `maxMinutes`, en pasos de `stepMinutes`;
2. `[S, S+D)` cabe entero dentro de una franja de `open` (y `S ≥ notBefore` si es hoy);
3. hay **alguna** sala con `capacity ≥ P` cuyo `busy` no se cruce con `[S, S+D)`. Una reserva puede empezar justo cuando termina otra.

Consultar de nuevo al cambiar la fecha o la cantidad de personas, y justo antes de enviar.

## 4. Reservar

`POST {base}/reservations`

Encabezados: `Content-Type: application/json` e `Idempotency-Key: <eventId>`.

```json
{
  "eventId": "cw_7f3c2a90-1d4e-4c8b-9a51-0b6e2f8d4c11",
  "contact": { "name": "Sofía Ruiz", "phone": "351 15 777-1234", "email": "sofia@example.com" },
  "people": 6, "date": "2026-12-07", "from": "15:00", "to": "18:00",
  "attribution": { "utmSource": "instagram", "utmMedium": "paid_social", "utmCampaign": "cowork-dic" },
  "consent": { "marketing": true, "text": "Quiero recibir novedades y promociones de Cafelito", "capturedAt": "2026-11-26T14:04:50-03:00" },
  "website": ""
}
```

- `eventId`: uno nuevo (UUID) por cada envío del formulario. Si reintentan con el mismo, no se duplica (`200 duplicate`).
- `contact.name` y `contact.phone` (o `email`). `consent` solo si la persona marcó la casilla.
- **`website`**: campo trampa para robots. Agréguenlo al formulario **oculto** (no visible para personas, `tabindex="-1"`, `autocomplete="off"`) y mándenlo siempre vacío. Si viene completo, Brandazo contesta como si nada y no guarda.

Respuesta `201`:

```json
{ "status": "created",
  "reservation": { "id": "web_cw_7f3c…", "roomId": "sala-8", "roomName": "Sala para 8", "capacity": 8, "date": "2026-12-07", "from": "15:00", "to": "18:00" },
  "contact": { "id": "…", "match": "new", "type": "Cliente" } }
```

Mostrar a la persona: «¡Listo! Te reservamos la **Sala para 8** el lunes 7/12 de 15:00 a 18:00».

| Código | Qué pasó | Qué hacer en la web |
|---|---|---|
| `409 SLOT_TAKEN` | Alguien reservó ese horario recién | Volver a consultar la disponibilidad y mostrar «Ese horario se acaba de ocupar. Elegí otro». |
| `422 VALIDATION_FAILED` | Dato mal (`details` dice cuál) | Mostrar el mensaje junto al campo. |
| `429 TOO_MANY_FOR_PHONE` | Ya tiene 2 reservas ese día | Mostrar el mensaje (invita a escribir por WhatsApp). |
| `429 RATE_LIMITED` | Demasiadas reservas desde la misma conexión | Mostrar el mensaje. |
| `403 ORIGIN_NOT_ALLOWED` | Se llamó desde otro dominio | Revisar la URL (producción vs. pruebas). |
| `5xx` / sin conexión | Falla de Brandazo | Reintentar con el **mismo** cuerpo y `eventId` (1 s, 5 s, 30 s). El mail a administración sale igual. |

## 5. Ejemplo (navegador)

```js
const BASE = 'https://www.brandazo.com.ar/api/v1/public/cafelito/coworking';
const disp = await fetch(`${BASE}/availability?date=${fecha}`).then(r => r.json());
// … mostrar solo horarios válidos (sección 3) …
const eventId = 'cw_' + crypto.randomUUID();
const r = await fetch(`${BASE}/reservations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Idempotency-Key': eventId },
  body: JSON.stringify({ eventId, contact, people, date: fecha, from, to, attribution, consent, website: form.website.value })
});
const j = await r.json();
if (r.status === 201 || j.status === 'duplicate') mostrarOk(j.reservation);
else if (j.error?.code === 'SLOT_TAKEN') { await recargarDisponibilidad(); avisar(j.error.message); }
else avisar(j.error?.message || 'No pudimos reservar. Escribinos por WhatsApp.');
```

## 6. Qué ven las chicas en Brandazo

CRM → **Salas**: la agenda de las 3 salas por día, con las reservas de la web, las que cargan a mano (WhatsApp, en persona) y los bloqueos (evento privado, mantenimiento). Si cancelan o mueven una reserva, el horario se libera solo y la web lo vuelve a ofrecer.

## 7. Más adelante (opcional)

Verificación anti-robots de Cloudflare (Turnstile), sin que la persona tenga que hacer nada: cuando esté configurada, la web va a tener que mandar `turnstileToken` en la reserva. Lo avisamos antes de activarlo.
