(function(){
  'use strict';
  const menu=document.querySelector('#mobile-navigation'),toggle=document.querySelector('.menu-toggle'),backdrop=document.querySelector('.menu-backdrop');
  if(!menu||!toggle||!backdrop)return;
  let menuOpen=false,closeTimer;
  const inertTargets=[document.querySelector('main'),document.querySelector('.site-footer')].filter(Boolean);
  function setMenu(open,returnFocus=true){
    clearTimeout(closeTimer);menuOpen=open;
    toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
    if(open){menu.hidden=false;backdrop.hidden=false;menu.inert=false;document.body.classList.add('menu-open');inertTargets.forEach(el=>el.inert=true);void menu.offsetWidth;menu.classList.add('is-open');backdrop.classList.add('is-open');menu.querySelector('a').focus({preventScroll:true});}
    else{menu.classList.remove('is-open');backdrop.classList.remove('is-open');menu.inert=true;document.body.classList.remove('menu-open');inertTargets.forEach(el=>el.inert=false);if(returnFocus)toggle.focus({preventScroll:true});closeTimer=setTimeout(()=>{if(!menuOpen){menu.hidden=true;backdrop.hidden=true;}},matchMedia('(prefers-reduced-motion: reduce)').matches?0:370);}
  }
  toggle.addEventListener('click',()=>setMenu(!menuOpen));backdrop.addEventListener('click',()=>setMenu(false));
  menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setMenu(false,false)));
  document.addEventListener('keydown',event=>{if(!menuOpen)return;if(event.key==='Escape'){event.preventDefault();setMenu(false);}if(event.key==='Tab'){const items=[toggle,...menu.querySelectorAll('a')],first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus({preventScroll:true});}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus({preventScroll:true});}}});
  matchMedia('(min-width: 901px)').addEventListener('change',event=>{if(event.matches&&menuOpen)setMenu(false,false);});
})();
