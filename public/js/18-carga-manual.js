/* =====================================================================
   CARGA MANUAL EN EL CRM
   Pedidos de presupuesto y contactos que llegan por WhatsApp, teléfono, Instagram, recomendación…
   Lo guarda el servidor (/api/v1/crm/manual) con la sesión verificada: contacto sin duplicar
   (por teléfono), cotización en «Nueva cotización», tarea y nota en la historia.
   ===================================================================== */
const MAN_API=CLOUD.emu?'http://127.0.0.1:5001/brandazo/southamerica-east1/api/api/v1/crm/manual':'/api/v1/crm/manual';
const MAN_CH=['Web','WhatsApp','Teléfono','Instagram','Facebook','Mail','Recomendación','En persona','Otro'];
const MAN_TYPES=['Corporativo','Cumpleaños','Casamiento','Lanzamiento o activación','Otro'];
/* Últimos 10 dígitos de un teléfono argentino (sin 54, 9, 0 ni 15) — solo para avisar si ya existe */
function manPhoneKey(v){ let d=String(v||'').replace(/\D/g,''); if(d.startsWith('00')) d=d.slice(2); if(d.startsWith('549')) d=d.slice(3); else if(d.startsWith('54')) d=d.slice(2); if(d.startsWith('0')) d=d.slice(1);
  if(d.length===12) for(const a of [2,3,4]) if(d.slice(a,a+2)==='15'){ d=d.slice(0,a)+d.slice(a+2); break; } return d.length>=8?d.slice(-10):''; }
function manFind(phone){ const k=manPhoneKey(phone); if(!k) return null; return Object.values(EV.contacts||{}).find(c=>manPhoneKey(c.phoneE164||c.phoneRaw)===k)||null; }

