/* =========================================================================
 *  Studio Version Registry + Version Manager core
 *  -------------------------------------------------------------------------
 *  A Studio Version is a plain object produced by a registered TEMPLATE
 *  factory:
 *    { id, ns, short, label, icon, tagline, tpl, userCreated,
 *      defaultFormat, defaultLighting, defaultGuide, heroPreset, frameOpts,
 *      cameraPresets:[{key,label}], moves:[{key,label}],
 *      lightingOptions:[{label,options:[{value,label}]}],
 *      memory:{format?, lighting?, guide?, ...},      <- stored per-version prefs
 *      build(S) -> nodes for #verSections,  onActivate(S) }
 *
 *  - Built-ins (V1 Classic, V2 Commercial, V3 Blender, V4 Creator, V5 Asset
 *    Library) are created once at boot from their templates and can never be
 *    removed.
 *  - The Version Manager "duplicates the current version": it re-runs the same
 *    template with a fresh id/ns + a copy of the source version's memory, so
 *    V6, V7, V8… appear WITHOUT touching any built-in file.
 *  - User-made versions are persisted to localStorage and re-hydrated on the
 *    next launch through their template.
 * ========================================================================= */

const registered = [];
const templates = {};
let activeVersion = null;
let listeners = [];
let tbHost = null;
let engineRef = null;
let persistTimer = null;

const LS_KEY = 'glbStudio.multiVer.v1';

/* ------------------------------------------------------------------ event */
export function onVersionChange(fn) { listeners.push(fn); }
export function emitChange() { listeners.forEach((fn) => { try { fn(); } catch (e) { console.warn(e); } }); }

/* ------------------------------------------------------------- templates */
export function registerTemplate(name, factory) { templates[name] = factory; }
export function hasTemplate(name) { return !!templates[name]; }

/* ------------------------------------------------------------ registration */
export function registerVersion(v) {
  if (!v.id || registered.some((x) => x.id === v.id)) return v;
  registered.push(v);
  return v;
}
export function listVersions() { return registered.slice(); }
export function getActiveVersion() { return activeVersion; }
export function setActiveVersion(v) { activeVersion = v; }
export function getByTemplate(tpl) { return registered.filter((x) => x.tpl === tpl); }

/* -------------------------------------------------------- next free index
 *  Used for ids 'vm6', 'vm7'… and labels 'V6', 'V7'… (V1–V5 are the built-ins;
 *  numbering simply never reuses a live id). */
function nextVMNumber() {
  const taken = new Set(registered.map((x) => x.id));
  let n = registered.length + 1;               // ≥3 while both built-ins exist
  while (taken.has('vm' + n)) n++;
  return n;
}

/* ----------------------------------------------------------------- lookup */
export function findVersion(id) { return registered.find((x) => x.id === id) || null; }

/* ========================================================================
 *  activateById — switch WITHOUT reloading and WITHOUT touching the product
 *  manager (loaded GLBs, part edits & materials persist). Only the version
 *  panels in #verSections are re-mounted. Stored per-version settings from
 *  v.memory (format / guide / lighting) are reapplied.
 * ======================================================================== */
/** Rebuild the CURRENT version's panels in place (used after scene restores
 *  so data-driven panels like the Creator reel or Asset/In-scene lists refresh
 *  without switching versions). */
export function remountActive(S) {
  const v = activeVersion;
  const host = document.getElementById('verSections');
  if (!v || !host) return;
  host.innerHTML = '';
  let frag;
  try { frag = v.build ? v.build(S) : null; } catch (e) { console.error('version remount error', v.id, e); }
  if (frag) {
    const nodes = frag.nodeType === 11 ? Array.from(frag.childNodes) : [frag];
    nodes.forEach((n) => { if (n && n.nodeType === 1) host.appendChild(n); });
  }
  if (v.onActivate) { try { v.onActivate(S); } catch (e) { console.warn(e); } }
  if (S.refreshAllUI) S.refreshAllUI();
}

