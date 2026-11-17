/* ===================== Iconos ===================== */
const P={
home:'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
target:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
calendar:'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
megaphone:'M3 10v4h3l8 4V6L6 10H3zM18 9a4 4 0 0 1 0 6',
users:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
zap:'M13 2 4 14h7l-1 8 9-12h-7z',
message:'M4 5h16v11H9l-5 4z',
chart:'M4 20V10M10 20V4M16 20v-8M21 20H3',
plug:'M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4',
settings:'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
bell:'M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
search:'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
check:'M5 12l5 5 9-10',
plus:'M12 5v14M5 12h14',
chev:'M6 9l6 6 6-6',
chevr:'M9 6l6 6-6 6',
x:'M6 6l12 12M18 6 6 18',
menu:'M4 7h16M4 12h16M4 17h16',
panel:'M4 4h16v16H4zM9 4v16',
mail:'M3 5h18v14H3zM3 6l9 7 9-7',
lock:'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
more:'M5 12h.01M12 12h.01M19 12h.01',
alert:'M12 3 2 20h20zM12 10v4M12 17h.01',
info:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 11v6M12 7h.01',
spark:'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
logout:'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
building:'M4 21V5l8-3 8 3v16M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4',
layers:'M12 3 2 8l10 5 10-5zM2 16l10 5 10-5M2 12l10 5 10-5',
tag:'M3 3h8l10 10-8 8L3 11zM7.5 7.5h.01',
shield:'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
sliders:'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
upload:'M12 16V4M7 9l5-5 5 5M4 20h16',
trash:'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
refresh:'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
clock:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
arrow:'M5 12h14M13 6l6 6-6 6',
moon:'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z',
key:'M15 7a4 4 0 1 1-3.5 6L5 19.5V21H3v-3l6.5-6.5A4 4 0 0 1 15 7zM16 8h.01',
grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'
};
const ic=(n,c='')=>`<svg class="ico ${c}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n]}"/></svg>`;
const LOGO_COLOR=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 347 76" width="347" height="76"><g transform="translate(6,6)"><path transform="translate(0.00,55.96) scale(0.03587,-0.03587)" d="M777 1560H480L0 -224H297Z" fill="#FF2D87"/><path transform="translate(25.30,55.96) scale(0.03587,-0.03587)" d="M742 -23C1019 -23 1198 196 1198 530C1198 853 1012 1079 745 1079C608 1079 509 1026 442 914H440V1490H96V0H436V163H438C492 40 603 -23 742 -23ZM645 252C515 252 426 361 426 530C426 697 515 805 645 805C772 805 850 702 850 530C850 356 772 252 645 252Z" fill="#0E0E10"/><path transform="translate(67.61,55.96) scale(0.03587,-0.03587)" d="M96 0H440V541C440 691 525 777 648 777C698 777 759 775 784 774V1058C756 1059 727 1060 690 1060C549 1060 470 1004 432 870H429V1056H96Z" fill="#0E0E10"/><path transform="translate(93.95,55.96) scale(0.03587,-0.03587)" d="M419 -18C568 -18 663 34 726 148H730V0H1066V711C1066 944 897 1079 590 1079C284 1079 111 943 96 714H416C423 786 482 832 578 832C669 832 725 789 725 726V721C725 658 656 643 467 627C242 609 57 532 57 295C57 85 208 -18 419 -18ZM524 207C440 207 383 246 383 311C383 380 449 418 541 432C626 446 691 459 728 476V380C728 276 639 207 524 207Z" fill="#0E0E10"/><path transform="translate(133.07,55.96) scale(0.03587,-0.03587)" d="M440 574C440 718 510 785 619 785C728 785 791 717 791 592V0H1135V664C1135 924 1001 1079 772 1079C613 1079 506 1006 436 885V1056H96V0H440Z" fill="#0E0E10"/><path transform="translate(174.66,55.96) scale(0.03587,-0.03587)" d="M509 -23C648 -23 758 40 813 163H814V0H1155V1490H810V914H809C742 1026 643 1079 506 1079C238 1079 52 853 52 530C52 196 232 -23 509 -23ZM605 252C479 252 401 356 401 530C401 702 479 805 605 805C735 805 824 697 824 530C824 361 735 252 605 252Z" fill="#0E0E10"/><path transform="translate(216.97,55.96) scale(0.03587,-0.03587)" d="M419 -18C568 -18 663 34 726 148H730V0H1066V711C1066 944 897 1079 590 1079C284 1079 111 943 96 714H416C423 786 482 832 578 832C669 832 725 789 725 726V721C725 658 656 643 467 627C242 609 57 532 57 295C57 85 208 -18 419 -18ZM524 207C440 207 383 246 383 311C383 380 449 418 541 432C626 446 691 459 728 476V380C728 276 639 207 524 207Z" fill="#0E0E10"/><path transform="translate(256.08,55.96) scale(0.03587,-0.03587)" d="M97 0H1011V266H512V268L1002 817V1056H97V788H598V786L97 226Z" fill="#0E0E10"/><path transform="translate(293.26,55.96) scale(0.03587,-0.03587)" d="M608 -24C939 -24 1163 193 1163 528C1163 861 939 1080 608 1080C277 1080 52 861 52 528C52 193 277 -24 608 -24ZM608 250C487 250 401 349 401 528C401 706 488 806 608 806C728 806 815 706 815 528C815 349 728 250 608 250Z" fill="#0E0E10"/></g></svg>`, LOGO_WHITE=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 347 76" width="347" height="76"><g transform="translate(6,6)"><path transform="translate(0.00,55.96) scale(0.03587,-0.03587)" d="M777 1560H480L0 -224H297Z" fill="#FF2D87"/><path transform="translate(25.30,55.96) scale(0.03587,-0.03587)" d="M742 -23C1019 -23 1198 196 1198 530C1198 853 1012 1079 745 1079C608 1079 509 1026 442 914H440V1490H96V0H436V163H438C492 40 603 -23 742 -23ZM645 252C515 252 426 361 426 530C426 697 515 805 645 805C772 805 850 702 850 530C850 356 772 252 645 252Z" fill="#FFFFFF"/><path transform="translate(67.61,55.96) scale(0.03587,-0.03587)" d="M96 0H440V541C440 691 525 777 648 777C698 777 759 775 784 774V1058C756 1059 727 1060 690 1060C549 1060 470 1004 432 870H429V1056H96Z" fill="#FFFFFF"/><path transform="translate(93.95,55.96) scale(0.03587,-0.03587)" d="M419 -18C568 -18 663 34 726 148H730V0H1066V711C1066 944 897 1079 590 1079C284 1079 111 943 96 714H416C423 786 482 832 578 832C669 832 725 789 725 726V721C725 658 656 643 467 627C242 609 57 532 57 295C57 85 208 -18 419 -18ZM524 207C440 207 383 246 383 311C383 380 449 418 541 432C626 446 691 459 728 476V380C728 276 639 207 524 207Z" fill="#FFFFFF"/><path transform="translate(133.07,55.96) scale(0.03587,-0.03587)" d="M440 574C440 718 510 785 619 785C728 785 791 717 791 592V0H1135V664C1135 924 1001 1079 772 1079C613 1079 506 1006 436 885V1056H96V0H440Z" fill="#FFFFFF"/><path transform="translate(174.66,55.96) scale(0.03587,-0.03587)" d="M509 -23C648 -23 758 40 813 163H814V0H1155V1490H810V914H809C742 1026 643 1079 506 1079C238 1079 52 853 52 530C52 196 232 -23 509 -23ZM605 252C479 252 401 356 401 530C401 702 479 805 605 805C735 805 824 697 824 530C824 361 735 252 605 252Z" fill="#FFFFFF"/><path transform="translate(216.97,55.96) scale(0.03587,-0.03587)" d="M419 -18C568 -18 663 34 726 148H730V0H1066V711C1066 944 897 1079 590 1079C284 1079 111 943 96 714H416C423 786 482 832 578 832C669 832 725 789 725 726V721C725 658 656 643 467 627C242 609 57 532 57 295C57 85 208 -18 419 -18ZM524 207C440 207 383 246 383 311C383 380 449 418 541 432C626 446 691 459 728 476V380C728 276 639 207 524 207Z" fill="#FFFFFF"/><path transform="translate(256.08,55.96) scale(0.03587,-0.03587)" d="M97 0H1011V266H512V268L1002 817V1056H97V788H598V786L97 226Z" fill="#FFFFFF"/><path transform="translate(293.26,55.96) scale(0.03587,-0.03587)" d="M608 -24C939 -24 1163 193 1163 528C1163 861 939 1080 608 1080C277 1080 52 861 52 528C52 193 277 -24 608 -24ZM608 250C487 250 401 349 401 528C401 706 488 806 608 806C728 806 815 706 815 528C815 349 728 250 608 250Z" fill="#FFFFFF"/></g></svg>`;

/* ===================== Estado ===================== */
const COLORS=['#FF2D87','#0E0E10','#1E9BD7','#7C4DFF','#0E7A4F','#E8590C','#D4A20B'];
const ROLES=['Dueño','Admin','Marketing','Ventas','Atención'];
const S={
  user:{name:'',email:'',role:'',type:''},
  company:null, companies:[],
  ws:0, brand:-1, theme:'dark', collapsed:false,
  notifs:[], waitlist:{},
  onboard:{step:1,done:false,skipped:{}}
};
/* Aislamiento: cada empresa tiene su propio almacén de datos. Nada se comparte entre empresas. */
const STORE=new Map(), TMPCO={name:''};
function D(){ const c=S.company||TMPCO; if(!STORE.has(c)) STORE.set(c,{workspaces:[{name:'General'}],brands:[],members:S.user.email?[{name:S.user.name,email:S.user.email,role:'Dueño',status:'Activo'}]:[],integrations:{},activity:[],m:emptyModules(),demo:false,plan:'Prueba gratis',audit:[]}); return STORE.get(c); }
['workspaces','brands','members','integrations','activity'].forEach(k=>Object.defineProperty(S,k,{get(){return D()[k]},set(v){D()[k]=v},enumerable:true}));
function emptyModules(){ return {objectives:[],kpis:[],personas:[],positioning:{statement:'',value:'',pillars:[],diff:''},plan:[],budget:{total:0,items:[]},contents:[],campaigns:[],accounts:[],kits:{}}; }
function switchCompany(c){ S.company=c; S.ws=0; S.brand=S.brands.length?0:-1; }
/* ===== Guardado en este navegador (prototipo) =====
   Se guarda todo el estado (empresas y sus datos) en localStorage. Cada empresa sigue con su
   propio almacén: el aislamiento entre empresas no cambia. Lo definitivo será Firebase. */
const SAVE_KEY='bz-data', SAVE_V=1; let saveOff=false;
function persist(){
  if(saveOff) return;
  try{
    const cs=S.companies.filter(c=>!c.cloud).concat(window.cloudHidden?window.cloudHidden():[]); if(S.company&&!S.company.cloud&&!cs.includes(S.company)) cs.push(S.company);
    localStorage.setItem(SAVE_KEY,JSON.stringify({v:SAVE_V,at:new Date().toISOString(),user:S.user,ci:cs.indexOf(S.company),companies:cs,stores:cs.map(c=>STORE.get(c)||null),
      ws:S.ws,brand:S.brand,collapsed:S.collapsed,notifs:S.notifs,waitlist:S.waitlist,onboard:S.onboard}));
  }catch(e){ if(!persist.warned){ persist.warned=true; setTimeout(()=>{ try{toast('No se pudieron guardar los datos en este navegador')}catch(_){} },0); } }
  if(window.cloudSave) window.cloudSave();
}
(function restore(){
  try{
    const raw=localStorage.getItem(SAVE_KEY); if(!raw) return;
    const d=JSON.parse(raw); if(!d||d.v!==SAVE_V||!Array.isArray(d.companies)) return;
    S.companies=d.companies; d.stores.forEach((st,i)=>{ if(st) STORE.set(S.companies[i],st); });
    S.company=d.ci>=0?S.companies[d.ci]:null;
    Object.assign(S.user,d.user||{}); S.ws=d.ws||0; S.brand=typeof d.brand==='number'?d.brand:-1; S.collapsed=!!d.collapsed;
    S.notifs=d.notifs||[]; S.waitlist=d.waitlist||{}; if(d.onboard) S.onboard=d.onboard;
  }catch(e){ /* datos ilegibles: se arranca de cero sin romper la app */ }
})();
window.addEventListener('pagehide',persist);
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') persist(); });
function resetSaved(){
  modal('¿Borrar los datos de este navegador?',`<p>Se borran las empresas, marcas, objetivos, buyer personas, funnels y todo lo que cargaste en este navegador. No se puede deshacer.</p>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-danger" id="okreset">Borrar todo</button>`);
  $('#okreset').onclick=()=>{ saveOff=true; try{localStorage.removeItem(SAVE_KEY)}catch(e){} location.hash='#/login'; location.reload(); };
}
function seedIfEmpty(){
  if(S.company) return;
  S.user={name:'Melina Galli',email:'melina@estudionorte.com',role:'Fundadora',type:'agencia'};
  S.company={name:'Estudio Norte',country:'Argentina',industry:'Agencia de marketing',size:'2 a 10'};
  S.companies=[S.company,{name:'Café del Centro',country:'Argentina',industry:'Gastronomía',size:'2 a 10'}];
  S.workspaces=[{name:'General'},{name:'Clientes'}];
  S.brands=[{name:'Estudio Norte',color:'#FF2D87'},{name:'Lumen Deco',color:'#7C4DFF'}];
  S.members=[{name:'Melina Galli',email:'melina@estudionorte.com',role:'Dueño',status:'Activo'},{name:'',email:'juan@estudionorte.com',role:'Ventas',status:'Pendiente'}];
  S.brand=0; S.onboard.done=true;
  logAct('Creaste la empresa Estudio Norte'); logAct('Creaste la marca Estudio Norte'); logAct('Invitaste a juan@estudionorte.com como Ventas');
  D().plan='Agencia · prueba'; if(typeof loadDemo==='function') loadDemo();
  notify('Bienvenida a Brandazo','Completá la configuración para activar tus módulos.');
}
function logAct(t){S.activity.unshift({t,when:'Recién'})}
function notify(title,body){S.notifs.unshift({title,body,when:'Recién',unread:true})}
const initials=s=>(s||'?').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