function manForm(withEvent=true,pre={}){
  if(!(S.company&&S.company.cloud)) return toast('La carga manual está en la versión en la nube');
  evListen();
  const members=[...new Set(S.members.filter(m=>m.status==='Activo').map(m=>m.name||m.email).filter(Boolean))];
  const brand=(EV.settings&&EV.settings.brand)||'Cafelito Ambulante';
  const camps=M().campaigns.filter(c=>c.brand===brand);
  const today=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
  modal(withEvent?'Cargar pedido de presupuesto':'Nuevo contacto',`
   <p class="small muted" style="margin-bottom:12px">${withEvent?'Para los pedidos que te llegan por WhatsApp, teléfono o en persona. Queda en «Nueva cotización» con su tarea de seguimiento, igual que los de la web.':'Queda en Contactos. Si después te pide presupuesto, cargalo con «Cargar pedido».'}</p>
   <div class="form-grid">${F('mnn','Nombre o empresa','placeholder="Ej.: Juan Gómez" maxlength="120"')}${F('mnp','Teléfono / WhatsApp','placeholder="Ej.: 351 555-0199" inputmode="tel" maxlength="30"')}</div>
   <div id="mndup"></div>
   <div class="form-grid">${F('mne','Email (opcional)','type="email" maxlength="200"')}<div class="field"><label for="mnc">¿Por dónde llegó?</label><select class="select" id="mnc">${MAN_CH.map(c=>`<option ${c===(withEvent?'WhatsApp':'')?'selected':''}>${c}</option>`).join('')}</select></div></div>
   ${withEvent?'':`<div class="field"><label for="mnty">Tipo</label><select class="select" id="mnty"><option value="Lead">Lead (todavía no compró)</option><option value="Cliente">Cliente (ya compró)</option></select></div>
   <div class="field"><span class="label">Unidades de negocio</span><div class="unit-checks">${S.brands.map((b,i)=>`<label class="check"><input type="checkbox" data-mnu value="${esc(b.name)}" ${S.brands.length===1?'checked':''}> ${esc(b.name)}</label>`).join('')}</div><span class="err" role="alert" id="mnuerr"></span></div>`}
   ${withEvent?`<h4 style="margin:16px 0 8px">El evento</h4>
   <div class="form-grid"><div class="field"><label for="mnt">Tipo de evento</label><select class="select" id="mnt">${MAN_TYPES.map(t=>`<option>${t}</option>`).join('')}</select></div>${F('mnd','Fecha',`type="date" min="${today}"`)}</div>
   <div class="form-grid">${F('mng','Invitados (aprox.)','type="number" min="1" max="5000" inputmode="numeric"')}${F('mnh','Hora de inicio (opcional)','type="time"')}</div>
   <div class="form-grid">${F('mnl','Lugar (opcional)','maxlength="200" placeholder="Dirección o salón"')}<div class="field"><label for="mnz">Zona</label><select class="select" id="mnz"><option value="">Todavía no sé</option><option value="1">Córdoba Capital</option><option value="0">Fuera de Capital</option></select></div></div>
   <div class="field"><label for="mnx">Lo que pidió (opcional)</label><textarea class="input" id="mnx" rows="3" maxlength="2000" placeholder="Ej.: barra de café para 80 personas, con personalización de vasos. Lo recomendó Ana."></textarea></div>
   <div class="form-grid"><div class="field"><label for="mno">Responsable</label><select class="select" id="mno">${members.map(n=>`<option ${n===(S.user.name||'')?'selected':''}>${esc(n)}</option>`).join('')||`<option>${esc(S.user.name||'')}</option>`}</select></div>
    <div class="field"><label for="mncp">Campaña (opcional)</label><select class="select" id="mncp"><option value="">Sin campaña</option>${camps.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div></div>
   <div class="field"><label for="mnm">Importe estimado (sin IVA, opcional)</label><div style="display:flex;align-items:center;gap:6px"><span class="muted">$</span><input class="input" id="mnm" inputmode="decimal" placeholder="Ej.: 850.000" style="text-align:right"></div><span class="hint small muted">Si ya le pasaste un número. Si no, lo cargás al pasar a «En negociación».</span><span class="err" role="alert"></span></div>
   <p class="small muted" id="mnav"></p>`:''}`,
   `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="mnok">${withEvent?'Cargar pedido':'Guardar contacto'}</button>`);
  const dup=()=>{ const c=manFind($('#mnp').value); $('#mndup').innerHTML=c?`<div class="alert alert-info" style="margin-bottom:12px">${ic('info')}<div>Ya tenés a <b>${esc(c.name||'este contacto')}</b> con ese teléfono: ${withEvent?'el pedido se suma a ese contacto':'no se va a duplicar'}.</div></div>`:''; };
  $('#mnp').oninput=dup;
  if(pre.name) $('#mnn').value=pre.name; if(pre.phone){ $('#mnp').value=pre.phone; dup(); } if(pre.email) $('#mne').value=pre.email;
  const av=()=>{ const d=$('#mnd')&&$('#mnd').value; if(!d||!$('#mnav')) return; const won=EV.ops.find(o=>o.stage==='ganada'&&o.won&&o.won.depositPaid&&(o.event||{}).date===d), blk=((EV.settings||{}).blockedDates||[]).find(x=>x.date===d);
    $('#mnav').innerHTML=won?`<span style="color:var(--warning)">${ic('alert')} Ese día ya tiene un evento con seña (${esc(evName(won))}).</span>`:blk?`<span style="color:var(--warning)">${ic('alert')} Ese día está bloqueado${blk.note?' ('+esc(blk.note)+')':''}.</span>`:''; };
  if($('#mnd')) $('#mnd').onchange=av;
  $('#mnok').onclick=async()=>{
    const n=$('#mnn'), p=$('#mnp'), e=$('#mne');
    const okN=fieldErr(n,!n.value.trim()?'Escribí el nombre':''), okP=fieldErr(p,p.value.replace(/\D/g,'').length<6?'Escribí el teléfono':''), okE=fieldErr(e,e.value.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.value.trim())?'El email no es válido':'');
    let okD=true, amt=null; if(withEvent){ const d=$('#mnd'); okD=fieldErr(d,!d.value?'Elegí la fecha del evento':d.value<today?'La fecha ya pasó':''); const m=$('#mnm'); amt=m.value.trim()?evParseMoney(m.value):null; if(!fieldErr(m,m.value.trim()&&!amt?'Revisá el importe (ej.: 850.000)':'')) okD=false; }
    if(!(okN&&okP&&okE&&okD)) return;
    const units=$$('#layer [data-mnu]:checked').map(x=>x.value);
    if(!withEvent){ const bad=!units.length; $('#mnuerr').textContent=bad?'Elegí al menos una unidad':''; $('#mnuerr').closest('.field').classList.toggle('has-error',bad); if(bad) return; }
    const body={tenantId:S.company.tid,channel:$('#mnc').value,contact:{name:n.value.trim(),phone:p.value.trim(),email:e.value.trim()},...(withEvent?{}:{type:$('#mnty').value,units})};
    if(withEvent) Object.assign(body,{event:{type:$('#mnt').value,date:$('#mnd').value,guests:+$('#mng').value||null,startTime:$('#mnh').value||null,place:$('#mnl').value.trim(),inCapital:$('#mnz').value===''?null:$('#mnz').value==='1'},notes:$('#mnx').value.trim(),owner:$('#mno').value,campaignId:$('#mncp').value||null,amountMinor:amt});
    const b=$('#mnok'); b.classList.add('is-loading'); b.disabled=true;
    try{
      const r=await fetch(MAN_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await C.user.getIdToken()},body:JSON.stringify(body)});
      const j=await r.json().catch(()=>({}));
      if(!r.ok){ const d=(j.error&&j.error.details)||[]; const map={'contact.name':'#mnn','contact.phone':'#mnp','contact.email':'#mne','event.date':'#mnd',amountMinor:'#mnm'};
        d.forEach(x=>{ const el=$(map[x.field]); if(el) fieldErr(el,x.issue); }); if(!d.length) toast((j.error&&j.error.message)||'No se pudo guardar. Probá de nuevo.'); b.classList.remove('is-loading'); b.disabled=false; return; }
      layerDirty=false; closeLayer(); EV.dirty=false; render(); // los datos nuevos pudieron llegar con la ventana abierta
      toast(withEvent?(j.match==='existing'?`Pedido cargado en el contacto existente: ${j.existingName}`:'Pedido cargado en «Nueva cotización»'):(j.match==='existing'?`Ya existía: ${j.existingName}`:'Contacto guardado'));
      if(j.opportunityId){ let n=0; const t=setInterval(()=>{ if(EV.ops.some(o=>o.id===j.opportunityId)){ clearInterval(t); if(!$('#layer').children.length) evFicha(j.opportunityId); } else if(++n>20) clearInterval(t); },300); }
    }catch(err){ b.classList.remove('is-loading'); b.disabled=false; toast('Sin conexión: no se guardó. Probá de nuevo.'); }
  };
}
(function(){
  if(typeof vEventos!=='function') return;
  const _ve=vEventos;
  vEventos=function(){ const h=_ve(); if(!(S.company&&S.company.cloud)||!EV.loaded||EV.err) return h;
    const btn=`<button class="btn btn-sm btn-primary" data-mannew>${ic('plus')} Cargar pedido</button>`;
    return h.includes('<span class="grow"></span>')?h.replace('<span class="grow"></span>',btn+'<span class="grow"></span>'):btn+h; };
  const _vc=vContactosNube;
  vContactosNube=function(){ const h=_vc(); if(!EV.contactsLoaded) return h;
    return `<div class="toolbar" style="margin-bottom:12px"><span class="grow"></span><button class="btn btn-sm" data-mannew="contacto">${ic('plus')} Nuevo contacto</button><button class="btn btn-sm btn-primary" data-mannew>${ic('plus')} Cargar pedido</button></div>`+h; };
  document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-mannew]'); if(!b) return; e.preventDefault(); manForm(b.dataset.mannew!=='contacto'); });
  /* Ficha: un pedido cargado a mano no tiene presupuesto de la web */
  const _ff=evFicha;
  evFicha=function(id){ _ff(id); const o=EV.ops.find(z=>z.id===id); if(!o) return;
    const secs=$$('#layer .drawer section.card'), es=secs.find(s=>/Presupuesto estimado/.test((s.querySelector('h3')||{}).textContent||''));
    if(o.estimate&&o.estimate.status==='manual'&&es) es.innerHTML=`<h3 style="margin-bottom:8px">Presupuesto</h3><p class="small${o.estimate.brandazoSubtotalMinor?'':' muted'}">${o.estimate.brandazoSubtotalMinor?`Importe estimado cargado a mano: <b>${evMoney(o.estimate.brandazoSubtotalMinor)}</b> sin IVA. Si cambia, actualizalo al pasar a «En negociación».`:'Pedido cargado a mano: todavía no tiene importe. Cargalo al pasar la tarjeta a «En negociación».'}</p>`;
    if(o.event&&o.event.inCapital==null){ $$('#layer .drawer dt').forEach(dt=>{ if(dt.textContent==='Zona') dt.nextElementSibling.innerHTML='<span class="muted">Sin datos</span>'; }); }
    if(!o.selection){ $$('#layer .drawer dt').forEach(dt=>{ if(['Plan','Adicionales','Personalización','Torta / Cold brew','Alimentación'].includes(dt.textContent)){ dt.nextElementSibling.remove(); dt.remove(); } }); }
  };
})();

