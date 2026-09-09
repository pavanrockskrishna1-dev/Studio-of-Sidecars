import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0,200)); });
page.on('pageerror', e => errors.push('PAGEERR ' + e.message.split('\n')[0]));
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(7000);
const r = await page.evaluate(() => {
  const cs = (id) => { const el = document.getElementById(id); return el ? { d: getComputedStyle(el).display, top: getComputedStyle(el).top, vis: getComputedStyle(el).visibility } : null; };
  return {
    title: document.title,
    splashGone: !document.getElementById('sosSplash'),
    brand: !!document.getElementById('appBrand') && (document.getElementById('soTitle')||{}).textContent,
    actions: ['tbUndo','tbRedo','tbSave','tbExport','tbSettings'].filter(id=>document.getElementById(id)).length,
    nav: document.querySelectorAll('#soNav .so-nav-btn').length,
    inspector: !!document.getElementById('inspector') && cs('inspector').top,
    dock: !!document.getElementById('dock') && document.querySelectorAll('#dock .dk-btn').length,
    floatHidden: cs('floatBar').d === 'none',
    chips: document.querySelectorAll('#topbar .vchip').length,
    panelTop: cs('panel').top,
    bodyLight: document.body.classList.contains('so-light'),
  };
});
console.log('SHELL', JSON.stringify(r, null, 1));
console.log('ERRORS', errors.length ? errors : 'NONE');
await page.screenshot({ path: '/home/user/shots/polish_desktop.png' });
await page.evaluate(() => { const s = window.__studio.shell; s.openSettings('about'); });
await page.waitForTimeout(400);
await page.screenshot({ path: '/home/user/shots/polish_settings.png' });
await page.evaluate(() => { const b = document.getElementById('soClose'); if (b) b.click(); });
await page.waitForTimeout(200);
await page.evaluate(() => { window.__studio.activate('brandstudio'); });
await page.waitForTimeout(1400);
await page.screenshot({ path: '/home/user/shots/polish_v6.png' });
await browser.close();
