# ☕🔥 Premium GLB Commercial Studio — Handoff

## Start here (updated through Phase 15C and Phase 16A Slice A, HEAD `a8a5ac9`; Slice A is uncommitted)

- **What the app is:** the canonical app is the React 19 / Vite / three.js
  (r186, `@react-three/fiber` + drei) creator studio in `app/src`. Everything
  after the "React Studio (`app/src`)" heading below, and every new section at
  the end of this file, is about it.
- **Run it:** `cd app`, `npm run dev`, open `http://localhost:5173`.
- **Legacy, not connected:** `deliverables/Premium_GLB_Commercial_Studio.html`
  and `legacy_glb_studio/` are old single-file builds. `PROJECT_STATE.json`
  describes that legacy build (V1–V6, Creator Hub, 223/223 checks), not the
  React app. Do not edit them. The first ~90 lines of this file
  (from "Deliverable" to "Known notes for the next maintainer") also describe
  the legacy build only.
- **Where to look below:**
  1. Architecture (engine / shell / bridges / session / materials store)
  2. Phase 15A
  3. Phase 15B (HDR lighting)
  4. Current Studio Status table
  5. Open Issues (Next Phase)
  6. Known Limitations
  7. Project rules
  8. Git Checkpoints changelog
  - Older React notes: Mission 13C and Watchers Bootstrap (kept as written).

---

**Deliverable:** `deliverables/Premium_GLB_Commercial_Studio.html` — one single-file,
fully offline HTML studio (everything inlined: engine, demos, V1–V6, Blender
pipeline, brand studio and the new **Creator Hub**). Zip mirror:
`/home/user/Premium_GLB_Commercial_Studio.zip`.

**Open it** in Chrome / Edge / Firefox / Safari. No server, no internet, no install.

---

## What ships

**Six built-in versions** (plus user duplicates via the top “＋ V7…” chip — the
Version Manager persists those to localStorage):

- **V1 · Classic** — clean real-time showcase.
- **V2 · Instagram Commercial** — cinematic real-time + Reels (boot version).
- **V3 · Blender Python** — one-click offline Cycles render pack (PNG/MP4).
- **V4 · Creator Studio** — one-tap shot builder + playable reel.
- **V5 · Asset Library** — tap-to-place embedded assets + search + favorites.
- **V6 · Brand Studio** — brand kits **+ the Creator Hub** (newest addition).

All versions share **one live GLB scene** — switching never reloads the page and
never loses products/edits/styling.

## ✨ Creator Hub (inside V6 only — no V7/V8/V9)

Six one-tap tools at the top of the V6 panel:

1. **📁 Project Manager** — one-tap Save of the *whole* project (products incl.
   .glb, part edits, lighting + backdrop, camera, brand kit, reel) with an
   automatic thumbnail; Rename / Duplicate / Delete / Open cards; offline
   project-file export/import.
2. **⟲ Undo / ⟳ Redo** — unlimited history over engine edit notifications
   (products, parts, colours, materials, lighting, brand, reel). Big touch
   buttons + round floating ⟲/⟳ cluster; desktop Ctrl/⌘+Z and Ctrl/⌘+Shift+Z
   (Ctrl+Y) work while a V6-family version is active.
3. **🗂 Preset Library** — camera / lighting / scene presets: save, apply, delete.
4. **💾 Auto Backup** — snapshot every ~3 minutes; on reopen, a
   “♻️ Recover your last session?” card offers the latest snapshot.
5. **📦 Batch Export** — one zip “Creator Pack”: Reel 1080×1920 MP4 (Blender
   script), Story PNG + MP4, Post 1080×1080 PNG, Hero PNGs (Front/Side/Rear/
   Top/45° at 1080×1350), Transparent PNG cut-out pack, plus `scene.glb`,
   README and one-click launchers. MP4 is rendered offline in Blender with the
   exact same pipeline as V3 (always compatible).
