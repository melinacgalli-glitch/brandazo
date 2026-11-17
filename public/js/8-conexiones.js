/* =====================================================================
   REDES SOCIALES Y GOOGLE ADS · CONEXIONES REALES (solo en la nube)
   - Conectar: el navegador pide al servidor el enlace de autorización (Meta o Google) y va ahí.
   - Los datos los trae el servidor (al conectar, con «Actualizar ahora» y todos los días a las 6).
   - Acá solo se leen: connections/*, social/*, ads/* y settings/social (qué marca es cada cuenta).
   - Sin dato → «Sin datos», nunca 0.
   ===================================================================== */
const CX={ tid:null, unsub:[], conn:{}, social:[], ads:[], map:{}, loaded:{}, status:{} };
const CX_API=CLOUD.emu?'http://127.0.0.1:5001/brandazo/southamerica-east1/conexiones/api/v1/connect':'/api/v1/connect';
const CX_MSG={ok:'Cuenta conectada. Ya trajimos los datos.',cancelada:'Cancelaste la conexión: no se guardó nada.',vencida:'El enlace de conexión venció. Probá de nuevo.',error:'No se pudo conectar. Mirá el detalle en la pantalla.'};
const cxNum=n=>n==null?'<span class="muted">Sin datos</span>':Number(n).toLocaleString('es-AR');
const cxMoney=(m,cur)=>m==null?'<span class="muted">Sin datos</span>':(m/100).toLocaleString('es-AR',{style:'currency',currency:cur||'ARS',maximumFractionDigits:0});
const cxWhen=t=>{ const d=t&&t.toDate?t.toDate():null; return d?d.toLocaleString('es-AR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—'; };
const cxDay=s=>{ if(!s) return '—'; const d=new Date(s); return isNaN(d)?String(s).slice(0,10):d.toLocaleDateString('es-AR',{day:'numeric',month:'short'}); };
const cxAdmin=()=>S.company&&['Dueño','Admin'].includes(S.company.myRole);

function cxListen(){
  const c=S.company; if(!c||!c.cloud||!fbDb) return;
  if(CX.tid===c.tid) return;
  CX.unsub.forEach(f=>f()); Object.assign(CX,{tid:c.tid,unsub:[],conn:{},social:[],ads:[],map:{},loaded:{}});
  const t=`tenants/${c.tid}`, done=k=>{ CX.loaded[k]=true; cxRefresh(); }, fail=k=>e=>{ console.warn('[conexiones]',k,e.code); done(k); };
  CX.unsub.push(fbDb.collection(`${t}/connections`).onSnapshot(s=>{ CX.conn={}; s.forEach(d=>CX.conn[d.id]=d.data()); done('conn'); },fail('conn')));
  CX.unsub.push(fbDb.collection(`${t}/social`).onSnapshot(s=>{ CX.social=s.docs.map(d=>({key:d.id,...d.data()})); done('social'); },fail('social')));
  CX.unsub.push(fbDb.collection(`${t}/ads`).onSnapshot(s=>{ CX.ads=s.docs.map(d=>({key:d.id,...d.data()})); done('ads'); },fail('ads')));
  CX.unsub.push(fbDb.doc(`${t}/settings/social`).onSnapshot(s=>{ CX.map=(s.exists&&s.data().brandByAccount)||{}; cxRefresh(); },()=>{}));
  C.unsub.push(()=>{ CX.unsub.forEach(f=>f()); CX.unsub=[]; CX.tid=null; });
  ['meta','google-ads'].forEach(p=>{ if(CX.status[p]==null) fetch(`${CX_API}/${p}/status`).then(r=>r.json()).then(j=>{ CX.status[p]=!!j.configured; cxRefresh(); }).catch(()=>{ CX.status[p]=null; }); });
}
function cxRefresh(){ if(!/^#\/app\/(redes|metricas\/anuncios)/.test(location.hash)) return; if($('#layer').children.length) return; render(); }
async function cxCall(provider,action){
  const r=await fetch(`${CX_API}/${provider}/${action}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await C.user.getIdToken()},body:JSON.stringify({tenantId:S.company.tid,returnTo:location.origin})});
  const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error((j.error&&j.error.message)||'No se pudo completar.'); return j;
}
async function cxConnect(provider,btn){
  if(!cxAdmin()) return toast('Solo el Dueño o un Admin pueden conectar cuentas');
  if(btn) btn.classList.add('is-loading');
  try{ const j=await cxCall(provider,'start'); location.href=j.url; }
  catch(e){ if(btn) btn.classList.remove('is-loading'); toast(e.message); }
}
async function cxSync(provider,btn){ btn.classList.add('is-loading'); try{ const j=await cxCall(provider,'sync'); toast(j.errors&&j.errors.length?'Actualizado, con avisos: mirá el detalle':'Datos actualizados'); }catch(e){ toast(e.message); } btn.classList.remove('is-loading'); }
function cxDisconnect(provider,name){
  modal(`¿Desconectar ${name}?`,`<p>Brandazo deja de actualizar estos datos y borra el permiso de acceso. Lo que ya se trajo queda guardado. Podés volver a conectar cuando quieras.</p>`,`<button class="btn" data-close>Volver</button><button class="btn btn-danger" id="cxdok">Desconectar</button>`);
  $('#cxdok').onclick=async e=>{ e.currentTarget.classList.add('is-loading'); try{ await cxCall(provider,'disconnect'); closeLayer(); toast(`${name} desconectado`); render(); }catch(err){ e.currentTarget.classList.remove('is-loading'); toast(err.message); } };
}
// Aviso al volver de Meta o Google (#/app/redes?conexion=ok)
function cxReturnNotice(){ const m=location.hash.match(/\?conexion=([a-z]+)/); if(!m) return; history.replaceState(null,'',location.pathname+location.search+location.hash.replace(/\?conexion=[a-z]+/,'')); setTimeout(()=>toast(CX_MSG[m[1]]||'Listo'),300); }

function cxStatusBox(conn,provider,name){
  if(!conn) return '';
  const exp=conn.expiresAt&&conn.expiresAt.toDate?conn.expiresAt.toDate():null, days=exp?Math.ceil((exp-Date.now())/864e5):null;
  const bad=conn.status==='expired'||conn.status==='error'||(days!=null&&days<=0);
  const soon=!bad&&days!=null&&days<=7;
  let h=`<div class="alert ${bad?'alert-err':soon||conn.status==='warning'?'alert-warn':'alert-ok'}" style="margin-bottom:16px">${ic(bad||soon?'alert':'check')}<div>`;
  if(bad) h+=`<b>Hay que volver a conectar ${name}.</b> ${esc(conn.lastError||'El permiso venció.')}`;
  else h+=`Conectado por ${esc(conn.connectedBy||'—')} · última actualización: ${cxWhen(conn.lastSyncAt)}${exp?` · el permiso vence el ${exp.toLocaleDateString('es-AR')}${soon?' (renovalo con «Volver a conectar»)':''}`:''}${conn.status==='warning'&&conn.lastError?`<div class="small" style="margin-top:4px">Algunos datos no llegaron: ${esc(conn.lastError)}</div>`:''}`;
  return h+'</div></div>';
}
function cxNotConfigured(provider){ return CX.status[provider]===false?`<div class="alert alert-warn" style="margin-bottom:16px">${ic('alert')}<div><b>Falta un paso de configuración.</b> Brandazo todavía no tiene cargados los datos de su app de ${provider==='meta'?'Meta':'Google Ads'}. Cuando estén, este botón funciona.</div></div>`:''; }

/* ---------- Redes sociales (Meta) ---------- */
function vRedesNube(){
  cxListen();
  const conn=CX.conn.meta, admin=cxAdmin();
  const acts=!admin?'':conn?`<button class="btn" id="cxsync">${ic('refresh')} Actualizar ahora</button><button class="btn" id="cxre">Volver a conectar</button><button class="btn btn-ghost" id="cxdis">Desconectar</button>`:`<button class="btn btn-primary" id="cxconn">${ic('plug')} Conectar Instagram y Facebook</button>`;
  const head=pageHead('Redes sociales','Instagram y Facebook, con datos reales. Se actualiza solo todos los días a las 6.',`${brandScope()}${acts}`);
  if(!CX.loaded.conn||!CX.loaded.social) return head+`<div class="card empty"><p class="muted">Cargando…</p></div>`;
  if(!conn&&!CX.social.length) return head+cxNotConfigured('meta')+`<div class="card empty"><div class="eico">${ic('plug')}</div><h3>Conectá Instagram y Facebook</h3><p class="muted small" style="max-width:520px">Vas a ir a Facebook para elegir las páginas y la cuenta profesional de Instagram que querés traer. Brandazo solo <b>lee</b>: seguidores, publicaciones, me gusta, comentarios y alcance. No publica nada.</p>${admin?`<button class="btn btn-primary" data-cxconn>${ic('plug')} Conectar Instagram y Facebook</button>`:'<p class="small muted">Pedile al Dueño o a un Admin que conecte las cuentas.</p>'}</div>`;
  const b=curBrand(), inScope=a=>!b||CX.map[a.key]===b.name;
  const accs=CX.social.filter(inScope).sort((x,y)=>(x.net+x.name).localeCompare(y.net+y.name));
  const posts=accs.flatMap(a=>(a.posts||[]).map(p=>({...p,net:a.net,acc:a.username?'@'+a.username:a.name}))).sort((x,y)=>String(y.at).localeCompare(String(x.at))).slice(0,20);
  const brandSel=a=>admin?`<select class="select sm" data-cxbrand="${esc(a.key)}" aria-label="Marca de ${esc(a.name)}"><option value="">Sin marca</option>${S.brands.map(x=>`<option ${CX.map[a.key]===x.name?'selected':''}>${esc(x.name)}</option>`).join('')}</select>`:`<span class="small muted">${esc(CX.map[a.key]||'Sin marca')}</span>`;
  const reach=a=>(a.reachDaily||[]).length?(a.reachDaily||[]).reduce((s,d)=>s+(d.value||0),0):null;
  return head+cxStatusBox(conn,'meta','Instagram y Facebook')+(accs.length?'':`<div class="alert alert-info" style="margin-bottom:16px">${ic('info')}<div>Ninguna cuenta está asignada a la marca ${esc(b?b.name:'')}. Elegí «Todas las marcas» o asigná la marca en cada cuenta.</div></div>`)+
  `<div class="cards" style="margin-bottom:16px">${accs.map(a=>`<article class="card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:start;margin-bottom:12px"><div><span class="badge">${esc(a.net)}</span><h3 style="margin-top:6px">${esc(a.username?'@'+a.username:a.name)}</h3>${a.url?`<a class="small" href="${esc(a.url)}" target="_blank" rel="noopener">Ver perfil</a>`:''}</div>${brandSel(a)}</div>
    <dl class="kv"><dt>Seguidores</dt><dd>${cxNum(a.followers)}</dd>${a.net==='Instagram'?`<dt>Publicaciones</dt><dd>${cxNum(a.mediaCount)}</dd><dt>Alcance (28 días)</dt><dd>${cxNum(reach(a))}</dd>`:''}<dt>Actualizado</dt><dd>${cxWhen(a.syncedAt)}</dd></dl></article>`).join('')}</div>
  <section class="card"><div class="card-head"><h3>Últimas publicaciones</h3><span class="small muted">${posts.length} publicaciones</span></div>
  ${posts.length?`<div class="table-wrap"><table class="t"><thead><tr><th>Fecha</th><th>Cuenta</th><th class="hide-m">Tipo</th><th class="hide-m">Texto</th><th style="text-align:right">Me gusta</th><th style="text-align:right">Coment.</th><th style="text-align:right">Alcance</th></tr></thead><tbody>
  ${posts.map(p=>`<tr><td class="small">${cxDay(p.at)}</td><td class="small">${esc(p.net)}<div class="muted">${esc(p.acc)}</div></td><td class="hide-m small">${esc(p.type||'')}</td><td class="hide-m small" style="max-width:340px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.url?`<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.text||'(sin texto)')}</a>`:esc(p.text||'(sin texto)')}</div></td><td style="text-align:right">${cxNum(p.likes)}</td><td style="text-align:right">${cxNum(p.comments)}</td><td style="text-align:right">${cxNum(p.reach)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="small muted">Todavía no hay publicaciones para mostrar.</p>'}
  <p class="small muted" style="margin-top:8px">La evolución de seguidores se arma día a día desde que conectaste las cuentas.</p></section>`;
}
function bRedesNube(){
  const on=(s,f)=>{const e=$(s);if(e)e.onclick=f};
  on('#cxconn',e=>cxConnect('meta',e.currentTarget)); $$('[data-cxconn]').forEach(b=>b.onclick=()=>cxConnect('meta',b));
  on('#cxre',e=>cxConnect('meta',e.currentTarget)); on('#cxsync',e=>cxSync('meta',e.currentTarget)); on('#cxdis',()=>cxDisconnect('meta','Instagram y Facebook'));
  $$('[data-cxbrand]').forEach(s=>s.onchange=async()=>{ const map={...CX.map,[s.dataset.cxbrand]:s.value}; if(!s.value) delete map[s.dataset.cxbrand];
    try{ await fbDb.doc(`tenants/${CX.tid}/settings/social`).set({brandByAccount:map,updatedAt:TS(),updatedBy:C.user.uid}); toast(s.value?`Cuenta asignada a ${s.value}`:'Cuenta sin marca'); }catch(e){ toast('No se pudo guardar la marca'); } });
}

/* ---------- Métricas → Google Ads ---------- */
function vAnuncios(){
  cxListen();
  const conn=CX.conn.googleAds, admin=cxAdmin();
  const acts=!admin?'':conn?`<button class="btn" id="gxsync">${ic('refresh')} Actualizar ahora</button><button class="btn" id="gxre">Volver a conectar</button><button class="btn btn-ghost" id="gxdis">Desconectar</button>`:`<button class="btn btn-primary" id="gxconn">${ic('plug')} Conectar Google Ads</button>`;
  const head=pageHead('Métricas','Resultados de marketing, comunicación y ventas en un solo tablero.',acts)+subTabs('metricas',ME_TABS,'anuncios');
  if(!CX.loaded.conn||!CX.loaded.ads) return head+`<div class="card empty"><p class="muted">Cargando…</p></div>`;
  if(!conn&&!CX.ads.length) return head+cxNotConfigured('google-ads')+`<div class="card empty"><div class="eico">${ic('megaphone')}</div><h3>Conectá Google Ads</h3><p class="muted small" style="max-width:520px">Vas a ir a Google para autorizar a Brandazo a <b>leer</b> tus campañas: inversión, clics, impresiones y conversiones de los últimos 30 días. No cambia nada en tus anuncios.</p>${admin?`<button class="btn btn-primary" data-gxconn>${ic('plug')} Conectar Google Ads</button>`:'<p class="small muted">Pedile al Dueño o a un Admin que conecte la cuenta.</p>'}</div>`;
  const mgr=(conn&&conn.accounts||[]).filter(a=>a.manager);
  const blocks=CX.ads.map(a=>{ const cs=[...(a.campaigns||[])].sort((x,y)=>(y.costMinor||0)-(x.costMinor||0)), sum=k=>cs.reduce((s,c)=>s+(c[k]||0),0);
    const cost=sum('costMinor'), clicks=sum('clicks'), impr=sum('impressions'), conv=sum('conversions'), cur=a.currency, max=Math.max(1,...(a.daily||[]).map(d=>d.costMinor||0));
    return `<section class="card" style="margin-bottom:16px"><div class="card-head"><h3>${esc(a.name)}</h3><span class="small muted">${esc(a.period||'')} · actualizado ${cxWhen(a.syncedAt)}</span></div>
    <div class="stat-grid"><div class="stat"><div class="l">Inversión</div><div class="v">${cs.length?cxMoney(cost,cur):'<span class="muted">Sin datos</span>'}</div><div class="d">sin impuestos</div></div><div class="stat"><div class="l">Clics</div><div class="v">${cs.length?cxNum(clicks):'—'}</div><div class="d">${impr?`${(clicks/impr*100).toLocaleString('es-AR',{maximumFractionDigits:1})}% de ${impr.toLocaleString('es-AR')} impresiones`:'—'}</div></div><div class="stat"><div class="l">Costo por clic</div><div class="v">${clicks?cxMoney(Math.round(cost/clicks),cur):'<span class="muted">Sin datos</span>'}</div></div><div class="stat"><div class="l">Conversiones</div><div class="v">${cs.length?cxNum(conv):'—'}</div><div class="d">${conv?`${cxMoney(Math.round(cost/conv),cur)} cada una`:'según Google Ads'}</div></div></div>
    ${cs.length?`<div class="table-wrap"><table class="t"><thead><tr><th>Campaña</th><th class="hide-m">Estado</th><th style="text-align:right">Inversión</th><th style="text-align:right">Clics</th><th class="hide-m" style="text-align:right">Impresiones</th><th style="text-align:right">Conv.</th></tr></thead><tbody>
    ${cs.map(c=>`<tr><td>${esc(c.name)}<div class="small muted">${esc(({SEARCH:'Búsqueda',DISPLAY:'Display',VIDEO:'Video',PERFORMANCE_MAX:'Máximo rendimiento',SHOPPING:'Shopping',DEMAND_GEN:'Demanda'})[c.channel]||c.channel||'')}</div></td><td class="hide-m small">${({ENABLED:'Activa',PAUSED:'Pausada',REMOVED:'Eliminada'})[c.status]||esc(c.status||'')}</td><td style="text-align:right">${cxMoney(c.costMinor,cur)}</td><td style="text-align:right">${cxNum(c.clicks)}</td><td class="hide-m" style="text-align:right">${cxNum(c.impressions)}</td><td style="text-align:right">${cxNum(c.conversions)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="small muted">Esta cuenta no tuvo campañas con movimiento en los últimos 30 días.</p>'}
    ${(a.daily||[]).length?`<h4 class="small" style="margin:16px 0 8px">Inversión por día</h4>${a.daily.slice(-14).map(d=>`<div class="hbar" title="${cxDay(d.date)}: ${(d.costMinor/100).toLocaleString('es-AR',{style:'currency',currency:cur||'ARS',maximumFractionDigits:0})} · ${d.clicks} clics"><span>${cxDay(d.date)}</span><div class="b"><i style="width:${Math.round((d.costMinor||0)/max*100)}%;background:var(--magenta)"></i></div><span class="v" style="text-align:right">${(d.costMinor/100).toLocaleString('es-AR',{style:'currency',currency:cur||'ARS',maximumFractionDigits:0})}</span></div>`).join('')}`:''}</section>`; }).join('');
  return head+cxStatusBox(conn,'google-ads','Google Ads')+(mgr.length?`<div class="alert alert-info" style="margin-bottom:16px">${ic('info')}<div>${mgr.map(a=>esc(a.name)).join(', ')} ${mgr.length>1?'son cuentas de administrador':'es una cuenta de administrador'}: no tiene${mgr.length>1?'n':''} campañas propias y no se muestra${mgr.length>1?'n':''}.</div></div>`:'')+(blocks||'<p class="small muted">Todavía no hay datos de campañas.</p>');
}
function bAnuncios(){
  const on=(s,f)=>{const e=$(s);if(e)e.onclick=f};
  on('#gxconn',e=>cxConnect('google-ads',e.currentTarget)); $$('[data-gxconn]').forEach(b=>b.onclick=()=>cxConnect('google-ads',b));
  on('#gxre',e=>cxConnect('google-ads',e.currentTarget)); on('#gxsync',e=>cxSync('google-ads',e.currentTarget)); on('#gxdis',()=>cxDisconnect('google-ads','Google Ads'));
}

/* ---------- Conexión con las pantallas ---------- */
(function(){
  if(!CLOUD.on) return;
  const cloudCo=()=>S.company&&S.company.cloud;
  const R=VIEWS.redes, _rv=R.view, _rb=R.bind;
  R.view=function(...a){ return cloudCo()?vRedesNube():_rv.apply(this,a); };
  R.bind=function(...a){ if(cloudCo()){ bRedesNube(); cxReturnNotice(); } else _rb.apply(this,a); };
  const Mv=VIEWS.metricas, _mv=Mv.view, _mb=Mv.bind;
  const syncTabs=()=>{ const i=ME_TABS.findIndex(t=>t[0]==='anuncios'); if(cloudCo()&&i<0) ME_TABS.push(['anuncios','Google Ads']); if(!cloudCo()&&i>=0) ME_TABS.splice(i,1); };
  Mv.view=function(tab){ syncTabs(); return cloudCo()&&tab==='anuncios'?vAnuncios():_mv.call(this,tab); };
  Mv.bind=function(tab){ if(cloudCo()&&tab==='anuncios'){ bAnuncios(); cxReturnNotice(); } else _mb.call(this,tab); };
  // Integraciones: Meta (0) y Google Ads (6) son reales; las demás siguen «todavía no disponible»
  const real={0:'#/app/redes',6:'#/app/metricas/anuncios'};
  const I=VIEWS.integraciones, _ib=I.bind;
  I.bind=function(...a){ _ib.apply(this,a); if(!cloudCo()) return; $$('[data-iconn]').forEach(b=>{ const r=real[+b.dataset.iconn]; if(r) b.onclick=()=>go(r); }); };
  const _bc=bConfig;
  bConfig=function(tab){ _bc(tab); if(!cloudCo()) return; $$('[data-int]').forEach(b=>{ const r=real[+b.dataset.int]; if(r) b.onclick=()=>go(r); }); };
})();
