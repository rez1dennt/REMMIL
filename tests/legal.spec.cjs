const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
test('privacy choice does not enable trackers or save form data',async({page})=>{
  await page.goto('/');await expect(page.getByRole('region',{name:'Cookie и конфиденциальность'})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
  await page.getByRole('button',{name:'Не сохранять',exact:true}).click();
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
  await expect(page.locator('#privacy-banner')).toBeHidden();
  await page.getByRole('button',{name:'Настройки cookie',exact:true}).click();
  await page.getByRole('button',{name:'Сохранить выбор',exact:true}).click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('remmil_privacy_choice')));expect(saved.version).toBe('2026-11-12');
  await page.reload();await expect(page.locator('#privacy-banner')).toBeHidden();
  expect(await page.evaluate(()=>document.cookie)).toBe('');
});
test('personal data consent is separate, unchecked and required',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Не сохранять',exact:true}).click();
  await expect(page.locator('#lead-consent')).not.toBeChecked();
  await page.locator('#lead-name').fill('Анна');await page.locator('#lead-phone').fill('9991234567');await page.locator('#callback button[type=submit]').click();
  await expect(page.locator('#consent-error')).toContainText('Подтвердите');
  await page.locator('#lead-consent').check();await page.locator('#callback button[type=submit]').click();await expect(page.locator('#form-status')).toContainText('Заявка не отправлена');
});
test('privacy banner fits 320px and survives blocked storage',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError');}});});
  await page.setViewportSize({width:320,height:700});await page.goto('/');
  await expect(page.locator('#privacy-banner')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Сохранить выбор',exact:true}).click();await expect(page.locator('#privacy-banner')).toBeHidden();
});
test('expired privacy preferences are removed and requested again',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('remmil_privacy_choice',JSON.stringify({version:'2026-11-12',expiresAt:Date.now()-1})));
  await page.goto('/');await expect(page.locator('#privacy-banner')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('remmil_privacy_choice'))).toBe(null);
});
test('a request is gated by consent and includes its version and timestamp',async({page})=>{
  let requests=0,payload;
  await page.route('**/js/content.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace("formEndpoint: 'api/lead.php'","formEndpoint: '/test-request'")});});
  await page.route('**/test-request',async route=>{requests++;payload=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
  await page.goto('/');await page.getByRole('button',{name:'Не сохранять',exact:true}).click();
  await page.locator('#lead-name').fill('Анна');await page.locator('#lead-phone').fill('9991234567');await page.locator('#callback button[type=submit]').click();expect(requests).toBe(0);
  await page.locator('#lead-consent').check();await page.locator('#callback button[type=submit]').click();await expect(page.locator('#form-status')).toContainText('Заявка отправлена');
  expect(requests).toBe(1);expect(payload.phone).toBe('+79991234567');expect(payload.consent.accepted).toBe(true);expect(payload.consent.version).toBe('2026-11-12');expect(payload.consent.document).toContain('/consent.html');expect(Number.isFinite(Date.parse(payload.consent.acceptedAt))).toBe(true);
});
for(const route of ['privacy.html','consent.html','cookies.html','requisites.html']){
  test(route+' is readable, linked and accessible',async({page})=>{
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:900});await page.goto('/'+route);await page.getByRole('button',{name:'Не сохранять',exact:true}).click();
      await expect(page.locator('h1')).toHaveCount(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await expect(page.locator('main')).toContainText('Рыкова Ольга Владимировна');
      const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();expect(result.violations).toEqual([]);
    }
  });
}
