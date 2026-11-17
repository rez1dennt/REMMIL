const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('remmil_privacy_choice',JSON.stringify({version:'2026-11-12',remember:true,expiresAt:Date.now()+86400000})));});
test('B90 presents both components and resets its gallery when changing product',async({page})=>{
  await page.goto('/');
  await expect(page.locator('#detail-packaging')).toHaveText('А · 9 кг + Б · 1 кг');
  const thumbnails=page.locator('#product-gallery button');
  await expect(thumbnails).toHaveCount(2);
  await thumbnails.nth(1).click();
  await expect(page.locator('#detail-image')).toHaveAttribute('src','assets/b90-component-b-cutout.png');
  await expect(thumbnails.nth(1)).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#gallery-caption')).toHaveText('Компонент Б · 1 кг');
  for(const photo of [page.locator('#detail-image'),page.locator('#product-gallery img').nth(1)]){
    const image=await photo.evaluate(async img=>{
      await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
      return {fit:getComputedStyle(img).objectFit,alpha:[[0,0],[canvas.width-1,0],[0,canvas.height-1],[canvas.width-1,canvas.height-1]].map(([x,y])=>ctx.getImageData(x,y,1,1).data[3])};
    });
    expect(image.alpha).toEqual([0,0,0,0]);expect(image.fit).toBe('contain');
  }
  await page.locator('#description-sections summary').filter({hasText:'Состав'}).click();
  await expect(page.locator('#description-sections details[open]')).toContainText('полиизоцианат');
  await page.locator('[data-product="mc90"]').click();
  await expect(page.locator('#product-gallery')).toBeHidden();
  await page.locator('[data-product="b90"]').click();
  await expect(page.locator('#detail-image')).toHaveAttribute('src','assets/b90.webp');
  await expect(page.locator('#description-sections details[open]')).toHaveCount(0);
});
test('M1X has no price, factual description, actual inner packaging and its own document',async({page})=>{
  await page.goto('/');await page.locator('[data-product="berger-m1x"]').click();
  await expect(page.locator('#detail-title')).toHaveText('BergerBond M1X');
  await expect(page.locator('#detail-packaging')).toHaveText('21 кг · 3 пакета по 7 кг');
  for(const photo of [page.locator('[data-product="berger-m1x"] img'),page.locator('#detail-image'),page.locator('#product-gallery img').first()]){
    const image=await photo.evaluate(async img=>{
      await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
      return {fit:getComputedStyle(img).objectFit,alpha:[[0,0],[canvas.width-1,0],[0,canvas.height-1],[canvas.width-1,canvas.height-1]].map(([x,y])=>ctx.getImageData(x,y,1,1).data[3])};
    });
    expect(image.alpha).toEqual([0,0,0,0]);expect(image.fit).toBe('contain');
  }
  await expect(page.locator('#detail-price')).toBeHidden();
  await expect(page.locator('[data-product="berger-m1x"] .card-price')).toBeHidden();
  await expect(page.locator('#product-detail')).not.toContainText('Цена по запросу');
  await expect(page.locator('#product-consumption')).toContainText('900–1 400 г/м²');
  await expect(page.locator('#description-sections details[open]')).toHaveCount(0);
  await page.locator('#product-gallery button').nth(1).focus();await page.keyboard.press('Enter');
  await expect(page.locator('#detail-image')).toHaveAttribute('src','assets/bergerbond-m1x-inside.webp');
  await page.locator('#tab-documents').click();
  await expect(page.locator('.trademark-document')).toBeHidden();
  await expect(page.locator('#product-documents a')).toHaveAttribute('href',/BergerBond_M1X_TM_EN\.pdf$/);
  await page.locator('[data-product="b90"]').click();
  await expect(page.locator('.trademark-document')).toBeVisible();
  await expect(page.locator('#detail-price')).toHaveText(/6\s750\s₽/);
});
for(const width of [1280,768,360,320])test('updated catalogue and manager at '+width,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/');
  await expect(page.locator('.product-card')).toHaveCount(4);
  await expect(page.locator('[data-phone]').first()).toHaveAttribute('href','tel:+79259268560');
  await expect(page.locator('.manager')).toContainText('Иван');
  await page.locator('[data-product="berger-m1x"]').click();
  await expect(page.locator('.manager a')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#product-detail').scrollIntoViewIfNeeded();
  await expect.poll(()=>page.locator('#product-detail img').evaluateAll(images=>images.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src))).toEqual([]);
});
