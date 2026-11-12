/* Synchronize the no-JS product description and fingerprint every public CSS/JS dependency. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'js/content.js'),'utf8'),sandbox);
const content=sandbox.window.REMMIL_CONTENT,product=content.products.find(p=>p.id==='b90');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const start=html.indexOf('<div class="description-sections" id="description-sections">');
const end=html.indexOf('\n            </div>\n            <div class="detail-panel" id="panel-documents"',start);
if(start<0||end<0)throw Error('Product description boundary not found');
const sections=product.descriptionSections.map(item=>'<details class="product-description-section" name="product-b90-information"><summary><h4>'+esc(item.title)+'<span class="description-symbol" aria-hidden="true"></span></h4></summary><div class="description-answer"><p>'+esc(item.text)+'</p></div></details>').join('\n');
html=html.slice(0,start)+'<div class="description-sections" id="description-sections">'+sections+'</div>'+html.slice(end);
fs.writeFileSync(path.join(root,'index.html'),html);
require('./build-legal.cjs');
for(const file of ['index.html','privacy.html','consent.html','cookies.html','requisites.html']){
  let source=fs.readFileSync(path.join(root,file),'utf8');
  source=source.replace(/(src|href)="((?:css|js)\/[^"?]+\.(?:css|js))(?:\?[^\"]*)?"/g,(_,attribute,asset)=>attribute+'="'+asset+'?v='+crypto.createHash('sha256').update(fs.readFileSync(path.join(root,asset))).digest('hex').slice(0,12)+'"');
  fs.writeFileSync(path.join(root,file),source);
}
fs.mkdirSync(path.join(root,'private'),{recursive:true});
const legal={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'js/legal-config.js'),'utf8'),legal);
fs.writeFileSync(path.join(root,'private/catalog.json'),JSON.stringify({consentVersion:legal.window.REMMIL_LEGAL.version,products:Object.fromEntries(content.products.map(p=>[p.id,{name:p.name,packaging:p.packaging}]))},null,2)+'\n');
console.log('Built product disclosures, legal pages, asset fingerprints and PHP catalog.');
