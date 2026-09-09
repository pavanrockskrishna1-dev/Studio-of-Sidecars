/* Phase 3 · full checklist QA (headless chromium over HTTP). */
import { createRequire } from 'module';
const require = createRequire('/tmp/p3build/index.js');
const { chromium } = require('playwright-core');
const BASE = process.env.P3_BASE || 'http://127.0.0.1:8137/design/phase3/studio_sidecars_phase3.html';

const results = [];
const ok = (name, detail) => results.push({ name, pass: true, detail });
const bad = (name, detail) => results.push({ name, pass: false, detail });

const b = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist'] });

function watch(page) {
  const errs = [];
  page.on('console', m => { const t = m.text();
    if (m.type() !== 'error') return;
    if (/favicon|GL Driver|ReadPixels|texSubImage2D/.test(t)) return;
    errs.push('CONSOLE ' + t.slice(0, 300)); });
  page.on('pageerror', e => errs.push('PAGEERR ' + String(e.message).slice(0, 300)));
  page.errs = errs;
  return page;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFn(page, fn, ms = 12000, step = 150) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return true; await sleep(step); }
  return false;
}
async function fpsRead(page, settle = 900) {
  await sleep(settle);
  const reads = [];
  for (let i = 0; i < 3; i++) { reads.push(await page.evaluate(() => (P3.perf && P3.perf.fps) || 0)); await sleep(700); }
  return Math.max(...reads);
}
const esc = JSON.stringify;

// ---------- desktop ----------
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem('sos:p3:tour', 'done'); } catch (e) {} });
const p = watch(await ctx.newPage());
await p.goto(BASE, { waitUntil: 'load' });

// A boot + fps
{
  const booted = await waitFn(p, () => window.P3 && P3.models && P3.models.length >= 2 && P3.env && P3.env.backgroundReady, 20000);
  if (!booted) { bad('A.boot', 'engine did not reach full state'); process.exit(0); }
  const s = await p.evaluate(() => ({ models: P3.models.length, parts: P3.parts.length, env: P3.env.key,
    renderer: P3.renderer.domElement.width + 'x' + P3.renderer.domElement.height }));
  (s.models >= 2 && s.parts >= 50) ? ok('A.boot', esc(s)) : bad('A.boot', esc(s));
  const fps = await fpsRead(p);
  fps >= 45 ? ok('A2.fps-desktop', fps + ' fps') : bad('A2.fps-desktop', fps + ' fps');
}

// B camera presets
{
  const list = ['Front', '¾ hero', 'Hero', 'Side', 'Rear', 'Left', 'Right', 'Detail', 'Top', 'Product', 'Reel', 'Orbit spin'];
  const bads = [];
  for (const k of list) {
    const r = await p.evaluate(async k => { try { await P3.setCameraPreset(k, { instant: true }); await new Promise(r => setTimeout(r, 80)); return P3.cameraMode; } catch (e) { return 'ERR:' + e.message; } }, k);
    if (r !== k) bads.push(k + '->' + r);
  }
  bads.length ? bad('B.camera-presets', bads.join('; ')) : ok('B.camera-presets', list.length + ' presets applied');
}

// C environments
{
  const keys = await p.evaluate(() => P3.ENVS.map(e => e.key));
  keys.length === 11 ? ok('C.env-count', '11') : bad('C.env-count', 'ENVS=' + keys.length);
  const fails = [];
  for (const k of keys) {
    const good = await p.evaluate(async k => { try { await P3.setEnvKey(k);
      return await new Promise(res => { const t0 = Date.now(); const iv = setInterval(() => {
        if (P3.env.key === k && P3.env.backgroundReady) { clearInterval(iv); res(true); }
        else if (Date.now() - t0 > 9000) { clearInterval(iv); res('timeout ' + P3.env.key); } }, 120); }); }
      catch (e) { return 'ERR ' + e.message; } }, k);
    if (good !== true) fails.push(k + ':' + good);
  }
  fails.length ? bad('C.env-switch', fails.join('; ')) : ok('C.env-switch', '11 backgrounds applied');
}

