/* =====================================================================
   MARCA · ARCHIVOS REALES (Firebase Storage, solo empresas en la nube)
   - Identidad visual: 4 logos (principal, sobre oscuro, sobre color, isotipo).
   - Biblioteca: imágenes, videos, PDF, documentos, plantillas y tipografías (hasta 25 MB c/u).
   - Archivos en tenants/{tid}/marcas/{marca}/…; sus datos (nombre, tipo, tamaño, dirección) en el kit de la marca.
   - En el prototipo local (sin nube) sigue la simulación de siempre.
   ===================================================================== */
const fbSt=(CLOUD.on&&window.firebase&&firebase.storage)?firebase.storage():null;
if(fbSt&&CLOUD.emu) fbSt.useEmulator('127.0.0.1',9199);
const FILE_MAX=25*1024*1024;
const FILE_CATS=['Logos','Fotos','Videos','Documentos','Plantillas','Tipografías'];
const LOGO_SLOTS=[['principal','Principal','var(--surface-raised)'],['oscuro','Sobre oscuro','#0E0E10'],['color','Sobre color',null],['isotipo','Isotipo','var(--surface-raised)']];
const fileSlug=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9.]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'archivo';
const fileKind=t=>/^image\//.test(t)?'image':/^video\//.test(t)?'video':'file';
const fileCatFor=(t,n)=>/^image\//.test(t)?'Fotos':/^video\//.test(t)?'Videos':/font|\.(otf|ttf|woff2?)$/i.test(t+' '+n)?'Tipografías':/pdf|word|document|sheet|excel|presentation|powerpoint|text/.test(t)?'Documentos':'Plantillas';
const fileSize=b=>b>=1048576?(b/1048576).toLocaleString('es-AR',{maximumFractionDigits:1})+' MB':Math.max(1,Math.round(b/1024))+' KB';
const cloudCo=()=>!!(S.company&&S.company.cloud&&fbSt);
const isFileObj=f=>f&&!Array.isArray(f)&&(f.path||f.link);
const linkHost=u=>{ try{ return new URL(u).hostname.replace(/^www\./,''); }catch(e){ return ''; } };
const linkLabel=u=>{ const h=linkHost(u); return /drive\.google|docs\.google/.test(h)?'Google Drive':/dropbox/.test(h)?'Dropbox':/onedrive|sharepoint|1drv/.test(h)?'OneDrive':/canva/.test(h)?'Canva':/figma/.test(h)?'Figma':h; };

/* Sube un archivo y devuelve sus datos. onProgress(0..1) */
function uploadBrandFile(brand,file,onProgress){
  return new Promise((resolve,reject)=>{
    if(file.size>FILE_MAX) return reject(new Error(`«${file.name}» pesa ${fileSize(file.size)}: el máximo es 25 MB.`));
    const path=`tenants/${S.company.tid}/marcas/${fileSlug(brand.name)}/${Date.now()}-${fileSlug(file.name)}`;
    const ref=fbSt.ref(path), task=ref.put(file,{contentType:file.type||'application/octet-stream',customMetadata:{nombre:file.name,subidoPor:S.user.name||C.user.email}});
    task.on('state_changed',s=>onProgress&&onProgress(s.bytesTransferred/(s.totalBytes||1)),e=>reject(new Error(e.code==='storage/unauthorized'?`«${file.name}»: ese tipo de archivo no está permitido o no tenés permiso.`:`«${file.name}» no se pudo subir. Probá de nuevo.`)),
      async()=>{ try{ const url=await ref.getDownloadURL(); resolve({id:uid(),name:file.name,path,url,contentType:file.type||'',size:file.size,at:new Date().toISOString(),by:S.user.name||C.user.email}); }catch(e){ reject(e); } });
  });
}
async function deleteBrandFile(f){ try{ await fbSt.ref(f.path).delete(); }catch(e){ if(e.code!=='storage/object-not-found') throw e; } }

