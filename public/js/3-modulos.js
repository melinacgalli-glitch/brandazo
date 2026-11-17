/* =====================================================================
   Brandazo · Módulos 07 a 11 — CRM, Automatizaciones, Comunicaciones,
   Métricas e Integraciones
   ===================================================================== */
Object.assign(P,{
 phone:'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
 note:'M5 4h14v12l-4 4H5zM15 20v-4h4M8 9h8M8 13h5',
 cart:'M3 4h2l2.5 11h11L21 7H6.5M9 20h.01M18 20h.01',
 card:'M3 6h18v12H3zM3 10h18M7 15h3',
 branch:'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9',
 play:'M7 4l13 8-13 8z',
 pause:'M7 4h4v16H7zM13 4h4v16h-4z',
 history:'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 3',
 inbox:'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5',
 kanban:'M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v13h-4z',
 webhook:'M9 7a3 3 0 1 1 4.5 2.6L16 14M7 17a3 3 0 1 1 1-5.8M17 17a3 3 0 1 1-2.8 4H8',
 smile:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01',
 assign:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 9.5-4.9M16 19l2 2 4-4',
 hourglass:'M6 3h12M6 21h12M7 3c0 5 10 6 10 9s-10 4-10 9M17 3c0 5-10 6-10 9'
});
const STAGES=[['Nuevo',10],['Calificado',30],['Propuesta',50],['Negociación',70],['Ganado',100],['Perdido',0]];
const stProb=s=>(STAGES.find(x=>x[0]===s)||[0,0])[1];
const LOSS=['Precio','Eligió a la competencia','Sin presupuesto','Sin respuesta','No era el momento'];
const SOURCES=['Formulario web','Meta Lead Ads','WhatsApp','Shopify','LinkedIn','Referido','Importación'];
function emptyX(){ return {contacts:[],companies:[],deals:[],activities:[],orders:[],flows:[],runs:[],convs:[],emails:[],waTemplates:[],waCamps:[],waNumber:null,reports:[],ints:{}}; }
function X(){ const d=D(); if(!d.x) d.x=emptyX(); return d.x; }
const ago=n=>n===0?'Hoy':n===1?'Ayer':`Hace ${n} días`;
const cById=id=>X().contacts.find(c=>c.id===id);
const cName=id=>(cById(id)||{name:'—'}).name;

function loadDemoX(){
  const x=X(); if(x.contacts.length) return;
  const B0=S.brands[0]?S.brands[0].name:'Estudio Norte', B1=(S.brands[1]||S.brands[0]||{name:B0}).name;
  const day=n=>iso(addDays(NOW,n));
  const tl=(...e)=>e.map(([type,t,when])=>({type,t,when}));
  x.companies=[
   {id:'e1',name:'Café del Puerto',industry:'Gastronomía',city:'Rosario',size:'11 a 50',owner:'Juan Rossi',web:'cafedelpuerto.com.ar'},
   {id:'e2',name:'Hotel Sierras',industry:'Turismo',city:'Villa Carlos Paz',size:'11 a 50',owner:'Melina Galli',web:'hotelsierras.com'},
   {id:'e3',name:'Bodega Los Álamos',industry:'Vinos',city:'Mendoza',size:'51 a 200',owner:'Juan Rossi',web:'losalamos.wine'},
   {id:'e4',name:'Estudio Contable Ruiz',industry:'Servicios profesionales',city:'Córdoba',size:'2 a 10',owner:'Melina Galli',web:'ruizcontable.com.ar'},
   {id:'e5',name:'Panadería La Espiga',industry:'Gastronomía',city:'Córdoba',size:'2 a 10',owner:'Juan Rossi',web:''},
   {id:'e6',name:'Clínica Dental Sonríe',industry:'Salud',city:'Buenos Aires',size:'11 a 50',owner:'Melina Galli',web:'sonrie.com.ar'}];
  const C=(id,name,email,phone,company,brand,type,src,camp,owner,score,last,extra={})=>Object.assign({id,name,email,phone,company,brand,type,source:src,campaign:camp,owner,score,last,leadStatus:type==='Lead'?'Nuevo':'',tags:[],consent:{email:true,wa:!!phone},created:day(-last-6),timeline:[]},extra);
  x.contacts=[
   C('p1','Carolina Ruiz','carolina.ruiz@gmail.com','+54 9 351 555-0142','',B1,'Cliente','Meta Lead Ads','c1','Sofía Paz',86,0,{tags:['Compró 2+','Deco'],timeline:tl(['wa','Preguntó por el almohadón de lino crudo','Hoy 10:42'],['order','Compró el pedido #1284 · $ 48.900','Hace 3 días'],['email','Abrió «Novedades de noviembre»','Hace 5 días'],['camp','Llegó por la campaña «Lanzamiento colección verano»','Hace 18 días'])}),
   C('p2','Martín Pereyra','martin@cafedelpuerto.com.ar','+54 9 341 555-0177','e1',B0,'Cliente','Referido','','Juan Rossi',74,2,{tags:['Retainer'],timeline:tl(['meet','Reunión de resultados de octubre','Hace 2 días'],['deal','Ganaste «Plan anual de contenidos»','Hace 40 días'])}),
   C('p3','Lucía Fernández','lucia@hotelsierras.com','+54 9 3541 55-0190','e2',B0,'Lead','LinkedIn','c3','Melina Galli',72,1,{leadStatus:'Calificado',tags:['Webinar'],timeline:tl(['email','Respondió «¿Agendamos una llamada?»','Ayer'],['form','Se inscribió al webinar «Marketing para pymes»','Hace 30 días'])}),
   C('p4','Diego Salas','dsalas@losalamos.wine','+54 9 261 555-0111','e3',B0,'Lead','Formulario web','c3','Juan Rossi',64,4,{leadStatus:'Contactado',timeline:tl(['call','Llamada: le interesa campaña de exportación','Hace 4 días'],['form','Completó el formulario de contacto','Hace 9 días'])}),
   C('p5','Graciela Núñez','graciela.nunez@hotmail.com','+54 9 351 555-0108','',B1,'Cliente','WhatsApp','','Sofía Paz',58,6,{tags:['Prefiere WhatsApp'],timeline:tl(['order','Compró el pedido #1279 · $ 126.400','Hace 6 días'],['wa','Consultó medidas de la mesa ratona','Hace 7 días'])}),
   C('p6','Pablo Ruiz','pablo@ruizcontable.com.ar','+54 9 351 555-0133','e4',B0,'Lead','Meta Lead Ads','c3','Melina Galli',41,0,{leadStatus:'Nuevo',timeline:tl(['form','Completó el formulario de Meta «Diagnóstico gratis»','Hoy 08:15'])}),
   C('p7','Valentina Gómez','valen.gomez@gmail.com','+54 9 11 5555-0122','',B1,'Lead','Meta Lead Ads','c1','Sofía Paz',55,1,{leadStatus:'Nuevo',timeline:tl(['form','Se suscribió por el anuncio «Colección verano»','Ayer'])}),
   C('p8','Romina Torres','romina@laespiga.com.ar','+54 9 351 555-0165','e5',B0,'Cliente','Referido','','Juan Rossi',69,12,{tags:['Redes'],timeline:tl(['deal','Ganaste «Gestión de redes»','Hace 60 días'])}),
   C('p9','Federico Ibáñez','fede.ibanez@gmail.com','','',B1,'Lead','Shopify','c1','Sofía Paz',38,3,{leadStatus:'Contactado',consent:{email:true,wa:false},timeline:tl(['cart','Abandonó un carrito de $ 74.500','Hace 3 días'])}),
   C('p10','Dra. Natalia Paz','natalia@sonrie.com.ar','+54 9 11 5555-0150','e6',B0,'Lead','LinkedIn','c3','Melina Galli',80,0,{leadStatus:'Calificado',timeline:tl(['meet','Reunión de diagnóstico agendada','Hoy'],['email','Descargó la guía «Cómo medir tu marketing»','Hace 8 días'])}),
   C('p11','Sergio Molina','smolina@losalamos.wine','+54 9 261 555-0144','e3',B0,'Contacto','Importación','','Juan Rossi',22,20,{}),
   C('p12','Ana Belén Díaz','anabelen.diaz@gmail.com','+54 9 351 555-0199','',B1,'Cliente','Shopify','c1','Sofía Paz',61,9,{timeline:tl(['order','Compró el pedido #1271 · $ 32.800','Hace 9 días'])}),
   C('p13','Tomás Herrera','tomas@hotelsierras.com','','e2',B0,'Contacto','Importación','','Melina Galli',18,30,{consent:{email:false,wa:false},tags:['Dio de baja email']})];
  const Dl=(id,name,contact,company,amount,stage,close,owner,product,extra={})=>Object.assign({id,name,contact,company,amount,stage,close:day(close),owner,product,brand:B0,lossReason:'',history:[{t:'Creada en '+(stage==='Nuevo'?'Nuevo':'Nuevo'),when:'Hace '+(Math.abs(close)+10)+' días'}]},extra);
  x.deals=[
   Dl('d1','Plan de marketing 2027','p3','e2',2400000,'Propuesta',12,'Melina Galli','Plan anual'),
   Dl('d2','Campaña de exportación','p4','e3',1850000,'Calificado',25,'Juan Rossi','Campaña paga'),
   Dl('d3','Diagnóstico de marketing','p6','e4',180000,'Nuevo',20,'Melina Galli','Diagnóstico'),
   Dl('d4','Gestión de redes 6 meses','p10','e6',1320000,'Negociación',6,'Melina Galli','Gestión de redes'),
   Dl('d5','Renovación plan anual','p2','e1',2900000,'Negociación',-2,'Juan Rossi','Plan anual'),
   Dl('d6','Branding para nueva sucursal','p8','e5',650000,'Propuesta',18,'Juan Rossi','Branding'),
   Dl('d7','Plan anual de contenidos','p2','e1',2100000,'Ganado',-40,'Juan Rossi','Plan anual'),
   Dl('d8','Gestión de redes','p8','e5',540000,'Ganado',-60,'Juan Rossi','Gestión de redes'),
   Dl('d9','Web institucional','p11','e3',1200000,'Perdido',-15,'Juan Rossi','Sitio web',{lossReason:'Eligió a la competencia'}),
   Dl('d10','Pauta en Google Ads','p13','e2',420000,'Calificado',30,'Melina Galli','Campaña paga')];
  const A=(type,title,contact,due,owner,done=false)=>({id:uid(),type,title,contact,due:day(due),owner,done});
  x.activities=[A('Llamada','Llamar para cerrar la renovación','p2',-1,'Juan Rossi'),A('Tarea','Enviar propuesta revisada a Hotel Sierras','p3',0,'Melina Galli'),A('Reunión','Diagnóstico con Clínica Sonríe','p10',0,'Melina Galli'),
   A('Recordatorio','Seguimiento del formulario de Meta','p6',1,'Melina Galli'),A('Llamada','Primera llamada: campaña de exportación','p4',2,'Juan Rossi'),A('Tarea','Preparar brief de branding','p8',4,'Juan Rossi'),A('Tarea','Enviar reporte de octubre','p2',-3,'Juan Rossi',true)];
  const O=(id,contact,src,pay,payStatus,status,amount,d,items,camp,attr,extra={})=>Object.assign({id,contact,source:src,payment:pay,payStatus,status,amount,date:day(d),items,campaign:camp,attribution:attr,brand:B1,merged:src==='Shopify'&&pay==='Mercado Pago'},extra);
  x.orders=[
   O('#1291','p7','Shopify','Mercado Pago','Pendiente','Pendiente de pago',58300,0,'Almohadón lino x2','c1','comprobada'),
   O('#1288','p12','Shopify','Mercado Pago','Aprobado','Enviado',89900,-1,'Lámpara Nube','c1','comprobada'),
   O('#1284','p1','Shopify','Mercado Pago','Aprobado','Entregado',48900,-3,'Almohadón lino crudo','c1','comprobada'),
   O('#1282','p9','Shopify','Tarjeta (Shopify Payments)','Rechazado','Cancelado',74500,-3,'Mesa ratona Roble','c1','estimada'),
   O('#1279','p5','WooCommerce','Mercado Pago','Aprobado','Entregado',126400,-6,'Mesa ratona Roble + manta','', ''),
   O('#1276','p1','Shopify','Mercado Pago','Reembolsado','Devuelto',21500,-8,'Funda almohadón','c1','comprobada'),
   O('#1271','p12','Shopify','Mercado Pago','Aprobado','Entregado',32800,-9,'Set de velas','c1','estimada'),
   O('MP-88412','p5','Mercado Pago','Mercado Pago','Aprobado','Pagado',15000,-12,'Seña por pedido especial','', '')];
  const N=(kind,type,label,d,extra={})=>Object.assign({id:uid(),kind,type,label,d},extra);
  x.flows=[
   {id:'f1',name:'Bienvenida de nuevos leads',brand:B0,status:'Activo',version:4,edited:'Hace 2 días',active:23,completed:412,errors:0,steps:[
     N('trigger','Nuevo lead','Nuevo lead','Cuando entra un lead por cualquier formulario',{count:435}),
     N('action','Crear o actualizar contacto','Registrar en CRM','Etiqueta «Nuevo lead» y responsable por zona',{count:435}),
     N('action','Enviar email','Email de bienvenida','Plantilla «Bienvenida pymes»',{count:435}),
     N('wait','Esperar','Esperar 24 horas','',{count:58,hours:24}),
     N('condition','Si abrió un email','¿Abrió el email?','',{count:377,yes:[N('action','Enviar WhatsApp','WhatsApp con caso de éxito','Plantilla aprobada «caso_exito»',{count:241})],no:[N('action','Crear tarea','Tarea comercial','Asignada al responsable del lead',{count:136})]})]},
   {id:'f2',name:'Carrito abandonado',brand:B1,status:'Activo',version:2,edited:'Hace 6 días',active:11,completed:198,errors:3,steps:[
     N('trigger','Carrito abandonado','Carrito abandonado','Shopify · después de 1 hora',{count:212}),
     N('condition','Si tiene consentimiento de WhatsApp','¿Acepta WhatsApp?','',{count:212,yes:[N('action','Enviar WhatsApp','Recordatorio por WhatsApp','Plantilla «carrito_pendiente»',{count:131,err:true})],no:[N('action','Enviar email','Email recordatorio','Con los productos del carrito',{count:81})]}),
     N('wait','Esperar','Esperar 48 horas','',{count:9,hours:48}),
     N('condition','Si realizó una compra','¿Compró?','',{count:190,yes:[N('action','Agregar etiqueta','Etiqueta «Recuperado»','',{count:47})],no:[N('action','Enviar email','Email con 10% off','Cupón VUELVE10',{count:143})]})]},
   {id:'f3',name:'Postventa y reseña',brand:B1,status:'Pausado',version:1,edited:'Hace 3 semanas',active:0,completed:86,errors:0,steps:[
     N('trigger','Pago aprobado','Pago aprobado','Mercado Pago',{count:86}),N('wait','Esperar','Esperar 7 días','',{count:0,hours:168}),N('action','Enviar email','Pedido de reseña','',{count:86})]},
   {id:'f4',name:'Seguimiento de oportunidades',brand:B0,status:'Borrador',version:1,edited:'Hoy',active:0,completed:0,errors:0,steps:[
     N('trigger','Cambio de etapa en CRM','Pasa a «Propuesta»','Pipeline de ventas',{count:0}),N('wait','Esperar','Esperar 3 días','',{count:0,hours:72}),N('action','Crear tarea','Llamar para revisar la propuesta','',{count:0})]}];
  x.runs=[
   {id:uid(),flow:'f2',contact:'p9',when:'Hoy 11:02',status:'Error',step:'Recordatorio por WhatsApp',error:'El contacto no tiene número de WhatsApp. Se omitió el paso.'},
   {id:uid(),flow:'f1',contact:'p6',when:'Hoy 08:15',status:'Esperando',step:'Esperar 24 horas',error:''},
   {id:uid(),flow:'f1',contact:'p7',when:'Ayer 19:40',status:'Esperando',step:'Esperar 24 horas',error:''},
   {id:uid(),flow:'f2',contact:'p7',when:'Ayer 16:10',status:'Completada',step:'Etiqueta «Recuperado»',error:''},
   {id:uid(),flow:'f1',contact:'p3',when:'Hace 30 días',status:'Completada',step:'WhatsApp con caso de éxito',error:''},
   {id:uid(),flow:'f2',contact:'p12',when:'Hace 2 días',status:'Error',step:'Recordatorio por WhatsApp',error:'Meta rechazó el mensaje: plantilla en revisión.'},
   {id:uid(),flow:'f2',contact:'p1',when:'Hace 3 días',status:'Error',step:'Recordatorio por WhatsApp',error:'Fuera del límite de envíos por hora. Se reintentó y se envió.'}];
  const msg=(from,t,at,extra={})=>Object.assign({from,t,at},extra);
  x.convs=[
   {id:'v1',contact:'p1',channel:'WhatsApp',assigned:'Sofía Paz',status:'Abierta',unread:2,last:'10:42',winH:1,tags:['Consulta producto'],msgs:[msg('sys','Conversación iniciada desde el anuncio «Colección verano»','Hace 3 días'),msg('in','Hola! Quería saber si el almohadón de lino viene en crudo','10:40'),msg('in','Y si tienen envío a Córdoba capital 🙏','10:42')]},
   {id:'v2',contact:'p3',channel:'Email',assigned:'Melina Galli',status:'Abierta',unread:1,last:'Ayer',winH:20,tags:['Propuesta'],msgs:[msg('out','Hola Lucía, te comparto la propuesta del plan 2027. ¿Agendamos una llamada para revisarla?','Lun 16:20',{who:'Melina Galli',state:'Leído'}),msg('in','Hola Melina, gracias. Sí, ¿te queda bien el jueves a las 11?','Ayer 18:05')]},
   {id:'v3',contact:'p5',channel:'WhatsApp',assigned:'',status:'Abierta',unread:0,last:'Hace 6 días',winH:150,tags:[],msgs:[msg('in','¿La mesa ratona mide 90 cm de largo?','Hace 7 días'),msg('out','¡Hola Graciela! Sí, 90 × 50 cm y 42 cm de alto.','Hace 7 días',{who:'Sofía Paz',state:'Leído'}),msg('in','Perfecto, la compro. Gracias!','Hace 6 días'),msg('note','Compró por la web (#1279). Ofrecerle la manta a juego en la postventa.','Hace 6 días',{who:'Sofía Paz'})]},
   {id:'v4',contact:'p6',channel:'Meta Lead Ads',assigned:'',status:'Abierta',unread:1,last:'08:15',winH:0,tags:['Lead nuevo'],msgs:[msg('sys','Lead del formulario «Diagnóstico gratis» · Meta Lead Ads','Hoy 08:15'),msg('in','Empresa: Estudio Contable Ruiz · Necesidad: «Conseguir clientes nuevos por redes»','08:15')]},
   {id:'v5',contact:'p10',channel:'Formulario',assigned:'Melina Galli',status:'Pendiente',unread:0,last:'Hace 8 días',winH:200,tags:[],msgs:[msg('in','Quisiera recibir información sobre gestión de redes para una clínica.','Hace 8 días'),msg('out','¡Hola Natalia! Te escribo para coordinar una reunión de diagnóstico.','Hace 8 días',{who:'Melina Galli',state:'Entregado'})]},
   {id:'v6',contact:'p2',channel:'WhatsApp',assigned:'Juan Rossi',status:'Resuelta',unread:0,last:'Hace 2 días',winH:48,tags:[],msgs:[msg('out','Martín, te dejo el reporte de octubre 📊','Hace 2 días',{who:'Juan Rossi',state:'Leído'}),msg('in','Genial, lo vemos en la reunión 👍','Hace 2 días')]}];
  const blk=(type,v)=>({id:uid(),type,v});
  x.emails=[
   {id:'m1',name:'Novedades de noviembre',brand:B1,subject:'{{nombre}}, llegó la colección verano ☀️',preheader:'Texturas naturales y envíos a todo el país',status:'Enviada',audience:'Clientes y suscriptores de Lumen Deco',sent:4820,date:day(-5),opens:1735,clicks:362,bounces:48,unsubs:12,conv:41,ab:false,blocks:[blk('title','Llegó el verano a tu casa'),blk('image','Foto de la colección'),blk('text','{{nombre}}, renovamos la colección con texturas naturales y colores que respiran. Envíos a todo el país.'),blk('button','Ver la colección')]},
   {id:'m2',name:'Invitación al webinar',brand:B0,subject:'Marketing para pymes: webinar gratuito',preheader:'Jueves 18 h · 45 minutos',status:'Enviada',audience:'Leads y clientes de Estudio Norte',sent:1260,date:day(-36),opens:529,clicks:144,bounces:9,unsubs:4,conv:98,ab:true,subjectB:'¿Tu marketing se mide en ventas? Te invitamos',blocks:[blk('title','Vení al webinar'),blk('text','En 45 minutos te mostramos cómo medir tu marketing.'),blk('button','Quiero inscribirme')]},
   {id:'m3',name:'Black Friday: anticipo',brand:B1,subject:'Algo grande se viene el 27/11',preheader:'Solo para suscriptores',status:'Programada',audience:'Clientes de Lumen Deco',sent:0,date:day(9),opens:0,clicks:0,bounces:0,unsubs:0,conv:0,ab:true,subjectB:'{{nombre}}, tu 30% off te espera',blocks:[blk('title','Black Friday se adelanta'),blk('text','{{nombre}}, el 27/11 tenés 30% off en toda la tienda.'),blk('button','Activar recordatorio')]},
   {id:'m4',name:'Newsletter de cierre de año',brand:B0,subject:'',preheader:'',status:'Borrador',audience:'',sent:0,date:'',opens:0,clicks:0,bounces:0,unsubs:0,conv:0,ab:false,blocks:[blk('title','Lo que aprendimos en 2026'),blk('text','')]}];
  x.waNumber={number:'+54 9 351 555-0100',name:B1,quality:'Alta',limit:'1.000 conversaciones por día',status:'Conectado'};
  x.waTemplates=[
   {name:'carrito_pendiente',cat:'Marketing',lang:'Español (AR)',status:'Aprobada',body:'Hola {{1}}, dejaste productos en tu carrito. ¿Te ayudamos a terminar la compra?'},
   {name:'confirmacion_pedido',cat:'Utilidad',lang:'Español (AR)',status:'Aprobada',body:'¡Gracias {{1}}! Tu pedido {{2}} está confirmado. Te avisamos cuando salga.'},
   {name:'caso_exito',cat:'Marketing',lang:'Español (AR)',status:'Aprobada',body:'Hola {{1}}, te comparto cómo ayudamos a una pyme como la tuya a duplicar sus consultas.'},
   {name:'black_friday_anticipo',cat:'Marketing',lang:'Español (AR)',status:'En revisión',body:'{{1}}, el 27/11 tenés 30% off en toda la tienda. ¿Querés que te avisemos?'},
   {name:'promo_2x1',cat:'Marketing',lang:'Español (AR)',status:'Rechazada',body:'2x1 solo hoy!!! Comprá ya',reason:'Contenido promocional sin opción de baja.'}];
  x.waCamps=[{name:'Lanzamiento colección verano',template:'caso_exito',audience:'Clientes con consentimiento de WhatsApp',sent:612,delivered:598,read:471,replies:88,status:'Enviada',date:day(-19)},{name:'Black Friday · aviso',template:'black_friday_anticipo',audience:'Clientes con consentimiento de WhatsApp',sent:0,delivered:0,read:0,replies:0,status:'Programada',date:day(10)}];
  x.reports=[{id:uid(),name:'Resultados mensuales · Lumen Deco',freq:'Mensual · día 1',to:'sofia@estudionorte.com',format:'PDF',next:day(15)},{id:uid(),name:'Pipeline semanal',freq:'Semanal · lunes 9:00',to:'melina@estudionorte.com, juan@estudionorte.com',format:'PDF',next:day(7)}];
  x.ints={0:{status:'ok',account:'Business Manager Estudio Norte',last:'hace 12 min'},1:{status:'ok',account:x.waNumber.number,last:'en tiempo real'},2:{status:'ok',account:'Propiedad lumendeco.com.ar',last:'hace 1 h'},3:{status:'error',account:'Cuenta Lumen Deco',last:'hace 3 h',error:'El webhook de pagos devolvió error 401: las credenciales vencieron. Volvé a autorizar la cuenta.'},4:{status:'ok',account:'lumendeco.myshopify.com',last:'hace 5 min'}};
  [0,1,2,3,4].forEach(i=>{ S.integrations[i]=true; });
}
const _loadDemoBase=loadDemo; loadDemo=function(){ _loadDemoBase(); loadDemoX(); };

