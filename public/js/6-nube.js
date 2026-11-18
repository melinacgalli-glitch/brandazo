/* =====================================================================
   ETAPA 0 · INGRESO REAL Y DATOS EN LA NUBE (Firebase Auth + Firestore)
   - En www.brandazo.com.ar / brandazo.web.app la nube está siempre activa.
   - En localhost queda el prototipo local, salvo con ?emu=1 (usa los emuladores de Firebase).
   - Empresa = tenants/{tid}. Miembros = tenants/{tid}/members/{uid}. Invitaciones = invites/{email__tid}.
   - Los datos de cada empresa se guardan por partes en tenants/{tid}/state/{parte} (JSON).
   - Las empresas «Datos de ejemplo» y las que todavía no se subieron quedan solo en este navegador.
   ===================================================================== */
const FB_CONFIG={apiKey:'AIzaSyBDerAhYZjkx7fl-cvC6IeK4F31rX9QL_0',authDomain:'brandazo.firebaseapp.com',projectId:'brandazo',storageBucket:'brandazo.firebasestorage.app',messagingSenderId:'460054225992',appId:'1:460054225992:web:239a39e636bd8f9ae2e47d'};
const CLOUD=(()=>{ const local=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  let emu=false; try{ if(/[?&]emu=1\b/.test(location.search)) sessionStorage.setItem('bz-emu','1'); emu=sessionStorage.getItem('bz-emu')==='1'; }catch(e){}
  return { on: !local||emu, emu: local&&emu }; })();
/* Enlaces de los mails de cuenta (cambiar contraseña, verificar email, recuperar email): llegan a /accion?mode=…&oobCode=… */
const AX=(()=>{ if(!/^\/accion\/?$/.test(location.pathname)) return null; const q=new URLSearchParams(location.search);
  const ax={mode:q.get('mode')||'',code:q.get('oobCode')||'',view:null}; history.replaceState(null,'','/#/accion'); return ax; })();
const C={ local:[], user:null, ready:false, loading:false, error:'', tenants:[], admin:false, unsub:[], last:{}, timer:null, saving:false, needVerify:false };
let fbAuth=null, fbDb=null;
if(CLOUD.on&&window.firebase){
  firebase.initializeApp(FB_CONFIG); fbAuth=firebase.auth(); fbDb=firebase.firestore();
  if(CLOUD.emu){ fbAuth.useEmulator('http://127.0.0.1:9099'); fbDb.useEmulator('127.0.0.1',8080); }
  fbAuth.languageCode='es';
}
const TS=()=>firebase.firestore.FieldValue.serverTimestamp();
const lowerEmail=e=>String(e||'').trim().toLowerCase();
const authErr=e=>({'auth/invalid-credential':'Email o contraseña incorrectos.','auth/wrong-password':'Email o contraseña incorrectos.','auth/user-not-found':'Email o contraseña incorrectos.','auth/invalid-email':'Revisá el formato del email.','auth/too-many-requests':'Demasiados intentos. Esperá unos minutos o recuperá tu contraseña.','auth/email-already-in-use':'Ya hay una cuenta con este email. Iniciá sesión.','auth/weak-password':'La contraseña es muy débil: usá al menos 8 caracteres.','auth/popup-closed-by-user':'Cerraste la ventana de Google antes de terminar.','auth/popup-blocked':'El navegador bloqueó la ventana de Google. Permití ventanas emergentes para este sitio.','auth/network-request-failed':'No hay conexión. Revisá internet y probá de nuevo.','auth/unauthorized-domain':'Este dominio todavía no está autorizado en Firebase.','auth/operation-not-allowed':'Este método de ingreso no está habilitado en Firebase.'}[e&&e.code]||'No se pudo completar. Probá de nuevo.');

