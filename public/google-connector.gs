/* Tasty Operaciones: sólo acciones firmadas, sin envío de correos. */

const TASTY={mailbox:'mrtastysanmiguel@gmail.com',counts:{balbin:'1JGgsvRvMCEGJAJFGkRuQiINg-uhbw2aUOtTUZefx8tU',peron:'1UIQNi2h8mqNTu5RfLFf0ONZXejKB_7sglvKFsnpfWXA'},groups:['Mercadería','Sueldos','Gastos del local','Impuestos y comisiones','Mantenimiento']};

function output_(v){return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);}

function doGet(){return output_({ok:false,error:'Se requiere una solicitud firmada.'});}

function doPost(e){

 try{

  if(!e||!e.postData||e.postData.contents.length>13000000)throw new Error('Solicitud inválida');

  const envelope=JSON.parse(e.postData.contents), secret=PropertiesService.getScriptProperties().getProperty('BRIDGE_SECRET');

  if(!secret||secret.length<32||typeof envelope.message!=='string')throw new Error('Conector sin configurar');

  const expected=Utilities.computeHmacSha256Signature(envelope.message,secret).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');

  const signature=String(envelope.signature||'');let diff=0;if(expected.length!==signature.length)throw new Error('Firma inválida');

  for(let i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^signature.charCodeAt(i);if(diff)throw new Error('Firma inválida');

  const r=JSON.parse(envelope.message);if(!Number.isFinite(r.timestamp)||Math.abs(Date.now()-r.timestamp)>300000||!/^[a-f0-9-]{36}$/.test(r.nonce))throw new Error('Solicitud vencida');

  const lock=LockService.getScriptLock();lock.waitLock(15000);try{const cache=CacheService.getScriptCache();if(cache.get(r.nonce))throw new Error('Solicitud repetida');cache.put(r.nonce,'1',600);}finally{lock.releaseLock();}

  requireAccount_();const p=r.payload||{};let result;

  switch(r.action){

   case 'status':result=status_();break;

   case 'counts':result={locations:Object.keys(TASTY.counts).map(location=>({location,values:readCounts_(location)}))};break;

   case 'ocr':result=ocr_(p);break;

   case 'finances':result={sheets:financeSheets_()};break;

   case 'invoice':result=record_(p,true);break;

   case 'entry':result=record_(p,false);break;

   case 'gmail':result=gmail_(p);break;

   case 'gmail-cv':result=gmailCv_(p);break;
   default:throw new Error('Acción no permitida');

  }return output_({ok:true,result});

 }catch(err){return output_({ok:false,error:String(err.message||err).slice(0,500)});}

}

function requireAccount_(){const cache=CacheService.getScriptCache();let email=cache.get('account');if(!email){email=Gmail.Users.getProfile('me').emailAddress;cache.put('account',email,300);}if(email.toLowerCase()!==TASTY.mailbox)throw new Error('Autorizá con '+TASTY.mailbox);}

function id_(key){const value=PropertiesService.getScriptProperties().getProperty(key);if(!value||!/^[A-Za-z0-9_-]{20,}$/.test(value))throw new Error('Falta configurar '+key);return value;}

function status_(){const check=key=>{try{return SpreadsheetApp.openById(id_(key)).getName()}catch(e){return 'Pendiente: falta ID o permiso'}};return {account:TASTY.mailbox,balbin:SpreadsheetApp.openById(TASTY.counts.balbin).getName(),peron:SpreadsheetApp.openById(TASTY.counts.peron).getName(),eerrBalbin:check('EERR_BALBIN_ID'),eerrPeron:check('EERR_PERON_ID')};}

function readCounts_(location){const s=SpreadsheetApp.openById(TASTY.counts[location]).getSheetByName('Conteo');if(!s)throw new Error('Falta Conteo en '+location);const n=s.getLastRow();if(n>5000)throw new Error('Conteo supera 5000 filas: ampliar antes de sincronizar');return s.getRange(1,1,n,6).getValues().map(row=>row.map(v=>v instanceof Date?Utilities.formatDate(v,s.getParent().getSpreadsheetTimeZone(),'yyyy-MM-dd'):v));}

function safeText_(v){const s=String(v==null?'':v).slice(0,4000);return /^[=+\-@\t\r]/.test(s)?"'"+s:s;}

function record_(p,isInvoice){

 if(!['balbin','peron'].includes(p.location)||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isFinite(p.amount)||p.amount<0||!p.id)throw new Error('Campos incompletos');

 const sale=!isInvoice&&p.kind==='sale';if(!sale&&!TASTY.groups.includes(p.category))throw new Error('Categoría inválida');

 if(isInvoice&&(p.status!=='reviewed'||!/^\d{11}$/.test(p.cuit)||!/^\d{4,5}-\d{8}$/.test(p.number)))throw new Error('Factura sin revisar');

 const ss=SpreadsheetApp.openById(id_(p.location==='balbin'?'EERR_BALBIN_ID':'EERR_PERON_ID'));

 const lock=LockService.getScriptLock();lock.waitLock(25000);

 try{

  let s=ss.getSheetByName('Registro App');const headers=['ID','Fecha','Mes','Local','Tipo','Categoría','Proveedor / concepto','CUIT','Comprobante','Importe ARS','Canal','Observaciones','Registrado UTC'];

  if(!s){s=ss.insertSheet('Registro App');s.getRange(1,1,1,13).setValues([headers]).setBackground('#171717').setFontColor('#ffffff').setFontWeight('bold');s.setFrozenRows(1);s.setColumnWidths(1,13,150);s.setColumnWidth(7,240);}

 if(JSON.stringify(s.getRange(1,1,1,13).getValues()[0])!==JSON.stringify(headers))throw new Error('Registro App tiene otra estructura. No se modificó.');
  const existing=s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,1).createTextFinder(String(p.id)).matchEntireCell(true).findNext():null;

  if(!existing){const value=isInvoice&&String(p.documentType).startsWith('Nota de crédito')?-p.amount:p.amount;s.appendRow([safeText_(p.id),safeText_(p.date),safeText_(p.date.slice(0,7)),p.location,sale?'Venta':isInvoice?p.documentType:'Gasto manual',sale?'Ventas':p.category,safeText_(p.supplier||p.description||p.channel),safeText_(p.cuit||''),safeText_(p.number||''),value,safeText_(p.channel||''),safeText_(p.notes||''),new Date().toISOString()]);s.getRange(s.getLastRow(),10).setNumberFormat('"$"#,##0.00');}

  ensureSummary_(ss,p.date.slice(0,7));SpreadsheetApp.flush();return {sheetUrl:ss.getUrl()+'#gid='+s.getSheetId(),alreadyPresent:!!existing};

 }finally{lock.releaseLock();}

}

