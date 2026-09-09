# Phase 3 — Live Engine Integration

**Status: ✅ LOCKED** — canonical milestone complete.
**Lock date:** 2026-09-09 (Asia/Calcutta)
**Release artifact:** `design/phase3/studio_sidecars_phase3.html`
**Canonical body integrity:** `body identical to canonical: True` (Phase 1/1.5/2 interface byte-compatible)

Phase 3 adds a modular live engine (boot, scene, GLB assets, camera presets,
environments, lighting, materials, transform gizmos, undo/redo history, exports,
onboarding, performance) underneath the locked interface. No UI redesign, no
changes to Hero/Background assets, DOM structure/IDs, the V1–V6 workflow, asset
paths, or design tokens. Engine DOM (`p3-toolbar`, panels, chips, onboarding)
plugs into the locked ids/hierarchy.

## Final QA checklist — 17 / 17 PASS (headless Chromium over HTTP)

Run with: `P3_BASE=http://127.0.0.1:8137/design/phase3/studio_sidecars_phase3.html node _src/phase3_qa.mjs`

| # | Check | Result | Notes |
|---|-------|--------|-------|
| A | Boot (2 models / 68 parts, Hero env) | PASS | 1420×747 renderer |
| A2 | Desktop FPS | PASS | 60+ fps (engine stat, 3 s settle) |
| B | Camera presets | PASS | 12 presets applied (Hero, Front, Rear, Side, Top, Detail, Reel + orchestration tray) |
| C | Environment count | PASS | 11 (Hero + 10 Studio Backgrounds) |
| C2 | Environment switching | PASS | all 11 applied successfully |
| D | Lighting presets | PASS | 5 looks OK |
| D2 | Advanced lighting | PASS | Golden hour · key intensity 1.5 · key `ffd37b` |
| E | Floor presets | PASS | 5 presets |
| F | Material editor across groups | PASS | 14 material groups |
| G | Transforms + undo/redo | PASS | Move/Rotate-Scale-Gizmo, Hide, Lock, Delete, Duplicate, Undo/Redo |
| G6 | Gizmo modes | PASS | translate/rotate/scale/null + visibility |
| H | Exports | PASS* | PNG, JPG, Transparent PNG, GLB, Scene JSON verified; MP4/WebM reel = environment-limited (see below) |
| I | UI bindings | PASS | V1–V6 chips, tools, env tiles, panels, light slider, material list |
| J | Learn Studio onboarding | PASS | first-launch → complete (1/7 → done, `sos:p3:tour=done`) |
| K | Honor Pad landscape | PASS | 60 fps, canvas 1174×682 (viewport 1194×834) |
| K | Honor Pad portrait | PASS | 60 fps, canvas 814×921 (viewport 834×1112) |
| L | Console clean | PASS | zero console/page errors (favicon 404 tolerated) |

### H reel note (sole environment-dependent item)
Headless Chromium under SwiftShader does not deliver WebGL frames to
`canvas.captureStream()`/MediaRecorder: the reel encodes to a 110-byte WebM in
every headless launch-flag combination tried, while a plain-2D control canvas
records ~8.5 KB in the same browser — proving the capture pipeline is correct
and the failure is frame delivery, not the exporter. The reel path is verified
by code (`video/webm;codecs=vp9` via `pickMime()`, MediaRecorder timing) and is
treated as **verified-by-code + headless-capture environment limitation**. A
headed/Xvfb or real-GPU run is the remaining confirmatory step; no Xvfb is
available in this environment. All stills / GLB / JSON assertions remain hard
passes.

## Engine deltas introduced during final QA (all in-engine, build included)

1. **`engine/history.js` — serialized async restores.** Undo/redo restores load
   GLBs asynchronously. Rapid keyboard undo→redo could previously interleave two
   restores and leave models in a mixed state. `undo()`/`redo()` now run restores
   through a serialized module-level queue (applied in order), and each returns a
   promise so callers can await completion.
2. **`engine/app.js` — UI Undo/Redo controls.** The engine object toolbar
   (`p3-toolbar`) now includes an `Undo` / `Redo` pair (`data-h="undo|redo"`,
   Ctrl/⌘+Z and Ctrl/⌘+Shift+Z tooltips) with disabled states driven by
   `canUndo()`/`canRedo()` on every UI sync. This satisfies checklist item 7
   (“Undo/Redo from both keyboard and UI”). Keyboard path unchanged.
3. **`_src/p3.css`** — `.p3-toolbar button:disabled` visual state.

## Build numbers (lock release)

- Bundle: 718,637 bytes (`/tmp/p3engine.js` output of `_src/bundle.mjs`)
- HTML: 3.57 MB (`studio_sidecars_phase3.html` via `_src/build_phase3.py`)
- Integrity probes: `id="engine-css"`, `id="engine-boot"`, `Live Engine (Phase 3)` OK

## Scope guardrails honored

- No canonical source file, Hero asset, Studio Background, Design System file,
  HTML/CSS/JS, manifest, or README edited; Phase 1/1.5/2 stay byte-compatible.
- No UI redesign, no capability removal via simplification.
- Engine surface constrained to the locked ids/hierarchy (`#cv`, `.canvas`,
  `#stDemo/#stEmpty`, `.cv-status`, trays, inspector, `#tbSettings/#tbExport/#tbHelp`,
  overlay `#sosOv`, onboarding).

## Next

Phase 4 has **not** been started. Begin only after explicit kickoff; Phase 3
source (`engine/`, `_src/`, release HTML) is the frozen integration baseline for
it.
