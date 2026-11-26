/* =====================================================================
   CRM UNIFICADO · ETAPAS 2 Y 3
   - Etapa 2: «Tablero» (columnas por estado) y selección de personas → segmento, descarga, emails.
   - Etapa 3: «Resumen» (cuánto aporta cada unidad y cómo va su objetivo; qué se vende más)
     y Configuración → «Productos y servicios» (planes de suscripción y cursos de cada unidad).
   Solo lee lo que ya existe; los segmentos se guardan con los datos de la empresa (M().segments).
   ===================================================================== */

/* ---------- Selección de personas ---------- */
function vnChk(id,name){ if(!id) return '<td class="vn-ck"></td>'; return `<td class="vn-ck"><input type="checkbox" data-vnchk="${esc(id)}" ${VN.sel.has(id)?'checked':''} aria-label="Elegir a ${esc(name||'esta persona')}"></td>`; }
function vnChkAll(ids){ const u=[...new Set(ids.filter(Boolean))], all=u.length&&u.every(i=>VN.sel.has(i));
  return `<th class="vn-ck"><input type="checkbox" data-vnall="${esc(u.join(','))}" ${all?'checked':''} aria-label="Elegir todas las personas de la lista"></th>`; }
const vnPerson=id=>EV.contacts[id]||{};
const vnOkPromo=id=>!!(vnPerson(id).marketingConsent&&vnPerson(id).marketingConsent.granted);
function vnBulkHtml(){ const ids=[...VN.sel], ok=ids.filter(vnOkPromo).length;
  return `<div class="vn-bulk-in"><b>${ids.length} persona${ids.length===1?'':'s'} elegida${ids.length===1?'':'s'}</b><span class="small muted">${ok} acepta${ok===1?'':'n'} promociones</span><span class="grow"></span>
    <button class="btn btn-sm btn-primary" data-vnb="seg">${ic('users')} Crear segmento</button><button class="btn btn-sm" data-vnb="csv">${ic('download')} Descargar</button><button class="btn btn-sm" data-vnb="mail">${ic('copy')} Copiar emails</button><button class="btn btn-sm btn-ghost" data-vnb="clear">Quitar selección</button></div>`; }
function vnBulkRefresh(){ const b=$('#vnbulk'); if(!b) return; b.hidden=!VN.sel.size; b.innerHTML=vnBulkHtml(); vnBindBulk();
  $$('[data-vnchk]').forEach(c=>c.checked=VN.sel.has(c.dataset.vnchk));
  $$('[data-vnall]').forEach(c=>{ const u=c.dataset.vnall.split(',').filter(Boolean); c.checked=!!u.length&&u.every(i=>VN.sel.has(i)); }); }
