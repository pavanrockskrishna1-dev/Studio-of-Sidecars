import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const logs = [];
page.on('console', m => logs.push('[' + m.type() + '] ' + m.text().slice(0, 300)));
page.on('pageerror', e => logs.push('[pageerror] ' + e.message.split('\n')[0]));
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(8000);
const hasViewer = await page.evaluate(() => typeof window.__viewer);
const boot = await page.evaluate(() => ({
  models: typeof statModels !== 'undefined' ? statModels.textContent : 'missing statModels',
  detail: document.querySelectorAll('details').length,
  toast: document.getElementById('toast').textContent,
}));
console.log('__viewer typeof:', hasViewer);
console.log('boot:', JSON.stringify(boot));
console.log('logs:\n' + (logs.slice(0, 15).join('\n') || 'none'));
await browser.close();
