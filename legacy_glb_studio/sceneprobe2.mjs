import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless:true, args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const file = process.argv[2] || 'ADVANCED_MULTI_MODEL_VIEWER.html';
const ctx = await browser.newContext({ viewport:{width:1280,height:800} });
const PATCH = `
(function(){
  console.log('DBGPATCH_LOADED');
  var _render = WebGLRenderer.prototype.render;
  var n = 0;
  var targets = {1:1, 8:1, 300:1, 600:1};
  WebGLRenderer.prototype.render = function(scene, camera){
    _render.call(this, scene, camera);
    n++;
    if (targets[n]) {
      var out = { frame:n, children: [], meshes: [] };
      scene.traverse(function(o){ out.children.push({type:o.type, name:(o.name||'').slice(0,24), visible:o.visible}); });
      scene.traverse(function(o){
        if (o.isMesh && o.geometry){
          o.updateWorldMatrix(true,false);
          var b = new Box3().setFromObject(o);
          out.meshes.push({name:(o.name||o.geometry.type).slice(0,24), pos:o.position.toArray().map(function(x){return +x.toFixed(2);}), c:b.getCenter(new Vector3()).toArray().map(function(x){return +x.toFixed(2);}), size:b.getSize(new Vector3()).toArray().map(function(x){return +x.toFixed(2);})});
        }
      });
      out.camera = {pos: camera.position.toArray().map(function(x){return +x.toFixed(2);})};
      console.log('DBGSCENE ' + JSON.stringify(out).slice(0,2000));
    }
  };
})();`;
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', async (route) => {
  const resp = await route.fetch();
  let body = await resp.text();
  body += PATCH;
  await route.fulfill({ response: resp, body });
});
const page = await ctx.newPage();
const logs=[]; page.on('console', m=>{ const t=m.text(); if(t.includes('DBG')) logs.push(t.slice(0,2200)); if(m.type()==='error') logs.push('ERR:'+t.slice(0,300)); });
page.on('pageerror',e=>logs.push('PAGEERR '+e.message.split('\n')[0]));
await page.goto('file:///home/user/unzipped/'+file,{waitUntil:'domcontentloaded', timeout:30000});
await page.waitForTimeout(2000);
await page.setInputFiles('#file','/home/user/unzipped/test-model.glb');
await page.waitForTimeout(8000);
console.log('=== '+file+' ===\n'+logs.join('\n---\n')||'(nothing)');
await browser.close();