6. **🪄 Quick Workflow** — Choose Project → Add Assets → Choose Scene → Build
   Reel → Export, as five big touch cards. No timelines, no keyframes.

Everything is offline and auto-saved to the device.

## How it is built (source)

- `viewer_src/` — Vite + three.js source. Build once with `npm run build`
  (`vite` + `vite-plugin-singlefile`), output `viewer_src/dist/index.html`.
- Hub modules (new): `src/core/hub.js` (undo/redo/projects/presets/backup),
  `src/core/hub_ui.js` (overlays + workflow), `src/core/hub_exports.js`
  (batch pack), additions in `src/core/studio.js` (scene snapshot/restore,
  renderBlob, history hooks), `src/core/blender_render.js` (now exports
  `renderPython`, `snapshotGroup`, `exportGLB`, `bytesToB64`), wiring in
  `src/main.js`, V6 UI in `src/versions/version-brand.js`, CSS in `index.html`.
- Storage keys (localStorage): `glbHub.projects.meta.v1`, `glbHub.project.<id>`,
  `glbHub.autobackup.v1`, `glbHub.presets.v1`, plus existing brand keys
  `glbStudio.brand.kits.v1` / `.active.v1`.

## Test state (full regression, final build)

223/223 checks pass, **zero console/page errors**:

- multiver 25 · vermanager 40 · blender 25 · creator 32 · asset 28 · brand 25 ·
  **hub 48** (new: `hub_test.mjs`).

Regression runs against the built `dist/index.html`; the deliverable HTML is an
identical copy (single-file). Prior V1–V5 and V6 Brand Studio behavior is
unchanged and re-verified.

## Known notes for the next maintainer

- Undo snapshots intentionally ignore the live orbit camera (passive reframes
  caused noisy “duplicate” steps); camera framing is still saved in projects
  and restored on open. History is re-based right after the boot demo loads so
  undo never reaches an empty scene.
- Brand-kit *content* edits (colours/text) auto-save but are not themselves
  undo steps; applying/removing kits is undoable.
- Auto-backup writes the newest snapshot every ~3 min and on page hide; the
  recovery banner shows on next open while the scene is at its default state.
  “Clear recovery copy” dismisses it permanently for that session state.
- MP4 deliverables are intentionally Blender-Python scripts (the browser cannot
  encode H.264 offline); PNG stills are rendered live in-browser.

---

## React Studio (`app/src`) — Mission 13C (2026-09-16)

The Inspector Rail's five Lighting mood chips (Softbox Key, Café Window,
Golden Hour, Night Neon, Backlit Rim) are now real one-click presets:

- **Preset data:** `app/src/lighting/moodPresets.js` — five frozen presets over
  the rig's six values (key/fill/rim/ambient/shadow/exposure), calibrated to
  the proven ranges in `lighting/profiles.js` and the `LIGHTING_CONTROLS`
  slider step grid. No JSX, no duplicated chip labels (join is a label→id
  slug against `INSPECTOR_PLACEHOLDERS.lighting` in `ui/content.js`).
- **Wiring:** `app/src/ui/InspectorRail.jsx` — the Lighting chips are
  `<button>`s; a click drives the engine's own six `data-testid="light-*"`
  slider inputs (native value setter + dispatched input event), so the
  EXISTING `onLightingChange` → `setLighting` pipeline runs — no second
  lighting state, no new panel. Active-chip highlight (`data-on`, the shell's
  existing gold pattern) tracks the rig's live values and clears on any manual
  slider move.
- **Not touched:** `StudioControls.jsx`, `App.jsx`, `StudioCanvas.jsx`,
  `ui/content.js`, `lighting/profiles.js`, `assets/runtimeRegistry.js`.
  Materials/Render chips remain inert shells (their missions are separate).
  **Superseded:** the Materials chips are wired to the materials store and the
  Render chips to the engine's Format select / PNG capture (commits `9f38328`,
  `701bc83`; see "Phase 15A" below). Only the header chips (RAIL_CHIPS) and the
  Camera Distance/Height/Lock focus controls are still decorative.