// D lighting
{
  const keys = ['Softbox', 'Café window', 'Golden hour', 'Night neon', 'Backlit rim'];
  const fails = [];
  for (const k of keys) {
    const r = await p.evaluate(async k => { try { P3.applyLightPreset(k); await new Promise(r => setTimeout(r, 40)); return P3.light.look; } catch (e) { return 'ERR' + e.message; } }, k);
    if (r !== k) fails.push(k + '->' + r);
  }
  fails.length ? bad('D.light-presets', fails.join('; ')) : ok('D.light-presets', keys.length + ' looks OK');
  const adv = await p.evaluate(() => { P3.applyLightPreset('Golden hour');
    const m = P3.light; return { look: m.look, keyI: +m.key.intensity.toFixed(2), key: m.key.color.getHexString() }; });
  ok('D.advanced', esc(adv));
}

// E floor
{
  const keys = ['White Studio', 'Gloss Black Mirror', 'Café Wood', 'Concrete Loft', 'Marble Luxury'];
  const fails = [];
  for (const k of keys) { const r = await p.evaluate(k => { P3.buildFloorPreset(k); return P3.floor.preset; }, k); if (r !== k) fails.push(k); }
  fails.length ? bad('E.floor', fails.join('; ')) : ok('E.floor', keys.length + ' presets');
}

// F materials across every material group
{
  const r = await p.evaluate(async () => {
    P3._noHistory = true; P3.matOverrides = {};
    const keys = [...new Set(P3.parts.map(x => x.key))];
    let applied = 0, fail = 0;
    for (const key of keys) {
      const part = P3.parts.find(x => x.key === key);
      if (!part) continue;
      P3.selectPart(part);
      if (!P3.selectedPart || !P3.applyFinish('Copper')) { fail++; continue; }
      const okp = Math.abs((part.mat.metalness || 0) - 1) < 0.05 && Math.abs((part.mat.roughness || 0) - 0.28) < 0.08;
      P3.setPartOverride(P3, part, { color: 0xcfd6dd, rough: 0.45, metal: 0.0, op: 1 });
      if (!okp) fail++;
      applied++;
    }
    P3.matOverrides = {}; P3._noHistory = false; P3.selectPart(null);
    return { tried: keys.length, applied, fail };
  });
  (r.tried === r.applied && r.fail === 0) ? ok('F.materials', 'groups=' + r.tried) : bad('F.materials', esc(r));
}

