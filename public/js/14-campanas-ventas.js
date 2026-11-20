/* =====================================================================
   ETAPA B · EL MARKETING ALIMENTA LA VENTA
   - Cada campaña tiene un código de seguimiento (utm_campaign) y un armador de links para los anuncios.
   - Las cotizaciones que llegan con ese código quedan vinculadas solas a la campaña
     (también se pueden asignar a mano desde la ficha: opportunity.campaignId).
   - La campaña muestra sus resultados reales: cotizaciones, en negociación, ganadas, facturación,
     tasa de cierre y costo por cotización / por venta.
   - El funnel puede tomar sus resultados reales de las cotizaciones del CRM.
   ===================================================================== */
const campSlug=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50)||'campana';
function campCode(c){
  if(c.utm) return c.utm;
  const used=new Set(M().campaigns.filter(x=>x!==c&&x.utm).map(x=>x.utm)); let code=campSlug(c.name), n=2;
  while(used.has(code)) code=`${campSlug(c.name)}-${n++}`;
  c.utm=code; return code;
}
/* Campaña de una cotización: la asignada a mano o la que coincide con su utm_campaign */
function oppCampaign(o){
  const m=M(); if(o.campaignId) return m.campaigns.find(c=>c.id===o.campaignId)||null;
  const u=String(((o.attribution||{}).utmCampaign)||((o.source||{}).utmCampaign)||'').trim().toLowerCase(); if(!u) return null;
  return m.campaigns.find(c=>(c.utm||'').toLowerCase()===u)||null;
}
const oppAmount=o=>(o.won&&o.won.amountMinor)||(o.proposal&&o.proposal.amountMinor)||(o.estimate&&o.estimate.brandazoSubtotalMinor)||0;
function ensureEV(route){ if(!(S.company&&S.company.cloud&&typeof EV==='object'&&typeof evListen==='function')) return false; if(EV.loaded) return true;
  evListen(); const t=setInterval(()=>{ if(EV.loaded){ clearInterval(t); if(route.test(location.hash)&&!$('#layer').children.length) render(); } },700); setTimeout(()=>clearInterval(t),15000); return false; }

