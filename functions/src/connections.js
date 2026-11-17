'use strict';
/* Conexiones reales con Meta (Instagram y Facebook) y Google Ads.
   - El navegador pide «empezar» con su sesión de Firebase (Dueño o Admin de la empresa).
   - El servidor arma el enlace de autorización con un «state» de un solo uso (10 minutos).
   - La vuelta (callback) cambia el código por permisos y los guarda en tenants/{t}/private/* (nadie los lee desde el navegador).
   - Lo que ve el equipo va a connections/*, social/*, socialDaily/* y ads/* (solo lectura).
   - Dinero de Google Ads en centavos de la moneda de la cuenta (cost_micros / 10.000). */
const crypto = require('node:crypto');

const GRAPH_V = 'v24.0';
const ADS_V = 'v26';
const META_SCOPES = ['pages_show_list', 'pages_read_engagement', 'read_insights', 'instagram_basic', 'instagram_manage_insights', 'business_management'];
const ADS_SCOPE = 'https://www.googleapis.com/auth/adwords';
const CALLBACK_BASE = 'https://www.brandazo.com.ar/api/v1/connect';
const RETURN_OK = [/^https:\/\/(www\.)?brandazo\.com\.ar$/, /^https:\/\/brandazo\.(web|firebaseapp)\.app$/, /^https:\/\/brandazo\.firebaseapp\.com$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const PROVIDERS = { meta: 'Meta (Instagram y Facebook)', 'google-ads': 'Google Ads' };
const RETURN_ROUTE = { meta: '#/app/redes', 'google-ads': '#/app/metricas/anuncios' };

class HttpError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }

function urls(env) {
  const emu = !!env.FUNCTIONS_EMULATOR;
  return {
    graph: (emu && env.META_GRAPH_URL) || 'https://graph.facebook.com',
    fbDialog: (emu && env.META_DIALOG_URL) || 'https://www.facebook.com',
    gAuth: (emu && env.GOOGLE_AUTH_URL) || 'https://accounts.google.com/o/oauth2/v2/auth',
    gToken: (emu && env.GOOGLE_TOKEN_URL) || 'https://oauth2.googleapis.com/token',
    ads: (emu && env.GOOGLE_ADS_URL) || 'https://googleads.googleapis.com',
    callback: (emu && (env.CALLBACK_BASE || `http://127.0.0.1:5001/${env.GCLOUD_PROJECT}/southamerica-east1/conexiones/api/v1/connect`)) || CALLBACK_BASE
  };
}
const parseCfg = raw => { try { const j = JSON.parse(raw || '{}'); return j && typeof j === 'object' ? j : {}; } catch { return {}; } };
const metaReady = c => !!(c.appId && c.appSecret);
const adsReady = c => !!(c.clientId && c.clientSecret && c.developerToken);

async function getJson(fetchFn, url, opts = {}) {
  const r = await fetchFn(url, opts);
  let j = null; try { j = await r.json(); } catch { j = null; }
  if (!r.ok) {
    const e = j && (j.error || (Array.isArray(j) && j[0] && j[0].error)) || {};
    const msg = e.message || e.error_description || (typeof e === 'string' ? e : '') || `HTTP ${r.status}`;
    const err = new Error(msg); err.status = r.status; err.providerCode = e.code || e.status || null; throw err;
  }
  return j;
}

/* ---------- Sesión de Brandazo ---------- */
async function requireAdmin(req, deps, tenantId) {
  const h = req.get('authorization') || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok) throw new HttpError(401, 'NO_SESSION', 'Iniciá sesión en Brandazo.');
  let user; try { user = await deps.verifyIdToken(tok); } catch { throw new HttpError(401, 'NO_SESSION', 'La sesión venció. Volvé a iniciar sesión.'); }
  if (!tenantId || typeof tenantId !== 'string' || !/^[a-z0-9-]{1,60}$/.test(tenantId)) throw new HttpError(400, 'BAD_TENANT', 'Empresa inválida.');
  const m = await deps.db.doc(`tenants/${tenantId}/members/${user.uid}`).get();
  if (!m.exists || !['Dueño', 'Admin'].includes(m.data().role)) throw new HttpError(403, 'FORBIDDEN', 'Solo el Dueño o un Admin de la empresa pueden conectar cuentas.');
  return { uid: user.uid, name: m.data().name || user.email || '' };
}

