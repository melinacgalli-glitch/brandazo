/* =====================================================================
   PARTE B · SUSCRIPCIONES (Cafelito Work) E INSCRIPCIONES A CURSOS (Cafelito Academy)
   - Planes y cursos (el catálogo) se guardan con los datos de la empresa: M().plans, M().courses.
   - Suscripciones e inscripciones las guarda el servidor (tenants/{t}/subscriptions | enrollments), solo lectura acá.
   - Se ven en CRM → Suscripciones / Cursos, en la ficha del contacto, en campañas, funnel y objetivos.
   - Importes en centavos. Ingreso mensual = suma de las suscripciones activas (esperado, no cobrado).
   ===================================================================== */
function liveCol(name){ return { name, tid:null, unsub:null, items:[], loaded:false, err:'' }; }
const SB=liveCol('subscriptions'), EN=liveCol('enrollments');
function lcListen(L){
  if(!(S.company&&S.company.cloud&&typeof fbDb!=='undefined'&&fbDb)) return; const c=S.company;
  if(L.tid===c.tid&&L.unsub) return; if(L.unsub) L.unsub();
  Object.assign(L,{tid:c.tid,items:[],loaded:false,err:''});
  L.unsub=fbDb.collection(`tenants/${c.tid}/${L.name}`).orderBy('updatedAt','desc').limit(3000).onSnapshot(sn=>{ L.items=sn.docs.map(d=>({id:d.id,...d.data()})); L.loaded=true; L.err=''; lcRefresh(); },
    e=>{ L.loaded=true; L.err=e.code==='permission-denied'?'No tenés permiso para ver estos datos.':'No se pudo conectar con la nube.'; lcRefresh(); });
  C.unsub.push(()=>{ if(L.unsub){ L.unsub(); L.unsub=null; L.tid=null; } });
}
function lcRefresh(){ if(!/^#\/app\/(crm\/(suscripciones|cursos)|campanas\/|estrategia)/.test(location.hash)) return; if($('#layer').children.length) return; render(); }
const lcReady=L=>{ lcListen(L); return L.loaded; };
const SUB_ST={active:['Activa','badge-ok'],paused:['Pausada','badge-warn'],cancelled:['Dada de baja','badge-err']};
const ENR_ST={paid:['Pagada','badge-ok'],cancelled:['Cancelada','badge-err'],refunded:['Devuelta','badge-warn']};
const ymd=()=>shToday();
const mon=k=>shMonthName(k);
function catalog(){ const m=M(); m.plans=m.plans||[]; m.courses=m.courses||[]; return m; }
const lcBrand=(mode,dflt)=>{ const u=S.brands.filter(b=>typeof unitSells==='function'&&unitSells(b.name)===mode).map(b=>b.name); return u.length?u:(S.brands.some(b=>b.name===dflt)?[dflt]:[]); };
/* Activa a una fecha (AAAA-MM-DD): dada de alta antes y sin baja (o la baja es posterior) */
const subActiveOn=(s,d)=>s.startDate<=d&&(s.status!=='cancelled'||!s.cancelledDate||s.cancelledDate>d)&&!(s.status==='paused'&&s.statusDate<=d);

/* ¿Cómo vende cada unidad? También se deduce de lo cargado */
(function(){ const _us=unitSells;
  unitSells=function(name){ const b=S.brands.find(x=>x.name===name); if(b&&b.sells) return b.sells;
    if(SB.items.some(x=>x.brand===name)) return 'suscripcion'; if(EN.items.some(x=>x.brand===name)) return 'inscripcion'; return _us(name); };
})();

/* ---------- Llamada al servidor ---------- */
async function lcPost(body){ const r=await fetch(MAN_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await C.user.getIdToken()},body:JSON.stringify({tenantId:S.company.tid,...body})});
  const j=await r.json().catch(()=>({})); return {ok:r.ok,j}; }
function lcErrors(j,map,errBox){ const d=(j.error&&j.error.details)||[]; d.forEach(x=>{ const el=$(map[x.field]); if(el) fieldErr(el,x.issue); else if(errBox) errBox.textContent=x.issue; }); if(!d.length) toast((j.error&&j.error.message)||'No se pudo guardar. Probá de nuevo.'); }
const lcContactFields=()=>`<div class="form-grid">${F('mnn','Nombre y apellido','maxlength="120"')}${F('mnp','Teléfono','inputmode="tel" maxlength="30"')}</div><div id="mndup"></div><div class="form-grid">${F('mne','Email','type="email" maxlength="200"')}<div></div></div>`;
function lcBindContact(pre){ $('#mnp').oninput=()=>{ const c=manFind($('#mnp').value); $('#mndup').innerHTML=c?`<div class="alert alert-info" style="margin-bottom:12px">${ic('info')}<div>Ya tenés a <b>${esc(c.name||'este contacto')}</b> con ese teléfono: se suma a ese contacto.</div></div>`:''; };
  if(pre&&pre.name) $('#mnn').value=pre.name; if(pre&&pre.phone){ $('#mnp').value=pre.phone; $('#mnp').oninput(); } if(pre&&pre.email) $('#mne').value=pre.email; }
