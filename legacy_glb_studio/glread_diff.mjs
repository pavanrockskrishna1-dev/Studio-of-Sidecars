import { chromium } from 'playwright-core';
const http=await import('http'); const fs=await import('fs'); const path=await import('path');
const server=http.createServer((req,res)=>{let p=path.join('/home/user/webtest',req.url.split('?')[0]); if(!fs.existsSync(p)){res.statusCode=404;res.end();return;} res.setHeader('content-type','text/html'); res.end(fs.readFileSync(p));});
await new Promise(r=>server.listen(8920,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']});
const page=await (await browser.newContext({viewport:{width:1280,height:800}})).newPage();
await page.goto('http://127.0.0.1:8920/adv_fix2.html',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2000);
await page.setInputFiles('#file','/home/user/unzipped/test-diffuse.glb');
await page.waitForTimeout(5000);
const res=await page.evaluate(async ()=>{
  const cv=document.querySelector('canvas'); const gl=cv.getContext('webgl2')||cv.getContext('webgl');
  await new Promise(r=>requestAnimationFrame(r));
  const W=cv.width,H=cv.height, buf=new Uint8Array(W*H*4);
  gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,buf);
  const step=16; let lit=0,n=0; let minX=1e9,maxX=-1,minY=1e9,maxY=-1, orange=0;
  for(let y=0;y<H;y+=step)for(let x=0;x<W;x+=step){const i=(y*W+x)*4; const r=buf[i],g=buf[i+1],b=buf[i+2]; const l=r*0.3+g*0.6+b*0.1; n++;
    if(l>50){lit++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y); if(r>110&&g<200&&b<100&&r>g) orange++;}}
  // center pixels
  const cen=(W/2+H/2*W)*4|0;
  return {litPct:+(100*lit/n).toFixed(2), orange, bbox: lit?{x:minX,y:minY,w:maxX-minX,h:maxY-minY}:null, center:[...buf.slice(cen,cen+4)]};
});
console.log(JSON.stringify(res,null,1));
await browser.close(); server.close();
