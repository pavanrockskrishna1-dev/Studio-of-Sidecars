import { section, toast } from '../core/ui.js';

/* =========================================================================
 *  VERSION 4 — CREATOR STUDIO  (template: 'creator')
 *  A dead-simple, tablet-first reel builder: big one-tap Shot tiles
 *  (Hero / Front / Side / Close-up / Top / Pour Coffee). Every tap appends a
 *  shot to an ordered reel, chips can be drag-reordered (pointer events,
 *  touch + mouse), and ONE big ▶ Play Reel Preview button plays the whole
 *  reel back as camera shots. No timelines, keyframes or editing panels —
 *  by design.
 * ========================================================================= */

const MAX_SHOTS = 24;

const SHOTS = [
  { key: 'hero',     label: 'Hero',       icon: '🌟', preset: 'hero' },
  { key: 'front',    label: 'Front',      icon: '📸', preset: 'front' },
  { key: 'side',     label: 'Side',       icon: '↔️', preset: 'side' },
  { key: 'closeup',  label: 'Close-up',   icon: '🔍', preset: 'macro' },
  { key: 'top',      label: 'Top',        icon: '🛰️', preset: 'top' },
  { key: 'pour',     label: 'Pour Coffee', icon: '☕', preset: 'pour' },
];
const LIB = {}; SHOTS.forEach((s) => { LIB[s.key] = s; });

/* pace of the preview — a gentle move into the shot, then a short dwell */
const ENTER_MS = 1250;
const HOLD_MS = 2350;

const LIGHTING_GROUPS = [{
  label: 'Creator looks',
  options: [
    { value: 'softbox', label: '💡 Softbox Studio (default)' },
    { value: 'coffeeshop', label: '☕ Coffee Shop Window' },
    { value: 'morning', label: '🌤️ Outdoor Morning' },
    { value: 'nightcafe', label: '🌃 Night Café' },
  ],
}];