/* ---------- Control de ingreso: se ejecuta antes de dibujar cada pantalla ---------- */
const AUTH_ROUTES=['login','registro','verificar','recuperar','recuperar-enviado','nueva-clave'];
window.cloudGate=function(){
  if(!CLOUD.on||!fbAuth) return false;
  const a=location.hash.replace(/^#\/?/,'').split('/')[0];
  if(a==='accion'){ accionRender(); return true; }
  const priv=['app','ui-kit','onboarding'].includes(a);
  if(!C.ready){ if(priv||a===''||a==='mapa'){ $('#root').innerHTML=cloudScreen('Cargando…','Conectando con tu cuenta.'); return true; } return false; }
  if(!C.user){ if(priv||a==='verificar'||a==='nueva-clave'){ location.replace('#/login'); return true; } return false; }
  if(C.needVerify){ if(a!=='verificar'){ location.replace('#/verificar'); return true; } return false; }
  if(C.loading){ $('#root').innerHTML=cloudScreen('Cargando tus empresas…','Traemos tus datos de la nube.'); return true; }
  if(C.error&&priv){ $('#root').innerHTML=cloudScreen('No pudimos cargar tus datos',esc(C.error),`<button class="btn btn-primary" id="cretry">Reintentar</button> <button class="btn" id="cout">Cerrar sesión</button>`); bindCloudScreen(); return true; }
  if(a==='onboarding'){ location.replace('#/app/inicio'); return true; }
  if(AUTH_ROUTES.includes(a)||a===''){ location.replace('#/app/inicio'); return true; }
  if(priv&&!S.companies.length){ $('#root').innerHTML=cloudScreen('Todavía no tenés acceso a ninguna empresa',`Entraste como <b>${esc(C.user.email)}</b>. Pedile a quien administra tu empresa en Brandazo que te invite con este email.`,`<button class="btn" id="cdemo">Ver la demo con datos de ejemplo</button> <button class="btn" id="cout">Cerrar sesión</button>`); bindCloudScreen(); return true; }
  return false;
};
function cloudScreen(t,d,acts=''){ return `<div class="auth"><main class="auth-form"><div class="logo-row">${LOGO_WHITE}</div><div class="inner"><h1>${t}</h1><p class="muted" style="margin:8px 0 24px">${d}</p><div style="display:flex;gap:8px;flex-wrap:wrap">${acts}</div></div><p></p></main><aside class="auth-art" aria-hidden="true"><div>${LOGO_WHITE}</div><div class="bars"><i></i><i></i><i></i></div></aside></div>`; }
function bindCloudScreen(){
  const r=$('#cretry'); if(r) r.onclick=()=>loadCloud();
  const o=$('#cout'); if(o) o.onclick=()=>cloudSignOut();
  const d=$('#cdemo'); if(d) d.onclick=()=>{ const c={name:'Estudio Norte',country:'Argentina',industry:'Agencia de marketing',size:'2 a 10'}; S.companies.push(c); switchCompany(c); D().demo=true; if(typeof loadDemo==='function') loadDemo(); S.brand=0; render(); toast('Demo con datos de ejemplo: queda solo en este navegador'); };
}

/* En el sitio real no se muestra el atajo «Mapa de pantallas» del prototipo */
if(CLOUD.on){ const _authShell=authShell; authShell=function(inner){ return _authShell(inner).replace('<a class="small" href="#/mapa">Mapa de pantallas</a>',''); }; }

/* ---------- Mails de cuenta con la marca Brandazo (servidor «cuenta»); si no está configurado, el mail de Firebase ---------- */
const CUENTA_API=CLOUD.emu?'http://127.0.0.1:5001/brandazo/southamerica-east1/cuenta/api/v1/cuenta':'/api/v1/cuenta';
async function cuentaPost(path,body,token){ const r=await fetch(`${CUENTA_API}/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body||{})});
  const j=await r.json().catch(()=>({})); if(!r.ok){ const e=new Error((j.error&&j.error.message)||'No se pudo mandar el mail.'); e.code=j.error&&j.error.code; throw e; } return j; }
async function sendReset(email){
  try{ const j=await cuentaPost('recuperar',{email}); if(!j.fallback) return; }
  catch(e){ if(e.code==='RATE_LIMITED'||e.code==='BAD_EMAIL') throw e; console.warn('[cuenta] uso el mail de Firebase:',e.message); }
  try{ await fbAuth.sendPasswordResetEmail(email); }catch(err){ if(err.code!=='auth/user-not-found') throw err; }
}
async function sendVerify(user){
  try{ const j=await cuentaPost('verificar',{},await user.getIdToken()); if(!j.fallback) return; }
  catch(e){ if(e.code==='RATE_LIMITED') throw e; console.warn('[cuenta] uso el mail de Firebase:',e.message); }
  await user.sendEmailVerification();
}
const cuentaErr=e=>e&&e.code==='RATE_LIMITED'?e.message:authErr(e);

/* ---------- Pantallas de los enlaces de cuenta (con el diseño de Brandazo) ---------- */
function accionShell(icon,tone,title,text,extra=''){ return authShell(`<div style="width:48px;height:48px;border-radius:12px;background:var(--${tone}-soft);color:var(--${tone==='magenta'?'magenta-text':tone});display:grid;place-items:center;margin-bottom:16px">${ic(icon)}</div><h1>${title}</h1><p class="muted" style="margin:6px 0 24px">${text}</p>${extra}`); }
function accionRender(){
  const root=$('#root'); document.title='Brandazo · Tu cuenta';
  if(!AX||!AX.code){ root.innerHTML=accionShell('alert','danger','Enlace incompleto','Abrí el enlace completo desde el mail. Si no funciona, pedí uno nuevo.',`<a class="btn btn-primary btn-block" href="#/recuperar">Pedir un enlace nuevo</a><p class="small" style="margin-top:16px;text-align:center"><a href="#/login">Volver a iniciar sesión</a></p>`); return; }
  if(AX.view){ root.innerHTML=AX.view; accionBind(); return; }
  root.innerHTML=accionShell('clock','magenta','Un momento…','Estamos revisando el enlace.');
  if(AX.busy) return; AX.busy=true;
  const vencido=()=>accionShell('alert','danger','El enlace venció o ya se usó','Por seguridad, cada enlace sirve una sola vez y por tiempo limitado. Pedí uno nuevo y usalo apenas te llegue.',`<a class="btn btn-primary btn-block" href="#/recuperar">Pedir un enlace nuevo</a><p class="small" style="margin-top:16px;text-align:center"><a href="#/login">Volver a iniciar sesión</a></p>`);
  const show=h=>{ AX.view=h; AX.busy=false; if(location.hash==='#/accion') render(); };
  if(AX.mode==='resetPassword') fbAuth.verifyPasswordResetCode(AX.code).then(email=>{ AX.email=email;
      show(authShell(`<h1>Creá una contraseña nueva</h1><p class="muted" style="margin:6px 0 24px">Para <b style="color:var(--ink)">${esc(email)}</b>. Al guardarla, se cierra la sesión en tus otros dispositivos.</p>
      <form id="axf" novalidate>${pwField('n1','Nueva contraseña')}<div class="meter" id="axm"><i></i><i></i><i></i><i></i></div><p class="hint small muted" style="margin:6px 0 16px">Mínimo 8 caracteres. Sumá números y símbolos para hacerla más segura.</p>${pwField('n2','Repetí la contraseña')}<div id="axerr"></div><button class="btn btn-primary btn-block">Guardar contraseña</button></form>`)); }).catch(()=>show(vencido()));
  else if(AX.mode==='verifyEmail') fbAuth.applyActionCode(AX.code).then(async()=>{ try{ if(fbAuth.currentUser){ await fbAuth.currentUser.reload(); await fbAuth.currentUser.getIdToken(true); } }catch(e){}
      show(accionShell('check','success','Email verificado','Listo, ya confirmaste que el email es tuyo. Ya podés entrar a Brandazo.',`<a class="btn btn-primary btn-block" href="#/app/inicio" id="axgo">Entrar a Brandazo</a>`)); }).catch(()=>show(vencido()));
  else if(AX.mode==='recoverEmail') fbAuth.checkActionCode(AX.code).then(info=>fbAuth.applyActionCode(AX.code).then(()=>{ const em=info.data&&info.data.email||'';
      show(accionShell('check','success','Recuperamos tu email',`Tu cuenta vuelve a usar <b style="color:var(--ink)">${esc(em)}</b>. Si no fuiste vos quien lo cambió, creá una contraseña nueva ahora.`,`<button class="btn btn-primary btn-block" id="axrec">Mandame un enlace para cambiar la contraseña</button><p class="small" style="margin-top:16px;text-align:center"><a href="#/login">Iniciar sesión</a></p>`)); AX.email=em; })).catch(()=>show(vencido()));
  else show(vencido());
}
function accionBind(){
  bindEyes();
  const n1=$('#n1'); if(n1) n1.oninput=e=>{const v=e.target.value;let s=0;if(v.length>=8)s++;if(/\d/.test(v))s++;if(/[^A-Za-z0-9]/.test(v))s++;if(v.length>=12)s++;$('#axm').className='meter'+(v?' s'+Math.max(1,s):'')};
  const f=$('#axf'); if(f) f.onsubmit=async e=>{ e.preventDefault(); const a=$('#n1'),b=$('#n2'); let ok=fieldErr(a,a.value.length<8?'Mínimo 8 caracteres':''); ok=fieldErr(b,b.value!==a.value?'Las contraseñas no coinciden':'')&&ok; if(!ok) return;
    e.submitter.classList.add('is-loading');
    try{ await fbAuth.confirmPasswordReset(AX.code,a.value);
      AX.view=accionShell('check','success','Contraseña actualizada',`Ya podés entrar con tu contraseña nueva${AX.email?` y el email <b style="color:var(--ink)">${esc(AX.email)}</b>`:''}.`,`<a class="btn btn-primary btn-block" href="#/login">Iniciar sesión</a>`); render(); }
    catch(err){ e.submitter.classList.remove('is-loading'); $('#axerr').innerHTML=`<div class="alert alert-err" style="margin-bottom:16px">${ic('alert')}<div>${err.code==='auth/weak-password'?'Esa contraseña es muy débil: usá al menos 8 caracteres.':'El enlace venció o ya se usó. Pedí uno nuevo.'}</div></div>`; } };
  const r=$('#axrec'); if(r) r.onclick=async()=>{ try{ await sendReset(AX.email); toast('Te mandamos el enlace'); }catch(e){ toast(cuentaErr(e)); } };
}

/* ---------- Sesión ---------- */
if(fbAuth){
  fbAuth.onAuthStateChanged(async u=>{
    C.user=u; C.ready=true;
    if(!u){ dropCloudCompanies(); render(); return; }
    S.user.email=u.email||''; S.user.name=u.displayName||S.user.name||(u.email||'').split('@')[0];
    const pwd=u.providerData.some(p=>p.providerId==='password');
    C.needVerify=pwd&&!u.emailVerified;
    if(C.needVerify){ render(); return; }
    await loadCloud();
  });
}
async function cloudSignOut(){ try{ await flushCloud(); }catch(e){} C.unsub.forEach(f=>{try{f()}catch(e){}}); C.unsub=[]; await fbAuth.signOut(); location.hash='#/login'; }
function dropCloudCompanies(){ const keep=[...S.companies.filter(c=>!c.cloud),...C.local]; C.local=[]; S.companies=keep; if(S.company&&S.company.cloud) S.company=keep[0]||null; C.tenants=[]; C.last={}; }

/* ---------- Carga de empresas y datos ---------- */
async function acceptInvites(u){
  const em=lowerEmail(u.email); if(!em||!u.emailVerified) return 0;
  const inv=await fbDb.collection('invites').where('email','==',em).get(); let n=0;
  await Promise.all(inv.docs.map(async d=>{ const i=d.data();
    try{ await fbDb.doc(`tenants/${i.tenantId}/members/${u.uid}`).set({uid:u.uid,email:em,name:u.displayName||'',role:i.role,status:'Activo',joinedAt:TS(),invitedBy:i.invitedByName||''});
      await d.ref.delete(); n++; }catch(e){ console.warn('[nube] invitación',d.id,e.code); } }));
  return n;
}
async function loadCloud(){
  const u=C.user; if(!u) return;
  C.loading=true; C.error=''; render();
  try{
    // Todo lo que no depende entre sí sale junto (antes eran ~8 consultas en fila: 5 a 8 segundos)
    const memQ=()=>fbDb.collectionGroup('members').where('uid','==',u.uid).get();
    let [accepted,plat,mems]=await Promise.all([acceptInvites(u),fbDb.doc('config/platform').get().catch(()=>null),memQ()]);
    if(accepted) mems=await memQ(); // solo si se aceptó una invitación nueva hace falta volver a buscar
    C.admin=!!(plat&&plat.exists&&(plat.data().admins||[]).map(lowerEmail).includes(lowerEmail(u.email)));
    // Por cada empresa, su ficha, sus datos y su equipo salen juntos
    const loaded=(await Promise.all(mems.docs.map(async m=>{ const tid=m.ref.parent.parent.id, role=m.data().role;
      const [t,c]=await Promise.all([fbDb.doc(`tenants/${tid}`).get(),loadTenant({tid,role,data:{}})]);
      if(!t.exists){ STORE.delete(c); return null; }
      const d=t.data(); Object.assign(c,{name:d.name||tid,country:d.country||'Argentina',industry:d.industry||'',size:d.size||''});
      return {t:{tid,role,data:d},c}; }))).filter(Boolean);
    loaded.sort((a,b)=>(a.c.name||'').localeCompare(b.c.name||''));
    const tenants=loaded.map(x=>x.t), companies=loaded.map(x=>x.c);
    const local=[...S.companies.filter(c=>!c.cloud),...C.local.filter(c=>!S.companies.includes(c))];
    // Con empresas en la nube, las del navegador (y la de ejemplo) no se muestran: quedan guardadas solo para «Subir datos…»
    if(companies.length){ C.local=local; S.companies=companies; } else { C.local=[]; S.companies=local; }
    let cur=null; try{ cur=localStorage.getItem('bz-cur'); }catch(e){}
    S.company=companies.find(c=>c.tid===cur)||companies[0]||S.companies[0]||null;
    if(S.company) S.brand=S.brands.length?Math.min(Math.max(S.brand,-1),S.brands.length-1):-1;
    C.tenants=tenants; C.loading=false;
    render();
    if(accepted) toast(`Aceptaste ${accepted} invitación${accepted>1?'es':''}`);
  }catch(e){ console.error('[nube] carga',e); C.loading=false; C.error=e.code==='permission-denied'?'No tenés permiso para ver estos datos.':'No hay conexión con la nube. Revisá internet.'; render(); }
}
async function loadTenant(t){
  const c={name:t.data.name||t.tid,country:t.data.country||'Argentina',industry:t.data.industry||'',size:t.data.size||'',cloud:true,tid:t.tid,myRole:t.role};
  const st={workspaces:[{name:'General'}],brands:[],members:[],integrations:{},activity:[],m:emptyModules(),demo:false,plan:'Prueba gratis',audit:[]};
  const [parts,members]=await Promise.all([fbDb.collection(`tenants/${t.tid}/state`).get(),loadMembers(t.tid,['Dueño','Admin'].includes(t.role))]);
  parts.forEach(d=>{ let v; try{ v=JSON.parse(d.data().json); }catch(e){ return; }
    C.last[`${t.tid}/${d.id}`]=d.data().json;
    if(d.id==='base') Object.assign(st,v); else if(d.id==='x') st.x=v; else if(d.id.startsWith('m_')) st.m[d.id.slice(2)]=v; });
  st.members=members;
  STORE.set(c,st);
  if(typeof edMigrate==='function') edMigrate(st.m);
  return c;
}
async function loadMembers(tid,isAdmin){
  const out=[]; const [ms,inv]=await Promise.all([fbDb.collection(`tenants/${tid}/members`).get(),isAdmin?fbDb.collection('invites').where('tenantId','==',tid).get():null]);
  ms.forEach(d=>{ const m=d.data(); out.push({uid:d.id,name:m.name||'',email:m.email||'',role:m.role,status:'Activo'}); });
  if(inv) inv.forEach(d=>{ const i=d.data(); out.push({inviteId:d.id,name:'',email:i.email,role:i.role,status:'Pendiente'}); });
  return out.sort((a,b)=>(a.status>b.status?1:-1)||(a.name||a.email).localeCompare(b.name||b.email));
}

/* ---------- Guardado en la nube (solo las partes que cambiaron) ---------- */
const PART_SKIP=new Set(['contentsBackupV1']);
function tenantParts(st){
  const parts={ base:{workspaces:st.workspaces,brands:st.brands,integrations:st.integrations,activity:(st.activity||[]).slice(0,200),plan:st.plan,demo:!!st.demo,audit:(st.audit||[]).slice(0,200)} };
  Object.keys(st.m||{}).forEach(k=>{ if(!PART_SKIP.has(k)) parts['m_'+k]=st.m[k]; });
  if(st.x) parts.x=st.x;
  return parts;
}
window.cloudSave=function(){ if(!C.user||C.loading||!fbDb) return; clearTimeout(C.timer); C.timer=setTimeout(()=>flushCloud().catch(e=>console.warn('[nube] guardado',e)),700); };
async function flushCloud(){
  if(!C.user||!fbDb) return; clearTimeout(C.timer);
  const batch=fbDb.batch(); let n=0, big=[];
  for(const c of S.companies.filter(x=>x.cloud)){ const st=STORE.get(c); if(!st) continue;
    for(const [id,val] of Object.entries(tenantParts(st))){ const json=JSON.stringify(val), key=`${c.tid}/${id}`;
      if(C.last[key]===json) continue;
      if(json.length>900000){ big.push(id); continue; }
      batch.set(fbDb.doc(`tenants/${c.tid}/state/${id}`),{json,updatedAt:TS(),by:C.user.uid}); C.last[key]=json; n++;
      if(n>=400) break; }
    try{ if(S.company===c) localStorage.setItem('bz-cur',c.tid); }catch(e){}
  }
  if(big.length&&!flushCloud.warned){ flushCloud.warned=true; toast('Hay datos muy grandes que no se pudieron guardar en la nube: '+big.join(', ')); }
  if(!n) return;
  try{ await batch.commit(); C.saveErr=false; }
  catch(e){ C.saveErr=true; C.last={}; toast(e.code==='permission-denied'?'No tenés permiso para guardar en esta empresa.':'No se pudo guardar en la nube. Reintentamos al próximo cambio.'); }
}
window.addEventListener('pagehide',()=>{ try{ flushCloud(); }catch(e){} });

/* ---------- Pantallas de ingreso conectadas ---------- */
if(CLOUD.on&&fbAuth){
  const googleIn=async e=>{ const b=e&&e.currentTarget; if(b) b.classList.add('is-loading');
    try{ const p=new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({prompt:'select_account'}); await fbAuth.signInWithPopup(p); }
    catch(err){ if(b) b.classList.remove('is-loading'); toast(authErr(err)); } };
  vLogin=(_v=>function(){ return _v().replace('¿No tenés cuenta? <a href="#/registro">Creala gratis</a>','¿Te invitaron a Brandazo? <a href="#/registro">Creá tu contraseña</a>'); })(vLogin);
  bLogin=function(){
    bindEyes();
    $('[data-google]').onclick=googleIn;
    $('#f').onsubmit=async e=>{ e.preventDefault();
      const em=$('#em'),pw=$('#pw'); let ok=fieldErr(em,!em.value?'Ingresá tu email':!emailOk(em.value)?'Revisá el formato del email':'');
      ok=fieldErr(pw,!pw.value?'Ingresá tu contraseña':'')&&ok; if(!ok) return;
      const b=e.submitter; b.classList.add('is-loading'); $('#formerr').innerHTML='';
      try{ await fbAuth.signInWithEmailAndPassword(em.value.trim(),pw.value); }
      catch(err){ b.classList.remove('is-loading'); $('#formerr').innerHTML=`<div class="alert alert-err" style="margin-bottom:16px">${ic('alert')}<div>${esc(authErr(err))}</div></div>`; } };
  };
  vRegistro=(_v=>function(){ return _v().replace('<h1>Creá tu cuenta</h1>','<h1>Creá tu cuenta</h1><div class="alert alert-info" style="margin:12px 0 4px">'+ic('info')+'<div>Brandazo es por invitación: usá el mismo email con el que te invitaron.</div></div>'); })(vRegistro);
  bRegistro=function(){
    bindEyes();
    $('[data-google]').onclick=googleIn;
    $('#pw2').oninput=e=>{const v=e.target.value;let s=0;if(v.length>=8)s++;if(/\d/.test(v))s++;if(/[^A-Za-z0-9]/.test(v))s++;if(v.length>=12)s++;$('#meter').className='meter'+(v?' s'+Math.max(1,s):'')};
    $('#f').onsubmit=async e=>{ e.preventDefault();
      const em=$('#em'),pw=$('#pw2'),t=$('#tos');
      let ok=fieldErr(em,!em.value?'Ingresá tu email':!emailOk(em.value)?'Revisá el formato del email':'');
      ok=fieldErr(pw,pw.value.length<8?'La contraseña necesita al menos 8 caracteres':'')&&ok;
      ok=fieldErr(t,!t.checked?'Para continuar, aceptá los términos':'')&&ok; if(!ok) return;
      const b=e.submitter; b.classList.add('is-loading');
      try{ const r=await fbAuth.createUserWithEmailAndPassword(em.value.trim(),pw.value); await sendVerify(r.user).catch(e=>console.warn('[cuenta]',e.message)); }
      catch(err){ b.classList.remove('is-loading'); fieldErr(em,authErr(err)); } };
  };
  vVerificar=function(){
    return authShell(`<div style="width:48px;height:48px;border-radius:12px;background:var(--magenta-soft);color:var(--magenta-text);display:grid;place-items:center;margin-bottom:16px">${ic('mail')}</div>
    <h1>Verificá tu email</h1><p class="muted" style="margin:6px 0 24px">Te mandamos un enlace a <b style="color:var(--ink)">${esc((C.user&&C.user.email)||'tu email')}</b>. Abrilo para confirmar que es tuyo y después tocá «Ya lo verifiqué». Si no lo ves, revisá la carpeta de spam.</p>
    <button class="btn btn-primary btn-block" id="vok">Ya lo verifiqué</button>
    <p class="small muted" style="margin-top:16px;text-align:center"><button class="btn btn-ghost btn-sm" id="vre">Reenviar el enlace</button> · <button class="btn btn-ghost btn-sm" id="vout">Usar otra cuenta</button></p>`);
  };
  bVerificar=function(){
    $('#vok').onclick=async e=>{ const b=e.currentTarget; b.classList.add('is-loading'); try{ await C.user.reload(); await C.user.getIdToken(true); }catch(_){}
      if(fbAuth.currentUser&&fbAuth.currentUser.emailVerified){ C.needVerify=false; C.user=fbAuth.currentUser; await loadCloud(); }
      else{ b.classList.remove('is-loading'); toast('Todavía figura sin verificar. Abrí el enlace del mail y volvé a tocar.'); } };
    $('#vre').onclick=async()=>{ try{ await sendVerify(C.user); toast('Te mandamos el enlace de nuevo'); }catch(e){ toast(cuentaErr(e)); } };
    $('#vout').onclick=()=>cloudSignOut();
  };
  bRecuperar=function(){ $('#f').onsubmit=async e=>{ e.preventDefault(); const em=$('#em'); if(!fieldErr(em,!emailOk(em.value)?'Ingresá un email válido':'')) return;
    S.user.email=em.value.trim(); e.submitter.classList.add('is-loading');
    try{ await sendReset(em.value.trim()); }catch(err){ e.submitter.classList.remove('is-loading'); return fieldErr(em,cuentaErr(err)); }
    go('#/recuperar-enviado'); }; };
  vRecEnviado=(_v=>function(){ return _v().replace(/<a class="btn btn-primary btn-block" href="#\/nueva-clave">[^<]*<\/a>/,'').replace('Vence en 1 hora.','Abrilo desde el mismo dispositivo. Si no lo ves, revisá la carpeta de spam.'); })(vRecEnviado);
  // Menú de usuario: cerrar sesión real, cambiar contraseña real, subir datos del navegador
  const _userMenu=userMenu;
  userMenu=function(anchor){
    _userMenu(anchor);
    const m=$('#layer .menu'); if(!m) return;
    m.querySelector('[data-a=salir]').onclick=()=>{ closeLayer(); cloudSignOut(); };
    m.querySelector('[data-a=clave]').onclick=async()=>{ closeLayer(); if(!C.user||!C.user.email) return; try{ await sendReset(C.user.email); toast('Te mandamos un enlace para cambiar la contraseña'); }catch(e){ toast(cuentaErr(e)); } };
    const local=importable();
    if(local.length&&C.tenants.some(t=>['Dueño','Admin'].includes(t.role))){
      m.querySelector('[data-a=reset]').insertAdjacentHTML('beforebegin',`<button class="menu-item" data-a="subir">${ic('upload')}<span class="grow">Subir datos de este navegador a la nube</span></button>`);
      m.querySelector('[data-a=subir]').onclick=()=>{ closeLayer(); importDialog(); };
    }
  };
}

/* ---------- Subir datos del navegador a una empresa en la nube ---------- */
const hasData=c=>{ const st=STORE.get(c); if(!st) return false; const m=st.m||{}; return ['objectives','personas','funnels','contents','editorialPlans','campaigns'].some(k=>(m[k]||[]).length)||(st.brands||[]).length>0; };
function importable(){ return [...C.local,...S.companies.filter(c=>!c.cloud&&!C.local.includes(c))].filter(c=>hasData(c)); }
window.cloudHidden=()=>C.local;
function importDialog(){
  const local=importable(), targets=S.companies.filter(c=>c.cloud&&['Dueño','Admin'].includes(c.myRole));
  const isDemo=c=>!!(STORE.get(c)||{}).demo, guess=l=>isDemo(l)?'':(targets.find(t=>t.name.toLowerCase()===l.name.toLowerCase())||{}).tid||'';
  const count=c=>{ const m=(STORE.get(c)||{}).m||{}; return ['objectives','personas','funnels','contents','editorialPlans','campaigns'].map(k=>`${(m[k]||[]).length} ${({objectives:'objetivos',personas:'buyer personas',funnels:'funnels',contents:'contenidos',editorialPlans:'planificaciones',campaigns:'campañas'})[k]}`).join(' · '); };
  modal('Subir datos de este navegador',`<p class="small muted" style="margin-bottom:12px">Estas empresas están guardadas solo en este navegador. Elegí a qué empresa de la nube va cada una. Se copian marcas, estrategia, buyer personas, funnels, contenidos, planificaciones y campañas. La empresa de ejemplo queda en «No subir»: subila solo si trabajaste tus datos ahí.</p>
   ${local.map((c,i)=>`<div class="field"><label for="imp${i}"><b>${esc(c.name)}</b>${isDemo(c)?' <span class="badge badge-warn">Empresa de ejemplo</span>':''} <span class="small muted">· ${count(c)}</span></label><select class="select" id="imp${i}"><option value="">No subir</option>${targets.map(t=>`<option value="${t.tid}" ${guess(c)===t.tid?'selected':''}>${esc(t.name)}</option>`).join('')}</select></div>`).join('')}
   <div class="alert alert-warn">${ic('alert')}<div>Los datos de la empresa de destino <b>se reemplazan</b> por los de este navegador (no se toca su equipo ni las cotizaciones recibidas). Antes se guarda una copia de seguridad en este navegador.</div></div>`,
   `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="impok">Subir</button>`);
  $('#impok').onclick=async e=>{
    const plan=local.map((c,i)=>[c,$('#imp'+i).value]).filter(([,t])=>t); if(!plan.length) return toast('Elegí al menos una empresa de destino');
    const used=plan.map(p=>p[1]); if(new Set(used).size!==used.length) return toast('Dos empresas del navegador no pueden ir a la misma empresa de la nube');
    e.currentTarget.classList.add('is-loading');
    try{ localStorage.setItem('bz-data-respaldo-'+new Date().toISOString().slice(0,19),localStorage.getItem(SAVE_KEY)||''); }catch(_){}
    for(const [lc,tid] of plan){ const target=S.companies.find(x=>x.tid===tid), src=STORE.get(lc), dst=STORE.get(target);
      const copy=JSON.parse(JSON.stringify(src)); copy.members=dst.members; copy.demo=false; copy.integrations={}; /* en el prototipo las conexiones eran simuladas */ STORE.set(target,copy);
      S.companies=S.companies.filter(x=>x!==lc); C.local=C.local.filter(x=>x!==lc); if(S.company===lc) S.company=target; }
    await flushCloud(); persist(); closeLayer(); render(); toast(`Listo: ${plan.length} empresa${plan.length>1?'s':''} en la nube. Quedó una copia de seguridad en este navegador.`);
  };
}

/* ---------- Equipo: invitaciones y roles reales ---------- */
if(CLOUD.on){
  const _inviteModal=inviteModal;
  inviteModal=function(){
    if(!S.company||!S.company.cloud) return _inviteModal();
    if(!['Dueño','Admin'].includes(S.company.myRole)) return toast('Solo el Dueño o un Admin pueden invitar');
    _inviteModal();
    $('#layer .modal-body p').innerHTML='Cuando la persona entre a <b>www.brandazo.com.ar</b> con ese email (con Google o creando su contraseña y verificando el email), queda adentro con el rol que elijas. Brandazo no manda el email: avisale vos.';
    $('#ok').onclick=async e=>{ const list=[]; let bad=false;
      $$('#layer .invite-row').forEach(r=>{const i=r.querySelector('input');const v=lowerEmail(i.value);i.style.borderColor='';if(!v)return;if(!emailOk(v)||S.members.some(m=>lowerEmail(m.email)===v)){bad=true;i.style.borderColor='var(--danger)'}else list.push({email:v,role:r.querySelector('select').value})});
      if(bad) return toast('Revisá los emails marcados: formato inválido o ya están en el equipo'); if(!list.length) return toast('Escribí al menos un email');
      e.currentTarget.classList.add('is-loading'); const c=S.company;
      try{ const b=fbDb.batch(); list.forEach(x=>b.set(fbDb.doc(`invites/${x.email}__${c.tid}`),{email:x.email,tenantId:c.tid,tenantName:c.name,role:x.role,invitedBy:C.user.uid,invitedByName:S.user.name||C.user.email,createdAt:TS()})); await b.commit();
        STORE.get(c).members=await loadMembers(c.tid,true); list.forEach(x=>logAct(`Invitaste a ${x.email} como ${x.role}`)); closeLayer(); render(); toast(list.length>1?`${list.length} invitaciones creadas`:`Invitación creada para ${list[0].email}`); }
      catch(err){ e.currentTarget.classList.remove('is-loading'); toast(err.code==='permission-denied'?'No tenés permiso para invitar en esta empresa.':'No se pudo crear la invitación.'); } };
  };
  const _bConfig=bConfig;
  bConfig=function(tab){
    _bConfig(tab);
    if(tab!=='usuarios'||!S.company||!S.company.cloud) return;
    const c=S.company, admin=['Dueño','Admin'].includes(c.myRole);
    $$('[data-role]').forEach(s=>{ const m=S.members[+s.dataset.role]; if(!admin){ s.disabled=true; return; }
      s.onchange=async()=>{ try{ if(m.inviteId) await fbDb.doc(`invites/${m.inviteId}`).update({role:s.value}); else await fbDb.doc(`tenants/${c.tid}/members/${m.uid}`).update({role:s.value});
        m.role=s.value; toast(`${m.email} ahora es ${m.role}`); }catch(e){ s.value=m.role; toast('No se pudo cambiar el rol'); } }; });
    $$('[data-mm]').forEach(b=>{ const m=S.members[+b.dataset.mm]; if(!admin){ b.remove(); return; }
      b.onclick=()=>{ modal(m.inviteId?'¿Cancelar la invitación?':'¿Quitar del equipo?',`<p>${m.inviteId?`La invitación para <b>${esc(m.email)}</b> deja de valer.`:`<b>${esc(m.name||m.email)}</b> deja de tener acceso a ${esc(c.name)}.`}</p>`,`<button class="btn" data-close>Volver</button><button class="btn btn-danger" id="mok">${m.inviteId?'Cancelar invitación':'Quitar'}</button>`);
        $('#mok').onclick=async()=>{ try{ if(m.inviteId) await fbDb.doc(`invites/${m.inviteId}`).delete(); else await fbDb.doc(`tenants/${c.tid}/members/${m.uid}`).delete(); STORE.get(c).members=await loadMembers(c.tid,true); closeLayer(); render(); toast('Listo'); }catch(e){ toast('No se pudo completar'); } }; }; });
  };
  // Nueva empresa: en la nube solo para administradores de la plataforma; si no, queda en este navegador
  const _companyModal=companyModal;
  companyModal=function(){
    if(!C.user||!C.admin) return _companyModal();
    _companyModal();
    $('#layer .modal-body p').textContent='La empresa se crea en la nube y quedás como Dueño. Sus datos quedan aislados de las demás empresas.';
    $('#ok').onclick=async e=>{ const i=$('#nc'); if(!fieldErr(i,!i.value.trim()?'Ingresá un nombre':''))return; e.currentTarget.classList.add('is-loading');
      const name=i.value.trim(), tid=name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)+'-'+Math.random().toString(36).slice(2,6);
      try{ await fbDb.doc(`tenants/${tid}`).set({name,country:'Argentina',industry:'',size:'2 a 10',ownerUid:C.user.uid,createdAt:TS()});
        await fbDb.doc(`tenants/${tid}/members/${C.user.uid}`).set({uid:C.user.uid,email:lowerEmail(C.user.email),name:S.user.name||'',role:'Dueño',status:'Activo',joinedAt:TS()});
        closeLayer(); await loadCloud(); const c=S.companies.find(x=>x.tid===tid); if(c){ switchCompany(c); render(); } toast(`Empresa ${name} creada en la nube`); }
      catch(err){ e.currentTarget.classList.remove('is-loading'); toast(err.code==='permission-denied'?'No tenés permiso para crear empresas.':'No se pudo crear la empresa.'); } };
  };
}

/* ---------- Indicador en el menú lateral: dónde se guardan los datos ---------- */
const _shellNube=shell;
shell=function(active,title,inner){
  const h=_shellNube(active,title,inner);
  if(!S.company) return h;
  const tag=S.company.cloud?`<span class="badge badge-ok" title="Se guarda en la nube y lo ve tu equipo">${ic('check')} En la nube</span>`:`<span class="badge" title="Solo en este navegador">Solo en este navegador</span>`;
  return CLOUD.on?h.replace('<button class="search" id="cmdk">',tag.replace('class="badge','class="desk badge')+'<button class="search" id="cmdk">'):h;
};

/* En empresas de la nube no se ofrece cargar datos de ejemplo: se mezclarían con los reales y los vería el equipo */
if(CLOUD.on){ const _demoBtn=demoBtn; demoBtn=function(){ return S.company&&S.company.cloud?'':_demoBtn(); }; }

/* ---------- Conexiones con redes y servicios: todavía no hay ninguna real ----------
   En el prototipo se simulaban (cuentas y seguidores inventados). En la versión real no se simula:
   se avisa con claridad y no se guarda nada. La única integración real hoy es el cotizador de Cafelito. */
if(CLOUD.on){
  const notYet=n=>{ modal(`${esc(n||'Redes sociales')}: todavía no disponible`,`<p>La conexión real con <b>${esc(n||'Instagram, Facebook, TikTok y LinkedIn')}</b> todavía no está hecha en Brandazo. Para no mostrarte cuentas ni números inventados, por ahora no se puede conectar.</p>
    <div class="alert alert-info" style="margin-top:12px">${ic('info')}<div>Conectar Instagram y Facebook de verdad requiere una app aprobada por Meta. Está en los próximos pasos de Brandazo.</div></div>
    <p class="small muted" style="margin-top:12px">Lo que sí funciona hoy: las cotizaciones del sitio de Cafelito llegan solas al CRM.</p>`,`<button class="btn btn-primary" data-close>Entendido</button>`); };
  const realOnly=()=>{ $$('#conn,[data-conn],[data-reconn],[data-sync],[data-iconn]').forEach(b=>{ b.onclick=e=>{ e.preventDefault(); const i=b.dataset.iconn; notYet(i!=null?INTS[+i][0]:''); }; }); };
  ['redes','integraciones'].forEach(k=>{ const v=VIEWS[k]; if(!v) return; const _b=v.bind; v.bind=function(...a){ _b.apply(this,a); if(S.company&&S.company.cloud) realOnly(); }; });
  const _bcNube=bConfig;
  bConfig=function(tab){ _bcNube(tab); if(!S.company||!S.company.cloud) return;
    $$('[data-int]').forEach(b=>{ const i=+b.dataset.int; if(!S.integrations[i]) b.onclick=()=>notYet(INTS[i][0]); }); };
}

render();