function lcCheckContact(){ const n=$('#mnn'), p=$('#mnp'), e=$('#mne');
  const a=fieldErr(n,!n.value.trim()?'Escribí el nombre':''), b=fieldErr(p,!p.value.trim()&&!e.value.trim()?'Escribí el teléfono o el email':p.value.trim()&&p.value.replace(/\D/g,'').length<6?'Revisá el teléfono':''), c=fieldErr(e,e.value.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.value.trim())?'El email no es válido':'');
  return a&&b&&c?{name:n.value.trim(),phone:p.value.trim(),email:e.value.trim()}:null; }
const lcMoneyField=(id,label,val,hint)=>`<div class="field"><label for="${id}">${label}</label><div style="display:flex;align-items:center;gap:6px"><span class="muted">$</span><input class="input" id="${id}" inputmode="decimal" style="text-align:right" value="${val?evPesos(val):''}"></div>${hint?`<span class="hint small muted">${hint}</span>`:''}<span class="err" role="alert"></span></div>`;
const lcCampSel=(id,unit)=>`<div class="field"><label for="${id}">Campaña (opcional)</label><select class="select" id="${id}"><option value="">Sin campaña</option>${M().campaigns.filter(c=>c.brand===unit).map(c=>`<option value="${esc(campCode(c))}">${esc(c.name)}</option>`).join('')}</select></div>`;
const lcUnitSel=(id,units)=>units.length>1?`<div class="field"><label for="${id}">Unidad</label><select class="select" id="${id}">${units.map(u=>`<option>${esc(u)}</option>`).join('')}</select></div>`:'';

