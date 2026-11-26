/* =====================================================================
   CRM → SALAS: agenda de las salas de coworking (reservas de la web, a mano y bloqueos)
   - Configuración: tenants/{t}/settings/coworking (salas, horarios). La solapa aparece solo si existe.
   - Reservas: tenants/{t}/cwReservations (las crea, mueve y cancela el servidor: nunca se superponen).
   ===================================================================== */
const CW={ tid:null, cfg:null, cfgLoaded:false, unsubCfg:null, date:null, unsubDay:null, items:[], dayLoaded:false };
const cwToday=()=>{ const d=new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10); };
const cwMin=s=>{ const m=String(s||'').match(/^(\d{1,2}):(\d{2})/); return m?+m[1]*60+ +m[2]:null; };
const cwHM=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const cwAdd=(iso,n)=>new Date(Date.parse(iso+'T12:00:00Z')+n*864e5).toISOString().slice(0,10);
const cwDow=iso=>new Date(iso+'T12:00:00Z').getUTCDay();
const cwDayName=iso=>['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][cwDow(iso)];
const cwOpen=(iso)=>((CW.cfg&&CW.cfg.hours&&(CW.cfg.hours[cwDow(iso)]||CW.cfg.hours[String(cwDow(iso))]))||[]).map(w=>String(w).split('-').map(cwMin)).filter(([a,b])=>a!=null&&b>a);
const cwRooms=()=>((CW.cfg&&CW.cfg.rooms)||[]).slice().sort((a,b)=>a.capacity-b.capacity);
function cwListen(){
  if(!(S.company&&S.company.cloud&&typeof fbDb!=='undefined'&&fbDb)) return; const c=S.company;
  if(CW.tid!==c.tid){ if(CW.unsubCfg) CW.unsubCfg(); if(CW.unsubDay) CW.unsubDay(); Object.assign(CW,{tid:c.tid,cfg:null,cfgLoaded:false,unsubCfg:null,unsubDay:null,date:null,items:[],dayLoaded:false});
    CW.unsubCfg=fbDb.doc(`tenants/${c.tid}/settings/coworking`).onSnapshot(s=>{ CW.cfg=s.exists?s.data():null; CW.cfgLoaded=true; cwRefresh(); },()=>{ CW.cfgLoaded=true; cwRefresh(); });
    C.unsub.push(()=>{ if(CW.unsubCfg) CW.unsubCfg(); if(CW.unsubDay) CW.unsubDay(); CW.unsubCfg=CW.unsubDay=null; CW.tid=null; CW.subDate=null; }); }
}
function cwDay(date){ if(CW.subDate===date&&CW.unsubDay) return; if(CW.unsubDay) CW.unsubDay(); CW.date=CW.subDate=date; CW.items=[]; CW.dayLoaded=false;
  CW.unsubDay=fbDb.collection(`tenants/${S.company.tid}/cwReservations`).where('date','==',date).onSnapshot(s=>{ CW.items=s.docs.map(d=>({id:d.id,...d.data()})); CW.dayLoaded=true; cwRefresh(); },()=>{ CW.dayLoaded=true; cwRefresh(); }); }
function cwRefresh(){ if(!/^#\/app\/crm/.test(location.hash)) return; if(/crm\/salas/.test(location.hash)||(CW.cfg&&!CW.tabAdded)){ if($('#layer').children.length){ CW.dirty=true; return; } render(); } }
new MutationObserver(()=>{ if(CW.dirty&&!$('#layer').children.length&&/crm\/salas/.test(location.hash)){ CW.dirty=false; render(); } }).observe(document.body,{childList:true,subtree:true});

const CWR_SRC={web:['Web','badge-brand'],manual:['A mano','badge'],bloqueo:['Bloqueo','badge-warn']};
function vSalas(){
  cwListen(); if(!CW.cfgLoaded) return `<div class="card empty"><p class="muted">Cargando…</p></div>`;
  if(!CW.cfg) return `<div class="card empty"><h3>Todavía no hay salas configuradas</h3><p class="muted small">Pedinos que las configuremos (salas, capacidad y horarios).</p></div>`;
  const date=CW.date||cwToday(); cwDay(date);
  const rooms=cwRooms(), open=cwOpen(date), act=CW.items.filter(r=>r.status==='active');
  const lo=Math.min(open.length?open[0][0]:480,...act.map(r=>cwMin(r.from))), hi=Math.max(open.length?open[open.length-1][1]:1260,...act.map(r=>cwMin(r.to)));
  const span=hi-lo, pct=m=>((m-lo)/span*100).toFixed(3)+'%', w=(a,b)=>((b-a)/span*100).toFixed(3)+'%';
  const ticks=[]; for(let m=Math.ceil(lo/60)*60;m<=hi;m+=60) ticks.push(m);
  const closed=[]; let cur=lo; open.forEach(([a,b])=>{ if(a>cur) closed.push([cur,a]); cur=Math.max(cur,b); }); if(cur<hi) closed.push([cur,hi]);
  const busyMin=act.reduce((s,r)=>s+(cwMin(r.to)-cwMin(r.from)),0), openMin=open.reduce((s,[a,b])=>s+b-a,0)*rooms.length;
  const head=`<div class="toolbar cw-bar"><button class="btn btn-sm" data-cwd="-1" aria-label="Día anterior">‹</button><label class="sr" for="cwdate">Día</label><input class="input sm" type="date" id="cwdate" value="${date}"><button class="btn btn-sm" data-cwd="1" aria-label="Día siguiente">›</button>
    ${date!==cwToday()?'<button class="btn btn-sm" data-cwd="0">Hoy</button>':''}<b class="cw-dayname">${cwDayName(date)} ${evDate(date)}</b><span class="grow"></span>
    <button class="btn btn-sm" data-cwblock>${ic('lock')} Bloquear sala</button><button class="btn btn-sm btn-primary" data-cwnew>${ic('plus')} Nueva reserva</button></div>
    <p class="small muted cw-sub">${open.length?`Abierto ${open.map(([a,b])=>`${cwHM(a)} a ${cwHM(b)}`).join(' y ')} · ${act.filter(r=>r.source!=='bloqueo').length} reserva${act.filter(r=>r.source!=='bloqueo').length===1?'':'s'} · ${openMin?Math.round(busyMin/openMin*100):0}% ocupado`:'Cerrado este día'}</p>`;
  if(!CW.dayLoaded) return head+`<div class="card empty"><p class="muted">Cargando…</p></div>`;
  const block=r=>{ const [sl]=CWR_SRC[r.source]||['']; return `<button class="cw-res ${r.source==='bloqueo'?'blq':''}" style="left:${pct(cwMin(r.from))};width:${w(cwMin(r.from),cwMin(r.to))}" data-cwres="${esc(r.id)}" title="${esc(`${r.from} a ${r.to} · ${r.source==='bloqueo'?(r.note||'Bloqueo'):`${r.name||''} · ${r.people} pers.`}`)}">
    <b>${esc(r.source==='bloqueo'?(r.note||'Bloqueada'):(r.name||'Sin nombre'))}</b><span>${r.from}–${r.to}${r.people?` · ${r.people} pers.`:''}</span><i class="cw-tag">${sl}</i></button>`; };
  const grid=`<div class="card cw-card"><div class="cw-grid">
    <div class="cw-row cw-ticks"><div class="cw-room"></div><div class="cw-track">${ticks.map(m=>`<span style="left:${pct(m)}">${cwHM(m)}</span>`).join('')}</div></div>
    ${rooms.map(rm=>`<div class="cw-row"><div class="cw-room"><b>${esc(rm.name)}</b><span class="small muted">hasta ${rm.capacity}</span></div><div class="cw-track">
      ${ticks.map(m=>`<i class="cw-line" style="left:${pct(m)}"></i>`).join('')}${closed.map(([a,b])=>`<i class="cw-closed" style="left:${pct(a)};width:${w(a,b)}"></i>`).join('')}
      ${act.filter(r=>r.roomId===rm.id).map(block).join('')}</div></div>`).join('')}</div></div>`;
  const list=`<div class="cw-list">${rooms.map(rm=>{ const l=act.filter(r=>r.roomId===rm.id).sort((a,b)=>a.from.localeCompare(b.from));
    return `<section class="card"><h3>${esc(rm.name)} <span class="small muted">· hasta ${rm.capacity}</span></h3>${l.length?l.map(r=>`<button class="cw-li" data-cwres="${esc(r.id)}"><span class="mono">${r.from}–${r.to}</span><span><b>${esc(r.source==='bloqueo'?(r.note||'Bloqueada'):(r.name||''))}</b>${r.people?` · ${r.people} pers.`:''}</span><span class="badge ${(CWR_SRC[r.source]||[])[1]||''}">${(CWR_SRC[r.source]||[''])[0]}</span></button>`).join(''):'<p class="small muted">Libre todo el día.</p>'}</section>`; }).join('')}</div>`;
  return head+grid+list;
}
const cwTimes=(sel)=>{ const o=[]; for(let m=6*60;m<=23*60+30;m+=30) o.push(`<option ${cwHM(m)===sel?'selected':''}>${cwHM(m)}</option>`); return o.join(''); };
const cwPost=b=>lcPost(b);
function cwErr(j,map){ const d=(j.error&&j.error.details)||[]; d.forEach(x=>{ const el=$(map[x.field]); if(el) fieldErr(el,x.issue); }); if(!d.length) toast((j.error&&j.error.message)||'No se pudo. Probá de nuevo.'); }
const cwRid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
function cwForm(mode,pre={}){
  const block=mode==='bloqueo', rooms=cwRooms(), date=pre.date||CW.date||cwToday(), rid=cwRid();
  modal(block?'Bloquear una sala':'Nueva reserva',`
    ${block?'':`<div class="form-grid">${F('cwn','Nombre','maxlength="120"')}${F('cwp','WhatsApp','inputmode="tel" maxlength="30"')}</div><div class="form-grid">${F('cwe','Email (opcional)','type="email" maxlength="200"')}${F('cwpe','Personas',`type="number" min="1" max="${Math.max(...rooms.map(r=>r.capacity))}" value="${pre.people||''}"`)}</div>`}
    <div class="form-grid">${F('cwdt','Día',`type="date" value="${date}"`)}<div class="field"><label for="cwr">Sala</label><select class="select" id="cwr">${block?'':'<option value="">La más chica que entre (automática)</option>'}${rooms.map(r=>`<option value="${r.id}">${esc(r.name)} (hasta ${r.capacity})</option>`).join('')}</select><span class="err" role="alert"></span></div></div>
    <div class="form-grid"><div class="field"><label for="cwf">Desde</label><select class="select" id="cwf">${cwTimes(pre.from||'10:00')}</select><span class="err" role="alert"></span></div><div class="field"><label for="cwt">Hasta</label><select class="select" id="cwt">${cwTimes(pre.to||'12:00')}</select><span class="err" role="alert"></span></div></div>
    ${block?F('cwno','Motivo','maxlength="200" placeholder="Ej.: evento privado, mantenimiento"'):`<div class="form-grid"><div class="field"><label for="cwch">Cómo llegó</label><select class="select" id="cwch">${['WhatsApp','En persona','Teléfono','Instagram','Otro'].map(x=>`<option>${x}</option>`).join('')}</select></div>${F('cwno','Nota (opcional)','maxlength="200"')}</div>`}`,
    `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="cwok">${block?'Bloquear':'Reservar'}</button>`);
  $('#cwok').onclick=async()=>{ const b=$('#cwok'); b.classList.add('is-loading'); b.disabled=true;
    const body={kind:'cw-reserve',mode:block?'bloqueo':'reserva',requestId:rid,date:$('#cwdt').value,from:$('#cwf').value,to:$('#cwt').value,roomId:$('#cwr').value||null,note:$('#cwno').value.trim(),
      ...(block?{}:{people:+$('#cwpe').value,channel:$('#cwch').value,contact:{name:$('#cwn').value.trim(),phone:$('#cwp').value.trim(),email:$('#cwe').value.trim()}})};
    const {ok,j}=await cwPost(body); b.classList.remove('is-loading'); b.disabled=false;
    if(!ok){ if(j.error&&j.error.code==='SLOT_TAKEN'){ fieldErr($('#cwf'),j.error.message); toast(j.error.message); return; }
      cwErr(j,{'contact.name':'#cwn','contact.phone':'#cwp',people:'#cwpe',date:'#cwdt',from:'#cwf',to:'#cwt',roomId:'#cwr'}); return; }
    layerDirty=false; closeLayer(); CW.date=body.date; render(); const r=j.reservation||{}; toast(block?`${r.roomName||'Sala'} bloqueada de ${r.from} a ${r.to}`:`Reservado: ${r.roomName} de ${r.from} a ${r.to}`); };
}
function cwDetail(id){
  const r=CW.items.find(x=>x.id===id); if(!r) return; const rm=cwRooms().find(x=>x.id===r.roomId)||{}, blq=r.source==='bloqueo';
  const wa=r.phone?String(r.phone).replace(/\D/g,''):''; const waNum=wa.length===10?'549'+wa:wa;
  modal(blq?'Sala bloqueada':esc(r.name||'Reserva'),`
    <div class="settings-row"><div><b>${esc(rm.name||r.roomId)}</b><div class="small muted">${cwDayName(r.date)} ${evDate(r.date)} · ${r.from} a ${r.to}${r.people?` · ${r.people} persona${r.people===1?'':'s'}`:''}</div></div><span class="badge ${(CWR_SRC[r.source]||[])[1]||''}">${(CWR_SRC[r.source]||[''])[0]}</span></div>
    ${blq?`<p class="small">${esc(r.note||'Sin motivo')} · por ${esc(r.byName||'—')}</p>`:`<p class="small">${r.phone?`WhatsApp <b>${esc(r.phone)}</b>`:''}${r.email?` · ${esc(r.email)}`:''}${r.channel?` · llegó por ${esc(r.channel)}`:''}${r.note?`<br>${esc(r.note)}`:''}</p>`}
    <p class="small muted">${(r.history||[]).map(h=>`${esc(h.action)} ${new Date(h.at).toLocaleString('es-AR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}${h.by?' · '+esc(h.by):''}`).join(' · ')}</p>`,
    `${waNum?`<a class="btn" href="https://wa.me/${waNum}" target="_blank" rel="noopener">${ic('message')} WhatsApp</a>`:''}${r.contactId?`<button class="btn" data-cwficha>Ficha</button>`:''}<span class="grow"></span><button class="btn" data-cwmove>Mover</button><button class="btn btn-danger" data-cwcancel>${blq?'Desbloquear':'Cancelar reserva'}</button>`);
  const f=$('[data-cwficha]'); if(f) f.onclick=()=>{ closeLayer(); evContacto(r.contactId); };
  $('[data-cwcancel]').onclick=()=>{ closeLayer(); modal(blq?'¿Desbloquear la sala?':'¿Cancelar la reserva?',`<p>${blq?'La sala vuelve a quedar libre':`Se libera ${esc(rm.name||'la sala')} de ${r.from} a ${r.to} y la web vuelve a ofrecer ese horario`}. ${blq?'':'Avisale a la persona por WhatsApp.'}</p>${blq?'':F('cwcr','Motivo (opcional)','maxlength="200"')}`,`<button class="btn" data-close>Volver</button><button class="btn btn-danger" id="cwcok">${blq?'Desbloquear':'Cancelar reserva'}</button>`);
    $('#cwcok').onclick=async()=>{ const {ok,j}=await cwPost({kind:'cw-cancel',id:r.id,reason:$('#cwcr')?$('#cwcr').value.trim():''}); closeLayer(); render(); toast(ok?(blq?'Sala desbloqueada':'Reserva cancelada: el horario quedó libre'):((j.error&&j.error.message)||'No se pudo')); }; };
  $('[data-cwmove]').onclick=()=>{ closeLayer(); const rooms=cwRooms();
    modal('Mover la reserva',`<div class="form-grid">${F('cwmd','Día',`type="date" value="${r.date}"`)}<div class="field"><label for="cwmr">Sala</label><select class="select" id="cwmr"><option value="${r.roomId}">La misma (${esc(rm.name||'')})</option>${blq?'':'<option value="">La más chica que entre</option>'}${rooms.filter(x=>x.id!==r.roomId).map(x=>`<option value="${x.id}">${esc(x.name)} (hasta ${x.capacity})</option>`).join('')}</select></div></div>
      <div class="form-grid"><div class="field"><label for="cwmf">Desde</label><select class="select" id="cwmf">${cwTimes(r.from)}</select><span class="err" role="alert"></span></div><div class="field"><label for="cwmt">Hasta</label><select class="select" id="cwmt">${cwTimes(r.to)}</select><span class="err" role="alert"></span></div></div>`,
      `<button class="btn" data-close>Volver</button><button class="btn btn-primary" id="cwmok">Mover</button>`);
    $('#cwmok').onclick=async()=>{ const {ok,j}=await cwPost({kind:'cw-move',id:r.id,date:$('#cwmd').value,from:$('#cwmf').value,to:$('#cwmt').value,roomId:$('#cwmr').value||null});
      if(!ok){ if(j.error&&j.error.code==='SLOT_TAKEN'){ fieldErr($('#cwmf'),j.error.message); return; } cwErr(j,{date:'#cwmd',from:'#cwmf',to:'#cwmt'}); return; }
      closeLayer(); CW.date=$('#cwmd')?$('#cwmd').value:CW.date; render(); toast(`Movida: ${j.reservation.roomName} de ${j.reservation.from} a ${j.reservation.to}`); }; };
}
function bSalas(){
  $$('[data-cwd]').forEach(b=>b.onclick=()=>{ const n=+b.dataset.cwd; CW.date=n===0?cwToday():cwAdd(CW.date||cwToday(),n); render(); });
  const d=$('#cwdate'); if(d) d.onchange=()=>{ if(d.value){ CW.date=d.value; render(); } };
  const n=$('[data-cwnew]'); if(n) n.onclick=()=>cwForm('reserva'); const bl=$('[data-cwblock]'); if(bl) bl.onclick=()=>cwForm('bloqueo');
  $$('[data-cwres]').forEach(b=>b.onclick=()=>cwDetail(b.dataset.cwres));
}
(function(){
  if(typeof CRM_NUBE_TABS==='undefined') return;
  const _v=vCrm, _b=bCrm, cloud=()=>!!(S.company&&S.company.cloud);
  const sync=()=>{ cwListen(); const has=CRM_NUBE_TABS.some(t=>t[0]==='salas'); if(CW.cfg&&!has){ const i=CRM_NUBE_TABS.findIndex(t=>t[0]==='contactos'); CRM_NUBE_TABS.splice(i<0?CRM_NUBE_TABS.length:i,0,['salas','Salas']); CW.tabAdded=true; } };
  vCrm=function(tab){ if(!cloud()) return _v(tab); sync(); if(tab==='salas') return pageHead('CRM','Agenda de las salas: reservas de la web, a mano y bloqueos. Nunca se superponen.','')+subTabs('crm',CRM_NUBE_TABS,'salas')+vSalas(); return _v(tab); };
  bCrm=function(tab){ if(!cloud()) return _b(tab); if(tab==='salas') return bSalas(); return _b(tab); };
  VIEWS.crm.view=vCrm; VIEWS.crm.bind=bCrm;
})();
