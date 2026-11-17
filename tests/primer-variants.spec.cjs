const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('remmil_privacy_choice',JSON.stringify({version:'2026-11-12',remember:true,expiresAt:Date.now()+86400000})));});
for(const width of [1280,768,360,320])test('Primer P packaging changes image and price at '+width,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');
 await expect(page.locator('[data-product="berger-primer-p"]')).toHaveCount(1);await page.locator('[data-product="berger-primer-p"]').click();
 await expect(page.locator('#detail-title')).toHaveText('BergerBond Primer P');
 await expect(page.locator('#detail-packaging')).toHaveText('1,1 кг');await expect(page.locator('#detail-price')).toHaveText(/5\s250\s₽/);
 await expect(page.locator('#variant-options button')).toHaveCount(2);
 const large=page.locator('[data-variant="berger-primer-p-55"]');await large.click();
 await expect(large).toHaveAttribute('aria-pressed','true');await expect(large).toBeFocused();
 await expect(page.locator('#detail-packaging')).toHaveText('5,5 кг');await expect(page.locator('#detail-price')).toHaveText(/22\s650\s₽/);
 const priceBox=await page.locator('#detail-price').evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);const r=range.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}),managerBox=await page.locator('.manager').boundingBox();
 expect(priceBox.x+priceBox.width<=managerBox.x||priceBox.y+priceBox.height<=managerBox.y||managerBox.y+managerBox.height<=priceBox.y).toBe(true);
 await expect(page.locator('#detail-image')).toHaveAttribute('src','assets/berger-primer-p-55.webp');await page.locator('#detail-image').evaluate(img=>img.decode());
 await expect(page.locator('#consumption-value')).toHaveText('100–130 г/м²');await expect(page.locator('#description-sections details[open]')).toHaveCount(0);
 if(width===1280||width===320){const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();expect(scan.violations).toEqual([]);}
 await page.locator('#tab-documents').click();await expect(page.locator('.trademark-document')).toBeHidden();await expect(page.locator('#product-documents a')).toHaveAttribute('href',/BergerBond_Primer_P_TM_EN\.pdf$/);
 await page.locator('[data-product="mc90"]').click();await expect(page.locator('#product-variants')).toBeHidden();
 await page.locator('[data-product="berger-primer-p"]').click();await expect(page.locator('#detail-packaging')).toHaveText('5,5 кг');
 const small=page.locator('[data-variant="berger-primer-p-11"]');await small.focus();await page.keyboard.press('Enter');
 await expect(page.locator('#detail-price')).toHaveText(/5\s250\s₽/);await expect(page.locator('#detail-image')).toHaveAttribute('src','assets/berger-primer-p-11.webp');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('lead submits the selected packaging rather than the family identifier',async({page})=>{
 let payload;await page.route('**/api/lead.php',async route=>{payload=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
 await page.goto('/');await page.locator('[data-product="berger-primer-p"]').click();await page.locator('[data-variant="berger-primer-p-55"]').click();
 await page.locator('#lead-name').fill('Анна');await page.locator('#lead-phone').fill('9991234567');await page.locator('#lead-consent').check();await page.locator('#callback button[type=submit]').click();
 await expect(page.locator('#form-status')).toContainText('Заявка отправлена');expect(payload.product).toBe('berger-primer-p-55');
});
test('MC90 explains its two inner 5 kg bags',async({page})=>{
 await page.goto('/');await page.locator('[data-product="mc90"]').click();
 await expect(page.locator('#product-description-text')).toContainText('два пакета по 5 кг');await expect(page.locator('#detail-packaging')).toContainText('2 пакета по 5 кг');
});