/* ---------- Campaña: código, armador de links y resultados en ventas ---------- */
const CAMP_SRC=[['instagram','Instagram','paid_social'],['facebook','Facebook','paid_social'],['google','Google Ads','cpc'],['tiktok','TikTok','paid_social'],['email','Mail','email'],['whatsapp','WhatsApp','messaging'],['organico','Publicación orgánica','social']];
function campSales(c){
  const cloud=S.company&&S.company.cloud;
  const head=`<section class="card" style="margin-top:16px" id="campsales"><div class="card-head"><h3>Ventas que trajo esta campaña</h3><span class="small muted">Código: <b class="mono">${esc(campCode(c))}</b></span></div>`;
  const web=((M().kits||{}).__marca||{info:{}}).info.web||'www.cafelito.com.ar';
  const builder=`<div class="camp-link"><p class="small muted" style="margin-bottom:8px">Usá este link en los anuncios y publicaciones de la campaña. Cuando alguien cotiza después de entrar por él, la cotización queda vinculada sola.</p>
   <div class="form-grid"><div class="field"><label for="clurl">Página de destino</label><input class="input" id="clurl" value="${esc(/^https?:/.test(web)?web:'https://'+web)}"></div>
   <div class="field"><label for="clsrc">Dónde lo vas a usar</label><select class="select" id="clsrc">${CAMP_SRC.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></div></div>
   <div class="field"><label for="clout">Link para copiar</label><div style="display:flex;gap:8px"><input class="input mono" id="clout" readonly><button type="button" class="btn" id="clcopy">${ic('copy')} Copiar</button></div></div></div>`;
  if(!cloud) return head+builder+`<p class="small muted">Las cotizaciones vinculadas se ven en la versión en la nube.</p></section>`;
  if(!ensureEV(/#\/app\/campanas\//)) return head+builder+`<p class="small muted">Cargando cotizaciones…</p></section>`;
  const ops=EV.ops.filter(o=>{ const k=oppCampaign(o); return k&&k.id===c.id; });
  const adv=ops.filter(o=>['en-negociacion','ganada'].includes(o.stage)), won=ops.filter(o=>o.stage==='ganada'), lost=ops.filter(o=>o.stage==='perdida');
  const wonAmt=won.reduce((a,o)=>a+oppAmount(o),0), spentMinor=Math.round((+c.spent||0)*100);
  const closed=won.length+lost.length, rate=closed?Math.round(won.length/closed*100):null;
  const stat=(l,v,d,cls='')=>`<div class="stat ${cls}"><div class="l">${l}</div><div class="v">${v}</div>${d?`<div class="d">${d}</div>`:''}</div>`;
  const stats=`<div class="stat-grid" style="margin-top:12px">${stat('Cotizaciones',ops.length,ops.length?`${adv.length} en negociación o ganadas`:'todavía ninguna','st-info')}${stat('Ganadas',won.length,rate==null?'sin cierres todavía':`${rate}% de las cerradas`,'st-ok')}${stat('Facturación ganada',wonAmt?evMoney(wonAmt):'<span class="muted">$ 0</span>','sin IVA','st-ok')}${stat('Costo por venta',spentMinor&&won.length?evMoney(Math.round(spentMinor/won.length)):'<span class="muted">Sin datos</span>',spentMinor?(ops.length?`${evMoney(Math.round(spentMinor/ops.length))} por cotización`:''):'cargá la inversión de la campaña','st-warn')}</div>`;
  const list=ops.length?`<div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>Contacto</th><th>Evento</th><th>Etapa</th><th style="text-align:right">Importe</th></tr></thead><tbody>${ops.sort((a,b)=>String(b.event&&b.event.date).localeCompare(String(a.event&&a.event.date))).map(o=>`<tr><td><a href="#/app/crm/eventos?t=${encodeURIComponent(S.company.tid)}&op=${o.id}">${esc(evName(o))}</a></td><td class="small">${esc((o.event||{}).type||'')} · ${evDate((o.event||{}).date)}</td><td class="small">${esc(evStageName(o.stage))}</td><td style="text-align:right">${evMoney(oppAmount(o))}</td></tr>`).join('')}</tbody></table></div>`
    :`<div class="alert alert-info" style="margin-top:12px">${ic('info')}<div>Todavía no llegó ninguna cotización con el código <b class="mono">${esc(campCode(c))}</b>. También podés asignar una cotización a esta campaña desde su ficha en el CRM.</div></div>`;
  return head+builder+stats+list+'</section>';
}
(function(){
  const _cd=campDetail;
  campDetail=function(c){ const h=_cd(c); return h+campSales(c); };
  const _bc=bCampanas;
  bCampanas=function(id){ _bc(id); const out=$('#clout'); if(!out) return; const c=M().campaigns.find(x=>x.id===id); if(!c) return;
    const upd=()=>{ let base=$('#clurl').value.trim()||'https://www.cafelito.com.ar'; if(!/^https?:\/\//i.test(base)) base='https://'+base;
      const src=CAMP_SRC.find(x=>x[0]===$('#clsrc').value)||CAMP_SRC[0];
      try{ const u=new URL(base); u.searchParams.set('utm_source',src[0]); u.searchParams.set('utm_medium',src[2]); u.searchParams.set('utm_campaign',campCode(c)); out.value=u.toString(); }catch(e){ out.value='Revisá la página de destino'; } };
    $('#clurl').oninput=upd; $('#clsrc').onchange=upd; upd();
    $('#clcopy').onclick=()=>{ out.select(); try{ navigator.clipboard.writeText(out.value).then(()=>toast('Link copiado'),()=>toast('Seleccioná el link y copialo')); }catch(e){ toast('Seleccioná el link y copialo'); } };
  };
  VIEWS.campanas.view=vCampanas; VIEWS.campanas.bind=bCampanas;
})();

/* ---------- CRM: campaña en la ficha y en la tarjeta ---------- */
(function(){
  const _ff=evFicha;
  evFicha=function(id){ _ff(id); const o=EV.ops.find(z=>z.id===id); if(!o) return;
    const camps=M().campaigns.filter(c=>c.brand===o.brand), cur=oppCampaign(o), auto=!o.campaignId&&cur;
    const box=document.createElement('section'); box.className='card';
    box.innerHTML=`<h3 style="margin-bottom:8px">Campaña que la trajo</h3>${camps.length?`<div class="field" style="margin:0"><label for="evcamp" class="sr">Campaña</label><select class="select" id="evcamp"><option value="">Sin campaña</option>${camps.map(c=>`<option value="${c.id}" ${cur&&cur.id===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select><span class="hint small muted">${auto?`Detectada sola por el código «${esc(cur.utm)}».`:cur?'Asignada a mano.':'Si vino por una campaña, elegila: así suma a sus resultados.'}</span></div>`:`<p class="small muted">${esc(o.brand||'Esta unidad')} todavía no tiene campañas. Creá una en Campañas para ver qué ventas trae.</p>`}`;
    const target=$$('#layer .drawer section.card').find(s=>/Origen/.test(s.querySelector('h3')?s.querySelector('h3').textContent:'')); if(target) target.before(box);
    const sel=$('#evcamp'); if(sel) sel.onchange=async()=>{ try{ await evCommit(o,{campaignId:sel.value||null},{type:'cambio',text:`Campaña: ${sel.value?(camps.find(c=>c.id===sel.value)||{}).name:'sin campaña'}`}); layerDirty=false; toast('Campaña asignada'); }catch(e){ toast(evErr(e)); } };
  };
  const _ve=vEventos;
  vEventos=function(){ let h=_ve(); if(!EV.loaded) return h;
    return h.replace(/<button class="kcard ev-card([^"]*)" draggable="true" data-op="([^"]+)">/g,(m0,cls,id)=>{ const o=EV.ops.find(z=>z.id===id), k=o&&oppCampaign(o); return k?m0+`<span class="ev-camp">${ic('megaphone')} ${esc(k.name)}</span>`:m0; }); };
})();

/* ---------- Funnel: resultados reales desde las cotizaciones del CRM ---------- */
(function(){
  F_SOURCES.splice(1,0,['crm-q-all','CRM · cotizaciones recibidas'],['crm-q-adv','CRM · cotizaciones en negociación o ganadas'],['crm-q-won','CRM · cotizaciones ganadas']);
  const _fr=fReal;
  fReal=function(f,st){ const src=st.source||'manual'; if(!src.startsWith('crm-q-')) return _fr(f,st);
    if(!(S.company&&S.company.cloud&&typeof EV==='object'&&EV.loaded)) return null;
    const range=periodRange(fPeriod(f)), brand=fBrand(f), campIds=new Set((f.campaigns||[]).map(l=>l.id));
    const inR=t=>{ if(!range) return true; const d=t&&t.toDate?t.toDate():null; return d&&d>=range[0]&&d<=range[1]; };
    return EV.ops.filter(o=>o.brand===brand&&inR(o.createdAt)&&(!st.campOnly||(oppCampaign(o)&&campIds.has(oppCampaign(o).id)))
      &&(src==='crm-q-all'||(src==='crm-q-won'?o.stage==='ganada':['en-negociacion','ganada'].includes(o.stage)))).length; };
  const _be=bEstrategia;
  bEstrategia=function(tab){ _be(tab); if(tab==='funnel'&&location.hash.split('/')[4]) ensureEV(/#\/app\/estrategia\/funnel\//); };
  VIEWS.estrategia.bind=bEstrategia;
})();
