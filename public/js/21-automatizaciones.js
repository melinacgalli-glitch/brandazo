/* =====================================================================
   AUTOMATIZACIONES REALES (empresas en la nube)
   - «Gracias por tu primera compra»: mail al día siguiente del retiro, con código personal de descuento.
     Configuración: tenants/{t}/settings/auto-primera-compra (la guarda el servidor).
   - Lo enviado (autoSends) y los códigos (coupons) son de solo lectura acá; el canje lo hace el servidor.
   - El editor visual de flujos del prototipo no se muestra en la nube: no envía nada de verdad.
   ===================================================================== */
const AU={ tid:null, unsubs:[], cfg:null, sends:[], coupons:[], loaded:0 };
const AU_DEF={ enabled:false, unit:'Cafelito Cakes', fromName:'Cafelito', replyTo:'', sendHour:10, pct:10, validDays:30, prefix:'GRACIAS',
  subject:'¡Gracias por tu primera torta, {{nombre}}! Te dejamos un regalo',
  body:'¡Hola, {{nombre}}!\n\nGracias por elegir **Cafelito Cakes** para ser parte de tu celebración. Esperamos que hayas disfrutado tu torta tanto como nosotros disfrutamos preparándola.\n\nNos encanta acompañarte en esos momentos especiales. Cada torta que hacemos tiene mucho de lo que nos apasiona: sabores únicos, dedicación y amor por los detalles.\n\nY como queremos volver a verte, tenemos un regalo para vos: **¡un 10% de descuento!** Podés usarlo en tu próximo pedido de tortas o para disfrutar de lo que más te guste en **Cafelito Coffee House**.\n\n{{regalo}}\n\n**P. D.: ¿Qué te pareció tu torta?** Nos encantaría conocer tu opinión. ¡Podés responder directamente a este mail!\n\nUn abrazo,\n**El equipo de Cafelito**' };
const auCloud=()=>!!(S.company&&S.company.cloud&&typeof fbDb!=='undefined'&&fbDb);
function auListen(){
  if(!auCloud()) return; const c=S.company; if(AU.tid===c.tid&&AU.unsubs.length) return;
  AU.unsubs.forEach(f=>f()); Object.assign(AU,{tid:c.tid,unsubs:[],cfg:null,sends:[],coupons:[],loaded:0});
  const ref=r=>()=>{ if(!/^#\/app\/automatizaciones/.test(location.hash)) return; if($('#layer').children.length){ AU.dirty=true; return; } render(); };
  AU.unsubs.push(fbDb.doc(`tenants/${c.tid}/settings/auto-primera-compra`).onSnapshot(s=>{ AU.cfg=s.exists?s.data():null; AU.loaded|=1; ref()(); },()=>{ AU.loaded|=1; ref()(); }));
  AU.unsubs.push(fbDb.collection(`tenants/${c.tid}/autoSends`).onSnapshot(s=>{ AU.sends=s.docs.map(d=>({id:d.id,...d.data()})); AU.loaded|=2; ref()(); },()=>{ AU.loaded|=2; ref()(); }));
  AU.unsubs.push(fbDb.collection(`tenants/${c.tid}/coupons`).onSnapshot(s=>{ AU.coupons=s.docs.map(d=>({id:d.id,...d.data()})); AU.loaded|=4; ref()(); },()=>{ AU.loaded|=4; ref()(); }));
  C.unsub.push(()=>{ AU.unsubs.forEach(f=>f()); AU.unsubs=[]; AU.tid=null; });
}
const auCfg=()=>({...AU_DEF,...(AU.cfg||{})});
const auToday=()=>shToday();
const auDate=iso=>{ if(!iso) return '—'; const [y,m,d]=iso.split('-'); return `${+d}/${+m}/${y}`; };
async function auPost(body){ const r=await fetch(MAN_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await C.user.getIdToken()},body:JSON.stringify({tenantId:S.company.tid,...body})}); return {ok:r.ok,j:await r.json().catch(()=>({}))}; }

