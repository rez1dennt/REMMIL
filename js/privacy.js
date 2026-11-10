(function(){
  'use strict';
  const config=window.REMMIL_LEGAL;
  if(!config)return;
  if(config.siteUrl)document.querySelectorAll('[data-site-domain]').forEach(el=>el.textContent=config.siteUrl);
  const key='remmil_privacy_choice',days=180;
  function read(){try{const raw=localStorage.getItem(key);if(!raw)return null;const value=JSON.parse(raw);if(value&&value.version===config.version&&value.expiresAt>Date.now())return value;localStorage.removeItem(key);return null;}catch{try{localStorage.removeItem(key);}catch{}return null;}}
  const banner=document.createElement('section');banner.id='privacy-banner';banner.className='privacy-banner';banner.hidden=true;banner.setAttribute('role','region');banner.setAttribute('aria-label','Cookie и конфиденциальность');
  banner.innerHTML='<h2>Cookie и конфиденциальность</h2><p>На сайте нет аналитики и рекламных cookie. Можно сохранить ваш выбор в этом браузере, чтобы не показывать уведомление повторно. <a href="cookies.html">Подробнее о настройках</a>.</p><div class="privacy-actions"><button class="button button-primary" type="button" data-privacy-save>Сохранить выбор</button><button class="button button-outline" type="button" data-privacy-decline>Не сохранять</button></div>';
  document.body.append(banner);
  let timer,opener=null;
  function close(){banner.classList.remove('is-visible');banner.inert=true;if(opener&&document.contains(opener))opener.focus({preventScroll:true});clearTimeout(timer);timer=setTimeout(()=>{banner.hidden=true;},matchMedia('(prefers-reduced-motion: reduce)').matches?0:370);}
  function show(focus=false){clearTimeout(timer);banner.hidden=false;banner.inert=false;void banner.offsetWidth;banner.classList.add('is-visible');if(focus)banner.querySelector('button').focus({preventScroll:true});}
  banner.querySelector('[data-privacy-save]').addEventListener('click',()=>{const now=Date.now();try{localStorage.setItem(key,JSON.stringify({version:config.version,remember:true,chosenAt:now,expiresAt:now+days*86400000}));}catch{/* Storage is optional; viewing the site remains available. */}close();});
  banner.querySelector('[data-privacy-decline]').addEventListener('click',()=>{try{localStorage.removeItem(key);}catch{}close();});
  document.querySelectorAll('[data-cookie-settings]').forEach(button=>button.addEventListener('click',()=>{opener=button;show(true);}));
  banner.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
  if(!read())show();
})();
