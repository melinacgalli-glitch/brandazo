# Etapa 0 — Ingreso real, empresas y datos en la nube

_Última actualización: 2026-11-17 · Estado: **publicado** (reglas, índices, función `api` y sitio). Alta hecha: empresas `cafelito` y `cafelito-pruebas`, invitación de la Dueña en ambas; dominios autorizados agregados._

## Qué cambia para la usuaria
- En **www.brandazo.com.ar** hay que iniciar sesión de verdad: con Google o con email y contraseña (el email se verifica con un enlace).
- **Registro cerrado:** solo entra quien fue invitado. Sin invitación ve «Todavía no tenés acceso a ninguna empresa» (y puede mirar la demo, que queda solo en su navegador).
- Las empresas «En la nube» se guardan solas y las ve todo su equipo. Con sesión iniciada solo se ven esas; las que estaban en el navegador (y la de ejemplo «Estudio Norte») quedan ocultas y se suben con **menú de usuario → Subir datos de este navegador a la nube** (antes guarda una copia de seguridad en el navegador; la empresa de ejemplo no se sube).
- **CRM → Cafelito Eventos:** tablero en vivo con las cotizaciones del sitio de Cafelito, ficha con contacto, evento, presupuesto, botón de WhatsApp, etapa, responsable, próximo seguimiento, motivo de pérdida e historial. «Configurar» (Dueño/Admin): marca de las cotizaciones, responsable por defecto y horas hasta el primer seguimiento.
- **Configuración → Usuarios:** invitar, cambiar roles, cancelar invitaciones y quitar personas, todo real. Brandazo no manda el mail de invitación: se avisa a la persona por otro medio.

## Ciclo de vida de una cotización (CRM → Cafelito Eventos)
| Pasar a | Pide | Obligatorio |
|---|---|---|
| Contactado | Canal (WhatsApp, llamada, mail, en persona), nota, próximo seguimiento | Próximo seguimiento |
| Propuesta enviada | Importe, enviada el, válida hasta, link | Importe y próximo seguimiento |
| En negociación | Tema (precio, fecha, menú, invitados, otro), nota | Nota y próximo seguimiento |
| Ganada | Importe final, seña (50 % por defecto), si ya se cobró | Importe final |
| Perdida | Motivo, nota, se puede volver a contactar | Motivo |

Campos en `opportunities`: `proposal {amountMinor, sentAt, validUntil, link}`, `won {amountMinor, depositMinor, depositPaid, depositPaidAt, balancePaid, balancePaidAt}`, `negotiation {topic}`, `lostReason`, `lostNote`, `canRecontact`. Historia: `tenants/{t}/activities {opportunityId, contactId, at, by, byName, type: etapa|contacto|nota|cobro|cambio, via, text, from, to, details}`. Código: `public/js/9-ciclo-vida.js`.

## Archivos
| Archivo | Qué hace |
|---|---|
| `public/js/6-nube.js` | Firebase (Auth + Firestore), control de ingreso, invitaciones, carga y guardado por partes, subida desde el navegador, equipo real. |
| `public/js/7-crm-eventos.js` | Solapa «Cafelito Eventos» del CRM. |
| `public/vendor/firebase-10.14.1/` | SDK de Firebase servido desde el propio sitio. |
| `firestore.rules` | Aislamiento por empresa y permisos (ver abajo). |
| `firestore.indexes.json` | Índice de `members.uid` para buscar «mis empresas». |
| `rules-test/reglas.test.js` | 12 pruebas de reglas. |
| `rules-test/e2e-nube.js` | Recorrido completo en el navegador (28 controles). |
| `scripts/alta-empresas.js` | Alta inicial: administradores de plataforma, empresas Cafelito y Cafelito (pruebas), invitación del Dueño. El email va como argumento. |

## Datos (Firestore)
- `config/platform` `{admins:[emails]}`: quién puede crear empresas. Solo lo escribe el script de alta.
- `tenants/{id}` `{name, country, industry, size, ownerUid?}`.
- `tenants/{id}/members/{uid}` `{uid, email, name, role, status}`.
- `invites/{email}__{empresa}` `{email, tenantId, tenantName, role, invitedBy, invitedByName}`: se borra al aceptarla.
- `tenants/{id}/state/{parte}` `{json, updatedAt, by}`: partes `base`, `m_<módulo>`, `x`. Solo se escriben las que cambiaron. Límite por parte: ~1 MB.
- Lo que escribe el servidor (cotizaciones) está en `docs/servidor.md`.

## Permisos (reglas)
- Nadie ve ni escribe datos de una empresa de la que no es miembro.
- Aceptar una invitación exige email verificado y el mismo rol de la invitación.
- Invitar, cambiar roles y configurar el tablero: Dueño o Admin. Nadie pasa a Dueño ni saca al Dueño desde la app.
- Oportunidades: el equipo solo cambia etapa, responsable, motivo de pérdida (obligatorio si «Perdida»), próximo seguimiento e historial. Presupuesto y datos del pedido, nunca.
- Contactos, cotizaciones, tareas y avisos: solo lectura. Índices, idempotencia, límites y registro técnico: sin acceso.
- Auditoría: se agrega a nombre propio y no se borra.

## Probar
```bash
cd rules-test && npm install && cd ..
```
```bash
firebase emulators:exec --only firestore --project demo-brandazo "cd rules-test && npm test"
```
```bash
python3 -m http.server 8410 --bind 127.0.0.1 -d public
```
```bash
firebase emulators:exec --only auth,firestore --project brandazo "node rules-test/e2e-nube.js"
```
En el navegador local, `http://localhost:8410/?emu=1` usa los emuladores (aparece el aviso «Running in emulator mode»).

## Para publicar (pasos)
1. Firebase → Authentication → Método de acceso: habilitar **Google** y **Correo electrónico/contraseña**.
2. Authentication → Configuración → Dominios autorizados: agregar `www.brandazo.com.ar` y `brandazo.com.ar`.
3. Publicar reglas, índices, hosting y la función `api` (por el cambio de marca).
4. Correr `scripts/alta-empresas.js` con el email del Dueño.
5. Entrar, aceptar la invitación y subir los datos del navegador.
