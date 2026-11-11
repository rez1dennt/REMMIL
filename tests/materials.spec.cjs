const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('remmil_privacy_choice',JSON.stringify({version:'2026-11-10',remember:true,expiresAt:Date.now()+86400000})));
});

test('brand document remains available for every product with a readable preview and original PDF',async({page})=>{
  await page.goto('/');
  for(const product of ['mc90','b90','primer']){
    await page.locator('[data-product="'+product+'"]').click();
    await page.locator('#tab-documents').click();
    await expect(page.locator('.trademark-document')).toContainText('№ 1251523');
    await expect(page.locator('.trademark-document')).toContainText('товарного знака');
    const preview=page.locator('.trademark-preview img');
    await expect(preview).toBeVisible();
    expect(await preview.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  }
  const image=page.locator('[data-trademark-image]');
  const response=await page.request.get(await image.getAttribute('href'));
  expect(response.ok()).toBe(true);expect(response.headers()['content-type']).toContain('image/jpeg');
  const downloadEvent=page.waitForEvent('download');
  await page.locator('[data-trademark-pdf]').click();
  const download=await downloadEvent;
  expect(download.suggestedFilename()).toBe('REMMIL-trademark-1251523.pdf');
  const original=fs.readFileSync(path.join(__dirname,'../assets/documents/remmil-trademark-1251523.pdf'));
  expect(fs.readFileSync(await download.path()).equals(original)).toBe(true);
});

test('registered logo and document controls fit desktop, tablet and narrow screens',async({page})=>{
  for(const width of [1280,768,360,320]){
    await page.setViewportSize({width,height:900});await page.goto('/');
    const logos=page.locator('.wordmark img');await expect(logos).toHaveCount(2);
    for(const logo of await logos.all())expect(await logo.evaluate(img=>img.complete&&img.naturalWidth>=600)).toBe(true);
    const document=page.locator('.trademark-document');await document.scrollIntoViewIfNeeded();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const box=await document.boundingBox();
    for(const control of await document.locator('a').all()){
      const target=await control.boundingBox();
      expect(target.x).toBeGreaterThanOrEqual(box.x-1);expect(target.x+target.width).toBeLessThanOrEqual(box.x+box.width+1);
    }
  }
});
