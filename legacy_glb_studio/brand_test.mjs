import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1380, height: 1020 }, acceptDownloads: true })).newPage();
const errors = []; const downloads = [];
page.on('pageerror', e => errors.push('PAGEERR ' + e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
page.on('download', d => downloads.push(d.suggestedFilename()));
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (label, ok, extra) => { console.log((ok ? '  ✔ ' : '  ✖ ') + label + (extra ? ' — ' + extra : '')); ok ? pass++ : fail++; };
const evalv = (fn, ...a) => page.evaluate(fn, ...a);
const st = () => page.evaluate(() => ({ models: statModels.textContent, meshes: statMeshes.textContent, active: __studio.active(), verCount: __studio.versions().length }));
const chips = () => page.evaluate(() => [...document.querySelectorAll('#topbar .vchip')].map(c => (c.dataset.vid || '') + ':' + c.textContent.trim()));
const kitNames = () => page.evaluate(() => [...document.querySelectorAll('.brandstudio .bs-kit .bs-knm')].map(e => e.textContent));
const selKitName = () => page.evaluate(() => { const on = document.querySelector('.brandstudio .bs-kit.on .bs-knm'); return on ? on.textContent : null; });
const wmText = () => page.evaluate(() => { const t = document.querySelector('#brandOverlay .bm-wtxt'); return t ? t.textContent : null; });
const wmShown = () => page.evaluate(() => { const w = document.querySelector('#brandOverlay .bm-watermark'); return !!w && getComputedStyle(w).display !== 'none'; });
const sceneBg = () => page.evaluate(() => __viewer.scene.background ? '#' + __viewer.scene.background.getHexString() : 'null');
const activeKitName = () => page.evaluate(() => { const k = __viewer.brand.kit(); return k ? k.name : null; });

await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6500);
await page.evaluate(() => [...document.querySelectorAll('#panel details')].forEach(d => d.open = true));
await page.evaluate(() => { window.__marker = 'survives'; });
await wait(300);

/* ---- boot & registration ---- */
let s = await st();
check('V6 Brand Studio registered as 6th built-in', await evalv(() => { const vs = __studio.versions(); return vs.length === 6 && vs[5].id === 'brandstudio' && vs[5].short === 'V6' && !vs[5].userCreated; }), JSON.stringify(s));
let chipTxt = await chips();
check('Toolbar: 6 built-in chips + ＋ V7…', chipTxt.some(c => c.includes('brandstudio') && c.includes('Brand Studio')) && chipTxt.some(c => c.includes('＋ V7…')), chipTxt.join(' | '));
check('Still boots into V2 with BBQ demo', s.active === 'commercial' && s.models === '1' && s.meshes === '52');
check('No brand applied before touching V6', await evalv(() => __viewer.brand.kit() === null));

/* ---- switch to V6: three ready sample kits ---- */
await page.click('.vchip[data-vid="brandstudio"]'); await wait(1000);
check('V6 active without reload', await evalv(() => __studio.active() === 'brandstudio' && window.__marker === 'survives') && (await st()).meshes === '52');
check('Sample kits: Coffee Bike · BBQ Bike · The KOP', JSON.stringify(await kitNames()) === JSON.stringify(['Coffee Bike', 'BBQ Bike', 'The KOP']), (await kitNames()).join(' | '));

/* ---- one tap applies The KOP ---- */
await page.click('.brandstudio .bs-kit[data-kid] >> nth=2'); await wait(400);
check('One tap applies The KOP kit', (await activeKitName()) === 'The KOP' && (await selKitName()) === 'The KOP');
check('Watermark overlay appears with brand text', (await wmShown()) && (await wmText()) === 'THE KOP', 'wm=' + await wmText());
check('Kit default background tints the scene', (await sceneBg()) === '#0b0d12', 'bg=' + await sceneBg());
check('Editor shows for the selected kit', await page.evaluate(() => document.getElementById('v6Editor').textContent.includes('The KOP')));

/* ---- brand follows version switches (any scene) ---- */
await page.click('.vchip[data-vid="commercial"]'); await wait(900);
check('V2: brand still active (kit + watermark + bg)', (await activeKitName()) === 'The KOP' && (await wmShown()) && (await wmText()) === 'THE KOP' && (await sceneBg()) === '#0b0d12', 'bg=' + await sceneBg());
await page.click('.vchip[data-vid="brandstudio"]'); await wait(700);
check('Back on V6 — same kit selected', (await selKitName()) === 'The KOP');

/* ---- edit kit: rename, colors, watermark text ---- */
await page.fill('#v6KitName', 'My Café'); await wait(300);
check('Rename updates the kit + tile live', (await kitNames()).includes('My Café') && (await activeKitName()) === 'My Café', (await activeKitName()));
await page.evaluate(() => { const c = document.getElementById('v6C3'); c.value = '#123456'; c.dispatchEvent(new Event('input')); });
await wait(200);
check('Background color edit tints scene live', (await sceneBg()) === '#123456', 'bg=' + await sceneBg());
await page.fill('#v6WmText', 'CAFÉ STUDIO'); await wait(200);
check('Watermark text edit updates overlay', (await wmText()) === 'CAFÉ STUDIO', 'wm=' + await wmText());

/* ---- intro / outro card previews ---- */
await page.fill('#v6InH', 'Hello Café World'); await wait(100);
await page.click('#v6IntroPrev'); await wait(250);
const cardTxt = await page.evaluate(() => { const c = document.querySelector('#brandOverlay .bm-card'); return c && getComputedStyle(c).display !== 'none' ? c.textContent : ''; });
check('Intro card preview shows styled copy', cardTxt.includes('Hello Café World'), cardTxt.slice(0, 90));
await wait(5400);
check('Intro card auto-hides after preview', await page.evaluate(() => getComputedStyle(document.querySelector('#brandOverlay .bm-card')).display === 'none'));

/* ---- duplicate + delete a kit ---- */
await page.click('#v6Dup'); await wait(400);
check('Duplicate creates "My Café Copy" + applies it', JSON.stringify(await kitNames()).includes('My Café Copy') && (await activeKitName()) === 'My Café Copy' && (await selKitName()) === 'My Café Copy', (await kitNames()).join(' | '));
await page.click('#v6Del'); await wait(400);
check('Delete removes the copy; no kit active', !(await kitNames()).includes('My Café Copy') && (await activeKitName()) === null);
check('Watermark hidden after deleting active kit', !(await wmShown()));

/* ---- apply still works after re-selecting ---- */
await page.click('.brandstudio .bs-kit[data-kid] >> nth=0'); await wait(400);
check('Re-applying Coffee Bike kit', (await activeKitName()) === 'Coffee Bike' && (await wmShown()));

/* ---- export a branded photo (watermark stamped, no errors) ---- */
await page.click('.vchip[data-vid="commercial"]'); await wait(900);
const dlP = page.waitForEvent('download', { timeout: 20000 });
await page.click('#btnShot');
const dl = await dlP;
await dl.saveAs('/home/user/render_brand.png');
check('Branded photo exports while brand active', dl.suggestedFilename().includes('.png') && (await activeKitName()) === 'Coffee Bike', dl.suggestedFilename());

/* ---- persistence across reload ---- */
await page.click('.vchip[data-vid="brandstudio"]'); await wait(600);
await page.reload({ waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6500);
await page.evaluate(() => [...document.querySelectorAll('#panel details')].forEach(d => d.open = true));
check('Kits + active kit persist after reload (applied on boot)', (await activeKitName()) === 'Coffee Bike', 'active=' + await activeKitName());
check('Coffee Bike still in kit list + selected tile', (await kitNames()).includes('Coffee Bike') && (await selKitName()) === 'Coffee Bike');
check('Watermark re-shown after reload', (await wmShown()) && (await wmText()) === 'COFFEE BIKE');

await page.screenshot({ path: '/home/user/shots/brand_v6.png' });
console.log('\n=== ERRORS ===');
console.log(errors.length ? errors.join('\n') : 'NONE ✔');
console.log(`RESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
