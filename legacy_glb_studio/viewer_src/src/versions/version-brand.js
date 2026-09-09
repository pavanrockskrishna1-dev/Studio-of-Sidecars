import { section, toast } from '../core/ui.js';
import { FONTS, LOGO_CHARS, makeKit, loadKits, upsertKit, removeKit, activeId, setActive, activeKit } from '../core/brand.js';
import { getActiveVersion } from './registry.js';

/* =========================================================================
 *  VERSION 6 — BRAND STUDIO  (template: 'brandstudio')
 *  Reusable brand kits: logo, colours, typography, watermark, intro/outro
 *  cards, default background. One tap applies a kit to the WHOLE shared
 *  scene (any version / any reel) through the engine brand layer. Sample
 *  kits ship ready: Coffee Bike, BBQ Bike, The KOP — plus custom ones.
 *  Tablet-friendly: big tiles, big touch buttons.
 * ========================================================================= */

const MAX_LOGO_DATAURL = 240000; // chars — bigger logos are session-only

export function createBrandStudio(seed = {}) {
  const memory = Object.assign({ lighting: seed.defaultLighting || 'softbox' }, seed.memory || {});
  const v = {
    id: seed.id || 'brandstudio',
    ns: seed.ns || 'v6',
    short: seed.short || 'V6',
    label: seed.label || 'Brand Studio',
    icon: seed.icon || '🎨',
    tagline: seed.tagline || 'Brand kits: logo, colors, fonts, watermark, intro/outro',
    tpl: 'brandstudio',
    userCreated: !!seed.userCreated,
    defaultFormat: seed.defaultFormat || '9:16',
    defaultLighting: seed.defaultLighting || 'softbox',
    defaultGuide: !!seed.defaultGuide,
    heroPreset: seed.heroPreset || 'hero',
    frameOpts: Object.assign({}, seed.frameOpts || {}),
    cameraPresets: [],
    moves: [],
    lightingOptions: [],
    memory,
    _bs: { sel: null, S: null, timeout: null },
  };

  const ns = v.ns;
  const el = (id) => document.getElementById(ns + id);
  let S = null;

  const selId = () => v._bs.sel;
  const kitOf = (id) => loadKits().find((k) => k.id === id) || null;
  const selectedKit = () => kitOf(selId());

  /* ----------------------------------------------------------------------- */
  function save(kit) {
    upsertKit(kit);
    renderKits();
  }
  function applyKit(kit, opts = {}) {
    if (!kit) return;
    setActive(kit.id);
    v._bs.sel = kit.id;
    S.brand.apply(kit, opts);
    renderKits();
  }

  /* ============================ KIT TILES ============================ */
  function renderKits() {
    const host = el('Kits'); if (!host) return;
    const list = loadKits();
    host.innerHTML = '';
    list.forEach((kit) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'bs-kit' + (selId() === kit.id ? ' on' : '');
      tile.dataset.kid = kit.id;
      const logoImg = kit.logo ? '<img class="bs-klg" src="' + kit.logo + '" alt="">' : '<span class="bs-kch" style="background:' + (kit.colors.primary || '#555') + '">' + (kit.logoChar || kit.icon) + '</span>';
      tile.innerHTML = logoImg + '<span class="bs-knm">' + kit.name + '</span>' +
        '<span class="bs-kdot"></span>';
      tile.title = 'Apply “' + kit.name + '” to the whole scene / reel';
      tile.addEventListener('click', () => {
        const k = kitOf(kit.id); if (!k) return;
        v._bs.sel = kit.id;
        applyKit(k);
        buildEditor();
        toast('🎨 “' + kit.name + '” applied — switch versions; the brand travels with the scene');
      });
      host.appendChild(tile);
    });
    const cnt = el('KitCount'); if (cnt) cnt.textContent = list.length + (list.length === 1 ? ' kit' : ' kits');
    if (el('ActiveName')) {
      const act = activeKit();
      el('ActiveName').textContent = act ? (act.logoChar || act.icon) + ' Active: ' + act.name : 'No kit applied';
    }
  }

  /* ============================ ACTION ROW ============================ */
  function wireActions() {
    const mk = (id, label, cls, fn) => { const b = el(id); if (b) b.addEventListener('click', fn); };
    mk('New', '＋ New kit', 'primary', () => {
      const kit = makeKit({ name: 'New Brand', logoChar: '🎨', colors: { primary: '#3b6ea5', accent: '#9fd0ff', bg: '#10141c', text: '#eef4fb' } });
      upsertKit(kit);
      setActive(kit.id); v._bs.sel = kit.id;
      S.brand.apply(kit);
      renderKits(); buildEditor();
      toast('🎨 New brand kit created — give it a name and colors below');
    });
    mk('Edit', '✎ Edit', '', () => { const k = selectedKit(); if (k) buildEditor(); });
    mk('Dup', '⧉ Duplicate', '', () => {
      const k = selectedKit(); if (!k) return;
      const copy = makeKit({ name: k.name + ' Copy', icon: k.icon, logo: k.logo, logoChar: k.logoChar, colors: JSON.parse(JSON.stringify(k.colors)), font: k.font, watermark: JSON.parse(JSON.stringify(k.watermark)), intro: JSON.parse(JSON.stringify(k.intro)), outro: JSON.parse(JSON.stringify(k.outro)), applyBg: k.applyBg });
      upsertKit(copy);
      setActive(copy.id); v._bs.sel = copy.id;
      S.brand.apply(copy);
      renderKits(); buildEditor();
      toast('⧉ Duplicated to “' + copy.name + '” and applied');
    });
    mk('Del', '🗑 Delete', 'danger', () => {
      const k = selectedKit(); if (!k) return;
      removeKit(k.id);
      if (selId() === k.id) { v._bs.sel = null; S.brand.apply(null); }
      renderKits(); buildEditor();
      toast('🗑 Deleted “' + k.name + '”');
    });
  }

  /* ============================ COLOR INPUT ============================ */
  function colorField(label, cid, kit, key) {
    const lab = document.createElement('label');
    lab.className = 'bs-cl';
    lab.innerHTML = '<span>' + label + '</span>';
    const inp = document.createElement('input');
    inp.type = 'color';
    inp.id = cid;
    inp.value = kit.colors[key] || '#888888';
    inp.dataset.cid = cid;
    inp.addEventListener('input', () => {
      kit.colors[key] = inp.value;
      save(kit);
      S.brand.apply(kit, { silent: true });
    });
    lab.appendChild(inp);
    return lab;
  }

  /* ============================ EDITOR ============================ */
  function buildEditor() {
    const host = el('Editor'); if (!host) return;
    const kit = selectedKit();
    if (!kit) {
      host.innerHTML = '<div class="hint bs-nosel">Tap a brand kit above to apply it, then fine-tune it here. Or create a new one.</div>';
      return;
    }
    host.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'bs-title';
    title.innerHTML = '🎨 Editing: <b>' + kit.name + '</b>';
    host.appendChild(title);

    /* name + icon + font */
    const row1 = document.createElement('div');
    row1.className = 'row';
    const nmL = document.createElement('label'); nmL.className = 'fld'; nmL.style.flex = '1';
    nmL.innerHTML = 'Kit name';
    const nmI = document.createElement('input'); nmI.type = 'text'; nmI.id = ns + 'KitName'; nmI.value = kit.name;
    nmI.addEventListener('input', () => { kit.name = nmI.value || 'Brand'; save(kit); if (el('KitTitle')) el('KitTitle').textContent = kit.name; S.brand.apply(kit, { silent: true }); });
    nmL.appendChild(nmI);
    const icL = document.createElement('label'); icL.className = 'fld'; icL.style.flex = '0 0 84px';
    icL.innerHTML = 'Icon';
    const icI = document.createElement('input'); icI.type = 'text'; icI.id = ns + 'KitIcon'; icI.value = kit.icon || '🎨'; icI.style.textAlign = 'center'; icI.style.fontSize = '18px';
    icI.addEventListener('input', () => { kit.icon = icI.value || '🎨'; save(kit); });
    icL.appendChild(icI);
    row1.append(nmL, icL);
    host.appendChild(row1);

    const fontL = document.createElement('label'); fontL.className = 'fld';
    fontL.innerHTML = 'Typography (font)';
    const fontS = document.createElement('select');
    fontS.id = ns + 'Font';
    FONTS.forEach((f) => { const o = document.createElement('option'); o.value = f.key; o.textContent = f.label; fontS.appendChild(o); });
    fontS.value = FONTS.some((f) => f.key === kit.font) ? kit.font : 'modern';
    fontS.style.fontFamily = (FONTS.find((f) => f.key === fontS.value) || {}).stack;
    fontS.addEventListener('change', () => { kit.font = fontS.value; save(kit); S.brand.apply(kit, { silent: true }); toast('✒️ Font: ' + (fontS.selectedOptions[0] || {}).textContent); });
    fontL.appendChild(fontS);
    host.appendChild(fontL);

    /* colours */
    const cWrap = document.createElement('div');
    cWrap.className = 'bs-colors';
    cWrap.append(colorField('Primary', ns + 'C1', kit, 'primary'));
    cWrap.append(colorField('Accent', ns + 'C2', kit, 'accent'));
    cWrap.append(colorField('Background', ns + 'C3', kit, 'bg'));
    cWrap.append(colorField('Text', ns + 'C4', kit, 'text'));
    host.appendChild(cWrap);

    /* apply-background toggle + watermark */
    const chkB = document.createElement('div'); chkB.className = 'chk';
    const bgI = document.createElement('input'); bgI.type = 'checkbox'; bgI.id = ns + 'ApplyBg'; bgI.checked = kit.applyBg !== false;
    bgI.addEventListener('change', () => { kit.applyBg = bgI.checked; save(kit); S.brand.apply(kit, { silent: true }); toast(bgI.checked ? 'Kit background will tint the scene' : 'Kit background off — lighting backdrop wins'); });
    chkB.append(bgI, document.createTextNode(' Use kit default background in the scene'));
    host.appendChild(chkB);

    const chkW = document.createElement('div'); chkW.className = 'chk';
    const wmI = document.createElement('input'); wmI.type = 'checkbox'; wmI.id = ns + 'WmOn'; wmI.checked = kit.watermark.on !== false;
    wmI.addEventListener('change', () => { kit.watermark.on = wmI.checked; save(kit); S.brand.apply(kit, { silent: true }); toast(wmI.checked ? '💧 Watermark on' : '💧 Watermark off'); });
    chkW.append(wmI, document.createTextNode(' Show watermark (live + in exported photos)'));
    host.appendChild(chkW);
    const wmT = document.createElement('label'); wmT.className = 'fld';
    wmT.innerHTML = 'Watermark text';
    const wmI2 = document.createElement('input'); wmI2.type = 'text'; wmI2.id = ns + 'WmText'; wmI2.value = kit.watermark.text || '';
    wmI2.placeholder = kit.name;
    wmI2.addEventListener('input', () => { kit.watermark.text = wmI2.value; save(kit); S.brand.apply(kit, { silent: true }); });
    wmT.appendChild(wmI2);
    host.appendChild(wmT);

    /* logo */
    const logoLabel = document.createElement('label'); logoLabel.className = 'fld';
    logoLabel.innerHTML = 'Logo (tap a mark, or upload your PNG)';
    host.appendChild(logoLabel);
    const logoRow = document.createElement('div');
    logoRow.className = 'seg';
    LOGO_CHARS.forEach((ch) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = ch;
      b.style.fontSize = '20px';
      b.style.flex = '1 1 38px';
      b.dataset.ch = ch;
      b.addEventListener('click', () => { kit.logo = ''; kit.logoChar = ch; save(kit); S.brand.apply(kit, { silent: true }); renderKits(); buildEditor(); });
      logoRow.appendChild(b);
    });
    const up = document.createElement('button');
    up.type = 'button'; up.textContent = '⬆ Upload'; up.className = 'gold';
    up.addEventListener('click', () => el('LogoFile') && el('LogoFile').click());
    logoRow.appendChild(up);
    if (kit.logo) {
      const clear = document.createElement('button');
      clear.type = 'button'; clear.textContent = '✕ logo';
      clear.addEventListener('click', () => { kit.logo = ''; save(kit); S.brand.apply(kit, { silent: true }); renderKits(); buildEditor(); });
      logoRow.appendChild(clear);
    }
    host.appendChild(logoRow);
    const lf = document.createElement('input');
    lf.type = 'file';
    lf.id = ns + 'LogoFile';
    lf.accept = 'image/png,image/jpeg,image/webp,image/svg+xml,image/*';
    lf.style.display = 'none';
    lf.addEventListener('change', () => {
      const f = lf.files && lf.files[0]; lf.value = '';
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        kit.logo = String(rd.result || '');
        if (kit.logo.length > MAX_LOGO_DATAURL) { toast('Logo kept for this session only (too large to save — PNG under ~180 KB persists).', true); }
        else toast('🖼️ Logo added to “' + kit.name + '”');
        save(kit); S.brand.apply(kit, { silent: true }); renderKits(); buildEditor();
      };
      rd.readAsDataURL(f);
    });
    host.appendChild(lf);

    /* intro/outro */
    const secIntro = document.createElement('details');
    secIntro.className = 'bs-cards';
    secIntro.open = true;
    const sumI = document.createElement('summary'); sumI.textContent = '🃏 Intro card';
    secIntro.appendChild(sumI);
    const inH = document.createElement('label'); inH.className = 'fld';
    inH.innerHTML = 'Headline';
    const inHI = document.createElement('input'); inHI.type = 'text'; inHI.id = ns + 'InH'; inHI.value = kit.intro.h || '';
    inHI.placeholder = kit.name;
    inHI.addEventListener('input', () => { kit.intro.h = inHI.value; save(kit); });
    inH.appendChild(inHI);
    const inS = document.createElement('label'); inS.className = 'fld';
    inS.innerHTML = 'Tagline';
    const inSI = document.createElement('input'); inSI.type = 'text'; inSI.id = ns + 'InS'; inSI.value = kit.intro.s || '';
    inSI.addEventListener('input', () => { kit.intro.s = inSI.value; save(kit); });
    inS.appendChild(inSI);
    const inPrev = document.createElement('button');
    inPrev.type = 'button'; inPrev.className = 'primary'; inPrev.id = ns + 'IntroPrev'; inPrev.textContent = '▶ Preview intro card';
    inPrev.style.width = '100%';
    inPrev.addEventListener('click', () => { S.brand.apply(selectedKit()); S.brand.showIntro(4200); });
    secIntro.append(inH, inS, inPrev);
    host.appendChild(secIntro);

    const secOut = document.createElement('details');
    secOut.className = 'bs-cards';
    secOut.open = false;
    const sumO = document.createElement('summary'); sumO.textContent = '🔚 Outro card';
    secOut.appendChild(sumO);
    const ou1 = document.createElement('label'); ou1.className = 'fld';
    ou1.innerHTML = 'Main line';
    const ouI1 = document.createElement('input'); ouI1.type = 'text'; ouI1.id = ns + 'Out1'; ouI1.value = kit.outro.l1 || '';
    ouI1.placeholder = 'Follow @yourbrand';
    ouI1.addEventListener('input', () => { kit.outro.l1 = ouI1.value; save(kit); });
    ou1.appendChild(ouI1);
    const ou2 = document.createElement('label'); ou2.className = 'fld';
    ou2.innerHTML = 'Second line (optional)';
    const ouI2 = document.createElement('input'); ouI2.type = 'text'; ouI2.id = ns + 'Out2'; ouI2.value = kit.outro.l2 || '';
    ouI2.addEventListener('input', () => { kit.outro.l2 = ouI2.value; save(kit); });
    ou2.appendChild(ouI2);
    const ouPrev = document.createElement('button');
    ouPrev.type = 'button'; ouPrev.className = 'primary'; ouPrev.id = ns + 'OutroPrev'; ouPrev.textContent = '▶ Preview outro card';
    ouPrev.style.width = '100%';
    ouPrev.addEventListener('click', () => { S.brand.apply(selectedKit()); S.brand.showOutro(4200); });
    secOut.append(ou1, ou2, ouPrev);
    host.appendChild(secOut);

    const footnote = document.createElement('div');
    footnote.className = 'hint';
    footnote.innerHTML = 'Saved to this device. The applied kit follows you across V1–V5 — photos you export carry the watermark. Videos include the kit background (Cycles exports in V3 too).';
    host.appendChild(footnote);
  }

  /* ==================== CREATOR HUB CHROME (V6) ==================== */
  function hubStats() {
    const b = (id, txt) => { const x = el(id); if (x) x.innerHTML = txt; };
    try {
      const proj = S.hub ? S.hub.projects().length : 0;
      const av = getActiveVersion();
      const nShot = (av && av.memory && Array.isArray(av.memory.shots)) ? av.memory.shots.length : 0;
      b('ProjBadge', '📁 Projects <b>' + proj + '</b>');
      b('ProdBadge', '📦 Products <b>' + (S.state.models.length || 0) + '</b>');
      b('ReelBadge', '🎞️ Reel <b>' + nShot + '</b> shot(s)');
      const u = el('Undo'), r = el('Redo');
      if (u) u.disabled = !(S.hub && S.hub.canUndo());
      if (r) r.disabled = !(S.hub && S.hub.canRedo());
    } catch (e) {}
  }
  function buildHubSection() {
    const sec = section('✨ Creator Hub — the 6 quick tools', true, ns);
    const lead = document.createElement('div');
    lead.className = 'hint';
    lead.innerHTML = 'One tap on a big card. <b>Undo/Redo</b> remember every scene edit, <b>Projects</b> save everything (products, camera, lights, brand, reel), <b>Batch Export</b> returns the full Creator Pack (Reel MP4, Story, Post, Heroes, transparent PNGs), <b>Presets</b> save looks, <b>Auto Backup</b> guards against a sudden close, and <b>Quick Workflow</b> walks you through 1·2·3·4·5.';
    sec.appendChild(lead);

    const ur = document.createElement('div');
    ur.className = 'hdur';
    const uB = document.createElement('button');
    uB.type = 'button'; uB.id = ns + 'Undo'; uB.textContent = '⟲  Undo'; uB.className = 'hub-btn primary big';
    uB.addEventListener('click', () => { if (S.hub) { S.hub.undo(); setTimeout(hubStats, 250); } else toast('Undo starts once the hub is ready.'); });
    const rB = document.createElement('button');
    rB.type = 'button'; rB.id = ns + 'Redo'; rB.textContent = '⟳  Redo'; rB.className = 'hub-btn gold big';
    rB.addEventListener('click', () => { if (S.hub) { S.hub.redo(); setTimeout(hubStats, 250); } else toast('Redo starts once the hub is ready.'); });
    ur.append(uB, rB);
    sec.appendChild(ur);
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = 'Shortcuts: Ctrl/⌘+Z undo · Ctrl/⌘+Shift+Z redo. Touch: the big buttons above or the round ⟲/⟳ floating on the right while V6 is active.';
    sec.appendChild(h);

    const tiles = document.createElement('div');
    tiles.className = 'mini-grid';
    tiles.style.marginTop = '8px';
    const T = [
      { id: 'v6Projects', ic: '📁', t: 'Project Manager', s: 'save · open · duplicate', p: 'projects' },
      { id: 'v6Presets', ic: '🗂', t: 'Preset Library', s: 'camera · lighting · scene', p: 'presets' },
      { id: 'v6Backup', ic: '💾', t: 'Auto Backup', s: 'recover any session', p: 'backup' },
      { id: 'v6UndoOpen', ic: '⟲', t: 'Undo / Redo', s: 'unlimited steps', p: 'undo' },
      { id: 'v6Export', ic: '📦', t: 'Batch Export', s: 'reel · story · post · pngs', p: 'export' },
      { id: 'v6Workflow', ic: '🪄', t: 'Quick Workflow', s: '1 2 3 4 5 · one tap', p: 'workflow' },
    ];
    T.forEach((tile) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = tile.id;
      b.className = 'hdtile';
      b.innerHTML = '<span class="hd-ic">' + tile.ic + '</span>' + escHtml(tile.t) + '<span class="hd-sub">' + escHtml(tile.s) + '</span>';
      b.addEventListener('click', () => { if (S.hubUI) S.hubUI.open(tile.p); else toast('Hub still starting — try again in a second.'); });
      tiles.appendChild(b);
    });
    sec.appendChild(tiles);

    const badges = document.createElement('div');
    badges.className = 'hd-badges';
    const mk = (id) => { const s = document.createElement('span'); s.id = ns + id; badges.appendChild(s); };
    mk('ProjBadge'); mk('ProdBadge'); mk('ReelBadge');
    sec.appendChild(badges);
    hubStats();
    return sec;
  }
  function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  /* ============================ BUILD ============================ */
  v.build = function build(_S) {
    S = _S;
    v._bs.sel = activeId() || null;
    const wrap = document.createElement('div');
    wrap.className = 'brandstudio';
    wrap.dataset.ver = ns;

    wrap.appendChild(buildHubSection());

    const head = section('🎨 Brand Studio — reusable kits', true, ns);
    const lead = document.createElement('div');
    lead.className = 'hint';
    lead.innerHTML = 'A brand kit bundles <b>logo · colors · font · watermark · intro/outro card · default background</b>. <b>One tap applies it</b> to the whole scene and to any reel — the brand follows you across V1–V5 and into your exports.';
    head.appendChild(lead);

    const grid = document.createElement('div');
    grid.id = ns + 'Kits';
    grid.className = 'bs-grid';
    head.appendChild(grid);
    const kitRow = document.createElement('div');
    kitRow.className = 'row';
    kitRow.style.marginTop = '7px';
    const kitName = document.createElement('span');
    kitName.id = ns + 'ActiveName';
    kitName.style.cssText = 'flex:1;font-size:11px;color:var(--gold);font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    kitRow.appendChild(kitName);
    const cntBadge = document.createElement('span');
    cntBadge.id = ns + 'KitCount';
    cntBadge.style.cssText = 'font-size:10px;color:var(--muted);';
    kitRow.appendChild(cntBadge);
    head.appendChild(kitRow);
    const act = document.createElement('div');
    act.className = 'mini-grid';
    const newB = document.createElement('button'); newB.type = 'button'; newB.id = ns + 'New'; newB.className = 'primary'; newB.textContent = '＋ New kit';
    const editB = document.createElement('button'); editB.type = 'button'; editB.id = ns + 'Edit'; editB.textContent = '✎ Edit';
    const dupB = document.createElement('button'); dupB.type = 'button'; dupB.id = ns + 'Dup'; dupB.textContent = '⧉ Duplicate';
    const delB = document.createElement('button'); delB.type = 'button'; delB.id = ns + 'Del'; delB.className = 'danger'; delB.textContent = '🗑 Delete';
    act.append(newB, editB, dupB, delB);
    head.appendChild(act);
    wrap.appendChild(head);

    const editorWrap = document.createElement('div');
    editorWrap.id = ns + 'Editor';
    editorWrap.className = 'bs-editor';
    wrap.appendChild(editorWrap);

    const note = section('💡 How it works', false, ns);
    const tips = document.createElement('div');
    tips.className = 'hint';
    tips.innerHTML = '<b>One tap</b> on a kit applies it now. Kit background tints the scene backdrop; the watermark floats bottom-right and is stamped into exported photos; intro/outro cards preview here and can be played over any reel (switch to V4 · Creator Studio and press ▶ Play — the brand is already on). Logo, colours, font and text are yours to change — everything auto-saves.';
    note.appendChild(tips);
    wrap.appendChild(note);

    return wrap;
  };

  v.onActivate = function onActivate() {
    /* DOM is mounted by now — (re)render tiles + editor, wire the actions, and
       make sure the persisted active kit is live on the engine */
    renderKits();
    wireActions();
    buildEditor();
    hubStats();
    const k = activeKit();
    if (k) { try { S.brand.apply(k, { silent: true }); } catch (e) {} }
  };
  v.onDeactivate = function onDeactivate() { };
  return v;
}

export default createBrandStudio();
