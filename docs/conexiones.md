# Conexiones reales: Meta (Instagram y Facebook) y Google Ads

_Última actualización: 2026-11-17 · Estado: **publicado** (funciones `conexiones` y `sincronizarConexiones`, reglas, sitio). Secretos `META_APP` y `GOOGLE_ADS` creados con `{}`: falta que Melina cree las apps y cargue los datos (pasos abajo); después se vuelven a publicar las funciones._

## Qué hace
- **Redes sociales** (empresa en la nube): botón «Conectar Instagram y Facebook». Trae, por cada página de Facebook y su Instagram profesional: seguidores, cantidad de publicaciones, últimas 25 publicaciones (me gusta, comentarios y, en Instagram, alcance de las 12 más recientes) y alcance diario de 28 días. Cada cuenta se asigna a una marca (filtra con el selector de marcas).
- **Métricas → Google Ads**: botón «Conectar Google Ads». Trae de cada cuenta (no las de administrador) las campañas de los últimos 30 días: inversión, clics, impresiones, conversiones, y la inversión por día. Dinero en **centavos** de la moneda de la cuenta (`cost_micros / 10.000`).
- Solo **lee**. No publica ni cambia anuncios.
- Se actualiza sola todos los días a las 6 (Córdoba) y con «Actualizar ahora». Sin dato → «Sin datos».
- Las demás integraciones (WhatsApp, TikTok, LinkedIn, etc.) siguen diciendo «todavía no disponible».

## Piezas
| Pieza | Dónde |
|---|---|
| Función `conexiones` (HTTP) y `sincronizarConexiones` (diaria) | `functions/index.js`, `functions/src/connections.js` |
| Rutas | `/api/v1/connect/{meta|google-ads}/{start|callback|sync|disconnect|status}` (Hosting → función `conexiones`) |
| Pantallas | `public/js/8-conexiones.js` |
| Datos (lectura del equipo) | `tenants/{t}/connections/{meta|googleAds}`, `social/*`, `socialDaily/*` (seguidores por día), `ads/{cuenta}`, `settings/social` (marca de cada cuenta) |
| Permisos de acceso | `tenants/{t}/private/{meta|googleAds}`: **nunca** se leen desde el navegador |
| Pase de un solo uso | `connectStates/{state}` (10 minutos, se borra al usarse; TTL) |
| Secretos | `META_APP` = `{"appId","appSecret","configId"?}` · `GOOGLE_ADS` = `{"clientId","clientSecret","developerToken","loginCustomerId"?}` |
| Versiones de API | Graph `v24.0`, Google Ads `v26` (constantes en `connections.js`) |
| Pruebas | `functions/test/conexiones.test.js` (servidor), `rules-test/e2e-conexiones.js` (navegador), simulador `functions/test/simulador.js` |

Solo el Dueño o un Admin conectan, actualizan o desconectan. Al desconectar Meta se le avisa a Meta que se quitó el permiso.

## Lo que tiene que hacer Melina

### A. App de Meta (una vez)
1. Entrar a **developers.facebook.com** con la cuenta de Facebook que administra la página de Cafelito → **Mis apps → Crear app**.
2. Nombre: **Brandazo**. Caso de uso: elegir los de **administrar páginas** y **Instagram (API con inicio de sesión de Facebook)**. Si pide tipo, **Empresa**. Vincularla al portfolio comercial de Cafelito si lo ofrece.
3. En **Inicio de sesión con Facebook (para empresas) → Configuración**: en «URI de redireccionamiento de OAuth válidos» poner `https://www.brandazo.com.ar/api/v1/connect/meta/callback`. Si la app es de tipo Empresa, crear una **configuración** con los permisos `pages_show_list`, `pages_read_engagement`, `read_insights`, `instagram_basic`, `instagram_manage_insights`, `business_management` y anotar su **ID de configuración**.
4. **Configuración de la app → Básica**: copiar **Identificador de la app** y **Clave secreta**.
5. Mientras la app esté en modo desarrollo, funciona para quien la administra (Melina): no hace falta la revisión de Meta para sus propias cuentas.

### B. Google Ads (una vez)
1. **Google Cloud** (proyecto `brandazo`) → habilitar **Google Ads API**.
2. **Google Auth Platform → Información de marca**: app «Brandazo», email de soporte. Público: **Externo**. Estado: **En producción** (en «Prueba» el permiso vence a los 7 días). Google va a mostrar «Google no verificó esta app»: tocar *Avanzado → Ir a Brandazo*.
3. **Clientes → Crear cliente → Aplicación web**. URI de redireccionamiento: `https://www.brandazo.com.ar/api/v1/connect/google-ads/callback`. Copiar **ID de cliente** y **Secreto**.
4. **Token de desarrollador**: necesita una **cuenta de administrador de Google Ads** (gratis, en ads.google.com → cuentas de administrador) vinculada a la cuenta de Cafelito. En esa cuenta: **Herramientas → Centro de API** → completar el formulario. Sale primero con «acceso de prueba» (solo cuentas de prueba): hay que pedir **acceso básico** (revisión de Google, suele tardar unos días). Recién con acceso básico se ven los datos reales.

### C. Cargar los datos en Brandazo (sin pasarlos por chat ni mail)
Google Cloud → **Secret Manager** → `META_APP` → **Nueva versión** → pegar:
```json
{"appId":"IDENTIFICADOR","appSecret":"CLAVE_SECRETA","configId":"ID_DE_CONFIGURACION_SI_HAY"}
```
`GOOGLE_ADS` → **Nueva versión**:
```json
{"clientId":"ID_DE_CLIENTE","clientSecret":"SECRETO","developerToken":"TOKEN","loginCustomerId":"ID_CUENTA_ADMINISTRADOR_SIN_GUIONES"}
```
Después avisar para volver a publicar las funciones (toman la versión nueva al publicarse).

## Probar
```bash
firebase emulators:exec --only functions,firestore,auth --project demo-brandazo "node --test functions/test/conexiones.test.js"
```
```bash
python3 -m http.server 8410 --bind 127.0.0.1 -d public
```
```bash
firebase emulators:exec --only functions,auth,firestore --project brandazo "node rules-test/e2e-conexiones.js"
```
Requieren `functions/.secret.local` y `functions/.env.local` (solo emulador, fuera del repositorio) con valores de prueba y las direcciones del simulador (`http://127.0.0.1:5999`).

## Riesgos conocidos
- Meta cambia permisos y métricas seguido: si una métrica deja de existir, queda «Sin datos» y el aviso de la conexión lo cuenta.
- El permiso de Meta vence a los 60 días: la pantalla avisa 7 días antes («Volver a conectar»).
- Google Ads: sin «acceso básico» del token no hay datos reales.
