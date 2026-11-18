/* =====================================================================
   PILARES DE COMUNICACIÓN (con descripción y función en el funnel)
   Cada pilar: {name, desc, stage}. Los pilares viejos (solo texto) se siguen leyendo.
   Se usan en el posicionamiento de cada unidad y de la marca principal; en contenidos y
   planificaciones se elige por nombre.
   ===================================================================== */
const PILLAR_STAGES=['Posicionamiento','Atracción','Consideración','Confianza','Conversión','Fidelización'];
const pName=x=>typeof x==='string'?x:(x&&x.name)||'';
const pObj=x=>typeof x==='string'?{name:x,desc:'',stage:''}:{name:x.name||'',desc:x.desc||'',stage:x.stage||''};
function pillarList(key){ const m=M(); m.positioning=m.positioning||{}; m.positioning[key]=m.positioning[key]||{statement:'',value:'',pillars:[],diff:''}; const p=m.positioning[key]; p.pillars=p.pillars||[]; return p.pillars; }
function pillarsBlock(list,key){
  const k=esc(key);
  return `<ol class="pillar-list">${list.map((x,i)=>{ const p=pObj(x); return `<li class="pillar"><span class="pillar-n">${String(i+1).padStart(2,'0')}</span>
     <b class="pillar-t">${esc(p.name)}</b><p class="pillar-d">${p.desc?esc(p.desc):'<span class="muted">Sin descripción</span>'}</p><span class="pillar-st${p.stage?'':' empty'}">${p.stage?esc(p.stage):'Sin etapa'}</span>
     <div class="pillar-a"><button type="button" class="icon-btn" data-pcopy="${k}|${i}" aria-label="Copiar ${esc(p.name)}" title="Copiar">${ic('copy')}</button>
      <button type="button" class="icon-btn" data-pedit="${k}|${i}" aria-label="Editar ${esc(p.name)}" title="Editar">${ic('edit')}</button>
      ${i>0?`<button type="button" class="icon-btn" data-pup="${k}|${i}" aria-label="Subir ${esc(p.name)}" title="Subir">${ic('up')}</button>`:'<span class="icon-btn" aria-hidden="true" style="visibility:hidden"></span>'}
      <button type="button" class="icon-btn" data-pdel="${k}|${i}" aria-label="Borrar ${esc(p.name)}" title="Borrar">${ic('trash')}</button></div></li>`; }).join('')||'<li class="small muted" style="list-style:none">Sin pilares todavía.</li>'}</ol>
   <button type="button" class="btn btn-sm" data-padd="${k}" style="margin-top:12px">${ic('plus')} Agregar pilar</button>`;
}
function pillarForm(key,i){
  const list=pillarList(key), edit=i!=null, p=edit?pObj(list[i]):{name:'',desc:'',stage:''};
  modal(edit?'Editar pilar':'Nuevo pilar',`${F('pln','Nombre del pilar',`value="${esc(p.name)}" placeholder="Ej.: Pastelería de autor" maxlength="60"`)}
   <div class="field"><label for="pld">Qué se comunica</label><textarea class="input" id="pld" rows="2" maxlength="240" placeholder="Ej.: Sabores, recetas, combinaciones, ingredientes y calidad de elaboración.">${esc(p.desc)}</textarea></div>
   <div class="field"><label for="pls">Función en el funnel</label><select class="select" id="pls"><option value="">Elegí una</option>${PILLAR_STAGES.map(s=>`<option ${s===p.stage?'selected':''}>${s}</option>`).join('')}</select><span class="hint small muted">Para qué etapa del recorrido del cliente trabaja este pilar.</span></div>`,
   `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="plok">${edit?'Guardar':'Agregar'}</button>`);
  $('#plok').onclick=()=>{ const n=$('#pln'), v=n.value.trim();
    if(!fieldErr(n,!v?'Escribí el nombre del pilar':list.some((x,j)=>j!==i&&pName(x).toLowerCase()===v.toLowerCase())?'Ya hay un pilar con ese nombre':'')) return;
    const obj={name:v,desc:$('#pld').value.trim(),stage:$('#pls').value};
    if(edit){ const old=pName(list[i]); list[i]=obj; if(old!==v) M().contents.forEach(c=>{ if(c.pillar===old) c.pillar=v; }); } else list.push(obj);
    layerDirty=false; closeLayer(); render(); toast(edit?'Pilar guardado':`Pilar «${v}» agregado`); };
}
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-padd],[data-pedit],[data-pdel],[data-pup],[data-pcopy]'); if(!b) return; e.preventDefault();
  if(b.dataset.padd!=null) return pillarForm(b.dataset.padd);
  const [key,is]=(b.dataset.pedit||b.dataset.pdel||b.dataset.pup||b.dataset.pcopy).split('|'), i=+is, list=pillarList(key), p=pObj(list[i]||'');
  if(b.dataset.pedit!=null) return pillarForm(key,i);
  if(b.dataset.pup!=null){ [list[i-1],list[i]]=[list[i],list[i-1]]; render(); return; }
  if(b.dataset.pcopy!=null){ const t=`${p.name}${p.desc?' — '+p.desc:''}${p.stage?' ('+p.stage+')':''}`; try{ navigator.clipboard.writeText(t).then(()=>toast('Pilar copiado'),()=>toast(t)); }catch(_){ toast(t); } return; }
  if(b.dataset.pdel!=null){ const used=M().contents.filter(c=>c.pillar===p.name).length;
    modal('¿Borrar el pilar?',`<p>Se borra <b>${esc(p.name)}</b>.${used?` ${used} contenido${used>1?'s lo usan':' lo usa'}: van a quedar sin pilar.`:''}</p>`,`<button class="btn" data-close>Volver</button><button class="btn btn-danger" id="pdok">Borrar</button>`);
    $('#pdok').onclick=()=>{ list.splice(i,1); M().contents.forEach(c=>{ if(c.pillar===p.name) c.pillar=''; }); closeLayer(); render(); toast('Pilar borrado'); }; }
});
/* Nombres disponibles para una unidad: los suyos + los de la marca principal */
unitPillars=function(unit){ const m=M(), own=((m.positioning||{})[unit]||{}).pillars||[], main=((m.positioning||{})[MAIN_KEY]||{}).pillars||[];
  return [...new Set([...own,...main].map(pName).filter(Boolean))]; };