/* =====================================================================
   07 · CRM
   ===================================================================== */
const CRM_TABS=[['contactos','Contactos'],['leads','Leads'],['pipeline','Pipeline'],['actividades','Actividades'],['empresas','Empresas'],['pedidos','Pedidos y pagos']];
let crmQ='', crmType='', leadSt='', dealsOwner='';
const typeBadge=t=>({Cliente:'badge badge-ok',Lead:'badge badge-brand',Contacto:'badge'}[t]||'badge');
const leadBadge=s=>({Nuevo:'badge badge-brand',Contactado:'badge',Calificado:'badge badge-ok',Descartado:'badge badge-err'}[s]||'badge');
const payBadge=s=>({Aprobado:'badge badge-ok',Pendiente:'badge badge-warn',Rechazado:'badge badge-err',Reembolsado:'badge'}[s]||'badge');
const coName=id=>(X().companies.find(c=>c.id===id)||{name:''}).name;
const scoreEl=n=>`<span class="score" title="Calificación ${n} de 100"><i><b style="width:${n}%"></b></i>${n}</span>`;
const campName=id=>{ const c=M().campaigns.find(x=>x.id===id); return c?c.name:''; };
const inB=x=>!curBrand()||x.brand===curBrand().name;

function vCrm(tab){
  tab=CRM_TABS.some(t=>t[0]===tab)?tab:'contactos';
  const x=X();
  const acts={contactos:`<button class="btn" id="imp">${ic('upload')} Importar</button><button class="btn btn-primary" id="newc">${ic('plus')} Nuevo contacto</button>`,leads:`<button class="btn btn-primary" id="newc">${ic('plus')} Nuevo lead</button>`,pipeline:`<button class="btn btn-primary" id="newd">${ic('plus')} Nueva oportunidad</button>`,actividades:`<button class="btn btn-primary" id="newa">${ic('plus')} Nueva actividad</button>`,empresas:`<button class="btn btn-primary" id="newe">${ic('plus')} Nueva empresa</button>`,pedidos:`<a class="btn" href="#/app/integraciones">${ic('plug')} Fuentes de pedidos</a>`}[tab];
  const head=pageHead('CRM','Contactos, leads, oportunidades, actividades y pedidos de tu empresa.',`${brandScope()}${acts}`)+subTabs('crm',CRM_TABS,tab);
  if(!x.contacts.length) return head+emptyBlock('users','Tu CRM está vacío','Cargá tu primer contacto, importá una planilla o conectá tus formularios para que los leads entren solos.',`<button class="btn btn-primary" data-newc>${ic('plus')} Nuevo contacto</button>`);
  return head+{contactos:crmContacts,leads:crmLeads,pipeline:crmPipeline,actividades:crmActs,empresas:crmCompanies,pedidos:crmOrders}[tab]();
}
function crmContacts(){
  const x=X(), q=crmQ.toLowerCase();
  const list=x.contacts.filter(c=>inB(c)&&(!crmType||c.type===crmType)&&(!q||(c.name+c.email+coName(c.company)).toLowerCase().includes(q)));
  const cnt=t=>x.contacts.filter(c=>inB(c)&&c.type===t).length;
  return `<div class="stat-grid"><div class="stat"><div class="l">Contactos</div><div class="v">${num(x.contacts.filter(inB).length)}</div></div><div class="stat"><div class="l">Clientes</div><div class="v">${cnt('Cliente')}</div></div><div class="stat"><div class="l">Leads abiertos</div><div class="v">${x.contacts.filter(c=>inB(c)&&c.type==='Lead'&&c.leadStatus!=='Descartado').length}</div></div><div class="stat"><div class="l">Con consentimiento</div><div class="v">${pct(x.contacts.filter(c=>inB(c)&&c.consent.email).length,x.contacts.filter(inB).length)}%</div><div class="d">para recibir emails</div></div></div>
  <div class="toolbar"><label class="search-in">${ic('search')}<span class="sr">Buscar</span><input class="input" id="cq" placeholder="Buscar por nombre, email o empresa" value="${esc(crmQ)}"></label>
   <div class="seg">${[['','Todos'],['Cliente','Clientes'],['Lead','Leads'],['Contacto','Otros']].map(([k,l])=>`<button data-ty="${k}" aria-pressed="${crmType===k}">${l}</button>`).join('')}</div><span class="grow"></span><button class="btn btn-sm" id="cexp">${ic('download')} Exportar</button></div>
  <div class="table-wrap"><table class="t"><thead><tr><th>Contacto</th><th class="hide-m">Empresa</th><th>Tipo</th><th class="hide-m">Origen</th><th class="hide-m">Responsable</th><th class="hide-m">Último contacto</th></tr></thead><tbody>
  ${list.map(c=>`<tr data-c="${c.id}" style="cursor:pointer"><td><div class="person"><span class="avatar sm">${initials(c.name)}</span><div><b>${esc(c.name)}</b><div class="small muted">${esc(c.email)}</div></div></div></td><td class="hide-m">${esc(coName(c.company))||'<span class="muted">—</span>'}</td><td><span class="${typeBadge(c.type)}">${c.type}</span></td><td class="hide-m small">${c.source}${c.campaign?`<div class="muted small">${esc(campName(c.campaign))}</div>`:''}</td><td class="hide-m small">${esc(c.owner)}</td><td class="hide-m small muted">${ago(c.last)}</td></tr>`).join('')||`<tr><td colspan="6"><div class="empty"><p class="muted small">No hay contactos con esos filtros.</p></div></td></tr>`}
  </tbody></table></div>`;
}
function crmLeads(){
  const x=X(), all=x.contacts.filter(c=>inB(c)&&c.type==='Lead'), list=all.filter(c=>!leadSt||c.leadStatus===leadSt).sort((a,b)=>b.score-a.score);
  const bySrc=SOURCES.map(s=>[s,all.filter(c=>c.source===s).length]).filter(z=>z[1]);
  return `<div class="grid g-dash" style="margin-bottom:16px"><section class="card span-8"><div class="card-head"><h3>Leads por fuente</h3><span class="small muted">Últimos 30 días</span></div>${bySrc.map(([s,n])=>`<div class="hbar"><span>${s}</span><div class="b"><i style="width:${pct(n,all.length)}%;background:var(--magenta)"></i></div><span class="v">${n}</span></div>`).join('')}</section>
   <section class="card span-4"><h3 style="margin-bottom:12px">Estado</h3><dl class="kv">${['Nuevo','Contactado','Calificado','Descartado'].map(s=>`<dt>${s}</dt><dd>${all.filter(c=>c.leadStatus===s).length}</dd>`).join('')}</dl><div class="alert alert-info" style="margin-top:16px">${ic('zap')}<div>Los leads nuevos entran al flujo <b>Bienvenida de nuevos leads</b>.</div></div></section></div>
  <div class="toolbar"><div class="seg">${[['','Todos'],['Nuevo','Nuevos'],['Contactado','Contactados'],['Calificado','Calificados'],['Descartado','Descartados']].map(([k,l])=>`<button data-ls="${k}" aria-pressed="${leadSt===k}">${l}</button>`).join('')}</div></div>
  <div class="table-wrap"><table class="t"><thead><tr><th>Lead</th><th>Calificación</th><th class="hide-m">Fuente y campaña</th><th>Estado</th><th class="hide-m">Responsable</th><th class="hide-m">Ingresó</th><th></th></tr></thead><tbody>
  ${list.map(c=>`<tr><td><button class="btn-link" data-c="${c.id}" style="all:unset;cursor:pointer"><b>${esc(c.name)}</b><div class="small muted">${esc(coName(c.company)||c.email)}</div></button></td><td>${scoreEl(c.score)}</td><td class="hide-m small">${c.source}<div class="muted">${esc(campName(c.campaign))||'Sin campaña'}</div></td><td><span class="${leadBadge(c.leadStatus)}">${c.leadStatus}</span></td><td class="hide-m small">${esc(c.owner)}</td><td class="hide-m small muted">${ago(c.last)}</td><td style="text-align:right">${c.leadStatus!=='Descartado'?`<button class="btn btn-sm" data-conv="${c.id}">Convertir en oportunidad</button>`:''}</td></tr>`).join('')||`<tr><td colspan="7"><div class="empty"><p class="muted small">No hay leads en este estado.</p></div></td></tr>`}</tbody></table></div>`;
}
function crmPipeline(){
  const x=X(), ds=x.deals.filter(d=>inB(d)&&(!dealsOwner||d.owner===dealsOwner));
  const open=ds.filter(d=>!['Ganado','Perdido'].includes(d.stage)), val=open.reduce((a,d)=>a+d.amount,0), w=open.reduce((a,d)=>a+d.amount*stProb(d.stage)/100,0);
  const won=ds.filter(d=>d.stage==='Ganado'), lost=ds.filter(d=>d.stage==='Perdido');
  const owners=[...new Set(x.deals.map(d=>d.owner))];
  return `<div class="stat-grid"><div class="stat"><div class="l">Valor del pipeline</div><div class="v">${money(val)}</div><div class="d">${open.length} oportunidades abiertas</div></div><div class="stat"><div class="l">Ponderado <span class="est" title="Valor × probabilidad de cada etapa">estimado</span></div><div class="v">${money(w)}</div></div><div class="stat"><div class="l">Ganadas</div><div class="v">${money(won.reduce((a,d)=>a+d.amount,0))}</div><div class="d">${won.length} oportunidades</div></div><div class="stat"><div class="l">Tasa de cierre</div><div class="v">${pct(won.length,won.length+lost.length)}%</div><div class="d">${lost.length} perdidas</div></div></div>
  <div class="toolbar"><select class="select sm" id="dow" aria-label="Responsable"><option value="">Responsable: todos</option>${owners.map(o=>`<option ${o===dealsOwner?'selected':''}>${esc(o)}</option>`).join('')}</select><span class="grow"></span><span class="small muted">Arrastrá las tarjetas para cambiar de etapa</span></div>
  <div class="kanban">${STAGES.map(([s,p])=>{const items=ds.filter(d=>d.stage===s);return `<section class="kcol" data-stage="${s}" aria-label="${s}"><div class="kcol-h"><b>${s}<span class="badge">${items.length}</span></b><div class="small muted">${money(items.reduce((a,d)=>a+d.amount,0))} · ${p}%</div></div><div class="kcol-b">
   ${items.map(d=>{const late=!['Ganado','Perdido'].includes(d.stage)&&d.close<iso(NOW);return `<button class="kcard ${late?'late':''}" draggable="true" data-d="${d.id}"><b>${esc(d.name)}</b><div class="row"><span>${esc(coName(d.company)||cName(d.contact))}</span><span class="amt">${money(d.amount)}</span></div><div class="row"><span>${late?`<span style="color:var(--warning)">Vencida · ${fdate(d.close)}</span>`:`Cierre ${fdate(d.close)}`}</span><span class="avatar sm" title="${esc(d.owner)}" style="width:22px;height:22px;font-size:10px">${initials(d.owner)}</span></div>${d.lossReason?`<span class="tagc">${esc(d.lossReason)}</span>`:''}</button>`}).join('')||'<p class="small muted" style="text-align:center;padding:16px 0">Sin oportunidades</p>'}</div></section>`}).join('')}</div>`;
}
function crmActs(){
  const x=X(), t=iso(NOW), a=x.activities.filter(z=>{const c=cById(z.contact);return !c||inB(c)});
  const grp=[['Vencidas',a.filter(z=>!z.done&&z.due<t),'alert'],['Hoy',a.filter(z=>!z.done&&z.due===t),'clock'],['Próximas',a.filter(z=>!z.done&&z.due>t),'calendar'],['Completadas',a.filter(z=>z.done),'check']];
  const icn={Llamada:'phone',Reunión:'users',Tarea:'check',Recordatorio:'bell'};
  return grp.map(([n,items,i])=>items.length?`<section class="agroup"><h3>${ic(i)}${n} <span class="badge">${items.length}</span></h3>${items.sort((p,q)=>p.due.localeCompare(q.due)).map(z=>`<div class="act ${z.done?'done':''}"><label class="check"><input type="checkbox" data-done="${z.id}" ${z.done?'checked':''} aria-label="Marcar como hecha"></label><span class="mark" style="background:var(--surface-sunken);color:var(--ink)">${ic(icn[z.type]||'check')}</span><div class="tt"><b>${esc(z.title)}</b><span class="small muted">${z.type} · <button data-c="${z.contact}" style="all:unset;cursor:pointer;color:var(--magenta-text)">${esc(cName(z.contact))}</button> · ${esc(z.owner)}</span></div><span class="small mono ${n==='Vencidas'?'':'muted'}" style="${n==='Vencidas'?'color:var(--warning)':''}">${fdate(z.due)}</span></div>`).join('')}</section>`:'').join('');
}
function crmCompanies(){
  const x=X();
  return `<div class="table-wrap"><table class="t"><thead><tr><th>Empresa</th><th class="hide-m">Rubro</th><th class="hide-m">Ciudad</th><th class="num">Contactos</th><th class="num">Oportunidades abiertas</th><th class="hide-m">Responsable</th></tr></thead><tbody>
  ${x.companies.map(e=>{const cs=x.contacts.filter(c=>c.company===e.id),ds=x.deals.filter(d=>d.company===e.id&&!['Ganado','Perdido'].includes(d.stage));return `<tr data-e="${e.id}" style="cursor:pointer"><td><div class="person"><span class="mark" style="background:#2A2A30">${initials(e.name)}</span><div><b>${esc(e.name)}</b><div class="small muted">${esc(e.web||'Sin sitio web')}</div></div></div></td><td class="hide-m small">${esc(e.industry)}</td><td class="hide-m small">${esc(e.city)}</td><td class="num">${cs.length}</td><td class="num">${ds.length?`${ds.length} · ${money(ds.reduce((a,d)=>a+d.amount,0))}`:'—'}</td><td class="hide-m small">${esc(e.owner)}</td></tr>`}).join('')}</tbody></table></div>`;
}
function crmOrders(){
  if(!X().orders.some(inB)) return emptyBlock('cart','No hay pedidos para esta marca','Los pedidos llegan desde Shopify, WooCommerce y Mercado Pago. Elegí «Todas las marcas» en el selector o conectá una tienda.',`<a class="btn" href="#/app/integraciones">${ic('plug')} Conectar tienda</a>`).replace(demoBtn(),'');
  const x=X(), os=x.orders.filter(inB), ok=os.filter(o=>o.payStatus==='Aprobado'), rev=ok.reduce((a,o)=>a+o.amount,0);
  const custs=new Set(ok.map(o=>o.contact)), rec=[...custs].filter(c=>ok.filter(o=>o.contact===c).length>1);
  return `<div class="stat-grid"><div class="stat"><div class="l">Ventas aprobadas</div><div class="v">${money(rev)}</div><div class="d">${ok.length} pedidos</div></div><div class="stat"><div class="l">Ticket promedio</div><div class="v">${money(ok.length?rev/ok.length:0)}</div></div><div class="stat"><div class="l">Clientes recurrentes</div><div class="v">${rec.length}</div><div class="d">de ${custs.size} clientes</div></div><div class="stat"><div class="l">Atribuidas a campañas</div><div class="v">${money(ok.filter(o=>o.attribution==='comprobada').reduce((a,o)=>a+o.amount,0))}</div><div class="d">comprobadas por UTM</div></div></div>
  <div class="alert alert-info" style="margin-bottom:16px">${ic('info')}<div>Cuando un pedido de Shopify o WooCommerce se paga con Mercado Pago, lo unificamos en una sola venta para no contarla dos veces.</div></div>
  <div class="table-wrap"><table class="t"><thead><tr><th>Pedido</th><th>Cliente</th><th class="hide-m">Origen</th><th>Pago</th><th class="hide-m">Estado</th><th class="hide-m">Campaña</th><th class="num">Importe</th></tr></thead><tbody>
  ${os.map(o=>`<tr data-o="${o.id}" style="cursor:pointer"><td><b class="mono">${o.id}</b><div class="small muted">${fdate(o.date)} · ${esc(o.items)}</div></td><td><button data-c="${o.contact}" style="all:unset;cursor:pointer">${esc(cName(o.contact))}</button></td><td class="hide-m small">${o.source}${o.merged?`<div><span class="tagc" title="Pedido de Shopify y pago de Mercado Pago unificados">Unificado con Mercado Pago</span></div>`:''}</td><td><span class="${payBadge(o.payStatus)}">${o.payStatus}</span><div class="small muted">${esc(o.payment)}</div></td><td class="hide-m small">${o.status}</td><td class="hide-m small">${o.campaign?`${esc(campName(o.campaign))}<div>${o.attribution==='comprobada'?'<span class="badge badge-ok" style="font-size:11px">Comprobada · UTM</span>':'<span class="est">estimada</span>'}</div>`:'<span class="muted">Sin datos</span>'}</td><td class="num">${money(o.amount)}</td></tr>`).join('')}</tbody></table></div>`;
}

