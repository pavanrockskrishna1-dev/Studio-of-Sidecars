import { chromium } from 'playwright-core';
const FILES = ['STANDALONE_VIEWER.html','ENHANCED_VIEWER.html','ADVANCED_MULTI_MODEL_VIEWER.html','ULTIMATE_VIEWER.html','FINAL_ULTIMATE_VIEWER.html','ABSOLUTE_FINAL_VIEWER.html','ULTIMATE_SPECIAL_VIEWER.html'];
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
for (const file of FILES) {
  const page = await (await browser.newContext({ viewport:{width:1280,height:800} })).newPage();
  await page.goto('file:///home/user/unzipped/'+file, { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(2200);
  await page.setInputFiles('#file', '/home/user/unzipped/test-model.glb');
  await page.waitForTimeout(6000);
  const info = await page.evaluate(() => {
    const txt = document.body.innerText.replace(/\s+/g,' ');
    const canvas = [...document.querySelectorAll('canvas')].map(c=>({cls:c.className, id:c.id, w:c.width,h:c.height})).length;
    const findName = txt.includes('test-model') || txt.includes('test-model.glb') || /test-model/.test(txt);
    // grab likely status / list items
    const lis = [...document.querySelectorAll('li')].map(l=>l.innerText.trim()).filter(t=>t.includes('test-model')||t.includes('glb'));
    return {
      hasCanvas: canvas,
      bodyTextSnippet: txt.slice(0, 300),
      mentionInLi: lis,
      hasModelNameInText: findName,
    };
  });
  console.log(`\n===== ${file} =====`);
  console.log(JSON.stringify(info, null, 1));
  await page.close();
}
await browser.close();
