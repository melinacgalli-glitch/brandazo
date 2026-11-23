'use strict';
/* Pedidos de la tienda online de Cafelito Cakes (contrato docs/integraciones/cafelito-tienda).
   La web avisa cada cambio de estado de un pedido (pagado, retirado, cancelado, devuelto).
   - El pedido se guarda una sola vez (tenants/{t}/orders/{orderId}); los avisos siguientes lo actualizan.
   - El cliente queda como contacto del CRM, sin duplicarse (por teléfono o, si no hay, por email).
   - No se crea oportunidad: la venta ya está cerrada.
   - Cuenta como venta mientras el estado sea «paid» o «picked_up», en el mes de paidAt (zona Córdoba).
   Todo se escribe en UNA transacción. */
const Ajv2020 = require('ajv/dist/2020.js');
const addFormats = require('ajv-formats');
const { randomBytes } = require('node:crypto');
const { verify, sha256 } = require('./sign');
const { normalizePhoneAR } = require('./phone');
const { ApiError, errorBody, ajvDetails } = require('./eventQuotes');

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(require('../contract/shop-order.request.json'));

const MAX_BYTES = 64 * 1024;
const RATE_PER_MIN = 120;
const IDEM_DAYS = 30;
const TZ = 'America/Argentina/Cordoba';
const COUNTED = new Set(['paid', 'picked_up']);
const STATUS_ES = { paid: 'Pagado', picked_up: 'Retirado', cancelled: 'Cancelado', refunded: 'Devuelto' };

const rid = (prefix, n = 12) => { const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; let s = ''; for (const x of randomBytes(n)) s += a[x % a.length]; return prefix + s; };
const monthInTZ = d => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).format(d).slice(0, 7);
const emailKey = e => String(e || '').trim().toLowerCase();

