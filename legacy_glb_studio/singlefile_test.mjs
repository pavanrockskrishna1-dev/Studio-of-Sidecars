import { chromium } from 'playwright-core';
import { execSync } from 'child_process';

const FILE = 'file:///home/user/viewer_src/dist/index.html';
const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport: { width: 1360, height: 850 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
const downloads = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 300)); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message.split('\n')[0]));
page.on('download', (d) => downloads.push(d.suggestedFilename()));

const step = async (name, fn) => {
  try { await fn(); console.log('OK  -', name); }
  catch (e) { console.log('FAIL-', name, '::', String(e.message).split('\n')[0]); }
};

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const stats = () => page.evaluate(() => ({
  meshes: document.getElementById('statMeshes').textContent,
  models: document.getElementById('statModels').textContent,
  clips: document.getElementById('statClips').textContent,
  animDisabled: document.getElementById('btnAnim').disabled,
}));

await page.goto(FILE, { waitUntil: 'load', timeout: 60000 });
await wait(7000);
console.log('boot stats:', JSON.stringify(await stats()));
await page.screenshot({ path: '/home/user/shots/single_boot.png' });

// Demo model should auto-load: 52 meshes, 1 model, 1 clip, Play enabled
await step('demo auto-loaded (52 meshes)', async () => {
  const s = await stats();
  if (s.meshes !== '52') throw new Error('meshes=' + s.meshes);
  if (s.models !== '1') throw new Error('models=' + s.models);
  if (s.clips !== '1') throw new Error('clips=' + s.clips);
  if (s.animDisabled !== false) throw new Error('anim disabled');
});

await step('click Play Animation', async () => {
  await page.click('#btnAnim'); await wait(600);
  const txt = await page.textContent('#btnAnim');
  if (!txt.includes('Pause')) throw new Error('btn text=' + txt);
  await page.click('#btnAnim'); await wait(200); // back to play
});
await step('clip dropdown populated', async () => {
  const n = await page.$eval('#clipSel', el => el.options.length);
  if (n < 1) throw new Error('no options');
});
await step('Auto-Rotate toggle', async () => {
  await page.click('#btnRotate'); await wait(500);
  const txt = await page.textContent('#btnRotate');
  await page.click('#btnRotate'); await wait(200);
  if (!/Pause/.test(txt)) throw new Error('txt=' + txt);
});
await step('Camera angle front/top/45/right', async () => {
  for (const a of ['front', 'top', '45', 'right']) { await page.click(`[data-cam="${a}"]`); await wait(200); }
});
await step('Env presets switch', async () => {
  for (const v of ['sunset', 'night', 'studio']) {
    await page.selectOption('#envSel', v); await wait(250);
  }
});
await step('Background color', async () => {
  await page.fill('#bgColor', '#ff0000'); await wait(150); await page.fill('#bgColor', '#12141a'); await wait(150);
});
await step('Grid + Wireframe toggles', async () => {
  await page.click('#btnGrid'); await wait(120); await page.click('#btnGrid'); await wait(120);
  await page.click('#btnWire'); await wait(120); await page.click('#btnWire'); await wait(120);
});
await step('Part selection + sliders', async () => {
  await page.selectOption('#partSel', { index: 0 }); await wait(200);
  const visible = await page.$eval('#partCtrls', el => el.style.display);
  if (visible !== 'block') throw new Error('ctrl hidden');
  await page.evaluate(() => { const r = document.getElementById('ry'); r.value = 45; r.dispatchEvent(new Event('input')); });
  await wait(120);
});
await step('Material preset apply', async () => {
  await page.selectOption('#matSel', 'chrome'); await wait(120);
});
await step('Photo PNG download', async () => {
  await page.click('#btnShot2'); await wait(1400);
  if (!downloads.some(d => d.endsWith('.png'))) throw new Error('no png download: ' + JSON.stringify(downloads));
});
await step('Upload metallic test model (adds second model)', async () => {
  await page.setInputFiles('#file', '/home/user/unzipped/test-model.glb');
  await wait(6000);
  const s = await stats();
  if (s.models !== '2') throw new Error('models=' + s.models);
});
await step('Upload diffuse test model (3 models total)', async () => {
  await page.setInputFiles('#file', '/home/user/unzipped/test-diffuse.glb');
  await wait(5000);
  const s = await stats();
  if (s.models !== '3') throw new Error('models=' + s.models);
});
await step('Delete first model via list', async () => {
  await page.evaluate(() => { const items = document.querySelectorAll('#modelList .item'); if (items[0]) { const del = items[0].querySelector('button:nth-of-type(2)') || items[0].querySelectorAll('.icobtn')[1]; del && del.click(); } });
  await wait(500);
  const s = await stats();
  if (s.models !== '2') throw new Error('models after delete=' + s.models);
});
await page.screenshot({ path: '/home/user/shots/single_afterloads.png' });

console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? errors.join('\n') : 'NONE ✔');
console.log('DOWNLOADS TRIGGERED:', downloads.join(', ') || 'none');
await browser.close();