- **Persistence:** none added — lighting stays session-only React state, as
  before (Mission 13C Phase C was not taken on).
  **Superseded:** Phase 15A added an explicit Save / Restore that stores the
  lighting values in localStorage (`sos-studio-session-v1`). Nothing is saved
  automatically; without a Save, lighting is still session-only.
- **Verification:** 34/34 Playwright checks in a real browser (before/after
  values for all five presets, readout/state proof, highlight on/off,
  environment-switch cross-check, absent-panel no-op, input count stays 6,
  materials/camera chips unchanged); production build green; lint clean on the
  touched files (pre-existing lint errors in `StudioCanvas.jsx` untouched).
- **Observation (pre-existing, not fixed — out of scope):** at hydration,
  `assets/runtimeRegistry.js` nudges the `light-key` slider, and React's
  value-tracker ignores the "back" dispatch, so Key permanently sits one notch
  below the environment profile (2.7 → 2.6 on boot). Baselines in any future
  lighting work must be read from the live DOM, not assumed from profiles.

---

## Watchers Bootstrap — three local fixes (2026-09-16)

- **Fix 1 (hydration Key-light bug, `assets/runtimeRegistry.js`):** root cause
  confirmed against a real Chromium instance (Playwright, dev-only tooling,
  not added to the project) driving the actual dev server — the observation
  above was correct. React's controlled-input reconciliation synchronously
  restores the DOM value *and* its internal value tracker back to the
  last-committed value right after `nudgeEngineRender()`'s first ("away")
  dispatch, before the second ("back") dispatch runs — so the return dispatch
  finds nothing changed and is dropped, leaving Key stuck on the "away" value
  once React's own deferred commit for it lands. Fixed by re-syncing the
  tracker (`el._valueTracker.setValue(alt)`) between the two dispatches so the
  return dispatch is always recognized as a real change. `nudgeEngineRender()`'s
  signature, call sites, and chip-repaint purpose are unchanged. Verified
  against the real running app across 5 separate browser runs, including runs
  that hit the exact race.
- **Fix 2 (`StudioCanvas.jsx` lint cleanup):** the 6 `react-hooks/immutability`
  errors were suppressed at their exact lines with justified
  `eslint-disable-next-line` comments — the rule assumes hook return values
  are immutable, which doesn't hold for react-three-fiber's `useThree()`/
  `useGLTF()`, which intentionally return the live, mutable scene/camera/model
  objects for imperative control. No logic, JSX, or dependency arrays changed.
- **Known latent risk, deliberately not fixed:** the `react-hooks/exhaustive-deps`
  warning on the camera-preset effect (`StudioCanvas.jsx`, effect ending
  `}, [cameraRequest, customView, fit, camera, gl]);`) is missing
  `product.frontAz` as a dependency. It's harmless today only because every
  registered product has a distinct `modelPath`, so a product switch always
  changes `modelScene`/`fit` (already a listed dependency) and the effect
  re-runs anyway. If a future product is ever added that shares a
  `modelPath` with another product but has a different `frontAz`, camera
  presets could apply the wrong azimuth after switching between them without
  the effect re-firing. Revisit this dependency before adding any product
  registry entry that reuses an existing `modelPath`.