/* ===================== Utilidades UI ===================== */
function toast(msg,undo){
  const el=document.createElement('div'); el.className='toast';
  el.innerHTML=ic('check')+`<span>${esc(msg)}</span>`+(undo?'<button type="button">Deshacer</button>':'');
  if(undo) el.querySelector('button').onclick=()=>{undo();el.remove()};
  $('#toasts').appendChild(el); setTimeout(()=>el.remove(),4000);
}
function closeLayer(){ $('#layer').innerHTML=''; document.removeEventListener('keydown',escClose); if(lastFocus) lastFocus.focus?.(); }
let lastFocus=null;
function escClose(e){ if(e.key==='Escape') closeLayer(); }
function modal(title,body,foot,opts={}){
  lastFocus=document.activeElement;
  $('#layer').innerHTML=`<div class="overlay" data-close><div class="modal ${opts.cls||''}" role="dialog" aria-modal="true" aria-labelledby="mt">
   ${title?`<div class="modal-head"><h3 id="mt">${title}</h3><button class="icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div>`:''}
   <div class="modal-body">${body}</div>${foot?`<div class="modal-foot">${foot}</div>`:''}</div></div>`;
  const ov=$('#layer .overlay'); ov.addEventListener('click',e=>{ if(!ov.isConnected) return; if(e.target===ov||e.target.closest('button[data-close]')) closeLayer(); });
  document.addEventListener('keydown',escClose);
  setTimeout(()=>($('#layer input, #layer select, #layer button.btn-primary')||$('#layer button'))?.focus(),30);
}
function drawer(html){
  lastFocus=document.activeElement;
  $('#layer').innerHTML=`<div class="overlay" data-close style="padding:0"></div><aside class="drawer" role="dialog" aria-modal="true">${html}</aside>`;
  $('#layer .overlay').onclick=closeLayer; $$('#layer [data-close]').forEach(b=>b.onclick=closeLayer);
  document.addEventListener('keydown',escClose);
}
function popMenu(anchor,html,align='left'){
  lastFocus=anchor;
  const r=anchor.getBoundingClientRect();
  $('#layer').innerHTML=`<div style="position:fixed;inset:0;z-index:49" data-close></div><div class="menu" role="menu" style="position:fixed;top:${r.bottom+6}px;${align==='left'?`left:${Math.max(8,r.left)}px`:`right:${Math.max(8,innerWidth-r.right)}px`}">${html}</div>`;
  $('#layer [data-close]').onclick=closeLayer;
  document.addEventListener('keydown',escClose);
  return $('#layer .menu');
}
function fieldErr(input,msg){ const f=input.closest('.field'); f.classList.toggle('has-error',!!msg); const e=f.querySelector('.err'); if(e) e.innerHTML=msg?ic('alert')+esc(msg):''; return !msg; }
const F=(id,label,attrs='',hint='')=>`<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" ${attrs}>${hint?`<span class="hint">${hint}</span>`:''}<span class="err" role="alert"></span></div>`;
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
function go(h){ location.hash=h; }

/* ===================== Acceso ===================== */
function authShell(inner){
  return `<div class="auth"><main class="auth-form"><div class="logo-row"><a href="#/login" aria-label="Brandazo">${LOGO_WHITE}</a><a class="small" href="#/mapa">Mapa de pantallas</a></div><div class="inner">${inner}</div><p class="small muted" style="text-align:center">© 2026 Brandazo · <a href="#/">Términos</a> · <a href="#/">Privacidad</a></p></main>
  <aside class="auth-art" aria-hidden="true"><div>${LOGO_WHITE}</div><div class="bars"><i></i><i></i><i></i></div>
  <div style="position:relative;z-index:1"><h2>Marketing y ventas, en un mismo lugar.</h2><p style="color:#A1A1AA;margin:16px 0 24px;max-width:400px">Contenidos, clientes, automatizaciones y ventas en una sola plataforma.</p>
  <div class="cmdline"><span class="slash">/</span> armá la campaña de Black Friday <span class="caret"></span></div></div></aside></div>`;
}
const pwField=(id,label,extra='')=>`<div class="field"><label for="${id}">${label}</label><div class="pw"><input class="input" id="${id}" type="password" autocomplete="${id==='pw'?'current-password':'new-password'}" ${extra}><button type="button" class="icon-btn" aria-label="Mostrar contraseña" data-eye="${id}">${ic('eye')}</button></div><span class="err" role="alert"></span></div>`;
function bindEyes(){ $$('[data-eye]').forEach(b=>b.onclick=()=>{const i=$('#'+b.dataset.eye);i.type=i.type==='password'?'text':'password';b.setAttribute('aria-label',i.type==='password'?'Mostrar contraseña':'Ocultar contraseña')}); }
const googleBtn=`<button type="button" class="btn btn-block" data-google><span style="font-weight:700;font-family:var(--font-display)">G</span> Continuar con Google</button>`;

function vLogin(){
  return authShell(`<h1>Iniciá sesión</h1><p class="muted" style="margin:6px 0 24px">¿No tenés cuenta? <a href="#/registro">Creala gratis</a></p>
  ${googleBtn}<div class="divider">o con tu email</div>
  <form id="f" novalidate>${F('em','Email','type="email" autocomplete="email" placeholder="nombre@empresa.com"')}${pwField('pw','Contraseña')}
  <div style="display:flex;justify-content:space-between;align-items:center;margin:-4px 0 20px"><label class="check"><input type="checkbox" checked> Recordarme</label><a class="small" href="#/recuperar">¿Olvidaste tu contraseña?</a></div>
  <div id="formerr"></div><button class="btn btn-primary btn-block">Iniciar sesión</button></form>`);
}
function bLogin(){
  bindEyes(); let fails=0;
  $('[data-google]').onclick=()=>{ seedIfEmpty(); go('#/app/inicio'); };
  $('#f').onsubmit=e=>{e.preventDefault();
    const em=$('#em'),pw=$('#pw'); let ok=fieldErr(em,!em.value?'Ingresá tu email':!emailOk(em.value)?'Revisá el formato del email':'');
    ok=fieldErr(pw,!pw.value?'Ingresá tu contraseña':'')&&ok; if(!ok) return;
    if(pw.value.length<8){ fails++; $('#formerr').innerHTML=`<div class="alert alert-err" style="margin-bottom:16px">${ic('alert')}<div>${fails>=5?'<b>Demasiados intentos.</b> Esperá 5 minutos o recuperá tu contraseña.':'Email o contraseña incorrectos.'}</div></div>`; return; }
    const b=e.submitter; b.classList.add('is-loading');
    setTimeout(()=>{ seedIfEmpty(); S.user.email=em.value; go('#/app/inicio'); },700);
  };
}
function vRegistro(){
  return authShell(`<h1>Creá tu cuenta</h1><p class="muted" style="margin:6px 0 24px">¿Ya tenés cuenta? <a href="#/login">Iniciá sesión</a></p>
  ${googleBtn}<div class="divider">o con tu email</div>
  <form id="f" novalidate>${F('em','Email de trabajo','type="email" autocomplete="email" placeholder="nombre@empresa.com"')}
  ${pwField('pw2','Contraseña','aria-describedby="pwh"')}<div class="meter" id="meter"><i></i><i></i><i></i><i></i></div><p class="hint small muted" id="pwh" style="margin:6px 0 16px">Mínimo 8 caracteres. Sumá números y símbolos para hacerla más segura.</p>
  <div class="field"><label class="check"><input type="checkbox" id="tos"> <span>Acepto los <a href="#/registro">términos</a> y la <a href="#/registro">política de privacidad</a></span></label><span class="err" role="alert"></span></div>
  <button class="btn btn-primary btn-block">Crear cuenta</button></form>`);
}
function bRegistro(){
  bindEyes();
  $('[data-google]').onclick=()=>{ S.user.email='melina@gmail.com'; S.user.name='Melina'; go('#/onboarding/1'); };
  $('#pw2').oninput=e=>{const v=e.target.value;let s=0;if(v.length>=8)s++;if(/\d/.test(v))s++;if(/[^A-Za-z0-9]/.test(v))s++;if(v.length>=12)s++;$('#meter').className='meter'+(v?' s'+Math.max(1,s):'')};
  $('#f').onsubmit=e=>{e.preventDefault();
    const em=$('#em'),pw=$('#pw2'),t=$('#tos');
    let ok=fieldErr(em,!em.value?'Ingresá tu email':!emailOk(em.value)?'Revisá el formato del email':em.value==='melina@estudionorte.com'?'Ya hay una cuenta con este email. ¿Querés iniciar sesión?':'');
    ok=fieldErr(pw,pw.value.length<8?'La contraseña necesita al menos 8 caracteres':'')&&ok;
    ok=fieldErr(t,!t.checked?'Para continuar, aceptá los términos':'')&&ok; if(!ok) return;
    S.user.email=em.value; const b=e.submitter; b.classList.add('is-loading'); setTimeout(()=>go('#/verificar'),600);
  };
}
function vVerificar(){
  return authShell(`<div class="eico" style="width:48px;height:48px;border-radius:12px;background:var(--magenta-soft);color:var(--magenta-text);display:grid;place-items:center;margin-bottom:16px">${ic('mail')}</div>
  <h1>Revisá tu email</h1><p class="muted" style="margin:6px 0 24px">Te mandamos un código de 6 dígitos a <b style="color:var(--ink)">${esc(S.user.email||'tu email')}</b>. También podés tocar el link del mensaje.</p>
  <form id="f" novalidate><div class="field"><label>Código de verificación</label><div class="otp">${'<input inputmode="numeric" maxlength="1" aria-label="Dígito">'.repeat(6)}</div><span class="err" role="alert"></span></div>
  <button class="btn btn-primary btn-block">Verificar email</button></form>
  <p class="small muted" style="margin-top:16px;text-align:center">¿No te llegó? <button class="btn btn-ghost btn-sm" id="resend" disabled>Reenviar en <span id="cd">60</span> s</button></p>
  <p class="small muted" style="text-align:center"><a href="#/registro">Usar otro email</a></p>
  <div class="alert alert-info" style="margin-top:16px">${ic('info')}<div>En el prototipo, cualquier código de 6 dígitos funciona.</div></div>`);
}
let cdTimer;
function bVerificar(){
  const ins=$$('.otp input'); ins[0].focus();
  ins.forEach((i,k)=>{ i.oninput=()=>{ i.value=i.value.replace(/\D/g,''); if(i.value&&ins[k+1]) ins[k+1].focus(); };
    i.onkeydown=e=>{ if(e.key==='Backspace'&&!i.value&&ins[k-1]) ins[k-1].focus(); };
    i.onpaste=e=>{ const d=(e.clipboardData.getData('text')||'').replace(/\D/g,'').slice(0,6); if(d){e.preventDefault(); d.split('').forEach((c,j)=>ins[j]&&(ins[j].value=c)); ins[Math.min(5,d.length)].focus();} }; });
  let n=60; clearInterval(cdTimer); cdTimer=setInterval(()=>{ n--; const c=$('#cd'); if(!c){clearInterval(cdTimer);return;} c.textContent=n; if(n<=0){clearInterval(cdTimer); const r=$('#resend'); r.disabled=false; r.textContent='Reenviar código'; r.onclick=()=>toast('Te enviamos un código nuevo');} },1000);
  $('#f').onsubmit=e=>{e.preventDefault(); const code=ins.map(i=>i.value).join('');
    if(!fieldErr(ins[0],code.length<6?'Ingresá los 6 dígitos del código':'')) return;
    e.submitter.classList.add('is-loading'); setTimeout(()=>{ toast('Email verificado'); go('#/onboarding/1'); },600); };
}
function vRecuperar(){
  return authShell(`<a class="small" href="#/login">← Volver a iniciar sesión</a><h1 style="margin-top:16px">Recuperá tu contraseña</h1><p class="muted" style="margin:6px 0 24px">Ingresá tu email y te mandamos un link para crear una nueva.</p>
  <form id="f" novalidate>${F('em','Email','type="email" autocomplete="email" placeholder="nombre@empresa.com"')}<button class="btn btn-primary btn-block">Enviar link</button></form>`);
}
function bRecuperar(){ $('#f').onsubmit=e=>{e.preventDefault(); const em=$('#em'); if(!fieldErr(em,!emailOk(em.value)?'Ingresá un email válido':'')) return; S.user.email=em.value; e.submitter.classList.add('is-loading'); setTimeout(()=>go('#/recuperar-enviado'),600); }; }
function vRecEnviado(){
  return authShell(`<div style="width:48px;height:48px;border-radius:12px;background:var(--success-soft);color:var(--success);display:grid;place-items:center;margin-bottom:16px">${ic('mail')}</div><h1>Revisá tu email</h1>
  <p class="muted" style="margin:6px 0 24px">Si <b style="color:var(--ink)">${esc(S.user.email||'ese email')}</b> tiene una cuenta, vas a recibir un link para crear una contraseña nueva. Vence en 1 hora.</p>
  <a class="btn btn-primary btn-block" href="#/nueva-clave">Abrir el link (simulado)</a><p class="small" style="margin-top:16px;text-align:center"><a href="#/login">Volver a iniciar sesión</a></p>`);
}
function vNuevaClave(){
  return authShell(`<h1>Creá una contraseña nueva</h1><p class="muted" style="margin:6px 0 24px">Al guardarla, cerramos la sesión en tus otros dispositivos.</p>
  <form id="f" novalidate>${pwField('n1','Nueva contraseña')}${pwField('n2','Repetí la contraseña')}<button class="btn btn-primary btn-block">Guardar contraseña</button></form>`);
}
function bNuevaClave(){ bindEyes(); $('#f').onsubmit=e=>{e.preventDefault(); const a=$('#n1'),b=$('#n2'); let ok=fieldErr(a,a.value.length<8?'Mínimo 8 caracteres':''); ok=fieldErr(b,b.value!==a.value?'Las contraseñas no coinciden':'')&&ok; if(!ok) return; toast('Contraseña actualizada. Iniciá sesión con la nueva.'); go('#/login'); }; }

/* ===================== Onboarding ===================== */
const STEPS=['Tu perfil','Empresa','Workspace','Marca','Equipo','Listo'];
function obShell(n,inner,canSkip){
  const pct=Math.round((n-1)/(STEPS.length-1)*100);
  const brand=S.brands[0], co=S.company;
  return `<div class="ob"><header class="ob-top">${LOGO_WHITE.replace('<svg','<svg class="logo"')}
  <div class="ob-progress"><span class="desk">Paso ${n} de ${STEPS.length} · ${STEPS[n-1]}</span><span class="mobile-only">${n}/${STEPS.length}</span><div class="ob-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progreso del onboarding"><i style="width:${pct}%"></i></div></div>
  <a class="small muted" href="#/login" title="Tu avance queda guardado">Salir</a></header>
  <main class="ob-main"><form id="f" novalidate>${inner}
  <div class="ob-actions">${n>1&&n<6?`<a class="btn" href="#/onboarding/${n-1}">Volver</a>`:'<span></span>'}<div style="display:flex;gap:8px">${canSkip?`<button type="button" class="btn btn-ghost" id="skip">Saltear</button>`:''}<button class="btn btn-primary">${n===6?'Ir al dashboard':'Continuar'}</button></div></div></form>
  <aside class="ob-preview" aria-label="Vista previa"><p class="small muted" style="margin-bottom:8px">Así se va a ver tu espacio</p><div class="card">
   <div class="prev-ctx"><div class="mark" style="background:${brand?brand.color:'var(--line-strong)'}">${initials(co?.name||'?')}</div><div class="ctx-txt"><b>${esc(co?.name||'Tu empresa')}</b><span>${esc(S.workspaces[0]?.name||'Workspace')} › <i class="bdot" style="background:${brand?.color||'var(--line)'}"></i>${esc(brand?.name||'Marca')}</span></div></div>
   <div class="prev-nav"><span class="on">${ic('home')} Inicio</span><span>${ic('target')} Marketing</span><span>${ic('calendar')} Contenidos</span><span>${ic('users')} CRM</span><span>${ic('zap')} Automatizaciones</span></div>
   ${S.members.length>1?`<p class="small muted" style="margin-top:12px">${S.members.length-1} invitación${S.members.length>2?'es':''} lista${S.members.length>2?'s':''}</p>`:''}</div></aside></main></div>`;
}
function vOnboarding(n){
  n=Math.min(6,Math.max(1,+n||1));
  if(n===1) return obShell(1,`<p class="ob-step">/perfil</p><h1>Contanos sobre vos</h1><p class="muted" style="margin-bottom:24px">Lo usamos para adaptar la plataforma a tu forma de trabajar.</p>
   ${F('nm','Tu nombre',`value="${esc(S.user.name)}" autocomplete="name" placeholder="Nombre y apellido"`)}
   ${F('rl','Tu rol',`value="${esc(S.user.role)}" placeholder="Ej.: Responsable de marketing"`)}
   <div class="field"><span class="label">¿Cómo vas a usar Brandazo?</span><div class="choice-grid" role="group" aria-label="Tipo de cuenta">
   ${[['emprendedor','Emprendedor','Manejo mi negocio, sin equipo grande.'],['empresa','Empresa','Un equipo de marketing o ventas.'],['agencia','Agencia','Gestiono marcas de varios clientes.']].map(([v,t,d])=>`<button type="button" class="choice" data-type="${v}" aria-pressed="${S.user.type===v}"><b>${t}</b><span class="small muted">${d}</span></button>`).join('')}
   </div><span class="err" role="alert"></span></div>`,false);
  if(n===2) return obShell(2,`<p class="ob-step">/empresa</p><h1>Creá tu empresa</h1><p class="muted" style="margin-bottom:24px">Es el espacio donde viven tus clientes, tu equipo y tus integraciones. El logo y los datos fiscales los completás después.</p>
   ${F('cn','Nombre de la empresa',`value="${esc(S.company?.name||'')}" placeholder="Ej.: Estudio Norte"`)}
   <div class="form-grid"><div class="field"><label for="cc">País</label><select class="select" id="cc">${['Argentina','Chile','Colombia','México','Uruguay','España','Otro'].map(c=>`<option ${S.company?.country===c?'selected':''}>${c}</option>`).join('')}</select></div>
   <div class="field"><label for="cs">Tamaño del equipo</label><select class="select" id="cs">${['Solo yo','2 a 10','11 a 50','51 a 200','Más de 200'].map(c=>`<option ${S.company?.size===c?'selected':''}>${c}</option>`).join('')}</select></div></div>
   ${F('ci','Rubro (opcional)',`value="${esc(S.company?.industry||'')}" placeholder="Ej.: Gastronomía, retail, servicios"`)}`,false);
  if(n===3) return obShell(3,`<p class="ob-step">/workspace</p><h1>Organizá tu trabajo</h1><p class="muted" style="margin-bottom:24px">Un workspace agrupa equipos, proyectos y campañas. ${S.user.type==='agencia'?'<b style="color:var(--ink)">Tip para agencias:</b> creá un workspace por cliente.':'Si recién empezás, con uno alcanza.'}</p>
   ${F('wn','Nombre del workspace',`value="${esc(S.workspaces[0]?.name||'General')}"`,'Podés crear más desde Configuración.')}
   <div class="alert alert-info">${ic('info')}<div>Si lo salteás, creamos uno llamado <b>General</b>.</div></div>`,true);
  if(n===4){ const b=S.brands[0]||{name:S.company?.name||'',color:COLORS[0]};
   return obShell(4,`<p class="ob-step">/marca</p><h1>Sumá tu primera marca</h1><p class="muted" style="margin-bottom:24px">Las marcas ordenan tus contenidos, campañas y redes. Una empresa puede tener varias.</p>
   ${F('bn','Nombre de la marca',`value="${esc(b.name)}" placeholder="Ej.: Café del Centro"`)}
   <div class="field"><span class="label">Color de la marca</span><div class="swatches" role="radiogroup" aria-label="Color">${COLORS.map(c=>`<button type="button" class="swatch" style="background:${c}" data-color="${c}" aria-pressed="${b.color===c}" aria-label="Color ${c}"></button>`).join('')}</div><span class="hint">Identifica la marca en el calendario y en el selector.</span></div>
   <div class="field"><span class="label">Logo (opcional)</span><div class="upload" role="button" tabindex="0" id="up">${ic('upload')}<br>Arrastrá tu logo o hacé clic para subirlo · PNG o SVG, hasta 2 MB</div></div>`,false); }
  if(n===5){ const inv=S.members.filter(m=>m.status==='Pendiente');
   const rows=(inv.length?inv:[{email:'',role:'Marketing'},{email:'',role:'Ventas'}]).map(m=>inviteRow(m.email,m.role)).join('');
   return obShell(5,`<p class="ob-step">/equipo</p><h1>Invitá a tu equipo</h1><p class="muted" style="margin-bottom:24px">Cada persona entra con un rol que define qué puede ver y hacer. Podés cambiarlo cuando quieras.</p>
   <div id="rows">${rows}</div><button type="button" class="btn btn-ghost btn-sm" id="addrow">${ic('plus')} Agregar otra persona</button>
   <details style="margin-top:20px"><summary class="small" style="cursor:pointer;font-weight:500">¿Qué puede hacer cada rol?</summary>${roleSummary()}</details>`,true); }
  return obShell(6,`<div style="width:56px;height:56px;border-radius:16px;background:var(--negro);display:grid;place-items:center;margin-bottom:20px"><span class="slash" style="font-size:28px">/</span></div><h1>Todo listo, ${esc((S.user.name||'').split(' ')[0]||'bienvenida')}</h1>
   <p class="muted" style="margin:8px 0 24px">Creamos tu espacio. Esto es lo que configuraste:</p>
   <div class="card" style="padding:8px 20px">
    <div class="ck done"><span class="st">${ic('check')}</span><span class="ck-t" style="text-decoration:none;color:var(--ink)">Empresa <b>${esc(S.company?.name)}</b></span></div>
    <div class="ck done"><span class="st">${ic('check')}</span><span class="ck-t" style="text-decoration:none;color:var(--ink)">Workspace <b>${esc(S.workspaces[0]?.name)}</b></span></div>
    <div class="ck done"><span class="st">${ic('check')}</span><span class="ck-t" style="text-decoration:none;color:var(--ink)">Marca <b>${esc(S.brands[0]?.name)}</b></span></div>
    <div class="ck ${S.members.length>1?'done':''}"><span class="st">${S.members.length>1?ic('check'):''}</span><span class="ck-t" style="text-decoration:none;color:var(--ink)">${S.members.length>1?`${S.members.length-1} invitación(es) enviada(s)`:'Equipo: lo podés invitar después'}</span></div></div>
   <p class="small muted" style="margin-top:16px">Tip: en cualquier pantalla, escribí <span class="slash">/</span> para crear, buscar o pedirle algo a la IA.</p>`,false);
}
const inviteRow=(email,role)=>`<div class="invite-row"><input class="input" type="email" placeholder="nombre@empresa.com" value="${esc(email)}" aria-label="Email"><select class="select" aria-label="Rol">${ROLES.slice(1).map(r=>`<option ${r===role?'selected':''}>${r}</option>`).join('')}</select><button type="button" class="icon-btn" aria-label="Quitar" data-rm>${ic('x')}</button></div>`;
function roleSummary(){ return `<div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>Rol</th><th>Puede</th></tr></thead><tbody>
 <tr><td><b>Admin</b></td><td class="small">Todo, salvo facturación y borrar la empresa.</td></tr><tr><td><b>Marketing</b></td><td class="small">Estrategia, contenidos, campañas y redes. Ve el CRM.</td></tr>
 <tr><td><b>Ventas</b></td><td class="small">CRM, pipeline y conversaciones con clientes.</td></tr><tr><td><b>Atención</b></td><td class="small">Inbox y contactos asignados.</td></tr></tbody></table></div>`; }
function bOnboarding(n){
  n=+n||1; const f=$('#f');
  const next=()=>{ S.onboard.step=n+1; go('#/onboarding/'+(n+1)); };
  if(n===1){ $$('[data-type]').forEach(b=>b.onclick=()=>{ $$('[data-type]').forEach(x=>x.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); S.user.type=b.dataset.type; fieldErr(b,''); });
    f.onsubmit=e=>{e.preventDefault(); const nm=$('#nm'); let ok=fieldErr(nm,!nm.value.trim()?'Ingresá tu nombre':''); ok=fieldErr($('[data-type]'),!S.user.type?'Elegí una opción':'')&&ok; if(!ok)return; S.user.name=nm.value.trim(); S.user.role=$('#rl').value; next(); }; }
  if(n===2) f.onsubmit=e=>{e.preventDefault(); const cn=$('#cn'); if(!fieldErr(cn,cn.value.trim().length<2?'Ingresá el nombre de la empresa':''))return;
    const prev=STORE.get(S.company||TMPCO); S.company={name:cn.value.trim(),country:$('#cc').value,size:$('#cs').value,industry:$('#ci').value}; S.companies=[S.company]; if(prev) STORE.set(S.company,prev);
    if(!S.members.length) S.members=[{name:S.user.name,email:S.user.email||'vos@empresa.com',role:'Dueño',status:'Activo'}];
    logAct(`Creaste la empresa ${S.company.name}`); next(); };
  if(n===3){ const save=v=>{ S.workspaces=[{name:v||'General'}]; S.ws=0; next(); };
    $('#skip').onclick=()=>{ S.onboard.skipped.ws=true; save('General'); };
    f.onsubmit=e=>{e.preventDefault(); const w=$('#wn'); if(!fieldErr(w,!w.value.trim()?'Ingresá un nombre o tocá Saltear':''))return; save(w.value.trim()); }; }
  if(n===4){ let color=(S.brands[0]||{}).color||COLORS[0];
    $$('[data-color]').forEach(b=>b.onclick=()=>{ $$('[data-color]').forEach(x=>x.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); color=b.dataset.color; });
    $('#up').onclick=()=>toast('En el prototipo no se suben archivos');
    f.onsubmit=e=>{e.preventDefault(); const bn=$('#bn'); if(!fieldErr(bn,!bn.value.trim()?'Ingresá el nombre de la marca':''))return; S.brands=[{name:bn.value.trim(),color}]; S.brand=0; logAct(`Creaste la marca ${bn.value.trim()}`); next(); }; }
  if(n===5){ const bindRm=()=>$$('[data-rm]').forEach(b=>b.onclick=()=>{ b.closest('.invite-row').remove(); });
    bindRm(); $('#addrow').onclick=()=>{ if($$('.invite-row').length>=10) return toast('Podés invitar hasta 10 personas por vez'); $('#rows').insertAdjacentHTML('beforeend',inviteRow('','Marketing')); bindRm(); $$('.invite-row input').at(-1).focus(); };
    $('#skip').onclick=()=>{ S.onboard.skipped.team=true; S.members=S.members.filter(m=>m.status!=='Pendiente'); next(); };
    f.onsubmit=e=>{e.preventDefault(); const rows=$$('.invite-row'); let bad=false; const list=[];
      rows.forEach(r=>{ const i=r.querySelector('input'); const v=i.value.trim(); i.style.borderColor=''; if(!v) return; if(!emailOk(v)){ bad=true; i.style.borderColor='var(--danger)'; } else list.push({name:'',email:v,role:r.querySelector('select').value,status:'Pendiente'}); });
      if(bad) return toast('Revisá los emails marcados en rojo');
      if(!list.length) return toast('Escribí al menos un email o tocá Saltear');
      S.members=S.members.filter(m=>m.status!=='Pendiente').concat(list); list.forEach(m=>logAct(`Invitaste a ${m.email} como ${m.role}`)); next(); }; }
  if(n===6) f.onsubmit=e=>{e.preventDefault(); S.onboard.done=true; notify('Tu espacio está listo','Seguí la lista de configuración del inicio para activar tus módulos.'); go('#/app/inicio'); };
}

/* ===================== App: shell ===================== */
const NAV=[
 ['inicio','Inicio','home',true],
 ['estrategia','Estrategia','target',true,'Marketing'],['contenidos','Contenidos','calendar',true,'Marketing'],['campanas','Campañas','megaphone',true,'Marketing'],['redes','Redes sociales','heart',true,'Marketing'],['marca','Marca','tag',true,'Marketing'],
 ['crm','CRM','users',false,'Ventas y clientes'],['automatizaciones','Automatizaciones','zap',false,'Ventas y clientes'],['comunicaciones','Comunicaciones','message',false,'Ventas y clientes'],['metricas','Métricas','chart',false,'Análisis'],['integraciones','Integraciones','plug',false,'Análisis']];
const MOD={
 marketing:{t:'Marketing',d:'Definí objetivos, OKR, buyer personas, audiencias y pilares de contenido en un solo lugar.',f:['Objetivos y OKR','Buyer personas','Audiencias y segmentos','Pilares de contenido','KPI por canal','Etapas del embudo']},
 contenidos:{t:'Contenidos',d:'Planificá publicaciones por marca, canal y fecha, con estados de producción y aprobaciones.',f:['Calendario mensual y semanal','Reels, historias y carruseles','Copy con IA','Aprobaciones del cliente','Biblioteca de archivos','Vista previa por red']},
 campanas:{t:'Campañas',d:'Creá campañas con objetivos, presupuesto, canales y audiencias, y compará resultados.',f:['Presupuesto e inversión','Canales y audiencias','Piezas asociadas','Resultados en tiempo real','Comparativas','Leads por campaña']},
 crm:{t:'CRM',d:'Tu base de clientes nativa: contactos, empresas, leads, pipeline, actividades y pedidos.',f:['Ficha 360 del contacto','Pipeline Kanban','Leads y formularios','Actividades y tareas','Segmentos','Pedidos y pagos']},
 automatizaciones:{t:'Automatizaciones',d:'Conectá marketing, CRM y ventas con flujos visuales, sin programar.',f:['Editor visual por bloques','Disparadores y condiciones','Esperas y ramificaciones','Biblioteca de plantillas','Historial de ejecuciones','Alertas de errores']},
 comunicaciones:{t:'Comunicaciones',d:'Email, WhatsApp Business y una bandeja omnicanal conectados a cada contacto.',f:['Inbox omnicanal','Campañas de email','WhatsApp Business','Plantillas aprobadas','Asignación de responsables','Notas internas']},
 metricas:{t:'Métricas',d:'Indicadores de marketing, comerciales y de atribución, con reportes y exportaciones.',f:['Dashboard general','Rendimiento por canal','Atribución de ventas','Comparativas por período','Reportes automáticos','Exportaciones']},
 integraciones:{t:'Integraciones',d:'Conectá Meta, Google, Shopify, WooCommerce, Mercado Pago y WhatsApp Business.',f:['Catálogo de integraciones','Estado de conexión','Errores de sincronización','Webhooks','Permisos por app','Historial']}
};
function curBrand(){ return S.brand>=0?S.brands[S.brand]:null; }
function shell(active,title,inner){
  const b=curBrand(), unread=S.notifs.filter(n=>n.unread).length;
  return `<div class="app ${S.collapsed?'collapsed':''}"><aside class="side" aria-label="Navegación principal">
   <button class="ctx-btn" id="ctx" aria-haspopup="menu" aria-label="Cambiar empresa, workspace o marca"><div class="mark" style="background:var(--negro)">${initials(S.company.name)}</div><div class="ctx-txt"><b>${esc(S.company.name)}</b><span>${esc(S.workspaces[S.ws]?.name||'')} › <i class="bdot" style="background:${b?b.color:'var(--line-strong)'}"></i>${esc(b?b.name:'Todas las marcas')}</span></div>${ic('chev','ctx-chev')}</button>
   <nav class="nav">${(()=>{let g='';return NAV.map(([k,l,i,core,grp])=>{const head=grp&&grp!==g?`<div class="nav-label">${grp}</div>`:'';g=grp||g;return head+`<a href="#/app/${k}" ${active===k?'aria-current="page"':''} title="${l}">${ic(i)}<span>${l}</span>${core?'':'<em class="soon" style="font-style:normal">Pronto</em>'}</a>`}).join('')})()}</nav>
   <div class="side-foot nav"><a href="#/app/config/empresa" ${active==='config'?'aria-current="page"':''} title="Configuración">${ic('settings')}<span>Configuración</span></a>
   <a href="#" id="collapse" class="collapse-btn" title="${S.collapsed?'Expandir':'Colapsar'} menú">${ic('panel')}<span>Colapsar menú</span></a></div></aside>
   <div style="min-width:0;display:flex;flex-direction:column"><header class="top">
    <button class="icon-btn mobile-only" id="mctx" aria-label="Cambiar contexto"><div class="mark" style="width:28px;height:28px;background:var(--negro);font-size:11px">${initials(S.company.name)}</div></button>
    <span class="title">${title}</span>${D().demo?'<span class="badge badge-warn desk" title="Esta empresa tiene datos de ejemplo para mostrar el prototipo">Datos de ejemplo</span>':''}
    <button class="search" id="cmdk"><span class="slash">/</span><span class="grow">Buscar o escribir un comando…</span><span class="kbd">⌘K</span></button>
    <button class="icon-btn" id="bell" aria-label="Notificaciones${unread?`, ${unread} sin leer`:''}">${ic('bell')}${unread?'<span class="dot"></span>':''}</button>
    <button class="icon-btn" id="me" aria-label="Menú de usuario" aria-haspopup="menu"><span class="avatar sm">${initials(S.user.name)}</span></button></header>
    <main class="content" id="main">${inner}</main></div>
   <nav class="bottom-nav" aria-label="Navegación móvil"><a href="#/app/inicio" ${active==='inicio'?'aria-current="page"':''}>${ic('home')}Inicio</a><a href="#/app/contenidos" ${active==='contenidos'?'aria-current="page"':''}>${ic('calendar')}Contenidos</a>
   <button id="mcmd">${ic('search')}Buscar</button><button id="mbell">${ic('bell')}Avisos${unread?'<span class="dot" style="top:4px;right:calc(50% - 14px)"></span>':''}</button><button id="mmore">${ic('menu')}Más</button></nav></div>`;
}
function bindShell(){
  $('#ctx').onclick=e=>ctxMenu(e.currentTarget); $('#mctx').onclick=e=>ctxMenu(e.currentTarget);
  $('#collapse').onclick=e=>{e.preventDefault(); S.collapsed=!S.collapsed; render();};
  $('#cmdk').onclick=cmdPalette; $('#mcmd').onclick=cmdPalette;
  $('#bell').onclick=notifPanel; $('#mbell').onclick=notifPanel;
  $('#me').onclick=e=>userMenu(e.currentTarget);
  $('#mmore').onclick=()=>drawer(`<div class="modal-head" style="padding:16px 20px"><h3>Menú</h3><button class="icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div><nav class="nav" style="padding:8px 12px">${NAV.concat([['config/empresa','Configuración','settings',true]]).map(([k,l,i,core])=>`<a href="#/app/${k}" data-close>${ic(i)}<span>${l}</span>${core?'':'<em class="soon" style="font-style:normal">Pronto</em>'}</a>`).join('')}<a href="#/ui-kit" data-close>${ic('grid')}<span>UI Kit</span></a></nav>`);
}
function ctxMenu(anchor){
  const m=popMenu(anchor,`<div class="menu-label">Empresa</div>${S.companies.map((c,i)=>`<button class="menu-item" data-co="${i}"><div class="mark" style="width:24px;height:24px;font-size:10px;background:var(--negro)">${initials(c.name)}</div><span class="grow">${esc(c.name)}</span>${c===S.company?ic('check'):''}</button>`).join('')}
   <button class="menu-item" data-new="empresa">${ic('plus')}<span class="grow">Crear empresa</span></button><div class="menu-sep"></div>
   ${S.workspaces.length>1?`<div class="menu-label">Workspace</div>${S.workspaces.map((w,i)=>`<button class="menu-item" data-ws="${i}">${ic('layers')}<span class="grow">${esc(w.name)}</span>${i===S.ws?ic('check'):''}</button>`).join('')}<div class="menu-sep"></div>`:''}
   <div class="menu-label">Marca</div><button class="menu-item" data-br="-1">${ic('grid')}<span class="grow">Todas las marcas</span>${S.brand===-1?ic('check'):''}</button>
   ${S.brands.map((b,i)=>`<button class="menu-item" data-br="${i}"><i class="bdot" style="background:${b.color};width:10px;height:10px;margin:0 7px"></i><span class="grow">${esc(b.name)}</span>${i===S.brand?ic('check'):''}</button>`).join('')}
   <button class="menu-item" data-new="marca">${ic('plus')}<span class="grow">Nueva marca</span></button>`);
  m.querySelectorAll('[data-co]').forEach(b=>b.onclick=()=>{ switchCompany(S.companies[+b.dataset.co]); closeLayer(); render(); toast(`Ahora estás en ${S.company.name}. Sus datos están aislados de las demás empresas.`); });
  m.querySelectorAll('[data-ws]').forEach(b=>b.onclick=()=>{ S.ws=+b.dataset.ws; closeLayer(); render(); });
  m.querySelectorAll('[data-br]').forEach(b=>b.onclick=()=>{ S.brand=+b.dataset.br; closeLayer(); render(); toast(S.brand<0?'Viendo todas las marcas':`Marca activa: ${S.brands[S.brand].name}`); });
  m.querySelector('[data-new="marca"]').onclick=()=>brandModal();
  m.querySelector('[data-new="empresa"]').onclick=()=>companyModal();
}
function companyModal(){
  modal('Crear empresa',`<p class="small muted" style="margin-bottom:16px">Cada empresa tiene sus propios contactos, equipo e integraciones. Ideal para agencias o si manejás más de un negocio.</p>${F('nc','Nombre de la empresa','placeholder="Ej.: Café del Centro"')}`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Crear empresa</button>`);
  $('#ok').onclick=()=>{ const i=$('#nc'); if(!fieldErr(i,!i.value.trim()?'Ingresá un nombre':''))return; const c={name:i.value.trim(),country:'Argentina',industry:'',size:'2 a 10'}; S.companies.push(c); switchCompany(c); logAct(`Creaste la empresa ${c.name}`); closeLayer(); render(); toast(`Empresa ${c.name} creada`); };
}
function userMenu(anchor){
  const m=popMenu(anchor,`<div style="padding:8px 10px"><b>${esc(S.user.name)}</b><div class="small muted">${esc(S.user.email)}</div></div><div class="menu-sep"></div>
   <button class="menu-item" data-a="perfil">${ic('user')}<span class="grow">Mi perfil y preferencias</span></button>
   <button class="menu-item" data-a="clave">${ic('key')}<span class="grow">Cambiar contraseña</span></button>
   <button class="menu-item" data-a="kit">${ic('grid')}<span class="grow">UI Kit</span></button><div class="menu-sep"></div>
   <button class="menu-item" data-a="reset">${ic('trash')}<span class="grow">Borrar datos de este navegador</span></button>
   <button class="menu-item" data-a="salir">${ic('logout')}<span class="grow">Cerrar sesión</span></button>`,'right');
  m.querySelector('[data-a=perfil]').onclick=()=>{closeLayer();go('#/app/config/preferencias')};
  m.querySelector('[data-a=clave]').onclick=changePw;
  m.querySelector('[data-a=kit]').onclick=()=>{closeLayer();go('#/ui-kit')};
  m.querySelector('[data-a=salir]').onclick=()=>{closeLayer();go('#/login')};
  m.querySelector('[data-a=reset]').onclick=()=>{closeLayer();resetSaved()};
}
function setTheme(t){ S.theme=t; document.documentElement.dataset.theme=t; try{localStorage.setItem('bz-theme',t)}catch(e){} render(); }
function changePw(){
  modal('Cambiar contraseña',`${pwField('c0','Contraseña actual')}${pwField('c1','Nueva contraseña')}${pwField('c2','Repetí la nueva')}<div class="alert alert-info">${ic('info')}<div>Vamos a cerrar tu sesión en los demás dispositivos.</div></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Guardar</button>`);
  bindEyes();
  $('#ok').onclick=()=>{ let ok=fieldErr($('#c0'),!$('#c0').value?'Ingresá tu contraseña actual':''); ok=fieldErr($('#c1'),$('#c1').value.length<8?'Mínimo 8 caracteres':'')&&ok; ok=fieldErr($('#c2'),$('#c2').value!==$('#c1').value?'Las contraseñas no coinciden':'')&&ok; if(!ok)return; closeLayer(); toast('Contraseña actualizada'); };
}
function notifPanel(){
  S.notifs.forEach(n=>n.unread=false);
  drawer(`<div class="modal-head" style="padding:20px 20px 0"><h3>Notificaciones</h3><button class="icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div>
  <div class="tabs" style="margin:12px 20px 0" role="tablist"><button class="tab" aria-selected="true" role="tab">Para mí</button><button class="tab" role="tab" aria-selected="false">Todas</button></div>
  <div style="padding:0 20px;overflow:auto;flex:1">${S.notifs.length?S.notifs.map(n=>`<div class="feed-item" style="padding:14px 0;border-bottom:1px solid var(--line)"><span class="avatar sm" style="background:var(--magenta);color:#0E0E10">${ic('bell')}</span><div><b>${esc(n.title)}</b><div class="muted">${esc(n.body)}</div><div class="when">${n.when}</div></div></div>`).join(''):
  `<div class="empty"><div class="eico">${ic('bell')}</div><h3>Estás al día</h3><p class="muted small">Acá vas a ver menciones, aprobaciones y alertas de tus integraciones.</p></div>`}</div>`);
  $$('#layer .tab').forEach(t=>t.onclick=()=>{$$('#layer .tab').forEach(x=>x.setAttribute('aria-selected','false'));t.setAttribute('aria-selected','true')});
  setTimeout(()=>{ const d=$('.dot',$('#bell')); d&&d.remove(); },50);
}
function cmdPalette(){
  const items=[
   ...NAV.map(([k,l,i])=>({g:'Ir a',l,i,h:'#/app/'+k})),
   ...['empresa','workspaces','marcas','usuarios','roles','preferencias','integraciones'].map(k=>({g:'Ir a',l:'Configuración › '+cfgTitle(k),i:'settings',h:'#/app/config/'+k})),
   {g:'Acciones',l:'Invitar a una persona',i:'users',a:()=>inviteModal()},{g:'Acciones',l:'Crear marca',i:'tag',a:()=>brandModal()},{g:'Acciones',l:'Crear workspace',i:'layers',a:()=>wsModal()}];
  modal('',`<div class="cmd-in"><span class="slash" style="font-size:18px">/</span><input id="q" placeholder="Buscar o escribir un comando…" aria-label="Comando" autocomplete="off"><span class="kbd">Esc</span></div><div class="cmd-list" id="cl" role="listbox"></div>`,'',{cls:'cmd'});
  $('#layer .modal-body').style.padding='0';
  let sel=0, list=items;
  const draw=()=>{ const q=$('#q').value.trim().toLowerCase(); list=items.filter(x=>x.l.toLowerCase().includes(q));
    const ai=q?[{g:'Preguntarle a la IA',l:`“${$('#q').value.trim()}”`,i:'spark',a:()=>{closeLayer();toast('La IA llega con los módulos. Por ahora, probá los comandos de configuración.')}}]:[];
    list=list.concat(ai); sel=Math.min(sel,Math.max(0,list.length-1)); let g='';
    $('#cl').innerHTML=list.length?list.map((x,i)=>{const head=x.g!==g?`<div class="menu-label">${x.g}</div>`:''; g=x.g; return head+`<button class="menu-item ${i===sel?'active':''}" data-i="${i}" role="option" aria-selected="${i===sel}">${ic(x.i)}<span class="grow">${esc(x.l)}</span>${i===sel?'<span class="kbd">↵</span>':''}</button>`}).join(''):`<div class="empty"><p class="muted small">Sin resultados</p></div>`;
    $$('#cl [data-i]').forEach(b=>b.onclick=()=>run(list[+b.dataset.i])); };
  const run=x=>{ if(!x)return; if(x.h){closeLayer();go(x.h)} else x.a(); };
  $('#q').oninput=()=>{sel=0;draw()};
  $('#q').onkeydown=e=>{ if(e.key==='ArrowDown'){sel=Math.min(list.length-1,sel+1);draw();e.preventDefault()} if(e.key==='ArrowUp'){sel=Math.max(0,sel-1);draw();e.preventDefault()} if(e.key==='Enter'){run(list[sel])} };
  draw(); $('#q').focus();
}

/* ===================== Dashboard ===================== */
function vInicio(){
  const steps=[
   ['Crear tu empresa',!!S.company,null],['Crear tu primera marca',S.brands.length>0,()=>brandModal()],
   ['Invitar a tu equipo',S.members.length>1,()=>inviteModal()],['Configurar roles y permisos',!!S.rolesReviewed,()=>go('#/app/config/roles')],
   ['Conectar una integración',Object.values(S.integrations).some(Boolean),()=>go('#/app/config/integraciones')],['Elegir tus preferencias',!!S.prefsSaved,()=>go('#/app/config/preferencias')]];
  const done=steps.filter(s=>s[1]).length, pct=Math.round(done/steps.length*100), first=(S.user.name||'').split(' ')[0];
  const hour=new Date().getHours(), greet=hour<13?'Buen día':hour<20?'Buenas tardes':'Buenas noches';
  const mods=[['CRM','users','Contactos, leads y pipeline'],['Automatizaciones','zap','Flujos sin código'],['Comunicaciones','message','Email, WhatsApp e inbox'],['Métricas','chart','Indicadores y reportes']];
  const M=D().m, pub=M.contents.filter(c=>c.status==='Publicado').length, prog=M.contents.filter(c=>c.status==='Programado').length, act=M.campaigns.filter(c=>c.status==='Activa').length, acc=M.accounts.filter(a=>a.status==='Conectada').length;
  const kp=[['Leads del mes','users',(typeof X==='function'&&X().contacts.length)?'Ver en el CRM':'Se activa con el CRM',(typeof X==='function'&&X().contacts.length)?X().contacts.filter(c=>c.type==='Lead').length:null],['Contenidos publicados','calendar',M.contents.length?`${prog} programados`:'Planificá en Contenidos',M.contents.length?pub:null],['Campañas activas','megaphone',M.campaigns.length?`${M.campaigns.length} en total`:'Creá tu primera campaña',M.campaigns.length?act:null],['Cuentas sociales','heart',acc?'Sincronizadas':'Conectá Instagram o Facebook',acc||null]];
  return `<div class="page-head"><div><p class="muted small">${new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})}</p><h1>${greet}, ${esc(first)}</h1></div>
   <button class="btn btn-primary" id="qinv">${ic('plus')} Invitar al equipo</button></div>
  <div class="grid g-dash">
   ${done<steps.length?`<section class="card span-8" aria-labelledby="ckh"><div class="card-head"><div><h3 id="ckh">Configurá tu espacio</h3><p class="small muted">${done} de ${steps.length} pasos · te lleva unos 5 minutos</p></div><span class="mono small">${pct}%</span></div>
    <div class="progress" style="margin-bottom:8px"><i style="width:${pct}%"></i></div>
    <div class="checklist">${steps.map((s,i)=>`<div class="ck ${s[1]?'done':''}"><span class="st">${s[1]?ic('check'):''}</span><span class="ck-t">${s[0]}</span>${s[1]?'':`<button class="btn btn-sm" data-step="${i}">Empezar</button>`}</div>`).join('')}</div></section>`
   :`<section class="card span-8"><div class="alert alert-ok">${ic('check')}<div><b>Tu espacio está configurado.</b> Ya podés aprovechar los módulos a medida que se activen.</div></div></section>`}
   <section class="card span-4" aria-labelledby="qh"><h3 id="qh" style="margin-bottom:16px">Accesos rápidos</h3><div class="quick" style="grid-template-columns:1fr">
    <button data-q="inv">${ic('users')} Invitar a una persona</button><button data-q="brand">${ic('tag')} Crear una marca</button><button data-q="int">${ic('plug')} Conectar una integración</button><button data-q="cmd"><span class="slash">/</span> Abrir la barra de comandos</button></div></section>
   <section class="span-12" aria-labelledby="kh"><div class="card-head" style="margin:8px 0 12px"><h3 id="kh">Indicadores</h3><span class="small muted">Se completan con tus datos a medida que usás cada módulo</span></div>
    <div class="kpis">${kp.map(([l,i,h,v])=>`<div class="kpi" ${v!=null?'style="border-style:solid;background:var(--surface-raised)"':''}><span class="k-l">${l}</span><span class="k-v" ${v!=null?'style="color:var(--ink)"':''}>${v!=null?v:'—'}</span><span class="small muted" style="display:flex;gap:6px;align-items:center;margin-top:auto">${ic(i)} ${h}</span></div>`).join('')}</div></section>
   <section class="card span-4" aria-labelledby="mh"><div class="card-head"><h3 id="mh">Estado de los módulos</h3></div><div class="mods">
    ${[['settings','Configuración','Empresa, equipo y permisos','config/empresa'],['target','Estrategia','Objetivos, OKR y buyer personas','estrategia'],['calendar','Contenidos','Calendario editorial','contenidos'],['megaphone','Campañas','Orgánicas y pagas','campanas'],['heart','Redes sociales','Cuentas y métricas','redes'],['tag','Marca','Identidad y recursos','marca']].map(([i,t,d,h])=>`<a class="mod" href="#/app/${h}" style="color:inherit;text-decoration:none">${ic(i)}<div class="grow"><b>${t}</b><div class="small muted">${d}</div></div><span class="badge badge-ok">Disponible</span></a>`).join('')}
    ${mods.map(([t,i,d])=>`<div class="mod">${ic(i)}<div class="grow"><b>${t}</b><div class="small muted">${d}</div></div><span class="badge">Próximamente</span></div>`).join('')}</div></section>
   <section class="card span-4" aria-labelledby="th"><div class="card-head"><h3 id="th">Tareas pendientes</h3></div>
    <div class="empty"><div class="eico">${ic('check')}</div><b>No tenés tareas</b><p class="small muted">Cuando te asignen un seguimiento, una aprobación o una llamada, aparece acá.</p></div></section>
   <section class="card span-4" aria-labelledby="ah"><div class="card-head"><h3 id="ah">Actividad reciente</h3></div>
    ${S.activity.length?`<div class="feed">${S.activity.slice(0,6).map(a=>`<div class="feed-item"><span class="avatar sm">${initials(S.user.name)}</span><div>${esc(a.t)}<div class="when">${a.when}</div></div></div>`).join('')}</div>`:`<div class="empty"><p class="small muted">Todavía no hay actividad.</p></div>`}</section>
  </div>`;
}
function bInicio(){
  const acts={0:null,1:()=>brandModal(),2:()=>inviteModal(),3:()=>{S.rolesReviewed=true;go('#/app/config/roles')},4:()=>go('#/app/config/integraciones'),5:()=>go('#/app/config/preferencias')};
  $$('[data-step]').forEach(b=>b.onclick=()=>acts[b.dataset.step]?.());
  $('#qinv').onclick=()=>inviteModal();
  $$('[data-q]').forEach(b=>b.onclick=()=>({inv:inviteModal,brand:brandModal,int:()=>go('#/app/config/integraciones'),cmd:cmdPalette}[b.dataset.q])());
}

/* ===================== Próximamente ===================== */
function vSoon(k){ const m=MOD[k]; const w=S.waitlist[k];
  return `<div class="soon-page"><div class="soon-ico">${ic(NAV.find(n=>n[0]===k)[2])}</div><span class="badge">Próximamente</span><h1>${m.t}</h1><p class="muted" style="max-width:480px">${m.d}</p>
  <div class="feat">${m.f.map(x=>`<div>${ic('check')}${x}</div>`).join('')}</div>
  <button class="btn ${w?'':'btn-primary'}" id="wl" ${w?'aria-pressed="true"':''}>${w?ic('check')+' Te vamos a avisar':ic('bell')+' Avisarme cuando esté'}</button>
  <p class="small muted">Mientras tanto, dejá lista tu configuración: <a href="#/app/config/usuarios">equipo</a> · <a href="#/app/config/marcas">marcas</a> · <a href="#/app/config/integraciones">integraciones</a></p></div>`; }
function bSoon(k){ $('#wl').onclick=()=>{ S.waitlist[k]=!S.waitlist[k]; render(); if(S.waitlist[k]) toast(`Te avisamos cuando ${MOD[k].t} esté disponible`); }; }

/* ===================== Configuración ===================== */
const CFG=[['empresa','Empresa'],['workspaces','Workspaces'],['marcas','Marcas'],['usuarios','Usuarios'],['roles','Roles y permisos'],['plan','Plan y facturación'],['seguridad','Seguridad y datos'],['preferencias','Preferencias'],['integraciones','Integraciones']];
const cfgTitle=k=>(CFG.find(c=>c[0]===k)||[])[1]||'';
function vConfig(tab){
  tab=CFG.some(c=>c[0]===tab)?tab:'empresa';
  const body={empresa:cfgEmpresa,workspaces:cfgWs,marcas:cfgMarcas,usuarios:cfgUsuarios,roles:cfgRoles,plan:cfgPlan,seguridad:cfgSeg,preferencias:cfgPrefs,integraciones:cfgInteg}[tab]();
  return `<div class="page-head"><div><nav class="breadcrumbs" aria-label="Ruta"><a href="#/app/config/empresa">Configuración</a>${ic('chevr')}<span>${cfgTitle(tab)}</span></nav><h1 style="margin-top:4px">Configuración</h1></div></div>
  <div class="tabs" role="tablist">${CFG.map(([k,l])=>`<a class="tab" role="tab" href="#/app/config/${k}" aria-selected="${k===tab}">${l}</a>`).join('')}</div>${body}`;
}
function cfgEmpresa(){ const c=S.company;
  return `<div class="grid g-dash"><section class="card span-8"><h3 style="margin-bottom:4px">Información de la empresa</h3><p class="small muted" style="margin-bottom:20px">Se usa en facturas, emails y en el selector de contexto.</p>
  <form id="fe" novalidate><div style="display:flex;gap:16px;align-items:center;margin-bottom:20px"><div class="mark" style="width:56px;height:56px;font-size:18px;background:var(--negro)">${initials(c.name)}</div><button type="button" class="btn btn-sm" id="logo">${ic('upload')} Subir logo</button></div>
  ${F('en','Nombre',`value="${esc(c.name)}"`)}<div class="form-grid"><div class="field"><label for="ep">País</label><select class="select" id="ep">${['Argentina','Chile','Colombia','México','Uruguay','España','Otro'].map(x=>`<option ${c.country===x?'selected':''}>${x}</option>`).join('')}</select></div>
  ${F('ei','Rubro',`value="${esc(c.industry||'')}"`)}</div><div class="form-grid">${F('et','CUIT / ID fiscal','placeholder="Opcional"')}${F('ew','Sitio web','placeholder="https://"')}</div>
  <div style="display:flex;justify-content:flex-end;gap:8px"><button type="reset" class="btn">Descartar</button><button class="btn btn-primary">Guardar cambios</button></div></form></section>
  <section class="card span-4"><h3 style="margin-bottom:8px">Zona de riesgo</h3><p class="small muted" style="margin-bottom:16px">Eliminar la empresa borra contactos, marcas e integraciones. Solo el Dueño puede hacerlo.</p><button class="btn btn-danger btn-sm" id="del">${ic('trash')} Eliminar empresa</button></section></div>`; }
function cfgWs(){
  return `<div class="page-head" style="margin-bottom:16px"><p class="muted">Agrupá equipos, proyectos y campañas. ${S.user.type==='agencia'?'Para agencias: un workspace por cliente.':''}</p><button class="btn btn-primary" id="nws">${ic('plus')} Nuevo workspace</button></div>
  <div class="cards">${S.workspaces.map((w,i)=>`<article class="card ent"><div class="ent-top"><div class="mark" style="background:var(--surface-sunken);color:var(--ink)">${ic('layers')}</div><div style="flex:1"><b>${esc(w.name)}</b><div class="small muted">${S.members.length} integrante${S.members.length>1?'s':''}</div></div>${i===S.ws?'<span class="badge badge-brand">Activo</span>':''}</div><div style="display:flex;gap:8px"><button class="btn btn-sm" data-sw="${i}" ${i===S.ws?'disabled':''}>Abrir</button><button class="btn btn-sm btn-ghost" data-rn="${i}">Renombrar</button></div></article>`).join('')}</div>`; }
function cfgMarcas(){
  return `<div class="page-head" style="margin-bottom:16px"><p class="muted">Cada marca tiene su identidad, redes, contenidos y métricas.</p><button class="btn btn-primary" id="nbr">${ic('plus')} Nueva marca</button></div>
  ${S.brands.length?`<div class="cards">${S.brands.map((b,i)=>`<article class="card ent"><div class="ent-top"><div class="mark" style="background:${b.color}">${initials(b.name)}</div><div style="flex:1"><b>${esc(b.name)}</b><div class="small muted">Sin redes conectadas</div></div></div><div style="display:flex;gap:8px"><button class="btn btn-sm" data-eb="${i}">Editar</button><button class="btn btn-sm btn-ghost" data-ab="${i}">Activar</button></div></article>`).join('')}</div>`
  :`<div class="card empty"><div class="eico">${ic('tag')}</div><h3>Todavía no hay marcas</h3><p class="muted small">Creá tu primera marca para ordenar contenidos y campañas.</p><button class="btn btn-primary" id="nbr2">Crear marca</button></div>`}`; }
function cfgUsuarios(){
  return `<div class="page-head" style="margin-bottom:16px"><p class="muted">${S.members.length} persona${S.members.length>1?'s':''} en ${esc(S.company.name)}</p><button class="btn btn-primary" id="ninv">${ic('plus')} Invitar</button></div>
  <div class="table-wrap"><table class="t"><thead><tr><th>Persona</th><th>Rol</th><th class="hide-m">Estado</th><th><span class="sr">Acciones</span></th></tr></thead><tbody>
  ${S.members.map((m,i)=>`<tr><td><div class="person"><span class="avatar">${initials(m.name||m.email)}</span><div><b>${esc(m.name||m.email.split('@')[0])}</b><div class="small muted">${esc(m.email)}</div></div></div></td>
  <td>${m.role==='Dueño'?`<span class="tooltip" tabindex="0"><span class="badge">${ic('lock')} Dueño</span><span role="tooltip">Para cambiarlo, transferí la propiedad</span></span>`:`<select class="select" style="height:32px;width:140px" data-role="${i}" aria-label="Rol de ${esc(m.email)}">${ROLES.slice(1).map(r=>`<option ${r===m.role?'selected':''}>${r}</option>`).join('')}</select>`}</td>
  <td class="hide-m">${m.status==='Activo'?'<span class="badge badge-ok">Activo</span>':'<span class="badge badge-warn">Invitación pendiente</span>'}</td>
  <td style="text-align:right">${m.role==='Dueño'?'':`<button class="icon-btn" data-mm="${i}" aria-label="Más acciones">${ic('more')}</button>`}</td></tr>`).join('')}</tbody></table></div>`; }
const PERMS=[['Facturación y plan',[1,0,0,0,0]],['Usuarios, roles e integraciones',[1,1,0,0,0]],['Estrategia, contenidos y campañas',[1,1,1,0,0]],['CRM: contactos y leads',[1,1,1,1,1]],['Pipeline y oportunidades',[1,1,0,1,0]],['Inbox, email y WhatsApp',[1,1,1,1,1]],['Automatizaciones',[1,1,1,0,0]],['Métricas',[1,1,1,1,0]]];
function cfgRoles(){ S.rolesReviewed=true;
  return `<div class="page-head" style="margin-bottom:16px"><p class="muted" style="max-width:640px">Los roles base cubren la mayoría de los equipos. Para algo a medida, creá un rol nuevo partiendo de uno existente.</p><button class="btn" id="nrole">${ic('plus')} Crear rol</button></div>
  <div class="table-wrap"><table class="t perm"><thead><tr><th>Permiso</th>${ROLES.map(r=>`<th>${r}</th>`).join('')}</tr></thead><tbody>
  ${PERMS.map(([p,v])=>`<tr><td>${p}</td>${v.map(x=>`<td>${x?`<span class="yes" title="Permitido">${ic('check')}</span><span class="sr">Sí</span>`:`<span class="no" aria-hidden="true">—</span><span class="sr">No</span>`}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <p class="small muted" style="margin-top:12px">Los permisos se pueden limitar por marca: por ejemplo, Marketing solo para "${esc(S.brands[0]?.name||'una marca')}".</p>`; }
function cfgPrefs(){
  return `<div class="grid g-dash"><section class="card span-8"><h3>Preferencias</h3>
   <div class="settings-row"><div><b>Idioma</b><div class="small muted">Textos de la plataforma y emails</div></div><select class="select" style="width:200px"><option>Español (Argentina)</option><option>Español (Latinoamérica)</option><option>English</option><option>Português</option></select></div>
   <div class="settings-row"><div><b>Zona horaria</b><div class="small muted">Para programar publicaciones y envíos</div></div><select class="select" style="width:200px"><option>Córdoba (GMT-3)</option><option>Buenos Aires (GMT-3)</option><option>Ciudad de México (GMT-6)</option></select></div>
   <div class="settings-row"><div><b>Resumen diario por email</b><div class="small muted">Tareas y alertas del día, a las 9:00</div></div><label class="switch"><input type="checkbox" checked aria-label="Resumen diario"></label></div>
   <div class="settings-row"><div><b>Notificar menciones</b><div class="small muted">Cuando alguien te menciona en un comentario</div></div><label class="switch"><input type="checkbox" checked aria-label="Menciones"></label></div>
   <div class="settings-row"><div><b>Alertas de integraciones</b><div class="small muted">Errores de sincronización</div></div><label class="switch"><input type="checkbox" checked aria-label="Alertas"></label></div>
   <div style="display:flex;justify-content:flex-end;margin-top:16px"><button class="btn btn-primary" id="psave">Guardar preferencias</button></div></section>
   <section class="card span-4"><h3 style="margin-bottom:12px">Seguridad</h3><button class="btn btn-block" id="cpw">${ic('key')} Cambiar contraseña</button><p class="small muted" style="margin-top:12px">Sesiones activas: 1 · este dispositivo</p></section></div>`; }
const INTS=[['Meta (Instagram y Facebook)','Perfiles, publicaciones, métricas y leads','#1877F2','M'],['WhatsApp Business','Mensajes y conversaciones','#25D366','W'],['Google Analytics 4','Tráfico y conversiones','#E37400','G'],['Mercado Pago','Pagos y estados de transacción','#009EE3','MP'],['Shopify','Clientes, productos y pedidos','#5E8E3E','S'],['WooCommerce','Clientes, productos y pedidos','#7F54B3','W'],['Google Ads','Campañas e inversión','#4285F4','GA'],['TikTok','Perfiles y métricas','#0E0E10','T'],['LinkedIn','Perfiles y métricas','#0A66C2','in']];
function cfgInteg(){
  return `<div class="alert alert-info" style="margin-bottom:16px">${ic('info')}<div>Conectar ahora deja tus datos listos: cada módulo los usa en cuanto se activa.</div></div>
  <div class="cards">${INTS.map(([n,d,c,l],i)=>{const on=S.integrations[i]; return `<article class="card ent"><div class="ent-top"><div class="mark" style="background:var(--surface-sunken);color:var(--ink)">${l}</div><div style="flex:1;min-width:0"><b>${n}</b><div class="small muted">${d}</div></div></div>
  <div style="display:flex;justify-content:space-between;align-items:center">${on?'<span class="badge badge-ok">Conectada</span>':'<span class="badge">Sin conectar</span>'}<button class="btn btn-sm" data-int="${i}">${on?'Desconectar':'Conectar'}</button></div></article>`}).join('')}</div>`; }
function bConfig(tab){
  const on=(s,f)=>{const e=$(s); if(e) e.onclick=f;};
  if($('#fe')){ $('#fe').onsubmit=e=>{e.preventDefault(); const n=$('#en'); if(!fieldErr(n,!n.value.trim()?'El nombre no puede quedar vacío':''))return; const old=S.company.name; S.company.name=n.value.trim(); S.company.country=$('#ep').value; S.company.industry=$('#ei').value; render(); toast('Cambios guardados',()=>{S.company.name=old;render()}); };
    on('#logo',()=>toast('En el prototipo no se suben archivos'));
    on('#del',()=>modal('¿Eliminar la empresa?',`<p>Vas a borrar <b>${esc(S.company.name)}</b> con todos sus contactos, marcas e integraciones. No se puede deshacer.</p>${F('cf',`Escribí <b>${esc(S.company.name)}</b> para confirmar`,'autocomplete="off"')}`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-danger" id="ok">Eliminar empresa</button>`)||($('#ok').onclick=()=>{ if(!fieldErr($('#cf'),$('#cf').value!==S.company.name?'El nombre no coincide':''))return; closeLayer(); toast('En el prototipo no se elimina nada'); })); }
  on('#nws',()=>wsModal());
  $$('[data-sw]').forEach(b=>b.onclick=()=>{S.ws=+b.dataset.sw;render();toast(`Workspace activo: ${S.workspaces[S.ws].name}`)});
  $$('[data-rn]').forEach(b=>b.onclick=()=>wsModal(+b.dataset.rn));
  on('#nbr',()=>brandModal()); on('#nbr2',()=>brandModal());
  $$('[data-eb]').forEach(b=>b.onclick=()=>brandModal(+b.dataset.eb));
  $$('[data-ab]').forEach(b=>b.onclick=()=>{S.brand=+b.dataset.ab;render();toast(`Marca activa: ${S.brands[S.brand].name}`)});
  on('#ninv',()=>inviteModal());
  $$('[data-role]').forEach(s=>s.onchange=()=>{const m=S.members[+s.dataset.role];const old=m.role;m.role=s.value;toast(`${m.email} ahora es ${m.role}`,()=>{m.role=old;render()})});
  $$('[data-mm]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.mm, m=S.members[i];
    const mn=popMenu(b,`${m.status!=='Activo'?`<button class="menu-item" data-x="re">${ic('refresh')}<span class="grow">Reenviar invitación</span></button>`:''}<button class="menu-item" data-x="rm" style="color:var(--danger)">${ic('trash')}<span class="grow">${m.status==='Activo'?'Quitar de la empresa':'Cancelar invitación'}</span></button>`,'right');
    const re=mn.querySelector('[data-x=re]'); if(re) re.onclick=()=>{closeLayer();toast(`Invitación reenviada a ${m.email}`)};
    mn.querySelector('[data-x=rm]').onclick=()=>{ closeLayer(); modal(m.status==='Activo'?'¿Quitar a esta persona?':'¿Cancelar la invitación?',`<p>${esc(m.email)} va a perder el acceso a ${esc(S.company.name)}.</p>`,`<button class="btn" data-close>Volver</button><button class="btn btn-danger" id="ok">${m.status==='Activo'?'Quitar':'Cancelar invitación'}</button>`);
      $('#ok').onclick=()=>{ S.members.splice(i,1); closeLayer(); render(); toast('Listo',()=>{S.members.splice(i,0,m);render()}); }; }; });
  on('#nrole',()=>{ modal('Crear rol',`${F('rn','Nombre del rol','placeholder="Ej.: Community manager"')}<div class="field"><label for="rb">Partir de</label><select class="select" id="rb">${ROLES.slice(1).map(r=>`<option>${r}</option>`).join('')}</select><span class="hint">Después ajustás cada permiso.</span></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Crear rol</button>`);
    $('#ok').onclick=()=>{ if(!fieldErr($('#rn'),!$('#rn').value.trim()?'Ingresá un nombre':''))return; closeLayer(); toast(`Rol "${$('#rn')?.value||'nuevo'}" creado (simulado)`); }; });
  $$('[data-th]').forEach(b=>b.onclick=()=>setTheme(b.dataset.th));
  on('#psave',()=>{S.prefsSaved=true;toast('Preferencias guardadas')}); on('#cpw',changePw);
  $$('[data-int]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.int, [n,d,c,l]=INTS[i];
    if(S.integrations[i]){ modal('¿Desconectar?',`<p>Brandazo deja de sincronizar datos de <b>${n}</b>. Lo que ya se importó se conserva.</p>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-danger" id="ok">Desconectar</button>`); $('#ok').onclick=()=>{S.integrations[i]=false;closeLayer();render();toast(`${n} desconectada`)}; return; }
    modal(`Conectar ${n}`,`<div class="ent-top" style="margin-bottom:16px"><div class="mark" style="background:var(--surface-sunken);color:var(--ink)">${l}</div><span class="slash">⟷</span><div class="mark" style="background:var(--negro);color:var(--magenta)">/</div></div>
     <p style="margin-bottom:12px">Brandazo va a poder:</p><div class="feat" style="grid-template-columns:1fr;margin:0 0 16px"><div>${ic('check')} Leer ${d.toLowerCase()}</div><div>${ic('check')} Recibir avisos cuando algo cambia</div></div>
     <p class="small muted">Vas a autorizar el acceso en ${n.split(' ')[0]}. Podés desconectarla cuando quieras.</p>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Continuar a ${n.split(' (')[0]}</button>`);
    $('#ok').onclick=e=>{ e.target.classList.add('is-loading'); setTimeout(()=>{ S.integrations[i]=true; logAct(`Conectaste ${n}`); notify(`${n} conectada`,'La primera sincronización puede tardar unos minutos.'); closeLayer(); render(); toast(`${n} conectada`); },900); }; });
}
function wsModal(i){ const edit=i!=null;
  modal(edit?'Renombrar workspace':'Nuevo workspace',F('wnm','Nombre',`value="${edit?esc(S.workspaces[i].name):''}" placeholder="${S.user.type==='agencia'?'Ej.: Cliente Café del Centro':'Ej.: Equipo comercial'}"`),`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">${edit?'Guardar':'Crear workspace'}</button>`);
  $('#ok').onclick=()=>{ const v=$('#wnm').value.trim(); if(!fieldErr($('#wnm'),!v?'Ingresá un nombre':S.workspaces.some((w,j)=>j!==i&&w.name.toLowerCase()===v.toLowerCase())?'Ya existe un workspace con ese nombre':''))return;
    if(edit) S.workspaces[i].name=v; else { S.workspaces.push({name:v}); logAct(`Creaste el workspace ${v}`); } closeLayer(); render(); toast(edit?'Workspace renombrado':`Workspace ${v} creado`); };
}
function brandModal(i){ const edit=i!=null; const b=edit?S.brands[i]:{name:'',color:COLORS[2]}; let color=b.color;
  modal(edit?'Editar marca':'Nueva marca',`${F('bnm','Nombre de la marca',`value="${esc(b.name)}" placeholder="Ej.: Café del Centro"`)}<div class="field"><span class="label">Color</span><div class="swatches">${COLORS.map(c=>`<button type="button" class="swatch" style="background:${c}" data-c="${c}" aria-pressed="${c===color}" aria-label="Color ${c}"></button>`).join('')}</div></div><div class="field"><span class="label">Logo (opcional)</span><div class="upload">${ic('upload')} Subir logo</div></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">${edit?'Guardar':'Crear marca'}</button>`);
  $$('#layer [data-c]').forEach(s=>s.onclick=()=>{$$('#layer [data-c]').forEach(x=>x.setAttribute('aria-pressed','false'));s.setAttribute('aria-pressed','true');color=s.dataset.c});
  $('#ok').onclick=()=>{ const v=$('#bnm').value.trim(); if(!fieldErr($('#bnm'),!v?'Ingresá el nombre de la marca':''))return;
    if(edit){S.brands[i]={name:v,color}} else {S.brands.push({name:v,color}); S.brand=S.brands.length-1; logAct(`Creaste la marca ${v}`);} closeLayer(); render(); toast(edit?'Marca actualizada':`Marca ${v} creada`); };
}
function inviteModal(){
  modal('Invitar al equipo',`<p class="small muted" style="margin-bottom:16px">Les llega un email para crear su contraseña. Entran directo con el rol que elijas.</p><div id="rows">${inviteRow('','Marketing')}</div><button type="button" class="btn btn-ghost btn-sm" id="addrow">${ic('plus')} Agregar otra persona</button>
  <details style="margin-top:16px"><summary class="small" style="cursor:pointer;font-weight:500">¿Qué puede hacer cada rol?</summary>${roleSummary()}</details>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Enviar invitaciones</button>`);
  const bindRm=()=>$$('#layer [data-rm]').forEach(b=>b.onclick=()=>{ if($$('#layer .invite-row').length>1) b.closest('.invite-row').remove(); });
  bindRm(); $('#addrow').onclick=()=>{ $('#rows').insertAdjacentHTML('beforeend',inviteRow('','Marketing')); bindRm(); };
  $('#ok').onclick=()=>{ const list=[]; let bad=false;
    $$('#layer .invite-row').forEach(r=>{const i=r.querySelector('input');const v=i.value.trim();i.style.borderColor='';if(!v)return;if(!emailOk(v)||S.members.some(m=>m.email===v)){bad=true;i.style.borderColor='var(--danger)'}else list.push({name:'',email:v,role:r.querySelector('select').value,status:'Pendiente'})});
    if(bad) return toast('Revisá los emails marcados: formato inválido o ya invitados'); if(!list.length) return toast('Escribí al menos un email');
    S.members.push(...list); list.forEach(m=>logAct(`Invitaste a ${m.email} como ${m.role}`)); closeLayer(); render(); toast(list.length>1?`${list.length} invitaciones enviadas`:`Invitación enviada a ${list[0].email}`); };
}

