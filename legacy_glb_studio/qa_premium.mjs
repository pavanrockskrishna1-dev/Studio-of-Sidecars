import { chromium } from 'playwright-core';
const exe = '/usr/bin/chromium';
const URL = 'file:///home/user/design/studio_sidecars_premium_ui.html';
const out = '/home/user/design/exports/';
const browser = await chromium.launch({ headless: true, executablePath: exe, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });

for (const [w, h] of [[1440, 900], [1194, 834], [834, 1112]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  page.on('pageerror', e => errs.push('PE ' + (e.message || '').split('\n')[0]));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const m = await page.evaluate(() => {
    const R = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(0), y: +b.y.toFixed(0), r: +b.right.toFixed(0), b: +b.bottom.toFixed(0), w: +b.width.toFixed(0), h: +b.height.toFixed(0) }; };
    const img = document.querySelector('.ss-img');
    const prod = R('.ss-wrap'), plat = R('.ss-plat'), dock = R('#dock'), canvas = R('.canvas');
    return {
      err: document.querySelectorAll('.ss-stage').length,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      imgOK: img.complete && img.naturalWidth > 0,
      imgNW: img.naturalWidth,
      prodWpct: prod && Math.round(100 * prod.w / innerWidth),
      prodCentered: prod && Math.abs((prod.x + prod.w / 2) - innerWidth / 2) < 6,
      platCyVsImgBottom: plat && prod ? (plat.y + plat.bottom) / 2 - prod.b : null,
      dockClearance: prod && dock ? dock.y - prod.b : null,
      prodBottom: prod && prod.b,
      prodTop: prod && prod.y,
      canvasBottom: canvas && canvas.b,
    };
  });
  console.log(w + 'x' + h, JSON.stringify(m), '| page errs', errs.length ? errs.join('|') : 'none');
  await page.close();
}

// seam metric on desktop render: sample luminance just outside vs inside the image rect
const pg = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await pg.goto(URL, { waitUntil: 'load' });
await pg.waitForTimeout(700);
const seam = await pg.evaluate(() => {
  const img = document.querySelector('.ss-img');
  const b = img.getBoundingClientRect();
  // draw into a tiny offscreen canvas by capturing screenshot is not possible here; use computed style bg color outside
  // Instead sample via elementFromPoint is color-blind; approximate with screenshot-based analysis later.
  return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), r: +b.right.toFixed(1), btm: +b.bottom.toFixed(1), w: +b.width.toFixed(1) };
});
console.log('img rect', JSON.stringify(seam));
// screenshot raw then analyze in node by decoding PNG? simpler: take screenshot of the seam strip
const clip = { x: Math.max(0, seam.x - 30), y: seam.y + 120, width: 60, height: 260 };
await pg.screenshot({ path: '/home/user/shots/seam_left.png', clip });
const clipT = { x: Math.max(0, seam.x + seam.w / 2 - 130), y: Math.max(0, seam.y - 24), width: 260, height: 48 };
await pg.screenshot({ path: '/home/user/shots/seam_top.png', clip: clipT });
await pg.close();

const shot = async (name, w, h, setup) => {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(600);
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
