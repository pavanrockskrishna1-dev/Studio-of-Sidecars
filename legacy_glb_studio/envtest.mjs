import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless:true, args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
for (const file of ['STANDALONE_VIEWER.html','ADVANCED_MULTI_MODEL_VIEWER.html']) {
  const page = await (await browser.newContext({ viewport:{width:1280,height:800} })).newPage();
  await page.goto('file:///home/user/unzipped/'+file,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1500);
  const res = await page.evaluate(async () => {
    const out = {};
    try {
      const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
      // 1) brand new canvas
      const cv = document.createElement('canvas'); cv.width=256; cv.height=256; document.body.appendChild(cv);
      const r = new THREE.WebGLRenderer({ canvas: cv, antialias: false });
      const s = new THREE.Scene(); s.background = new THREE.Color(0x0000ff);
      const c = new THREE.PerspectiveCamera(50,1,0.1,100); c.position.set(0,0,3);
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color:0xff0000}));
      s.add(cube);
      r.render(s,c);
      const gl = cv.getContext('webgl2');
      const buf = new Uint8Array(4);
      gl.readPixels(128,128,1,1,gl.RGBA,gl.UNSIGNED_BYTE,buf);
      out.ownCanvasCenter = [...buf].join(',');
    } catch(e){ out.err = e.message.split('\n')[0]; }
    return out;
  });
  console.log(file, JSON.stringify(res));
  await page.close();
}
await browser.close();
