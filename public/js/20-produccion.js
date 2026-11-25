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
