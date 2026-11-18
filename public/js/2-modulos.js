/* =====================================================================
   Brandazo · Prototipo v2 — Módulos 02 a 06 + Core (planes y seguridad)
   ===================================================================== */
Object.assign(P,{
 heart:'M12 20s-8-5-8-11a4 4 0 0 1 8-2 4 4 0 0 1 8 2c0 6-8 11-8 11z',
 image:'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01',
 video:'M3 6h13v12H3zM16 10l5-3v10l-5-3',
 story:'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
 carousel:'M7 5h10v14H7zM3 8v8M21 8v8',
 blog:'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
 reel:'M4 4h16v16H4zM4 9h16M9 4l3 5M15 4l3 5M10 13v4l4-2z',
 file:'M6 3h9l4 4v14H6zM14 3v5h5',
 copy:'M8 8h12v12H8zM4 16V4h12',
 send:'M4 12l16-8-6 16-3-7z',
 download:'M12 4v12M7 11l5 5 5-5M4 20h16',
 filter:'M4 5h16l-6 8v6l-4-2v-4z',
 trend:'M3 17l6-6 4 4 8-8M15 7h6v6',
 dollar:'M12 3v18M17 7h-7a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H6',
 flag:'M5 21V4h11l-2 4 2 4H5',
 type:'M5 6V4h14v2M12 4v16M9 20h6',
 palette:'M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1.5-1.5-1.5-1.5-3 0-1 .8-1.5 1.8-1.5H16a5 5 0 0 0 5-5c0-3.9-4-7-9-7zM7.5 11h.01M10 7h.01M15 7h.01',
 book:'M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6M20 4v14h-6',
 compare:'M9 4v16M15 4v16M4 8h5M15 16h5',
 edit:'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
 users2:'M17 20v-1a5 5 0 0 0-10 0v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'
});

/* ---------- utilidades ---------- */
const NOW=new Date(); NOW.setHours(12,0,0,0);
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12)};
const MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIA=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const fdate=s=>{const d=parse(s);return `${d.getDate()} ${MES[d.getMonth()].slice(0,3)}`};
const nf=new Intl.NumberFormat('es-AR');
const num=n=>nf.format(Math.round(n));
const money=n=>'$ '+(n>=1e6?(n/1e6).toLocaleString('es-AR',{maximumFractionDigits:2})+' M':nf.format(Math.round(n)));
const pct=(a,b)=>b?Math.round(a/b*100):0;
const uid=()=>Math.random().toString(36).slice(2,9);
const M=()=>D().m;
const brandOf=name=>S.brands.find(b=>b.name===name)||{name,color:'#85858F'};
const inBrand=x=>!curBrand()||x.brand===curBrand().name;
const FORMATS=[['Post','image'],['Reel','reel'],['Historia','story'],['Carrusel','carousel'],['Video','video'],['Blog','blog']];
const fmtIcon=f=>(FORMATS.find(x=>x[0]===f)||['','image'])[1];
const STATUSES=['Idea','Borrador','Revisión','Aprobado','Programado','Publicado'];
const stBadge=s=>({Idea:'badge',Borrador:'badge',Revisión:'badge badge-warn',Aprobado:'badge badge-brand',Programado:'badge badge-brand',Publicado:'badge badge-ok'}[s]||'badge');
const CHANNELS=['Instagram','Facebook','TikTok','LinkedIn','Blog','Email'];
const API_PUBLISH={Instagram:true,Facebook:true,LinkedIn:true,TikTok:false,Blog:false,Email:false};
const OWNERS=()=>[...new Set(S.members.filter(m=>m.status==='Activo').map(m=>m.name||m.email).concat(D().demo?['Sofía Paz','Juan Rossi']:[]))];
function drawerWide(html){ drawer(html); $('#layer .drawer').classList.add('wide'); }
function demoBtn(){ return `<button class="btn btn-ghost btn-sm" data-demo>${ic('spark')} Ver con datos de ejemplo</button>`; }
function bindDemo(){ $$('[data-demo]').forEach(b=>b.onclick=()=>{ loadDemo(); render(); toast('Cargamos datos de ejemplo en esta empresa'); }); }
function emptyBlock(icon,title,text,action){ return `<div class="card empty"><div class="eico">${ic(icon)}</div><h3>${title}</h3><p class="muted small">${text}</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${action||''}${demoBtn()}</div></div>`; }
function pageHead(title,sub,actions){ return `<div class="page-head"><div><h1>${title}</h1>${sub?`<p class="muted" style="margin-top:4px">${sub}</p>`:''}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${actions||''}</div></div>`; }
function subTabs(base,tabs,cur){ return `<div class="tabs" role="tablist">${tabs.map(([k,l])=>`<a class="tab" role="tab" href="#/app/${base}/${k}" aria-selected="${k===cur}">${l}</a>`).join('')}</div>`; }
function brandScope(){ const b=curBrand(); return b?`<span class="badge"><i class="sdot" style="background:${b.color}"></i>${esc(b.name)}</span>`:`<span class="badge">${ic('grid')} Todas las unidades</span>`; }
function seeded(n,seed){ let x=seed; return Array.from({length:n},()=>{x=(x*9301+49297)%233280;return x/233280}); }
function series(n,start,growth,noise,seed){ const r=seeded(n,seed); let v=start; return r.map(z=>{ v=v*(1+growth)+(z-.5)*noise*start; return Math.max(0,v); }); }

