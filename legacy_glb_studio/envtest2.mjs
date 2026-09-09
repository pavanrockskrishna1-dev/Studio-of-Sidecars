import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless:true, args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport:{width:1280,height:800} })).newPage();
await page.goto('file:///home/user/unzipped/ADVANCED_MULTI_MODEL_VIEWER.html',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1500);
const res = await page.evaluate(async () => {
  const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
  const out = {};
  // Config A: mimic ADVANCED: canvas+antialias, ACES, cube basic magenta at origin, camera 8,6,8
  {
    const cv=document.createElement('canvas'); cv.width=1280; cv.height=800; document.body.appendChild(cv);
    const r=new THREE.WebGLRenderer({canvas:cv,antialias:true});
    r.setSize(1280,800); r.setPixelRatio(1); r.toneMapping=THREE.ACESFilmicToneMapping;
    const s=new THREE.Scene(); s.background=new THREE.Color(0x1a1a1a);
    const c=new THREE.PerspectiveCamera(50,1.6,0.1,1000); c.position.set(8,6,8); c.lookAt(0,0,0);
    s.add(new THREE.Mesh(new THREE.BoxGeometry(0.6,0.6,0.6), new THREE.MeshBasicMaterial({color:0xff00ff})));
    r.render(s,c);
    const gl=cv.getContext('webgl2'); const b=new Uint8Array(4);
    gl.readPixels(640,400,1,1,gl.RGBA,gl.UNSIGNED_BYTE,b);
    out.Acenter=[...b].join(',');
    // scan for any magenta pixel
    const buf=new Uint8Array(1280*800*4); gl.readPixels(0,0,1280,800,gl.RGBA,gl.UNSIGNED_BYTE,buf);
    let magenta=0; for(let i=0;i<buf.length;i+=4){if(buf[i]>200&&buf[i+2]>200&&buf[i+1]<120) magenta++;}
    out.AmagentaCount=magenta;
  }
  return out;
});
console.log(JSON.stringify(res,null,1));
await browser.close();
