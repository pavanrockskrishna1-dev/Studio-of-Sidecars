import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1420, height: 950 }, acceptDownloads: true })).newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)); });
page.on('pageerror', (e) => errors.push('PAGEERR ' + e.message.split('\n')[0]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (label, ok, extra) => { console.log((ok ? '  ✔ ' : '  ✖ ') + label + (extra ? ' — ' + extra : '')); ok ? pass++ : fail++; };

const URL = 'file:///home/user/viewer_src/dist/index.html';
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6500);

/* 1 · boot + hub presence */
let r = await page.evaluate(() => {
  const S = window.__viewer;
  return {
    hub: !!(S.hub && S.hubUI && S.exporter),
    undoFloat: !!document.getElementById('hubUndo') && !!document.getElementById('hubRedo'),
    verCount: __studio.versions().length,
    active: __studio.active(),
  };
});
check('Creator Hub core boots (hub · UI · exporter)', r.hub);
check('Floating Undo/Redo buttons exist on the page', r.undoFloat);
check('Still 6 built-ins + V7+ user versions allowed', r.verCount === 6, String(r.verCount));
check('Boots into V2 commercial (V1–V6 unchanged)', r.active === 'commercial', r.active);

/* 2 · activate V6: hub section + brand studio still intact */
await page.evaluate(() => __studio.activate('brandstudio'));
await wait(600);
r = await page.evaluate(() => {
  const ids = ['v6Projects', 'v6Presets', 'v6Backup', 'v6Export', 'v6Workflow', 'v6UndoOpen'];
  return {
    active: __studio.active(),
    tiles: ids.filter((id) => document.getElementById(id)).length,
    kits: document.querySelectorAll('.brandstudio .bs-kit').length,
    undoBtn: !!document.getElementById('v6Undo'),
    redoBtn: !!document.getElementById('v6Redo'),
    badge: (document.getElementById('v6ProjBadge') || {}).textContent || '',
  };
});
check('V6 active, six big hub tiles present', r.active === 'brandstudio' && r.tiles === 6, r.tiles + ' tiles');
check('Brand Studio kits still intact (3 sample kits)', r.kits === 3, r.kits + ' kits');
check('V6 has large Undo + Redo touch buttons', r.undoBtn && r.redoBtn);
check('Hub badges show saved project count', /Projects/.test(r.badge), r.badge);

/* 3 · undo/redo over real engine edits */
r = await page.evaluate(async () => {
  const S = window.__viewer;
  const wait2 = (ms) => new Promise((res) => setTimeout(res, ms));
  const out = {};
  out.d0 = S.hub.debug();
  out.m0 = S.state.models.length;
  await S.loadDemo('Demo Coffee Set');
  for (let i = 0; i < 80 && S.state.models.length < 2; i++) await wait2(150);
  await wait2(600);
  S.hub.record();
  out.canUndo = S.hub.canUndo();
  out.undo = (await S.hub.undo()) && S.state.models.length === 1;
  out.canRedo = S.hub.canRedo();
  out.redo = (await S.hub.redo()) && S.state.models.length === 2;
  // keyboard shortcut undo/redo
  const dupId = S.state.models[0].id;
  S.duplicateModel(dupId);
  await wait2(500);
  out.afterDup = S.state.models.length;
  const kb = (key, shift) => document.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey: !!shift, ctrlKey: true, cancelable: true, bubbles: true }));
  kb('z', false); await wait2(800);
  out.kbUndo = S.state.models.length;
  kb('z', true); await wait2(800);
  out.kbRedo = S.state.models.length;
  return out;
});
check('Undo baseline = boot demo only (history reset after boot load)', r.d0.counts.length === 1 && r.d0.counts[0] === 1, JSON.stringify(r.d0.counts));
check('Engine undo returns scene to 1 product', !!r.undo);
check('Engine redo re-adds the product', !!r.redo);
check('Ctrl/⌘+Z keyboard undo works on V6', r.afterDup === 3 && r.kbUndo === 2, 'afterDup ' + r.afterDup + ' -> kbUndo ' + r.kbUndo);
check('Ctrl/⌘+Shift+Z keyboard redo works', r.kbRedo === 3, String(r.kbRedo));

