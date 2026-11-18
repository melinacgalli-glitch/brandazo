/* =====================================================================
   02b · ESTRATEGIA → FUNNEL DE CONVERSIÓN
   Pertenece a Estrategia. Las campañas usan sus proyecciones.
   Modelo (M().funnels):
   { id, name, objectiveId, goal (entero), goalType, stages:[{id,name,type,source,campOnly,real}],
     scenarios:{cons|esp|opt:{rates:{stageId:%}, costs:{cpc,cpl,cpa}}}, active,
     campaigns:[{id, mode:'pct'|'qty', value}], history:[…], created }
   - La tasa de una etapa es la conversión DESDE la etapa anterior HACIA esa etapa.
   - La meta de la última etapa es la meta final; las anteriores se calculan hacia atrás.
   - El resultado real se guarda una sola vez por etapa: las campañas solo muestran su aporte.
   ===================================================================== */
const F_TYPES=[['alcance','Alcance / impresiones'],['clic','Clic / visita'],['lead','Lead / formulario'],['oportunidad','Oportunidad'],['conversion','Venta / conversión final'],['otra','Otra']];
const F_GOALTYPES=['Ventas','Contrataciones','Reservas','Inscripciones','Otra conversión'];
const F_SC=[['cons','Conservador'],['esp','Esperado'],['opt','Optimista']];
const F_SOURCES=[['manual','Carga manual'],['crm-contacts','CRM · contactos nuevos'],['crm-clients','CRM · clientes nuevos'],['crm-won','CRM · oportunidades ganadas'],['camp-reach','Campañas vinculadas · alcance'],['camp-clicks','Campañas vinculadas · clics'],['camp-conv','Campañas vinculadas · conversiones'],['soon-gads','Google Ads (próximamente)'],['soon-ga4','GA4 (próximamente)']];
const F_TEMPLATES={
  simple:{t:'Formularios → Ventas',d:'Dos etapas: quien completa un formulario y quien compra.',st:[['Formularios','lead'],['Ventas','conversion']]},
  pauta:{t:'Pauta completa',d:'Clics → Leads → Oportunidades → Ventas.',st:[['Clics','clic'],['Leads','lead'],['Oportunidades','oportunidad'],['Ventas','conversion']]},
  blank:{t:'En blanco',d:'Solo la conversión final. Sumás las etapas que quieras.',st:[['Conversiones','conversion']]}
};
/* Tasas de referencia (promedios generales de marketing digital) para que el funnel calcule desde el primer momento.
   Se muestran como «referencia» hasta que la persona las reemplace por las suyas. */
const F_REF={'alcance>clic':1.5,'clic>lead':3,'lead>oportunidad':25,'oportunidad>conversion':20,'lead>conversion':20,'clic>conversion':2,'clic>oportunidad':1,'alcance>lead':0.05,'alcance>conversion':0.03,'alcance>oportunidad':0.02};
const F_SCF={cons:0.7,esp:1,opt:1.3};
function fRefRate(prevType,type,k){ const r=F_REF[prevType+'>'+type]; if(!r) return null; return Math.min(100,Math.round(r*F_SCF[k]*100)/100); }
function fFillRef(f,ids){   // completa solo tasas vacías; ids: limitar a esas etapas
  let n=0; F_SC.forEach(([k])=>{ const sc=f.scenarios[k]; sc.ref=sc.ref||{};
    f.stages.forEach((st,i)=>{ if(!i||(ids&&!ids.includes(st.id))||sc.rates[st.id]>0) return; const r=fRefRate(f.stages[i-1].type,st.type,k); if(r){ sc.rates[st.id]=r; sc.ref[st.id]=true; if(k==='esp') n++; } }); });
  return n; }
const fIsRef=(f,sid)=>!!((f.scenarios[f.active].ref||{})[sid]);
const FN=()=>{ const m=M(); if(!Array.isArray(m.funnels)) m.funnels=[]; return m.funnels; };
const fObj=f=>M().objectives.find(o=>o.id===f.objectiveId)||null;
const fBrand=f=>(fObj(f)||{}).brand||'';
const fPeriod=f=>(fObj(f)||{}).period||'';
const fTypeLabel=t=>(F_TYPES.find(x=>x[0]===t)||['','Otra'])[1];
const fSrcLabel=s=>(F_SOURCES.find(x=>x[0]===s)||['','Carga manual'])[1];
const fInBrand=f=>!curBrand()||fBrand(f)===curBrand().name;
const fNum=v=>v==null?'—':num(v);
const fPctTxt=v=>v==null?'—':(Math.round(v*10)/10).toLocaleString('es-AR')+' %';
const fScName=k=>(F_SC.find(x=>x[0]===k)||['','Esperado'])[1];
function fParseRate(txt){ const t=String(txt??'').trim().replace('%','').replace(',','.'); if(t==='') return {v:null}; const v=Number(t); if(!isFinite(v)) return {err:'Escribí un número'}; if(v<=0) return {err:'Tiene que ser mayor que 0 %'}; if(v>100) return {err:'No puede superar 100 %'}; return {v:Math.round(v*100)/100}; }
function fParseInt(txt){ const t=String(txt??'').trim().replace(/\./g,''); if(t==='') return {v:null}; if(!/^\d+$/.test(t)) return {err:'Solo números enteros'}; return {v:Number(t)}; }
function fParseMoney(txt){ const t=String(txt??'').trim().replace(/\$|\s/g,'').replace(/\./g,'').replace(',','.'); if(t==='') return {v:null}; const v=Number(t); if(!isFinite(v)||v<0) return {err:'Monto inválido'}; return {v:Math.round(v*100)/100}; }

/* ---------- Período del objetivo ---------- */
const MES_UP=MES.map(m=>m[0].toUpperCase()+m.slice(1));
function periodRange(p){ p=String(p||'').trim(); let m;
  if((m=p.match(/^Q([1-4]) (\d{4})$/i))){ const q=+m[1],y=+m[2]; return [new Date(y,(q-1)*3,1),new Date(y,q*3,0,23,59)]; }
  if((m=p.match(/^(\d{4})$/))) return [new Date(+m[1],0,1),new Date(+m[1],11,31,23,59)];
  if((m=p.match(/^([a-záéíóú]+) (\d{4})$/i))){ const i=MES.indexOf(m[1].toLowerCase()); if(i>=0) return [new Date(+m[2],i,1),new Date(+m[2],i+1,0,23,59)]; }
  return null; }
function periodOptions(cur){ const y=NOW.getFullYear(), out=[]; for(const yy of [y,y+1]){ for(let q=1;q<=4;q++) out.push(`Q${q} ${yy}`); out.push(String(yy)); }
  for(let i=0;i<12;i++){ const d=new Date(y,NOW.getMonth()+i,1); out.push(`${MES_UP[d.getMonth()]} ${d.getFullYear()}`); }
  if(cur&&!out.includes(cur)) out.unshift(cur); return out; }

