/* =====================================================================
   ENVIAR UN MAIL A UN GRUPO (segmento o personas elegidas en CRM → Ventas)
   4 pasos: a quién le llega · qué dice · prueba (obligatoria) · enviar ahora o programar.
   El servidor decide a quién le llega (solo quienes aceptaron promociones y tienen email), crea los
   códigos de regalo y manda. Acá solo se arma y se ve el historial (tenants/{t}/mailings, mailSends).
   ===================================================================== */
const ENV={ tid:null, unsub:null, items:[], loaded:false };
function envListen(){
  if(!(S.company&&S.company.cloud&&typeof fbDb!=='undefined'&&fbDb)) return; const c=S.company;
  if(ENV.tid===c.tid&&ENV.unsub) return; if(ENV.unsub) ENV.unsub();
  Object.assign(ENV,{tid:c.tid,items:[],loaded:false});
  ENV.unsub=fbDb.collection(`tenants/${c.tid}/mailings`).orderBy('createdAt','desc').limit(200).onSnapshot(s=>{ ENV.items=s.docs.map(d=>({id:d.id,...d.data()})); ENV.loaded=true; envRefresh(); },()=>{ ENV.loaded=true; envRefresh(); });
  C.unsub.push(()=>{ if(ENV.unsub){ ENV.unsub(); ENV.unsub=null; ENV.tid=null; } });
}
function envRefresh(){ if(!/^#\/app\/automatizaciones/.test(location.hash)) return; if($('#layer').children.length){ if(typeof AU!=='undefined') AU.dirty=true; return; } render(); }
const envAdmin=()=>['Dueño','Admin'].includes((S.company||{}).myRole);
const envPost=b=>lcPost(b);
const envDateTime=ms=>new Date(ms).toLocaleString('es-AR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
const ENV_ST={scheduled:['Programado','badge-brand'],sending:['Enviando','badge-warn'],sent:['Enviado','badge-ok'],cancelled:['Cancelado','badge-err']};

/* ---------- El formulario de 4 pasos ---------- */
function envForm(ids,segName){
  ids=[...new Set(ids.filter(Boolean))]; if(!ids.length){ toast('Elegí al menos una persona'); return; }
  const rid='env-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  const ac=(typeof auCfg==='function'?auCfg():{})||{}, camps=(M().campaigns||[]);
  const eom=(()=>{ const d=new Date(); return new Date(d.getFullYear(),d.getMonth()+1,0); })(), iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
  const st={ aud:null, testFor:null, confirm:false };
  modal(`Enviar un mail${segName?` · ${esc(segName)}`:''}`,`
    <section class="env-step"><h4><span class="env-n">1</span>A quién le llega</h4><div id="envaud" class="small muted">Revisando ${ids.length} persona${ids.length===1?'':'s'}…</div></section>
    <section class="env-step"><h4><span class="env-n">2</span>Qué dice</h4>
      <div class="form-grid">${F('envfrom','Desde (nombre)',`value="${esc(ac.fromName&&ac.fromName!=='Cafelito'?ac.fromName:'Cafelito Avisos')}" maxlength="60"`)}${F('envreply','Responden a (email)',`type="email" value="${esc(ac.replyTo||'')}" maxlength="200"`)}</div>
      ${F('envsub','Asunto','maxlength="200" placeholder="Ej.: Esta Navidad, un regalo para vos 🎄"')}
      <div class="field"><label for="envbody">Texto</label><textarea class="input" id="envbody" rows="7" maxlength="6000" placeholder="¡Hola, {{nombre}}!&#10;&#10;Escribí el mensaje…&#10;&#10;{{regalo}}"></textarea>
        <span class="hint small muted">{{nombre}} pone el nombre de cada persona · {{regalo}} pone el código (si no lo ponés, va al final) · **así** queda en negrita · una línea en blanco separa párrafos.</span><span class="err" role="alert"></span></div>
      <label class="env-tog"><input type="checkbox" id="envgift"> Incluir un código de regalo personal (uno distinto por persona, de un solo uso)</label>
      <div id="envgiftf" class="form-grid" hidden>${F('envpct','Descuento (%)','type="number" min="1" max="90" value="10"')}${F('envexp','Vale hasta',`type="date" value="${iso(eom)}"`)}${F('envpre','Empieza con','maxlength="12" value="REGALO" style="text-transform:uppercase"','Ej.: NAVIDAD → NAVIDAD-7KQ2')}</div>
      <div class="field"><label for="envcamp">Campaña (opcional, para medir lo que vende)</label><select class="select" id="envcamp"><option value="">Sin campaña</option>${camps.map(c=>`<option value="${esc(typeof campCode==='function'?campCode(c):c.utm||c.id)}">${esc(c.name)}</option>`).join('')}</select></div>
    </section>
    <section class="env-step"><h4><span class="env-n">3</span>Prueba</h4><p class="small" style="margin:0 0 8px">Te llega a vos tal cual, con un código de muestra que no sirve para comprar. Sin prueba no se puede enviar; si cambiás algo, hace falta otra.</p>
      <button class="btn btn-sm" id="envtest">${ic('mail')} Mandarme una prueba</button> <span id="envtestok" class="small"></span></section>
    <section class="env-step"><h4><span class="env-n">4</span>Enviar</h4>
      <div class="env-when"><label><input type="radio" name="envwhen" value="now" checked> Ahora</label><label><input type="radio" name="envwhen" value="later"> Programar</label>
        <input class="input" type="datetime-local" id="envat" hidden aria-label="Día y hora del envío"></div>
      <p class="small muted" id="envwhenhint" hidden>Los envíos programados salen en la vuelta de cada hora (a las y cuarto), entre las 8 y las 21.</p>
      <div id="envsendmsg" class="small"></div>
      ${envAdmin()?'':'<p class="small muted">Solo Dueño o Admin pueden enviar. Podés armarlo, mandarte la prueba y avisarles.</p>'}
    </section>`,
    `<button class="btn" data-close>Cancelar</button>${envAdmin()?`<button class="btn btn-primary" id="envsend" disabled>Enviar</button>`:''}`);
  const draft=()=>({ subject:$('#envsub').value.trim(), body:$('#envbody').value.trim(), fromName:$('#envfrom').value.trim(), replyTo:$('#envreply').value.trim(), campaign:$('#envcamp').value,
    gift:$('#envgift').checked?{on:true,pct:+$('#envpct').value,expires:$('#envexp').value,prefix:$('#envpre').value.trim().toUpperCase()}:{on:false} });
  const key=()=>JSON.stringify(draft());
  const errs={subject:'#envsub',body:'#envbody',replyTo:'#envreply','gift.pct':'#envpct','gift.expires':'#envexp'};
  const showErr=j=>{ const d=(j.error&&j.error.details)||[]; d.forEach(x=>{ const el=$(errs[x.field]); if(el) fieldErr(el,x.issue); }); if(!d.length) toast((j.error&&j.error.message)||'No se pudo. Probá de nuevo.'); };
  const upd=()=>{ const ok=st.aud&&st.aud.ok.length, tested=st.testFor===key(), later=$('input[name=envwhen]:checked').value==='later';
    $('#envat').hidden=!later; $('#envwhenhint').hidden=!later;
    $('#envtestok').innerHTML=st.testFor?(tested?`<span class="badge badge-ok">${ic('check')} Prueba enviada</span>`:'<span class="badge badge-warn">Cambiaste algo: mandate otra prueba</span>'):'';
    const b=$('#envsend'); if(!b) return; b.disabled=!(ok&&tested); st.confirm=false;
    b.textContent=ok?`Enviar a ${st.aud.ok.length} persona${st.aud.ok.length===1?'':'s'}`:'Enviar';
    $('#envsendmsg').innerHTML=!ok?'':!tested?'<span class="muted">Primero mandate la prueba.</span>':''; };
  ['#envsub','#envbody','#envfrom','#envreply','#envpct','#envexp','#envpre','#envcamp','#envgift','#envat'].forEach(s=>{ const e=$(s); if(e){ e.addEventListener('input',upd); e.addEventListener('change',upd); } });
  $('#envgift').addEventListener('change',()=>{ $('#envgiftf').hidden=!$('#envgift').checked; });
  $$('input[name=envwhen]').forEach(r=>r.onchange=upd);
  envPost({kind:'mail-audience',contactIds:ids}).then(({ok,j})=>{ const box=$('#envaud'); if(!box) return; if(!ok){ box.textContent=(j.error&&j.error.message)||'No se pudo revisar.'; return; }
    st.aud=j; const out=[...j.noConsent.map(p=>[p,'no aceptó promociones']),...j.noEmail.map(p=>[p,'sin email']),...j.unsub.map(p=>[p,'pidió no recibir más']),...j.missing.map(p=>[p,'ya no existe'])];
    box.className='';
    box.innerHTML=`<div class="env-big"><b>${j.ok.length}</b> <span class="muted">de ${j.total} lo recibe${j.ok.length===1?'':'n'}</span></div>
      ${out.length?`<details class="small"><summary>${out.length} quedan afuera${j.noConsent.length?` (${j.noConsent.length} no aceptaron promociones`:' ('}${j.noEmail.length?`${j.noConsent.length?', ':''}${j.noEmail.length} sin email`:''}${j.unsub.length?`, ${j.unsub.length} se dieron de baja`:''})</summary><ul>${out.map(([p,r])=>`<li>${esc(p.name||'Sin nombre')} · <span class="muted">${r}</span></li>`).join('')}</ul></details>`:''}
      ${!j.ok.length?'<div class="alert alert-warn" style="margin-top:8px">Nadie de este grupo puede recibirlo: tienen que haber aceptado promociones y tener email (se carga en su ficha).</div>':''}
      ${j.ok.length>j.dailyMax?`<p class="small muted">Son más de ${j.dailyMax}: el plan gratis de mails manda hasta ${j.dailyMax} por día; el resto sale los días siguientes, solo.</p>`:''}`;
    upd(); });
  $('#envtest').onclick=async()=>{ const b=$('#envtest'); b.classList.add('is-loading'); b.disabled=true; const k=key();
    const {ok,j}=await envPost({kind:'mail-test',draft:draft()}); b.classList.remove('is-loading'); b.disabled=false;
    if(!ok){ showErr(j); return; } st.testFor=k; layerDirty=true; upd(); toast(`Prueba enviada a ${j.sentTo}`); };
  const sb=$('#envsend'); if(sb) sb.onclick=async()=>{
    const later=$('input[name=envwhen]:checked').value==='later', at=$('#envat').value;
    if(later&&!at){ fieldErr($('#envat'),'Elegí día y hora'); toast('Elegí día y hora del envío'); return; }
    const n=st.aud.ok.length;
    if(!st.confirm){ st.confirm=true; sb.textContent=later?`Sí, programar para ${envDateTime(new Date(at).getTime())}`:`Sí, enviar ahora a ${n} persona${n===1?'':'s'}`; $('#envsendmsg').innerHTML='<span class="muted">Tocá de nuevo para confirmar.</span>'; return; }
    sb.classList.add('is-loading'); sb.disabled=true;
    const {ok,j}=await envPost({kind:'mail-send',draft:draft(),contactIds:ids,requestId:rid,segmentName:segName||'',sendAt:later?new Date(at).toISOString():null});
    sb.classList.remove('is-loading'); sb.disabled=false;
    if(!ok){ st.confirm=false; upd(); showErr(j); return; }
    layerDirty=false; closeLayer(); VN.sel.clear();
    toast(j.status==='scheduled'?`Programado para ${envDateTime(j.sendAtMs)}: ${j.recipients} persona${j.recipients===1?'':'s'}`:j.status==='sent'?`Enviado a ${j.stats.sent} persona${j.stats.sent===1?'':'s'}`:`Enviando: ${j.stats.sent} ya salieron, el resto sale en las próximas horas`);
    location.hash='#/app/automatizaciones'; };
  upd();
}

/* ---------- Botón en la barra de selección y con un segmento elegido ---------- */
(function(){
  if(typeof vnBulkHtml!=='function') return;
  const _h=vnBulkHtml, _b=vnBindBulk;
  vnBulkHtml=function(){ return _h().replace('<button class="btn btn-sm btn-primary" data-vnb="seg">',`<button class="btn btn-sm btn-primary" data-vnb="send">${ic('mail')} Enviar mail</button><button class="btn btn-sm" data-vnb="seg">`); };
  vnBindBulk=function(){ _b(); const s=$('[data-vnb="send"]'); if(s) s.onclick=()=>{ const g=VN.seg&&vnSegs().find(x=>x.id===VN.seg); envForm([...VN.sel],g?g.name:''); }; };
  const _vv=vVentas, _bv=bVentas;
  vVentas=function(){ let h=_vv(); const g=VN.seg&&vnSegs().find(x=>x.id===VN.seg);
    if(g&&!VN.sel.size) h=h.replace('<span class="grow"></span>',`<span class="grow"></span><button class="btn btn-sm" data-envseg>${ic('mail')} Enviar mail al segmento</button>`); return h; };
  bVentas=function(){ _bv(); const b=$('[data-envseg]'); if(b) b.onclick=()=>{ const g=vnSegs().find(x=>x.id===VN.seg); if(g) envForm(g.contactIds,g.name); }; };
})();

/* ---------- Historial en Automatizaciones ---------- */
function envHistory(){
  envListen(); if(!ENV.loaded) return '';
  const cps=(typeof AU!=='undefined'?AU.coupons:[]);
  const rows=ENV.items.map(m=>{ const [sl,sc]=ENV_ST[m.status]||[m.status,''], s=m.stats||{}, mine=cps.filter(c=>c.mailingId===m.id), used=mine.filter(c=>c.status==='used'), sales=used.reduce((a,c)=>a+(c.saleAmountMinor||0),0);
    const when=m.status==='scheduled'?`Sale el ${envDateTime(m.sendAtMs)}`:m.finishedAt?`Enviado ${evWhen(m.finishedAt)}`:m.startedAt?`Empezó ${evWhen(m.startedAt)}`:'';
    return `<article class="env-row"><div class="env-row-h"><div style="min-width:0"><b>${esc(m.draft&&m.draft.subject||'Sin asunto')}</b><div class="small muted">${esc(m.segmentName?'Segmento «'+m.segmentName+'» · ':'')}${when} · por ${esc(m.createdByName||'—')}</div></div><span class="badge ${sc}">${sl}</span></div>
      <div class="env-kpis"><span>Para <b>${m.recipients||0}</b></span><span>Enviados <b>${s.sent||0}</b></span><span>No entregados <b>${s.failed||0}</b></span>${m.draft&&m.draft.gift&&m.draft.gift.on?`<span>Códigos canjeados <b>${used.length}</b>${sales?` · <b>${evMoney(sales)}</b> en ventas`:''}</span>`:''}${m.waiting?'<span class="muted">sigue mañana (tope diario)</span>':''}</div>
      ${m.status==='scheduled'&&envAdmin()?`<button class="btn btn-sm" data-envcancel="${esc(m.id)}">Cancelar envío</button>`:''}</article>`; }).join('');
  return `<section class="card" style="margin-top:16px"><h3 style="margin-bottom:4px">Envíos a grupos</h3><p class="small muted" style="margin-bottom:8px">Se arman desde CRM → Ventas: elegís personas o un segmento y tocás «Enviar mail».</p>${rows||'<p class="small muted">Todavía no hiciste ningún envío.</p>'}</section>`;
}
(function(){
  if(typeof vAutoCloud!=='function') return;
  const _v=vAutoCloud; vAutoCloud=function(){ const h=_v(); const i=h.lastIndexOf('<p class="small muted" style="margin-top:16px">'); const add=envHistory(); return i>0?h.slice(0,i)+add+h.slice(i):h+add; };
  const _b=VIEWS.automatizaciones.bind; VIEWS.automatizaciones.bind=function(t){ _b(t);
    $$('[data-envcancel]').forEach(b=>b.onclick=()=>{ const m=ENV.items.find(x=>x.id===b.dataset.envcancel); if(!m) return;
      modal('¿Cancelar el envío?',`<p>«${esc(m.draft.subject)}» no va a salir. No se manda nada a nadie.</p>`,`<button class="btn" data-close>Volver</button><button class="btn btn-danger" id="envcok">Cancelar envío</button>`);
      $('#envcok').onclick=async()=>{ const {ok,j}=await envPost({kind:'mail-cancel',id:m.id}); closeLayer(); toast(ok?'Envío cancelado':((j.error&&j.error.message)||'No se pudo cancelar')); }; }); };
})();

/* ---------- Ficha del contacto: mails que recibió ---------- */
(function(){
  if(typeof evContacto!=='function') return;
  const _ec=evContacto;
  evContacto=function(id){ _ec(id); if(!(S.company&&S.company.cloud&&typeof fbDb!=='undefined')) return;
    const body=$('#layer .drawer [style*="overflow:auto"]'); if(!body) return;
    const c=EV.contacts[id]||{}, mc=c.marketingConsent;
    const box=document.createElement('section'); box.className='card';
    box.innerHTML=`<h3 style="margin-bottom:8px">Mails</h3><p class="small">${mc&&mc.granted===true?'<span class="badge badge-ok">Acepta promociones</span>':mc&&mc.granted===false?'<span class="badge badge-err">Pidió no recibir más</span>':'<span class="badge">No aceptó promociones</span>'}${c.email?'':' · <span class="muted">sin email</span>'}</p><div class="small muted" data-envsends>Cargando…</div>`;
    body.appendChild(box);
    fbDb.collection(`tenants/${S.company.tid}/mailSends`).where('contactId','==',id).get().then(sn=>{ const l=sn.docs.map(d=>d.data()).filter(x=>x.status==='sent').sort((a,b)=>((b.at&&b.at.toMillis())||0)-((a.at&&a.at.toMillis())||0));
      const el=box.querySelector('[data-envsends]'); el.className='small'; el.innerHTML=l.length?l.map(x=>`<div class="settings-row"><div style="flex:1;min-width:0">Recibió <b>${esc(x.subject)}</b><div class="muted">${evWhen(x.at)}${x.code?` · código ${esc(x.code)}`:''}</div></div></div>`).join(''):'<span class="muted">Todavía no recibió envíos.</span>'; }).catch(()=>{ box.querySelector('[data-envsends]').textContent=''; });
  };
})();
