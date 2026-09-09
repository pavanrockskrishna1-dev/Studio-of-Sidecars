import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6500);
await page.evaluate(() => [...document.querySelectorAll('details')].forEach(d => d.open = true));

// Night cafe + coffee set hero
await page.selectOption('#envSel', 'nightcafe'); await page.waitForTimeout(800);
await page.evaluate(() => { document.getElementById('chkFloor').click(); }); await page.waitForTimeout(500);
await page.click('#btnDemoCup'); await page.waitForTimeout(3500);
await page.click('[data-cam="hero"]'); await page.waitForTimeout(1400);
await page.screenshot({ path: '/home/user/shots/prem_night_coffee.png' });
await page.selectOption('#envSel', 'coffeeshop'); await page.waitForTimeout(800);
await page.click('[data-cam="macro"]'); await page.waitForTimeout(1300);
await page.screenshot({ path: '/home/user/shots/prem_macro_cup.png' });
// back to bike with softbox + turntable on frame guide visible
await page.evaluate(() => __viewer.state.models.forEach((m, i) => { if (m.name === 'Demo Coffee Set') __viewer.state.models.splice(i, 1) && scene.remove(m.group); }));
await page.evaluate(() => { const m = __viewer.state.models.find(x => x.name === 'Demo Coffee Set'); if (m) { __viewer.scene.remove(m.group); __viewer.state.models = __viewer.state.models.filter(x => x !== m); __viewer.state.meshes = __viewer.state.meshes.filter(x => x.modelId !== m.id); } __viewer.refreshStatsAndUI?.(); });
await page.selectOption('#envSel', 'softbox'); await page.waitForTimeout(600);
await page.click('#btnRotate'); await page.waitForTimeout(300);
await page.screenshot({ path: '/home/user/shots/prem_softbox_bike.png' });
console.log('screens saved');
await browser.close();
