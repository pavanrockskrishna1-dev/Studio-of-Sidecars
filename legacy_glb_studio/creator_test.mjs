import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1380, height: 1000 }, acceptDownloads: true })).newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERR ' + e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (label, ok, extra) => { console.log((ok ? '  ✔ ' : '  ✖ ') + label + (extra ? ' — ' + extra : '')); ok ? pass++ : fail++; };
const st = () => page.evaluate(() => ({
  models: statModels.textContent, meshes: statMeshes.textContent,
  active: __studio.active(), verCount: __studio.versions().length,
}));
const evalv = (fn, ...a) => page.evaluate(fn, ...a);
const tiles = () => page.evaluate(() => [...document.querySelectorAll('.creator .shot-grid button')].map(b => b.dataset.shot));
const chips = () => page.evaluate(() => [...document.querySelectorAll('#topbar .vchip')].map(c => (c.dataset.vid || '') + ':' + c.textContent.trim()));
const reelKeys = () => evalv(() => __studio.getActive().memory.shots);
const reelLabels = () => page.evaluate(() => [...document.querySelectorAll('.creator .rshot .rlbl')].map(e => e.textContent));
const reelNodes = () => page.evaluate(() => document.querySelectorAll('.creator .rshot').length);

await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6500);
await page.evaluate(() => [...document.querySelectorAll('#panel details')].forEach(d => d.open = true));
await page.evaluate(() => { window.__marker = 'survives'; });
await wait(300);

/* ---- boot & registration ---- */
let s = await st();
check('V4 Creator Studio registered as 4th built-in', await evalv(() => {
  const vs = __studio.versions();
  return vs.length === 6 && vs[3].id === 'creator' && vs[3].short === 'V4' && !vs[3].userCreated;
}), JSON.stringify(s));
let chipTxt = await chips();
check('Toolbar: Creator chip present + ＋ V7…', chipTxt.some(c => c.includes('creator') && c.includes('Creator Studio')) && chipTxt.some(c => c.includes('＋ V7…')), chipTxt.join(' | '));
check('Still boots into V2 commercial', s.active === 'commercial' && s.models === '1' && s.meshes === '52');

