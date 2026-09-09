import { chromium } from 'playwright-core';
const FILES = ['STANDALONE_VIEWER.html','ADVANCED_MULTI_MODEL_VIEWER.html','ULTIMATE_VIEWER.html','ENHANCED_VIEWER.html'];
const browser = await chromium.launch({ headless:true, args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
for (const file of FILES) {
  const page = await (await browser.newContext({ viewport:{width:1280,height:800} })).newPage();
  await page.goto('file:///home/user/unzipped/'+file,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2200);
  await page.setInputFiles('#file','/home/user/unzipped/test-model.glb');
  await page.waitForTimeout(6000);
  const res = await page.evaluate(async () => {
    const cv = document.querySelector('canvas'); if(!cv) return 'no canvas';
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    if(!gl) return 'no gl';
    // wait one rAF and read buffer right after the app's own rAF
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const W=cv.width,H=cv.height;
    const step=24; const buf=new Uint8Array(W*H*4);
    gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,buf);
    let lit=0, n=0, minX=1e9,maxX=-1,minY=1e9,maxY=-1, anyOrange=0;
    for(let y=0;y<H;y+=step) for(let x=0;x<W;x+=step){
      const i=(y*W+x)*4; const r=buf[i],g=buf[i+1],b=buf[i+2];
      const l=r*0.3+g*0.6+b*0.1; n++;
      if(l>40){ lit++; minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y); if(r>110&&g>40&&g<180&&b<90) anyOrange++; }
    }
    // clear color (background)
    let clr='';
    try{ const c=new Uint8Array(4); gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,c); clr=[...c].join(',');}catch(e){}
    return {w:W,h:H, litPct:(100*lit/n).toFixed(1), bbox: lit? {minX,minY,maxX,maxY, pw:(maxX-minX), ph:(maxY-minY)} : null, orange: anyOrange, corner:clr};
  });
  console.log(`${file}: ${JSON.stringify(res)}`);
  await page.close();
}
await browser.close();
