import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1360, height: 850 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0,200)); });
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6000);
await page.evaluate(() => { [...document.querySelectorAll('details')].forEach(d => d.open = true); });

const qz = () => page.evaluate(() => {
  const v = window.__viewer, g = v.state.models[0] && v.state.models[0].group;
  const w = g && g.getObjectByName('WheelFront');
  w && w.updateWorldMatrix(true, false);
  return { qz: w && +w.quaternion.z.toFixed(4), m13: w ? +w.matrix.elements[13].toFixed(4) : null };
});
const before = await qz();
await page.click('#btnAnim'); // Play
await page.waitForTimeout(600);
const a1 = await qz();
await page.waitForTimeout(600);
const a2 = await qz();
await page.waitForTimeout(600);
const a3 = await qz();
await page.click('#btnAnim'); await page.waitForTimeout(250);
const p1 = await qz();
await page.waitForTimeout(700);
const p2 = await qz();
console.log(JSON.stringify({ before, a1, a2, a3, p1, p2 }, null, 1));
const moved = Math.max(Math.abs(a2.qz - a1.qz), Math.abs(a3.qz - a2.qz));
const paused = Math.abs(p2.qz - p1.qz) < 0.0005;
console.log(moved > 0.0005 ? '✔ wheels rotating while playing' : '✖ no rotation while playing');
console.log(paused ? '✔ wheels stop after Pause' : '✖ still moving after pause');
console.log('ERRORS:', errors.length ? errors.join(' | ') : 'NONE');
await browser.close();