/* ---------- Tienda: venta ya pagada cargada a mano (mientras la web no manda las compras) ---------- */
function manSaleForm(pre={}){
  if(!(S.company&&S.company.cloud)) return toast('La carga de ventas está en la versión en la nube');
  evListen();
  const units=S.brands.filter(b=>typeof unitSells==='function'&&unitSells(b.name)==='tienda').map(b=>b.name);
  if(!units.length&&S.brands.some(b=>b.name==='Cafelito Cakes')) units.push('Cafelito Cakes');
  const today=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
  const row=()=>`<div class="sale-row"><input class="input" data-sin placeholder="Producto (ej.: Pistacho & Frambuesa)" maxlength="160" aria-label="Producto"><input class="input" data-sq type="number" min="1" value="1" aria-label="Cantidad"><div class="sale-price"><span class="muted">$</span><input class="input" data-sp inputmode="decimal" placeholder="Precio" style="text-align:right" aria-label="Precio"></div><button type="button" class="icon-btn" data-sdel aria-label="Quitar producto">${ic('trash')}</button></div>`;
  const camps=u=>M().campaigns.filter(c=>c.brand===u);
  modal('Cargar venta de la tienda',`
   <p class="small muted" style="margin-bottom:12px">Para una compra ya pagada en la tienda online. Suma en Tienda, en su campaña y en los objetivos de la unidad.</p>
   ${units.length>1?`<div class="field"><label for="slu">Unidad</label><select class="select" id="slu">${units.map(u=>`<option>${esc(u)}</option>`).join('')}</select></div>`:''}
   <div class="form-grid">${F('mnn','Cliente','placeholder="Nombre y apellido" maxlength="120"')}${F('mnp','Teléfono','inputmode="tel" maxlength="30"')}</div><div id="mndup"></div>
   <div class="form-grid">${F('mne','Email','type="email" maxlength="200"')}${F('slpay','N.º de pago de Mercado Pago','inputmode="numeric" maxlength="40" placeholder="Ej.: 189604761267"','Está en el mail de la compra. Evita que se cuente dos veces cuando la web empiece a mandar las compras.')}</div>
   <div class="field"><span class="label">Productos</span><div id="slrows">${row()}</div><button type="button" class="btn btn-sm btn-ghost" id="sladd">${ic('plus')} Agregar producto</button><span class="err" role="alert" id="slerr"></span></div>
   <p class="sale-total">Total: <b id="sltot">$ 0</b></p>
   <div class="form-grid">${F('slpd','Fecha de pago',`type="date" max="${today}" value="${today}"`)}<div class="field"><label for="slst">Estado</label><select class="select" id="slst"><option value="paid">Pagado · por retirar</option><option value="picked_up">Ya lo retiró</option></select></div></div>
   <div class="form-grid">${F('slrd','Día de retiro (opcional)','type="date"')}${F('slts','Horario (opcional)','maxlength="40" placeholder="Ej.: Mañana"')}</div>
   <div class="field"><label for="slc">Campaña (opcional)</label><select class="select" id="slc"></select></div>
   <div class="field"><label for="slno">Notas (opcional)</label><input class="input" id="slno" maxlength="1000" placeholder="Ej.: dedicatoria, aclaraciones"></div>`,
   `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="slok">Cargar venta</button>`);
  const unit=()=>$('#slu')?$('#slu').value:(units[0]||'Cafelito Cakes');
  const fillC=()=>{ $('#slc').innerHTML=`<option value="">Sin campaña</option>`+camps(unit()).map(c=>`<option value="${esc(campCode(c))}">${esc(c.name)}</option>`).join(''); }; fillC(); if($('#slu')) $('#slu').onchange=fillC;
  const tot=()=>{ let t=0; $$('#slrows .sale-row').forEach(r=>{ const p=evParseMoney(r.querySelector('[data-sp]').value), q=+r.querySelector('[data-sq]').value||0; if(p) t+=p*q; }); $('#sltot').textContent=evMoney(t); return t; };
  const bind=()=>{ $$('#slrows [data-sdel]').forEach(b=>b.onclick=()=>{ if($$('#slrows .sale-row').length>1){ b.closest('.sale-row').outerHTML=''; tot(); } }); $$('#slrows input').forEach(i=>i.oninput=tot); };
  bind(); $('#sladd').onclick=()=>{ $('#slrows').insertAdjacentHTML('beforeend',row()); bind(); };
  $('#mnp').oninput=()=>{ const c=manFind($('#mnp').value); $('#mndup').innerHTML=c?`<div class="alert alert-info" style="margin-bottom:12px">${ic('info')}<div>Ya tenés a <b>${esc(c.name||'este contacto')}</b> con ese teléfono: la venta se suma a ese contacto.</div></div>`:''; };
  if(pre.name) $('#mnn').value=pre.name; if(pre.phone){ $('#mnp').value=pre.phone; $('#mnp').oninput(); } if(pre.email) $('#mne').value=pre.email;
  $('#slok').onclick=async()=>{
    const n=$('#mnn'), p=$('#mnp'), e=$('#mne'), pd=$('#slpd');
    const items=$$('#slrows .sale-row').map(r=>({name:r.querySelector('[data-sin]').value.trim(),quantity:+r.querySelector('[data-sq]').value||0,unitPriceMinor:evParseMoney(r.querySelector('[data-sp]').value)}));
    const badItems=items.some(i=>!i.name||!(i.quantity>=1)||!i.unitPriceMinor);
    const okN=fieldErr(n,!n.value.trim()?'Escribí el nombre':''), okP=fieldErr(p,!p.value.trim()&&!e.value.trim()?'Escribí el teléfono o el email':p.value.trim()&&p.value.replace(/\D/g,'').length<6?'Revisá el teléfono':'');
    const okE=fieldErr(e,e.value.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.value.trim())?'El email no es válido':''), okD=fieldErr(pd,!pd.value?'Elegí la fecha de pago':pd.value>today?'No puede ser futura':'');
    $('#slerr').textContent=badItems?'Cada producto necesita nombre, cantidad y precio':''; $('#slerr').closest('.field').classList.toggle('has-error',badItems);
    if(!(okN&&okP&&okE&&okD)||badItems) return;
    const body={tenantId:S.company.tid,kind:'order',brand:unit(),contact:{name:n.value.trim(),phone:p.value.trim(),email:e.value.trim()},
      order:{paymentId:$('#slpay').value.trim(),items,paidDate:pd.value,status:$('#slst').value,pickupDate:$('#slrd').value,timeSlot:$('#slts').value.trim(),utmCampaign:$('#slc').value,notes:$('#slno').value.trim()}};
    const b=$('#slok'); b.classList.add('is-loading'); b.disabled=true;
    try{
      const r=await fetch(MAN_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await C.user.getIdToken()},body:JSON.stringify(body)});
      const j=await r.json().catch(()=>({}));
      if(!r.ok){ const d=(j.error&&j.error.details)||[]; const map={'contact.name':'#mnn','contact.phone':'#mnp','contact.email':'#mne','order.paidDate':'#slpd','order.pickupDate':'#slrd','order.paymentId':'#slpay'};
        d.forEach(x=>{ const el=$(map[x.field]); if(el) fieldErr(el,x.issue); else if(x.field==='order.items') $('#slerr').textContent=x.issue; }); if(!d.length) toast((j.error&&j.error.message)||'No se pudo guardar. Probá de nuevo.'); b.classList.remove('is-loading'); b.disabled=false; return; }
      layerDirty=false; closeLayer(); if(typeof SH==='object') SH.month=body.order.paidDate.slice(0,7); render();
      toast(`Venta cargada: ${evMoney(j.totalMinor)}${j.match==='existing'?` · cliente ${j.existingName}`:''}`);
    }catch(err){ b.classList.remove('is-loading'); b.disabled=false; toast('Sin conexión: no se guardó. Probá de nuevo.'); }
  };
}
(function(){
  if(typeof vTienda!=='function') return;
  const _vt=vTienda;
  vTienda=function(){ const h=_vt(); if(!(S.company&&S.company.cloud)||!SH.loaded||SH.err) return h;
    return `<div class="toolbar" style="margin-bottom:12px"><span class="small muted">Las compras de la web todavía se cargan a mano hasta que la tienda las mande sola.</span><span class="grow"></span><button class="btn btn-sm btn-primary" data-mansale>${ic('plus')} Cargar venta</button></div>`+h; };
  document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-mansale]'); if(!b) return; e.preventDefault(); manSaleForm(); });
})();

