import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(7000);
const measure = async () => page.evaluate(async () => {
  const v = __viewer; const cv = document.querySelector('canvas');
  const gl = cv.getContext('webgl2') || cv.getContext('webgl');
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const W = cv.width, H = cv.height, buf = new Uint8Array(W*H*4);
  gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,buf);
  let lit=0, n=0; const step=6;
  let maxL=0, maxLoc=[0,0], maxRGB=[0,0,0];
  for(let y=0;y<H;y+=step) for(let x=0;x<W;x+=step){ const i=(y*W+x)*4,r=buf[i],g=buf[i+1],b=buf[i+2];
    n++; const l=r*0.3+g*0.6+b*0.1; if(l>55) lit++; if(l>maxL){maxL=l;maxLoc=[x,y];maxRGB=[r,g,b];} }
  const pb = v.productBounds();
  return { litPct:+(100*lit/n).toFixed(2), maxL: Math.round(maxL), maxLoc, maxRGB,
    cam: v.camera.position.toArray().map(x=>+x.toFixed(2)),
    target: v.controls.target.toArray().map(x=>+x.toFixed(2)),
    R: +pb.radius.toFixed(3), C: pb.center.toArray().map(x=>+x.toFixed(2)) };
});
console.log('boot (9:16 hero):', JSON.stringify(await measure()));
for (const fmt of ['1:1','16:9','9:16']) {
  await page.evaluate((f) => { const v = __viewer; v.setFormat(f); v.presetCamera('front'); }, fmt);
  await page.waitForTimeout(1500);
  console.log('front ' + fmt + ':', JSON.stringify(await measure()));
}
await page.evaluate(() => { const v = __viewer; v.presetCamera('hero'); });
await page.waitForTimeout(1500);
console.log('hero 16:9:', JSON.stringify(await measure()));
await browser.close();