/* ---------- gráficos SVG ---------- */
function lineChart(vals,{h=180,labels=[],fmt=num,color='var(--magenta)',compare=null,zero=true}={}){
  const w=640,pl=48,pr=12,pt=12,pb=24,all=vals.concat(compare||[]),lo=Math.min(...all),hi=Math.max(...all),mx=zero?hi*1.08||1:hi+(hi-lo)*.15+1,mn=zero?Math.min(0,lo):Math.max(0,lo-(hi-lo)*.15-1);
  const X=i=>pl+i*(w-pl-pr)/(vals.length-1), Y=v=>pt+(1-(v-mn)/(mx-mn))*(h-pt-pb);
  const path=a=>a.map((v,i)=>`${i?'L':'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
  const ticks=[0,.5,1].map(f=>mn+(mx-mn)*f);
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Evolución">${ticks.map(t=>`<line x1="${pl}" x2="${w-pr}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--line)"/><text x="${pl-6}" y="${Y(t)+4}" text-anchor="end">${fmt(t)}</text>`).join('')}
  ${compare?`<path d="${path(compare)}" fill="none" stroke="var(--line-strong)" stroke-width="1.5" stroke-dasharray="4 4"/>`:''}
  <path d="${path(vals)}L${X(vals.length-1)} ${Y(mn)}L${X(0)} ${Y(mn)}Z" fill="${color}" opacity=".08"/><path d="${path(vals)}" fill="none" stroke="${color}" stroke-width="2"/>
  <circle cx="${X(vals.length-1)}" cy="${Y(vals.at(-1))}" r="4" fill="${color}"/>
  ${labels.map((l,i)=>l?`<text x="${X(i)}" y="${h-6}" text-anchor="middle">${l}</text>`:'').join('')}</svg>`;
}
function barChart(vals,{h=160,labels=[],fmt=num}={}){
  const w=640,pl=48,pt=12,pb=24,mx=Math.max(...vals)*1.1||1,bw=(w-pl-12)/vals.length;
  const Y=v=>pt+(1-v/mx)*(h-pt-pb);
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Inversión diaria">${[0,.5,1].map(f=>`<line x1="${pl}" x2="${w-12}" y1="${Y(mx*f)}" y2="${Y(mx*f)}" stroke="var(--line)"/><text x="${pl-6}" y="${Y(mx*f)+4}" text-anchor="end">${fmt(mx*f)}</text>`).join('')}
  ${vals.map((v,i)=>`<rect x="${pl+i*bw+2}" y="${Y(v)}" width="${Math.max(2,bw-4)}" height="${Math.max(0,h-pb-Y(v))}" rx="2" fill="${i===vals.length-1?'var(--magenta)':'var(--line-strong)'}" opacity="${i===vals.length-1?1:.6}"/>`).join('')}
  ${labels.map((l,i)=>l?`<text x="${pl+i*bw+bw/2}" y="${h-6}" text-anchor="middle">${l}</text>`:'').join('')}</svg>`;
}

/* ---------- datos de ejemplo ---------- */
function loadDemo(){
  const d=D(); d.demo=true;
  if(!S.brands.length){ S.brands=[{name:S.company.name,color:'#FF2D87'},{name:'Lumen Deco',color:'#7C4DFF'}]; S.brand=0; }
  const B0=S.brands[0].name, B1=(S.brands[1]||S.brands[0]).name;
  if(!S.members.some(m=>m.email==='sofia@estudionorte.com')) S.members.push({name:'Sofía Paz',email:'sofia@estudionorte.com',role:'Marketing',status:'Activo'});
  const day=n=>iso(addDays(NOW,n));
  const camps=[
   {id:'c1',name:'Lanzamiento colección verano',brand:B1,type:'Paga',objective:'Ventas',start:day(-20),end:day(25),budget:900000,spent:412000,audience:'Mujeres 25–45 · AMBA y Córdoba · interés en deco',channels:['Instagram','Facebook','Meta Ads'],status:'Activa',segment:'Colección verano',m:{reach:182400,impr:412300,clicks:6380,conv:214,revenue:3850000},seed:3},
   {id:'c2',name:'Black Friday 2026',brand:B1,type:'Paga',objective:'Ventas',start:day(11),end:day(14),budget:1200000,spent:0,audience:'Clientes y visitantes de los últimos 90 días',channels:['Instagram','Meta Ads','Email'],status:'Programada',segment:'Promociones',m:{reach:0,impr:0,clicks:0,conv:0,revenue:0},seed:5},
   {id:'c3',name:'Webinar: marketing para pymes',brand:B0,type:'Orgánica + paga',objective:'Leads',start:day(-34),end:day(-3),budget:150000,spent:148000,audience:'Dueños de pymes · Argentina',channels:['LinkedIn','Instagram','Email'],status:'Finalizada',segment:'Servicios',m:{reach:48200,impr:121500,clicks:2150,conv:186,revenue:0},seed:7},
   {id:'c4',name:'Contenido educativo de noviembre',brand:B0,type:'Orgánica',objective:'Alcance',start:day(-15),end:day(14),budget:0,spent:0,audience:'Seguidores y audiencia similar',channels:['Instagram','LinkedIn'],status:'Activa',segment:'Marca',m:{reach:63500,impr:98400,clicks:1420,conv:58,revenue:0},seed:11}];
  const C=(o,title,format,channel,brand,status,camp,owner,obj,extra={})=>Object.assign({id:uid(),title,format,channel,brand,status,campaign:camp,owner,objective:obj,date:day(o),time:['10:00','12:30','18:00','20:00'][Math.abs(o)%4],copy:'',hashtags:'',cta:'',files:[],comments:[],metrics:null},extra);
  const pubm=(r,l,c,s)=>({reach:r,likes:l,comments:c,saves:s});
  const cs=[
   C(-12,'Teaser colección verano','Reel','Instagram',B1,'Publicado','c1','Sofía Paz','o1',{copy:'Llega el verano a tu casa ☀️ Texturas naturales, colores que respiran. Muy pronto.',hashtags:'#LumenDeco #DecoVerano #Hogar',cta:'Activá las notificaciones',files:[{n:'teaser-verano.mp4',t:'video',s:'18 MB'}],metrics:pubm(24800,1830,96,410)}),
   C(-9,'Carrusel: 5 ideas para tu living','Carrusel','Instagram',B1,'Publicado','c1','Sofía Paz','o1',{copy:'5 ideas para renovar tu living sin hacer obra. Guardalo para después 👇',hashtags:'#Deco #Living #Ideas',cta:'Guardá el post',files:[{n:'carrusel-living-1.png',t:'image',s:'2,1 MB'},{n:'carrusel-living-2.png',t:'image',s:'1,9 MB'}],metrics:pubm(18300,1240,58,890)}),
   C(-7,'Caso de éxito: Café del Puerto','Post','LinkedIn',B0,'Publicado','c4','Melina Galli','o2',{copy:'Cómo ayudamos a Café del Puerto a duplicar sus reservas online en 3 meses.',cta:'Leé el caso completo',metrics:pubm(6200,210,18,44)}),
   C(-5,'Lanzamiento oficial colección','Post','Facebook',B1,'Publicado','c1','Sofía Paz','o1',{copy:'¡Ya está disponible la colección verano! Envíos a todo el país.',cta:'Comprá online',metrics:pubm(9800,420,31,62)}),
   C(-4,'Detrás de escena del webinar','Historia','Instagram',B0,'Publicado','c3','Juan Rossi','o2',{metrics:pubm(2100,140,0,0)}),
   C(-2,'Guía: cómo medir tu marketing','Blog','Blog',B0,'Publicado','c4','Melina Galli','o2',{copy:'Una guía práctica para pymes: qué medir, con qué herramientas y cada cuánto.',metrics:pubm(1850,0,12,0)}),
   C(0,'Tips de iluminación cálida','Reel','Instagram',B1,'Programado','c1','Sofía Paz','o1',{copy:'3 trucos de iluminación para que tu casa se sienta más cálida 💡',hashtags:'#Iluminación #DecoTips',cta:'Seguinos para más tips',files:[{n:'reel-iluminacion.mp4',t:'video',s:'22 MB'}]}),
   C(1,'Encuesta: ¿qué color preferís?','Historia','Instagram',B1,'Programado','c1','Sofía Paz','o1'),
   C(2,'5 errores al planificar contenidos','Carrusel','LinkedIn',B0,'Aprobado','c4','Melina Galli','o2',{copy:'Los 5 errores más comunes que vemos en pymes al planificar contenidos (y cómo evitarlos).'}),
   C(3,'Unboxing almohadones de lino','Reel','TikTok',B1,'Revisión','c1','Sofía Paz','o1',{copy:'Unboxing de los nuevos almohadones de lino 🤍',comments:[{who:'Melina Galli',t:'Me encanta. ¿Podemos sumar el precio en el último frame?',when:'Ayer'}]}),
   C(4,'Testimonio de cliente','Video','Instagram',B0,'Borrador','c4','Juan Rossi','o2'),
   C(6,'Previa Black Friday: anticipo','Post','Instagram',B1,'Borrador','c2','Sofía Paz','o1',{copy:'Algo grande se viene el 27/11. Activá las notificaciones.'}),
   C(8,'Newsletter de noviembre','Post','Email',B0,'Idea','c4','Melina Galli','o2'),
   C(11,'Black Friday: 30% off','Post','Instagram',B1,'Idea','c2','Sofía Paz','o1'),
   C(12,'Black Friday: último día','Historia','Instagram',B1,'Idea','c2','Sofía Paz','o1'),
   C(15,'Resumen del año en clientes','Carrusel','LinkedIn',B0,'Idea','','Melina Galli','o2')];
  d.m={
   objectives:[
    {id:'o1',title:'Aumentar 30% las ventas online de '+B1,brand:B1,period:'Q4 2026',owner:'Sofía Paz',krs:[{t:'Ventas atribuidas a campañas',cur:3850000,target:9000000,unit:'$'},{t:'Tasa de conversión del sitio',cur:1.8,target:2.5,unit:'%'},{t:'Seguidores en Instagram',cur:12480,target:15000,unit:''}]},
    {id:'o2',title:'Posicionar a '+B0+' como referente en marketing para pymes',brand:B0,period:'Q4 2026',owner:'Melina Galli',krs:[{t:'Leads calificados',cur:186,target:300,unit:''},{t:'Contenidos educativos publicados',cur:9,target:12,unit:''},{t:'Seguidores en LinkedIn',cur:1820,target:2500,unit:''}]}],
   kpis:[
    {name:'Alcance mensual',channel:'Instagram',brand:B1,target:250000,actual:182400,unit:''},{name:'Engagement',channel:'Instagram',brand:B1,target:4,actual:5.2,unit:'%'},
    {name:'CTR de anuncios',channel:'Meta Ads',brand:B1,target:1.5,actual:1.55,unit:'%'},{name:'Costo por venta',channel:'Meta Ads',brand:B1,target:2500,actual:1925,unit:'$'},
    {name:'Leads por mes',channel:'LinkedIn',brand:B0,target:100,actual:72,unit:''},{name:'Tasa de apertura',channel:'Email',brand:B0,target:30,actual:34,unit:'%'}],
   personas:[
    {id:uid(),brand:B1,name:'Carolina',age:'32 años',role:'Diseñadora, primer departamento propio',goals:'Que su casa se vea linda y personal sin gastar de más.',pains:'No sabe por dónde empezar; le cuesta imaginar cómo combina todo.',channels:['Instagram','Pinterest'],quote:'Guardo mil ideas y después no sé qué comprar.',color:'#7C4DFF'},
    {id:uid(),brand:B1,name:'Graciela',age:'54 años',role:'Renueva la casa familiar',goals:'Calidad que dure y atención personalizada.',pains:'Desconfía de comprar online sin ver el producto.',channels:['Facebook','WhatsApp'],quote:'Prefiero preguntar antes de comprar.',color:'#E8590C'},
    {id:uid(),brand:B0,name:'Martín',age:'41 años',role:'Dueño de una pyme gastronómica',goals:'Más clientes sin depender del boca en boca.',pains:'No tiene tiempo ni equipo de marketing.',channels:['LinkedIn','Instagram','Email'],quote:'Sé que tengo que estar en redes, pero no llego.',color:'#1E9BD7'}],
   positioning:{
    [B1]:{statement:`Para personas que quieren un hogar cálido y con personalidad, ${B1} es la tienda de deco que combina diseño local y materiales naturales, porque cada pieza está pensada para durar y para combinar con todo.`,value:'Diseño local, materiales naturales y asesoramiento para armar ambientes completos.',pillars:['Inspiración','Producto','Asesoramiento','Comunidad'],diff:'Asesoramiento gratuito por WhatsApp y piezas de autor de producción local.'},
    [B0]:{statement:`Para pymes que necesitan vender más sin tener un equipo de marketing, ${B0} es la agencia que transforma estrategia en resultados medibles, porque trabaja con objetivos de negocio y reportes claros.`,value:'Marketing orientado a ventas, con reportes simples y acompañamiento cercano.',pillars:['Educación','Casos de éxito','Detrás de escena'],diff:'Planes por objetivo y un tablero de resultados compartido con cada cliente.'}},
   plan:[
    {id:uid(),t:'Lanzamiento colección verano',type:'Lanzamiento',date:day(-20),brand:B1,owner:'Sofía Paz'},{id:uid(),t:'Webinar para pymes',type:'Evento',date:day(-5),brand:B0,owner:'Juan Rossi'},
    {id:uid(),t:'Black Friday',type:'Campaña',date:day(11),brand:B1,owner:'Sofía Paz'},{id:uid(),t:'Newsletter de cierre de año',type:'Contenido',date:day(20),brand:B0,owner:'Melina Galli'},
    {id:uid(),t:'Campaña Navidad y Reyes',type:'Campaña',date:day(32),brand:B1,owner:'Sofía Paz'},{id:uid(),t:'Planificación anual 2027',type:'Interno',date:day(40),brand:B0,owner:'Melina Galli'},
    {id:uid(),t:'Rebajas de enero',type:'Campaña',date:day(55),brand:B1,owner:'Sofía Paz'}],
   budget:{total:3000000,period:'Q4 2026',items:[{ch:'Meta Ads',a:1500000,s:412000},{ch:'Producción de contenido',a:600000,s:280000},{ch:'Google Ads',a:400000,s:0},{ch:'Influencers',a:300000,s:150000},{ch:'Herramientas y software',a:200000,s:148000}],
     team:[{who:'Sofía Paz',role:'Marketing',alloc:{[B1]:80,[B0]:20}},{who:'Melina Galli',role:'Dueño',alloc:{[B1]:30,[B0]:70}},{who:'Juan Rossi',role:'Ventas',alloc:{[B1]:20,[B0]:40}}]},
   contents:cs, campaigns:camps,
   accounts:[
    {id:'a1',net:'Instagram',handle:'@lumendeco',brand:B1,status:'Conectada',followers:12480,sync:'hace 18 min',seed:2},{id:'a2',net:'Facebook',handle:'Lumen Deco',brand:B1,status:'Conectada',followers:5210,sync:'hace 18 min',seed:4},
    {id:'a3',net:'TikTok',handle:'@lumendeco',brand:B1,status:'Sin conectar',followers:0,sync:'',seed:6},
    {id:'a4',net:'Instagram',handle:'@estudionorte',brand:B0,status:'Conectada',followers:3940,sync:'hace 18 min',seed:8},{id:'a5',net:'LinkedIn',handle:B0,brand:B0,status:'Conectada',followers:1820,sync:'hace 1 h',seed:9}],
   kits:{
    [B1]:{info:{desc:'Tienda online de decoración con diseño local y materiales naturales.',web:'lumendeco.com.ar',industry:'Retail · Decoración',since:'2021'},colors:[['Lavanda','#7C4DFF'],['Arena','#E9DFCF'],['Carbón','#2B2B2E'],['Terracota','#C8643B']],fonts:[['Fraunces','Títulos','serif'],['Inter','Textos','sans-serif']],
     voice:{tone:['Cálida','Inspiradora','Cercana'],do:['Hablar de vos','Mostrar ambientes reales','Dar ideas prácticas'],dont:['Tecnicismos de diseño','Promesas exageradas','Más de 2 emojis por post']},messages:['Tu casa, con personalidad.','Piezas pensadas para durar.','Te asesoramos gratis por WhatsApp.'],
     files:[['Logo principal.svg','image','Logos',12],['Logo blanco.svg','image','Logos',8],['Foto living verano.jpg','image','Fotos',5],['Foto dormitorio.jpg','image','Fotos',3],['Reel teaser.mp4','video','Videos',1],['Manual de marca.pdf','file','Documentos',0],['Plantilla historia.png','image','Plantillas',9],['Plantilla carrusel.png','image','Plantillas',6]]},
    [B0]:{info:{desc:'Agencia de marketing y ventas para pymes.',web:'estudionorte.com',industry:'Servicios · Marketing',since:'2019'},colors:[['Magenta','#FF2D87'],['Negro','#0E0E10'],['Blanco','#FFFFFF']],fonts:[['Inter Tight','Títulos','sans-serif'],['Inter','Textos','sans-serif']],
     voice:{tone:['Directa','Experta','Cercana'],do:['Datos concretos','Ejemplos de clientes','Llamados a la acción claros'],dont:['Jerga de agencia','Promesas sin números']},messages:['Marketing que se mide en ventas.','Estrategia, ejecución y reportes claros.'],
     files:[['Logo Estudio Norte.svg','image','Logos',14],['Presentación institucional.pdf','file','Documentos',2],['Plantilla caso de éxito.png','image','Plantillas',4],['Foto equipo.jpg','image','Fotos',3]]}}
  };
  d.audit=[['Melina Galli','Inició sesión','Hoy 09:12'],['Sofía Paz','Aprobó «Tips de iluminación cálida»','Ayer 18:40'],['Melina Galli','Cambió el rol de Juan Rossi a Ventas','Ayer 11:05'],['Sofía Paz','Conectó Instagram @lumendeco','Hace 3 días']];
}

/* =====================================================================
   02 · ESTRATEGIA
   ===================================================================== */
const ST_TABS=[['resumen','Resumen'],['okr','Objetivos, OKR y KPI'],['personas','Buyer personas'],['posicionamiento','Posicionamiento'],['planes','Planes'],['presupuesto','Presupuesto']];
function krPct(k){ return Math.min(100,pct(k.cur,k.target)); }
function objPct(o){ return o.krs.length?Math.round(o.krs.reduce((a,k)=>a+krPct(k),0)/o.krs.length):0; }
function krVal(k,v){ return k.unit==='$'?money(v):k.unit==='%'?String(v).replace('.',',')+'%':num(v); }
function objStatus(p){ return p>=70?['En camino','badge-ok']:p>=40?['Atención','badge-warn']:['En riesgo','badge-err']; }
function vEstrategia(tab){
  tab=ST_TABS.some(t=>t[0]===tab)?tab:'resumen';
  const m=M(), objs=m.objectives.filter(inBrand);
  const head=pageHead('Estrategia','Objetivos, públicos, posicionamiento, planes y presupuesto de cada unidad de negocio.',`${brandScope()}<button class="btn btn-primary" id="newobj">${ic('plus')} Nuevo objetivo</button>`)+subTabs('estrategia',ST_TABS,tab);
  if(tab==='resumen'&&!m.objectives.length&&!m.personas.length) return head+emptyBlock('target','Definí tu estrategia','Empezá con un objetivo: qué querés lograr, para qué marca y cómo lo vas a medir.',`<button class="btn btn-primary" data-newobj>${ic('plus')} Crear objetivo</button>`);
  const body={resumen:stResumen,okr:stOkr,personas:stPersonas,posicionamiento:stPos,planes:stPlanes,presupuesto:stBudget}[tab](objs);
  return head+body;
}
function objCard(o){
  const p=objPct(o),[sl,sc]=objStatus(p), m=M();
  const camps=m.campaigns.filter(c=>m.contents.some(x=>x.objective===o.id&&x.campaign===c.id)||(o.links||[]).includes(c.id));
  const conts=m.contents.filter(c=>c.objective===o.id);
  return `<article class="card obj"><div class="obj-head"><div><div class="small muted" style="display:flex;gap:8px;align-items:center"><i class="sdot" style="background:${brandOf(o.brand).color}"></i>${esc(o.brand)} · ${esc(o.period)} · ${esc(o.owner)}</div><h3 style="margin-top:4px">${esc(o.title)}</h3></div><div style="text-align:right;flex:none"><span class="badge ${sc}">${sl}</span><div class="mono" style="font-size:22px;margin-top:6px">${p}%</div></div></div>
  <div class="bar ${p>=70?'ok':p>=40?'warn':'over'}"><i style="width:${p}%"></i></div>
  <div>${o.krs.map(k=>`<div class="kr"><span>${esc(k.t)}</span><div class="bar"><i style="width:${krPct(k)}%"></i></div><span class="mono small">${krPct(k)}%</span><span class="small muted" style="grid-column:1/-1;margin-top:-6px">${krVal(k,k.cur)} de ${krVal(k,k.target)}</span></div>`).join('')}</div>
  <div><div class="small muted" style="margin-bottom:6px">Vinculado a</div><div class="links">${camps.map(c=>`<a class="link-chip" href="#/app/campanas/${c.id}">${ic('megaphone')}${esc(c.name)}</a>`).join('')}${conts.length?`<a class="link-chip" href="#/app/contenidos/lista">${ic('calendar')}${conts.length} contenidos</a>`:''}${!camps.length&&!conts.length?'<span class="small muted">Todavía nada. Vinculalo desde una campaña o un contenido.</span>':''}</div></div></article>`;
}
function stResumen(objs){
  const m=M(), b=m.budget, spent=b.items.reduce((a,i)=>a+i.s,0), conts=m.contents.filter(inBrand);
  const avg=objs.length?Math.round(objs.reduce((a,o)=>a+objPct(o),0)/objs.length):0;
  return `<div class="stat-grid"><div class="stat"><div class="l">Objetivos activos</div><div class="v">${objs.length}</div><div class="d">${objs.filter(o=>objPct(o)<40).length} en riesgo</div></div>
  <div class="stat"><div class="l">Avance promedio</div><div class="v">${avg}%</div><div class="d">del período ${esc(b.period||'actual')}</div></div>
  <div class="stat"><div class="l">Presupuesto usado</div><div class="v">${pct(spent,b.total)}%</div><div class="d">${money(spent)} de ${money(b.total)}</div></div>
  <div class="stat"><div class="l">Contenidos del plan</div><div class="v">${conts.length}</div><div class="d">${conts.filter(c=>c.status==='Publicado').length} publicados</div></div></div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(min(420px,100%),1fr))">${objs.map(objCard).join('')||emptyBlock('target','Sin objetivos para esta marca','Creá un objetivo o elegí "Todas las unidades".')}</div>`;
}
function stOkr(objs){
  const kp=M().kpis.filter(inBrand);
  return `<h2 style="margin-bottom:12px">Objetivos y resultados clave</h2><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(min(420px,100%),1fr));margin-bottom:32px">${objs.map(objCard).join('')||emptyBlock('target','Sin objetivos todavía','Definí qué querés lograr y con qué resultado clave lo vas a medir.',`<button class="btn btn-primary" data-newobj>${ic('plus')} Crear objetivo</button>`)}</div>
  <div class="card-head"><h2>KPI por canal</h2><button class="btn btn-sm" id="newkpi">${ic('plus')} Agregar KPI</button></div>
  <div class="table-wrap"><table class="t"><thead><tr><th>Indicador</th><th>Canal</th><th class="hide-m">Unidad</th><th class="num">Meta</th><th class="num">Actual</th><th>Estado</th></tr></thead><tbody>
  ${kp.length?'':`<tr><td colspan="6" class="muted small" style="text-align:center;padding:24px">Sin KPI cargados. Tocá «Agregar KPI» para sumar el primero.</td></tr>`}${kp.map(k=>{const lowerBetter=k.unit==='$';const ok=lowerBetter?k.actual<=k.target:k.actual>=k.target;const f=v=>k.unit==='$'?money(v):k.unit==='%'?String(v).replace('.',',')+'%':num(v);return `<tr><td><b>${esc(k.name)}</b></td><td>${esc(k.channel)}</td><td class="hide-m"><span class="badge"><i class="sdot" style="background:${brandOf(k.brand).color}"></i>${esc(k.brand)}</span></td><td class="num">${f(k.target)}</td><td class="num">${f(k.actual)}</td><td>${ok?'<span class="badge badge-ok">'+ic('check')+' Cumple</span>':'<span class="badge badge-warn">Por debajo</span>'}</td></tr>`}).join('')}</tbody></table></div>`;
}
/* Buyer personas: unidades de negocio = marcas de la empresa (sin entidad nueva).
   La relación con campañas vive en la campaña (c.personas = [ids]): una sola fuente. */
