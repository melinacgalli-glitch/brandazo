/* =====================================================================
   UNIDADES DE NEGOCIO (Etapa A)
   - Marca principal (p. ej. «Cafelito») con su propio posicionamiento: M().mainBrand y
     M().positioning.__principal. Cada unidad la ve como referencia arriba del suyo.
   - Las «marcas» de la empresa son sus unidades de negocio (Coffee House, Ambulante, Cakes, Work).
   - Estrategia → «Mapa por unidad»: posicionamiento → buyer personas → objetivos → funnel →
     campañas → ventas, con lo que falta en cada unidad.
   - Renombrar una unidad actualiza todo lo que la nombra (antes se desconectaba).
   ===================================================================== */
const MAIN_KEY='__principal';
function mainBrand(){ const m=M(); m.mainBrand=m.mainBrand||{name:''}; return m.mainBrand; }
function mainPos(){ const m=M(); m.positioning=m.positioning||{}; m.positioning[MAIN_KEY]=m.positioning[MAIN_KEY]||{statement:'',value:'',pillars:[],diff:''}; return m.positioning[MAIN_KEY]; }
const mainName=()=>mainBrand().name||(S.company&&S.company.name)||'Marca principal';

/* ---------- Posicionamiento: marca principal (sin unidad elegida) y referencia en cada unidad ---------- */
(function(){
  const _stPos=stPos;
  stPos=function(objs){
    const b=curBrand();
    if(b){ const mp=mainPos(), h=_stPos(objs);
      const ref=mp.statement?`<details class="card unit-ref" style="margin-bottom:16px"><summary><span class="small muted">Marca principal · ${esc(mainName())}</span> <b>Ver su posicionamiento</b></summary><p class="statement" style="margin-top:12px;font-size:18px;line-height:26px">${esc(mp.statement)}</p>${mp.value?`<p class="small" style="margin-top:8px"><b>Propuesta de valor:</b> ${esc(mp.value)}</p>`:''}${mp.pillars.length?`<div class="pill-list" style="margin-top:8px">${mp.pillars.map(x=>`<span class="pill">${esc(pName(x))}</span>`).join('')}</div>`:''}<p class="small muted" style="margin-top:8px">El posicionamiento de ${esc(b.name)} tiene que ser coherente con este.</p></details>`
        :`<div class="alert alert-info" style="margin-bottom:16px">${ic('info')}<div>Todavía no definiste el posicionamiento de la marca principal${mainBrand().name?` (${esc(mainBrand().name)})`:''}. <button type="button" class="btn btn-sm" data-gomain style="margin-left:8px">Definirlo</button></div></div>`;
      return ref+h; }
    const mp=mainPos(), mb=mainBrand();
    return `<form id="fposm" class="grid g-dash"><section class="card span-8"><div class="card-head"><h3>Posicionamiento de la marca principal</h3><span class="badge">${esc(mainName())}</span></div>
     <p class="small muted" style="margin-bottom:16px">Es el paraguas de todas las unidades de negocio. Para el posicionamiento de una unidad (por ejemplo Cafelito Cakes), elegila arriba a la derecha.</p>
     ${mp.statement?`<p class="statement" style="margin-bottom:20px">${esc(mp.statement)}</p>`:''}
     <div class="field"><label for="mbn">Nombre de la marca principal</label><input class="input" id="mbn" value="${esc(mb.name)}" placeholder="Ej.: Cafelito"><span class="err" role="alert"></span></div>
     <div class="field"><label for="mps">Declaración</label><textarea class="input" id="mps" rows="4" placeholder="Para [público] que [necesidad], [marca] es [categoría] que [beneficio], porque [razón para creer].">${esc(mp.statement)}</textarea><span class="hint small muted">Fórmula: para quién, qué es, qué beneficio y por qué creerle.</span></div>
     <div class="field"><label for="mpv">Propuesta de valor</label><textarea class="input" id="mpv" rows="2">${esc(mp.value)}</textarea></div>
     <div class="field"><label for="mpd">Diferenciales</label><textarea class="input" id="mpd" rows="2">${esc(mp.diff)}</textarea></div>
     <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary">Guardar</button></div></section>
     <section class="card span-4"><h3 style="margin-bottom:8px">Unidades de negocio</h3><p class="small muted" style="margin-bottom:8px">Tocá una para cargar su posicionamiento.</p>${S.brands.map((u,i)=>`<button type="button" class="settings-row" data-pickunit="${i}" style="all:unset;display:flex;gap:8px;align-items:center;cursor:pointer;padding:6px 0"><i class="sdot" style="background:${u.color}"></i><span class="grow">${esc(u.name)}</span><span class="small ${(M().positioning[u.name]||{}).statement?'':'muted'}">${(M().positioning[u.name]||{}).statement?'Con posicionamiento':'Falta'}</span></button>`).join('')||'<p class="small muted">Todavía no hay unidades.</p>'}</section>
     <section class="card span-12"><h3 style="margin-bottom:12px">Pilares de la marca principal</h3>${pillarsBlock(mp.pillars,MAIN_KEY)}
      <p class="small muted" style="margin-top:16px">Estos pilares los pueden usar todas las unidades, además de los propios de cada una.</p></section></form>`;
  };
  const _bEst=bEstrategia;
  bEstrategia=function(tab){ _bEst(tab);
    $$('[data-gomain]').forEach(x=>x.onclick=()=>{ S.brand=-1; render(); });
    $$('[data-pickunit]').forEach(x=>x.onclick=()=>{ S.brand=+x.dataset.pickunit; render(); });
    const f=$('#fposm'); if(f){ const mp=mainPos(), mb=mainBrand();
      f.onsubmit=e=>{ e.preventDefault(); const n=$('#mbn'); if(!fieldErr(n,!n.value.trim()?'Escribí el nombre de la marca principal':'')) return;
        mb.name=n.value.trim(); mp.statement=$('#mps').value; mp.value=$('#mpv').value; mp.diff=$('#mpd').value; render(); toast('Posicionamiento de la marca principal guardado'); }; }
  };
  VIEWS.estrategia.view=vEstrategia; VIEWS.estrategia.bind=bEstrategia;
  if(typeof RO_FORMS==='object') RO_FORMS.fposm='Posicionamiento de la marca principal';
})();