- **Fix 3 (real-GPU video export feasibility test):** confirmed on this
  machine's real GPU (`ANGLE (Intel, Intel(R) HD Graphics 5500), D3D11`, not
  software rendering) using `HTMLCanvasElement.captureStream()` +
  `MediaRecorder`, browser-native only. Two findings any future video-export
  mission must design around:
  - **VP9 encoder spin-up is highly variable (1.2s–7.8s observed) before it
    emits any real encoded data.** A naive fixed-duration capture (e.g. a
    literal 5-second recording) is unsafe as a result — the spin-up can
    exceed the whole window and produce a fully empty output file with no
    error raised. A real export feature must either warm up the recorder
    for a few seconds before the "real" capture window starts, or record
    longer than the target duration and trim the result, rather than
    trusting a short fixed-length recording to contain any usable frames.
  - **H.264/MP4 is not usable on this hardware, regardless of what
    `MediaRecorder.isTypeSupported()` reports.** `video/mp4;codecs=avc1`
    reports `true`, but an actual recording attempt with it produces 0
    bytes / 0 chunks — confirmed by trying to record, not just reading the
    flag. `video/webm;codecs=vp9` is the only codec that actually produces
    real, playable output on this machine; treat it as the only real
    browser-native export path.

---

## Architecture (React Studio, `app/src`)

- **Two siblings.** `app/src/main.jsx` renders `<App/>` (the engine) and
  `<StudioShell/>` (the UI, `ui/StudioShell.jsx`) side by side inside
  `StrictMode`. The shell is a pointer-transparent fixed overlay; it is never
  a child of the engine.
- **Engine** = `App.jsx` (React state: product, environment, camera request,
  custom view, lighting, export options, capture) + `components/StudioCanvas.jsx`
  (the r3f canvas) + `components/StudioControls.jsx` (the engine's own control
  panel, with the `data-testid` inputs the shell drives).
- **Bridges.** Shell UI does not keep a second copy of engine state. It
  drives the engine's own inputs:
  - Lighting chips: set the six `data-testid="light-*"` slider inputs
    (native value setter + dispatched `input` event) — `ui/InspectorRail.jsx`,
    presets in `lighting/moodPresets.js`.
  - Render Format chips: set the `data-testid="cap-format"` select
    (`RENDER_CHIP_FORMATS` in `InspectorRail.jsx`).
  - Export (header and rail): `ui/engineCapture.js` `exportPng()` clicks the
    `data-testid="capture-shot"` button. No export code exists in the shell.
  - Camera chips: click the engine's camera cards, found by
    `[data-studio-controls] button[title="<Name> shot"]`.
  - Model / environment: `ui/useEngineSelection.js` drives the engine's own
    model and environment chips; the header reads the live environment from it.
  Every bridge is a no-op (returns false, never throws) when the engine panel
  is not mounted.
- **Session API.** `App.jsx` calls `registerEngine({ snapshot, apply, reset })`
  from `session/studioSession.js` in a `useEffect` (returns the unregister).
  `studioSession.js` holds no engine state; it reads/writes through that API.
  `StudioCanvas` exposes the live model transform to `App` through
  `transformApiRef` ({ read, write, reset }).
- **Materials store.** `materials/store.js` is a module singleton
  (`subscribe`, `getSnapshot`, `applyPreset`, `resetModel`, `snapshotOverrides`,
  `restoreOverrides`, …). `ui/MaterialsManager.jsx` and the rail's Materials
  chips both use it (via `useSyncExternalStore` in the rail), and `apply.js`
  writes to the three.js materials. Custom presets, favourites and per-model
  last values persist separately through `materials/matDb.js` (IndexedDB).
- **Rule:** do not create duplicate state for anything the engine already
  owns. If the shell needs a value, read it from the engine's own input/store
  or drive the engine's own control.

## Phase 15A

Commits: `9f38328` (loading screen, camera + materials chips), `dbbceef` +
`6f8dfb2` (session; the two share one message, `dbbceef` is only the Navbar
deletion), `701bc83` (Render section), `133a2a5` (header Export).

- **Studio Shell: extended, not built here.** The shell (StudioShell, TopHeader,
  VersionTabs, sidebar, rail) already existed from Mission 9.5 (`d6fb105`).
  Phase 15A (`6f8dfb2`, `133a2a5`) extended `ui/TopHeader.jsx` and
  `ui/VersionTabs.jsx`. `components/Navbar.jsx` was an empty (0-byte) stub from
  the first app commit `c7a8224`; deleted in `dbbceef`.