/* ===================== Mapa del prototipo ===================== */
function vMapa(){
  const g=(t,ls)=>`<div class="card"><h3>${t}</h3><ul>${ls.map(([h,l])=>`<li><a href="${h}">${l}</a></li>`).join('')}</ul></div>`;
  return `<div class="map"><div class="map-hero"><div>${LOGO_WHITE}<h1 style="margin-top:20px">Prototipo · Core y Marketing</h1><p>Módulos 01 a 06: administración general, estrategia, contenidos, campañas, redes sociales y marca. La empresa de ejemplo tiene datos ficticios; nada se guarda al recargar.</p></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-primary" href="#/registro">Empezar el recorrido</a><a class="btn" style="background:transparent;color:#fff;border-color:#74747F" href="#/login">Iniciar sesión</a></div></div>
  <div class="map-grid four">${g('Acceso',[['#/login','Login'],['#/registro','Registro'],['#/verificar','Verificar email'],['#/recuperar','Recuperar contraseña'],['#/nueva-clave','Nueva contraseña']])}
  ${g('Onboarding',STEPS.map((s,i)=>['#/onboarding/'+(i+1),`${i+1}. ${s}`]))}
  ${g('Marketing',[['#/app/estrategia','02 · Estrategia y planificación'],['#/app/contenidos','03 · Contenidos (calendario)'],['#/app/contenidos/lista','03 · Contenidos (lista)'],['#/app/campanas','04 · Campañas'],['#/app/redes','05 · Redes sociales'],['#/app/marca','06 · Marca']])}
  ${g('Core · Aplicación',[['#/app/inicio','Dashboard inicial'],['#/app/config/plan','Plan y facturación'],['#/app/config/seguridad','Seguridad y aislamiento'],['#/app/config/empresa','Configuración · Empresa'],['#/app/config/workspaces','Workspaces'],['#/app/config/marcas','Marcas'],['#/app/config/usuarios','Usuarios'],['#/app/config/roles','Roles y permisos'],['#/app/config/preferencias','Preferencias'],['#/app/config/integraciones','Integraciones'],['#/app/crm','Módulo «Próximamente»'],['#/ui-kit','UI Kit']])}</div>
  <p class="small muted" style="margin-top:24px">Probá: escribir <span class="slash">/</span> o ⌘K para la barra de comandos · cambiar de empresa y marca desde el selector · achicar la ventana para ver tablet y móvil.</p></div>`;
}