export function activateById(id, S) {
  const v = registered.find((x) => x.id === id);
  if (!v || activeVersion === v) { refreshToolbar(S); return false; }
  // graceful shutdown of the outgoing version + live motion
  if (activeVersion && activeVersion.onDeactivate) { try { activeVersion.onDeactivate(); } catch (e) { console.warn(e); } }
  if (S.stopCamControl) S.stopCamControl();
  if (S.toggleRecord && S.recState) { try { S.toggleRecord(); } catch (e) {} }
  if (S.syncRec) S.syncRec(false);
  activeVersion = v;
  S.versionState.activeId = v.id;
  S.state.activeVersion = v.id;

  // rebuild only the version-specific panels; shared sections stay put
  const host = document.getElementById('verSections');
  if (host) host.innerHTML = '';
  let frag;
  try { frag = v.build ? v.build(S) : null; } catch (e) { console.error('version build error', v.id, e); }
  if (frag && host) {
    const nodes = frag.nodeType === 11 ? Array.from(frag.childNodes) : [frag];
    nodes.forEach((n) => { if (n && n.nodeType === 1) host.appendChild(n); });
  }

  // apply THIS version's stored export / guide / lighting settings
  const fmt = v.memory.format || v.defaultFormat || '16:9';
  try { S.setFormat(fmt); } catch (e) { console.warn(e); }
  const guide = (v.memory.guide !== undefined) ? !!v.memory.guide : !!v.defaultGuide;
  try { S.updateGuide(guide); } catch (e) { console.warn(e); }
  const lightKey = v.memory.lighting || v.defaultLighting || 'studio';
  try { S.setLightingPreset(lightKey, true); } catch (e) {}
  if (v.onActivate) { try { v.onActivate(S); } catch (e) { console.warn(e); } }

  if (S.refreshAllUI) S.refreshAllUI();
  S.updateGuide();
  refreshToolbar(S);
  emitChange();
  persistSoon();

  // present the product with this version's signature framing (after mount)
  requestAnimationFrame(() => {
    const pres = v.heroPreset || '45';
    try { if (S.frame && (S.bounds().radius > 0.001)) S.frame(pres, v.frameOpts || {}); } catch (e) {}
  });
  return true;
}

/* ========================================================================
 *  DUPLICATE — "create a new version by duplicating the current version"
 *  Re-runs the source version's registered template with a fresh identity
 *  and a deep copy of the source's stored settings, then switches to it.
 * ======================================================================== */
export function duplicateActive(S, opts = {}) {
  return duplicateVersion(activeVersion ? activeVersion.id : (registered.length ? registered[registered.length - 1].id : null), S, opts);
}

export function duplicateVersion(id, S, opts = {}) {
  const src = findVersion(id);
  if (!src) { console.warn('No version to duplicate'); return null; }
  const factory = templates[src.tpl];
  if (!factory) {
    const msg = 'Cannot duplicate "' + src.label + '": its template is not registered for duplication.';
    console.warn(msg); try { S.toast && S.toast(msg, true); } catch (e) {}
    return null;
  }
  const n = nextVMNumber();
  // friendly default label, unique among installed versions
  let label = (opts.label && opts.label.trim()) || (src.label + ' Copy');
  if (!(opts.label && opts.label.trim())) {
    let k = 1;
    while (registered.some((x) => x.label === label)) label = src.label + ' Copy ' + (++k);
  }
  const memory = JSON.parse(JSON.stringify(src.memory || {}));
  const v = factory({
    id: 'vm' + n,
    ns: 'vm' + n,
    short: opts.short || 'V' + n,
    label,
    icon: opts.icon || src.icon,
    tagline: opts.tagline || src.tagline,
    userCreated: true,
    memory,
  });
  registerVersion(v);
  refreshToolbar(S);
  activateById(v.id, S);
  try { if (S.toast) S.toast('⧉ New version created: ' + v.short + ' · ' + v.label + ' (from ' + src.short + ')'); } catch (e) {}
  persistSoon();
  return v;
}

