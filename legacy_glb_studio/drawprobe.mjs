import { chromium } from 'playwright-core';
const FILES = ['STANDALONE_VIEWER.html','ADVANCED_MULTI_MODEL_VIEWER.html','ULTIMATE_VIEWER.html'];
const browser = await chromium.launch({ headless:true, args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
for (const file of FILES) {
  const ctx = await browser.newContext({ viewport:{width:1280,height:800} });
  await ctx.addInitScript(() => {
    window.__draws = 0; window.__clears = 0;
    for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
      if (!C) continue;
      const de = C.prototype.drawElements, da = C.prototype.drawArrays;
      C.prototype.drawElements = function(...a){ window.__draws++; return de.apply(this,a); };
      C.prototype.drawArrays = function(...a){ window.__draws++; return da.apply(this,a); };
      const cl = C.prototype.clear;
      C.prototype.clear = function(...a){ window.__clears++; return cl.apply(this,a); };
    }
  });
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0])); page.on('console',m=>{if(m.type()==='error')errs.push('[c]'+m.text());});
  await page.goto('file:///home/user/unzipped/'+file,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2500);
  const base = await page.evaluate(()=>({d:window.__draws,c:window.__clears}));
  await page.setInputFiles('#file','/home/user/unzipped/test-model.glb');
  await page.waitForTimeout(7000);
  const post = await page.evaluate(()=>({d:window.__draws,c:window.__clears}));
  // canvas info
  const cvs = await page.evaluate(()=>{
    const cv=document.querySelector('canvas'); if(!cv) return null;
    const r=cv.getBoundingClientRect();
    return {w:cv.width,h:cv.height,rw:r.width,rh:r.height, x:r.x,y:r.y};
  });
  const pix = await page.evaluate(()=>{
    // sample via 2d copy (may be blank without preserveDrawingBuffer; still try)
    try {
      const cv=document.querySelector('canvas');
      const t=document.createElement('canvas'); t.width=cv.width; t.height=cv.height;
      const g=t.getContext('2d'); g.drawImage(cv,0,0);
      const d=g.getImageData(0,0,t.width,t.height).data;
      let sum=0, lit=0; const n=t.width*t.height;
      for(let i=0;i<d.length;i+=4){ const l=d[i]*0.3+d[i+1]*0.6+d[i+2]*0.1; sum+=l; if(l>50) lit++; }
      return {avg:(sum/n).toFixed(1), litPct:(100*lit/n).toFixed(1)};
    } catch(e){ return 'err:'+e.message; }
  });
  console.log(`${file}\n  draws: ${base.d} -> ${post.d} | clears: ${base.c} -> ${post.c} | errs: ${errs.length?errs.slice(0,4).join(' ;; '):'none'}`);
  console.log(`  canvas rect: ${JSON.stringify(cvs)}\n  pixel avg(0-255)=${pix.avg}, lit=${pix.litPct}%`);
  await ctx.close();
}
await browser.close();