/* ---------- Pantallas ---------- */
function logosHtml(b,k){
  k.logos=k.logos||{};
  return `<h3 style="margin-bottom:4px">Logotipos</h3><p class="small muted" style="margin-bottom:12px">PNG, SVG o JPG. Usá fondo transparente cuando puedas.</p><div class="kit-grid" style="margin-bottom:24px">${LOGO_SLOTS.map(([id,n,bg])=>{ const l=k.logos[id];
    return `<div class="logo-card"><div class="art" style="background:${bg||b.color}">${l?`<img src="${esc(l.url)}" alt="Logo ${esc(n)} de ${esc(b.name)}" style="max-width:80%;max-height:84px;object-fit:contain">`:`<span class="small" style="color:${id==='oscuro'||!bg?'#fff':'var(--ink-muted)'};font-family:var(--font-body);font-weight:500;letter-spacing:0">Sin logo</span>`}</div>
    <div class="cap"><span>${n}</span><span style="display:flex;gap:4px">${l?`<a class="icon-btn" style="width:28px;height:28px" href="${esc(l.url)}" target="_blank" rel="noopener" aria-label="Descargar logo ${n}">${ic('download')}</a><button class="icon-btn" style="width:28px;height:28px" data-logodel="${id}" aria-label="Quitar logo ${n}">${ic('trash')}</button>`:''}<button class="btn btn-sm" data-logo="${id}">${l?'Cambiar':'Subir'}</button></span></div></div>`; }).join('')}</div>`;
}
function assetCloud(f){
  if(f.link) return `<div class="asset"><a class="pv" href="${esc(f.url)}" target="_blank" rel="noopener" style="background:var(--negro);text-decoration:none;flex-direction:column;gap:6px" aria-label="Abrir ${esc(f.name)} (${esc(linkLabel(f.url))})">${ic('link')}<span class="small" style="color:#fff">${esc(linkLabel(f.url))}</span></a>
   <div class="meta"><b title="${esc(f.name)}">${esc(f.name)}</b><span class="muted" style="display:flex;justify-content:space-between;align-items:center;gap:4px">${esc(f.cat)} · enlace<button class="icon-btn" style="width:24px;height:24px" data-fdel="${f.id}" aria-label="Quitar ${esc(f.name)}">${ic('trash')}</button></span></div></div>`;
  const kind=fileKind(f.contentType);
  return `<div class="asset"><a class="pv" href="${esc(f.url)}" target="_blank" rel="noopener" style="background:${kind==='image'?'var(--surface-sunken)':kind==='video'?'#0E0E10':'#5C5C66'};text-decoration:none" aria-label="Abrir ${esc(f.name)}">${kind==='image'?`<img src="${esc(f.url)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover">`:ic(kind==='video'?'video':'file')}</a>
   <div class="meta"><b title="${esc(f.name)}">${esc(f.name)}</b><span class="muted" style="display:flex;justify-content:space-between;align-items:center;gap:4px">${esc(f.cat)} · ${fileSize(f.size)}<button class="icon-btn" style="width:24px;height:24px" data-fdel="${f.id}" aria-label="Borrar ${esc(f.name)}">${ic('trash')}</button></span></div></div>`;
}
function biblioHtml(k){
  const files=k.files.filter(isFileObj), cats=FILE_CATS.filter(c=>files.some(f=>f.cat===c)), fl=files.filter(f=>!libFilter||f.cat===libFilter);
  return `<div class="toolbar"><div class="seg"><button data-lf="" aria-pressed="${!libFilter}">Todos · ${files.length}</button>${cats.map(c=>`<button data-lf="${c}" aria-pressed="${libFilter===c}">${c}</button>`).join('')}</div><span class="grow"></span><button class="btn" id="lnk2">${ic('link')} Agregar enlace</button><button class="btn btn-primary" id="upl2">${ic('upload')} Subir archivos</button></div>
  ${fl.length?`<div class="lib">${fl.map(assetCloud).join('')}</div>`:`<div class="card empty"><div class="eico">${ic('image')}</div><h3>${files.length?'No hay archivos en esta categoría':'Biblioteca vacía'}</h3><p class="muted small">Subí logos, fotos, videos, documentos, plantillas y tipografías (hasta 25 MB cada uno), o agregá el enlace a una carpeta de Drive, Dropbox u otra nube. Los ve todo tu equipo.</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn" data-lnk2>${ic('link')} Agregar enlace</button><button class="btn btn-primary" data-upl2>${ic('upload')} Subir archivos</button></div></div>`}`;
}

