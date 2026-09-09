import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 920 }, acceptDownloads: true })).newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERR ' + e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (label, ok, extra) => { console.log((ok ? '  ✔ ' : '  ✖ ') + label + (extra ? ' — ' + extra : '')); ok ? pass++ : fail++; };

const boot = async () => {
  await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(6500);
  await page.evaluate(() => [...document.querySelectorAll('#panel details')].forEach(d => d.open = true));
  await page.evaluate(() => { window.__marker = 'survives'; });
};
const st = () => page.evaluate(() => ({
  models: statModels.textContent, meshes: statMeshes.textContent,
  active: __studio.active(), verCount: __studio.versions().length,
}));
const chips = () => page.evaluate(() => [...document.querySelectorAll('#topbar .vchip')].map(c => (c.dataset.vid || '') + ':' + c.textContent.trim()));
const rows = () => page.evaluate(() => [...document.querySelectorAll('#vmRows .vm-row')].map(r => r.dataset.vid));
const panels = (ns) => page.evaluate((ns) => ({
  hero: !!document.getElementById(ns + 'Hero'), lgt: !!document.getElementById(ns + 'Lgt'),
  sel: !!document.getElementById(ns + 'Sel'), dur: !!document.getElementById(ns + 'Dur'),
}), ns);

/* ==================== 1. BOOT + MANAGER PANEL (4 built-ins) ==================== */
await boot();
let s = await st();
check('Boots V2 commercial (6 built-ins: V1·V2·V3·V4·V5·V6)', s.active === 'commercial' && s.verCount === 6, JSON.stringify(s));
check('BBQ demo shared model loaded', s.models === '1' && s.meshes === '52', s.models + '/' + s.meshes);
check('Manager lists all six built-ins', (await rows()).join(',') === 'classic,commercial,blender,creator,assetlib,brandstudio', (await rows()).join(','));
check('Toolbar: 6 built-in chips + ＋ V7…', (await chips()).length === 7 && (await chips()).join(' ').includes('＋ V7…'), (await chips()).join(' | '));
const mgrText = await page.evaluate(() => document.querySelector('#vmHost').innerText);
check('Manager shows stored settings per row', /export|lighting|cameras|guide/i.test(mgrText));
check('Cannot remove built-in Blender', await page.evaluate(() => __studio.remove('blender') === false));
check('Cannot remove built-in Creator Studio', await page.evaluate(() => __studio.remove('creator') === false));
check('Cannot remove built-in Asset Library', await page.evaluate(() => __studio.remove('assetlib') === false));
check('Cannot remove built-in Brand Studio', await page.evaluate(() => __studio.remove('brandstudio') === false));

/* ============ 2. CREATE V5 = DUPLICATE CURRENT V2 (＋ chip) ============ */
await page.click('.vchip.plus'); await wait(900);
const d1 = await page.evaluate(() => __studio.active());
s = await st();
check('＋ chip creates a duplicate of V2 (' + d1 + ')', d1 !== 'commercial' && s.verCount === 7, JSON.stringify(s));
check('No reload — GLB model retained through creation', await page.evaluate(() => window.__marker === 'survives') && s.models === '1' && s.meshes === '52', s.models + '/' + s.meshes);
check(d1 + ' mounts V2-style panels (commercial clone)', (await panels(d1)).hero && (await panels(d1)).lgt && (await panels(d1)).dur);
check('V2 panels unmounted while copy active', await page.evaluate(() => !document.getElementById('v2Hero')));
check(d1 + ' copies export setting (9:16)', await page.evaluate(() => __viewer.formatOf() === '9:16'));
check(d1 + ' copies lighting preset (softbox)', await page.evaluate(() => __viewer.lightName() === 'softbox'));
check('Manager lists 5 versions now', (await rows()).includes(d1) && (await rows()).length === 7, (await rows()).join(','));

/* ========== 3. PER-VERSION SETTING INDEPENDENCE (export / guide / light) ========== */
await page.click('#panel .fmt-chip[data-fmt="1:1"]'); await wait(200);
check('In ' + d1 + ': export format set to 1:1', await page.evaluate(() => __viewer.formatOf() === '1:1'));
await page.click('.vchip[data-vid="commercial"]'); await wait(600);
check('V2 keeps ITS export format (9:16)', await page.evaluate(() => __viewer.formatOf() === '9:16'));
await page.click('.vchip[data-vid="' + d1 + '"]'); await wait(600);
check('Back to ' + d1 + ': its 1:1 restored (own memory)', await page.evaluate(() => __viewer.formatOf() === '1:1'));