/* ---------- Cálculo (puro) ---------- */
function fBack(goal,stages,rates){
  const n=stages.length, metas=Array(n).fill(null), missing=Array(n).fill(false);
  if(!n) return {metas,missing};
  metas[n-1]=goal>0?goal:null;
  for(let i=n-1;i>0;i--){
    if(metas[i]==null){ metas[i-1]=null; continue; }
    const r=rates[stages[i].id];
    if(!(r>0&&r<=100)){ missing[i]=true; metas[i-1]=null; continue; }
    const rb=Math.round(r*100);                          // tasa en centésimos de punto, entero
    metas[i-1]=Math.floor((metas[i]*10000+rb-1)/rb);     // REDONDEAR.HACIA.ARRIBA(meta / tasa), en enteros
  }
  return {metas,missing};
}
function fReal(f,st){
  const src=st.source||'manual';
  if(src==='manual'||src.startsWith('soon')) return st.real==null?null:st.real;
  const camps=M().campaigns.filter(c=>(f.campaigns||[]).some(l=>l.id===c.id));
  if(src.startsWith('camp-')){ if(!camps.length) return null; const k={'camp-reach':'reach','camp-clicks':'clicks','camp-conv':'conv'}[src]; return camps.reduce((a,c)=>a+((c.m||{})[k]||0),0); }
  const x=(typeof X==='function')?X():null; if(!x) return null;
  const range=periodRange(fPeriod(f)), brand=fBrand(f), inR=s=>{ if(!range) return true; if(!s) return false; const d=parse(s); return d>=range[0]&&d<=range[1]; };
  const campIds=new Set((f.campaigns||[]).map(l=>l.id));
  if(src==='crm-contacts'||src==='crm-clients'){
    const seen=new Set();
    x.contacts.forEach(c=>{ if(c.brand!==brand||!inR(c.created)) return; if(src==='crm-clients'&&c.type!=='Cliente') return; if(st.campOnly&&!campIds.has(c.campaign)) return; seen.add(c.id); });
    return seen.size; }
  if(src==='crm-won'){ const seen=new Set(); x.deals.forEach(d=>{ if(d.brand===brand&&d.stage==='Ganado'&&inR(d.close)) seen.add(d.id); }); return seen.size; }
  return null;
}
function fCalc(f,scKey){
  scKey=scKey||f.active; const sc=f.scenarios[scKey], st=f.stages, n=st.length;
  const {metas,missing}=fBack(f.goal,st,sc.rates);
  const real=st.map(s=>fReal(f,s));
  const realRate=st.map((s,i)=>i>0&&real[i]!=null&&real[i-1]>0?real[i]/real[i-1]*100:null);
  const cumpl=st.map((s,i)=>metas[i]&&real[i]!=null?real[i]/metas[i]*100:null);
  let total=1, totalOk=n>1; for(let i=1;i<n;i++){ const r=sc.rates[st[i].id]; if(r>0) total*=r/100; else totalOk=false; }
  const idx=t=>st.findIndex(s=>s.type===t), iClic=idx('clic'), iLead=idx('lead'), last=n-1;
  const c=sc.costs||{}, inv=[], why=[];
  if(c.cpa>0){ if(metas[last]!=null) inv.push({k:'CPA',v:c.cpa*metas[last],base:`${num(metas[last])} ${esc(st[last].name.toLowerCase())} × ${money(c.cpa)}`}); else why.push('Falta la meta final.'); }
  if(c.cpl>0){ if(iLead<0) why.push('Para usar el CPL, marcá una etapa como «Lead / formulario».'); else if(metas[iLead]==null) why.push(`Falta una tasa para calcular la meta de «${esc(st[iLead].name)}».`); else inv.push({k:'CPL',v:c.cpl*metas[iLead],base:`${num(metas[iLead])} ${esc(st[iLead].name.toLowerCase())} × ${money(c.cpl)}`}); }
  if(c.cpc>0){ if(iClic<0) why.push('Para usar el CPC, marcá una etapa como «Clic / visita».'); else if(metas[iClic]==null) why.push(`Falta una tasa para calcular la meta de «${esc(st[iClic].name)}».`); else inv.push({k:'CPC',v:c.cpc*metas[iClic],base:`${num(metas[iClic])} ${esc(st[iClic].name.toLowerCase())} × ${money(c.cpc)}`}); }
  if(!(c.cpa>0)&&!(c.cpl>0)&&!(c.cpc>0)) why.unshift('Cargá el CPC, el CPL o el CPA del escenario.');
  const main=inv[0]||null;   // prioridad: CPA, después CPL, después CPC (el costo más cercano al resultado)
  const leadMeta=iLead>=0?metas[iLead]:null;
  const cpl=main&&leadMeta?main.v/leadMeta:null, cac=main&&metas[last]?main.v/metas[last]:null;
  const linked=M().campaigns.filter(cp=>(f.campaigns||[]).some(l=>l.id===cp.id));
  const spent=linked.length?linked.reduce((a,cp)=>a+(cp.spent||0),0):null;
  const realLead=iLead>=0?real[iLead]:null, realLast=n?real[last]:null;
  return {metas,missing,real,realRate,cumpl,total:totalOk?total*100:null,inv,why,main,cpl,cac,iLead,iClic,last,spent,
    realCpl:spent!=null&&realLead>0?spent/realLead:null, realCac:spent!=null&&realLast>0?spent/realLast:null,
    goalCumpl:n&&metas[last]&&realLast!=null?realLast/metas[last]*100:null};
}
function fCampTarget(f,l){ return l.mode==='pct'?Math.ceil(f.goal*l.value/100-1e-9):l.value; }

