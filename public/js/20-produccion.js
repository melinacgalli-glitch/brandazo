/* =====================================================================
   PLANIFICACIONES · QUIÉN PRODUCE
   Asigna de una vez a la persona que produce todos los contenidos de una planificación que todavía
   no están terminados (no pasaron a «En revisión»). Es el «Responsable» de cada contenido: a esa
   persona le llega el recordatorio diario y, cuando termina todo, le llega el aviso a quien aprueba.
   ===================================================================== */
const PROD_DONE=['Revisión','Aprobado','Programado','Publicado'];
function prodDialog(p){
  const ideas=edIdeas(p).filter(c=>!PROD_DONE.includes(c.status));
  const team=[...new Set(S.members.filter(m=>m.status==='Activo'||!m.status).map(m=>m.name||m.email).filter(Boolean))];
  const cur=[...new Set(ideas.map(c=>c.owner).filter(Boolean))];
  modal('¿Quién produce esta planificación?',`<p class="small muted" style="margin-bottom:12px">Se asigna a los ${ideas.length} contenido${ideas.length===1?'':'s'} que todavía no están terminados. A esa persona le llega cada mañana un recordatorio con lo que le falta, y a quien aprueba le avisamos cuando termina todo.</p>
   <div class="field"><label for="prw">Persona</label><select class="select" id="prw">${team.map(n=>`<option ${cur.length===1&&cur[0].toLowerCase()===n.toLowerCase()?'selected':''}>${esc(n)}</option>`).join('')}</select></div>
   ${cur.length?`<p class="small muted">Hoy: ${esc(cur.join(', '))}.</p>`:''}`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="prok">Asignar</button>`);
  $('#prok').onclick=()=>{ const w=$('#prw').value; ideas.forEach(c=>{ c.owner=w; }); persist(); layerDirty=false; closeLayer(); render(); toast(`${ideas.length} contenido${ideas.length===1?'':'s'} asignado${ideas.length===1?'':'s'} a ${w}`); };
}
(function(){
  if(typeof vPlanDetail!=='function') return;
  const _v=vPlanDetail;
  vPlanDetail=function(id){ const h=_v(id), p=edPlans().find(x=>x.id===id); if(!p) return h;
    const ideas=edIdeas(p).filter(c=>!PROD_DONE.includes(c.status)); if(!ideas.length) return h;
    const who=[...new Set(ideas.map(c=>c.owner).filter(Boolean))];
    const btn=`<button class="btn" data-prodall="${esc(id)}">${ic('users')} Quién produce${who.length===1?`: ${esc(who[0])}`:''}</button>`;
    return h.replace('<button class="btn btn-primary" id="present"',btn+'<button class="btn btn-primary" id="present"'); };
  document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-prodall]'); if(!b) return; e.preventDefault(); const p=edPlans().find(x=>x.id===b.dataset.prodall); if(p) prodDialog(p); });
})();

/* ---------- Quien aprueba: automático y nunca la misma persona que planifica (salvo Dueño/Admin) ---------- */
const edRoleOf=n=>{ const m=S.members.find(x=>(x.name||x.email||'').toLowerCase()===String(n||'').toLowerCase()); return m?m.role:''; };
const edBoss=()=>{ const m=S.members.find(x=>x.role==='Dueño')||S.members.find(x=>x.role==='Admin'); return m?(m.name||m.email):''; };
const edSelfApprove=(owner,approver)=>!!owner&&String(owner).toLowerCase()===String(approver||'').toLowerCase()&&!['Dueño','Admin'].includes(edRoleOf(owner));
(function(){
  if(typeof edPlanForm!=='function') return;
  const _pf=edPlanForm;
  edPlanForm=function(p){ _pf(p); const ow=$('#pow'), ap=$('#pap'), ok=$('#pok'); if(!ow||!ap||!ok) return;
    const boss=edBoss(), pick=v=>{ const o=[...ap.options].find(x=>x.value.toLowerCase()===String(v).toLowerCase()); if(o) ap.value=o.value; };
    const fix=()=>{ if(boss&&edSelfApprove(ow.value,ap.value)) pick(boss); };
    if(!p&&boss&&!['Dueño','Admin'].includes(edRoleOf(S.user.name))) pick(boss); // nueva: aprueba la dueña
    fix(); ow.addEventListener('change',fix);
    const orig=ok.onclick;
    const fld=ap.closest('.field'); if(fld&&!fld.querySelector('.err')) fld.insertAdjacentHTML('beforeend','<span class="err" role="alert"></span>');
    ok.onclick=e=>{ if(edSelfApprove(ow.value,ap.value)) return fieldErr(ap,`Elegí a otra persona: quien planifica no puede aprobar su propia planificación${boss?` (por ejemplo, ${boss})`:''}.`); fieldErr(ap,''); return orig(e); };
  };
  /* Aviso en las planificaciones que ya quedaron con la misma persona */
  const _vd=vPlanDetail;
  vPlanDetail=function(id){ const h=_vd(id), p=edPlans().find(x=>x.id===id), boss=edBoss(); if(!p||!boss||!edSelfApprove(p.owner,p.approver)) return h;
    const warn=`<div class="alert alert-warn" style="margin:0 0 12px">${ic('alert')}<div><b>${esc(p.owner)}</b> planifica y también figura como quien aprueba. Lo tiene que aprobar otra persona. <button type="button" class="btn btn-sm" data-fixapprover="${esc(id)}">Que apruebe ${esc(boss)}</button></div></div>`;
    const i=h.indexOf('<div class="alert'); return i>0?h.slice(0,i)+warn+h.slice(i):warn+h; };
  document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-fixapprover]'); if(!b) return; e.preventDefault(); const p=edPlans().find(x=>x.id===b.dataset.fixapprover), boss=edBoss(); if(!p||!boss) return;
    p.approver=boss; persist(); render(); toast(`Ahora aprueba ${boss}`); });
})();

/* ---------- Aviso «Planificación lista para presentar» ----------
   Cuando todas las ideas sin presentar están completas, aparece un aviso abajo a la derecha
   (y un recuadro en la planificación) con «Presentar ahora». Si lo cierra, vuelve a aparecer
   solo si cambia la cantidad de ideas listas. */
const ED_READY_SEEN={};
function edReadyInfo(p){ const ideas=edIdeas(p), todo=ideas.filter(c=>['sin-presentar','ajustes'].includes(c.ideaSt));
  return { n:todo.length, ready:todo.length>0&&todo.every(c=>!edMissing(c).length) }; }
function edReadyPush(p){
  const r=edReadyInfo(p), old=document.getElementById('edready'); if(old) old.remove();
  if(!r.ready||ED_READY_SEEN[p.id]===r.n) return;
  const who=p.approver&&p.approver!==S.user.name?p.approver:'';
  document.body.insertAdjacentHTML('beforeend',`<div class="ed-ready" id="edready" role="status"><div class="ed-ready-ic">${ic('check')}</div><div class="ed-ready-b"><b>¡Planificación lista!</b><span>Completaste ${r.n===1?'la idea':`las ${r.n} ideas`} de «${esc(p.name)}». ${who?`Presentala para que ${esc(who)} la apruebe.`:'Presentala para enviarla a aprobación.'}</span>
    <div class="ed-ready-a"><button class="btn btn-sm btn-primary" data-edready="go">Presentar ahora</button><button class="btn btn-sm btn-ghost" data-edready="later">Más tarde</button></div></div></div>`);
}
(function(){
  if(typeof edSavedFlash!=='function') return;
  const curPlan=()=>{ const m=location.hash.match(/^#\/app\/contenidos\/planificaciones\/([^/?]+)/); return m?edPlans().find(x=>x.id===m[1]):null; };
  const _sf=edSavedFlash;
  edSavedFlash=function(){ _sf(); const p=curPlan(); if(p) edReadyPush(p); };
  const _vd=vPlanDetail;
  vPlanDetail=function(id){ const h=_vd(id), p=edPlans().find(x=>x.id===id); setTimeout(()=>{ const q=curPlan(); if(q) edReadyPush(q); else { const o=document.getElementById('edready'); if(o) o.remove(); } },0);
    if(!p) return h; const r=edReadyInfo(p); if(!r.ready) return h;
    const box=`<div class="alert alert-ok" style="margin:0 0 12px">${ic('check')}<div><b>Lista para presentar.</b> ${r.n===1?'La idea está completa':`Las ${r.n} ideas están completas`}: tocá «Presentar planificación» para enviarla a aprobación.</div></div>`;
    const i=h.indexOf('<div class="alert'); return i>0?h.slice(0,i)+box+h.slice(i):h; };
  document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-edready]'); if(!b) return; const p=curPlan(), box=document.getElementById('edready');
    if(p) ED_READY_SEEN[p.id]=edReadyInfo(p).n; if(box) box.remove();
    if(b.dataset.edready==='go'){ const pr=document.getElementById('present'); if(pr&&!pr.disabled) pr.click(); } });
  window.addEventListener('hashchange',()=>{ if(!/planificaciones\//.test(location.hash)){ const o=document.getElementById('edready'); if(o) o.remove(); } });
})();