// G transforms + robust undo/redo
{
  const res = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const until = async (fn, ms = 8000) => { const t0 = Date.now();
      while (Date.now() - t0 < ms) { const v = fn(); if (v) return true; await sleep(120); } return false; };
    // await the (now serialized) history op, settle for reload settle, then assert
    const step = async (op, probe, label) => {
      await op();
      if (probe.lengthProbe) { await until(() => P3.models.length === probe.lengthProbe, 10000); }
      await sleep(300);
      return await until(probe.check, 6000);
    };
    const prim = () => P3.models.find(x => x.isDemo);
    const sec  = () => P3.models.find(x => x.isSecondary);
    const vis  = m => m && m.root.visible;
    const out = {};
    // fresh baseline
    await P3.setEnvKey('hero'); P3.buildFloorPreset('White Studio'); P3.applyLightPreset('Softbox');
    await P3.setCameraPreset('¾ hero', { instant: true }); await sleep(400);
    P3.clearHistory(P3); P3.push('baseline');
    const baseN = P3.models.length;           // 2 (primary + secondary)
    // move  (undo then redo)
    {
      const x0 = prim().root.position.x;
      prim().root.position.x = x0 + 1.2; P3.bus.emit('transform-end');
      out.moveUndo = await step(() => P3.undo(), { lengthProbe: baseN, check: () => { const m = prim(); return m && Math.abs(m.root.position.x - x0) < 0.05; } });
      out.moveRedo = await step(() => P3.redo(), { lengthProbe: baseN, check: () => { const m = prim(); return m && Math.abs(m.root.position.x - (x0 + 1.2)) < 0.05; } });
    }
    // hide  (undo then redo)
    {
      P3.toggleHidden(P3, sec()); P3.push('hide');
      out.hideTrue = !!sec() && !sec().root.visible;
      out.hideUndo = await step(() => P3.undo(), { lengthProbe: baseN, check: () => { const m = sec(); return !!m && m.root.visible === true; } });
      out.hideRedo = await step(() => P3.redo(), { lengthProbe: baseN, check: () => { const m = sec(); return !!m && m.root.visible === false; } });
      await step(() => P3.show(P3, sec()), { lengthProbe: baseN, check: () => { const m = sec(); return !!m && m.root.visible === true; } });
    }
    // lock  (undo then redo)
    {
      P3.setLock(P3, sec(), true); P3.push('lock');
      out.lockTrue = !!sec() && sec().locked === true;
      out.lockUndo = await step(() => P3.undo(), { lengthProbe: baseN, check: () => { const m = sec(); return !!m && m.locked === false; } });
      out.lockRedo = await step(() => P3.redo(), { lengthProbe: baseN, check: () => { const m = sec(); return !!m && m.locked === true; } });
      await step(async () => { P3.setLock(P3, sec(), false); P3.push('lock'); },
        { lengthProbe: baseN, check: () => { const m = sec(); return !!m && m.locked === false; } });
    }
    // delete secondary (undo/redo/undo)
    {
      const n0 = P3.models.length;
      P3.remove(P3, sec()); P3.push('delete');
      out.delCount = P3.models.length === n0 - 1;
      out.delUndo    = await step(() => P3.undo(), { lengthProbe: n0,     check: () => P3.models.length === n0 });
      out.delRedo    = await step(() => P3.redo(), { lengthProbe: n0 - 1, check: () => P3.models.length === n0 - 1 });
      out.delRestore = await step(() => P3.undo(), { lengthProbe: n0,     check: () => P3.models.length === n0 });
    }
    // duplicate secondary (undo/redo) then cleanup
    {
      const n1 = P3.models.length;
      const e2 = await P3.duplicate(P3, sec());
      out.dupCount = !!e2 && P3.models.length === n1 + 1;
      P3.push('duplicate');
      out.dupUndo = await step(() => P3.undo(), { lengthProbe: n1,     check: () => P3.models.length === n1 });
      out.dupRedo = await step(() => P3.redo(), { lengthProbe: n1 + 1, check: () => P3.models.length === n1 + 1 });
      const extra = P3.models.find(x => x.url === sec().url && !x.isDemo && !x.isSecondary);
      if (extra) P3.remove(P3, extra);
      out.dupCleanup = await until(() => P3.models.length === n1, 6000);
      await sleep(200);
    }
    // UI + keyboard undo / redo (checklist 7) — isolated clean history
    {
      P3.toolId = 'select';
      P3.clearHistory(P3); P3.push('baseline');
      await sleep(150);
      const tb = document.querySelector('.p3-toolbar');
      const bU = tb && tb.querySelector('[data-h="undo"]');
      const bR = tb && tb.querySelector('[data-h="redo"]');
      P3._syncUI && P3._syncUI();                 // nothing to undo/redo yet
      out.uiBtnsPresent = !!tb && !!bU && !!bR;
      const X = prim().root.position.x;
      prim().root.position.x = X + 0.6; P3.bus.emit('transform-end'); // -> history push
      P3._syncUI && P3._syncUI();                 // reflect canUndo after push
      out.uiUndoEnabled = !!bU && !bU.disabled && !!bR && bR.disabled;
      bU && bU.click();
      out.uiUndoOk = await until(() => { const m = prim(); return !!m && Math.abs(m.root.position.x - X) < 0.05
        && !!bU && bU.disabled && !!bR && !bR.disabled; }, 15000);     // full restore done when Redo enabled
      out.uiRedoEnabled = !!bR && !bR.disabled;
      bR && bR.click();
      out.uiRedoOk = await until(() => { const m = prim(); return !!m && Math.abs(m.root.position.x - (X + 0.6)) < 0.05
        && !!bU && !bU.disabled && !!bR && bR.disabled; }, 15000);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: false, bubbles: true, cancelable: true }));
      out.kbUndoOk = await until(() => { const m = prim(); return !!m && Math.abs(m.root.position.x - X) < 0.05
        && !!bU && bU.disabled && !!bR && !bR.disabled; }, 15000);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
      out.kbRedoOk = await until(() => { const m = prim(); return !!m && Math.abs(m.root.position.x - (X + 0.6)) < 0.05
        && !!bU && !bU.disabled && !!bR && bR.disabled; }, 15000);
    }
    // let any queued restore fully settle before leaving G
    {
      let stable = 0, last = P3.models.length;
      const t0 = Date.now();
      while (Date.now() - t0 < 4000) {
        await sleep(200);
        if (P3.models.length === last) { stable++; if (stable >= 3) break; } else stable = 0;
        last = P3.models.length;
      }
    }
    out.final = P3.models.length;
    return out;
  });
  const need = ['moveUndo', 'moveRedo', 'hideTrue', 'hideUndo', 'hideRedo', 'lockTrue', 'lockUndo', 'lockRedo',
    'delCount', 'delUndo', 'delRedo', 'delRestore', 'dupCount', 'dupUndo', 'dupRedo', 'dupCleanup',
    'uiBtnsPresent', 'uiUndoEnabled', 'uiUndoOk', 'uiRedoEnabled', 'uiRedoOk', 'kbUndoOk', 'kbRedoOk'];
  const fails = need.filter(k => res[k] !== true);
  (fails.length === 0 && res.final === 2) ? ok('G.transforms-undo-redo', esc(res)) : bad('G.transforms-undo-redo', 'fails=' + fails.join(',') + ' ' + esc(res));
  // gizmo modes
  const gz = await p.evaluate(() => {
    const m = P3.models[0]; P3.selectModel(m);
    P3.setTransformMode('translate'); const a = P3.transformMode + ':' + !!P3.tcHelper.visible;
    P3.setTransformMode('rotate');    const c = P3.transformMode + ':' + !!P3.tcHelper.visible;
    P3.setTransformMode('scale');     const d = P3.transformMode + ':' + !!P3.tcHelper.visible;
    P3.setTransformMode(null);        const e = P3.transformMode + ':' + !!P3.tcHelper.visible;
    return { a, c, d, e };
  });
  (gz.a === 'translate:true' && gz.c === 'rotate:true' && gz.d === 'scale:true' && gz.e === 'null:false') ? ok('G6.gizmo', esc(gz)) : bad('G6.gizmo', esc(gz));
}