/* ---------- Empezar ---------- */
async function start(provider, req, deps) {
  const body = req.body || {};
  const who = await requireAdmin(req, deps, body.tenantId);
  const returnTo = RETURN_OK.some(r => r.test(body.returnTo || '')) ? body.returnTo : 'https://www.brandazo.com.ar';
  const u = urls(deps.env);
  const state = crypto.randomBytes(24).toString('base64url');
  const cb = `${u.callback}/${provider}/callback`;
  let url;
  if (provider === 'meta') {
    const c = deps.meta; if (!metaReady(c)) throw new HttpError(503, 'NOT_CONFIGURED', 'Falta configurar la app de Meta en Brandazo.');
    // Apps de tipo «Empresa» usan una configuración de «Inicio de sesión para empresas» (configId) en vez de la lista de permisos
    url = `${u.fbDialog}/${GRAPH_V}/dialog/oauth?` + new URLSearchParams({ client_id: c.appId, redirect_uri: cb, state, response_type: 'code', ...(c.configId ? { config_id: String(c.configId), override_default_response_type: 'true' } : { scope: META_SCOPES.join(',') }) });
  } else {
    const c = deps.ads; if (!adsReady(c)) throw new HttpError(503, 'NOT_CONFIGURED', 'Falta configurar Google Ads en Brandazo.');
    url = `${u.gAuth}?` + new URLSearchParams({ client_id: c.clientId, redirect_uri: cb, response_type: 'code', scope: ADS_SCOPE, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state });
  }
  await deps.db.doc(`connectStates/${state}`).set({ provider, tenantId: body.tenantId, uid: who.uid, name: who.name, returnTo, createdAt: deps.Timestamp.now(), expireAt: deps.Timestamp.fromMillis(deps.now() + 10 * 60e3) });
  return { url };
}

/* ---------- Volver (callback) ---------- */
async function callback(provider, req, deps) {
  const q = req.query || {};
  const stRef = q.state ? deps.db.doc(`connectStates/${String(q.state).slice(0, 100)}`) : null;
  const st = stRef ? await stRef.get() : null;
  const back = (s, extra = '') => (s && s.returnTo || 'https://www.brandazo.com.ar') + RETURN_ROUTE[provider] + `?conexion=${extra}`;
  if (!st || !st.exists || st.data().provider !== provider || st.data().expireAt.toMillis() < deps.now()) return { redirect: back(null, 'vencida') };
  const s = st.data();
  await stRef.delete(); // un solo uso
  if (q.error || !q.code) return { redirect: back(s, 'cancelada') };
  try {
    if (provider === 'meta') await metaConnect(s, String(q.code), deps);
    else await adsConnect(s, String(q.code), deps);
  } catch (e) {
    console.error('[conexiones]', provider, 'callback', e.status || '', e.message);
    await deps.db.doc(`tenants/${s.tenantId}/connections/${provider === 'meta' ? 'meta' : 'googleAds'}`).set({ provider, status: 'error', lastError: String(e.message).slice(0, 300), updatedAt: deps.Timestamp.now() }, { merge: true });
    return { redirect: back(s, 'error') };
  }
  try { await syncTenant(s.tenantId, provider === 'meta' ? 'meta' : 'googleAds', deps); } catch (e) { console.error('[conexiones] primera sincronización', e.message); }
  return { redirect: back(s, 'ok') };
}