- **Loading screen** — `9f38328`. `components/LoadingScreen.jsx` uses drei
  `useProgress`, so it shows real GLB (and texture) load progress. Mounted at the
  end of `App.jsx`. `loading = active || total === 0`; it stays mounted and fades
  out via CSS.
- **Rail Camera chips** — `9f38328`. Click the engine's camera cards (see
  Architecture), so the engine's presets in `camera/presets.js` run.
- **Rail Materials chips** — `9f38328`. Map to presets in `materials/presets.js`
  through `materialStore.applyPreset` (same store as MaterialsManager). Disabled
  until a model's materials are ready. Candy Red → Racing Red and Tan Leather →
  Brown Leather are nearest matches.
- **Studio Session Save / Restore / Reset** — `6f8dfb2`
  (`session/studioSession.js`, `ui/StudioShell.jsx`, `ui/TopHeader.jsx`).
  - Storage: `localStorage` key `sos-studio-session-v1`, `version: 1`
    (a different version reads as no session). Local only; not an export.
  - Captured: project name override, product id, environment id, camera preset
    id, saved custom view, lighting values, export options (format etc.), model
    transform, and edited materials of the attached model
    (`materials.snapshotOverrides()`; skipped when no model's materials are
    attached).
  - Not captured: a free-orbit camera position (only the preset id / saved custom
    view), selection, undo history, panel/rail collapse state, the capture
    preview. Whether runtime-imported assets restore is UNVERIFIED.
  - Restore: unknown product/environment ids are skipped. If the product differs,
    the stage-level part waits until the new product commits; materials wait up
    to 20 s for the target model, then give up quietly.
  - Reset: asks `window.confirm`, then returns environment, lighting, export
    options, camera, transform and materials to defaults (`resetSession`).
    It does not clear the saved session in localStorage.
- **Editable project name** — `6f8dfb2`. `ui-project-name` input in the header;
  follows the loaded asset's name until edited (`null` = follow); saved with the
  session.
- **Reserved badges on V2–V6** — `6f8dfb2`. `ui/VersionTabs.jsx`; only V1 is
  active, the others are `aria-disabled` with a "Reserved" badge.
- **Render section wired** — `701bc83`. Format chips (Reel 9:16 → `story-reel`,
  Post 1:1 → `ig-square`, Hero 4:5 → `ig-portrait`, Wide 16:9 → `web-hero`) set the
  engine's Format select; chips with no engine format show "Reserved". "Export
  PNG" calls `exportPng()`.
- **Header Export** — `133a2a5`. `ui/engineCapture.js` `exportPng()` is shared by
  the header and the rail. It opens the capture preview; "Download PNG" there
  saves the file.
- **GitHub checkpoints:** all of the above is on `origin/main` (local `main` and
  `origin/main` are both `0bd3680` at the time of writing). The repo has no git
  tags.

## Phase 15B — real HDR lighting

Commits: `fb23ab1` (implementation + Aviation Hangar HDR), `0bd3680`
(Steel Factory HDR).

- **`EnvironmentLighting`** in `components/StudioCanvas.jsx`, a child of
  `<Canvas>` next to (not inside) `StudioStage`. Sets `scene.environment` only;
  it does not touch `scene.background`.
- **Registry:** `environments/registry.js` entries may carry an optional `hdri`
  path. No `hdri` → legacy behaviour.
- **Loader:** `HDRLoader` from `three/examples/jsm/loaders/HDRLoader.js`
  (`RGBELoader` is deprecated in three r186; installed three is 0.186.0).
- **PMREM cache:** one `PMREMGenerator` per canvas; result render targets are
  cached per environment id (plus one for the probe) and disposed on unmount.
  Switching back to an HDR environment reuses the cache. The source texture is
  disposed after conversion.
