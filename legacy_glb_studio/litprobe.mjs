import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(7000);
const lit = async () => page.evaluate(async () => {
  const cv = document.querySelector('canvas'); const gl = cv.getContext('webgl2') || cv.getContext('webgl');
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const W = cv.width, H = cv.height, buf = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  let lit = 0; const step = 20;
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
    const i = (y * W + x) * 4;
    if (buf[i]*0.3 + buf[i+1]*0.6 + buf[i+2]*0.1 > 55) lit++;
  }
  const n = Math.ceil(H/step) * Math.ceil(W/step);
  return { pct: +(100*lit/n).toFixed(2), W, H };
});
console.log('bike softbox lit%:', JSON.stringify(await lit()));
await page.selectOption('#envSel', 'coffeeshop'); await page.waitForTimeout(600);
console.log('bike coffeeshop lit%:', JSON.stringify(await lit()));
await page.selectOption('#envSel', 'morning'); await page.waitForTimeout(600);
console.log('bike morning lit%:', JSON.stringify(await lit()));
await page.click('#btnDemoCup'); await page.waitForTimeout(3000);
await page.click('[data-cam="hero"]'); await page.waitForTimeout(1400);
console.log('bike+cup hero lit%:', JSON.stringify(await lit()));
await page.evaluate(() => { const m = __viewer.state.models.find(x => x.name === 'Demo Coffee Set'); if (m) __viewer.removeModel(m.id); __viewer.presetCamera('hero'); });
await page.waitForTimeout(1400);
console.log('bike only hero lit%:', JSON.stringify(await lit()));
await browser.close();