/* ---------- Catálogo: planes y cursos ---------- */
function planForm(i){ const m=catalog(), edit=i!=null, p=edit?m.plans[i]:{name:'',priceMinor:null,brand:''}; const units=lcBrand('suscripcion','Cafelito Work');
  modal(edit?'Editar plan':'Nuevo plan',`${lcUnitSel('plu',units)}${F('pln2','Nombre del plan',`value="${esc(p.name)}" placeholder="Ej.: Full time" maxlength="80"`)}${lcMoneyField('plp','Precio mensual (lo que se cobra)',p.priceMinor,'Las suscripciones ya hechas conservan su precio.')}`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="plok2">${edit?'Guardar':'Agregar plan'}</button>`);
  if(edit&&$('#plu')) $('#plu').value=p.brand;
  $('#plok2').onclick=()=>{ const n=$('#pln2'), v=n.value.trim(), pr=evParseMoney($('#plp').value);
    if(![fieldErr(n,!v?'Escribí el nombre':m.plans.some((x,j)=>j!==i&&x.name.toLowerCase()===v.toLowerCase())?'Ya hay un plan con ese nombre':''),fieldErr($('#plp'),!pr?'Escribí el precio (ej.: 85.000)':'')].every(Boolean)) return;
    const o={id:edit?p.id:uid(),name:v,priceMinor:pr,brand:$('#plu')?$('#plu').value:(units[0]||'Cafelito Work'),active:true}; if(edit) m.plans[i]=o; else m.plans.push(o);
    layerDirty=false; closeLayer(); render(); toast(edit?'Plan guardado':`Plan «${v}» agregado`); };
}
function courseForm(i){ const m=catalog(), edit=i!=null, c=edit?m.courses[i]:{name:'',start:'',end:'',priceMinor:null,seats:null}; const units=lcBrand('inscripcion','Cafelito Academy');
  modal(edit?'Editar curso':'Nuevo curso',`${lcUnitSel('cou',units)}${F('con','Nombre del curso',`value="${esc(c.name)}" placeholder="Ej.: Barista inicial" maxlength="120"`)}
   <div class="form-grid">${F('cos','Empieza',`type="date" value="${c.start||''}"`)}${F('coe','Termina',`type="date" value="${c.end||''}"`)}</div>
   <div class="form-grid">${lcMoneyField('cop','Precio (pago único)',c.priceMinor,'')}${F('coq','Cupo (opcional)',`type="number" min="1" max="1000" value="${c.seats||''}"`)}</div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="cook">${edit?'Guardar':'Agregar curso'}</button>`);
  if(edit&&$('#cou')) $('#cou').value=c.brand;
  $('#cook').onclick=()=>{ const n=$('#con'), v=n.value.trim(), s=$('#cos').value, e=$('#coe').value, pr=evParseMoney($('#cop').value);
    const ok=[fieldErr(n,!v?'Escribí el nombre':''),fieldErr($('#cos'),!s?'Elegí cuándo empieza':''),fieldErr($('#coe'),!e?'Elegí cuándo termina':e<s?'Termina antes de empezar':''),fieldErr($('#cop'),!pr?'Escribí el precio':'')].every(Boolean); if(!ok) return;
    const o={id:edit?c.id:uid(),name:v,start:s,end:e,priceMinor:pr,seats:+$('#coq').value||null,brand:$('#cou')?$('#cou').value:(units[0]||'Cafelito Academy')}; if(edit) m.courses[i]=o; else m.courses.push(o);
    layerDirty=false; closeLayer(); render(); toast(edit?'Curso guardado':`Curso «${v}» agregado`); };
}

/* ---------- Nueva suscripción / inscripción ---------- */
function subForm(pre={},planId){ const m=catalog(); if(!m.plans.length){ toast('Primero cargá los planes de Cafelito Work'); return planForm(); }
  const units=[...new Set(m.plans.map(p=>p.brand))];
  modal('Nueva suscripción',`${lcContactFields()}
   <div class="form-grid"><div class="field"><label for="sbpl">Plan</label><select class="select" id="sbpl">${m.plans.map(p=>`<option value="${p.id}" ${p.id===planId?'selected':''}>${esc(p.name)} · ${evMoney(p.priceMinor)}/mes${units.length>1?' · '+esc(p.brand):''}</option>`).join('')}</select></div>${lcMoneyField('sbpr','Precio mensual que paga','', 'Cambialo si tiene descuento.')}</div>
   <div class="form-grid">${F('sbst','Fecha de alta',`type="date" value="${ymd()}"`)}${F('sbmp','N.º de suscripción de Mercado Pago (opcional)','maxlength="60"','Evita cargarla dos veces.')}</div>
   <div id="sbcamp"></div>${F('sbno','Notas (opcional)','maxlength="1000"')}`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="sbok">Cargar suscripción</button>`);
  lcBindContact(pre);
  const sync=()=>{ const p=m.plans.find(x=>x.id===$('#sbpl').value); $('#sbpr').value=evPesos(p.priceMinor); $('#sbcamp').innerHTML=lcCampSel('sbc',p.brand); }; $('#sbpl').onchange=sync; sync();
  $('#sbok').onclick=async e=>{ const ct=lcCheckContact(), pr=evParseMoney($('#sbpr').value), d=$('#sbst').value;
    if(![!!ct,fieldErr($('#sbpr'),!pr?'Revisá el precio':''),fieldErr($('#sbst'),!d?'Elegí la fecha de alta':'')].every(Boolean)) return;
    const p=m.plans.find(x=>x.id===$('#sbpl').value), b=e.currentTarget; b.classList.add('is-loading'); b.disabled=true;
    try{ const {ok,j}=await lcPost({kind:'subscription',brand:p.brand,contact:ct,sub:{planId:p.id,planName:p.name,priceMinor:pr,startDate:d,mpSubscriptionId:$('#sbmp').value.trim(),utmCampaign:$('#sbc').value,notes:$('#sbno').value.trim()}});
      if(!ok){ lcErrors(j,{'contact.name':'#mnn','contact.phone':'#mnp','contact.email':'#mne','sub.priceMinor':'#sbpr','sub.startDate':'#sbst','sub.mpSubscriptionId':'#sbmp'}); b.classList.remove('is-loading'); b.disabled=false; return; }
      layerDirty=false; closeLayer(); render(); toast(`Suscripción cargada${j.match==='existing'?' · cliente '+j.existingName:''}`);
    }catch(_){ b.classList.remove('is-loading'); b.disabled=false; toast('Sin conexión: no se guardó. Probá de nuevo.'); } };
}
function enrForm(pre={},courseId){ const m=catalog(); if(!m.courses.length){ toast('Primero cargá los cursos de Cafelito Academy'); return courseForm(); }
  const list=[...m.courses].sort((a,b)=>String(b.start).localeCompare(String(a.start)));
  modal('Nueva inscripción',`${lcContactFields()}
   <div class="field"><label for="enco">Curso</label><select class="select" id="enco">${list.map(c=>`<option value="${c.id}" ${c.id===courseId?'selected':''}>${esc(c.name)} · ${evDate(c.start)} al ${evDate(c.end)}</option>`).join('')}</select><span class="hint small" id="enseat"></span></div>
   <div class="form-grid">${lcMoneyField('enam','Importe pagado','','')}${F('enpd','Fecha de pago',`type="date" max="${ymd()}" value="${ymd()}"`)}</div>
   <div class="form-grid">${F('enmp','N.º de pago de Mercado Pago (opcional)','inputmode="numeric" maxlength="60"','Evita cargarla dos veces.')}<div id="encamp"></div></div>${F('enno','Notas (opcional)','maxlength="1000"')}`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="enok">Cargar inscripción</button>`);
  lcBindContact(pre);
  const sync=()=>{ const c=m.courses.find(x=>x.id===$('#enco').value); $('#enam').value=evPesos(c.priceMinor); $('#encamp').innerHTML=lcCampSel('enc',c.brand);
    const n=EN.items.filter(x=>x.courseId===c.id&&x.status==='paid').length; $('#enseat').innerHTML=c.seats?(n>=c.seats?`<span style="color:var(--warning)">${ic('alert')} El curso está lleno (${n} de ${c.seats}).</span>`:`<span class="muted">${n} de ${c.seats} lugares ocupados.</span>`):''; };
  $('#enco').onchange=sync; sync();
  $('#enok').onclick=async e=>{ const ct=lcCheckContact(), am=evParseMoney($('#enam').value), d=$('#enpd').value;
    if(![!!ct,fieldErr($('#enam'),!am?'Revisá el importe':''),fieldErr($('#enpd'),!d?'Elegí la fecha de pago':d>ymd()?'No puede ser futura':'')].every(Boolean)) return;
    const c=m.courses.find(x=>x.id===$('#enco').value), b=e.currentTarget; b.classList.add('is-loading'); b.disabled=true;
    try{ const {ok,j}=await lcPost({kind:'enrollment',brand:c.brand,contact:ct,enr:{courseId:c.id,courseName:c.name,courseStart:c.start,courseEnd:c.end,amountMinor:am,paidDate:d,paymentId:$('#enmp').value.trim(),utmCampaign:$('#enc').value,notes:$('#enno').value.trim()}});
      if(!ok){ lcErrors(j,{'contact.name':'#mnn','contact.phone':'#mnp','contact.email':'#mne','enr.amountMinor':'#enam','enr.paidDate':'#enpd','enr.paymentId':'#enmp'}); b.classList.remove('is-loading'); b.disabled=false; return; }
      layerDirty=false; closeLayer(); render(); toast(`Inscripción cargada${j.match==='existing'?' · '+j.existingName:''}`);
    }catch(_){ b.classList.remove('is-loading'); b.disabled=false; toast('Sin conexión: no se guardó. Probá de nuevo.'); } };
}
/* Cambio de estado (pausar, reactivar, dar de baja / cancelar, devolver) con fecha */
function lcStatus(kind,rec,status,label){
  modal(label,`<p class="small" style="margin-bottom:12px"><b>${esc(rec.customerName||'')}</b> · ${esc(rec.planName||rec.courseName||'')}</p>${F('lsd','Desde qué fecha',`type="date" max="${ymd()}" value="${ymd()}"`)}`,`<button class="btn" data-close>Volver</button><button class="btn ${status==='cancelled'||status==='refunded'?'btn-danger':'btn-primary'}" id="lsok">${label}</button>`);
  $('#lsok').onclick=async e=>{ const d=$('#lsd').value; if(!fieldErr($('#lsd'),!d?'Elegí la fecha':d>ymd()?'No puede ser futura':'')) return; const b=e.currentTarget; b.classList.add('is-loading'); b.disabled=true;
    try{ const {ok,j}=await lcPost({kind,id:rec.id,status,date:d}); if(!ok){ lcErrors(j,{date:'#lsd'}); b.classList.remove('is-loading'); b.disabled=false; return; } closeLayer(); render(); toast('Listo: '+label.toLowerCase()); }
    catch(_){ b.classList.remove('is-loading'); b.disabled=false; toast('Sin conexión: no se guardó.'); } };
}

/* ---------- CRM → Suscripciones ---------- */
const lcStat=(l,v,d,cls='')=>`<div class="stat ${cls}"><div class="l">${l}</div><div class="v">${v}</div>${d?`<div class="d">${d}</div>`:''}</div>`;
function vSubs(){
  if(!lcReady(SB)) return `<div class="card empty"><p class="muted">Cargando suscripciones…</p></div>`; if(SB.err) return `<div class="alert alert-err">${ic('alert')}<div>${esc(SB.err)}</div></div>`;
  const m=catalog(), today=ymd(), mk=today.slice(0,7), act=SB.items.filter(s=>s.status==='active');
  const mrr=act.reduce((a,s)=>a+(s.priceMinor||0),0), altas=SB.items.filter(s=>s.startMonth===mk).length, bajas=SB.items.filter(s=>s.status==='cancelled'&&(s.cancelledDate||'').startsWith(mk)).length;
  const plans=`<section class="card" style="margin:16px 0"><div class="card-head"><h3>Planes</h3><button class="btn btn-sm" data-lcplan>${ic('plus')} Agregar plan</button></div>${m.plans.length?m.plans.map((p,i)=>`<div class="settings-row" style="gap:12px;align-items:center"><div style="flex:1;min-width:0"><b>${esc(p.name)}</b><div class="small muted">${esc(p.brand)} · ${act.filter(s=>s.planId===p.id).length} activa(s)</div></div><b class="mono">${evMoney(p.priceMinor)}/mes</b><button class="icon-btn" data-lcplan="${i}" aria-label="Editar ${esc(p.name)}">${ic('edit')}</button></div>`).join(''):'<p class="small muted">Todavía no cargaste planes. Empezá por acá: nombre y precio mensual de cada plan.</p>'}</section>`;
  const row=s=>{ const [sl,sc]=SUB_ST[s.status]||[s.status,'']; return `<div class="sh-row" style="cursor:default"><span class="sh-main"><b>${esc(s.customerName||'Sin nombre')}</b><span class="small muted">${esc(s.planName)} · desde ${evDate(s.startDate)}${s.status!=='active'?` · ${sl.toLowerCase()} el ${evDate(s.statusDate)}`:''}</span></span>
    <span class="sh-total mono">${evMoney(s.priceMinor)}/mes</span><span class="sh-meta small"><span class="badge ${sc}">${sl}</span>${s.mpSubscriptionId?`<span class="muted">MP ${esc(s.mpSubscriptionId)}</span>`:''}
    ${s.status==='active'?`<button class="btn btn-sm" data-lcs="${s.id}|paused">Pausar</button><button class="btn btn-sm" data-lcs="${s.id}|cancelled">Dar de baja</button>`:s.status==='paused'?`<button class="btn btn-sm" data-lcs="${s.id}|active">Reactivar</button><button class="btn btn-sm" data-lcs="${s.id}|cancelled">Dar de baja</button>`:''}</span></div>`; };
  const list=[...SB.items].sort((a,b)=>(a.status==='active'?0:a.status==='paused'?1:2)-(b.status==='active'?0:b.status==='paused'?1:2)||String(b.startDate).localeCompare(String(a.startDate)));
  return `<div class="toolbar" style="margin-bottom:12px"><span class="small muted">Se cobran por suscripción de Mercado Pago. Por ahora se cargan a mano.</span><span class="grow"></span><button class="btn btn-sm btn-primary" data-lcnewsub>${ic('plus')} Nueva suscripción</button></div>
   <div class="stat-grid">${lcStat('Activas',act.length,`${SB.items.filter(s=>s.status==='paused').length} pausada(s)`,'st-info')}${lcStat('Ingreso mensual',act.length?evMoney(mrr):'<span class="muted">$ 0</span>','esperado, según las activas','st-ok')}${lcStat('Altas',altas,mon(mk),'st-ok')}${lcStat('Bajas',bajas,mon(mk),'st-warn')}</div>
   ${plans}<section class="card"><h3 style="margin-bottom:8px">Suscripciones</h3>${list.length?`<div class="sh-list">${list.map(row).join('')}</div>`:'<p class="small muted">Todavía no hay suscripciones cargadas.</p>'}</section>`;
}
/* ---------- CRM → Cursos ---------- */
function vCursos(){
  if(!lcReady(EN)) return `<div class="card empty"><p class="muted">Cargando inscripciones…</p></div>`; if(EN.err) return `<div class="alert alert-err">${ic('alert')}<div>${esc(EN.err)}</div></div>`;
  const m=catalog(), today=ymd(), mk=today.slice(0,7), paid=EN.items.filter(x=>x.status==='paid');
  const month=paid.filter(x=>x.paidMonth===mk), fact=month.reduce((a,x)=>a+(x.amountMinor||0),0);
  const next=m.courses.filter(c=>c.end>=today), free=next.filter(c=>c.seats).reduce((a,c)=>a+Math.max(0,c.seats-paid.filter(x=>x.courseId===c.id).length),0);
  const card=(c,i)=>{ const ins=EN.items.filter(x=>x.courseId===c.id), ok=ins.filter(x=>x.status==='paid'), tot=ok.reduce((a,x)=>a+(x.amountMinor||0),0), st=c.end<today?'Terminado':c.start<=today?'En curso':'Próximo';
    return `<section class="card"><div class="card-head"><div><h3>${esc(c.name)}</h3><div class="small muted">${esc(c.brand)} · ${evDate(c.start)} al ${evDate(c.end)} · ${evMoney(c.priceMinor)}</div></div><span class="badge ${st==='Próximo'?'badge-brand':st==='En curso'?'badge-ok':''}">${st}</span></div>
      <p class="small" style="margin:4px 0 8px"><b>${ok.length}</b>${c.seats?` de ${c.seats}`:''} inscripto${ok.length===1?'':'s'} · ${evMoney(tot)} cobrados${c.seats&&ok.length>=c.seats?' · <span style="color:var(--warning)">curso lleno</span>':''}</p>
      ${ins.length?`<div class="sh-list">${ins.map(x=>{ const [sl,sc]=ENR_ST[x.status]||[x.status,'']; return `<div class="sh-row" style="cursor:default"><span class="sh-main"><b>${esc(x.customerName||'')}</b><span class="small muted">pagó el ${evDate(x.paidDate)}${x.paymentId?' · MP '+esc(x.paymentId):''}</span></span><span class="sh-total mono">${evMoney(x.amountMinor)}</span><span class="sh-meta small"><span class="badge ${sc}">${sl}</span>${x.status==='paid'?`<button class="btn btn-sm" data-lce="${x.id}|cancelled">Cancelar</button><button class="btn btn-sm" data-lce="${x.id}|refunded">Devolver</button>`:''}</span></div>`; }).join('')}</div>`:''}
      <div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-sm btn-primary" data-lcnewenr="${c.id}">${ic('plus')} Inscribir</button><button class="btn btn-sm" data-lccourse="${i}">${ic('edit')} Editar curso</button></div></section>`; };
  const list=m.courses.map((c,i)=>[c,i]).sort((a,b)=>String(b[0].start).localeCompare(String(a[0].start)));
  return `<div class="toolbar" style="margin-bottom:12px"><span class="small muted">Pago único por Mercado Pago. Por ahora se cargan a mano.</span><span class="grow"></span><button class="btn btn-sm" data-lccourse>${ic('plus')} Nuevo curso</button><button class="btn btn-sm btn-primary" data-lcnewenr>${ic('plus')} Nueva inscripción</button></div>
   <div class="stat-grid">${lcStat('Inscripciones',month.length,mon(mk),'st-info')}${lcStat('Facturación',month.length?evMoney(fact):'<span class="muted">$ 0</span>',mon(mk),'st-ok')}${lcStat('Cursos próximos o en curso',next.length,'','st-ok')}${lcStat('Lugares libres',next.some(c=>c.seats)?free:'<span class="muted">Sin cupo</span>','en esos cursos','st-warn')}</div>
   <div style="display:grid;gap:16px;margin-top:16px">${list.length?list.map(([c,i])=>card(c,i)).join(''):'<div class="card empty"><p class="muted">Todavía no cargaste cursos. Empezá con «Nuevo curso»: nombre, fechas, precio y cupo.</p></div>'}</div>`;
}
(function(){
  if(typeof CRM_NUBE_TABS==='undefined') return;
  const i=CRM_NUBE_TABS.findIndex(t=>t[0]==='tienda'); CRM_NUBE_TABS.splice(i+1,0,['suscripciones','Suscripciones'],['cursos','Cursos']);
  const _v=vCrm, _b=bCrm, cloud=()=>!!(S.company&&S.company.cloud);
  vCrm=function(tab){ if(!(cloud()&&(tab==='suscripciones'||tab==='cursos'))) return _v(tab);
    return pageHead('CRM',tab==='suscripciones'?'Suscripciones mensuales de Cafelito Work.':'Cursos e inscripciones de Cafelito Academy.','')+subTabs('crm',CRM_NUBE_TABS,tab)+(tab==='suscripciones'?vSubs():vCursos()); };
  bCrm=function(tab){ if(!(cloud()&&(tab==='suscripciones'||tab==='cursos'))) return _b(tab); evListen(); };
  VIEWS.crm.view=vCrm; VIEWS.crm.bind=bCrm;
  document.addEventListener('click',e=>{ const t=e.target.closest&&e.target.closest('[data-lcplan],[data-lccourse],[data-lcnewsub],[data-lcnewenr],[data-lcs],[data-lce]'); if(!t) return; e.preventDefault(); const d=t.dataset;
    if(d.lcplan!=null) return planForm(d.lcplan===''?null:+d.lcplan);
    if(d.lccourse!=null) return courseForm(d.lccourse===''?null:+d.lccourse);
    if(d.lcnewsub!=null) return subForm();
    if(d.lcnewenr!=null) return enrForm({},d.lcnewenr||null);
    if(d.lcs){ const [id,st]=d.lcs.split('|'), r=SB.items.find(x=>x.id===id); if(r) lcStatus('sub-status',r,st,{paused:'Pausar suscripción',active:'Reactivar suscripción',cancelled:'Dar de baja'}[st]); return; }
    if(d.lce){ const [id,st]=d.lce.split('|'), r=EN.items.find(x=>x.id===id); if(r) lcStatus('enr-status',r,st,{cancelled:'Cancelar inscripción',refunded:'Devolver inscripción'}[st]); }
  });
})();

/* ---------- Ficha del contacto y «Registrar venta» ---------- */
(function(){
  if(typeof evContacto!=='function') return;
  const _ec=evContacto;
  evContacto=function(id){ _ec(id); lcListen(SB); lcListen(EN); const c=EV.contacts[id]; if(!c) return;
    const pre={name:c.name||'',phone:c.phoneRaw||c.phoneDisplay||'',email:c.email||''};
    const subs=SB.items.filter(x=>x.contactId===id), enrs=EN.items.filter(x=>x.contactId===id), body=$('#layer .drawer [style*="overflow:auto"]');
    if(body&&subs.length){ const s=document.createElement('section'); s.className='card'; s.innerHTML=`<h3 style="margin-bottom:12px">Suscripciones (${subs.length})</h3>${subs.map(x=>{ const [sl,sc]=SUB_ST[x.status]||[x.status,'']; return `<div class="settings-row" style="gap:12px;align-items:center"><div style="flex:1;min-width:0"><b>${esc(x.planName)}</b><div class="small muted">${esc(x.brand)} · desde ${evDate(x.startDate)}</div></div><span class="badge ${sc}">${sl}</span><b class="mono">${evMoney(x.priceMinor)}/mes</b></div>`; }).join('')}`; body.appendChild(s); }
    if(body&&enrs.length){ const s=document.createElement('section'); s.className='card'; s.innerHTML=`<h3 style="margin-bottom:12px">Cursos (${enrs.length})</h3>${enrs.map(x=>{ const [sl,sc]=ENR_ST[x.status]||[x.status,'']; return `<div class="settings-row" style="gap:12px;align-items:center"><div style="flex:1;min-width:0"><b>${esc(x.courseName)}</b><div class="small muted">${esc(x.brand)}${x.courseStart?` · ${evDate(x.courseStart)} al ${evDate(x.courseEnd)}`:''}</div></div><span class="badge ${sc}">${sl}</span><b class="mono">${evMoney(x.amountMinor)}</b></div>`; }).join('')}`; body.appendChild(s); }
    const rs=$('#layer [data-regsale]'); if(rs) rs.dataset.lcpre=JSON.stringify(pre);
  };
  /* «Registrar venta»: suma suscripción e inscripción a las opciones */
  new MutationObserver(()=>{ const box=$('#layer [data-rs="tienda"]'); if(!box||$('#layer [data-rs="suscripcion"]')) return;
    const note=box.parentElement.nextElementSibling; if(note&&/próximamente/.test(note.textContent)) note.textContent='';
    box.insertAdjacentHTML('afterend',`<button type="button" class="btn" data-rs="suscripcion">${ic('refresh')} Suscripción (Cafelito Work)</button><button type="button" class="btn" data-rs="inscripcion">${ic('book')} Inscripción a un curso (Cafelito Academy)</button>`);
    const who=$('#layer .modal p.small'); const pre=window.__lcPre||{};
    $$('#layer [data-rs="suscripcion"],#layer [data-rs="inscripcion"]').forEach(b=>b.onclick=()=>{ const k=b.dataset.rs; closeLayer(); if(k==='suscripcion') subForm(pre); else enrForm(pre); });
  }).observe(document.getElementById('layer'),{childList:true,subtree:true});
  document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-regsale]'); if(b&&b.dataset.lcpre){ try{ window.__lcPre=JSON.parse(b.dataset.lcpre); }catch(_){ window.__lcPre={}; } } },true);
})();

