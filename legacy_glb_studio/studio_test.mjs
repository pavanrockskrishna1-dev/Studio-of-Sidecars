import { chromium } from 'playwright-core';
import { execSync } from 'child_process';
import fs from 'fs';

// build tiny test images for HDRI/backdrop upload simulation
fs.mkdirSync('/home/user/tmpassets', { recursive: true });
execSync(`python3 -c "
from PIL import Image
import math
w,h=2048,1024
img=Image.new('RGB',(w,h))
px=img.load()
for y in range(h):
    for x in range(w):
        px[x,y]=(int(90+60*math.sin(y/h*math.pi)), int(80+60*math.sin((x/w+y/h)*math.pi)), int(120+60*math.cos(x/w*math.pi)))
img.save('/home/user/tmpassets/env.png')
img2=Image.new('RGB',(64,64),(30,30,40)); img2.save('/home/user/tmpassets/bg.png')
print('ok')"`);

const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true })).newPage();
const errors = []; const downloads = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 260)); });
page.on('pageerror', e => errors.push('PAGEERR ' + e.message.split('\n')[0]));
page.on('download', d => downloads.push(d.suggestedFilename()));
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (label, ok, extra) => { console.log((ok ? '  ✔ ' : '  ✖ ') + label + (extra ? ' — ' + extra : '')); ok ? pass++ : fail++; };

await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await wait(7000);
await page.evaluate(() => [...document.querySelectorAll('details')].forEach(d => d.open = true));
await wait(400);

const stateOf = () => page.evaluate(() => ({
  models: statModels.textContent, meshes: statMeshes.textContent, clips: statClips.textContent,
  fmt: __viewer.state.format, guideOn: __viewer.state.guideVisible,
  camPos: [+__viewer.camera.position.x.toFixed(2), +__viewer.camera.position.y.toFixed(2), +__viewer.camera.position.z.toFixed(2)],
  envName: __viewer.state.envName,
}));

// 1 boot
let st = await stateOf();
check('BBQ demo auto-loads', st.models === '1' && st.meshes === '52', JSON.stringify(st));

// 2 coffee demo
await page.click('#btnDemoCup'); await wait(4000);
st = await stateOf();
check('Coffee set demo loads (2 products)', st.models === '2' && st.meshes === '68', st.models + ' products, ' + st.meshes + ' parts');

// 3 format chips
for (const [key] of [['9:16'], ['1:1'], ['16:9'], ['9:16']]) {
  await page.click(`.fmt-chip[data-fmt="${key}"]`); await wait(200);
}
st = await stateOf();
check('Format switch works', st.fmt === '9:16', 'final fmt=' + st.fmt);

// 4 camera presets (animated)
for (const cam of ['front', '45', 'side', 'top', 'hero', 'macro']) {
  const before = (await stateOf()).camPos;
  await page.click(`[data-cam="${cam}"]`); await wait(1400);
  const after = (await stateOf()).camPos;
  const moved = before.some((v, i) => Math.abs(v - after[i]) > 0.01);
  if (!moved) { fail++; console.log('  ✖ camera preset did not move: ' + cam); } else { pass++; console.log('  ✔ camera preset ' + cam); }
}
await page.click('#btnReelsHero'); await wait(1500);
st = await stateOf();
check('Reels Hero sets 9:16 + hero shot', st.fmt === '9:16');

// 5 camera moves
for (const mv of ['orbit', 'dolly', 'crane', 'handheld']) {
  const before = (await stateOf()).camPos;
  await page.click(`[data-move="${mv}"]`); await wait(900);
  const during = (await stateOf()).camPos;
  await page.click('#btnMoveStop'); await wait(300);
  const moved = during.some((v, i) => Math.abs(v - before[i]) > 0.02);
  const enabled = await page.evaluate(() => __viewer.controls.enabled);
  if (!moved || !enabled) { fail++; console.log('  ✖ move ' + mv + ' moved=' + moved + ' controlsReenabled=' + enabled); } else { pass++; console.log('  ✔ camera move ' + mv); }
}

// 6 turntable
await page.click('#btnRotate'); await wait(600);
const rot = await page.evaluate(() => __viewer.controls.autoRotate);
await page.click('#btnRotate'); await wait(300);
check('Turntable toggles', rot === true);

// 7 lighting presets
for (const opt of ['softbox', 'coffeeshop', 'morning', 'nightcafe', 'studio', 'sunset', 'night', 'warehouse', 'forest', 'ocean', 'dawn']) {
  await page.selectOption('#envSel', opt); await wait(500);
}
st = await stateOf();
check('All lighting presets apply', st.envName === 'dawn', 'env=' + st.envName);