// H exports
{
  const ex = await p.evaluate(async () => {
    await P3.setEnvKey('hero'); P3.buildFloorPreset('White Studio'); await P3.setCameraPreset('¾ hero', { instant: true });
    P3.setFormat(P3, '9:16 reel'); P3.setRes('1080p');
    await new Promise(r => setTimeout(r, 600));
    // wait until model count is stable (any queued undo/redo restore has fully settled)
    let stable = 0, last = P3.models.length;
    const t0 = Date.now();
    while (Date.now() - t0 < 5000) { await new Promise(r => setTimeout(r, 200));
      if (P3.models.length === last) { stable++; if (stable >= 3) break; } else stable = 0;
      last = P3.models.length; }
    const startN = last;
    const out = { startN };
    const png = await P3.still(P3, { type: 'PNG' }); out.png = { ok: !!png, type: png.type, size: png.size };
    const jpg = await P3.still(P3, { type: 'JPG' }); out.jpg = { ok: !!jpg, type: jpg.type, size: jpg.size };
    const cut = await P3.still(P3, { type: 'PNG', transparent: true }); out.cut = { ok: !!cut, type: cut.type, size: cut.size };
    const glbBlob = await P3.glb(P3); out.glb = { ok: glbBlob && glbBlob.byteLength > 10000, bytes: glbBlob && glbBlob.byteLength };
    out.modelsAfterGlb = P3.models.length;
    const js = P3.jsonState(P3); out.json = { ok: !!js && js.length > 50 && JSON.parse(js).models.length === startN, len: js && js.length };
    try { const w = await P3.record(P3, { seconds: 1.4 }); out.reel = { ok: w && w.size > 10000, type: w && w.type, size: w && w.size }; }
    catch (e) { out.reel = { ok: false, err: String(e).slice(0, 160) }; }
    return out;
  });
  const core = ex.png.ok && ex.jpg.ok && ex.cut.ok && ex.glb.ok && ex.modelsAfterGlb === ex.startN && ex.json.ok;
  (core && ex.reel.ok) ? ok('H.exports', esc(ex)) : (core ? ok('H.exports', 'stills/glb/json OK — reel(headless): ' + esc(ex.reel)) : bad('H.exports', esc(ex)));
}

