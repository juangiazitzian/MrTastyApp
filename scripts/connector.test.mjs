import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHmac, randomUUID } from 'node:crypto';

const source=readFileSync(new URL('../public/google-connector.gs',import.meta.url),'utf8');
function sandbox(email='mrtastysanmiguel@gmail.com') {
  const secret='test-secret-only-for-unit-tests-123456789';
  const cache=new Map();
  const context=vm.createContext({
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>key==='BRIDGE_SECRET'?secret:'test-eerr-id-0123456789012345'})},
    Utilities:{computeHmacSha256Signature:(message,key)=>Array.from(createHmac('sha256',key).update(message).digest())},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    CacheService:{getScriptCache:()=>({get:key=>cache.get(key),put:(key,value)=>cache.set(key,value)})},
    Gmail:{Users:{getProfile:()=>({emailAddress:email})}},
    SpreadsheetApp:{openById:()=>({getName:()=> 'Private sheet'})},
    console,
  });
  new vm.Script(source).runInContext(context);
  function envelope(action='status',extra={}){const message=JSON.stringify({action,payload:{},timestamp:Date.now(),nonce:randomUUID(),...extra});return {postData:{contents:JSON.stringify({message,signature:createHmac('sha256',secret).update(message).digest('hex')})}}; }
  return {context,envelope};
}

test('conector: firma válida, rechazo de alteración, vencimiento y repetición',()=>{
  const {context:c,envelope}=sandbox();
  const request=envelope();assert.equal(c.doPost(request).ok,true);assert.match(c.doPost(request).error,/repetida/);
  const bad=envelope();bad.postData.contents=bad.postData.contents.replace('status','counts');assert.match(c.doPost(bad).error,/Firma inválida/);
  assert.match(c.doPost(envelope('status',{timestamp:Date.now()-600000})).error,/vencida/);
  assert.equal(c.doGet().ok,false);
});
test('conector: no opera con otra cuenta ni con acciones fuera de la lista',()=>{
  const other=sandbox('wrong@example.com');assert.match(other.context.doPost(other.envelope()).error,/Autorizá/);
  const good=sandbox();assert.match(good.context.doPost(good.envelope('send-email')).error,/Acción no permitida/);
});
test('CV: lee el adjunto del correo sin descargarlo en el dispositivo',()=>{
  const {context:c}=sandbox();
  c.Gmail.Users.Messages={get:()=>({payload:{parts:[{filename:'cv.pdf',mimeType:'application/pdf',body:{size:12,attachmentId:'a'}}]}}),Attachments:{get:(user,message,id)=>{assert.deepEqual([user,message,id],['me','0123456789abcdef','a']);return {data:'cHJ1ZWJh'};}}};
  c.Utilities.base64DecodeWebSafe=s=>Array.from(Buffer.from(s,'base64url'));
  c.Utilities.base64Encode=b=>Buffer.from(b).toString('base64');
  c.ocr_=()=>({text:'Experiencia en cocina y disponibilidad nocturna'});
  assert.match(c.gmailCv_({messageId:'0123456789abcdef'}).text,/disponibilidad nocturna/);
  c.Gmail.Users.Messages.get=()=>({payload:{parts:[{filename:'cv.pdf',mimeType:'application/pdf',body:{size:9*1024*1024,attachmentId:'a'}}]}});
  assert.throws(()=>c.gmailCv_({messageId:'0123456789abcdef'}),/8 MB/);
});
test('Gmail: búsqueda de todo el historial y paginación conservan el filtro de CV',()=>{
  const {context:c}=sandbox();let args;
  c.Gmail.Users.Messages={list:(user,p)=>{args=p;return {messages:[],nextPageToken:'next'}}};
  assert.equal(c.gmail_({period:'all',pageToken:'previous'}).nextPageToken,'next');
  assert.equal(args.pageToken,'previous');assert.equal(args.maxResults,25);assert.ok(args.q.includes('subject:cv'));assert.ok(!args.q.includes('newer_than'));
  assert.throws(()=>c.gmail_({period:'unbounded-query'}),/Período inválido/);
});