function vnBindSel(){
  $$('[data-vnchk]').forEach(c=>{ c.onclick=e=>e.stopPropagation(); c.onchange=()=>{ c.checked?VN.sel.add(c.dataset.vnchk):VN.sel.delete(c.dataset.vnchk); vnBulkRefresh(); }; c.closest('td').onclick=e=>e.stopPropagation(); });
  $$('[data-vnall]').forEach(c=>c.onchange=()=>{ c.dataset.vnall.split(',').filter(Boolean).forEach(i=>c.checked?VN.sel.add(i):VN.sel.delete(i)); vnBulkRefresh(); });
  vnBindBulk();
}
function vnBindBulk(){
  $$('[data-vnb]').forEach(b=>b.onclick=()=>{ const ids=[...VN.sel], k=b.dataset.vnb;
    if(k==='clear'){ VN.sel.clear(); vnBulkRefresh(); return; }
    if(k==='csv'){ const c=v=>`"${String(v==null?'':v).replace(/"/g,'""')}"`, ops=vnOps();
      const lines=[['Nombre','Teléfono','Email','Unidades','Acepta promociones'].join(';'),...ids.map(id=>{ const p=vnPerson(id); return [p.name||'',p.phoneE164||p.phoneDisplay||'',p.email||'',[...new Set(ops.filter(o=>o.contactId===id).map(o=>o.unit).filter(Boolean))].join(', '),vnOkPromo(id)?'Sí':p.marketingConsent?'No':'Sin datos'].map(c).join(';'); })];
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+lines.join('\n')],{type:'text/csv;charset=utf-8'})); a.download=`personas-${vnIso(Date.now())}.csv`; a.click(); toast('Descargado: se abre con Excel'); return; }
    if(k==='mail'){ const em=ids.filter(vnOkPromo).map(id=>vnPerson(id).email).filter(Boolean);
      if(!em.length){ toast('Ninguna de las personas elegidas aceptó promociones y tiene email'); return; }
      const done=()=>toast(`${em.length} email${em.length===1?'':'s'} copiado${em.length===1?'':'s'} (solo de quienes aceptan promociones)`);
      (navigator.clipboard?navigator.clipboard.writeText(em.join(', ')):Promise.reject()).then(done).catch(()=>modal('Emails',`<p class="small muted">Copiá esta lista (solo quienes aceptan promociones):</p><textarea class="input" rows="5" readonly style="width:100%">${esc(em.join(', '))}</textarea>`,`<button class="btn" data-close>Cerrar</button>`)); return; }
    if(k==='seg'){ modal('Crear segmento',`<p class="small muted" style="margin-bottom:12px">Guarda a estas ${ids.length} persona${ids.length===1?'':'s'} con un nombre, para filtrarlas y usarlas más adelante en automatizaciones y campañas.</p>${F('vnsgn','Nombre del segmento','maxlength="60" placeholder="Ej.: Clientas de tortas 2026"')}`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="vnsgsave">Crear segmento</button>`);
      $('#vnsgn').focus();
      $('#vnsgsave').onclick=()=>{ const n=$('#vnsgn'), v=n.value.trim(); if(!fieldErr(n,!v?'Escribí un nombre':vnSegs().some(x=>x.name.toLowerCase()===v.toLowerCase())?'Ya hay un segmento con ese nombre':'')) return;
        const g={id:uid(),name:v,contactIds:ids,createdAt:new Date().toISOString(),by:(S.user&&S.user.name)||''}; vnSegs().push(g); VN.sel.clear(); VN.seg=g.id; layerDirty=false; closeLayer(); render(); toast(`Segmento «${v}» creado con ${ids.length} persona${ids.length===1?'':'s'}`); }; }
  });
}

/* ---------- Tablero ---------- */
function vnTablero(ops){
  if(!ops.length) return `<div class="card empty"><div class="eico">${ic('dollar')}</div><h3>No hay ventas con estos filtros</h3><p class="muted small">Probá con otra unidad, otro estado u otro período.</p></div>`;
  ops.sort((a,b)=>(b.late-a.late)||(b.date-a.date));
  const col=k=>{ const l=ops.filter(o=>o.st===k), tot=l.reduce((a,o)=>a+o.amt,0);
    return `<section class="vn-col" aria-label="${VN_ST[k][0]}"><header><span class="vn-st ${k}">${VN_ST[k][0]}</span><span class="small muted">${l.length}</span><span class="grow"></span><b class="small">${tot?evMoney(tot):''}</b></header>
      ${l.map(o=>`<article class="vn-kc ${o.late?'late':''}" data-vnkc="${esc(o.id)}" tabindex="0"><div class="vn-kc-top"><b>${esc(o.cli||'Sin nombre')}</b><span class="vn-unit">${esc(vnShort(o.unit))}</span></div>
        <div class="small">${esc(o.prod)}</div><div class="vn-kc-foot"><span class="small ${o.late?'vn-late':'muted'}">${esc(o.sub)}</span><b class="num">${o.amt?evMoney(o.amt):'<span class="muted small">Sin importe</span>'}${o.recur?'<span class="small muted"> /mes</span>':''}</b></div>
        ${o.act&&o.st==='g'?`<button class="btn btn-sm" data-vnact="${esc(o.id)}">${esc(o.act[0])}</button>`:''}</article>`).join('')||'<p class="small muted" style="padding:8px">Nada por acá.</p>'}</section>`; };
  return `<div class="vn-board">${['n','c','g','p'].map(col).join('')}</div>`;
}

/* ---------- Resumen ---------- */
const VR={ per:'mes', unit:'' };
const vrQ=()=>{ const d=new Date(); return `Q${Math.floor(d.getMonth()/3)+1} ${d.getFullYear()}`; };
function vrObjs(unit){ const all=(M().objectives||[]).filter(o=>o.brand===unit), y=String(new Date().getFullYear());
  const cur=all.filter(o=>o.period===vrQ()); return cur.length?cur:all.filter(o=>String(o.period||'').includes(y)); }
function vResumen(){
  if(!vnReady()) return `<div class="card empty"><p class="muted">Cargando…</p></div>`;
  const keep={...VN}; VN.per=VR.per; VN.unit=VR.unit; VN.q=''; VN.st=''; VN.kind=''; VN.seg='';
  const r=vnRange(), all=vnOps(), ops=vnFilter(all); Object.assign(VN,{per:keep.per,unit:keep.unit,q:keep.q,st:keep.st,kind:keep.kind,seg:keep.seg});
  const t=vnTotals(ops), inR=ms=>!r||(ms>=r[0].getTime()&&ms<r[1].getTime());
  const first=new Map(); all.filter(o=>o.st==='g'&&o.contactId).forEach(o=>{ const f=first.get(o.contactId); if(!f||o.date<f) first.set(o.contactId,o.date); });
  const nuevos=[...first.entries()].filter(([id,ms])=>inR(ms)&&(!VR.unit||all.some(o=>o.contactId===id&&o.unit===VR.unit&&o.st==='g'))).length;
  const units=[...new Set([...S.brands.map(b=>b.name),...ops.map(o=>o.unit).filter(Boolean)])].filter(u=>!VR.unit||u===VR.unit);
  const rows=units.map(u=>{ const l=ops.filter(o=>o.unit===u), tt=vnTotals(l); return {u,...tt,won:l.filter(o=>o.st==='g').length,objs:vrObjs(u)}; });
  const maxC=Math.max(1,...rows.map(x=>x.cob+x.mens));
  const sel=(id,cur,opts,label)=>`<label class="sr" for="${id}">${label}</label><select class="select sm vn-sel" id="${id}">${opts.map(([v,l])=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`).join('')}</select>`;
  const perName={mes:'este mes',ant:'el mes pasado','90':'los últimos 90 días',todo:'todo el tiempo'}[VR.per];
  const kpi=(l,v,d)=>`<div class="stat"><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
  const objCell=x=>x.objs.length?x.objs.map(o=>{ const p=objPct(o), [sl,sc]=objStatus(p); return `<a class="vr-obj" href="#/app/estrategia/okr"><span class="vr-obj-t">${esc(o.title||o.name||'Objetivo')}</span><span class="vr-bar" title="${p}% de avance"><i style="width:${Math.min(100,p)}%"></i></span><span class="badge ${sc}">${p}% · ${sl}</span></a>`; }).join(''):`<span class="small muted">Sin objetivo para ${esc(vrQ())}</span>`;
  // Qué se vende más (operaciones ganadas del período)
  const prods=new Map(); ops.filter(o=>o.st==='g').forEach(o=>{ const k=o.kind==='cot'?o.prod.split(' (')[0].split(' · ').slice(0,2).join(' · '):o.prod; const key=o.unit+'|'+k; const p=prods.get(key)||{k,u:o.unit,n:0,amt:0,recur:o.recur}; p.n++; p.amt+=o.amt; prods.set(key,p); });
  const top=[...prods.values()].sort((a,b)=>b.amt-a.amt).slice(0,8);
  return `<div class="toolbar vn-bar">${sel('vrp',VR.per,[['mes','Este mes'],['ant','Mes pasado'],['90','Últimos 90 días'],['todo','Todo el tiempo']],'Período')}${sel('vru',VR.unit,[['','Todas las unidades'],...units.concat(VR.unit&&!units.includes(VR.unit)?[VR.unit]:[]).map(u=>[u,u])],'Unidad')}</div>
   <div class="stat-grid vr-kpi">${kpi('Cobrado',evMoney(t.cob),'lo que ya entró, '+perName)}${kpi('Vendido',evMoney(t.vend),'ventas ganadas, '+perName)}${kpi('En juego',evMoney(t.juego),'presupuestos abiertos')}${kpi('Mensual fijo',t.mens?evMoney(t.mens):'—','suscripciones activas')}${kpi('Clientes nuevos',String(nuevos),'primera compra, '+perName)}</div>
   <section class="card vn-card" style="margin-top:16px"><div class="vr-h"><h3>Aporte de cada unidad y su objetivo</h3><p class="small muted">Cobrado y mensual fijo de ${perName}; el objetivo es el de ${esc(vrQ())} en Estrategia.</p></div>
    <div class="table-wrap"><table class="t vn-t vr-t"><thead><tr><th>Unidad</th><th class="num">Cobrado</th><th class="hide-m">Aporte</th><th class="num hide-m">Vendido</th><th class="num hide-m">En juego</th><th class="num hide-m">Ventas</th><th>Objetivo</th></tr></thead><tbody>
    ${rows.map(x=>`<tr><td><b>${esc(x.u)}</b></td><td class="num"><b>${evMoney(x.cob)}</b>${x.mens?`<span class="vn-sl">+ ${evMoney(x.mens)} por mes</span>`:''}</td>
      <td class="hide-m"><span class="vr-bar wide" title="${esc(x.u)}: ${evMoney(x.cob)}${x.mens?' + '+evMoney(x.mens)+' por mes':''}"><i style="width:${Math.round((x.cob+x.mens)/maxC*100)}%"></i></span></td>
      <td class="num hide-m">${evMoney(x.vend)}</td><td class="num hide-m">${x.juego?evMoney(x.juego):'—'}</td><td class="num hide-m">${x.won}</td><td>${objCell(x)}</td></tr>`).join('')}</tbody></table></div></section>
   <section class="card vn-card" style="margin-top:16px"><div class="vr-h"><h3>Lo que más se vende</h3><p class="small muted">Productos y servicios ganados en ${perName}, por importe.</p></div>
    ${top.length?`<div class="table-wrap"><table class="t vn-t"><thead><tr><th>Producto o servicio</th><th class="hide-m">Unidad</th><th class="num">Ventas</th><th class="num">Importe</th></tr></thead><tbody>
    ${top.map(p=>`<tr><td>${esc(p.k)}</td><td class="hide-m"><span class="vn-unit">${esc(vnShort(p.u))}</span></td><td class="num">${p.n} venta${p.n===1?'':'s'}</td><td class="num"><b>${evMoney(p.amt)}</b>${p.recur?'<span class="vn-sl">por mes</span>':''}</td></tr>`).join('')}</tbody></table></div>`:`<p class="muted small" style="padding:16px">Todavía no hay ventas ganadas en ${perName}.</p>`}</section>`;
}
function bResumen(){ const p=$('#vrp'), u=$('#vru'); if(p) p.onchange=()=>{ VR.per=p.value; render(); }; if(u) u.onchange=()=>{ VR.unit=u.value; render(); }; }

(function(){
  if(typeof CRM_NUBE_TABS==='undefined') return;
  CRM_NUBE_TABS.unshift(['resumen','Resumen']);
  const _v=vCrm, _b=bCrm, cloud=()=>!!(S.company&&S.company.cloud);
  vCrm=function(tab){ if(!cloud()) return _v(tab); if(!tab||tab==='resumen') return pageHead('CRM','Cómo vienen las ventas de cada unidad y qué aportan a sus objetivos.','')+subTabs('crm',CRM_NUBE_TABS,'resumen')+vResumen(); return _v(tab); };
  bCrm=function(tab){ if(!cloud()) return _b(tab); if(!tab||tab==='resumen') return bResumen(); return _b(tab); };
  VIEWS.crm.view=vCrm; VIEWS.crm.bind=bCrm;
})();

/* ---------- Configuración → Productos y servicios ---------- */
(function(){
  const i=CFG.findIndex(c=>c[0]==='marcas'); CFG.splice(i+1,0,['catalogo','Productos y servicios']);
  const _v=vConfig, _b=bConfig;
  vConfig=function(tab){ if(tab!=='catalogo') return _v(tab);
    return `<div class="page-head"><div><nav class="breadcrumbs" aria-label="Ruta"><a href="#/app/config/empresa">Configuración</a>${ic('chevr')}<span>Productos y servicios</span></nav><h1 style="margin-top:4px">Configuración</h1></div></div>
    <div class="tabs" role="tablist">${CFG.map(([k,l])=>`<a class="tab" role="tab" href="#/app/config/${k}" aria-selected="${k==='catalogo'}">${l}</a>`).join('')}</div>${cfgCatalogo()}`; };
  bConfig=function(tab){ if(tab!=='catalogo') return _b(tab); bCatalogo(); };
})();
function cfgCatalogo(){ const m=catalog(), cloud=!!(S.company&&S.company.cloud);
  if(cloud){ shListen(); evListen(); }
  const sold=new Map(); (typeof SH!=='undefined'?SH.orders:[]).filter(o=>o.status==='paid'||o.status==='picked_up').forEach(o=>(o.items||[]).forEach(it=>{ const k=o.brand+'|'+it.name; const p=sold.get(k)||{u:o.brand,name:it.name,n:0,price:it.unitPriceMinor}; p.n+=it.quantity||1; sold.set(k,p); }));
  const evTypes=new Map(); (typeof EV!=='undefined'?EV.ops:[]).forEach(o=>{ const t=(o.event||{}).type; if(!t) return; const k=o.brand+'|'+t; evTypes.set(k,{u:o.brand,name:t,n:((evTypes.get(k)||{}).n||0)+1}); });
  const units=[...new Set([...S.brands.map(b=>b.name),...m.plans.map(p=>p.brand),...m.courses.map(c=>c.brand)].filter(Boolean))];
  const row=(a,b,c,act='')=>`<div class="settings-row"><div style="flex:1;min-width:0"><b>${a}</b>${b?`<div class="small muted">${b}</div>`:''}</div><div class="num" style="white-space:nowrap">${c}</div>${act}</div>`;
  const card=u=>{ const pl=m.plans.map((p,i)=>[p,i]).filter(([p])=>p.brand===u), co=m.courses.map((c,i)=>[c,i]).filter(([c])=>c.brand===u), sh=[...sold.values()].filter(x=>x.u===u), ev=[...evTypes.values()].filter(x=>x.u===u);
    const parts=[pl.length?`<h4 class="vr-sub">Suscripciones (se cobran todos los meses)</h4>${pl.map(([p,i])=>row(esc(p.name),'',`${evMoney(p.priceMinor)} /mes`,`<button class="btn btn-sm" data-cpl="${i}">Editar</button>`)).join('')}`:'',
      co.length?`<h4 class="vr-sub">Cursos (pago único)</h4>${co.map(([c,i])=>row(esc(c.name),`${evDate(c.start)} al ${evDate(c.end)}${c.seats?` · cupo ${c.seats}`:''}`,evMoney(c.priceMinor),`<button class="btn btn-sm" data-cco="${i}">Editar</button>`)).join('')}`:'',
      sh.length?`<h4 class="vr-sub">Productos de la tienda <span class="small muted">(llegan solos desde la web)</span></h4>${sh.map(x=>row(esc(x.name),`${x.n} vendido${x.n===1?'':'s'}`,x.price?evMoney(x.price):'')).join('')}`:'',
      ev.length?`<h4 class="vr-sub">Eventos que cotiza</h4>${ev.map(x=>row(esc(x.name),`${x.n} cotizaci${x.n===1?'ón':'ones'}`,'<span class="small muted">según presupuesto</span>')).join('')}`:''].filter(Boolean);
    return `<section class="card"><div class="vr-h" style="padding:0 0 8px"><h3>${esc(u)}</h3></div>${parts.join('')||'<p class="small muted">Todavía no tiene productos ni servicios cargados.</p>'}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn btn-sm" data-cnewpl="${esc(u)}">${ic('plus')} Plan de suscripción</button><button class="btn btn-sm" data-cnewco="${esc(u)}">${ic('plus')} Curso</button></div></section>`; };
  return `<p class="muted" style="margin:0 0 16px;max-width:720px">Lo que vende cada unidad. Los planes y cursos se cargan acá; los productos de la tienda y los tipos de evento aparecen solos a medida que llegan ventas.</p>
    ${units.length?`<div class="vr-cat">${units.map(card).join('')}</div>`:`<div class="card empty"><h3>Primero creá tus unidades de negocio</h3><a class="btn btn-primary" href="#/app/config/marcas">Ir a Marcas</a></div>`}`;
}
function bCatalogo(){
  $$('[data-cpl]').forEach(b=>b.onclick=()=>planForm(+b.dataset.cpl));
  $$('[data-cco]').forEach(b=>b.onclick=()=>courseForm(+b.dataset.cco));
  const pre=(id,u)=>{ const s=$(id); if(s) s.value=u; };
  $$('[data-cnewpl]').forEach(b=>b.onclick=()=>{ planForm(); pre('#plu',b.dataset.cnewpl); });
  $$('[data-cnewco]').forEach(b=>b.onclick=()=>{ courseForm(); pre('#cou',b.dataset.cnewco); });
}

/* Que el catálogo se complete cuando llegan los pedidos y cotizaciones */
(function(){ const onC=()=>/^#\/app\/config\/catalogo/.test(location.hash);
  const w=f=>function(){ if(onC()){ if(!$('#layer').children.length) render(); return; } return f.apply(this,arguments); };
  if(typeof shRefresh==='function') shRefresh=w(shRefresh); if(typeof evRefresh==='function') evRefresh=w(evRefresh); })();
