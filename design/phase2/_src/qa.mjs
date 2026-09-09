import { chromium } from 'playwright-core';
import fs from 'fs';
const exe = '/usr/bin/chromium';
const file = 'file:///home/user/design/phase2/studio_sidecars_phase2_interactive.html';
const OUT = '/home/user/design/phase2/exports';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ headless: true, executablePath: exe, args: ['--enable-unsafe-swiftshader', '--no-sandbox'] });

async function fresh(viewport) {
  const p = await b.newPage({ viewport });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror:' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console:' + m.text()); });
  await p.goto(file, { waitUntil: 'load' });
  await p.waitForTimeout(700);
  return { p, errs };
}
async function state(p) {
  return await p.evaluate(() => {
    const bs = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom) }; };
    const cur = document.querySelector('#p2Cur');
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      env: (document.querySelector('.p2-envcard.on b') || {}).textContent || null,
      imgLoaded: cur ? cur.complete && cur.naturalWidth > 0 : false,
      cam: document.querySelector('.cv-status .pill.on') ? document.querySelector('.cv-status .pill.on').textContent : null,
      envbarVisible: document.body.classList.contains('p2-envs'),
      stage: bs('.p2s-frame'), topbar: bs('#topbar'), dock: bs('#dock'), envToggle: bs('.p2-envtoggle'), envBar: bs('.p2-envbar'),
      toast: !!document.querySelector('.p2-toast.show'),
    };
  });
}

// ---------- 1440x900 desktop: default ----------
{
  const { p, errs } = await fresh({ width: 1440, height: 900 });
  await p.waitForTimeout(1800); // splash gone
  const s0 = await state(p);
  await p.screenshot({ path: OUT + '/p2_desktop_default_1440x900.png' });
  // open env bar, switch to #4 aviation hangar
  await p.click('.p2-envtoggle');
  await p.waitForTimeout(600);
  await p.click('.p2-envcard:nth-child(4)');
  await p.waitForTimeout(1300);
  const s1 = await state(p);
  await p.screenshot({ path: OUT + '/p2_desktop_env_switch_1440x900.png' });
  // camera Detail chip
  await p.click('.dk-btn[for=tlCam]');
  await p.waitForTimeout(500);
  const detailChip = await p.evaluate(() => { const a = [...document.querySelectorAll('.t-cam .rchip')].find(c => c.textContent.trim() === 'Detail'); a && a.click(); return !!a; });
  await p.waitForTimeout(1200);
  const s2 = await state(p);
  // lighting Night neon
  await p.click('.dk-btn[for=tlLight]');
  await p.waitForTimeout(500);
  await p.evaluate(() => { const a = [...document.querySelectorAll('.t-light .rchip')].find(c => c.textContent.trim() === 'Night neon'); a && a.click(); });
  await p.waitForTimeout(1200);
  const s3 = await state(p);
  await p.screenshot({ path: OUT + '/p2_desktop_options_1440x900.png' });
  // render 1:1 + export modal
  await p.evaluate(() => { const a = [...document.querySelectorAll('.t-render .rchip')].find(c => c.textContent.trim() === '1:1 square'); a && a.click(); });
  await p.waitForTimeout(600);
  await p.click('#tbExport');
  await p.waitForTimeout(3300);
  const s4 = await state(p);
  await p.screenshot({ path: OUT + '/p2_desktop_export_1440x900.png' });
  // close export modal
  await p.evaluate(() => { const d = document.querySelector('#p2ExpClose'); d && d.click(); });
  await p.waitForTimeout(300);
  // learn tour
  await p.click('#tbLearn');
  await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + '/p2_desktop_onboarding_1440x900.png' });
  await p.evaluate(() => { const d = document.querySelector('#p2Done'); d && d.click(); });
  console.log('DESKTOP', JSON.stringify({ default: s0, envSw: s1, cam: s2, light: s3, export: s4, errs }, null, 0));
  await p.close();
}
// ---------- 1194x834 honorpad landscape ----------
{
  const { p, errs } = await fresh({ width: 1194, height: 834 });
  await p.waitForTimeout(1700);
  const s0 = await state(p);
  await p.click('.p2-envtoggle');
  await p.waitForTimeout(500);
  await p.click('.p2-envcard:nth-child(10)'); // marble
  await p.waitForTimeout(1300);
  const s1 = await state(p);
  await p.screenshot({ path: OUT + '/p2_honorpad_landscape_1194x834.png' });
  console.log('TABLET-L', JSON.stringify({ default: s0, envSw: s1, errs }));
  await p.close();
}
// ---------- 834x1112 honorpad portrait ----------
{
  const { p, errs } = await fresh({ width: 834, height: 1112 });
  await p.waitForTimeout(1700);
  const s0 = await state(p);
  await p.screenshot({ path: OUT + '/p2_honorpad_portrait_834x1112.png' });
  console.log('TABLET-P', JSON.stringify({ default: s0, errs }));
  await p.close();
}
await b.close();
console.log('DONE');
