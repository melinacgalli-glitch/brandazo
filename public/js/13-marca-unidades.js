/* =====================================================================
   MARCA ÚNICA CON UNIDADES DE NEGOCIO
   - La identidad (logo, colores, tipografías, tono, manual, biblioteca) es UNA: la de la marca principal
     (p. ej. «Cafelito»). La pantalla Marca ya no se separa por unidad.
   - Lo que cambia por unidad es lo estratégico: posicionamiento, pilares, buyer personas, objetivos,
     funnels y campañas.
   - Filtro de unidad en las pantallas (en lugar del cartel fijo «Todas las unidades»).
   - Objetivos editables (incluida su unidad). Funnel: se elige la unidad y después el objetivo.
   - CRM: colores tipo semáforo por etapa.
   ===================================================================== */
const MARCA_KIT='__marca';
/* Pilares disponibles para una unidad: los suyos + los de la marca principal (sin repetir) */
function unitPillars(unit){ const m=M(), own=((m.positioning||{})[unit]||{}).pillars||[], main=((m.positioning||{})[MAIN_KEY]||{}).pillars||[];
  return [...new Set([...own,...main])]; }

/* ---------- Filtro de unidad de negocio ---------- */
brandScope=function(){
  if(!S.brands.length) return '';
  return `<label class="unit-filter" title="Filtrar por unidad de negocio">${ic('grid')}<span class="sr">Unidad de negocio</span><select class="select sm" data-unitfilter aria-label="Unidad de negocio"><option value="-1">Todas las unidades</option>${S.brands.map((b,i)=>`<option value="${i}" ${S.brand===i?'selected':''}>${esc(b.name)}</option>`).join('')}</select></label>`;
};
document.addEventListener('change',e=>{ if(e.target.matches&&e.target.matches('[data-unitfilter]')){ S.brand=+e.target.value; render(); } });

/* ---------- Marca: una sola identidad (la de la marca principal) ---------- */
(function(){
  const _kitFor=kitFor;
  kitFor=function(b){
    if(!b||!b.__main) return _kitFor(b);
    const m=M(); if(!m.kits) m.kits={};
    if(!m.kits[MARCA_KIT]){
      // Primera vez: se toma la identidad que ya se había cargado en alguna unidad (la más completa)
      const score=k=>k?((k.files||[]).length*3+(k.logos?Object.keys(k.logos).length*5:0)+((k.info||{}).desc?4:0)+((k.colors||[]).length)+((k.messages||[]).length)+((k.voice||{}).tone||[]).length):-1;
      const best=Object.keys(m.kits).filter(k=>k!==MARCA_KIT).sort((a,b)=>score(m.kits[b])-score(m.kits[a]))[0];
      m.kits[MARCA_KIT]=best?JSON.parse(JSON.stringify(m.kits[best])):{info:{desc:'',web:'',industry:'',since:''},colors:[['Principal',b.color]],fonts:[],voice:{tone:[],do:[],dont:[]},messages:[],files:[]};
    }
    return m.kits[MARCA_KIT];
  };
  const mainUnit=()=>({name:mainName(),color:((M().kits||{})[MARCA_KIT]||{colors:[[0,'#FF2D87']]}).colors[0][1]||'#FF2D87',__main:true});
  const withMain=fn=>function(...a){ const rc=curBrand, rs=brandScope, mb=mainUnit(); curBrand=()=>mb; brandScope=()=>`<span class="badge">Marca · ${esc(mb.name)}</span>`;
    try{ return fn.apply(this,a); } finally{ curBrand=rc; brandScope=rs; } };
  const V=VIEWS.marca, _v=V.view, _b=V.bind;
  V.view=withMain(function(tab){ return _v.call(this,tab)
    .replace(/<button class="btn" id="newbrand">[\s\S]*?<\/button>/,'')
    .replace('Identidad, tono y recursos de cada unidad de negocio, listos para usar en contenidos y campañas.',`La identidad de ${esc(mainName())}: es la misma para todas sus unidades de negocio. Lo que cambia por unidad (mensaje, público, campañas) está en Estrategia.`); });
  V.bind=withMain(_b);
  // La unidad de negocio no tiene logo propio (usa el de la marca): se quita el campo del formulario de unidad
  const _bm=brandModal;
  brandModal=function(i){ _bm(i); const up=$('#layer .upload'); if(up){ const f=up.closest('.field'); if(f) f.innerHTML=`<p class="small muted">La unidad usa la identidad de ${esc(mainName())} (logo, colores, tipografías). Lo propio de la unidad se carga en Estrategia: posicionamiento, buyer personas, objetivos y campañas.</p>`; } };
})();

