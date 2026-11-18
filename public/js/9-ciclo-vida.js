/* =====================================================================
   CRM · CICLO DE VIDA DE UNA COTIZACIÓN (Cafelito Eventos)
   - Cada cambio de etapa pide los datos justos de esa etapa (formulario corto).
   - «Registrar actividad»: WhatsApp, llamada, mail, en persona o nota, sin mover la etapa.
   - Ganada: importe final, seña (50 % por defecto) y saldo, con sus cobros.
   - Línea de tiempo: tenants/{t}/activities (no se edita ni se borra) + historial viejo (stageHistory).
   - Importes en centavos. Importe vigente: final > propuesto > estimado de la web.
   ===================================================================== */
const EV_VIA=['WhatsApp','Llamada','Mail','En persona'];
const EV_TOPIC=['Precio','Fecha','Menú','Cantidad de invitados','Otro'];
const EV_OPEN=['nueva-cotizacion','contactado','propuesta-enviada','en-negociacion'];
const EV_DEPOSIT_PCT=50;
const evStageName=k=>(EV_STAGES.find(s=>s[0]===k)||[,k])[1];
function evAmount(o){ if(o.won&&o.won.amountMinor) return o.won.amountMinor; if(o.proposal&&o.proposal.amountMinor) return o.proposal.amountMinor; return o.estimate?o.estimate.brandazoSubtotalMinor:null; }
function evAmountLabel(o){ return o.won&&o.won.amountMinor?'final':o.proposal&&o.proposal.amountMinor?'propuesto':''; }
/* «1.420.000», «1420000», «1.420.000,50» → centavos (entero). Vacío o inválido → null */
function evParseMoney(v){ const t=String(v||'').trim().replace(/\$|\s/g,''); if(!t) return null; const n=Number(t.replace(/\./g,'').replace(',','.')); return isFinite(n)&&n>0?Math.round(n*100):null; }
const evPesos=m=>m==null?'':(m/100).toLocaleString('es-AR',{maximumFractionDigits:2});
const evToday=()=>{ const d=new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10); };
const evPlusDays=n=>{ const d=new Date(Date.now()+n*864e5); return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10); };
const evTsFrom=iso=>iso?firebase.firestore.Timestamp.fromDate(new Date(iso+'T09:00:00')):null;
const evIso=t=>{ const d=evTs(t); return d?new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10):''; };
const evWho=()=>({by:C.user.uid,byName:S.user.name||C.user.email});

