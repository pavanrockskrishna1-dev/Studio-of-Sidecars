/* =========================================================================
 *  CREATOR HUB — BATCH EXPORT PACK (V6)
 *  One click builds a ready-to-post / ready-to-render pack:
 *    · Instagram Reel 1080×1920 MP4     -> Blender Python script (Cycles)
 *    · Instagram Story 1080×1920 PNG    -> rendered live in the browser
 *    · Instagram Story 1080×1920 MP4    -> Blender Python script
 *    · Post 1080×1080 PNG               -> rendered live in the browser
 *    · Hero Images Front/Side/Rear/Top/45° 1080×1350 PNGs (live render)
 *    · Transparent PNG pack (5 angles, product cut-out, live render)
 *  MP4 is encoded offline by Blender (bundled self-contained .py + .glb +
 *  launchers) — the exact same pipeline the Blender Python version ships,
 *  so the two stay compatible. Everything is produced right here, no
 *  internet, no upload.
 * ========================================================================= */
import { makeZip, snapshotGroup, exportGLB, bytesToB64, buildRenderConfig, renderPython } from './blender_render.js';

const PAD = (n) => String(n).padStart(2, '0');
export function stampName(now) {
  const d = now ? new Date(now) : new Date();
  return 'CreatorPack_' + d.getFullYear() + PAD(d.getMonth() + 1) + PAD(d.getDate()) + '-' + PAD(d.getHours()) + PAD(d.getMinutes());
}

/* brand-aware fallback backdrop for live stills */
function kitGradient(S, H) {
  let kit = null;
  try { kit = (S.brand && S.brand.kit()) || null; } catch (e) {}
  const top = kit && kit.colors && kit.colors.accent ? kit.colors.accent : '#39405c';
  const bottom = kit && kit.colors && kit.colors.bg ? kit.colors.bg : '#0b0d12';
  return { top, bottom };
}

/* replicate the engine's watermark look onto a composited canvas */
function stampBrandLocal(S, ctx, W, H) {
  let kit = null;
  try { kit = (S.brand && S.brand.kit()) || null; } catch (e) {}
  if (!kit || kit.watermark === false || kit.watermark.on === false) return;
  const txt = (kit.watermark && kit.watermark.text) || kit.name || '';
  const fs = Math.max(13, Math.round(H * 0.018));
  const pad = Math.max(18, Math.round(H * 0.024));
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#ffffff';
  let x = W - pad, y = H - pad;
  if (kit.logoChar) { ctx.font = (fs * 1.5) + 'px sans-serif'; ctx.fillText(kit.logoChar, x - ctx.measureText(kit.logoChar).width, y); x -= fs * 1.5; }
  if (txt) {
    const fontMap = { modern: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", serif: "Georgia,'Times New Roman',serif", bold: "Impact,'Arial Narrow',sans-serif", hand: "'Comic Sans MS','Segoe Print',cursive" };
    ctx.font = '600 ' + fs + 'px ' + (fontMap[(kit && kit.font)] || fontMap.modern);
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = fs * 0.35;
    ctx.fillText(txt, x - ctx.measureText(txt).width, y);
  }
  ctx.restore();
}

/* live-render ONE angle: product captured with alpha, composited over the
   brand gradient (or fully transparent for the cut-out pack). */
async function renderStill(S, angle, W, H, opts = {}) {
  const o = Object.assign({ gradient: true, stamp: true, transparent: false }, opts);
  const cam0 = S.getCamView ? S.getCamView() : null;
  const up0 = S.camera.up.clone();
  try { if (S.setFrame) S.setFrame(angle, {}); }
  catch (e) { /* keep current view */ }
  let raw = null;
  try { raw = await S.renderBlob('9:16', { w: W, h: H, transparent: true, stamp: false }); }
  finally {
    if (cam0 && S.setCamView) { try { S.setCamView(cam0); } catch (e) {} }
    if (S.camera) S.camera.up.copy(up0);
    try { S.camera.lookAt(S.controls.target); } catch (e) {}
  }
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  if (o.gradient) {
    const g = kitGradient(S, H);
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, g.top); gr.addColorStop(1, g.bottom);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    try {
      const vg = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(255,255,255,0.10)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    } catch (e) {}
  }
  if (raw) {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => res(); img.src = URL.createObjectURL(raw); });
    ctx.drawImage(img, 0, 0, W, H);
    setTimeout(() => { try { URL.revokeObjectURL(img.src); } catch (e) {} }, 4000);
  }
  if (o.stamp) stampBrandLocal(S, ctx, W, H);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('PNG encode'))), 'image/png'));
}

const blobToU8 = (b) => b.arrayBuffer().then((a) => new Uint8Array(a));
const te = new TextEncoder();

