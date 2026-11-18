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
const isFileObj=f=>f&&!Array.isArray(f)&&f.path;

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
  const kind=fileKind(f.contentType);
  return `<div class="asset"><a class="pv" href="${esc(f.url)}" target="_blank" rel="noopener" style="background:${kind==='image'?'var(--surface-sunken)':kind==='video'?'#0E0E10':'#5C5C66'};text-decoration:none" aria-label="Abrir ${esc(f.name)}">${kind==='image'?`<img src="${esc(f.url)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover">`:ic(kind==='video'?'video':'file')}</a>
   <div class="meta"><b title="${esc(f.name)}">${esc(f.name)}</b><span class="muted" style="display:flex;justify-content:space-between;align-items:center;gap:4px">${esc(f.cat)} · ${fileSize(f.size)}<button class="icon-btn" style="width:24px;height:24px" data-fdel="${f.id}" aria-label="Borrar ${esc(f.name)}">${ic('trash')}</button></span></div></div>`;
}
function biblioHtml(k){
  const files=k.files.filter(isFileObj), cats=FILE_CATS.filter(c=>files.some(f=>f.cat===c)), fl=files.filter(f=>!libFilter||f.cat===libFilter);
  return `<div class="toolbar"><div class="seg"><button data-lf="" aria-pressed="${!libFilter}">Todos · ${files.length}</button>${cats.map(c=>`<button data-lf="${c}" aria-pressed="${libFilter===c}">${c}</button>`).join('')}</div><span class="grow"></span><button class="btn btn-primary" id="upl2">${ic('upload')} Subir archivos</button></div>
  ${fl.length?`<div class="lib">${fl.map(assetCloud).join('')}</div>`:`<div class="card empty"><div class="eico">${ic('image')}</div><h3>${files.length?'No hay archivos en esta categoría':'Biblioteca vacía'}</h3><p class="muted small">Subí logos, fotos, videos, documentos, plantillas y tipografías (hasta 25 MB cada uno). Los ve todo tu equipo.</p><button class="btn btn-primary" data-upl2>${ic('upload')} Subir archivos</button></div>`}`;
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
    $$('[data-fdel]').forEach(x=>x.onclick=()=>{ const f=k.files.find(z=>z.id===x.dataset.fdel); if(!f) return; modal('¿Borrar el archivo?',`<p><b>${esc(f.name)}</b> se borra para todo el equipo. No se puede deshacer.</p>`,`<button class="btn" data-close>Volver</button><button class="btn btn-danger" id="fok">Borrar</button>`);
      $('#fok').onclick=async()=>{ try{ await deleteBrandFile(f); k.files=k.files.filter(z=>z!==f); closeLayer(); render(); toast('Archivo borrado'); }catch(e){ toast('No se pudo borrar'); } }; });
    // En la nube, lo que todavía no existe no se simula
    $$('[data-dl]').forEach(x=>x.onclick=()=>toast('La descarga del manual en PDF todavía no está disponible'));
    $$('[data-share]').forEach(x=>x.onclick=()=>toast('Compartir el manual todavía no está disponible'));
  };
})();