/* ---------- Historial ---------- */
function fLog(f,what,from,to){
  const c=fCalc(f); (f.history=f.history||[]).unshift({at:new Date().toISOString(),by:S.user.name||'Vos',sc:fScName(f.active),what,from:from??'',to:to??'',proj:c.metas.slice(),names:f.stages.map(s=>s.name),period:fPeriod(f)});
  if(f.history.length>200) f.history.length=200;
}
const fWhen=iso=>{ const d=new Date(iso); return `${d.getDate()} ${MES[d.getMonth()].slice(0,3)} ${d.getFullYear()} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };

/* ---------- Alta, copia, baja ---------- */
function fNew({name,objectiveId,goal,goalType,tpl}){
  const stages=F_TEMPLATES[tpl||'simple'].st.map(([n,t])=>({id:uid(),name:n,type:t,source:'manual',campOnly:false,real:null}));
  const sc=()=>({rates:{},costs:{cpc:null,cpl:null,cpa:null}});
  const f={id:uid(),name,objectiveId,goal,goalType,stages,scenarios:{cons:sc(),esp:sc(),opt:sc()},active:'esp',campaigns:[],history:[],created:new Date().toISOString()};
  fLog(f,'Creaste el funnel',null,`Meta: ${num(goal)} ${goalType.toLowerCase()}`);
  if(fFillRef(f)) fLog(f,'Se cargaron tasas de referencia',null,'Reemplazalas por las tuyas cuando tengas datos'); return f;
}
function fDuplicate(f){
  const map={}; const stages=f.stages.map(s=>{ const id=uid(); map[s.id]=id; return {...s,id,real:null}; });
  const scenarios={}; F_SC.forEach(([k])=>{ const sc=f.scenarios[k]; const rates={}; Object.entries(sc.rates).forEach(([sid,v])=>{ if(map[sid]) rates[map[sid]]=v; }); const ref={}; Object.keys(sc.ref||{}).forEach(sid=>{ if(map[sid]) ref[map[sid]]=true; }); scenarios[k]={rates,costs:{...sc.costs},ref}; });
  const g={id:uid(),name:f.name+' (copia)',objectiveId:f.objectiveId,goal:f.goal,goalType:f.goalType,stages,scenarios,active:f.active,campaigns:[],history:[],created:new Date().toISOString()};
  fLog(g,`Duplicaste «${f.name}»`,null,'Sin campañas vinculadas ni resultados reales'); FN().unshift(g); return g;
}

/* ---------- Vistas ---------- */
function vFunnelList(){
  const fs=FN().filter(fInBrand);
  const head=`<div class="toolbar"><p class="muted grow">Partí de la meta comercial y calculá cuántos resultados necesitás en cada etapa. Cada funnel pertenece a un objetivo y toma su marca y su período.</p><button class="btn btn-primary" id="newfunnel">${ic('plus')} Nuevo funnel</button></div>`;
  if(!fs.length) return head+emptyBlock('funnel',curBrand()?`Sin funnels en ${esc(curBrand().name)}`:'Todavía no hay funnels','Elegí un objetivo, poné la meta final (por ejemplo, 4 ventas) y el sistema calcula cuántos leads, visitas o clics necesitás.',`<button class="btn btn-primary" data-newfunnel>${ic('plus')} Crear funnel</button>`);
  return head+`<div class="cards fz-list">${fs.map(f=>{ const c=fCalc(f), o=fObj(f), last=f.stages.length-1, gc=c.goalCumpl;
    return `<article class="card fz-card"><div class="fz-card-top"><div style="min-width:0"><div class="small muted fz-meta"><i class="sdot" style="background:${brandOf(fBrand(f)).color}"></i>${esc(fBrand(f)||'Sin marca')} · ${esc(fPeriod(f)||'Sin período')}</div>
     <h3><a class="fz-link" href="#/app/estrategia/funnel/${f.id}">${esc(f.name)}</a></h3><div class="small muted">${o?`Objetivo: ${esc(o.title)}`:'<span style="color:var(--warning)">El objetivo ya no existe</span>'}</div></div>
     <span class="badge ${f.active==='esp'?'badge-brand':''}">${fScName(f.active)}</span></div>
     <div class="fz-mini">${f.stages.map((s,i)=>`<div><span class="small">${esc(s.name)}</span><span class="mono">${fNum(c.metas[i])}</span></div>`).join('')}</div>
     <div><div class="small muted" style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Cumplimiento de la meta</span><span class="mono">${gc==null?'Sin datos reales':fPctTxt(gc)}</span></div><div class="bar ${gc>=100?'ok':gc>=50?'warn':''}"><i style="width:${Math.min(100,gc||0)}%"></i></div></div>
     <div class="fz-card-foot"><a class="btn btn-sm btn-primary" href="#/app/estrategia/funnel/${f.id}">Ver funnel</a><button class="btn btn-sm" data-fdup="${f.id}">${ic('copy')} Duplicar</button><button class="icon-btn" data-fdel="${f.id}" aria-label="Eliminar ${esc(f.name)}" title="Eliminar">${ic('trash')}</button></div></article>`; }).join('')}</div>`;
}
function fStageRow(f,c,s,i){
  const n=f.stages.length, sc=f.scenarios[f.active], est=sc.rates[s.id], manual=(s.source||'manual')==='manual'||(s.source||'').startsWith('soon');
  const cu=c.cumpl[i];
  return `<tr><td class="mono small muted fz-c-n">${i+1}</td><td class="fz-c-name"><b>${esc(s.name)}</b><div class="small muted">${fTypeLabel(s.type)}${i===n-1?' · <span class="badge badge-brand" style="padding:0 6px">final</span>':''}</div></td>
   <td class="num" data-l="Meta calculada"><b>${fNum(c.metas[i])}</b>${c.metas[i]==null?`<div class="small" style="color:var(--warning)">Falta una tasa</div>`:''}</td>
   <td class="num" data-l="Resultado real">${manual?`<input class="input fz-real" id="real-${s.id}" inputmode="numeric" data-real="${s.id}" value="${s.real==null?'':s.real}" placeholder="Sin dato" aria-label="Resultado real de ${esc(s.name)}">`:`<b>${fNum(c.real[i])}</b>`}<div class="small muted">${esc(fSrcLabel(s.source))}</div></td>
   <td class="num" data-l="Tasa estimada">${i===0?'<span class="small muted">Inicio</span>':est>0?`${fPctTxt(est)}<div><span class="badge fz-est">${fIsRef(f,s.id)?'referencia':'estimada'}</span></div>`:'<span class="small" style="color:var(--warning)">Sin tasa</span>'}</td>
   <td class="num" data-l="Tasa real">${i===0?'—':c.realRate[i]==null?'<span class="small muted">Sin datos</span>':fPctTxt(c.realRate[i])}</td>
   <td class="num" data-l="Cumplimiento">${cu==null?'<span class="small muted">—</span>':`<span class="badge ${cu>=100?'badge-ok':cu>=60?'badge-warn':'badge-err'}">${fPctTxt(cu)}</span>`}</td>
   <td class="fz-c-acts"><div class="fz-acts"><button class="icon-btn" data-sup="${i}" aria-label="Subir ${esc(s.name)}" ${i===0?'disabled':''}>${ic('up')}</button><button class="icon-btn" data-sdown="${i}" aria-label="Bajar ${esc(s.name)}" ${i===n-1?'disabled':''}>${ic('chev')}</button><button class="icon-btn" data-sedit="${i}" aria-label="Editar ${esc(s.name)}">${ic('edit')}</button><button class="icon-btn" data-sdel="${i}" aria-label="Eliminar ${esc(s.name)}" ${n===1?'disabled':''}>${ic('trash')}</button></div></td></tr>`;
}
function fVisual(f,c){
  const n=f.stages.length, vals=c.metas.filter(v=>v!=null), max=Math.max(1,...vals,...c.real.filter(v=>v!=null));
  const w=v=>v==null?0:Math.round(32+68*(Math.log10(v+1)/Math.log10(max+1)));   // escala logarítmica: siempre se ven todas las etapas
  const sc=f.scenarios[f.active];
  const need=c.missing.findIndex(x=>x), noRates=f.stages.slice(1).every(x=>!(sc.rates[x.id]>0));
  const anyRef=f.stages.some(x=>fIsRef(f,x.id)), canRef=f.stages.some((x,i)=>i>0&&!(sc.rates[x.id]>0)&&fRefRate(f.stages[i-1].type,x.type,f.active));
  const refNote=need>=0||!anyRef?'':`<div class="alert alert-info fz-help">${ic('info')}<div><b>Calculado con tasas de referencia.</b> Son promedios generales del marketing digital, marcadas como «referencia». Cambialas por tus propios porcentajes cuando los tengas: el funnel se recalcula al instante.</div></div>`;
  const help=need<0?refNote:`<div class="alert alert-info fz-help">${ic('info')}<div><b>${noRates?'Para calcular, falta la tasa de conversión de cada paso.':`Falta la tasa entre «${esc(f.stages[need-1].name)}» y «${esc(f.stages[need].name)}».`}</b> Escribí qué porcentaje pasa de una etapa a la siguiente. Por ejemplo: si de cada 100 ${esc(f.stages[need-1].name.toLowerCase())} se convierten 20 en ${esc(f.stages[need].name.toLowerCase())}, poné <b>20</b>. Con la meta de ${num(f.goal)} ${esc(f.goalType.toLowerCase())}, el funnel calcula solo cuánto necesitás en cada etapa.
   <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">${canRef?'<button type="button" class="btn btn-sm btn-primary" data-fillref>Completar con tasas de referencia</button>':''}<button type="button" class="btn btn-sm ${canRef?'':'btn-primary'}" data-gorate="rt-${f.stages[need].id}">Cargar mi tasa</button></div></div></div>`;
  return `${help}<div class="fz-funnel" role="list">${f.stages.map((s,i)=>{ const m=c.metas[i], r=c.real[i], cu=c.cumpl[i], est=sc.rates[s.id];
    const rate=i===0?'':`<div class="fz-rate"><label for="rt-${s.id}" class="small muted">De «${esc(f.stages[i-1].name)}» pasa a «${esc(s.name)}» el</label>
      <div class="fz-rate-in"><input class="input ${est>0?'':c.missing[i]?'is-need':'is-empty'}" id="rt-${s.id}" data-rate="${s.id}" inputmode="decimal" value="${est>0?String(est).replace('.',','):''}" placeholder="Ej.: 20" aria-describedby="rte-${s.id}"><span>%</span></div>
      ${est>0?`<span class="badge fz-est">${fIsRef(f,s.id)?'referencia':'estimada'}</span>`:''}${c.realRate[i]!=null?`<span class="small">Real: <b>${fPctTxt(c.realRate[i])}</b></span>`:''}<span class="small fz-rerr" id="rte-${s.id}" role="alert">${c.missing[i]?`Escribí este porcentaje para calcular ${i>1?'las etapas de arriba':`cuántos «${esc(f.stages[i-1].name)}» necesitás`}`:''}</span></div>`;
    return `${rate}<div class="fz-stage" role="listitem"><div class="fz-name"><b>${esc(s.name)}</b><span class="small muted">${fTypeLabel(s.type)}</span></div>
     <div class="fz-barwrap"><div class="fz-bar ${m==null?'is-empty':''}" style="width:${m==null?100:w(m)}%" title="${esc(s.name)} · meta ${fNum(m)} · real ${fNum(r)}"><i style="width:${cu==null?0:Math.min(100,cu)}%"></i><span class="mono">${m==null?'Sin meta':num(m)}</span></div></div>
     <div class="fz-res"><span class="mono">${r==null?'—':num(r)}</span><span class="small muted">${r==null?'sin dato real':cu==null?'real':`real · ${fPctTxt(cu)}`}</span></div></div>`; }).join('')}
   <div class="fz-legend small muted"><span><i class="fz-k proj"></i>Proyectado (meta)</span><span><i class="fz-k real"></i>Real alcanzado</span>${c.total!=null?`<span>Conversión total de punta a punta: <b>${fPctTxt(c.total)}</b></span>`:''}</div></div>`;
}
function fTrack(f,c){
  const rows=f.stages.map((s,i)=>{ const m=c.metas[i], r=c.real[i], mx=Math.max(1,m||0,r||0);
    return `<div class="fz-track"><span class="small">${esc(s.name)}</span><div class="fz-tbars"><div class="fz-tb proj" style="width:${m==null?0:Math.max(2,m/mx*100)}%" title="Proyectado: ${fNum(m)}"></div><div class="fz-tb real" style="width:${r==null?0:Math.max(2,r/mx*100)}%" title="Real: ${fNum(r)}"></div></div>
     <span class="mono small fz-diff">${m==null||r==null?'—':(r-m>=0?'+':'−')+num(Math.abs(r-m))}</span></div>`; }).join('');
  return `<section class="card"><div class="card-head"><h3>Proyectado vs. real</h3><span class="small muted">Pasá el cursor por las barras para ver los valores</span></div>${rows}
   <p class="small muted" style="margin-top:12px">La diferencia es real − proyectado. Las tasas cargadas a mano son <b>estimaciones</b> hasta que haya resultados reales en las dos etapas.</p></section>`;
}
function fKpis(f,c){
  const sc=f.scenarios[f.active], last=c.last, nd='<span class="fz-nd">Sin datos</span>';
  return `<div class="stat-grid fz-kpis">
   <div class="stat"><div class="l">Inversión estimada</div><div class="v">${c.main?money(c.main.v):nd}</div><div class="d">${c.main?`Por ${c.main.k} · ${fScName(f.active).toLowerCase()}`:'Faltan costos o tasas'}${c.spent!=null?` · real: ${money(c.spent)}`:''}</div></div>
   <div class="stat"><div class="l">Costo por lead</div><div class="v">${c.cpl!=null?money(c.cpl):nd}</div><div class="d">${c.iLead<0?'No hay etapa de lead':c.cpl==null?'Necesita inversión y meta de leads':'Proyectado'}${c.realCpl!=null?` · real: ${money(c.realCpl)}`:''}</div></div>
   <div class="stat"><div class="l">Costo de adquisición</div><div class="v">${c.cac!=null?money(c.cac):nd}</div><div class="d">${c.cac==null?'Necesita inversión y meta final':'Por cada conversión final'}${c.realCac!=null?` · real: ${money(c.realCac)}`:''}</div></div>
   <div class="stat"><div class="l">Cumplimiento del objetivo</div><div class="v">${c.goalCumpl!=null?fPctTxt(c.goalCumpl):nd}</div><div class="d">${c.real[last]!=null?`${num(c.real[last])} de ${num(f.goal)} ${esc(f.goalType.toLowerCase())}`:'Cargá el resultado real de la etapa final'}</div></div></div>`;
}
function fSim(f,c){
  const sc=f.scenarios[f.active], k=sc.costs||{}, v=x=>x==null?'':String(x).replace('.',',');
  return `<section class="card"><div class="card-head"><h3>Simulador de inversión</h3><span class="badge">${fScName(f.active)}</span></div>
   <div class="fz-costs">${[['cpc','CPC','Costo por clic'],['cpl','CPL','Costo por lead'],['cpa','CPA','Costo por adquisición']].map(([id,l,h])=>`<div class="field"><label for="cost-${id}">${l}</label><div class="fz-money"><span>$</span><input class="input" id="cost-${id}" data-cost="${id}" inputmode="decimal" value="${v(k[id])}" placeholder="Sin dato" aria-describedby="costh-${id}"></div><span class="hint small muted" id="costh-${id}">${h}</span><span class="err" role="alert"></span></div>`).join('')}</div>
   ${c.inv.length?`<div class="fz-inv">${c.inv.map((x,i)=>`<div class="${i===0?'main':''}"><span>${x.k}${i===0?' <span class="badge badge-brand" style="padding:0 6px">se usa</span>':''}</span><span class="small muted">${x.base}</span><b class="mono">${money(x.v)}</b></div>`).join('')}</div>`:''}
   ${c.why.length?`<div class="alert alert-warn" style="margin-top:12px">${ic('info')}<div>${c.inv.length?'':'<b>No se puede calcular la inversión.</b> '}${c.why.join(' ')}</div></div>`:''}
   <p class="small muted" style="margin-top:12px">Se usa el costo más cercano al resultado: primero CPA, después CPL y por último CPC.</p></section>`;
}
function fCampaigns(f,c){
  const links=(f.campaigns||[]).map(l=>({l,cp:M().campaigns.find(x=>x.id===l.id)})).filter(x=>x.cp);
  const sum=links.reduce((a,x)=>a+fCampTarget(f,x.l),0), sc=f.scenarios[f.active];
  return `<section class="card"><div class="card-head"><h3>Campañas vinculadas</h3><button class="btn btn-sm" id="flink">${ic('plus')} Vincular campaña</button></div>
   ${links.length?`<div class="table-wrap"><table class="t fz-table fz-ctable"><thead><tr><th>Campaña</th><th class="num">Aporte asignado</th><th class="num">Etapas previas</th><th class="num">Real informado</th><th></th></tr></thead><tbody>
   ${links.map(({l,cp})=>{ const t=fCampTarget(f,l), b=fBack(t,f.stages,sc.rates).metas; return `<tr><td class="fz-c-name"><a href="#/app/campanas/${cp.id}"><b>${esc(cp.name)}</b></a><div class="small muted">${esc(cp.brand)} · ${esc(cp.status)}</div></td>
     <td class="num" data-l="Aporte asignado"><b>${num(t)}</b><div class="small muted">${l.mode==='pct'?`${fPctTxt(l.value)} de la meta`:'cantidad fija'}</div></td>
     <td class="num small" data-l="Etapas previas">${f.stages.slice(0,-1).map((s,i)=>`${esc(s.name)}: ${fNum(b[i])}`).join('<br>')||'—'}</td>
     <td class="num" data-l="Real informado">${(cp.m||{}).conv?num(cp.m.conv):'<span class="small muted">Sin datos</span>'}</td>
     <td class="fz-c-acts"><div class="fz-acts"><button class="icon-btn" data-ledit="${cp.id}" aria-label="Editar aporte de ${esc(cp.name)}">${ic('edit')}</button><button class="icon-btn" data-ldel="${cp.id}" aria-label="Desvincular ${esc(cp.name)}">${ic('x')}</button></div></td></tr>`; }).join('')}</tbody></table></div>
   <p class="small ${sum>f.goal?'':'muted'}" style="margin-top:12px;${sum>f.goal?'color:var(--warning)':''}">${sum>f.goal?`Las campañas suman ${num(sum)}: superan la meta de ${num(f.goal)}. Revisá los aportes.`:sum<f.goal?`Asignado ${num(sum)} de ${num(f.goal)}. Faltan ${num(f.goal-sum)} sin campaña.`:`Asignada toda la meta: ${num(sum)}.`}</p>
   <p class="small muted">El «real informado» de cada campaña es solo una referencia: el resultado real del funnel se cuenta una sola vez, en la etapa, aunque esté vinculado a varias campañas.</p>`
   :`<p class="small muted">Todavía no hay campañas vinculadas. Vinculá una existente o elegí este funnel al crear una campaña.</p>`}</section>`;
}
function fHistory(f){
  const h=(f.history||[]).slice(0,30), c=fCalc(f);
  return `<section class="card"><div class="card-head"><h3>Historial de cambios</h3><span class="small muted">${(f.history||[]).length} cambio${(f.history||[]).length===1?'':'s'}</span></div>
   ${h.length?`<div class="table-wrap"><table class="t"><thead><tr><th>Cuándo</th><th>Cambio</th><th class="hide-m">Escenario</th><th class="num">Proyección final de entonces</th><th class="num hide-m">Real hoy</th></tr></thead><tbody>
   ${h.map(e=>{ const pf=e.proj&&e.proj.length?e.proj[e.proj.length-1]:null, pFirst=e.proj&&e.proj.length?e.proj[0]:null; return `<tr><td class="small">${fWhen(e.at)}<div class="muted">${esc(e.by)}</div></td><td><b>${esc(e.what)}</b>${e.from!==''||e.to!==''?`<div class="small muted">${e.from!==''?esc(e.from)+' → ':''}${esc(e.to)}</div>`:''}</td><td class="hide-m small">${esc(e.sc)}${e.period?`<div class="muted">${esc(e.period)}</div>`:''}</td>
     <td class="num small">${e.names&&e.names.length>1?`${esc(e.names[0])}: ${fNum(pFirst)}<br>`:''}${esc((e.names||[]).slice(-1)[0]||'')}: ${fNum(pf)}</td><td class="num hide-m small">${fNum(c.real[c.last])}</td></tr>`; }).join('')}</tbody></table></div>`:'<p class="small muted">Sin cambios todavía.</p>'}</section>`;
}
function fDetailInner(f){
  const c=fCalc(f), o=fObj(f);
  return `<div class="fz-top card"><div class="fz-goal"><label for="fgoal" class="label">Meta final</label><div class="fz-goal-in"><input class="input mono" id="fgoal" inputmode="numeric" value="${f.goal}" aria-describedby="fgoal-e"><select class="select" id="fgtype" aria-label="Tipo de conversión">${F_GOALTYPES.map(t=>`<option ${t===f.goalType?'selected':''}>${t}</option>`).join('')}</select></div><span class="err small" id="fgoal-e" role="alert"></span></div>
   <div class="fz-scen"><span class="label">Escenario</span><div class="seg" role="group" aria-label="Escenario">${F_SC.map(([k,l])=>`<button type="button" data-sc="${k}" aria-pressed="${f.active===k}">${l}</button>`).join('')}</div>
    <div class="small muted" style="margin-top:6px">El escenario elegido es el que usan las campañas. <button type="button" class="btn btn-ghost btn-sm" id="fcopy">${ic('copy')} Copiar tasas de otro escenario</button></div></div>
   <div class="fz-per"><span class="label">Período del objetivo</span><div><b>${esc(fPeriod(f)||'Sin período')}</b> <button type="button" class="btn btn-ghost btn-sm" id="fper" ${o?'':'disabled'}>Cambiar</button></div><div class="small muted">${periodRange(fPeriod(f))?'Los resultados del CRM se cuentan dentro de este período.':'Período sin fechas: el CRM cuenta todo.'}</div></div></div>
  <div class="grid g-dash" style="margin-top:16px"><section class="card span-7 fz-vcard"><div class="card-head"><h3>Funnel</h3><span class="small muted">Cambiá una tasa y se recalcula al instante</span></div>${fVisual(f,c)}</section>
   <div class="span-5 fz-side">${fTrack(f,c)}</div></div>
  ${fKpis(f,c)}
  <section class="card" style="margin-bottom:16px"><div class="card-head"><h3>Etapas</h3><button class="btn btn-sm" id="fadd">${ic('plus')} Agregar etapa</button></div>
   <div class="table-wrap"><table class="t fz-table"><thead><tr><th>#</th><th>Etapa</th><th class="num">Meta calculada</th><th class="num">Resultado real</th><th class="num">Tasa estimada</th><th class="num">Tasa real</th><th class="num">Cumplimiento</th><th></th></tr></thead><tbody>${f.stages.map((s,i)=>fStageRow(f,c,s,i)).join('')}</tbody></table></div>
   <p class="small muted" style="margin-top:12px">La última etapa es la conversión final y su meta es la meta del funnel. La tasa de cada etapa es la conversión desde la etapa anterior. Google Ads, GA4 y el CRM completo se conectan en una etapa posterior: por ahora el resultado real se carga a mano o se toma de las campañas y del CRM de Brandazo.</p></section>
  <div class="grid g-dash"><div class="span-5">${fSim(f,c)}</div><div class="span-7">${fCampaigns(f,c)}</div></div>
  <div style="margin-top:16px">${fHistory(f)}</div>`;
}
function vFunnelDetail(id){
  const f=FN().find(x=>x.id===id);
  if(f&&!f.refChecked){ f.refChecked=true; const none=F_SC.every(([k])=>!Object.keys(f.scenarios[k].rates).length); if(none&&fFillRef(f)) fLog(f,'Se cargaron tasas de referencia',null,'Reemplazalas por las tuyas cuando tengas datos'); }
  if(!f) return `<div class="card empty"><div class="eico">${ic('funnel')}</div><h3>No encontramos ese funnel</h3><p class="muted small">Puede que se haya eliminado o que pertenezca a otra empresa.</p><a class="btn" href="#/app/estrategia/funnel">Ver todos los funnels</a></div>`;
  return `<nav class="breadcrumbs" style="margin-bottom:8px"><a href="#/app/estrategia/funnel">Funnels</a>${ic('chevr')}<span>${esc(f.name)}</span></nav>
  <div class="page-head" style="margin-bottom:16px"><div style="min-width:0"><h2 class="fz-title">${esc(f.name)}</h2><div class="small muted fz-meta" style="margin-top:4px"><i class="sdot" style="background:${brandOf(fBrand(f)).color}"></i>${esc(fBrand(f)||'Sin marca')} · ${esc(fPeriod(f)||'Sin período')} · ${fObj(f)?`Objetivo: ${esc(fObj(f).title)}`:'Objetivo eliminado'}</div></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="fedit">${ic('edit')} Editar</button><button class="btn" id="fdup">${ic('copy')} Duplicar</button><button class="icon-btn" id="fdel" aria-label="Eliminar funnel" title="Eliminar">${ic('trash')}</button></div></div>
  <div id="fz" data-fid="${f.id}">${fDetailInner(f)}</div>`;
}