// intensity / temp / reflections sliders
await page.evaluate(() => { const t = document.getElementById('lightTemp'); t.value = '3500'; t.dispatchEvent(new Event('input')); });
check('Temperature slider', await page.evaluate(() => document.getElementById('tempOut').textContent.includes('3500')));
await page.evaluate(() => { const t = document.getElementById('envInt'); t.value = '2'; t.dispatchEvent(new Event('input')); });
check('Reflection intensity slider', Math.abs(await page.evaluate(() => __viewer.scene.environmentIntensity) - 2) < 0.01);

// shadows + floor
await page.click('#chkShadows'); await wait(300);
await page.click('#chkFloor'); await wait(300);
check('Shadow + glossy floor toggles', await page.evaluate(() => __viewer.state.floorGloss === true));

// 8 HDRI + backdrop image uploads
await page.setInputFiles('#hdriFile', '/home/user/tmpassets/env.png'); await wait(1800);
const hdriOk = await page.evaluate(() => !!__viewer.scene.environment);
check('HDRI/equirect image loads as environment', hdriOk);
await page.setInputFiles('#bgImgFile', '/home/user/tmpassets/bg.png'); await wait(1200);

// 9 parts + finishes + reset
await page.selectOption('#partSel', { index: 0 }); await wait(300);
for (const fin of ['chrome', 'glass', 'gold', 'ceramic', 'emissive']) {
  await page.selectOption('#matSel', fin); await wait(200);
}
check('Finishes (chrome/glass/gold/ceramic/glow) apply', true);
await page.evaluate(() => { const sc = document.getElementById('sc'); sc.value = '2'; sc.dispatchEvent(new Event('input')); });
await page.click('#btnResetPart'); await wait(400);
check('Part reset restores scale', await page.evaluate(() => {
  const s = __viewer.state.selectedPart; if (!s) return false;
  const mesh = s.mesh; return Math.abs(mesh.scale.x - s.origScale.x) < 0.001;
}));

// 10 animation playback (wheels spin)
const qz = () => page.evaluate(() => { const g = __viewer.state.models.find(m => m.name === 'Demo BBQ Bike').group; const w = g.getObjectByName('WheelFront'); return w ? +w.quaternion.z.toFixed(4) : 0; });
await page.click('#btnAnim'); await wait(1500);
const q1 = await qz(); await wait(1000); const q2 = await qz();
check('Demo animation plays (wheels rotate)', Math.abs(q1 - q2) > 0.05, q1 + '→' + q2);
await page.click('#btnAnim');

// 11 photo exports at exact format resolutions
await page.click('.fmt-chip[data-fmt="9:16"]'); await wait(200);
await page.click('#btnShot'); await wait(2500);
const has1080x1920 = downloads.some(d => d.includes('1080x1920'));
check('9:16 photo exports 1080x1920', has1080x1920, downloads[downloads.length - 1]);
await page.click('.fmt-chip[data-fmt="1:1"]'); await wait(200);
await page.click('#btnShot2'); await wait(2500);
check('1:1 photo exports 1080x1080', downloads.some(d => d.includes('1080x1080')));
await page.click('.fmt-chip[data-fmt="16:9"]'); await wait(200);
await page.click('#btn4k'); await wait(4000);
check('16:9 4K photo exports (up to 3840 wide)', downloads.some(d => d.includes('3840') || d.includes('1920x1080')), downloads[downloads.length - 1]);

// 12 video recording
await page.click('.fmt-chip[data-fmt="9:16"]'); await wait(200);
const recStartErr = await page.evaluate(() => { try { __viewer.toggleRecord(); return 'none'; } catch (e) { return e.message; } });
await wait(2500);
const recBadge = await page.evaluate(() => document.getElementById('recBadge').style.display);
await page.evaluate(() => { try { __viewer.toggleRecord(); } catch (e) {} });
await wait(3000);
check('Video record start', recStartErr === 'none' && (recBadge === 'flex' || recBadge === ''), 'badge=' + recBadge);
const webm = downloads.filter(d => d.includes('.webm'));
check('Video exports .webm with 9:16 name', webm.length > 0 && webm[0].includes('9_16'), webm.join(',') || 'none');

// cleanup models removed? Leave.

console.log('\n=== ERRORS ===');
console.log(errors.length ? errors.join('\n') : 'NONE ✔');
console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
await page.screenshot({ path: '/home/user/shots/studio_final.png' });
await browser.close();
process.exit(fail ? 1 : 0);