/* ---------- Meta ---------- */
async function metaConnect(s, code, deps) {
  const u = urls(deps.env), c = deps.meta, f = deps.fetch;
  const cb = `${u.callback}/meta/callback`;
  const short = await getJson(f, `${u.graph}/${GRAPH_V}/oauth/access_token?` + new URLSearchParams({ client_id: c.appId, client_secret: c.appSecret, redirect_uri: cb, code }));
  const long = await getJson(f, `${u.graph}/${GRAPH_V}/oauth/access_token?` + new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: c.appId, client_secret: c.appSecret, fb_exchange_token: short.access_token }));
  const pagesRes = await getJson(f, `${u.graph}/${GRAPH_V}/me/accounts?` + new URLSearchParams({ fields: 'id,name,access_token,instagram_business_account{id,username}', limit: '50', access_token: long.access_token }));
  const pages = (pagesRes.data || []).map(p => ({ id: p.id, name: p.name, token: p.access_token, igId: p.instagram_business_account ? p.instagram_business_account.id : null, igUsername: p.instagram_business_account ? p.instagram_business_account.username || null : null }));
  if (!pages.length) throw new Error('La cuenta de Facebook no tiene páginas autorizadas para Brandazo.');
  const accounts = [];
  pages.forEach(p => { accounts.push({ id: p.id, net: 'Facebook', name: p.name, username: null, pageId: p.id }); if (p.igId) accounts.push({ id: p.igId, net: 'Instagram', name: p.name, username: p.igUsername, pageId: p.id }); });
  const expiresAt = long.expires_in ? deps.Timestamp.fromMillis(deps.now() + long.expires_in * 1000) : null;
  const t = `tenants/${s.tenantId}`;
  await deps.db.doc(`${t}/private/meta`).set({ userToken: long.access_token, expiresAt, pages, updatedAt: deps.Timestamp.now() });
  await deps.db.doc(`${t}/connections/meta`).set({ provider: 'meta', status: 'ok', accounts, expiresAt, connectedBy: s.name, connectedAt: deps.Timestamp.now(), lastError: null, updatedAt: deps.Timestamp.now() });
  await deps.db.collection(`${t}/audit`).add({ at: deps.Timestamp.now(), by: s.uid, byName: s.name, action: 'conexion-meta', accounts: accounts.map(a => a.net + ':' + (a.username || a.name)) });
}