/* ------------------------------------------------------------------ */
export function createExporter(S) {
  async function makePack(opts = {}) {
    const inc = opts.include || {};
    const which = (k, def) => (inc[k] === undefined ? def : !!inc[k]);
    const doReel = which('reel', true);
    const doStoryPng = which('storyPng', true);
    const storyMp4 = which('storyMp4', true);
    const doPost = which('post', true);
    const doHeroes = which('heroes', true);
    const doTransparent = which('transparent', true);
    const W = opts.w || 1080;
    const files = [];
    const log = [];
    const t0 = Date.now();
    const png = async (angle, w, h, name, o) => { const b = await renderStill(S, angle, w, h, o); files.push({ name, data: await blobToU8(b) }); log.push('+ ' + name); };
    const stamp2 = opts.stamp !== false;

    /* ---------- geometry snapshot (shared by every Blender script) ---- */
    let glbBytes = null, glbB64 = null;
    if (doReel || storyMp4) {
      glbBytes = await exportGLB(snapshotGroup(S));
      glbB64 = bytesToB64(glbBytes);
      files.push({ name: 'scene.glb', data: glbBytes });
      log.push('+ scene.glb');
    }

    /* ---------- Instagram Reel 1080×1920 MP4 (Blender Python) ---------- */
    if (doReel) {
      const cfg = buildRenderConfig(S, {
        out: 'Instagram_Reel_1080x1920.mp4', glbB64,
        motion: opts.reelMotion || 'orbit', duration: opts.reelDuration || 6,
        samples: opts.samples || 128,
      });
      files.push({ name: 'Instagram_Reel_1080x1920.py', data: te.encode(renderPython(cfg)) });
      log.push('+ Instagram_Reel_1080x1920.py  (render -> MP4 in Blender)');
    }

    /* ---------- Story MP4 (Blender Python, a softer crane) ---------- */
    if (storyMp4 && glbB64) {
      const cfg = buildRenderConfig(S, {
        out: 'Instagram_Story_1080x1920.mp4', glbB64,
        motion: opts.storyMotion || 'crane', duration: opts.storyDuration || 5,
        samples: opts.samples || 96,
      });
      files.push({ name: 'Instagram_Story_1080x1920.py', data: te.encode(renderPython(cfg)) });
      log.push('+ Instagram_Story_1080x1920.py  (render -> MP4 in Blender)');
    }

    /* ---------- live PNG stills --------------------------------------- */
    if (doStoryPng) {
      const b = await renderStill(S, 'front', W, Math.round(W * 16 / 9), { gradient: true, stamp: stamp2 });
      files.push({ name: 'Instagram_Story_1080x1920.png', data: await blobToU8(b) });
      log.push('+ Instagram_Story_1080x1920.png');
    }
    if (doPost) {
      const b = await renderStill(S, 'hero', W, W, { gradient: true, stamp: stamp2 });
      files.push({ name: 'Instagram_Post_1080x1080.png', data: await blobToU8(b) });
      log.push('+ Instagram_Post_1080x1080.png');
    }
    if (doHeroes) {
      const hw = Math.round(W), hh = Math.round(W * 5 / 4); // 4:5 portrait 1080x1350
      for (const ang of ['front', 'side', 'rear', 'top', '45']) {
        const b = await renderStill(S, ang, hw, hh, { gradient: true, stamp: stamp2 });
        files.push({ name: 'Hero_' + (ang === '45' ? 'Angle45' : ang[0].toUpperCase() + ang.slice(1)) + '_1080x1350.png', data: await blobToU8(b) });
        log.push('+ Hero_' + ang + '_1080x1350.png');
      }
    }
    if (doTransparent) {
      const tw = Math.round(W * (opts.transScale || 0.66)), th = Math.round(tw * 16 / 9);
      for (const ang of ['front', 'side', 'rear', 'top', '45']) {
        const b = await renderStill(S, ang, tw, th, { gradient: false, stamp: false, transparent: true });
        files.push({ name: 'Transparent_' + ang[0].toUpperCase() + ang.slice(1) + '.png', data: await blobToU8(b) });
        log.push('+ Transparent_' + ang + '.png');
      }
    }

    /* ---------- readme + launchers ------------------------------------ */
    files.push({ name: 'README.txt', data: te.encode(packReadme(log, glbB64 !== null, t0)) });
    if (glbB64 !== null) {
      files.push({ name: 'render_in_blender_windows.bat', data: te.encode(batPack()) });
      files.push({ name: 'render_in_blender_mac_linux.sh', data: te.encode(shPack()) });
    }
    const name = (opts.name || stampName()) + '.zip';
    const bytes = makeZip(files);
    const summary = { name, count: files.length, pngs: files.filter((f) => /\.png$/.test(f.name)).length, blenderScripts: files.filter((f) => /\.py$/.test(f.name)).length, glb: glbB64 !== null, bytes, size: bytes.length, log };
    return summary;
  }

  function download(summary) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([summary.bytes], { type: 'application/zip' }));
    a.download = summary.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return summary;
  }

  function packReadme(log, hasBlender, t0) {
    const lines = [
      'CREATOR HUB — BATCH EXPORT PACK',
      '===============================',
      'Exported by GLB Commercial Studio (V6 Creator Hub).',
      'Time taken: ' + Math.round((Date.now() - t0) / 1000) + ' s',
      '',
      'CONTENTS',
    ];
    log.forEach((l) => lines.push('  ' + l));
    if (hasBlender) {
      lines.push('',
        'MP4 (Instagram Reel + Story video) are rendered OFFLINE in Blender.',
        'The studio can only export images in the browser; true MP4 encoding',
        'runs inside Blender with the bundled self-contained Python scripts.',
        '',
        'HOW TO RENDER THE MP4s  (Blender 3.4+, free, blender.org)',
        '  Windows:   double-click  render_in_blender_windows.bat',
        '  macOS/Linux: chmod +x render_in_blender_mac_linux.sh  && ./render_in_blender_mac_linux.sh',
        '  — or run any .py file directly:',
        '      blender -b -P Instagram_Reel_1080x1920.py',
        '      blender -b -P Instagram_Reel_1080x1920.py -- --samples 256',
        '  Each .py embeds the scene (scene.glb) and rebuilds the exact live',
        '  lighting; it writes the finished MP4 next to itself.',
        '',
        'The .glb ships for inspection/editing in Blender. Transparent_*.png',
        'are product cut-outs with alpha already — drop them on any layout.');
    }
    lines.push('', 'Everything was generated locally in your browser. No upload.');
    return lines.join('\n') + '\n';
  }
  return { makePack, download };
}