/* ---------- Bloque «Seguimiento» de la ficha ---------- */
function evSeguimientoHtml(o,owners,fuIso){
  const open=EV_OPEN.includes(o.stage), w=o.won||{}, p=o.proposal||{};
  // Todas las etapas en orden: la actual marcada (no se toca), las demás para mover. Ninguna resaltada como si fuera la actual.
  const moves=EV_STAGES.map(([k,n])=>k===o.stage?`<span class="ev-stage-cur" aria-current="step">${ic('check')} ${n}</span>`:`<button class="btn btn-sm" data-evmove="${k}">${n}</button>`).join('');
  let money='';
  if(o.stage==='ganada'&&w.amountMinor){ const dep=w.depositMinor||0, bal=w.amountMinor-dep;
    money=`<div class="ev-cobro"><dl class="kv"><dt>Importe final</dt><dd>${evMoney(w.amountMinor)}</dd>
      <dt>Seña (${Math.round(dep/w.amountMinor*100)} %)</dt><dd>${evMoney(dep)} · ${w.depositPaid?`<span style="color:var(--success)">cobrada el ${evDate(evIso(w.depositPaidAt))}</span>`:'<span style="color:var(--warning)">sin cobrar</span>'}</dd>
      <dt>Saldo</dt><dd>${evMoney(bal)} · ${w.balancePaid?`<span style="color:var(--success)">cobrado el ${evDate(evIso(w.balancePaidAt))}</span>`:`<span class="muted">a cobrar${o.event&&o.event.date?' antes del '+evDate(o.event.date):''}</span>`}</dd></dl>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${!w.depositPaid?`<button class="btn btn-sm btn-primary" data-evpay="deposit">Registrar cobro de la seña</button>`:''}${w.depositPaid&&!w.balancePaid?`<button class="btn btn-sm btn-primary" data-evpay="balance">Registrar cobro del saldo</button>`:''}</div></div>`; }
  else if(p.amountMinor) money=`<p class="small" style="margin-bottom:8px">Propuesta enviada el ${evDate(p.sentAt)} por <b>${evMoney(p.amountMinor)}</b>${p.validUntil?` · válida hasta el ${evDate(p.validUntil)}`:''}${p.link?` · <a href="${esc(p.link)}" target="_blank" rel="noopener">ver propuesta</a>`:''}</p>`;
  return `<section class="card"><div class="card-head"><h3>Seguimiento</h3><span class="badge">${esc(evStageName(o.stage))}</span></div>
   ${money}
   ${o.stage==='perdida'?`<p class="small" style="margin-bottom:8px">Motivo: <b>${esc(o.lostReason||'Sin datos')}</b>${o.lostNote?` · ${esc(o.lostNote)}`:''}${o.canRecontact?' · se puede volver a contactar':''}</p>`:''}
   <div class="field" style="margin-bottom:8px"><span class="label">Etapa (tocá otra para mover)</span><div style="display:flex;gap:6px;flex-wrap:wrap">${moves}</div></div>
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;align-items:end">
    <div class="field"><label for="evown">Responsable</label><select class="select" id="evown"><option value="">Sin asignar</option>${owners.map(n=>`<option ${n===o.owner?'selected':''}>${esc(n)}</option>`).join('')}</select></div>
    ${open?`<div class="field"><label for="evfu">Próximo seguimiento</label><input class="input" type="date" id="evfu" value="${fuIso}"></div>`:''}</div>
   ${open?`<div class="field"><label for="evna">Qué hay que hacer ese día</label><input class="input" id="evna" maxlength="200" value="${esc(o.nextAction||'')}" placeholder="Ej.: escribirle por WhatsApp para ver si leyó la propuesta"><span class="hint small muted">Le llega por mail al responsable el día del seguimiento.</span></div>`:''}
   <div style="display:flex;justify-content:flex-end;margin-bottom:8px"><button class="btn" id="evsave">Guardar</button></div>
   <div class="ev-act"><h4 class="small" style="margin:8px 0">Registrar actividad</h4>
    <div style="display:grid;grid-template-columns:minmax(120px,160px) minmax(0,1fr);gap:8px"><select class="select" id="evat" aria-label="Tipo de actividad">${[...EV_VIA,'Nota'].map(v=>`<option>${v}</option>`).join('')}</select>
    <div class="field" style="margin:0"><textarea class="input" id="evatx" rows="2" placeholder="Qué pasó. Ej.: le pasé el menú por WhatsApp, pide sumar 20 personas" aria-label="Qué pasó"></textarea><span class="err" role="alert"></span></div></div>
    ${open?`<div style="display:grid;grid-template-columns:minmax(150px,180px) minmax(0,1fr);gap:8px;margin-top:8px"><div class="field" style="margin:0"><label class="small" for="evatfu">Próximo seguimiento</label><input class="input" type="date" id="evatfu" value="${fuIso}"></div><div class="field" style="margin:0"><label class="small" for="evatna">Qué hay que hacer ese día</label><input class="input" id="evatna" maxlength="200" value="${esc(o.nextAction||'')}" placeholder="Ej.: escribirle por WhatsApp para ver si leyó la propuesta"></div></div>`:''}
    <div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn btn-primary" id="evatok">Registrar</button></div></div>
   <h4 class="small" style="margin:16px 0 8px">Historia</h4><ul class="ev-tl" id="evtl"><li class="muted">Cargando…</li></ul></section>`;
}