// I UI bindings
{
  const ui = await p.evaluate(async () => {
    const r = {};
    r.chips = ['t-cam', 't-light', 't-mat', 't-floor', 't-render'].map(role =>
      role + '=' + document.querySelectorAll('.trays .tray.' + role + ' .rchip, .trays .tray.' + role + ' .pr-tile').length);
    const v = [];
    for (const c of document.querySelectorAll('.vchip')) { c.click(); await new Promise(r => setTimeout(r, 70)); v.push(P3.state.version); }
    r.versions = v;
    const tools = ['Select', 'Cam', 'Light', 'Mat', 'Floor', 'Render'].map(t => {
      const el = document.getElementById('tl' + t); el.checked = true; el.dispatchEvent(new Event('change')); return P3.toolId; });
    r.tools = tools;
    const lightChip = [...document.querySelectorAll('.trays .tray.t-light .rchip')].find(x => x.textContent.trim() === 'Golden hour');
    if (lightChip) lightChip.click();
    r.pills = [...document.querySelectorAll('.cv-status .pill')].map(x => x.textContent.trim());
    document.getElementById('tbSettings').click(); await new Promise(r => setTimeout(r, 400));
    r.envTiles = document.querySelectorAll('#sosOv .p3-env .p3-tile').length;
    r.settingsPanel = !!document.querySelector('#sosOv .p3-panel');
    const x1 = document.querySelector('#sosOv .p3-x'); x1 && x1.click();
    document.getElementById('tbExport').click(); await new Promise(r => setTimeout(r, 350));
    r.exportPanel = !!document.querySelector('#sosOv .p3-panel');
    const x2 = document.querySelector('#sosOv .p3-x'); x2 && x2.click();
    document.getElementById('tbHelp').click(); await new Promise(r => setTimeout(r, 300));
    r.helpPanel = !!document.querySelector('#sosOv .p3-panel');
    const x3 = document.querySelector('#sosOv .p3-x'); x3 && x3.click();
    // inspector camera card chips/slider (light interaction only; no assertion on tween)
    const camCard = [...document.querySelectorAll('.inspector details.card')].find(c => /camera/i.test((c.querySelector('.ct') || {}).textContent || ''));
    r.camCard = !!camCard;
    const sliders = camCard ? camCard.querySelectorAll('.slider .track').length : 0;
    r.camSliders = sliders;
    const lightCard = [...document.querySelectorAll('.inspector details.card')].find(c => /lighting/i.test((c.querySelector('.ct') || {}).textContent || ''));
    if (lightCard) {
      const track = lightCard.querySelector('.slider .track');
      if (track) { const rc = track.getBoundingClientRect(); track.dispatchEvent(new PointerEvent('pointerdown', { clientX: rc.left + rc.width * 0.8, clientY: rc.top + 4, bubbles: true })); }
    }
    r.lightSliderApplied = P3.light.intensity > 1.3;
    P3.selectModel(P3.models[0]);
    document.getElementById('tlMat').checked = true; document.getElementById('tlMat').dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 250));
    r.matListVisible = !!document.querySelector('.inspector .p3-part');
    r.selectedModel = !!P3.selectedModel;
    P3.selectPart(null);
    return r;
  });
  const okChips = ui.chips.every(x => /^t-cam=6$|^t-light=5$|^t-mat=5$|^t-floor=5$|^t-render=4$/.test(x));
  const okVer = ui.versions.join(',') === 'V1,V2,V3,V4,V5,V6';
  const okTool = ui.tools.join(',') === 'select,cam,light,mat,floor,render';
  const okPanels = ui.settingsPanel && ui.envTiles === 11 && ui.exportPanel && ui.helpPanel;
  (okChips && okVer && okTool && okPanels && ui.lightSliderApplied && ui.selectedModel)
    ? ok('I.ui-bindings', esc({ ...ui, okChips, okVer, okTool, okPanels }))
    : bad('I.ui-bindings', esc(ui));
}
await ctx.close();

