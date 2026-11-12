const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
test.beforeEach(async({page})=>{await page.addInitScript(()=>{try{localStorage.setItem('remmil_privacy_choice',JSON.stringify({version:'2026-11-12',remember:true,expiresAt:Date.now()+86400000}));}catch{}});});
for(const width of [1440,1280,1024,900,768,600,390,360,320]){
  test('layout and resources at '+width+'px',async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewportSize({width,height:900});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
    await expect(page.locator('h1')).toHaveText('Основапрочных решений');
    const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),headerPosition:getComputedStyle(document.querySelector('header')).position}));
    expect(layout.overflow).toBe(false);expect(layout.broken).toEqual([]);expect(layout.headerPosition).toBe('fixed');expect(errors).toEqual([]);
    await page.screenshot({path:'qa/viewport-'+width+'.png',fullPage:true});
  });
}
test('category, product selection, inner tabs and keyboard navigation',async({page})=>{
  await page.goto('/');await page.locator('[data-category="primers"]').click();
  await expect(page.locator('.product-card:visible')).toHaveCount(1);
  await expect(page.locator('#detail-title')).toHaveText('Полиуретановая грунтовка');
  await page.locator('[data-category="adhesives"]').click();await expect(page.locator('.product-card:visible')).toHaveCount(2);
  await page.locator('[data-product="mc90"]').click();await expect(page.locator('#detail-title')).toHaveText('МС-90');
  await expect(page.locator('#tab-specifications')).toHaveCount(0);await expect(page.locator('#panel-description')).toBeVisible();
  await expect(page.locator('#product-consumption')).toContainText('900–1 400 г/м²');
  await page.locator('#tab-description').focus();
  await page.keyboard.press('ArrowRight');await expect(page.locator('#tab-documents')).toBeFocused();await expect(page.locator('#panel-documents')).toBeVisible();
  await page.locator('[data-product="b90"]').click();await expect(page.locator('#detail-packaging')).toHaveText('Компонент А · 9 кг');
});

test('expanded descriptions keep purpose, consumption, composition and application specific to each product',async({page})=>{
  await page.goto('/');await expect(page.locator('#tab-description')).toHaveAttribute('aria-selected','true');
  for(const [id,consumption,composition] of [['mc90','900–1 400 г/м²','Гибридный предполимер'],['b90','800–1 300 г/м²','Гибридный полимер'],['primer','100–250 г/м²','Полиуретановая основа']]){
    await page.locator('[data-product="'+id+'"]').click();
    await expect(page.locator('#consumption-value')).toHaveText(consumption);
    await expect(page.locator('#description-sections')).toContainText(composition);
    for(const title of ['Для каких работ','Состав','Подготовка основания','Нанесение','Хранение'])await expect(page.locator('#description-sections').getByRole('heading',{name:title,exact:true})).toBeVisible();
  }
  await expect(page.locator('#consumption-notes')).toContainText('Не более 250 г/м² на один слой');
  await page.locator('#tab-documents').click();await expect(page.locator('#panel-documents')).toBeVisible();
  await page.locator('#tab-description').click();await expect(page.locator('#consumption-value')).toHaveText('100–250 г/м²');
});

test('product information starts compact and disclosures remain usable with the certificate tab',async({page})=>{
  await page.goto('/');
  await expect(page.locator('#description-sections details')).toHaveCount(7);
  await expect(page.locator('#description-sections details[open]')).toHaveCount(0);
  const first=page.locator('#description-sections details').first();
  await first.locator('summary').click();await expect(first).toHaveAttribute('open','');
  const second=page.locator('#description-sections details').nth(1);await second.locator('summary').click();
  await expect(second).toHaveAttribute('open','');await expect(first).not.toHaveAttribute('open','');
  await page.locator('#tab-documents').click();await expect(page.locator('#panel-documents')).toBeVisible();await expect(page.locator('#panel-description')).toBeHidden();
  await page.locator('#tab-description').click();await expect(page.locator('#product-consumption')).toBeVisible();
  await page.locator('[data-product="mc90"]').click();await expect(page.locator('#description-sections details[open]')).toHaveCount(0);
});

