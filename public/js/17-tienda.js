/* =====================================================================
   ETAPA C1 · VENTAS DE LA TIENDA ONLINE (Cafelito Cakes)
   - Cada unidad de negocio dice cómo cierra sus ventas: con contacto (CRM, como Cafelito Ambulante)
     o en la tienda online (carrito + Mercado Pago, como Cafelito Cakes).
   - Los pedidos los manda la web a Brandazo (tenants/{t}/orders, solo lectura acá).
   - Cuenta como venta un pedido pagado o retirado, en el mes en que se pagó.
   - Con eso se completan: la solapa «Tienda» del CRM, los resultados de cada campaña,
     las etapas del funnel y los resultados clave automáticos de los objetivos.
   ===================================================================== */
const SH={ tid:null, unsub:null, orders:[], loaded:false, err:'', month:'' };
const SH_ST={paid:['Pagado · por retirar','badge-brand'],picked_up:['Retirado','badge-ok'],cancelled:['Cancelado','badge-err'],refunded:['Devuelto','badge-warn']};
const shCounted=o=>o.status==='paid'||o.status==='picked_up';
const shTZ=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Cordoba',year:'numeric',month:'2-digit',day:'2-digit'});
const shToday=()=>shTZ.format(new Date());
const shMonthName=k=>{ const [y,m]=k.split('-').map(Number); return `${MES[m-1][0].toUpperCase()+MES[m-1].slice(1)} ${y}`; };
const shCloud=()=>!!(S.company&&S.company.cloud&&typeof fbDb!=='undefined'&&fbDb);

/* ¿Cómo vende cada unidad? explícito en la unidad, o «tienda» si ya le llegaron pedidos */
function unitSells(name){ const b=S.brands.find(x=>x.name===name); if(b&&b.sells) return b.sells;
  return SH.orders.some(o=>o.brand===name)?'tienda':'crm'; }

