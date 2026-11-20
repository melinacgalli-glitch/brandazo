/* =====================================================================
   CARGA MANUAL EN EL CRM
   Pedidos de presupuesto y contactos que llegan por WhatsApp, teléfono, Instagram, recomendación…
   Lo guarda el servidor (/api/v1/crm/manual) con la sesión verificada: contacto sin duplicar
   (por teléfono), cotización en «Nueva cotización», tarea y nota en la historia.
   ===================================================================== */
const MAN_API=CLOUD.emu?'http://127.0.0.1:5001/brandazo/southamerica-east1/api/api/v1/crm/manual':'/api/v1/crm/manual';
const MAN_CH=['WhatsApp','Teléfono','Instagram','Facebook','Mail','Recomendación','En persona','Otro'];
const MAN_TYPES=['Corporativo','Cumpleaños','Casamiento','Lanzamiento o activación','Otro'];
/* Últimos 10 dígitos de un teléfono argentino (sin 54, 9, 0 ni 15) — solo para avisar si ya existe */
function manPhoneKey(v){ let d=String(v||'').replace(/\D/g,''); if(d.startsWith('00')) d=d.slice(2); if(d.startsWith('549')) d=d.slice(3); else if(d.startsWith('54')) d=d.slice(2); if(d.startsWith('0')) d=d.slice(1);
  if(d.length===12) for(const a of [2,3,4]) if(d.slice(a,a+2)==='15'){ d=d.slice(0,a)+d.slice(a+2); break; } return d.length>=8?d.slice(-10):''; }
function manFind(phone){ const k=manPhoneKey(phone); if(!k) return null; return Object.values(EV.contacts||{}).find(c=>manPhoneKey(c.phoneE164||c.phoneRaw)===k)||null; }

function manForm(withEvent=true){
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
   <div class="form-grid">${F('mne','Email (opcional)','type="email" maxlength="200"')}<div class="field"><label for="mnc">¿Por dónde llegó?</label><select class="select" id="mnc">${MAN_CH.map(c=>`<option>${c}</option>`).join('')}</select></div></div>
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
  const av=()=>{ const d=$('#mnd')&&$('#mnd').value; if(!d||!$('#mnav')) return; const won=EV.ops.find(o=>o.stage==='ganada'&&o.won&&o.won.depositPaid&&(o.event||{}).date===d), blk=((EV.settings||{}).blockedDates||[]).find(x=>x.date===d);
    $('#mnav').innerHTML=won?`<span style="color:var(--warning)">${ic('alert')} Ese día ya tiene un evento con seña (${esc(evName(won))}).</span>`:blk?`<span style="color:var(--warning)">${ic('alert')} Ese día está bloqueado${blk.note?' ('+esc(blk.note)+')':''}.</span>`:''; };
  if($('#mnd')) $('#mnd').onchange=av;
  $('#mnok').onclick=async()=>{
    const n=$('#mnn'), p=$('#mnp'), e=$('#mne');
    const okN=fieldErr(n,!n.value.trim()?'Escribí el nombre':''), okP=fieldErr(p,p.value.replace(/\D/g,'').length<6?'Escribí el teléfono':''), okE=fieldErr(e,e.value.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.value.trim())?'El email no es válido':'');
    let okD=true, amt=null; if(withEvent){ const d=$('#mnd'); okD=fieldErr(d,!d.value?'Elegí la fecha del evento':d.value<today?'La fecha ya pasó':''); const m=$('#mnm'); amt=m.value.trim()?evParseMoney(m.value):null; if(!fieldErr(m,m.value.trim()&&!amt?'Revisá el importe (ej.: 850.000)':'')) okD=false; }
    if(!(okN&&okP&&okE&&okD)) return;
    const body={tenantId:S.company.tid,channel:$('#mnc').value,contact:{name:n.value.trim(),phone:p.value.trim(),email:e.value.trim()}};
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
