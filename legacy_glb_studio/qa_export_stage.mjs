import { chromium } from 'playwright-core';
const exe = '/usr/bin/chromium';
const URL = 'file:///home/user/design/studio_sidecars_premium_ui.html';
const out = '/home/user/design/exports/';
const browser = await chromium.launch({ headless: true, executablePath: exe, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });

for (const [w, h] of [[1440, 900], [1194, 834], [834, 1112]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const R = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(0), y: +b.y.toFixed(0), r: +b.right.toFixed(0), b: +b.bottom.toFixed(0), w: +b.width.toFixed(0), h: +b.height.toFixed(0), cy: +((b.y + b.bottom) / 2).toFixed(0) }; };
    const vw = innerWidth, vh = innerHeight;
    const img = document.querySelector('.ss-img');
    const prod = R('.ss-wrap'), plat = R('.ss-plat'), dock = R('#dock');
    return {
      overflow: document.documentElement.scrollWidth > vw + 1,
      imgOK: img.complete && img.naturalWidth > 0,
      imgExactSrc: (img.src || '').indexOf('base64') > -1,
      prodWpct: prod && Math.round(100 * prod.w / vw),
      prodTop: prod && prod.y, prodBottom: prod && prod.b,
      platTop: plat && plat.y, platCy: plat && plat.cy, platBottom: plat && plat.b,
      dockTopY: dock && dock.y,
      prodCentered: prod && Math.abs((prod.x + prod.w / 2) - vw / 2) < 6,
      clearanceDock: prod && dock ? dock.y - prod.b : null,
      clearancePlate: prod && plat ? plat.cy - prod.b : null,
    };
  });
  console.log(w + 'x' + h, JSON.stringify(m));
  await page.close();
}

const shot = async (name, w, h, setup) => {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(550);
  if (setup) { await setup(p); await p.waitForTimeout(400); }
  await p.screenshot({ path: out + name });
  console.log('saved', name);
  await p.close();
};
await shot('artboard_desktop_1440x900.png', 1440, 900);
await shot('artboard_floor_presets_1440x900.png', 1440, 900, async p => { await p.click('label[for="tlFloor"]'); });
await shot('artboard_honorpad_landscape_1194x834.png', 1194, 834);
await shot('artboard_honorpad_portrait_834x1112.png', 834, 1112);
await shot('artboard_empty_state_1440x900.png', 1440, 900, async p => { await p.click('label[for="stEmpty"]'); });
await browser.close();
console.log('DONE');