/* ---------- Mapa por unidad ---------- */
ST_TABS.splice(1,0,['mapa','Mapa por unidad']);
function unitMap(u){
  const m=M(), pos=(m.positioning||{})[u.name]||{}, objs=(m.objectives||[]).filter(o=>o.brand===u.name), oIds=new Set(objs.map(o=>o.id));
  const pers=(m.personas||[]).filter(p=>(p.brands||[p.brand]).includes(u.name));
  const funs=(m.funnels||[]).filter(f=>oIds.has(f.objectiveId));
  const camps=(m.campaigns||[]).filter(c=>c.brand===u.name), campsLinked=camps.filter(c=>c.objectiveId&&oIds.has(c.objectiveId));
  const cloud=S.company&&S.company.cloud&&typeof EV==='object';
  const sales=cloud&&EV.loaded?EV.ops.filter(o=>o.brand===u.name):null;
  const won=sales?sales.filter(o=>o.stage==='ganada'):[];
  const wonAmt=won.reduce((a,o)=>a+((o.won&&o.won.amountMinor)||0),0);
  const steps=[
    ['Posicionamiento',!!pos.statement,pos.statement?'Definido':'Falta la declaración','#/app/estrategia/posicionamiento'],
    ['Pilares de comunicación',(pos.pillars||[]).length>0,(pos.pillars||[]).length?`${pos.pillars.length} pilar${pos.pillars.length>1?'es':''}`:'Sin pilares','#/app/estrategia/posicionamiento'],
    ['Buyer personas',pers.length>0,pers.length?pers.map(p=>p.name).join(', '):'Ninguna','#/app/estrategia/personas'],
    ['Objetivos',objs.length>0,objs.length?`${objs.length} objetivo${objs.length>1?'s':''}`:'Ninguno','#/app/estrategia/okr'],
    ['Funnel de conversión',funs.length>0,funs.length?`${funs.length} funnel${funs.length>1?'s':''}`:objs.length?'Ningún objetivo tiene funnel':'Primero un objetivo','#/app/estrategia/funnel'],
    ['Campañas',campsLinked.length>0,camps.length?`${camps.length} campaña${camps.length>1?'s':''}${camps.length>campsLinked.length?` · ${camps.length-campsLinked.length} sin objetivo`:''}`:'Ninguna','#/app/campanas'],
    ['Ventas',sales?sales.length>0:null,sales===null?(cloud?'Cargando…':'Se ven en la versión en la nube'):sales.length?`${sales.length} cotización${sales.length>1?'es':''} · ${won.length} ganada${won.length!==1?'s':''}${wonAmt?' · '+evMoney(wonAmt):''}`:'Sin cotizaciones de esta unidad','#/app/crm/eventos']
  ];
  const done=steps.filter(s=>s[1]===true).length, total=steps.filter(s=>s[1]!==null).length;
  return `<section class="card unit-card"><div class="card-head"><h3><i class="sdot" style="background:${u.color}"></i> ${esc(u.name)}</h3><span class="badge ${done===total?'badge-ok':''}">${done} de ${total}</span></div>
   <ol class="unit-chain">${steps.map(([n,okk,d,href],i)=>`<li class="${okk===true?'ok':okk===false?'miss':'na'}"><span class="unit-dot">${okk===true?ic('check'):i+1}</span><div class="grow"><b>${n}</b><div class="small muted">${esc(d)}</div></div>${okk===false?`<a class="btn btn-sm" href="${href}" data-unitgo="${esc(u.name)}">Completar</a>`:`<a class="small" href="${href}" data-unitgo="${esc(u.name)}">Ver</a>`}</li>`).join('')}</ol></section>`;
}
function vMapa(){
  const b=curBrand(), units=b?[b]:S.brands, mp=mainPos();
  if(!S.brands.length) return `<div class="card empty"><div class="eico">${ic('tag')}</div><h3>Todavía no hay unidades de negocio</h3><p class="muted small">Creá una por cada línea comercial (por ejemplo Coffee House, Ambulante, Cakes, Work). Cada una tiene su posicionamiento, buyer personas, funnel y campañas.</p><button class="btn btn-primary" data-newunit>${ic('plus')} Nueva unidad de negocio</button></div>`;
  return `<section class="card" style="margin-bottom:16px"><div class="card-head"><div><span class="small muted">Marca principal</span><h3>${esc(mainName())}</h3></div><a class="btn btn-sm" href="#/app/estrategia/posicionamiento" data-gomain>${mp.statement?'Ver posicionamiento':'Definir posicionamiento'}</a></div>
   <p class="small muted">Cada unidad de negocio arma su cadena: posicionamiento → buyer personas → objetivos → funnel → campañas → ventas. Lo que falta aparece para completarlo.</p></section>
   <div class="unit-grid">${units.map(unitMap).join('')}</div>${b?'':`<div style="margin-top:16px"><button class="btn" data-newunit>${ic('plus')} Nueva unidad de negocio</button></div>`}`;
}
(function(){
  const _v=vEstrategia, _b=bEstrategia;
  vEstrategia=function(tab){ if(tab!=='mapa') return _v(tab);
    return pageHead('Estrategia','Objetivos, públicos, posicionamiento, planes y presupuesto de cada unidad de negocio.',`${brandScope()}<button class="btn btn-primary" id="newobj">${ic('plus')} Nuevo objetivo</button>`)+subTabs('estrategia',ST_TABS,'mapa')+vMapa(); };
  bEstrategia=function(tab){ if(tab!=='mapa') return _b(tab);
    try{ _b('resumen'); }catch(e){}
    $$('[data-unitgo]').forEach(a=>a.onclick=()=>{ const i=S.brands.findIndex(x=>x.name===a.dataset.unitgo); if(i>=0) S.brand=i; });
    $$('[data-gomain]').forEach(a=>a.onclick=()=>{ S.brand=-1; });
    $$('[data-newunit]').forEach(x=>x.onclick=()=>brandModal());
    if(S.company&&S.company.cloud&&typeof EV==='object'&&typeof evListen==='function'&&!EV.loaded){ evListen(); const t=setInterval(()=>{ if(EV.loaded){ clearInterval(t); if(/estrategia\/mapa/.test(location.hash)&&!$('#layer').children.length) render(); } },700); setTimeout(()=>clearInterval(t),15000); }
  };
  VIEWS.estrategia.view=vEstrategia; VIEWS.estrategia.bind=bEstrategia;
})();

