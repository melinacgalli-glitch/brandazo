# Brandazo

Plataforma SaaS de marketing y ventas: **marketing y ventas, en un mismo lugar.**

## Estado

Publicado en **https://www.brandazo.com.ar** (también `brandazo.com.ar`, que redirige a www, y `brandazo.web.app`).
DNS en Cloudflare (solo DNS, sin proxy), dominio delegado desde NIC Argentina.

Versión 0.3 — **prototipo navegable** publicado en Firebase Hosting.
Lo que se carga queda guardado **en el navegador** de quien lo usa (no se comparte entre
computadoras ni personas). Desde el menú de usuario se pueden borrar esos datos.
Todavía no hay servidor, base de datos ni ingreso real.

## Estructura

```
public/
  index.html          página única (rutas con #/…)
  css/estilos.css     tokens de marca y estilos
  js/1-base.js        íconos, estado, utilidades, acceso, onboarding, shell, configuración
  js/2-modulos.js     estrategia, contenidos, campañas, redes, marca
  js/3-modulos.js     CRM, automatizaciones, comunicaciones, métricas, integraciones
  js/4-funnel.js      Estrategia → Funnel de conversión (ver docs/funnel.md)
  js/5-editorial.js   Contenidos → Planificaciones y Aprobaciones (ver docs/contenidos.md)
  favicon.svg
firebase.json         configuración de Firebase (Hosting, Functions, Firestore, emuladores)
functions/            servidor: integración del cotizador (ver docs/servidor.md)
firestore.rules       reglas de la base (cerrada al navegador hasta la Etapa 0)
.firebaserc           proyecto de Firebase asociado
docs/                 documentación y decisiones
  integraciones/cafelito-cotizador/   contrato de la API para el cotizador de cafelito.com.ar
```

## Probar en local

```bash
npx firebase-tools emulators:start --only hosting
```

o abrir `public/index.html` con cualquier servidor estático.

## Publicar

```bash
npx firebase-tools deploy --only hosting
```
