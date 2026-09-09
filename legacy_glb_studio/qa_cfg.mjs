import { chromium } from 'playwright-core';
const exe = '/usr/bin/chromium';
const URL = 'file:///home/user/design/studio_sidecars_configurator.html';
const out = '/home/user/design/exports/';
const browser = await chromium.launch({ headless: true, executablePath: exe, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });

for (const [w, h] of [[1440, 900], [1194, 834], [834, 1112]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  page.on('pageerror', e => errs.push((e.message || '').split('\n')[0]));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const m = await page.evaluate(() => {
    const R = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(0), r: +b.right.toFixed(0), b: +b.bottom.toFixed(0), w: +b.width.toFixed(0) }; };
    const prod = R('.product'), dock = R('#dock'), ins = R('#inspector'), rail = R('#sideNav'), tb = R('#topbar');
    const img = document.querySelector('.product img');
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      prodWpct: prod && Math.round(100 * prod.w / innerWidth),
      prodCentered: prod && Math.abs((prod.x + prod.w / 2) - innerWidth / 2) < 8,
      dockClear: prod && dock ? dock.y0 ? prod.b - dock.y0 : dock.y - prod.b : null,
      imgOK: img.complete && img.naturalWidth > 0,
      imgNW: img.naturalWidth,
      inspHidden: ins && ins.x > innerWidth - 40,
      railInside: rail && rail.x >= 0 && rail.r <= innerWidth + 1,
      chipsScroll: tb ? tb.scrollWidth > tb.clientWidth + 2 : null,
    };
  });
  console.log(w + 'x' + h, JSON.stringify(m), 'errs', errs.length ? errs.join('|') : 'none');
  await page.close();
}

const shot = async (name, w, h, setup) => {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(600);
  if (setup) { await setup(p); await p.waitForTimeout(500); }
  await p.screenshot({ path: out + name });
  console.log('saved', name);
  await p.close();
};
// desktop default (inspector closed — immersive)
await shot('configurator_desktop_1440x900.png', 1440, 900);
// desktop: options open (inspector + floor tray)
await shot('configurator_desktop_options_1440x900.png', 1440, 900, async p => {
  await p.evaluate(() => { document.getElementById('insToggle').checked = true; });
  await p.click('label[for="tlFloor"]');
});
// honorpad landscape + portrait
await shot('configurator_honorpad_landscape_1194x834.png', 1194, 834);
await shot('configurator_honorpad_portrait_834x1112.png', 834, 1112);
// empty state
await shot('configurator_empty_1440x900.png', 1440, 900, async p => {
  await p.evaluate(() => document.body.classList.add('empty'));
});
await browser.close();
console.log('DONE');
