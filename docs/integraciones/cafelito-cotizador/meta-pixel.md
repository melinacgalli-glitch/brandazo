# Conversiones de Meta (píxel + API de Conversiones) · Cotizador de Cafelito Ambulante

> Para el equipo web de cafelito.com.ar (Rodri). 2026-11-18.
> Objetivo: que Meta Ads cuente como conversión cada pedido de presupuesto del cotizador, para optimizar y medir las campañas de Instagram de Cafelito Ambulante.

**Píxel:** `1382340023828380` (Píxel de Cafelito and Co SAS). Ya está instalado en la web y hoy solo envía `PageView`.

## 1. Evento en el navegador (píxel)

Cuando el cotizador se envía **con éxito**, enviar `Lead` **una sola vez**:

```js
// Después de que el servidor de la web confirmó el envío del cotizador.
// quoteId = el mismo UUID que se manda a Brandazo (sirve para que Meta no lo cuente dos veces).
window.fbq && window.fbq('track', 'Lead', {
  content_name: 'Cotizador Cafelito Ambulante',
  content_category: tipoDeEvento,          // ej. "Corporativo", "Casamiento"
  value: subtotalEnPesos,                  // estimado sin IVA, en PESOS (no centavos), ej. 1300000
  currency: 'ARS'
}, { eventID: quoteId });
```

- No enviarlo si hay errores de validación, ni de nuevo si la persona recarga la página de gracias o si se reintenta el envío.
- Opcional: `fbq('track', 'Contact')` al tocar el botón de WhatsApp.

## 2. El mismo evento desde el servidor (API de Conversiones)

Los bloqueadores y Safari/iPhone esconden una parte de los eventos del navegador. Desde el servidor llegan todos. Meta junta los dos por `event_name` + `event_id`: **usar exactamente el mismo `quoteId`** en los dos.

**Token:** en el Administrador de eventos → píxel → Configuración → API de Conversiones → «Generar token de acceso». Guardarlo en Vercel como variable **solo del servidor**, por ejemplo `META_CAPI_TOKEN` (sin prefijo `NEXT_PUBLIC_`). Nunca en el código, el repositorio ni el navegador.

```js
// En el handler del servidor que recibe el cotizador, después de guardarlo (y de mandarlo a Brandazo).
// Si Meta falla, NO debe afectar la respuesta a la persona: loguear y seguir.
import { createHash } from 'node:crypto';
const h = v => createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');

const body = {
  data: [{
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    event_id: quoteId,                                   // igual que eventID del píxel
    action_source: 'website',
    event_source_url: pageUrl,                           // página del cotizador
    user_data: {
      ph: [h(telefonoE164SinMas)],                       // ej. "5493515550199" (solo dígitos, con 54 9)
      ...(email ? { em: [h(email)] } : {}),
      fn: [h(primerNombre)],
      client_ip_address: ipDelVisitante,                 // de x-forwarded-for (primer valor)
      client_user_agent: userAgentDelVisitante,
      ...(fbc ? { fbc } : {}),                           // cookie _fbc; si no existe y la URL trajo fbclid: `fb.1.${Date.now()}.${fbclid}`
      ...(fbp ? { fbp } : {})                            // cookie _fbp
    },
    custom_data: { currency: 'ARS', value: subtotalEnPesos, content_name: 'Cotizador Cafelito Ambulante', content_category: tipoDeEvento }
  }]
  // , test_event_code: 'TEST12345'   // solo para probar (ver sección 3); sacarlo después
};
await fetch(`https://graph.facebook.com/v24.0/1382340023828380/events?access_token=${process.env.META_CAPI_TOKEN}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});
```

- `fbc` y `fbp` mejoran mucho la coincidencia con la persona que vio el anuncio: leerlos de las cookies de la solicitud (el navegador las manda solas si el formulario se envía al mismo dominio).
- Teléfono, email y nombre van **cifrados con SHA-256** (en minúsculas, sin espacios). La IP y el navegador van sin cifrar.

## 3. Cómo probarlo antes de lanzar la campaña

1. Administrador de eventos → píxel → **Probar eventos** → copiar el código de prueba.
2. Abrir la web desde el link que muestra esa pantalla y enviar un presupuesto de prueba (con `test_event_code` en el servidor).
3. Tienen que aparecer **dos** `Lead` (navegador y servidor) marcados como **desduplicados**.
4. Sacar `test_event_code` y publicar.
5. Avisar a Melina para que lo vea en «Información general» del píxel con estado activo.

## 4. Lo que no cambia

- Los parámetros `utm_*` y `fbclid` se siguen guardando y mandando a Brandazo como hasta ahora (`attribution`): con eso Brandazo vincula cada cotización a su campaña y muestra las ventas reales.
- La política de privacidad del sitio tiene que mencionar el uso del píxel de Meta (si no lo hace ya).