function pNorm(p){ if(!Array.isArray(p.brands)) p.brands=p.brand?[p.brand]:[]; p.brand=p.brands[0]||''; if(p.quote==='—') p.quote=''; return p; }
const pInBrand=p=>!curBrand()||pNorm(p).brands.includes(curBrand().name);
const pCamps=p=>M().campaigns.filter(c=>(c.personas||[]).includes(p.id));
function avInk(hex){ const h=(hex||'#85858F').replace('#',''); const [r,g,b]=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4); const L=.2126*r+.7152*g+.0722*b; return L>.18?'#0E0E10':'#FFFFFF'; }
function personaCard(p){
  pNorm(p); const col=brandOf(p.brands[0]).color, camps=pCamps(p);
  return `<article class="card persona"><div class="persona-top"><div class="persona-av" style="background:${col};color:${avInk(col)}">${initials(p.name)}</div>
   <div class="grow" style="min-width:0"><h3><button type="button" class="persona-name" data-pedit="${p.id}" title="Editar">${esc(p.name)}${p.age?`, ${esc(p.age)}`:''}</button></h3><div class="persona-units">${p.brands.map(b=>`<span class="badge"><i class="sdot" style="background:${brandOf(b).color}"></i>${esc(b)}</span>`).join('')||'<span class="small muted">Sin unidad de negocio</span>'}</div></div>
   <div class="persona-actions"><button class="btn btn-sm" data-pedit="${p.id}">${ic('edit')} Editar</button><button class="icon-btn" data-pdel="${p.id}" aria-label="Eliminar a ${esc(p.name)}" title="Eliminar">${ic('trash')}</button></div></div>
  ${p.role?`<p class="persona-role">${esc(p.role)}</p>`:''}
  ${p.quote?`<div class="quote">“${esc(p.quote)}”</div>`:''}
  <dl>${p.goals?`<div><dt>Objetivos</dt><dd>${esc(p.goals)}</dd></div>`:''}${p.pains?`<div><dt>Frustraciones</dt><dd>${esc(p.pains)}</dd></div>`:''}
   <div><dt>Dónde está</dt><dd>${p.channels.length?`<div class="pill-list">${p.channels.map(c=>`<span class="pill">${esc(c)}</span>`).join('')}</div>`:'<span class="muted">Sin definir</span>'}</dd></div>
   <div><dt>Campañas</dt><dd>${camps.length?`<div class="links">${camps.map(c=>`<a class="link-chip" href="#/app/campanas/${c.id}">${ic('megaphone')}${esc(c.name)}</a>`).join('')}</div>`:'<span class="muted">Sin campañas vinculadas</span>'}</dd></div></dl></article>`;
}
function stPersonas(){
  const ps=M().personas.filter(pInBrand);
  return `<div class="toolbar"><p class="muted grow">Quiénes son, qué buscan y dónde encontrarlos. Cada buyer persona se vincula a una o más unidades de negocio y a las campañas que le hablan.</p><button class="btn" id="newpersona">${ic('plus')} Nueva buyer persona</button></div>
  ${ps.length?`<div class="cards persona-grid">${ps.map(personaCard).join('')}</div>`:emptyBlock('users2',curBrand()?`Sin buyer personas en ${esc(curBrand().name)}`:'Sin buyer personas','Describí a tu cliente ideal para orientar contenidos y campañas.')}`;
}
function personaForm(p){
  const isNew=!p; p=p?pNorm(p):{name:'',age:'',role:'',quote:'',goals:'',pains:'',channels:[],brands:curBrand()?[curBrand().name]:(S.brands.length===1?[S.brands[0].name]:[])};
  const camps=M().campaigns, linked=isNew?[]:pCamps(p).map(c=>c.id);
  modal(isNew?'Nueva buyer persona':'Editar buyer persona',`<div class="form-grid">${F('pn','Nombre',`value="${esc(p.name)}" placeholder="Ej.: Carolina"`)}${F('pa','Edad',`value="${esc(p.age)}" placeholder="Ej.: 38 años"`)}</div>
   <div class="field"><label for="pr">Quién es</label><textarea class="input" id="pr" rows="2" placeholder="Ej.: Responsable de RR. HH. en una empresa mediana de Córdoba">${esc(p.role)}</textarea></div>
   <div class="field"><label for="pq">Frase que la representa (opcional)</label><input class="input" id="pq" value="${esc(p.quote)}" placeholder="Ej.: Necesito que el día del evento funcione solo"></div>
   <div class="field"><label for="pg">Objetivos</label><textarea class="input" id="pg" rows="3">${esc(p.goals)}</textarea></div>
   <div class="field"><label for="pp">Frustraciones</label><textarea class="input" id="pp" rows="3">${esc(p.pains)}</textarea></div>
   <div class="field"><span class="label">Dónde está</span><div style="display:flex;gap:12px;flex-wrap:wrap" id="pch">${CHANNELS.map(c=>`<label class="check"><input type="checkbox" value="${c}" ${p.channels.includes(c)?'checked':''}> ${c}</label>`).join('')}</div></div>
   <div class="field" id="pbf"><span class="label">Unidades de negocio</span><div style="display:flex;gap:12px;flex-wrap:wrap" id="pbr">${S.brands.map(b=>`<label class="check"><input type="checkbox" value="${esc(b.name)}" ${p.brands.includes(b.name)?'checked':''}> <i class="sdot" style="background:${b.color};margin-top:6px"></i>${esc(b.name)}</label>`).join('')}</div>
    <div style="display:flex;gap:8px;margin-top:8px"><input class="input" id="pnb" placeholder="Nueva unidad, ej.: Barra de eventos" style="height:32px" aria-label="Nueva unidad de negocio"><button type="button" class="btn btn-sm" id="paddb">Agregar</button></div>
    <span class="hint">Son las marcas de la empresa. Una buyer persona puede pertenecer a más de una.</span><span class="err" role="alert"></span></div>
   <div class="field"><span class="label">Campañas</span><div style="display:flex;flex-direction:column;gap:8px" id="pcp">${camps.length?camps.map(c=>`<label class="check"><input type="checkbox" value="${c.id}" ${linked.includes(c.id)?'checked':''}> <span>${esc(c.name)} <span class="small muted">· ${esc(c.brand)} · ${esc(c.status)}</span></span></label>`).join(''):'<span class="small muted">Todavía no hay campañas. Cuando crees una, la vas a poder vincular desde acá o desde la campaña.</span>'}</div></div>`,
   `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">${isNew?'Crear':'Guardar cambios'}</button>`);
  $('#paddb').onclick=()=>{ const v=$('#pnb').value.trim(); if(!v) return; if(S.brands.some(b=>b.name.toLowerCase()===v.toLowerCase())) return toast('Esa unidad de negocio ya existe');
    const b={name:v,color:COLORS[S.brands.length%COLORS.length]}; S.brands.push(b); logAct(`Creaste la marca ${v}`);
    $('#pbr').insertAdjacentHTML('beforeend',`<label class="check"><input type="checkbox" value="${esc(v)}" checked> <i class="sdot" style="background:${b.color};margin-top:6px"></i>${esc(v)}</label>`); $('#pnb').value=''; toast(`Unidad ${v} creada`); };
  $('#ok').onclick=()=>{ const brands=$$('#pbr input:checked').map(i=>i.value);
    let ok=fieldErr($('#pn'),!$('#pn').value.trim()?'Escribí un nombre':''); ok=fieldErr($('#pbr'),!brands.length?'Elegí al menos una unidad de negocio':'')&&ok; if(!ok) return;
    const t=isNew?{id:uid()}:p; Object.assign(t,{name:$('#pn').value.trim(),age:$('#pa').value.trim(),role:$('#pr').value.trim(),quote:$('#pq').value.trim(),goals:$('#pg').value.trim(),pains:$('#pp').value.trim(),channels:$$('#pch input:checked').map(i=>i.value),brands,brand:brands[0]});
    if(isNew) M().personas.push(t);
    const sel=$$('#pcp input:checked').map(i=>i.value); M().campaigns.forEach(c=>{ const has=(c.personas||[]).includes(t.id), want=sel.includes(c.id); if(want&&!has) c.personas=(c.personas||[]).concat(t.id); if(!want&&has) c.personas=c.personas.filter(x=>x!==t.id); });
    closeLayer(); render(); toast(isNew?'Buyer persona creada':'Cambios guardados'); };
}
function personaDelete(p){
  const camps=pCamps(p);
  modal('¿Eliminar la buyer persona?',`<p>Vas a eliminar a <b>${esc(p.name)}</b>.${camps.length?` Se va a desvincular de ${camps.length} campaña${camps.length>1?'s':''}.`:''}</p>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-danger" id="okdel">Eliminar</button>`);
  $('#okdel').onclick=()=>{ const m2=M(); m2.personas=m2.personas.filter(x=>x!==p); m2.campaigns.forEach(c=>{ if(c.personas) c.personas=c.personas.filter(x=>x!==p.id); }); closeLayer(); render(); toast('Buyer persona eliminada'); };
}
function stPos(){
  const b=curBrand(); const m=M();
  if(!b) return `<div class="card empty"><div class="eico">${ic('tag')}</div><h3>Elegí una marca</h3><p class="muted small">El posicionamiento es propio de cada marca.</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${S.brands.length?'':`<button class="btn btn-primary btn-sm" data-mkbrand>${ic('plus')} Crear marca</button>`}${S.brands.map((x,i)=>`<button class="btn btn-sm" data-pickbrand="${i}"><i class="sdot" style="background:${x.color}"></i>${esc(x.name)}</button>`).join('')}</div></div>`;
  const p=m.positioning[b.name]||{statement:'',value:'',pillars:[],diff:''};
  return `<form id="fpos" class="grid g-dash"><section class="card span-8"><div class="card-head"><h3>Declaración de posicionamiento</h3><span class="badge"><i class="sdot" style="background:${b.color}"></i>${esc(b.name)}</span></div>
  ${p.statement?`<p class="statement" style="margin-bottom:20px">${esc(p.statement)}</p>`:''}
  <div class="field"><label for="ps">Declaración</label><textarea class="input" id="ps" rows="4" placeholder="Para [público] que [necesidad], [marca] es [categoría] que [beneficio], porque [razón para creer].">${esc(p.statement)}</textarea><span class="hint">Fórmula: para quién, qué es, qué beneficio y por qué creerle.</span></div>
  <div class="field"><label for="pv">Propuesta de valor</label><textarea class="input" id="pv" rows="2">${esc(p.value)}</textarea></div>
  <div class="field"><label for="pd">Diferenciales</label><textarea class="input" id="pd" rows="2">${esc(p.diff)}</textarea></div>
  <div style="display:flex;justify-content:flex-end;gap:8px"><button type="button" class="btn" data-ai-pos>${ic('spark')} Mejorar con IA</button><button class="btn btn-primary">Guardar</button></div></section>
  <section class="card span-4"><h3 style="margin-bottom:12px">Pilares de comunicación</h3><div class="pill-list" id="pillars">${p.pillars.map(x=>`<span class="pill">${esc(x)}</span>`).join('')||'<span class="small muted">Sin pilares todavía</span>'}</div>
  <div style="display:flex;gap:8px;margin-top:16px"><input class="input" id="newpillar" placeholder="Ej.: Educación" style="height:32px"><button type="button" class="btn btn-sm" id="addpillar">Agregar</button></div>
  <p class="small muted" style="margin-top:16px">Los pilares aparecen como opción al planificar cada contenido.</p></section></form>`;
}
let planView='trimestral';
function stPlanes(){
  const items=M().plan.filter(inBrand).sort((a,b)=>a.date.localeCompare(b.date));
  const y=NOW.getFullYear(), mo=NOW.getMonth();
  let months=planView==='mensual'?[[y,mo]]:planView==='trimestral'?[0,1,2].map(i=>[y+Math.floor((mo+i)/12),(mo+i)%12]):Array.from({length:12},(_,i)=>[y,i]);
  const typeIc={Lanzamiento:'flag',Evento:'calendar',Campaña:'megaphone',Contenido:'image',Interno:'settings'};
  return `<div class="toolbar"><div class="seg" role="group" aria-label="Período">${['mensual','trimestral','anual'].map(v=>`<button data-pv="${v}" aria-pressed="${planView===v}">${v[0].toUpperCase()+v.slice(1)}</button>`).join('')}</div><span class="grow"></span><button class="btn" id="newplan">${ic('plus')} Agregar hito</button></div>
  <div class="card" style="padding:8px 24px"><div class="timeline">${months.map(([yy,mm])=>{const its=items.filter(i=>{const d=parse(i.date);return d.getFullYear()===yy&&d.getMonth()===mm});
   return `<div class="tl-month"><div><b style="text-transform:capitalize">${MES[mm]}</b><div class="small muted">${yy}${yy===y&&mm===mo?' · actual':''}</div></div><div class="tl-items">${its.map(i=>`<div class="tl-item">${ic(typeIc[i.type]||'flag')}<div class="grow"><b>${esc(i.t)}</b><div class="small muted">${fdate(i.date)} · ${esc(i.owner)}</div></div><span class="badge">${esc(i.type)}</span><i class="sdot" style="background:${brandOf(i.brand).color}" title="${esc(i.brand)}"></i></div>`).join('')||`<span class="small muted">${planView==='anual'?'—':'Sin hitos este mes'}</span>`}</div></div>`}).join('')}</div></div>`;
}
function stBudget(){
  const b=M().budget, spent=b.items.reduce((a,i)=>a+i.s,0), asg=b.items.reduce((a,i)=>a+i.a,0);
  return `<div class="stat-grid"><div class="stat"><div class="l">Presupuesto ${esc(b.period||'')}</div><div class="v">${money(b.total)}</div></div><div class="stat"><div class="l">Asignado</div><div class="v">${money(asg)}</div><div class="d">${pct(asg,b.total)}% del total</div></div><div class="stat"><div class="l">Ejecutado</div><div class="v">${money(spent)}</div><div class="d">${pct(spent,b.total)}% del total</div></div><div class="stat"><div class="l">Disponible</div><div class="v">${money(b.total-spent)}</div></div></div>
  <div class="grid g-dash"><section class="card span-8"><div class="card-head"><h3>Asignación por destino</h3><button class="btn btn-sm" id="editbudget">${ic('edit')} Editar</button></div>
  ${b.items.length?'':'<p class="small muted">Todavía no cargaste el presupuesto. Tocá «Editar» para poner el total del período y repartirlo por destino (por ejemplo: Meta Ads, Google Ads, producción).</p>'}${b.items.map(i=>{const p=pct(i.s,i.a);return `<div class="meter-row"><span>${esc(i.ch)}</span><div class="bar ${p>100?'over':p>85?'warn':''}"><i style="width:${Math.min(100,p)}%"></i></div><span class="mono small">${money(i.s)} / ${money(i.a)}</span></div>`}).join('')}</section>
  <section class="card span-4"><h3 style="margin-bottom:12px">Recursos del equipo</h3><p class="small muted" style="margin-bottom:12px">Dedicación por marca este período.</p>
  ${(b.team||[]).length?'':'<p class="small muted">Sin dedicación cargada.</p>'}${(b.team||[]).map(t=>`<div style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="person"><span class="avatar sm">${initials(t.who)}</span><b>${esc(t.who)}</b><span class="small muted">${esc(t.role)}</span></div><div style="display:flex;gap:4px;margin-top:8px">${Object.entries(t.alloc).map(([br,v])=>`<div title="${esc(br)} ${v}%" style="height:8px;border-radius:4px;flex:${v};background:${brandOf(br).color}"></div>`).join('')}<div style="flex:${Math.max(0,100-Object.values(t.alloc).reduce((a,v)=>a+v,0))};background:var(--surface-sunken);height:8px;border-radius:4px"></div></div></div>`).join('')}
  <div class="legend">${S.brands.map(x=>`<span><i class="sdot" style="background:${x.color}"></i>${esc(x.name)}</span>`).join('')}<span><i class="sdot" style="background:var(--surface-sunken);border:1px solid var(--line)"></i>Libre</span></div></section></div>`;
}
function ensureBrand(next){
  if(S.brands.length) return next();
  modal('Primero creá una unidad de negocio',`<p class="muted small" style="margin-bottom:16px">Los objetivos, buyer personas, KPI, hitos y el posicionamiento se organizan por marca. Creá la primera ahora; después podés sumar más desde Configuración → Marcas.</p>${F('nbm','Nombre de la marca',`value="${esc(S.company?.name||'')}" placeholder="Ej.: Café del Centro"`)}`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="okb">Crear marca y seguir</button>`);
  $('#okb').onclick=()=>{ const v=$('#nbm').value.trim(); if(!fieldErr($('#nbm'),!v?'Ingresá el nombre de la marca':''))return;
    S.brands.push({name:v,color:COLORS[0]}); S.brand=S.brands.length-1; logAct(`Creaste la marca ${v}`); closeLayer(); render(); toast(`Marca ${v} creada`); next(); };
}
function bEstrategia(tab){
  bindDemo();
  $$('[data-mkbrand]').forEach(b=>b.onclick=()=>ensureBrand(()=>{}));
  const newObj=()=>ensureBrand(()=>{ const brands=S.brands; modal('Nuevo objetivo',`${F('ot','Objetivo','placeholder="Ej.: Duplicar los leads de LinkedIn"')}<div class="form-grid"><div class="field"><label for="ob">Unidad de negocio</label><select class="select" id="ob">${brands.map(b=>`<option ${curBrand()===b?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div><div class="field"><label for="op">Período</label><select class="select" id="op"><option>Q4 2026</option><option>Q1 2027</option><option>2027</option><option>Diciembre 2026</option></select></div></div>
   <div class="field"><span class="label">Resultado clave</span><div class="form-grid"><input class="input" id="krt" placeholder="Ej.: Leads calificados"><input class="input" id="krv" type="number" min="1" placeholder="Meta, ej.: 300"></div><span class="hint">Podés sumar más resultados clave después.</span></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Crear objetivo</button>`);
   $('#ok').onclick=()=>{ const t=$('#ot'); if(!fieldErr(t,!t.value.trim()?'Escribí el objetivo':''))return; if(!S.brands.length) return toast('Primero creá una unidad de negocio');
    M().objectives.unshift({id:uid(),title:t.value.trim(),brand:$('#ob').value,period:$('#op').value,owner:S.user.name,krs:$('#krt').value&&+$('#krv').value?[{t:$('#krt').value,cur:0,target:+$('#krv').value,unit:''}]:[]}); closeLayer(); go('#/app/estrategia/okr'); render(); toast('Objetivo creado'); }; });
  [$('#newobj'),...$$('[data-newobj]')].filter(Boolean).forEach(b=>b.onclick=newObj);
  const on=(s,f)=>{const e=$(s);if(e)e.onclick=f};
  on('#newkpi',()=>ensureBrand(()=>{ modal('Agregar KPI',`${F('kn','Indicador','placeholder="Ej.: Alcance mensual"')}<div class="form-grid"><div class="field"><label for="kc">Canal</label><select class="select" id="kc">${CHANNELS.concat(['Meta Ads','Google Ads']).map(c=>`<option>${c}</option>`).join('')}</select></div>${F('kt','Meta','type="number" min="0"')}</div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Agregar</button>`);
   $('#ok').onclick=()=>{ if(!fieldErr($('#kn'),!$('#kn').value.trim()?'Escribí el indicador':''))return; M().kpis.push({name:$('#kn').value.trim(),channel:$('#kc').value,brand:(curBrand()||S.brands[0]||{name:''}).name,target:+$('#kt').value||0,actual:0,unit:''}); closeLayer(); render(); toast('KPI agregado'); }; }));
  on('#newpersona',()=>ensureBrand(()=>personaForm()));
  const pById=id=>M().personas.find(x=>x.id===id);
  $$('[data-pedit]').forEach(b=>b.onclick=()=>{ const p=pById(b.dataset.pedit); if(p) personaForm(p); });
  $$('[data-pdel]').forEach(b=>b.onclick=()=>{ const p=pById(b.dataset.pdel); if(p) personaDelete(p); });
  $$('[data-pickbrand]').forEach(b=>b.onclick=()=>{S.brand=+b.dataset.pickbrand;render()});
  if($('#fpos')){ const b=curBrand(); const m=M(); m.positioning[b.name]=m.positioning[b.name]||{statement:'',value:'',pillars:[],diff:''}; const p=m.positioning[b.name];
    $('#fpos').onsubmit=e=>{e.preventDefault(); p.statement=$('#ps').value; p.value=$('#pv').value; p.diff=$('#pd').value; render(); toast('Posicionamiento guardado'); };
    $('#addpillar').onclick=()=>{ const v=$('#newpillar').value.trim(); if(!v) return; if(p.pillars.some(x=>x.toLowerCase()===v.toLowerCase())) return toast('Ese pilar ya está'); p.pillars.push(v); render(); toast(`Pilar «${v}» agregado`); };
    $('#newpillar').onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); $('#addpillar').click(); } };
    $('[data-ai-pos]').onclick=()=>toast('La IA va a sugerir mejoras a partir de tus buyer personas (próximamente)'); }
  $$('[data-pv]').forEach(b=>b.onclick=()=>{planView=b.dataset.pv;render()});
  on('#newplan',()=>ensureBrand(()=>{ modal('Agregar hito al plan',`${F('ht','Hito','placeholder="Ej.: Campaña Día de la Madre"')}<div class="form-grid"><div class="field"><label for="hy">Tipo</label><select class="select" id="hy"><option>Campaña</option><option>Lanzamiento</option><option>Evento</option><option>Contenido</option><option>Interno</option></select></div>${F('hd','Fecha',`type="date" value="${iso(NOW)}"`)}</div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Agregar</button>`);
   $('#ok').onclick=()=>{ if(!fieldErr($('#ht'),!$('#ht').value.trim()?'Escribí el hito':''))return; M().plan.push({id:uid(),t:$('#ht').value.trim(),type:$('#hy').value,date:$('#hd').value||iso(NOW),brand:(curBrand()||S.brands[0]||{name:''}).name,owner:S.user.name}); closeLayer(); render(); toast('Hito agregado al plan'); }; }));
  on('#editbudget',()=>{ const b=M().budget; modal('Editar presupuesto',`${F('bt','Presupuesto total del período',`type="number" value="${b.total}"`)}${b.items.map((i,k)=>`<div class="field"><label for="ba${k}">${esc(i.ch)}</label><input class="input" id="ba${k}" type="number" value="${i.a}"></div>`).join('')}<div class="field"><span class="label">Agregar destino</span><div class="form-grid"><input class="input" id="bnn" placeholder="Ej.: Meta Ads" aria-label="Nombre del destino"><input class="input" id="bna" type="number" min="0" placeholder="Monto" aria-label="Monto del destino"></div><span class="hint">Opcional. Para sumar otro destino, volvé a tocar «Editar».</span></div><div id="bsum" class="small muted"></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Guardar</button>`);
   const sum=()=>{const s=b.items.reduce((a,_,k)=>a+(+$('#ba'+k).value||0),0)+(+$('#bna').value||0),t=+$('#bt').value||0;$('#bsum').innerHTML=s>t?`<span style="color:var(--danger)">Asignaste ${money(s)}: supera el total por ${money(s-t)}.</span>`:`Asignado ${money(s)} · disponible ${money(t-s)}`;return s<=t};
   $$('#layer input').forEach(i=>i.oninput=sum); sum();
   $('#ok').onclick=()=>{ if(!sum()) return; b.total=+$('#bt').value||0; b.items.forEach((i,k)=>i.a=+$('#ba'+k).value||0); const nn=$('#bnn').value.trim(); if(nn) b.items.push({ch:nn,a:+$('#bna').value||0,s:0}); closeLayer(); render(); toast('Presupuesto actualizado'); }; });
}

