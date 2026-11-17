/* =====================================================================
   03b · CONTENIDOS → PLANIFICACIONES Y APROBACIONES (Fase 1)
   - Una idea ES un contenido (M().contents) con planId: al aprobarse sigue en el mismo registro.
   - Planificaciones: M().editorialPlans. Registro de aprobaciones: M().approvals.
   - Estados separados: idea (c.ideaSt, guardado) · producción y publicación (derivados de c.status,
     que se mantiene para no romper Inicio, Redes, Métricas, Campañas ni el calendario).
   ===================================================================== */
const ED_INTENTS=[['atraer','Atraer'],['posicionar','Posicionar'],['convertir','Convertir']];
const ED_IDEA={ 'sin-presentar':['Sin presentar','badge'], presentada:['En revisión','badge badge-warn'], aprobada:['Aprobada','badge badge-ok'], ajustes:['Ajustes pedidos','badge badge-err'] };
const edIntentLabel=k=>(ED_INTENTS.find(x=>x[0]===k)||['','—'])[1];
const edPlans=()=>{ const m=M(); if(!Array.isArray(m.editorialPlans)) m.editorialPlans=[]; return m.editorialPlans; };
const edLog=()=>{ const m=M(); if(!Array.isArray(m.approvals)) m.approvals=[]; return m.approvals; };
const edIdeas=p=>M().contents.filter(c=>c.planId===p.id).map(cNorm).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.order||0)-(b.order||0));
const edNow=()=>{ const d=new Date(); return `${d.getDate()} ${MES[d.getMonth()].slice(0,3)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };

/* ---------- Migración (una sola vez por empresa, idempotente) ---------- */
function cNorm(c){
  if(!c.ideaSt){ if(c.status==='Idea') c.ideaSt='sin-presentar'; else { c.ideaSt='aprobada'; c.ideaLegacy=true; } }
  if(c.desc==null) c.desc=''; if(c.intent==null) c.intent='';
  return c;
}
function campNorm(cp,m){
  if(cp.objectiveId!==undefined) return cp;
  const ids=new Set();
  m.objectives.filter(o=>o.brand===cp.brand&&(o.links||[]).includes(cp.id)).forEach(o=>ids.add(o.id));
  (m.funnels||[]).filter(f=>(f.campaigns||[]).some(l=>l.id===cp.id)).forEach(f=>ids.add(f.objectiveId));
  m.contents.filter(c=>c.campaign===cp.id&&c.objective).forEach(c=>ids.add(c.objective));
  const valid=[...ids].filter(id=>m.objectives.some(o=>o.id===id));
  cp.objectiveId=valid.length===1?valid[0]:''; if(valid.length===1) cp.objInferred=true;
  return cp;
}
function edMigrate(m){
  if(!m||!Array.isArray(m.contents)) return;
  if(!m.edV){ m.contentsBackupV1=JSON.parse(JSON.stringify(m.contents)); m.edV=1; }
  m.contents.forEach(cNorm); (m.campaigns||[]).forEach(cp=>campNorm(cp,m));
}
function edMigrateAll(){ try{ STORE.forEach(st=>edMigrate(st&&st.m)); }catch(e){} }
edMigrateAll();

/* ---------- Estados derivados ---------- */
function edProd(c){ return {Idea:c.ideaSt==='aprobada'?'Lista para producción':'—',Borrador:'En producción',Revisión:'En revisión creativa',Aprobado:'Aprobado',Programado:'Aprobado',Publicado:'Aprobado'}[c.status]||'—'; }
function edPub(c){ return c.status==='Programado'?'Programado':c.status==='Publicado'?'Publicado':'Sin programar'; }
function edIdeaBadge(c){ cNorm(c); if(c.ideaLegacy) return '<span class="badge" title="Contenido creado antes del flujo de aprobación">Anterior al flujo</span>'; const [l,k]=ED_IDEA[c.ideaSt]||ED_IDEA['sin-presentar']; return `<span class="${k}">${l}</span>`; }
function edPlanStatus(p){
  const ids=edIdeas(p); if(!ids.length) return ['Sin ideas','badge'];
  const has=s=>ids.some(c=>c.ideaSt===s);
  if(has('presentada')) return ['En revisión','badge badge-warn'];
  if(has('ajustes')) return ['Con ajustes','badge badge-err'];
  if(has('sin-presentar')) return has('aprobada')?['Parcialmente aprobada','badge badge-brand']:['Borrador','badge'];
  return ['Aprobada','badge badge-ok'];
}
/* ---------- Permisos (prototipo: Dueño y Admin pueden aprobar en nombre del aprobador) ---------- */
function edMe(){ return S.members.find(m=>(S.user.email&&m.email===S.user.email)||(m.name&&m.name===S.user.name))||{role:''}; }
function edCanApprove(p){ return !!p&&(p.approver===S.user.name||['Dueño','Admin'].includes(edMe().role)); }
const edOnBehalf=p=>p&&p.approver&&p.approver!==S.user.name?p.approver:null;

/* ---------- Período ---------- */
function edPeriod(type,dateIso){
  const d=parse(dateIso||iso(NOW));
  if(type==='mes'){ const s=new Date(d.getFullYear(),d.getMonth(),1,12), e=new Date(d.getFullYear(),d.getMonth()+1,0,12); return {start:iso(s),end:iso(e),name:`${MES_UP[s.getMonth()]} ${s.getFullYear()}`}; }
  const s=addDays(d,-((d.getDay()+6)%7)), e=addDays(s,6); return {start:iso(s),end:iso(e),name:`Semana del ${s.getDate()} ${MES[s.getMonth()].slice(0,3)}`};
}
const edRange=p=>`${fdate(p.start)} – ${fdate(p.end)} ${parse(p.end).getFullYear()}`;

/* ---------- Validación para presentar ---------- */
function edMissing(c){ const f=[]; if(!c.title.trim()) f.push('title'); if(!c.date) f.push('date'); if(!c.channel) f.push('channel'); if(!c.format) f.push('format'); if(!c.campaign&&!c.objective) f.push('campaign'); return f; }
const ED_MISS={title:'título',date:'fecha',channel:'canal',format:'formato',campaign:'campaña u objetivo'};
const edMissTxt=c=>edMissing(c).map(k=>ED_MISS[k]).join(', ');
const edEditable=c=>['sin-presentar','ajustes'].includes(c.ideaSt)&&c.status==='Idea';

/* ---------- Acciones de aprobación ---------- */
function edRecord(entry){ edLog().unshift({id:uid(),at:new Date().toISOString(),by:S.user.name||'Vos',...entry}); }
function edApprove(ideas,p,comment){
  const ob=edOnBehalf(p);
  ideas.forEach(c=>{ c.ideaSt='aprobada'; c.ideaApproval={by:S.user.name,onBehalfOf:ob,at:new Date().toISOString(),version:c.ideaVersion||p.version};
    if(comment) c.comments.push({who:S.user.name,t:'Aprobación: '+comment,when:edNow()});
    edRecord({kind:'idea',decision:'aprobada',targetId:c.id,planId:p.id,version:c.ideaVersion||p.version,onBehalfOf:ob,comment:comment||''}); });
  logAct(`Aprobaste ${ideas.length} idea${ideas.length>1?'s':''} de «${p.name}»`);
}
function edAdjust(c,p,comment){ const ob=edOnBehalf(p); c.ideaSt='ajustes'; c.comments.push({who:S.user.name+(ob?` (por ${ob})`:''),t:'Ajuste pedido: '+comment,when:edNow()});
  edRecord({kind:'idea',decision:'ajustes',targetId:c.id,planId:p.id,version:c.ideaVersion||p.version,onBehalfOf:ob,comment}); notify('Ajustes en una idea',`«${c.title}» de ${p.name} necesita cambios.`); }
function edComment(c,p,txt){ c.comments.push({who:S.user.name,t:txt,when:edNow()}); edRecord({kind:'idea',decision:'comentario',targetId:c.id,planId:p&&p.id,version:c.ideaVersion||(p&&p.version)||0,comment:txt}); }
function edPresent(p,only){
  const ideas=edIdeas(p), cand=(only?ideas.filter(c=>c.id===only):ideas).filter(c=>['sin-presentar','ajustes'].includes(c.ideaSt));
  if(!cand.length){ toast('No hay ideas para presentar'); return false; }
  const bad=cand.filter(c=>edMissing(c).length);
  if(bad.length){ p.checked=true; return false; }
  p.checked=false;
  p.version=(p.version||0)+1; p.presentedAt=new Date().toISOString();
  cand.forEach(c=>{ c.ideaSt='presentada'; c.ideaVersion=p.version; });
  edRecord({kind:'plan',decision:'presentada',targetId:p.id,planId:p.id,version:p.version,comment:`${cand.length} idea${cand.length>1?'s':''}`});
  notify('Planificación para aprobar',`«${p.name}» (versión ${p.version}) tiene ${cand.length} idea${cand.length>1?'s':''} para revisar.`);
  logAct(`Presentaste «${p.name}» (versión ${p.version})`); return true;
}

/* ---------- Navegación de Contenidos ---------- */
function edPendingCount(){ return M().contents.filter(c=>c.planId&&cNorm(c).ideaSt==='presentada'&&inBrand(c)).length; }
function edTabs(cur){
  const n=edPendingCount(), t=[['mes','Calendario',['mes','semana','lista']],['planificaciones','Planificaciones',['planificaciones']],['aprobaciones',`Aprobaciones${n?` <span class="ed-count">${n}</span>`:''}`,['aprobaciones']]];
  return `<div class="tabs" role="tablist">${t.map(([k,l,on])=>`<a class="tab" role="tab" href="#/app/contenidos/${k}" aria-selected="${on.includes(cur)}">${l}</a>`).join('')}</div>`;
}
const edHead=()=>pageHead('Contenidos','Calendario editorial de todas tus marcas y canales.',`${brandScope()}<button class="btn btn-primary" id="newc">${ic('plus')} Nuevo contenido</button>`);

/* ---------- Vista: lista de planificaciones ---------- */
function vPlanList(){
  const ps=edPlans().filter(p=>!curBrand()||p.brand===curBrand().name).sort((a,b)=>b.start.localeCompare(a.start));
  const bar=`<div class="toolbar"><p class="muted grow">Planes semanales o mensuales por marca. Cargá las ideas en una tabla, presentalas y el aprobador las aprueba en bloque. Las aprobadas pasan a producción sin duplicarse.</p><button class="btn btn-primary" id="newplan">${ic('plus')} Nueva planificación</button></div>`;
  if(!ps.length) return bar+`<div class="card empty"><div class="eico">${ic('calendar')}</div><h3>Todavía no hay planificaciones</h3><p class="muted small">Creá un plan semanal o mensual para una marca y cargá las ideas sin escribir copys ni subir archivos.</p><button class="btn btn-primary" data-newplan>${ic('plus')} Nueva planificación</button></div>`;
  return bar+`<div class="table-wrap"><table class="t ed-plist"><thead><tr><th>Planificación</th><th>Período</th><th class="num">Ideas</th><th>Estado</th><th class="hide-m">Aprobador</th><th class="num hide-m">Versión</th></tr></thead><tbody>
  ${ps.map(p=>{ const ids=edIdeas(p), [sl,sk]=edPlanStatus(p), n=s=>ids.filter(c=>c.ideaSt===s).length;
    return `<tr data-plan="${p.id}" style="cursor:pointer"><td><b>${esc(p.name)}</b><div class="small muted"><i class="sdot" style="background:${brandOf(p.brand).color};display:inline-block;margin-right:6px"></i>${esc(p.brand)} · ${p.type==='mes'?'Mensual':'Semanal'}</div></td>
     <td class="mono small">${edRange(p)}</td><td class="num">${ids.length}<div class="small muted">${n('aprobada')} aprobadas${n('presentada')?` · ${n('presentada')} en revisión`:''}${n('ajustes')?` · ${n('ajustes')} con ajustes`:''}</div></td>
     <td><span class="${sk}">${sl}</span></td><td class="hide-m">${esc(p.approver||'—')}</td><td class="num hide-m mono">${p.version?'v'+p.version:'—'}</td></tr>`; }).join('')}</tbody></table></div>`;
}

/* ---------- Vista: detalle con edición masiva ---------- */
let edSel=new Set(), edBulkField='campaign';
function edRow(p,c,can){
  const m=M(), ed=edEditable(c), camps=m.campaigns.filter(x=>x.brand===p.brand), objs=m.objectives.filter(x=>x.brand===p.brand);
  const out=c.date&&(c.date<p.start||c.date>p.end);
  const mk=f=>(ed&&p.checked&&edMissing(c).includes(f==='objective'?'campaign':f))?' is-missing':'';
  const sel=(f,opts,v,ph)=>`<select class="select ed-in${mk(f)}" data-f="${f}" aria-label="${f}">${ph!=null?`<option value="">${ph}</option>`:''}${opts.map(([k,l])=>`<option value="${esc(k)}" ${k===v?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
  const ro=(v)=>`<span class="ed-ro">${v}</span>`;
  const camp=camps.find(x=>x.id===c.campaign), obj=objs.find(x=>x.id===c.objective)||m.objectives.find(x=>x.id===c.objective);
  const last=(c.comments||[]).slice(-1)[0];
  const acts=[];
  if(c.ideaSt==='presentada'&&can) acts.push(`<button class="btn btn-sm btn-primary" data-ap="${c.id}">${ic('check')} Aprobar</button><button class="btn btn-sm" data-adj="${c.id}">Pedir ajuste</button>`);
  if(c.ideaSt==='ajustes') acts.push(`<button class="btn btn-sm" data-repres="${c.id}">Re-presentar</button>`);
  if(c.ideaSt==='aprobada'&&c.status==='Idea') acts.push(`<button class="btn btn-sm" data-prod="${c.id}">A producción</button>`);
  if(c.status!=='Idea') acts.push(`<button class="btn btn-sm btn-ghost" data-open="${c.id}">Abrir</button>`);
  const actsHtml=`<div class="ed-acts ed-acts-in">${acts.join('')}<button class="icon-btn" data-cm="${c.id}" aria-label="Comentarios de ${esc(c.title||'idea')}" title="${last?esc(last.who+': '+last.t):'Comentar'}">${ic('message')}${(c.comments||[]).length?`<span class="ed-cmn">${c.comments.length}</span>`:''}</button>${ed?`<button class="icon-btn" data-dup="${c.id}" aria-label="Duplicar" title="Duplicar">${ic('copy')}</button><button class="icon-btn" data-del="${c.id}" aria-label="Eliminar" title="Eliminar">${ic('trash')}</button>`:''}</div>`;
  const miss=ed&&p.checked?edMissing(c):[];
  return `<tr class="ed-row ${ed?'is-edit':''} ${miss.length?'ed-bad':''}" data-id="${c.id}">
   <td class="ed-c-sel"><input type="checkbox" class="ed-chk" data-sel="${c.id}" ${edSel.has(c.id)?'checked':''} aria-label="Seleccionar ${esc(c.title||'idea')}"></td>
   <td class="ed-c-idea" data-l="Idea">${ed?`<input class="input ed-in ed-title${mk('title')}" data-f="title" value="${esc(c.title)}" placeholder="Título de la idea" aria-label="Título"><textarea class="input ed-in ed-desc" data-f="desc" rows="2" placeholder="Descripción (opcional)" aria-label="Descripción">${esc(c.desc)}</textarea><div class="ed-miss" role="status">${miss.length?`Falta: ${edMissTxt(c)}`:''}</div>`:`<b>${esc(c.title)}</b>${c.desc?`<div class="small muted ed-desc-ro">${esc(c.desc)}</div>`:''}`}${actsHtml}</td>
   <td data-l="Fecha">${ed?`<input class="input ed-in${mk('date')}" type="date" data-f="date" value="${c.date||''}" aria-label="Fecha">`:ro(c.date?fdate(c.date):'—')}${out?`<div class="small" style="color:var(--warning)">Fuera del período</div>`:''}</td>
   <td data-l="Canal">${ed?sel('channel',CHANNELS.map(x=>[x,x]),c.channel):ro(c.channel)}</td>
   <td data-l="Formato">${ed?sel('format',FORMATS.map(f=>[f[0],f[0]]),c.format):ro(c.format)}</td>
   <td data-l="Campaña">${ed?sel('campaign',camps.map(x=>[x.id,x.name]),c.campaign,'Sin campaña'):ro(camp?esc(camp.name):'—')}</td>
   <td data-l="Objetivo">${ed?sel('objective',objs.map(x=>[x.id,x.title]).concat([['__new','+ Crear objetivo…']]),c.objective,'Sin objetivo'):ro(obj?esc(obj.title):'—')}</td>
   <td data-l="Intención">${ed?sel('intent',ED_INTENTS,c.intent,'—'):ro(edIntentLabel(c.intent))}</td>
   <td data-l="Responsable">${ed?sel('owner',OWNERS().concat(c.owner&&!OWNERS().includes(c.owner)?[c.owner]:[]).map(o=>[o,o]),c.owner):ro(esc(c.owner||'—'))}</td>
   <td data-l="Estado">${edIdeaBadge(c)}${c.status!=='Idea'?`<div class="small muted">${edProd(c)}</div>`:''}${c.ideaVersion?`<div class="small muted mono">v${c.ideaVersion}</div>`:''}</td>
</tr>`;
}
function edBulkBar(p,ideas,can){
  const sel=ideas.filter(c=>edSel.has(c.id)); if(!sel.length) return '';
  const editable=sel.filter(edEditable), pend=sel.filter(c=>c.ideaSt==='presentada'), m=M();
  const fields=[['date','Fecha'],['channel','Canal'],['format','Formato'],['campaign','Campaña'],['objective','Objetivo'],['intent','Intención'],['owner','Responsable']];
  const opts={channel:CHANNELS.map(x=>[x,x]),format:FORMATS.map(f=>[f[0],f[0]]),campaign:[['','Sin campaña']].concat(m.campaigns.filter(x=>x.brand===p.brand).map(x=>[x.id,x.name])),objective:[['','Sin objetivo']].concat(m.objectives.filter(x=>x.brand===p.brand).map(x=>[x.id,x.title])),intent:[['','—']].concat(ED_INTENTS),owner:OWNERS().map(o=>[o,o])};
  const valCtl=edBulkField==='date'?`<input class="input" type="date" id="bkv" value="${p.start}" aria-label="Valor">`:`<select class="select" id="bkv" aria-label="Valor">${opts[edBulkField].map(([k,l])=>`<option value="${esc(k)}">${esc(l)}</option>`).join('')}</select>`;
  return `<div class="ed-bulk" role="region" aria-label="Acciones sobre las seleccionadas"><b>${sel.length} seleccionada${sel.length>1?'s':''}</b>
   ${editable.length?`<span class="ed-bulk-g"><span class="small muted">Aplicar a ${editable.length} editable${editable.length>1?'s':''}:</span><select class="select" id="bkf" aria-label="Campo">${fields.map(([k,l])=>`<option value="${k}" ${k===edBulkField?'selected':''}>${l}</option>`).join('')}</select>${valCtl}<button class="btn btn-sm" id="bkapply">Aplicar</button><button class="btn btn-sm" id="bkdup">${ic('copy')} Duplicar</button><button class="btn btn-sm" id="bkdel">${ic('trash')} Eliminar</button></span>`:''}
   ${pend.length&&can?`<button class="btn btn-sm btn-primary" id="bkapprove">${ic('check')} Aprobar ${pend.length}</button>`:''}
   <button class="btn btn-sm btn-ghost" id="bkclear">Quitar selección</button></div>`;
}
function vPlanDetail(id){
  const p=edPlans().find(x=>x.id===id);
  if(!p) return `<div class="card empty"><div class="eico">${ic('calendar')}</div><h3>No encontramos esa planificación</h3><a class="btn" href="#/app/contenidos/planificaciones">Ver planificaciones</a></div>`;
  const ideas=edIdeas(p), can=edCanApprove(p), [sl,sk]=edPlanStatus(p), pend=ideas.filter(c=>c.ideaSt==='presentada'), toPresent=ideas.filter(c=>['sin-presentar','ajustes'].includes(c.ideaSt));
  const loose=M().contents.filter(c=>!c.planId&&c.brand===p.brand&&c.status==='Idea'&&['sin-presentar','ajustes'].includes(cNorm(c).ideaSt));
  const ob=edOnBehalf(p);
  return `<nav class="breadcrumbs" style="margin-bottom:8px"><a href="#/app/contenidos/planificaciones">Planificaciones</a>${ic('chevr')}<span>${esc(p.name)}</span></nav>
  <div class="page-head" style="margin-bottom:12px"><div style="min-width:0"><h2 class="fz-title">${esc(p.name)}</h2><div class="small muted ed-meta"><i class="sdot" style="background:${brandOf(p.brand).color}"></i>${esc(p.brand)} · ${p.type==='mes'?'Mensual':'Semanal'} · ${edRange(p)} · <span class="${sk}">${sl}</span>${p.version?` · <span class="mono">v${p.version}</span>`:''}</div>
   <div class="small muted" style="margin-top:4px">Planifica: <b>${esc(p.owner||'—')}</b> · Aprueba: <b>${esc(p.approver||'—')}</b>${can&&ob?` · Podés aprobar en nombre de ${esc(ob)} (Dueño o Admin)`:''}</div></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap">${pend.length&&can?`<button class="btn" id="apall">${ic('check')} Aprobar todas (${pend.length})</button>`:''}<button class="btn btn-primary" id="present" ${toPresent.length?'':'disabled'}>Presentar planificación${toPresent.length?` (${toPresent.length})`:''}</button><button class="icon-btn" id="pedit" aria-label="Editar datos" title="Editar datos">${ic('edit')}</button><button class="icon-btn" id="pdel" aria-label="Eliminar planificación" title="Eliminar">${ic('trash')}</button></div></div>
  ${edNotice(p,ideas)}
  <div id="edbulk">${edBulkBar(p,ideas,can)}</div>
  <div class="table-wrap"><table class="t ed-table"><thead><tr><th><input type="checkbox" id="selall" aria-label="Seleccionar todas" ${ideas.length&&ideas.every(c=>edSel.has(c.id))?'checked':''}></th><th>Idea</th><th>Fecha</th><th>Canal</th><th>Formato</th><th>Campaña</th><th>Objetivo</th><th>Intención</th><th>Responsable</th><th>Estado</th></tr></thead>
  <tbody>${ideas.map(c=>edRow(p,c,can)).join('')||`<tr><td colspan="10"><div class="empty"><p class="small muted">Sin ideas todavía. Agregá la primera: solo título, fecha, canal, formato y campaña u objetivo.</p></div></td></tr>`}</tbody></table></div>
  <div class="ed-foot"><button class="btn" id="addidea">${ic('plus')} Agregar idea</button>${toPresent.length?`<button class="btn" id="psave">${ic('check')} Guardar borrador</button><span class="small ed-saved" id="edsaved">${ic('check')} Cambios guardados</span>`:''}${loose.length?`<button class="btn btn-ghost" id="addloose">${ic('plus')} Sumar ideas sueltas de ${esc(p.brand)} (${loose.length})</button>`:''}<span class="small muted">Enter en el título agrega otra fila. Todo se guarda solo; cuando las ideas estén listas, tocá «Presentar planificación» para enviarlas a aprobación.</span></div>`;
}
function edNotice(p,ideas){
  const m=M(), none=!m.campaigns.some(x=>x.brand===p.brand)&&!m.objectives.some(x=>x.brand===p.brand);
  const ed=ideas.filter(edEditable), bad=p.checked?ed.filter(c=>edMissing(c).length):[];
  const noLink=ed.filter(c=>!c.campaign&&!c.objective);
  if(bad.length) return `<div class="alert alert-err ed-notice" role="alert">${ic('alert')}<div><b>No se presentó: faltan datos en ${bad.length} idea${bad.length>1?'s':''}</b> (marcadas en rojo, con lo que falta debajo del título).${none?` ${esc(p.brand)} todavía no tiene campañas ni objetivos: cada idea tiene que estar vinculada a una campaña o a un objetivo.`:''}
    ${none||noLink.length?`<div style="margin-top:8px"><button class="btn btn-sm btn-primary" data-newobj-plan>${ic('plus')} Crear objetivo y vincular ${noLink.length} idea${noLink.length===1?'':'s'}</button></div>`:''}</div></div>`;
  if(none&&ed.length) return `<div class="alert alert-info ed-notice">${ic('info')}<div>${esc(p.brand)} todavía no tiene campañas ni objetivos. Para presentar, cada idea tiene que estar vinculada a una campaña o a un objetivo. <button class="btn btn-sm btn-ghost" data-newobj-plan>${ic('plus')} Crear objetivo</button></div></div>`;
  if(ed.length&&!p.version) return `<div class="alert alert-info ed-notice">${ic('info')}<div>Las ideas se guardan solas mientras escribís. Cuando estén listas, tocá <b>Presentar planificación</b> para enviarlas a aprobación de <b>${esc(p.approver||'—')}</b>.</div></div>`;
  return '';
}
function edObjDialog(p,onDone){
  const def=p.type==='mes'?p.name:`${MES_UP[parse(p.start).getMonth()]} ${parse(p.start).getFullYear()}`;
  const noLink=edIdeas(p).filter(c=>edEditable(c)&&!c.campaign&&!c.objective);
  modal('Nuevo objetivo',`${F('nob','Objetivo',`placeholder="Ej.: Aumentar las reservas de la barra en diciembre"`)}
   <div class="form-grid"><div class="field"><label for="nobb">Marca</label><input class="input" id="nobb" value="${esc(p.brand)}" disabled></div>
   <div class="field"><label for="nobp">Período</label><select class="select" id="nobp">${periodOptions(def).map(x=>`<option ${x===def?'selected':''}>${x}</option>`).join('')}</select></div></div>
   ${noLink.length?`<label class="check"><input type="checkbox" id="noball" checked> Vincular las ${noLink.length} idea${noLink.length>1?'s':''} sin campaña ni objetivo</label>`:''}
   <p class="small muted" style="margin-top:8px">Queda en Estrategia → Objetivos, donde podés sumarle resultados clave y un funnel.</p>`,
   `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="nobok">Crear objetivo</button>`);
  $('#nobok').onclick=()=>{ const t=$('#nob'); if(!fieldErr(t,!t.value.trim()?'Escribí el objetivo':'')) return;
    const o={id:uid(),title:t.value.trim(),brand:p.brand,period:$('#nobp').value,owner:S.user.name,krs:[]}; M().objectives.unshift(o);
    if($('#noball')&&$('#noball').checked) noLink.forEach(c=>{ c.objective=o.id; });
    logAct(`Creaste el objetivo «${o.title}»`); closeLayer(); if(onDone) onDone(o); render(); toast('Objetivo creado'); };
}
function edNewIdea(p,afterDate){
  const c=cNorm({id:uid(),title:'',format:'Post',channel:'Instagram',brand:p.brand,status:'Idea',campaign:'',objective:'',owner:p.owner||S.user.name,date:afterDate||p.start,time:'12:00',copy:'',hashtags:'',cta:'',files:[],comments:[],metrics:null,planId:p.id,ideaSt:'sin-presentar',desc:'',intent:'',order:Date.now()});
  M().contents.push(c); return c;
}
function edFocusTitle(id){ return ()=>{ const t=document.querySelector(`.ed-row[data-id="${id}"] .ed-title`); if(t){ t.focus(); t.scrollIntoView({block:'nearest'}); } }; }
function edRowCheck(p,c,row){
  if(!p.checked) return; const miss=edMissing(c), set=new Set(miss.map(k=>k));
  row.classList.toggle('ed-bad',!!miss.length); const msg=$('.ed-miss',row); if(msg) msg.textContent=miss.length?`Falta: ${edMissTxt(c)}`:'';
  $$('.ed-in',row).forEach(i=>{ const k=i.dataset.f==='objective'?'campaign':i.dataset.f; i.classList.toggle('is-missing',set.has(k)); });
}
function edSavedFlash(){ persist(); const s=$('#edsaved'); if(!s) return; s.classList.remove('on'); void s.offsetWidth; s.classList.add('on'); }
function bPlanDetail(p){
  const on=(s,f)=>{const e=$(s);if(e)e.onclick=f};
  const byId=id=>M().contents.find(c=>c.id===id);
  const redraw=focus=>{ render(); if(focus) setTimeout(focus,0); };
  // Edición en línea: guarda sin redibujar la tabla
  $$('.ed-row').forEach(row=>{ const c=byId(row.dataset.id); if(!c) return;
    $$('.ed-in',row).forEach(inp=>{ const f=inp.dataset.f;
      const apply=()=>{ if(f==='objective'&&inp.value==='__new'){ inp.value=c.objective||''; edObjDialog(p,o=>{ c.objective=o.id; }); return; }
        c[f]=inp.value; edRowCheck(p,c,row); edSavedFlash();
        if(f==='campaign'){ const cp=M().campaigns.find(x=>x.id===inp.value); if(cp&&cp.objectiveId){ c.objective=cp.objectiveId; const o=$('[data-f=objective]',row); if(o) o.value=cp.objectiveId; } }
        persist(); };
      inp.addEventListener(inp.tagName==='SELECT'||inp.type==='date'?'change':'input',apply);
      if(f==='title') inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); apply(); const n=edNewIdea(p,c.date); redraw(edFocusTitle(n.id)); } });
    }); });
  // Selección
  $$('[data-sel]').forEach(ch=>ch.onchange=()=>{ ch.checked?edSel.add(ch.dataset.sel):edSel.delete(ch.dataset.sel); $('#edbulk').innerHTML=edBulkBar(p,edIdeas(p),edCanApprove(p)); bindBulk(); });
  const sa=$('#selall'); if(sa) sa.onchange=()=>{ edIdeas(p).forEach(c=>sa.checked?edSel.add(c.id):edSel.delete(c.id)); render(); };
  function bindBulk(){
    const f=$('#bkf'); if(f) f.onchange=()=>{ edBulkField=f.value; $('#edbulk').innerHTML=edBulkBar(p,edIdeas(p),edCanApprove(p)); bindBulk(); };
    on('#bkapply',()=>{ const v=$('#bkv').value, sel=edIdeas(p).filter(c=>edSel.has(c.id)&&edEditable(c));
      sel.forEach(c=>{ c[edBulkField]=v; if(edBulkField==='campaign'){ const cp=M().campaigns.find(x=>x.id===v); if(cp&&cp.objectiveId) c.objective=cp.objectiveId; } }); render(); toast(`Aplicado a ${sel.length} idea${sel.length>1?'s':''}`); });
    on('#bkdup',()=>{ const sel=edIdeas(p).filter(c=>edSel.has(c.id)&&edEditable(c)); sel.forEach(c=>{ const n=edNewIdea(p,c.date); Object.assign(n,{title:c.title?c.title+' (copia)':'',desc:c.desc,channel:c.channel,format:c.format,campaign:c.campaign,objective:c.objective,intent:c.intent,owner:c.owner}); }); render(); toast(`Duplicaste ${sel.length} idea${sel.length>1?'s':''}`); });
    on('#bkdel',()=>{ const sel=edIdeas(p).filter(c=>edSel.has(c.id)&&edEditable(c)); const arr=M().contents, kept=sel.map(c=>[arr.indexOf(c),c]); M().contents=arr.filter(c=>!sel.includes(c)); sel.forEach(c=>edSel.delete(c.id)); render(); toast(`Eliminaste ${sel.length} idea${sel.length>1?'s':''}`,()=>{ kept.sort((a,b)=>a[0]-b[0]).forEach(([i,c])=>M().contents.splice(i,0,c)); render(); }); });
    on('#bkapprove',()=>edApproveDialog(p,edIdeas(p).filter(c=>edSel.has(c.id)&&c.ideaSt==='presentada')));
    on('#bkclear',()=>{ edSel.clear(); render(); });
  }
  bindBulk();
  // Filas
  $$('[data-dup]').forEach(b=>b.onclick=()=>{ const c=byId(b.dataset.dup), n=edNewIdea(p,c.date); Object.assign(n,{title:c.title?c.title+' (copia)':'',desc:c.desc,channel:c.channel,format:c.format,campaign:c.campaign,objective:c.objective,intent:c.intent,owner:c.owner}); render(); toast('Idea duplicada'); });
  $$('[data-del]').forEach(b=>b.onclick=()=>{ const arr=M().contents, i=arr.findIndex(c=>c.id===b.dataset.del), c=arr[i]; arr.splice(i,1); edSel.delete(c.id); render(); toast('Idea eliminada',()=>{ M().contents.splice(i,0,c); render(); }); });
  $$('[data-cm]').forEach(b=>b.onclick=()=>edCommentDialog(p,byId(b.dataset.cm)));
  $$('[data-ap]').forEach(b=>b.onclick=()=>edApproveDialog(p,[byId(b.dataset.ap)]));
  $$('[data-adj]').forEach(b=>b.onclick=()=>edAdjustDialog(p,byId(b.dataset.adj)));
  $$('[data-repres]').forEach(b=>b.onclick=()=>{ if(edPresent(p,b.dataset.repres)){ render(); toast('Idea presentada de nuevo'); } });
  $$('[data-prod]').forEach(b=>b.onclick=()=>{ const c=byId(b.dataset.prod); c.status='Borrador'; logAct(`Pasaste a producción «${c.title}»`); render(); toast('En producción: completá copy y archivos desde el editor'); contentEditor(c); });
  $$('[data-open]').forEach(b=>b.onclick=()=>contentEditor(byId(b.dataset.open)));
  on('#psave',()=>{ persist(); edSavedFlash(); toast('Guardado. Las ideas quedan en borrador hasta que toques «Presentar planificación».'); });
  $$('[data-newobj-plan]').forEach(b=>b.onclick=()=>edObjDialog(p));
  on('#addidea',()=>{ const ids=edIdeas(p); const n=edNewIdea(p,ids.length?ids[ids.length-1].date:p.start); redraw(edFocusTitle(n.id)); });
  on('#addloose',()=>{ const loose=M().contents.filter(c=>!c.planId&&c.brand===p.brand&&c.status==='Idea'&&['sin-presentar','ajustes'].includes(c.ideaSt));
    modal('Sumar ideas sueltas',`<p class="small muted" style="margin-bottom:12px">Ideas de ${esc(p.brand)} creadas desde el calendario que todavía no se presentaron.</p><div style="display:flex;flex-direction:column;gap:8px">${loose.map(c=>`<label class="check"><input type="checkbox" value="${c.id}" checked> <span>${esc(c.title||'Sin título')} <span class="small muted">· ${c.format} · ${fdate(c.date)}</span></span></label>`).join('')}</div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="lok">Sumar</button>`);
    $('#lok').onclick=()=>{ const ids=$$('#layer input:checked').map(i=>i.value); ids.forEach(id=>{ const c=byId(id); c.planId=p.id; }); closeLayer(); render(); toast(`Sumaste ${ids.length} idea${ids.length>1?'s':''}. Quedan guardadas en borrador hasta que toques «Presentar planificación».`); }; });
  on('#present',()=>{ const n=edIdeas(p).filter(c=>['sin-presentar','ajustes'].includes(c.ideaSt)).length;
    modal('Presentar planificación',`<p>Se presentan <b>${n} idea${n>1?'s':''}</b> de «${esc(p.name)}» a <b>${esc(p.approver||'—')}</b> como versión <b>${(p.version||0)+1}</b>.</p><p class="small muted" style="margin-top:8px">Mientras están en revisión no se pueden editar. Las ideas que se aprueben quedan listas para producción; las observadas vuelven con el comentario del aprobador.</p>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="pok">Presentar</button>`);
    $('#pok').onclick=()=>{ closeLayer(); if(edPresent(p)){ render(); toast(`Presentaste «${p.name}» (versión ${p.version})`); } else { render(); const n=document.querySelector('.ed-notice'); if(n) n.scrollIntoView({block:'center',behavior:'smooth'}); } }; });
  on('#apall',()=>edApproveDialog(p,edIdeas(p).filter(c=>c.ideaSt==='presentada')));
  on('#pedit',()=>edPlanForm(p));
  on('#pdel',()=>{ const ids=edIdeas(p);
    modal('¿Eliminar la planificación?',`<p>Se elimina «<b>${esc(p.name)}</b>». Sus ${ids.length} idea${ids.length===1?'':'s'} <b>no se borran</b>: quedan como contenidos sueltos en el calendario, con su estado y su historial de aprobaciones.</p>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-danger" id="pdok">Eliminar</button>`);
    $('#pdok').onclick=()=>{ ids.forEach(c=>{ c.planId=null; }); const m=M(); m.editorialPlans=edPlans().filter(x=>x!==p); edRecord({kind:'plan',decision:'eliminada',targetId:p.id,planId:p.id,version:p.version||0,comment:p.name}); closeLayer(); go('#/app/contenidos/planificaciones'); toast('Planificación eliminada'); }; });
}