await page.selectOption('#' + d1 + 'Lgt', 'nightcafe'); await wait(400);
check('In ' + d1 + ': lighting = nightcafe', await page.evaluate(() => __viewer.lightName() === 'nightcafe'));
await page.click('#' + d1 + 'Guide'); await wait(200);
check('In ' + d1 + ': guide toggled OFF', await page.evaluate(() => __viewer.state.guideVisible === false));
await page.click('.vchip[data-vid="commercial"]'); await wait(500);
check('V2: guide ON + softbox (its own)', await page.evaluate(() => __viewer.state.guideVisible === true) && await page.evaluate(() => __viewer.lightName() === 'softbox'));
await page.click('.vchip[data-vid="' + d1 + '"]'); await wait(500);
check('Back to ' + d1 + ': nightcafe + guide off restored', await page.evaluate(() => __viewer.lightName() === 'nightcafe') && await page.evaluate(() => __viewer.state.guideVisible === false));

/* ================================== 4. RENAME ================================== */
check('Rename ' + d1 + ' -> "Reels Ads"', await page.evaluate((id) => __studio.rename(id, { label: 'Reels Ads' }) === true, d1), d1);
const chipsTxt = await chips();
check('Toolbar chip shows renamed label', chipsTxt.some(c => c.includes('Reels Ads')), chipsTxt.join(' | '));

/* ============= 5. DUPLICATE d1 FROM THE MANAGER ROW (creates another) ============= */
await page.evaluate((id) => {
  const row = document.querySelector('#vmRows .vm-row[data-vid="' + id + '"]');
  [...row.querySelectorAll('button')].find(x => x.textContent.includes('Duplicate')).click();
}, d1);
await wait(700);
const d2 = await page.evaluate(() => __studio.active());
s = await st();
check('Row Duplicate creates a new copy of ' + d1 + ' (' + d2 + ')', d2 !== d1 && s.verCount === 8, JSON.stringify(s));
check(d2 + ' inherits d1 export (1:1) + lighting (nightcafe)', await page.evaluate(() => __viewer.formatOf() === '1:1') && await page.evaluate(() => __viewer.lightName() === 'nightcafe'));
check(d2 + ' has commercial panels', (await panels(d2)).hero && (await panels(d2)).lgt);

/* ========== 6. CREATE A CLASSIC-BASED COPY via the manager create-row ========== */
await page.click('.vchip[data-vid="classic"]'); await wait(500);
await page.evaluate(() => {
  const inp = document.getElementById('vmNewName');
  inp.value = 'Studio One Remix'; inp.dispatchEvent(new Event('input'));
});
await page.click('#vmDupBtn'); await wait(700);
const d3 = await page.evaluate(() => __studio.active());
s = await st();
check('Manager create-row makes a Classic clone (' + d3 + ')', s.verCount === 9 && d3 !== 'classic', JSON.stringify(s));
check(d3 + ' is a Classic clone (Sel panel, 1:1, guide off)', (await panels(d3)).sel && !(await panels(d3)).hero && await page.evaluate(() => __viewer.formatOf() === '1:1' && __viewer.state.guideVisible === false));

/* ========================== 7. REMOVE + GUARDS ========================== */
check('Cannot remove built-in V1', await page.evaluate(() => __studio.remove('classic') === false));
check('Cannot remove the ACTIVE version (' + d3 + ')', await page.evaluate((id) => __studio.remove(id) === false, d3), d3);
await page.click('.vchip[data-vid="commercial"]'); await wait(500);
check('Remove ' + d3 + ' works once not active', await page.evaluate((id) => __studio.remove(id), d3) === true);
check(d3 + ' gone from manager list', (await rows()).includes(d3) === false);
await page.evaluate((id) => {
  const row = document.querySelector('#vmRows .vm-row[data-vid="' + id + '"]');
  row.querySelector('.vm-del').click();
}, d2);
await wait(500);
s = await st();
check('Row delete removes ' + d2, s.verCount === 7 && !(await rows()).includes(d2), JSON.stringify(s) + ' rows=' + (await rows()).join(','));
check('Plus chip now offers V8', (await chips()).some(c => c.includes('＋ V8…')), (await chips()).join(' | '));

/* ===================== 8. RELOAD → USER VERSION PERSISTS ===================== */
await page.click('.vchip[data-vid="' + d1 + '"]'); await wait(800);
await page.reload({ waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6500);
await page.evaluate(() => [...document.querySelectorAll('#panel details')].forEach(d => d.open = true));
s = await st();
check('After reload: ' + d1 + ' re-hydrated (7 versions)', s.verCount === 7 && s.active === d1, JSON.stringify(s));
check('Reload kept rename + stored settings (1:1, nightcafe, guide off)',
  await page.evaluate(() => __viewer.formatOf() === '1:1' && __viewer.lightName() === 'nightcafe' && __viewer.state.guideVisible === false));
check('Manager lists persisted ' + d1 + ' with its name', (await page.evaluate(() => document.querySelector('#vmRows').innerText)).includes('Reels Ads'));
check('Demo model reloaded fresh (shared engine)', s.models === '1' && s.meshes === '52', s.models + '/' + s.meshes);

console.log('\n=== ERRORS ===');
console.log(errors.length ? errors.join('\n') : 'NONE ✔');
console.log(`RESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
