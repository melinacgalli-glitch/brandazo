/* =====================================================================
   CRM · CAFELITO EVENTOS (Etapa 0)
   Tablero con las cotizaciones reales que manda el cotizador de cafelito.com.ar.
   Lee tenants/{tid}/opportunities (pipeline cafelito-eventos) en vivo.
   Desde el navegador solo se cambian: etapa, responsable, motivo de pérdida,
   próximo seguimiento e historial de etapas (lo controlan las reglas de Firestore).
   ===================================================================== */
const EV_STAGES=[['nueva-cotizacion','Nueva cotización'],['contactado','Contactado'],['propuesta-enviada','Propuesta enviada'],['en-negociacion','En negociación'],['ganada','Ganada'],['perdida','Perdida']];
const EV_LOST=['Precio','Fecha no disponible','No respondió','Eligió otro proveedor','Cambió de planes','Pedido no válido','Otro'];
const EV_WARN={SHORT_NOTICE:'Evento en menos de 7 días',PHONE_NOT_NORMALIZED:'Revisar teléfono',ADDON_NOT_IN_PLAN:'Adicional fuera del plan',ESTIMATE_MISMATCH:'El presupuesto de la web no coincide',POSSIBLE_SPAM:'Posible spam'};
const EV_PLAN={full:'Plan Full',classic:'Plan Classic',basic:'Plan Basic'};
const EV={ tid:null, unsub:null, ops:[], loaded:false, err:'', settings:null, owner:'', contacts:{} };
const evMoney=m=>m==null?'Sin datos':'$ '+(m/100).toLocaleString('es-AR',{maximumFractionDigits:2});
const evTs=t=>t&&t.toDate?t.toDate():t?new Date(t):null;
const evDate=s=>{ if(!s) return 'Sin fecha'; const [y,m,d]=String(s).slice(0,10).split('-').map(Number); return `${d} ${MES[m-1].slice(0,3)} ${y}`; };
const evWhen=t=>{ const d=evTs(t); return d?d.toLocaleString('es-AR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—'; };
const evName=o=>(EV.contacts[o.contactId]||{}).name||(o.title||'').split(' · ')[1]||'Sin nombre';
const evAdmin=()=>S.company&&['Dueño','Admin'].includes(S.company.myRole);

function evListen(){
  const c=S.company; if(!c||!c.cloud||!fbDb) return;
  if(EV.tid===c.tid&&EV.unsub) return;
  if(EV.unsub) EV.unsub();
  Object.assign(EV,{tid:c.tid,ops:[],loaded:false,err:'',settings:null,contacts:{}});
  EV.unsub=fbDb.collection(`tenants/${c.tid}/opportunities`).where('pipeline','==','cafelito-eventos').onSnapshot(snap=>{
    EV.ops=snap.docs.map(d=>({id:d.id,...d.data()})); EV.loaded=true; EV.err='';
    const miss=[...new Set(EV.ops.map(o=>o.contactId).filter(id=>id&&!EV.contacts[id]))];
    Promise.all(miss.map(id=>fbDb.doc(`tenants/${c.tid}/contacts/${id}`).get().then(s=>{ if(s.exists) EV.contacts[id]={id,...s.data()}; }).catch(()=>{}))).then(()=>evRefresh());
    evRefresh();
  },e=>{ EV.loaded=true; EV.err=e.code==='permission-denied'?'No tenés permiso para ver las cotizaciones de esta empresa.':'No se pudo conectar con la nube.'; evRefresh(); });
  C.unsub.push(()=>{ if(EV.unsub){ EV.unsub(); EV.unsub=null; EV.tid=null; } });
  fbDb.doc(`tenants/${c.tid}/settings/cafelito-eventos`).get().then(s=>{ EV.settings=s.exists?s.data():{}; evRefresh(); }).catch(()=>{ EV.settings={}; });
}
function evRefresh(){
  if(!/^#\/app\/crm(\/eventos)?\/?$/.test(location.hash)) return;
  if($('#layer').children.length){ EV.dirty=true; return; } // no cerrar la ficha abierta
  render();
}

function vEventos(){
  const c=S.company;
  if(!c.cloud) return emptyBlock('cloud','Cafelito Eventos está en la nube','Este tablero muestra las cotizaciones reales del sitio de Cafelito. Elegí una empresa guardada en la nube.','');
  evListen();
  if(!EV.loaded) return `<div class="card empty"><p class="muted">Cargando cotizaciones…</p></div>`;
  if(EV.err) return `<div class="alert alert-err">${ic('alert')}<div>${esc(EV.err)}</div></div>`;
  const all=EV.ops.filter(o=>!EV.owner||o.owner===EV.owner).sort((a,b)=>(a.event?.date||'').localeCompare(b.event?.date||''));
  const open=all.filter(o=>!['ganada','perdida'].includes(o.stage)), now=Date.now();
  const late=open.filter(o=>{const t=evTs(o.nextFollowUpAt);return t&&t.getTime()<now;});
  const sum=l=>l.reduce((a,o)=>a+(o.estimate?.brandazoSubtotalMinor||0),0);
  const owners=[...new Set(EV.ops.map(o=>o.owner).filter(Boolean))];
  const brand=(EV.settings&&EV.settings.brand)||'';
  const stats=`<div class="stat-grid"><div class="stat"><div class="l">Cotizaciones abiertas</div><div class="v">${open.length}</div><div class="d">${EV.ops.length} recibidas en total</div></div>
   <div class="stat"><div class="l">Presupuesto abierto</div><div class="v">${evMoney(sum(open))}</div><div class="d">sin IVA, según tarifas</div></div>
   <div class="stat"><div class="l">Seguimiento vencido</div><div class="v" style="${late.length?'color:var(--warning)':''}">${late.length}</div><div class="d">${late.length?'contactar hoy':'al día'}</div></div>
   <div class="stat"><div class="l">Ganadas</div><div class="v">${all.filter(o=>o.stage==='ganada').length}</div><div class="d">${evMoney(sum(all.filter(o=>o.stage==='ganada')))}</div></div></div>`;
  const bar=`<div class="toolbar"><select class="select sm" id="evow" aria-label="Responsable"><option value="">Responsable: todos</option>${owners.map(o=>`<option ${o===EV.owner?'selected':''}>${esc(o)}</option>`).join('')}</select>
   <span class="small muted">Marca de las cotizaciones: <b style="color:var(--ink)">${esc(brand||'Sin definir')}</b></span>${evAdmin()?`<button class="btn btn-sm" id="evcfg">${ic('settings')} Configurar</button>`:''}<span class="grow"></span><span class="small muted">Tocá una tarjeta para ver la ficha</span></div>`;
  if(!EV.ops.length) return stats+bar+`<div class="card empty"><div class="eico">${ic('mail')}</div><h3>Todavía no llegaron cotizaciones</h3><p class="muted small">Cuando alguien pida presupuesto en el cotizador de Cafelito Ambulante, aparece acá al instante, con su contacto y el presupuesto calculado.</p></div>`;
  return stats+bar+`<div class="kanban">${EV_STAGES.map(([id,name])=>{ const items=all.filter(o=>o.stage===id);
    return `<section class="kcol" aria-label="${name}"><div class="kcol-h"><b>${name}<span class="badge">${items.length}</span></b><div class="small muted">${evMoney(sum(items))}</div></div><div class="kcol-b">
    ${items.map(o=>{ const t=evTs(o.nextFollowUpAt), lt=!['ganada','perdida'].includes(o.stage)&&t&&t.getTime()<now, ev=o.event||{};
      return `<button class="kcard ${lt?'late':''}" data-op="${o.id}"><b>${esc(evName(o))}</b>
       <div class="row"><span>${esc(ev.type||'Evento')} · ${ev.guests||'?'} inv.</span><span class="amt">${evMoney(o.estimate?.brandazoSubtotalMinor)}</span></div>
       <div class="row"><span>${evDate(ev.date)}</span>${o.owner?`<span class="avatar sm" title="${esc(o.owner)}" style="width:22px;height:22px;font-size:10px">${initials(o.owner)}</span>`:'<span class="small muted">Sin asignar</span>'}</div>
       ${lt?`<span class="tagc" style="color:var(--warning)">Seguimiento vencido</span>`:''}${(o.warnings||[]).map(w=>`<span class="tagc">${esc(EV_WARN[w]||w)}</span>`).join('')}${o.lostReason?`<span class="tagc">${esc(o.lostReason)}</span>`:''}</button>`; }).join('')||'<p class="small muted" style="text-align:center;padding:16px 0">Sin cotizaciones</p>'}</div></section>`; }).join('')}</div>`;
}
function bEventos(){
  const s=$('#evow'); if(s) s.onchange=()=>{ EV.owner=s.value; render(); };
  const cf=$('#evcfg'); if(cf) cf.onclick=evConfig;
  $$('[data-op]').forEach(b=>b.onclick=()=>evFicha(b.dataset.op));
}

/* ---------- Ficha de la cotización ---------- */
function evFicha(id){
  const o=EV.ops.find(z=>z.id===id); if(!o) return;
  const ct=EV.contacts[o.contactId]||{}, ev=o.event||{}, sel=o.selection||{}, es=o.estimate||{}, src=o.source||{}, at=o.attribution||{};
  const digits=(ct.phoneE164||'').replace(/\D/g,'');
  const wa=digits?`https://wa.me/${digits}?text=${encodeURIComponent(`Hola ${(ct.name||'').split(' ')[0]}, te escribo de ${o.brand||'Cafelito'} por tu pedido de presupuesto para el ${evDate(ev.date)}.`)}`:'';
  const members=S.members.filter(m=>m.status==='Activo').map(m=>m.name||m.email);
  const owners=[...new Set([...members,o.owner].filter(Boolean))];
  const fu=evTs(o.nextFollowUpAt), fuIso=fu?new Date(fu.getTime()-fu.getTimezoneOffset()*6e4).toISOString().slice(0,10):'';
  const row=(k,v)=>`<dt>${k}</dt><dd>${v}</dd>`;
  drawerWide(`<div class="dr-head"><span class="avatar">${initials(ct.name||evName(o))}</span><div style="flex:1;min-width:0"><b style="font-size:16px">${esc(ct.name||evName(o))}</b><div class="small muted">${esc(o.brand||'')} · recibida ${evWhen(o.createdAt)}</div></div><button class="icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div>
  <div style="flex:1;overflow:auto;padding:20px;display:grid;gap:16px;align-content:start">
   ${(o.warnings||[]).length?`<div class="alert alert-warn">${ic('alert')}<div>${o.warnings.map(w=>esc(EV_WARN[w]||w)).join(' · ')}</div></div>`:''}
   <section class="card"><h3 style="margin-bottom:12px">Contacto</h3><dl class="kv">
    ${row('Teléfono',ct.phoneDisplay||ct.phoneRaw?esc(ct.phoneDisplay||ct.phoneRaw):'<span class="muted">Sin datos</span>')}
    ${row('Email',ct.email?`<a href="mailto:${esc(ct.email)}">${esc(ct.email)}</a>`:'<span class="muted">Sin datos</span>')}
    ${row('Cotizaciones',ct.quoteCount||1)}
    ${row('Acepta promociones',ct.marketingConsent?(ct.marketingConsent.granted?'Sí':'No'):'<span class="muted">Sin datos</span>')}</dl>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">${wa?`<a class="btn btn-primary" href="${wa}" target="_blank" rel="noopener">${ic('message')} Escribir por WhatsApp</a>`:`<span class="small muted">El teléfono no quedó en formato internacional: revisalo a mano.</span>`}</div></section>
   <section class="card"><h3 style="margin-bottom:12px">Evento</h3><dl class="kv">
    ${row('Tipo',esc(ev.type||'Sin datos'))}${row('Fecha',`${evDate(ev.date)}${ev.startTime?' · '+esc(ev.startTime)+' h':''}`)}${row('Duración',ev.durationHours?ev.durationHours+' h':'Sin datos')}
    ${row('Invitados',ev.guests||'Sin datos')}${row('Lugar',esc(ev.place||'Sin datos'))}${row('Zona',ev.inCapital?'Córdoba Capital (traslado incluido)':'Fuera de Capital (traslado a cotizar)')}
    ${row('Plan',esc(EV_PLAN[sel.plan]||sel.plan||'Sin datos'))}${row('Adicionales',esc((sel.addonIds||[]).join(', ')||'Ninguno'))}${row('Personalización',esc((sel.customizationIds||[]).join(', ')||'Ninguna'))}
    ${row('Torta / Cold brew',`${sel.wantsCake?'Torta: sí':'Torta: no'} · ${sel.wantsColdBrew?'Cold brew: sí':'Cold brew: no'}`)}${row('Alimentación',esc((o.dietary||[]).join(', ')||'Sin indicaciones'))}</dl>
    ${o.notes?`<p class="small" style="margin-top:12px;white-space:pre-wrap"><b>Notas:</b> ${esc(o.notes)}</p>`:''}</section>
   <section class="card"><div class="card-head"><h3>Presupuesto estimado</h3><span class="small muted">sin IVA · tarifas ${esc(es.tariffVersion||'')}</span></div>
    <div class="table-wrap"><table class="t"><thead><tr><th>Concepto</th><th style="text-align:right">Cant.</th><th style="text-align:right">Total</th></tr></thead><tbody>
    ${(es.lines||[]).map(l=>`<tr><td>${esc(l.label)}</td><td style="text-align:right">${l.quantity}</td><td style="text-align:right">${evMoney(l.totalMinor)}</td></tr>`).join('')}
    <tr><td><b>Subtotal</b></td><td></td><td style="text-align:right"><b>${evMoney(es.brandazoSubtotalMinor)}</b></td></tr></tbody></table></div>
    <p class="small muted" style="margin-top:8px">${es.status==='match'?'Coincide con lo que vio la persona en la web.':es.status==='mismatch'?`La web mostró ${evMoney(es.webSubtotalMinor)}: revisar antes de enviar la propuesta.`:'La web no mandó su cálculo.'} ${es.transfer==='to_quote'?'El traslado se cotiza aparte.':''}</p></section>
   <section class="card"><h3 style="margin-bottom:12px">Seguimiento</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
     <div class="field"><label for="evst">Etapa</label><select class="select" id="evst">${EV_STAGES.map(([k,n])=>`<option value="${k}" ${k===o.stage?'selected':''}>${n}</option>`).join('')}</select></div>
     <div class="field"><label for="evown">Responsable</label><select class="select" id="evown"><option value="">Sin asignar</option>${owners.map(n=>`<option ${n===o.owner?'selected':''}>${esc(n)}</option>`).join('')}</select></div>
     <div class="field"><label for="evfu">Próximo seguimiento</label><input class="input" type="date" id="evfu" value="${fuIso}"></div>
     <div class="field" id="evlostf" ${o.stage==='perdida'?'':'hidden'}><label for="evlost">Motivo de pérdida</label><select class="select" id="evlost"><option value="">Elegí un motivo</option>${EV_LOST.map(r=>`<option ${r===o.lostReason?'selected':''}>${r}</option>`).join('')}</select><span class="err" role="alert"></span></div></div>
    <div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn btn-primary" id="evsave">Guardar cambios</button></div>
    <h4 class="small" style="margin:16px 0 8px">Historial</h4><ul class="small" style="list-style:none;padding:0;margin:0;display:grid;gap:6px">
     ${[...(o.stageHistory||[])].reverse().map(h=>`<li>${evWhen(h.at)} · ${esc(h.byName||'')}: ${esc((EV_STAGES.find(s=>s[0]===h.from)||[,h.from])[1])} → <b>${esc((EV_STAGES.find(s=>s[0]===h.to)||[,h.to])[1])}</b></li>`).join('')}
     <li class="muted">${evWhen(o.createdAt)} · Llegó desde ${esc(src.channel||'la web')}</li></ul></section>
   <section class="card"><h3 style="margin-bottom:12px">Origen</h3><dl class="kv">
    ${row('Canal',esc(src.channel||'Sin datos'))}${row('Fuente',esc(at.utmSource||'Directo / sin datos'))}${row('Medio',esc(at.utmMedium||'—'))}${row('Campaña',esc(at.utmCampaign||'—'))}${row('Anuncio',esc(at.utmContent||'—'))}
    ${row('Vino de',esc(at.referrer||'—'))}${row('Clic de Meta',at.fbclid?'Sí':'No')}</dl></section>
  </div>`);
  $('#evst').onchange=e=>{ $('#evlostf').hidden=e.target.value!=='perdida'; };
  $('#evsave').onclick=async e=>{
    const stage=$('#evst').value, owner=$('#evown').value, fuv=$('#evfu').value, lost=stage==='perdida'?$('#evlost').value:null;
    if(stage==='perdida'&&!fieldErr($('#evlost'),!lost?'Elegí por qué se perdió':'')) return;
    const upd={}; if(stage!==o.stage) upd.stage=stage; if(owner!==(o.owner||'')) upd.owner=owner; if((lost||null)!==(o.lostReason||null)) upd.lostReason=lost||null;
    if(fuv!==fuIso) upd.nextFollowUpAt=fuv?firebase.firestore.Timestamp.fromDate(new Date(fuv+'T09:00:00')):null;
    if(!Object.keys(upd).length){ closeLayer(); return; }
    upd.updatedAt=TS();
    if(upd.stage) upd.stageHistory=firebase.firestore.FieldValue.arrayUnion({from:o.stage,to:stage,at:firebase.firestore.Timestamp.now(),by:C.user.uid,byName:S.user.name||C.user.email});
    e.currentTarget.classList.add('is-loading');
    try{ const ref=fbDb.doc(`tenants/${EV.tid}/opportunities/${o.id}`), b=fbDb.batch();
      b.update(ref,upd);
      b.set(fbDb.collection(`tenants/${EV.tid}/audit`).doc(),{at:TS(),by:C.user.uid,byName:S.user.name||C.user.email,action:'oportunidad-actualizada',opportunityId:o.id,changes:Object.keys(upd).filter(k=>!['updatedAt','stageHistory'].includes(k))});
      await b.commit(); closeLayer(); toast('Cambios guardados'); if(EV.dirty){ EV.dirty=false; render(); } }
    catch(err){ e.currentTarget.classList.remove('is-loading'); toast(err.code==='permission-denied'?'No tenés permiso para cambiar esta cotización.':'No se pudo guardar. Probá de nuevo.'); }
  };
}

/* ---------- Configuración del tablero (Dueño / Admin) ---------- */
function evConfig(){
  const st=EV.settings||{}, names=S.members.filter(m=>m.status==='Activo').map(m=>m.name||m.email), brands=S.brands.map(b=>b.name);
  const bopts=[...new Set([st.brand,...brands,'Cafelito Ambulante'].filter(Boolean))];
  modal('Configurar Cafelito Eventos',`<div class="field"><label for="evb">Marca de las cotizaciones</label><select class="select" id="evb">${bopts.map(b=>`<option ${b===st.brand?'selected':''}>${esc(b)}</option>`).join('')}</select><span class="hint small muted">Con esta marca se guardan los contactos y oportunidades nuevos.</span></div>
   <div class="field"><label for="evdo">Responsable por defecto</label><select class="select" id="evdo"><option value="">Sin asignar</option>${names.map(n=>`<option ${n===st.defaultOwner?'selected':''}>${esc(n)}</option>`).join('')}</select><span class="hint small muted">Recibe las cotizaciones nuevas y la tarea «Primer contacto».</span></div>
   <div class="field"><label for="evfh">Primer seguimiento (horas después de recibirla)</label><input class="input" id="evfh" type="number" min="1" max="168" value="${Number(st.followUpHours)||24}"><span class="err" role="alert"></span></div>`,
   `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="evcok">Guardar</button>`);
  $('#evcok').onclick=async e=>{ const h=+$('#evfh').value; if(!fieldErr($('#evfh'),!(h>=1&&h<=168)?'Entre 1 y 168 horas':'')) return;
    const data={brand:$('#evb').value,defaultOwner:$('#evdo').value,followUpHours:h,updatedAt:TS(),updatedBy:C.user.uid};
    e.currentTarget.classList.add('is-loading');
    try{ await fbDb.doc(`tenants/${EV.tid}/settings/cafelito-eventos`).set(data,{merge:true}); EV.settings={...st,...data}; closeLayer(); render(); toast('Configuración guardada'); }
    catch(err){ e.currentTarget.classList.remove('is-loading'); toast(err.code==='permission-denied'?'Solo el Dueño o un Admin pueden cambiar esto.':'No se pudo guardar.'); } };
}

/* ---------- Conexión con el CRM ---------- */
(function(){
  if(!CLOUD.on) return;
  const _v=vCrm, _b=bCrm;
  const sync=()=>{ const i=CRM_TABS.findIndex(t=>t[0]==='eventos'), want=!!(S.company&&S.company.cloud);
    if(want&&i<0) CRM_TABS.unshift(['eventos','Cafelito Eventos']); if(!want&&i>=0) CRM_TABS.splice(i,1); };
  vCrm=function(tab){ sync(); if(S.company&&S.company.cloud&&(!tab||tab==='eventos')){
      return pageHead('CRM','Cotizaciones de eventos que llegan desde cafelito.com.ar, en vivo.','')+subTabs('crm',CRM_TABS,'eventos')+vEventos(); }
    return _v(tab); };
  bCrm=function(tab){ if(S.company&&S.company.cloud&&(!tab||tab==='eventos')) return bEventos(); return _b(tab); };
  VIEWS.crm.view=vCrm; VIEWS.crm.bind=bCrm;
})();