/* ---------- Comportamiento ---------- */
const fPend={};   // valor previo de cada campo en edición: el cambio se anota en el historial al salir del campo
function fMark(key,old){ if(!(key in fPend)) fPend[key]=old; }
function fCommit(key,now,log){ if(!(key in fPend)) return false; const old=fPend[key]; delete fPend[key]; if(old===now) return false; log(old); return true; }
let fRedrawing=false;   // al reemplazar el HTML, el navegador dispara «blur»: no es que la persona salió del campo
function fRedraw(f,focusId){
  const box=$('#fz'); if(!box) return render();
  const a=document.activeElement, fid=focusId||(a&&a.id), pos=a&&typeof a.selectionStart==='number'?a.selectionStart:null;
  fRedrawing=true; try{ box.innerHTML=fDetailInner(f); } finally { fRedrawing=false; } bFunnelDetail(f); persist();
  if(fid){ const el=document.getElementById(fid); if(el){ el.focus(); if(pos!=null&&el.setSelectionRange){ try{el.setSelectionRange(pos,pos)}catch(e){} } } }
}
function fForm(opts={}){
  const f=opts.f, objs=M().objectives.filter(o=>!curBrand()||o.brand===curBrand().name||(f&&o.id===f.objectiveId));
  if(!M().objectives.length){ modal('Primero creá un objetivo',`<p class="muted">Cada funnel pertenece a un objetivo comercial y toma de ahí la marca y el período.</p>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="gonewobj">${ic('plus')} Crear objetivo</button>`); $('#gonewobj').onclick=()=>{ closeLayer(); const b=$('#newobj'); if(b) b.click(); }; return; }
  const list=objs.length?objs:M().objectives;
  modal(f?'Editar funnel':'Nuevo funnel',`${F('fn','Nombre del funnel',`value="${esc(f?f.name:'')}" placeholder="Ej.: Ventas de tortas por Instagram"`)}
   <div class="field"><label for="fo">Objetivo comercial</label><select class="select" id="fo">${list.map(o=>`<option value="${o.id}" ${(f?f.objectiveId:opts.objectiveId)===o.id?'selected':''}>${esc(o.title)} · ${esc(o.brand)} · ${esc(o.period)}</option>`).join('')}</select><span class="hint">El funnel usa la marca y el período de este objetivo.</span></div>
   ${f?'':`<div class="form-grid"><div class="field"><label for="fg">Meta final</label><input class="input" id="fg" inputmode="numeric" placeholder="Ej.: 4"><span class="err" role="alert"></span></div><div class="field"><label for="ft">Tipo de conversión</label><select class="select" id="ft">${F_GOALTYPES.map(t=>`<option>${t}</option>`).join('')}</select></div></div>
   <div class="field"><span class="label">Etapas para empezar</span><div class="fz-tpls">${Object.entries(F_TEMPLATES).map(([k,t],i)=>`<label class="radio"><input type="radio" name="tpl" value="${k}" ${i===0?'checked':''}><span><b>${t.t}</b><br><span class="small muted">${t.d}</span></span></label>`).join('')}</div><span class="hint">Después podés agregar, renombrar, reordenar o eliminar etapas.</span></div>`}`,
   `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="fok">${f?'Guardar cambios':'Crear funnel'}</button>`);
  $('#fok').onclick=()=>{ const nm=$('#fn'); let ok=fieldErr(nm,!nm.value.trim()?'Poné un nombre':'');
    if(f){ if(!ok) return; const oldO=fObj(f); if(nm.value.trim()!==f.name){ fLog(f,'Cambiaste el nombre',f.name,nm.value.trim()); f.name=nm.value.trim(); }
      if($('#fo').value!==f.objectiveId){ const no=M().objectives.find(o=>o.id===$('#fo').value); f.objectiveId=no.id; fLog(f,'Cambiaste el objetivo',oldO?oldO.title:'—',no.title); }
      closeLayer(); render(); toast('Funnel actualizado'); return; }
    const g=fParseInt($('#fg').value); ok=fieldErr($('#fg'),g.err||(g.v==null?'Poné la meta final':g.v<1?'La meta tiene que ser al menos 1':''))&&ok; if(!ok) return;
    const nf=fNew({name:nm.value.trim(),objectiveId:$('#fo').value,goal:g.v,goalType:$('#ft').value,tpl:($$('#layer input[name=tpl]:checked')[0]||{}).value});
    FN().unshift(nf); logAct(`Creaste el funnel ${nf.name}`); closeLayer(); go('#/app/estrategia/funnel/'+nf.id); toast('Funnel creado'); };
}
function fStageForm(f,i){
  const isNew=i==null, s=isNew?{name:'',type:'lead',source:'manual',campOnly:false}:f.stages[i];
  modal(isNew?'Agregar etapa':'Editar etapa',`${F('sn','Nombre',`value="${esc(s.name)}" placeholder="Ej.: Visitas a la web"`)}
   <div class="form-grid"><div class="field"><label for="sty">Tipo de conversión</label><select class="select" id="sty">${F_TYPES.map(([k,l])=>`<option value="${k}" ${k===s.type?'selected':''}>${l}</option>`).join('')}</select><span class="hint">Sirve para el simulador: clic usa CPC, lead usa CPL.</span></div>
   <div class="field"><label for="ssrc">Resultado real</label><select class="select" id="ssrc">${F_SOURCES.map(([k,l])=>`<option value="${k}" ${k===(s.source||'manual')?'selected':''} ${k.startsWith('soon')?'disabled':''}>${l}</option>`).join('')}</select></div></div>
   <label class="check" id="scow" style="${(s.source||'').startsWith('crm-contacts')||(s.source||'').startsWith('crm-clients')?'':'display:none'}"><input type="checkbox" id="sco" ${s.campOnly?'checked':''}> Contar solo contactos que llegaron por las campañas vinculadas</label>
   ${isNew?`<div class="field" style="margin-top:12px"><label for="spos">Ubicación</label><select class="select" id="spos">${f.stages.map((x,k)=>`<option value="${k}">Antes de «${esc(x.name)}»</option>`).join('')}</select><span class="hint">La última etapa es siempre la conversión final.</span></div>`:''}`,
   `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="sok">${isNew?'Agregar':'Guardar'}</button>`);
  $('#ssrc').onchange=()=>{ $('#scow').style.display=/^crm-(contacts|clients)$/.test($('#ssrc').value)?'':'none'; };
  if(isNew&&f.stages.length) $('#spos').value=String(f.stages.length-1);
  $('#sok').onclick=()=>{ const nm=$('#sn').value.trim(); if(!fieldErr($('#sn'),!nm?'Poné un nombre':''))return;
    const data={name:nm,type:$('#sty').value,source:$('#ssrc').value,campOnly:$('#sco').checked};
    if(isNew){ const pos=+$('#spos').value; const ns={id:uid(),real:null,...data}; f.stages.splice(pos,0,ns); fLog(f,'Agregaste una etapa',null,nm); const nx=f.stages[pos+1]; fFillRef(f,[ns.id].concat(nx?[nx.id]:[])); }
    else { const ch=[]; if(s.name!==nm) ch.push(`nombre «${s.name}» → «${nm}»`); if(s.type!==data.type) ch.push(`tipo ${fTypeLabel(s.type)} → ${fTypeLabel(data.type)}`); if((s.source||'manual')!==data.source) ch.push(`fuente → ${fSrcLabel(data.source)}`); Object.assign(s,data); if(ch.length) fLog(f,`Editaste la etapa «${nm}»`,null,ch.join(' · ')); }
    closeLayer(); fRedraw(f); toast(isNew?'Etapa agregada':'Etapa actualizada'); };
}
function fLinkForm(f,campId){
  const sc=f.scenarios[f.active], existing=(f.campaigns||[]).find(l=>l.id===campId);
  const avail=M().campaigns.filter(c=>c.brand===fBrand(f)&&(campId?c.id===campId:!(f.campaigns||[]).some(l=>l.id===c.id)));
  if(!avail.length){ modal('Vincular campaña',`<p class="muted">No hay campañas de ${esc(fBrand(f))} sin vincular. Creá una desde Campañas: en el último paso vas a poder elegir este funnel.</p>`,`<button class="btn" data-close>Cerrar</button><a class="btn btn-primary" href="#/app/campanas">Ir a Campañas</a>`); return; }
  modal(existing?'Editar aporte de la campaña':'Vincular campaña',`<div class="field"><label for="lc">Campaña</label><select class="select" id="lc" ${existing?'disabled':''}>${avail.map(c=>`<option value="${c.id}">${esc(c.name)} · ${esc(c.status)}</option>`).join('')}</select></div>
   <div class="form-grid"><div class="field"><label for="lm">Aporte</label><select class="select" id="lm"><option value="qty" ${existing&&existing.mode==='qty'?'selected':''}>Cantidad de ${esc(f.goalType.toLowerCase())}</option><option value="pct" ${existing&&existing.mode==='pct'?'selected':''}>% de la meta final</option></select></div>
   <div class="field"><label for="lv">Valor</label><input class="input" id="lv" inputmode="decimal" value="${existing?String(existing.value).replace('.',','):''}" placeholder="Ej.: 2"><span class="err" role="alert"></span></div></div>
   <p class="small muted">Meta final del funnel: ${num(f.goal)} ${esc(f.goalType.toLowerCase())}. Las metas de las etapas previas de la campaña se calculan con las tasas del escenario ${fScName(f.active).toLowerCase()}.</p>`,
   `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="lok">${existing?'Guardar':'Vincular'}</button>`);
  $('#lok').onclick=()=>{ const mode=$('#lm').value, raw=String($('#lv').value).replace(',','.').trim(), v=Number(raw);
    const err=raw===''?'Poné un valor':!isFinite(v)||v<=0?'Tiene que ser mayor que 0':mode==='pct'&&v>100?'No puede superar 100 %':mode==='qty'&&!Number.isInteger(v)?'Tiene que ser un número entero':''; if(!fieldErr($('#lv'),err)) return;
    const cid=existing?existing.id:$('#lc').value, cp=M().campaigns.find(c=>c.id===cid), txt=mode==='pct'?`${fPctTxt(v)} de la meta`:`${num(v)} ${f.goalType.toLowerCase()}`;
    if(existing){ fLog(f,`Cambiaste el aporte de «${cp.name}»`,existing.mode==='pct'?fPctTxt(existing.value):num(existing.value),txt); existing.mode=mode; existing.value=v; }
    else { f.campaigns=(f.campaigns||[]).concat({id:cid,mode,value:v}); fLog(f,`Vinculaste «${cp.name}»`,null,txt); }
    closeLayer(); fRedraw(f); toast(existing?'Aporte actualizado':'Campaña vinculada'); };
}
function bFunnelDetail(f){
  const on=(s,fn)=>{const e=$(s);if(e)e.onclick=fn};
  const sc=()=>f.scenarios[f.active];
  // Meta final: recalcula al escribir, registra al salir del campo
  const g=$('#fgoal'); if(g){
    g.oninput=()=>{ const r=fParseInt(g.value), err=r.err||(r.v==null?'Poné la meta final':r.v<1?'La meta tiene que ser al menos 1':''); $('#fgoal-e').textContent=err; g.closest('.fz-goal').classList.toggle('has-error',!!err); if(err) return; if(r.v!==f.goal){ fMark(f.id+':goal',f.goal); f.goal=r.v; fRedraw(f,'fgoal'); } };
    g.onblur=()=>{ if(fRedrawing||!g.isConnected) return; if(fCommit(f.id+':goal',f.goal,old=>fLog(f,'Cambiaste la meta final',num(old),num(f.goal)))) setTimeout(()=>fRedraw(f),0); }; }
  const gt=$('#fgtype'); if(gt) gt.onchange=()=>{ fLog(f,'Cambiaste el tipo de conversión',f.goalType,gt.value); f.goalType=gt.value; fRedraw(f); };
  // Tasas: editables desde el funnel; recalcula al escribir
  $$('[data-rate]').forEach(inp=>{ const sid=inp.dataset.rate, key=()=>f.id+':rate:'+f.active+':'+sid;
    const errEl=()=>document.getElementById('rte-'+sid);
    inp.oninput=()=>{ const r=fParseRate(inp.value); if(r.err){ errEl().textContent=r.err; inp.classList.add('is-bad'); return; } inp.classList.remove('is-bad');
      const cur=sc().rates[sid]; if(cur===r.v||(cur==null&&r.v==null)){ errEl().textContent=''; return; } fMark(key(),cur); if(sc().ref) delete sc().ref[sid]; if(r.v==null) delete sc().rates[sid]; else sc().rates[sid]=r.v; fRedraw(f,inp.id); };
    inp.onblur=()=>{ if(fRedrawing||!inp.isConnected) return; const now=sc().rates[sid], s=f.stages.find(x=>x.id===sid);
      if(fCommit(key(),now,old=>fLog(f,`Tasa de «${s?s.name:''}»`,old>0?fPctTxt(old):'sin tasa',now>0?fPctTxt(now):'sin tasa'))) setTimeout(()=>fRedraw(f),0); }; });
  // Costos del simulador
  $$('[data-cost]').forEach(inp=>{ const k=inp.dataset.cost, key=()=>f.id+':cost:'+f.active+':'+k;
    inp.oninput=()=>{ const r=fParseMoney(inp.value); fieldErr(inp,r.err||''); if(r.err) return; sc().costs=sc().costs||{}; const cur=sc().costs[k]??null; if(cur!==r.v){ fMark(key(),cur); sc().costs[k]=r.v; fRedraw(f,inp.id); } };
    inp.onblur=()=>{ if(fRedrawing||!inp.isConnected) return; const now=(sc().costs||{})[k]??null; if(fCommit(key(),now,old=>fLog(f,`Costo ${k.toUpperCase()}`,old!=null?money(old):'sin dato',now!=null?money(now):'sin dato'))) setTimeout(()=>fRedraw(f),0); }; });
  // Resultados reales (carga manual): recalcula al escribir
  $$('[data-real]').forEach(inp=>{ const s=f.stages.find(x=>x.id===inp.dataset.real);
    inp.oninput=()=>{ const r=fParseInt(inp.value); if(r.err){ inp.classList.add('is-bad'); inp.title=r.err; return; } inp.classList.remove('is-bad'); inp.title=''; if(s.real!==r.v){ s.real=r.v; fRedraw(f,inp.id); } }; });
  $$('[data-fillref]').forEach(b=>b.onclick=()=>{ const n=fFillRef(f); if(n) fLog(f,'Se cargaron tasas de referencia',null,`${n} tasa${n>1?'s':''}`); fRedraw(f); toast(n?'Listo: el funnel ya calcula cada etapa':'No hay tasas de referencia para estas etapas'); });
  $$('[data-gorate]').forEach(b=>b.onclick=()=>{ const el=document.getElementById(b.dataset.gorate); if(el){ el.scrollIntoView({block:'center',behavior:'smooth'}); el.focus(); } });
  // Escenarios
  $$('[data-sc]').forEach(b=>b.onclick=()=>{ if(f.active===b.dataset.sc) return; const prev=f.active; f.active=b.dataset.sc; fLog(f,'Cambiaste el escenario activo',fScName(prev),fScName(f.active)); fRedraw(f); });
  on('#fcopy',()=>{ const others=F_SC.filter(([k])=>k!==f.active);
    modal('Copiar tasas',`<p class="muted" style="margin-bottom:12px">Se reemplazan las tasas y los costos del escenario <b>${fScName(f.active).toLowerCase()}</b>.</p><div style="display:flex;flex-direction:column;gap:8px">${others.map(([k,l],i)=>`<label class="radio"><input type="radio" name="cpf" value="${k}" ${i===0?'checked':''}> Desde ${l.toLowerCase()}</label>`).join('')}</div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="cok">Copiar</button>`);
    $('#cok').onclick=()=>{ const from=$$('#layer input[name=cpf]:checked')[0].value, src=f.scenarios[from]; f.scenarios[f.active]={rates:{...src.rates},costs:{...(src.costs||{})},ref:{...(src.ref||{})}}; fLog(f,`Copiaste tasas de ${fScName(from).toLowerCase()}`,null,`a ${fScName(f.active).toLowerCase()}`); closeLayer(); fRedraw(f); toast('Tasas copiadas'); }; });
  // Período (pertenece al objetivo)
  on('#fper',()=>{ const o=fObj(f); if(!o) return; const others=FN().filter(x=>x.objectiveId===o.id&&x!==f);
    modal('Cambiar período del objetivo',`<div class="field"><label for="pp2">Período</label><select class="select" id="pp2">${periodOptions(o.period).map(p=>`<option ${p===o.period?'selected':''}>${p}</option>`).join('')}</select></div><p class="small muted">El período es del objetivo «${esc(o.title)}»${others.length?` y también cambia en sus otros ${others.length} funnel${others.length>1?'s':''}`:''}. La meta no se reparte sola: cambia qué resultados reales cuentan.</p>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="pok">Cambiar</button>`);
    $('#pok').onclick=()=>{ const np=$('#pp2').value; if(np===o.period) return closeLayer(); const old=o.period; o.period=np; [f,...others].forEach(x=>fLog(x,'Cambiaste el período del objetivo',old,np)); closeLayer(); fRedraw(f); toast('Período actualizado'); }; });
  // Etapas
  on('#fadd',()=>fStageForm(f));
  $$('[data-sedit]').forEach(b=>b.onclick=()=>fStageForm(f,+b.dataset.sedit));
  const move=(i,d)=>{ const j=i+d; if(j<0||j>=f.stages.length) return; const a=f.stages[i]; f.stages.splice(i,1); f.stages.splice(j,0,a); fLog(f,'Reordenaste las etapas',null,f.stages.map(s=>s.name).join(' → ')); fRedraw(f); };
  $$('[data-sup]').forEach(b=>b.onclick=()=>move(+b.dataset.sup,-1)); $$('[data-sdown]').forEach(b=>b.onclick=()=>move(+b.dataset.sdown,1));
  $$('[data-sdel]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.sdel, s=f.stages[i]; if(f.stages.length===1) return;
    modal('¿Eliminar la etapa?',`<p>Vas a eliminar «<b>${esc(s.name)}</b>» con su tasa y su resultado real.${i===f.stages.length-1?' La etapa anterior pasa a ser la conversión final.':''}</p>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-danger" id="dok">Eliminar</button>`);
    $('#dok').onclick=()=>{ f.stages.splice(i,1); F_SC.forEach(([k])=>delete f.scenarios[k].rates[s.id]); fLog(f,'Eliminaste una etapa',s.name,null); closeLayer(); fRedraw(f); toast('Etapa eliminada'); }; });
  // Campañas
  on('#flink',()=>fLinkForm(f));
  $$('[data-ledit]').forEach(b=>b.onclick=()=>fLinkForm(f,b.dataset.ledit));
  $$('[data-ldel]').forEach(b=>b.onclick=()=>{ const cp=M().campaigns.find(c=>c.id===b.dataset.ldel); f.campaigns=f.campaigns.filter(l=>l.id!==b.dataset.ldel); fLog(f,`Desvinculaste «${cp?cp.name:''}»`,null,null); fRedraw(f); toast('Campaña desvinculada'); });
}
function fDelete(f,after){
  modal('¿Eliminar el funnel?',`<p>Vas a eliminar «<b>${esc(f.name)}</b>» con sus escenarios, campañas vinculadas e historial. Las campañas no se borran.</p>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-danger" id="fdok">Eliminar</button>`);
  $('#fdok').onclick=()=>{ const m=M(); m.funnels=FN().filter(x=>x!==f); logAct(`Eliminaste el funnel ${f.name}`); closeLayer(); after(); toast('Funnel eliminado'); };
}
function bFunnelTab(id){
  bindDemo();
  const on=(s,fn)=>{const e=$(s);if(e)e.onclick=fn};
  if(!id){
    [$('#newfunnel'),...$$('[data-newfunnel]')].filter(Boolean).forEach(b=>b.onclick=()=>fForm());
    $$('[data-fdup]').forEach(b=>b.onclick=()=>{ const f=FN().find(x=>x.id===b.dataset.fdup); const g=fDuplicate(f); logAct(`Duplicaste el funnel ${f.name}`); go('#/app/estrategia/funnel/'+g.id); toast('Funnel duplicado (sin campañas ni resultados reales)'); });
    $$('[data-fdel]').forEach(b=>b.onclick=()=>fDelete(FN().find(x=>x.id===b.dataset.fdel),render));
    return; }
  const f=FN().find(x=>x.id===id); if(!f) return;
  on('#fedit',()=>fForm({f})); on('#fdup',()=>{ const g=fDuplicate(f); go('#/app/estrategia/funnel/'+g.id); toast('Funnel duplicado (sin campañas ni resultados reales)'); });
  on('#fdel',()=>fDelete(f,()=>go('#/app/estrategia/funnel')));
  bFunnelDetail(f);
}