/* ===================== UI Kit ===================== */
function vKit(){
  const st=(lbl,html)=>`<div class="kit-state">${html}<small>${lbl}</small></div>`;
  const sec=(t,d,html)=>`<section class="kit-sec"><h2>${t}</h2><p class="muted small">${d}</p>${html}</section>`;
  const sw=(n,v,dark='')=>`<div class="sw"><i style="background:var(--${v});${dark}"></i><div><b>${n}</b><div class="mono muted">--${v}</div></div></div>`;
  return `<div class="page-head"><div><nav class="breadcrumbs"><a href="#/mapa">Mapa de pantallas</a>${ic('chevr')}<span>UI Kit</span></nav><h1 style="margin-top:4px">UI Kit inicial</h1><p class="muted">Componentes del Core SaaS con sus estados, sobre el fondo negro de la marca.</p></div></div>
  ${sec('Color','Tokens semánticos: el código usa estos nombres, nunca valores hex.',`<div class="swatch-row">${sw('Superficie','surface')}${sw('Elevada','surface-raised')}${sw('Línea','line')}${sw('Tinta','ink')}${sw('Tinta secundaria','ink-muted')}${sw('Magenta','magenta')}${sw('Magenta texto','magenta-text')}${sw('Éxito','success')}${sw('Advertencia','warning')}${sw('Error','danger')}</div>`)}
  ${sec('Tipografía','Inter Tight para títulos, Inter para interfaz, Geist Mono para comandos y cifras.',`<div class="card" style="margin-top:16px;display:flex;flex-direction:column;gap:12px"><div style="font-family:var(--font-display);font-size:44px;line-height:48px;font-weight:800;letter-spacing:-.035em">Display 44</div><h1>Título 30 · Inter Tight</h1><h2>Título de página 22 · Inter</h2><h3>Título de tarjeta 16</h3><p>Texto 14 · Cada contacto, con toda su historia.</p><p class="small muted">Pequeño 13 · Actualizado hace 5 minutos</p><p class="mono">Mono 14 · $ 4.820.350 · <span class="slash">/</span>nueva campaña</p></div>`)}
  ${sec('Botones','Un solo primario por vista. Estados: default, hover, focus, active, disabled, loading.',`${['btn-primary','','btn-ghost','btn-danger'].map(v=>`<div class="kit-row">${st('default',`<button class="btn ${v}">Acción</button>`)}${st('hover',`<button class="btn ${v} f-hover">Acción</button>`)}${st('focus',`<button class="btn ${v} f-focus">Acción</button>`)}${st('active',`<button class="btn ${v} f-active f-hover">Acción</button>`)}${st('disabled',`<button class="btn ${v}" disabled>Acción</button>`)}${st('loading',`<button class="btn ${v} is-loading">Acción</button>`)}</div>`).join('')}
   <div class="kit-row">${st('sm',`<button class="btn btn-primary btn-sm">Guardar</button>`)}${st('icono',`<button class="icon-btn" aria-label="Notificaciones">${ic('bell')}<span class="dot"></span></button>`)}${st('con ícono',`<button class="btn">${ic('plus')} Nuevo</button>`)}</div>`)}
  ${sec('Inputs','Etiqueta siempre visible; error debajo del campo con ícono y texto.',`<div class="kit-row" style="align-items:flex-start">${[['default',''],['hover','f-hover'],['focus','f-focus']].map(([l,c])=>`<div style="width:220px"><div class="field"><label>Email</label><input class="input ${c}" placeholder="nombre@empresa.com"><span class="hint">${l}</span></div></div>`).join('')}
   <div style="width:220px"><div class="field has-error"><label>Email</label><input class="input" value="melina@"><span class="err">${ic('alert')}Revisá el formato del email</span></div></div>
   <div style="width:220px"><div class="field is-valid"><label>Email</label><input class="input" value="melina@estudionorte.com"><span class="hint" style="color:var(--success)">success</span></div></div>
   <div style="width:220px"><div class="field"><label>Empresa</label><input class="input" value="Estudio Norte" disabled><span class="hint">disabled</span></div></div>
   <div style="width:220px"><div class="field"><label>Cargando</label><div class="skeleton" style="height:40px"></div><span class="hint">loading</span></div></div></div>`)}
  ${sec('Selección','Select, checkbox, radio y switch.',`<div class="kit-row" style="align-items:flex-start;gap:32px"><div style="width:220px"><div class="field"><label>Rol</label><select class="select"><option>Marketing</option><option>Ventas</option></select></div><div class="field"><label>Deshabilitado</label><select class="select" disabled><option>Dueño</option></select></div></div>
   <div style="display:flex;flex-direction:column;gap:12px"><label class="check"><input type="checkbox"> Sin marcar</label><label class="check"><input type="checkbox" checked> Marcado</label><label class="check"><input type="checkbox" disabled> Deshabilitado</label></div>
   <div style="display:flex;flex-direction:column;gap:12px" role="radiogroup"><label class="radio"><input type="radio" name="r" checked> Emprendedor</label><label class="radio"><input type="radio" name="r"> Empresa</label><label class="radio"><input type="radio" name="r" disabled> Deshabilitado</label></div>
   <div style="display:flex;flex-direction:column;gap:12px"><label class="switch"><input type="checkbox" checked> Activado</label><label class="switch"><input type="checkbox"> Desactivado</label><label class="switch"><input type="checkbox" disabled> Deshabilitado</label></div></div>`)}
  ${sec('Badges y alertas','Siempre ícono + texto: el color nunca es la única señal.',`<div class="kit-row"><span class="badge">Neutro</span><span class="badge badge-brand">Sugerido por IA</span><span class="badge badge-ok">Activo</span><span class="badge badge-warn">Pendiente</span><span class="badge badge-err">Error</span><span class="badge">Próximamente</span></div>
   <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px;max-width:640px"><div class="alert alert-info">${ic('info')}<div><b>Información.</b> Esta cifra es estimada.</div></div><div class="alert alert-ok">${ic('check')}<div><b>Listo.</b> Tu espacio está configurado.</div></div><div class="alert alert-warn">${ic('alert')}<div><b>Atención.</b> La invitación vence mañana.</div></div><div class="alert alert-err">${ic('alert')}<div><b>No pudimos conectar Mercado Pago.</b> Revisá los permisos y probá de nuevo.</div></div></div>`)}
  ${sec('Overlays','Modal, toast, tooltip, menú y panel lateral.',`<div class="kit-row"><button class="btn" id="km">Abrir modal</button><button class="btn" id="kt">Mostrar toast</button><button class="btn" id="kmn">Abrir menú</button><button class="btn" id="kd">Abrir panel lateral</button><span class="tooltip" tabindex="0"><span class="btn">Pasá el mouse</span><span role="tooltip">Tooltip con ayuda breve</span></span></div>`)}
  ${sec('Navegación','Tabs, breadcrumbs y paginación.',`<div class="tabs" style="margin-top:16px"><button class="tab" aria-selected="true">Empresa</button><button class="tab" aria-selected="false">Usuarios</button><button class="tab" aria-selected="false">Roles</button></div>
   <div class="kit-row" style="justify-content:space-between"><nav class="breadcrumbs"><a href="#/ui-kit">Configuración</a>${ic('chevr')}<a href="#/ui-kit">Usuarios</a>${ic('chevr')}<span>Juan</span></nav><div class="pagination"><button class="page" aria-label="Anterior">‹</button><button class="page" aria-current="page">1</button><button class="page">2</button><button class="page">3</button><button class="page" aria-label="Siguiente">›</button></div></div>`)}
  ${sec('Tabla y tarjetas','Encabezados en mayúscula chica, cifras en mono a la derecha.',`<div class="table-wrap" style="margin-top:16px"><table class="t"><thead><tr><th>Persona</th><th>Rol</th><th>Estado</th><th class="num">Leads</th></tr></thead><tbody>
   <tr><td><div class="person"><span class="avatar">MG</span><b>Melina Galli</b></div></td><td>Dueño</td><td><span class="badge badge-ok">Activo</span></td><td class="num">128</td></tr><tr><td><div class="person"><span class="avatar">JR</span><b>Juan Rossi</b></div></td><td>Ventas</td><td><span class="badge badge-warn">Pendiente</span></td><td class="num">—</td></tr>
   <tr><td><div class="skeleton" style="height:14px;width:140px"></div></td><td><div class="skeleton" style="height:14px;width:70px"></div></td><td><div class="skeleton" style="height:14px;width:60px"></div></td><td><div class="skeleton" style="height:14px;width:30px;margin-left:auto"></div></td></tr></tbody></table></div>
   <div class="cards" style="margin-top:16px"><div class="card empty"><div class="eico">${ic('users')}</div><b>Estado vacío</b><p class="small muted">Explica qué va acá y ofrece una acción.</p><button class="btn btn-primary btn-sm">Invitar</button></div>
   <div class="card"><div class="kpi" style="border:0;padding:0;min-height:0"><span class="k-l">Indicador sin datos</span><span class="k-v">—</span><span class="small muted">Nunca mostramos cifras de ejemplo</span></div></div></div>`)}`;
}
function bKit(){
  $('#km').onclick=()=>modal('Título del modal','<p>Contenido breve. Esc o clic afuera para cerrar.</p>','<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-close>Confirmar</button>');
  $('#kt').onclick=()=>toast('Cambios guardados',()=>{});
  $('#kmn').onclick=e=>{const m=popMenu(e.currentTarget,`<button class="menu-item">${ic('refresh')}<span class="grow">Reenviar</span></button><button class="menu-item" style="color:var(--danger)">${ic('trash')}<span class="grow">Eliminar</span></button>`);m.querySelectorAll('button').forEach(b=>b.onclick=closeLayer)};
  $('#kd').onclick=()=>drawer(`<div class="modal-head" style="padding:20px"><h3>Panel lateral</h3><button class="icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div><p class="muted" style="padding:0 20px">Para detalle sin perder la lista: contacto, notificaciones, configuración de un nodo.</p>`);
}

