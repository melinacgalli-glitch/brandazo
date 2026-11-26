/* =====================================================================
   CRM UNIFICADO · ETAPA 1: «Ventas» (todas las operaciones en una sola planilla)
   - Una fila por operación: cotizaciones (oportunidades), pedidos de la tienda, suscripciones e inscripciones.
   - Estado común para cualquier empresa: Nueva · En curso · Ganada · Perdida/Cancelada (+ el detalle propio).
   - «Por cliente»: una fila por persona, con sus unidades (salen de sus compras), lo que aportó y si acepta promociones.
   - Solo lee lo que ya existe: no crea ni copia datos. Importes en centavos.
   ===================================================================== */
const VN={ q:'', unit:'', st:'', kind:'', per:'todo', mode:'op', sort:'date', dir:-1 };
const VN_ST={n:['Nueva','n'],c:['En curso','c'],g:['Ganada','g'],p:['Perdida / Cancelada','p']};
const VN_KIND={cot:'Cotización',ped:'Pedido de la tienda',sus:'Suscripción',ins:'Inscripción'};
const vnMs=t=>t&&t.toMillis?t.toMillis():t?Date.parse(t):0;
const vnIso=ms=>ms?new Date(ms-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10):'';
function vnReady(){ evListen(); shListen(); lcListen(SB); lcListen(EN); return EV.loaded&&EV.contactsLoaded&&SH.loaded&&SB.loaded&&EN.loaded; }
/* Todas las operaciones, traducidas a un formato común */
function vnOps(){
  const now=Date.now(), today=vnIso(now), out=[];
  EV.ops.forEach(o=>{ const w=o.won||{}, amt=evAmount(o), ev=o.event||{};
    const st=o.stage==='ganada'?'g':o.stage==='perdida'?'p':o.stage==='nueva-cotizacion'?'n':'c';
    const paid=st==='g'?((w.depositPaid?(w.depositMinor||0):0)+(w.balancePaid?Math.max(0,(w.amountMinor||0)-(w.depositMinor||0)):0)):0;
    const fu=vnMs(o.nextFollowUpAt), late=st!=='g'&&st!=='p'&&fu&&fu<now;
    let sub=evStageName(o.stage), next='', act=null;
    if(st==='g'){ sub=w.balancePaid?'Cobrado completo':w.depositPaid?'Seña cobrada · falta el saldo':'Seña sin cobrar'; if(!w.depositPaid){ next=`Cobrar la seña: ${evMoney(w.depositMinor||0).replace(' ','\u00a0')}`; act=['Cobrar seña',()=>evPayForm(o,'deposit')]; } else if(!w.balancePaid){ next='Cobrar el saldo'; act=['Cobrar saldo',()=>evPayForm(o,'balance')]; } }
    else if(st==='p') sub=`Perdida${o.lostReason?' · '+o.lostReason.toLowerCase():''}`;
    else { next=o.nextAction||(fu?`Seguimiento ${evDate(vnIso(fu))}`:''); act=['Abrir',()=>evFicha(o.id)]; }
    out.push({id:'q-'+o.id,kind:'cot',contactId:o.contactId,cli:evName(o),unit:o.brand||'',prod:`Evento · ${ev.type||'sin tipo'}${ev.guests?` (${ev.guests} pers.)`:''}${ev.date?` · ${evDate(ev.date)}`:''}`,
      st,sub,amt:amt||0,paid,recur:false,date:vnMs(o.createdAt),src:(o.source||{}).channel||'',camp:(o.attribution||{}).utmCampaign||'',late:late||(st==='g'&&!w.depositPaid&&ev.date&&ev.date<=today),next,act,open:()=>evFicha(o.id)}); });
  SH.orders.forEach(o=>{ const st=o.status==='paid'||o.status==='picked_up'?'g':'p', [sl]=SH_ST[o.status]||[o.status], pk=(o.pickup||{}).date;
    out.push({id:'o-'+o.id,kind:'ped',contactId:o.contactId,cli:o.customerName||'',unit:o.brand||'',prod:shItems(o),st,sub:sl+(o.status==='paid'&&pk?` (${evDate(pk)})`:''),amt:o.totalMinor||0,paid:st==='g'?(o.totalMinor||0):0,recur:false,
      date:shPaidMs(o)||vnMs(o.createdAt),src:((o.source||{}).manual?'Carga manual · ':'')+'Tienda',camp:o.utmCampaign||'',late:o.status==='paid'&&pk&&pk<today,next:o.status==='paid'?'Marcar como retirado':'',act:o.status==='paid'?['Retirado',()=>shSetStatus(o,'picked_up')]:null,open:()=>shOrder(o.id)}); });
  SB.items.forEach(s=>{ const st=s.status==='cancelled'?'p':'g', [sl]=SUB_ST[s.status]||[s.status];
    out.push({id:'s-'+s.id,kind:'sus',contactId:s.contactId,cli:s.customerName||'',unit:s.brand||'',prod:`Suscripción · ${s.planName}`,st,sub:sl,amt:s.priceMinor||0,paid:0,recur:s.status==='active',
      date:Date.parse((s.startDate||'')+'T12:00:00')||vnMs(s.createdAt),src:'Suscripción',camp:s.utmCampaign||'',late:false,next:'',act:null,open:()=>evContacto(s.contactId)}); });
  EN.items.forEach(x=>{ const st=x.status==='paid'?'g':'p', [sl]=ENR_ST[x.status]||[x.status];
    out.push({id:'e-'+x.id,kind:'ins',contactId:x.contactId,cli:x.customerName||'',unit:x.brand||'',prod:`Curso · ${x.courseName}`,st,sub:sl,amt:x.amountMinor||0,paid:st==='g'?(x.amountMinor||0):0,recur:false,
      date:Date.parse((x.paidDate||'')+'T12:00:00')||vnMs(x.createdAt),src:'Inscripción',camp:x.utmCampaign||'',late:false,next:'',act:null,open:()=>evContacto(x.contactId)}); });
  return out;
}
function vnRange(){ const d=new Date(), y=d.getFullYear(), m=d.getMonth();
  return {mes:[new Date(y,m,1),new Date(y,m+1,1)],ant:[new Date(y,m-1,1),new Date(y,m,1)],'90':[new Date(Date.now()-90*864e5),new Date(Date.now()+864e5)],todo:null}[VN.per]; }
