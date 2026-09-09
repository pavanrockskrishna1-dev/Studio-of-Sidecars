import { section, chipRow, sliderRow, toast } from '../core/ui.js';
import { buildRenderPackage } from '../core/blender_render.js';

/* =========================================================================
 *  VERSION 3 — BLENDER PYTHON (INSTAGRAM QUALITY)  (template: 'blender')
 *  A batch-render pipeline version: the WebGL studio stays the live editor,
 *  and this version packages the CURRENT scene into a self-contained Blender
 *  Python (bpy) Cycles pipeline for offline 1080x1920 PNG / MP4 renders.
 *  The live editor keeps running behind it — nothing here slows it down.
 * ========================================================================= */

const MOTIONS = [
  { key: 'orbit', label: '🔄 Orbit 360°' },
  { key: 'dolly', label: '🛣️ Dolly Push' },
  { key: 'crane', label: '🏗️ Crane Sweep' },
  { key: 'handheld', label: '🎞️ Handheld' },
];

export function createBlender(seed = {}) {
  const memory = Object.assign({ lighting: seed.defaultLighting || 'softbox' }, seed.memory || {});
  const v = {
    id: seed.id || 'blender',
    ns: seed.ns || 'bl',
    short: seed.short || 'V3',
    label: seed.label || 'Blender Python',
    icon: seed.icon || '🐍',
    tagline: seed.tagline || 'Instagram Quality — offline Cycles 1080×1920 PNG / MP4',
    tpl: 'blender',
    userCreated: !!seed.userCreated,
    defaultFormat: seed.defaultFormat || '9:16',
    defaultLighting: seed.defaultLighting || 'softbox',
    defaultGuide: !!seed.defaultGuide,
    heroPreset: seed.heroPreset || '45',
    frameOpts: Object.assign({}, seed.frameOpts || {}),
    cameraPresets: [],
    moves: MOTIONS.map((c) => ({ ...c })),
    lightingOptions: [],
    memory,
  };

  v.build = function build(S) {
    const frag = document.createDocumentFragment();
    const ns = v.ns;
    const cur = () => ({ lighting: S.lightName(), floorGloss: S.gridState.floorGloss });

    /* ---------- explanation ---------- */
    const intro = section('🧊 Batch Render → Blender (Cycles)', true, ns);
    const note = document.createElement('div');
    note.className = 'hint';
    note.innerHTML = 'The WebGL studio stays your real-time editor. This version snapshots the <b>current scene</b> — products, part edits, materials, this exact camera view and lighting — into a one-click <b>Blender Python (bpy)</b> pipeline that renders offline with Cycles at <b>1080×1920 vertical</b> PNG or MP4 (Instagram Quality).';
    intro.appendChild(note);
    frag.appendChild(intro);

    /* ---------- output ---------- */
    const out = section('🎬 Output', true, ns);
    const modeRow = document.createElement('div');
    modeRow.className = 'seg';
    let mode = 'png';
    const mkMode = (key, label) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.out = key;
      b.textContent = label;
      b.classList.toggle('active', mode === key);
      b.addEventListener('click', () => {
        mode = key;
        modeRow.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x.dataset.out === key));
        const mp4 = key === 'mp4';
        const mv = document.getElementById(ns + 'MotionWrap');
        const dur = document.getElementById(ns + 'DurWrap');
        if (mv) mv.style.display = mp4 ? 'block' : 'none';
        if (dur) dur.style.display = mp4 ? 'block' : 'none';
        if (mp4) {
          const first = document.querySelector('#' + ns + 'MotionWrap .seg button');
          if (first) first.classList.add('active');
        }
      });
      return b;
    };
    modeRow.append(mkMode('png', '🖼 PNG still — current camera'), mkMode('mp4', '🎞 MP4 reel — camera move'));
    out.appendChild(modeRow);

    const nameF = document.createElement('div');
    nameF.className = 'row';
    nameF.innerHTML = '<span style="font-size:11px;color:var(--muted)">Output name</span>';
    const nameIn = document.createElement('input');
    nameIn.type = 'text';
    nameIn.id = ns + 'Name';
    nameIn.value = 'instagram_1080x1920';
    nameIn.style.flex = '1';
    nameF.append(nameIn);
    out.appendChild(nameF);

    const mvWrap = document.createElement('div');
    mvWrap.id = ns + 'MotionWrap';
    mvWrap.style.display = 'none';
    mvWrap.appendChild(chipRow(ns, MOTIONS, (key) => { }));
    out.appendChild(mvWrap);
    const durWrap = document.createElement('div');
    durWrap.id = ns + 'DurWrap';
    durWrap.style.display = 'none';
    durWrap.appendChild(sliderRow(ns, 'Duration', 'Dur', {
      min: 3, max: 12, step: 0.5, value: 6, display: '6.0 s',
      onInput: (e) => { const o = document.getElementById(ns + 'DurOut'); if (o) o.textContent = Number(e.target.value).toFixed(1) + ' s'; },
    }));
    out.appendChild(durWrap);
    frag.appendChild(out);

    /* ---------- quality ---------- */
    const q = section('⚙️ Quality (Cycles)', true, ns);
    const selWrap = document.createElement('div');
    const lab = document.createElement('label');
    lab.className = 'fld';
    lab.textContent = 'Samples (higher = cleaner chrome/glass)';
    const sam = document.createElement('select');
    sam.id = ns + 'Samples';
    [[64, '64 — quick preview'], [128, '128 — Instagram (default)'], [256, '256 — high'], [512, '512 — max']]
      .forEach(([val, lbl]) => { const o = document.createElement('option'); o.value = val; o.textContent = lbl; sam.appendChild(o); });
    sam.value = '128';
    selWrap.append(lab, sam);
    q.appendChild(selWrap);
    const dchk = document.createElement('div');
    dchk.className = 'chk';
    const dni = document.createElement('input'); dni.type = 'checkbox'; dni.id = ns + 'Denoise'; dni.checked = true;
    dchk.append(dni, document.createTextNode(' Denoise (OpenImageDenoise)'));
    q.appendChild(dchk);
    q.appendChild(sliderRow(ns, 'Light power %', 'Sun', {
      min: 30, max: 300, step: 5, value: 100, display: '100%',
      onInput: (e) => { const o = document.getElementById(ns + 'SunOut'); if (o) o.textContent = e.target.value + '%'; },
    }));
    q.appendChild(sliderRow(ns, 'Softbox power %', 'Emit', {
      min: 20, max: 400, step: 5, value: 100, display: '100%',
      onInput: (e) => { const o = document.getElementById(ns + 'EmitOut'); if (o) o.textContent = e.target.value + '%'; },
    }));
    frag.appendChild(q);

    /* ---------- lighting (lives in the WebGL editor too) ---------- */
    const lt = section('💡 Lighting rig (captured)', true, ns);
    const sel = document.createElement('select');
    sel.id = ns + 'Light';
    Object.keys(S.LIGHT_PRESETS).forEach((key) => {
      const o = document.createElement('option');
      o.value = key;
      o.textContent = '💡 ' + key.charAt(0).toUpperCase() + key.slice(1);
      sel.appendChild(o);
    });
    sel.value = v.memory.lighting && S.LIGHT_PRESETS[v.memory.lighting] ? v.memory.lighting : cur().lighting;
    sel.addEventListener('change', () => {
      v.memory.lighting = sel.value;
      S.setLightingPreset(sel.value);
      toast('💡 Lighting rig set to ' + sel.value + ' — preview updated');
    });
    const lw = document.createElement('label'); lw.className = 'fld';
    lw.textContent = 'Environment / studio preset (preview & render)';
    lw.appendChild(sel);
    lt.appendChild(lw);
    const hint2 = document.createElement('div');
    hint2.className = 'hint';
    hint2.innerHTML = 'Your lighting choice is shown live here and is baked into the Blender rig (suns + softboxes + world). Glossy floor follows the stage toggle you set in any version.';
    lt.appendChild(hint2);
    frag.appendChild(lt);

    /* ---------- one-click render ---------- */
    const act = section('🚀 Render in Blender', true, ns);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = ns + 'Render';
    btn.className = 'primary';
    btn.style.width = '100%';
    btn.style.padding = '12px 10px';
    btn.style.fontSize = '13px';
    btn.textContent = '🐍 Render in Blender — download pipeline (.zip)';
    const status = document.createElement('div');
    status.className = 'hint';
    status.innerHTML = 'Click = exports <b>scene.glb + instagram_render.py + one-click launchers</b>, zipped. Then either double-click the launcher or run <code>blender -b -P instagram_render.py</code> on your machine (Blender 3.4+). Nothing is installed here and the live editor is not touched.';
    btn.addEventListener('click', async () => {
      const motionChip = document.querySelector('#' + ns + 'MotionWrap .seg button.active');
      const motion = (mode === 'mp4' && motionChip) ? motionChip.dataset.preset : 'still';
      btn.disabled = true;
      btn.textContent = '⏳ Packaging current scene (GLB + bpy pipeline)…';
      try {
        const nameVal = (document.getElementById(ns + 'Name').value || 'instagram_1080x1920').trim().replace(/\.[a-z0-9]+$/i, '');
        const pk = await buildRenderPackage(S, {
          output: mode,
          out: nameVal,
          motion,
          duration: parseFloat(document.getElementById(ns + 'Dur').value || 6),
          samples: parseInt(document.getElementById(ns + 'Samples').value || '128', 10),
          denoise: document.getElementById(ns + 'Denoise').checked,
          lighting: sel.value,
          sunScale: (parseInt(document.getElementById(ns + 'Sun').value, 10) || 100) / 100,
          emissiveScale: (parseInt(document.getElementById(ns + 'Emit').value, 10) || 100) / 100,
        });
        const blob = new Blob([pk.bytes], { type: 'application/zip' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = pk.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast('🐍 Blender pack saved: ' + pk.name + '\nRun render_windows.bat / render_mac_linux.sh or: blender -b -P instagram_render.py');
      } catch (err) {
        console.error(err);
        toast('Blender pack failed: ' + err.message, true);
      }
      btn.disabled = false;
      btn.textContent = '🐍 Render in Blender — download pipeline (.zip)';
    });
    act.appendChild(btn);
    act.appendChild(status);
    frag.appendChild(act);

    return frag;
  };

  v.onActivate = function onActivate() { /* registry applies stored settings */ };
  return v;
}

export default createBlender();