test('page versions every local stylesheet and script to prevent stale asset combinations',async({page})=>{
  await page.goto('/');
  const urls=await page.locator('script[src],link[rel=stylesheet]').evaluateAll(items=>items.map(el=>el.getAttribute('src')||el.getAttribute('href')));
  expect(urls.length).toBeGreaterThan(5);
  const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
  for(const url of urls){expect(url).toMatch(/\?v=[a-f0-9]{12}$/);const [asset,hash]=url.split('?v=');expect(hash).toBe(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',asset))).digest('hex').slice(0,12));}
});

test('certificate deep links open the correct tab after navigating from another page',async({page})=>{
  await page.goto('/privacy.html');await page.locator('.desktop-nav [data-document-link]').click();
  await expect(page.locator('#tab-documents')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#panel-documents')).toBeVisible();await expect(page.locator('#panel-description')).toBeHidden();
  expect((await page.locator('#documents').boundingBox()).y).toBeGreaterThanOrEqual(60);
});
for(const width of [768,390,360,320]){
  test('menu preserves page geometry and scroll '+width,async({page})=>{
    await page.setViewportSize({width,height:800});await page.goto('/');await page.evaluate(()=>scrollTo(0,500));
    const before=await page.evaluate(()=>({y:scrollY,x:document.querySelector('.wordmark').getBoundingClientRect().x,menu:document.querySelector('.menu-toggle').getBoundingClientRect().x}));
    await page.locator('.menu-toggle').click();await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded','true');
    const open=await page.evaluate(()=>({y:scrollY,x:document.querySelector('.wordmark').getBoundingClientRect().x,menu:document.querySelector('.menu-toggle').getBoundingClientRect().x}));
    expect(Math.abs(open.y-before.y)).toBeLessThanOrEqual(1);expect(Math.abs(open.x-before.x)).toBeLessThanOrEqual(1);expect(Math.abs(open.menu-before.menu)).toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape');await expect(page.locator('.menu-toggle')).toBeFocused();await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded','false');
    expect(await page.evaluate(()=>scrollY)).toBe(before.y);
    await page.locator('.menu-toggle').click();await page.locator('#mobile-navigation a[href="#comparison"]').click();
    await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded','false');
    const target=await page.locator('#comparison').boundingBox();expect(target.y).toBeGreaterThanOrEqual(60);
  });
}
test('FAQ and honest form states',async({page})=>{
  await page.goto('/');await page.locator('#faq-question-2').click();await expect(page.locator('#faq-question-2')).toHaveAttribute('aria-expanded','true');
  await expect.poll(async()=>(await page.locator('#faq-answer-2').boundingBox()).height).toBeGreaterThan(10);
  await page.locator('#faq-question-2').click();await expect.poll(async()=>(await page.locator('#faq-answer-2').boundingBox()).height).toBeLessThan(1);
  await page.locator('#callback button').click();await expect(page.locator('#lead-name')).toHaveAttribute('aria-invalid','true');
  await page.locator('#lead-name').fill('Анна');await page.locator('#lead-phone').fill('+7 999 123 45 67');await page.locator('#lead-consent').check();await page.locator('#callback button[type=submit]').click();
  await expect(page.locator('#form-status')).toContainText('Заявка не отправлена');
});
test('FAQ starts fully closed and opens by keyboard',async({page})=>{
  await page.goto('/');await expect(page.locator('.faq-item button[aria-expanded=true]')).toHaveCount(0);
  for(const panel of await page.locator('.faq-panel').all())expect((await panel.boundingBox()).height).toBeLessThan(1);
  await page.locator('#faq-question-1').focus();await page.keyboard.press('Enter');await expect(page.locator('#faq-question-1')).toHaveAttribute('aria-expanded','true');
  await expect.poll(async()=>(await page.locator('#faq-answer-1').boundingBox()).height).toBeGreaterThan(10);
  await page.keyboard.press('Enter');await expect(page.locator('#faq-question-1')).toHaveAttribute('aria-expanded','false');
});
test('ordering steps lead to their real page sections',async({page})=>{
  await page.goto('/');await page.locator('.order-step[href="#catalog"]').click();
  expect((await page.locator('#catalog').boundingBox()).y).toBeGreaterThanOrEqual(60);
  await page.locator('.order-step[href="#callback"]').click();await expect(page.locator('#lead-phone')).toBeInViewport();
});
test('WCAG accessibility scan desktop and mobile',async({page})=>{
  for(const width of [1280,360]){await page.setViewportSize({width,height:900});await page.goto('/');const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();expect(result.violations).toEqual([]);}
});
test('menu closing animation reaches the final state with motion enabled',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:390,height:844});await page.goto('/');
  await page.locator('.menu-toggle').click();await expect(page.locator('#mobile-navigation')).toHaveCSS('opacity','1');
  await page.locator('.menu-toggle').click();await expect(page.locator('#mobile-navigation')).toBeHidden();expect(await page.evaluate(()=>document.body.classList.contains('menu-open'))).toBe(false);
});
test('mobile comparison product names use the full card width',async({page})=>{
  await page.setViewportSize({width:320,height:800});await page.goto('/');
  const box=await page.locator('.comparison-table tbody th').first().boundingBox();expect(box.width).toBeGreaterThan(200);
});
test('an additional product from content is selectable without markup changes',async({page})=>{
  await page.route('**/js/content.js*',async route=>{const response=await route.fetch();const body=await response.text();await route.fulfill({response,body:body+'\nREMMIL_CONTENT.products.push({...REMMIL_CONTENT.products[0],id:"test-product",name:"Тестовая позиция"});'});});
  await page.goto('/');await expect(page.locator('.product-card')).toHaveCount(4);await page.locator('[data-product="test-product"]').click();await expect(page.locator('#detail-title')).toHaveText('Тестовая позиция');
});
test('all local assets and fragment links resolve',async({page})=>{
  const failed=[];page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});await page.goto('/');
  const missing=await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href').slice(1)).filter(id=>id&&!document.getElementById(id)));
  expect(missing).toEqual([]);expect(failed).toEqual([]);
  expect(await page.locator('h1').count()).toBe(1);
  const sameColor=await page.locator('.product-card').first().evaluate(el=>getComputedStyle(el.querySelector('.card-price')).color===getComputedStyle(el.querySelector('.card-description')).color);expect(sameColor).toBe(true);
});
test('phone mask supports typing, partial deletion and clearing',async({page})=>{
  await page.goto('/');const phone=page.locator('#lead-phone');await phone.pressSequentially('9991234567');await expect(phone).toHaveValue('+7 (999) 123-45-67');
  await phone.fill('+7 (999)');await phone.press('End');await phone.press('Backspace');await expect(phone).toHaveValue('+7 (99');
  await phone.press('ControlOrMeta+A');await phone.press('Backspace');await expect(phone).toHaveValue('');
});
test('backspace and delete cross punctuation without trapping the cursor',async({page})=>{
  await page.goto('/');const phone=page.locator('#lead-phone');await phone.fill('+7 (999) 123-45-67');
  await phone.evaluate(el=>{el.focus();el.setSelectionRange(9,9);});await phone.press('Backspace');await expect(phone).toHaveValue('+7 (991) 234-56-7');
  expect(await phone.evaluate(el=>el.selectionStart)).toBe(6);
  await phone.fill('+7 (999) 123-45-67');await phone.evaluate(el=>el.setSelectionRange(7,7));await phone.press('Delete');await expect(phone).toHaveValue('+7 (999) 234-56-7');
});
test('phone paste, selection replacement, autofill and undo work',async({page})=>{
  await page.goto('/');const phone=page.locator('#lead-phone');
  await phone.evaluate(el=>{el.focus();const data=new DataTransfer();data.setData('text/plain','8 999 123 45 67');el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));});
  await expect(phone).toHaveValue('+7 (999) 123-45-67');
  await phone.evaluate(el=>el.setSelectionRange(4,7));await phone.pressSequentially('495');await expect(phone).toHaveValue('+7 (495) 123-45-67');
  await phone.press('ControlOrMeta+Z');await expect(phone).toHaveValue('+7 (491) 234-56-7');
  await phone.fill('89991234567');await expect(phone).toHaveValue('+7 (999) 123-45-67');
});
test('validation on blur accepts a real-looking number and rejects invalid fields',async({page})=>{
  await page.goto('/');await page.locator('#lead-name').fill('123');await page.locator('#lead-phone').focus();await expect(page.locator('#lead-name')).toHaveAttribute('aria-invalid','true');
  await page.locator('#lead-name').fill('Анна-Мария');await page.locator('#lead-phone').fill('+7 (000) 000-00-00');await page.locator('#lead-name').focus();await expect(page.locator('#lead-phone')).toHaveAttribute('aria-invalid','true');
  await page.locator('#lead-phone').fill('9991234567');await page.locator('#lead-consent').check();await page.locator('#callback button[type=submit]').click();await expect(page.locator('#form-status')).toContainText('Заявка не отправлена');
});
