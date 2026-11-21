/* =====================================================================
   CRM · CAFELITO EVENTOS (Etapa 0)
   Tablero con las cotizaciones reales que manda el cotizador de cafelito.com.ar.
   Lee tenants/{tid}/opportunities (pipeline cafelito-eventos) en vivo.
   Desde el navegador solo se cambian: etapa, responsable, motivo de pérdida,
   próximo seguimiento e historial de etapas (lo controlan las reglas de Firestore).
   ===================================================================== */
const EV_STAGES=[['nueva-cotizacion','Nueva cotización'],['contactado','Contactado'],['en-negociacion','En negociación'],['ganada','Ganada'],['perdida','Perdida']];
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
  (EV.more||[]).forEach(f=>f()); EV.tasks=[]; EV.contactsLoaded=false; EV.tasksLoaded=false;
  EV.more=[ fbDb.collection(`tenants/${c.tid}/contacts`).onSnapshot(sn=>{ sn.forEach(d=>EV.contacts[d.id]={id:d.id,...d.data()}); EV.contactsLoaded=true; evRefresh(); },()=>{ EV.contactsLoaded=true; evRefresh(); }),
    fbDb.collection(`tenants/${c.tid}/tasks`).onSnapshot(sn=>{ EV.tasks=sn.docs.map(d=>({id:d.id,...d.data()})); EV.tasksLoaded=true; evRefresh(); },()=>{ EV.tasksLoaded=true; evRefresh(); }) ];
  C.unsub.push(()=>{ (EV.more||[]).forEach(f=>f()); EV.more=[]; });
  C.unsub.push(()=>{ if(EV.unsub){ EV.unsub(); EV.unsub=null; EV.tid=null; } });
  fbDb.doc(`tenants/${c.tid}/settings/cafelito-eventos`).get().then(s=>{ EV.settings=s.exists?s.data():{}; evRefresh(); }).catch(()=>{ EV.settings={}; });
}
function evRefresh(){
  if(!/^#\/app\/crm(\/(eventos|contactos|actividades))?\/?(\?.*)?$/.test(location.hash)) return;
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
  const sum=l=>l.reduce((a,o)=>a+(evAmount(o)||0),0);
  const owners=[...new Set(EV.ops.map(o=>o.owner).filter(Boolean))];
  const brand=(EV.settings&&EV.settings.brand)||'';
  const stats=`<div class="stat-grid"><div class="stat"><div class="l">Cotizaciones abiertas</div><div class="v">${open.length}</div><div class="d">${EV.ops.length} recibidas en total</div></div>
   <div class="stat"><div class="l">Presupuesto abierto</div><div class="v">${evMoney(sum(open))}</div><div class="d">sin IVA · propuesto o estimado</div></div>
   <div class="stat"><div class="l">Seguimiento vencido</div><div class="v" style="${late.length?'color:var(--warning)':''}">${late.length}</div><div class="d">${late.length?'contactar hoy':'al día'}</div></div>
   <div class="stat"><div class="l">Ganadas</div><div class="v">${all.filter(o=>o.stage==='ganada').length}</div><div class="d">${evMoney(sum(all.filter(o=>o.stage==='ganada')))}</div></div></div>`;
  const bar=`<div class="toolbar"><select class="select sm" id="evow" aria-label="Responsable"><option value="">Responsable: todos</option>${owners.map(o=>`<option ${o===EV.owner?'selected':''}>${esc(o)}</option>`).join('')}</select>
   <span class="small muted">Marca de las cotizaciones: <b style="color:var(--ink)">${esc(brand||'Sin definir')}</b></span>${evAdmin()?`<button class="btn btn-sm" id="evcfg">${ic('settings')} Configurar</button>`:''}<span class="grow"></span><span class="small muted">Tocá una tarjeta para ver la ficha o arrastrala a otra etapa</span></div>`;
  if(!EV.ops.length) return stats+bar+`<div class="card empty"><div class="eico">${ic('mail')}</div><h3>Todavía no llegaron cotizaciones</h3><p class="muted small">Las oportunidades que llegan desde tu web o que cargás a mano aparecen acá, con su contacto y su importe.</p></div>`;
  return stats+bar+`<div class="kanban">${EV_STAGES.map(([id,name])=>{ const items=all.filter(o=>o.stage===id);
    return `<section class="kcol" data-evstage="${id}" aria-label="${name}"><div class="kcol-h"><b>${name}<span class="badge">${items.length}</span></b><div class="small muted">${evMoney(sum(items))}</div></div><div class="kcol-b">
    ${items.map(o=>{ const t=evTs(o.nextFollowUpAt), lt=!['ganada','perdida'].includes(o.stage)&&t&&t.getTime()<now, ev=o.event||{};
      const tags=[lt?`<span class="tagc ev-tag" style="color:var(--warning)">Seguimiento vencido</span>`:'',...(o.warnings||[]).map(w=>`<span class="tagc ev-tag">${esc(EV_WARN[w]||w)}</span>`),o.lostReason?`<span class="tagc ev-tag">${esc(o.lostReason)}</span>`:''].join('');
      return `<button class="kcard ev-card ${lt?'late':''}" draggable="true" data-op="${o.id}"><b class="ev-name">${esc(evName(o))}</b>
       <span class="ev-amt">${evMoney(evAmount(o))}${evAmountLabel(o)?` <span class="ev-amtl">${evAmountLabel(o)}</span>`:''}</span>${o.stage==='ganada'&&o.won?`<span class="ev-meta">${o.won.balancePaid?'Cobrado completo':o.won.depositPaid?'Seña cobrada · falta el saldo':'Falta cobrar la seña'}</span>`:''}
       <span class="ev-meta">${esc(ev.type||'Evento')} · ${ev.guests||'?'} invitados</span>
       <span class="ev-meta">${evDate(ev.date)} · ${o.owner?esc(o.owner):'Sin asignar'}</span>
       ${t&&!['ganada','perdida'].includes(o.stage)?`<span class="ev-meta ev-next">${ic('clock')} ${t.toLocaleDateString('es-AR',{day:'numeric',month:'short'})}${o.nextAction?' · '+esc(o.nextAction):''}</span>`:''}
       ${tags?`<span class="ev-tags">${tags}</span>`:''}</button>`; }).join('')||'<p class="small muted" style="text-align:center;padding:16px 0">Sin cotizaciones</p>'}</div></section>`; }).join('')}</div>`;
}
function bEventos(){
  // Enlace del mail de recordatorio: #/app/crm/eventos?t=<empresa>&op=<cotización> → abre esa ficha
  const q=new URLSearchParams(location.hash.split('?')[1]||'');
  if(q.get('t')&&S.company&&S.company.tid!==q.get('t')){ const c=S.companies.find(x=>x.tid===q.get('t')); if(c){ switchCompany(c); setTimeout(render,0); return; } }
  if(q.get('op')&&EV.loaded){ const id=q.get('op'); history.replaceState(null,'',location.pathname+location.search+'#/app/crm/eventos');
    setTimeout(()=>{ if(EV.ops.find(o=>o.id===id)) evFicha(id); else toast('Esa cotización ya no está en el tablero'); },0); }
  const s=$('#evow'); if(s) s.onchange=()=>{ EV.owner=s.value; render(); };
  const cf=$('#evcfg'); if(cf) cf.onclick=evConfig;
  $$('[data-op]').forEach(b=>{ b.onclick=()=>evFicha(b.dataset.op);
    b.ondragstart=e=>{ e.dataTransfer.setData('text/plain',b.dataset.op); e.dataTransfer.effectAllowed='move'; b.classList.add('dragging'); };
    b.ondragend=()=>{ b.classList.remove('dragging'); $$('.kcol.drop').forEach(c=>c.classList.remove('drop')); }; });
  $$('[data-evstage]').forEach(col=>{ col.ondragover=e=>{ e.preventDefault(); col.classList.add('drop'); }; col.ondragleave=()=>col.classList.remove('drop');
    col.ondrop=e=>{ e.preventDefault(); col.classList.remove('drop'); const o=EV.ops.find(z=>z.id===e.dataTransfer.getData('text/plain')); if(o&&o.stage!==col.dataset.evstage) evStageForm(o,col.dataset.evstage); }; });
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
   ${evSeguimientoHtml(o,owners,fuIso)}
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
    <p class="small muted" style="margin-top:8px">${es.status==='match'?'Coincide con lo que vio la persona en la web.':es.status==='mismatch'?`La web mostró ${evMoney(es.webSubtotalMinor)}: revisar antes de confirmar el importe.`:'La web no mandó su cálculo.'} ${es.transfer==='to_quote'?'El traslado se cotiza aparte.':''}</p></section>
   <section class="card"><h3 style="margin-bottom:12px">Origen</h3><dl class="kv">
    ${row('Canal',esc(src.channel||'Sin datos'))}${row('Fuente',esc(at.utmSource||'Directo / sin datos'))}${row('Medio',esc(at.utmMedium||'—'))}${row('Campaña',esc(at.utmCampaign||'—'))}${row('Anuncio',esc(at.utmContent||'—'))}
    ${row('Vino de',esc(at.referrer||'—'))}${row('Clic de Meta',at.fbclid?'Sí':'No')}</dl></section>
  </div>`);
  evBindFicha(o,fuIso);
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

/* ---------- Contactos y actividades reales (empresas en la nube) ---------- */
const CRM_NUBE_TABS=[['eventos','Cafelito Eventos'],['contactos','Contactos'],['actividades','Actividades']];
let evQ='', evType='';
// Cliente: marcado así, o con al menos una venta (evento ganado o compra en la tienda)
const evWon=c=>c.type==='Cliente'||(c.orderCount||0)>0||EV.ops.some(o=>o.contactId===c.id&&o.stage==='ganada');
const evLast=c=>{ const q=c.lastQuoteAt&&c.lastQuoteAt.toMillis?c.lastQuoteAt:null, o=c.lastOrderAt&&c.lastOrderAt.toMillis?c.lastOrderAt:null; return o&&(!q||o.toMillis()>q.toMillis())?o:q; };
const evUnits=c=>{ const names=S.brands.map(b=>b.name), t=(c.tags||[]).filter(x=>names.includes(x)); return t.length?t:(c.brand?[c.brand]:[]); };
function vContactosNube(){
  if(!EV.contactsLoaded) return `<div class="card empty"><p class="muted">Cargando contactos…</p></div>`;
  const all=Object.values(EV.contacts), q=evQ.toLowerCase();
  const list=all.filter(c=>(!evType||(evType==='Cliente'?evWon(c):!evWon(c)))&&(!q||((c.name||'')+(c.email||'')+(c.phoneDisplay||c.phoneRaw||'')).toLowerCase().includes(q))).sort((a,b)=>((evLast(b)&&evLast(b).toMillis())||0)-((evLast(a)&&evLast(a).toMillis())||0));
  const consent=all.filter(c=>c.marketingConsent&&c.marketingConsent.granted).length;
  if(!all.length) return `<div class="card empty"><div class="eico">${ic('users')}</div><h3>Todavía no hay contactos</h3><p class="muted small">Cada persona que te consulta o te compra queda acá como contacto, sin duplicarse aunque vuelva varias veces.</p></div>`;
  return `<div class="stat-grid"><div class="stat"><div class="l">Contactos</div><div class="v">${all.length}</div></div><div class="stat"><div class="l">Clientes</div><div class="v">${all.filter(evWon).length}</div><div class="d">con al menos una venta</div></div><div class="stat"><div class="l">Leads</div><div class="v">${all.filter(c=>!evWon(c)).length}</div><div class="d">todavía sin venta</div></div><div class="stat"><div class="l">Aceptan promociones</div><div class="v">${consent}</div><div class="d">de ${all.length}</div></div></div>
  <div class="toolbar"><label class="search-in">${ic('search')}<span class="sr">Buscar</span><input class="input" id="evq" placeholder="Buscar por nombre, email o teléfono" value="${esc(evQ)}"></label>
   <div class="seg">${[['','Todos'],['Lead','Leads'],['Cliente','Clientes']].map(([k,l])=>`<button data-evty="${k}" aria-pressed="${evType===k}">${l}</button>`).join('')}</div></div>
  <div class="table-wrap"><table class="t"><thead><tr><th>Contacto</th><th class="hide-m">Teléfono</th><th>Tipo</th><th class="hide-m">Origen</th><th style="text-align:right">Pedidos</th><th class="hide-m">Último</th></tr></thead><tbody>
  ${list.map(c=>`<tr data-evc="${c.id}" style="cursor:pointer"><td><div class="person"><span class="avatar sm">${initials(c.name)}</span><div><b>${esc(c.name||'Sin nombre')}</b><div class="small muted">${esc(c.email||'Sin email')}</div></div></div></td><td class="hide-m small">${esc(c.phoneDisplay||c.phoneRaw||'Sin datos')}</td><td><span class="badge ${evWon(c)?'badge-ok':''}">${evWon(c)?'Cliente':'Lead'}</span></td><td class="hide-m small">${esc((c.firstSource&&c.firstSource.channel)||'Sin datos')}</td><td style="text-align:right">${(c.quoteCount||0)+(c.orderCount||0)}</td><td class="hide-m small muted">${evLast(c)?evWhen(evLast(c)):'—'}</td></tr>`).join('')||`<tr><td colspan="6"><p class="small muted" style="padding:12px">No hay contactos con esos filtros.</p></td></tr>`}
  </tbody></table></div>`;
}
function evContacto(id){
  const c=EV.contacts[id]; if(!c) return; const ops=EV.ops.filter(o=>o.contactId===id).sort((a,b)=>String(b.event?.date).localeCompare(String(a.event?.date)));
  const digits=(c.phoneE164||'').replace(/\D/g,''), fs=c.firstSource||{}, at=fs.attribution||{};
  drawerWide(`<div class="dr-head"><span class="avatar">${initials(c.name)}</span><div style="flex:1;min-width:0"><b style="font-size:16px">${esc(c.name||'Sin nombre')}</b><div class="small muted">${evWon(c)?'Cliente':'Lead'}${evUnits(c).length?' · '+esc(evUnits(c).join(', ')):''}</div></div><button class="icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div>
  <div style="flex:1;overflow:auto;padding:20px;display:grid;gap:16px;align-content:start">
   <section class="card"><h3 style="margin-bottom:12px">Datos</h3><dl class="kv"><dt>Teléfono</dt><dd>${esc(c.phoneDisplay||c.phoneRaw||'Sin datos')}</dd><dt>Email</dt><dd>${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:'<span class="muted">Sin datos</span>'}</dd><dt>Acepta promociones</dt><dd>${c.marketingConsent?(c.marketingConsent.granted?'Sí':'No'):'<span class="muted">Sin datos</span>'}</dd><dt>Primer contacto</dt><dd>${evWhen(c.createdAt)}</dd><dt>Llegó por</dt><dd>${esc(fs.channel||'Sin datos')}${at.utmSource?' · '+esc(at.utmSource):''}${at.utmCampaign?' · '+esc(at.utmCampaign):''}</dd></dl>
   ${digits?`<a class="btn btn-primary" style="margin-top:12px" href="https://wa.me/${digits}" target="_blank" rel="noopener">${ic('message')} Escribir por WhatsApp</a>`:''}</section>
   <section class="card"><h3 style="margin-bottom:12px">Pedidos de presupuesto (${ops.length})</h3>${ops.map(o=>`<button class="kcard ev-card" data-evop="${o.id}" style="margin-bottom:8px;cursor:pointer"><b class="ev-name">${esc(o.event?.type||'Evento')} · ${evDate(o.event?.date)}</b><span class="ev-amt">${evMoney(evAmount(o))}${evAmountLabel(o)?` <span class="ev-amtl">${evAmountLabel(o)}</span>`:''}</span>${o.stage==='ganada'&&o.won?`<span class="ev-meta">${o.won.balancePaid?'Cobrado completo':o.won.depositPaid?'Seña cobrada · falta el saldo':'Falta cobrar la seña'}</span>`:''}<span class="ev-meta">${esc((EV_STAGES.find(s=>s[0]===o.stage)||[,o.stage])[1])} · ${o.event?.guests||'?'} invitados</span></button>`).join('')||'<p class="small muted">Sin pedidos.</p>'}</section></div>`);
  $$('[data-evop]').forEach(b=>b.onclick=()=>{ closeLayer(); evFicha(b.dataset.evop); });
}
function vActividadesNube(){
  if(!EV.tasksLoaded) return `<div class="card empty"><p class="muted">Cargando actividades…</p></div>`;
  const now=Date.now(), due=t=>t.dueAt&&t.dueAt.toMillis?t.dueAt.toMillis():Infinity;
  const pend=EV.tasks.filter(t=>t.status!=='hecha').sort((a,b)=>due(a)-due(b)), done=EV.tasks.filter(t=>t.status==='hecha').sort((a,b)=>((b.doneAt&&b.doneAt.toMillis())||0)-((a.doneAt&&a.doneAt.toMillis())||0)).slice(0,20);
  if(!EV.tasks.length) return `<div class="card empty"><div class="eico">${ic('check')}</div><h3>No hay actividades</h3><p class="muted small">Cuando llega una cotización se crea sola la tarea «Primer contacto» con su vencimiento.</p></div>`;
  const row=t=>{ const late=t.status!=='hecha'&&due(t)<now, op=EV.ops.find(o=>o.id===t.opportunityId);
    return `<div class="settings-row" style="gap:12px;align-items:center"><div style="flex:1;min-width:0"><b>${esc(t.title||'Tarea')}</b><div class="small ${late?'':'muted'}" style="${late?'color:var(--warning)':''}">${t.status==='hecha'?`Hecha ${evWhen(t.doneAt)}${t.doneByName?' · '+esc(t.doneByName):''}`:`${late?'Vencida · ':'Vence '}${evWhen(t.dueAt)}`} · ${esc(t.assignee||'Sin asignar')}</div></div>
     ${op?`<button class="btn btn-sm" data-evop="${op.id}">Ver cotización</button>`:''}${t.status!=='hecha'?`<button class="btn btn-sm btn-primary" data-evdone="${t.id}">${ic('check')} Hecha</button>`:''}</div>`; };
  return `<div class="stat-grid"><div class="stat"><div class="l">Pendientes</div><div class="v">${pend.length}</div></div><div class="stat"><div class="l">Vencidas</div><div class="v" style="${pend.some(t=>due(t)<now)?'color:var(--warning)':''}">${pend.filter(t=>due(t)<now).length}</div></div><div class="stat"><div class="l">Hechas</div><div class="v">${EV.tasks.length-pend.length}</div></div></div>
  <section class="card" style="margin-bottom:16px"><h3 style="margin-bottom:8px">Pendientes</h3>${pend.map(row).join('')||'<p class="small muted">Nada pendiente.</p>'}</section>
  ${done.length?`<section class="card"><h3 style="margin-bottom:8px">Hechas</h3>${done.map(row).join('')}</section>`:''}`;
}
function bCrmNube(tab){
  const q=$('#evq'); if(q) q.oninput=()=>{ evQ=q.value; const pos=q.selectionStart; render(); const n=$('#evq'); n.focus(); n.setSelectionRange(pos,pos); };
  $$('[data-evty]').forEach(b=>b.onclick=()=>{ evType=b.dataset.evty; render(); });
  $$('[data-evc]').forEach(r=>r.onclick=()=>evContacto(r.dataset.evc));
  $$('[data-evop]').forEach(b=>b.onclick=()=>evFicha(b.dataset.evop));
  $$('[data-evdone]').forEach(b=>b.onclick=async()=>{ b.classList.add('is-loading');
    try{ await fbDb.doc(`tenants/${EV.tid}/tasks/${b.dataset.evdone}`).update({status:'hecha',doneAt:TS(),doneBy:C.user.uid,doneByName:S.user.name||C.user.email}); toast('Actividad hecha'); }
    catch(e){ b.classList.remove('is-loading'); toast('No se pudo marcar como hecha'); } });
}

/* ---------- Conexión con el CRM ---------- */
(function(){
  if(!CLOUD.on) return;
  const _v=vCrm, _b=bCrm;
  const cloud=()=>!!(S.company&&S.company.cloud);
  const tabOf=tab=>CRM_NUBE_TABS.some(t=>t[0]===tab)?tab:'eventos';
  vCrm=function(tab){ if(!cloud()) return _v(tab); evListen(); const t=tabOf(tab);
    const sub={eventos:'Oportunidades de venta y su seguimiento, etapa por etapa.',contactos:'Tus clientes y posibles clientes, sin duplicados.',actividades:'Las tareas de seguimiento del equipo.'}[t];
    return pageHead('CRM',sub,'')+subTabs('crm',CRM_NUBE_TABS,t)+(t==='eventos'?vEventos():t==='contactos'?vContactosNube():vActividadesNube()); };
  bCrm=function(tab){ if(!cloud()) return _b(tab); const t=tabOf(tab); if(t==='eventos') return bEventos(); bCrmNube(t); };
  VIEWS.crm.view=vCrm; VIEWS.crm.bind=bCrm;
})();
