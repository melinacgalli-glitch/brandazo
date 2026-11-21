/* =====================================================================
   GUARDADO CLARO EN TODO EL SITIO
   Formularios de página (no ventanas): después de guardar se cierran y quedan en MODO LECTURA
   (los datos como texto, botón «Editar») con el aviso «Cambios guardados». Mientras se edita:
   «Cancelar» y «Guardar». Si no hay datos todavía, el formulario arranca abierto.
   Formularios: Marca → Información general (#fbr), Configuración → Empresa (#fe),
   Estrategia → Posicionamiento (#fpos).
   ===================================================================== */
const RO_FORMS={fbr:'Información de la marca',fe:'Datos de la empresa',fpos:'Posicionamiento'};
const RO={edit:{},saved:{}};
const roKey=id=>`${id}:${S.company?S.company.tid||S.company.name:''}:${S.brand}`;
function roValue(el){
  if(el.tagName==='SELECT') return el.selectedIndex>=0?el.options[el.selectedIndex].text:'';
  if(el.type==='checkbox') return el.checked?'Sí':'No';
  if(el.type==='date'&&el.value){ const [y,m,d]=el.value.split('-'); return `${d}/${m}/${y}`; }
  return el.value||'';
}
function roApply(){
  Object.keys(RO_FORMS).forEach(id=>{
    const f=document.getElementById(id); if(!f||f.dataset.roDone) return; f.dataset.roDone='1';
    const key=roKey(id), ctrls=[...f.querySelectorAll('.field input:not([type=hidden]), .field textarea, .field select')];
    const submit=f.querySelector('button.btn-primary:not([type=button])')||f.querySelector('button:not([type=button])');
    // Marca de «se intentó guardar»: si después se redibuja la pantalla, fue un guardado válido
    f.addEventListener('submit',()=>{ RO.saved[key]=Date.now(); RO.edit[key]=false; },true);
    const justSaved=RO.saved[key]&&Date.now()-RO.saved[key]<2500;
    // En formularios de dos columnas (grid) el aviso y «Editar» van dentro de la primera tarjeta, no como columnas sueltas
    const host=f.classList.contains('grid')?(f.querySelector('section.card')||f):f, head=host.querySelector('.card-head');
    const putTop=html=>{ if(head) head.insertAdjacentHTML('afterend',html); else host.insertAdjacentHTML('afterbegin',html); };
    if(justSaved){ RO.saved[key]=0; putTop(`<div class="alert alert-ok form-saved" role="status">${ic('check')}<div><b>Cambios guardados.</b> ${S.company&&S.company.cloud?'Quedaron en la nube y los ve tu equipo.':'Quedaron guardados en este navegador.'}</div></div>`); }
    const hasData=ctrls.some(c=>c.type!=='checkbox'&&String(c.value||'').trim());
    if(RO.edit[key]||!hasData){
      // Modo edición: «Cancelar» al lado de «Guardar» (si ya había datos)
      if(hasData&&submit&&!f.querySelector('[data-rocancel]')){ submit.insertAdjacentHTML('beforebegin',`<button type="button" class="btn" data-rocancel style="margin-right:8px">Cancelar</button>`);
        f.querySelector('[data-rocancel]').onclick=()=>{ RO.edit[key]=false; render(); }; }
      return;
    }
    // Modo lectura
    ctrls.forEach(c=>{ const v=roValue(c).trim(); const wrap=c.closest('.pw')||c;
      wrap.insertAdjacentHTML('afterend',`<div class="ro-val ${v?'':'empty'}">${v?esc(v):'Sin completar'}</div>`); wrap.style.display='none'; });
    f.querySelectorAll('.field label').forEach(l=>l.removeAttribute('for'));
    if(submit) submit.style.display='none';
    if(head) head.insertAdjacentHTML('beforeend',`<button type="button" class="btn btn-sm" data-roedit>${ic('edit')} Editar</button>`);
    else host.insertAdjacentHTML('afterbegin',`<div class="form-head-actions"><button type="button" class="btn" data-roedit>${ic('edit')} Editar</button></div>`);
    f.querySelector('[data-roedit]').onclick=()=>{ RO.edit[key]=true; render(); setTimeout(()=>{ const first=document.querySelector(`#${id} .field input:not([type=hidden]), #${id} .field textarea`); if(first) first.focus(); },50); };
  });
}
function roStatement(){ ['fpos','fposm'].forEach(id=>{ const f=document.getElementById(id); if(!f) return; const big=f.querySelector('.statement'), ta=f.querySelector('#ps,#mps'); if(!big||!ta) return;
  const reading=!!f.querySelector('[data-roedit]'), fld=ta.closest('.field'); if(reading){ if(fld) fld.style.display='none'; } else big.style.display='none'; }); }
new MutationObserver(()=>{ roApply(); roStatement(); }).observe(document.getElementById('root'),{childList:true});
roApply(); roStatement();

/* Preferencias (no es un formulario): mismo aviso visible */
(function(){ const _b=bConfig; bConfig=function(tab){ _b(tab); const b=$('#psave'); if(!b) return; const prev=b.onclick;
  b.onclick=e=>{ prev&&prev(e); b.insertAdjacentHTML('beforebegin',`<span class="small" style="color:var(--success);margin-right:12px" role="status">${ic('check')} Preferencias guardadas</span>`); b.disabled=true; setTimeout(()=>{ b.disabled=false; },1200); }; }; })();

/* ---------- Versión nueva publicada: avisar para actualizar ---------- */
(function(){
  const mine=(document.querySelector('script[src*="11-guardado.js"]')||{}).src||''; const cur=(mine.match(/v=([\d.]+)/)||[])[1];
  if(!cur||!/^https?:/.test(location.protocol)) return;
  let shown=false;
  const check=async()=>{ if(shown||document.hidden) return;
    try{ const r=await fetch('/version.json?t='+Date.now(),{cache:'no-store'}); if(!r.ok) return; const j=await r.json();
      if(j.v&&j.v!==cur){ shown=true; const el=document.createElement('div'); el.className='toast update-bar'; el.setAttribute('role','status');
        el.innerHTML=`${ic('refresh')}<span>Hay una versión nueva de Brandazo.</span><button type="button">Actualizar</button>`;
        el.querySelector('button').onclick=()=>{ try{ if(window.cloudSave) window.cloudSave(); }catch(e){} setTimeout(()=>location.reload(),400); };
        $('#toasts').appendChild(el); } }catch(e){} };
  setInterval(check,5*60*1000); document.addEventListener('visibilitychange',check); setTimeout(check,15000);
})();