function batPack() {
  return '@echo off\r\n'
    + 'REM Creator Hub pack - render the MP4 deliverables in Blender (Windows)\r\n'
    + 'setlocal\r\n'
    + 'set "BLENDER="\r\n'
    + 'if defined BLENDER goto :found\r\n'
    + 'where blender >nul 2>nul && (set "BLENDER=blender" & goto :found)\r\n'
    + 'for %%P in ("%ProgramFiles%\\Blender Foundation\\Blender 4.5\\blender.exe" "%ProgramFiles%\\Blender Foundation\\Blender 4.4\\blender.exe" "%ProgramFiles%\\Blender Foundation\\Blender 4.3\\blender.exe" "%ProgramFiles%\\Blender Foundation\\Blender 4.2\\blender.exe" "%ProgramFiles%\\Blender Foundation\\Blender 4.1\\blender.exe" "%ProgramFiles%\\Blender Foundation\\Blender 4.0\\blender.exe" "%ProgramFiles%\\Blender Foundation\\Blender 3.6\\blender.exe" "%ProgramFiles%\\Blender Foundation\\Blender 3.4\\blender.exe") do (\r\n'
    + '  if exist %%P set "BLENDER=%%~P" & goto :found\r\n'
    + ')\r\n'
    + 'echo Blender was not found. Install Blender 3.4+ from blender.org, or set\r\n'
    + 'echo the BLENDER environment variable to the full path of blender.exe\r\n'
    + 'pause\r\n'
    + 'exit /b 1\r\n'
    + ':found\r\n'
    + 'echo Rendering reel with %BLENDER% ... (first run compiles shaders, please wait)\r\n'
    + 'if exist "%~dp0Instagram_Reel_1080x1920.py" ("%BLENDER%" --background --factory-startup --python "%~dp0Instagram_Reel_1080x1920.py")\r\n'
    + 'if exist "%~dp0Instagram_Story_1080x1920.py" ("%BLENDER%" --background --factory-startup --python "%~dp0Instagram_Story_1080x1920.py")\r\n'
    + 'echo Done - MP4s are next to this file.\r\n'
    + 'pause\r\n';
}
function shPack() {
  return '#!/usr/bin/env bash\n'
    + '# Creator Hub pack - render the MP4 deliverables in Blender (macOS / Linux)\n'
    + 'set -e\n'
    + 'cd "$(dirname "$0")"\n'
    + 'BIN="' + '${' + 'BLENDER:-}' + '"\n'
    + 'if [ -z "$BIN" ]; then\n'
    + '  if command -v blender >/dev/null 2>&1; then\n'
    + '    BIN="blender"\n'
    + '  elif [ -x "/Applications/Blender.app/Contents/MacOS/Blender" ]; then\n'
    + '    BIN="/Applications/Blender.app/Contents/MacOS/Blender"\n'
    + '  fi\n'
    + 'fi\n'
    + 'if [ -z "$BIN" ]; then\n'
    + '  echo "Blender not found. Install Blender 3.4+ from blender.org or set:"\n'
    + '  echo "  export BLENDER=/path/to/blender"\n'
    + '  exit 1\n'
    + 'fi\n'
    + 'echo "Rendering reel with: $BIN (first run compiles shaders, please wait)"\n'
    + 'if [ -f "Instagram_Reel_1080x1920.py" ]; then "$BIN" --background --factory-startup --python "$(pwd)/Instagram_Reel_1080x1920.py"; fi\n'
    + 'if [ -f "Instagram_Story_1080x1920.py" ]; then "$BIN" --background --factory-startup --python "$(pwd)/Instagram_Story_1080x1920.py"; fi\n'
    + 'echo "Done - MP4s are next to this file."\n';
}