/* ---------- ficha 360 ---------- */
function contactDrawer(id){
  const x=X(), c=cById(id); if(!c) return;
  const ds=x.deals.filter(d=>d.contact===id), os=x.orders.filter(o=>o.contact===id), as=x.activities.filter(a=>a.contact===id&&!a.done), cv=x.convs.find(v=>v.contact===id);
  const evIc={wa:['message','m'],email:['mail',''],order:['cart','ok'],camp:['megaphone','m'],meet:['users',''],call:['phone',''],form:['file','m'],deal:['dollar','ok'],cart:['cart',''],note:['note','']};
  drawerWide(`<div class="dr-head"><span class="avatar">${initials(c.name)}</span><div style="flex:1;min-width:0"><b style="font-size:16px">${esc(c.name)}</b><div class="small muted">${esc(coName(c.company)||'Particular')} · <span class="${typeBadge(c.type)}">${c.type}</span>${c.leadStatus?` <span class="${leadBadge(c.leadStatus)}">${c.leadStatus}</span>`:''}</div></div><button class="icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div>
  <div class="c360"><div class="main"><div class="quick"><button class="btn btn-sm" id="qn">${ic('note')} Nota</button><button class="btn btn-sm" id="qt">${ic('check')} Tarea</button><button class="btn btn-sm" id="qd">${ic('dollar')} Oportunidad</button>${c.phone&&c.consent.wa?`<button class="btn btn-sm" id="qw">${ic('message')} WhatsApp</button>`:''}${c.consent.email?`<button class="btn btn-sm" id="qe">${ic('mail')} Email</button>`:''}</div>
   <h4>Historial</h4><div class="tline">${c.timeline.map(e=>{const [i,k]=evIc[e.type]||['info',''];return `<div class="ev"><span class="eic ${k}">${ic(i)}</span><div><b style="font-size:14px;font-weight:500">${esc(e.t)}</b><p class="small muted">${e.when}</p></div></div>`}).join('')||'<p class="small muted">Todavía no hay interacciones registradas.</p>'}</div></div>
   <div class="side"><div><h4>Datos</h4><dl class="kv" style="grid-template-columns:auto 1fr"><dt>Email</dt><dd style="font-family:inherit">${esc(c.email)}</dd><dt>Teléfono</dt><dd>${esc(c.phone)||'—'}</dd><dt>Marca</dt><dd style="font-family:inherit">${esc(c.brand)}</dd><dt>Origen</dt><dd style="font-family:inherit">${c.source}</dd><dt>Campaña</dt><dd style="font-family:inherit">${esc(campName(c.campaign))||'—'}</dd><dt>Responsable</dt><dd style="font-family:inherit">${esc(c.owner)}</dd><dt>Calificación</dt><dd>${scoreEl(c.score)}</dd></dl></div>
    <div><h4>Etiquetas</h4><div class="pill-list">${c.tags.map(t=>`<span class="pill">${esc(t)}</span>`).join('')}<button class="chipf" id="addtag" style="height:24px">${ic('plus')} Agregar</button></div></div>
    <div><h4>Consentimientos</h4><label class="switch" style="margin-bottom:8px"><input type="checkbox" id="ce" ${c.consent.email?'checked':''}> <span class="small">Acepta emails de marketing</span></label><label class="switch"><input type="checkbox" id="cw" ${c.consent.wa?'checked':''} ${c.phone?'':'disabled'}> <span class="small">Acepta WhatsApp${c.phone?'':' (sin número)'}</span></label></div>
    <div><h4>Oportunidades</h4><div class="lst">${ds.map(d=>`<div class="it"><span>${esc(d.name)}<div class="small muted">${d.stage}</div></span><span class="mono small">${money(d.amount)}</span></div>`).join('')||'<span class="small muted">Ninguna</span>'}</div></div>
    <div><h4>Pedidos</h4><div class="lst">${os.map(o=>`<div class="it"><span class="mono">${o.id}<div class="small muted" style="font-family:var(--font-sans)">${fdate(o.date)} · ${o.payStatus}</div></span><span class="mono small">${money(o.amount)}</span></div>`).join('')||'<span class="small muted">Ninguno</span>'}</div></div>
    <div><h4>Pendientes</h4><div class="lst">${as.map(a=>`<div class="it"><span>${esc(a.title)}</span><span class="small mono muted">${fdate(a.due)}</span></div>`).join('')||'<span class="small muted">Nada pendiente</span>'}</div></div></div></div>`);
  const re=()=>{ contactDrawer(id); };
  $('#ce').onchange=e=>{ c.consent.email=e.target.checked; logAct(`${e.target.checked?'Activaste':'Desactivaste'} emails para ${c.name}`); toast('Consentimiento actualizado'); re(); };
  $('#cw').onchange=e=>{ c.consent.wa=e.target.checked; toast('Consentimiento actualizado'); re(); };
  $('#qn').onclick=()=>miniForm('Nueva nota',`<div class="field"><label for="nt">Nota</label><textarea class="input" id="nt" rows="4" placeholder="Qué pasó, qué acordaron…"></textarea><span class="err">${ic('alert')}Escribí la nota.</span></div>`,()=>{ const v=$('#nt').value.trim(); if(!v) return $('#nt').closest('.field').classList.add('has-error'); c.timeline.unshift({type:'note',t:v,when:'Recién'}); toast('Nota agregada'); return true; },re);
  $('#qt').onclick=()=>actForm(id,re);
  $('#qd').onclick=()=>dealForm({contact:id,company:c.company},re);
  if($('#qw')) $('#qw').onclick=()=>{ const v=x.convs.find(z=>z.contact===id&&z.channel==='WhatsApp'); if(v){ inboxSel=v.id; closeLayer(); go('#/app/comunicaciones/inbox'); } else { x.convs.unshift({id:uid(),contact:id,channel:'WhatsApp',assigned:S.user.name,status:'Abierta',unread:0,last:'Recién',winH:999,tags:[],msgs:[{from:'sys',t:'Conversación nueva. Fuera de la ventana de 24 h: empezá con una plantilla aprobada.',at:'Recién'}]}); inboxSel=x.convs[0].id; closeLayer(); go('#/app/comunicaciones/inbox'); } };
  if($('#qe')) $('#qe').onclick=()=>{ closeLayer(); go('#/app/comunicaciones/email'); toast(`Elegí o creá una campaña para ${c.name}`); };
  $('#addtag').onclick=()=>miniForm('Agregar etiqueta',`<div class="field"><label for="tg">Etiqueta</label><input class="input" id="tg" list="tgl" placeholder="Ej.: VIP"><datalist id="tgl">${[...new Set(x.contacts.flatMap(z=>z.tags))].map(t=>`<option>${esc(t)}</option>`).join('')}</datalist><span class="err">${ic('alert')}Escribí una etiqueta.</span></div>`,()=>{ const v=$('#tg').value.trim(); if(!v) return $('#tg').closest('.field').classList.add('has-error'); if(!c.tags.includes(v)) c.tags.push(v); return true; },re);
}
function miniForm(title,body,save,after,label='Guardar'){
  modal(title,body,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="mok">${label}</button>`);
  $('#mok').onclick=()=>{ if(save()===true){ closeLayer(); after?after():render(); } };
}
function contactForm(type){
  const x=X(), brands=S.brands.map(b=>b.name);
  modal(type==='Lead'?'Nuevo lead':'Nuevo contacto',`<div class="field"><label for="nn">Nombre y apellido</label><input class="input" id="nn" autocomplete="off"><span class="err">${ic('alert')}Ingresá el nombre.</span></div>
   <div class="field"><label for="ne">Email</label><input class="input" id="ne" type="email" placeholder="nombre@empresa.com"><span class="err" id="nee">${ic('alert')}Ingresá un email válido.</span></div>
   <div class="field"><label for="np">Teléfono <span class="muted">(opcional)</span></label><input class="input" id="np" placeholder="+54 9 351 …"></div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="field"><label for="nco">Empresa</label><select class="select" id="nco"><option value="">Particular</option>${x.companies.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></div><div class="field"><label for="nty">Tipo</label><select class="select" id="nty">${['Lead','Cliente','Contacto'].map(t=>`<option ${t===(type||'Contacto')?'selected':''}>${t}</option>`).join('')}</select></div>
   <div class="field"><label for="nsr">Origen</label><select class="select" id="nsr">${SOURCES.map(s=>`<option>${s}</option>`).join('')}</select></div><div class="field"><label for="nbr">Marca</label><select class="select" id="nbr">${brands.map(b=>`<option ${curBrand()&&curBrand().name===b?'selected':''}>${esc(b)}</option>`).join('')}</select></div></div>
   <label class="check" style="margin-bottom:8px"><input type="checkbox" id="nce"> <span>Aceptó recibir emails de marketing</span></label><label class="check"><input type="checkbox" id="ncw"> <span>Aceptó recibir mensajes de WhatsApp</span></label>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="mok">Crear</button>`);
  $('#mok').onclick=()=>{ const n=$('#nn').value.trim(), e=$('#ne').value.trim(); let bad=false;
    $('#nn').closest('.field').classList.toggle('has-error',!n); bad=!n;
    const dup=x.contacts.find(z=>z.email.toLowerCase()===e.toLowerCase());
    const eOk=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); $('#ne').closest('.field').classList.toggle('has-error',!eOk||!!dup); if(dup) $('#nee').innerHTML=`${ic('alert')}Ya existe: ${esc(dup.name)}.`; bad=bad||!eOk||!!dup;
    if(bad) return;
    const ty=$('#nty').value, ph=$('#np').value.trim();
    x.contacts.unshift({id:uid(),name:n,email:e,phone:ph,company:$('#nco').value,brand:$('#nbr').value,type:ty,source:$('#nsr').value,campaign:'',owner:S.user.name,score:20,last:0,leadStatus:ty==='Lead'?'Nuevo':'',tags:[],consent:{email:$('#nce').checked,wa:$('#ncw').checked&&!!ph},created:iso(NOW),timeline:[{type:'note',t:'Contacto creado a mano',when:'Recién'}]});
    logAct(`Creaste el contacto ${n}`); closeLayer(); render(); toast(ty==='Lead'?'Lead creado. Entra al flujo de bienvenida si está activo.':'Contacto creado'); };
}
function dealForm(pre={},after){
  const x=X();
  modal('Nueva oportunidad',`<div class="field"><label for="dn">Nombre</label><input class="input" id="dn" placeholder="Ej.: Plan anual de contenidos"><span class="err">${ic('alert')}Ingresá un nombre.</span></div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="field"><label for="dc">Contacto</label><select class="select" id="dc">${x.contacts.map(c=>`<option value="${c.id}" ${c.id===pre.contact?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label for="da">Importe estimado ($)</label><input class="input" id="da" inputmode="numeric" placeholder="0"><span class="err">${ic('alert')}Ingresá un importe.</span></div>
   <div class="field"><label for="ds">Etapa</label><select class="select" id="ds">${STAGES.slice(0,4).map(s=>`<option>${s[0]}</option>`).join('')}</select></div><div class="field"><label for="dd">Cierre estimado</label><input class="input" id="dd" type="date" value="${iso(addDays(NOW,30))}"></div></div>
   <div class="field"><label for="dp">Producto o servicio</label><input class="input" id="dp" placeholder="Ej.: Gestión de redes"></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="mok">Crear oportunidad</button>`);
  $('#mok').onclick=()=>{ const n=$('#dn').value.trim(), a=+$('#da').value.replace(/\D/g,''); $('#dn').closest('.field').classList.toggle('has-error',!n); $('#da').closest('.field').classList.toggle('has-error',!a); if(!n||!a) return;
    const c=cById($('#dc').value); x.deals.unshift({id:uid(),name:n,contact:c.id,company:c.company,amount:a,stage:$('#ds').value,close:$('#dd').value,owner:S.user.name,product:$('#dp').value,brand:c.brand,lossReason:'',history:[{t:'Creada en '+$('#ds').value,when:'Recién'}]});
    if(c.type==='Lead'){ c.leadStatus='Calificado'; } c.timeline.unshift({type:'deal',t:`Nueva oportunidad «${n}»`,when:'Recién'});
    logAct(`Creaste la oportunidad ${n}`); closeLayer(); after?after():render(); toast('Oportunidad creada en el pipeline'); };
}
function actForm(contact,after){
  const x=X();
  modal('Nueva actividad',`<div class="field"><span class="label">Tipo</span><div class="seg" id="aty">${['Llamada','Reunión','Tarea','Recordatorio'].map((t,i)=>`<button type="button" data-t="${t}" aria-pressed="${i===2}">${t}</button>`).join('')}</div></div>
   <div class="field"><label for="at">Qué hay que hacer</label><input class="input" id="at"><span class="err">${ic('alert')}Describí la actividad.</span></div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="field"><label for="ac">Contacto</label><select class="select" id="ac">${x.contacts.map(c=>`<option value="${c.id}" ${c.id===contact?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label for="ad">Fecha</label><input class="input" id="ad" type="date" value="${iso(NOW)}"></div></div>
   <div class="field"><label for="ao">Responsable</label><select class="select" id="ao">${OWNERS().map(o=>`<option>${esc(o)}</option>`).join('')}</select></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="mok">Crear</button>`);
  let ty='Tarea'; $$('#aty button').forEach(b=>b.onclick=()=>{ $$('#aty button').forEach(z=>z.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); ty=b.dataset.t; });
  $('#mok').onclick=()=>{ const t=$('#at').value.trim(); $('#at').closest('.field').classList.toggle('has-error',!t); if(!t) return; x.activities.push({id:uid(),type:ty,title:t,contact:$('#ac').value,due:$('#ad').value,owner:$('#ao').value,done:false}); closeLayer(); after?after():render(); toast('Actividad creada'); };
}
function dealDrawer(id){
  const x=X(), d=x.deals.find(z=>z.id===id); if(!d) return;
  drawer(`<div class="dr-head"><span class="mark" style="background:var(--magenta);color:var(--on-magenta)">${ic('dollar')}</span><div style="flex:1;min-width:0"><b style="font-size:16px">${esc(d.name)}</b><div class="small muted">${esc(coName(d.company)||cName(d.contact))}</div></div><button class="icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div>
  <div style="padding:20px;overflow:auto;flex:1"><div class="mono" style="font-size:28px;letter-spacing:-.02em">${money(d.amount)}</div><div class="small muted" style="margin-bottom:20px">Probabilidad ${stProb(d.stage)}% · ponderado ${money(d.amount*stProb(d.stage)/100)}</div>
   <div class="field"><label for="dst">Etapa</label><select class="select" id="dst">${STAGES.map(s=>`<option ${s[0]===d.stage?'selected':''}>${s[0]}</option>`).join('')}</select></div>
   <dl class="kv" style="grid-template-columns:auto 1fr;margin-bottom:20px"><dt>Contacto</dt><dd style="font-family:inherit"><button data-c="${d.contact}" style="all:unset;cursor:pointer;color:var(--magenta-text)">${esc(cName(d.contact))}</button></dd><dt>Producto</dt><dd style="font-family:inherit">${esc(d.product)||'—'}</dd><dt>Cierre estimado</dt><dd>${fdate(d.close)}</dd><dt>Responsable</dt><dd style="font-family:inherit">${esc(d.owner)}</dd>${d.lossReason?`<dt>Motivo de pérdida</dt><dd style="font-family:inherit">${esc(d.lossReason)}</dd>`:''}</dl>
   <h4 class="small muted" style="margin:0 0 8px;text-transform:uppercase;letter-spacing:.04em;font-weight:500">Historial de cambios</h4><div class="lst">${d.history.map(h=>`<div class="it"><span>${esc(h.t)}</span><span class="small muted">${h.when}</span></div>`).join('')}</div></div>`);
  $('#dst').onchange=e=>moveDeal(d,e.target.value,()=>dealDrawer(id));
  $$('#layer [data-c]').forEach(b=>b.onclick=()=>contactDrawer(b.dataset.c));
}
function moveDeal(d,to,after){
  if(d.stage===to) return;
  const done=reason=>{ const from=d.stage; d.stage=to; d.lossReason=reason||''; d.history.unshift({t:`${from} → ${to}${reason?' · '+reason:''}`,when:'Recién'});
    const c=cById(d.contact); if(to==='Ganado'&&c){ c.type='Cliente'; c.leadStatus=''; c.timeline.unshift({type:'deal',t:`Ganaste «${d.name}»`,when:'Recién'}); }
    logAct(`Moviste «${d.name}» a ${to}`); if(to==='Ganado') notify('¡Oportunidad ganada!',`${d.name} · ${money(d.amount)}`);
    after?after():render(); toast(to==='Ganado'?`¡Ganada! ${money(d.amount)}`:`Movida a ${to}`); };
  if(to==='Perdido'){ modal('¿Por qué se perdió?',`<p class="small muted" style="margin-bottom:12px">El motivo te ayuda a entender qué ajustar en tu proceso comercial.</p><div class="field"><label for="lr">Motivo</label><select class="select" id="lr">${LOSS.map(l=>`<option>${l}</option>`).join('')}</select></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="mok">Marcar como perdida</button>`);
    $('#mok').onclick=()=>{ const r=$('#lr').value; closeLayer(); done(r); }; $$('#layer [data-close]').forEach(b=>b.addEventListener('click',()=>{ if(after) setTimeout(after,0); })); return; }
  done();
}
function bCrm(tab){
  bindDemo(); const x=X();
  const on=(s,f)=>{const e=$(s);if(e)e.onclick=f};
  on('#newc',()=>contactForm(tab==='leads'?'Lead':'')); $$('[data-newc]').forEach(b=>b.onclick=()=>contactForm());
  on('#newd',()=>dealForm()); on('#newa',()=>actForm()); on('#imp',()=>{ modal('Importar contactos',`<div class="card" style="border-style:dashed;text-align:center;padding:28px">${ic('upload')}<p style="margin-top:8px"><b>Arrastrá un archivo CSV o Excel</b></p><p class="small muted">Columnas sugeridas: nombre, email, teléfono, empresa, origen.</p><button class="btn btn-sm" style="margin-top:12px" id="pick">Elegir archivo</button></div><div class="alert alert-info" style="margin-top:12px">${ic('info')}<div>Detectamos duplicados por email y te dejamos elegir si actualizarlos o saltearlos.</div></div>`,`<button class="btn" data-close>Cerrar</button>`); $('#pick').onclick=()=>toast('En el producto real se abre el selector de archivos'); });
  on('#newe',()=>miniForm('Nueva empresa',`<div class="field"><label for="en">Nombre</label><input class="input" id="en"><span class="err">${ic('alert')}Ingresá el nombre.</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="field"><label for="ei">Rubro</label><input class="input" id="ei"></div><div class="field"><label for="ec">Ciudad</label><input class="input" id="ec"></div></div><div class="field"><label for="ew">Sitio web</label><input class="input" id="ew" placeholder="empresa.com"></div>`,()=>{ const n=$('#en').value.trim(); if(!n) return $('#en').closest('.field').classList.add('has-error'); x.companies.unshift({id:uid(),name:n,industry:$('#ei').value,city:$('#ec').value,size:'',owner:S.user.name,web:$('#ew').value}); toast('Empresa creada'); return true; }));
  const q=$('#cq'); if(q){ q.oninput=()=>{ crmQ=q.value; const pos=q.selectionStart; render(); const n=$('#cq'); n.focus(); n.setSelectionRange(pos,pos); }; }
  $$('[data-ty]').forEach(b=>b.onclick=()=>{crmType=b.dataset.ty;render()});
  $$('[data-ls]').forEach(b=>b.onclick=()=>{leadSt=b.dataset.ls;render()});
  on('#dow',null); const dw=$('#dow'); if(dw) dw.onchange=()=>{dealsOwner=dw.value;render()};
  $$('[data-c]').forEach(el=>el.onclick=e=>{ e.stopPropagation(); contactDrawer(el.dataset.c); });
  $$('[data-conv]').forEach(b=>b.onclick=()=>dealForm({contact:b.dataset.conv}));
  $$('[data-done]').forEach(b=>b.onchange=()=>{ const a=x.activities.find(z=>z.id===b.dataset.done); a.done=b.checked; render(); toast(a.done?'Actividad completada':'Actividad reabierta'); });
  $$('[data-e]').forEach(r=>r.onclick=()=>{ const e=x.companies.find(z=>z.id===r.dataset.e), cs=x.contacts.filter(c=>c.company===e.id), ds=x.deals.filter(d=>d.company===e.id);
    drawer(`<div class="dr-head"><span class="mark" style="background:#2A2A30">${initials(e.name)}</span><div style="flex:1"><b style="font-size:16px">${esc(e.name)}</b><div class="small muted">${esc(e.industry)} · ${esc(e.city)}</div></div><button class="icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div><div style="padding:20px;overflow:auto;display:flex;flex-direction:column;gap:20px"><div><h4 class="small muted" style="margin:0 0 8px">CONTACTOS</h4><div class="lst">${cs.map(c=>`<button class="it" data-c="${c.id}" style="font:inherit;color:inherit;cursor:pointer;text-align:left"><span>${esc(c.name)}<div class="small muted">${esc(c.email)}</div></span><span class="${typeBadge(c.type)}">${c.type}</span></button>`).join('')||'<span class="small muted">Sin contactos</span>'}</div></div><div><h4 class="small muted" style="margin:0 0 8px">OPORTUNIDADES</h4><div class="lst">${ds.map(d=>`<div class="it"><span>${esc(d.name)}<div class="small muted">${d.stage}</div></span><span class="mono small">${money(d.amount)}</span></div>`).join('')||'<span class="small muted">Sin oportunidades</span>'}</div></div></div>`);
    $$('#layer [data-c]').forEach(b=>b.onclick=()=>contactDrawer(b.dataset.c)); });
  $$('[data-o]').forEach(r=>r.onclick=()=>{ const o=x.orders.find(z=>z.id===r.dataset.o);
    drawer(`<div class="dr-head"><span class="mark" style="background:var(--surface-sunken);color:var(--ink)">${ic('cart')}</span><div style="flex:1"><b class="mono" style="font-size:16px">${o.id}</b><div class="small muted">${fdate(o.date)} · ${esc(cName(o.contact))}</div></div><button class="icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div><div style="padding:20px;overflow:auto"><div class="mono" style="font-size:28px">${money(o.amount)}</div><p class="small muted" style="margin-bottom:16px">${esc(o.items)}</p>
     <dl class="kv" style="grid-template-columns:auto 1fr"><dt>Origen del pedido</dt><dd style="font-family:inherit">${o.source}</dd><dt>Medio de pago</dt><dd style="font-family:inherit">${esc(o.payment)}</dd><dt>Estado del pago</dt><dd><span class="${payBadge(o.payStatus)}">${o.payStatus}</span></dd><dt>Estado del pedido</dt><dd style="font-family:inherit">${o.status}</dd><dt>ID de transacción</dt><dd>${o.source==='Mercado Pago'?o.id:'MP-'+(88000+parseInt(o.id.slice(1)))}</dd><dt>Campaña</dt><dd style="font-family:inherit">${esc(campName(o.campaign))||'—'}</dd><dt>Atribución</dt><dd style="font-family:inherit">${o.attribution==='comprobada'?'Comprobada (UTM)':o.attribution==='estimada'?'Estimada (última interacción)':'Sin datos'}</dd></dl>
     ${o.merged?`<div class="alert alert-ok" style="margin-top:16px">${ic('check')}<div>Pedido de <b>Shopify</b> y pago de <b>Mercado Pago</b> unificados en una sola venta.</div></div>`:''}${o.payStatus==='Reembolsado'?`<div class="alert alert-warn" style="margin-top:16px">${ic('info')}<div>Reembolso informado por Mercado Pago. No suma a las ventas.</div></div>`:''}</div>`); });
  /* pipeline: arrastrar y soltar + clic para abrir */
  $$('.kcard').forEach(k=>{ k.onclick=()=>dealDrawer(k.dataset.d); k.ondragstart=e=>{ e.dataTransfer.setData('text/plain',k.dataset.d); k.classList.add('dragging'); }; k.ondragend=()=>k.classList.remove('dragging'); });
  $$('.kcol').forEach(col=>{ col.ondragover=e=>{ e.preventDefault(); col.classList.add('drop'); }; col.ondragleave=()=>col.classList.remove('drop'); col.ondrop=e=>{ e.preventDefault(); col.classList.remove('drop'); const d=x.deals.find(z=>z.id===e.dataTransfer.getData('text/plain')); if(d) moveDeal(d,col.dataset.stage); }; });
  on('#cexp',()=>downloadCsv('contactos.csv',[['Nombre','Email','Teléfono','Empresa','Tipo','Origen','Responsable']].concat(x.contacts.filter(inB).map(c=>[c.name,c.email,c.phone,coName(c.company),c.type,c.source,c.owner]))));
}
function downloadCsv(name,rows){
  const csv='﻿'+rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); a.download=name; document.body.appendChild(a); a.click(); a.remove(); toast(`Descargamos ${name}`);
}

/* =====================================================================
   08 · AUTOMATIZACIONES
   ===================================================================== */
const AU_TABS=[['flujos','Flujos'],['plantillas','Plantillas'],['ejecuciones','Ejecuciones']];
const BLOCKS={
 trigger:['Nuevo lead','Formulario completado','Compra realizada','Pago aprobado','Cambio de etapa en CRM','Carrito abandonado','Contacto inactivo','Respuesta recibida','Fecha especial'],
 condition:['Si pertenece a un segmento','Si realizó una compra','Si abrió un email','Si respondió un WhatsApp','Si el pago fue aprobado','Si está en una etapa del pipeline','Si tiene consentimiento de WhatsApp'],
 action:['Crear o actualizar contacto','Enviar email','Enviar WhatsApp','Crear tarea','Asignar responsable','Cambiar etapa del pipeline','Agregar etiqueta','Enviar notificación','Iniciar otro flujo'],
 wait:['Esperar']};
const KIND={trigger:['Disparador','zap'],condition:['Condición','branch'],action:['Acción','play'],wait:['Espera','hourglass']};
const ACT_IC={'Enviar email':'mail','Enviar WhatsApp':'message','Crear tarea':'check','Asignar responsable':'assign','Cambiar etapa del pipeline':'kanban','Agregar etiqueta':'tag','Enviar notificación':'bell','Iniciar otro flujo':'refresh','Crear o actualizar contacto':'user'};
const flowBadge=s=>({Activo:'badge badge-ok',Pausado:'badge badge-warn',Borrador:'badge'}[s]||'badge');
const TEMPLATES=[
 ['Bienvenida de nuevos leads','Email de bienvenida, espera de 24 h y WhatsApp si no abrió.',['Nuevo lead','Enviar email','Esperar','Enviar WhatsApp']],
 ['Seguimiento comercial','Tarea al vendedor y recordatorio si la oportunidad no avanza.',['Cambio de etapa en CRM','Crear tarea','Esperar','Enviar notificación']],
 ['Carrito abandonado','Recordatorio por WhatsApp o email y cupón si no compra.',['Carrito abandonado','Enviar WhatsApp','Esperar','Enviar email']],
 ['Confirmación de compra','Gracias por la compra y datos del pedido.',['Pago aprobado','Enviar WhatsApp','Agregar etiqueta']],
 ['Postventa','Pedido de reseña a los 7 días de la entrega.',['Compra realizada','Esperar','Enviar email']],
 ['Recuperación de clientes inactivos','Mensaje especial a clientes sin compras en 90 días.',['Contacto inactivo','Enviar email','Esperar','Enviar WhatsApp']],
 ['Fidelización','Etiqueta VIP y beneficio a partir de la tercera compra.',['Compra realizada','Agregar etiqueta','Enviar email']],
 ['Fechas especiales','Saludo de cumpleaños con un beneficio.',['Fecha especial','Enviar email']],
 ['Lanzamiento de productos','Secuencia de anticipo, lanzamiento y último aviso.',['Formulario completado','Enviar email','Esperar','Enviar email']],
 ['Recuperación de oportunidades','Reactiva oportunidades perdidas por «No era el momento».',['Cambio de etapa en CRM','Esperar','Crear tarea']]];
let auSel=null, auTest=null;
function vAuto(tab){
  const x=X();
  const f=x.flows.find(z=>z.id===tab); if(f) return auBuilder(f);
  tab=AU_TABS.some(t=>t[0]===tab)?tab:'flujos';
  const head=pageHead('Automatizaciones','Flujos visuales que conectan marketing, CRM y ventas, sin programar.',`${brandScope()}<button class="btn btn-primary" id="newf">${ic('plus')} Nuevo flujo</button>`)+subTabs('automatizaciones',AU_TABS,tab);
  if(!x.flows.length&&tab==='flujos') return head+emptyBlock('zap','Creá tu primera automatización','Empezá desde una plantilla, como la bienvenida de nuevos leads, o armá tu flujo desde cero.',`<a class="btn btn-primary" href="#/app/automatizaciones/plantillas">Ver plantillas</a>`);
  if(tab==='plantillas') return head+`<div class="cards">${TEMPLATES.map(([n,d,ch],i)=>`<article class="card tpl"><h3 style="font-size:16px">${n}</h3><p class="small muted">${d}</p><div class="chain">${ch.map((c,j)=>`<span class="tagc">${j===0?'⚡ ':''}${c}</span>`).join('<span class="muted small">→</span>')}</div><button class="btn btn-sm" data-tpl="${i}" style="align-self:flex-start;margin-top:auto">Usar plantilla</button></article>`).join('')}</div>`;
  if(tab==='ejecuciones') return head+`<div class="toolbar"><span class="small muted">Últimas ejecuciones de todos los flujos. Las fallidas se pueden reintentar.</span></div><div class="table-wrap"><table class="t"><thead><tr><th>Contacto</th><th>Flujo</th><th class="hide-m">Paso actual</th><th>Estado</th><th class="hide-m">Inicio</th><th></th></tr></thead><tbody>
   ${x.runs.map(r=>{const fl=x.flows.find(z=>z.id===r.flow);return `<tr><td><b>${esc(cName(r.contact))}</b></td><td class="small">${esc(fl?fl.name:'')}</td><td class="hide-m small">${esc(r.step)}</td><td><span class="badge ${r.status==='Error'?'badge-err':r.status==='Completada'?'badge-ok':'badge-brand'}">${r.status}</span>${r.error?`<div class="small muted" style="max-width:280px;margin-top:4px">${esc(r.error)}</div>`:''}</td><td class="hide-m small muted">${r.when}</td><td style="text-align:right">${r.status==='Error'?`<button class="btn btn-sm" data-retry="${r.id}">${ic('refresh')} Reintentar</button>`:''}</td></tr>`}).join('')}</tbody></table></div>`;
  const fl=x.flows.filter(inB);
  return head+`<div class="stat-grid"><div class="stat"><div class="l">Flujos activos</div><div class="v">${fl.filter(z=>z.status==='Activo').length}</div><div class="d">de ${fl.length}</div></div><div class="stat"><div class="l">Contactos en curso</div><div class="v">${num(fl.reduce((a,z)=>a+z.active,0))}</div></div><div class="stat"><div class="l">Completados</div><div class="v">${num(fl.reduce((a,z)=>a+z.completed,0))}</div><div class="d">últimos 30 días</div></div><div class="stat"><div class="l">Con errores</div><div class="v" style="${fl.some(z=>z.errors)?'color:var(--danger)':''}">${fl.reduce((a,z)=>a+z.errors,0)}</div><div class="d"><a href="#/app/automatizaciones/ejecuciones" style="color:var(--magenta-text)">Ver ejecuciones</a></div></div></div>
  <div class="table-wrap"><table class="t"><thead><tr><th>Flujo</th><th class="hide-m">Disparador</th><th>Estado</th><th class="num hide-m">En curso</th><th class="num">Completados</th><th class="num hide-m">Errores</th><th class="hide-m">Editado</th><th></th></tr></thead><tbody>
  ${fl.map(z=>`<tr><td><a href="#/app/automatizaciones/${z.id}" style="color:inherit"><b>${esc(z.name)}</b></a><div class="small muted"><i class="sdot" style="background:${brandOf(z.brand).color};display:inline-block;margin-right:4px"></i>${esc(z.brand)} · <span class="mono">v${z.version}</span></div></td><td class="hide-m small">${esc(z.steps[0].label)}</td><td><span class="${flowBadge(z.status)}">${z.status}</span></td><td class="num hide-m">${num(z.active)}</td><td class="num">${num(z.completed)}</td><td class="num hide-m" style="${z.errors?'color:var(--danger)':''}">${z.errors||'—'}</td><td class="hide-m small muted">${z.edited}</td><td style="text-align:right"><button class="icon-btn" data-fm="${z.id}" aria-label="Más acciones">${ic('more')}</button></td></tr>`).join('')}</tbody></table></div>`;
}
function walk(steps,fn){ steps.forEach(s=>{ fn(s,steps); if(s.yes) walk(s.yes,fn); if(s.no) walk(s.no,fn); }); }
function findNode(f,id){ let r=null; walk(f.steps,(s,arr)=>{ if(s.id===id) r={s,arr}; }); return r; }
function nodeHtml(n){
  const [k,i]=KIND[n.kind], icn=n.kind==='action'?(ACT_IC[n.type]||'play'):i;
  return `<button class="fnode ${n.kind} ${auSel===n.id?'sel':''} ${n.err?'err':''}" data-node="${n.id}">${n.count!=null&&n.count>0?`<span class="cnt" title="Contactos que pasaron por este paso">${num(n.count)}</span>`:''}<span class="ni">${ic(icn)}</span><span style="min-width:0"><span class="k">/${k.toLowerCase()}</span><b>${esc(n.label)}</b>${n.d?`<span class="d">${esc(n.d)}</span>`:''}${n.err?`<span class="d" style="color:var(--danger)">3 errores en 30 días</span>`:''}</span></button>`;
}
function stepsHtml(steps,path){
  return steps.map((n,i)=>`${i>0?'<div class="conn"></div>':''}${nodeHtml(n)}${n.kind==='condition'?`<div class="conn"></div><div class="branches"><div class="branch"><span class="blabel y">Sí</span>${n.yes.length?stepsHtml(n.yes,n.id+':yes'):`<button class="addb" data-add="${n.id}:yes:0" aria-label="Agregar paso en la rama Sí">${ic('plus')}</button>`}</div><div class="branch"><span class="blabel n">No</span>${n.no.length?stepsHtml(n.no,n.id+':no'):`<button class="addb" data-add="${n.id}:no:0" aria-label="Agregar paso en la rama No">${ic('plus')}</button>`}</div></div>`:''}${n.kind!=='condition'&&i<steps.length-1?'':''}${n.kind!=='condition'?`<div class="conn"></div><button class="addb" data-add="${path}:${i+1}" aria-label="Agregar paso">${ic('plus')}</button>`:''}`).join('');
}
function auBuilder(f){
  const sel=auSel?findNode(f,auSel):null;
  return `<nav class="breadcrumbs" style="margin-bottom:8px"><a href="#/app/automatizaciones">Automatizaciones</a>${ic('chevr')}<span>${esc(f.name)}</span></nav>
  <div class="bhead"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h1>${esc(f.name)}</h1><span class="${flowBadge(f.status)}">${f.status}</span><span class="vtag">v${f.version}</span></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="fhist">${ic('history')} Versiones</button><button class="btn" id="ftest">${ic('play')} Probar</button>${f.status==='Activo'?`<button class="btn" id="fpause">${ic('pause')} Pausar</button>`:`<button class="btn btn-primary" id="fact">${ic('zap')} Activar</button>`}</div></div>
  ${f.status==='Activo'?`<div class="alert alert-info" style="margin-bottom:16px">${ic('info')}<div>El flujo está activo. Los cambios se guardan como una versión nueva y aplican a los contactos que entren desde ahora.</div></div>`:''}
  <div class="builder"><div class="canvas"><div class="flow">${stepsHtml(f.steps,'root:main')}<div class="conn"></div><span class="fend">fin</span></div></div>
   <aside class="panel">${sel?nodePanel(f,sel.s):`<h3>Resumen</h3><p class="small muted" style="margin-bottom:16px">Elegí un bloque para editarlo, o tocá + para sumar un paso.</p><dl class="kv"><dt>En curso</dt><dd>${num(f.active)}</dd><dt>Completados</dt><dd>${num(f.completed)}</dd><dt>Errores</dt><dd>${f.errors}</dd><dt>Marca</dt><dd style="font-family:inherit">${esc(f.brand)}</dd><dt>Última edición</dt><dd style="font-family:inherit">${f.edited}</dd></dl>
    <div style="margin-top:20px"><h4 class="small muted" style="margin:0 0 8px;font-weight:500">LÍMITES</h4><label class="switch" style="margin-bottom:8px"><input type="checkbox" checked> <span class="small">Una vez por contacto cada 30 días</span></label><label class="switch"><input type="checkbox" checked> <span class="small">Respetar horario: 9 a 21 h</span></label></div>`}</aside></div>`;
}
function nodePanel(f,n){
  const [k]=KIND[n.kind], opts=BLOCKS[n.kind];
  const cfg={
   'Enviar email':`<div class="field"><label for="ncf">Campaña o plantilla de email</label><select class="select" id="ncf">${X().emails.map(e=>`<option>${esc(e.name)}</option>`).join('')}<option>Bienvenida pymes</option></select></div>`,
   'Enviar WhatsApp':`<div class="field"><label for="ncf">Plantilla aprobada</label><select class="select" id="ncf">${X().waTemplates.map(t=>`<option ${t.status!=='Aprobada'?'disabled':''}>${t.name}${t.status!=='Aprobada'?' · '+t.status:''}</option>`).join('')}</select><span class="hint">Fuera de la ventana de 24 h solo se pueden usar plantillas aprobadas por Meta.</span></div><label class="check"><input type="checkbox" checked disabled> <span class="small">Solo a contactos con consentimiento de WhatsApp</span></label>`,
   'Crear tarea':`<div class="field"><label for="ncf">Asignar a</label><select class="select" id="ncf"><option>Responsable del contacto</option>${OWNERS().map(o=>`<option>${esc(o)}</option>`).join('')}</select></div><div class="field"><label for="ncv">Vence en</label><select class="select" id="ncv"><option>1 día</option><option>2 días</option><option>1 semana</option></select></div>`,
   'Esperar':`<div class="field"><label for="ncf">Tiempo de espera</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><input class="input" id="ncf" type="number" min="1" value="${n.hours>=24?n.hours/24:n.hours||1}"><select class="select" id="ncu"><option ${n.hours>=24?'selected':''}>días</option><option ${n.hours<24?'selected':''}>horas</option></select></div></div>`,
   'Si abrió un email':`<div class="field"><label for="ncf">Email</label><select class="select" id="ncf"><option>El último email del flujo</option>${X().emails.map(e=>`<option>${esc(e.name)}</option>`).join('')}</select></div>`,
   'Cambio de etapa en CRM':`<div class="field"><label for="ncf">Cuando pasa a</label><select class="select" id="ncf">${STAGES.map(s=>`<option>${s[0]}</option>`).join('')}</select></div>`};
  return `<span class="small muted mono">/${k.toLowerCase()}</span><h3 style="margin-top:2px">${esc(n.label)}</h3><p class="small muted" style="margin-bottom:16px">${num(n.count||0)} contactos pasaron por este paso.</p>
   <div class="field"><label for="nty2">Tipo de ${k.toLowerCase()}</label><select class="select" id="nty2">${opts.map(o=>`<option ${o===n.type?'selected':''}>${o}</option>`).join('')}</select></div>
   <div class="field"><label for="nlb">Nombre del paso</label><input class="input" id="nlb" value="${esc(n.label)}"></div>
   ${cfg[n.type]||''}
   ${n.err?`<div class="alert alert-err" style="margin-bottom:12px">${ic('alert')}<div>3 errores en los últimos 30 días. <a href="#/app/automatizaciones/ejecuciones" style="color:inherit;text-decoration:underline">Ver ejecuciones</a></div></div>`:''}
   <div style="display:flex;gap:8px;justify-content:space-between;margin-top:8px">${n.kind!=='trigger'?`<button class="btn btn-ghost btn-sm" id="ndel" style="color:var(--danger)">${ic('trash')} Eliminar</button>`:'<span></span>'}<button class="btn btn-primary btn-sm" id="nsave">Aplicar</button></div>`;
}
function bAuto(tab){
  bindDemo(); const x=X(), f=x.flows.find(z=>z.id===tab);
  const on=(s,fn)=>{const e=$(s);if(e)e.onclick=fn};
  on('#newf',()=>newFlow());
  $$('[data-tpl]').forEach(b=>b.onclick=()=>newFlow(TEMPLATES[+b.dataset.tpl]));
  $$('[data-retry]').forEach(b=>b.onclick=()=>{ b.classList.add('is-loading'); setTimeout(()=>{ const r=x.runs.find(z=>z.id===b.dataset.retry); r.status='Completada'; r.error=''; render(); toast('Reintento exitoso'); },800); });
  $$('[data-fm]').forEach(b=>b.onclick=()=>{ const z=x.flows.find(q=>q.id===b.dataset.fm); const m=popMenu(b,`<a class="menu-item" href="#/app/automatizaciones/${z.id}">${ic('edit')}<span class="grow">Editar</span></a><button class="menu-item" data-a="dup">${ic('copy')}<span class="grow">Duplicar</span></button><button class="menu-item" data-a="tog">${ic(z.status==='Activo'?'pause':'play')}<span class="grow">${z.status==='Activo'?'Pausar':'Activar'}</span></button>`,'right');
    m.querySelector('[data-a=dup]').onclick=()=>{ const c=JSON.parse(JSON.stringify(z)); c.id=uid(); c.name=z.name+' (copia)'; c.status='Borrador'; c.version=1; c.active=0; c.completed=0; c.errors=0; c.edited='Recién'; walk(c.steps,s=>{s.id=uid();s.count=0;s.err=false}); x.flows.push(c); closeLayer(); render(); toast('Flujo duplicado como borrador'); };
    m.querySelector('[data-a=tog]').onclick=()=>{ z.status=z.status==='Activo'?'Pausado':'Activo'; closeLayer(); render(); toast(z.status==='Activo'?'Flujo activado':'Flujo pausado. Los contactos en curso quedan en espera.'); }; });
  if(!f) return;
  $$('[data-node]').forEach(b=>b.onclick=()=>{ auSel=auSel===b.dataset.node?null:b.dataset.node; render(); });
  $$('[data-add]').forEach(b=>b.onclick=()=>{ const [pid,branch,idx]=b.dataset.add.split(':'); const arr=pid==='root'?f.steps:findNode(f,pid).s[branch];
    const m=popMenu(b,`<div class="blkmenu"><div class="k">Acción</div>${BLOCKS.action.map(a=>`<button data-k="action" data-t="${a}">${ic(ACT_IC[a]||'play')}${a}</button>`).join('')}<div class="k">Lógica</div><button data-k="condition" data-t="Si abrió un email">${ic('branch')}Condición (Sí / No)</button><button data-k="wait" data-t="Esperar">${ic('hourglass')}Espera</button></div>`);
    m.style.maxHeight='360px'; m.style.overflow='auto';
    $$('[data-k]',m).forEach(o=>o.onclick=()=>{ const k=o.dataset.k,t=o.dataset.t; const n={id:uid(),kind:k,type:t,label:k==='wait'?'Esperar 1 día':k==='condition'?'¿Abrió el email?':t,d:'',count:0,hours:24}; if(k==='condition'){n.yes=[];n.no=[]} arr.splice(+idx,0,n); auSel=n.id; f.edited='Recién'; if(f.status==='Activo'){} closeLayer(); render(); toast('Paso agregado. Configuralo en el panel de la derecha.'); }); });
  const sel=auSel?findNode(f,auSel):null;
  if(sel){ const n=sel.s;
    $('#nty2').onchange=e=>{ n.type=e.target.value; render(); };
    on('#nsave',()=>{ n.label=$('#nlb').value.trim()||n.label; if(n.type==='Esperar'){ const v=+$('#ncf').value||1, u=$('#ncu').value; n.hours=u==='días'?v*24:v; n.label=`Esperar ${v} ${v===1?u.replace(/s$/,''):u}`; } if($('#ncf')&&n.type!=='Esperar'&&$('#ncf').value) n.d=$('#ncf').value; f.edited='Recién'; if(f.status==='Activo'){ f.version++; toast(`Guardado como versión ${f.version}`); } else toast('Paso actualizado'); render(); });
    on('#ndel',()=>{ modal('¿Eliminar este paso?',`<p>Se elimina <b>${esc(n.label)}</b>${n.kind==='condition'?' y todos los pasos de sus ramas':''}.</p>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-danger" id="mok">Eliminar</button>`); $('#mok').onclick=()=>{ sel.arr.splice(sel.arr.indexOf(n),1); auSel=null; f.edited='Recién'; closeLayer(); render(); toast('Paso eliminado'); }; });
  }
  on('#fact',()=>{ const acts=[]; walk(f.steps,s=>{ if(s.kind==='action') acts.push(s); }); if(acts.length===0){ modal('Falta una acción',`<p>El flujo necesita al menos una acción después del disparador para poder activarse.</p>`,`<button class="btn btn-primary" data-close>Entendido</button>`); return; }
    modal('¿Activar el flujo?',`<p>A partir de ahora, cada vez que ocurra <b>${esc(f.steps[0].label)}</b> el contacto entra en este flujo.</p><div class="alert alert-info" style="margin-top:12px">${ic('info')}<div>Te recomendamos probarlo antes con un contacto de prueba.</div></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="mok">Activar</button>`); $('#mok').onclick=()=>{ f.status='Activo'; logAct(`Activaste el flujo ${f.name}`); closeLayer(); render(); toast('Flujo activado'); }; });
  on('#fpause',()=>{ f.status='Pausado'; render(); toast(`Flujo pausado. ${f.active} contactos quedan en espera hasta que lo reanudes.`); });
  on('#fhist',()=>{ drawer(`<div class="dr-head"><b style="flex:1;font-size:16px">Versiones</b><button class="icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div><div style="padding:20px;overflow:auto" class="lst">${Array.from({length:f.version},(_,i)=>f.version-i).map((v,i)=>`<div class="it"><span><b class="mono">v${v}</b>${i===0?' <span class="badge badge-ok">Actual</span>':''}<div class="small muted">${i===0?f.edited:`Hace ${i*6} días`} · ${i===0?S.user.name:'Sofía Paz'}</div></span>${i?`<button class="btn btn-sm" data-rest="${v}">Restaurar</button>`:''}</div>`).join('')}</div>`); $$('#layer [data-rest]').forEach(b=>b.onclick=()=>{ f.version++; closeLayer(); render(); toast(`Restauramos la v${b.dataset.rest} como v${f.version}`); }); });
  on('#ftest',()=>{ modal('Probar el flujo',`<p class="small muted" style="margin-bottom:12px">Simulamos el recorrido con un contacto. No se envía ningún mensaje real.</p><div class="field"><label for="tc">Contacto de prueba</label><select class="select" id="tc">${x.contacts.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div><div class="simlog" id="slog"></div>`,`<button class="btn" data-close>Cerrar</button><button class="btn btn-primary" id="mok">${ic('play')} Simular</button>`);
    $('#mok').onclick=()=>{ const c=cById($('#tc').value), lines=[]; let path=f.steps;
      const run=steps=>{ steps.forEach(s=>{ if(s.kind==='condition'){ const yes=s.type.includes('WhatsApp')?c.consent.wa:s.type.includes('compra')?x.orders.some(o=>o.contact===c.id):true; lines.push([`${s.label} → ${yes?'Sí':'No'}`,'branch']); run(yes?s.yes:s.no); } else if(s.kind==='wait') lines.push([`${s.label} (se saltea en la prueba)`,'hourglass']); else lines.push([s.kind==='trigger'?`Disparador: ${s.label}`:s.type==='Enviar WhatsApp'&&!c.phone?`${s.label}: se omitiría, ${c.name} no tiene WhatsApp`:`${s.label}`,s.kind==='trigger'?'zap':'check']); }); };
      run(path); lines.push(['Fin del flujo','check']);
      $('#slog').innerHTML=lines.map(([t,i])=>`<div>${ic(i)}<span>${esc(t)}</span></div>`).join('');
      $$('#slog div').forEach((d,i)=>setTimeout(()=>d.classList.add('show'),i*260)); $('#mok').textContent='Simular de nuevo'; }; });
}
function newFlow(tpl){
  const x=X();
  const mk=(t)=>{ const k=BLOCKS.trigger.includes(t)?'trigger':t==='Esperar'?'wait':'action'; return {id:uid(),kind:k,type:t,label:k==='wait'?'Esperar 1 día':t,d:'',count:0,hours:24}; };
  if(tpl){ const f={id:uid(),name:tpl[0],brand:(curBrand()||S.brands[0]||{name:''}).name,status:'Borrador',version:1,edited:'Recién',active:0,completed:0,errors:0,steps:tpl[2].map(mk)}; x.flows.unshift(f); auSel=null; go('#/app/automatizaciones/'+f.id); toast('Plantilla lista para editar'); return; }
  modal('Nuevo flujo',`<div class="field"><label for="fn">Nombre</label><input class="input" id="fn" placeholder="Ej.: Seguimiento de presupuestos"><span class="err">${ic('alert')}Ingresá un nombre.</span></div><div class="field"><label for="ft">¿Qué inicia el flujo?</label><select class="select" id="ft">${BLOCKS.trigger.map(t=>`<option>${t}</option>`).join('')}</select></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="mok">Crear flujo</button>`);
  $('#mok').onclick=()=>{ const n=$('#fn').value.trim(); if(!n) return $('#fn').closest('.field').classList.add('has-error'); const f={id:uid(),name:n,brand:(curBrand()||S.brands[0]||{name:''}).name,status:'Borrador',version:1,edited:'Recién',active:0,completed:0,errors:0,steps:[mk($('#ft').value)]}; x.flows.unshift(f); closeLayer(); auSel=null; go('#/app/automatizaciones/'+f.id); };
}

/* =====================================================================
   09 · COMUNICACIONES
   ===================================================================== */
const CO_TABS=[['inbox','Bandeja'],['email','Email marketing'],['whatsapp','WhatsApp Business']];
let inboxSel=null, inboxF='todas', inboxCh='', composeMode='reply';
const CHB={WhatsApp:['wa','WA'],Email:['em','@'],Formulario:['fo','F'],'Meta Lead Ads':['ml','M']};
const chb=c=>`<span class="chb ${CHB[c][0]}" title="${c}">${CHB[c][1]}</span>`;
const emBadge=s=>({Enviada:'badge badge-ok',Programada:'badge badge-brand',Borrador:'badge'}[s]||'badge');
const tplBadge=s=>({Aprobada:'badge badge-ok','En revisión':'badge badge-warn',Rechazada:'badge badge-err'}[s]||'badge');
function vComms(tab){
  tab=CO_TABS.some(t=>t[0]===tab)?tab:'inbox';
  const x=X(), unread=x.convs.reduce((a,v)=>a+v.unread,0);
  const acts={inbox:'',email:`<button class="btn btn-primary" id="newem">${ic('plus')} Nueva campaña</button>`,whatsapp:`<button class="btn" id="newtpl">${ic('plus')} Nueva plantilla</button><button class="btn btn-primary" id="newwa">${ic('send')} Nueva difusión</button>`}[tab];
  const head=pageHead('Comunicaciones','Email, WhatsApp Business y una bandeja única para todas las conversaciones.',`${brandScope()}${acts}`)+subTabs('comunicaciones',CO_TABS.map(([k,l])=>[k,k==='inbox'&&unread?`${l} <span class="badge badge-brand" style="margin-left:4px">${unread}</span>`:l]),tab);
  if(!x.convs.length&&!x.emails.length) return head+emptyBlock('message','Conectá tus canales','Conectá WhatsApp Business y tu dominio de email para recibir y enviar mensajes desde Brandazo.',`<a class="btn btn-primary" href="#/app/integraciones">Ir a Integraciones</a>`);
  return head+{inbox:coInbox,email:coEmail,whatsapp:coWa}[tab]();
}
function coInbox(){
  const x=X(), me=S.user.name;
  const list=x.convs.filter(v=>(inboxF==='todas'?v.status!=='Resuelta':inboxF==='mias'?v.assigned===me&&v.status!=='Resuelta':inboxF==='sin'?!v.assigned&&v.status!=='Resuelta':v.status==='Resuelta')&&(!inboxCh||v.channel===inboxCh));
  if(!inboxSel&&innerWidth>767&&list.length){ inboxSel=list[0].id; list[0].unread=0; }
  const v=x.convs.find(z=>z.id===inboxSel), c=v?cById(v.contact):null;
  const inWin=v&&v.channel==='WhatsApp'?v.winH<24:true;
  return `<div class="inbox ${v?'has-sel':''}"><div class="ilist"><div class="f"><div class="seg" style="width:100%">${[['todas','Abiertas'],['mias','Mías'],['sin','Sin asignar'],['res','Resueltas']].map(([k,l])=>`<button data-if="${k}" aria-pressed="${inboxF===k}" style="flex:1;justify-content:center;padding:0 6px">${l}</button>`).join('')}</div>
   <select class="select sm" id="ich" aria-label="Canal"><option value="">Todos los canales</option>${Object.keys(CHB).map(k=>`<option ${k===inboxCh?'selected':''}>${k}</option>`).join('')}</select></div>
   <div class="items">${list.map(z=>{const cc=cById(z.contact),lm=z.msgs.filter(m=>m.from!=='sys').at(-1)||z.msgs.at(-1);return `<button class="citem" data-v="${z.id}" aria-current="${z.id===inboxSel}">${z.unread?'<span class="un" aria-label="Sin leer"></span>':'<span style="width:8px;flex:none"></span>'}<div class="tx"><b><span style="font-family:inherit;font-weight:600;font-size:13px;color:var(--ink);display:flex;gap:6px;align-items:center">${chb(z.channel)}${esc(cc.name)}</span><span>${z.last}</span></b><p>${lm.from==='note'?'Nota: ':lm.from==='out'?'Vos: ':''}${esc(lm.t)}</p>${z.assigned?'':'<p style="color:var(--warning)">Sin asignar</p>'}</div></button>`}).join('')||'<div class="empty"><p class="small muted">No hay conversaciones acá.</p></div>'}</div></div>
  ${v?`<div class="thread"><div class="thead"><button class="icon-btn" id="iback" aria-label="Volver a la lista" style="display:none">${ic('chev')}</button><span class="avatar sm">${initials(c.name)}</span><div style="flex:1;min-width:0"><b style="font-size:14px">${esc(c.name)}</b><div class="small muted" style="display:flex;gap:6px;align-items:center">${chb(v.channel)} ${v.channel}</div></div>
    <select class="select sm" id="iasg" aria-label="Responsable" style="width:auto"><option value="">Sin asignar</option>${OWNERS().map(o=>`<option ${o===v.assigned?'selected':''}>${esc(o)}</option>`).join('')}</select>
    <select class="select sm" id="ist" aria-label="Estado" style="width:auto">${['Abierta','Pendiente','Resuelta'].map(s=>`<option ${s===v.status?'selected':''}>${s}</option>`).join('')}</select></div>
   <div class="msgs" id="msgs">${v.msgs.map(m=>`<div class="msg ${m.from}">${m.from==='note'?`<b>Nota interna · ${esc(m.who)}</b><br>`:''}${esc(m.t)}${m.from!=='sys'?`<span class="mt">${m.at}${m.from==='out'?` · ${m.state||'Enviado'}`:''}</span>`:` · ${m.at}`}</div>`).join('')}</div>
   <div class="compose ${composeMode==='note'?'note-mode':''}"><div class="mode"><button data-mode="reply" aria-pressed="${composeMode==='reply'}">Responder</button><button data-mode="note" aria-pressed="${composeMode==='note'}">Nota interna</button></div>
    ${composeMode==='reply'&&!inWin?`<div class="win" style="background:var(--warning-soft);color:var(--warning);margin-bottom:8px">${ic('clock')}<span>Pasaron más de 24 h desde el último mensaje del cliente. Por política de Meta, solo podés escribir con una plantilla aprobada.</span></div><div class="row"><select class="select" id="itpl" style="flex:1">${x.waTemplates.filter(t=>t.status==='Aprobada').map(t=>`<option>${t.name}</option>`).join('')}</select><button class="btn btn-primary" id="isendt">${ic('send')} Enviar plantilla</button></div>`
    :`${v.channel==='WhatsApp'&&composeMode==='reply'?`<div class="win" style="background:var(--success-soft);color:var(--success);margin-bottom:8px">${ic('clock')}<span>Ventana de atención abierta: ${24-v.winH} h para responder libremente.</span></div>`:''}<div class="row"><textarea class="input" id="itx" rows="1" placeholder="${composeMode==='note'?'Solo la ve tu equipo…':'Escribí tu respuesta…'}" aria-label="Mensaje"></textarea><button class="btn btn-primary" id="isend" aria-label="Enviar">${ic('send')}</button></div>`}</div></div>
   <aside class="icard"><div><h4>Contacto</h4><b>${esc(c.name)}</b><div class="small muted">${esc(c.email)}<br>${esc(c.phone)||''}</div><div style="margin-top:8px"><span class="${typeBadge(c.type)}">${c.type}</span></div><button class="btn btn-sm" style="margin-top:12px" data-c="${c.id}">Abrir ficha en el CRM</button></div>
    <div><h4>Origen</h4><p class="small">${c.source}${c.campaign?`<br><span class="muted">${esc(campName(c.campaign))}</span>`:''}</p></div>
    <div><h4>Oportunidades</h4>${x.deals.filter(d=>d.contact===c.id).map(d=>`<div class="small" style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px"><span>${esc(d.name)}</span><span class="mono">${money(d.amount)}</span></div>`).join('')||`<button class="btn btn-sm btn-ghost" id="idl" style="padding:0">${ic('plus')} Crear oportunidad</button>`}</div>
    <div><h4>Etiquetas</h4><div class="pill-list">${v.tags.map(t=>`<span class="pill">${esc(t)}</span>`).join('')||'<span class="small muted">Sin etiquetas</span>'}</div></div>
    <div><h4>Consentimientos</h4><p class="small">${c.consent.email?'✓':'✕'} Email · ${c.consent.wa?'✓':'✕'} WhatsApp</p></div></aside>`
  :`<div class="thread"><div class="empty" style="margin:auto"><div class="eico">${ic('inbox')}</div><h3>Elegí una conversación</h3><p class="small muted">Acá ves los mensajes de WhatsApp, email, formularios y leads de Meta en un solo lugar.</p></div></div><aside class="icard"></aside>`}</div>`;
}
function coEmail(){
  const x=X(), es=x.emails.filter(inB), sent=es.filter(e=>e.status==='Enviada'), tot=k=>sent.reduce((a,e)=>a+e[k],0);
  return `<div class="stat-grid"><div class="stat"><div class="l">Enviados</div><div class="v">${num(tot('sent'))}</div><div class="d">${sent.length} campañas</div></div><div class="stat"><div class="l">Tasa de apertura</div><div class="v">${pct(tot('opens'),tot('sent')-tot('bounces'))}%</div></div><div class="stat"><div class="l">Tasa de clics</div><div class="v">${pct(tot('clicks'),tot('sent')-tot('bounces'))}%</div></div><div class="stat"><div class="l">Conversiones</div><div class="v">${num(tot('conv'))}</div><div class="d">${tot('unsubs')} bajas · ${tot('bounces')} rebotes</div></div></div>
  <div class="table-wrap"><table class="t"><thead><tr><th>Campaña</th><th>Estado</th><th class="hide-m">Audiencia</th><th class="num hide-m">Enviados</th><th class="num">Apertura</th><th class="num">Clics</th><th class="num hide-m">Bajas</th><th class="num hide-m">Conv.</th></tr></thead><tbody>
  ${es.map(e=>{const del=e.sent-e.bounces;return `<tr data-em="${e.id}" style="cursor:pointer"><td><b>${esc(e.name)}</b>${e.ab?' <span class="tagc">A/B</span>':''}<div class="small muted">${e.subject?esc(e.subject.replace('{{nombre}}','Carolina')):'Sin asunto'}</div></td><td><span class="${emBadge(e.status)}">${e.status}</span><div class="small muted mono">${e.date?fdate(e.date):''}</div></td><td class="hide-m small">${esc(e.audience)||'—'}</td><td class="num hide-m">${e.sent?num(e.sent):'—'}</td><td class="num">${e.sent?pct(e.opens,del)+'%':'—'}</td><td class="num">${e.sent?pct(e.clicks,del)+'%':'—'}</td><td class="num hide-m">${e.sent?e.unsubs:'—'}</td><td class="num hide-m">${e.sent?e.conv:'—'}</td></tr>`}).join('')}</tbody></table></div>
  <p class="small muted" style="margin-top:12px">Los envíos salen por un proveedor especializado para cuidar la entregabilidad. Cada email incluye el link de baja automáticamente.</p>`;
}
function coWa(){
  const x=X(), n=x.waNumber;
  if(!n) return emptyBlock('message','Conectá WhatsApp Business','Cada empresa conecta su propio número a través de la API oficial de Meta.',`<a class="btn btn-primary" href="#/app/integraciones">Conectar</a>`);
  return `<div class="grid g-dash" style="margin-bottom:16px"><section class="card span-4"><div class="card-head"><h3>Número conectado</h3><span class="badge badge-ok">${n.status}</span></div><div class="mono" style="font-size:20px">${n.number}</div><div class="small muted" style="margin-bottom:12px">${esc(n.name)}</div><dl class="kv"><dt>Calidad</dt><dd style="color:var(--success)">${n.quality}</dd><dt>Límite</dt><dd style="font-family:inherit">${n.limit}</dd></dl></section>
   <section class="card span-8"><div class="card-head"><h3>Difusiones</h3></div><div class="table-wrap" style="border:0"><table class="t"><thead><tr><th>Difusión</th><th>Estado</th><th class="num">Enviados</th><th class="num">Leídos</th><th class="num">Respuestas</th></tr></thead><tbody>${x.waCamps.map(w=>`<tr><td><b>${esc(w.name)}</b><div class="small muted">${w.template} · ${fdate(w.date)}</div></td><td><span class="${emBadge(w.status)}">${w.status}</span></td><td class="num">${w.sent?num(w.sent):'—'}</td><td class="num">${w.sent?pct(w.read,w.delivered)+'%':'—'}</td><td class="num">${w.sent?num(w.replies):'—'}</td></tr>`).join('')}</tbody></table></div><p class="small muted" style="margin-top:8px">Meta cobra cada conversación según su categoría y país. El costo se informa en tu cuenta de WhatsApp Business.</p></section></div>
  <div class="card-head"><h3>Plantillas de mensaje</h3><span class="small muted">Necesarias para escribir fuera de la ventana de 24 h</span></div>
  <div class="table-wrap"><table class="t"><thead><tr><th>Nombre</th><th>Categoría</th><th class="hide-m">Mensaje</th><th>Estado</th></tr></thead><tbody>${x.waTemplates.map(t=>`<tr><td class="mono small">${t.name}</td><td class="small">${t.cat}</td><td class="hide-m small muted" style="max-width:380px">${esc(t.body)}</td><td><span class="${tplBadge(t.status)}">${t.status}</span>${t.reason?`<div class="small muted" style="margin-top:4px">${esc(t.reason)}</div>`:''}</td></tr>`).join('')}</tbody></table></div>`;
}
function emailEditor(e){
  const x=X(), isNew=!e;
  e=e?JSON.parse(JSON.stringify(e)):{id:uid(),name:'',brand:(curBrand()||S.brands[0]).name,subject:'',preheader:'',status:'Borrador',audience:'',sent:0,date:'',opens:0,clicks:0,bounces:0,unsubs:0,conv:0,ab:false,subjectB:'',blocks:[{id:uid(),type:'title',v:''},{id:uid(),type:'text',v:''},{id:uid(),type:'button',v:'Ver más'}]};
  const ro=e.status==='Enviada';
  const auds=['Todos los contactos con consentimiento','Clientes de '+e.brand,'Leads abiertos','Compraron en los últimos 90 días','Inactivos hace más de 90 días'];
  const BL={title:'Título',text:'Texto',image:'Imagen',button:'Botón'};
  const pv=s=>esc(s||'').replace(/\{\{nombre\}\}/g,'Carolina');
  const mb=()=>e.blocks.map(b=>b.type==='title'?`<h2>${pv(b.v)||'Título'}</h2>`:b.type==='text'?`<p>${pv(b.v)||'<span style="color:#aaa">Texto del email</span>'}</p>`:b.type==='image'?`<div class="img">Imagen</div>`:`<span class="cta">${pv(b.v)||'Botón'}</span>`).join('');
  const html=()=>`<div class="dr-head"><span class="mark" style="background:var(--surface-sunken);color:var(--ink)">${ic('mail')}</span><div style="flex:1;min-width:0"><input class="input" id="en" value="${esc(e.name)}" placeholder="Nombre interno de la campaña" style="border:0;font-weight:600;font-size:16px;padding:0;height:28px;background:transparent" aria-label="Nombre" ${ro?'disabled':''}><div class="small muted"><span class="${emBadge(e.status)}">${e.status}</span> ${esc(e.brand)}</div></div><button class="icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div>
  <div class="eb"><div class="main">${ro?`<div class="stat-grid" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><div class="l">Apertura</div><div class="v">${pct(e.opens,e.sent-e.bounces)}%</div><div class="d">${num(e.opens)} personas</div></div><div class="stat"><div class="l">Clics</div><div class="v">${pct(e.clicks,e.sent-e.bounces)}%</div><div class="d">${num(e.clicks)} personas</div></div><div class="stat"><div class="l">Conversiones</div><div class="v">${e.conv}</div><div class="d">${e.unsubs} bajas</div></div></div><div class="alert alert-info" style="margin-bottom:16px">${ic('info')}<div>Esta campaña ya se envió. Podés duplicarla para reutilizar el diseño.</div></div>`:''}
   <div class="field"><label for="es">Asunto</label><input class="input" id="es" value="${esc(e.subject)}" placeholder="Ej.: {{nombre}}, tenemos novedades" ${ro?'disabled':''}><span class="hint">Usá {{nombre}} para personalizar con datos del CRM.</span><span class="err">${ic('alert')}El asunto es obligatorio.</span></div>
   <label class="switch" style="margin-bottom:12px"><input type="checkbox" id="eab" ${e.ab?'checked':''} ${ro?'disabled':''}> <span class="small">Prueba A/B del asunto</span></label>
   ${e.ab?`<div class="field"><label for="esb">Asunto B</label><input class="input" id="esb" value="${esc(e.subjectB||'')}" placeholder="Variante para el 20% de la audiencia" ${ro?'disabled':''}><span class="hint">Enviamos A y B al 20% y el ganador por aperturas al resto, 4 h después.</span></div>`:''}
   <div class="field"><label for="ep">Preheader</label><input class="input" id="ep" value="${esc(e.preheader)}" placeholder="Texto que aparece junto al asunto" ${ro?'disabled':''}></div>
   <div class="field"><label for="ea">Audiencia</label><select class="select" id="ea" ${ro?'disabled':''}><option value="">Elegí un segmento</option>${auds.concat(e.audience&&!auds.includes(e.audience)?[e.audience]:[]).map(a=>`<option ${a===e.audience?'selected':''}>${esc(a)}</option>`).join('')}</select><span class="err">${ic('alert')}Elegí a quién se envía.</span></div>
   <span class="label" style="display:block;margin:8px 0">Contenido</span>
   ${e.blocks.map((b,i)=>`<div class="eblock"><div class="bh">${BL[b.type]}<span class="grow"></span>${ro?'':`<button class="icon-btn" data-up="${i}" aria-label="Subir" ${i===0?'disabled':''}>${ic('chev')}</button><button class="icon-btn" data-del="${i}" aria-label="Eliminar bloque">${ic('trash')}</button>`}</div>${b.type==='image'?`<div class="small muted">Imagen de la biblioteca de marca</div>`:b.type==='text'?`<textarea class="input" data-bv="${i}" rows="3" style="height:auto;padding:8px 12px" ${ro?'disabled':''}>${esc(b.v)}</textarea>`:`<input class="input" data-bv="${i}" value="${esc(b.v)}" ${ro?'disabled':''}>`}</div>`).join('')}
   ${ro?'':`<div style="display:flex;gap:6px;flex-wrap:wrap">${Object.entries(BL).map(([k,l])=>`<button class="chipf" data-addb="${k}">${ic('plus')} ${l}</button>`).join('')}</div>`}</div>
   <div class="prev"><span class="small muted">Vista previa · con datos de Carolina Ruiz</span><div class="mail"><div class="mh"><b>${pv(e.subject)||'Sin asunto'}</b>${pv(e.preheader)}</div><div class="mb">${mb()}</div><div class="ft">${esc(e.brand)} · Recibís este email porque aceptaste comunicaciones. <u>Darte de baja</u></div></div></div></div>
  <div class="dr-foot"><div>${ro?`<button class="btn btn-sm" id="edup">${ic('copy')} Duplicar</button>`:`<button class="btn btn-sm" id="etest">Enviarme una prueba</button>`}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${ro?'':`<button class="btn" id="esave">Guardar borrador</button><button class="btn" id="esch">${ic('clock')} Programar</button><button class="btn btn-primary" id="esend">${ic('send')} Enviar ahora</button>`}</div></div>`;
  const draw=()=>{ drawerWide(html()); bind(); };
  const sync=()=>{ if(ro) return; e.name=$('#en').value; e.subject=$('#es').value; e.preheader=$('#ep').value; e.audience=$('#ea').value; if($('#esb')) e.subjectB=$('#esb').value; $$('[data-bv]').forEach(i=>e.blocks[+i.dataset.bv].v=i.value); };
  const valid=()=>{ sync(); let ok=true; [['#es',!e.subject.trim()],['#ea',!e.audience]].forEach(([s,bad])=>{ $(s).closest('.field').classList.toggle('has-error',bad); if(bad) ok=false; }); return ok; };
  const save=(status,date)=>{ e.status=status; if(date) e.date=date; if(!e.name.trim()) e.name=e.subject||'Campaña sin nombre'; const i=x.emails.findIndex(z=>z.id===e.id); if(i>=0) x.emails[i]=e; else x.emails.unshift(e); closeLayer(); render(); };
  function bind(){
    $$('#layer [data-close]').forEach(b=>b.onclick=closeLayer);
    if(ro){ $('#edup').onclick=()=>{ const c=JSON.parse(JSON.stringify(e)); c.id=uid(); c.name=e.name+' (copia)'; c.status='Borrador'; c.sent=c.opens=c.clicks=c.bounces=c.unsubs=c.conv=0; c.date=''; x.emails.unshift(c); emailEditor(c); toast('Campaña duplicada'); }; return; }
    ['#es','#ep','#en'].forEach(s=>$(s).addEventListener('input',()=>{ sync(); $('#layer .mail .mh').innerHTML=`<b>${pv(e.subject)||'Sin asunto'}</b>${pv(e.preheader)}`; }));
    $$('[data-bv]').forEach(i=>i.addEventListener('input',()=>{ sync(); $('#layer .mail .mb').innerHTML=mb(); }));
    $('#eab').onchange=ev=>{ sync(); e.ab=ev.target.checked; draw(); };
    $('#ea').onchange=sync;
    $$('[data-addb]').forEach(b=>b.onclick=()=>{ sync(); e.blocks.push({id:uid(),type:b.dataset.addb,v:''}); draw(); });
    $$('[data-del]').forEach(b=>b.onclick=()=>{ sync(); e.blocks.splice(+b.dataset.del,1); draw(); });
    $$('[data-up]').forEach(b=>b.onclick=()=>{ sync(); const i=+b.dataset.up; [e.blocks[i-1],e.blocks[i]]=[e.blocks[i],e.blocks[i-1]]; draw(); });
    $('#etest').onclick=()=>toast(`Enviamos una prueba a ${S.user.email}`);
    $('#esave').onclick=()=>{ sync(); save('Borrador'); toast('Borrador guardado'); };
    $('#esch').onclick=()=>{ if(!valid()) return toast('Completá el asunto y la audiencia'); sync(); const snap=JSON.parse(JSON.stringify(e)); modal('Programar envío',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="field"><label for="sd">Fecha</label><input class="input" type="date" id="sd" value="${iso(addDays(NOW,2))}" min="${iso(NOW)}"></div><div class="field"><label for="sh">Hora</label><input class="input" type="time" id="sh" value="10:00"></div></div><p class="small muted">Hora de Argentina (UTC−3).</p>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="mok">Programar</button>`);
      $('#mok').onclick=()=>{ Object.assign(e,snap); const d=$('#sd').value; const i=x.emails.findIndex(z=>z.id===e.id); e.status='Programada'; e.date=d; if(i>=0) x.emails[i]=e; else x.emails.unshift(e); closeLayer(); render(); toast(`Programada para el ${fdate(d)} a las ${$('#sh')?$('#sh').value:'10:00'}`); }; };
    $('#esend').onclick=()=>{ if(!valid()) return toast('Completá el asunto y la audiencia'); sync(); const snap=JSON.parse(JSON.stringify(e)); const n=x.contacts.filter(c=>c.consent.email).length;
      modal('¿Enviar ahora?',`<p>Se envía <b>${esc(e.subject.replace('{{nombre}}','…'))}</b> a <b>${esc(e.audience)}</b>.</p><p class="small muted" style="margin-top:8px">Solo a contactos con consentimiento de email (${n} en el CRM de ejemplo). Los que se dieron de baja se excluyen solos.</p>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="mok">Enviar</button>`);
      $('#mok').onclick=()=>{ Object.assign(e,snap); e.status='Enviada'; e.date=iso(NOW); e.sent=n; const i=x.emails.findIndex(z=>z.id===e.id); if(i>=0) x.emails[i]=e; else x.emails.unshift(e); logAct(`Enviaste la campaña ${e.name||e.subject}`); closeLayer(); render(); toast('Campaña enviada. Las métricas se actualizan en unos minutos.'); }; };
  }
  draw();
}
function bComms(tab){
  bindDemo(); const x=X(); const on=(s,f)=>{const e=$(s);if(e)e.onclick=f};
  $$('[data-if]').forEach(b=>b.onclick=()=>{inboxF=b.dataset.if;render()});
  const ich=$('#ich'); if(ich) ich.onchange=()=>{inboxCh=ich.value;render()};
  $$('[data-v]').forEach(b=>b.onclick=()=>{ inboxSel=b.dataset.v; const v=x.convs.find(z=>z.id===inboxSel); v.unread=0; render(); });
  const v=x.convs.find(z=>z.id===inboxSel);
  if(v&&tab!=='email'&&tab!=='whatsapp'){
    const ms=$('#msgs'); if(ms) ms.scrollTop=ms.scrollHeight;
    if(matchMedia('(max-width:767px)').matches) $('#iback').style.display='grid';
    on('#iback',()=>{ inboxSel=null; render(); });
    $('#iasg').onchange=e=>{ v.assigned=e.target.value; v.msgs.push({from:'sys',t:e.target.value?`${S.user.name} asignó la conversación a ${e.target.value}`:'Conversación sin asignar',at:'Recién'}); render(); toast(e.target.value?`Asignada a ${e.target.value}`:'Sin asignar'); };
    $('#ist').onchange=e=>{ v.status=e.target.value; render(); toast(`Conversación ${e.target.value.toLowerCase()}`); };
    $$('[data-mode]').forEach(b=>b.onclick=()=>{ composeMode=b.dataset.mode; render(); setTimeout(()=>$('#itx')?.focus(),0); });
    const send=()=>{ const t=$('#itx').value.trim(); if(!t) return; if(composeMode==='note') v.msgs.push({from:'note',t,at:'Recién',who:S.user.name}); else { v.msgs.push({from:'out',t,at:'Recién',who:S.user.name,state:'Enviado'}); if(!v.assigned) v.assigned=S.user.name; } v.last='Recién'; render(); };
    on('#isend',send); const tx=$('#itx'); if(tx) tx.onkeydown=e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } };
    on('#isendt',()=>{ const t=x.waTemplates.find(z=>z.name===$('#itpl').value); v.msgs.push({from:'out',t:t.body.replace('{{1}}',cById(v.contact).name.split(' ')[0]).replace('{{2}}','#1291'),at:'Recién',who:S.user.name,state:'Enviado'}); v.last='Recién'; render(); toast('Plantilla enviada. Si el cliente responde, se abre una nueva ventana de 24 h.'); });
    on('#idl',()=>dealForm({contact:v.contact}));
  }
  $$('[data-c]').forEach(el=>el.onclick=()=>contactDrawer(el.dataset.c));
  on('#newem',()=>emailEditor());
  $$('[data-em]').forEach(r=>r.onclick=()=>emailEditor(x.emails.find(z=>z.id===r.dataset.em)));
  on('#newtpl',()=>{ modal('Nueva plantilla de WhatsApp',`<div class="field"><label for="tn">Nombre</label><input class="input" id="tn" placeholder="ej.: recordatorio_turno"><span class="hint">En minúsculas y con guiones bajos, como pide Meta.</span><span class="err">${ic('alert')}Usá solo minúsculas, números y guiones bajos.</span></div><div class="field"><label for="tcat">Categoría</label><select class="select" id="tcat"><option>Marketing</option><option>Utilidad</option><option>Autenticación</option></select></div><div class="field"><label for="tb">Mensaje</label><textarea class="input" id="tb" rows="4" style="height:auto;padding:10px 12px" placeholder="Hola {{1}}, …"></textarea><span class="hint">{{1}}, {{2}}… se reemplazan con datos del contacto.</span><span class="err">${ic('alert')}Escribí el mensaje.</span></div><div class="alert alert-info">${ic('info')}<div>Meta revisa cada plantilla antes de que puedas usarla. Suele tardar minutos, a veces hasta 24 h.</div></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="mok">Enviar a revisión</button>`);
    $('#mok').onclick=()=>{ const n=$('#tn').value.trim(), b=$('#tb').value.trim(), okN=/^[a-z0-9_]+$/.test(n); $('#tn').closest('.field').classList.toggle('has-error',!okN); $('#tb').closest('.field').classList.toggle('has-error',!b); if(!okN||!b) return; x.waTemplates.unshift({name:n,cat:$('#tcat').value,lang:'Español (AR)',status:'En revisión',body:b}); closeLayer(); render(); toast('Plantilla enviada a revisión de Meta'); }; });
  on('#newwa',()=>{ const ok=x.waTemplates.filter(t=>t.status==='Aprobada'&&t.cat==='Marketing'), n=x.contacts.filter(c=>c.consent.wa).length;
    modal('Nueva difusión de WhatsApp',`<div class="field"><label for="wn">Nombre</label><input class="input" id="wn"><span class="err">${ic('alert')}Ingresá un nombre.</span></div><div class="field"><label for="wt">Plantilla aprobada</label><select class="select" id="wt">${ok.map(t=>`<option>${t.name}</option>`).join('')}</select></div><div class="field"><label for="wa">Audiencia</label><select class="select" id="wa"><option>Clientes con consentimiento de WhatsApp</option><option>Leads con consentimiento de WhatsApp</option></select><span class="hint">${n} contactos aceptaron recibir WhatsApp. El resto se excluye.</span></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="mok">Programar</button>`);
    $('#mok').onclick=()=>{ const nm=$('#wn').value.trim(); if(!nm) return $('#wn').closest('.field').classList.add('has-error'); x.waCamps.unshift({name:nm,template:$('#wt').value,audience:$('#wa').value,sent:0,delivered:0,read:0,replies:0,status:'Programada',date:iso(addDays(NOW,1))}); closeLayer(); render(); toast('Difusión programada para mañana'); }; });
}

/* =====================================================================
   10 · MÉTRICAS
   ===================================================================== */
const ME_TABS=[['general','General'],['marketing','Marketing y redes'],['comercial','Comercial'],['atribucion','Atribución'],['reportes','Reportes']];
let meRange=30, attrModel='ultima';
const delta=(a,b)=>{ const d=b?Math.round((a-b)/b*100):0; return `<div class="d ${d>=0?'up':'down'}">${d>=0?'▲':'▼'} ${Math.abs(d)}% vs. período anterior</div>`; };
function metricsData(){
  const m=M(), x=X(), f=meRange/30;
  const camps=m.campaigns.filter(inB), reach=camps.reduce((a,c)=>a+c.m.reach,0)*f, clicks=camps.reduce((a,c)=>a+c.m.clicks,0)*f, inv=camps.reduce((a,c)=>a+c.spent,0)*f;
  const leads=Math.round(x.contacts.filter(inB).filter(c=>c.type==='Lead'||c.source!=='Importación').length*14*f);
  const deals=x.deals.filter(inB), won=deals.filter(d=>d.stage==='Ganado');
  const orders=x.orders.filter(inB).filter(o=>o.payStatus==='Aprobado'), sales=orders.reduce((a,o)=>a+o.amount,0)*f*6+won.reduce((a,d)=>a+d.amount,0)*f;
  const opps=Math.round(deals.length*f*1.6), salesN=Math.round((orders.length*6+won.length)*f);
  return {camps,reach,clicks,inv,leads,opps,salesN,sales,pub:m.contents.filter(c=>inB(c)&&c.status==='Publicado').length,plan:m.contents.filter(inB).length};
}
function vMetricas(tab){
  tab=ME_TABS.some(t=>t[0]===tab)?tab:'general';
  const x=X();
  const head=pageHead('Métricas','Resultados de marketing, comunicación y ventas en un solo tablero.',`${brandScope()}<div class="seg">${[7,30,90].map(r=>`<button data-mr="${r}" aria-pressed="${meRange===r}">${r} días</button>`).join('')}</div><button class="btn" id="mexp">${ic('download')} Exportar</button>`)+subTabs('metricas',ME_TABS,tab);
  if(!x.contacts.length&&!M().campaigns.length) return head+emptyBlock('chart','Todavía no hay datos','Las métricas aparecen cuando conectás redes, cargás campañas o empezás a usar el CRM.','');
  return head+{general:meGeneral,marketing:meMarketing,comercial:meComercial,atribucion:meAttr,reportes:meReports}[tab]();
}
const lblDays=(n)=>(_,i)=>i%Math.ceil(n/6)===0?fdate(iso(addDays(NOW,i-n+1))):'';
function meGeneral(){
  const k=metricsData(), n=meRange;
  const s=series(n,k.sales/n*.85,0.008,.5,11), sp=series(n,k.sales/n*.8,0.004,.5,12);
  const fun=[['Alcance',k.reach],['Clics',k.clicks],['Leads',k.leads],['Oportunidades',k.opps],['Ventas',k.salesN]];
  return `<div class="stat-grid"><div class="stat"><div class="l">Ventas</div><div class="v">${money(k.sales)}</div>${delta(k.sales,k.sales*.86)}</div><div class="stat"><div class="l">Leads</div><div class="v">${num(k.leads)}</div>${delta(k.leads,k.leads*.92)}</div><div class="stat"><div class="l">Inversión en anuncios</div><div class="v">${money(k.inv)}</div><div class="d">${k.camps.length} campañas</div></div><div class="stat"><div class="l">ROAS <span class="est" title="Ventas atribuidas ÷ inversión. Atribución por UTM y última interacción.">estimado</span></div><div class="v">${k.inv?(k.sales*.45/k.inv).toFixed(1).replace('.',','):'—'}x</div><div class="d">Sobre ventas atribuidas</div></div></div>
  <div class="grid g-dash"><section class="card span-8"><div class="card-head"><h3>Ventas diarias</h3><span class="lg"><span><i style="background:var(--magenta)"></i>Período actual</span><span>┄ Período anterior</span></span></div>${lineChart(s,{compare:sp,fmt:v=>'$'+num(v/1000)+'k',labels:s.map(lblDays(n))})}</section>
   <section class="card span-4"><div class="card-head"><h3>Embudo</h3></div><div class="funnel">${fun.map(([l,v],i)=>`<div class="st"><span>${l}</span><div class="b"><i style="width:${Math.max(3,Math.round(Math.pow(v/fun[0][1],.28)*100))}%"></i></div><span class="v">${num(v)}</span></div>${i<fun.length-1?`<div class="rate">↓ ${(fun[i+1][1]/v*100).toFixed(1).replace('.',',')}%</div>`:''}`).join('')}</div><p class="small muted" style="margin-top:12px">La barra usa escala comprimida para que se vean todas las etapas.</p></section>
   <section class="card span-6"><div class="card-head"><h3>Contenidos</h3><a class="btn btn-sm btn-ghost" href="#/app/contenidos/lista">Ver</a></div><div class="hbar"><span>Publicados</span><div class="b"><i style="width:${pct(k.pub,k.plan)}%;background:var(--magenta)"></i></div><span class="v">${k.pub} de ${k.plan}</span></div><p class="small muted">Planificados vs. publicados en el período.</p></section>
   <section class="card span-6"><div class="card-head"><h3>Clientes</h3><a class="btn btn-sm btn-ghost" href="#/app/crm/contactos">Ver</a></div><div class="hbar"><span>Nuevos</span><div class="b"><i style="width:62%;background:var(--magenta)"></i></div><span class="v">${Math.round(k.salesN*.62)}</span></div><div class="hbar"><span>Recurrentes</span><div class="b"><i style="width:38%;background:#A68BFF"></i></div><span class="v">${Math.round(k.salesN*.38)}</span></div></section></div>`;
}
function meMarketing(){
  const k=metricsData(), m=M();
  const byCh={}; m.contents.filter(c=>inB(c)&&c.metrics).forEach(c=>{ const z=byCh[c.channel]||(byCh[c.channel]={reach:0,int:0,n:0}); z.reach+=c.metrics.reach; z.int+=c.metrics.likes+c.metrics.comments+c.metrics.saves; z.n++; });
  const byF={}; m.contents.filter(c=>inB(c)&&c.metrics).forEach(c=>{ const z=byF[c.format]||(byF[c.format]={reach:0,n:0}); z.reach+=c.metrics.reach; z.n++; });
  const mx=Math.max(...Object.values(byCh).map(z=>z.reach),1), mf=Math.max(...Object.values(byF).map(z=>z.reach/z.n),1);
  return `<div class="stat-grid"><div class="stat"><div class="l">Alcance</div><div class="v">${num(k.reach)}</div>${delta(k.reach,k.reach*.9)}</div><div class="stat"><div class="l">Clics</div><div class="v">${num(k.clicks)}</div><div class="d">CTR ${(k.clicks/Math.max(1,k.reach)*100).toFixed(2).replace('.',',')}%</div></div><div class="stat"><div class="l">CPC</div><div class="v">${money(k.inv/Math.max(1,k.clicks))}</div></div><div class="stat"><div class="l">CPM</div><div class="v">${money(k.inv/Math.max(1,k.reach)*1000)}</div></div></div>
  <div class="grid g-dash"><section class="card span-6"><div class="card-head"><h3>Alcance por canal</h3></div>${Object.entries(byCh).sort((a,b)=>b[1].reach-a[1].reach).map(([c,z])=>`<div class="hbar"><span>${c}</span><div class="b"><i style="width:${pct(z.reach,mx)}%;background:var(--magenta)"></i></div><span class="v">${num(z.reach)}</span></div>`).join('')}</section>
   <section class="card span-6"><div class="card-head"><h3>Alcance promedio por formato</h3></div>${Object.entries(byF).sort((a,b)=>b[1].reach/b[1].n-a[1].reach/a[1].n).map(([f,z])=>`<div class="hbar"><span>${f}</span><div class="b"><i style="width:${pct(z.reach/z.n,mf)}%;background:#A68BFF"></i></div><span class="v">${num(z.reach/z.n)}</span></div>`).join('')}<p class="small muted" style="margin-top:8px">Sobre ${Object.values(byF).reduce((a,z)=>a+z.n,0)} publicaciones con métricas.</p></section>
   <section class="span-12"><div class="card-head" style="margin:8px 0 12px"><h3>Campañas</h3><a class="btn btn-sm btn-ghost" href="#/app/campanas">Ver todas</a></div><div class="table-wrap"><table class="t"><thead><tr><th>Campaña</th><th class="num">Inversión</th><th class="num hide-m">Alcance</th><th class="num">Clics</th><th class="num hide-m">CPC</th><th class="num">Conv.</th><th class="num hide-m">CPA</th></tr></thead><tbody>${k.camps.map(c=>`<tr><td><b>${esc(c.name)}</b><div class="small muted">${c.status}</div></td><td class="num">${c.spent?money(c.spent):'—'}</td><td class="num hide-m">${num(c.m.reach)}</td><td class="num">${num(c.m.clicks)}</td><td class="num hide-m">${c.m.clicks&&c.spent?money(c.spent/c.m.clicks):'—'}</td><td class="num">${c.m.conv||'—'}</td><td class="num hide-m">${c.m.conv&&c.spent?money(c.spent/c.m.conv):'—'}</td></tr>`).join('')}</tbody></table></div></section></div>`;
}
function meComercial(){
  const x=X(), ds=x.deals.filter(inB), open=ds.filter(d=>!['Ganado','Perdido'].includes(d.stage)), won=ds.filter(d=>d.stage==='Ganado'), lost=ds.filter(d=>d.stage==='Perdido');
  const ls=x.contacts.filter(inB);
  const bySrc=SOURCES.map(s=>[s,ls.filter(c=>c.source===s).length]).filter(z=>z[1]).sort((a,b)=>b[1]-a[1]), mx=Math.max(...bySrc.map(z=>z[1]),1);
  const orders=x.orders.filter(inB).filter(o=>o.payStatus==='Aprobado');
  const reasons=LOSS.map(r=>[r,lost.filter(d=>d.lossReason===r).length]).filter(z=>z[1]);
  return `<div class="stat-grid"><div class="stat"><div class="l">Valor del pipeline</div><div class="v">${money(open.reduce((a,d)=>a+d.amount,0))}</div><div class="d">${open.length} abiertas</div></div><div class="stat"><div class="l">Tasa de conversión</div><div class="v">${pct(won.length,won.length+lost.length)}%</div><div class="d">ganadas sobre cerradas</div></div><div class="stat"><div class="l">Ticket promedio</div><div class="v">${orders.length?money(orders.reduce((a,o)=>a+o.amount,0)/orders.length):'—'}</div><div class="d">${orders.length?'tienda online':'sin pedidos en esta marca'}</div></div><div class="stat"><div class="l">Ventas cerradas</div><div class="v">${money(won.reduce((a,d)=>a+d.amount,0))}</div><div class="d">${won.length} oportunidades</div></div></div>
  <div class="grid g-dash"><section class="card span-6"><div class="card-head"><h3>Contactos por canal de origen</h3></div>${bySrc.map(([s,n])=>`<div class="hbar"><span>${s}</span><div class="b"><i style="width:${pct(n,mx)}%;background:var(--magenta)"></i></div><span class="v">${n}</span></div>`).join('')}</section>
   <section class="card span-6"><div class="card-head"><h3>Pipeline por etapa</h3></div>${STAGES.slice(0,4).map(([s])=>{const v=open.filter(d=>d.stage===s).reduce((a,d)=>a+d.amount,0);return `<div class="hbar"><span>${s}</span><div class="b"><i style="width:${pct(v,Math.max(1,open.reduce((a,d)=>a+d.amount,0)))}%;background:#A68BFF"></i></div><span class="v">${money(v)}</span></div>`}).join('')}</section>
   <section class="card span-6"><div class="card-head"><h3>Motivos de pérdida</h3></div>${reasons.length?reasons.map(([r,n])=>`<div class="hbar"><span>${r}</span><div class="b"><i style="width:${pct(n,lost.length)}%;background:var(--danger)"></i></div><span class="v">${n}</span></div>`).join(''):'<p class="small muted">Sin oportunidades perdidas en el período.</p>'}</section>
   <section class="card span-6"><div class="card-head"><h3>Rendimiento por responsable</h3></div><div class="table-wrap" style="border:0"><table class="t"><thead><tr><th>Responsable</th><th class="num">Abiertas</th><th class="num">Ganado</th></tr></thead><tbody>${[...new Set(ds.map(d=>d.owner))].map(o=>`<tr><td>${esc(o)}</td><td class="num">${open.filter(d=>d.owner===o).length}</td><td class="num">${money(won.filter(d=>d.owner===o).reduce((a,d)=>a+d.amount,0))}</td></tr>`).join('')}</tbody></table></div></section></div>`;
}
function meAttr(){
  const m=M(), x=X(), camps=m.campaigns.filter(inB);
  const w={ultima:[1,.6,.3],primera:[.5,.9,.7],lineal:[.75,.75,.6]}[attrModel];
  const rows=camps.map((c,i)=>{ const proven=x.orders.filter(o=>o.campaign===c.id&&o.attribution==='comprobada'&&o.payStatus==='Aprobado').reduce((a,o)=>a+o.amount,0)*6; const est=Math.round(c.m.revenue*w[i%3]); const cs=x.contacts.filter(z=>z.campaign===c.id).map(z=>z.id), pipe=x.deals.filter(d=>cs.includes(d.contact)&&d.stage!=='Perdido').reduce((a,d)=>a+d.amount,0); return {c,proven,est,pipe,leads:cs.length}; });
  const tp=rows.reduce((a,r)=>a+r.proven,0), te=rows.reduce((a,r)=>a+r.est,0), tpi=rows.reduce((a,r)=>a+r.pipe,0);
  return `<div class="alert alert-info" style="margin-bottom:16px">${ic('info')}<div><b>Comprobado</b> son ventas con UTM o ID de campaña que las une al pedido. <b>Estimado</b> reparte el resto según el modelo elegido. No siempre se puede saber con certeza qué publicación originó una venta.</div></div>
  <div class="toolbar"><span class="small">Modelo de atribución</span><div class="seg">${[['ultima','Última interacción'],['primera','Primera interacción'],['lineal','Lineal']].map(([k,l])=>`<button data-am="${k}" aria-pressed="${attrModel===k}">${l}</button>`).join('')}</div></div>
  <div class="stat-grid"><div class="stat"><div class="l">Ventas comprobadas</div><div class="v">${money(tp)}</div><div class="d">UTM e IDs de campaña</div></div><div class="stat"><div class="l">Ventas estimadas <span class="est">estimado</span></div><div class="v">${money(te)}</div><div class="d">según el modelo</div></div><div class="stat"><div class="l">Pipeline generado</div><div class="v">${money(tpi)}</div><div class="d">oportunidades de leads de campañas</div></div><div class="stat"><div class="l">Pedidos sin atribuir</div><div class="v">${pct(X().orders.filter(o=>!o.campaign).length,X().orders.length)}%</div><div class="d">de los pedidos</div></div></div>
  <div class="table-wrap"><table class="t"><thead><tr><th>Campaña</th><th class="num">Leads</th><th class="num hide-m">Pipeline</th><th class="num">Comprobado</th><th class="num">Estimado</th><th class="hide-m" style="min-width:200px">Composición</th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td><b>${esc(r.c.name)}</b><div class="small muted">${r.c.channels.join(', ')}</div></td><td class="num">${r.leads}</td><td class="num hide-m">${r.pipe?money(r.pipe):'—'}</td><td class="num">${r.proven?money(r.proven):'—'}</td><td class="num">${r.est?money(r.est):'—'}</td><td class="hide-m">${r.proven+r.est?`<div class="hbar" style="grid-template-columns:1fr;padding:0"><div class="b"><i style="width:${pct(r.proven,Math.max(1,r.proven+r.est))}%;background:var(--success)"></i><i style="width:${pct(r.est,Math.max(1,r.proven+r.est))}%;background:var(--line-strong)"></i></div></div>`:'<span class="small muted">Sin ventas en el período</span>'}</td></tr>`).join('')}</tbody></table></div>
  <div class="lg" style="margin-top:10px"><span><i style="background:var(--success)"></i>Comprobado</span><span><i style="background:var(--line-strong)"></i>Estimado</span></div>`;
}
function meReports(){
  const x=X();
  return `<div class="card-head"><h3>Reportes automáticos</h3><button class="btn btn-primary btn-sm" id="newrep">${ic('plus')} Nuevo reporte</button></div>
  <div class="table-wrap" style="margin-bottom:24px"><table class="t"><thead><tr><th>Reporte</th><th>Frecuencia</th><th class="hide-m">Destinatarios</th><th class="hide-m">Próximo envío</th><th></th></tr></thead><tbody>${x.reports.map(r=>`<tr><td><b>${esc(r.name)}</b><div class="small muted">${r.format}</div></td><td class="small">${r.freq}</td><td class="hide-m small">${esc(r.to)}</td><td class="hide-m small mono">${fdate(r.next)}</td><td style="text-align:right"><button class="btn btn-sm" data-rnow="${r.id}">Enviar ahora</button> <button class="icon-btn" data-rdel="${r.id}" aria-label="Eliminar">${ic('trash')}</button></td></tr>`).join('')||'<tr><td colspan="5"><div class="empty"><p class="small muted">Sin reportes programados.</p></div></td></tr>'}</tbody></table></div>
  <div class="card-head"><h3>Exportaciones rápidas</h3></div><div class="cards">${[['Contactos y leads','users','contactos'],['Pipeline de ventas','kanban','pipeline'],['Pedidos y pagos','cart','pedidos'],['Resultados de campañas','megaphone','campanas']].map(([l,i,k])=>`<button class="card" data-ex="${k}" style="font:inherit;color:inherit;text-align:left;cursor:pointer;display:flex;gap:12px;align-items:center"><span class="mark" style="background:var(--surface-sunken);color:var(--ink)">${ic(i)}</span><span style="flex:1"><b>${l}</b><div class="small muted">CSV · ${meRange} días</div></span>${ic('download')}</button>`).join('')}</div>`;
}
function bMetricas(tab){
  bindDemo(); const x=X(), m=M(); const on=(s,f)=>{const e=$(s);if(e)e.onclick=f};
  $$('[data-mr]').forEach(b=>b.onclick=()=>{meRange=+b.dataset.mr;render()});
  $$('[data-am]').forEach(b=>b.onclick=()=>{attrModel=b.dataset.am;render()});
  const ex={contactos:()=>downloadCsv('contactos.csv',[['Nombre','Email','Tipo','Origen','Campaña']].concat(x.contacts.map(c=>[c.name,c.email,c.type,c.source,campName(c.campaign)]))),
   pipeline:()=>downloadCsv('pipeline.csv',[['Oportunidad','Contacto','Etapa','Importe','Cierre','Responsable']].concat(x.deals.map(d=>[d.name,cName(d.contact),d.stage,d.amount,d.close,d.owner]))),
   pedidos:()=>downloadCsv('pedidos.csv',[['Pedido','Cliente','Origen','Pago','Estado','Importe','Fecha']].concat(x.orders.map(o=>[o.id,cName(o.contact),o.source,o.payStatus,o.status,o.amount,o.date]))),
   campanas:()=>downloadCsv('campanas.csv',[['Campaña','Estado','Inversión','Alcance','Clics','Conversiones']].concat(m.campaigns.map(c=>[c.name,c.status,c.spent,c.m.reach,c.m.clicks,c.m.conv])))};
  on('#mexp',()=>ex[tab==='comercial'?'pipeline':tab==='atribucion'||tab==='marketing'?'campanas':'pedidos']());
  $$('[data-ex]').forEach(b=>b.onclick=()=>ex[b.dataset.ex]());
  $$('[data-rnow]').forEach(b=>b.onclick=()=>{ b.classList.add('is-loading'); setTimeout(()=>{ b.classList.remove('is-loading'); toast('Reporte enviado por email'); },700); });
  $$('[data-rdel]').forEach(b=>b.onclick=()=>{ const i=x.reports.findIndex(r=>r.id===b.dataset.rdel), r=x.reports[i]; x.reports.splice(i,1); render(); toast('Reporte eliminado',()=>{ x.reports.splice(i,0,r); render(); }); });
  on('#newrep',()=>{ modal('Nuevo reporte automático',`<div class="field"><label for="rn">Nombre</label><input class="input" id="rn" placeholder="Ej.: Resultados mensuales"><span class="err">${ic('alert')}Ingresá un nombre.</span></div>
   <div class="field"><span class="label">Incluye</span>${['Resumen general','Marketing y redes','Comercial','Atribución'].map((l,i)=>`<label class="check" style="margin-bottom:6px"><input type="checkbox" ${i<2?'checked':''}> <span>${l}</span></label>`).join('')}</div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="field"><label for="rf">Frecuencia</label><select class="select" id="rf"><option>Semanal · lunes 9:00</option><option>Mensual · día 1</option><option>Trimestral</option></select></div><div class="field"><label for="rfo">Formato</label><select class="select" id="rfo"><option>PDF</option><option>CSV</option></select></div></div>
   <div class="field"><label for="rt">Enviar a</label><input class="input" id="rt" value="${esc(S.user.email)}"><span class="hint">Separá los emails con comas.</span><span class="err">${ic('alert')}Revisá los emails.</span></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="mok">Crear reporte</button>`);
   $('#mok').onclick=()=>{ const n=$('#rn').value.trim(), t=$('#rt').value.trim(), okT=t.split(',').every(s=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())); $('#rn').closest('.field').classList.toggle('has-error',!n); $('#rt').closest('.field').classList.toggle('has-error',!okT); if(!n||!okT) return; const f=$('#rf').value; x.reports.push({id:uid(),name:n,freq:f,to:t,format:$('#rfo').value,next:iso(addDays(NOW,f.startsWith('Semanal')?7:f.startsWith('Mensual')?15:45))}); closeLayer(); render(); toast('Reporte programado'); }; });
}

/* =====================================================================
   11 · INTEGRACIONES
   ===================================================================== */
const ICAT=['Redes y anuncios','Mensajería','Analítica','Comercio y pagos'];
const IMETA=[['Redes y anuncios',['Leer perfiles y publicaciones','Leer métricas orgánicas','Leer campañas e inversión de Meta Ads','Recibir leads de formularios'],'Cada hora'],['Mensajería',['Enviar y recibir mensajes','Gestionar plantillas','Leer estados de entrega'],'En tiempo real'],['Analítica',['Leer tráfico y conversiones'],'Cada hora'],['Comercio y pagos',['Leer pagos y sus estados','Recibir notificaciones por webhook','Leer reembolsos y contracargos'],'En tiempo real'],['Comercio y pagos',['Leer clientes','Leer productos','Leer pedidos y carritos abandonados'],'Cada 15 min'],['Comercio y pagos',['Leer clientes, productos y pedidos'],'Cada 15 min'],['Redes y anuncios',['Leer campañas e inversión'],'Cada hora'],['Redes y anuncios',['Leer perfil y métricas básicas'],'Cada 6 horas'],['Redes y anuncios',['Leer páginas de empresa y métricas','Publicar contenidos'],'Cada hora']];
let intCat='';
const iState=i=>{ const s=X().ints[i]; return S.integrations[i]?(s&&s.status==='error'?'error':'ok'):'off'; };
const IST={ok:['Conectada','var(--success)'],error:['Requiere atención','var(--danger)'],off:['Sin conectar','var(--line-strong)']};
function vInteg(){
  const st=INTS.map((_,i)=>iState(i)), on=st.filter(s=>s!=='off').length, er=st.filter(s=>s==='error').length;
  const list=INTS.map((z,i)=>[z,i]).filter(([,i])=>!intCat||IMETA[i][0]===intCat);
  return pageHead('Integraciones','Conectá tus plataformas. Brandazo sincroniza los datos y los suma al CRM, las campañas y las métricas.',`<a class="btn" href="#/app/config/integraciones">${ic('settings')} Permisos de la cuenta</a>`)
  +`<div class="stat-grid"><div class="stat"><div class="l">Conectadas</div><div class="v">${on}</div><div class="d">de ${INTS.length} disponibles</div></div><div class="stat"><div class="l">Requieren atención</div><div class="v" style="${er?'color:var(--danger)':''}">${er}</div><div class="d">${er?'Revisá los errores':'Todo en orden'}</div></div><div class="stat"><div class="l">Última sincronización</div><div class="v" style="font-size:20px">${on?'hace 5 min':'—'}</div></div><div class="stat"><div class="l">Webhooks activos</div><div class="v">${[1,3,4].filter(i=>st[i]!=='off').length}</div></div></div>
  ${er?`<div class="alert alert-err" style="margin-bottom:16px">${ic('alert')}<div><b>Mercado Pago requiere atención.</b> ${esc(X().ints[3].error)} <button class="btn btn-sm" data-int="3" style="margin-left:8px">Revisar</button></div></div>`:''}
  <div class="toolbar"><div class="seg">${[['','Todas'],...ICAT.map(c=>[c,c])].map(([k,l])=>`<button data-icat="${k}" aria-pressed="${intCat===k}">${l}</button>`).join('')}</div></div>
  <div class="ihub">${list.map(([[n,d,c,l],i])=>{const s=st[i],x=X().ints[i];return `<article class="card icard2"><div class="top"><span class="lg2" style="background:${c}">${l}</span><div style="flex:1;min-width:0"><b>${n}</b><div class="small muted">${d}</div></div></div>
   <span class="dotst" style="color:${s==='off'?'var(--ink-muted)':IST[s][1]}"><i style="background:${IST[s][1]}"></i>${IST[s][0]}${s!=='off'&&x?` · <span class="muted" style="font-weight:400">${esc(x.account)}</span>`:''}</span>
   <div class="foot"><span class="small muted">${s==='off'?IMETA[i][2]==='En tiempo real'?'Sincroniza en tiempo real':'Sincroniza '+IMETA[i][2].toLowerCase():`Sincronizado ${x?x.last:'recién'}`}</span>${s==='off'?`<button class="btn btn-sm" data-iconn="${i}">Conectar</button>`:`<button class="btn btn-sm" data-int="${i}">${s==='error'?'Resolver':'Administrar'}</button>`}</div></article>`}).join('')}</div>
  <p class="small muted" style="margin-top:16px">Cada integración usa la API oficial del proveedor y respeta sus permisos y límites. No toda la información de cada plataforma está disponible.</p>`;
}
function intDrawer(i){
  const [n,d,c,l]=INTS[i], x=X(), s=iState(i), info=x.ints[i]||(x.ints[i]={status:'ok',account:'Cuenta conectada',last:'recién'}), meta=IMETA[i];
  const hist=[['Hoy 11:40','ok','Sincronización incremental','128 registros'],['Hoy 10:40','ok','Sincronización incremental','94 registros'],['Hoy 09:40',s==='error'?'err':'ok',s==='error'?'Webhook rechazado (401)':'Sincronización incremental',s==='error'?'Reintentos: 3 de 3':'110 registros'],['Ayer 23:00','ok','Sincronización completa','4.812 registros']];
  const hook=[1,3,4].includes(i);
  drawer(`<div class="dr-head"><span class="mark" style="background:${c}">${l}</span><div style="flex:1;min-width:0"><b style="font-size:16px">${n}</b><div class="small"><span class="dotst" style="color:${IST[s][1]}"><i style="background:${IST[s][1]}"></i>${IST[s][0]}</span></div></div><button class="icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div>
  <div style="padding:20px;overflow:auto;flex:1;display:flex;flex-direction:column;gap:20px">
   ${s==='error'?`<div class="alert alert-err">${ic('alert')}<div>${esc(info.error)}</div></div>`:''}
   <dl class="kv" style="grid-template-columns:auto 1fr"><dt>Cuenta</dt><dd style="font-family:inherit">${esc(info.account)}</dd><dt>Frecuencia</dt><dd style="font-family:inherit">${meta[2]}</dd><dt>Última sincronización</dt><dd style="font-family:inherit">${info.last}</dd><dt>Conectada por</dt><dd style="font-family:inherit">${esc(S.user.name)}</dd></dl>
   <div><h4 class="small muted" style="margin:0 0 8px;font-weight:500;letter-spacing:.04em">PERMISOS</h4><div class="scopes">${meta[1].map(p=>`<div>${ic('check')}<span>${p}</span></div>`).join('')}</div></div>
   ${hook?`<div><h4 class="small muted" style="margin:0 0 8px;font-weight:500;letter-spacing:.04em">WEBHOOK</h4><div class="code"><span>https://hooks.brandazo.com/${['','wa','','mp','shopify'][i]}/estudio-norte</span><button class="icon-btn" id="cpy" aria-label="Copiar URL" style="width:28px;height:28px">${ic('copy')}</button></div><p class="small muted" style="margin-top:6px">Eventos: ${['','mensajes, estados de entrega','','payment.created, payment.updated, refunds','orders/create, orders/paid, checkouts/update'][i]}</p></div>`:''}
   <div><h4 class="small muted" style="margin:0 0 8px;font-weight:500;letter-spacing:.04em">HISTORIAL DE SINCRONIZACIÓN</h4><div class="lst">${hist.map(([w,k,t,r])=>`<div class="it"><span style="display:flex;gap:8px;align-items:center"><i class="sdot" style="background:${k==='ok'?'var(--success)':'var(--danger)'}"></i><span>${t}<div class="small muted">${w}</div></span></span><span class="small muted">${r}</span></div>`).join('')}</div></div></div>
  <div class="dr-foot"><button class="btn btn-ghost btn-sm" id="idisc" style="color:var(--danger)">Desconectar</button><div style="display:flex;gap:8px">${s==='error'?`<button class="btn btn-primary" id="ifix">Volver a autorizar</button>`:`<button class="btn" id="isync">${ic('refresh')} Sincronizar ahora</button>`}</div></div>`);
  const on=(q,f)=>{const e=$(q);if(e)e.onclick=f};
  on('#cpy',()=>{ try{navigator.clipboard.writeText($('.code span').textContent)}catch(e){} toast('URL copiada'); });
  on('#isync',()=>{ $('#isync').classList.add('is-loading'); setTimeout(()=>{ info.last='recién'; intDrawer(i); toast(`${n}: sincronización completa`); },900); });
  on('#ifix',()=>{ $('#ifix').classList.add('is-loading'); setTimeout(()=>{ info.status='ok'; info.error=''; info.last='recién'; logAct(`Volviste a autorizar ${n}`); closeLayer(); render(); toast(`${n} reconectada. Reprocesamos los pagos pendientes.`); },1100); });
  on('#idisc',()=>{ modal('¿Desconectar?',`<p>Brandazo deja de sincronizar datos de <b>${n}</b>. Lo que ya se importó se conserva.</p>${i===1?`<div class="alert alert-warn" style="margin-top:12px">${ic('alert')}<div>Las automatizaciones que envían WhatsApp se van a pausar.</div></div>`:''}`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-danger" id="mok">Desconectar</button>`); $('#mok').onclick=()=>{ S.integrations[i]=false; delete x.ints[i]; logAct(`Desconectaste ${n}`); closeLayer(); render(); toast(`${n} desconectada`); }; });
}
function intConnect(i){
  const [n,,c,l]=INTS[i], meta=IMETA[i];
  modal(`Conectar ${n}`,`<div style="display:flex;gap:12px;align-items:center;margin-bottom:16px"><span class="mark" style="background:${c};width:40px;height:40px">${l}</span><p class="small">Vas a ir a ${n.split(' (')[0]} para autorizar el acceso. Brandazo va a poder:</p></div><div class="scopes" style="margin-bottom:16px">${meta[1].map(p=>`<div>${ic('check')}<span>${p}</span></div>`).join('')}</div><div class="alert alert-info">${ic('shield')}<div>Guardamos las credenciales cifradas y podés desconectar cuando quieras.${i===1?' Necesitás una cuenta de WhatsApp Business verificada en Meta.':''}</div></div>`,`<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="mok">Continuar a ${n.split(' (')[0]}</button>`);
  $('#mok').onclick=e=>{ e.target.classList.add('is-loading'); setTimeout(()=>{ S.integrations[i]=true; X().ints[i]={status:'ok',account:'Cuenta autorizada',last:'recién'}; logAct(`Conectaste ${n}`); notify(`${n} conectada`,'La primera sincronización puede tardar unos minutos.'); closeLayer(); render(); toast(`${n} conectada. Empezamos la primera sincronización.`); },1100); };
}
function bInteg(){
  $$('[data-icat]').forEach(b=>b.onclick=()=>{intCat=b.dataset.icat;render()});
  $$('[data-int]').forEach(b=>b.onclick=()=>intDrawer(+b.dataset.int));
  $$('[data-iconn]').forEach(b=>b.onclick=()=>intConnect(+b.dataset.iconn));
}

/* ---------- registro de vistas ---------- */
Object.assign(VIEWS,{
 crm:{t:'CRM',view:vCrm,bind:bCrm},
 automatizaciones:{t:'Automatizaciones',view:vAuto,bind:bAuto},
 comunicaciones:{t:'Comunicaciones',view:vComms,bind:bComms},
 metricas:{t:'Métricas',view:vMetricas,bind:bMetricas},
 integraciones:{t:'Integraciones',view:vInteg,bind:bInteg}
});
NAV.forEach(n=>{ if(VIEWS[n[0]]) n[3]=true; });
/* la empresa de ejemplo ya se sembró antes de cargar estos módulos */
if(S.company&&D().demo) loadDemoX();

render();