- **Separate `LoadingManager`** (`hdrLoadingManager`), so drei `useProgress`, and
  therefore `LoadingScreen`, never sees the HDR download.
- **Fallback:** no `hdri`, or a load/convert failure → `RoomEnvironment` probe
  (the pre-15B look). A failure logs one `console.warn`, marks that id failed,
  and never throws. While an HDR is loading, the probe lights the model.
  Late loads that resolve after a newer switch are cached, not applied.
- **Suspense boundary** around `StudioStage` in `StudioCanvas.jsx`: the stage
  is `key`-remounted per product and suspends while a GLB loads. Previously that
  suspended the whole canvas, which hid the environment component and wiped its
  cache on every product switch (per the code comment; the pre-fix behaviour
  itself was not re-run). The boundary keeps `EnvironmentLighting` outside the
  suspended subtree.
- **Backdrop:** the JPG (`environment.file`) stays the visible
  `scene.background`, loaded by the existing `TextureLoader` effect. The HDR only
  lights the model.
- **Selection:** the same environment selector; `environmentId` in `App.jsx` is
  the only state. No duplicate state anywhere.
- **Environments with an `hdri` today (2 of 11):**

  | Environment | File in `app/public/environments/` | Bytes |
  |---|---|---|
  | Aviation Heritage Hangar | `hangar_interior_2k.hdr` | 6,939,075 |
  | Industrial Steel Factory | `industrial_pipe_and_valve_01_2k.hdr` | 6,720,770 |

  Source: Poly Haven, CC0 (as stated by the project owner; there is no
  attribution/licence file in the repo — UNVERIFIED in-repo).
- The other 9 environments keep the room-probe lighting plus JPG backdrop.
- **Add another HDR:** drop a 2:1 equirectangular `.hdr` into
  `app/public/environments/` and add one line, `hdri: "/environments/<file>.hdr"`,
  to that environment's entry in `environments/registry.js`.

## Phase 16A Slice A — Camera Studio sliders (uncommitted at time of writing)

Files: `camera/cameraStudio.js` (new), `camera/presets.js` (`getBaseline` only),
`components/StudioCanvas.jsx`, `App.jsx`, `components/StudioControls.jsx`
(`data-active` on the camera cards only), `ui/InspectorRail.jsx`,
`ui/ui-shell.css` (range styling).

- **Rule:** the live three.js camera and the OrbitControls target are the only
  source of truth. `cameraStudio.js` is a read-only snapshot
  (`{distancePct, heightPct, live, ready}`) recomputed from them; only the stage
  writes it. It also owns the module-level `apiRef` that `App` passes to
  `StudioCanvas` as `cameraApiRef`, and the null-safe commands
  `setDistancePct` / `setHeightPct` (false when no stage is registered).
- **Distance:** % of the frozen baseline distance `dist0` (slider 50-200, default
  100). The mouse wheel is unrestricted; the slider pins at its ends and the
  label shows the true number.
- **Height:** tilt at constant distance (elevation only), piecewise so 0% is the
  baseline elevation `elev0`; -100% = `min(-30deg, elev0)`, +100% =
  `max(75deg, elev0)`, clamped to +/-89deg (widened to include `elev0` so 0% is
  always the baseline). Known limit: on the Top preset (`elev0` ~ 84deg) the
  "up" half is a silent no-op.
- **Baseline:** `{baseId, dist0, elev0, offset}` frozen after each preset /
  default / saved-view apply (measured after, since preset targets carry the
  H_BIAS/V_BIAS offset), not recomputed on resize. `offset` is the target minus
  the model centre; nothing reads it yet.
- **Live vs Custom:** `App` state `viewLive` is true after any unguarded camera
  change or slider move and false after a preset, saved Custom view, product
  switch, session restore or reset. The stage guards its own moves with an
  applying counter; sync is OrbitControls `onChange` -> publish (store notifies
  only when a displayed value changed). The rail shows "Custom (unsaved)" while
  live and highlights the Framing chips from the engine cards' `data-active`.
  Save Custom View while live keeps the original baseline on the saved view
  (`customView` gained optional `baseId`, `dist0`, `elev0`, `offset`).
