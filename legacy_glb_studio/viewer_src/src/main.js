import { createStudio } from './core/studio.js';
import { createClassic } from './versions/version-classic.js';
import { createCommercial } from './versions/version-commercial.js';
import { createBlender } from './versions/version-blender.js';
import { createCreator } from './versions/version-creator.js';
import { createAssetLib } from './versions/version-assets.js';
import { createBrandStudio } from './versions/version-brand.js';
import {
  registerTemplate, registerVersion, buildToolbar, activateById,
  listVersions, getActiveVersion, emitChange, onVersionChange,
  hydratePersisted, persistSoon, removeVersion, renameVersion, duplicateVersion, remountActive,
} from './versions/registry.js';
import { mountManager } from './versions/manager.js';
import { activeKit as persistedBrandKit } from './core/brand.js';
import { createHub } from './core/hub.js';
import { createExporter } from './core/hub_exports.js';
import { bindHubUI } from './core/hub_ui.js';
import { initShell } from './core/shell.js';
import './styles_shell.css';

/* =========================================================================
 *  Boot — one shared engine, then pluggable Studio Versions.
 *  Built-ins V1–V6 are created from their TEMPLATES; the Version Manager can
 *  mint V7/V8/… at runtime by duplicating any version — no source change to
 *  the built-ins ever needed. Loaded GLB products live in the engine and
 *  survive every version switch.
 * ========================================================================= */

const S = createStudio();

/* --- version-aware setting recorders ---------------------------------------
 *  Wrapping the engine setters means whichever version is ACTIVE stores the
 *  change in its own memory (format / guide / lighting) and asks the registry
 *  to persist — so each version truly keeps its own export + look settings.
 * -------------------------------------------------------------------------- */
{
  const baseSetFormat = S.setFormat.bind(S);
  S.setFormat = (k) => {
    baseSetFormat(k);
    const v = getActiveVersion(); if (v) v.memory.format = k;
    persistSoon();
  };
  const baseGuide = S.updateGuide.bind(S);
  S.updateGuide = (vis) => {
    baseGuide(vis);
    if (vis !== undefined) { const v = getActiveVersion(); if (v) v.memory.guide = !!vis; }
    persistSoon();
  };
  const baseLight = S.setLightingPreset.bind(S);
  S.setLightingPreset = (key, silent) => {
    baseLight(key, silent);
    const v = getActiveVersion(); if (v) v.memory.lighting = key;
    persistSoon();
  };
}

/* expose the hook the engine calls after a product loads (active version
   re-frames its hero shot without any reload) */
S._afterLoad = () => {
  const v = getActiveVersion();
  if (v && S.frame) {
    try { S.frame(v.heroPreset || '45', v.frameOpts || {}); } catch (e) {}
  }
};

/* ---- register templates, then the built-in versions -------------------- */
registerTemplate('classic', createClassic);
registerTemplate('commercial', createCommercial);
registerTemplate('blender', createBlender);
registerTemplate('creator', createCreator);
registerTemplate('assetlib', createAssetLib);
registerTemplate('brandstudio', createBrandStudio);
const V1 = createClassic();        // Classic Studio        (id 'classic',      ns 'v1')
const V2 = createCommercial();     // Instagram Commercial (id 'commercial',   ns 'v2')
const V3 = createBlender();        // Blender Python       (id 'blender',      ns 'bl')
const V4 = createCreator();        // Creator Studio       (id 'creator',      ns 'v4')
const V5 = createAssetLib();       // Asset Library        (id 'assetlib',     ns 'v5')
const V6 = createBrandStudio();    // Brand Studio         (id 'brandstudio',  ns 'v6')
registerVersion(V1);
registerVersion(V2);
registerVersion(V3);
registerVersion(V4);
registerVersion(V5);
registerVersion(V6);

/* re-instantiate user-created versions (V7+) that were persisted last session */
const storedActive = hydratePersisted();

/* shared global chrome (products / parts / animations / capture / drag-drop) */
S.bindGlobalUI();
S.buildGuide();
S.updateGuide(false);

/* version toolbar + Version Manager panel */
buildToolbar(document.getElementById('topbar'), S);
mountManager(document.getElementById('vmHost'), S);

/* boot into the stored active version (default: V2 commercial) */
const bootId = (storedActive && listVersions().some((x) => x.id === storedActive)) ? storedActive : V2.id;
activateById(bootId, S);

/* start with the BBQ demo product (shared, lives across versions) */
S.loadDemo('Demo BBQ Bike');

/* Brand Studio: re-assert the persisted brand after ANY version switch, and
   re-apply a saved kit on boot so branding survives a reload. */
onVersionChange(() => { try { S.brand && S.brand.refresh(); } catch (e) {} });
const savedBrand = persistedBrandKit();
if (savedBrand) { try { S.brand.apply(savedBrand, { silent: true }); } catch (e) {} }

/* ---- CREATOR HUB (V6) : undo/redo, projects, presets, auto-backup,
   batch export, quick workflow. Engine edit notifications flow into the
   hub's history recorder; auto-backup runs every few minutes. ---------- */
const hub = createHub(S, { autosaveMs: 180000 });
S.hub = hub;
S.onEdit(() => hub.onEditNotify());
const exporter = createExporter(S);
S.exporter = exporter;
bindHubUI(S, hub, exporter);

/* ---- STUDIO OF SIDECARS premium shell (additive chrome over V1–V6) ---- */
const shell = initShell(S, hub, {});
/* initShell may boot synchronously (returning the live api) or defer to a
   DOM-ready poll (returning null and self-assigning window.__shell later).
   Only publish when it returned a live api so we never clobber it with null. */
if (shell) {
  S.shell = shell;
  window.__shell = shell;
  window.__studio = window.__studio || {};
  window.__studio.shell = shell;
}
hub.startAuto();
hub.onChange(() => { try { S.hubUI && S.hubUI.refreshProjects(); } catch (e) {} });
/* let the boot demo finish parsing, then re-base history so undo never
   tries to go back to an empty scene */
(function waitBootBaseline() {
  if (S.state.models.length > 0) { setTimeout(() => { try { hub.resetHistory(); } catch (e) {} }, 300); return; }
  if (window.__baselineTries === undefined) window.__baselineTries = 0;
  if (++window.__baselineTries > 60) return;
  setTimeout(waitBootBaseline, 120);
})();
/* keep the latest recovery copy fresh right before the page goes away */
let hiding = false;
document.addEventListener('visibilitychange', () => { if (document.hidden && !hiding) { hiding = true; hub.autosaveNow().finally(() => { hiding = false; }); } });
window.addEventListener('pagehide', () => { try { hub.autosaveNow(); } catch (e) {} });
/* if V6 was the boot version it was built before the hub existed — remount it */
try { if (getActiveVersion() && getActiveVersion().tpl === 'brandstudio') remountActive(S); } catch (e) { console.warn(e); }

S.startLoop();

/* console / automation API */
window.__viewer = S;
window.__studio = {
  engine: S,
  shell: shell,
  versions: listVersions,
  active: () => (getActiveVersion() ? getActiveVersion().id : null),
  getActive: () => getActiveVersion(),
  activate: (id) => activateById(id, S),
  duplicate: (id) => duplicateVersion(id || (getActiveVersion() ? getActiveVersion().id : null), S),
  rename: (id, meta) => renameVersion(id, meta),
  remove: (id) => removeVersion(id, S),
  onVersionChange: emitChange,
};