function shListen(){
  if(!shCloud()) return; const c=S.company;
  if(SH.tid===c.tid&&SH.unsub) return;
  if(SH.unsub) SH.unsub();
  Object.assign(SH,{tid:c.tid,orders:[],loaded:false,err:''});
  SH.unsub=fbDb.collection(`tenants/${c.tid}/orders`).orderBy('updatedAt','desc').limit(3000).onSnapshot(sn=>{
    SH.orders=sn.docs.map(d=>({id:d.id,...d.data()})); SH.loaded=true; SH.err=''; shRefresh();
  },e=>{ SH.loaded=true; SH.err=e.code==='permission-denied'?'No tenés permiso para ver los pedidos de esta empresa.':'No se pudo conectar con la nube.'; shRefresh(); });
  C.unsub.push(()=>{ if(SH.unsub){ SH.unsub(); SH.unsub=null; SH.tid=null; } });
}
function shRefresh(){
  if(!/^#\/app\/(crm\/tienda|campanas\/|estrategia)/.test(location.hash)) return;
  if($('#layer').children.length) return;
  render();
}
function ensureSH(){ if(!shCloud()) return false; shListen(); return SH.loaded; }

/* Campaña de un pedido: por su utm_campaign */
function orderCampaign(o){ const u=o.utmCampaign||String(((o.attribution||{}).utmCampaign)||'').trim().toLowerCase(); if(!u) return null;
  return M().campaigns.find(c=>(c.utm||'').toLowerCase()===u)||null; }
const shItems=o=>(o.items||[]).map(i=>`${i.quantity>1?i.quantity+' × ':''}${i.name}${i.variant?' ('+i.variant+')':''}`).join(', ');
const shPaidMs=o=>o.paidAt&&o.paidAt.toMillis?o.paidAt.toMillis():null;
function shStats(list){ const c=list.filter(shCounted), total=c.reduce((a,o)=>a+(o.totalMinor||0),0);
  return {n:c.length,total,ticket:c.length?Math.round(total/c.length/100)*100:null}; }

/* ---------- CRM → solapa «Tienda» ---------- */
function vTienda(){
  if(!shCloud()) return `<div class="card empty"><p class="muted">Los pedidos de la tienda se ven en la versión en la nube.</p></div>`;
  shListen(); if(!SH.loaded) return `<div class="card empty"><p class="muted">Cargando pedidos…</p></div>`;
  if(SH.err) return `<div class="alert alert-err">${ic('alert')}<div>${esc(SH.err)}</div></div>`;
  if(!SH.orders.length) return emptyBlock('dollar','Todavía no llegó ningún pedido de la tienda','Cuando la web de Cafelito empiece a avisar los pedidos pagados (lo está preparando el equipo web), aparecen acá solos, con el cliente, lo que compró, el día de retiro y la campaña que lo trajo.','');
  const cur=shTZ.format(new Date()).slice(0,7); if(!SH.month) SH.month=cur;
  const months=[...new Set([cur,...SH.orders.map(o=>o.paidMonth).filter(Boolean)])].sort().reverse();
  const inMonth=SH.orders.filter(o=>o.paidMonth===SH.month), st=shStats(inMonth);
  const toPick=SH.orders.filter(o=>o.status==='paid').sort((a,b)=>String((a.pickup||{}).date||'9').localeCompare(String((b.pickup||{}).date||'9')));
  const lost=inMonth.filter(o=>!shCounted(o)), today=shToday();
  const stat=(l,v,d,cls='')=>`<div class="stat ${cls}"><div class="l">${l}</div><div class="v">${v}</div>${d?`<div class="d">${d}</div>`:''}</div>`;
  const row=o=>{ const [sl,sc]=SH_ST[o.status]||[o.status,'']; const k=orderCampaign(o), pk=(o.pickup||{}).date, late=o.status==='paid'&&pk&&pk<today;
    return `<button type="button" class="sh-row" data-shop="${esc(o.id)}"><span class="sh-main"><b>${esc(o.customerName||'Sin nombre')}</b><span class="small muted">${esc(shItems(o))}</span></span>
      <span class="sh-total mono">${evMoney(o.totalMinor)}</span>
      <span class="sh-meta small"><span class="badge ${sc}">${sl}</span><span${late?' style="color:var(--warning)"':''}>Retira: ${pk?evDate(pk):'sin fecha'}</span><span class="muted">${k?esc(k.name):'Sin campaña'}</span><span class="muted">N.º ${esc(o.orderId)} · pagado ${o.paidAt?evWhen(o.paidAt):'—'}</span></span></button>`; };
  const table=list=>`<div class="sh-list">${list.map(row).join('')}</div>`;
  return `<div class="toolbar" style="margin-bottom:16px"><div class="field" style="margin:0"><label for="shm" class="sr">Mes</label><select class="select" id="shm">${months.map(m=>`<option value="${m}" ${m===SH.month?'selected':''}>${shMonthName(m)}</option>`).join('')}</select></div><span class="small muted">Las ventas cuentan en el mes en que se pagaron.</span></div>
   <div class="stat-grid">${stat('Pedidos pagados',st.n,shMonthName(SH.month),'st-info')}${stat('Facturación',st.n?evMoney(st.total):'<span class="muted">$ 0</span>','IVA incluido','st-ok')}${stat('Ticket promedio',st.ticket==null?'<span class="muted">Sin datos</span>':evMoney(st.ticket),'por pedido','st-ok')}${stat('Por retirar',toPick.length,toPick.some(o=>(o.pickup||{}).date&&o.pickup.date<today)?'hay retiros atrasados':'pagados sin retirar','st-warn')}</div>
   ${toPick.length?`<section class="card" style="margin:16px 0"><h3 style="margin-bottom:8px">Por retirar</h3>${table(toPick)}</section>`:''}
   <section class="card" style="margin-top:16px"><h3 style="margin-bottom:8px">Pedidos de ${shMonthName(SH.month)}</h3>${inMonth.length?table(inMonth.sort((a,b)=>(shPaidMs(b)||0)-(shPaidMs(a)||0))):'<p class="small muted">No hay pedidos pagados en este mes.</p>'}
   ${lost.length?`<p class="small muted" style="margin-top:8px">${lost.length} pedido${lost.length>1?'s':''} cancelado${lost.length>1?'s':''} o devuelto${lost.length>1?'s':''}: no suman a la facturación.</p>`:''}</section>`;
}
function shOrder(id){
  const o=SH.orders.find(x=>x.id===id); if(!o) return; const [sl,sc]=SH_ST[o.status]||[o.status,'']; const k=orderCampaign(o), a=o.attribution||{}, p=o.pickup||{}, pay=o.payment||{};
  const H={paid:'Pagado',picked_up:'Retirado',cancelled:'Cancelado',refunded:'Devuelto'};
  drawerWide(`<div class="dr-head"><div style="flex:1;min-width:0"><b style="font-size:16px">Pedido N.º ${esc(o.orderId)}</b><div class="small muted">${esc(o.brand||'')} · <span class="badge ${sc}">${sl}</span></div></div><button class="icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div>
   <div style="flex:1;overflow:auto;padding:20px;display:grid;gap:16px;align-content:start">
    <section class="card"><h3 style="margin-bottom:12px">Productos</h3><div class="table-wrap"><table class="t"><tbody>${(o.items||[]).map(i=>`<tr><td>${i.quantity} × ${esc(i.name)}${i.variant?`<div class="small muted">${esc(i.variant)}</div>`:''}</td><td style="text-align:right" class="mono">${evMoney(i.quantity*i.unitPriceMinor)}</td></tr>`).join('')}
     ${o.discountMinor?`<tr><td class="muted">Descuento</td><td style="text-align:right" class="mono">− ${evMoney(o.discountMinor)}</td></tr>`:''}<tr><td><b>Total cobrado</b></td><td style="text-align:right" class="mono"><b>${evMoney(o.totalMinor)}</b></td></tr></tbody></table></div>
     ${(o.warnings||[]).includes('TOTAL_MISMATCH')?`<div class="alert alert-warn" style="margin-top:8px">${ic('alert')}<div>Los productos no suman el total informado por la web: revisarlo.</div></div>`:''}${o.notes?`<p class="small" style="margin-top:8px"><b>Aclaraciones:</b> ${esc(o.notes)}</p>`:''}</section>
    <section class="card"><h3 style="margin-bottom:12px">Cliente y retiro</h3><dl class="kv"><dt>Cliente</dt><dd>${o.contactId&&typeof evContacto==='function'?`<a href="#" data-shc="${esc(o.contactId)}">${esc(o.customerName||'Sin nombre')}</a>`:esc(o.customerName||'Sin nombre')}</dd><dt>Retiro</dt><dd>${p.date?evDate(p.date):'<span class="muted">Sin fecha</span>'}${p.timeSlot?' · '+esc(p.timeSlot):''}${p.place?' · '+esc(p.place):''}</dd>
     <dt>Pago</dt><dd>${o.paidAt?evWhen(o.paidAt):'<span class="muted">Sin datos</span>'}${pay.paymentId?` · Mercado Pago n.º ${esc(pay.paymentId)}`:''}</dd></dl></section>
    <section class="card"><h3 style="margin-bottom:12px">Origen</h3><dl class="kv"><dt>Campaña</dt><dd>${k?`<a href="#/app/campanas/${k.id}">${esc(k.name)}</a>`:a.utmCampaign?`<span class="muted">Código «${esc(a.utmCampaign)}» sin campaña en Brandazo</span>`:'<span class="muted">Sin campaña</span>'}</dd><dt>Fuente</dt><dd>${esc(a.utmSource||'Sin datos')}${a.utmMedium?' · '+esc(a.utmMedium):''}</dd></dl></section>
    <section class="card"><h3 style="margin-bottom:12px">Historia</h3>${(o.history||[]).map(h=>`<div class="small" style="padding:4px 0">${esc(H[h.status]||h.status)} · ${evWhen(new Date(h.at))}${h.stale?' <span class="muted">(aviso viejo, no cambió el estado)</span>':''}</div>`).join('')}</section>
   </div>`);
  $$('[data-shc]').forEach(x=>x.onclick=e=>{ e.preventDefault(); closeLayer(); if(typeof evListen==='function') evListen(); setTimeout(()=>evContacto(x.dataset.shc),EV.contactsLoaded?0:1200); });
}
(function(){
  if(typeof CRM_NUBE_TABS==='undefined') return;
  CRM_NUBE_TABS.splice(1,0,['tienda','Tienda']);
  const _v=vCrm, _b=bCrm;
  vCrm=function(tab){ if(!(shCloud()&&tab==='tienda')) return _v(tab);
    return pageHead('CRM','Pedidos de la tienda online que llegan desde cafelito.com.ar, en vivo.','')+subTabs('crm',CRM_NUBE_TABS,'tienda')+vTienda(); };
  bCrm=function(tab){ if(!(shCloud()&&tab==='tienda')) return _b(tab);
    const m=$('#shm'); if(m) m.onchange=()=>{ SH.month=m.value; render(); };
    $$('[data-shop]').forEach(r=>r.onclick=()=>shOrder(r.dataset.shop)); };
  VIEWS.crm.view=vCrm; VIEWS.crm.bind=bCrm;
})();

/* ---------- Unidad: cómo cierra sus ventas ---------- */
(function(){
  const _bm=brandModal;
  brandModal=function(i){ _bm(i); const ok=$('#ok'), nm=$('#bnm'); if(!ok||!nm) return;
    const cur=i!=null?(S.brands[i].sells||unitSells(S.brands[i].name)):'crm';
    nm.closest('.field').insertAdjacentHTML('afterend',`<div class="field"><label for="usells">Cómo se cierra la venta</label><select class="select" id="usells"><option value="crm" ${cur==='crm'?'selected':''}>Con el contacto, en el CRM (ej.: Cafelito Ambulante)</option><option value="tienda" ${cur==='tienda'?'selected':''}>En la tienda online, con el carrito (ej.: Cafelito Cakes)</option></select><span class="hint small muted">Define de dónde salen las ventas de sus campañas, funnel y objetivos.</span></div>`);
    const orig=ok.onclick;
    ok.onclick=async ev=>{ const v=$('#usells').value, name=$('#bnm').value.trim(); await orig(ev);
      const b=S.brands.find(x=>x.name===name); if(b&&b.sells!==v&&!$('#layer .modal')){ b.sells=v; render(); } };
  };
})();

/* ---------- Campaña: ventas de la tienda ---------- */
(function(){
  const _cs=campSales;
  campSales=function(c){
    if(unitSells(c.brand)!=='tienda') return _cs(c);
    let h=_cs(c); const i=h.indexOf('<div class="stat-grid"'), j=h.indexOf('<p class="small muted">Las cotizaciones'), k=h.indexOf('<p class="small muted">Cargando cotizaciones');
    const cut=[i,j,k].filter(x=>x>0); const top=(cut.length?h.slice(0,Math.min(...cut)):h.replace(/<\/section>$/,'')).replace('Cuando alguien cotiza después de entrar por él, la cotización queda vinculada sola.','Cuando alguien compra en la tienda después de entrar por él, el pedido queda vinculado solo.');
    if(!shCloud()) return top+`<p class="small muted">Los pedidos vinculados se ven en la versión en la nube.</p></section>`;
    if(!ensureSH()) return top+`<p class="small muted">Cargando pedidos…</p></section>`;
    const list=SH.orders.filter(o=>{ const x=orderCampaign(o); return x&&x.id===c.id; }), st=shStats(list), spent=Math.round((+c.spent||0)*100);
    const stat=(l,v,d,cls='')=>`<div class="stat ${cls}"><div class="l">${l}</div><div class="v">${v}</div>${d?`<div class="d">${d}</div>`:''}</div>`;
    const stats=`<div class="stat-grid" style="margin-top:12px">${stat('Pedidos pagados',st.n,list.length>st.n?`${list.length-st.n} cancelado/s o devuelto/s`:'desde la tienda','st-info')}${stat('Facturación',st.n?evMoney(st.total):'<span class="muted">$ 0</span>','IVA incluido','st-ok')}${stat('Ticket promedio',st.ticket==null?'<span class="muted">Sin datos</span>':evMoney(st.ticket),'','st-ok')}${stat('Costo por venta',spent&&st.n?evMoney(Math.round(spent/st.n)):'<span class="muted">Sin datos</span>',spent?'inversión ÷ pedidos pagados':'cargá la inversión de la campaña','st-warn')}</div>`;
    const tbl=list.length?`<div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>Cliente</th><th class="hide-m">Productos</th><th>Pago</th><th>Estado</th><th style="text-align:right">Total</th></tr></thead><tbody>${list.sort((a,b)=>(shPaidMs(b)||0)-(shPaidMs(a)||0)).map(o=>{ const [sl,sc]=SH_ST[o.status]||[o.status,'']; return `<tr><td><a href="#/app/crm/tienda">${esc(o.customerName||'Sin nombre')}</a></td><td class="small hide-m">${esc(shItems(o))}</td><td class="small">${o.paidAt?evWhen(o.paidAt):'—'}</td><td><span class="badge ${sc}">${sl}</span></td><td style="text-align:right" class="mono">${evMoney(o.totalMinor)}</td></tr>`; }).join('')}</tbody></table></div>`
      :`<div class="alert alert-info" style="margin-top:12px">${ic('info')}<div>Todavía no llegó ningún pedido con el código <b class="mono">${esc(campCode(c))}</b>.</div></div>`;
    return top+stats+tbl+'</section>';
  };
})();

/* ---------- Funnel: pedidos pagados de la tienda ---------- */
(function(){
  F_SOURCES.splice(1,0,['shop-paid','Tienda · pedidos pagados']);
  const _fr=fReal;
  fReal=function(f,st){ if((st.source||'')!=='shop-paid') return _fr(f,st);
    if(!ensureSH()) return null;
    const range=periodRange(fPeriod(f)), brand=fBrand(f), ids=new Set((f.campaigns||[]).map(l=>l.id));
    return SH.orders.filter(o=>shCounted(o)&&o.brand===brand&&(!range||(shPaidMs(o)>=range[0].getTime()&&shPaidMs(o)<=range[1].getTime()))
      &&(!st.campOnly||(orderCampaign(o)&&ids.has(orderCampaign(o).id)))).length; };
})();

/* ---------- Objetivos: resultados clave que se completan solos ---------- */
const KR_SRC=[['','Lo cargo a mano',''],['shop-orders','Tienda · pedidos pagados',''],['shop-revenue','Tienda · facturación','$'],['shop-ticket','Tienda · ticket promedio','$'],
  ['crm-quotes','CRM · cotizaciones recibidas',''],['crm-won','CRM · ventas con seña cobrada',''],['crm-revenue','CRM · facturación con seña cobrada','$']];
/* Valor automático (en pesos para importes) o null si todavía no hay datos cargados */
function krAuto(k,o){
  const src=k.src||''; if(!src) return null; const range=periodRange(o.period), inR=ms=>ms!=null&&(!range||(ms>=range[0].getTime()&&ms<=range[1].getTime()));
  if(src.startsWith('shop-')){ if(!ensureSH()) return null;
    const st=shStats(SH.orders.filter(x=>x.brand===o.brand&&inR(shPaidMs(x))));
    return src==='shop-orders'?st.n:src==='shop-revenue'?Math.round(st.total/100):st.ticket==null?0:Math.round(st.ticket/100); }
  if(!(shCloud()&&typeof EV==='object'&&typeof evListen==='function')) return null; evListen(); if(!EV.loaded) return null;
  const ms=t=>t&&t.toMillis?t.toMillis():null, ops=EV.ops.filter(x=>x.brand===o.brand);
  if(src==='crm-quotes') return ops.filter(x=>inR(ms(x.createdAt))).length;
  const won=ops.filter(x=>x.stage==='ganada'&&x.won&&x.won.depositPaid&&inR(ms(x.won.depositPaidAt)||ms(x.updatedAt)));
  return src==='crm-won'?won.length:Math.round(won.reduce((a,x)=>a+(x.won.amountMinor||0),0)/100);
}
const krLive=o=>({...o,krs:(o.krs||[]).map(k=>{ const v=krAuto(k,o); return v==null?k:{...k,cur:v,unit:(KR_SRC.find(s=>s[0]===k.src)||[])[2]||k.unit}; })});
(function(){
  const _op=objPct; objPct=function(o){ return _op(krLive(o)); };
  const _oc=objCard;
  objCard=function(o){ let h=_oc(krLive(o)); const auto=(o.krs||[]).filter(k=>k.src);
    if(auto.length){ const pend=auto.some(k=>krAuto(k,o)==null); const note=`<p class="small muted kr-auto">${ic('refresh')} ${pend?(shCloud()?'Cargando los resultados automáticos…':'Los resultados automáticos se ven en la versión en la nube.'):`Se completa${auto.length>1?'n':''} solo${auto.length>1?'s':''}: ${auto.map(k=>esc((KR_SRC.find(s=>s[0]===k.src)||[,''])[1])).join(' · ')}.`}</p>`;
      const i=h.indexOf('<div class="small muted" style="margin-bottom:6px">Vinculado a'); h=i>0?h.slice(0,i)+note+h.slice(i):h; }
    return h; };
  const _oe=objEdit;
  objEdit=function(o){ _oe(o); const note=$('#eonote'); if(!note) return;
    const row=k=>`<div class="kr-row"><input class="input" data-krt value="${esc(k.t||'')}" placeholder="Ej.: Pedidos pagados" aria-label="Resultado clave">
      <select class="select" data-krs aria-label="Cómo se mide">${KR_SRC.map(([v,l])=>`<option value="${v}" ${v===(k.src||'')?'selected':''}>${l}</option>`).join('')}</select>
      <input class="input" data-krv type="number" min="1" value="${k.target||''}" placeholder="Meta" aria-label="Meta">
      <input class="input" data-krc type="number" min="0" value="${k.cur||0}" placeholder="Actual" aria-label="Valor actual" ${k.src?'hidden':''}>
      <button type="button" class="icon-btn" data-krdel aria-label="Quitar resultado clave">${ic('trash')}</button></div>`;
    note.insertAdjacentHTML('beforebegin',`<div class="field"><span class="label">Resultados clave</span><p class="small muted" style="margin:0 0 8px">Elegí «Tienda» o «CRM» para que se completen solos con las ventas reales de la unidad en el período; si no, cargás el valor a mano.</p><div id="krrows">${(o.krs||[]).map(row).join('')}</div><button type="button" class="btn btn-sm btn-ghost" id="kradd">${ic('plus')} Agregar resultado clave</button></div>`);
    const bind=()=>{ $$('#krrows [data-krdel]').forEach(b=>b.onclick=()=>b.closest('.kr-row').remove());
      $$('#krrows [data-krs]').forEach(s=>s.onchange=()=>{ const r=s.closest('.kr-row'); r.querySelector('[data-krc]').hidden=!!s.value; const t=r.querySelector('[data-krt]'); if(s.value&&!t.value.trim()) t.value=(KR_SRC.find(x=>x[0]===s.value)||[,''])[1].replace(/^(Tienda|CRM) · /,'').replace(/^./,c=>c.toUpperCase()); }); };
    bind(); $('#kradd').onclick=()=>{ $('#krrows').insertAdjacentHTML('beforeend',row({})); bind(); };
    const ok=$('#eok'), orig=ok.onclick;
    ok.onclick=ev=>{ if(!$('#eot').value.trim()) return orig(ev);
      o.krs=$$('#krrows .kr-row').map(r=>{ const src=r.querySelector('[data-krs]').value, t=r.querySelector('[data-krt]').value.trim(), target=+r.querySelector('[data-krv]').value||0;
        if(!t||!target) return null; const unit=src?(KR_SRC.find(s=>s[0]===src)||[])[2]||'':((o.krs||[]).find(k=>k.t===t)||{}).unit||'';
        return {t,target,unit,cur:src?0:(+r.querySelector('[data-krc]').value||0),...(src?{src}:{})}; }).filter(Boolean);
      return orig(ev); };
  };
})();