/* ===================== Router ===================== */
/* En la nube, no se dibuja nada hasta que cargue 6-nube.js (evita crear la empresa de ejemplo antes de saber quién entró) */
const BZ_CLOUD=(()=>{ try{ return !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)||/[?&]emu=1\b/.test(location.search)||sessionStorage.getItem('bz-emu')==='1'; }catch(e){ return true; } })();
function render(){
  if(BZ_CLOUD&&!window.cloudGate) return;
  persist();
  if(window.cloudGate&&window.cloudGate()) return;
  const h=location.hash.replace(/^#\/?/,''); const [a,b,c]=h.split('/');
  const root=$('#root'); window.scrollTo(0,0); closeLayer();
  const auth={login:[vLogin,bLogin],registro:[vRegistro,bRegistro],verificar:[vVerificar,bVerificar],recuperar:[vRecuperar,bRecuperar],'recuperar-enviado':[vRecEnviado,()=>{}],'nueva-clave':[vNuevaClave,bNuevaClave]};
  if(auth[a]){ root.innerHTML=auth[a][0](); auth[a][1](); document.title='Brandazo · '+a; return; }
  if(a==='onboarding'){ if(+b>1&&!S.user.name){ S.user.name='Melina Galli'; S.user.type='agencia'; } if(+b>2&&!S.company){ S.company={name:'Estudio Norte',country:'Argentina',size:'2 a 10',industry:''}; S.companies=[S.company]; S.members=[{name:S.user.name,email:S.user.email||'melina@estudionorte.com',role:'Dueño',status:'Activo'}]; } if(+b>3&&!S.workspaces.length) S.workspaces=[{name:'General'}]; if(+b>4&&!S.brands.length){S.brands=[{name:S.company.name,color:COLORS[0]}];S.brand=0;}
    root.innerHTML=vOnboarding(b); bOnboarding(b); document.title='Brandazo · Onboarding'; return; }
  if(a==='app'||a==='ui-kit'){ seedIfEmpty();
    if(a==='ui-kit'){ root.innerHTML=shell('','UI Kit',vKit()); bindShell(); bKit(); return; }
    if(b==='config'){ root.innerHTML=shell('config','Configuración',vConfig(c)); bindShell(); bConfig(c); return; }
    if(VIEWS[b]){ const v=VIEWS[b]; root.innerHTML=shell(b,v.t,v.view(c)); bindShell(); v.bind(c); document.title='Brandazo · '+v.t; return; }
    if(MOD[b]){ root.innerHTML=shell(b,MOD[b].t,vSoon(b)); bindShell(); bSoon(b); return; }
    root.innerHTML=shell('inicio','Inicio',vInicio()); bindShell(); bInicio(); document.title='Brandazo · Inicio'; return; }
  if(a==='mapa'){ root.innerHTML=vMapa(); document.title='Brandazo · Mapa de pantallas'; return; }
  location.replace('#/login');
}
document.addEventListener('keydown',e=>{
  const typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if(((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k')||(e.key==='/'&&!typing)){ if(!$('#cmdk')) return; e.preventDefault(); if(!$('#layer .cmd')) cmdPalette(); }
});
document.documentElement.dataset.theme='dark'; /* Brandazo: fondo negro siempre */
window.addEventListener('hashchange',render);
