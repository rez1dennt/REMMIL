(function () {
  'use strict';
  document.documentElement.classList.add('js');
  const config = window.REMMIL_CONTENT;
  const model = window.RemmilModel;
  const products = config.products;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  let selectedId = 'b90';
  let category = 'all';
  let currentTab = 'description';
  const detail = $('#product-detail');

  function activateTab(key, focus) {
    currentTab = key;
    $$('[data-detail-tab]').forEach(button => {
      const active = button.dataset.detailTab === key;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      $('#' + button.getAttribute('aria-controls')).hidden = !active;
      if (active && focus) button.focus({preventScroll:true});
    });
  }

  function renderDocuments(product) {
    const host = $('#product-documents');
    host.replaceChildren();
    host.hidden = product.documents.length === 0;
    if (product.documents.length) {
      product.documents.forEach(file => {
        const link = document.createElement('a');
        link.className = 'document-link'; link.href = file.url; link.textContent = file.title;
        link.download = ''; host.append(link);
      });
      return;
    }
  }

  function renderDescription(product) {
    $('#product-description-text').textContent = product.details;
    const consumption = product.consumption;
    $('#product-consumption').hidden = !consumption;
    $('#consumption-value').textContent = consumption ? consumption.value : '';
    $('#consumption-notes').textContent = consumption ? consumption.notes : '';
    const host = $('#description-sections'); host.replaceChildren();
    (product.descriptionSections || []).forEach(item => {
      const section = document.createElement('section'); section.className = 'product-description-section';
      const heading = document.createElement('h4'), text = document.createElement('p');
      heading.textContent = item.title; text.textContent = item.text;
      section.append(heading,text); host.append(section);
    });
  }

  function renderProduct(product, animate) {
    if (!product) return;
    selectedId = product.id;
    $$('[data-product]').forEach(card => {
      const active = card.dataset.product === product.id;
      card.classList.toggle('is-selected',active); card.setAttribute('aria-pressed',String(active));
    });
    $('#detail-title').textContent = product.name;
    $('#detail-description').textContent = product.description;
    $('#detail-packaging').textContent = product.packaging;
    $('#detail-price').textContent = model.formatPrice(product.price);
    $('#detail-image').src = product.image;
    $('#detail-image').alt = 'REMMIL ' + product.name + ', ' + product.packaging;
    renderDescription(product);
    renderDocuments(product);
    if (animate) {
      detail.classList.remove('detail-changing'); void detail.offsetWidth; detail.classList.add('detail-changing');
      $('#catalog-announcement').textContent = 'Выбран ' + product.name + '. Информация о товаре обновлена.';
    }
  }

  function applyCategory(value, focus) {
    category = value;
    $$('[data-category]').forEach(button => {
      const active = button.dataset.category === value;
      button.setAttribute('aria-selected',String(active)); button.tabIndex = active ? 0 : -1;
      if (active) { $('#product-list').setAttribute('aria-labelledby',button.id); if(focus) button.focus({preventScroll:true}); }
    });
    $$('[data-product]').forEach(card=>{
      const product = products.find(p=>p.id===card.dataset.product);
      card.hidden = value !== 'all' && product.category !== value;
    });
    renderProduct(model.selectProduct(products,selectedId,value),true);
  }

  // New products are added automatically; static HTML remains a no-JS fallback.
  products.forEach(product=>{
    if($$('[data-product]').some(card=>card.dataset.product===product.id))return;
    const card=document.createElement('button');card.type='button';card.className='product-card';card.dataset.product=product.id;card.setAttribute('aria-pressed','false');
    const photo=document.createElement('span');photo.className='card-image';const image=document.createElement('img');image.src=product.image;image.alt='REMMIL '+product.name;image.width=760;image.height=760;image.loading='lazy';photo.append(image);
    const info=document.createElement('span');info.className='card-info';
    [['strong','card-name',product.name],['span','card-description',product.short],['span','card-price',model.formatPrice(product.price)]].forEach(([tag,className,text])=>{const el=document.createElement(tag);el.className=className;el.textContent=text;info.append(el);});
    const badge=document.createElement('span');badge.className='selected-badge';badge.textContent='Выбрано';card.append(photo,info,badge);$('#product-list').append(card);
  });
  // Populate all repeatable information from the same editable content file.
  $$('[data-product]').forEach(card=>{
    const product = products.find(p=>p.id===card.dataset.product);
    if (!product) { card.hidden=true; return; }
    card.querySelector('.card-name').textContent=product.name;
    card.querySelector('.card-description').textContent=product.short;
    card.querySelector('.card-price').textContent=model.formatPrice(product.price);
    card.querySelector('img').src=product.image;
    card.addEventListener('click',()=>renderProduct(product,true));
  });
  const comparison = $('#comparison-body'); comparison.replaceChildren();
  products.forEach(product=>{
    const row=document.createElement('tr');
    [product.comparisonName||product.name,product.comparisonPurpose,product.composition,product.comparisonPackaging||product.packaging].forEach((value,index)=>{
      const cell=document.createElement(index===0?'th':'td'); if(index===0) cell.scope='row';else cell.dataset.label=['','Назначение','Состав','Фасовка'][index]; cell.textContent=value; row.append(cell);
    }); comparison.append(row);
  });
  renderProduct(model.selectProduct(products,selectedId),false);
  $('.demo-caption').textContent=config.pricesAreDemo?(config.phoneIsDemo?'Цены и телефон указаны для примера.':'Цены указаны для примера.'):(config.phoneIsDemo?'Телефон указан для примера.':'');
  $('.demo-caption').hidden=!$('.demo-caption').textContent;
  $$('.price-caption').forEach(el=>{el.hidden=!config.pricesAreDemo;el.textContent=config.pricesAreDemo?'Пример цены':'';});
  $$('[data-phone]').forEach(link=>{
    const span = link.querySelector('span'); if(span) span.textContent=config.phone; else link.textContent=config.phone;
    link.href=config.phoneIsDemo?'#callback':model.phoneHref(config.phone);
  });
  $$('[data-phone-action]').forEach(link=>link.href=config.phoneIsDemo?'#callback':model.phoneHref(config.phone));
  $$('[data-category]').forEach(button=>button.addEventListener('click',()=>applyCategory(button.dataset.category,false)));
  $$('[data-detail-tab]').forEach(button=>button.addEventListener('click',()=>activateTab(button.dataset.detailTab,false)));
  function tabKeyboard(event,buttons,activate) {
    const keys=['ArrowRight','ArrowLeft','Home','End']; if(!keys.includes(event.key)) return;
    const index=buttons.indexOf(event.target); if(index<0) return;
    event.preventDefault(); let next=index;
    if(event.key==='Home') next=0; else if(event.key==='End') next=buttons.length-1;
    else next=(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    activate(buttons[next]);
  }
  $('.category-tabs').addEventListener('keydown',event=>tabKeyboard(event,$$('[data-category]'),b=>applyCategory(b.dataset.category,true)));
  $('.detail-tabs').addEventListener('keydown',event=>tabKeyboard(event,$$('[data-detail-tab]'),b=>activateTab(b.dataset.detailTab,true)));
  $$('[data-document-link]').forEach(link=>link.addEventListener('click',()=>activateTab('documents',false)));
  $$('.faq-item button').forEach(button=>button.addEventListener('click',()=>{
    const item=button.closest('.faq-item'); const open=!item.classList.contains('is-open');
    item.classList.toggle('is-open',open); button.setAttribute('aria-expanded',String(open));
    $('#' + button.getAttribute('aria-controls')).setAttribute('aria-hidden',String(!open));
  }));

  const form=$('#callback');
  window.RemmilPhoneMask($('#lead-phone'));
  function setFieldError(input,error){
    input.setAttribute('aria-invalid',String(Boolean(error)));
    const host=$('#'+input.name+'-error');if(host.textContent!==(error||''))host.textContent=error||'';
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const name=$('#lead-name'), phone=$('#lead-phone'); const result=model.validateLead(name.value,phone.value);
    [name,phone].forEach(input=>setFieldError(input,result.errors[input.name]||''));
    const consent=$('#lead-consent'),consentError=$('#consent-error');
    consent.setAttribute('aria-invalid',String(!consent.checked));consentError.textContent=consent.checked?'':'Подтвердите отдельное согласие на обработку данных для ответа на обращение.';
    const status=$('#form-status'); status.textContent='';
    if(!result.valid){(result.errors.name?name:phone).focus();return;}
    if(!consent.checked){consent.focus();return;}
    if(!config.formEndpoint){status.textContent='Форма работает в режиме демонстрации. Заявка не отправлена.';return;}
    const button=form.querySelector('button'); button.disabled=true;form.setAttribute('aria-busy','true');status.textContent='Отправляем заявку…';
    try {
      const response=await fetch(config.formEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.value.trim().replace(/\s+/g,' '),phone:model.phoneHref(phone.value).slice(4),product:selectedId,consent:{accepted:true,version:window.REMMIL_LEGAL.version,document:new URL('consent.html',location.href).href,acceptedAt:new Date().toISOString()}})});
      if(!response.ok)throw new Error('Request failed');
      status.textContent='Заявка отправлена. Менеджер свяжется с вами.';form.reset();
    } catch {status.textContent='Не удалось отправить заявку. Попробуйте ещё раз или позвоните менеджеру.';}
    finally{button.disabled=false;form.removeAttribute('aria-busy');}
  });
  $('#lead-consent').addEventListener('change',()=>{const input=$('#lead-consent');input.setAttribute('aria-invalid',String(!input.checked));$('#consent-error').textContent=input.checked?'':'Подтвердите согласие перед отправкой.';});
  form.querySelectorAll('input[name=name],input[name=phone]').forEach(input=>{
    input.addEventListener('blur',()=>{const result=model.validateLead($('#lead-name').value,$('#lead-phone').value);setFieldError(input,result.errors[input.name]||'');});
    input.addEventListener('input',()=>{const result=model.validateLead($('#lead-name').value,$('#lead-phone').value);if(input.getAttribute('aria-invalid')==='true')setFieldError(input,result.errors[input.name]||'');$('#form-status').textContent='';});
  });
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  if(!reduced.matches&&matchMedia('(hover:hover) and (pointer:fine)').matches){
    $$('.order-step').forEach(card=>{
      let frame=0,point=null;
      card.addEventListener('pointermove',event=>{
        point={x:event.clientX,y:event.clientY};if(frame)return;
        frame=requestAnimationFrame(()=>{frame=0;const box=card.getBoundingClientRect();const x=Math.max(0,Math.min(1,(point.x-box.left)/box.width)),y=Math.max(0,Math.min(1,(point.y-box.top)/box.height));card.style.setProperty('--tilt-x',((.5-y)*4).toFixed(2)+'deg');card.style.setProperty('--tilt-y',((x-.5)*4).toFixed(2)+'deg');card.style.setProperty('--light-x',(x*100).toFixed(1)+'%');card.style.setProperty('--light-y',(y*100).toFixed(1)+'%');});
      });
      card.addEventListener('pointerleave',()=>{if(frame)cancelAnimationFrame(frame);frame=0;card.style.setProperty('--tilt-x','0deg');card.style.setProperty('--tilt-y','0deg');});
    });
  }
  if('IntersectionObserver' in window&&!reduced.matches){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target);}}),{threshold:.07});
    $$('[data-reveal]').forEach(el=>{el.classList.add('reveal-ready');observer.observe(el);});
  }
})();
