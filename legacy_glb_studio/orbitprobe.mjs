import { chromium } from 'playwright-core';
async function snap(page) {
  return page.evaluate(async () => {
    const cv=document.querySelector('canvas'); const gl=cv.getContext('webgl2')||cv.getContext('webgl');
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const W=cv.width,H=cv.height,buf=new Uint8Array(W*H*4);
    gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,buf);
    let lit=0,n=0; const step=32;
    for(let y=0;y<H;y+=step)for(let x=0;x<W;x+=step){const i=(y*W+x)*4; if(buf[i]*0.3+buf[i+1]*0.6+buf[i+2]*0.1>40) lit++; n++;}
    return (100*lit/n);
  });
}
const browser = await chromium.launch({ headless:true, args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
for (const file of ['ADVANCED_MULTI_MODEL_VIEWER.html','ULTIMATE_VIEWER.html','ULTIMATE_SPECIAL_VIEWER.html','FINAL_ULTIMATE_VIEWER.html','ABSOLUTE_FINAL_VIEWER.html']) {
  const page = await (await browser.newContext({ viewport:{width:1280,height:800} })).newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('file:///home/user/unzipped/'+file,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2000);
  await page.setInputFiles('#file','/home/user/unzipped/test-model.glb');
  await page.waitForTimeout(5000);
  const before = await snap(page);
  // drag to rotate
  try { await page.mouse.move(900,300); await page.mouse.down(); await page.mouse.move(500,320,{steps:12}); await page.mouse.up(); } catch(e){}
  await page.waitForTimeout(1500);
  const after = await snap(page);
  // drag more + zoom out
  try { await page.mouse.move(700,350); await page.mouse.down(); await page.mouse.move(700,550,{steps:12}); await page.mouse.up(); await page.waitForTimeout(800); } catch(e){}
  const after2 = await snap(page);
  console.log(`${file}: lit% before=${before} afterRotate=${after} afterZoom=${after2} | errs: ${errs.slice(0,3).join(';')||'none'}`);
  await page.close();
}
await browser.close();
