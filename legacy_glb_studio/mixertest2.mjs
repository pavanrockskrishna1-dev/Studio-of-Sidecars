import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1360, height: 850 } })).newPage();
const warns = [];
page.on('console', m => { if (m.type() === 'warning') warns.push(m.text().slice(0,200)); });
page.on('pageerror', e => warns.push('ERR '+e.message.split('\n')[0]));
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6000);
const res = await page.evaluate(async () => {
  const v = window.__viewer, THREE = v.THREE;
  const g = v.state.models[0] && v.state.models[0].group;
  const clip = g && g.animations[0];
  const mixer = new THREE.AnimationMixer(g);
  const action = mixer.clipAction(clip);
  action.play();
  for (let i = 0; i < 5; i++) mixer.update(0.2);   // -> t=1.0
  const wf = g.getObjectByName('WheelFront');
  const pb = action._propertyBindings && action._propertyBindings[0];
  let nodeInfo = null;
  if (pb) {
    try { nodeInfo = { track: action._clip.tracks[0].name, node: pb.binding && pb.binding.node ? pb.binding.node.name : '(no binding.node)', acc: !!pb.acc } } catch(e){ nodeInfo = 'err '+e.message; }
  }
  return { actionTime: action.time, qz: wf.quaternion.z, pbCount: action._propertyBindings && action._propertyBindings.length, nodeInfo,
           childNames: g.children.map(c=>c.name).filter(n=>/Wheel/.test(n)) };
});
console.log(JSON.stringify(res, null, 1));
console.log('WARNINGS:', warns.length ? warns.join(' | ') : 'none');
await browser.close();
