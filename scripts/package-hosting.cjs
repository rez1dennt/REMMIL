/* Only the private, local hosting archive contains the configured mail password. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),config=path.join(root,'private/remmil-mail.php');
if(!fs.existsSync(config))throw Error('Create the ignored private/remmil-mail.php config first.');
fs.mkdirSync(path.join(root,'qa'),{recursive:true});
const output=fs.mkdtempSync(path.join(root,'qa','hosting-'));
const web=path.join(output,'public_html'),privateDir=path.join(output,'private');fs.mkdirSync(web);fs.mkdirSync(privateDir);
for(const item of ['index.html','privacy.html','consent.html','cookies.html','requisites.html','robots.txt','.htaccess','api','assets','css','js'])fs.cpSync(path.join(root,item),path.join(web,item),{recursive:true});
for(const item of ['app.php','cleanup.php','catalog.json','remmil-mail.php','.htaccess','vendor'])fs.cpSync(path.join(root,'private',item),path.join(privateDir,item),{recursive:true});
fs.copyFileSync(path.join(root,'docs/php-hosting.txt'),path.join(output,'НАЧНИТЕ-ЗДЕСЬ.txt'));
process.stdout.write(output);