/* ---------- Integración con Estrategia ---------- */
Object.assign(P,{funnel:'M3 4h18l-7 8v6l-4 2v-8z',copy:'M8 8h12v12H8zM4 16V4h12',up:'M6 15l6-6 6 6'});
ST_TABS.splice(ST_TABS.findIndex(t=>t[0]==='personas')+1,0,['funnel','Funnel de conversión']);
const _vEstrategia=vEstrategia, _bEstrategia=bEstrategia;
vEstrategia=function(tab){
  if(tab!=='funnel') return _vEstrategia(tab);
  const id=location.hash.split('/')[4]||'';
  const head=pageHead('Estrategia','Objetivos, públicos, posicionamiento, planes y presupuesto de cada unidad de negocio.',`${brandScope()}<button class="btn btn-primary" id="newobj">${ic('plus')} Nuevo objetivo</button>`)+subTabs('estrategia',ST_TABS,'funnel');
  return head+(id?vFunnelDetail(id):vFunnelList());
};
bEstrategia=function(tab){ _bEstrategia(tab); if(tab==='funnel') bFunnelTab(location.hash.split('/')[4]||''); bObjFunnel(); };
VIEWS.estrategia.view=vEstrategia; VIEWS.estrategia.bind=bEstrategia;
/* Botón «Funnel» en cada objetivo */
const _objCard=objCard;
objCard=function(o){ const fs=FN().filter(f=>f.objectiveId===o.id);
  const foot=`<div class="obj-foot"><button class="btn btn-sm" data-ofunnel="${o.id}">${ic('funnel')} ${fs.length?`Funnel${fs.length>1?`s (${fs.length})`:''}`:'Crear funnel'}</button>${fs.length===1?`<span class="small muted">Meta: ${num(fs[0].goal)} ${esc(fs[0].goalType.toLowerCase())}</span>`:''}</div>`;
  const h=_objCard(o); const k=h.lastIndexOf('</article>'); return h.slice(0,k)+foot+h.slice(k); };
