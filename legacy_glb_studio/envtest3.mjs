import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless:true, args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport:{width:1280,height:800} })).newPage();
await page.goto('file:///home/user/unzipped/STANDALONE_VIEWER.html',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1000);
const res = await page.evaluate(async () => {
  const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
  const out={};
  const run = async (withShadow) => {
    const cv=document.createElement('canvas'); cv.width=640; cv.height=400; document.body.appendChild(cv);
    const r=new THREE.WebGLRenderer({canvas:cv,antialias:true});
    r.setSize(640,400); r.setPixelRatio(1); r.toneMapping=THREE.ACESFilmicToneMapping;
    if(withShadow) r.shadowMap.enabled=true;
    const s=new THREE.Scene(); s.background=new THREE.Color(0x1a1a1a);
    const c=new THREE.PerspectiveCamera(50,1.6,0.1,1000); c.position.set(8,6,8); c.lookAt(0,0,0);
    const m=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.5,1.5), new THREE.MeshStandardMaterial({color:0xff6600, metalness:0.6, roughness:0.4}));
    m.position.y=1; m.castShadow=withShadow; m.receiveShadow=withShadow;
    s.add(m);
    if(withShadow){
      const d=new THREE.DirectionalLight(0xffffff,1); d.position.set(5,10,5); d.castShadow=true; s.add(d);
      s.add(new THREE.AmbientLight(0xffffff,0.6));
      const g=new THREE.Mesh(new THREE.PlaneGeometry(100,100), new THREE.ShadowMaterial({opacity:0.3}));
      g.rotation.x=-Math.PI/2; g.position.y=0; g.receiveShadow=true; s.add(g);
    } else {
      s.add(new THREE.DirectionalLight(0xffffff,1));
      s.add(new THREE.AmbientLight(0xffffff,0.6));
    }
    r.render(s,c);
    const gl=cv.getContext('webgl2');
    const b=new Uint8Array(640*400*4); gl.readPixels(0,0,640,400,gl.RGBA,gl.UNSIGNED_BYTE,b);
    let lit=0, orange=0;
    for(let i=0;i<b.length;i+=4){ const l=b[i]*0.3+b[i+1]*0.6+b[i+2]*0.1; if(l>50) lit++; if(b[i]>150&&b[i+1]>50&&b[i+1]<200&&b[i+2]<120) orange++; }
    return {litPct:+(100*lit/256000).toFixed(1), orange:+ (100*orange/256000).toFixed(2)};
  };
  out.noShadow=await run(false);
  out.withShadow=await run(true);
  return out;
});
console.log(JSON.stringify(res,null,1));
await browser.close();
