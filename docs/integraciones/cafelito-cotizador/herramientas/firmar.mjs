// Firma y envío de referencia para el servidor de cafelito.com.ar.
// La firma va en el encabezado X-Brandazo-Signature: v1=<hex de HMAC-SHA256(secreto, `${timestamp}.${cuerpo}`)>
//
// Uso:
//   node firmar.mjs vector                                   → imprime el vector de prueba (verificá tu implementación contra él)
//   node firmar.mjs enviar ../ejemplos/solicitud-valida.json  → envía al ambiente de pruebas con reintentos
//      Variables: BRANDAZO_URL, BRANDAZO_KEY_ID, BRANDAZO_SECRET (nunca escribas el secreto en el código ni en el repo)
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Firma: HMAC-SHA256 en hexadecimal, en minúsculas, sobre `${timestamp}.${cuerpoCrudo}`. */
export function firmar(secreto, timestamp, cuerpoCrudo) {
  return 'v1=' + createHmac('sha256', secreto).update(`${timestamp}.${cuerpoCrudo}`, 'utf8').digest('hex');
}

/** Verificación (lo que hace Brandazo): compara en tiempo constante y rechaza timestamps viejos. */
export function verificar(secreto, timestamp, cuerpoCrudo, firma, ahora = Math.floor(Date.now() / 1000), tolerancia = 300) {
  if (!/^\d{10}$/.test(String(timestamp)) || Math.abs(ahora - Number(timestamp)) > tolerancia) return { ok: false, code: 'TIMESTAMP_OUT_OF_RANGE' };
  const esperado = Buffer.from(firmar(secreto, timestamp, cuerpoCrudo));
  const recibido = Buffer.from(String(firma || ''));
  if (esperado.length !== recibido.length || !timingSafeEqual(esperado, recibido)) return { ok: false, code: 'INVALID_SIGNATURE' };
  return { ok: true };
}

/** Envío con reintentos seguros: mismo cuerpo e Idempotency-Key; timestamp y firma nuevos en cada intento. */
export async function enviar({ url, keyId, secreto, cuerpoCrudo, intentos = 5, esperaBaseMs = 1000 }) {
  const quoteId = JSON.parse(cuerpoCrudo).quoteId;
  for (let n = 1; n <= intentos; n++) {
    const ts = Math.floor(Date.now() / 1000);
    let res, cuerpo;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brandazo-Key-Id': keyId, 'X-Brandazo-Timestamp': String(ts), 'X-Brandazo-Signature': firmar(secreto, ts, cuerpoCrudo), 'Idempotency-Key': quoteId },
        body: cuerpoCrudo, signal: AbortSignal.timeout(10000)
      });
      cuerpo = await res.json().catch(() => null);
    } catch (e) { cuerpo = { error: { code: 'NETWORK', message: String(e), retryable: true } }; }
    const st = res ? res.status : 0;
    console.log(`intento ${n}: HTTP ${st}`, JSON.stringify(cuerpo));
    if (st === 200 || st === 201) return { ok: true, status: st, cuerpo };
    const reintentar = st === 0 || st === 429 || st >= 500 || (cuerpo && cuerpo.error && cuerpo.error.retryable);
    if (!reintentar) return { ok: false, status: st, cuerpo };          // 4xx: corregir, no reintentar
    const retryAfter = Number(res && res.headers.get('Retry-After')) * 1000;
    await new Promise(r => setTimeout(r, retryAfter || esperaBaseMs * 4 ** (n - 1)));  // 1 s, 4 s, 16 s, 64 s…
  }
  return { ok: false, status: 0, cuerpo: null };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, archivo] = process.argv.slice(2);
  if (cmd === 'vector') {
    const secreto = 'brz_test_secreto_SOLO_PARA_VERIFICAR_LA_FIRMA';
    const ts = 1795000000;
    const cuerpo = '{"schemaVersion":"1.0","quoteId":"5b0f9c1e-8a2d-4c3b-9f1e-2d7a6c4b8e10"}';
    console.log(JSON.stringify({ secreto, timestamp: ts, cuerpo, firma: firmar(secreto, ts, cuerpo) }, null, 2));
  } else if (cmd === 'enviar') {
    const { BRANDAZO_URL: url, BRANDAZO_KEY_ID: keyId, BRANDAZO_SECRET: secreto } = process.env;
    if (!url || !keyId || !secreto) { console.error('Faltan BRANDAZO_URL, BRANDAZO_KEY_ID o BRANDAZO_SECRET'); process.exit(1); }
    const cuerpoCrudo = JSON.stringify(JSON.parse(readFileSync(archivo, 'utf8')));
    const r = await enviar({ url, keyId, secreto, cuerpoCrudo });
    process.exit(r.ok ? 0 : 1);
  } else {
    console.log('Uso: node firmar.mjs vector | node firmar.mjs enviar <archivo.json>');
  }
}
