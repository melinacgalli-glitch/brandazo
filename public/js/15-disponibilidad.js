/* =====================================================================
   DISPONIBILIDAD DE FECHAS (Cafelito Eventos)
   - Una fecha está ocupada cuando hay un evento GANADO con la SEÑA COBRADA (1 evento por día).
   - Fechas bloqueadas a mano: settings/cafelito-eventos.blockedDates [{date, note}].
   - El cotizador de la web consulta /api/v1/integrations/cafelito/availability (ver el contrato).
   - Avisos: al cobrar una seña para un día ya tomado, y en las cotizaciones que llegan para un día tomado.
   ===================================================================== */
EV_WARN.DATE_UNAVAILABLE='Fecha ya ocupada';
const evBooked=(date,exceptId)=>EV.ops.filter(o=>o.id!==exceptId&&o.stage==='ganada'&&o.won&&o.won.depositPaid&&o.event&&o.event.date===date);
const evBlocked=date=>((EV.settings||{}).blockedDates||[]).find(b=>b.date===date);
function evConflictHtml(o){
  const d=o.event&&o.event.date; if(!d) return ''; const bk=evBooked(d,o.id), bl=evBlocked(d);
  if(!bk.length&&!bl) return '';
  return `<div class="alert alert-warn" style="margin-bottom:12px">${ic('alert')}<div><b>Ojo: el ${evDate(d)} ya está tomado.</b> ${bk.length?`Hay un evento con seña cobrada (${bk.map(x=>esc(evName(x))).join(', ')}). Hoy trabajan con un evento por día.`:`Está bloqueado${bl.note?`: ${esc(bl.note)}`:''}.`} Podés seguir igual si lo coordinaron.</div></div>`;
}
(function(){
  // Aviso al pasar a «Ganada» o al registrar el cobro de la seña
  const _sf=evStageForm;
  evStageForm=function(o,to){ _sf(o,to); if(to==='ganada'){ const h=evConflictHtml(o); if(h) $('#layer .modal-body').insertAdjacentHTML('afterbegin',h); } };
  const _pf=evPayForm;
  evPayForm=function(o,which){ _pf(o,which); if(which==='deposit'){ const h=evConflictHtml(o); if(h) $('#layer .modal-body').insertAdjacentHTML('afterbegin',h); } };

  // Configurar: fechas bloqueadas a mano y próximas fechas ocupadas
  const _cfg=evConfig;
  evConfig=function(){ _cfg(); const body=$('#layer .modal-body'); if(!body) return;
    const today=new Date().toISOString().slice(0,10);
    const draw=()=>{ const bl=[...((EV.settings||{}).blockedDates||[])].filter(b=>b.date>=today).sort((a,b)=>a.date.localeCompare(b.date));
      const booked=EV.ops.filter(o=>o.stage==='ganada'&&o.won&&o.won.depositPaid&&o.event&&o.event.date>=today).sort((a,b)=>a.event.date.localeCompare(b.event.date));
      return `<h4 class="small" style="margin:8px 0">Disponibilidad en el cotizador de la web</h4>
      <p class="small muted" style="margin-bottom:8px">No se pueden elegir: los próximos ${(EV.settings||{}).minNoticeDays??7} días, los días con un evento con seña cobrada y las fechas bloqueadas acá.</p>
      <div class="small" style="margin-bottom:8px"><b>Ocupadas (con seña):</b> ${booked.length?booked.map(o=>`${evDate(o.event.date)} · ${esc(evName(o))}`).join(' — '):'<span class="muted">ninguna</span>'}</div>
      <div class="small"><b>Bloqueadas a mano:</b></div>
      <ul class="blk-list">${bl.map(b=>`<li><span>${evDate(b.date)}${b.note?` · ${esc(b.note)}`:''}</span><button type="button" class="icon-btn" data-unblock="${b.date}" aria-label="Desbloquear ${evDate(b.date)}">${ic('x')}</button></li>`).join('')||'<li class="muted">Ninguna</li>'}</ul>
      <div class="blk-add"><input class="input" type="date" id="blkd" min="${today}" aria-label="Fecha a bloquear"><input class="input" id="blkn" maxlength="60" placeholder="Motivo (opcional)" aria-label="Motivo"><button type="button" class="btn btn-sm" id="blkok">Bloquear</button></div>`; };
    const box=document.createElement('div'); box.className='blk-box'; body.appendChild(box);
    const save=async list=>{ try{ await fbDb.doc(`tenants/${EV.tid}/settings/cafelito-eventos`).set({blockedDates:list,updatedAt:TS(),updatedBy:C.user.uid},{merge:true}); EV.settings={...(EV.settings||{}),blockedDates:list}; paint(); return true; }
      catch(e){ toast(e.code==='permission-denied'?'Solo el Dueño o un Admin pueden bloquear fechas':'No se pudo guardar'); return false; } };
    const paint=()=>{ box.innerHTML=draw();
      box.querySelector('#blkok').onclick=async()=>{ const d=box.querySelector('#blkd').value, n=box.querySelector('#blkn').value.trim(); if(!d) return toast('Elegí la fecha');
        const list=[...((EV.settings||{}).blockedDates||[])]; if(list.some(b=>b.date===d)) return toast('Esa fecha ya está bloqueada');
        const bk=evBooked(d); if(bk.length) toast(`Ese día ya tiene un evento con seña (${evName(bk[0])})`);
        list.push({date:d,note:n}); if(await save(list)) toast(`${evDate(d)} bloqueado: el cotizador no lo va a ofrecer`); };
      box.querySelectorAll('[data-unblock]').forEach(x=>x.onclick=async()=>{ const list=((EV.settings||{}).blockedDates||[]).filter(b=>b.date!==x.dataset.unblock); if(await save(list)) toast('Fecha desbloqueada'); }); };
    paint();
  };
})();