/* ---------- Eventos de la ficha ---------- */
function evBindFicha(o,fuIso){
  $$('[data-evmove]').forEach(b=>b.onclick=()=>evStageForm(o,b.dataset.evmove));
  $('#evsave').onclick=async e=>{
    const upd={}, owner=$('#evown').value, fu=$('#evfu')?$('#evfu').value:fuIso;
    if(owner!==(o.owner||'')) upd.owner=owner;
    const na=$('#evna')?$('#evna').value.trim():(o.nextAction||''); if(na!==(o.nextAction||'')) upd.nextAction=na||null;
    if(fu!==fuIso){ if(!fu&&EV_OPEN.includes(o.stage)&&o.stage!=='nueva-cotizacion') return toast('Mientras esté abierta, la cotización necesita un próximo seguimiento'); upd.nextFollowUpAt=evTsFrom(fu); }
    if(!Object.keys(upd).length) return toast('No hay cambios');
    e.currentTarget.classList.add('is-loading');
    const txt=[upd.owner!=null?`Responsable: ${upd.owner||'sin asignar'}`:'',upd.nextFollowUpAt!==undefined?`Próximo seguimiento: ${fu?evDate(fu):'sin fecha'}`:'',upd.nextAction!==undefined?`Qué hacer: ${upd.nextAction||'(vacío)'}`:''].filter(Boolean).join(' · ');
    try{ await evCommit(o,upd,{type:'cambio',text:txt}); toast('Guardado'); evFichaReopen(o.id); }
    catch(err){ e.currentTarget.classList.remove('is-loading'); toast(evErr(err)); }
  };
  $('#evatok').onclick=async e=>{
    const tx=$('#evatx'), type=$('#evat').value, fu=$('#evatfu')?$('#evatfu').value:'';
    if(!fieldErr(tx,!tx.value.trim()?'Contá qué pasó (una línea alcanza)':'')) return;
    const upd={}; if($('#evatfu')&&fu!==fuIso&&fu) upd.nextFollowUpAt=evTsFrom(fu);
    const na=$('#evatna')?$('#evatna').value.trim():''; if($('#evatna')&&na!==(o.nextAction||'')) upd.nextAction=na||null;
    e.currentTarget.classList.add('is-loading');
    try{ await evCommit(o,upd,{type:type==='Nota'?'nota':'contacto',via:type==='Nota'?null:type,text:tx.value.trim()+(upd.nextFollowUpAt?` · Próximo seguimiento: ${evDate(fu)}`:'')+(upd.nextAction?` · Qué hacer: ${upd.nextAction}`:'')}); toast('Actividad registrada'); evFichaReopen(o.id); }
    catch(err){ e.currentTarget.classList.remove('is-loading'); toast(evErr(err)); }
  };
  $$('[data-evpay]').forEach(b=>b.onclick=()=>evPayForm(o,b.dataset.evpay));
  evTimeline(o);
}
const evErr=err=>err&&err.code==='permission-denied'?'No tenés permiso o falta un dato obligatorio.':'No se pudo guardar. Probá de nuevo.';
function evFichaReopen(id){ setTimeout(()=>{ if($('#layer .modal')) return; /* no tapar un formulario que la persona ya abrió */ if(EV.ops.find(z=>z.id===id)) evFicha(id); },400); }

/* Escribe en un solo lote: cambio de la cotización + actividad + auditoría */
async function evCommit(o,upd,act){
  const ref=fbDb.doc(`tenants/${EV.tid}/opportunities/${o.id}`), b=fbDb.batch(), who=evWho();
  if(Object.keys(upd).length){ upd.updatedAt=TS(); b.update(ref,upd); }
  b.set(fbDb.collection(`tenants/${EV.tid}/activities`).doc(),{opportunityId:o.id,contactId:o.contactId||null,at:TS(),...who,type:act.type,via:act.via||null,text:act.text||'',from:act.from||null,to:act.to||null,details:act.details||null});
  b.set(fbDb.collection(`tenants/${EV.tid}/audit`).doc(),{at:TS(),...who,action:'oportunidad-actualizada',opportunityId:o.id,changes:Object.keys(upd).filter(k=>k!=='updatedAt')});
  await b.commit();
  Object.assign(o,upd);
}