/* ---- switch to Creator Studio ---- */
await page.click('.vchip[data-vid="creator"]'); await wait(900);
check('Creator Studio becomes active (no reload)', await evalv(() => __studio.active() === 'creator' && window.__marker === 'survives') && (await st()).meshes === '52');
check('Six big one-tap shot tiles', JSON.stringify(await tiles()) === JSON.stringify(['hero', 'front', 'side', 'closeup', 'top', 'pour']), (await tiles()).join(','));
check('Tile labels are Hero · Front · Side · Close-up · Top · Pour Coffee', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.creator .shot-grid .sl')].map(e => e.textContent))) === JSON.stringify(['Hero', 'Front', 'Side', 'Close-up', 'Top', 'Pour Coffee']));
check('Empty reel message + disabled Play', await evalv(() => !!document.querySelector('.creator .reel-empty')) && await evalv(() => document.getElementById('v4Play').disabled === true));

/* ---- build a reel by tapping in a chosen order ---- */
for (const k of ['front', 'hero', 'side', 'closeup', 'top', 'pour']) {
  await page.click(`.creator .shot-grid button[data-shot="${k}"]`);
  await wait(260);
}
check('Six taps build a 6-shot reel in tap order', JSON.stringify(await reelKeys()) === JSON.stringify(['front', 'hero', 'side', 'closeup', 'top', 'pour']), (await reelKeys()).join(' > '));
check('Reel chips render in order with numbers', JSON.stringify(await reelLabels()) === JSON.stringify(['Front', 'Hero', 'Side', 'Close-up', 'Top', 'Pour Coffee']) && (await reelNodes()) === 6);
check('Reel summary shows shot count', await page.evaluate(() => document.getElementById('v4Info').textContent.includes('6 shots')));
check('Play enabled after adding shots', await page.evaluate(() => document.getElementById('v4Play').disabled === false));
check('Empty-state hidden once shots exist', await page.evaluate(() => getComputedStyle(document.getElementById('v4Empty')).display === 'none'));

/* ---- Play Reel Preview ---- */
await page.click('#v4Play'); await wait(200);
check('Play button becomes Stop Preview', await page.evaluate(() => document.getElementById('v4Play').textContent.includes('Stop Preview')));
await wait(1500);
check('Preview shows current shot (1 / 6 · Front)', await page.evaluate(() => /1 \/ 6 · Front/.test(document.getElementById('v4Prog').textContent)), await page.evaluate(() => document.getElementById('v4Prog').textContent));
check('Active chip highlighted', await page.evaluate(() => document.querySelector('.creator .rshot.on .rlbl') && document.querySelector('.creator .rshot.on .rlbl').textContent === 'Front'));
await wait(2400);
check('Preview advanced to shot 2', await page.evaluate(() => /2 \/ 6 · Hero/.test(document.getElementById('v4Prog').textContent)), await page.evaluate(() => document.getElementById('v4Prog').textContent));
await page.click('#v4Play'); await wait(150);
check('Stop clears progress + restores label', await page.evaluate(() => document.getElementById('v4Prog').textContent === '' && document.getElementById('v4Play').textContent.includes('Play Reel Preview')));

/* ---- remove one shot via ✕ ---- */
await page.click('.creator .rshot:nth-child(2) .rx'); await wait(300);
check('✕ removes a shot (6 → 5)', (await reelKeys()).length === 5 && (await reelNodes()) === 5, (await reelKeys()).join(','));
check('Numbers renumber after removal', await page.evaluate(() => document.querySelector('.creator .rshot:nth-child(5) .rnum').textContent === '5'));

/* ---- drag to reorder (grab first shot, drop far below the last) ---- */
{
  const h = await page.locator('.creator .rshot:nth-child(1) .rhnd').boundingBox();
  const last = await page.locator('.creator .rshot:nth-child(5)').boundingBox();
  const y0 = h.y + h.height / 2, x0 = h.x + h.width / 2;
  const yT = last.y + last.height + 60;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  const steps = 16;
  for (let i = 1; i <= steps; i++) { await page.mouse.move(x0, y0 + ((yT - y0) * i) / steps, { steps: 2 }); await wait(10); }
  await page.mouse.up();
  await wait(400);
}
check('Drag reorders reel (Front dragged to the end)', JSON.stringify(await reelKeys()) === JSON.stringify(['side', 'closeup', 'top', 'pour', 'front']), (await reelKeys()).join(' > '));
check('Chip labels follow the new order', JSON.stringify(await reelLabels()) === JSON.stringify(['Side', 'Close-up', 'Top', 'Pour Coffee', 'Front']), (await reelLabels()).join(' | '));
check('Reel numbers renumbered after drag', await page.evaluate(() => document.querySelector('.creator .rshot:nth-child(5) .rnum').textContent === '5'));

/* ---- clear the reel ---- */
await page.click('#v4Clear'); await wait(300);
check('Clear empties the reel', (await reelKeys()).length === 0 && (await reelNodes()) === 0);
check('Empty state returns, Play disabled', await page.evaluate(() => getComputedStyle(document.getElementById('v4Empty')).display !== 'none' && document.getElementById('v4Play').disabled === true));

/* ---- one shot kept across version switch ---- */
await page.click('.creator .shot-grid button[data-shot="hero"]'); await wait(300);
await page.click('.vchip[data-vid="commercial"]'); await wait(900);
check('Switch to V2 keeps product (no reload)', await evalv(() => window.__marker === 'survives' && statModels.textContent === '1' && statMeshes.textContent === '52'));
await page.click('.vchip[data-vid="creator"]'); await wait(700);
check('Back to V4: reel shot retained (own memory)', JSON.stringify(await reelKeys()) === JSON.stringify(['hero']), (await reelKeys()).join(','));
check('V4 stays on its 9:16 reel format', await evalv(() => __viewer.formatOf() === '9:16'));

/* ---- duplicate Creator Studio (manager) copies the reel ---- */
const dup = await evalv(() => { const v = __studio.duplicate(); return v ? { id: v.id, tpl: v.tpl, shots: (v.memory.shots || []).slice() } : null; });
check('Duplicate of Creator Studio creates a copy (tpl creator)', !!dup && dup.tpl === 'creator' && dup.id !== 'creator', dup && dup.id);
check('Copy starts with a copy of the reel', dup && JSON.stringify(dup.shots) === JSON.stringify(['hero']), dup && dup.shots.join(','));
check('Copy mounts its own Creator panels', dup && await page.evaluate((id) => { const root = document.querySelector('[data-ver="' + id + '"]'); return !!(root && root.querySelector('.shot-grid') && root.querySelector('#v4Reel') === null); }, dup.id));
const dupRes = await evalv((id) => {
  try { __studio.activate('creator'); return { rem: __studio.remove(id), active: __studio.active() }; }
  catch (e) { return { err: String(e && e.message) }; }
}, dup.id);
check('Copy removed cleanly (back on V4)', dupRes && dupRes.rem === true && dupRes.active === 'creator', JSON.stringify(dupRes));

await page.screenshot({ path: '/home/user/shots/creator_v4.png' });
/* final pixel sanity: the live canvas actually renders content behind the panel */
const px = await page.evaluate(() => {
  const gl = document.getElementById('cv');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.min(gl.width, 400), h = Math.min(gl.height, 300);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(gl, gl.width - w, gl.height - h, w, h, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  let nb = 0; for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 24) nb++;
  return { nb, total: Math.floor(d.length / 16), dpr };
});
check('Live canvas renders product while in Creator Studio', px.nb > px.total * 0.6, 'lit px ' + px.nb + '/' + px.total);

console.log('\n=== ERRORS ===');
console.log(errors.length ? errors.join('\n') : 'NONE ✔');
console.log(`RESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
