// Simulador local de las APIs de Meta y Google Ads (puerto 5999) para pruebas. Solo emulador.
const calls = [];
function mock(req, res) {
  const u = new URL(req.url, 'http://x'); const p = u.pathname; const q = u.searchParams;
  let body = ''; req.on('data', c => body += c); req.on('end', () => {
    calls.push({ m: req.method, p, q: Object.fromEntries(q), h: req.headers, body });
    const send = (o, s = 200) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    const G = '/graph/v24.0';
    if (p === '/dialog/v24.0/dialog/oauth' || p === '/gauth') { const to = new URL(q.get('redirect_uri')); to.searchParams.set('code', p === '/gauth' ? 'g-codigo' : 'codigo-1'); to.searchParams.set('state', q.get('state')); res.writeHead(302, { Location: to.toString() }); return res.end(); }
    if (p === `${G}/oauth/access_token`) return q.get('code') ? send({ access_token: 'corto' }) : send({ access_token: 'largo', expires_in: 5184000 });
    if (p === `${G}/me/accounts`) return send({ data: [{ id: 'pg1', name: 'Cafelito', access_token: 'tok-pagina', instagram_business_account: { id: 'ig1', username: 'cafelito.cba' } }] });
    if (p === `${G}/pg1`) return send({ name: 'Cafelito', fan_count: 900, followers_count: 950, link: 'https://facebook.com/cafelito' });
    if (p === `${G}/pg1/posts`) return send({ data: [{ id: 'pg1_1', message: 'Nuevo café de especialidad', created_time: '2026-11-15T12:00:00+0000', permalink_url: 'https://facebook.com/p/1', reactions: { summary: { total_count: 40 } }, comments: { summary: { total_count: 3 } } }] });
    if (p === `${G}/ig1`) return send({ username: 'cafelito.cba', name: 'Cafelito', followers_count: 5321, follows_count: 300, media_count: 412 });
    if (p === `${G}/ig1/media`) return send({ data: [{ id: 'm1', caption: 'Reel de la barra', media_type: 'VIDEO', media_product_type: 'REELS', permalink: 'https://instagram.com/p/m1', timestamp: '2026-11-16T15:00:00+0000', like_count: 120, comments_count: 8 }, { id: 'm2', caption: 'Foto', media_type: 'IMAGE', permalink: 'https://instagram.com/p/m2', timestamp: '2026-11-14T15:00:00+0000', like_count: 50, comments_count: 1 }] });
    if (p === `${G}/m1/insights`) return send({ data: [{ name: 'reach', values: [{ value: 4300 }] }] });
    if (p === `${G}/m2/insights`) return send({ error: { message: 'Métrica no disponible', code: 100 } }, 400);
    if (p === `${G}/ig1/insights`) return send({ data: [{ name: 'reach', values: [{ end_time: '2026-11-15T08:00:00+0000', value: 1000 }, { end_time: '2026-11-16T08:00:00+0000', value: 1500 }] }] });
    if (p === `${G}/me/permissions` && req.method === 'DELETE') return send({ success: true });
    if (p === '/gtoken') { const f = new URLSearchParams(body); return f.get('grant_type') === 'authorization_code' ? send({ access_token: 'g-acceso', refresh_token: 'g-permanente', expires_in: 3599 }) : send({ access_token: 'g-acceso-2', expires_in: 3599 }); }
    if (p === '/ads/v26/customers:listAccessibleCustomers') return send({ resourceNames: ['customers/1234567890'] });
    if (p === '/ads/v26/customers/1234567890/googleAds:search') {
      if (req.headers['developer-token'] !== 'dev-prueba') return send({ error: { message: 'developer token' } }, 401);
      const { query } = JSON.parse(body || '{}');
      if (/FROM customer LIMIT 1/.test(query)) return send({ results: [{ customer: { id: '1234567890', descriptiveName: 'Cafelito Ads', currencyCode: 'ARS', manager: false, testAccount: false } }] });
      if (/FROM campaign/.test(query)) return send({ results: [{ campaign: { id: '11', name: 'Búsqueda eventos', status: 'ENABLED', advertisingChannelType: 'SEARCH' }, metrics: { costMicros: '15000000000', impressions: '20000', clicks: '640', conversions: 12.5 } }] });
      if (/segments\.date/.test(query)) return send({ results: [{ segments: { date: '2026-11-16' }, metrics: { costMicros: '500000000', impressions: '700', clicks: '20', conversions: 1 } }, { segments: { date: '2026-11-15' }, metrics: { costMicros: '450000000', impressions: '650', clicks: '18' } }] });
    }
    send({ error: { message: 'ruta no simulada ' + p } }, 404);
  });
}
module.exports = { mock, calls };
