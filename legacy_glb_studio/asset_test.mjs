import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1380, height: 1000 }, acceptDownloads: true })).newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERR ' + e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (label, ok, extra) => { console.log((ok ? '  ✔ ' : '  ✖ ') + label + (extra ? ' — ' + extra : '')); ok ? pass++ : fail++; };
const evalv = (fn, ...a) => page.evaluate(fn, ...a);
const st = () => page.evaluate(() => ({ models: statModels.textContent, meshes: statMeshes.textContent, active: __studio.active(), verCount: __studio.versions().length }));
const chips = () => page.evaluate(() => [...document.querySelectorAll('#topbar .vchip')].map(c => (c.dataset.vid || '') + ':' + c.textContent.trim()));
const catBtns = () => page.evaluate(() => [...document.querySelectorAll('.assetlib .al-cat')].map(b => b.dataset.cat + ':' + b.textContent.trim().replace(/\n/g, ' ')));
const assetKeys = () => page.evaluate(() => [...document.querySelectorAll('.assetlib .al-asset')].map(c => c.dataset.key));
const placedNames = () => page.evaluate(() => [...document.querySelectorAll('.assetlib .al-prow .al-pnm')].map(e => e.textContent));
const modelCount = () => page.evaluate(() => __viewer.state.models.length);
const groupOf = (i) => page.evaluate((i) => { const m = __viewer.state.models[i]; return m ? { x: +m.group.position.x.toFixed(3), z: +m.group.position.z.toFixed(3), y: +m.group.position.y.toFixed(3), ry: +(+m.group.rotation.y.toFixed(3)), s: +(+m.group.scale.x.toFixed(3)) } : null; }, i);

await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6500);
await page.evaluate(() => [...document.querySelectorAll('#panel details')].forEach(d => d.open = true));
await page.evaluate(() => { window.__marker = 'survives'; });
await wait(300);

/* ---- boot & registration ---- */
let s = await st();
check('V5 Asset Library registered as 5th built-in', await evalv(() => { const vs = __studio.versions(); return vs.length === 6 && vs[4].id === 'assetlib' && vs[4].short === 'V5' && !vs[4].userCreated; }), JSON.stringify(s));
let chipTxt = await chips();
check('Toolbar: 5 built-in chips + ＋ V7…', chipTxt.some(c => c.includes('assetlib') && c.includes('Asset Library')) && chipTxt.some(c => c.includes('＋ V7…')), chipTxt.join(' | '));
check('Still boots into V2 with BBQ demo', s.active === 'commercial' && s.models === '1' && s.meshes === '52');

/* ---- switch to V5 ---- */
await page.click('.vchip[data-vid="assetlib"]'); await wait(900);
check('V5 active without reload (product kept)', await evalv(() => __studio.active() === 'assetlib' && window.__marker === 'survives') && (await st()).models === '1');
const cats = await catBtns();
check('Category tiles: All · Coffee · BBQ · Furniture · Lighting · Food · Decorations · Favorites',
  cats.length === 8 && ['Coffee', 'BBQ', 'Furniture', 'Lighting', 'Food', 'Decorations'].every((n) => cats.some(c => c.includes(n))), cats.join(' | '));
check('All 12 assets visible by default', (await assetKeys()).length === 12, (await assetKeys()).join(','));

/* ---- search ---- */
await page.fill('#v5Search', 'lamp'); await wait(250);
check('Search "lamp" → 2 lighting assets', (await assetKeys()).sort().join(',') === ['arc_lamp', 'floor_lamp'].sort().join(','), (await assetKeys()).join(','));
await page.fill('#v5Search', ''); await wait(250);
check('Cleared search shows all again', (await assetKeys()).length === 12);

/* ---- category filter ---- */
await page.click('.assetlib .al-cat[data-cat="coffee"]'); await wait(250);
check('Coffee category shows its 2 assets', (await assetKeys()).sort().join(',') === ['coffee_set', 'latte_cup'].sort().join(','), (await assetKeys()).join(','));
await page.click('.assetlib .al-cat[data-cat="furniture"]'); await wait(250);
check('Furniture category shows armchair + side table', (await assetKeys()).length === 2 && (await assetKeys()).includes('armchair') && (await assetKeys()).includes('side_table'), (await assetKeys()).join(','));
await page.click('.assetlib .al-cat[data-cat="all"]'); await wait(200);

/* ---- one tap adds an asset & auto-selects it ---- */
await page.click('.assetlib .al-asset[data-key="latte_cup"]'); await wait(500);
check('Tap places Latte Cup into shared scene', (await modelCount()) === 2 && (await placedNames()).some(n => n.includes('Latte Cup')), (await placedNames()).join(' | '));
check('New asset was placed at an offset (not stacked on origin)', (await groupOf(1)).x !== 0 || (await groupOf(1)).z !== 0, JSON.stringify(await groupOf(1)));
check('Placed list shows 2 rows + selection panel visible', await page.evaluate(() => document.querySelectorAll('.assetlib .al-prow').length === 2 && getComputedStyle(document.getElementById('v5SelPanel')).display !== 'none'));