- **Session (not changed):** `studioSession.js` and the snapshot format are
  untouched. A session saved during an unsaved custom view restores the last
  preset until Slice B. Restore still clears `viewLive`.
- **Not touched:** CAM-001, CAM-002, FOV, keyframes, Lock focus, distance limits.

## Known Camera Bugs

Deferred, not fixed by Phase 16A Slice A:

- **CAM-001:** camera presets ignore a transformed model (they frame the model's
  original bounds, not its current transform).
- **CAM-002:** the Top preset's elevation reference is off: with the biased
  target the camera sits ~84deg above the target, not 90deg. To be fixed after
  Slice B.

## Current Studio Status

| Module | Status | Note |
|---|---|---|
| Studio Canvas | Complete | r3f canvas with orbit, transform, capture, on-demand shadows and HDR/probe lighting (`components/StudioCanvas.jsx`). |
| Asset Library | Complete | Registry-driven product/environment gallery plus GLB/HDR/EXR import manager (`ui/AssetLibrary.jsx`, `ui/ImportPanel.jsx`). |
| Camera Studio | Partial | Presets and Save Custom View work. Phase 16A Slice A (uncommitted): the rail's Distance and Height sliders are live and drive the real camera, with a "Custom (unsaved)" state. Lock focus on product is still a Reserved chip. See "Phase 16A Slice A" and "Known Camera Bugs". |
| Material Studio | Complete | Live PBR editing, presets, undo/reset, persistence and session capture (`materials/`, `ui/MaterialsManager.jsx`). |
| Render Studio | Partial | PNG capture/export with format chips works; no video/Reel/MP4 export. |
| Loading Screen | Complete | Real GLB progress via drei `useProgress` (see Known Limitations for the environment-switch flash). |
| HDRI Environment Library | Partial | 2 of 11 environments have a real HDR; the other 9 use the probe plus a flat JPG. |
| Animation Studio | Not Started | No animation code in `app/src` (no mixer/`useAnimations`, no auto-rotate). |

Status is judged from code reading, not from a fresh browser run in this update.

## Open Issues (Next Phase)

1. Camera Studio: Distance and Height are live (Phase 16A Slice A, uncommitted). Lock focus on product is still Reserved (no behaviour). Next: Slice B (session capture of a live view), then the CAM-002 fix; see "Known Camera Bugs".
2. Animation Studio not implemented.
3. Reel/MP4 export not implemented.
4. THE KOP branding renders clipped ("THE KOF") in every export. Believed to be in the model/texture, not in this React app's export code. UNVERIFIED at the source.
5. Blender: CAM_Shot01_LowHero still requires repair (aimed at nothing). Blender work is frozen.

## Resolved

- **Header crowding** — commit `1724d36` ("Fix header crowding"; it came after the
  two v0.15B commits, so it is not part of v0.15B). CSS only in
  `ui/ui-shell.css`: the brand no longer shrinks, the environment pill shrinks
  with an ellipsis, the brand tag hides at <=1400px and button labels collapse
  to icons at <=1320px.

## Known Limitations

- **Environment JPGs are not panoramas.** The built-in `app/public/environments/*.jpg`
  are flat 3:2 photos (1920 px derivatives), so they cannot be used as lighting;
  that is why HDR files are separate. (3:2 is from the owner; image dimensions
  were not re-measured in this update.)
- **Imported HDR/EXR lose the HDR.** `assets/thumbnail.js`
  (`renderHdriPreviews`) renders a tone-mapped equirect JPEG for the backdrop;
  only that JPG is used. Imported HDRs do not light the model. (The import path
  still uses the deprecated `RGBELoader`.)
