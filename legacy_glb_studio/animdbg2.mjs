import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1360, height: 850 } })).newPage();
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6000);
await page.evaluate(() => { [...document.querySelectorAll('details')].forEach(d => d.open = true); });
await page.click('#btnAnim');
await page.waitForTimeout(700);
const info = await page.evaluate(() => {
  const v = window.__viewer, g = v.state.models[0] && v.state.models[0].group;
  const clip = g && g.animations[0];
  const out = {};
  out.trackNames = clip ? clip.tracks.map(t => t.name) : [];
  out.childNames = g ? g.children.map(c => c.name).slice(0, 20) : [];
  const mixer = v.state.mixers[0] && v.state.mixers[0].mixer;
  if (mixer) {
    const act = mixer._actions[0];
    out.actionBindings = act._bindings ? act._bindings.map(b => ({ path: b.path, objName: b.node && b.node.name, prop: b.propertyName })) : [];
    // try force setTime
    try {
      mixer.setTime(0.5);
      out.qzAfterSetTime = g.getObjectByName('WheelFront') ? g.getObjectByName('WheelFront').quaternion.z : null;
    } catch (e) { out.setErr = e.message; }
  }
  return out;
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
