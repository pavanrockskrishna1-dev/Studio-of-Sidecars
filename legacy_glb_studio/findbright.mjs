import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(7500);
const info = await page.evaluate(async () => {
  const cv = document.querySelector('canvas'); const gl = cv.getContext('webgl2') || cv.getContext('webgl');
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const W = cv.width, H = cv.height, buf = new Uint8Array(W*H*4);
  gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,buf);
  const total = W*H;
  const hist = {};
  let maxLum = 0, maxPx = null, orange = 0, lit60 = 0;
  const step = 2;
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
    const i = (y*W + x)*4; const r=buf[i],g=buf[i+1],b=buf[i+2];
    const l = r*0.3+g*0.6+b*0.1;
    if (l > maxLum) { maxLum = l; maxPx = [x,y,r,g,b]; }
    if (r>110 && g>40 && g<200 && b<110) orange++;
    if (l>60) lit60++;
  }
  // background color sample far corner
  const c1 = [buf[4],buf[5],buf[6]];
  return { W, H, total, maxLum: Math.round(maxLum), maxPx, orange, lit60,
           bg: c1 };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