/* ---------- Campañas: altas e inscripciones que trajo cada una ---------- */
(function(){
  const _cs=campSales;
  campSales=function(c){ const mode=unitSells(c.brand); if(mode!=='suscripcion'&&mode!=='inscripcion') return _cs(c);
    const isSub=mode==='suscripcion', L=isSub?SB:EN; let h=_cs(c); const i=h.indexOf('<div class="stat-grid"');
    const top=(i>0?h.slice(0,i):h.replace(/<\/section>$/,'')).replace(/<p class="small muted">(Los pedidos|Las cotizaciones)[^<]*<\/p>/,'').replace(/<p class="small muted">Cargando (pedidos|cotizaciones)…<\/p>/,'');
    if(!(S.company&&S.company.cloud)) return top+'</section>'; if(!lcReady(L)) return top+`<p class="small muted">Cargando…</p></section>`;
    const code=campCode(c).toLowerCase(), list=L.items.filter(x=>(x.utmCampaign||'')===code), spent=Math.round((+c.spent||0)*100);
    const ok=isSub?list:list.filter(x=>x.status==='paid'), money=isSub?list.filter(x=>x.status==='active').reduce((a,x)=>a+(x.priceMinor||0),0):ok.reduce((a,x)=>a+(x.amountMinor||0),0);
    return top+`<div class="stat-grid" style="margin-top:12px">${lcStat(isSub?'Suscripciones':'Inscripciones',ok.length,isSub?`${list.filter(x=>x.status==='active').length} activa(s)`:'pagadas','st-info')}${lcStat(isSub?'Ingreso mensual':'Facturación',money?evMoney(money):'<span class="muted">$ 0</span>',isSub?'de las activas':'','st-ok')}${lcStat(isSub?'Costo por alta':'Costo por inscripción',spent&&ok.length?evMoney(Math.round(spent/ok.length)):'<span class="muted">Sin datos</span>',spent?'':'cargá la inversión de la campaña','st-warn')}</div>
      ${list.length?'':`<div class="alert alert-info" style="margin-top:12px">${ic('info')}<div>Todavía no hay ${isSub?'suscripciones':'inscripciones'} con la campaña <b class="mono">${esc(campCode(c))}</b>. Elegila al cargarlas.</div></div>`}</section>`; };
})();