/* ---------- Diálogos de aprobación ---------- */
function edApproveDialog(p,ideas){
  ideas=ideas.filter(Boolean); if(!ideas.length) return; if(!edCanApprove(p)) return toast('No sos aprobador de esta planificación');
  const ob=edOnBehalf(p);
  modal(`Aprobar ${ideas.length} idea${ideas.length>1?'s':''}`,`<ul class="ed-aplist">${ideas.map(c=>`<li><b>${esc(c.title)}</b> <span class="small muted">· ${c.format} · ${c.channel} · ${fdate(c.date)}</span></li>`).join('')}</ul>
   <div class="field" style="margin-top:12px"><label for="apc">Comentario (opcional)</label><textarea class="input" id="apc" rows="2" placeholder="Ej.: Prioricen los reels de la primera semana"></textarea></div>
   ${ob?`<p class="small muted">Vas a aprobar en nombre de <b>${esc(ob)}</b>. Queda registrado.</p>`:''}`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="apok">${ic('check')} Aprobar</button>`);
  $('#apok').onclick=()=>{ edApprove(ideas,p,$('#apc').value.trim()); ideas.forEach(c=>edSel.delete(c.id)); closeLayer(); render(); toast(`Aprobaste ${ideas.length} idea${ideas.length>1?'s':''}: listas para producción`); };
}
function edAdjustDialog(p,c){
  if(!c) return; if(!edCanApprove(p)) return toast('No sos aprobador de esta planificación');
  modal('Pedir ajuste',`<p style="margin-bottom:12px"><b>${esc(c.title)}</b> <span class="small muted">· ${c.format} · ${fdate(c.date)}</span></p><div class="field"><label for="adj">¿Qué hay que ajustar?</label><textarea class="input" id="adj" rows="3" placeholder="Ej.: Cambiar el enfoque a convertir y sumar el precio"></textarea><span class="err" role="alert"></span></div><p class="small muted">Las demás ideas siguen su curso: este pedido no las frena.</p>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="adok">Pedir ajuste</button>`);
  $('#adok').onclick=()=>{ const v=$('#adj').value.trim(); if(!fieldErr($('#adj'),!v?'Escribí qué hay que ajustar':'')) return; edAdjust(c,p,v); edSel.delete(c.id); closeLayer(); render(); toast('Pediste un ajuste'); };
}
function edCommentDialog(p,c){
  if(!c) return;
  modal(`Comentarios · ${esc(c.title||'Idea')}`,`<div class="comments">${(c.comments||[]).map(x=>`<div class="comment"><span class="avatar sm">${initials(x.who)}</span><div class="bubble"><b>${esc(x.who)}</b> <span class="small muted">${esc(x.when)}</span><div>${esc(x.t)}</div></div></div>`).join('')||'<p class="small muted">Sin comentarios todavía.</p>'}</div>
   <div class="field" style="margin-top:12px"><label for="cmt">Nuevo comentario</label><textarea class="input" id="cmt" rows="2"></textarea><span class="err" role="alert"></span></div>`,`<button class="btn" data-close>Cerrar</button><button class="btn btn-primary" id="cmok">Comentar</button>`);
  $('#cmok').onclick=()=>{ const v=$('#cmt').value.trim(); if(!fieldErr($('#cmt'),!v?'Escribí un comentario':'')) return; edComment(c,p,v); closeLayer(); render(); toast('Comentario agregado'); };
}
function edPlanForm(p){
  const isNew=!p, mems=OWNERS();
  if(!S.brands.length) return toast('Primero creá una marca');
  const b0=p?p.brand:(curBrand()||S.brands[0]).name;
  modal(isNew?'Nueva planificación':'Editar planificación',`${isNew?`<div class="form-grid"><div class="field"><label for="pbr">Marca</label><select class="select" id="pbr">${S.brands.map(b=>`<option ${b.name===b0?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div>
   <div class="field"><label for="pty">Período</label><select class="select" id="pty"><option value="semana">Semanal</option><option value="mes">Mensual</option></select></div></div>
   <div class="field"><label for="pfr">Desde</label><input class="input" type="date" id="pfr" value="${iso(addDays(NOW,7-((NOW.getDay()+6)%7)))}"><span class="hint" id="prng"></span></div>`:''}
   ${F('pnm','Nombre',`value="${esc(p?p.name:'')}" placeholder="Se completa con el período"`)}
   <div class="form-grid"><div class="field"><label for="pow">Responsable de planificación</label><select class="select" id="pow">${mems.map(o=>`<option ${o===(p?p.owner:S.user.name)?'selected':''}>${esc(o)}</option>`).join('')}</select></div>
   <div class="field"><label for="pap">Aprobador estratégico</label><select class="select" id="pap">${mems.map(o=>`<option ${o===(p?p.approver:S.user.name)?'selected':''}>${esc(o)}</option>`).join('')}</select></div></div>`,
   `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="pok">${isNew?'Crear':'Guardar'}</button>`);
  let auto=true;
  const upd=()=>{ if(!isNew) return; const r=edPeriod($('#pty').value,$('#pfr').value); $('#prng').textContent=`${edRange(r)}`; if(auto) $('#pnm').value=r.name; };
  if(isNew){ $('#pty').onchange=upd; $('#pfr').onchange=upd; $('#pnm').oninput=()=>{auto=false}; upd(); }
  $('#pok').onclick=()=>{ const nm=$('#pnm').value.trim(); if(!fieldErr($('#pnm'),!nm?'Poné un nombre':'')) return;
    if(isNew){ const r=edPeriod($('#pty').value,$('#pfr').value);
      const np={id:uid(),brand:$('#pbr').value,type:$('#pty').value,start:r.start,end:r.end,name:nm,owner:$('#pow').value,approver:$('#pap').value,version:0,created:new Date().toISOString()};
      edPlans().unshift(np); const first=edNewIdea(np,np.start); logAct(`Creaste la planificación «${nm}»`); closeLayer(); go('#/app/contenidos/planificaciones/'+np.id); setTimeout(edFocusTitle(first.id),60); return; }
    p.name=nm; p.owner=$('#pow').value; p.approver=$('#pap').value; closeLayer(); render(); toast('Planificación actualizada'); };
}

/* ---------- Vista: Aprobaciones ---------- */
let edApSel=new Set();
function vApprovals(){
  const m=M(), plans=edPlans().filter(p=>!curBrand()||p.brand===curBrand().name);
  const groups=plans.map(p=>({p,pend:edIdeas(p).filter(c=>c.ideaSt==='presentada'),adj:edIdeas(p).filter(c=>c.ideaSt==='ajustes')}));
  const pend=groups.filter(g=>g.pend.length), adj=groups.filter(g=>g.adj.length);
  const drafts=groups.map(g=>({p:g.p,n:edIdeas(g.p).filter(c=>c.ideaSt==='sin-presentar').length})).filter(d=>d.n);
  const hidden=curBrand()?edPlans().filter(x=>x.brand!==curBrand().name).reduce((a,x)=>a+edIdeas(x).filter(c=>c.ideaSt==='presentada').length,0):0;
  const total=pend.reduce((a,g)=>a+g.pend.length,0), selN=[...edApSel].filter(id=>pend.some(g=>g.pend.some(c=>c.id===id))).length;
  const row=(g,c,can)=>{ const cp=m.campaigns.find(x=>x.id===c.campaign), ob=m.objectives.find(x=>x.id===c.objective);
    return `<tr><td class="ed-c-sel">${can?`<input type="checkbox" data-asel="${c.id}" ${edApSel.has(c.id)?'checked':''} aria-label="Seleccionar ${esc(c.title)}">`:''}</td><td class="ed-c-idea" data-l="Idea"><b>${esc(c.title)}</b>${c.desc?`<div class="small muted ed-desc-ro">${esc(c.desc)}</div>`:''}<div class="ed-acts ed-acts-in">${can?`<button class="btn btn-sm btn-primary" data-aap="${c.id}" data-plan="${g.p.id}">${ic('check')} Aprobar</button><button class="btn btn-sm" data-aadj="${c.id}" data-plan="${g.p.id}">Pedir ajuste</button>`:''}<button class="icon-btn" data-acm="${c.id}" data-plan="${g.p.id}" aria-label="Comentar">${ic('message')}${(c.comments||[]).length?`<span class="ed-cmn">${c.comments.length}</span>`:''}</button></div></td>
     <td data-l="Fecha" class="mono small">${fdate(c.date)}</td><td data-l="Canal y formato">${c.channel} · ${c.format}</td><td data-l="Campaña u objetivo" class="small">${cp?esc(cp.name):''}${cp&&ob?'<br>':''}${ob?`<span class="muted">${esc(ob.title)}</span>`:''}</td><td data-l="Intención">${edIntentLabel(c.intent)}</td><td data-l="Responsable">${esc(c.owner||'—')}</td>
</tr>`; };
  return `<div class="toolbar"><p class="muted grow">Planificaciones e ideas que esperan aprobación estratégica. Podés aprobar en bloque; los ajustes no frenan a las demás ideas.</p>${selN?`<button class="btn btn-primary" id="aapsel">${ic('check')} Aprobar seleccionadas (${selN})</button>`:''}</div>
  <section style="margin-bottom:24px"><h3 style="margin-bottom:12px">Para aprobar <span class="small muted">(${total})</span></h3>
  ${pend.length?pend.map(g=>{ const can=edCanApprove(g.p), ob=edOnBehalf(g.p);
    return `<div class="card ed-agroup"><div class="card-head"><div><a href="#/app/contenidos/planificaciones/${g.p.id}"><b>${esc(g.p.name)}</b></a><div class="small muted"><i class="sdot" style="background:${brandOf(g.p.brand).color};display:inline-block;margin-right:6px"></i>${esc(g.p.brand)} · ${edRange(g.p)} · <span class="mono">v${g.p.version}</span> · aprueba ${esc(g.p.approver||'—')}${can?(ob?` · <span class="badge badge-brand">Podés aprobar en su nombre</span>`:` · <span class="badge badge-brand">Te toca</span>`):''}</div></div>
      ${can?`<button class="btn btn-sm" data-aall="${g.p.id}">${ic('check')} Aprobar todas (${g.pend.length})</button>`:''}</div>
      <div class="table-wrap"><table class="t ed-table ed-atable"><thead><tr><th></th><th>Idea</th><th>Fecha</th><th>Canal y formato</th><th>Campaña u objetivo</th><th>Intención</th><th>Responsable</th></tr></thead><tbody>${g.pend.map(c=>row(g,c,can)).join('')}</tbody></table></div></div>`; }).join('')
   :`<div class="card empty"><div class="eico">${ic('check')}</div><h3>No hay nada para aprobar${curBrand()?` en ${esc(curBrand().name)}`:''}</h3><p class="muted small">${drafts.length?'Las ideas aparecen acá cuando se presenta su planificación. Abajo están las que todavía no se presentaron.':'Cuando alguien presente una planificación, sus ideas aparecen acá.'}</p></div>`}
  ${hidden?`<div class="alert alert-info" style="margin-top:12px">${ic('info')}<div>Hay <b>${hidden} idea${hidden>1?'s':''} para aprobar en otras marcas</b>. El selector de marca está mostrando solo ${esc(curBrand().name)}. <button class="btn btn-sm btn-ghost" id="apallbrands">Ver todas las marcas</button></div></div>`:''}</section>
  ${drafts.length?`<section style="margin-bottom:24px"><h3 style="margin-bottom:12px">Sin presentar <span class="small muted">(${drafts.reduce((a,d)=>a+d.n,0)})</span></h3><div class="card" style="padding:8px 20px">${drafts.map(d=>`<div class="ed-adj"><div style="min-width:0"><b>${esc(d.p.name)}</b> <span class="small muted">· ${esc(d.p.brand)} · ${d.n} idea${d.n>1?'s':''} en borrador · aprueba ${esc(d.p.approver||'—')}</span></div><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-sm" href="#/app/contenidos/planificaciones/${d.p.id}">Abrir</a><button class="btn btn-sm btn-primary" data-apresent="${d.p.id}">Presentar</button></div></div>`).join('')}</div></section>`:''}
  <section style="margin-bottom:24px"><h3 style="margin-bottom:12px">Ajustes pedidos <span class="small muted">(${adj.reduce((a,g)=>a+g.adj.length,0)})</span></h3>
  ${adj.length?`<div class="card" style="padding:8px 20px">${adj.map(g=>g.adj.map(c=>{ const last=[...(c.comments||[])].reverse().find(x=>/^Ajuste pedido:/.test(x.t)); return `<div class="ed-adj"><div style="min-width:0"><b>${esc(c.title)}</b> <span class="small muted">· ${esc(g.p.name)}</span>${last?`<div class="small">${esc(last.t.replace(/^Ajuste pedido:\s*/,''))} <span class="muted">— ${esc(last.who)}, ${esc(last.when)}</span></div>`:''}</div><a class="btn btn-sm" href="#/app/contenidos/planificaciones/${g.p.id}">Ir a la planificación</a></div>`; }).join('')).join('')}</div>`:'<p class="small muted">Sin ajustes pendientes.</p>'}</section>
  <p class="small muted">La aprobación creativa de copys y piezas se suma a esta bandeja en la Fase 2.</p>`;
}
function bApprovals(){
  const byId=id=>M().contents.find(c=>c.id===id), plan=id=>edPlans().find(p=>p.id===id);
  const ab=$('#apallbrands'); if(ab) ab.onclick=()=>{ S.brand=-1; render(); };
  $$('[data-apresent]').forEach(b=>b.onclick=()=>{ const p=plan(b.dataset.apresent);
    if(edPresent(p)){ render(); toast(`Presentaste «${p.name}» (versión ${p.version})`); }
    else { go('#/app/contenidos/planificaciones/'+p.id); toast('Faltan datos: te marcamos qué completar en cada idea'); } });
  $$('[data-asel]').forEach(ch=>ch.onchange=()=>{ ch.checked?edApSel.add(ch.dataset.asel):edApSel.delete(ch.dataset.asel); render(); });
  $$('[data-aap]').forEach(b=>b.onclick=()=>edApproveDialog(plan(b.dataset.plan),[byId(b.dataset.aap)]));
  $$('[data-aadj]').forEach(b=>b.onclick=()=>edAdjustDialog(plan(b.dataset.plan),byId(b.dataset.aadj)));
  $$('[data-acm]').forEach(b=>b.onclick=()=>edCommentDialog(plan(b.dataset.plan),byId(b.dataset.acm)));
  $$('[data-aall]').forEach(b=>b.onclick=()=>{ const p=plan(b.dataset.aall); edApproveDialog(p,edIdeas(p).filter(c=>c.ideaSt==='presentada')); });
  const s=$('#aapsel'); if(s) s.onclick=()=>{
    // Aprobación en bloque entre planificaciones: se agrupa por planificación para registrar bien aprobador y versión
    const sel=[...edApSel].map(byId).filter(c=>c&&c.ideaSt==='presentada'), byPlan={}; sel.forEach(c=>(byPlan[c.planId]=byPlan[c.planId]||[]).push(c));
    const plans=Object.keys(byPlan).map(plan).filter(p=>edCanApprove(p)); const n=plans.reduce((a,p)=>a+byPlan[p.id].length,0);
    modal(`Aprobar ${n} idea${n>1?'s':''}`,`<p>De ${plans.length} planificaci${plans.length>1?'ones':'ón'}: ${plans.map(p=>`<b>${esc(p.name)}</b> (${byPlan[p.id].length})`).join(', ')}.</p><div class="field" style="margin-top:12px"><label for="apc">Comentario (opcional)</label><textarea class="input" id="apc" rows="2"></textarea></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="apok">${ic('check')} Aprobar</button>`);
    $('#apok').onclick=()=>{ const cm=$('#apc').value.trim(); plans.forEach(p=>edApprove(byPlan[p.id],p,cm)); edApSel.clear(); closeLayer(); render(); toast(`Aprobaste ${n} idea${n>1?'s':''}`); }; };
}

/* ---------- Integración con Contenidos ---------- */
const _vContenidos=vContenidos, _bContenidos=bContenidos;
vContenidos=function(view){
  edMigrate(M());
  const head=edHead();
  if(view==='planificaciones'){ const id=location.hash.split('/')[4]||''; return head+edTabs('planificaciones')+(id?vPlanDetail(id):vPlanList()); }
  if(view==='aprobaciones') return head+edTabs('aprobaciones')+vApprovals();
  const h=_vContenidos(view), v=['mes','semana','lista'].includes(view)?view:'mes';
  return h.startsWith(head)?head+edTabs(v)+h.slice(head.length):h;
};
bContenidos=function(view){
  _bContenidos(view);
  if(view==='planificaciones'){ const id=location.hash.split('/')[4]||'';
    [$('#newplan'),...$$('[data-newplan]')].filter(Boolean).forEach(b=>b.onclick=()=>edPlanForm());
    $$('[data-plan]').forEach(r=>{ if(r.tagName==='TR') r.onclick=()=>go('#/app/contenidos/planificaciones/'+r.dataset.plan); });
    if(id){ const p=edPlans().find(x=>x.id===id); if(p) bPlanDetail(p); } }
  if(view==='aprobaciones') bApprovals();
};
VIEWS.contenidos.view=vContenidos; VIEWS.contenidos.bind=bContenidos;

/* Editor existente: una idea no aprobada no pasa a producción */
const _flowActions=flowActions;
flowActions=function(c){
  cNorm(c);
  if(c.status==='Idea'&&c.ideaSt!=='aprobada'){
    const why=c.ideaSt==='presentada'?'En revisión estratégica: se puede pasar a producción cuando se apruebe.':c.ideaSt==='ajustes'?'Tiene ajustes pedidos: corregila en su planificación y volvé a presentarla.':'Para pasar a producción, sumala a una planificación y presentala (Contenidos → Planificaciones).';
    return `<span class="small muted ed-flow-note">${why}</span><button class="btn" data-act="save">Guardar idea</button>`;
  }
  return _flowActions(c);
};

/* Campañas: objetivo estratégico vinculado (se hereda en los contenidos) */
function edCampObjField(d){ const objs=M().objectives.filter(o=>o.brand===d.brand); return `<div class="field"><label for="wobj">Objetivo estratégico</label><select class="select" id="wobj"><option value="">Sin objetivo</option>${objs.map(o=>`<option value="${o.id}" ${o.id===d.objectiveId?'selected':''}>${esc(o.title)} · ${esc(o.period)}</option>`).join('')}</select><span class="hint">Los contenidos de esta campaña lo heredan automáticamente.</span></div>`; }
function edCampObjDd(c){ campNorm(c,M()); const o=M().objectives.find(x=>x.id===c.objectiveId); return `${o?`<a href="#/app/estrategia/okr">${esc(o.title)}</a>`:'Sin objetivo'} <button type="button" class="btn btn-ghost btn-sm" data-campobj="${c.id}">Cambiar</button>${c.objInferred&&o?'<div class="small muted">Detectado por los vínculos existentes</div>':''}`; }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-campobj]'); if(!b) return;
  const c=M().campaigns.find(x=>x.id===b.dataset.campobj); if(!c) return; const objs=M().objectives.filter(o=>o.brand===c.brand);
  modal('Objetivo estratégico de la campaña',`<div class="field"><label for="cobj">Objetivo</label><select class="select" id="cobj"><option value="">Sin objetivo</option>${objs.map(o=>`<option value="${o.id}" ${o.id===c.objectiveId?'selected':''}>${esc(o.title)} · ${esc(o.period)}</option>`).join('')}</select><span class="hint">Los contenidos nuevos de la campaña lo heredan. Los existentes no cambian.</span></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="cobok">Guardar</button>`);
  $('#cobok').onclick=()=>{ c.objectiveId=$('#cobj').value; c.objInferred=false; logAct(`Vinculaste la campaña ${c.name} a un objetivo`); closeLayer(); render(); toast('Objetivo actualizado'); }; });

/* Campos de fecha: el selector se abre al tocar todo el campo, no solo el ícono */
document.addEventListener('click',e=>{ const i=e.target; if(i&&i.tagName==='INPUT'&&i.type==='date'&&!i.disabled&&typeof i.showPicker==='function'){ try{ i.showPicker(); }catch(_){} } });

render();
