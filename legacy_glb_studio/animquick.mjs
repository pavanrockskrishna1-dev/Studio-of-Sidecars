import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6000);
await page.evaluate(() => [...document.querySelectorAll('details')].forEach(d => d.open = true));
const qz = () => page.evaluate(() => {
  const g = __viewer.state.models.find(m => m.name === 'Demo BBQ Bike').group;
  const w = g.getObjectByName('WheelFront');
  w.updateMatrixWorld(true);
  const e = new __viewer.THREE.Euler().setFromQuaternion(w.quaternion);
  return +w.quaternion.z.toFixed(5);
});
await page.click('#btnAnim'); await page.waitForTimeout(200);
const label = await page.textContent('#btnAnim');
const pts = [];
for (let i = 0; i < 6; i++) { pts.push(await qz()); await page.waitForTimeout(300); }
const moving = pts.some((v, i) => i > 0 && Math.abs(v - pts[i - 1]) > 0.0005);
console.log('btn label after click:', label);
console.log('wheel quaternion.z samples:', pts.join(', '));
console.log(moving ? '✔ wheels animate' : '✖ wheels static');
await page.click('#btnAnim'); await page.waitForTimeout(400);
const p1 = await qz(); await page.waitForTimeout(500); const p2 = await qz();
console.log('after pause:', p1, p2, (Math.abs(p1 - p2) < 0.0005 ? '✔ paused' : '✖ still moving'));
console.log('errors:', errs.length ? errs.join(' | ') : 'NONE');
await browser.close();