async function metaSync(tenantId, deps) {
  const u = urls(deps.env), f = deps.fetch, t = `tenants/${tenantId}`;
  const priv = await deps.db.doc(`${t}/private/meta`).get(); if (!priv.exists) return { skipped: true };
  const { pages } = priv.data();
  const today = new Date(deps.now()).toISOString().slice(0, 10);
  const errors = [];
  for (const p of pages) {
    const tok = p.token;
    // Página de Facebook
    try {
      const pg = await getJson(f, `${u.graph}/${GRAPH_V}/${p.id}?` + new URLSearchParams({ fields: 'name,fan_count,followers_count,link', access_token: tok }));
      let posts = [];
      try {
        const pr = await getJson(f, `${u.graph}/${GRAPH_V}/${p.id}/posts?` + new URLSearchParams({ fields: 'id,message,created_time,permalink_url,shares,reactions.summary(true).limit(0),comments.summary(true).limit(0)', limit: '25', access_token: tok }));
        posts = (pr.data || []).map(x => ({ id: x.id, text: (x.message || '').slice(0, 280), type: 'Publicación', url: x.permalink_url || null, at: x.created_time || null, likes: x.reactions && x.reactions.summary ? x.reactions.summary.total_count : null, comments: x.comments && x.comments.summary ? x.comments.summary.total_count : null, shares: x.shares ? x.shares.count : null, reach: null }));
      } catch (e) { errors.push(`Facebook ${p.name}: publicaciones (${e.message})`); }
      const followers = pg.followers_count != null ? pg.followers_count : pg.fan_count != null ? pg.fan_count : null;
      await deps.db.doc(`${t}/social/Facebook_${p.id}`).set({ net: 'Facebook', accountId: p.id, name: pg.name || p.name, username: null, url: pg.link || null, followers, following: null, mediaCount: null, posts, reachDaily: [], syncedAt: deps.Timestamp.now() });
      if (followers != null) await deps.db.doc(`${t}/socialDaily/Facebook_${p.id}_${today}`).set({ net: 'Facebook', accountId: p.id, date: today, followers });
    } catch (e) { errors.push(`Facebook ${p.name}: ${e.message}`); }
    // Instagram profesional vinculado
    if (!p.igId) continue;
    try {
      const ig = await getJson(f, `${u.graph}/${GRAPH_V}/${p.igId}?` + new URLSearchParams({ fields: 'username,name,followers_count,follows_count,media_count', access_token: tok }));
      let posts = [];
      try {
        const mr = await getJson(f, `${u.graph}/${GRAPH_V}/${p.igId}/media?` + new URLSearchParams({ fields: 'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count', limit: '25', access_token: tok }));
        posts = (mr.data || []).map(x => ({ id: x.id, text: (x.caption || '').slice(0, 280), type: x.media_product_type === 'REELS' ? 'Reel' : x.media_type === 'CAROUSEL_ALBUM' ? 'Carrusel' : x.media_type === 'VIDEO' ? 'Video' : 'Imagen', url: x.permalink || null, at: x.timestamp || null, likes: x.like_count != null ? x.like_count : null, comments: x.comments_count != null ? x.comments_count : null, shares: null, reach: null }));
        for (const post of posts.slice(0, 12)) {
          try { const ins = await getJson(f, `${u.graph}/${GRAPH_V}/${post.id}/insights?` + new URLSearchParams({ metric: 'reach', access_token: tok }));
            const r = (ins.data || []).find(d => d.name === 'reach'); if (r && r.values && r.values[0]) post.reach = r.values[0].value; } catch { /* sin alcance: queda «Sin datos» */ }
        }
      } catch (e) { errors.push(`Instagram @${p.igUsername || p.igId}: publicaciones (${e.message})`); }
      let reachDaily = [];
      try {
        const until = Math.floor(deps.now() / 1000), since = until - 28 * 86400;
        const ri = await getJson(f, `${u.graph}/${GRAPH_V}/${p.igId}/insights?` + new URLSearchParams({ metric: 'reach', period: 'day', since: String(since), until: String(until), access_token: tok }));
        const r = (ri.data || []).find(d => d.name === 'reach'); if (r) reachDaily = (r.values || []).map(v => ({ date: String(v.end_time || '').slice(0, 10), value: v.value }));
      } catch (e) { errors.push(`Instagram @${p.igUsername || p.igId}: alcance (${e.message})`); }
      await deps.db.doc(`${t}/social/Instagram_${p.igId}`).set({ net: 'Instagram', accountId: p.igId, name: ig.name || p.name, username: ig.username || p.igUsername, url: ig.username ? `https://www.instagram.com/${ig.username}/` : null, followers: ig.followers_count != null ? ig.followers_count : null, following: ig.follows_count != null ? ig.follows_count : null, mediaCount: ig.media_count != null ? ig.media_count : null, posts, reachDaily, syncedAt: deps.Timestamp.now() });
      if (ig.followers_count != null) await deps.db.doc(`${t}/socialDaily/Instagram_${p.igId}_${today}`).set({ net: 'Instagram', accountId: p.igId, date: today, followers: ig.followers_count });
    } catch (e) { errors.push(`Instagram @${p.igUsername || p.igId}: ${e.message}`); }
  }
  const expired = errors.some(e => /expired|session has been invalidated|Error validating access token/i.test(e));
  await deps.db.doc(`${t}/connections/meta`).set({ status: expired ? 'expired' : errors.length ? 'warning' : 'ok', lastSyncAt: deps.Timestamp.now(), lastError: errors.length ? errors.join(' · ').slice(0, 900) : null }, { merge: true });
  return { errors };
}

/* ---------- Google Ads ---------- */
async function adsToken(deps, refreshToken) {
  const u = urls(deps.env), c = deps.ads;
  const j = await getJson(deps.fetch, u.gToken, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }).toString() });
  return j.access_token;
}
function adsHeaders(deps, access, loginCustomerId) {
  const h = { Authorization: `Bearer ${access}`, 'developer-token': deps.ads.developerToken, 'Content-Type': 'application/json' };
  const lc = loginCustomerId || deps.ads.loginCustomerId; if (lc) h['login-customer-id'] = String(lc).replace(/\D/g, '');
  return h;
}
async function adsSearch(deps, access, customerId, query, loginCustomerId) {
  const u = urls(deps.env); const out = []; let pageToken;
  do {
    const j = await getJson(deps.fetch, `${u.ads}/${ADS_V}/customers/${customerId}/googleAds:search`, { method: 'POST', headers: adsHeaders(deps, access, loginCustomerId), body: JSON.stringify(pageToken ? { query, pageToken } : { query }) });
    out.push(...(j.results || [])); pageToken = j.nextPageToken;
  } while (pageToken && out.length < 20000);
  return out;
}
const microsToMinor = m => m == null ? null : Math.round(Number(m) / 10000);

