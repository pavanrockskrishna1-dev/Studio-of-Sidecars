import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0])); page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,150));});
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
for (const ms of [1500, 2500, 5000]) {
  await page.waitForTimeout(ms);
  const st = await page.evaluate(() => {
    const sp = document.getElementById('sosSplash');
    return { exists: !!sp, cls: sp ? sp.className : null, navHost: !!document.getElementById('soNavHost'), navBtns: document.querySelectorAll('#soNavHost .so-nav-btn').length, shell: !!window.__shell };
  });
  console.log(ms, JSON.stringify(st));
}
console.log('ERRS', errs.length?errs:'NONE');
await browser.close();
