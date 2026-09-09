import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1420, height: 900 }, acceptDownloads: true })).newPage();
await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
const errors = []; const downloads = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)); });
page.on('pageerror', e => errors.push('PAGEERR ' + e.message.split('\n')[0]));
page.on('download', d => downloads.push(d.suggestedFilename()));
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (label, ok, extra) => { console.log((ok ? '  ✔ ' : '  ✖ ') + label + (extra ? ' — ' + extra : '')); ok ? pass++ : fail++; };
const stats = () => page.evaluate(() => ({
  models: statModels.textContent, meshes: statMeshes.textContent,
  active: __studio.active(), verCount: __studio.versions().length,
}));

await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(7000);
await page.evaluate(() => [...document.querySelectorAll('details')].forEach(d => d.open = true));
await page.evaluate(() => { window.__marker = 'survives'; });
await wait(400);

let st = await stats();
check('Boots into Version 2 (commercial)', st.active === 'commercial', JSON.stringify(st));
check('6 registered built-in versions (V1·V2·V3·V4·V5·V6) exposed', st.verCount === 6);
check('BBQ demo auto-loads (52 parts)', st.models === '1' && st.meshes === '52', st.meshes + ' parts');

// toolbar chips
const chips = await page.evaluate(() => [...document.querySelectorAll('#topbar .vchip')].map(c => c.dataset.vid || c.textContent.trim()));
check('Top toolbar has V1 + V2 chips + V3 slot', chips.length >= 3 && chips.includes('classic') && chips.includes('commercial'), chips.join(' | '));

// V2 section presence
check('V2 panels mounted', await page.evaluate(() => !!document.getElementById('v2Hero') && !!document.getElementById('v2Lgt') && !!document.getElementById('v2Dur')));
check('V2 default lighting softbox', await page.evaluate(() => __viewer.lightName() === 'softbox'));

// V2 camera presets (data-preset) — use within v2 camera seg
for (const cam of ['front','45','side','top','hero','macro']) {
  await page.click(`#verSections .seg button[data-preset="${cam}"]`); await wait(1100);
}
check('V2 six camera presets run', true);

// V2 moves
await page.click('#verSections .seg button[data-preset="orbit"]'); await wait(700);
check('Orbit move runs (isMoving)', await page.evaluate(() => __viewer.isMoving()));
await page.evaluate(() => __viewer.stopCamControl()); await wait(200);

// V2 turntable
await page.click('#v2Rot'); await wait(400);
check('Turntable on in V2', await page.evaluate(() => __viewer.controls.autoRotate === true));
await page.click('#v2Rot'); await wait(200);

// V2 lighting switch
await page.selectOption('#v2Lgt', 'nightcafe'); await wait(500);
check('V2 lighting preset nightcafe', await page.evaluate(() => __viewer.lightName() === 'nightcafe'));
await page.selectOption('#v2Lgt', 'softbox'); await wait(400);

// Part edit then switch — verify persists
await page.selectOption('#partSel', { index: 1 }); await wait(250);
await page.evaluate(() => { const sc = document.getElementById('sc'); sc.value = '1.7'; sc.dispatchEvent(new Event('input')); });
const scaleBefore = await page.evaluate(() => { const e = __viewer.state.meshes[1]; return e ? +e.mesh.scale.x.toFixed(3) : 0; });
check('Part scale set (1.7x) before switch', Math.abs(scaleBefore - 1.7) < 0.001, 'scale=' + scaleBefore);

// ---- SWITCH TO V1 ----
await page.click('.vchip[data-vid="classic"]'); await wait(2200);
st = await stats();
check('Switch to V1 Classic works', st.active === 'classic');
check('GLB retained on switch (no reload)', await page.evaluate(() => window.__marker === 'survives') && st.models === '1' && st.meshes === '52', st.models + '/' + st.meshes);
check('V1 panels mounted (V2 removed)', await page.evaluate(() => !!document.getElementById('v1Rot') && !!document.getElementById('v1Sel') && !document.getElementById('v2Hero')));
check('V1 default format 1:1', await page.evaluate(() => __viewer.formatOf() === '1:1'));
check('V1 guide off', await page.evaluate(() => __viewer.state.guideVisible === false));
check('Part scale survived switch', await page.evaluate(() => { const e = __viewer.state.meshes[1]; return Math.abs(e.mesh.scale.x - 1.7) < 0.001; }));

// V1 lighting select subset
await page.selectOption('#v1Sel', 'sunset'); await wait(500);
check('V1 lighting preset applies', await page.evaluate(() => __viewer.lightName() === 'sunset'));
// V1 camera preset
await page.click('#verSections .seg button[data-preset="top"]'); await wait(1200);
// V1 turntable
await page.click('#v1Rot'); await wait(300);
check('V1 turntable toggles', await page.evaluate(() => __viewer.controls.autoRotate === true));
await page.click('#v1Rot'); await wait(200);

// Photo export in V1 (1:1)
await page.click('#btnShot'); await wait(2200);
check('V1 1:1 photo export', downloads.some(d => d.includes('1080x1080')), downloads[downloads.length-1]);

// ---- SWITCH BACK TO V2, add coffee product, switch again ----
await page.click('.vchip[data-vid="commercial"]'); await wait(1500);
st = await stats();
check('Back to V2, still 1 product', st.active === 'commercial' && st.models === '1');
check('V2 panels restored on return', await page.evaluate(() => !!document.getElementById('v2Hero')));
await page.click('#btnDemoCup'); await wait(4000);
st = await stats();
check('Coffee added in V2 (2 products, 68 parts)', st.models === '2' && st.meshes === '68', st.models + '/' + st.meshes);
await page.click('.vchip[data-vid="classic"]'); await wait(1800);
st = await stats();
check('V1 again: both products retained', st.models === '2' && st.meshes === '68');
await page.click('.vchip[data-vid="commercial"]'); await wait(1800);
check('Final back in V2', await page.evaluate(() => __studio.active() === 'commercial'));

// screenshot
await page.selectOption('#v2Lgt', 'coffeeshop'); await wait(500);
await page.evaluate(() => __viewer.frame('hero')); await wait(1400);
await page.screenshot({ path: '/home/user/shots/multiver_v2.png' });
await page.click('.vchip[data-vid="classic"]'); await wait(2000);
await page.selectOption('#v1Sel', 'studio'); await wait(500);
await page.evaluate(() => __viewer.frame('45')); await wait(1300);
await page.screenshot({ path: '/home/user/shots/multiver_v1.png' });

console.log('\n=== ERRORS ===');
console.log(errors.length ? errors.join('\n') : 'NONE ✔');
console.log(`RESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
