/* =====================================================================
   FICHA DEL CONTACTO · LO QUE PIDIÓ DESDE LA WEB
   Los formularios de la web (coworking, contacto, newsletter) dejan cada envío en
   tenants/{t}/contactEvents (lo escribe el servidor). Acá se muestran en la ficha.
   ===================================================================== */
const CW_SRC={coworking:'Reserva de coworking',contacto:'Formulario de contacto',newsletter:'Suscripción al newsletter',otro:'Formulario de la web'};
(function(){
  if(typeof evContacto!=='function') return;
  const _ec=evContacto;
  evContacto=function(id){ _ec(id); if(!(S.company&&S.company.cloud&&typeof fbDb!=='undefined')) return;
    const body=$('#layer .drawer [style*="overflow:auto"]'); if(!body) return;
    const box=document.createElement('section'); box.className='card'; box.innerHTML='<h3 style="margin-bottom:8px">Desde la web</h3><p class="small muted">Cargando…</p>'; body.appendChild(box);
    fbDb.collection(`tenants/${S.company.tid}/contactEvents`).where('contactId','==',id).get().then(sn=>{
      const ev=sn.docs.map(d=>d.data()).sort((a,b)=>((b.at&&b.at.toMillis())||0)-((a.at&&a.at.toMillis())||0));
      if(!ev.length){ box.remove(); return; }
      box.innerHTML=`<h3 style="margin-bottom:8px">Desde la web (${ev.length})</h3>${ev.map(e=>{ const w=e.coworking, a=e.attribution||{};
        const what=w?`${w.people} persona${w.people===1?'':'s'} · ${evDate(w.date)} · ${esc(String(w.from).replace(' hs',''))} a ${esc(String(w.to).replace(' hs',''))}`:[e.topic,e.message].filter(Boolean).map(esc).join(' · ');
        return `<div class="settings-row" style="gap:12px;align-items:flex-start"><div style="flex:1;min-width:0"><b>${esc(CW_SRC[e.source]||'Formulario')}</b>${what?`<div class="small">${what}</div>`:''}<div class="small muted">${evWhen(e.at)}${a.utmCampaign?` · campaña «${esc(a.utmCampaign)}»`:''}</div></div></div>`; }).join('')}`;
    }).catch(()=>{ box.remove(); });
  };
})();
