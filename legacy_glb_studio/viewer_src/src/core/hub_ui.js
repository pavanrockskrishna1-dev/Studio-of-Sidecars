/* =========================================================================
 *  CREATOR HUB UI (V6) — full-screen overlays used by the six hub tools:
 *  Project Manager · Undo/Redo · Preset Library · Auto Backup ·
 *  Batch Export · Quick Creator Workflow. Everything talks to hub.js
 *  (storage + engine snapshots) and hub_exports.js (export pack).
 *  Tablet-first: large cards, big touch buttons, one-tap actions.
 * ========================================================================= */
import { getActiveVersion, onVersionChange } from '../versions/registry.js';
import { toast } from './ui.js';
import { ASSETMAP } from '../assets_library.js';

/* shot builder used by the Quick Workflow "Build Reel" step */
const WF_SHOTS = [
  { key: 'hero', label: 'Hero', icon: '🌟', preset: 'hero' },
  { key: 'front', label: 'Front', icon: '📸', preset: 'front' },
  { key: 'side', label: 'Side', icon: '↔️', preset: 'side' },
  { key: 'closeup', label: 'Close-up', icon: '🔍', preset: 'macro' },
  { key: 'top', label: 'Top', icon: '🛰️', preset: 'top' },
  { key: 'pour', label: 'Pour Coffee', icon: '☕', preset: 'pour' },
];
const WF_SCENES = [
  { key: 'softbox', label: 'Studio', icon: '💡', sub: 'clean softbox look' },
  { key: 'coffeeshop', label: 'Café Window', icon: '☕', sub: 'warm daylight' },
  { key: 'morning', label: 'Morning', icon: '🌤️', sub: 'bright outdoors' },
  { key: 'nightcafe', label: 'Night Café', icon: '🌃', sub: 'dramatic neon' },
  { key: 'sunset', label: 'Sunset', icon: '🌅', sub: 'golden hour' },
  { key: 'night', label: 'Night', icon: '🌌', sub: 'deep blue night' },
];
const QUICK_ASSETS = ['coffee_set', 'latte_cup', 'grill', 'doughnut', 'armchair', 'floor_lamp', 'plant', 'candles'];

