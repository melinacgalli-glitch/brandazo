# Servidor de Brandazo (Firebase)

_Última actualización: 2026-11-17 · Fase 2 de la integración del cotizador (en desarrollo, sin publicar)_

## Qué hay
| Pieza | Dónde |
|---|---|
| Función HTTP `api` (Cloud Functions 2.ª gen, `southamerica-east1`, Node 22) | `functions/index.js` |
| Recepción de cotizaciones de Cafelito Ambulante | `functions/src/eventQuotes.js` |
| Firma HMAC, teléfonos, recálculo del presupuesto | `functions/src/sign.js`, `phone.js`, `estimate.js` |
| Copia exacta del contrato (esquemas y tarifas) | `functions/contract/` (una prueba verifica que sea idéntica a `docs/integraciones/cafelito-cotizador/`) |
| Reglas de Firestore | `firestore.rules`: **todo cerrado desde el navegador** hasta la Etapa 0 (ingreso real). Solo escribe el servidor. |
| TTL (borrado automático) | `firestore.indexes.json`: `idempotency.expireAt` (30 días) y `rateLimits.expireAt`. |

## Modelo de datos (por empresa: `tenants/{tenantId}`)
| Colección | Contenido |
|---|---|
| `contacts` | Contacto: nombre, teléfono original y normalizado (`phoneE164`), marca, `firstSource` (origen histórico, se guarda una sola vez), `marketingConsent`, cantidad de cotizaciones. |
| `contactsByPhone/{e164}` | Índice único por teléfono normalizado: evita contactos duplicados. |
| `opportunities` | Una por evento: pipeline `cafelito-eventos`, etapa, evento, selección, necesidades alimentarias, notas, presupuesto (recalculado, el de la web y su comparación, **en centavos**), origen y atribución, responsable, próximo seguimiento, motivo de pérdida. |
| `eventQuotes/{receiptId}` | La cotización completa tal como llegó, con hora de recepción, hash del cuerpo, avisos, atribución y consentimiento. |
| `pipelines/cafelito-eventos` | Etapas: Nueva cotización, Contactado, Propuesta enviada, En negociación, Ganada, Perdida. |
| `tasks` | Tarea «Primer contacto» por cada cotización. |
| `notifications` | Aviso interno al responsable. |
| `audit` | Auditoría de cambios comerciales. |
| `idempotency/{quoteId}` | Respuesta guardada para devolver la misma ante reintentos (30 días). |
| `integrationLog/{requestId}` | Registro técnico de cada intento **sin datos personales**: estado, código, clave, quoteId. |
| `settings/cafelito-eventos` | Configuración: `defaultOwner`, `assignByEventType` (responsable por tipo de evento), `followUpHours` (24 por defecto), `brand`. |

Todo lo de una cotización se escribe en **una sola transacción**: o queda todo guardado, o nada. El éxito se responde después de confirmar.

## Secretos
`INTEGRATION_KEYS` en **Secret Manager**: JSON `{"<keyId>": {"secret": "...", "tenantId": "...", "brand": "...", "test": true}}`. `test: true` marca la clave de pruebas (empresa ficticia y falla simulada habilitada). Para rotar una clave se agrega otra entrada con otro `keyId`. Nunca en el código, el repositorio, chats ni mails. En el emulador se usa `functions/.secret.local` (ignorado por git) con una clave de prueba.

## Pruebas
```bash
cd functions && npm install
```
```bash
npm test
```
```bash
cd .. && firebase emulators:exec --only functions,firestore --project demo-brandazo "node --test functions/test/integracion.test.js"
```
Cubren los pasos 2 a 9 del procedimiento de validación del contrato, 5 reenvíos simultáneos sin duplicar, contacto existente con el teléfono escrito distinto, origen histórico sin pisar, atribución con `fbclid`, consentimiento, avisos que no frenan, errores y registro técnico sin datos personales.

## Para publicar (pendiente)
1. Plan **Blaze** en el proyecto (pago por uso).
2. Base Firestore en `brandazo` (southamerica-east1, modo producción). **No hay proyecto de pruebas aparte**: la clave `cafelito-web-test` (`test: true`) escribe en la empresa ficticia `cafelito-pruebas`.
3. Cuenta de servicio `claude-deploy` con Editor, Administrador de Cloud Functions, Administrador de Cloud Run, Administrador de Secret Manager y Usuario de cuenta de servicio; clave nueva (la anterior se borra).
4. Crear el secreto `INTEGRATION_KEYS` y la clave `cafelito-web-test` (entrega al equipo web por canal seguro).
5. Activar TTL en Firestore para `expireAt` (lo publica `firestore.indexes.json`).
6. Agregar a `firebase.json` el rewrite de Hosting `/api/v1/**` → función `api` (región `southamerica-east1`) **recién cuando la función exista**, para no romper la publicación del sitio.
7. Publicar, correr el procedimiento de validación con la clave de pruebas y recién después entregar la clave de producción (`cafelito-web`, empresa `cafelito`).

## Notas
- JSON mal formado: la plataforma responde `400` antes de llegar a Brandazo (sin el formato de error del contrato).
- El ingreso real y las pantallas del CRM leyendo esta base son la Etapa 0 (siguiente paso).