/* ---- transform the selected asset (scale / spin / move) ---- */
await page.evaluate(() => { const i = document.getElementById('v5Ps'); i.value = '2'; i.dispatchEvent(new Event('input')); });
await wait(200);
let g = await groupOf(1);
check('Scale slider scales the whole asset (≈2.0)', Math.abs(g.s - 2) < 0.02, JSON.stringify(g));
await page.evaluate(() => { const i = document.getElementById('v5PRy'); i.value = '90'; i.dispatchEvent(new Event('input')); });
await wait(150);
g = await groupOf(1);
check('Spin rotates the asset 90°', Math.abs(Math.sin(g.ry) - 1) < 0.03 && Math.abs(Math.cos(g.ry)) < 0.03, JSON.stringify(g));
await page.evaluate(() => { const i = document.getElementById('v5Px'); i.value = '1.5'; i.dispatchEvent(new Event('input')); });
await page.evaluate(() => { const i = document.getElementById('v5Ph'); i.value = '1.2'; i.dispatchEvent(new Event('input')); });
await wait(150);
g = await groupOf(1);
check('Move X + Height sliders reposition the asset', Math.abs(g.x - 1.5) < 0.02 && Math.abs(g.y - 1.2) < 0.02, JSON.stringify(g));

/* ---- duplicate & delete via V5 controls ---- */
await page.click('#v5Dup'); await wait(300);
check('Duplicate creates a copy in the scene', (await modelCount()) === 3, String(await modelCount()));
await page.click('#v5Del'); await wait(300);
check('Delete removes the selected copy', (await modelCount()) === 2, String(await modelCount()));
check('Selection panel hides after delete', await page.evaluate(() => getComputedStyle(document.getElementById('v5SelPanel')).display === 'none'));

/* ---- a GLB demo asset adds too (async path) ---- */
await page.click('.assetlib .al-cat[data-cat="coffee"]'); await wait(200);
await page.click('.assetlib .al-asset[data-key="coffee_set"]'); await wait(1500);
check('GLB "Coffee Set" placed from the library', (await modelCount()) === 3 && (await placedNames()).some(n => n.includes('Coffee Set')), (await placedNames()).join(' | '));

/* ---- favorites ---- */
await page.click('.assetlib .al-cat[data-cat="food"]'); await wait(200);
await page.click('.assetlib .al-asset[data-key="doughnut"] .al-star'); await wait(250);
check('Star marks Doughnut as favourite (persisted)', await evalv(() => { try { return (JSON.parse(localStorage.getItem('glbStudio.favs.v1') || '[]')).includes('doughnut'); } catch (e) { return false; } }));
await page.click('.assetlib .al-cat[data-cat="favs"]'); await wait(250);
check('Favorites view shows only starred assets', (await assetKeys()).join(',') === 'doughnut', (await assetKeys()).join(','));
await page.click('.assetlib .al-cat[data-cat="all"]'); await wait(200);

/* ---- shared engine across versions ---- */
await page.click('.vchip[data-vid="commercial"]'); await wait(900);
check('Switch to V2 keeps all placed assets (no reload)', await evalv(() => window.__marker === 'survives' && statModels.textContent === '3'));
await page.click('.vchip[data-vid="assetlib"]'); await wait(700);
check('Back on V5 — placed assets still listed', (await placedNames()).length === 3, (await placedNames()).join(' | '));

/* ---- external removal syncs back into V5 ---- */
await page.evaluate(() => { __viewer.removeModel(__viewer.state.models[0].id); });
await wait(400);
check('Deleting a product elsewhere updates the V5 list live', (await placedNames()).length === 2, (await placedNames()).join(' | '));

/* ---- duplicate the whole version from the manager ---- */
const dup = await evalv(() => { const v = __studio.duplicate(); return v ? { id: v.id, tpl: v.tpl } : null; });
check('Duplicating V5 mints an Asset-Library copy', !!dup && dup.tpl === 'assetlib' && dup.id !== 'assetlib', dup && dup.id);
await evalv((id) => { __studio.activate('assetlib'); return __studio.remove(id); }, dup.id);
await wait(300);
check('Cleanly back on built-in V5', await evalv(() => __studio.active() === 'assetlib'));

await page.screenshot({ path: '/home/user/shots/asset_v5.png' });
const px = await page.evaluate(() => {
  const gl = document.getElementById('cv');
  const w = Math.min(gl.width, 400), h = Math.min(gl.height, 300);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(gl, gl.width - w, gl.height - h, w, h, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  let nb = 0; for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 24) nb++;
  return { nb, total: Math.floor(d.length / 16) };
});
check('Live canvas still renders the populated scene', px.nb > px.total * 0.5, 'lit px ' + px.nb + '/' + px.total);

console.log('\n=== ERRORS ===');
console.log(errors.length ? errors.join('\n') : 'NONE ✔');
console.log(`RESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
