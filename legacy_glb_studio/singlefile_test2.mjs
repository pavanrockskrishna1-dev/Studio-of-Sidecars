import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1360, height: 850 } })).newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0,200)); });
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(7000);
const wait = ms => new Promise(r => setTimeout(r, ms));

// open the collapsed sections
await page.evaluate(() => {
  [...document.querySelectorAll('details')].forEach(d => d.open = true);
});
await wait(400);

const wheelRot = () => page.evaluate(() => {
  const v = window.__viewer; if (!v) return null;
  const g = v.state.models[0] && v.state.models[0].group;
  const w = g && g.getObjectByName('WheelFront');
  return w ? w.rotation.z : null;
});
const r0 = await wheelRot();
await page.click('#btnAnim');   // Play
await wait(1300);
const r1 = await wheelRot();
await wait(1300);
const r2 = await wheelRot();
const txt = await page.textContent('#btnAnim');
console.log('wheels spin?  r0=%s r1=%s r2=%s | btn=%s', r0 && r0.toFixed(3), r1 && r1.toFixed(3), r2 && r2.toFixed(3), txt);
console.log(r1 !== r2 && Math.abs(r2 - r1) > 0.5 ? '✔ ANIMATION PLAYING (wheels rotating)' : '✖ wheels not moving');
await page.click('#btnAnim'); // pause
await wait(400);
const t3 = await page.textContent('#btnAnim');
console.log('after pause btn =', t3);

// Part selection: choose a part, ensure ctrl panel appears, slide scale
await page.selectOption('#partSel', { index: 0 });
await wait(300);
const disp = await page.$eval('#partCtrls', el => el.style.display);
console.log('part panel visible:', disp === 'block');
await page.evaluate(() => { const sc = document.getElementById('sc'); sc.value = 2; sc.dispatchEvent(new Event('input')); });
const scTxt = await page.textContent('#scv');
console.log('scale value set:', scTxt);

// Material preset (selects then resets to '')
await page.selectOption('#matSel', 'chrome');
await wait(250);
console.log('material select reset ok:', await page.$eval('#matSel', el => el.value === ''));

// Photo from panel + 4K (4K briefly) — downloads? verify no error only
await page.click('#btnShot');
await wait(1200);
await page.click('#btn4k');
await wait(2600);

// Record attempt (may be unsupported headless) — ensure no crash
await page.click('#btnRec');
await wait(900);
const recTxt = await page.textContent('#btnRec');
await page.click('#btnRec');   // stop / cancel if started
await wait(500);

console.log('\nERRORS:', errors.length ? errors.join('\n') : 'NONE ✔');
await page.screenshot({ path: '/home/user/shots/single_final.png' });
await browser.close();
