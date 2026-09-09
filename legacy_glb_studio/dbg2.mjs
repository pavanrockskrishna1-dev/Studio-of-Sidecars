import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs=[]; page.on('pageerror',e=>errs.push('PE '+e.message.split('\n')[0])); page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,150));});
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => { try { localStorage.clear(); } catch(e){} });
await page.reload({ waitUntil: 'load', timeout: 60000 });
for (const ms of [1200, 2600, 6000]) {
  await page.waitForTimeout(ms);
  const st = await page.evaluate(() => {
    const sp = document.getElementById('sosSplash');
    const host = document.getElementById('soNavHost');
    return { splash: sp ? sp.className : 'removed',
      navKids: host ? host.children.length : -1,
      navBtns: document.querySelectorAll('#soNav .so-nav-btn').length,
      inspector: !!document.getElementById('inspector'),
      inSecs: document.querySelectorAll('#inBody .in-sec').length,
      shellOK: !!window.__shell };
  });
  console.log(ms, JSON.stringify(st));
}
console.log('ERRS', errs.length?errs:'NONE');
await page.screenshot({ path: '/home/user/shots/dbg2.png' });
await browser.close();
