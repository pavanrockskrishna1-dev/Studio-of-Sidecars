# WATCHERS_AUDIT_REACT_v1

## Watchers Protocol

This document is the canonical truth for the React Studio.

Rules:
- Do not promote Partial or Not Implemented features to Verified without code evidence.
- Do not rely on UI labels, README, comments, or previous chat history.
- Every new Verified feature must include the file(s) and function/component implementing it.

Read order for any Arena agent, before touching code:
1. `WATCHERS_AUDIT_REACT_v1.md` — what is actually implemented
2. `PROJECT_STATE.json` — current project/version state
3. `HANDOFF.md` — remaining work and blockers

Only after that does the agent inspect the code relevant to its task.

---

**Subject:** Studio-of-Sidecars — live React app (`app/src`)
**Method:** Direct source inspection (repo zip). No claims taken from labels, UI text, comments, README, or design notes without cross-checking actual code/data.
**Confidence:** High — every line item below is tied to a specific file and, where relevant, a function name or line reference.

---

## VERIFIED

| Feature | Evidence |
|---|---|
| Camera preset system | `camera/presets.js` — 6 real presets (Front/Side/3-4/Rear/Top/Low Hero); `computeCameraShot()` does real trig-based framing against the model's bounding box |
| Lighting rig | `lighting/profiles.js` (per-environment key/fill/rim/ambient/shadow/exposure) wired to real `<input>` sliders bound to live state in `components/StudioControls.jsx` (~line 304–330) |
| Material presets | `materials/presets.js` — exactly 22 presets across 6 categories (paint/metal/wood/leather/glass/composite), counted directly from `id:` entries |
| Material undo | `materials/store.js` — real per-material history stack (`pushHistory`, `undo()`, `canUndo()`), wired to a working `onClick` in `ui/MaterialsManager.jsx` (line ~265–270). **Scope note:** this undo covers material parameter changes only. It does **not** cover scene objects, transforms, booleans, or any project-wide action — there is no global undo system. |
| GLB import validation | `assets/importValidation.js` — real GLB magic-byte check, size ceiling, glTF JSON structure validation |
| PNG export pipeline | `capture/exportOptions.js` (IG Square/Portrait, Story/Reel, Web Hero, Thumbnail, 1x/2x/4x, transparent bg) traced through to a real `gl.domElement.toBlob()` call in `components/StudioCanvas.jsx` (line ~158) → downloadable file |
| IndexedDB asset storage | `assets/idb.js` — real `indexedDB.open`/put/get/delete |
| localStorage persistence | `materials/store.js` — real favorites persistence |
| Product/environment registries | `products/registry.js`, `environments/registry.js` — real, data-driven; camera/floor/lighting derive from the loaded model automatically |

## PARTIAL

| Feature | What works | What's missing |
|---|---|---|
| Environment registry | 11 environments are registered and have real image files in `app/public/environments/` | Not the 23 claimed from Mission 12A — confirms that push never actually landed |
| Multi-select | Real Ctrl+click tracking (a `Set` of selected object IDs) | No general multi-object transform — the gizmo attaches to one object at a time; the Set only feeds the Boolean tool |

## NOT IMPLEMENTED

| Feature | Evidence |
|---|---|
| Inspector Rail — Lighting/Materials/Render sections | Structurally dead, not just unstyled: `Chips` renders plain `<span>` tags with no `onClick`; its "slider" (`VisualField`) is deliberately a `<div>` instead of an `<input>` so it can never fire a change event. Confirmed in the component code itself (`ui/InspectorRail.jsx`), not inferred from comments. |
| Video export / Camera Director | No export-to-video code anywhere in `src/` |
| BBQ Bike | No `bbq-bike` entry in `products/registry.js` — confirmed by cross-checking the registry, not by trusting `bbqPack.js`'s own comment |
| Cessna 172 asset | GLB file exists but is machine-generated placeholder geometry (`gen-c172-placeholder.mjs`), not a real aircraft model |
| Scene-level undo/redo | No history/snapshot system outside the material store |
| Project save/load (whole scene) | No evidence found in `src/` |

---

## PRIORITY — Mission 13 Backlog

### Phase A — Make existing UI real
1. Connect Inspector Rail lighting controls to the real lighting store
2. Connect Inspector Rail material chips to the real material presets
3. Connect Inspector Rail render/output settings to the real export pipeline

### Phase B — Missing core features
1. Video export (Instagram Reels/Stories)
2. General multi-object transform
3. Undo/redo for scene operations (separate from the existing material-only undo)
4. Project save/load (whole scene JSON)

### Phase C — Asset completion
1. Real Cessna 172 asset (replace placeholder geometry)
2. BBQ Bike registry entry + engine wiring
3. Expand environment library from 11 to the intended target set

---

## Standing note

The HTML prototype (`elite_studio_v34_FINAL_7TABS_VERIFIED.html`) and this React app are divergent codebases with different feature sets — some things the prototype claims are missing here, and vice versa. Treat them as two separate products until a deliberate parity pass reconciles them. Do not assume a feature verified in one exists in the other.