async function adsConnect(s, code, deps) {
  const u = urls(deps.env), c = deps.ads, f = deps.fetch;
  const tok = await getJson(f, u.gToken, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: c.clientId, client_secret: c.clientSecret, redirect_uri: `${u.callback}/google-ads/callback`, grant_type: 'authorization_code' }).toString() });
  if (!tok.refresh_token) throw new Error('Google no entregó un permiso permanente. Quitá el acceso de Brandazo en tu cuenta de Google y volvé a conectar.');
  const list = await getJson(f, `${u.ads}/${ADS_V}/customers:listAccessibleCustomers`, { headers: adsHeaders(deps, tok.access_token) });
  const ids = (list.resourceNames || []).map(r => r.split('/')[1]);
  if (!ids.length) throw new Error('Esa cuenta de Google no tiene acceso a ninguna cuenta de Google Ads.');
  const accounts = [];
  for (const id of ids.slice(0, 20)) {
    try {
      const r = await adsSearch(deps, tok.access_token, id, 'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.manager, customer.test_account FROM customer LIMIT 1');
      const cu = (r[0] || {}).customer || {};
      accounts.push({ id, name: cu.descriptiveName || `Cuenta ${id}`, currency: cu.currencyCode || null, manager: !!cu.manager, test: !!cu.testAccount });
    } catch (e) { accounts.push({ id, name: `Cuenta ${id}`, currency: null, manager: false, test: false, error: String(e.message).slice(0, 200) }); }
  }
  const t = `tenants/${s.tenantId}`;
  await deps.db.doc(`${t}/private/googleAds`).set({ refreshToken: tok.refresh_token, updatedAt: deps.Timestamp.now() });
  await deps.db.doc(`${t}/connections/googleAds`).set({ provider: 'google-ads', status: 'ok', accounts, connectedBy: s.name, connectedAt: deps.Timestamp.now(), lastError: null, updatedAt: deps.Timestamp.now() });
  await deps.db.collection(`${t}/audit`).add({ at: deps.Timestamp.now(), by: s.uid, byName: s.name, action: 'conexion-google-ads', accounts: accounts.map(a => a.id) });
}

async function adsSync(tenantId, deps) {
  const t = `tenants/${tenantId}`;
  const priv = await deps.db.doc(`${t}/private/googleAds`).get(); if (!priv.exists) return { skipped: true };
  const conn = await deps.db.doc(`${t}/connections/googleAds`).get();
  const accounts = (conn.exists && conn.data().accounts) || [];
  const errors = [];
  let access;
  try { access = await adsToken(deps, priv.data().refreshToken); }
  catch (e) { await deps.db.doc(`${t}/connections/googleAds`).set({ status: 'expired', lastSyncAt: deps.Timestamp.now(), lastError: 'Google rechazó el permiso: volvé a conectar. (' + String(e.message).slice(0, 200) + ')' }, { merge: true }); return { errors: [e.message] }; }
  for (const a of accounts.filter(x => !x.manager)) {
    try {
      const camp = await adsSearch(deps, access, a.id, 'SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS');
      const daily = await adsSearch(deps, access, a.id, 'SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM customer WHERE segments.date DURING LAST_30_DAYS');
      const n = v => v == null ? 0 : Number(v);
      const campaigns = camp.map(r => ({ id: String(r.campaign.id), name: r.campaign.name, status: r.campaign.status || null, channel: r.campaign.advertisingChannelType || null, costMinor: microsToMinor(r.metrics.costMicros || 0), impressions: n(r.metrics.impressions), clicks: n(r.metrics.clicks), conversions: Math.round(n(r.metrics.conversions) * 100) / 100 }));
      const days = daily.map(r => ({ date: r.segments.date, costMinor: microsToMinor(r.metrics.costMicros || 0), impressions: n(r.metrics.impressions), clicks: n(r.metrics.clicks), conversions: Math.round(n(r.metrics.conversions) * 100) / 100 })).sort((x, y) => x.date.localeCompare(y.date));
      await deps.db.doc(`${t}/ads/${a.id}`).set({ customerId: a.id, name: a.name, currency: a.currency, period: 'Últimos 30 días', campaigns, daily: days, syncedAt: deps.Timestamp.now() });
    } catch (e) { errors.push(`${a.name}: ${e.message}`); }
  }
  await deps.db.doc(`${t}/connections/googleAds`).set({ status: errors.length ? 'warning' : 'ok', lastSyncAt: deps.Timestamp.now(), lastError: errors.length ? errors.join(' · ').slice(0, 900) : null }, { merge: true });
  return { errors };
}