/* ---------- Ficha del contacto: todo lo que compró en cada unidad + «Registrar venta» ---------- */
(function(){
  if(typeof evContacto!=='function') return;
  const _ec=evContacto;
  evContacto=function(id){ _ec(id); const c=EV.contacts[id]; if(!c) return;
    if(typeof shListen==='function') shListen();
    const dr=$('#layer .drawer'); if(dr) dr.dataset.contact=id;
    if(typeof SH==='object'&&!SH.loaded){ const t=setInterval(()=>{ if(SH.loaded){ clearInterval(t); const d=$('#layer .drawer'); if(d&&d.dataset.contact===id) evContacto(id); } },500); setTimeout(()=>clearInterval(t),10000); }
    const pre={name:c.name||'',phone:c.phoneRaw||c.phoneDisplay||'',email:c.email||''};
    const secs=$$('#layer .drawer section.card'), q=secs.find(x=>/Pedidos de presupuesto/.test((x.querySelector('h3')||{}).textContent||''));
    if(q){ const h=q.querySelector('h3'); h.textContent=h.textContent.replace('Pedidos de presupuesto','Cotizaciones de eventos'); }
    const orders=(typeof SH==='object'?SH.orders:[]).filter(o=>o.contactId===id).sort((a,b)=>(shPaidMs(b)||0)-(shPaidMs(a)||0));
    const box=document.createElement('section'); box.className='card';
    box.innerHTML=`<h3 style="margin-bottom:12px">Compras en la tienda (${orders.length})</h3>${orders.length?orders.map(o=>{ const [sl,sc]=SH_ST[o.status]||[o.status,'']; return `<div class="settings-row" style="gap:12px;align-items:center"><div style="flex:1;min-width:0"><b>${esc(shItems(o))}</b><div class="small muted">${esc(o.brand||'')} · pagado ${o.paidAt?evWhen(o.paidAt):'—'}${(o.pickup||{}).date?' · retira '+evDate(o.pickup.date):''}</div></div><span class="badge ${sc}">${sl}</span><b class="mono">${evMoney(o.totalMinor)}</b></div>`; }).join(''):`<p class="small muted">${SH.loaded?'Sin compras.':'Cargando…'}</p>`}`;
    if(q) q.after(box); else { const body=$('#layer .drawer [style*="overflow:auto"]'); if(body) body.appendChild(box); }
    const wa=$$('#layer .drawer section.card')[0]; if(wa){ const act=document.createElement('div'); act.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:8px';
      act.innerHTML=`<button type="button" class="btn" data-regsale>${ic('plus')} Registrar venta</button>`; wa.appendChild(act);
      act.querySelector('[data-regsale]').onclick=()=>{ closeLayer();
        modal('Registrar venta',`<p class="small muted" style="margin-bottom:12px">${esc(c.name||'')} · elegí qué compró.</p><div style="display:grid;gap:8px">
          <button type="button" class="btn" data-rs="evento">${ic('calendar')} Cotización de un evento (Cafelito Ambulante)</button>
          <button type="button" class="btn" data-rs="tienda">${ic('dollar')} Compra en la tienda (ya pagada)</button></div>
          <p class="small muted" style="margin-top:12px">Suscripciones de Work e inscripciones de Academy: próximamente.</p>`,`<button class="btn" data-close>Cancelar</button>`);
        $$('#layer [data-rs]').forEach(b=>b.onclick=()=>{ const k=b.dataset.rs; closeLayer(); if(k==='evento') manForm(true,pre); else manSaleForm(pre); }); }; }
  };
})();