/* ------------------------------------------------- remove (user versions) */
export function removeVersion(id, S) {
  const i = registered.findIndex((x) => x.id === id);
  if (i === -1) return false;
  const v = registered[i];
  if (!v.userCreated) { console.warn('Cannot remove built-in version ' + id); return false; }
  if (activeVersion === v) { console.warn('Cannot remove the active version — switch first.'); return false; }
  registered.splice(i, 1);
  if (tbHost) refreshToolbar(S);
  emitChange();
  persistSoon();
  try { if (S.toast) S.toast('🗑️ Removed version ' + v.short + ' · ' + v.label); } catch (e) {}
  return true;
}

/* ----------------------------------------------------------------- rename */
export function renameVersion(id, meta = {}) {
  const v = findVersion(id);
  if (!v) return false;
  const label = (meta.label !== undefined) ? String(meta.label).trim() : null;
  if (label && label.length) v.label = label;
  if (meta.short && String(meta.short).trim()) v.short = String(meta.short).trim().toUpperCase();
  if (meta.icon) v.icon = meta.icon;
  if (meta.tagline) v.tagline = meta.tagline;
  if (tbHost) refreshToolbar(engineRef);
  emitChange();
  persistSoon();
  return true;
}

/* ========================================================================
 *  PERSISTENCE — user-created versions survive a page reload. Their template
 *  + identity + stored settings are all we need to re-instantiate.
 * ======================================================================== */
function lsGet() { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { return null; } }
function lsSet(obj) { try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch (e) {} }

export function persistSoon() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, 250);
}
export function persistNow() {
  const user = registered.filter((x) => x.userCreated).map((v) => ({
    id: v.id, ns: v.ns, short: v.short, label: v.label, icon: v.icon, tagline: v.tagline,
    tpl: v.tpl, userCreated: true, memory: v.memory,
  }));
  lsSet({ active: activeVersion ? activeVersion.id : null, versions: user });
}
/** Re-create persisted user versions at boot. Returns the stored active id (or null). */
export function hydratePersisted() {
  const data = lsGet();
  if (!data || !Array.isArray(data.versions)) return null;
  data.versions.forEach((rec) => {
    const factory = templates[rec.tpl];
    if (!factory) { console.warn('Skipping persisted version, template "' + rec.tpl + '" not registered'); return; }
    if (registered.some((x) => x.id === rec.id)) return;
    registerVersion(factory(rec));
  });
  const activeId = data.active || null;
  return (activeId && registered.some((x) => x.id === activeId)) ? activeId : null;
}

/* ========================================================================
 *  Top toolbar — chips for every installed version + "＋ V{next}…" which
 *  creates the next version by duplicating the CURRENT one.
 * ======================================================================== */
export function buildToolbar(host, S) {
  tbHost = host; engineRef = S;
  refreshToolbar(S);
}

function refreshToolbar(S) {
  if (!tbHost) return;
  const host = tbHost;
  host.innerHTML = '';
  registered.forEach((v) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vchip' + (activeVersion === v ? ' on' : '');
    b.dataset.vid = v.id;
    b.title = (v.userCreated ? 'Created in Version Manager · ' : '') + v.tagline;
    b.innerHTML = '<span class="vi">' + v.icon + '</span> <b>' + v.short + '</b> · ' + v.label;
    b.addEventListener('click', () => activateById(v.id, S));
    host.appendChild(b);
  });
  const n = nextVMNumber();
  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'vchip plus';
  plus.textContent = '＋ V' + n + '…';
  plus.title = 'Create V' + n + ' by duplicating the current version (' + (activeVersion ? activeVersion.label : '') + ') — products stay loaded.';
  plus.addEventListener('click', () => duplicateActive(S));
  host.appendChild(plus);

  const tag = document.getElementById('verTagline');
  if (tag && activeVersion) {
    tag.textContent = activeVersion.short + ' · ' + activeVersion.label + ' — ' + activeVersion.tagline;
  }
}

/* ===================================================================== API */
export function versionsAPI() {
  return {
    register: registerVersion,
    templates: () => Object.keys(templates),
    list: listVersions,
    active: () => (activeVersion ? activeVersion.id : null),
    activate: activateById,
  };
}