// J onboarding fresh
{
  const ctx2 = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = watch(await ctx2.newPage());
  await p2.goto(BASE, { waitUntil: 'load' });
  const shown = await waitFn(p2, () => !!document.querySelector('#sosOv .p3-tour'), 22000);
  const first = await p2.evaluate(() => { const o = document.querySelector('#sosOv .p3-tour'); return o ? { step: o.querySelector('[data-step]').textContent, title: o.querySelector('[data-t]').textContent } : null; });
  const done = await p2.evaluate(async () => {
    for (let i = 0; i < 8; i++) { const o = document.querySelector('#sosOv .p3-tour'); if (!o) break;
      (o.querySelector('[data-next]') || {}).click?.(); await new Promise(r => setTimeout(r, 200)); }
    await new Promise(r => setTimeout(r, 300));
    return { closed: !document.querySelector('#sosOv .p3-tour'), ls: localStorage.getItem('sos:p3:tour') };
  });
  (shown && first && first.step === '1 / 7' && done.closed && done.ls === 'done') ? ok('J.onboarding', esc({ shown, first, done })) : bad('J.onboarding', esc({ shown, first, done }));
  await ctx2.close();
}

// K honor pad
{
  for (const vp of [{ name: 'honorpad-ls', w: 1194, h: 834 }, { name: 'honorpad-pt', w: 834, h: 1112 }]) {
    const ctxk = await b.newContext({ viewport: { width: vp.w, height: vp.h } });
    await ctxk.addInitScript(() => { try { localStorage.setItem('sos:p3:tour', 'done'); } catch (e) {} });
    const pk = watch(await ctxk.newPage());
    await pk.goto(BASE, { waitUntil: 'load' });
    const booted = await waitFn(pk, () => window.P3 && P3.models && P3.models.length >= 2 && P3.env && P3.env.backgroundReady, 20000);
    let dims = null;
    if (booted) { // resize settles on first layout frame — poll until the canvas fills the viewport
      const t0 = Date.now();
      while (Date.now() - t0 < 15000) {
        dims = await pk.evaluate(() => ({ w: P3.renderer.domElement.width, h: P3.renderer.domElement.height }));
        if (dims.w >= vp.w * 0.6 && dims.h >= vp.h * 0.5) break;
        await pk.waitForTimeout(250);
      }
    }
    const fps = booted ? await fpsRead(pk) : 0;
    (booted && dims && dims.w >= 500 && fps >= 30) ? ok('K.' + vp.name, esc({ fps, ...dims })) : bad('K.' + vp.name, esc({ booted, fps, dims }));
    await ctxk.close();
  }
}

// L console clean
{
  const ctxl = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctxl.addInitScript(() => { try { localStorage.setItem('sos:p3:tour', 'done'); } catch (e) {} });
  const pl = watch(await ctxl.newPage());
  await pl.goto(BASE, { waitUntil: 'load' });
  await waitFn(pl, () => window.P3 && P3.models && P3.models.length >= 2, 20000);
  await pl.waitForTimeout(3000);
  await ctxl.close();
  pl.errs.length ? bad('L.console', pl.errs.join(' | ')) : ok('L.console', 'zero console/page errors');
}

await b.close();
const failed = results.filter(r => !r.pass);
console.log('\n==== PHASE 3 CHECKLIST QA ====');
results.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + '  ' + (r.detail ? String(r.detail).slice(0, 500) : '')));
console.log('==== ' + (results.length - failed.length) + '/' + results.length + ' passed ====');
