import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs=[]; page.on('pageerror',e=>errs.push('PE '+e.message.split('\n')[0])); page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,150));});
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => { try { localStorage.clear(); } catch(e){} });
await page.reload({ waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(2500);
const st = await page.evaluate(() => ({
  log: window.__shellLog || null,
  splash: (document.getElementById('sosSplash')||{}).className || 'removed',
  navKids: (document.getElementById('soNavHost')||{}).children ? document.getElementById('soNavHost').children.length : -1,
  dock: !!document.getElementById('dock'),
  settings: !!document.getElementById('sosOv'),
  save: !!document.getElementById('saveOv'),
  inspector: !!document.getElementById('inspector'),
  inSecs: document.querySelectorAll('#inBody .in-sec').length,
  devPerf: !!document.getElementById('devPerf'),
  devPanelShow: (document.getElementById('devPanel')||{}).className,
}));
console.log(JSON.stringify(st, null, 1));
console.log('ERRS', errs.length?errs:'NONE');
await browser.close();