function vAutoCloud(){
  auListen();
  const head=pageHead('Automatizaciones','Mails y acciones que se hacen solos, con resultados medibles.',`<button class="btn" data-aucoupon>${ic('tag')} Canjear código</button>`);
  if(AU.loaded!==7) return head+`<div class="card empty"><p class="muted">Cargando…</p></div>`;
  const c=auCfg(), admin=['Dueño','Admin'].includes((S.company||{}).myRole), today=auToday();
  const sent=AU.sends.filter(s=>!s.skipped), noMail=AU.sends.filter(s=>s.skipped==='sin email').length;
  const mine=AU.coupons.filter(x=>x.automation==='primera-compra'), used=mine.filter(x=>x.status==='used'), sales=used.reduce((a,x)=>a+(x.saleAmountMinor||0),0);
  const rate=sent.length?Math.round(used.length/sent.length*100):null;
  const st=(l,v,d,cls='')=>`<div class="stat ${cls}"><div class="l">${l}</div><div class="v">${v}</div>${d?`<div class="d">${d}</div>`:''}</div>`;
  const state=x=>x.status==='used'?[`Canjeado ${auDate(x.usedDate)}${x.usedWhere==='web'?' · web':' · local'}`,'badge-ok']:x.expires<today?['Vencido','badge-err']:['Vigente','badge-brand'];
  const rows=[...sent].sort((a,b)=>((b.at&&b.at.toMillis())||0)-((a.at&&a.at.toMillis())||0)).map(s=>{ const cp=AU.coupons.find(x=>x.code===s.code)||{status:'active',expires:s.expires}; const [sl,sc]=state(cp);
    return `<div class="sh-row" style="cursor:default"><span class="sh-main"><b>${esc(s.name||'—')}</b><span class="small muted">Enviado ${s.at?evWhen(s.at):'—'} · vence ${auDate(s.expires)}</span></span><span class="sh-total mono">${esc(s.code||'')}</span><span class="sh-meta small"><span class="badge ${sc}">${sl}</span>${cp.saleAmountMinor?`<span class="muted">compra de ${evMoney(cp.saleAmountMinor)}</span>`:''}</span></div>`; }).join('');
  return head+`<section class="card au-card"><div class="card-head"><div><h3>Gracias por tu primera compra</h3><div class="small muted">${esc(c.unit)} · al día siguiente del retiro, a las ${c.sendHour} h · ${c.pct}% de descuento con código personal, válido ${c.validDays} días</div></div>
     <span class="badge ${c.enabled?'badge-ok':''}">${c.enabled?'Activa':'Apagada'}</span></div>
    <p class="small" style="margin:8px 0 12px">Le llega a cada persona <b>una sola vez</b>, después de su primera compra en la tienda (si no se canceló), con su nombre y un código para usar en el local o en la web. Sale como <b>${esc(c.fromName)}</b>${c.replyTo?` y las respuestas llegan a <b>${esc(c.replyTo)}</b>`:''}.${c.since?` Cuenta las compras retiradas desde el ${auDate(c.since)}.`:''}</p>
    <div class="stat-grid">${st('Mails enviados',sent.length,noMail?`${noMail} sin email, no se pudo`:'','st-info')}${st('Códigos usados',used.length,rate==null?'todavía ninguno':`${rate}% de los enviados`,'st-ok')}${st('Ventas con código',used.length?evMoney(sales):'<span class="muted">$ 0</span>','lo que se cargó al canjear','st-ok')}${st('Vigentes',mine.filter(x=>x.status!=='used'&&x.expires>=today).length,'códigos sin usar','st-warn')}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">${admin?`<button class="btn ${c.enabled?'':'btn-primary'}" data-autoggle>${c.enabled?'Apagar':'Activar'}</button><button class="btn" data-auedit>${ic('edit')} Editar el mail</button>`:''}<button class="btn" data-autest>${ic('mail')} Mandarme una prueba</button></div>
    ${admin?'':'<p class="small muted" style="margin-top:8px">Solo Dueño o Admin pueden cambiarla.</p>'}</section>
   <section class="card" style="margin-top:16px"><h3 style="margin-bottom:8px">Enviados</h3>${rows?`<div class="sh-list">${rows}</div>`:'<p class="small muted">Todavía no se envió ninguno.</p>'}</section>
   <p class="small muted" style="margin-top:16px">El editor de flujos visuales todavía no está disponible para enviar de verdad. Si necesitás otra automatización, pedila y la armamos.</p>`;
}
function auEdit(){
  const c=auCfg(), units=S.brands.map(b=>b.name);
  modal('Editar «Gracias por tu primera compra»',`<div class="form-grid"><div class="field"><label for="auu">Unidad</label><select class="select" id="auu">${units.map(u=>`<option ${u===c.unit?'selected':''}>${esc(u)}</option>`).join('')}</select></div>${F('auh','Hora de envío (día siguiente al retiro)',`type="number" min="8" max="21" value="${c.sendHour}"`)}</div>
   <div class="form-grid">${F('aufn','Remitente (nombre)',`value="${esc(c.fromName)}" maxlength="60"`)}${F('aurt','Las respuestas llegan a',`type="email" value="${esc(c.replyTo)}" placeholder="administracion@cafelito.co"`)}</div>
   <div class="form-grid">${F('aup','Descuento (%)',`type="number" min="1" max="90" value="${c.pct}"`)}${F('auv','Válido por (días)',`type="number" min="1" max="365" value="${c.validDays}"`)}</div>
   ${F('aus','Asunto',`value="${esc(c.subject)}" maxlength="200"`)}
   <div class="field"><label for="aub">Texto del mail</label><textarea class="input" id="aub" rows="12" maxlength="6000">${esc(c.body)}</textarea><span class="hint small muted"><b>{{nombre}}</b> = el nombre de la persona · <b>**texto**</b> = negrita · <b>{{regalo}}</b> = el recuadro con el código y el vencimiento · una línea en blanco separa párrafos.</span></div>
   ${F('aupx','Comienzo del código',`value="${esc(c.prefix)}" maxlength="12"`,'Ej.: GRACIAS → GRACIAS-7KQ4')}`,
   `<button class="btn" data-close>Cancelar</button><button class="btn" id="autest2">${ic('mail')} Mandarme una prueba</button><button class="btn btn-primary" id="auok">Guardar</button>`);
  const read=()=>({...c,unit:$('#auu').value,sendHour:+$('#auh').value,fromName:$('#aufn').value.trim(),replyTo:$('#aurt').value.trim(),pct:+$('#aup').value,validDays:+$('#auv').value,subject:$('#aus').value,body:$('#aub').value,prefix:$('#aupx').value});
  const check=()=>[fieldErr($('#aurt'),$('#aurt').value.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('#aurt').value.trim())?'Revisá el email':''),fieldErr($('#aus'),!$('#aus').value.trim()?'Escribí el asunto':''),fieldErr($('#aub'),!$('#aub').value.trim()?'Escribí el texto':'')].every(Boolean);
  $('#autest2').onclick=e=>{ if(check()) auSendTest(read(),e.currentTarget); };
  $('#auok').onclick=async e=>{ if(!check()) return; const b=e.currentTarget; b.classList.add('is-loading'); b.disabled=true;
    const {ok,j}=await auPost({kind:'auto-save',config:read()}).catch(()=>({ok:false,j:{}})); if(!ok){ b.classList.remove('is-loading'); b.disabled=false; return toast((j.error&&j.error.message)||'No se pudo guardar.'); }
    layerDirty=false; closeLayer(); toast('Automatización guardada'); };
}
async function auSendTest(cfg,btn){ if(btn){ btn.classList.add('is-loading'); btn.disabled=true; }
  const {ok,j}=await auPost({kind:'auto-test',config:cfg}).catch(()=>({ok:false,j:{}}));
  if(btn){ btn.classList.remove('is-loading'); btn.disabled=false; }
  toast(ok?`Te mandamos una prueba a ${j.sentTo}`:((j.error&&j.error.message)||'No se pudo enviar la prueba.')); }
