import { chromium } from 'playwright-core';

const URL = 'file:///home/user/viewer_src/dist/index.html';
const ARGS = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'];
let pass = 0, fail = 0;
const results = [];
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; results.push(`PASS  ${name}`); }
  else { fail++; results.push(`FAIL  ${name}  ${extra}`); }
};

const browser = await chromium.launch({ headless: true, args: ARGS });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + (e.message || '').split('\n')[0]));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 180)); });

await page.goto(URL, { waitUntil: 'load', timeout: 90000 });
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(3000);

const q = (sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
const txt = (sel) => page.evaluate((s) => Array.from(document.querySelectorAll(s)).map(e => (e.textContent || '').trim().replace(/\s+/g, ' ')), sel);

/* 1. boot surface */
ok('splash removed after boot', (await page.evaluate(() => !document.getElementById('sosSplash'))) === true, 'splash still present');
ok('shell api live', await page.evaluate(() => !!(window.__shell && window.__shell.renderInspector && window.__shell.openSettings)));
ok('top brand Studio of Sidecars', await txt('#appBrand #soTitle').then(t => t.join('') === 'Studio of Sidecars'));
ok('subtitle Private 3D Creator Studio', await txt('#appBrand #soTag').then(t => t.join('') === 'Private 3D Creator Studio'));
ok('left nav 8 buttons', (await q('#soNavHost .so-nav-btn')) === 8, 'nav count');
ok('inspector sections >= 3', (await q('#inBody .in-sec')) >= 3, 'secs');
ok('dock 8 buttons', (await q('#dock .dk-btn')) === 8);
ok('top actions >= 5', (await q('#appActions .tb-btn')) >= 5);
ok('legacy vchips 7 (6+V7 placeholder)', (await q('#topbar .vchip')) === 7, 'chips');
ok('active workspace default V2 commercial', await page.evaluate(() => (document.querySelector('.vchip.on') || {}).textContent || '').then(t => /V2/.test(t)));
ok('canvas present', (await q('#cv')) === 1);
ok('float bar hidden until selection', await page.evaluate(() => { const f = document.getElementById('floatBar'); return f && getComputedStyle(f).display === 'none'; }));

const modelsBefore = await page.evaluate(() => window.__studio && window.__studio.engine && window.__studio.engine.state ? window.__studio.engine.state.models.length : -1);
const chipsDataVid = await page.evaluate(() => Array.from(document.querySelectorAll('#topbar .vchip')).map(c => c.getAttribute('data-vid')));

/* 2. switch to V1 Classic via legacy chip, back to V6 Brand Studio */
await page.evaluate(() => { const c = document.querySelector('.vchip[data-vid="classic"]') || Array.from(document.querySelectorAll('#topbar .vchip')).find(c => /V1/.test(c.textContent)); if (c) c.click(); });
await page.waitForTimeout(500);
ok('V1 activated via chip', await page.evaluate(() => /V1/.test((document.querySelector('.vchip.on') || {}).textContent || '')));
ok('inspector re-renders after switch', (await q('#inBody .in-sec')) >= 3, 'secs post V1');
const activeIdV1 = await page.evaluate(() => (window.__studio && window.__studio.active) ? window.__studio.active() : null);

await page.evaluate(() => { const c = document.querySelector('.vchip[data-vid="brandstudio"]') || Array.from(document.querySelectorAll('#topbar .vchip')).find(c => /V6/.test(c.textContent)); if (c) c.click(); });
await page.waitForTimeout(500);
ok('V6 activated', await page.evaluate(() => /V6/.test((document.querySelector('.vchip.on') || {}).textContent || '')));
ok('nav highlights Brand', await page.evaluate(() => document.querySelector('#navBrand') && document.querySelector('#navBrand').classList.contains('on')));
ok('inspector shows Brand section', await txt('#inBody .in-sec h4').then(t => t.includes('Brand')));
const modelsDuring = await page.evaluate(() => window.__studio && window.__studio.engine && window.__studio.engine.state ? window.__studio.engine.state.models.length : -1);
ok('models unchanged across V1->V6 switch (no reload)', modelsBefore === modelsDuring, modelsBefore + ' vs ' + modelsDuring);

/* 3. settings overlay + About + theme + dev mode */
await page.evaluate(() => window.__shell.openSettings('about'));
await page.waitForTimeout(250);
ok('settings overlay opens', await page.evaluate(() => { const o = document.getElementById('sosOv'); return o && getComputedStyle(o).display !== 'none'; }));
ok('About content reachable', await txt('#sosOv').then(t => t.join(' ').length > 20));
ok('dev tiles hidden in normal mode', await page.evaluate(() => !document.body.classList.contains('so-dev')));
await page.evaluate(() => { const d = document.getElementById('devToggle'); if (d) d.click(); });
await page.waitForTimeout(200);
ok('dev mode toggle enables developer tiles', await page.evaluate(() => { const d = document.getElementById('devPanel'); return d && d.classList.contains('show'); }));

/* 4. save overlay */
await page.evaluate(() => { const s = document.getElementById('tbSave'); if (s) s.click(); });
await page.waitForTimeout(250);
ok('save overlay opens with name input', await page.evaluate(() => { const o = document.getElementById('saveOv'); return o && getComputedStyle(o).display !== 'none' && !!document.getElementById('soNameInput'); }));
await page.evaluate(() => { const x = document.querySelector('#saveOv .so-x, #saveOv .hu-x'); if (x) x.click(); });

/* 5. dock asset activation -> V5 assetlib, models preserved */
await page.evaluate(() => { const d = document.getElementById('dkAssets'); if (d) d.click(); });
await page.waitForTimeout(500);
ok('dock Assets opens V5 assetlib', await page.evaluate(() => /V5/.test((document.querySelector('.vchip.on') || {}).textContent || '')));
ok('inspector shows Assets section', await txt('#inBody .in-sec h4').then(t => t.includes('Assets')));
const modelsAssets = await page.evaluate(() => window.__studio && window.__studio.engine && window.__studio.engine.state ? window.__studio.engine.state.models.length : -1);
ok('models unchanged at V5', modelsBefore === modelsAssets);

/* 6. theme toggle */
const lightBefore = await page.evaluate(() => document.body.classList.contains('so-light'));
await page.evaluate(() => { const t = document.getElementById('tbTheme'); if (t) t.click(); });
await page.waitForTimeout(200);
const lightAfter = await page.evaluate(() => document.body.classList.contains('so-light'));
ok('theme toggle flips light/dark', lightBefore !== lightAfter);

console.log(results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
console.log('ERRS', errs.length ? errs.join(' | ') : 'NONE');
await page.screenshot({ path: '/home/user/shots/chromeqa_end.png' });
await browser.close();
process.exit(fail ? 1 : 0);
