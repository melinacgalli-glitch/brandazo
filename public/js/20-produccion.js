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