/* ---------- Funnel y objetivos ---------- */
(function(){
  F_SOURCES.splice(1,0,['sub-new','Suscripciones · altas'],['enr-paid','Cursos · inscripciones pagadas']);
  const _fr=fReal;
  fReal=function(f,st){ const src=st.source||''; if(src!=='sub-new'&&src!=='enr-paid') return _fr(f,st);
    const L=src==='sub-new'?SB:EN; if(!lcReady(L)) return null; const range=periodRange(fPeriod(f)), brand=fBrand(f), ids=new Set((f.campaigns||[]).map(l=>l.id));
    const inR=d=>!range||(d&&new Date(d+'T12:00:00')>=range[0]&&new Date(d+'T12:00:00')<=range[1]);
    const codes=new Set(M().campaigns.filter(c=>ids.has(c.id)).map(c=>campCode(c).toLowerCase()));
    return L.items.filter(x=>x.brand===brand&&(src==='sub-new'?inR(x.startDate):x.status==='paid'&&inR(x.paidDate))&&(!st.campOnly||codes.has(x.utmCampaign||''))).length; };
  KR_SRC.push(['sub-active','Suscripciones · activas',''],['sub-mrr','Suscripciones · ingreso mensual','$'],['sub-new','Suscripciones · altas',''],['enr-count','Cursos · inscripciones',''],['enr-revenue','Cursos · facturación','$']);
  const _ka=krAuto;
  krAuto=function(k,o){ const src=k.src||''; if(!/^(sub|enr)-/.test(src)) return _ka(k,o);
    const L=src.startsWith('sub')?SB:EN; if(!lcReady(L)) return null; const range=periodRange(o.period), list=L.items.filter(x=>x.brand===o.brand);
    const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10), from=range?iso(range[0]):'0000', to=range?iso(range[1]):'9999', at=to<ymd()?to:ymd();
    if(src==='sub-active') return list.filter(s=>subActiveOn(s,at)).length;
    if(src==='sub-mrr') return Math.round(list.filter(s=>subActiveOn(s,at)).reduce((a,s)=>a+(s.priceMinor||0),0)/100);
    if(src==='sub-new') return list.filter(s=>s.startDate>=from&&s.startDate<=to).length;
    const ok=list.filter(x=>x.status==='paid'&&x.paidDate>=from&&x.paidDate<=to);
    return src==='enr-count'?ok.length:Math.round(ok.reduce((a,x)=>a+(x.amountMinor||0),0)/100); };
})();