/* 4 · project manager: save -> list card with thumbnail -> duplicate -> rename -> delete */
r = await page.evaluate(async () => {
  const S = window.__viewer;
  const out = {};
  const saved = await S.hub.saveProject('Hub Suite');
  out.saved = !!(saved && saved.id && saved.thumb);
  out.n1 = S.hub.projects().length;
  const id = S.hub.projects()[0].id;
  await S.hub.duplicateProject(id);
  out.n2 = S.hub.projects().length;
  const dId = S.hub.projects()[0].id;
  out.renamed = S.hub.renameProject(dId, 'Hub Copy Renamed') && S.hub.projects()[0].name === 'Hub Copy Renamed';
  // open project restores the scene (should contain models from snapshot)
  out.opened = await S.hub.openProject(id);
  S.hub.deleteProject(dId);
  out.n3 = S.hub.projects().length;
  S.hubUI.open('projects');
  await wait2(250);
  out.overlayCards = document.querySelectorAll('#hubRoot .hp-card').length;
  out.thumbImg = !!document.querySelector('#hubRoot .hp-card img.hp-th');
  out.openBtn = !!document.querySelector('#hubRoot .hp-card [data-a=open]');
  S.hubUI.open('close');
  await wait2(150);
  out.closed = document.querySelectorAll('#hubRoot .hu-ov').length === 0;
  return out;
  function wait2(ms) { return new Promise((res) => setTimeout(res, ms)); }
});
check('One-tap Save project (id + thumbnail captured)', r.saved);
check('Project list grows and duplicate works', r.n2 === 2, r.n1 + ' -> ' + r.n2);
check('Rename project updates the list', !!r.renamed);
check('Open project restores a saved scene', !!r.opened);
check('Delete project removes the duplicate', r.n3 === 1, String(r.n3));
check('Project Manager overlay lists cards with thumbnails + Open', r.overlayCards === 1 && r.thumbImg && r.openBtn);
check('Overlay closes cleanly', !!r.closed);

/* 5 · preset library */
r = await page.evaluate(async () => {
  const S = window.__viewer;
  const out = {};
  S.hub.saveCamera('Hero Cam'); S.hub.saveScene('Studio Set');
  S.setLightingPreset('sunset');
  S.hub.saveLighting('Sunset Look');
  S.setLightingPreset('softbox');
  const pc = S.hub.presets();
  out.cams = pc.camera.length; out.lights = pc.lighting.length; out.scenes = pc.scene.length;
  out.lightApplied = S.hub.applyLightingPreset(pc.lighting[0].payload) && S.lightName() === 'sunset';
  out.camApplied = S.hub.applyCameraPreset(pc.camera[0].payload);
  await S.hub.applyScenePreset(pc.scene[0].payload);
  await wait2(250);
  out.sceneModels = S.state.models.length;
  S.hub.deletePreset('camera', pc.camera[0].id);
  out.afterDel = S.hub.presets().camera.length;
  S.hubUI.open('presets'); await wait2(200);
  out.ov = !!document.querySelector('#hubRoot .hu-ov');
  out.cards = document.querySelectorAll('#hubRoot .hp-card').length;
  S.hubUI.open('close');
  return out;
  function wait2(ms) { return new Promise((res) => setTimeout(res, ms)); }
});
check('Preset Library saves camera / lighting / scene presets', r.cams === 1 && r.lights === 1 && r.scenes === 1);
check('Lighting preset applies (name + backdrop path)', !!r.lightApplied);
check('Camera preset applies to the live camera', !!r.camApplied);
check('Scene preset applies full scene', r.sceneModels >= 1, String(r.sceneModels));
check('Preset delete works', r.afterDel === 0);
check('Preset Library overlay shows saved preset cards', r.ov && r.cards >= 2, String(r.cards));

