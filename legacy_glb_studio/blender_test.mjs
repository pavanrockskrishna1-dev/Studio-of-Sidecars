import { chromium } from 'playwright-core';
import fs from 'fs';
import { execSync } from 'child_process';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 920 }, acceptDownloads: true })).newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERR ' + e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (label, ok, extra) => { console.log((ok ? '  ✔ ' : '  ✖ ') + label + (extra ? ' — ' + extra : '')); ok ? pass++ : fail++; };

fs.mkdirSync('/home/user/render_test', { recursive: true });
await page.goto('file:///home/user/viewer_src/dist/index.html', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6500);
await page.evaluate(() => [...document.querySelectorAll('#panel details')].forEach(d => d.open = true));

/* ---- boot state ---- */
check('Blender Python registered as V3 built-in', await page.evaluate(() => __studio.versions().some(v => v.id === 'blender' && v.short === 'V3')));
const chips = await page.evaluate(() => [...document.querySelectorAll('#topbar .vchip')].map(c => (c.dataset.vid || '') + ':' + c.textContent.trim()));
check('Toolbar shows V1 · V2 · Blender · Creator · Asset Library + ＋ V6…', chips.length === 7 && chips.some(c => c.includes('Blender Python')) && chips.some(c => c.includes('Creator Studio')) && chips.some(c => c.includes('Asset Library')) && chips.some(c => c.includes('Brand Studio')) && chips.some(c => c.includes('＋ V7…')), chips.join(' | '));
check('Boot active stays V2 commercial (studio untouched)', await page.evaluate(() => __studio.active()) === 'commercial');
check('BBQ demo still loads (1 model, 52 parts)', await page.evaluate(() => statModels.textContent === '1' && statMeshes.textContent === '52'));

/* ---- switch to Blender version ---- */
await page.click('.vchip[data-vid="blender"]'); await wait(1000);
check('Blender version panels mounted', await page.evaluate(() =>
  !!document.getElementById('blRender') && !!document.getElementById('blLight') && !!document.getElementById('blSamples') && !!document.getElementById('blName')));
check('Live editor still rendering behind Blender panel', await page.evaluate(() => !!document.getElementById('cv')));

/* ---- set MP4 orbit, name, quality, night café ---- */
await page.click('button[data-out="mp4"]'); await wait(300);
const motionActive = await page.evaluate(() => {
  const b = document.querySelector('#blMotionWrap .seg button.active');
  return b ? b.dataset.preset : null;
});
check('MP4 reveals motion chips (orbit preselected)', motionActive === 'orbit', 'active=' + motionActive);
await page.fill('#blName', 'my_reel');
await page.selectOption('#blSamples', '256');
await page.selectOption('#blLight', 'nightcafe'); await wait(300);
check('Lighting select updates live preview to nightcafe', await page.evaluate(() => __viewer.lightName() === 'nightcafe'));

/* ---- one-click render pack ---- */
const dlP = page.waitForEvent('download', { timeout: 30000 });
await page.click('#blRender');
const dl = await dlP;
const zipPath = '/home/user/render_test/blender_ui.zip';
await dl.saveAs(zipPath);
check('Downloaded one-click Blender pack (.zip)', dl.suggestedFilename().endsWith('.zip'), dl.suggestedFilename());
await page.screenshot({ path: '/home/user/shots/blender_version_panel.png' });

/* ---- inspect the zip ---- */
execSync(`rm -rf /home/user/render_test/bui && mkdir -p /home/user/render_test/bui && cd /home/user/render_test/bui && unzip -o -q ${zipPath}`);
const files = fs.readdirSync('/home/user/render_test/bui').sort();
check('Zip contains 5 files (py + glb + launchers + readme)', files.length === 5, files.join(','));
check('Zip includes one-click launchers', files.includes('render_windows.bat') && files.includes('render_mac_linux.sh') && files.includes('README_RENDER.txt'));

const py = fs.readFileSync('/home/user/render_test/bui/instagram_render.py', 'utf8');
const m = py.match(/CONFIG = json\.loads\(r'''(.*?)'''\)/s);
let cfg = null; try { cfg = JSON.parse(m[1]); } catch (e) {}
check('Generated pipeline embeds full render config', !!cfg);
if (cfg) {
  check('Vertical 1080×1920 target', cfg.size[0] === 1080 && cfg.size[1] === 1920, JSON.stringify(cfg.size));
  check('MP4 output file requested', cfg.out === 'my_reel.mp4', cfg.out);
  check('Orbit motion + duration captured', cfg.motion === 'orbit' && cfg.duration >= 3, cfg.motion + '/' + cfg.duration);
  check('Samples + denoise captured', cfg.samples === 256 && cfg.denoise === true);
  check('Lighting rig (nightcafe) captured', cfg.presetKey === 'nightcafe' && cfg.lights.length >= 3 && cfg.panels.length > 0);
  check('GLB geometry embedded (52 meshes)', cfg.glb_b64 && cfg.glb_b64.length > 10000);
}
check('Py is self-contained bpy pipeline', /import bpy/.test(py) && /CYCLES|'CYCLES'/.test(py) && py.includes('1080'));

// validate the embedded GLB parses & contains the full model
const glbBuf = fs.readFileSync('/home/user/render_test/bui/scene.glb');
const jlen = glbBuf.readUInt32LE(12);
const glbJson = JSON.parse(glbBuf.slice(20, 20 + jlen).toString('utf8'));
check('scene.glb contains 52 product meshes', glbJson.meshes.length === 52, 'meshes=' + glbJson.meshes.length);
check('scene.glb has 52 materials', glbJson.materials.length === 52);
check('Launchers mention Blender 3.4+', /Blender 3\.4\+/.test(fs.readFileSync('/home/user/render_test/bui/render_windows.bat', 'utf8') + fs.readFileSync('/home/user/render_test/bui/render_mac_linux.sh', 'utf8')));

/* ---- switching back keeps the model & never reloads ---- */
await page.evaluate(() => { window.__marker = 'survives'; });
await page.click('.vchip[data-vid="classic"]'); await wait(700);
check('Switch back to V1 keeps product (no reload)', await page.evaluate(() => window.__marker === 'survives' && statModels.textContent === '1' && statMeshes.textContent === '52'));
check('Blender panels unmounted after switch', await page.evaluate(() => !document.getElementById('blRender')));
await page.click('.vchip[data-vid="commercial"]'); await wait(500);
check('V2 restored, still 1/52', await page.evaluate(() => statModels.textContent === '1' && statMeshes.textContent === '52' && __viewer.formatOf() === '9:16'));

console.log('\n=== ERRORS ===');
console.log(errors.length ? errors.join('\n') : 'NONE ✔');
console.log(`RESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