/* ---------- Objetivos editables (incluida la unidad de negocio) ---------- */
function objEdit(o){
  const periods=[...new Set(['Q4 2026','Q1 2027','Q2 2027','2027','Diciembre 2026',o.period].filter(Boolean))];
  modal('Editar objetivo',`${F('eot','Objetivo',`value="${esc(o.title)}"`)}<div class="form-grid"><div class="field"><label for="eob">Unidad de negocio</label><select class="select" id="eob">${S.brands.map(b=>`<option ${b.name===o.brand?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div><div class="field"><label for="eop">Período</label><select class="select" id="eop">${periods.map(p=>`<option ${p===o.period?'selected':''}>${esc(p)}</option>`).join('')}</select></div></div>
   <div class="field"><label for="eow">Responsable</label><input class="input" id="eow" value="${esc(o.owner||'')}"></div><p class="small muted" id="eonote"></p>`,
   `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="eok">Guardar</button>`);
  const camps=()=>M().campaigns.filter(c=>c.objectiveId===o.id&&c.brand!==$('#eob').value);
  $('#eob').onchange=()=>{ const n=camps().length; $('#eonote').textContent=n?`${n} campaña${n>1?'s':''} vinculada${n>1?'s':''} a este objetivo son de otra unidad: también pasan a ${$('#eob').value}.`:''; };
  $('#eok').onclick=()=>{ const t=$('#eot'); if(!fieldErr(t,!t.value.trim()?'Escribí el objetivo':'')) return;
    const nb=$('#eob').value, moved=o.brand!==nb; camps().forEach(c=>{ c.brand=nb; });
    Object.assign(o,{title:t.value.trim(),brand:nb,period:$('#eop').value,owner:$('#eow').value.trim()}); layerDirty=false; closeLayer(); render(); toast(moved?`Objetivo guardado: ahora es de ${nb}`:'Objetivo guardado'); };
}
(function(){
  const _oc=objCard;
  objCard=function(o){ const h=_oc(o); const btn=`<button type="button" class="btn btn-sm btn-ghost obj-edit" data-oedit="${o.id}" aria-label="Editar objetivo ${esc(o.title)}">${ic('edit')} Editar</button>`;
    const i=h.lastIndexOf('</'); return i>0?h.slice(0,i)+`<div class="obj-edit-row">${btn}</div>`+h.slice(i):h+btn; };
  document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-oedit]'); if(!b) return; const o=M().objectives.find(x=>x.id===b.dataset.oedit); if(o) objEdit(o); });
})();

/* ---------- Funnel: primero la unidad, después el objetivo ---------- */
(function(){
  const _ff=fForm;
  fForm=function(opts={}){
    _ff(opts); const sel=$('#layer select#fo, #layer select[id^="fo"]'); if(!sel||!$('#fn')) return;
    const cur=M().objectives.find(o=>o.id===sel.value), unit=(cur&&cur.brand)||(curBrand()&&curBrand().name)||(S.brands[0]&&S.brands[0].name);
    sel.closest('.field').insertAdjacentHTML('beforebegin',`<div class="field"><label for="fu">Unidad de negocio</label><select class="select" id="fu">${S.brands.map(b=>`<option ${b.name===unit?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div>`);
    const fill=()=>{ const u=$('#fu').value, keep=sel.value, objs=M().objectives.filter(o=>o.brand===u);
      sel.innerHTML=objs.length?objs.map(o=>`<option value="${o.id}" ${o.id===keep?'selected':''}>${esc(o.title)} · ${esc(o.period)}</option>`).join(''):`<option value="">Esta unidad no tiene objetivos</option>`;
      const h=sel.closest('.field').querySelector('.hint'); if(h&&!objs.length) h.textContent='Creá primero un objetivo para esta unidad en Estrategia → Objetivos.'; };
    $('#fu').onchange=fill; fill();
  };
})();

/* ---------- CRM: semáforo por etapa ---------- */
(function(){
  const COL={'nueva-cotizacion':'#3B82F6',contactado:'#EAB308','en-negociacion':'#A855F7',ganada:'#22C55E',perdida:'#EF4444'};
  const css=Object.entries(COL).map(([k,c])=>`.kcol[data-evstage="${k}"]{border-top:4px solid ${c}}.kcol[data-evstage="${k}"] .ev-card:not(.late){border-left:3px solid ${c}}.kcol[data-evstage="${k}"] .kcol-h b::before{content:"";display:inline-block;width:10px;height:10px;border-radius:50%;background:${c};margin-right:8px;flex:none}`).join('\n');
  const st=document.createElement('style'); st.textContent=css+`
  .ev-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--ink-muted);margin:0 0 12px}.ev-legend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px}
  .stat.st-warn{border-top:4px solid #EAB308}.stat.st-bad{border-top:4px solid #EF4444}.stat.st-bad .v{color:#EF4444}.stat.st-ok{border-top:4px solid #22C55E}.stat.st-ok .v{color:#22C55E}.stat.st-info{border-top:4px solid #3B82F6}`;
  document.head.appendChild(st);
  const _ve=vEventos;
  vEventos=function(){ let h=_ve(); if(!/class="kanban"/.test(h)&&!/stat-grid/.test(h)) return h;
    const late=/Seguimiento vencido<\/div><div class="v" style="color:var\(--warning\)">/.test(h);
    let i=0; h=h.replace(/<div class="stat">/g,()=>{ i++; return `<div class="stat ${['st-info','st-warn',late?'st-bad':'st-ok','st-ok'][i-1]||''}">`; });
    h=h.replace('<div class="kanban">',`<p class="ev-legend" aria-label="Colores de las etapas">${Object.entries(COL).map(([k,c])=>`<span><i style="background:${c}"></i>${esc(evStageName(k))}</span>`).join('')}</p><div class="kanban">`);
    return h; };
})();