function bObjFunnel(){ $$('[data-ofunnel]').forEach(b=>b.onclick=()=>{ const oid=b.dataset.ofunnel, fs=FN().filter(f=>f.objectiveId===oid);
  if(fs.length===1) return go('#/app/estrategia/funnel/'+fs[0].id); if(fs.length>1) return go('#/app/estrategia/funnel'); fForm({objectiveId:oid}); }); }

/* ---------- Integración con Campañas (usan las proyecciones del funnel) ---------- */
function fWizField(d){
  const fs=FN().filter(f=>fBrand(f)===d.brand);
  if(!fs.length) return `<div class="field"><span class="label">Funnel de conversión</span><span class="small muted">No hay funnels de ${esc(d.brand)}. Podés crearlos en Estrategia → Funnel de conversión.</span></div>`;
  const f=fs.find(x=>x.id===d.funnel);
  return `<div class="field"><label for="wf">Funnel de conversión (opcional)</label><select class="select" id="wf"><option value="">Sin funnel</option>${fs.map(x=>`<option value="${x.id}" ${x.id===d.funnel?'selected':''}>${esc(x.name)} · meta ${num(x.goal)}</option>`).join('')}</select></div>
   ${f?`<div class="form-grid"><div class="field"><label for="wfm">Aporte de la campaña</label><select class="select" id="wfm"><option value="qty" ${d.fmode!=='pct'?'selected':''}>Cantidad de ${esc(f.goalType.toLowerCase())}</option><option value="pct" ${d.fmode==='pct'?'selected':''}>% de la meta</option></select></div><div class="field"><label for="wfv">Valor</label><input class="input" id="wfv" inputmode="decimal" value="${esc(d.fval||'')}" placeholder="Ej.: 2"><span class="err" role="alert"></span></div></div>`:''}`;
}
function fWizSave(d,validate){
  const s=$('#wf'); d.funnel=s?s.value:''; const m=$('#wfm'), v=$('#wfv'); d.fmode=m?m.value:'qty'; d.fval=v?v.value:'';
  if(!validate||!d.funnel||!v) return true;
  const raw=String(d.fval).replace(',','.').trim(), n=Number(raw);
  return fieldErr(v,raw===''?'Poné el aporte de la campaña':!isFinite(n)||n<=0?'Tiene que ser mayor que 0':d.fmode==='pct'&&n>100?'No puede superar 100 %':d.fmode==='qty'&&!Number.isInteger(n)?'Tiene que ser un número entero':'');
}
function fWizLink(c,d){
  if(!d.funnel) return; const f=FN().find(x=>x.id===d.funnel); if(!f) return; const v=Number(String(d.fval).replace(',','.'));
  f.campaigns=(f.campaigns||[]).concat({id:c.id,mode:d.fmode==='pct'?'pct':'qty',value:v});
  fLog(f,`Vinculaste «${c.name}»`,null,d.fmode==='pct'?`${fPctTxt(v)} de la meta`:`${num(v)} ${f.goalType.toLowerCase()}`);
}
const fForCamp=id=>FN().filter(f=>(f.campaigns||[]).some(l=>l.id===id));

render();
