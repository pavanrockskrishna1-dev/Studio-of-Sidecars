import { chromium } from 'playwright-core';
import fs from 'fs';

const FILES = [
  'STANDALONE_VIEWER.html',
  'ENHANCED_VIEWER.html',
  'ADVANCED_MULTI_MODEL_VIEWER.html',
  'ULTIMATE_VIEWER.html',
  'FINAL_ULTIMATE_VIEWER.html',
  'ABSOLUTE_FINAL_VIEWER.html',
  'ULTIMATE_SPECIAL_VIEWER.html',
];

const base = 'file:///home/user/unzipped/';
const model = '/home/user/unzipped/test-model.glb';

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});

for (const file of FILES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (['error','warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n  ${(e.stack||'').split('\n').slice(0,3).join('\n  ')}`));

  const result = { file, phases: {} };
  try {
    await page.goto(base + file, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2500);
    result.phases.init = [...logs]; logs.length = 0;

    // upload via the standard file input
    await page.setInputFiles('#file', model);
    await page.waitForTimeout(5000);
    result.phases.afterUpload = [...logs]; logs.length = 0;

    // Screenshot
    const shot = `/home/user/shots/${file.replace('.html', '')}.png`;
    fs.mkdirSync('/home/user/shots', { recursive: true });
    await page.screenshot({ path: shot });
    result.shot = shot;

    // Try clicking common buttons to trip runtime handler errors
    const btnProbes = [];
    const tryClick = async (sel, label) => {
      try {
        const el = page.locator(sel).first();
        if (await el.count() && await el.isVisible({ timeout: 800 }).catch(() => false)) {
          await el.click({ timeout: 1500 });
          await page.waitForTimeout(700);
          btnProbes.push(`${label}: OK`);
        } else { btnProbes.push(`${label}: not-visible`); }
      } catch (e) { btnProbes.push(`${label}: ERR ${String(e.message).split('\n')[0]}`); }
    };
    // generic probes; not all exist in every viewer
    for (const [sel, label] of [
      ['[onclick*="toggle" i], button:has-text("otate"), #autoRotate', 'auto-rotate'],
      ['button:has-text("apture"), #captureBtn', 'capture'],
      ['button:has-text("reset"), button:has-text("Reset")', 'reset'],
    ]) { await tryClick(sel, label); }
    result.phases.buttons = [...btnProbes, ...logs]; logs.length = 0;
  } catch (e) {
    result.fatal = String(e.message).split('\n').slice(0,5).join(' | ');
  }
  await ctx.close();
  const errCount = (result.phases.init.filter(l=>l.startsWith('[error]')||l.startsWith('[pageerror]')).length
    + result.phases.afterUpload.filter(l=>l.startsWith('[error]')||l.startsWith('[pageerror]')).length
    + result.phases.buttons.filter(l=>l.startsWith('[error]')||l.startsWith('[pageerror]')).length);
  result.totalRuntimeErrors = errCount;
  console.log(JSON.stringify(result, null, 1));
}
await browser.close();
console.log('DONE');