function auCoupon(){
  modal('Canjear código de descuento',`${F('cpc','Código','placeholder="GRACIAS-7KQ4" autocapitalize="characters" style="text-transform:uppercase;font-family:monospace"')}<div id="cpr"></div>`,`<button class="btn" data-close>Cerrar</button><button class="btn btn-primary" id="cpok">Verificar</button>`);
  const show=(j)=>{ const s=j.state, box=$('#cpr');
    const msg={valido:['alert-ok',`Válido · ${esc(j.name||'')} · ${j.pct}% de descuento · vence el ${auDate(j.expires)}`],inexistente:['alert-err','Ese código no existe. Revisá que esté bien escrito.'],usado:['alert-err',`Ya se usó el ${auDate(j.usedDate)}${j.usedWhere?' ('+j.usedWhere+')':''}. No se puede usar de nuevo.`],vencido:['alert-err',`Venció el ${auDate(j.expires)}.`],canjeado:['alert-ok',`Listo: código canjeado. Aplicá el ${j.pct}% en Fudo o en la venta web.`]}[s]||['alert-err','No se pudo verificar.'];
    box.innerHTML=`<div class="alert ${msg[0]}" style="margin-top:8px">${ic(msg[0]==='alert-ok'?'check':'alert')}<div>${msg[1]}</div></div>`+(s==='valido'?`<div class="form-grid" style="margin-top:12px"><div class="field"><label for="cpw">Dónde lo usa</label><select class="select" id="cpw"><option value="local">En el local</option><option value="web">En la web</option></select></div>${lcMoneyField('cpa','Importe de la compra (opcional)','','Para medir cuánto vende esta acción.')}</div>`:'');
    $('#cpok').textContent=s==='valido'?'Canjear':'Verificar'; $('#cpok').dataset.mode=s==='valido'?'redeem':'check'; };
  $('#cpc').oninput=()=>{ $('#cpr').innerHTML=''; $('#cpok').textContent='Verificar'; $('#cpok').dataset.mode='check'; };
  $('#cpok').onclick=async e=>{ const code=$('#cpc').value.trim(); if(!fieldErr($('#cpc'),!code?'Escribí el código':'')) return; const b=e.currentTarget, redeem=b.dataset.mode==='redeem'; b.classList.add('is-loading'); b.disabled=true;
    const {ok,j}=await auPost(redeem?{kind:'coupon-redeem',code,where:$('#cpw').value,amountMinor:evParseMoney($('#cpa').value)||null}:{kind:'coupon-check',code}).catch(()=>({ok:false,j:{}}));
    b.classList.remove('is-loading'); b.disabled=false; if(!ok) return fieldErr($('#cpc'),(j.error&&j.error.message)||'No se pudo verificar'); show(j); if(redeem&&j.state==='canjeado'){ $('#cpok').style.display='none'; } };
}
/* Si llegaron datos con una ventana abierta, se actualiza la pantalla al cerrarla */
new MutationObserver(()=>{ if(AU.dirty&&!$('#layer').children.length&&/^#\/app\/automatizaciones/.test(location.hash)){ AU.dirty=false; render(); } }).observe(document.getElementById('layer'),{childList:true});
(function(){
  const _v=vAuto, _b=bAuto;
  vAuto=function(tab){ return auCloud()?vAutoCloud():_v(tab); };
  bAuto=function(tab){ if(!auCloud()) return _b(tab); };
  VIEWS.automatizaciones.view=vAuto; VIEWS.automatizaciones.bind=bAuto;
  document.addEventListener('click',e=>{ const t=e.target.closest&&e.target.closest('[data-aucoupon],[data-auedit],[data-autest],[data-autoggle]'); if(!t) return; e.preventDefault();
    if(t.dataset.aucoupon!=null) return auCoupon(); if(t.dataset.auedit!=null) return auEdit(); if(t.dataset.autest!=null) return auSendTest(auCfg(),t);
    if(t.dataset.autoggle!=null){ const c=auCfg(), on=!c.enabled;
      if(on&&!c.replyTo) return toast('Antes de activarla, completá a qué mail llegan las respuestas (Editar el mail)');
      t.classList.add('is-loading'); auPost({kind:'auto-save',config:{...c,enabled:on}}).then(({ok,j})=>{ t.classList.remove('is-loading'); toast(ok?(on?'Automatización activada':'Automatización apagada'):((j.error&&j.error.message)||'No se pudo guardar.')); }); } });
  /* También desde CRM → Tienda */
  if(typeof vTienda==='function'){ const _vt=vTienda; vTienda=function(){ const h=_vt(); return h.replace('<button class="btn btn-sm btn-primary" data-mansale>',`<button class="btn btn-sm" data-aucoupon>${ic('tag')} Canjear código</button><button class="btn btn-sm btn-primary" data-mansale>`); }; }
})();