/* ---------- Acciones ---------- */
function pickFiles(multiple,accept){ return new Promise(res=>{ const i=document.createElement('input'); i.type='file'; i.multiple=multiple; if(accept) i.accept=accept; i.onchange=()=>res([...i.files]); i.click(); }); }
async function logoUpload(b,k,slot){
  const [file]=await pickFiles(false,'image/*'); if(!file) return;
  if(!/^image\//.test(file.type)) return toast('El logo tiene que ser una imagen (PNG, SVG o JPG)');
  toast('Subiendo logo…');
  try{ const f=await uploadBrandFile(b,file); const old=k.logos[slot]; k.logos[slot]=f; render(); toast('Logo guardado'); if(old) deleteBrandFile(old).catch(()=>{}); }
  catch(e){ toast(e.message); }
}
function uploadDialog(b,k){
  modal('Subir archivos',`<div class="field"><label for="ucat">Categoría</label><select class="select" id="ucat"><option value="">Automática según el tipo</option>${FILE_CATS.map(c=>`<option>${c}</option>`).join('')}</select></div>
   <div class="upload" id="udrop" role="button" tabindex="0">${ic('upload')} Arrastrá archivos acá o <b>tocá para elegir</b> · hasta 25 MB cada uno</div><ul id="ulist" class="small" style="list-style:none;padding:0;margin:12px 0 0;display:grid;gap:6px"></ul>`,
   `<button class="btn" data-close>Cerrar</button>`);
  let changed=false;
  const go=async files=>{ if(!files.length) return; const list=$('#ulist'), cat=$('#ucat').value; let ok=0;
    for(const file of files){ const li=document.createElement('li'); li.innerHTML=`${esc(file.name)} · <span>0 %</span>`; list.appendChild(li); const pct=li.querySelector('span');
      try{ const f=await uploadBrandFile(b,file,p=>{ pct.textContent=Math.round(p*100)+' %'; }); f.cat=cat||fileCatFor(f.contentType,f.name); k.files.unshift(f); ok++; changed=true; pct.textContent='listo'; pct.style.color='var(--success)'; persist(); }
      catch(e){ pct.textContent=e.message; pct.style.color='var(--danger)'; } }
    if(ok) toast(ok===1?'Archivo subido':`${ok} archivos subidos`); };
  const drop=$('#udrop'); drop.onclick=async()=>go(await pickFiles(true));
  drop.onkeydown=async e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(await pickFiles(true)); } };
  drop.ondragover=e=>{ e.preventDefault(); drop.style.borderColor='var(--magenta)'; }; drop.ondragleave=()=>{ drop.style.borderColor=''; };
  drop.ondrop=e=>{ e.preventDefault(); drop.style.borderColor=''; go([...e.dataTransfer.files]); };
  // Al cerrar la ventana (botón, fondo o Escape) se actualiza la biblioteca si se subió algo
  const obs=new MutationObserver(()=>{ if(!$('#layer').children.length){ obs.disconnect(); if(changed) render(); } }); obs.observe($('#layer'),{childList:true});
}