function ensureSummary_(ss,period){

 const name='EERR App '+period;if(ss.getSheetByName(name))return;const s=ss.insertSheet(name);

 s.getRange('A1:C1').setValues([['EERR APP — PRELIMINAR',period,'Solo movimientos registrados en la app']]).setFontWeight('bold').setBackground('#f28e19');

 s.getRange('A3:C3').setValues([['Concepto','ARS','% sobre ventas']]).setFontWeight('bold');

 const labels=['Ventas'].concat(TASTY.groups).concat(['Resultado preliminar']);s.getRange(4,1,labels.length,1).setValues(labels.map(v=>[v]));

 for(let i=0;i<6;i++){const r=i+4;s.getRange(r,2).setFormula("=SUMIFS('Registro App'!J:J,'Registro App'!C:C,$B$1,'Registro App'!F:F,A"+r+")");s.getRange(r,3).setFormula('=IFERROR(B'+r+'/$B$4,0)');}

 s.getRange('B10').setFormula('=B4-SUM(B5:B9)');s.getRange('C10').setFormula('=IFERROR(B10/B4,0)');s.getRange('B4:B10').setNumberFormat('"$"#,##0.00');s.getRange('C4:C10').setNumberFormat('0.0%');

 s.getRange('A12').setValue('Completar ventas, sueldos, comisiones y demás gastos antes del cierre.');s.setColumnWidth(1,360);s.setColumnWidth(2,180);s.setColumnWidth(3,330);s.getRange('A12:C12').merge().setWrap(true);s.setFrozenRows(3);

}