function rel(ms) {
  const d = Date.now() - ms;
  const m = Math.round(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' h ago';
  return Math.round(h / 24) + ' d ago';
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function makeId() { return 'hu' + Math.random().toString(36).slice(2, 9); }

export function bindHubUI(S, hub, exporter) {
  const root = document.createElement('div');
  root.id = 'hubRoot';
  document.body.appendChild(root);

  const api = {
    open: openPanel,
    refreshProjects: () => { if (current === 'projects') renderProjects(); },
    get current() { return current; },
  };
  S.hubUI = api;

  let current = null;
  let closeFns = [];
  let wfPlaying = null;

  function stopReel() {
    if (wfPlaying && wfPlaying.timer) clearTimeout(wfPlaying.timer);
    wfPlaying = null;
    const play = document.getElementById('wfPlay');
    if (play) play.textContent = '▶ Play Reel Preview';
    document.querySelectorAll('#hubRoot .wf-chip.on').forEach((c) => c.classList.remove('on'));
  }

  function shell(title, icon) {
    root.innerHTML = '';
    closeFns = [];
    const ov = document.createElement('div');
    ov.className = 'hu-ov';
    ov.innerHTML = '<div class="hu-card">' +
      '<div class="hu-head"><span class="hu-title">' + (icon || '🛠') + ' ' + esc(title) + '</span>' +
      '<button class="hu-x" id="huClose" aria-label="Close">✕</button></div>' +
      '<div class="hu-body" id="huBody"></div>' +
      '<div class="hu-foot"></div></div>';
    root.appendChild(ov);
    ov.addEventListener('pointerdown', (e) => { if (e.target === ov) close(); });
    const x = ov.querySelector('#huClose');
    x.addEventListener('click', close);
    return ov.querySelector('#huBody');
  }
  function close() {
    if (wfPlaying) stopReel();
    closeFns.forEach((fn) => { try { fn(); } catch (e) {} });
    root.innerHTML = '';
    current = null;
  }
  function bigBtn(text, cls, fn, id) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    if (id) b.id = id;
    b.className = 'hub-btn ' + (cls || '');
    b.addEventListener('click', fn);
    return b;
  }

  /* ================================================= PROJECT MANAGER == */
  function projectCard(item, onChanged) {
    const card = document.createElement('div');
    card.className = 'hp-card';
    card.dataset.id = item.id;
    const thumb = item.thumb
      ? '<img class="hp-th" src="' + item.thumb + '" alt="">'
      : '<div class="hp-th hp-th-empty">📦</div>';
    card.innerHTML = '<div class="hp-top">' + thumb + '<div class="hp-info">' +
      '<span class="hp-name" id="nm">' + esc(item.name) + '</span>' +
      '<span class="hp-time">' + rel(item.at) + '</span></div></div>' +
      '<div class="hp-acts">' +
      '<button class="hub-btn primary big" data-a="open">▶ Open</button>' +
      '<button class="hub-btn" data-a="rename">✎</button>' +
      '<button class="hub-btn" data-a="dup">⧉</button>' +
      '<button class="hub-btn danger" data-a="del">🗑</button>' +
      '</div>';
    card.querySelector('[data-a=open]').addEventListener('click', () => { close(); hub.openProject(item.id); });
    card.querySelector('[data-a=dup]').addEventListener('click', async () => { await hub.duplicateProject(item.id); renderProjects(); });
    card.querySelector('[data-a=del]').addEventListener('click', () => { if (confirm('Delete project "' + item.name + '"?')) { hub.deleteProject(item.id); renderProjects(); } });
    card.querySelector('[data-a=rename]').addEventListener('click', () => {
      const info = card.querySelector('.hp-info');
      const oldName = info.querySelector('#nm');
      const inp = document.createElement('input');
      inp.type = 'text'; inp.className = 'hp-rename'; inp.value = oldName.textContent;
      inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') inp.blur(); if (ev.key === 'Escape') inp.value = oldName.textContent; });
      inp.addEventListener('blur', () => {
        const val = inp.value.trim();
        if (val && val !== item.name) { hub.renameProject(item.id, val); onChanged(); }
      });
      oldName.replaceWith(inp); inp.focus(); inp.select();
    });
    return card;
  }
  function renderProjects() {
    const body = shell('Project Manager', '📁');
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.innerHTML = 'A project saves <b>everything</b>: products (.glb), part edits, lighting, camera, backdrop, brand kit + your reel. <b>One tap saves</b> — tap a card to open it and keep creating.';
    body.appendChild(hint);

    const quick = document.createElement('div');
    quick.className = 'row';
    quick.style.margin = '10px 0 4px';
    const save = bigBtn('💾 Save current scene as a project', 'primary big', async () => { await hub.saveProject(); renderProjects(); }, 'hpSave');
    const file = document.createElement('label');
    file.className = 'hub-btn gold big';
    file.innerHTML = '📤 Export project file…';
    file.style.display = 'inline-flex'; file.style.alignItems = 'center';
    const fIn = document.createElement('input');
    fIn.type = 'file'; fIn.accept = '.json,application/json';
    fIn.addEventListener('change', () => { const f = fIn.files && fIn.files[0]; fIn.value = ''; if (f) hub.importProjectFile(f); });
    file.appendChild(fIn);
    quick.append(save, file);
    body.appendChild(quick);

    const expBtn = bigBtn('🗂 Open a saved project file', 'hub-btn', () => { const fi = body.querySelector('input[type=file]'); if (fi) fi.click(); }, 'hpImport');
    const expRow = document.createElement('div');
    expRow.style.margin = '0 0 8px';
    expRow.appendChild(expBtn);
    body.appendChild(expRow);

    const title = document.createElement('div');
    title.className = 'hu-sub';
    title.textContent = 'Your projects (saved on this device)';
    body.appendChild(title);
    const list = document.createElement('div');
    list.className = 'hp-list';
    const projects = hub.projects();
    if (!projects.length) {
      const empty = document.createElement('div');
      empty.className = 'hu-empty';
      empty.innerHTML = 'No projects yet — tap <b>💾 Save current scene as a project</b> above.';
      list.appendChild(empty);
    } else {
      projects.forEach((p) => list.appendChild(projectCard(p, renderProjects)));
    }
    body.appendChild(list);
    body.appendChild(thumbNote());
  }
  function thumbNote() {
    const n = document.createElement('div');
    n.className = 'hint';
    n.textContent = 'Thumbnails are captured from the 9:16 scene automatically. You can rename, duplicate or delete any project.';
    return n;
  }

  /* ==================================================== PRESET LIBRARY == */
  const PRESET_KINDS = [
    { k: 'camera', icon: '🎥', title: 'Camera presets', apply: (p) => hub.applyCameraPreset(p.payload), save: (nm) => hub.saveCamera(nm) },
    { k: 'lighting', icon: '💡', title: 'Lighting presets', apply: (p) => hub.applyLightingPreset(p.payload), save: (nm) => hub.saveLighting(nm) },
    { k: 'scene', icon: '🏠', title: 'Scene presets', apply: (p) => hub.applyScenePreset(p.payload), save: (nm) => hub.saveScene(nm) },
  ];
  function renderPresets() {
    const body = shell('Preset Library', '🗂');
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.innerHTML = 'Save any look you love and reuse it forever: <b>camera</b> framing, <b>lighting</b> + backdrop, or a full <b>scene</b> (products, lights, camera). One tap applies, one tap deletes.';
    body.appendChild(hint);

    PRESET_KINDS.forEach((K) => {
      const sec = document.createElement('div');
      sec.className = 'hu-sub';
      sec.textContent = K.icon + ' ' + K.title;
      body.appendChild(sec);

      const saveRow = document.createElement('div');
      saveRow.className = 'row';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.placeholder = 'Name this preset…';
      inp.className = 'hub-in';
      const add = bigBtn('💾 Save', 'primary', () => { const nm = inp.value.trim(); if (!nm) { inp.focus(); return; } K.save(nm); inp.value = ''; renderPresets(); });
      saveRow.append(inp, add);
      body.appendChild(saveRow);

      const list = document.createElement('div');
      list.className = 'hp-list';
      const items = hub.presets()[K.k] || [];
      if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'hu-empty';
        empty.textContent = 'None saved yet. Frame the shot / look you like, name it above, save it.';
        list.appendChild(empty);
      } else {
        items.forEach((p) => {
          const card = document.createElement('div');
          card.className = 'hp-card';
          card.innerHTML = '<div class="hp-top"><div class="hp-info">' +
            '<span class="hp-name">' + esc(p.name) + '</span>' +
            '<span class="hp-time">saved ' + rel(p.at) + '</span></div></div>' +
            '<div class="hp-acts">' +
            '<button class="hub-btn primary big" data-a="apply">Apply</button>' +
            '<button class="hub-btn danger" data-a="del">✕</button></div>';
          card.querySelector('[data-a=apply]').addEventListener('click', async () => { await K.apply(p); hub.record(); });
          card.querySelector('[data-a=del]').addEventListener('click', () => { hub.deletePreset(K.k, p.id); renderPresets(); });
          list.appendChild(card);
        });
      }
      body.appendChild(list);
    });
  }

  /* ======================================================= AUTO BACKUP == */
  function renderBackup() {
    const body = shell('Auto Backup', '💾');
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.innerHTML = 'The studio quietly snapshots your scene every few minutes and stores the latest one on this device. If the app closes unexpectedly, restore the newest snapshot below and carry on where you left off.';
    body.appendChild(hint);

    const st = document.createElement('div');
    st.className = 'hu-bk';
    body.appendChild(st);

    const acts = document.createElement('div');
    acts.className = 'row';
    acts.appendChild(bigBtn('♻️ Restore latest snapshot', 'primary big', async () => { await hub.restoreBackup(); close(); }, 'hbRestore'));
    acts.appendChild(bigBtn('💾 Snapshot now', '', async () => { await hub.autosaveNow(); renderBackup(); }, 'hbNow'));
    acts.appendChild(bigBtn('🧹 Clear recovery copy', 'danger', () => { hub.clearBackup(); renderBackup(); }, 'hbClear'));
    body.appendChild(acts);

    const note = document.createElement('div');
    note.className = 'hint';
    note.innerHTML = 'Saving a Project also records a recovery copy, so the newest snapshot always matches your latest work. Restores replace the current scene — undo history is kept fresh after that.';
    body.appendChild(note);
    refreshBackupCard();
    function refreshBackupCard() {
      const has = hub.hasBackup();
      const at = hub.backupAt();
      st.innerHTML = has
        ? '<div class="hu-bk-ok">● Snapshot saved <b>' + rel(at) + '</b> — ready to restore.</div>'
        : '<div class="hu-bk-none">No recovery snapshot yet. It is created a few minutes after you start editing, or now via “Snapshot now”.</div>';
    }
  }

  /* ====================================================== BATCH EXPORT == */
  function renderExport(initialSel) {
    const body = shell('Batch Export — Creator Pack', '📦');
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.innerHTML = 'Pick your deliverables and tap export. PNGs render right here; the <b>MP4s</b> (Reel + Story) come as ready-to-run <b>Blender Python</b> files in the same pack — Blender renders true 1080×1920 H.264 MP4 offline, no internet needed.';
    body.appendChild(hint);

    const items = [
      { id: 'reel', icon: '🎞️', t: 'Instagram Reel', d: '1080×1920 MP4 · via Blender script' },
      { id: 'storypng', icon: '🖼️', t: 'Story PNG', d: '1080×1920 PNG · rendered now' },
      { id: 'storymp4', icon: '🎬', t: 'Story MP4', d: '1080×1920 MP4 · via Blender script' },
      { id: 'post', icon: '📐', t: 'Post', d: '1080×1080 PNG · rendered now' },
      { id: 'heroes', icon: '🌟', t: 'Hero Images ×5', d: 'Front · Side · Rear · Top · 45°  (1080×1350 PNG)' },
      { id: 'transparent', icon: '✨', t: 'Transparent PNG pack ×5', d: 'product cut-outs with alpha' },
    ];
    const sel = {};
    items.forEach((it) => { sel[it.id] = initialSel && initialSel[it.id] !== undefined ? initialSel[it.id] : true; });

    const grid = document.createElement('div');
    grid.className = 'hx-grid';
    items.forEach((it) => {
      const c = document.createElement('label');
      c.className = 'hx-tile' + (sel[it.id] ? ' on' : '');
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = sel[it.id];
      cb.addEventListener('change', () => { sel[it.id] = cb.checked; c.classList.toggle('on', cb.checked); });
      c.innerHTML = '<span class="hx-ic">' + it.icon + '</span><span class="hx-t"><b>' + esc(it.t) + '</b><i>' + esc(it.d) + '</i></span>';
      c.prepend(cb);
      c.addEventListener('click', (e) => { if (e.target === cb) return; cb.checked = !cb.checked; sel[it.id] = cb.checked; c.classList.toggle('on', cb.checked); });
      grid.appendChild(c);
    });
    body.appendChild(grid);

    const need = Object.values(sel).some(Boolean);
    const exportBtn = bigBtn('⚡ Build Creator Pack (.zip)', 'primary big xl', () => {
      if (!S.state.models.some((m) => m.visible)) { toast('Add a product to the scene first — the pack has nothing to export yet.', true); return; }
      runExport(sel, body);
    });
    body.appendChild(exportBtn);
  }

  async function runExport(sel, body) {
    const include = {
      reel: !!sel.reel,
      storyPng: !!sel.storypng,
      storyMp4: !!sel.storymp4,
      post: !!sel.post,
      heroes: !!sel.heroes,
      transparent: !!sel.transparent,
    };
    const prog = document.createElement('div');
    prog.id = 'hxProg';
    prog.className = 'hx-prog';
    body.appendChild(prog);
    const line = (t) => { const d = document.createElement('div'); d.className = 'hx-line'; d.textContent = t; prog.appendChild(d); return d; };
    line('⚙️ Starting…');
    try {
      const summary = await exporter.makePack(include);
      exporter.download(summary);
      prog.innerHTML = '';
      const ok = document.createElement('div');
      ok.className = 'hx-done';
      ok.innerHTML = '✅ Pack ready — <b>' + esc(summary.name) + '</b><br><span>' + summary.count + ' files · ' + summary.pngs + ' PNGs · ' + summary.blenderScripts + ' Blender scripts · download started</span>';
      prog.appendChild(ok);
      (summary.log || []).forEach((l) => { const d = document.createElement('div'); d.className = 'hx-log'; d.textContent = l; prog.appendChild(d); });
      const note = document.createElement('div');
      note.className = 'hint';
      note.textContent = 'Run the .py files in Blender (or double-click the .bat / run the .sh) to encode the Reel + Story MP4s at full Cycles quality.';
      prog.appendChild(note);
      toast('📦 Creator Pack exported: ' + summary.name);
    } catch (e) {
      line('Export failed: ' + (e && e.message));
      toast('Batch export failed — ' + (e && e.message), true);
      console.error(e);
    }
  }

  /* ================================================== QUICK WORKFLOW == */
  function currentVer() { return getActiveVersion() || null; }
  function reel() { const v = currentVer(); if (!v || !v.memory) return []; if (!Array.isArray(v.memory.shots)) v.memory.shots = []; return v.memory.shots; }

  function wfAddAsset(entry) {
    const v = currentVer();
    let made = false;
    if (entry.glb) {
      S.loadDemo(entry.glb, { quiet: true, noFrame: true, place: S.nextPlaceOffset(), onAdd: (rec) => { if (rec && !made) { made = true; toast('➕ ' + entry.name + ' added to the scene'); hub.record(); } } });
    } else if (entry.make) {
      const off = S.nextPlaceOffset();
      const rec = S.addObject3D(entry.make(), entry.name, { quiet: true, noFrame: true, place: off });
      if (rec) { made = true; toast('➕ ' + entry.name + ' added to the scene'); hub.record(); }
    }
    if (v && v.onDeactivate) { try { v.onDeactivate(); } catch (e) {} }
  }
  function renderWorkflow(step) {
    const v = currentVer();
    const STEPS = [
      { id: 'project', label: 'Choose Project', icon: '📁' },
      { id: 'assets', label: 'Add Assets', icon: '➕' },
      { id: 'scene', label: 'Choose Scene', icon: '🎬' },
      { id: 'reel', label: 'Build Reel', icon: '🎞️' },
      { id: 'export', label: 'Export', icon: '📦' },
    ];
    const body = shell('Quick Creator Workflow', '🪄');
    const lead = document.createElement('div');
    lead.className = 'hint';
    lead.innerHTML = 'Five big steps, no timelines, no keyframes. Go in order — every step is one tap.';
    body.appendChild(lead);

    const nav = document.createElement('div');
    nav.className = 'wf-nav';
    STEPS.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wf-step' + (step === s.id ? ' on' : '');
      b.innerHTML = '<span class="wf-n">' + (i + 1) + '</span><span class="wf-l">' + s.icon + ' ' + s.label + '</span>';
      b.addEventListener('click', () => renderWorkflow(s.id));
      nav.appendChild(b);
    });
    body.appendChild(nav);

    const pane = document.createElement('div');
    pane.className = 'wf-pane creator';
    body.appendChild(pane);

    const seq = STEPS.map((s) => s.id);
    const go = (dir) => { const i = seq.indexOf(step); const n = seq[Math.max(0, Math.min(seq.length - 1, i + dir))]; if (n !== step) renderWorkflow(n); };

    /* ---------------------------- 1 · choose project -------------------- */
    if (step === 'project') {
      const t = document.createElement('div');
      t.className = 'wf-title';
      t.textContent = '1 · Choose a project — or save this scene as a fresh one';
      pane.appendChild(t);
      const projects = hub.projects();
      const grid = document.createElement('div');
      grid.className = 'hp-list';
      if (!projects.length) {
        const e = document.createElement('div');
        e.className = 'hu-empty';
        e.textContent = 'No saved projects yet. Keep going — after step 5 the pack is yours.';
        grid.appendChild(e);
      } else {
        projects.forEach((p) => grid.appendChild(projectCard(p, renderWorkflow)));
      }
      pane.appendChild(grid);
      const row = document.createElement('div');
      row.className = 'row';
      row.appendChild(bigBtn('💾 Save current scene as a project', 'gold big', async () => { await hub.saveProject(); renderWorkflow('project'); }, 'wfSave'));
      row.appendChild(bigBtn('➕ I’m starting fresh →', 'primary big', () => go(1), 'wfNext1'));
      pane.appendChild(row);
    }

    /* ------------------------------ 2 · add assets ---------------------- */
    if (step === 'assets') {
      const t = document.createElement('div');
      t.className = 'wf-title';
      t.textContent = '2 · Add products to the scene';
      pane.appendChild(t);
      const grid = document.createElement('div');
      grid.className = 'wf-assets';
      QUICK_ASSETS.forEach((key) => {
        const a = ASSETMAP[key]; if (!a) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'wf-a';
        b.innerHTML = '<span class="wf-aic">' + (a.icon || '📦') + '</span><span>' + esc(a.name) + '</span>';
        b.addEventListener('click', () => wfAddAsset(a));
        grid.appendChild(b);
      });
      pane.appendChild(grid);
      const up = bigBtn('📁 Upload your own .glb / .gltf', 'gold big', () => { const fi = document.getElementById('file'); if (fi) fi.click(); }, 'wfUpload');
      pane.appendChild(up);
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = 'Every product is live-editable and shared with V1–V6. Already ' + S.state.models.length + ' product(s) in this scene.';
      pane.appendChild(hint);
      const row = document.createElement('div');
      row.className = 'row';
      row.appendChild(bigBtn('← 1 Project', '', () => go(-1)));
      row.appendChild(bigBtn('3 · Choose Scene →', 'primary big', () => go(1), 'wfNext2'));
      pane.appendChild(row);
    }

    /* ------------------------------ 3 · choose scene -------------------- */
    if (step === 'scene') {
      const t = document.createElement('div');
      t.className = 'wf-title';
      t.textContent = '3 · Choose the scene look (lighting + backdrop)';
      pane.appendChild(t);
      const grid = document.createElement('div');
      grid.className = 'wf-scenes';
      WF_SCENES.forEach((sc) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'wf-s';
        b.innerHTML = '<span class="wf-sic">' + sc.icon + '</span><span class="wf-st"><b>' + sc.label + '</b><i>' + sc.sub + '</i></span>';
        b.addEventListener('click', () => {
          S.setLightingPreset(sc.key);
          hub.record();
          toast('🎬 Scene: ' + sc.label);
        });
        grid.appendChild(b);
      });
      pane.appendChild(grid);
      const togg = document.createElement('div');
      togg.className = 'row';
      const guidesOn = S.state.guideVisible === true;
      togg.appendChild(bigBtn(guidesOn ? '⊞ Safe-frame guides: ON' : '⊞ Safe-frame guides: OFF', 'gold big', () => {
        S.updateGuide(!(S.state.guideVisible === true));
        hub.record();
        toast('⊞ Safe-frame guides ' + (S.state.guideVisible === true ? 'on' : 'off'));
        renderWorkflow('scene');
      }));
      pane.appendChild(togg);
      const row = document.createElement('div');
      row.className = 'row';
      row.appendChild(bigBtn('← 2 Add Assets', '', () => go(-1)));
      row.appendChild(bigBtn('4 · Build Reel →', 'primary big', () => go(1), 'wfNext3'));
      pane.appendChild(row);
    }

    /* ------------------------------ 4 · build reel ---------------------- */
    if (step === 'reel') {
      const t = document.createElement('div');
      t.className = 'wf-title';
      t.textContent = '4 · Build your reel — tap shots in the order you want them';
      pane.appendChild(t);
      const shots = document.createElement('div');
      shots.className = 'creator shot-grid';
      shots.style.gridTemplateColumns = '1fr 1fr 1fr';
      WF_SHOTS.forEach((s) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = '<span class="si">' + s.icon + '</span><span class="sl">' + s.label + '</span>';
        b.addEventListener('click', () => {
          try { S.stopCamControl && S.stopCamControl(); } catch (e) {}
          if (reel().length >= 24) { toast('Reel is full (24) — clear a few first.', true); return; }
          reel().push(s.key);
          try { S.frame(s.preset); } catch (e) {}
          syncReelUI(shots, pane, true);
          hub.record();
          toast('➕ ' + s.label + ' — ' + reel().length + ' shot(s)');
        });
        shots.appendChild(b);
      });
      pane.appendChild(shots);

      const reelSec = document.createElement('div');
      reelSec.className = 'wf-reel';
      pane.appendChild(reelSec);
      const navRow = document.createElement('div');
      navRow.className = 'row';
      const play = bigBtn('▶ Play Reel Preview', 'primary big xl', () => { if (wfPlaying) stopReel(); else playReel(pane); }, 'wfPlay');
      navRow.appendChild(play);
      const clear = bigBtn('🧹 Clear reel', 'danger', () => { stopReel(); reel().length = 0; syncReelUI(shots, pane); hub.record(); toast('🧹 Reel cleared'); });
      navRow.appendChild(clear);
      pane.appendChild(navRow);
      const row2 = document.createElement('div');
      row2.className = 'row';
      row2.appendChild(bigBtn('← 3 Choose Scene', '', () => go(-1)));
      row2.appendChild(bigBtn('5 · Export →', 'primary big', () => go(1), 'wfNext4'));
      pane.appendChild(row2);
      syncReelUI(shots, pane);
      const h3 = document.createElement('div');
      h3.className = 'hint';
      h3.textContent = 'The reel preview moves the camera through your shots. No timelines, no keyframes — export next to get the MP4 + stills.';
      pane.appendChild(h3);
      function playReel() {
        if (!reel().length) { toast('Your reel is empty — tap shots above.', true); return; }
        try { S.stopCamControl && S.stopCamControl(); } catch (e) {}
        let i = 0;
        wfPlaying = { i, timer: null };
        const stepShot = () => {
          if (!wfPlaying) return;
          const r = reel(); if (!r.length) { stopReel(); return; }
          const key = r[i % r.length];
          const shot = WF_SHOTS.find((s) => s.key === key) || WF_SHOTS[0];
          try { S.frame(shot.preset); } catch (e) {}
          const chips = pane.querySelectorAll('.wf-chip');
          chips.forEach((c, ci) => c.classList.toggle('on', ci === (i % r.length)));
          i++;
          wfPlaying.i = i;
          wfPlaying.timer = setTimeout(stepShot, 3600);
        };
        stepShot();
        play.textContent = '⏹ Stop Reel Preview';
        toast('▶ Playing ' + reel().length + ' shot reel');
      }
    }

    /* ------------------------------- 5 · export ------------------------- */
    if (step === 'export') {
      const t = document.createElement('div');
      t.className = 'wf-title';
      t.textContent = '5 · Export your Creator Pack';
      pane.appendChild(t);
      const summary = document.createElement('div');
      summary.className = 'wf-summary';
      const n = reel().length;
      summary.innerHTML = '<b>' + S.state.models.length + '</b> product(s) in scene · <b>' + n + '</b> reel shot(s) · brand ' + (S.brand.kit() ? 'applied ✓' : 'off') + ' · lighting “' + esc(S.lightName()) + '”';
      pane.appendChild(summary);
      const mini = document.createElement('div');
      const ln = (id, txt) => { const d = document.createElement('div'); d.className = 'row chk'; const c = document.createElement('input'); c.type = 'checkbox'; c.id = id; c.checked = true; d.append(c, document.createTextNode(txt)); mini.appendChild(d); };
      ln('wfXreel', '🎞️ Instagram Reel MP4 (Blender)');
      ln('wfXstory', '🖼️ Story PNG');
      ln('wfXstorymp4', '🎬 Story MP4 (Blender)');
      ln('wfXpost', '📐 Post PNG');
      ln('wfXheroes', '🌟 Hero PNGs ×5');
      ln('wfXtrans', '✨ Transparent PNG pack');
      pane.appendChild(mini);
      const goExport = bigBtn('⚡ Build & download Creator Pack', 'primary big xl', () => {
        const chk = (id) => { const e = document.getElementById(id); return !e || e.checked; };
        renderExport({ reel: chk('wfXreel'), storypng: chk('wfXstory'), storymp4: chk('wfXstorymp4'), post: chk('wfXpost'), heroes: chk('wfXheroes'), transparent: chk('wfXtrans') });
      }, 'wfExportNow');
      pane.appendChild(goExport);
      const row = document.createElement('div');
      row.className = 'row';
      row.appendChild(bigBtn('← 4 Build Reel', '', () => go(-1)));
      pane.appendChild(row);
    }

    return;

    function syncReelUI(shotsGrid, pane) {
      const list = pane.querySelector('.wf-reel');
      if (!list) return;
      list.innerHTML = '';
      const r = reel();
      if (!r.length) {
        const e = document.createElement('div');
        e.className = 'hu-empty';
        e.textContent = 'Empty — tap the big shot cards above.';
        list.appendChild(e);
        return;
      }
      r.forEach((key, i) => {
        const s = WF_SHOTS.find((x) => x.key === key) || { icon: '🎬', label: key };
        const chip = document.createElement('span');
        chip.className = 'wf-chip';
        chip.innerHTML = '<b>' + (i + 1) + '</b>' + s.icon + ' ' + esc(s.label);
        chip.addEventListener('click', () => { stopReel(); try { S.frame(s.preset); } catch (e) {} try { S.stopCamControl && S.stopCamControl(); } catch (e) {} });
        list.appendChild(chip);
      });
    }
  }

  /* ========================================================= UNDO/REDO == */
  function renderUndo() {
    const body = shell('Undo / Redo', '⟲');
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.innerHTML = 'Every edit to the scene is remembered — products, parts, colours, materials, camera, lighting, backdrop, brand & reel. <b>Unlimited steps</b> back and forward (this device keeps the latest 200). Desktop shortcut: <b>Ctrl/⌘+Z</b> undo · <b>Ctrl/⌘+Shift+Z</b> (or Ctrl+Y) redo.';
    body.appendChild(hint);
    const info = document.createElement('div');
    info.id = 'huUndoInfo';
    info.className = 'hu-empty';
    body.appendChild(info);
    const row = document.createElement('div');
    row.className = 'row';
    const u = bigBtn('⟲  Undo', 'primary big xl', async () => { if (await hub.undo()) refresh(); }, 'hubUndoBig');
    const r = bigBtn('⟳  Redo', 'gold big xl', async () => { if (await hub.redo()) refresh(); }, 'hubRedoBig');
    row.append(u, r);
    body.appendChild(row);
    const tip = document.createElement('div');
    tip.className = 'hint';
    tip.textContent = 'Undo works across versions too: hop to V6 anytime to undo an edit you made in V1–V5.';
    body.appendChild(tip);
    function refresh() {
      info.textContent = hub.canUndo() ? '↩ ' + 'undo available (newest snapshot above)' : 'Nothing to undo right now.';
    }
    refresh();
  }

  /* ------------------------------------------------ panel entry points --- */
  function openPanel(name) {
    current = name;
    if (name === 'projects') renderProjects();
    else if (name === 'presets') renderPresets();
    else if (name === 'backup') renderBackup();
    else if (name === 'export') renderExport();
    else if (name === 'workflow') renderWorkflow('project');
    else if (name === 'undo') renderUndo();
    else close();
  }

  /* -------------------------------------------------- undo/redo cluster --- */
  const ur = document.createElement('div');
  ur.className = 'hu-undo';
  ur.innerHTML = '';
  const uBtn = document.createElement('button');
  uBtn.id = 'hubUndo';
  uBtn.type = 'button';
  uBtn.textContent = '⟲';
  uBtn.title = 'Undo (Ctrl/⌘+Z)';
  uBtn.className = 'hub-btn big undo';
  const rBtn = document.createElement('button');
  rBtn.id = 'hubRedo';
  rBtn.type = 'button';
  rBtn.textContent = '⟳';
  rBtn.title = 'Redo (Ctrl/⌘+Shift+Z)';
  rBtn.className = 'hub-btn big redo';
  ur.append(uBtn, rBtn);
  document.body.appendChild(ur);
  const refreshUR = () => {
    const v = getActiveVersion();
    const on = v && (v.tpl === 'brandstudio');
    ur.style.display = on ? 'flex' : 'none';
    if (on) { uBtn.disabled = !hub.canUndo(); rBtn.disabled = !hub.canRedo(); }
  };
  uBtn.addEventListener('click', () => { hub.undo(); });
  rBtn.addEventListener('click', () => { hub.redo(); });
  hub.onChange(refreshUR);
  onVersionChange(() => { if (current) { close(); } refreshUR(); });
  refreshUR();

  /* keyboard shortcuts (desktop) — only while a V6-family version is active */
  document.addEventListener('keydown', (e) => {
    const v = getActiveVersion();
    if (!v || v.tpl !== 'brandstudio') return;
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const k = (e.key || '').toLowerCase();
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (typing) return;
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); hub.undo(); }
    else if (k === 'z' && e.shiftKey) { e.preventDefault(); hub.redo(); }
    else if (k === 'y') { e.preventDefault(); hub.redo(); }
  });

  /* boot-time recovery card: if an auto-backup exists and the current scene
     looks like a fresh boot, offer to restore the latest snapshot */
  const bootCard = document.createElement('div');
  bootCard.className = 'hu-recover';
  document.body.appendChild(bootCard);
  function maybeOffer() {
    const has = hub.hasBackup();
    const snap = hub.snapProbe ? hub.snapProbe() : null;
    if (!has) return;
    if (snap && snap > 1) return; // already carrying more than the demo default
    bootCard.innerHTML = '<div class="hu-rec-in"><b>♻️ Recover your last session?</b>' +
      '<span>A recovery snapshot from ' + rel(hub.backupAt()) + ' is waiting.</span>' +
      '<div class="row"><button class="hub-btn primary big" id="huRecYes">Restore it</button>' +
      '<button class="hub-btn" id="huRecNo">Not now</button></div></div>';
    bootCard.style.display = 'flex';
    bootCard.querySelector('#huRecYes').addEventListener('click', async () => { bootCard.style.display = 'none'; await hub.restoreBackup(); });
    bootCard.querySelector('#huRecNo').addEventListener('click', () => { bootCard.style.display = 'none'; });
    setTimeout(() => { bootCard.style.display = 'none'; }, 20000);
  }
  setTimeout(maybeOffer, 2600);

  return api;
}