function linkDialog(b,k){
  modal('Agregar enlace',`<p class="small muted" style="margin-bottom:12px">Para carpetas con muchas fotos o videos: pegá el enlace de Google Drive, Dropbox, OneDrive, Canva u otra nube. Revisá que esté compartido para que tu equipo pueda abrirlo.</p>
   <div class="field"><label for="lkurl">Enlace</label><input class="input" id="lkurl" inputmode="url" placeholder="https://drive.google.com/…"><span class="err" role="alert"></span></div>
   <div class="field"><label for="lkname">Nombre</label><input class="input" id="lkname" maxlength="80" placeholder="Ej.: Fotos de la barra móvil 2026"><span class="err" role="alert"></span></div>
   <div class="field"><label for="lkcat">Categoría</label><select class="select" id="lkcat">${FILE_CATS.map(c=>`<option ${c==='Fotos'?'selected':''}>${c}</option>`).join('')}</select></div>`,
   `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="lkok">Agregar</button>`);
  $('#lkurl').oninput=()=>{ const n=$('#lkname'); if(!n.dataset.touched){ const l=linkLabel($('#lkurl').value.trim()); n.placeholder=l?`Ej.: Carpeta de ${l}`:'Ej.: Fotos de la barra móvil 2026'; } };
  $('#lkname').oninput=e=>{ e.target.dataset.touched='1'; };
  $('#lkok').onclick=()=>{ let u=$('#lkurl').value.trim(); if(u&&!/^https?:\/\//i.test(u)) u='https://'+u;
    let valid=false; try{ const x=new URL(u); valid=/^https?:$/.test(x.protocol)&&x.hostname.includes('.'); }catch(e){}
    let ok=fieldErr($('#lkurl'),!u?'Pegá el enlace':!valid?'Ese enlace no parece válido. Copialo desde el botón «Compartir» de la carpeta.':'');
    const name=$('#lkname').value.trim()||`Carpeta de ${linkLabel(u)}`;
    if(!ok) return;
    if(k.files.some(f=>f.link&&f.url===u)) return fieldErr($('#lkurl'),'Ese enlace ya está en la biblioteca');
    k.files.unshift({id:uid(),name,url:u,link:true,cat:$('#lkcat').value,contentType:'',size:0,at:new Date().toISOString(),by:S.user.name||(C.user&&C.user.email)||''});
    closeLayer(); render(); toast('Enlace agregado a la biblioteca'); };
}

/* ---------- Conexión con la pantalla de Marca ---------- */
(function(){
  if(!CLOUD.on) return;
  const _v=VIEWS.marca.view, _b=VIEWS.marca.bind;
  VIEWS.marca.view=function(tab){
    if(!cloudCo()) return _v.call(this,tab);
    const b=curBrand(); if(!b) return _v.call(this,tab); const k=kitFor(b);
    // La pantalla original solo entiende los archivos simulados del prototipo: se le muestran solo esos
    const all=k.files; let h; k.files=all.filter(f=>Array.isArray(f)); try{ h=_v.call(this,tab); } finally{ k.files=all; }
    if(tab==='identidad'){
      const i=h.indexOf('<h3 style="margin-bottom:12px">Logotipos</h3>'), j=h.indexOf('<div class="card-head"><h3>Colores</h3>');
      if(i>=0&&j>i) h=h.slice(0,i)+logosHtml(b,k)+'\n   '+h.slice(j);
      const r=h.indexOf('<h3 style="margin-bottom:12px">Recursos gráficos</h3>');
      if(r>=0){ const end=h.lastIndexOf('</div></div>'); /* Recursos es lo último de la solapa: se reemplaza hasta el cierre */ const res=k.files.filter(f=>isFileObj(f)&&(f.cat==='Plantillas'||f.cat==='Logos'));
        h=h.slice(0,r)+`<h3 style="margin-bottom:12px">Recursos gráficos</h3>${res.length?`<div class="lib">${res.map(assetCloud).join('')}</div>`:'<p class="small muted">Subí patrones, íconos o plantillas en la Biblioteca (categoría Plantillas o Logos).</p>'}`+h.slice(end); }
    }
    if(tab==='biblioteca'){ const i=h.indexOf('<div class="toolbar">'), j=h.lastIndexOf('</div></div>'); if(i>=0&&j>i) h=h.slice(0,i)+biblioHtml(k)+h.slice(j); }
    return h;
  };
  VIEWS.marca.bind=function(tab){
    _b.call(this,tab); if(!cloudCo()) return;
    const b=curBrand(); if(!b) return; const k=kitFor(b); k.logos=k.logos||{};
    $$('[data-logo]').forEach(x=>x.onclick=()=>logoUpload(b,k,x.dataset.logo));
    $$('[data-logodel]').forEach(x=>x.onclick=()=>{ const id=x.dataset.logodel, l=k.logos[id]; modal('¿Quitar el logo?',`<p>Se borra el archivo <b>${esc(l.name)}</b>.</p>`,`<button class="btn" data-close>Volver</button><button class="btn btn-danger" id="lok">Quitar</button>`);
      $('#lok').onclick=async()=>{ try{ await deleteBrandFile(l); delete k.logos[id]; closeLayer(); render(); toast('Logo quitado'); }catch(e){ toast('No se pudo borrar'); } }; });
    [$('#upl2'),...$$('[data-upl2]')].filter(Boolean).forEach(x=>x.onclick=()=>uploadDialog(b,k));
    [$('#lnk2'),...$$('[data-lnk2]')].filter(Boolean).forEach(x=>x.onclick=()=>linkDialog(b,k));
    $$('[data-fdel]').forEach(x=>x.onclick=()=>{ const f=k.files.find(z=>z.id===x.dataset.fdel); if(!f) return; modal(f.link?'¿Quitar el enlace?':'¿Borrar el archivo?',f.link?`<p>Se quita <b>${esc(f.name)}</b> de la biblioteca. La carpeta en ${esc(linkLabel(f.url))} no se toca.</p>`:`<p><b>${esc(f.name)}</b> se borra para todo el equipo. No se puede deshacer.</p>`,`<button class="btn" data-close>Volver</button><button class="btn btn-danger" id="fok">Borrar</button>`);
      $('#fok').onclick=async()=>{ try{ if(!f.link) await deleteBrandFile(f); k.files=k.files.filter(z=>z!==f); closeLayer(); render(); toast('Archivo borrado'); }catch(e){ toast('No se pudo borrar'); } }; });
    // En la nube, lo que todavía no existe no se simula
    $$('[data-dl]').forEach(x=>x.onclick=()=>toast('La descarga del manual en PDF todavía no está disponible'));
    $$('[data-share]').forEach(x=>x.onclick=()=>toast('Compartir el manual todavía no está disponible'));
  };
})();


/* ---------- Logo al crear o editar una marca (ventana «Nueva marca») ---------- */
(function(){
  if(!CLOUD.on) return;
  const _brandModal=brandModal;
  brandModal=function(i){
    _brandModal(i); if(!cloudCo()) return;
    const edit=i!=null, prev=edit?(kitFor(S.brands[i]).logos||{}).principal:null; let pending=null;
    const up=$('#layer .upload'); if(!up) return;
    const paint=()=>{ up.innerHTML=pending?`<img src="${URL.createObjectURL(pending)}" alt="" style="max-height:56px;max-width:80%;object-fit:contain"><div class="small muted" style="margin-top:6px">${esc(pending.name)} · tocá para cambiarlo</div>`:prev?`<img src="${esc(prev.url)}" alt="" style="max-height:56px;max-width:80%;object-fit:contain"><div class="small muted" style="margin-top:6px">Tocá para cambiarlo</div>`:`${ic('upload')} Subir logo <span class="small muted">· PNG, SVG o JPG, hasta 25 MB</span>`; };
    up.setAttribute('role','button'); up.tabIndex=0; up.style.cursor='pointer'; paint();
    const pick=async()=>{ const [f]=await pickFiles(false,'image/*'); if(!f) return; if(!/^image\//.test(f.type)) return toast('El logo tiene que ser una imagen'); if(f.size>FILE_MAX) return toast('El logo pesa más de 25 MB'); pending=f; paint(); };
    up.onclick=pick; up.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); pick(); } };
    up.ondragover=e=>{ e.preventDefault(); }; up.ondrop=e=>{ e.preventDefault(); const f=e.dataTransfer.files[0]; if(f&&/^image\//.test(f.type)){ pending=f; paint(); } };
    const ok=$('#ok'), orig=ok.onclick;
    ok.onclick=async ev=>{ const name=$('#bnm').value.trim(); orig(ev); if($('#layer .modal')||!pending) return; // validación falló o no hay logo
      const b=S.brands.find(x=>x.name===name); if(!b) return; const k=kitFor(b); k.logos=k.logos||{};
      toast('Subiendo el logo…');
      try{ const f=await uploadBrandFile(b,pending); const old=k.logos.principal; k.logos.principal=f; render(); toast('Logo guardado'); if(old) deleteBrandFile(old).catch(()=>{}); }
      catch(e){ toast(e.message); } };
  };
})();

/* ---------- Configuración → Empresa: logo real y nombre guardado en la nube ---------- */
(function(){
  if(!CLOUD.on) return;
  const _bConfig=bConfig;
  bConfig=function(tab){
    _bConfig(tab); if(!cloudCo()||!$('#fe')) return;
    const c=S.company, d=D(), admin=['Dueño','Admin'].includes(c.myRole);
    const mark=$('#fe .mark'); if(mark&&d.logo) mark.outerHTML=`<img src="${esc(d.logo.url)}" alt="Logo de ${esc(c.name)}" style="width:56px;height:56px;border-radius:12px;object-fit:contain;background:var(--surface-sunken)">`;
    const lb=$('#logo'); if(lb){ if(!admin){ lb.remove(); } else { if(d.logo) lb.innerHTML=`${ic('upload')} Cambiar logo`;
      lb.onclick=async()=>{ const [f]=await pickFiles(false,'image/*'); if(!f) return; if(!/^image\//.test(f.type)) return toast('El logo tiene que ser una imagen'); if(f.size>FILE_MAX) return toast('El logo pesa más de 25 MB');
        lb.classList.add('is-loading');
        try{ const path=`tenants/${c.tid}/empresa/${Date.now()}-${fileSlug(f.name)}`, ref=fbSt.ref(path); await ref.put(f,{contentType:f.type});
          const url=await ref.getDownloadURL(), old=d.logo; d.logo={path,url,name:f.name}; render(); toast('Logo de la empresa guardado'); if(old) fbSt.ref(old.path).delete().catch(()=>{}); }
        catch(e){ lb.classList.remove('is-loading'); toast(e.code==='storage/unauthorized'?'Solo el Dueño o un Admin pueden cambiar el logo':'No se pudo subir el logo'); } }; } }
    const fe=$('#fe'), orig=fe.onsubmit;
    fe.onsubmit=async e=>{ orig(e); if(!admin) return; try{ await fbDb.doc(`tenants/${c.tid}`).update({name:c.name,country:c.country||'Argentina',industry:c.industry||'',updatedAt:TS()}); }catch(err){ toast(err.code==='permission-denied'?'Solo el Dueño o un Admin pueden cambiar los datos de la empresa':'No se pudo guardar en la nube'); } };
  };
  // Menú lateral: el logo de la empresa en lugar de las iniciales
  const _shellLogo=shell;
  shell=function(a,t,i){ const h=_shellLogo(a,t,i); const d=S.company&&S.company.cloud?D():null; if(!d||!d.logo) return h;
    return h.replace(/<div class="mark" style="background:var\(--negro\)">[^<]*<\/div>/,`<img class="mark" src="${esc(d.logo.url)}" alt="" style="object-fit:contain;background:var(--surface-sunken)">`); };
})();