/* =====================================================================
   03 · CONTENIDOS
   ===================================================================== */
let cFilt={channel:'',status:'',format:''}, weekOff=0, monthOff=0;
function contentsFiltered(){ return M().contents.filter(c=>inBrand(c)&&(!cFilt.channel||c.channel===cFilt.channel)&&(!cFilt.status||c.status===cFilt.status)&&(!cFilt.format||c.format===cFilt.format)); }
function cChip(c){ const b=brandOf(c.brand); return `<button class="cchip" data-open="${c.id}" title="${esc(c.title)} · ${c.status}"><span class="bd" style="background:${b.color}"></span>${ic(fmtIcon(c.format))}<span class="t">${esc(c.title)}</span><i class="sdot st-${c.status}"></i></button>`; }
function vContenidos(view){
  view=['mes','semana','lista'].includes(view)?view:'mes';
  const all=M().contents, list=contentsFiltered();
  const head=pageHead('Contenidos','Calendario editorial de todas tus marcas y canales.',`${brandScope()}<button class="btn btn-primary" id="newc">${ic('plus')} Nuevo contenido</button>`);
  if(!all.length) return head+emptyBlock('calendar','Planificá tu primer contenido','Elegí formato, canal y fecha. Después lo pasás por revisión y lo programás.',`<button class="btn btn-primary" data-newc>${ic('plus')} Nuevo contenido</button>`);
  const sel=(id,label,opts,v)=>`<select class="select sm" id="${id}" aria-label="${label}"><option value="">${label}: todos</option>${opts.map(o=>`<option ${o===v?'selected':''}>${o}</option>`).join('')}</select>`;
  const counts=STATUSES.map(s=>[s,list.filter(c=>c.status===s).length]);
  const bar=`<div class="toolbar"><div class="seg" role="group" aria-label="Vista"><a href="#/app/contenidos/mes" ${view==='mes'?'aria-current="page"':''}>${ic('grid')} Mes</a><a href="#/app/contenidos/semana" ${view==='semana'?'aria-current="page"':''}>${ic('calendar')} Semana</a><a href="#/app/contenidos/lista" ${view==='lista'?'aria-current="page"':''}>${ic('menu')} Lista</a></div>
   ${sel('fch','Canal',CHANNELS,cFilt.channel)}${sel('fst','Estado',STATUSES,cFilt.status)}${sel('ffm','Formato',FORMATS.map(f=>f[0]),cFilt.format)}<span class="grow"></span><span class="small muted">${list.length} contenidos</span></div>`;
  const legend=`<div class="legend">${counts.map(([s,n])=>`<span><i class="sdot st-${s}"></i>${s} · ${n}</span>`).join('')}<span>│ Borde izquierdo = color de la marca</span></div>`;
  let body='';
  if(view==='mes'){
    const ref=new Date(NOW.getFullYear(),NOW.getMonth()+monthOff,1,12); const first=(ref.getDay()+6)%7; const start=addDays(ref,-first);
    const cells=Array.from({length:42},(_,i)=>addDays(start,i)); const rows=cells.slice(35).every(d=>d.getMonth()!==ref.getMonth())?35:42;
    body=`<div class="toolbar" style="margin-bottom:8px"><button class="icon-btn" id="mprev" aria-label="Mes anterior">${ic('chevr')}</button><h3 style="text-transform:capitalize;min-width:160px;text-align:center">${MES[ref.getMonth()]} ${ref.getFullYear()}</h3><button class="icon-btn" id="mnext" aria-label="Mes siguiente">${ic('chevr')}</button><button class="btn btn-sm" id="mtoday">Hoy</button></div>
    <div class="cal"><div class="cal-head">${DIA.map(d=>`<div>${d}</div>`).join('')}</div><div class="cal-grid">${cells.slice(0,rows).map(d=>{const its=list.filter(c=>c.date===iso(d));const out=d.getMonth()!==ref.getMonth();
     return `<div class="cal-day ${out?'out':''} ${iso(d)===iso(NOW)?'today':''} ${its.length?'':'empty'}"><div class="dn"><b>${d.getDate()}</b><button class="add" data-newat="${iso(d)}" aria-label="Agregar contenido el ${d.getDate()}">+</button></div>${its.slice(0,3).map(cChip).join('')}${its.length>3?`<span class="small muted">+${its.length-3} más</span>`:''}</div>`}).join('')}</div></div>${legend}`;
  } else if(view==='semana'){
    const mon=addDays(NOW,-((NOW.getDay()+6)%7)+weekOff*7); const days=Array.from({length:7},(_,i)=>addDays(mon,i));
    body=`<div class="toolbar" style="margin-bottom:8px"><button class="icon-btn" id="wprev" aria-label="Semana anterior" style="transform:rotate(180deg)">${ic('chevr')}</button><h3 style="min-width:200px;text-align:center">${days[0].getDate()} ${MES[days[0].getMonth()].slice(0,3)} – ${days[6].getDate()} ${MES[days[6].getMonth()].slice(0,3)}</h3><button class="icon-btn" id="wnext" aria-label="Semana siguiente">${ic('chevr')}</button><button class="btn btn-sm" id="wtoday">Esta semana</button></div>
    <div class="week">${days.map((d,i)=>{const its=list.filter(c=>c.date===iso(d)).sort((a,b)=>a.time.localeCompare(b.time));return `<div class="week-col ${iso(d)===iso(NOW)?'today':''}"><h4><span>${DIA[i]} ${d.getDate()}</span><button class="add" style="opacity:1;border:0;background:none;cursor:pointer;color:var(--ink-muted)" data-newat="${iso(d)}" aria-label="Agregar">+</button></h4>
     ${its.map(c=>`<button class="wcard" data-open="${c.id}" style="border-left:3px solid ${brandOf(c.brand).color}"><div class="meta">${ic(fmtIcon(c.format))}${c.format} · ${c.channel}</div><b>${esc(c.title)}</b><div class="meta"><span class="mono">${c.time}</span><span class="${stBadge(c.status)}" style="padding:1px 6px">${c.status}</span></div></button>`).join('')||'<span class="small muted" style="padding:8px 4px">Sin contenidos</span>'}</div>`}).join('')}</div>${legend}`;
  } else {
    const rows=[...list].sort((a,b)=>a.date.localeCompare(b.date));
    body=`<div class="table-wrap"><table class="t"><thead><tr><th>Contenido</th><th>Fecha</th><th class="hide-m">Canal</th><th>Estado</th><th class="hide-m">Responsable</th><th class="hide-m">Campaña</th><th class="num hide-m">Alcance</th></tr></thead><tbody>
    ${rows.map(c=>{const camp=M().campaigns.find(x=>x.id===c.campaign);return `<tr data-open="${c.id}" style="cursor:pointer"><td><div class="person"><span class="mark" style="width:28px;height:28px;background:${brandOf(c.brand).color}">${ic(fmtIcon(c.format))}</span><div><b>${esc(c.title)}</b><div class="small muted">${c.format} · ${esc(c.brand)}</div></div></div></td><td class="mono small">${fdate(c.date)} ${c.time}</td><td class="hide-m">${c.channel}</td><td><span class="${stBadge(c.status)}">${c.status}</span></td><td class="hide-m">${esc(c.owner)}</td><td class="hide-m small">${camp?esc(camp.name):'—'}</td><td class="num hide-m">${c.metrics?num(c.metrics.reach):'—'}</td></tr>`}).join('')||`<tr><td colspan="7"><div class="empty"><p class="muted small">Ningún contenido coincide con los filtros.</p></div></td></tr>`}</tbody></table></div>`;
  }
  return head+bar+body;
}
function bContenidos(view){
  bindDemo();
  const open=id=>contentEditor(M().contents.find(c=>c.id===id));
  [$('#newc'),...$$('[data-newc]')].filter(Boolean).forEach(b=>b.onclick=()=>contentEditor(null));
  $$('[data-open]').forEach(el=>el.onclick=()=>open(el.dataset.open));
  $$('[data-newat]').forEach(b=>b.onclick=e=>{e.stopPropagation();contentEditor(null,b.dataset.newat)});
  [['fch','channel'],['fst','status'],['ffm','format']].forEach(([id,k])=>{const s=$('#'+id);if(s)s.onchange=()=>{cFilt[k]=s.value;render()}});
  const on=(s,f)=>{const e=$(s);if(e)e.onclick=f};
  on('#mprev',()=>{monthOff--;render()}); on('#mnext',()=>{monthOff++;render()}); on('#mtoday',()=>{monthOff=0;render()});
  on('#wprev',()=>{weekOff--;render()}); on('#wnext',()=>{weekOff++;render()}); on('#wtoday',()=>{weekOff=0;render()});
  if($('#mprev')) $('#mprev').style.transform='rotate(180deg)';
}
const FLOW=['Idea','Borrador','Revisión','Aprobado','Programado','Publicado'];
function contentEditor(c,date){
  const isNew=!c; const m=M();
  if(!S.brands.length){ toast('Primero creá una marca'); return; }
  c=c?JSON.parse(JSON.stringify(c)):{id:uid(),title:'',format:'Post',channel:'Instagram',brand:(curBrand()||S.brands[0]).name,status:'Idea',campaign:'',objective:'',owner:S.user.name,date:date||iso(NOW),time:'12:00',copy:'',hashtags:'',cta:'',files:[],comments:[],metrics:null};
  const limits={Instagram:2200,Facebook:63206,TikTok:2200,LinkedIn:3000,Blog:20000,Email:20000};
  const camps=m.campaigns, objs=m.objectives;
  const pillars=unitPillars(c.brand);
  const html=()=>`<div class="dr-head"><span class="mark" style="background:${brandOf(c.brand).color}">${ic(fmtIcon(c.format))}</span><div style="flex:1;min-width:0"><input class="input" id="ct" value="${esc(c.title)}" placeholder="Título interno del contenido" style="border:0;font-weight:600;font-size:16px;padding:0;height:28px;background:transparent" aria-label="Título"><div class="flow-steps" style="margin-top:4px">${FLOW.map(s=>{const i=FLOW.indexOf(s),cur=FLOW.indexOf(c.status);return `<span class="${i<cur?'done':i===cur?'on':''}">${s}</span>`}).join('')}</div></div><button class="icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div>
  <div class="dr-body"><div class="dr-main">
   <div class="field"><span class="label">Formato</span><div class="formats" role="radiogroup">${FORMATS.map(([f,i])=>`<button type="button" class="fmt" data-fmt="${f}" aria-pressed="${c.format===f}">${ic(i)}${f}</button>`).join('')}</div></div>
   <div class="form-grid"><div class="field"><label for="cch">Canal</label><select class="select" id="cch">${CHANNELS.map(x=>`<option ${x===c.channel?'selected':''}>${x}</option>`).join('')}</select></div>
   <div class="field"><label for="cbr">Unidad de negocio</label><select class="select" id="cbr">${S.brands.map(b=>`<option ${b.name===c.brand?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div></div>
   <div class="field"><div style="display:flex;justify-content:space-between;align-items:center"><label for="ccp">Copy</label><button type="button" class="btn btn-ghost btn-sm" id="aicopy">${ic('spark')} Escribir con IA</button></div><textarea class="input" id="ccp" rows="6" placeholder="Escribí el texto de la publicación…">${esc(c.copy)}</textarea><div class="counter" id="cnt"></div></div>
   <div class="form-grid">${F('chs','Hashtags',`value="${esc(c.hashtags)}" placeholder="#marca #tema"`)}${F('cta','Llamado a la acción',`value="${esc(c.cta)}" placeholder="Ej.: Comprá online"`)}</div>
   <div class="field"><span class="label">Archivos</span><div class="files" id="files">${c.files.map((f,i)=>`<div class="file"><span class="thumb" style="background:${f.t==='video'?'#0E0E10':brandOf(c.brand).color}">${ic(f.t==='video'?'video':f.t==='file'?'file':'image')}</span><span class="grow">${esc(f.n)}</span><span class="small muted">${f.s}</span><button type="button" class="icon-btn" data-rmf="${i}" aria-label="Quitar">${ic('x')}</button></div>`).join('')}</div>
    <div class="upload" id="addfile" role="button" tabindex="0" style="margin-top:6px">${ic('upload')} Arrastrá imágenes, videos o documentos · o elegilos de la <b>biblioteca de marca</b></div></div>
   <h3 style="margin:24px 0 12px">Comentarios y revisión</h3><div class="comments">${c.comments.map(x=>`<div class="comment"><span class="avatar sm">${initials(x.who)}</span><div class="bubble"><b>${esc(x.who)}</b> <span class="small muted">${x.when}</span><div>${esc(x.t)}</div></div></div>`).join('')||'<p class="small muted">Sin comentarios todavía.</p>'}
    <div style="display:flex;gap:8px"><input class="input" id="newcm" placeholder="Escribí un comentario o mencioná con @"><button type="button" class="btn" id="addcm">${ic('send')}</button></div></div>
  </div><aside class="dr-side">
   <div><span class="label" style="display:block;margin-bottom:8px">Vista previa · ${c.channel}</span>${preview(c)}</div>
   <div class="form-grid side-dt">${F('cdt','Fecha',`type="date" value="${c.date}"`)}${F('chr','Hora',`type="time" value="${c.time}"`)}</div>
   <div class="field"><label for="cow">Responsable</label><select class="select" id="cow">${OWNERS().map(o=>`<option ${o===c.owner?'selected':''}>${esc(o)}</option>`).join('')}</select></div>
   <div class="field"><label for="ccm">Campaña</label><select class="select" id="ccm"><option value="">Sin campaña</option>${camps.filter(x=>x.brand===c.brand).map(x=>`<option value="${x.id}" ${x.id===c.campaign?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div>
   <div class="field"><label for="cob">Objetivo</label><select class="select" id="cob"><option value="">Sin objetivo</option>${objs.filter(x=>x.brand===c.brand).map(x=>`<option value="${x.id}" ${x.id===c.objective?'selected':''}>${esc(x.title)}</option>`).join('')}</select></div>
   ${pillars.length?`<div class="field"><label for="cpl">Pilar de contenido</label><select class="select" id="cpl">${pillars.map(p=>`<option>${esc(p)}</option>`).join('')}</select></div>`:''}
   ${c.metrics?`<div class="card" style="padding:16px"><h3 style="margin-bottom:8px">Rendimiento</h3><dl class="kv"><dt>Alcance</dt><dd>${num(c.metrics.reach)}</dd><dt>Me gusta</dt><dd>${num(c.metrics.likes)}</dd><dt>Comentarios</dt><dd>${num(c.metrics.comments)}</dd><dt>Guardados</dt><dd>${num(c.metrics.saves)}</dd><dt>Engagement</dt><dd>${(((c.metrics.likes+c.metrics.comments+c.metrics.saves)/Math.max(1,c.metrics.reach))*100).toFixed(1).replace('.',',')}%</dd></dl><p class="small muted" style="margin-top:8px">Sincronizado desde ${c.channel} hace 18 min</p></div>`:''}
   ${API_PUBLISH[c.channel]?'':`<div class="alert alert-warn">${ic('alert')}<div>${c.channel} no permite publicar automáticamente. Vas a recibir un recordatorio para publicarlo a mano.</div></div>`}
  </aside></div>
  <div class="dr-foot"><div style="display:flex;gap:8px">${isNew?'':`<button class="btn btn-ghost btn-sm" id="delc" style="color:var(--danger)">${ic('trash')} Eliminar</button>`}</div><div style="display:flex;gap:8px;flex-wrap:wrap" id="actions">${flowActions(c)}</div></div>`;
  drawerWide(html());
  const read=()=>{ c.title=$('#ct').value.trim(); c.channel=$('#cch').value; c.brand=$('#cbr').value; c.copy=$('#ccp').value; c.hashtags=$('#chs').value; c.cta=$('#cta').value; c.date=$('#cdt').value||c.date; c.time=$('#chr').value||c.time; c.owner=$('#cow').value; c.campaign=$('#ccm').value; c.objective=$('#cob').value; };
  const rerender=()=>{ read(); const sc=$('.dr-body').scrollTop; $('#layer .drawer').innerHTML=html(); bind(); $('.dr-body').scrollTop=sc; };
  const save=(status,msg)=>{ read(); if(!c.title){ $('#ct').focus(); $('#ct').style.borderBottom='2px solid var(--danger)'; toast('Poné un título para guardarlo'); return; }
    if(status) c.status=status; const arr=M().contents; const i=arr.findIndex(x=>x.id===c.id); if(i>=0) arr[i]=c; else arr.push(c);
    if(status==='Revisión') notify('Contenido para revisar',`«${c.title}» espera tu aprobación.`); logAct(`${msg||'Guardaste'} «${c.title}»`);
    closeLayer(); render(); toast(msg?`${msg}: ${c.title}`:'Contenido guardado'); };
  function bind(){
    $$('#layer [data-close]').forEach(b=>b.onclick=closeLayer);
    const cnt=()=>{ const n=$('#ccp').value.length, lim=limits[$('#cch').value]||2200; $('#cnt').textContent=`${n} / ${nf.format(lim)}`; $('#cnt').classList.toggle('over',n>lim); };
    $('#ccp').oninput=()=>{cnt(); const pv=$('.ig-c'); if(pv) pv.innerHTML=`<b>${esc(brandHandle(c.brand))}</b> ${esc($('#ccp').value)}${$('#chs').value?' <span style="color:var(--magenta-text)">'+esc($('#chs').value)+'</span>':''}`;}; cnt();
    $$('#layer [data-fmt]').forEach(b=>b.onclick=()=>{ c.format=b.dataset.fmt; rerender(); });
    $('#cch').onchange=rerender; $('#cbr').onchange=rerender;
    const ccm=$('#ccm'); if(ccm) ccm.onchange=()=>{ const cp=M().campaigns.find(x=>x.id===ccm.value); if(cp&&cp.objectiveId&&$('#cob')) $('#cob').value=cp.objectiveId; };
    $$('#layer [data-rmf]').forEach(b=>b.onclick=()=>{ c.files.splice(+b.dataset.rmf,1); rerender(); });
    $('#addfile').onclick=()=>{ c.files.push({n:`archivo-${c.files.length+1}.${c.format==='Reel'||c.format==='Video'?'mp4':'png'}`,t:c.format==='Reel'||c.format==='Video'?'video':'image',s:'1,4 MB'}); rerender(); toast('Archivo adjuntado (simulado)'); };
    $('#aicopy').onclick=e=>{ e.target.closest('button').classList.add('is-loading'); setTimeout(()=>{ const ex={Reel:'3 ideas rápidas para',Carrusel:'Guardá este paso a paso:',Historia:'¿Vos qué elegís?',Post:'Te contamos',Video:'Mirá cómo',Blog:'Guía práctica:'}[c.format]||''; $('#ccp').value=`${ex} ${$('#ct').value||'nuestra novedad'} ✨\n\nPensado para vos, con todo lo que nos define.`; if(!$('#cta').value) $('#cta').value='Escribinos por WhatsApp'; rerender(); toast('Borrador sugerido por IA: revisalo antes de aprobar'); },700); };
    $('#addcm').onclick=()=>{ const v=$('#newcm').value.trim(); if(!v) return; c.comments.push({who:S.user.name,t:v,when:'Recién'}); rerender(); };
    $('#newcm').onkeydown=e=>{ if(e.key==='Enter'){e.preventDefault();$('#addcm').click()} };
    $$('#layer [data-act]').forEach(b=>b.onclick=()=>{ const a=b.dataset.act;
      if(a==='save') save(null);
      if(a==='review') save('Revisión','Enviaste a revisión');
      if(a==='approve') save('Aprobado','Aprobaste');
      if(a==='changes'){ read(); const why=prompt2(); }
      if(a==='schedule') save('Programado',API_PUBLISH[c.channel]?'Programaste':'Programaste el recordatorio de');
      if(a==='publish') { read(); c.metrics={reach:0,likes:0,comments:0,saves:0}; save('Publicado','Publicaste'); }
      if(a==='unschedule') save('Aprobado','Volviste a aprobado');
      if(a==='draft') save('Borrador','Pasaste a borrador'); });
    const del=$('#delc'); if(del) del.onclick=()=>{ const arr=M().contents, i=arr.findIndex(x=>x.id===c.id), old=arr[i]; arr.splice(i,1); closeLayer(); render(); toast('Contenido eliminado',()=>{arr.splice(i,0,old);render()}); };
  }
  function prompt2(){ const box=document.createElement('div'); box.className='field'; box.innerHTML=`<label for="why">¿Qué hay que cambiar?</label><textarea class="input" id="why" rows="2" placeholder="Ej.: Sumar el precio en el último frame"></textarea><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px"><button class="btn btn-sm" id="whyc">Cancelar</button><button class="btn btn-primary btn-sm" id="whyok">Pedir cambios</button></div>`;
    $('#actions').replaceWith(box); $('#why').focus(); $('#whyc').onclick=rerender;
    $('#whyok').onclick=()=>{ const v=$('#why').value.trim(); if(!v){ $('#why').style.borderColor='var(--danger)'; return; } c.comments.push({who:S.user.name,t:'Cambios pedidos: '+v,when:'Recién'}); c.status='Borrador'; const arr=M().contents; const i=arr.findIndex(x=>x.id===c.id); if(i>=0) arr[i]=c; closeLayer(); render(); toast('Pediste cambios. Volvió a borrador.'); }; }
  bind();
}
function flowActions(c){
  const b=(a,l,p)=>`<button class="btn ${p?'btn-primary':''}" data-act="${a}">${l}</button>`;
  switch(c.status){
   case 'Idea': return b('save','Guardar idea')+b('draft','Pasar a borrador',true);
   case 'Borrador': return b('save','Guardar')+b('review','Enviar a revisión',true);
   case 'Revisión': return b('changes','Pedir cambios')+b('approve','Aprobar',true);
   case 'Aprobado': return b('save','Guardar')+b('schedule',API_PUBLISH[c.channel]?'Programar publicación':'Programar recordatorio',true);
   case 'Programado': return b('unschedule','Cancelar programación')+b('publish','Publicar ahora',true);
   default: return b('save','Guardar cambios',true);
  }
}
function brandHandle(n){ return n.toLowerCase().replace(/\s+/g,''); }
function preview(c){
  const b=brandOf(c.brand), story=c.format==='Historia'||c.format==='Reel';
  if(c.channel==='Blog'||c.channel==='Email') return `<div class="ig"><div class="ig-h">${ic(c.channel==='Blog'?'blog':'mail')} ${c.channel}</div><div style="padding:12px"><b style="font-size:15px">${esc(c.title||'Título')}</b><p class="ig-c" style="padding:6px 0 0">${esc(c.copy||'El texto aparece acá.')}</p></div></div>`;
  return `<div class="ig"><div class="ig-h"><span class="avatar sm" style="background:${b.color}">${initials(b.name)}</span>${esc(brandHandle(b.name))}<span class="small muted" style="margin-left:auto;font-weight:400">${c.format}</span></div>
  <div class="ig-img ${story?'story':''}" style="background:${b.color}">${c.files[0]?ic(c.files[0].t==='video'?'video':'image'):''}<span>${esc(c.title||'Tu contenido')}</span></div>${c.format==='Carrusel'?'<div class="dots"><i></i><i></i><i></i><i></i></div>':''}
  <div class="ig-c"><b>${esc(brandHandle(b.name))}</b> ${esc(c.copy||'El copy aparece acá mientras escribís.')}${c.hashtags?` <span style="color:var(--magenta-text)">${esc(c.hashtags)}</span>`:''}</div></div>`;
}

/* =====================================================================
   04 · CAMPAÑAS
   ===================================================================== */
let campSel=new Set(), campFilt={status:'',segment:''};
const campBadge=s=>({Activa:'badge badge-ok',Programada:'badge badge-brand',Finalizada:'badge',Borrador:'badge',Pausada:'badge badge-warn'}[s]||'badge');
function campMetrics(c){ const m=c.m; return {ctr:m.impr?m.clicks/m.impr*100:0,cpc:m.clicks?c.spent/m.clicks:0,cpa:m.conv?c.spent/m.conv:0,roas:c.spent&&m.revenue?m.revenue/c.spent:0}; }
function vCampanas(id){
  const m=M();
  if(id==='comparar') return campCompare();
  if(id&&m.campaigns.find(c=>c.id===id)) return campDetail(m.campaigns.find(c=>c.id===id));
  const head=pageHead('Campañas','Campañas orgánicas y pagas, con su inversión y sus resultados.',`${brandScope()}<button class="btn btn-primary" id="newcamp">${ic('plus')} Nueva campaña</button>`);
  if(!m.campaigns.length) return head+emptyBlock('megaphone','Creá tu primera campaña','Definí objetivo, fechas, presupuesto y audiencia, y asociá los contenidos que la componen.',`<button class="btn btn-primary" data-newcamp>${ic('plus')} Nueva campaña</button>`);
  const list=m.campaigns.filter(c=>inBrand(c)&&(!campFilt.status||c.status===campFilt.status)&&(!campFilt.segment||c.segment===campFilt.segment));
  const inv=list.reduce((a,c)=>a+c.spent,0), reach=list.reduce((a,c)=>a+c.m.reach,0), conv=list.reduce((a,c)=>a+c.m.conv,0), rev=list.reduce((a,c)=>a+c.m.revenue,0);
  const segs=[...new Set(m.campaigns.map(c=>c.segment))];
  return head+`<div class="stat-grid"><div class="stat"><div class="l">Inversión</div><div class="v">${money(inv)}</div><div class="d">${list.length} campañas</div></div><div class="stat"><div class="l">Alcance</div><div class="v">${num(reach)}</div></div><div class="stat"><div class="l">Conversiones</div><div class="v">${num(conv)}</div></div><div class="stat"><div class="l">ROAS <span class="est" title="Atribución por UTM y última interacción">estimado</span></div><div class="v">${inv&&rev?(rev/inv).toFixed(1).replace('.',',')+'x':'—'}</div></div></div>
  <div class="toolbar"><select class="select sm" id="fcs" aria-label="Estado"><option value="">Estado: todos</option>${['Activa','Programada','Finalizada','Pausada'].map(s=>`<option ${s===campFilt.status?'selected':''}>${s}</option>`).join('')}</select><select class="select sm" id="fsg" aria-label="Segmento"><option value="">Producto o segmento: todos</option>${segs.map(s=>`<option ${s===campFilt.segment?'selected':''}>${esc(s)}</option>`).join('')}</select><span class="grow"></span>
  <button class="btn btn-sm" id="cmp" ${campSel.size<2?'disabled title="Elegí 2 o 3 campañas"':''}>${ic('compare')} Comparar${campSel.size?` (${campSel.size})`:''}</button><button class="btn btn-sm" id="exp">${ic('download')} Exportar reporte</button></div>
  <div class="table-wrap"><table class="t"><thead><tr><th style="width:36px"><span class="sr">Seleccionar</span></th><th>Campaña</th><th class="hide-m">Fechas</th><th>Estado</th><th class="hide-m">Presupuesto</th><th class="num hide-m">Alcance</th><th class="num">Conv.</th><th class="num hide-m">ROAS</th></tr></thead><tbody>
  ${list.map(c=>{const k=campMetrics(c),p=pct(c.spent,c.budget);return `<tr><td><input type="checkbox" class="row-check" data-sel="${c.id}" ${campSel.has(c.id)?'checked':''} aria-label="Seleccionar ${esc(c.name)}"></td><td><a href="#/app/campanas/${c.id}" style="color:inherit"><b>${esc(c.name)}</b></a><div class="small muted"><i class="sdot" style="background:${brandOf(c.brand).color};display:inline-block;margin-right:4px"></i>${esc(c.brand)} · ${c.type} · ${esc(c.segment)}</div></td>
  <td class="hide-m small mono">${fdate(c.start)} → ${fdate(c.end)}</td><td><span class="${campBadge(c.status)}">${c.status}</span></td><td class="hide-m" style="min-width:160px">${c.budget?`<div class="bar ${p>95?'warn':''}"><i style="width:${Math.min(100,p)}%"></i></div><div class="small muted mono" style="margin-top:4px">${money(c.spent)} / ${money(c.budget)}</div>`:'<span class="small muted">Orgánica</span>'}</td>
  <td class="num hide-m">${c.m.reach?num(c.m.reach):'—'}</td><td class="num">${c.m.conv?num(c.m.conv):'—'}</td><td class="num hide-m">${k.roas?k.roas.toFixed(1).replace('.',',')+'x':'—'}</td></tr>`}).join('')}</tbody></table></div>`;
}
function campDetail(c){
  const k=campMetrics(c), m=M(), conts=m.contents.filter(x=>x.campaign===c.id), objs=m.objectives.filter(o=>conts.some(x=>x.objective===o.id));
  const days=Math.max(1,Math.round((Math.min(+NOW,+parse(c.end))-+parse(c.start))/864e5));
  const daily=c.spent?series(Math.min(30,days),c.spent/days,0.01,.6,c.seed):[];
  return `<nav class="breadcrumbs" style="margin-bottom:8px"><a href="#/app/campanas">Campañas</a>${ic('chevr')}<span>${esc(c.name)}</span></nav>
  <div class="camp-head"><div><h1>${esc(c.name)}</h1><div class="small muted" style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="${campBadge(c.status)}">${c.status}</span><span><i class="sdot" style="background:${brandOf(c.brand).color};display:inline-block"></i> ${esc(c.brand)}</span>· ${c.type} · Objetivo: ${c.objective} · ${fdate(c.start)} → ${fdate(c.end)}</div></div>
  <div style="display:flex;gap:8px">${c.status==='Activa'?`<button class="btn" id="pause">Pausar</button>`:c.status==='Pausada'?`<button class="btn" id="resume">Reanudar</button>`:''}<button class="btn" id="exp">${ic('download')} Reporte</button><button class="btn btn-primary" id="addcont">${ic('plus')} Agregar contenido</button></div></div>
  <div class="stat-grid"><div class="stat"><div class="l">Inversión</div><div class="v">${money(c.spent)}</div><div class="d">${c.budget?`${pct(c.spent,c.budget)}% de ${money(c.budget)}`:'Sin presupuesto pago'}</div></div>
  <div class="stat"><div class="l">Alcance</div><div class="v">${c.m.reach?num(c.m.reach):'—'}</div><div class="d">${c.m.impr?num(c.m.impr)+' impresiones':''}</div></div>
  <div class="stat"><div class="l">Clics</div><div class="v">${c.m.clicks?num(c.m.clicks):'—'}</div><div class="d">${k.ctr?'CTR '+k.ctr.toFixed(2).replace('.',',')+'%':''}${k.cpc?' · CPC '+money(k.cpc):''}</div></div>
  <div class="stat"><div class="l">Conversiones</div><div class="v">${c.m.conv?num(c.m.conv):'—'}</div><div class="d">${k.cpa?'CPA '+money(k.cpa):''}${k.roas?` · ROAS ${k.roas.toFixed(1).replace('.',',')}x <span class="est">estimado</span>`:''}</div></div></div>
  <div class="grid g-dash"><section class="card span-8"><div class="card-head"><h3>Inversión diaria</h3><span class="small muted">Fuente: ${c.channels.includes('Meta Ads')?'Meta Ads':'carga manual'} · actualizado hace 1 h</span></div>
   ${daily.length?barChart(daily,{fmt:v=>'$'+num(v/1000)+'k',labels:daily.map((_,i)=>i%5===0?fdate(iso(addDays(parse(c.start),i))):'')}):`<div class="empty"><p class="small muted">${c.status==='Programada'?'La campaña empieza el '+fdate(c.start)+'. Acá vas a ver la inversión día a día.':'Campaña orgánica: sin inversión publicitaria.'}</p></div>`}</section>
  <section class="card span-4"><h3 style="margin-bottom:12px">Configuración</h3><dl class="kv" style="grid-template-columns:auto 1fr"><dt>Audiencia</dt><dd style="font-family:inherit">${esc(c.audience)}</dd><dt>Objetivo estratégico</dt><dd style="font-family:inherit">${edCampObjDd(c)}</dd><dt>Funnel</dt><dd style="font-family:inherit">${fForCamp(c.id).map(f=>{ const l=f.campaigns.find(x=>x.id===c.id); return `<a href="#/app/estrategia/funnel/${f.id}">${esc(f.name)}</a> <span class="small muted">· aporte ${num(fCampTarget(f,l))} ${esc(f.goalType.toLowerCase())}</span>`; }).join('<br>')||'Sin funnel'}</dd><dt>Buyer personas</dt><dd style="font-family:inherit">${(c.personas||[]).map(id=>m.personas.find(p=>p.id===id)).filter(Boolean).map(p=>`<a href="#/app/estrategia/personas">${esc(p.name)}</a>`).join(', ')||'Sin vincular'}</dd><dt>Canales</dt><dd style="font-family:inherit">${c.channels.join(', ')}</dd><dt>Segmento</dt><dd style="font-family:inherit">${esc(c.segment)}</dd><dt>Presupuesto</dt><dd>${c.budget?money(c.budget):'—'}</dd></dl>
   <div style="margin-top:16px"><div class="small muted" style="margin-bottom:6px">Objetivos vinculados</div><div class="links">${objs.map(o=>`<a class="link-chip" href="#/app/estrategia/okr">${ic('target')}${esc(o.title)}</a>`).join('')||'<span class="small muted">Ninguno</span>'}</div></div>
   ${c.channels.includes('Meta Ads')?`<div class="alert alert-ok" style="margin-top:16px">${ic('check')}<div>Sincronizada con <b>Meta Ads</b>: inversión y resultados se actualizan solos.</div></div>`:''}</section>
  <section class="card span-12"><div class="card-head"><h3>Contenidos y piezas (${conts.length})</h3><a class="btn btn-sm btn-ghost" href="#/app/contenidos/lista">Ver en Contenidos</a></div>
   ${conts.length?`<div class="table-wrap"><table class="t"><thead><tr><th>Pieza</th><th>Fecha</th><th>Canal</th><th class="hide-m">Intención</th><th class="hide-m">Idea</th><th>Estado</th><th class="num hide-m">Alcance</th></tr></thead><tbody>${conts.sort((a,b)=>a.date.localeCompare(b.date)).map(x=>`<tr data-open="${x.id}" style="cursor:pointer"><td><b>${esc(x.title)}</b><div class="small muted">${x.format}</div><div class="small mobile-only" style="gap:6px;align-items:center;margin-top:4px">${edIntentLabel(cNorm(x).intent)} · ${edIdeaBadge(x)}</div></td><td class="mono small">${fdate(x.date)}</td><td>${x.channel}</td><td class="hide-m">${edIntentLabel(cNorm(x).intent)}</td><td class="hide-m">${edIdeaBadge(x)}</td><td><span class="${stBadge(x.status)}">${x.status}</span></td><td class="num hide-m">${x.metrics?num(x.metrics.reach):'—'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><p class="small muted">Todavía no hay contenidos asociados.</p></div>'}</section></div>`;
}
function campCompare(){
  const m=M(), cs=[...campSel].map(id=>m.campaigns.find(c=>c.id===id)).filter(Boolean);
  if(cs.length<2) return `<nav class="breadcrumbs"><a href="#/app/campanas">Campañas</a></nav><div class="card empty" style="margin-top:16px"><h3>Elegí al menos 2 campañas</h3><p class="small muted">Marcalas en el listado y tocá Comparar.</p><a class="btn btn-primary" href="#/app/campanas">Ir al listado</a></div>`;
  const rows=[['Inversión',c=>c.spent,money,'none'],['Alcance',c=>c.m.reach,num,'high'],['Clics',c=>c.m.clicks,num,'high'],['CTR',c=>campMetrics(c).ctr,v=>v.toFixed(2).replace('.',',')+'%','high'],['Conversiones',c=>c.m.conv,num,'high'],['Costo por conversión',c=>campMetrics(c).cpa,money,'low'],['ROAS (estimado)',c=>campMetrics(c).roas,v=>v.toFixed(1).replace('.',',')+'x','high']];
  return `<nav class="breadcrumbs" style="margin-bottom:8px"><a href="#/app/campanas">Campañas</a>${ic('chevr')}<span>Comparar</span></nav>${pageHead('Comparar campañas','La mejor de cada fila aparece en verde. Las cifras en cero no se comparan.',`<button class="btn" id="exp">${ic('download')} Exportar</button>`)}
  <div class="table-wrap"><table class="t cmp"><thead><tr><th>Métrica</th>${cs.map(c=>`<th style="text-transform:none;letter-spacing:0;font-size:13px;color:var(--ink)"><i class="sdot" style="background:${brandOf(c.brand).color};display:inline-block;margin-right:6px"></i>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>
  ${rows.map(([l,f,fmt,dir])=>{const vals=cs.map(f),valid=vals.filter(v=>v>0),best=valid.length&&dir!=='none'?(dir==='high'?Math.max(...valid):Math.min(...valid)):null;return `<tr><td><b>${l}</b></td>${vals.map(v=>`<td class="num ${v>0&&v===best&&valid.length>1?'best':''}">${v>0?fmt(v):'—'}</td>`).join('')}</tr>`}).join('')}</tbody></table></div>`;
}
function bCampanas(id){
  bindDemo(); const m=M();
  [$('#newcamp'),...$$('[data-newcamp]')].filter(Boolean).forEach(b=>b.onclick=campWizard);
  $$('[data-sel]').forEach(cb=>cb.onchange=()=>{ if(cb.checked){ if(campSel.size>=3){cb.checked=false;return toast('Podés comparar hasta 3 campañas')} campSel.add(cb.dataset.sel)} else campSel.delete(cb.dataset.sel); render(); });
  const on=(s,f)=>{const e=$(s);if(e)e.onclick=f};
  on('#cmp',()=>go('#/app/campanas/comparar'));
  on('#exp',()=>toast('Reporte exportado en PDF y CSV (simulado)'));
  const fs=$('#fcs'); if(fs) fs.onchange=()=>{campFilt.status=fs.value;render()}; const fg=$('#fsg'); if(fg) fg.onchange=()=>{campFilt.segment=fg.value;render()};
  const c=m.campaigns.find(x=>x.id===id);
  on('#pause',()=>{c.status='Pausada';render();toast('Campaña pausada')}); on('#resume',()=>{c.status='Activa';render();toast('Campaña reanudada')});
  on('#addcont',()=>{ const free=m.contents.filter(x=>x.brand===c.brand&&x.campaign!==c.id);
    modal('Agregar contenido a la campaña',free.length?`<p class="small muted" style="margin-bottom:12px">Contenidos de ${esc(c.brand)} que todavía no están en esta campaña.</p><div style="display:flex;flex-direction:column;gap:8px">${free.map(x=>`<label class="check"><input type="checkbox" value="${x.id}"> ${esc(x.title)} <span class="small muted">· ${x.format} · ${fdate(x.date)}</span></label>`).join('')}</div>`:'<p class="muted">No hay contenidos libres de esta marca. Creá uno nuevo desde Contenidos.</p>',`<button class="btn" data-close>Cancelar</button>${free.length?'<button class="btn btn-primary" id="ok">Agregar</button>':''}`);
    on('#ok',()=>{ const ids=$$('#layer input:checked').map(i=>i.value); ids.forEach(i=>m.contents.find(x=>x.id===i).campaign=c.id); closeLayer(); render(); toast(`${ids.length} contenido(s) agregados`); }); });
  $$('[data-open]').forEach(el=>el.onclick=()=>contentEditor(m.contents.find(x=>x.id===el.dataset.open)));
}
function campWizard(){
  if(!S.brands.length) return toast('Primero creá una unidad de negocio');
  let step=0; const d={name:'',brand:(curBrand()||S.brands[0]).name,objective:'Ventas',start:iso(NOW),end:iso(addDays(NOW,30)),type:'Paga',budget:'',audience:'',channels:['Instagram'],segment:'',personas:[],funnel:'',fmode:'qty',fval:'',objectiveId:''};
  const steps=['Datos','Presupuesto','Audiencia y canales'];
  const draw=()=>{ modal(`Nueva campaña · ${steps[step]}`,`<div class="stepper">${steps.map((_,i)=>`<span class="${i<=step?'on':''}"></span>`).join('')}</div>${
   step===0?`${F('wn','Nombre',`value="${esc(d.name)}" placeholder="Ej.: Día de la Madre"`)}<div class="form-grid"><div class="field"><label for="wb">Unidad de negocio</label><select class="select" id="wb">${S.brands.map(b=>`<option ${b.name===d.brand?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div><div class="field"><label for="wo">Objetivo</label><select class="select" id="wo">${['Ventas','Leads','Alcance','Tráfico','Interacción'].map(o=>`<option ${o===d.objective?'selected':''}>${o}</option>`).join('')}</select></div></div><div class="form-grid">${F('ws','Inicio',`type="date" value="${d.start}"`)}${F('we','Fin',`type="date" value="${d.end}"`)}</div>${F('wg','Producto o segmento','value="'+esc(d.segment)+'" placeholder="Ej.: Colección invierno"')}${edCampObjField(d)}`
   :step===1?`<div class="field"><span class="label">Tipo</span><div class="choice-grid">${['Orgánica','Paga','Orgánica + paga'].map(t=>`<button type="button" class="choice" data-ty="${t}" aria-pressed="${d.type===t}"><b>${t}</b></button>`).join('')}</div></div>${d.type==='Orgánica'?'<p class="small muted">Sin inversión publicitaria. Vas a medir alcance, interacciones y conversiones.</p>':F('wbu','Presupuesto total (ARS)',`type="number" min="0" value="${d.budget}" placeholder="Ej.: 500000"`,'Si conectás Meta Ads o Google Ads, la inversión se sincroniza sola.')}`
   :`<div class="field"><label for="wa">Audiencia</label><textarea class="input" id="wa" rows="2" placeholder="Ej.: Mujeres 25–45 · Córdoba · interés en deco">${esc(d.audience)}</textarea></div>${(()=>{ const ps=M().personas.filter(p=>pNorm(p).brands.includes(d.brand)); return `<div class="field"><span class="label">Buyer personas</span>${ps.length?`<div style="display:flex;gap:12px;flex-wrap:wrap" id="wps">${ps.map(p=>`<label class="check"><input type="checkbox" value="${p.id}" ${d.personas.includes(p.id)?'checked':''}> ${esc(p.name)}</label>`).join('')}</div>`:`<span class="small muted">No hay buyer personas de ${esc(d.brand)}. Podés crearlas en Estrategia → Buyer personas.</span>`}`; })()}</div>${fWizField(d)}
     <div class="field"><span class="label">Canales</span><div style="display:flex;gap:12px;flex-wrap:wrap">${CHANNELS.concat(['Meta Ads','Google Ads']).map(c=>`<label class="check"><input type="checkbox" value="${c}" ${d.channels.includes(c)?'checked':''}> ${c}</label>`).join('')}</div><span class="err" role="alert"></span></div>`
  }`,`${step?'<button class="btn" id="back">Volver</button>':'<button class="btn" data-close>Cancelar</button>'}<button class="btn btn-primary" id="ok">${step<2?'Continuar':'Crear campaña'}</button>`);
   $$('#layer [data-ty]').forEach(b=>b.onclick=()=>{d.type=b.dataset.ty;draw()});
   $$('#layer #wf,#layer #wfm').forEach(x=>x.onchange=()=>{save();draw();});
   const back=$('#back'); if(back) back.onclick=()=>{save();step--;draw()};
   $('#ok').onclick=()=>{ if(!save(true)) return; if(step<2){step++;draw();return;}
    const c={id:uid(),name:d.name,brand:d.brand,type:d.type,objective:d.objective,start:d.start,end:d.end,budget:+d.budget||0,spent:0,audience:d.audience||'Sin definir',channels:d.channels,personas:d.personas.slice(),objectiveId:d.objectiveId||'',status:parse(d.start)>NOW?'Programada':'Activa',segment:d.segment||'General',m:{reach:0,impr:0,clicks:0,conv:0,revenue:0},seed:13};
    M().campaigns.unshift(c); fWizLink(c,d); logAct(`Creaste la campaña ${c.name}`); closeLayer(); go('#/app/campanas/'+c.id); toast('Campaña creada'); }; };
  const save=(validate)=>{ if(step===0){ const n=$('#wn'); d.name=n.value.trim(); if(d.brand!==$('#wb').value){ d.personas=[]; d.funnel=''; d.objectiveId=''; } else if($('#wobj')) d.objectiveId=$('#wobj').value; d.brand=$('#wb').value; d.objective=$('#wo').value; d.start=$('#ws').value; d.end=$('#we').value; d.segment=$('#wg').value;
     if(validate){ let ok=fieldErr(n,!d.name?'Poné un nombre a la campaña':''); ok=fieldErr($('#we'),d.end<d.start?'La fecha de fin es anterior al inicio':'')&&ok; if($('#wobj')&&$('#wobj').tagName==='SELECT'&&$('#wobj').options.length>1) ok=fieldErr($('#wobj'),!$('#wobj').value?'Elegí qué objetivo persigue esta campaña: así se ve cómo aporta a las ventas':'')&&ok; return ok; } }
    if(step===1){ const b=$('#wbu'); if(b){ d.budget=b.value; if(validate&&d.type!=='Orgánica') return fieldErr(b,!(+b.value>0)?'Ingresá un presupuesto mayor a cero':''); } }
    if(step===2){ d.audience=$('#wa').value; d.personas=$$('#wps input:checked').map(i=>i.value); d.channels=$$('#layer .check input:checked').filter(i=>!i.closest('#wps')).map(i=>i.value); const okF=fWizSave(d,validate); if(validate) return fieldErr($$('#layer .check input').find(i=>!i.closest('#wps')),!d.channels.length?'Elegí al menos un canal':'')&&okF; }
    return true; };
  draw();
}

/* =====================================================================
   05 · REDES SOCIALES
   ===================================================================== */
const NETS={Instagram:{l:'IG',api:'Perfiles, publicaciones, métricas y publicación'},Facebook:{l:'f',api:'Páginas, publicaciones, métricas y publicación'},TikTok:{l:'TT',api:'Perfil y métricas básicas. Publicación no disponible por API'},LinkedIn:{l:'in',api:'Páginas de empresa, métricas y publicación'}};
let socialRange=30;
function vRedes(){
  const m=M(), accs=m.accounts.filter(inBrand);
  const head=pageHead('Redes sociales','Cuentas conectadas, publicaciones y evolución de resultados.',`${brandScope()}<button class="btn btn-primary" id="conn">${ic('plus')} Conectar cuenta</button>`);
  if(!m.accounts.length) return head+emptyBlock('heart','Conectá tus redes','Sumá Instagram, Facebook, TikTok o LinkedIn de cada marca para ver publicaciones y métricas en un solo lugar.',`<button class="btn btn-primary" data-conn>${ic('plus')} Conectar cuenta</button>`);
  const on=accs.filter(a=>a.status==='Conectada'); const fol=on.reduce((a,x)=>a+x.followers,0);
  const n=socialRange, sf=series(n,fol*0.94,0.002,.004,on.length+1).map((v,i,arr)=>v*(fol/arr.at(-1)));
  const reach=series(n,fol*1.6,0.006,.22,on.length+3), inter=series(n,fol*0.07,0.004,.3,on.length+5), prev=series(n,fol*1.6,0.002,.22,on.length+7).map(v=>v*.86);
  const tot=a=>a.reduce((x,y)=>x+y,0), eng=tot(inter)/Math.max(1,tot(reach))*100;
  const posts=m.contents.filter(c=>inBrand(c)&&c.status==='Publicado'&&c.metrics&&['Instagram','Facebook','LinkedIn','TikTok'].includes(c.channel)).sort((a,b)=>b.date.localeCompare(a.date));
  const lbl=(i)=>i%Math.ceil(n/6)===0?fdate(iso(addDays(NOW,i-n+1))):'';
  return head+`<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr));margin-bottom:24px">${accs.map(a=>`<article class="card acc" style="padding:16px"><div class="acc-top"><span class="net">${NETS[a.net].l}</span><div style="flex:1;min-width:0"><b>${esc(a.handle)}</b><div class="small muted">${a.net} · ${esc(a.brand)}</div></div>${a.status==='Conectada'?'<span class="badge badge-ok">Conectada</span>':'<span class="badge">Sin conectar</span>'}</div>
   ${a.status==='Conectada'?`<div style="display:flex;justify-content:space-between;align-items:flex-end"><div><div class="mono" style="font-size:22px">${num(a.followers)}</div><div class="small muted">seguidores</div></div><div class="sync">${ic('refresh')}${a.sync}</div></div><div style="display:flex;gap:8px"><button class="btn btn-sm" data-sync="${a.id}">Sincronizar ahora</button><button class="btn btn-sm btn-ghost" data-disc="${a.id}">Desconectar</button></div>`
   :`<p class="small muted">${NETS[a.net].api}.</p><button class="btn btn-sm" data-reconn="${a.id}">Conectar</button>`}</article>`).join('')}</div>
  <div class="toolbar"><h2 class="grow">Rendimiento</h2><div class="seg">${[7,30,90].map(r=>`<button data-range="${r}" aria-pressed="${socialRange===r}">${r} días</button>`).join('')}</div></div>
  ${on.length?`<div class="stat-grid"><div class="stat"><div class="l">Seguidores</div><div class="v">${num(fol)}</div><div class="d up">▲ ${num(fol-sf[0])} en ${n} días</div></div><div class="stat"><div class="l">Alcance</div><div class="v">${num(tot(reach))}</div><div class="d ${tot(reach)>=tot(prev)?'up':'down'}">${tot(reach)>=tot(prev)?'▲':'▼'} ${Math.abs(pct(tot(reach)-tot(prev),tot(prev)))}% vs. período anterior</div></div><div class="stat"><div class="l">Impresiones</div><div class="v">${num(tot(reach)*2.3)}</div></div><div class="stat"><div class="l">Engagement</div><div class="v">${eng.toFixed(1).replace('.',',')}%</div><div class="d">interacciones / alcance</div></div></div>
  <div class="grid g-dash"><section class="card span-8"><div class="card-head"><h3>Alcance diario</h3><span class="small muted" style="display:flex;gap:12px"><span><i class="sdot" style="background:var(--magenta);display:inline-block"></i> Período actual</span><span>┄ Período anterior</span></span></div>${lineChart(reach,{compare:prev,labels:reach.map((_,i)=>lbl(i))})}</section>
  <section class="card span-4"><div class="card-head"><h3>Seguidores</h3></div>${lineChart(sf,{h:180,zero:false,labels:sf.map((_,i)=>lbl(i)),fmt:v=>(v/1000).toFixed(1).replace('.',',')+'k'})}<p class="small muted" style="margin-top:8px">Próxima sincronización automática en 42 min. Las métricas se actualizan cada hora.</p></section>
  <section class="span-12"><div class="card-head" style="margin:8px 0 12px"><h3>Publicaciones</h3><a class="btn btn-sm btn-ghost" href="#/app/contenidos/lista">Ver en Contenidos</a></div><div class="table-wrap"><table class="t"><thead><tr><th>Publicación</th><th>Red</th><th class="hide-m">Fecha</th><th class="num">Alcance</th><th class="num hide-m">Interacciones</th><th class="num">Engagement</th><th class="hide-m">Campaña</th></tr></thead><tbody>
   ${posts.map(p=>{const it=p.metrics.likes+p.metrics.comments+p.metrics.saves,camp=m.campaigns.find(c=>c.id===p.campaign);return `<tr data-open="${p.id}" style="cursor:pointer"><td><div class="person"><span class="mark" style="width:28px;height:28px;background:${brandOf(p.brand).color}">${ic(fmtIcon(p.format))}</span><div><b>${esc(p.title)}</b><div class="small muted">${p.format}</div></div></div></td><td>${p.channel}</td><td class="hide-m mono small">${fdate(p.date)}</td><td class="num">${num(p.metrics.reach)}</td><td class="num hide-m">${num(it)}</td><td class="num">${(it/Math.max(1,p.metrics.reach)*100).toFixed(1).replace('.',',')}%</td><td class="hide-m small">${camp?`<a href="#/app/campanas/${camp.id}">${esc(camp.name)}</a>`:'—'}</td></tr>`}).join('')||'<tr><td colspan="7"><div class="empty"><p class="small muted">Todavía no hay publicaciones sincronizadas.</p></div></td></tr>'}</tbody></table></div></section></div>`
  :`<div class="card empty"><p class="muted">Conectá al menos una cuenta para ver métricas.</p></div>`}`;
}
function bRedes(){
  bindDemo(); const m=M(); const on=(s,f)=>{const e=$(s);if(e)e.onclick=f};
  const connect=(pre)=>{ if(!S.brands.length) return toast('Primero creá una unidad de negocio');
    modal('Conectar cuenta',`<div class="field"><label for="nb">Unidad de negocio</label><select class="select" id="nb">${S.brands.map(b=>`<option ${(pre?pre.brand:(curBrand()||S.brands[0]).name)===b.name?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div>
     <div class="field"><span class="label">Red social</span><div style="display:flex;flex-direction:column;gap:8px">${Object.entries(NETS).map(([k,v])=>`<button type="button" class="choice" data-net="${k}" aria-pressed="${pre?pre.net===k:k==='Instagram'}" style="flex-direction:row;align-items:center;gap:12px"><span class="net" style="width:32px;height:32px;font-size:12px">${v.l}</span><div><b>${k}</b><div class="small muted">${v.api}</div></div></button>`).join('')}</div></div>
     <div class="alert alert-info">${ic('info')}<div>Vas a autorizar el acceso en la red elegida. Podés conectar varias cuentas por marca.</div></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Continuar</button>`);
    let net=pre?pre.net:'Instagram'; $$('#layer [data-net]').forEach(b=>b.onclick=()=>{$$('#layer [data-net]').forEach(x=>x.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true');net=b.dataset.net});
    $('#ok').onclick=e=>{ e.target.classList.add('is-loading'); setTimeout(()=>{ const brand=$('#nb').value; if(pre){ pre.status='Conectada'; pre.followers=pre.followers||2860; pre.sync='recién'; } else m.accounts.push({id:uid(),net,handle:'@'+brandHandle(brand),brand,status:'Conectada',followers:1240,sync:'recién',seed:17});
      logAct(`Conectaste ${net} de ${brand}`); closeLayer(); render(); toast(`${net} conectada. La primera sincronización puede tardar unos minutos.`); },900); }; };
  [$('#conn'),...$$('[data-conn]')].filter(Boolean).forEach(b=>b.onclick=()=>connect());
  $$('[data-reconn]').forEach(b=>b.onclick=()=>connect(m.accounts.find(a=>a.id===b.dataset.reconn)));
  $$('[data-sync]').forEach(b=>b.onclick=()=>{ b.classList.add('is-loading'); setTimeout(()=>{ m.accounts.find(a=>a.id===b.dataset.sync).sync='recién'; render(); toast('Métricas sincronizadas'); },800); });
  $$('[data-disc]').forEach(b=>b.onclick=()=>{ const a=m.accounts.find(x=>x.id===b.dataset.disc); modal('¿Desconectar la cuenta?',`<p>Dejamos de sincronizar <b>${esc(a.handle)}</b>. Las métricas históricas se conservan.</p>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-danger" id="ok">Desconectar</button>`); $('#ok').onclick=()=>{a.status='Sin conectar';closeLayer();render();toast(`${a.net} desconectada`)}; });
  $$('[data-range]').forEach(b=>b.onclick=()=>{socialRange=+b.dataset.range;render()});
  $$('[data-open]').forEach(el=>el.onclick=()=>contentEditor(m.contents.find(x=>x.id===el.dataset.open)));
}

/* =====================================================================
   06 · MARCA
   ===================================================================== */
const MK_TABS=[['general','Información general'],['identidad','Identidad visual'],['voz','Tono y mensajes'],['manual','Manual de identidad'],['biblioteca','Biblioteca']];
let libFilter='';
function kitFor(b){ const m=M(); if(!m.kits[b.name]) m.kits[b.name]={info:{desc:'',web:'',industry:'',since:''},colors:[[ 'Principal',b.color]],fonts:[],voice:{tone:[],do:[],dont:[]},messages:[],files:[]}; return m.kits[b.name]; }
function vMarca(tab){
  tab=MK_TABS.some(t=>t[0]===tab)?tab:'general';
  const b=curBrand();
  const head=pageHead('Marca','Identidad, tono y recursos de cada unidad de negocio, listos para usar en contenidos y campañas.',`${brandScope()}<button class="btn" id="newbrand">${ic('plus')} Nueva unidad</button>`);
  if(!S.brands.length) return head+emptyBlock('tag','Creá tu primera marca','Cargá logo, colores y tono una vez y usalos en todos los módulos.',`<button class="btn btn-primary" data-newbrand>${ic('plus')} Crear marca</button>`);
  if(!b) return head+`<div class="cards">${S.brands.map((x,i)=>{const k=kitFor(x);return `<button class="card ent" data-pick="${i}" style="text-align:left;cursor:pointer;font:inherit;color:inherit"><div class="ent-top"><div class="mark" style="background:${x.color}">${initials(x.name)}</div><div><b>${esc(x.name)}</b><div class="small muted">${esc(k.info.industry||'Sin rubro')}</div></div></div><div style="display:flex;gap:4px">${k.colors.map(c=>`<i style="width:24px;height:24px;border-radius:6px;background:${c[1]};border:1px solid var(--line)"></i>`).join('')}</div><span class="small muted">${k.files.length} archivos · ${k.messages.length} mensajes</span></button>`}).join('')}</div>`;
  const k=kitFor(b);
  const nav=`<nav aria-label="Secciones de marca">${MK_TABS.map(([t,l])=>`<a href="#/app/marca/${t}" ${t===tab?'aria-current="page"':''}>${l}</a>`).join('')}</nav>`;
  let body='';
  if(tab==='general') body=`<form id="fbr" class="card"><div class="ent-top" style="margin-bottom:20px"><div class="mark" style="width:64px;height:64px;font-size:20px;background:${b.color}">${initials(b.name)}</div><div><h2>${esc(b.name)}</h2><div class="small muted">${esc(k.info.industry||'')}</div></div></div>
   <div class="field"><label for="bd">Descripción</label><textarea class="input" id="bd" rows="3">${esc(k.info.desc)}</textarea></div><div class="form-grid">${F('bw','Sitio web',`value="${esc(k.info.web)}"`)}${F('bi','Rubro',`value="${esc(k.info.industry)}"`)}</div>
   <div class="form-grid">${F('bs','Desde',`value="${esc(k.info.since)}"`)}<div class="field"><span class="label">Redes conectadas</span><div class="links">${M().accounts.filter(a=>a.brand===b.name&&a.status==='Conectada').map(a=>`<a class="link-chip" href="#/app/redes">${a.net} ${esc(a.handle)}</a>`).join('')||'<a class="link-chip" href="#/app/redes">Conectar redes</a>'}</div></div></div>
   <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary">Guardar</button></div></form>`;
  if(tab==='identidad') body=`<h3 style="margin-bottom:12px">Logotipos</h3><div class="kit-grid" style="margin-bottom:24px">${[['Principal','var(--surface-raised)',b.color],['Sobre oscuro','#0E0E10','#FFFFFF'],['Sobre color',b.color,'#FFFFFF'],['Isotipo','var(--surface-raised)',b.color]].map(([n,bg,fg],i)=>`<div class="logo-card"><div class="art" style="background:${bg};color:${fg}">${i===3?initials(b.name):esc(b.name.toLowerCase())}</div><div class="cap"><span>${n}</span><button class="icon-btn" style="width:28px;height:28px" data-dl aria-label="Descargar">${ic('download')}</button></div></div>`).join('')}</div>
   <div class="card-head"><h3>Colores</h3><button class="btn btn-sm" id="addcolor">${ic('plus')} Agregar color</button></div><div class="kit-grid" style="margin-bottom:24px">${k.colors.map(([n,h])=>`<button class="color-card" data-copy="${h}" title="Copiar ${h}"><i style="background:${h}"></i><div><b>${esc(n)}</b><div class="mono muted">${h} ${ic('copy')}</div></div></button>`).join('')}</div>
   <h3 style="margin-bottom:12px">Tipografías</h3><div class="kit-grid" style="margin-bottom:24px">${k.fonts.map(([f,use,gen])=>`<div class="font-card"><div style="font-family:'${esc(f)}',${gen};font-size:32px;line-height:36px">Aa</div><b>${esc(f)}</b><div class="small muted">${esc(use)}</div></div>`).join('')||'<p class="small muted">Sin tipografías cargadas.</p>'}</div>
   <h3 style="margin-bottom:12px">Recursos gráficos</h3><div class="lib">${k.files.filter(f=>f[2]==='Plantillas'||f[2]==='Logos').map(assetCard).join('')||'<p class="small muted">Subí patrones, íconos o plantillas a la Biblioteca.</p>'}</div>`;
  if(tab==='voz') body=`<div class="grid g-dash"><section class="card span-12"><div class="card-head"><h3>Tono de voz</h3><button class="btn btn-sm btn-ghost" id="editvoice">${ic('edit')} Editar</button></div><div class="pill-list" style="margin-bottom:16px">${k.voice.tone.map(t=>`<span class="pill" style="font-size:14px;padding:4px 12px">${esc(t)}</span>`).join('')||'<span class="small muted">Definí 3 adjetivos que describan cómo habla la marca.</span>'}</div>
   <div class="dodont"><div class="alert alert-ok" style="display:block"><b>${ic('check')} Sí</b><ul>${k.voice.do.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="alert alert-err" style="display:block"><b>${ic('x')} No</b><ul>${k.voice.dont.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div></section>
   <section class="card span-12"><div class="card-head"><h3>Mensajes principales</h3><button class="btn btn-sm" id="addmsg">${ic('plus')} Agregar</button></div>${k.messages.map((x,i)=>`<div class="settings-row"><span class="statement" style="font-size:18px;line-height:24px">“${esc(x)}”</span><button class="icon-btn" data-copy="${esc(x)}" aria-label="Copiar">${ic('copy')}</button></div>`).join('')||'<p class="small muted">Sin mensajes todavía.</p>'}
   <p class="small muted" style="margin-top:12px">La IA usa este tono y estos mensajes cuando redacta copys en Contenidos.</p></section></div>`;
  if(tab==='manual') body=`<div class="card"><div class="card-head"><div><h3>Manual de identidad</h3><p class="small muted">Versión 1.2 · actualizado hace 3 semanas</p></div><div style="display:flex;gap:8px"><button class="btn btn-sm" data-dl>${ic('download')} Descargar PDF</button><button class="btn btn-sm btn-primary" data-share>${ic('send')} Compartir</button></div></div>
   ${[['Esencia de marca',k.info.desc||'—'],['Uso del logo','Área de resguardo igual a la altura del isotipo. Nunca deformar, rotar ni cambiar colores.'],['Paleta',k.colors.map(c=>c[0]+' '+c[1]).join(' · ')],['Tipografía',k.fonts.map(f=>f[0]+' para '+f[1].toLowerCase()).join(' · ')||'—'],['Tono',k.voice.tone.join(', ')||'—'],['Fotografía','Luz natural, ambientes reales, encuadres amplios.']].map(([t,d],i)=>`<div class="settings-row" style="align-items:flex-start"><div style="display:flex;gap:16px"><span class="mono muted">${String(i+1).padStart(2,'0')}</span><div><b>${t}</b><div class="small muted" style="margin-top:4px">${esc(d)}</div></div></div></div>`).join('')}</div>`;
  if(tab==='biblioteca'){ const cats=[...new Set(k.files.map(f=>f[2]))]; const fl=k.files.filter(f=>!libFilter||f[2]===libFilter);
   body=`<div class="toolbar"><div class="seg"><button data-lf="" aria-pressed="${!libFilter}">Todos · ${k.files.length}</button>${cats.map(c=>`<button data-lf="${c}" aria-pressed="${libFilter===c}">${c}</button>`).join('')}</div><span class="grow"></span><button class="btn btn-primary" id="upl">${ic('upload')} Subir archivos</button></div>
   ${fl.length?`<div class="lib">${fl.map(assetCard).join('')}</div>`:emptyBlock('image','Biblioteca vacía','Subí logos, fotos, videos y plantillas para reutilizarlos en contenidos y campañas.')}`; }
  return head+`<div class="side-tabs">${nav}<div>${body}</div></div>`;
  function assetCard(f){ const [n,t,cat,used]=f; return `<div class="asset"><div class="pv" style="background:${t==='video'?'#0E0E10':t==='file'?'#5C5C66':b.color}">${ic(t==='video'?'video':t==='file'?'file':'image')}</div><div class="meta"><b title="${esc(n)}">${esc(n)}</b><span class="muted">${cat} · ${used?`usado en ${used}`:'sin usar'}</span></div></div>`; }
}
function bMarca(tab){
  bindDemo(); const on=(s,f)=>{const e=$(s);if(e)e.onclick=f};
  [$('#newbrand'),...$$('[data-newbrand]')].filter(Boolean).forEach(x=>x.onclick=()=>brandModal());
  $$('[data-pick]').forEach(x=>x.onclick=()=>{S.brand=+x.dataset.pick;render()});
  const b=curBrand(); if(!b) return; const k=kitFor(b);
  if($('#fbr')) $('#fbr').onsubmit=e=>{e.preventDefault(); k.info={desc:$('#bd').value,web:$('#bw').value,industry:$('#bi').value,since:$('#bs').value}; render(); toast('Información de marca guardada'); };
  $$('[data-copy]').forEach(x=>x.onclick=()=>{ const v=x.dataset.copy; try{ navigator.clipboard.writeText(v).then(()=>toast(`Copiado: ${v}`),()=>toast(v)); }catch(e){ toast(v); } });
  $$('[data-dl]').forEach(x=>x.onclick=()=>toast('Descarga simulada en el prototipo'));
  $$('[data-share]').forEach(x=>x.onclick=()=>toast('Link del manual copiado para compartir (simulado)'));
  on('#addcolor',()=>{ modal('Agregar color',`${F('cn','Nombre','placeholder="Ej.: Arena"')}${F('ch','Valor HEX','placeholder="#E9DFCF"')}`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Agregar</button>`);
   $('#ok').onclick=()=>{ const h=$('#ch').value.trim(); let ok=fieldErr($('#cn'),!$('#cn').value.trim()?'Poné un nombre':''); ok=fieldErr($('#ch'),!/^#[0-9a-f]{6}$/i.test(h)?'Usá el formato #RRGGBB':'')&&ok; if(!ok)return; k.colors.push([$('#cn').value.trim(),h.toUpperCase()]); closeLayer(); render(); toast('Color agregado'); }; });
  on('#addmsg',()=>{ modal('Agregar mensaje',`<div class="field"><label for="mm">Mensaje principal</label><textarea class="input" id="mm" rows="2" placeholder="Ej.: Tu casa, con personalidad."></textarea><span class="err" role="alert"></span></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Agregar</button>`);
   $('#ok').onclick=()=>{ const v=$('#mm').value.trim(); if(!fieldErr($('#mm'),!v?'Escribí el mensaje':''))return; k.messages.push(v); closeLayer(); render(); toast('Mensaje agregado'); }; });
  on('#editvoice',()=>{ modal('Tono de voz',`<div class="field"><label for="vt">Adjetivos (separados por coma)</label><input class="input" id="vt" value="${esc(k.voice.tone.join(', '))}"></div><div class="field"><label for="vd">Sí (uno por línea)</label><textarea class="input" id="vd" rows="3">${esc(k.voice.do.join('\n'))}</textarea></div><div class="field"><label for="vn">No (uno por línea)</label><textarea class="input" id="vn" rows="3">${esc(k.voice.dont.join('\n'))}</textarea></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Guardar</button>`);
   $('#ok').onclick=()=>{ k.voice={tone:$('#vt').value.split(',').map(s=>s.trim()).filter(Boolean),do:$('#vd').value.split('\n').map(s=>s.trim()).filter(Boolean),dont:$('#vn').value.split('\n').map(s=>s.trim()).filter(Boolean)}; closeLayer(); render(); toast('Tono de voz guardado'); }; });
  $$('[data-lf]').forEach(x=>x.onclick=()=>{libFilter=x.dataset.lf;render()});
  on('#upl',()=>{ k.files.unshift([`archivo-${k.files.length+1}.png`,'image','Fotos',0]); render(); toast('Archivo subido a la biblioteca (simulado)'); });
}

/* =====================================================================
   01 · CORE: plan y facturación, seguridad y aislamiento
   ===================================================================== */
const PLANS=[['Emprendedor','Para una persona y una marca.',['1 usuario','1 marca','Contenidos y estrategia','Redes: 3 cuentas']],['Empresa','Para equipos de marketing y ventas.',['Hasta 10 usuarios','Hasta 5 marcas','Todos los módulos','Automatizaciones básicas']],['Agencia','Para gestionar varios clientes.',['Usuarios ilimitados','Empresas y marcas ilimitadas','Portal de aprobación para clientes','Reportes por cliente']]];
function cfgPlan(){
  const d=D(), cur=d.plan.startsWith('Agencia')?'Agencia':d.plan.startsWith('Empresa')?'Empresa':d.plan.startsWith('Emprendedor')?'Emprendedor':null;
  const lim={Emprendedor:[1,1,3],Empresa:[10,5,15],Agencia:[Infinity,Infinity,Infinity]}[cur||'Agencia'];
  const used=[S.members.length,S.brands.length,M().accounts.filter(a=>a.status==='Conectada').length];
  return `<div class="alert alert-warn" style="margin-bottom:16px">${ic('info')}<div><b>Modelo comercial a definir.</b> Precios y límites son provisorios hasta cerrar la sección 12 del brief (suscripción por empresa, por usuarios o híbrida).</div></div>
  <div class="grid g-dash" style="margin-bottom:24px"><section class="card span-8"><div class="card-head"><div><h3>Plan actual</h3><p class="small muted">${esc(S.company.name)}</p></div><span class="badge badge-brand">${esc(d.plan)}</span></div>
   ${d.plan.includes('prueba')||d.plan.includes('Prueba')?`<p style="margin-bottom:16px">Tu prueba gratis termina en <b>12 días</b>. Elegí un plan para no perder acceso.</p>`:''}
   ${[['Usuarios',used[0],lim[0]],['Marcas',used[1],lim[1]],['Cuentas sociales',used[2],lim[2]]].map(([l,u,t])=>`<div class="meter-row"><span>${l}</span><div class="bar ${t!==Infinity&&u>=t?'warn':''}"><i style="width:${t===Infinity?Math.min(100,u*8):Math.min(100,pct(u,t))}%"></i></div><span class="mono small">${u} / ${t===Infinity?'∞':t}</span></div>`).join('')}</section>
   <section class="card span-4"><h3 style="margin-bottom:12px">Facturación</h3><div class="settings-row"><span class="small muted">Medio de pago</span><button class="btn btn-sm" id="paym">Agregar</button></div><div class="settings-row"><span class="small muted">Datos fiscales</span><a class="small" href="#/app/config/empresa">Completar</a></div><div class="empty" style="padding:16px 0"><p class="small muted">Sin facturas durante la prueba.</p></div></section></div>
  <h2 style="margin-bottom:12px">Planes</h2><div class="plans">${PLANS.map(([n,d2,f])=>`<article class="card plan ${n===cur?'current':''}"><div style="display:flex;justify-content:space-between;align-items:center"><h3>${n}</h3>${n===cur?'<span class="badge badge-brand">Tu plan</span>':''}</div><p class="small muted">${d2}</p><div class="price">Precio a definir</div><ul>${f.map(x=>`<li>${ic('check')}${x}</li>`).join('')}</ul><button class="btn ${n===cur?'':'btn-primary'}" data-plan="${n}" ${n===cur?'disabled':''} style="margin-top:auto">${n===cur?'Plan actual':'Elegir '+n}</button></article>`).join('')}</div>`;
}
function cfgSeg(){
  const d=D();
  return `<div class="grid g-dash"><section class="card span-8"><div class="card-head"><h3>Aislamiento de datos</h3><span class="badge badge-ok">${ic('shield')} Activo</span></div>
   <p style="margin-bottom:12px">Cada empresa es un espacio cerrado: contactos, contenidos, campañas, integraciones y métricas de <b>${esc(S.company.name)}</b> no son visibles desde otras empresas, aunque las administre la misma persona.</p>
   <ul class="small" style="margin:0 0 16px;padding-left:18px;line-height:22px"><li>La búsqueda, la barra de comandos y la IA solo leen datos de la empresa activa.</li><li>Los reportes de agencia muestran métricas agregadas, nunca datos de contactos.</li><li>Cada integración se autoriza por empresa y por marca.</li></ul>
   <div class="alert alert-info">${ic('info')}<div>Probalo: cambiá a otra empresa desde el selector de arriba a la izquierda y vas a ver que sus módulos están vacíos.</div></div></section>
   <section class="card span-4"><h3 style="margin-bottom:12px">Tus empresas</h3>${S.companies.map(c=>`<div class="settings-row"><div class="person"><div class="mark" style="width:28px;height:28px;font-size:11px;background:var(--negro)">${initials(c.name)}</div><b>${esc(c.name)}</b></div>${c===S.company?'<span class="badge badge-brand">Activa</span>':'<span class="small muted">Dueño</span>'}</div>`).join('')}</section>
   <section class="card span-8"><div class="card-head"><h3>Registro de actividad</h3><button class="btn btn-sm" id="expaudit">${ic('download')} Exportar</button></div>
   <div class="table-wrap"><table class="t"><thead><tr><th>Persona</th><th>Acción</th><th>Cuándo</th></tr></thead><tbody>${d.audit.concat(S.activity.slice(0,4).map(a=>[S.user.name,a.t,a.when])).map(([w,a,t])=>`<tr><td><div class="person"><span class="avatar sm">${initials(w)}</span>${esc(w)}</div></td><td>${esc(a)}</td><td class="small muted">${t}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">Sin actividad</td></tr>'}</tbody></table></div></section>
   <section class="card span-4"><h3 style="margin-bottom:12px">Seguridad de la cuenta</h3><div class="settings-row"><div><b>Verificación en dos pasos</b><div class="small muted">Obligatoria para administradores</div></div><label class="switch"><input type="checkbox" id="twofa" aria-label="Verificación en dos pasos"></label></div><div class="settings-row"><div><b>Sesiones activas</b><div class="small muted">1 dispositivo</div></div><button class="btn btn-sm" id="closeses">Cerrar otras</button></div><div class="settings-row"><div><b>Exportar datos</b><div class="small muted">Todo lo de esta empresa</div></div><button class="btn btn-sm" id="expdata">${ic('download')}</button></div></section></div>`;
}
function bindPlanSeg(){
  const on=(s,f)=>{const e=$(s);if(e)e.onclick=f};
  $$('[data-plan]').forEach(b=>b.onclick=()=>{ const n=b.dataset.plan; modal(`Cambiar al plan ${n}`,`<p>Vas a pasar <b>${esc(S.company.name)}</b> al plan <b>${n}</b>. El precio se va a confirmar cuando se defina el modelo comercial.</p>${n==='Emprendedor'&&(S.brands.length>1||S.members.length>1)?`<div class="alert alert-warn" style="margin-top:12px">${ic('alert')}<div>Tenés ${S.brands.length} marcas y ${S.members.length} usuarios: el plan Emprendedor permite 1 de cada uno.</div></div>`:''}`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Confirmar</button>`); $('#ok').onclick=()=>{ D().plan=n; closeLayer(); render(); toast(`Plan cambiado a ${n}`); }; });
  on('#paym',()=>toast('El checkout de pagos se integra cuando se defina el proveedor'));
  on('#expaudit',()=>toast('Registro exportado en CSV (simulado)')); on('#expdata',()=>toast('Te enviamos un email cuando la exportación esté lista (simulado)'));
  on('#closeses',()=>toast('No hay otras sesiones abiertas'));
  const tf=$('#twofa'); if(tf) tf.onchange=()=>toast(tf.checked?'Verificación en dos pasos activada':'Verificación en dos pasos desactivada');
}
const _bConfig=bConfig; bConfig=function(tab){ _bConfig(tab); bindPlanSeg(); };

/* ---------- registro de vistas ---------- */
const VIEWS={
 estrategia:{t:'Estrategia',view:vEstrategia,bind:bEstrategia},
 contenidos:{t:'Contenidos',view:vContenidos,bind:bContenidos},
 campanas:{t:'Campañas',view:vCampanas,bind:bCampanas},
 redes:{t:'Redes sociales',view:vRedes,bind:bRedes},
 marca:{t:'Marca',view:vMarca,bind:bMarca}
};
render();

