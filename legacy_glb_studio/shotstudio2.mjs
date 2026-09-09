import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6500);
await page.evaluate(() => [...document.querySelectorAll('details')].forEach(d => d.open = true));
// remove coffee if present is not; add coffee then bike only shot
await page.click('#btnDemoCup'); await page.waitForTimeout(3000);
await page.selectOption('#envSel', 'coffeeshop'); await page.waitForTimeout(700);
await page.click('[data-cam="45"]'); await page.waitForTimeout(1300);
await page.screenshot({ path: '/home/user/shots/prem_coffee_45.png' });
// switch: remove coffee, keep bike, softbox turntable with guide
await page.evaluate(() => { const m = __viewer.state.models.find(x => x.name === 'Demo Coffee Set'); if (m) __viewer.removeModel(m.id); });
await page.selectOption('#envSel', 'softbox'); await page.waitForTimeout(700);
await page.click('#btnRotate'); await page.waitForTimeout(500);
await page.screenshot({ path: '/home/user/shots/prem_softbox_bike.png' });
// night cafe with coffee macro again to compare brighter
await page.click('#btnDemoCup'); await page.waitForTimeout(2500);
await page.selectOption('#envSel', 'nightcafe'); await page.waitForTimeout(700);
await page.click('[data-cam="macro"]'); await page.waitForTimeout(1200);
await page.screenshot({ path: '/home/user/shots/prem_night_macro.png' });
console.log('saved');
await browser.close();