function ocr_(p){

 if(!p.base64||p.base64.length>12000000||!['image/jpeg','image/png','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(p.mime))throw new Error('Lectura: JPG, PNG, PDF, Word o TXT hasta 8 MB');

 const bytes=Utilities.base64Decode(p.base64);if(p.mime==='text/plain')return {text:Utilities.newBlob(bytes).getDataAsString('UTF-8').slice(0,50000)};

 const blob=Utilities.newBlob(bytes,p.mime,String(p.name||'comprobante').slice(0,180));let doc;

 try{doc=Drive.Files.create({name:'Tasty OCR '+String(p.id),mimeType:'application/vnd.google-apps.document'},blob,{ocrLanguage:'es',fields:'id'});

 const exported=UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(doc.id)+'/export?mimeType=text%2Fplain',{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true});

 if(exported.getResponseCode()!==200)throw new Error('No se pudo extraer texto');return {text:exported.getContentText().slice(0,50000)};

 }finally{if(doc&&doc.id){try{Drive.Files.update({trashed:true},doc.id);}catch(e){}}}

}

function gmail_(p){

 if(!['180','365','all'].includes(p.period))throw new Error('Período inválido');
 const args={maxResults:25,q:(p.period==='all'?'':'newer_than:'+p.period+'d ')+'(subject:cv OR subject:curriculum OR subject:currículum OR subject:postulacion OR subject:postulación OR subject:empleo OR subject:trabajo OR filename:cv OR filename:curriculum)',includeSpamTrash:false};if(p.pageToken)args.pageToken=String(p.pageToken);

 const page=Gmail.Users.Messages.list('me',args);const candidates=(page.messages||[]).map(item=>{

  const m=Gmail.Users.Messages.get('me',item.id,{format:'full'}),headers=m.payload.headers||[],header=name=>(headers.find(h=>h.name.toLowerCase()===name)||{}).value||'',from=header('from'),match=from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

  const parts=[];const walk=part=>{parts.push(part);(part.parts||[]).forEach(walk)};walk(m.payload);const plain=parts.find(x=>x.mimeType==='text/plain'&&x.body&&x.body.data);

  const text=plain?Utilities.newBlob(Utilities.base64DecodeWebSafe(plain.body.data)).getDataAsString('UTF-8').slice(0,4000):m.snippet||'';

  return {messageId:m.id,name:from.replace(/<[^>]+>/g,'').replaceAll('"','').trim(),email:match?match[0]:'',subject:header('subject'),date:new Date(Number(m.internalDate)).toISOString(),text,attachmentNames:parts.filter(x=>x.filename).map(x=>x.filename)};

 });return {candidates,nextPageToken:page.nextPageToken||''};

}

function verificarConfiguracion(){requireAccount_();console.log(JSON.stringify(status_()));}

function gmailCv_(p){
 if(!/^[a-f0-9]{10,40}$/.test(String(p.messageId)))throw new Error('Correo inválido');
 const message=Gmail.Users.Messages.get('me',p.messageId,{format:'full'}),parts=[];
 const walk=part=>{parts.push(part);(part.parts||[]).forEach(walk)};walk(message.payload);
 const allowed=['application/pdf','image/jpeg','image/png','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
 const attachments=parts.filter(part=>part.filename&&allowed.includes(part.mimeType));
 if(!attachments.length)throw new Error('No hay adjuntos compatibles. Revisá el correo original.');
 if(attachments.length>3)throw new Error('El correo tiene más de 3 adjuntos. Abrilo y cargá el CV elegido en la ficha.');
 const output=[];
 attachments.forEach(part=>{
  if(!part.body||part.body.size>8*1024*1024)throw new Error('El adjunto supera 8 MB. Cargá una versión más pequeña.');
  const body=part.body.attachmentId?Gmail.Users.Messages.Attachments.get('me',p.messageId,part.body.attachmentId):part.body;
  if(!body.data)throw new Error('No se pudo leer '+part.filename);
  const bytes=Utilities.base64DecodeWebSafe(body.data);
  if(bytes.length>8*1024*1024)throw new Error('El adjunto supera 8 MB');
  output.push(part.filename+'\n'+ocr_({id:p.messageId,name:part.filename,mime:part.mimeType,base64:Utilities.base64Encode(bytes)}).text);
 });
 return {text:output.join('\n\n').slice(0,40000)};
}




function financeSheets_(){

 const result=[];

 ['balbin','peron'].forEach(location=>{

  const ss=SpreadsheetApp.openById(id_(location==='balbin'?'EERR_BALBIN_ID':'EERR_PERON_ID'));

  const sheets=ss.getSheets().filter(s=>/^EERR?\s/.test(s.getName())&&!s.getName().startsWith('EERR App'));

  if(sheets.length>60)throw new Error('Más de 60 pestañas EERR: ampliar el importador antes de continuar');

  sheets.forEach(s=>{const range=s.getRange(1,1,Math.min(s.getLastRow(),100),3);result.push({location,file:ss.getName(),sheet:s.getName(),url:ss.getUrl()+'#gid='+s.getSheetId(),values:range.getValues(),formulas:range.getFormulas()})});

 });return result;

}