async function syncTenant(tenantId, which, deps) {
  if (which === 'meta') return metaSync(tenantId, deps);
  return adsSync(tenantId, deps);
}

/* ---------- Desconectar ---------- */
async function disconnect(provider, req, deps) {
  const body = req.body || {};
  const who = await requireAdmin(req, deps, body.tenantId);
  const key = provider === 'meta' ? 'meta' : 'googleAds', t = `tenants/${body.tenantId}`;
  const priv = await deps.db.doc(`${t}/private/${key}`).get();
  if (priv.exists && provider === 'meta' && priv.data().userToken) {
    try { const u = urls(deps.env); await deps.fetch(`${u.graph}/${GRAPH_V}/me/permissions?access_token=${encodeURIComponent(priv.data().userToken)}`, { method: 'DELETE' }); } catch { /* si Meta no responde, igual se borra de Brandazo */ }
  }
  await deps.db.doc(`${t}/private/${key}`).delete();
  await deps.db.doc(`${t}/connections/${key}`).delete();
  await deps.db.collection(`${t}/audit`).add({ at: deps.Timestamp.now(), by: who.uid, byName: who.name, action: `desconexion-${provider}` });
  return { ok: true };
}

/* ---------- Actualizar ahora ---------- */
async function syncNow(provider, req, deps) {
  const body = req.body || {};
  await requireAdmin(req, deps, body.tenantId);
  const r = await syncTenant(body.tenantId, provider === 'meta' ? 'meta' : 'googleAds', deps);
  return { ok: true, errors: (r && r.errors) || [] };
}

/* ---------- Ruteo ---------- */
async function handleConnect(req, res, deps) {
  const m = req.path.match(/\/connect\/(meta|google-ads)\/(start|callback|sync|disconnect|status)\/?$/);
  try {
    if (!m) throw new HttpError(404, 'NOT_FOUND', 'Ruta inexistente.');
    const [, provider, action] = m;
    if (action === 'callback') { if (req.method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Usá GET.'); const r = await callback(provider, req, deps); res.redirect(302, r.redirect); return; }
    if (action === 'status') { res.json({ provider, name: PROVIDERS[provider], configured: provider === 'meta' ? metaReady(deps.meta) : adsReady(deps.ads) }); return; }
    if (req.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Usá POST.');
    const out = action === 'start' ? await start(provider, req, deps) : action === 'sync' ? await syncNow(provider, req, deps) : await disconnect(provider, req, deps);
    res.json(out);
  } catch (e) {
    const err = e instanceof HttpError ? e : new HttpError(502, 'PROVIDER_ERROR', 'No se pudo completar con el servicio externo. Probá de nuevo en unos minutos.');
    if (!(e instanceof HttpError)) console.error('[conexiones]', e.status || '', e.message);
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
}

async function syncAll(deps) {
  const snap = await deps.db.collectionGroup('connections').get();
  const out = [];
  for (const d of snap.docs) {
    const tenantId = d.ref.parent.parent.id, which = d.id;
    if (!['meta', 'googleAds'].includes(which) || d.data().status === 'error') continue;
    if (which === 'meta' && !metaReady(deps.meta)) continue;
    if (which === 'googleAds' && !adsReady(deps.ads)) continue;
    try { const r = await syncTenant(tenantId, which, deps); out.push({ tenantId, which, errors: (r && r.errors || []).length }); }
    catch (e) { console.error('[conexiones] sincronización diaria', tenantId, which, e.message); }
  }
  return out;
}

module.exports = { handleConnect, syncAll, parseCfg, metaReady, adsReady, microsToMinor, GRAPH_V, ADS_V, META_SCOPES };
