/* =====================================================================
   CONTENIDOS · ARCHIVOS REALES (empresas en la nube)
   Las imágenes, videos y documentos de cada contenido se suben a Firebase Storage:
   tenants/{tid}/contenidos/{idDelContenido}/… (hasta 100 MB cada uno; videos incluidos).
   En el contenido queda {n, t, s, url, path, size, contentType, by, at}. Se guardan al tocar «Guardar».
   En el prototipo local (sin nube) sigue la simulación de siempre.
   ===================================================================== */
const CONTENT_FILE_MAX=100*1024*1024;
function uploadContentFile(contentId,file,onProgress){
  return new Promise((resolve,reject)=>{
    if(file.size>CONTENT_FILE_MAX) return reject(new Error(`«${file.name}» pesa ${fileSize(file.size)}: el máximo es 100 MB.`));
    const path=`tenants/${S.company.tid}/contenidos/${fileSlug(contentId)}/${Date.now()}-${fileSlug(file.name)}`;
    const ref=fbSt.ref(path), task=ref.put(file,{contentType:file.type||'application/octet-stream',customMetadata:{nombre:file.name,subidoPor:S.user.name||C.user.email}});
    task.on('state_changed',s=>onProgress&&onProgress(s.bytesTransferred/(s.totalBytes||1)),
      e=>reject(new Error(e.code==='storage/unauthorized'?`«${file.name}»: ese tipo de archivo no está permitido o no tenés permiso.`:`«${file.name}» no se pudo subir. Revisá la conexión y probá de nuevo.`)),
      async()=>{ try{ const url=await ref.getDownloadURL(); const kind=fileKind(file.type||'');
        resolve({n:file.name,t:kind,s:fileSize(file.size),url,path,size:file.size,contentType:file.type||'',by:S.user.name||C.user.email,at:new Date().toISOString()}); }catch(e){ reject(e); } });
  });
}
/* Lo llama el editor de contenidos (2-modulos) en vez de la simulación */
function contentFilesBind(c,rerender){
  const box=$('#addfile'), list=$('#upprog'); if(!box) return;
  const go=async files=>{ files=[...files].filter(Boolean); if(!files.length) return; let ok=0, last='';
    for(const file of files){ const li=document.createElement('li'); li.innerHTML=`${esc(file.name)} · <span>0 %</span>`; if(list) list.appendChild(li); const pct=li.querySelector('span');
      try{ const f=await uploadContentFile(c.id,file,p=>{ pct.textContent=Math.round(p*100)+' %'; }); c.files.push(f); ok++; pct.textContent='listo'; pct.style.color='var(--success)'; layerDirty=true; }
      catch(e){ last=e.message; pct.textContent='no se pudo'; pct.style.color='var(--danger)'; li.title=e.message; } }
    if(ok){ rerender(); toast(`${ok} archivo${ok>1?'s':''} subido${ok>1?'s':''}. Tocá «Guardar» para que queden en el contenido.`); }
    if(last) toast(last); };
  box.onclick=async()=>go(await pickFiles(true,'image/*,video/*,application/pdf,.doc,.docx,.ppt,.pptx,.zip'));
  box.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); box.click(); } };
  box.ondragover=e=>{ e.preventDefault(); box.classList.add('drop'); };
  box.ondragleave=()=>box.classList.remove('drop');
  box.ondrop=e=>{ e.preventDefault(); box.classList.remove('drop'); go(e.dataTransfer.files); };
}
