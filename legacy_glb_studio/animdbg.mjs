import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1360, height: 850 } })).newPage();
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6000);
await page.evaluate(() => { [...document.querySelectorAll('details')].forEach(d => d.open = true); });

// Setup: play
await page.click('#btnAnim');
await page.waitForTimeout(800);

const dbg = await page.evaluate(() => {
  const v = window.__viewer;
  const out = { mixerCount: v.state.mixers.length, animPlaying: undefined };
  const g = v.state.models[0] && v.state.models[0].group;
  out.groupAnimCount = g.animations ? g.animations.length : 0;
  out.groupAnimNames = g.animations ? g.animations.map(a => a.name) : [];
  const mixer = v.state.mixers[0];
  if (mixer) {
    out.mixerTime = mixer.mixer.time;
    out.mixerActions = mixer.mixer._actions ? mixer.mixer._actions.map(a => ({ clip: a._clip.name, paused: a.paused, running: a.running, time: a.time, loop: a.loop })) : [];
  }
  // inspect node resolution: does root find WheelFront ?
  const wf = g && g.getObjectByName('WheelFront');
  out.foundWheelFront = !!wf;
  out.wheelQz = wf ? wf.quaternion.z : null;
  return out;
});
console.log(JSON.stringify(dbg, null, 1));
// sample over time
for (let i = 0; i < 4; i++) {
  await page.waitForTimeout(500);
  const t = await page.evaluate(() => {
    const v = window.__viewer, mixer = v.state.mixers[0];
    const g = v.state.models[0] && v.state.models[0].group;
    const wf = g && g.getObjectByName('WheelFront');
    return { t: mixer && +mixer.mixer.time.toFixed(3), actT: mixer && mixer.mixer._actions[0] && +mixer.mixer._actions[0].time.toFixed(3), qz: wf ? +wf.quaternion.z.toFixed(4) : null, eff: mixer && mixer.mixer._actions[0] && mixer.mixer._actions[0].getEffectiveTime().toFixed(3) };
  });
  console.log(JSON.stringify(t));
}
await browser.close();
