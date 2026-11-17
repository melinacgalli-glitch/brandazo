# Brandazo

Plataforma SaaS de marketing y ventas: **marketing y ventas, a un comando.**

## Estado

Versión 0.1 — **prototipo navegable** publicado en Firebase Hosting.
Todas las pantallas funcionan con datos de ejemplo que viven en la memoria del navegador:
al recargar la página se vuelve al estado inicial (solo se recuerda el tema claro/oscuro).
Todavía no hay servidor, base de datos ni ingreso real.

## Estructura

```
public/
  index.html          página única (rutas con #/…)
  css/estilos.css     tokens de marca y estilos
  js/1-base.js        íconos, estado, utilidades, acceso, onboarding, shell, configuración
  js/2-modulos.js     estrategia, contenidos, campañas, redes, marca
  js/3-modulos.js     CRM, automatizaciones, comunicaciones, métricas, integraciones
  favicon.svg
firebase.json         configuración de Firebase Hosting
.firebaserc           proyecto de Firebase asociado
docs/                 documentación y decisiones
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
