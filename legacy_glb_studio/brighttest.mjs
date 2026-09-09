import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(7500);
const measure = () => page.evaluate(async () => {
  const cv = document.querySelector('canvas'); const gl = cv.getContext('webgl2') || cv.getContext('webgl');
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const W = cv.width, H = cv.height, buf = new Uint8Array(W*H*4);
  gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,buf);
  let lit=0, orange=0, total=0;
  for (let y=0;y<H;y+=4) for(let x=0;x<W;x+=4){ const i=(y*W+x)*4, r=buf[i],g=buf[i+1],b=buf[i+2];
    total++; if(r*0.3+g*0.6+b*0.1>60) lit++; if(r>120&&g>40&&g<200&&b<110) orange++; }
  return {litPct:+(100*lit/total).toFixed(2), orange};
});
console.log('baseline:', JSON.stringify(await measure()));
await page.evaluate(() => {
  const v = __viewer; v.scene.environmentIntensity = 0;
  v.scene.children.forEach(c => { if (c.isDirectionalLight) c.intensity *= 8; });
  v.scene.children.forEach(c => { if (c.isAmbientLight) c.intensity *= 4; });
});
await page.waitForTimeout(400);
console.log('lights maxed:', JSON.stringify(await measure()));
// also check from a known close camera without 9:16 far constraints
await page.evaluate(() => { const v = __viewer; v.state.format='1:1'; v.presetCamera('front'); });
await page.waitForTimeout(1600);
console.log('front @1:1:', JSON.stringify(await measure()));
await browser.close();