export function createCreator(seed = {}) {
  const memory = Object.assign({ lighting: seed.defaultLighting || 'softbox' }, seed.memory || {});
  if (!Array.isArray(memory.shots)) memory.shots = [];

  const v = {
    id: seed.id || 'creator',
    ns: seed.ns || 'v4',
    short: seed.short || 'V4',
    label: seed.label || 'Creator Studio',
    icon: seed.icon || '🎥',
    tagline: seed.tagline || 'One-tap shot builder · preview your reel',
    tpl: 'creator',
    userCreated: !!seed.userCreated,
    defaultFormat: seed.defaultFormat || '9:16',
    defaultLighting: seed.defaultLighting || 'softbox',
    defaultGuide: seed.defaultGuide !== undefined ? !!seed.defaultGuide : true,
    heroPreset: seed.heroPreset || '45',
    frameOpts: Object.assign({}, seed.frameOpts || {}),
    cameraPresets: SHOTS.map((s) => ({ key: s.key, label: s.label })),
    moves: [],
    lightingOptions: LIGHTING_GROUPS.map((g) => ({ label: g.label, options: g.options.map((o) => ({ ...o })) })),
    memory,
    /* playback engine (per-instance so duplicated versions preview their own reel) */
    _pv: { playing: false, i: 0, timer: null, nodes: [] },
  };

  /* ------------------------------------------------ reel (plain array of keys) */
  function reel() { return v.memory.shots; }

  /* ------------------------------------------------------------ shot builder */
  function addShot(key) {
    const shot = LIB[key];
    if (!shot) return;
    stopPreview();
    if (reel().length >= MAX_SHOTS) { toast('Reel is full (' + MAX_SHOTS + ' shots) — clear a few first.', true); return; }
    reel().push(key);
    try { S.frame(shot.preset); } catch (e) {}
    renderReel();
    if (reel().length === 1) toast('➕ ' + shot.label + ' added — tap more shots, then ▶ Play Reel Preview');
    else toast('➕ ' + shot.label + ' added — reel now ' + reel().length + ' shots');
    syncCount();
  }

  /* ------------------------------------------------------------- DOM / render */
  const shot = (ns, id) => document.getElementById(ns + id);

  function tileRow() {
    const grid = document.createElement('div');
    grid.className = 'shot-grid';
    SHOTS.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.shot = s.key;
      b.setAttribute('aria-label', 'Add ' + s.label + ' shot');
      b.innerHTML = '<span class="si">' + s.icon + '</span><span class="sl">' + s.label + '</span>';
      b.addEventListener('click', () => addShot(s.key));
      grid.appendChild(b);
    });
    return grid;
  }

  function chipNode(idx, key) {
    const s = LIB[key] || { label: key, icon: '🎬', preset: '45' };
    const row = document.createElement('div');
    row.className = 'rshot';
    row.dataset.key = key;
    const h = document.createElement('button');
    h.type = 'button';
    h.className = 'rhnd';
    h.setAttribute('aria-label', 'Drag to reorder shot ' + (idx + 1));
    h.textContent = '≡';
    const n = document.createElement('span'); n.className = 'rnum'; n.textContent = String(idx + 1);
    const ic = document.createElement('span'); ic.className = 'rico'; ic.textContent = s.icon;
    const lb = document.createElement('span'); lb.className = 'rlbl'; lb.textContent = s.label;
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'rx';
    x.setAttribute('aria-label', 'Remove ' + s.label);
    x.textContent = '✕';
    x.addEventListener('click', (ev) => { ev.stopPropagation(); removeAt(idx); });
    row.append(h, n, ic, lb, x);
    return row;
  }

  function syncCount() {
    const c = shot(v.ns, 'Count'); if (c) c.textContent = String(reel().length);
  }

  function renderReel() {
    const ns = v.ns;
    const list = shot(ns, 'Reel');
    const empty = shot(ns, 'Empty');
    const play = shot(ns, 'Play');
    const clear = shot(ns, 'Clear');
    const emptyText = shot(ns, 'EmptyText');
    if (emptyText) emptyText.textContent = reel().length ? '' : 'Your reel is empty — tap the big shots above, in the order you want them to appear.';
    if (!list) return;
    list.innerHTML = '';
    v._pv.nodes = [];
    reel().forEach((key, idx) => list.appendChild(chipNode(idx, key)));
    v._pv.nodes = Array.from(list.children);
    if (empty) empty.style.display = reel().length ? 'none' : 'block';
    if (play) { play.disabled = reel().length === 0 || v._pv.playing; play.textContent = v._pv.playing ? '⏹ Stop Preview' : '▶ Play Reel Preview'; }
    if (clear) clear.disabled = reel().length === 0;
    const len = reel().length ? Math.max(1, Math.round((reel().length * (ENTER_MS + HOLD_MS)) / 1000)) : 0;
    const info = shot(ns, 'Info');
    if (info) info.textContent = reel().length ? reel().length + ' shots · preview ≈ ' + len + ' s (loops)' : '';
    const prog = shot(ns, 'Prog');
    if (prog) prog.textContent = '';
  }

  /* ------------------------------------------------------------- drag reorder */
  function wireDrag(listEl) {
    const nodes = () => v._pv.nodes;
    let drag = null;

    const pick = (clientY) => {
      const arr = nodes();
      for (let i = 0; i < arr.length; i++) {
        const r = arr[i].getBoundingClientRect();
        if (clientY < r.top + r.height / 2) return i;
      }
      return arr.length - 1;
    };
    const renumber = () => {
      nodes().forEach((el, i) => { const n = el.querySelector('.rnum'); if (n) n.textContent = String(i + 1); });
    };

    listEl.addEventListener('pointerdown', (e) => {
      const h = e.target.closest && e.target.closest('.rhnd');
      if (!h) return;
      const node = h.closest('.rshot');
      if (!node) return;
      if (v._pv.playing) stopPreview();
      drag = { cur: nodes().indexOf(node), pointerId: e.pointerId, node };
      try { h.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });

    listEl.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const arr = nodes();
      if (!arr.length) return;
      const to = pick(e.clientY);
      if (to !== drag.cur) {
        // move the array entry AND its DOM node in lockstep (keeps pointer capture)
        const key = reel().splice(drag.cur, 1)[0];
        reel().splice(to, 0, key);
        const el = arr.splice(drag.cur, 1)[0];
        if (to >= arr.length) listEl.appendChild(el); else listEl.insertBefore(el, arr[to]);
        arr.splice(to, 0, el);
        drag.cur = to;
        renumber();
      }
      e.preventDefault();
    });

    const end = (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      try { if (drag.node) { const h = drag.node.querySelector('.rhnd'); if (h && h.releasePointerCapture) h.releasePointerCapture(e.pointerId); } } catch (err) {}
      drag = null;
      renumber();
      syncCount();
      if (reel().length) toast('↕️ Reel order updated');
    };
    listEl.addEventListener('pointerup', end);
    listEl.addEventListener('pointercancel', end);
  }

  /* ------------------------------------------------------------- reel preview */
  function removeAt(idx) {
    stopPreview();
    reel().splice(idx, 1);
    renderReel();
    syncCount();
    toast('🗑️ Shot removed');
  }
  function clearAll() {
    stopPreview();
    reel().length = 0;
    renderReel();
    syncCount();
    toast('🧹 Reel cleared');
  }
  function markActive(idx) {
    const nodes = v._pv.nodes;
    nodes.forEach((el, i) => el.classList.toggle('on', i === idx));
  }
  function stopPreview() {
    const pv = v._pv;
    pv.playing = false;
    clearTimeout(pv.timer);
    pv.timer = null;
    markActive(-1);
    const prog = shot(v.ns, 'Prog'); if (prog) prog.textContent = '';
    const play = shot(v.ns, 'Play');
    if (play) { play.disabled = reel().length === 0; play.textContent = '▶ Play Reel Preview'; }
  }
  function stepPreview() {
    const pv = v._pv;
    if (!pv.playing) return;
    if (!reel().length) { stopPreview(); return; }
    const i = pv.i % reel().length;
    const key = reel()[i];
    const s = LIB[key] || LIB.hero;
    try { S.frame(s.preset); } catch (e) {}
    markActive(i);
    const prog = shot(v.ns, 'Prog');
    if (prog) prog.textContent = '▶ ' + (i + 1) + ' / ' + reel().length + ' · ' + s.label;
    pv.i++;
    pv.timer = setTimeout(stepPreview, ENTER_MS + HOLD_MS);
  }
  function startPreview() {
    const pv = v._pv;
    if (pv.playing) { stopPreview(); return; }
    if (!reel().length) { toast('Your reel is empty — tap shots above to build one.', true); return; }
    try { S.stopCamControl(); } catch (e) {}
    pv.playing = true;
    pv.i = 0;
    const play = shot(v.ns, 'Play');
    if (play) { play.disabled = false; play.textContent = '⏹ Stop Preview'; }
    stepPreview();
  }

  /* ------------------------------------------------------------------- build */
  v.build = function build(S) {
    const ns = v.ns;
    const wrap = document.createElement('div');
    wrap.className = 'creator';
    wrap.dataset.ver = ns;

    /* shot builder */
    const builder = section('🎬 Shot Builder — tap to add', true, ns);
    const lead = document.createElement('div');
    lead.className = 'hint';
    lead.innerHTML = 'One tap adds a shot to your reel <b>and</b> previews its angle. Tap shots in the order you want them to appear.';
    builder.appendChild(lead);
    builder.appendChild(tileRow());
    const gridNote = document.createElement('div');
    gridNote.className = 'hint';
    gridNote.textContent = '💡 Pour Coffee frames a serving-angle shot — switch the demo to ☕ Coffee for a full coffee-set story.';
    builder.appendChild(gridNote);
    wrap.appendChild(builder);

    /* the reel */
    const reelSec = section('🎞️ Your Reel', true, ns);
    const empty = document.createElement('div');
    empty.id = ns + 'Empty';
    empty.className = 'reel-empty';
    empty.textContent = 'Your reel is empty — tap shots above to build one.';
    reelSec.appendChild(empty);

    const list = document.createElement('div');
    list.id = ns + 'Reel';
    list.className = 'reel-list';
    reelSec.appendChild(list);
    wireDrag(list);

    const hint2 = document.createElement('div');
    hint2.className = 'hint';
    hint2.textContent = '↕️ Drag ≡ to reorder · tap ✕ to remove a shot';
    reelSec.appendChild(hint2);

    const playRow = document.createElement('div');
    playRow.className = 'row';
    playRow.style.marginTop = '8px';
    const play = document.createElement('button');
    play.type = 'button';
    play.id = ns + 'Play';
    play.className = 'primary play-big';
    play.textContent = '▶ Play Reel Preview';
    play.addEventListener('click', () => { if (v._pv.playing) stopPreview(); else startPreview(); });
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.id = ns + 'Clear';
    clear.textContent = '🧹 Clear';
    clear.addEventListener('click', clearAll);
    playRow.append(play, clear);
    reelSec.appendChild(playRow);

    const prog = document.createElement('div');
    prog.id = ns + 'Prog';
    prog.className = 'reel-prog';
    reelSec.appendChild(prog);

    const info = document.createElement('div');
    info.id = ns + 'Info';
    info.className = 'hint reel-count';
    reelSec.appendChild(info);

    const hiddenCount = document.createElement('span');
    hiddenCount.id = ns + 'Count';
    hiddenCount.style.display = 'none';
    reelSec.appendChild(hiddenCount);
    wrap.appendChild(reelSec);

    renderReel();
    return wrap;
  };

  v.onActivate = function onActivate() { renderReel(); };
  v.onDeactivate = function onDeactivate() { stopPreview(); };
  return v;
}

export default createCreator();