- **Lighting profiles were not retuned for HDR.** `lighting/profiles.js` and
  `lighting/moodPresets.js` are unchanged since Missions 9 and 13C (git log);
  HDR environments use the same rig values as before.
- **Older sessions carry old lighting values.** `restoreSession` applies the
  saved `lighting` object verbatim, so a session saved before 15B keeps its
  pre-HDR values.
- **Loading overlay on environment switch.** The backdrop JPG is loaded with
  `new THREE.TextureLoader()` on the default manager (`StudioCanvas.jsx`), which
  `useProgress` sees, so `LoadingScreen` turns on for every environment switch.
  Same on the pre-HDR baseline. Whether it is visible to the eye: UNVERIFIED.
- **Visual-only UI:** Learn Studio, Help and Settings (`ui/TopHeader.jsx`); the
  rail header chips (`RAIL_CHIPS` in `ui/content.js`). The rail's Lock focus on
  product is a Reserved chip (Distance and Height became live in Phase 16A
  Slice A).
- **No auto-rotate and no animation code** (`StudioCanvas.jsx` states this;
  grep of `app/src` finds no animation mixer).
- **Lint:** the `product.frontAz` `exhaustive-deps` warning in `StudioCanvas.jsx`
  no longer appears: Phase 16A Slice A added `product.frontAz` to the
  camera-request effect's dependencies while rewriting it (`npm run lint`: 0
  errors, 0 warnings at that point). The "Known latent risk" note above is
  therefore addressed.
- **Software rendering in the automated tests.** The automated agent browser
  tests for 15A/15B (headless Chromium, SwiftShader) ran in software rendering.
  The owner's manual checks in Edge used the machine's normal browser graphics
  (GPU model not verified). The earlier Watchers Bootstrap Fix 3 video test did
  run on a real GPU. HDR on a real GPU is UNVERIFIED.

## Project rules

- Nothing reaches GitHub until it is committed and pushed via GitHub Desktop.
- Test on `http://localhost:5173` first.
- Do not run Arena and Claude Code on the same repo at the same time.
- Every task needs real evidence (diff, lint, build, browser proof), not "it works".

## Git Checkpoints

The repo has no git tags and no commit message uses "v0.14/v0.15", so the version
labels below are a grouping of the log by date and topic (owner's labels;
boundaries UNVERIFIED against any release note).

- **Before v0.14** — everything up to `5354bb3` (2026-09-13 to 2026-09-17):
  Missions 9, 9.5, 10C, 10E, 11A, 13C (`a12bb22`…`5316148`, PR #1 `068632d`),
  model packs `dc98912`, `9319bd2`, hydration/lint/GPU-export notes `81c9d3f`,
  KOP Shot Pack `2a3f5af`, dog scrub evidence `21f8e2f`, merge `5354bb3`.
- **v0.14** — 2026-09-19: `9f38328` only (LoadingScreen, rail Camera and
  Materials chips; details in the Phase 15A section).
- **v0.15A** — 2026-09-19: `dbbceef` + `6f8dfb2` (Studio Session, project name,
  Reserved tabs, Navbar removed), `701bc83` (Render section), `133a2a5` (header
  Export via `exportPng`).
- **v0.15B** — 2026-09-19: `fb23ab1` (HDR lighting + probe fallback + Aviation
  Hangar HDR), `0bd3680` (Steel Factory HDR).
- **Header crowding fix** — `1724d36` (after v0.15B; see Resolved).
- **Phase 15C** — `a8a5ac9` ("Phase 15C: mark decorative Camera controls Reserved;
  update HANDOFF"): rail Camera section's Distance, Height and Lock focus on
  product became inert Reserved chips; `VisualField` removed from
  `ui/InspectorRail.jsx`.
- **Phase 16A Slice A (uncommitted at time of writing)** — Camera Studio Distance
  and Height sliders, shared camera store, "Custom (unsaved)" state.
