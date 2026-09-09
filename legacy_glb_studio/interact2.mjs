import { chromium } from 'playwright-core';
import fs from 'fs';
function centerStats(pngPath) {
  // quick: crop center 60% and return % of pixels > luminance 60 & count of reddish pixels
  const { execSync } = require('child_process');
}
// use PNG via python for reliable stats
import { execSync } from 'child_process';
const FILES = ['ADVANCED_MULTI_MODEL_VIEWER.html','ULTIMATE_VIEWER.html','STANDALONE_VIEWER.html','ENHANCED_VIEWER.html','FINAL_ULTIMATE_VIEWER.html','ABSOLUTE_FINAL_VIEWER.html','ULTIMATE_SPECIAL_VIEWER.html'];
const browser = await chromium.launch({ headless:true, args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
function stats(p){ const r = execSync(`python3 /home/user/imgstats.py "${p}"`).toString().trim(); const [a,b]=r.split(' ').map(Number); return {lit:a, orange:b}; }
for (const file of FILES) {
  const page = await (await browser.newContext({ viewport:{width:1280,height:800} })).newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('file:///home/user/unzipped/'+file,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2000);
  await page.setInputFiles('#file','/home/user/unzipped/test-model.glb');
  await page.waitForTimeout(5000);
  const name = file.replace('.html','');
  // click the model row if present
  const clicked = await page.evaluate(() => {
    const items=[...document.querySelectorAll('li, .model-item, [class*="model"]')];
    const el = items.find(e=>/test-model/.test(e.textContent||'') && e.offsetParent!==null);
    if(!el) return 'no-li';
    // click the row itself (not the eye/delete buttons)
    el.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    return 'clicked-li';
  }).catch(e=>'err:'+e.message);
  await page.waitForTimeout(3000);
  const p=`/home/user/shots/step2_${name}.png`;
  await page.screenshot({path:p});
  const s=stats(p);
  console.log(`${file} | click:${clicked} | canvas-lit%:${s.lit} orange%:${s.orange} | errs:${errs.length?errs.slice(0,3).join(' ;; '):'none'}`);
  await page.close();
}
await browser.close();