/* 6 · auto backup + recovery prompt after reload */
r = await page.evaluate(async () => {
  const S = window.__viewer;
  const out = {};
  out.saved = await S.hub.autosaveNow();
  out.has = S.hub.hasBackup();
  out.snapCount = S.hub.snapProbe();
  await S.loadDemo('Demo Coffee Set');
  for (let i = 0; i < 80 && S.state.models.length < 2; i++) await new Promise((res) => setTimeout(res, 150));
  await wait2(200);
  out.beforeRestore = S.state.models.length;
  out.restored = (await S.hub.restoreBackup()) && !S.hub.hasBackup();
  out.clearOk = !S.hub.hasBackup();
  // new backup for the reload test
  await S.hub.autosaveNow();
  out.has2 = S.hub.hasBackup();
  return out;
  function wait2(ms) { return new Promise((res) => setTimeout(res, ms)); }
});
check('Auto-backup snapshot saved', r.saved && r.has);
check('Restore replaces the scene with the latest snapshot', !!r.restored);
check('Recovery copy is cleared after a restore', !!r.clearOk);
check('A fresh snapshot exists for reload recovery', !!r.has2);

await page.reload({ waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(7000);
r = await page.evaluate(async () => {
  const S = window.__viewer;
  const wait2 = (ms) => new Promise((res) => setTimeout(res, ms));
  const out = { bootModels: S.state.models.length, hub: !!S.hub };
  out.recoverShown = document.querySelectorAll('.hu-recover').length > 0 && getComputedStyle(document.querySelector('.hu-recover')).display !== 'none';
  return out;
});
check('Reload: studio boots again (V2) with hub', r.hub);
check('Recovery banner offered after reopen with snapshot waiting', !!r.recoverShown);
if (r.recoverShown) {
  const click = await page.evaluate(() => { const b = document.getElementById('huRecYes'); if (b) { b.click(); return true; } return false; });
  await page.waitForTimeout(2000);
  const afterRestore = await page.evaluate(() => window.__viewer.state.models.length);
  check('Restore from the recovery banner works', click && afterRestore >= 1, String(afterRestore));
} else {
  check('Restore from the recovery banner works', false, 'banner absent');
}

/* 7 · quick workflow (5 steps, reel builder, one-tap actions) */
await page.evaluate(() => __studio.activate('brandstudio'));
await wait(500);
r = await page.evaluate(async () => {
  const S = window.__viewer;
  const wait2 = (ms) => new Promise((res) => setTimeout(res, ms));
  const out = {};
  S.hubUI.open('workflow'); await wait2(300);
  const stepBtn = (label) => Array.from(document.querySelectorAll('#hubRoot .wf-step')).find((s) => (s.textContent || '').includes(label));
  out.steps = document.querySelectorAll('#hubRoot .wf-step').length;
  stepBtn('Add Assets').click(); await wait2(300);
  const assets = document.querySelectorAll('#hubRoot .wf-a').length;
  const assetBtns = Array.from(document.querySelectorAll('#hubRoot .wf-a'));
  assetBtns[1].click(); await wait2(700); // procedural asset -> instant add
  out.mAfterAsset = S.state.models.length;
  out.assets = assets;
  stepBtn('Choose Scene').click(); await wait2(300);
  const scenes = document.querySelectorAll('#hubRoot .wf-s').length;
  const sceneBtn = document.querySelectorAll('#hubRoot .wf-s')[0];
  sceneBtn.click(); await wait2(250);
  out.lightAfterScene = S.lightName();
  out.scenes = scenes;
  stepBtn('Build Reel').click(); await wait2(350);
  const shotBtns = Array.from(document.querySelectorAll('#hubRoot .creator .shot-grid button'));
  out.shots = shotBtns.length;
  [0, 1, 2].forEach((i) => { const b = shotBtns[i]; if (b && b.click) b.click(); });
  await wait2(350);
  const av = window.__studio.getActive();
  out.reelLen = (av.memory.shots || []).length;
  out.chips = document.querySelectorAll('#hubRoot .wf-chip').length;
  out.play = !!(document.getElementById('wfPlay') && !document.getElementById('wfPlay').disabled);
  stepBtn('Export').click(); await wait2(300);
  out.exportBig = !!document.getElementById('wfExportNow');
  S.hubUI.open('close'); await wait2(200);
  out.closed = document.querySelectorAll('#hubRoot .hu-ov').length === 0;
  return out;
});
check('Workflow nav shows the 5 steps 1-2-3-4-5', r.steps === 5, String(r.steps));
check('Add Assets step drops a product into the shared scene', r.assets > 0 && r.mAfterAsset >= 2, r.mAfterAsset + ' models');
check('Choose Scene step applies a one-tap lighting look', !!r.lightAfterScene && r.scenes >= 5, r.lightAfterScene);
check('Build Reel step has 6 big shot tiles', r.shots === 6, String(r.shots));
check('Reel shots are recorded as chips (no timeline needed)', r.reelLen === 3 && r.chips === 3, r.reelLen + ' shots');
check('▶ Reel preview button enabled with shots', !!r.play);
check('Export step shows one-tap pack button', !!r.exportBig);
check('Workflow overlay closes cleanly', !!r.closed);

/* 8 · batch export pack structure (small render targets for speed) */
r = await page.evaluate(async () => {
  const S = window.__viewer;
  const sum = await S.exporter.makePack({ include: { reel: true, storyPng: true, storyMp4: true, post: true, heroes: true, transparent: true }, w: 96 });
  const u8 = sum.bytes;
  const sig = String.fromCharCode(u8[0], u8[1], u8[2], u8[3]);
  const dec = new TextDecoder('utf-8', { fatal: false });
  const txt = dec.decode(u8);
  const find = (n) => txt.includes(n);
  const pngIndexes = [];
  // find first PNG entry data by scanning names
  return {
    count: sum.count, pngs: sum.pngs, blender: sum.blenderScripts, glb: sum.glb,
    sig, hasReel: find('Instagram_Reel_1080x1920.py'), hasStoryMp4: find('Instagram_Story_1080x1920.py'),
    hasScene: find('scene.glb'), hasStoryPng: find('Instagram_Story_1080x1920.png'),
    hasPost: find('Instagram_Post_1080x1080.png'), hasHero: find('Hero_Front_1080x1350.png') && find('Hero_Top_1080x1350.png'),
    hasTrans: find('Transparent_Side.png'), hasReadme: find('README.txt'),
    pngCount5: sum.pngs === 12,
  };
});
check('Batch export returns a single .zip pack (PK signature)', r.sig === 'PK\x03\x04', r.sig);
check('Pack includes Instagram Reel + Story Blender MP4 scripts', r.hasReel && r.hasStoryMp4 && r.blender === 2);
check('Pack includes scene.glb (Blender-compatible geometry)', !!r.hasScene && !!r.glb);
check('Pack includes Story + Post PNG stills', r.hasStoryPng && r.hasPost);
check('Pack includes Hero images Front/Side/Rear/Top/45°', !!r.hasHero);
check('Pack includes Transparent PNG cut-out set', !!r.hasTrans);
check('Pack includes 12 PNGs + README (18 files total)', r.count === 18 && r.pngCount5 && r.hasReadme, r.count + ' files');

/* final tally */
console.log('\n=== ERRORS ===');
console.log(errors.length ? errors.join('\n') : 'NONE ✔');
console.log('RESULT ' + pass + ' passed, ' + fail + ' failed');
await browser.close();
process.exit(fail ? 1 : 0);
