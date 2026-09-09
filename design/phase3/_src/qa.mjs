/* Phase 3 QA — boot, console audit, capture. Usage:
   node /home/user/design/phase3/_src/qa.mjs <outdir>   (playwright installed at /tmp/p3build) */
import { createRequire } from 'module';
const require = createRequire('/tmp/p3build/index.js');
const { chromium } = require('playwright-core');
const BASE = process.env.P3_BASE || 'file:///home/user/design/phase3/studio_sidecars_phase3.html';
const FILE = BASE;
const OUT = process.argv[2] || '/tmp/p3qa';
import { mkdirSync } from 'fs';
mkdirSync(OUT, { recursive: true });

const errors = [];
const b = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] });
async function open(w, h) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', e => errors.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 300)); });
  return p;
}
async function state(p) {
  return p.evaluate(() => {
    const P = window.P3;
    return {
      hasP: !!P,
      keys: P ? Object.keys(P) : [],
      models: P && P.models ? P.models.length : -1,
      parts: P && P.parts ? P.parts.length : -1,
      env: P && P.env ? (P.env.key || null) : null,
      floor: P && P.floor ? P.floor.preset : null,
      renderer: P && P.renderer ? (P.renderer.domElement.width + 'x' + P.renderer.domElement.height) : null,
      cam: P && P.camera && P.camera.position ? P.camera.position.toArray().map(v => +v.toFixed(2)) : null,
      visible: P && P.canvas ? P.canvas.style.visibility : null,
      fps: P && P.perf ? P.perf.fps : null,
    };
  });
}
for (const [w, h, name] of [[1440, 900, 'desktop'], [1194, 834, 'honorpad_ls'], [834, 1112, 'honorpad_pt']]) {
  const p = await open(w, h);
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(5200);
  console.log(name, JSON.stringify(await state(p)));
  await p.screenshot({ path: OUT + '/' + name + '.png' });
  await p.close();
}
// ---- interactive sweep (desktop) ----
{
  const p = await open(1440, 900);
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(4000);
  const notes = [];
  // apply a camera preset via dock tray chip
  await p.evaluate(() => {
    const r = document.getElementById('tlCam'); if (r) r.checked = true; r.dispatchEvent(new Event('change'));
  });
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    const chip = [...document.querySelectorAll('.trays .t-cam .rchip')].find(c => c.textContent.trim() === 'Detail');
    if (chip) chip.click();
  });
  await p.waitForTimeout(900);
  notes.push('cam ' + JSON.stringify(await state(p)));
  // floor preset tile
  await p.evaluate(() => {
    const r = document.getElementById('tlFloor'); if (r) r.checked = true; r.dispatchEvent(new Event('change'));
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    const t = [...document.querySelectorAll('.trays .t-floor .pr-tile')].find(x => (x.querySelector('.tt') || {}).textContent === 'Gloss Black Mirror');
    if (t) t.click();
  });
  await p.waitForTimeout(500);
  notes.push('floor ' + JSON.stringify(await state(p)));
  // lighting preset
  await p.evaluate(() => {
    const r = document.getElementById('tlLight'); if (r) r.checked = true; r.dispatchEvent(new Event('change'));
  });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const chip = [...document.querySelectorAll('.trays .t-light .rchip')].find(c => c.textContent.trim() === 'Golden hour');
    if (chip) chip.click();
  });
  await p.waitForTimeout(500);
  notes.push('light ' + JSON.stringify(await state(p)));
  // material finish (select first part first)
  await p.evaluate(() => {
    const r = document.getElementById('tlMat'); if (r) r.checked = true; r.dispatchEvent(new Event('change'));
  });
  await p.waitForTimeout(300);
  const partsBefore = await p.evaluate(() => window.P3 ? (window.P3.parts || []).length : 0);
  await p.evaluate(() => {
    const chip = [...document.querySelectorAll('.trays .t-mat .rchip')].find(c => c.textContent.trim() === 'Copper');
    if (chip) chip.click();
  });
  await p.waitForTimeout(500);
  notes.push('mat parts=' + partsBefore + ' ' + JSON.stringify(await state(p)));
  // environment gallery (settings overlay) apply hero-alt
  await p.evaluate(() => document.getElementById('tbSettings').click());
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    const tiles = [...document.querySelectorAll('#sosOv .p3-env .p3-tile')];
    const t = tiles.find(x => x.textContent.includes('Midnight Black'));
    if (t) t.click();
  });
  await p.waitForTimeout(1400);
  await p.evaluate(() => document.getElementById('sosOv') && document.querySelector('#sosOv .p3-x') && document.querySelector('#sosOv .p3-x').click());
  await p.waitForTimeout(300);
  notes.push('env ' + JSON.stringify(await state(p)));
  // screenshot the composed state
  await p.screenshot({ path: OUT + '/desktop_composed.png' });
  console.log('sweep:'); notes.forEach(n => console.log('  ', n));
  // export still (PNG 1080x1080 to verify renderer capture path)
  const still = await p.evaluate(async () => {
    const P = window.P3;
    try {
      P.exportCfg.format = '1:1 square'; P.exportCfg.res = '1080p';
      const blob = await P.still(P, { type: 'PNG' });
      return { ok: !!blob, size: blob ? blob.size : 0, type: blob ? blob.type : '' };
    } catch (e) { return { ok: false, err: String(e) }; }
  });
  console.log('export-still:', JSON.stringify(still));
  await p.close();
}
await b.close();
console.log('ERRORS:', errors.length ? errors : 'NONE');
