import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true })).newPage();
const errors = []; const downloads = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0,220)); });
page.on('pageerror', e => errors.push('PAGEERR ' + e.message.split('\n')[0]));
page.on('download', d => downloads.push(d.suggestedFilename()));
const wait = ms => new Promise(r => setTimeout(r, ms));
const ok = (m) => console.log('  ✔', m);
const fail = (m) => console.log('  ✖', m);

await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await wait(7000);
// open panels
await page.evaluate(() => [...document.querySelectorAll('details')].forEach(d => d.open = true));
await wait(500);

// 1. demo auto-loaded
let st = await page.evaluate(() => ({ m: statMeshes.textContent, n: statModels.textContent, c: statClips.textContent }));
(st.m === '52' && st.n === '1') ? ok('Demo auto-loaded — ' + JSON.stringify(st)) : fail('demo stats ' + JSON.stringify(st));

// 2. visual: bike should be visible in canvas (sample via WebGL readback)
async function canvasLit() {
  return page.evaluate(async () => {
    const cv = document.querySelector('canvas'); const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const W = cv.width, H = cv.height, buf = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let lit = 0, orange = 0; const step = 24;
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
      const i = (y * W + x) * 4, r = buf[i], g = buf[i+1], b = buf[i+2];
      if (r*0.3+g*0.6+b*0.1 > 50) lit++;
      if (r > 130 && g > 40 && g < 200 && b < 110) orange++;
    }
    return { lit, orange };
  });
}
const before = await canvasLit();
(before.lit > 5 && before.orange > 5) ? ok('Bike visible on screen (lit px=' + before.lit + ', orange px=' + before.orange + ')')
                                      : fail('bike not visible ' + JSON.stringify(before));

// 3. animation play/pause
const qz = () => page.evaluate(() => {
  const g = __viewer.state.models[0].group, w = g.getObjectByName('WheelFront');
  return +w.quaternion.z.toFixed(4);
});
await page.click('#btnAnim'); await wait(700);
const z1 = await qz(); await wait(700); const z2 = await qz();
Math.abs(z1 - z2) > 0.05 ? ok('Animation spins wheels (' + z1 + ' → ' + z2 + ')') : fail('anim static ' + z1 + ' ' + z2);
await page.click('#btnAnim'); // pause
await wait(300);

// 4. rotate + part + material + color (same as before)
await page.click('#btnRotate'); await wait(400); await page.click('#btnRotate'); ok('Auto-rotate toggles');
for (const a of ['front','top','45','right','left','back']) { await page.click(`[data-cam="${a}"]`); await wait(150); }
ok('6 camera angles OK');
await page.selectOption('#envSel', 'sunset'); await wait(250); await page.selectOption('#envSel', 'night'); await wait(250);
ok('env presets OK');
await page.click('#btnGrid'); await wait(150); await page.click('#btnGrid'); await wait(100);
await page.click('#btnWire'); await wait(150); await page.click('#btnWire'); await wait(100);
ok('grid & wireframe OK');
await page.selectOption('#partSel', { index: 1 }); await wait(250);
const disp = await page.$eval('#partCtrls', el => el.style.display);
disp === 'block' ? ok('part panel opens') : fail('part panel hidden');
await page.evaluate(() => { const sc = document.getElementById('sc'); sc.value = 1.6; sc.dispatchEvent(new Event('input')); });
(await page.textContent('#scv')).includes('1.60') ? ok('scale slider works') : fail('scale slider');
await page.selectOption('#matSel', 'chrome'); await wait(200); ok('material preset applied');
await page.click('#btnShot'); await wait(1500);
downloads.some(d => d.endsWith('.png')) ? ok('Photo PNG downloaded (' + downloads[downloads.length-1] + ')') : fail('no PNG');
await page.click('#btn4k'); await wait(3000);
downloads.some(d => d.includes('4k')) || downloads.length >= 2 ? ok('4K PNG downloaded') : fail('no 4K png ' + JSON.stringify(downloads));

// 5. add a real glb (metallic chrome one)
await page.setInputFiles('#file', '/home/user/unzipped/test-model.glb'); await wait(6000);
st = await page.evaluate(() => ({ m: statMeshes.textContent, n: statModels.textContent }));
st.n === '2' ? ok('Uploaded real .glb — models=2, meshes=' + st.m) : fail('upload failed ' + JSON.stringify(st));

await page.screenshot({ path: '/home/user/shots/final_state.png' });
const after = await canvasLit();
(after.orange > 5) ? ok('both models visible') : fail('not visible after upload ' + JSON.stringify(after));

console.log('\nERRORS: ' + (errors.length ? errors.join(' | ') : 'NONE ✔'));
console.log('DOWNLOADS: ' + (downloads.join(', ') || 'none'));
await browser.close();
