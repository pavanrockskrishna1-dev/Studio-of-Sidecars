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
    const img = document.querySelector('.cv-scene img');
    return { imgOK: img.complete && img.naturalWidth > 0, overflow: document.documentElement.scrollWidth > innerWidth + 1, cards: document.querySelectorAll('details.card[open]').length };
  });
  console.log(w + 'x' + h, JSON.stringify(m));
  await page.close();
}
const shot = async (name, w, h, setup) => {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(500);
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