/* ---------- Formulario de cambio de etapa ---------- */
function evStageForm(o,to){
  const name=evStageName(to), cur=evAmount(o), fu=n=>`<div class="field"><label for="sfu">Próximo seguimiento</label><input class="input" type="date" id="sfu" value="${evPlusDays(n)}"><span class="err" role="alert"></span></div><div class="field"><label for="sna">Qué hay que hacer ese día (opcional)</label><input class="input" id="sna" maxlength="200" placeholder="Ej.: escribirle por WhatsApp para ver si leyó la propuesta"></div>`;
  const note=(req,ph)=>`<div class="field"><label for="snote">${req?'Qué pasó':'Nota (opcional)'}</label><textarea class="input" id="snote" rows="2" placeholder="${ph}"></textarea><span class="err" role="alert"></span></div>`;
  const money=(id,label,val,hint)=>`<div class="field"><label for="${id}">${label}</label><div style="display:flex;align-items:center;gap:6px"><span class="muted">$</span><input class="input" id="${id}" inputmode="decimal" value="${evPesos(val)}" style="text-align:right"></div>${hint?`<span class="hint small muted">${hint}</span>`:''}<span class="err" role="alert"></span></div>`;
  let body='';
  if(to==='contactado') body=`<div class="field"><label for="svia">Cómo</label><select class="select" id="svia">${EV_VIA.map(v=>`<option>${v}</option>`).join('')}</select></div>${note(false,'Ej.: le escribí por WhatsApp, espera la propuesta')}${fu(2)}`;
  else if(to==='propuesta-enviada') body=`${money('samt','Importe de la propuesta (sin IVA)',cur,`Estimado de la web: ${evMoney(o.estimate?o.estimate.brandazoSubtotalMinor:null)}`)}<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="field"><label for="ssent">Enviada el</label><input class="input" type="date" id="ssent" value="${evToday()}"></div><div class="field"><label for="svalid">Válida hasta (opcional)</label><input class="input" type="date" id="svalid" value="${evPlusDays(7)}"></div></div><div class="field"><label for="slink">Link o archivo de la propuesta (opcional)</label><input class="input" id="slink" placeholder="https://…"></div>${fu(3)}`;
  else if(to==='en-negociacion') body=`<div class="field"><label for="stopic">Qué se está negociando</label><select class="select" id="stopic">${EV_TOPIC.map(v=>`<option>${v}</option>`).join('')}</select></div>${note(true,'Ej.: pide bajar a 60 invitados y cambiar la fecha al sábado')}${fu(2)}`;
  else if(to==='ganada') body=`${money('samt','Importe final confirmado (sin IVA)',cur,'')}${money('sdep',`Seña (${EV_DEPOSIT_PCT} %)`,cur?Math.round(cur*EV_DEPOSIT_PCT/100):null,'Se calcula sola; cambiala si acordaron otra cosa')}<p class="small" id="sbal" style="margin:-4px 0 12px"></p>
    <label class="check" style="margin-bottom:8px"><input type="checkbox" id="spaid"> La seña ya está cobrada</label><div class="field" id="spaidf" hidden><label for="spaidd">Fecha de cobro de la seña</label><input class="input" type="date" id="spaidd" value="${evToday()}"></div>${note(false,'Ej.: confirmó por WhatsApp, pagó la seña por transferencia')}`;
  else if(to==='perdida') body=`<div class="field"><label for="slost">Motivo</label><select class="select" id="slost"><option value="">Elegí un motivo</option>${EV_LOST.map(r=>`<option>${r}</option>`).join('')}</select><span class="err" role="alert"></span></div>${note(false,'Ej.: eligió otro proveedor más barato')}<label class="check"><input type="checkbox" id="srec"> Se puede volver a contactar más adelante</label>`;
  else body=`${note(true,'Por qué vuelve a esta etapa')}${fu(1)}`;
  modal(`Pasar a «${name}»`,`<p class="small muted" style="margin-bottom:12px">${esc(evName(o))} · ${esc(o.event&&o.event.type||'Evento')} · ${evDate(o.event&&o.event.date)}</p>${body}`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="sok">Pasar a ${name}</button>`);
  const upBal=()=>{ const a=evParseMoney($('#samt')&&$('#samt').value), d=evParseMoney($('#sdep')&&$('#sdep').value), el=$('#sbal'); if(el) el.innerHTML=a?`Saldo a cobrar: <b>${evMoney(a-(d||0))}</b>`:''; };
  if(to==='ganada'){ $('#samt').oninput=()=>{ const a=evParseMoney($('#samt').value); if(a) $('#sdep').value=evPesos(Math.round(a*EV_DEPOSIT_PCT/100)); upBal(); }; $('#sdep').oninput=upBal; upBal(); $('#spaid').onchange=e=>{ $('#spaidf').hidden=!e.target.checked; }; }
  $('#sok').onclick=async e=>{
    const v=id=>$(id)?$(id).value.trim():'', upd={stage:to}, det={}; let text='', via=null;
    if(EV_OPEN.includes(to)){ const f=v('#sfu'); if(!fieldErr($('#sfu'),!f?'Elegí cuándo volver a hablar':'')) return; upd.nextFollowUpAt=evTsFrom(f); upd.nextAction=v('#sna')||null; det.nextFollowUp=f; }
    else { upd.nextFollowUpAt=null; upd.nextAction=null; }
    if(to==='contactado'){ via=v('#svia'); text=''; /* la nota va una sola vez (abajo) */ }
    else if(to==='propuesta-enviada'){ const a=evParseMoney(v('#samt')); if(!fieldErr($('#samt'),!a?'Ingresá el importe (ej.: 1.420.000)':'')) return;
      upd.proposal={amountMinor:a,sentAt:v('#ssent')||evToday(),validUntil:v('#svalid')||null,link:v('#slink')||null}; det.amountMinor=a; text=`Propuesta por ${evMoney(a)}`; }
    else if(to==='en-negociacion'){ if(!fieldErr($('#snote'),!v('#snote')?'Contá qué se está negociando':'')) return; upd.negotiation={topic:v('#stopic')}; det.topic=v('#stopic'); text=`${v('#stopic')}: ${v('#snote')}`; }
    else if(to==='ganada'){ const a=evParseMoney(v('#samt')), d=evParseMoney(v('#sdep'));
      if(!fieldErr($('#samt'),!a?'Ingresá el importe final':'')) return; if(!fieldErr($('#sdep'),d!=null&&d>a?'La seña no puede superar el total':'')) return;
      const paid=$('#spaid').checked; upd.won={amountMinor:a,depositMinor:d||0,depositPaid:paid,depositPaidAt:paid?evTsFrom(v('#spaidd')||evToday()):null,balancePaid:false,balancePaidAt:null};
      det.amountMinor=a; det.depositMinor=d||0; text=`Ganada por ${evMoney(a)} · seña ${evMoney(d||0)} ${paid?'cobrada':'a cobrar'}`; }
    else if(to==='perdida'){ const r=v('#slost'); if(!fieldErr($('#slost'),!r?'Elegí por qué se perdió':'')) return; upd.lostReason=r; upd.lostNote=v('#snote')||null; upd.canRecontact=$('#srec').checked; text=`Motivo: ${r}${upd.canRecontact?' · se puede volver a contactar':''}`; }
    else { if(!fieldErr($('#snote'),!v('#snote')?'Contá por qué vuelve':'')) return; }
    if(to!=='perdida'&&o.lostReason){ upd.lostReason=null; }
    const extra=to==='perdida'?v('#snote'):(to==='en-negociacion'?'':v('#snote'));
    e.currentTarget.classList.add('is-loading');
    try{ await evCommit(o,upd,{type:'etapa',from:o.stage,to,via,text:[text,extra].filter(Boolean).join(' · '),details:det}); closeLayer(); toast(`Pasó a ${name}`); evFichaReopen(o.id); }
    catch(err){ e.currentTarget.classList.remove('is-loading'); toast(evErr(err)); }
  };
}

/* ---------- Cobros de una cotización ganada ---------- */
function evPayForm(o,which){
  const w=o.won||{}, amt=which==='deposit'?w.depositMinor:w.amountMinor-(w.depositMinor||0), label=which==='deposit'?'seña':'saldo', del=which==='deposit'?'de la seña':'del saldo';
  modal(`Registrar cobro ${del}`,`<p style="margin-bottom:12px">${esc(evName(o))}: <b>${evMoney(amt)}</b></p><div class="field"><label for="pd">Fecha de cobro</label><input class="input" type="date" id="pd" value="${evToday()}"></div><div class="field"><label for="pn">Nota (opcional)</label><input class="input" id="pn" placeholder="Ej.: transferencia"></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="pok">Registrar</button>`);
  $('#pok').onclick=async e=>{ const d=$('#pd').value||evToday(); const won={...w};
    if(which==='deposit'){ won.depositPaid=true; won.depositPaidAt=evTsFrom(d); } else { won.balancePaid=true; won.balancePaidAt=evTsFrom(d); }
    e.currentTarget.classList.add('is-loading');
    try{ await evCommit(o,{won},{type:'cobro',text:`Cobro ${del}: ${evMoney(amt)} el ${evDate(d)}${$('#pn').value.trim()?' · '+$('#pn').value.trim():''}`,details:{which,amountMinor:amt,date:d}}); closeLayer(); toast(`Cobro ${del} registrado`); evFichaReopen(o.id); }
    catch(err){ e.currentTarget.classList.remove('is-loading'); toast(evErr(err)); } };
}

/* ---------- Línea de tiempo ---------- */
function evTimeline(o){
  if(EV.tlUnsub) EV.tlUnsub();
  const draw=acts=>{ const el=$('#evtl'); if(!el) return;
    const legacy=(o.stageHistory||[]).map(h=>({at:h.at,byName:h.byName,type:'etapa',from:h.from,to:h.to,text:''}));
    const items=[...acts,...legacy].sort((a,b)=>((evTs(b.at)||new Date(8.64e15)).getTime())-((evTs(a.at)||new Date(8.64e15)).getTime()));
    const icon={etapa:'arrow',contacto:'message',nota:'note',cobro:'dollar',cambio:'edit'};
    el.innerHTML=items.map(a=>`<li><span class="ev-tl-ic">${ic(icon[a.type]||'note')}</span><div><div class="small muted">${a.at?evWhen(a.at):'Recién'} · ${esc(a.byName||'')}</div>
      <div>${a.type==='etapa'?`${esc(evStageName(a.from))} → <b>${esc(evStageName(a.to))}</b>${a.via?` · por ${esc(a.via)}`:''}`:a.type==='contacto'?`<b>${esc(a.via||'Contacto')}</b>`:a.type==='cobro'?'<b>Cobro</b>':a.type==='cambio'?'<b>Cambio</b>':'<b>Nota</b>'}</div>
      ${a.text?`<div class="small" style="white-space:pre-wrap">${esc(a.text)}</div>`:''}</div></li>`).join('')+`<li><span class="ev-tl-ic">${ic('mail')}</span><div><div class="small muted">${evWhen(o.createdAt)}</div><div>Llegó la cotización desde ${esc((o.source&&o.source.channel)||'la web')}</div></div></li>`; };
  draw([]);
  EV.tlUnsub=fbDb.collection(`tenants/${EV.tid}/activities`).where('opportunityId','==',o.id).onSnapshot(s=>draw(s.docs.map(d=>d.data())),e=>{ const el=$('#evtl'); if(el) el.insertAdjacentHTML('afterbegin',`<li class="small muted">No se pudo cargar la historia.</li>`); });
}
