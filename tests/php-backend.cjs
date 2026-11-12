/* Exercises the real PHP handler against local SMTP only. No external messages. */
const {test,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const source=path.resolve(__dirname,'..');
let temporary,web,privateDir,php,smtp,base,config;
const messages=[];let rejectNext=false;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function smtpFixture(socket){
 socket.setEncoding('utf8');socket.write('220 local.test ESMTP\r\n');let buffer='',inData=false,data=[],authStep=0;
 socket.on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\r\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+2);
  if(inData){if(line==='.') {inData=false;if(rejectNext){rejectNext=false;socket.write('550 Rejected by test fixture\r\n');}else{messages.push(data.join('\r\n'));socket.write('250 Message accepted\r\n');}data=[];}else data.push(line.replace(/^\.\./,'.'));continue;}
  if(authStep===1){authStep=2;socket.write('334 UGFzc3dvcmQ6\r\n');continue;}if(authStep===2){authStep=0;socket.write('235 Authenticated\r\n');continue;}
  if(/^EHLO|^HELO/.test(line))socket.write('250-local.test\r\n250 AUTH LOGIN PLAIN\r\n');
  else if(/^AUTH LOGIN/.test(line)){authStep=1;socket.write('334 VXNlcm5hbWU6\r\n');}
  else if(/^AUTH PLAIN/.test(line))socket.write('235 Authenticated\r\n');
  else if(line==='DATA'){inData=true;socket.write('354 End with a dot\r\n');}
  else if(line==='QUIT')socket.end('221 Bye\r\n');else socket.write('250 OK\r\n');
 }});socket.on('error',()=>{});
}
function writeConfig(){fs.writeFileSync(path.join(privateDir,'remmil-mail.php'),'<?php return json_decode('+JSON.stringify(JSON.stringify(config))+',true);');}
function payload(){return {name:'Анна Тестовая',phone:'+79991234567',product:'b90',submissionId:crypto.randomUUID(),website:'',consent:{accepted:true,version:'2026-11-12',document:base+'/consent.html',acceptedAt:'2000-01-01T00:00:00Z'}};}
async function post(body=payload(),headers={}){const r=await fetch(base+'/api/lead.php',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...headers},body:typeof body==='string'?body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
before(async()=>{
 temporary=fs.mkdtempSync(path.join(os.tmpdir(),'remmil-php-test-'));web=path.join(temporary,'public_html');privateDir=path.join(temporary,'private');fs.mkdirSync(web);
 for(const item of ['index.html','privacy.html','consent.html','cookies.html','requisites.html','api','assets','css','js','robots.txt'])fs.cpSync(path.join(source,item),path.join(web,item),{recursive:true});
 fs.cpSync(path.join(source,'private'),privateDir,{recursive:true,filter:file=>!file.includes(path.sep+'storage')&&!file.endsWith('remmil-mail.php')});
 smtp=net.createServer(smtpFixture);await new Promise(resolve=>smtp.listen(0,'127.0.0.1',resolve));
 config={smtp_host:'127.0.0.1',smtp_port:smtp.address().port,smtp_security:'',smtp_user:'sender@example.test',smtp_password:'local-smtp-fixture-only',recipient:'inbox@example.test',site_url:'',rate_salt:'test-only-rate-salt',rate_limit:100,rate_window_seconds:900,retention_days:90};writeConfig();
 const portServer=net.createServer();await new Promise(resolve=>portServer.listen(0,'127.0.0.1',resolve));const port=portServer.address().port;await new Promise(resolve=>portServer.close(resolve));base='http://127.0.0.1:'+port;
 php=spawn(process.env.PHP_BIN||'php',['-d','display_errors=0','-S','127.0.0.1:'+port,'-t',web,path.join(source,'tests/php-router.php')],{stdio:['ignore','pipe','pipe'],windowsHide:true});
 let error;php.on('error',value=>error=value);for(let i=0;i<60;i++){if(error)throw error;try{await fetch(base+'/');return;}catch{await delay(50);}}throw Error('PHP test server did not start');
});
beforeEach(()=>{config.rate_limit=100;writeConfig();rejectNext=false;const dir=path.join(privateDir,'storage/limits');if(fs.existsSync(dir))for(const file of fs.readdirSync(dir))if(/^[a-f0-9]{64}\.json$/.test(file))fs.unlinkSync(path.join(dir,file));});
after(async()=>{if(php){const closed=new Promise(resolve=>php.once('exit',resolve));php.kill();await closed;}if(smtp)await new Promise(resolve=>smtp.close(resolve));if(temporary&&path.resolve(temporary).startsWith(path.join(os.tmpdir(),'remmil-php-test-')))fs.rmSync(temporary,{recursive:true,force:true});});
test('PHP sends a complete lead and records consent using server time',async()=>{
 const value=payload(),count=messages.length,result=await post(value);assert.equal(result.status,200);assert.equal(result.body.ok,true);assert.equal(messages.length,count+1);
 const mime=messages.at(-1),body=Buffer.from(mime.slice(mime.indexOf('\r\n\r\n')+4).replace(/\s/g,''),'base64').toString('utf8');assert.match(body,/Анна Тестовая/);assert.match(body,/\+79991234567/);assert.match(body,/PUR-2R В-90/);assert.match(body,/2026-11-12/);assert.match(body,/consent\.html/);assert.doesNotMatch(mime,/local-smtp-fixture-only/);
 const record=JSON.parse(fs.readFileSync(path.join(privateDir,'storage/consents',value.submissionId+'.json')));assert.equal(record.status,'sent');assert.equal(record.consent.accepted,true);assert.notEqual(record.consent.acceptedAt,value.consent.acceptedAt);assert.ok(Math.abs(Date.parse(record.consent.acceptedAt)-Date.now())<10000);
});
test('repeating a submission does not send another email',async()=>{const value=payload();await post(value);const count=messages.length;assert.equal((await post(value)).status,200);assert.equal(messages.length,count);assert.equal((await post({...value,name:'Другое Имя'})).status,409);});
test('consent is required and its version must be current',async()=>{const value=payload();assert.equal((await post({...value,consent:{accepted:false,version:'2026-11-12'}})).status,422);assert.equal((await post({...value,consent:{accepted:true,version:'old'}})).status,409);});
test('invalid names, phones, products and IDs are rejected',async()=>{for(const patch of [{name:'<script>bad</script>'},{name:'А'},{phone:'+70000000000'},{phone:'+79999999999'},{product:'unknown'},{submissionId:'../../secret'}])assert.equal((await post({...payload(),...patch})).status,422);});
test('cross-origin and honeypot requests are rejected',async()=>{assert.equal((await post(payload(),{Origin:'https://unrelated.example'})).status,403);assert.equal((await post({...payload(),website:'bot.example'})).status,400);});
test('invalid methods, content types, JSON and large bodies are rejected',async()=>{assert.equal((await fetch(base+'/api/lead.php')).status,405);assert.equal((await post(payload(),{'Content-Type':'text/plain'})).status,415);assert.equal((await post('{')).status,400);assert.equal((await post('x'.repeat(9000))).status,413);});
test('rate limits block further delivery attempts',async()=>{config.rate_limit=2;writeConfig();assert.equal((await post()).status,200);assert.equal((await post()).status,200);assert.equal((await post()).status,429);});
test('SMTP rejection never reports success',async()=>{rejectNext=true;const value=payload(),count=messages.length,result=await post(value);assert.equal(result.status,503);assert.equal(result.body.ok,false);assert.equal(messages.length,count);assert.equal(result.body.error,'mail_unavailable');const record=JSON.parse(fs.readFileSync(path.join(privateDir,'storage/consents',value.submissionId+'.json')));assert.equal(record.status,'failed');});
test('private settings and personal records cannot be fetched publicly',async()=>{const value=payload();await post(value);for(const url of ['/private/remmil-mail.php','/private/catalog.json','/private/storage/consents/'+value.submissionId+'.json'])assert.equal((await fetch(base+url)).status,404);});
test('expired consent records are removed',async()=>{const record=path.join(privateDir,'storage/consents',crypto.randomUUID()+'.json');fs.writeFileSync(record,'{}');const old=new Date(Date.now()-91*86400000);fs.utimesSync(record,old,old);await post();assert.equal(fs.existsSync(record),false);});
test('the browser form sends through PHP to the local SMTP fixture',async()=>{
 const {chromium,expect}=require('@playwright/test'),browser=await chromium.launch({channel:'chrome',headless:true});
 try{const page=await browser.newPage({reducedMotion:'reduce'});await page.addInitScript(()=>localStorage.setItem('remmil_privacy_choice',JSON.stringify({version:'2026-11-12',remember:true,expiresAt:Date.now()+86400000})));await page.goto(base+'/');
 await page.locator('[data-product="mc90"]').click();await page.locator('#lead-name').fill('Тестовая Заявка');await page.locator('#lead-phone').fill('9991234567');
 const count=messages.length;await page.locator('#callback button[type=submit]').click();await expect(page.locator('#consent-error')).toContainText('Подтвердите');assert.equal(messages.length,count);
 await page.locator('#lead-consent').check();await page.locator('#callback button[type=submit]').click();await expect(page.locator('#form-status')).toContainText('Заявка отправлена');assert.equal(messages.length,count+1);
 const mime=messages.at(-1),body=Buffer.from(mime.slice(mime.indexOf('\r\n\r\n')+4).replace(/\s/g,''),'base64').toString('utf8');assert.match(body,/МС-90/);assert.match(body,/Тестовая Заявка/);
 }finally{await browser.close();}
});
