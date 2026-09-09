import { chromium } from 'playwright-core';

const URL = 'file:///home/user/viewer_src/dist/index.html';
const ARGS = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'];
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + '  ' + extra); } };

const browser = await chromium.launch({ headless: true, args: ARGS });

async function runLayout(name, vw, vh) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  const errs = [];
  page.on('pageerror', e => errs.push((e.message || '').split('\n')[0]));
  await page.goto(URL, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(3200);
  const m = await page.evaluate(() => {
    const R = (id) => { const el = document.getElementById(id); if (!el) return null; const b = el.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    const rects = { topStrip: R('topStrip'), brand: R('appBrand'), actions: R('appActions'), panel: R('panel'), inspector: R('inspector'), dock: R('dock'), floatBar: R('floatBar') };
    const vw = innerWidth, vh = innerHeight;
    const inside = (r) => !!(r && r.x >= -1 && r.y >= -1 && r.x + r.w <= vw + 1 && r.y + r.h <= vh + 1);
    const overlap = (a, b) => !!(a && b && !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y));
    const checks = {
      topIn: inside(rects.topStrip), panelIn: inside(rects.panel), inspIn: inside(rects.inspector),
      dockIn: inside(rects.dock),
      brandLeft: !!(rects.brand && rects.actions && rects.brand.x < rects.actions.x && rects.actions.x < rects.topStrip.x + rects.topStrip.w),
      inspAboveDock: !overlap(rects.inspector, rects.dock),
    };
    return { rects, checks };
  });
  const r = m.rects;
  console.log(`\n== ${name} (${vw}x${vh}) ==`);
  console.log('  rects', JSON.stringify(r));
  ok(`${name}: topStrip inside`, m.checks.topIn);
  ok(`${name}: panel inside`, m.checks.panelIn);
  ok(`${name}: inspector inside`, m.checks.inspIn);
  ok(`${name}: dock inside`, m.checks.dockIn);
  ok(`${name}: brand left of actions`, m.checks.brandLeft);
  ok(`${name}: inspector above dock`, m.checks.inspAboveDock);
  const fd = await page.evaluate(() => getComputedStyle(document.getElementById('floatBar')).display);
  ok(`${name}: float hidden`, fd === 'none');
  // switch to V6 and re-check
  await page.evaluate(() => { const c = document.querySelector('.vchip[data-vid="brandstudio"]'); if (c) c.click(); });
  await page.waitForTimeout(600);
  const r6 = await page.evaluate(() => {
    const el = document.getElementById('inspector'); const b = el.getBoundingClientRect();
    const dock = document.getElementById('dock'); const d = dock.getBoundingClientRect();
    return { onV6: /V6/.test((document.querySelector('.vchip.on') || {}).textContent || ''),
      navBrandOn: document.getElementById('navBrand').classList.contains('on'),
      inspBottom: +(b.y + b.height).toFixed(1), dockTop: +d.y.toFixed(1), dockBottom: +(d.y + d.height).toFixed(1), vh: innerHeight };
  });
  ok(`${name}: V6 switch`, r6.onV6);
  ok(`${name}: nav Brand on`, r6.navBrandOn);
  ok(`${name}: inspector ends above dock at V6`, r6.inspBottom <= r6.dockTop, JSON.stringify(r6));
  console.log(`  ${name} page errors: ${errs.length ? errs.join(' | ') : 'NONE'}`);
  await page.close();
}

await runLayout('desktop', 1280, 900);
await runLayout('tablet-portrait', 834, 1112);
await runLayout('tablet-landscape', 1194, 834);
await runLayout('narrow-phone', 412, 915);

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