async function handleShopOrder(req, deps) {
  const requestId = rid('req_');
  const now = deps.now ? deps.now() : new Date();
  let tenantRef = null, keyId = null, orderId = null;
  const log = async (status, code) => {
    if (!tenantRef) return;
    try { await tenantRef.collection('integrationLog').doc(requestId).set({ at: deps.Timestamp.fromDate(now), source: 'cafelito-tienda', keyId, orderId, status, code: code || null }); } catch { /* no rompe la respuesta */ }
  };
  try {
    if (req.method !== 'POST') throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usá POST.');
    if (!/^application\/json\b/i.test(String(req.get('content-type') || ''))) throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Falta Content-Type: application/json.');
    const raw = req.rawBody || Buffer.from('');
    if (raw.length > MAX_BYTES) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo supera los 64 KB.');

    keyId = req.get('x-brandazo-key-id'); const ts = req.get('x-brandazo-timestamp'), sig = req.get('x-brandazo-signature');
    if (!keyId || !ts || !sig) throw new ApiError(401, 'MISSING_SIGNATURE', 'Faltan los encabezados de firma (X-Brandazo-Key-Id, X-Brandazo-Timestamp, X-Brandazo-Signature).');
    const key = deps.keys[keyId];
    if (!key || !key.secret || !key.tenantId) throw new ApiError(401, 'UNKNOWN_KEY', 'La clave indicada en X-Brandazo-Key-Id no existe o está deshabilitada.');
    tenantRef = deps.db.collection('tenants').doc(key.tenantId);
    const sigErr = verify(key.secret, ts, raw, sig, Math.floor(now.getTime() / 1000));
    if (sigErr === 'TIMESTAMP_OUT_OF_RANGE') throw new ApiError(401, sigErr, 'El timestamp tiene más de 5 minutos de diferencia con la hora de Brandazo. Revisá el reloj del servidor.');
    if (sigErr) throw new ApiError(401, sigErr, 'La firma no coincide con el cuerpo recibido.');

    const minute = Math.floor(now.getTime() / 60000);
    const rlRef = tenantRef.collection('rateLimits').doc(`${keyId}_shop_${minute}`);
    const used = await deps.db.runTransaction(async tx => { const s = await tx.get(rlRef); const n = (s.exists ? s.data().n : 0) + 1; tx.set(rlRef, { n, expireAt: deps.Timestamp.fromMillis((minute + 2) * 60000) }); return n; });
    if (used > RATE_PER_MIN) throw new ApiError(429, 'RATE_LIMITED', 'Demasiadas solicitudes por minuto con esta clave.', { retryable: true, headers: { 'Retry-After': String(60 - (Math.floor(now.getTime() / 1000) % 60)) } });

    let body; try { body = JSON.parse(raw.toString('utf8')); } catch { throw new ApiError(400, 'INVALID_JSON', 'El cuerpo no es JSON válido.'); }
    const idemKey = req.get('idempotency-key');
    if (!idemKey) throw new ApiError(400, 'MISSING_IDEMPOTENCY_KEY', 'Falta el encabezado Idempotency-Key.');
    if (!validate(body)) throw new ApiError(422, 'VALIDATION_FAILED', 'La solicitud tiene campos inválidos.', { details: ajvDetails(validate.errors) });
    orderId = body.orderId;
    if (idemKey !== body.eventId) throw new ApiError(400, 'IDEMPOTENCY_KEY_MISMATCH', 'El encabezado Idempotency-Key tiene que ser igual al eventId del cuerpo.');
    if (body.status === 'paid' && !body.paidAt) throw new ApiError(422, 'VALIDATION_FAILED', 'Falta paidAt.', { details: [{ field: 'paidAt', issue: 'es obligatorio cuando status = paid' }] });
    const lineSum = body.items.reduce((a, i) => a + i.quantity * i.unitPriceMinor, 0);

    const warnings = [];
    if (lineSum - (body.discountMinor || 0) !== body.totalMinor) warnings.push({ code: 'TOTAL_MISMATCH', field: 'totalMinor', message: `Los productos suman ${lineSum - (body.discountMinor || 0)} y el total informado es ${body.totalMinor} (centavos).` });
    const phone = body.customer.phone ? normalizePhoneAR(body.customer.phone) : null;
    if (phone && !phone.normalized) warnings.push({ code: 'PHONE_NOT_NORMALIZED', field: 'customer.phone', message: 'No se pudo llevar el teléfono a formato internacional: revisarlo a mano.' });

    const bodyHash = sha256(raw);
    const at = deps.Timestamp.fromDate(now);
    const statusAt = new Date(body.statusAt), paidAt = body.paidAt ? new Date(body.paidAt) : null;
    const idemRef = tenantRef.collection('idempotency').doc('shop_' + body.eventId);
    let orderRef = tenantRef.collection('orders').doc(body.orderId);
    const payId = body.payment && body.payment.paymentId ? String(body.payment.paymentId) : null;
    const manualQ = payId ? tenantRef.collection('orders').where('payment.paymentId', '==', payId).limit(2) : null;
    const couponCode = body.coupon && body.coupon.code ? String(body.coupon.code).trim().toUpperCase() : null;
    const couponRef = couponCode ? tenantRef.collection('coupons').doc(couponCode) : null;
    const phoneRef = phone ? tenantRef.collection('contactsByPhone').doc(phone.key) : null;
    const mail = emailKey(body.customer.email);
    const mailRef = mail ? tenantRef.collection('contactsByEmail').doc(mail) : null;
    const settingsRef = tenantRef.collection('settings').doc('cafelito-tienda');

    const result = await deps.db.runTransaction(async tx => {
      let [idem, orderSnap, byPhone, byMail, settingsSnap, manual, cSnap] = await Promise.all([tx.get(idemRef), tx.get(orderRef), phoneRef ? tx.get(phoneRef) : null, mailRef ? tx.get(mailRef) : null, tx.get(settingsRef), manualQ ? tx.get(manualQ) : null, couponRef ? tx.get(couponRef) : null]);
      // Venta cargada a mano antes con el mismo n.º de pago: se actualiza esa (no se duplica)
      if (!orderSnap.exists && manual) { const m = manual.docs.find(d => d.id !== body.orderId && (d.data().source || {}).manual); if (m) { orderRef = m.ref; orderSnap = m; } }
      if (idem.exists) { const d = idem.data(); return d.bodyHash !== bodyHash ? { conflict: true } : { replay: d.response }; }
      const settings = settingsSnap.exists ? settingsSnap.data() : {};
      const brand = settings.brand || 'Cafelito Cakes';
      const prev = orderSnap.exists ? orderSnap.data() : null;

      // Contacto: el del pedido si ya existe; si no, por teléfono; si no, por email; si no, uno nuevo
      let contactId = prev && prev.contactId, match = 'existing';
      if (!contactId && byPhone && byPhone.exists) contactId = byPhone.data().contactId;
      if (!contactId && byMail && byMail.exists) contactId = byMail.data().contactId;
      const contactRef = contactId ? tenantRef.collection('contacts').doc(contactId) : tenantRef.collection('contacts').doc();
      const contactSnap = contactId ? await tx.get(contactRef) : null;
      const contact = contactSnap && contactSnap.exists ? contactSnap.data() : null;
      if (!contact) match = 'new';

      // Una venta cargada a mano que todavía no recibió avisos de la web nunca hace «viejo» al aviso de la web
      const fromManual = prev && prev.source && prev.source.manual && !prev.manualMergedAt;
      const stale = !fromManual && prev && prev.statusAt && prev.statusAt.toMillis() > statusAt.getTime();
      const status = stale ? prev.status : body.status;
      const wasCounted = !!(prev && prev.counted), counted = COUNTED.has(status);
      const paid = paidAt || (prev && prev.paidAt ? prev.paidAt.toDate() : null);
      const attribution = body.attribution || (prev && prev.attribution) || null;
      const historyItem = { status: body.status, at: body.statusAt, eventId: body.eventId, stale: !!stale };
      // Código de descuento: se canjea cuando llega el pago (una sola vez; si no sirve, el pedido se guarda igual con un aviso)
      let couponInfo = (prev && prev.coupon) || null;
      if (couponRef && !stale) {
        const cp = cSnap && cSnap.exists ? cSnap.data() : null, paidDay = (paidAt ? paidAt.toISOString() : now.toISOString()).slice(0, 10);
        let st = !cp ? 'COUPON_NOT_FOUND' : cp.status === 'used' && cp.orderUsed !== orderRef.id ? 'COUPON_ALREADY_USED' : cp.expires < paidDay && !(cp.status === 'used' && cp.orderUsed === orderRef.id) ? 'COUPON_EXPIRED' : null;
        if (st) warnings.push({ code: st, field: 'coupon.code', message: st === 'COUPON_NOT_FOUND' ? 'El código no existe en Brandazo.' : st === 'COUPON_ALREADY_USED' ? 'El código ya se había usado en otra compra.' : 'El código estaba vencido.' });
        else if (COUNTED.has(body.status) && cp.status !== 'used') tx.update(couponRef, { status: 'used', usedAt: at, usedDate: paidDay, usedWhere: 'web', usedBy: `integración:${keyId}`, orderUsed: orderRef.id, saleAmountMinor: body.totalMinor });
        couponInfo = { code: couponCode, discountMinor: body.coupon.discountMinor || null, valid: !st, warning: st || null };
      }
      const response = { status: prev ? (stale ? 'stale' : 'updated') : 'created', orderId: body.orderId, receivedAt: now.toISOString(), order: { status, counted }, contact: { id: contactRef.id, match }, warnings };

      tx.set(orderRef, {
        orderId: body.orderId, brand, status, counted, ...(prev && prev.source && prev.source.manual ? { manualMergedAt: at } : {}),
        statusAt: stale ? prev.statusAt : deps.Timestamp.fromDate(statusAt),
        createdAt: body.createdAt ? deps.Timestamp.fromDate(new Date(body.createdAt)) : (prev && prev.createdAt ? prev.createdAt : at),
        paidAt: paid ? deps.Timestamp.fromDate(paid) : null, paidMonth: paid ? monthInTZ(paid) : null,
        totalMinor: body.totalMinor, discountMinor: body.discountMinor || 0, currency: 'ARS',
        items: body.items, pickup: body.pickup || (prev && prev.pickup) || null,
        contactId: contactRef.id, customerName: body.customer.name,
        payment: body.payment || (prev && prev.payment) || null,
        attribution, utmCampaign: attribution && attribution.utmCampaign ? String(attribution.utmCampaign).trim().toLowerCase() : null,
        source: body.source || (prev && prev.source) || null, notes: body.notes || (prev && prev.notes) || '',
        coupon: couponInfo,
        warnings: warnings.map(w => w.code),
        history: [...((prev && prev.history) || []), historyItem].slice(-30),
        firstReceivedAt: (prev && prev.firstReceivedAt) || at, updatedAt: at
      });

      const delta = counted === wasCounted ? 0 : counted ? 1 : -1;
      const spentDelta = (counted ? body.totalMinor : 0) - (wasCounted ? (prev.totalMinor || 0) : 0);
      if (contact) {
        tx.update(contactRef, {
          updatedAt: at, lastOrderAt: at,
          orderCount: deps.FieldValue.increment(delta), orderSpentMinor: deps.FieldValue.increment(spentDelta),
          ...(mail && !contact.email ? { email: body.customer.email } : {}),
          ...(phone && !contact.phoneE164 && !contact.phoneRaw ? { phoneRaw: body.customer.phone, phoneE164: phone.e164, phoneDisplay: phone.display, phoneNormalized: phone.normalized } : {}),
          ...(Array.isArray(contact.tags) && !contact.tags.includes(brand) ? { tags: [...contact.tags, brand] } : {}),
          ...(body.consent ? { marketingConsent: { granted: !!body.consent.marketing, text: body.consent.text || null, capturedAt: body.consent.capturedAt || null, orderId: body.orderId } } : {})
        });
      } else {
        tx.set(contactRef, {
          name: body.customer.name, phoneRaw: body.customer.phone || null, phoneE164: phone ? phone.e164 : null, phoneDisplay: phone ? phone.display : null, phoneNormalized: phone ? phone.normalized : false,
          email: body.customer.email || null, brand, type: 'Cliente', tags: [brand],
          firstSource: { channel: 'Web · Tienda Cafelito Cakes', site: (body.source && body.source.site) || 'cafelito.com.ar', pageUrl: (body.source && body.source.pageUrl) || null, utmSource: attribution && attribution.utmSource || null, utmCampaign: attribution && attribution.utmCampaign || null, attribution, at },
          marketingConsent: body.consent ? { granted: !!body.consent.marketing, text: body.consent.text || null, capturedAt: body.consent.capturedAt || null, orderId: body.orderId } : null,
          orderCount: Math.max(0, delta), orderSpentMinor: Math.max(0, spentDelta), lastOrderAt: at, quoteCount: 0, createdAt: at, updatedAt: at
        });
      }
      if (phoneRef && !(byPhone && byPhone.exists)) tx.set(phoneRef, { contactId: contactRef.id, createdAt: at });
      if (mailRef && !(byMail && byMail.exists)) tx.set(mailRef, { contactId: contactRef.id, createdAt: at });

      if (!stale && body.status === 'paid' && !(prev && prev.counted))
        tx.set(tenantRef.collection('notifications').doc(), { title: `Nuevo pedido pagado · ${brand}`, body: `${body.customer.name} · ${body.items.length} producto${body.items.length > 1 ? 's' : ''}${body.pickup && body.pickup.date ? ' · retira el ' + body.pickup.date : ''}`, orderId: body.orderId, to: settings.defaultOwner || null, unread: true, createdAt: at });
      tx.set(tenantRef.collection('audit').doc(), { at, by: `integración:${keyId}`, action: stale ? 'pedido-aviso-viejo' : prev ? `pedido-${STATUS_ES[body.status].toLowerCase()}` : 'pedido-recibido', orderId: body.orderId, contactId: contactRef.id });
      tx.set(idemRef, { bodyHash, response, createdAt: at, expireAt: deps.Timestamp.fromMillis(now.getTime() + IDEM_DAYS * 864e5) });
      return { ok: response };
    });

    if (result.conflict) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'Ese Idempotency-Key ya se usó con un cuerpo distinto.');
    if (result.replay) { await log(200, 'DUPLICATE'); return { status: 200, body: { ...result.replay, status: 'duplicate' }, headers: { 'Idempotent-Replayed': 'true', 'X-Request-Id': requestId } }; }
    await log(result.ok.status === 'created' ? 201 : 200, result.ok.status === 'stale' ? 'STALE' : null);
    return { status: result.ok.status === 'created' ? 201 : 200, body: result.ok, headers: { 'X-Request-Id': requestId } };
  } catch (e) {
    const err = e instanceof ApiError ? e : new ApiError(500, 'INTERNAL_ERROR', 'Error interno de Brandazo. Reintentá con el mismo cuerpo e Idempotency-Key.', { retryable: true });
    if (!(e instanceof ApiError)) console.error('[shop-orders]', requestId, e && e.stack || e);
    await log(err.status, err.code);
    return { status: err.status, body: errorBody(err, requestId), headers: { 'X-Request-Id': requestId, ...(err.headers || {}) } };
  }
}

module.exports = { handleShopOrder, monthInTZ };