function vnFilter(ops){ const r=vnRange(), q=VN.q.toLowerCase();
  return ops.filter(o=>(!VN.unit||o.unit===VN.unit)&&(!VN.st||o.st===VN.st)&&(!VN.kind||o.kind===VN.kind)&&(!r||(o.date>=r[0].getTime()&&o.date<r[1].getTime()))&&(!q||`${o.cli} ${o.prod} ${o.unit}`.toLowerCase().includes(q))); }
const vnShort=u=>String(u||'').replace(/^Cafelito /,'')||'—';
function vnTotals(ops){ const g=ops.filter(o=>o.st==='g'&&!o.recur&&o.kind!=='sus');
  return { cob:ops.reduce((a,o)=>a+o.paid,0), vend:g.reduce((a,o)=>a+o.amt,0), juego:ops.filter(o=>o.st==='n'||o.st==='c').reduce((a,o)=>a+o.amt,0), mens:ops.filter(o=>o.recur).reduce((a,o)=>a+o.amt,0) }; }
function vVentas(){
  if(!vnReady()) return `<div class="card empty"><p class="muted">Cargando ventas…</p></div>`;
  const all=vnOps(), units=[...new Set([...S.brands.map(b=>b.name),...all.map(o=>o.unit).filter(Boolean)])];
  const sel=(id,cur,opts,label)=>`<label class="sr" for="${id}">${label}</label><select class="select sm vn-sel" id="${id}">${opts.map(([v,l])=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`).join('')}</select>`;
  const bar=`<div class="toolbar vn-bar"><div class="seg" role="group" aria-label="Vista"><button data-vnm="op" aria-pressed="${VN.mode==='op'}">Por operación</button><button data-vnm="cl" aria-pressed="${VN.mode==='cl'}">Por cliente</button></div>
    <label class="search-in">${ic('search')}<span class="sr">Buscar</span><input class="input" id="vnq" placeholder="Buscar cliente o producto" value="${esc(VN.q)}"></label>
    ${sel('vnu',VN.unit,[['','Todas las unidades'],...units.map(u=>[u,u])],'Unidad')}
    ${VN.mode==='op'?sel('vns',VN.st,[['','Todos los estados'],...Object.entries(VN_ST).map(([k,[l]])=>[k,l])],'Estado')+sel('vnk',VN.kind,[['','Todo tipo de venta'],...Object.entries(VN_KIND)],'Tipo'):''}
    ${sel('vnp',VN.per,[['todo','Todo el tiempo'],['mes','Este mes'],['ant','Mes pasado'],['90','Últimos 90 días']],'Período')}
    <span class="grow"></span><button class="btn btn-sm" id="vncsv">${ic('download')} Descargar</button><button class="btn btn-sm btn-primary" data-vnnew>${ic('plus')} Cargar venta</button></div>`;
  return bar+(VN.mode==='cl'?vnClientes(all):vnOperaciones(vnFilter(all)));
}
function vnOperaciones(ops){
  const k=VN.sort, d=VN.dir, key={date:o=>o.date,cli:o=>o.cli.toLowerCase(),st:o=>o.st,unit:o=>o.unit,prod:o=>o.prod.toLowerCase(),amt:o=>o.amt}[k]||(o=>o.date);
  ops.sort((a,b)=>{ const x=key(a), y=key(b); return x<y?-d:x>y?d:0; });
  const t=vnTotals(ops), th=(id,l,cls='')=>`<th class="${cls}"><button class="vn-sort" data-vnsort="${id}">${l}${VN.sort===id?(VN.dir>0?' ↑':' ↓'):''}</button></th>`;
  const money=o=>!o.amt?'<span class="muted small">Sin importe</span>':o.st==='p'?`<span class="muted" style="text-decoration:line-through">${evMoney(o.amt)}</span>`:o.st==='g'?`<b>${evMoney(o.amt)}</b>${o.recur?'<span class="vn-sl">por mes</span>':''}`:`<span class="muted">${evMoney(o.amt)}</span><span class="vn-sl">posible</span>`;
  const rows=ops.map(o=>`<tr data-vnop="${esc(o.id)}"><td><b>${esc(o.cli||'Sin nombre')}</b><span class="vn-sl">${esc([o.src,o.date?evDate(vnIso(o.date)):''].filter(Boolean).join(' · '))}</span></td>
    <td><span class="vn-st ${o.st}">${VN_ST[o.st][0]}</span><span class="vn-sl ${o.late?'vn-late':''}">${esc(o.sub)}</span></td>
    <td class="hide-m"><span class="vn-unit">${esc(vnShort(o.unit))}</span></td><td class="small vn-prod">${esc(o.prod)}</td>
    <td class="num">${money(o)}</td><td class="vn-next">${o.act?`<button class="btn btn-sm ${o.late?'btn-primary':''}" data-vnact="${esc(o.id)}">${esc(o.act[0])}</button>`:''}${o.next?`<span class="vn-sl">${esc(o.next)}</span>`:''}</td></tr>`).join('');
  const tot=`<div class="vn-tot"><span>Cobrado <b>${evMoney(t.cob)}</b></span><span>Vendido <b>${evMoney(t.vend)}</b></span><span>En juego <b>${evMoney(t.juego)}</b></span><span>Mensual fijo <b>${t.mens?evMoney(t.mens):'—'}</b></span><span class="muted">${ops.length} ${ops.length===1?'operación':'operaciones'}</span></div>`;
  if(!ops.length) return `<div class="card empty"><div class="eico">${ic('dollar')}</div><h3>No hay ventas con estos filtros</h3><p class="muted small">Probá con otra unidad, otro estado u otro período.</p></div>`;
  return `<div class="card vn-card"><div class="table-wrap"><table class="t vn-t"><thead><tr>${th('cli','Cliente')}${th('st','Estado')}${th('unit','Unidad','hide-m')}${th('prod','Producto o servicio')}${th('amt','Importe','num')}<th>Próximo paso</th></tr></thead><tbody>${rows}</tbody></table></div>${tot}</div>`;
}
function vnClientes(all){
  const by=new Map(); const add=(id,c)=>{ if(!by.has(id)) by.set(id,{id,c,ops:[]}); return by.get(id); };
  Object.values(EV.contacts).forEach(c=>add(c.id,c)); all.forEach(o=>{ if(o.contactId) add(o.contactId,EV.contacts[o.contactId]||{name:o.cli}).ops.push(o); });
  const q=VN.q.toLowerCase(), r=vnRange();
  let list=[...by.values()].map(p=>{ const c=p.c||{}, won=p.ops.filter(o=>o.st==='g'), units=[...new Set(p.ops.map(o=>o.unit).filter(Boolean))];
    const u=units.length?units:(c.tags||[]).filter(x=>S.brands.some(b=>b.name===x));
    const open=p.ops.filter(o=>o.st==='n'||o.st==='c'), pend=won.filter(o=>o.act);
    return {id:p.id,name:c.name||(p.ops[0]||{}).cli||'Sin nombre',type:won.length||c.type==='Cliente'?'Cliente':'Lead',units:u,buys:won.length,total:p.ops.reduce((a,o)=>a+o.paid,0),vend:won.filter(o=>!o.recur&&o.kind!=='sus').reduce((a,o)=>a+o.amt,0),
      mens:won.filter(o=>o.recur).reduce((a,o)=>a+o.amt,0),last:Math.max(0,...won.map(o=>o.date)),open:open.length?`${open.length} en curso`:pend.length?esc(pend[0].next):'',src:(c.firstSource||{}).channel||'',cons:c.marketingConsent?(c.marketingConsent.granted?'Sí':'No'):'Sin datos'}; });
  list=list.filter(p=>(!VN.unit||p.units.includes(VN.unit))&&(!q||p.name.toLowerCase().includes(q))&&(!r||by.get(p.id).ops.some(o=>o.date>=r[0].getTime()&&o.date<r[1].getTime())||(!by.get(p.id).ops.length&&!r)));
  list.sort((a,b)=>b.total-a.total||b.last-a.last);
  if(!list.length) return `<div class="card empty"><div class="eico">${ic('users')}</div><h3>No hay clientes con estos filtros</h3></div>`;
  const okP=list.filter(p=>p.cons==='Sí').length;
  return `<div class="card vn-card"><div class="table-wrap"><table class="t vn-t"><thead><tr><th>Cliente</th><th>Tipo</th><th>Unidades</th><th class="num hide-m">Compras</th><th class="num">Total aportado</th><th>Abierto</th><th class="hide-m">Llegó por</th><th class="hide-m">Acepta promociones</th></tr></thead><tbody>
    ${list.map(p=>`<tr data-vncli="${esc(p.id)}"><td><b>${esc(p.name)}</b></td><td><span class="vn-st ${p.type==='Cliente'?'g':'n'}">${p.type}</span></td><td>${p.units.map(u=>`<span class="vn-unit">${esc(vnShort(u))}</span>`).join(' ')||'<span class="muted small">—</span>'}</td>
      <td class="num hide-m">${p.buys}</td><td class="num">${p.total?`<b>${evMoney(p.total)}</b>`:p.vend?`<span class="muted">${evMoney(p.vend)} vendido</span>`:'<span class="muted">—</span>'}${p.mens?`<span class="vn-sl">${evMoney(p.mens)} por mes</span>`:''}</td>
      <td class="small">${p.open||'<span class="muted">—</span>'}</td><td class="small muted hide-m">${esc(p.src)}</td><td class="small hide-m">${p.cons}</td></tr>`).join('')}</tbody></table></div>
    <div class="vn-tot"><span>${list.length} persona${list.length===1?'':'s'}</span><span>${list.filter(p=>p.type==='Cliente').length} clientes</span><span>${okP} aceptan promociones</span></div></div>`;
}
function bVentas(){
  const re=()=>render();
  $$('[data-vnm]').forEach(b=>b.onclick=()=>{ VN.mode=b.dataset.vnm; re(); });
  const q=$('#vnq'); if(q) q.oninput=()=>{ VN.q=q.value; const p=q.selectionStart; render(); const n=$('#vnq'); if(n){ n.focus(); n.setSelectionRange(p,p); } };
  [['vnu','unit'],['vns','st'],['vnk','kind'],['vnp','per']].forEach(([id,k])=>{ const s=$('#'+id); if(s) s.onchange=()=>{ VN[k]=s.value; re(); }; });
  $$('[data-vnsort]').forEach(b=>b.onclick=()=>{ const k=b.dataset.vnsort; if(VN.sort===k) VN.dir*=-1; else { VN.sort=k; VN.dir=k==='date'||k==='amt'?-1:1; } re(); });
  const ops=vnReady()?vnOps():[], byId=Object.fromEntries(ops.map(o=>[o.id,o]));
  $$('[data-vnact]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const o=byId[b.dataset.vnact]; if(o&&o.act) o.act[1](); });
  $$('[data-vnop]').forEach(r=>r.onclick=()=>{ const o=byId[r.dataset.vnop]; if(o) o.open(); });
  $$('[data-vncli]').forEach(r=>r.onclick=()=>evContacto(r.dataset.vncli));
  const nw=$('[data-vnnew]'); if(nw) nw.onclick=()=>{ modal('Cargar venta',`<div style="display:grid;gap:8px"><button class="btn" data-vnn="cot">${ic('calendar')} Pedido de presupuesto (cotización)</button><button class="btn" data-vnn="ped">${ic('dollar')} Venta de la tienda (ya pagada)</button><button class="btn" data-vnn="sus">${ic('refresh')} Suscripción</button><button class="btn" data-vnn="ins">${ic('book')} Inscripción a un curso</button></div>`,`<button class="btn" data-close>Cancelar</button>`);
    $$('#layer [data-vnn]').forEach(x=>x.onclick=()=>{ const k=x.dataset.vnn; closeLayer(); ({cot:()=>manForm(true),ped:()=>manSaleForm(),sus:()=>subForm(),ins:()=>enrForm()})[k](); }); };
  const csv=$('#vncsv'); if(csv) csv.onclick=()=>{ const rows=vnFilter(vnOps()), c=v=>`"${String(v==null?'':v).replace(/"/g,'""')}"`;
    const lines=[['Fecha','Cliente','Estado','Detalle','Unidad','Tipo de venta','Producto o servicio','Importe','Cobrado','Origen','Campaña'].join(';'),...rows.map(o=>[vnIso(o.date),o.cli,VN_ST[o.st][0],o.sub,o.unit,VN_KIND[o.kind],o.prod,(o.amt/100).toFixed(2).replace('.',','),(o.paid/100).toFixed(2).replace('.',','),o.src,o.camp].map(c).join(';'))];
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+lines.join('\n')],{type:'text/csv;charset=utf-8'})); a.download=`ventas-${vnIso(Date.now())}.csv`; a.click(); toast('Descargado: se abre con Excel'); };
}
(function(){
  if(typeof CRM_NUBE_TABS==='undefined') return;
  CRM_NUBE_TABS.unshift(['ventas','Ventas']);
  const _v=vCrm, _b=bCrm, cloud=()=>!!(S.company&&S.company.cloud);
  vCrm=function(tab){ if(!cloud()) return _v(tab); if(!tab||tab==='ventas') return pageHead('CRM','Tus clientes y ventas de todas las unidades, en un solo lugar.','')+subTabs('crm',CRM_NUBE_TABS,'ventas')+vVentas(); return _v(tab); };
  bCrm=function(tab){ if(!cloud()) return _b(tab); if(!tab||tab==='ventas') return bVentas(); return _b(tab); };
  VIEWS.crm.view=vCrm; VIEWS.crm.bind=bCrm;
  /* Que la planilla se actualice cuando llegan datos nuevos */
  const onV=()=>/^#\/app\/crm(\/ventas)?\/?(\?.*)?$/.test(location.hash);
  const wrap=f=>function(){ if(onV()){ if(!$('#layer').children.length) render(); return; } return f.apply(this,arguments); };
  evRefresh=wrap(evRefresh); shRefresh=wrap(shRefresh); lcRefresh=wrap(lcRefresh);
})();