/* ---------- Renombrar una unidad sin perder lo cargado ---------- */
function renameUnit(oldN,newN){
  if(!oldN||!newN||oldN===newN) return 0; let n=0;
  const walk=o=>{ if(Array.isArray(o)){ o.forEach(v=>{ if(v&&typeof v==='object') walk(v); }); return; }
    if(!o||typeof o!=='object') return;
    for(const k of Object.keys(o)){ const v=o[k];
      if((k==='brand'||k==='unit')&&v===oldN){ o[k]=newN; n++; }
      else if(k==='brands'&&Array.isArray(v)){ v.forEach((x,i)=>{ if(x===oldN){ v[i]=newN; n++; } }); }
      else if(v&&typeof v==='object') walk(v); } };
  const m=M();
  ['positioning','kits'].forEach(key=>{ const o=m[key]; if(o&&o[oldN]){ o[newN]=o[newN]?{...o[newN],...o[oldN]}:o[oldN]; delete o[oldN]; n++; } });
  walk(m); const d=D(); if(d.x) walk(d.x);
  if(typeof CX==='object'&&CX.map){ let ch=false; Object.keys(CX.map).forEach(k=>{ if(CX.map[k]===oldN){ CX.map[k]=newN; ch=true; } }); if(ch&&CX.tid&&fbDb) fbDb.doc(`tenants/${CX.tid}/settings/social`).set({brandByAccount:CX.map,updatedAt:TS(),updatedBy:C.user.uid}).catch(()=>{}); }
  if(S.company&&S.company.cloud&&fbDb&&typeof EV==='object'&&EV.settings&&EV.settings.brand===oldN&&['Dueño','Admin'].includes(S.company.myRole)){
    fbDb.doc(`tenants/${S.company.tid}/settings/cafelito-eventos`).set({brand:newN,updatedAt:TS(),updatedBy:C.user.uid},{merge:true}).then(()=>{ EV.settings.brand=newN; }).catch(()=>{}); }
  return n;
}
(function(){
  const _bm=brandModal;
  brandModal=function(i){
    _bm(i); const edit=i!=null, ok=$('#ok'); if(!ok) return;
    const oldN=edit?S.brands[i].name:null, orig=ok.onclick;
    ok.onclick=async ev=>{ const v=($('#bnm')||{}).value?$('#bnm').value.trim():'';
      if(v&&S.brands.some((x,j)=>j!==i&&x.name.toLowerCase()===v.toLowerCase())) return fieldErr($('#bnm'),'Ya hay una unidad con ese nombre');
      // Se mueven los datos ANTES de guardar el nombre nuevo (si no, la pantalla crea vacíos con el nombre nuevo)
      const n=edit&&v&&oldN!==v?renameUnit(oldN,v):0;
      await orig(ev);
      if(n&&!$('#layer .modal')){ render(); toast(`Unidad renombrada: se actualizaron ${n} datos vinculados`); } };
  };
})();
