# ☕🔥 Premium GLB Commercial Studio — Handoff

## Start here (updated through Phase 16B Slice E3, the Cessna swap, the Phase 17A audit, the Garage design and slices G1-G8 (G7 in two parts, G7a and G7b) and G11 (3D gizmo), the Cleanup slice (G9, the export lock, the backdrop gate, the Coffee Bike chip fix, scale max 100), Garage M0 (real size and the measure tool), the THE KOP MAIN product, and the move of the Blender working files out of the repo; HEAD `2a6cd74`, "M0: measure and real size (sizes, calibration, file-in-metres, cm/in, measure tool)"; all work through M0 is committed; this HANDOFF.md edit itself is uncommitted until the owner commits it)

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
  4. Phase 16A / 16B (Camera Studio; Animation Studio and Reels), then Phase 17A audit findings (Creator Studio, read-only)
     and Phase 18 (Garage design and slices G1-G8 and G11), then Products and models (three built-in products, THE KOP MAIN)
  5. Current Studio Status table
  6. Open Issues (Next Phase)
  7. Known Limitations
  8. Project rules
  9. Git Checkpoints changelog
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

## Phase 16A Slice A — Camera Studio sliders (commit `a23e3d0`)

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
- **Session (as of Slice A):** `studioSession.js` and the snapshot format were
  untouched; a session saved during an unsaved custom view restored the last
  preset. **Superseded by Slice B** (below), which saves and restores the live view.
- **Not touched in Slice A:** CAM-001, CAM-002, FOV, keyframes, Lock focus,
  distance limits.

## Phase 16A Slice B — Lock focus and session capture of the camera (commit `3c05965`)

Files: `camera/cameraStudio.js`, `components/StudioCanvas.jsx`, `App.jsx`,
`ui/InspectorRail.jsx`, `ui/ui-shell.css`. `session/studioSession.js` and
`components/StudioControls.jsx` are unchanged.

- **Default behaviour change:** Lock focus is ON by default (and after a product
  switch, a session Reset, and a restore of a session that has no saved lock). With
  Lock ON, **right-drag pan is disabled** (`OrbitControls enablePan={!focusLock}`);
  turn Lock OFF in the rail to pan.
- **State:** `focusLock` is a `useState(true)` in `App` only. `StudioCanvas` /
  `StudioStage` get `focusLock` and `onLockChange`. The store snapshot
  (`{distancePct, heightPct, live, lock, ready}`) mirrors it read-only (idle lock
  `true`); only the stage publishes it. New null-safe `cameraStudio.setLock(bool)`
  (false when no stage).
- **Follow rule (Lock ON):** the stage tracks the model centre
  `liveCentre() = fit.center * transform.matrixWorld` (the rigid transform, no
  Box3). When the transform changes, the orbit **target** moves by the same delta;
  the camera position is untouched. Runs inside `moveGuarded`, so it does not mark
  the view live and does not clear the preset highlight; it publishes, so the
  Distance/Height percentages change (`dist0` is not re-frozen). The centre is
  tracked with Lock OFF too so switching ON never carries a stale delta. The follow
  effect is declared after the camera-request effect on purpose: in a commit that
  carries both a new transform and a view request, `applyView` has refreshed
  `lastCentreRef` first (load-bearing order, commented in the code).
- **Lock command:** `api.setLock(next)` is an event, not an effect on the prop, so
  mount, product switch and session restore never retarget. ON: target becomes
  `liveCentre() + baseline.offset` (camera unchanged); the view is marked live only
  if the target moved by more than 1e-6. OFF: no camera or live change.
- **Rail:** the Reserved "Lock focus on product" chip is now a toggle
  (`data-testid="ui-camera-lock"`, `aria-pressed`, disabled until the stage is
  ready, gold `data-on` style). `CAMERA_RESERVED` was removed.
- **Frame default is now a request:** Reset and the "restore without a preset"
  path send `{ id: null, seq + 1, frame: true }` instead of calling
  `resetView()` directly, so the frame is applied in the same commit as the new
  transform (before, Reset framed the old transform's centre). `resetView` is still
  in the camera API.
- **Session field (no version bump):** `engine.camera = { position, target, fov,
  lock, live, baseId, baseline: { dist0, elev0, offset } }`, written only while the
  stage is mounted. `fov` is saved but not applied. `cameraPresetId` is still the
  last preset id, so an older build ignores `camera` and restores that preset.
  Restore validates defensively (finite length-3 arrays, boolean lock/live; a bad
  block falls back to today's behaviour). Lock: saved boolean, else ON. If `live`
  is true and the numbers are valid, a `view` request re-applies the exact
  position/target/baseline (`applyView(..., live = true)`) and `viewLive` is set;
  the saved Custom View slot is not overwritten. Otherwise presets are recomputed
  as before and `viewLive` is cleared. A missing/invalid baseline is re-measured.
  The product-switch (pending) path applies lock/live after the switch reset.
- **Not touched:** CAM-001, CAM-002, FOV changes, keyframes/animation, distance
  limits, preset data.

## Phase 16B - Animation Studio and Reels (Slices A, B, C, D1, C2, E1, E2, E3, and the Cessna 172 swap)

### What exists now

- **Animate section in the Inspector Rail** (`ui/InspectorRail.jsx`, last section):
  a Turntable preset, duration chips 4 s / 8 s / 12 s (default 8 s), Play / Stop,
  and "Export Reel (MP4)" (`data-testid="ui-anim-export"`, becomes "Cancel export"
  while exporting).
- **The Turntable spins the MODEL** about its own vertical axis (a pivot group
  turning about the model centre); the camera stays fixed. One turn per
  duration, linear, loops.
- **Reel output:** 1080x1920, 30 fps, silent H.264 MP4, constant frame rate,
  moov before mdat (fast start), 10 Mbps (`BITRATE` in `exporter.js`), a key
  frame every 1 s (`keyFrameInterval: 1` in `mp4.js`). Frames = duration x 30,
  frame times t_i = i / 30, no duplicate end frame (frame N would equal frame 0).
  File name `sidecar-reel-<w>x<h>-<fps>fps.mp4`.
- **Reel framing** (`reelPose` in `path.js`, applied by `stepExport`): the live
  camera's azimuth and elevation are kept, the target moves to the model's live
  centre, and the distance is `fitDistance(fit.size, 9/16, 45, 0.7)` times the
  Distance slider % read once at begin. On the two environments that have
  platform data (Slice E2) the pose is instead the platform pose described under
  "Model on the platform (Slices E1 and E2)" below.
- **Preview:** Play spins the model on the live canvas; a click on the canvas or
  Esc stops it. While a preview or export runs, `body[data-anim]` is set ("1" or
  "export") and a CSS shield in `ui/ui-shell.css` dims the controls that would
  fight it. During an export the visible canvas is hidden
  (`body[data-anim="export"] canvas`) because its buffer is resized to the
  export size.

### Commits

| Slice | Commit | What |
|---|---|---|
| A | `c99fd69` | Path engine (`animation/path.js`), `fitDistance`, `scripts/test-path.mjs` |
| B | `f25d884` | Live Turntable preview, Animate rail section, `animationStore.js`, body shield |
| C | `c936232` | Deterministic frame stepping (`beginExport` / `stepExport` / `endExport`), Reel framing (`reelPose`, `REEL_EXPORT`) |
| D1 | `0b7c2ce` | MP4 Reel export (mediabunny), `exporter.js`, `mp4.js`, `scripts/inspect-mp4.mjs`, Export button |
| C2 | `1e6077a` | Backdrop cover-crop for portrait and square exports, `capture/backdropCrop.js`, `scripts/test-backdrop.mjs` |
| E1 | `9425a0b` | Model-on-platform math only (pure functions and tests, nothing wired): `elevationForBaseAngle`, `panToAnchor`, `photoToFrame`, optional `elevationDeg` on `reelPose` |
| E2 | `ea2482c` | Model placed on the painted platform in the Reel MP4: `platformReelPose`, `backdropImageAspect`, registry `platform` data, `stepExport` pose block |
| E3 | `936f6d5` | Portrait and square PNGs use the Reel framing: `usesReelFraming`, `computeReelView`, `applyReelPngPose` (3 files: `exportOptions.js`, `StudioCanvas.jsx`, `scripts/test-path.mjs`) |
| Cessna swap | `d6b3cfa` | Registry points the Cessna 172 at the Tripo model `public/models/cessna-172-tripo.glb` (2 files: the GLB and `products/registry.js`) |

(`5dd66a6` and `4576c13` are HANDOFF.md-only commits: through C2 and through E2.)

### Files and what each does

- `animation/path.js` - pure math, plain numbers and arrays only (no React, no
  three.js, no DOM): `makeTurntable`, `sampleAt`, `frameCount` / `frameTimes`,
  `reelPose` (optional fifth argument `elevationDeg`: replaces the live elevation,
  clamped to +/-89 degrees; omitted or null gives exactly the older output),
  `validateAnimation`, `makeMove` (camera keys between two views; not used by any
  UI yet), and the model-on-platform functions `elevationForBaseAngle`,
  `panToAnchor`, `platformReelPose` (see below).
- `animation/animationStore.js` - module singleton (same pattern as
  `camera/cameraStudio.js`). Snapshot `{ mode, ready, durationS, progress, message }`
  with `mode` "idle" | "previewing" | "exporting"; the stage registers the api
  (`play`, `stop`, `beginExport`, `stepExport`, `endExport`, `getCanvas`) with
  `registerApi`. Also `setDurationS`, `setStatus`, `cancelExport`. Its only DOM
  side effect is `document.body.dataset.anim`.
- `animation/exporter.js` - `exportReel` (the frame loop: step, capture, encode,
  finish), `checkExportSupport`, `saveBlob`. Plain JS, no React.
- `animation/mp4.js` - the ONLY file that imports `mediabunny`, through a dynamic
  `import()`. `preloadMp4`, `canEncode`, `createMp4Writer` (`addFrame` is not
  async so the `VideoFrame` is built in the caller's task).
- `capture/backdropCrop.js` - pure, no imports. `withBackdropCrop(scene, aspect,
  render)` temporarily sets the background texture's repeat / offset to a
  centred "cover" fit while an export frame with aspect <= 1 is rendered, then
  restores them in the same synchronous call. Also `coverCrop`, `needsCoverCrop`,
  `photoToFrame` (where a platform painted in the photo lands in the cropped
  frame) and `backdropImageAspect` (the real image aspect of the background
  texture).
- `components/StudioCanvas.jsx` additions - the turntable pivot group;
  `startPreview` / `stopPreview` and the preview `useFrame`; `beginExport`,
  `stepExport`, `endExport` (`finishExport`); `endAnimations` backstops (camera
  request, transform change, slider / Lock commands end a preview or abort an
  export); `getCanvas` in the registered api; `withBackdropCrop` around the
  export renders in `renderExportFrame` and `stepExport` only; Slice E2 added an
  `environmentRef`, `liveBase()` (the model's base centre in world space) and the
  platform pose block inside `stepExport`.
- `environments/registry.js` - Slice E2 added `platform`, `floorAngleDeg` and
  `reelAnchorRy` to two entries (see below).
- `camera/presets.js` `fitDistance` - the inline fit formula as a pure function
  (`spinSafe` currently changes nothing: the footprint diagonal is already the
  horizontal extent).
- `capture/exportOptions.js` `REEL_EXPORT` - `{ width: 1080, height: 1920, fps: 30, fovDeg: 45 }`.
- `scripts/test-path.mjs`, `scripts/test-backdrop.mjs`, `scripts/inspect-mp4.mjs`
  (MP4 box inspector, no dependencies).

### Model on the platform (Slices E1 and E2)

- **What E2 does.** In `stepExport` (so in the Reel MP4 only), when the export
  aspect is <= 1 (portrait or square), the current environment has `platform`
  data and the background texture's image size is known, the pose comes from
  `platformReelPose`: the model's base centre (`liveBase()`: x and z of the live
  centre, y = the world floor y) is put at the painted platform's centre in the
  frame (`photoToFrame` from the real image aspect, plus `reelAnchorRy` x the
  platform's ry), and the camera elevation is solved numerically so the floor is
  seen at `floorAngleDeg` (8 degrees) AFTER the pan. The Reel distance
  (`fitDistance` x Distance slider %) and the model size are unchanged, and the
  portrait Reel ignores the Height slider (the elevation is solved, not taken from
  the live camera). If anything is missing or a step returns null, it falls back
  silently to the old `reelPose` call. Only Pistons Loft and Aviation Hangar have
  platform data. All other environments, landscape exports, PNG exports and the
  on-screen view were unchanged by E2 (byte-identical in the E2 probes; Slice E3 later changed the portrait and square PNG exports, see below; probe results,
  not reproducible from the repo alone).
- **Why `platformReelPose` solves numerically.** `elevationForBaseAngle` assumes the
  camera stays where it is, but `panToAnchor` also moves the camera up, so
  combining them naively counts the raise twice. `scripts/test-path.mjs` prints an
  INFO line for the Coffee Bike sample: combining them gives a floor angle of
  about 14 degrees instead of 8. `platformReelPose` therefore bisects the camera
  elevation over [-30, 60] degrees so that the angle is right after the pan.
  `elevationForBaseAngle` and `panToAnchor` stay in the code and are tested.
- **Registry fields and how to tune them** (`environments/registry.js`):
  `platform: { cx, cy, rx, ry }` are fractions of the PHOTO (origin top-left, y
  down; `cx` and `rx` of the width, `cy` and `ry` of the height). They are
  estimates measured from the JPG, plus or minus 3-4 px. `floorAngleDeg` is the
  photo's implied camera elevation (about 8, plus or minus 1.5).
  `reelAnchorRy` moves the model's base down by that many platform ry from the
  platform centre (0 = centre, about 0.33 = the front third). The values in the
  file are Pistons Loft `{ cx 0.4996, cy 0.7268, rx 0.2282, ry 0.0478 }` and Aviation
  Hangar `{ cx 0.4992, cy 0.7264, rx 0.2284, ry 0.0472 }`, both with
  `floorAngleDeg: 8` and `reelAnchorRy: 0`.
- **The other nine environments.** The design report found the platform's back and
  front rims at about the same rows in the other nine photos, by a centre-column
  brightness check only; the x extent was not measured, and two of them
  (`matte_white_photography_studio`, `industrial_steel_factory`) looked different.
  Adding data for them needs a measurement and a look at the picture first
  (unverified until then).
- **Photo sizes** (read from the JPG headers): `propeller-pistons-loft.jpg` is
  1264x843 and the other ten are 1920x1281. The 9:16 crop of Pistons Loft is about
  474 px wide, upscaled about 2.28x to 1080, so its backdrop is soft.
- **Tested by the owner** (owner facts, not visible in the repo): Instagram
  accepted an exported Reel MP4 (1080x1920, 30 fps, silent, H.264 High level 5.0
  `avc1.640032`): it loaded and was accepted. How it looks inside Instagram:
  untested. The owner also looked at Reel MP4s exported with E2: the Coffee Bike
  stands on the platform in Pistons Loft and the Cessna 172 rests on the platform
  in Aviation Hangar, with the whole plane in frame.

### Slice E3 and the Cessna swap

- **What E3 does** (commit `936f6d5`). The three fixed social presets
  `story-reel` (9:16), `ig-portrait` (4:5) and `ig-square` (1:1) now export their
  PNG with the same framing as the Reel MP4, in EVERY environment.
  `usesReelFraming(presetId, width, height)` (`capture/exportOptions.js`; list
  `REEL_FRAMED_PRESETS`) is true only for those three ids with a finite, positive
  size whose width / height is <= 1. `computeReelView` (`StudioCanvas.jsx`) is the
  shared pose function used by both `stepExport` and the PNG path: on an environment
  with `platform` data (Pistons Loft, Aviation Hangar) and a known backdrop image
  aspect it returns the platform pose (`platformReelPose`); otherwise it returns the
  plain centred Reel pose (`reelPose`: live azimuth and elevation, target at the
  model centre, distance `fitDistance` x Distance slider %). `applyReelPngPose`
  puts the camera there inside `moveGuarded`, and returns the function that restores
  camera, controls target and `camera.far`; the export renders, calls `toBlob` and
  restores in one synchronous task, and `publish()` is skipped meanwhile. It returns
  null (today's behaviour) with no controls object, while an export or preview runs,
  or when no pose can be computed.
- **What E3 does NOT change:** the "Current view" preset, the landscape presets
  (16:9 and any unknown id) and the on-screen view keep the live camera framing.
- **Owner-tested after E3** (owner facts, not visible in the repo): portrait PNGs of
  the Coffee Bike on Pistons Loft (Reel 9:16, Post 1:1, Hero 4:5) and of the Cessna on
  Aviation Hangar (9:16) show the model standing on the platform with the whole model
  in frame. On Vintage Garage (no platform data) the model is centred but floats.
  Wide 16:9 and Current view look as before. The Camera sliders and the "Custom
  (unsaved)" tag were unchanged and Play / Stop worked afterwards.
- **The Cessna swap** (commit `d6b3cfa`). `products/registry.js` now points
  `cessna-172` at `/models/cessna-172-tripo.glb` (1,409,244 bytes) with `frontAz: 0`.
  Why (registry comment): the nose points +Z in this asset (length along z, wingspan
  along x), and azimuth 0 is the camera on the +Z side looking toward -Z, so
  `frontAz 0` shows the +Z face as "Front". The placeholder `cessna-172.glb`
  (58,204 bytes) and its generator `scripts/gen-c172-placeholder.mjs` are kept as a
  fallback: revert = restore `modelPath "/models/cessna-172.glb"` and `frontAz 90`.
  The registry comment says the new model is normalised to 1.0 unit at its widest, so
  it carries no real-world scale (a real C172 has about an 11 m wingspan). The source
  is the owner's Tripo account (the registry comment says so; the file's own
  generator field says "Tripo" per the owner); the registry comment says the terms
  for commercial publication are the owner's to confirm and were not checked.
- **Owner-tested with the new Cessna** (owner facts): imported first as a custom asset,
  the platform placement worked on both Pistons Loft and Aviation Hangar. At Distance
  252 % the Reel plane was much smaller; at 100 % it fills about half of the frame (the
  Reel distance is multiplied by the Distance slider). The built-in plane's Front, Side
  and Rear presets show the correct sides, and Reel 9:16 PNG exports on Pistons Loft show
  the plane on the platform. The owner intends to replace this Cessna again later with
  a final model.
- **Counts observed when this section was written** (run by the author of this
  update; see "How to verify"): `node scripts/test-path.mjs` 192 PASS lines, exit 0,
  `ALL CHECKS PASSED`; `node scripts/test-backdrop.mjs` 84 PASS lines, exit 0,
  `ALL CHECKS PASSED`. Lint and build were not run for this documentation update.

### Rules that must not be broken

- The live three.js camera and the OrbitControls target are the only camera
  source of truth; animation code keeps no camera state.
- Every camera write goes through `moveGuarded`. Export never calls `onViewLive`
  and never changes Lock, the baseline, the Distance / Height % or the
  "Custom (unsaved)" tag (`publish` is skipped while exporting).
- No per-frame React state and no store notification per frame; the spin angle
  lives in a ref. The exporter throttles status updates to about 4 per second.
- A frame is only valid to read (`VideoFrame`, `drawImage`, `toBlob`) in the same
  synchronous task as `stepExport`; the drawing buffer is not preserved.
- The export renders on the visible canvas, not a render target, so tone mapping
  and colour stay identical to the on-screen and PNG output (three only tone-maps
  when rendering to the canvas).
- On a product switch the old camera is never restored onto the new model.
- `renderExportFrame` and the PNG path keep their behaviour; only the backdrop
  crop wrapper was added.
- The loop yields with a MessageChannel, not timers or `requestAnimationFrame`.

### How to verify

From `app`:

- `node scripts/test-path.mjs` - 192 PASS lines and `ALL CHECKS PASSED` (counted
  after the Cessna swap by counting lines that start with PASS; it was 167 after E2,
  and E3 added 24 lines to the script; note `grep -c PASS` reports 193 because
  `ALL CHECKS PASSED` also matches).
- `node scripts/test-backdrop.mjs` - 84 PASS lines and `ALL CHECKS PASSED` (counted
  again after the Cessna swap: 84; the owner also reported 84 after E2).
- `npm run lint` - no output, exit 0 at the last slice.
- `npm run build` - succeeds; mediabunny is its own chunk (a separate `src-*.js`
  file, about 687 kB at the last build; observed in build output, not asserted
  by the repo).
- `node scripts/inspect-mp4.mjs <file.mp4> --frames N --width W --height H` -
  `ALL CHECKS PASSED` (for a 4 s Reel: `--frames 120 --width 1080 --height 1920`).

### Dependency

`mediabunny` at the exact version in `app/package.json` (`1.58.1`), licence
MPL-2.0 (`package-lock.json`). It packs the H.264 frames from WebCodecs into an
MP4. It loads only when an export starts and builds into its own chunk. Its two
type-only dependencies (`@types/dom-webcodecs`, `@types/dom-mediacapture-transform`)
are in the lock file.

### Decisions taken by the owner

- The Turntable spins the model; the camera stays fixed.
- Reel = 1080x1920 at 30 fps only for now; silent MP4 (no audio).
- The Cessna is accepted small in 9:16.
- mediabunny approved as the one new dependency.
- The backdrop cover-crop applies to BOTH PNG and Reel exports for aspects <= 1
  (portrait and square: Story/Reel 9:16, 4:5, 1:1). Landscape exports and the
  on-screen view are unchanged.
- Slice E2: Reel MP4 only (portrait PNGs and everything else stay as they are);
  the model's base at the platform CENTRE (with an optional tunable offset,
  default 0); the camera set so the floor is seen at the photo's own angle; model
  size unchanged (fill 0.7 stays, the Distance slider % still scales the Reel
  distance); the portrait Reel ignores the Height slider. Environments covered:
  Pistons Loft and Aviation Hangar; every other environment keeps today's
  behaviour.
- Slice E3: the three social presets (story-reel, ig-portrait, ig-square) take
  the Reel framing in every environment; Current view, landscape presets and the
  on-screen view stay as they were (the original proposal said existing portrait PNGs
  would change and needed owner approval; the slice was then built).

### Known limitations and open items

- **Fixed in Slice E3 (`936f6d5`):** portrait and square PNGs (story-reel,
  ig-portrait, ig-square) used the live camera, so the model floated and a wide
  model such as the Cessna was clipped. They now use the Reel framing (owner-tested,
  see "Slice E3 and the Cessna swap").
- The model no longer floats in the Reel MP4 or the three social PNGs on Pistons
  Loft and Aviation Hangar (Slices E2 and E3, confirmed by the owner). The other nine
  environments have no platform data: the Reel and those PNGs use the plain centred
  pose and the model still floats there (owner-confirmed on Vintage Garage).
- The Reel distance is multiplied by the Distance slider %: at 252 % the Reel plane
  was much smaller, at 100 % it fills about half of the frame (owner-tested).
- The platform numbers in the registry are estimates from the JPG (plus or minus
  3-4 px; the 8 degree floor angle plus or minus 1.5); tune them by eye.
- The Cessna 172 is now the Tripo model `cessna-172-tripo.glb` (`d6b3cfa`); the old
  placeholder geometry and `app/scripts/gen-c172-placeholder.mjs` remain as a
  fallback. The Tripo model is not final: the owner plans to replace it again. Its
  fuselage carries garbled lettering baked into the texture (owner-observed; a
  texture problem, regenerating in Tripo is the likely fix, unverified). Its Tripo
  plan's terms for commercial publication are unchecked. It has no real-world
  scale (normalised to 1.0 unit at its widest).
- In one owner 9:16 PNG of the plane on the platform a gold ring appeared around it,
  and not in a second one. Cause unverified (possibly the selection ring while the
  model was selected; the Reel MP4 hides it, the PNG path was not checked).
- `propeller-pistons-loft.jpg` is 1264x843 (read from the file). A 9:16 crop of
  it is about 474 px wide, upscaled about 2.28x to 1080, so the backdrop is
  soft; sharper source photos would be needed.
- The other ten environment JPGs are 1920x1281 (read from the headers); they were
  not checked with the crop or measured for a platform beyond the centre-column
  check (untested).
- Instagram accepted an exported Reel MP4 (owner-tested; see above). How it looks
  inside Instagram is untested. The encoder writes H.264 High level 5.0
  (`avc1.640032`) while `checkExportSupport` tests `avc1.640028` (`canEncode` in
  `mp4.js`); the written level comes from probe output and the owner's upload,
  and is not asserted anywhere in the repo (unverified).
- 8 s and 12 s Reels were not tested at full size and would use more memory
  (untested).
- The Reel distance ignores any scale applied with the transform tool
  (`fit.size` is measured at mount) (untested with a scaled model).
- Session Restore / Reset while a preview plays is untested (the backstops exist
  in code).
- Keyboard activation of header or engine-panel buttons during a preview can
  still fire; the CSS shield only blocks the mouse.
- No in-app video preview window yet (planned Slice D2, not built); the file is
  downloaded and played outside the app. The downloaded file path through
  `saveBlob` was not exercised end to end in a browser (untested).
- The on-screen 3D view goes blank during an export, by design.
- Export time slows several-fold when free RAM is low on the 4 GB PC. In the last
  measurement (headless Edge, real Intel HD 5500, about 190 MB free) a 4 s
  1080x1920 Reel took about 6 s; a 270x480 export took 18 s when only about
  76 MB was free. These are probe measurements, not reproducible from the repo
  (unverified).
- Headed Edge behaviour (window occlusion, background tabs, download prompts) is
  untested.
- CAM-001 is fixed as of Garage G5 (see "Phase 18 - Garage", G5, and "Known Camera
  Bugs"). Audio and the Blender track are deferred.

### Next slices (proposed, not started)

- (Slice E3, portrait PNGs on the Reel framing, is done: `936f6d5`.)
- Platform data for more environments (measure and look first), and tuning
  `reelAnchorRy` if the owner wants the model further forward.
- Slice D2: an in-app video preview window.
- Slice E: camera moves (`makeMove`) and saving an animation in the session
  (optional `engine.animation` field, no version bump).
- Garage: G1-G6 are done (the store, the Parts switch and click-to-select, per-part
  move/rotate/scale/hide with exact reset and undo, the G5 refit event that makes the
  fit, floor, shadow, camera presets and Reel/PNG framing follow a part moved/hidden/resized
  - which as a side effect also fixed the older CAM-001 issue for the whole-model transform,
  since both gaps shared the same root cause - and the G6 per-part colour override, kept
  invisible to the pre-existing materials store/persistence it was the first Garage slice to
  touch). **Next is G8, save/load named layouts**, ahead of G7 (add objects from the library)
  even though the original slice order lists G6 before both: the design report's own
  suggested order already puts G8 ahead of G7 (see "Suggested order" in "Phase 18"), and the
  reasoning holds now more than ever - a named layout format should exist before there is
  more than one object's worth of state (a part's transform AND, as of G6, its colour
  override) worth saving. Neither G7 nor G8 needs the owner's approval per the slice plan.
  See "Phase 18 - Garage (scene editor): design and slices G1-G6" and "Known Camera Bugs".

Tooling reminders (Playwright / SwiftShader versus the real GPU, Project rules)
are in "Known Limitations" and "Project rules" below.

## Phase 17A audit findings (Creator Studio, read-only)

A read-only audit; nothing in the app changed. It looked at how far the current app
is from a scene editor where any part of a model can be picked and moved. Items
marked "owner-tested" are the owner's own observations, not visible in the repo.
Items marked "unverified" were not re-checked here.

### The Coffee Bike GLB (`app/public/models/the_kop_refined.glb`, 5,454,744 bytes)

- Read with a Node script for this update (the GLB JSON chunk): 8 nodes, 8 meshes, 8
  materials, one node per material, no node scale, 0 textures and 0 images. Each mesh
  has one primitive with POSITION and COLOR_0 attributes (colours live in the vertex
  colours). Node / material names: Paint_Burgundy_Gloss, Steel_Brushed, Chrome,
  Rubber_Tyre, Metal_Matte_Gunmetal, Leather_Saddle, Brass, Branding_Gold. The asset
  generator field reads "StudioOfSidecars refine" version 2.0.
- So the model is 8 material-sized lumps, not a set of separately selectable
  physical parts (a "part" here is every piece sharing one material).
- The sign: the file has no textures, so the "THE KOP" lettering (with the T and P
  clipped in the exports) cannot be a texture; it must be in the geometry. That the
  lettering is 3D glyph geometry in the Branding_Gold mesh was stated in the audit
  brief; only the no-texture fact and the material name were re-verified here
  (glyph shape and clipping: unverified).

### What the app can and cannot do today (read from the code)

- **Selection is whole-model.** A left click that is not a drag raycasts against
  `modelMeshes` and calls `onSelect({ name: product.name, size })` for any hit, or
  `onClear()` for a miss (`StudioCanvas.jsx`). No mesh or part identity is passed.
- **Material edits are per material, not per mesh.** `materialGroups` in
  `materials/apply.js` builds one entry per material `uuid` and collects the mesh
  names that use it, so an edit applies to every mesh sharing that material.
  Owner-tested on the Coffee Bike: setting Brass to red recoloured the box on top of the
  counter and the other brass parts together (one material, several parts).
- **The editor owns a fixed parameter set** (colour, metalness, roughness,
  envMapIntensity, opacity, transparent, clearcoat, clearcoatRoughness, transmission,
  ior, thickness, texture). Per the comment in `apply.js`, anything outside it, such as
  vertex colours, is left as the asset shipped it.
- **Edits auto-save to IndexedDB.** `materials/store.js` writes per-model overrides
  through `materials/matDb.js` (`indexedDB`, with `scheduleSave`; storage degrades to
  "off" instead of blocking). Owner-tested: colour edits persist across a normal
  reload (F5), Undo reverts a live edit, and "Reset entire model" clears everything.
- **Sessions** (`session/studioSession.js`, saved in `localStorage`) store
  `engine.snapshot()` (which the file's header comment says holds the whole-model
  transform, camera, lighting and environment) plus `materials.snapshotOverrides()`
  (edited material values per model). Nothing per part is stored.
- **No per-part move, rotate, scale or hide** exists anywhere in the app; the transform
  tool acts on the whole model. Confirmed by the absence of any such code path in the
  selection handler and stores (a search, not an exhaustive proof).
- **Fit values are measured once per model.** `fit` (centre, size, distance, floor)
  is a `useMemo` over `[modelScene, gl]` and is computed from the model's bounding box
  when it mounts. It does not follow later transforms (the same reason as CAM-001, and
  why the Reel distance ignores a tool-applied scale).
- **Vertex colours and picked colours** (owner-tested): a near-white colour set on
  Paint_Burgundy_Gloss (metalness 1.0, roughness 0.03) made the paint look bright
  pink. That is consistent with the picked colour multiplying the vertex colours stored
  in the mesh (unverified; not investigated).
- **"Reset this material"** appeared to do nothing on that edit (owner-tested; cause
  not investigated; the code path is `resetMaterial` -> `restoreEntry`). A hard refresh
  and then "Reset entire model" restored the original look.
- **Hex field** (owner-tested): typing then deleting characters snaps back to the old
  value; select all (Ctrl+A) and paste a full code instead (cause not investigated).

### Real size of the coffee cart

- Owner-provided: the cart's box body is 52 x 22 x 22 inches (132.1 x 55.9 x 55.9 cm),
  box body only, without the equipment on top, wheels or mudguards. The GLB's own scale
  is unknown and the box has not been measured in the model yet, so no scale factor has
  been derived (unverified).

### Assets looked at outside the repo (owner facts; none of these is used by the app)

- The Sketchfab file C172_Parent (33 named parts, CC-BY-4.0 by ollietaylor219): its parts
  are not assembled into a plane as placed (positions and rotations inconsistent), it
  has one material, and it needs attribution.
- Five more Tripo files: a wheel of 350k vertices, a fuselage, a small textured
  propeller aircraft (this became the new Cessna), a 60 MB 12-part plane with 1.95
  million triangles, and a 54-part "Meet the machine" mesh. Only the propeller aircraft
  is in the repo (as `cessna-172-tripo.glb`).

### The "Garage" idea (designed; only slice G1 built, see Phase 18)

- The owner wants a "Garage": a scene editor to pick any part of any model, move /
  rotate / scale / hide / recolour it, add objects from his library, and save named
  layouts. **Updated:** the design report has since been produced (read-only, not in
  the repo) and slice G1 (pure functions and tests, nothing wired) is committed; see
  "Phase 18 - Garage (scene editor): design and slice G1". The editor itself does not
  exist in the app yet. Reshaping geometry stays Blender work. The owner's preferred
  route is cutting the existing Coffee Bike into parts rather than rebuilding it; the
  Blender source `app/public/blender/THE_KOP_Studio_v01.blend` has not been opened
  (the file's presence and contents were not checked here: unverified).

## Phase 18 - Garage (scene editor): design and slices G1-G8, G11, the Cleanup slice and M0

Status: designed; slices G1-G8, G11, the Cleanup slice and M0 are committed (G1 `6226ba2`, G2
`3b7d9fb`, G3 `3527c6c`, G4 `d278ef3`, G5 `e829e1b`, G6 `86f445e`, G8 `15c1995`, G7a `12ef43b`,
G7b `3ef75ff`, G11 `56d2e3b`, Cleanup `8a370eb`, M0 `2a6cd74`); G9 is done, folded into the
Cleanup slice; G10 is not started. G1 and G2 were pure modules
and tests only, with nothing wired into the app (`git show --stat` on each commit: G1 touched
only 6 new files under `app/src/garage/` and `app/scripts/test-garage.mjs`; G2 touched only 2
new files, `app/src/garage/garageStore.js` and `app/scripts/test-garage-store.mjs`). G3 was
the first slice to wire anything into the app the owner can see: a Parts switch and
click-to-select, behind a default-off flag. G4 added numeric move/rotate/scale/hide of the
one selected part, exact reset and Undo/Redo. G5 added the refit event: the floor, shadow,
camera presets and Reel/PNG framing now follow a part G4 moved, hid or resized, and (as a
side effect, sharing the same root cause) the older CAM-001 bug is fixed for the
pre-existing whole-model transform panel too. G6 added a per-part colour override (base
colour, metalness, roughness, opacity, and an option to bypass a model's baked vertex
colours) — the first Garage slice to touch the pre-existing materials store/persistence
area of the code, kept fully invisible to it by construction. G8 added save/load of named
layouts (per-part overrides only) in the browser and as a `.json` file, with loading as one
undo step. G7a added objects to the scene (built-in products and imported assets, beside the
main product, under a triangle budget). G7b made layouts save and load those added objects
(`formatVersion` 2). G11 added a 3D `TransformControls` gizmo (move / rotate / scale by
dragging, W/E/R, World/Local, Snap) on the one selected part or added object. The Cleanup slice
removed the old outline/ring from exports (G9), wired the export lock to both exports, gated
exports on the backdrop being ready, fixed the Asset Library "Coffee Bike" filter chip, and
capped the numeric scale fields at 100. M0 added per-model real-size calibration, a cm/in
toggle, and a two-point measure tool. See the G2/G3/G4/G5/G6/G8/G7a/G7b/G11/Cleanup/M0
summaries below.

### The wish and the scope (owner)

The owner wants a "Garage": a scene editor where he can change anything, model-agnostic:
pick any part by click; move / rotate / scale / hide / recolour it; add other objects
from his library; save and load named layouts; with the Reel and PNG exports and the
camera presets still working. Out of scope: reshaping geometry, fixing geometry defects,
audio, the Blender track.

### The design report (from a read-only report, not in the repo)

The design report was produced in another session and is NOT in the repo. It used Node
measurements only; no browser probe ran, so every statement about speed, frame time or GPU
cost below is **unverified**. Its findings:

- Today the app shows one model at a time (`key={product.id}`). A click selects the whole
  model: the raycaster knows the hit mesh but the app discards it. Material edits are per
  material. (These points are also in the Phase 17A audit above.)
- The fit (`fit.size`, `fit.center`, `floorY`) is measured once per model, so a moved or
  scaled model would leave the floor, shadow, ring, camera presets and Reel framing stale
  (the known CAM-001 gap).
- No gizmo is used. three's `TransformControls` exists in `node_modules` but is unused.
- By code reading, a plain PNG includes the gold selection outline and ring when something
  is selected (unverified by a run).
- Measured in Node: `the_kop_refined.glb` splits into 681 connected pieces (per node 11, 5,
  286, 3, 311, 1, 4, 60) in about 20 to 150 ms with no geometry duplication. The repo's own
  `scripts/test-garage.mjs` checks the same 681 and the same per-node list (its split run
  printed 149 ms for that file when this update ran it).
- Splitting into hundreds of Meshes would raise the draw calls from 8 to 681; the cost on the
  owner's PC is unmeasured. The report's proposed mitigation is "virtual parts": a
  triangle-to-component map where only edited pieces become real meshes.
- Proposed part-id scheme: the node path with sibling indices plus a fingerprint (verts,
  tris, bbox, material name), with an "ambiguous" status for mirrored twins.
- Proposed store: `app/src/garage/garageStore.js`, in the pattern of `cameraStudio.js` and
  `animationStore.js`. A layout is stored as versioned JSON (items, part overrides as
  deltas, splits, frontRef) under a new localStorage key `sos-garage-v1`, plus a `.json`
  backup. (Not built; neither the file nor the key is in the code yet.)

### Approved decisions (owner said "go with defaults")

1. A part dragged below the model's floor leaves the floor and shadow at the model's
   ORIGINAL base (recorded in code as `floorYFor` in `bounds.js`).
2. PNG exports stop including the gold outline and ring (a later slice, G9).
3. Turntable is not allowed with several objects at first.
4. With several objects the front object defaults to the first one (layout field `frontRef`;
   recorded in `layout.js`).
5. Layouts live in the browser plus a downloadable `.json` backup (`serializeLayout` and
   `parseLayoutJson` are the two ends).
6. Per-part colour may ignore a model's baked vertex colours as an option (layout field
   `material.ignoreVertexColors`).

### What exists in `app/src/garage` (slice G1, commit `6226ba2`)

Five pure modules: plain JS, no imports from the app, no three.js, no DOM, none throws on bad
input. Nothing imports them.

| File | Exports | What it does |
|---|---|---|
| `partId.js` | `sanitizeNodeName`, `buildPartIds`, `partIdOfComponent`, `parsePartId`, `fingerprint`, `fingerprintsMatch`, `resolvePart` | Stable part ids (node path, `name~n` per segment, split components add `#cK`), fingerprints and re-matching a saved part to the current tree |
| `layout.js` | `LAYOUT_LIMITS`, `validateLayout`, `serializeLayout`, `parseLayoutJson` | The saved-layout shape (version 1), validation that returns a fresh object graph and drops unknown and forbidden keys, stable serialisation. Limits: 20 items, 2000 parts and 200 splits per item, name 60 chars, min scale 0.05, 2,000,000 JSON chars |
| `split.js` | `splitComponents` | Connected components of a triangle mesh (weld by position, union-find, numbered by first appearance): counts, a component per triangle and a box per component; `{ ok:false, reason }` on bad input or more than 500,000 vertices by default |
| `bounds.js` | `boxOfMatrixBox`, `unionBounds`, `floorYFor` | World bounds of a plain node tree and the floor height rule (decision 1) |
| `compose.js` | `identityMatrix`, `matMul`, `matFromTRS`, `matFromEulerXYZDeg`, `pivotMatrix`, `transformPoint`, `quatMul`, `quatNormalize`, `applyPartOverride`, `resetToBase` | Column-major matrix and quaternion maths, the whole-model transform read the way the studio reads it (degrees, one uniform scale), part overrides and exact reset |

`app/scripts/test-garage.mjs` (665 lines, plain node; three is used only to cross-check the
maths) prints 161 PASS lines and ends with `ALL CHECKS PASSED (161 PASS)`. It reads GLBs in
`app/public/models/` and prints SKIP when a file is missing. The split counts it printed
(INFO lines): `the_kop_refined.glb` 681, `cessna-172-tripo.glb` 186, `cartoon-motorcycle.glb`
149, `cessna-172.glb` 15, `cup-coffee.glb` 2, `mug.glb` 1.

### G2 - the store (`app/src/garage/garageStore.js`, commit `3b7d9fb`)

Pure JS, no engine hookup, nothing visible (`git show --stat 3b7d9fb`: only
`app/src/garage/garageStore.js` and `app/scripts/test-garage-store.mjs`, both new; a search
of `app/src` outside `garage/` finds no import of it yet from this commit alone). It follows
the pattern of `camera/cameraStudio.js` and `animation/animationStore.js`: a frozen snapshot
replaced only when a field changes, `subscribe` + `getSnapshot` for `useSyncExternalStore`,
and `registerApi` with an identity-checked unregister (safe under React StrictMode). The
layout itself is immutable (each command builds new objects along the changed path only, so
undo entries share memory). What it adds, per the module's own top-of-file comment and
exports:

- **History.** `undo` / `redo`, capped at `HISTORY_LIMIT = 50` entries (`{ before, after }`
  layout-reference pairs).
- **Gesture coalescing.** `beginGesture` / `endGesture` / `cancelGesture`: while a gesture is
  open the snapshot keeps describing the layout at `beginGesture`, so a drag's intermediate
  states never land in history; only the gesture's start and end become one undo step.
- **Selection.** `select` / `toggle` / `clearSelection`, capped at `SELECTION_LIMIT = 200`
  entries; selection is explicitly not itself an undo step and is not saved with the layout.
- **A lock.** `setLocked(true)` makes `startLayout`, `loadLayout`, part/item edits and gesture
  commands refuse with `{ ok:false, reason:"locked" }` (selection is not blocked). The module
  comment frames this as an export lock; at G2 it was a primitive nothing else called (checked
  with a repo-wide grep for the G2 update). **Wired in the Cleanup slice (`8a370eb`):**
  `capture/exportGate.js`'s `withExportLock` calls it around every PNG capture and Reel export,
  released in a `finally` so it always releases, including on a throw, a cancelled export, or
  the stage unmounting mid-export for a product switch. See "Cleanup slice" below.
- Decision 3 (no-turntable-with-several-objects) was replaced by G7a's decision 7 (one scene:
  the turntable and every export include added objects). Decision 2 (PNG exports dropping the
  outline/ring) was implemented as G9 in the Cleanup slice below. Decision 1
  (floor-stays-at-original-base) is `floorYFor` in `bounds.js`, used since G1.

`app/scripts/test-garage-store.mjs` (815 lines) prints 219 PASS lines (counted for this
update; owner-reported count matches).

### G3 - part selection by click, behind a Parts switch (commit `3527c6c`)

The first Garage slice wired into the running app, and the one that needed the owner's
approval per the slice plan. Touches 5 files (`git show --stat 3527c6c`): two new pure
modules (`app/src/garage/garageMode.js`, the Parts-mode switch store; `app/src/garage/
partTree.js`, `buildPartIndex` - a duck-typed tree walk, no three.js import, that names every
mesh node as one "part" using the same ids `partId.js` gives), plus wiring in
`app/src/components/StudioCanvas.jsx` and `app/src/ui/InspectorRail.jsx`, and a new test
script `app/scripts/test-garage-select.mjs`.

- **The switch** (`garageMode.js`) is OFF by default; turning it OFF also clears the Garage
  selection (the selection itself still lives in `garageStore.js`). With it OFF the app
  behaves exactly as before G3.
- **A part is one `THREE.Mesh`** - a glTF mesh node / primitive, not a connected component
  (component splitting is the later G10 slice). `buildPartIndex(modelScene)` runs once per
  model (`useMemo` on `modelScene` in `StudioCanvas.jsx`) and maps every mesh to a part id and
  back.
- **The click handler's Parts branch** (`StudioCanvas.jsx`, inside the existing
  `onPointerUp` click-vs-drag handler): with Parts mode on, a hit resolves to a part id via
  `partIndex.byRef`; a plain click replaces the selection (`garageStore.select`), shift-click
  adds/removes it (`garageStore.toggle`), and a miss with no shift key clears it
  (`garageStore.clearSelection`). The pre-existing whole-model click branch below it is
  untouched and runs whenever Parts is off.
- **The rail** (`InspectorRail.jsx`, Garage section) reads the Garage stores only (never
  touches the engine directly) and shows, for a single selected part, its name / path / size /
  material via `garageMode.describePart`.
- **Exports never show the outline.** The selected-part overlay (`garage-overlay`, a cyan
  inverted-hull shell distinct from the gold whole-model outline) is hidden for the
  synchronous export render and restored in the same task, including when the render fails
  (`StudioCanvas.jsx`, the existing PNG capture path).
- **Owner-tested** (owner facts, not visible in the repo, on THE KOP MAIN in his own browser):
  clicking a part with Parts mode on shows the cyan outline and the part's name/path/size/
  material in the rail; shift-click adds; Esc/empty-click clears; exporting a Reel PNG with a
  part selected shows no outline; turning Parts off restores the old whole-model click
  behaviour.

`app/scripts/test-garage-select.mjs` (284 lines) prints 67 PASS lines (counted for this
update; owner-reported count matches).

### G4 - move / rotate / scale / hide a selected part, exact reset and undo (commit `d278ef3`)

Touches 4 files (`git show --stat d278ef3`): further additions to `garageMode.js`
(`singleSelectedPart`, `getPartTransform`, `commitPartEdit`) and to `StudioCanvas.jsx` and
`InspectorRail.jsx`, plus a new test script `app/scripts/test-garage-part-edit.mjs`.

- **Editing is numeric fields only** (Position x/y/z in metres, Rotation x/y/z in degrees,
  Scale uniform with an advanced per-axis disclosure, minimum scale 0.05), styled and wired
  the same way as the existing whole-model transform panel; no 3D gizmo (deferred to G11).
  Only one selected part is editable at a time - with 2+ parts selected the rail hides the
  edit fields behind a hint (`InspectorRail.jsx`'s `GarageEditFields` / `GarageSection`).
- **Base pose recording.** `StudioCanvas.jsx` keeps one base pose (position, quaternion,
  scale, visible) per part mesh in a `WeakMap` (`partBasesRef`), recorded once the first time
  a part is touched; a fresh `WeakMap` per stage mount means a product switch never carries a
  stale base into the next model.
- **Exact reset.** Every real layout change re-poses every part mesh from its recorded base
  composed with its current override via `compose.js`'s `applyPartOverride` (or `resetToBase`
  when the override is gone) - never a hand-rolled equivalent. "Reset part" in the rail calls
  `garageStore.resetPart(itemId, partId)` directly.
- **Undo / Redo** in the rail (`data-testid="ui-garage-undo"` / `"ui-garage-redo"`) call
  `garageStore.undo` / `garageStore.redo` directly - the same store commands G2's history
  already tracks, so no separate history was built for part edits.
- **A real bug found and fixed during this slice:** the assumption that three.js's
  `Raycaster` skips invisible objects is wrong for the three.js version in this repo
  (0.186.0) - verified against `node_modules/three/src/core/Raycaster.js`: neither
  `intersect()` nor `Mesh.raycast()` checks `.visible`. This meant a hidden part could still be
  clicked and selected. Fixed by filtering `modelMeshes` to currently-visible meshes
  (`modelMeshes.filter((m) => m.visible)`) before raycasting in the click handler, in both
  pick modes.
- **Decision 4 (approved for G4):** `fit` (`fit.size`, `fit.center`, `floorY`), the floor disc,
  shadow catcher, ring, camera presets, and Reel/PNG framing (`computeReelView`, `reelPose`,
  `platformReelPose`) do NOT update when a part is moved, hidden, or the whole model is
  resized - deferred to Garage G5. `Box3.setFromObject` / `expandByObject` has no visibility
  check, so a hidden part still counts toward fit-based measurements until G5.
- **Owner-tested** (owner facts, not visible in the repo): selected a small part (a paper cup)
  on THE KOP MAIN, saw Position/Rotation/Scale/Hidden fields populate with real values in the
  rail, moved it with the Position X field, exported a Reel 9:16 PNG while the part was still
  displaced (not yet reset), and confirmed the part appeared visibly moved in the exported
  image (not snapped back to its original spot). He also exercised Reset part and the
  Undo/Redo buttons.

`app/scripts/test-garage-part-edit.mjs` (263 lines) prints 65 PASS lines (counted for this
update; owner-reported count matches).

### G5 - the refit event (`liveFit`), fixes CAM-001 (commit `e829e1b`)

Touches 2 files (`git show --stat e829e1b`): `app/src/components/StudioCanvas.jsx` (208
lines changed) and a new test script, `app/scripts/test-garage-refit.mjs`.

- **`refit()`** (`StudioCanvas.jsx`) re-measures the model from the live three.js scene
  graph through a small adapter, `adaptObject3D`, which walks the live `Object3D` tree
  (skipping the runtime-only selection-outline and Garage overlay groups by name) and
  builds the plain node tree that `bounds.js` already expected; the actual union math is
  unchanged, reused as-is - `unionBounds` for the world-space box and `floorYFor` for the
  floor rule. `unionBounds` already skips any node with `visible === false`, so a hidden
  part no longer counts toward the measured bounds, closing the "hidden part still counts
  toward fit" gap noted under G4. The result is written to two places: `liveFitRef` (a
  ref, read imperatively so camera presets and Reel/PNG framing always see the current
  measurement, never through a React effect dependency) and `liveFit` (the same shape as
  React state, set once per `refit()` call, read only by the floor disc / shadow catcher /
  ring / shadow-frustum JSX). `refit()` runs at the end of the existing Garage-store
  commit subscription (after every part mesh already has its new pose), on every
  whole-model transform-panel change, and once on mount.
- **Fixes CAM-001** (camera presets ignoring a transformed model) for the pre-existing,
  non-Garage whole-model transform panel, because both gaps shared one root cause: `fit`
  was measured once per model and never recomputed. The fix is exact for translation and
  for uniform scale of the whole model; rotation about the x or z axis is only
  approximately handled - not fully solved in this slice.
- **The frozen `fit` object is a deliberate, unchanged design guard.** `frameDefault` and
  the saved/custom-view camera baseline still read the original, frozen `fit` measurement
  (never `liveFit`/`liveFitRef`), so editing a part never snaps the user's current camera
  view on its own. Only an actual camera-preset click (Front/Side/Rear/etc.) and Reel/PNG
  export framing read the live, updating measurement.
- **`floorY` is pinned**, per the G4 Decision-1 rule already recorded in `bounds.js`'s
  `floorYFor`: the floor and shadow catcher's vertical position never changes, even if a
  part is dragged below the floor or the whole model is resized; only their horizontal
  centre and footprint may follow `liveFit` when the model's centre moves.
- **The Turntable pivot** now spins around the model's current (live) centre - measured
  from the model root directly, excluding both the whole-model transform and the pivot
  group itself - instead of the frozen original centre; both the pivot and its
  offset-cancelling child group are now positioned imperatively from `refit()` rather
  than through a declarative JSX prop.
- **Owner-tested** (owner facts, not visible in the repo). The CAM-001 fix: the owner
  moved the whole Coffee Bike 0.3 units on X using the pre-existing (pre-Garage) transform
  panel, clicked the Front camera preset, and confirmed the framing was now centred on the
  bike's new position (before this fix it would have stayed framed on the model's original
  position); he then reset the transform and confirmed the framing returned to exactly the
  original. On THE KOP MAIN: he moved a part far from its original spot, clicked a camera
  preset, and confirmed the framing visibly widened to include it; hid a part and
  confirmed the framing shrank; exported a Reel MP4 with a part moved and confirmed the
  model still stood correctly on the platform (floor position unaffected). These are the
  owner's own manual checks, separate from what the repo's node tests below prove.

`app/scripts/test-garage-refit.mjs` (280 lines, plain node, no three/DOM/browser; every
expectation is cross-checked a second, independent way built from `compose.js`'s public
matrix functions) prints 55 PASS lines, 0 FAIL, exit code 0 (run and counted for this
update).

### G6 - per-part colour override (commit `86f445e`)

Touches 4 files (`git show --stat 86f445e`): `app/src/materials/apply.js` (12 lines),
`app/src/components/StudioCanvas.jsx` (114 lines), `app/src/ui/InspectorRail.jsx`
(115 lines), and a new test script, `app/scripts/test-garage-color.mjs` (226 lines).

- **Scope (owner decision 6 and the slice plan):** base colour, metalness, roughness,
  opacity, and an `ignoreVertexColors` toggle. No textures, no emissive, and no
  clearcoat/transmission per part - deferred to a later slice.
- **Zero overhead for an untouched part.** A part with no colour override keeps pointing
  at its mesh's original, shared material; nothing is cloned and nothing is allocated for
  it. Only a part that gets an override gets a clone, made once (`applyPartMaterial` in
  `StudioCanvas.jsx`) and disposed again the moment the override is fully removed.
- **Invisible to the pre-existing Materials panel and its persistence.** A colour override
  lives only in the Garage layout's per-part override data (the same `garageStore` map G4's
  move/rotate/scale/hide fields already write to); it never appears as a row in the
  Materials panel and is never written to the Materials panel's own persistence
  (IndexedDB `sos-materials`). It is unaffected by that panel's existing Undo/Reset/presets,
  and that panel's edits are unaffected by it - by design, the two are separate,
  non-interacting systems over the same three.js materials.
- **Two real bugs found and fixed**, both caught by running the code in a browser rather
  than by reading it:
  1. **Materials-panel row disappearing.** A first attempt at excluding a Garage colour
     clone from the Materials panel's grouping (`materialGroups` in `materials/apply.js`)
     simply skipped the clone. On these split models a recoloured part is often the ONLY
     mesh left pointing at its original material, so skipping the clone made that
     material's row vanish from the panel entirely. Fixed by redirecting the grouping key
     to the clone's own recorded original material (`rawMat.userData.sosGarageOriginal`)
     instead of skipping it, so the row persists with the same id and values as if Garage
     had never touched the mesh.
  2. **Stale override surviving a product-switch round trip.** Recolouring a part, switching
     products, then switching back could leave the OLD override colour visibly applied to
     the mesh even though the store correctly reported no override any more. Cause: the
     per-part base-pose cache (`ensurePartBase`) trusted whatever material a mesh currently
     held as "the pristine original" - but on a revisit that material could already be a
     stale Garage clone left over from before. Fixed by unwrapping through the clone's own
     back-reference (`sosGarageOriginal`) before recording a mesh's base material, so the
     TRUE original is always what gets recorded, never a clone.
- **`ignoreVertexColors` (default off).** Lets a picked colour REPLACE a model's baked-in
  `COLOR_0` vertex-colour data instead of tinting it (`clone.vertexColors = false` when set).
  This is the fix for an effect the owner had already hit manually in the Phase 17A audit: a
  near-white colour picked on the Coffee Bike's burgundy paint came out pink, because the
  paint's baked vertex colours were being multiplied against the picked colour rather than
  replaced by it.
- **Rail UI** (`InspectorRail.jsx`, `GarageColorFields`): a colour swatch plus hex field,
  three sliders (Metalness/Roughness/Opacity, styled with the Materials panel's own
  `.sos-mat-field` classes), an "Ignore baked colours" checkbox, and a "Reset colour" button,
  shown only when exactly one part is selected (the same single-selection rule G4's edit
  fields already use). Reads through `garageMode.apiRef.current.getPartMaterial` (the part's
  composed effective values) and writes through `.commitPartMaterial` or directly through
  `garageStore.setPartOverride(itemId, partId, { material: null })` for a full reset.
- **Owner-tested** (owner facts, not visible in the repo, separate from what the repo's node
  tests below prove): the owner exported a Reel MP4 with a recoloured part and confirmed the
  new colour correctly shows in the video (not the original colour), then ran
  `node scripts/inspect-mp4.mjs` on the resulting file and confirmed it is still structurally
  valid.

`app/scripts/test-garage-color.mjs` prints 60 PASS lines, 0 FAIL, exit code 0 (run and
counted for this update; the owner separately ran all eight Garage/animation node test
scripts himself - `test-path` 192, `test-backdrop` 84, `test-garage` 161, `test-garage-store`
219, `test-garage-select` 67, `test-garage-part-edit` 65, `test-garage-refit` 55,
`test-garage-color` 60, all 0 FAIL - matching what this update independently counted for
`test-garage-color`).

### G8 - save and load named layouts (commit `15c1995`)

Touches 4 files (`git show --stat 15c1995`, 759 insertions, 2 deletions): a new pure module
`app/src/garage/layoutLibrary.js` (239 lines), an additive command in
`app/src/garage/garageStore.js` (22 lines), a new `GarageLayoutSection` in
`app/src/ui/InspectorRail.jsx` (256 lines) and a new test script
`app/scripts/test-garage-layouts.mjs` (244 lines). `StudioCanvas.jsx` is not touched: a
loaded layout reaches the stage through the same `garageStore` commit subscription G4/G6
already use.

- **Owner-approved decisions.**
  1. A layout saves only the Garage per-part overrides (move / rotate / scale / hide /
     colour). It does NOT save the camera, the selection, the pre-existing whole-model
     transform panel, or the Materials panel. In code, `partsOnlyLayout` resets each item's
     whole-model `transform` to identity and its `hidden` flag to false before validation.
  2. Storage is `localStorage` under the key `"sos-garage-layouts:<productId>"` (one JSON
     array of envelopes per product, `keyForProduct`), plus a `.json` Download per saved
     layout and an "Upload .json" button.
  3. A layout saved for a different product is refused with nothing applied
     (`resolveLoad` returns `reason: "wrong-product"` before it looks at any part).
  4. Parts that no longer exist on the current model are skipped and counted; the rail
     shows "Loaded "<name>" - X parts skipped." (existence is checked with
     `garageMode.describePart(id) !== null`).
  5. Loading is one undo step.
  6. Saving over an existing name asks "Overwrite?" (Overwrite / Cancel buttons).
  7. Nothing auto-loads on refresh.
- **Envelope format** (`layoutLibrary.js`): `{ kind, formatVersion, productId, name, savedAt,
  layout }`, with `kind = "sos-garage-layout"`, `formatVersion = 1`, `name` trimmed and
  capped at 60 characters, `savedAt` an ISO string, and `layout` a `layout.js`-validated
  layout. `serializeEnvelope` writes sorted-key JSON through `layout.js`'s own
  `serializeLayout`, so download and upload round-trip exactly. Uploads over 1 MB
  (`MAX_UPLOAD_BYTES`) are not read. Saved layouts list newest first; each row has Load,
  Download and Delete. The module is pure: storage is injected (`{ getItem, setItem,
  removeItem }`), so node tests pass a mock.
- **`garageStore.loadPartsOverrides(itemId, parts)`** is additive (no existing command
  changed). It replaces an item's whole parts map in ONE `commit`, so a load is exactly one
  undo step. It goes through the same `wrap()` + `validateLayout` sanitising as
  `setPartOverride` and leaves the item's transform and hidden flag alone. The existing
  `loadLayout` / `loadLayoutJson` were not used because they go through `install()`, which
  empties the undo and redo stacks and clears the selection, so a load could not be undone.
- **Byte-identity proof, and a process lesson (stated honestly).** The implementing agent
  skipped the required step "take a baseline with the ORIGINAL code before editing"; this
  was caught at review. The fix: `git archive HEAD` of the pre-G8 code into a scratchpad
  copy (`node_modules` through a directory junction; no stash, checkout or worktree), then one
  measurement script run on both the ORIGINAL and the G8 trees, 3 repeats per product. The
  exported PNG sha256 was identical between ORIGINAL and G8 in all 12 runs: coffee-bike
  `d0b8e753...` (1,196,239 bytes), the-kop-main `5d5eea9d...` (1,395,381 bytes). (Owner
  facts; the measurement script and its output are not in the repo.) The on-screen canvas
  hash of coffee-bike's default view varied across repeats on the ORIGINAL code too, so it
  is pre-existing and not caused by G8; see "Verification harness notes" below.
- **Owner-tested** (owner facts, in Edge, separate from what the repo's node tests prove):
  a normal PNG export is unchanged; on THE KOP MAIN with Parts on, he recoloured and moved a
  part, saved a named layout, undid, and Load restored the edits; one Undo removed them;
  Download .json produced a file; uploading that file on Coffee Bike was refused; an F5
  refresh loaded nothing automatically. All as expected.
- **Other owner facts:** the "X parts skipped" message is verified by the node tests only,
  not clicked through in a browser. Loaded part overrides render whether the Parts switch is
  on or off.

`app/scripts/test-garage-layouts.mjs` (244 lines) prints 64 PASS lines, 0 FAIL, exit code 0,
ending with `ALL CHECKS PASSED (64 PASS)` (run and counted for this update). The owner
separately ran all nine node test scripts himself: `test-path` 192, `test-backdrop` 84,
`test-garage` 161, `test-garage-store` 219, `test-garage-select` 67,
`test-garage-part-edit` 65, `test-garage-refit` 55, `test-garage-color` 60,
`test-garage-layouts` 64, all 0 FAIL.

### G7a - add objects to the scene (commit `12ef43b`)

Touches 5 files (`git show --stat 12ef43b`, 1,074 insertions, 20 deletions): a new pure module
`app/src/garage/sceneObjects.js` (167 lines), `app/src/components/StudioCanvas.jsx` (433 lines
changed), `app/src/ui/InspectorRail.jsx` (237), `app/src/App.jsx` (21) and a new test script
`app/scripts/test-garage-objects.mjs` (236 lines).

- **Owner-approved decisions.**
  1. From the Garage section of the rail, add a built-in product or an imported asset as an
     extra object in the scene.
  2. A running triangle counter (main product plus every visible added object): the rail warns
     above 700,000 and refuses an add that would take the total over 1,000,000
     (`OBJECT_LIMITS` in `sceneObjects.js`; exactly 700,000 does not warn, exactly 1,000,000
     is allowed).
  3. At most 5 added objects (`MAX_ADDED`); a 6th is refused.
  4. A new object is placed beside the main product, with its base on the floor, overlapping
     neither the main product nor any other added object (`placeObject`, a deterministic
     separating-axis rule, gap 0.15 m).
  5. An added object is edited only as a whole object (never per part), with uniform scale
     only. In the Garage selection it is `{ itemId, partId: "object~0" }` (`OBJECT_PART_ID`).
  6. Showing a hidden object is refused if it would take the total over the budget
     (`checkUnhide`).
  7. One scene: the turntable, the camera presets, and the Reel and PNG framing all include the
     added objects. (This replaces design decision 3 above, "no turntable with several
     objects", for added objects.)
  8. Switching the main product with added objects in the scene asks "Remove N added
     objects?"; Cancel changes nothing, OK removes them and switches.
  9. Adding and removing an object are one undo step each.
  10. Added objects never appear in, and are never affected by, the Materials panel.
- **Approved STOPs** (changes outside the planned files, approved by the owner before they
  were made):
  1. An additive confirm guard in `App.jsx` (`confirmProductSwitch`) that covers every
     product-switch path: the model chips, the Asset Library, and Restore Studio Session.
  2. The pre-existing whole-model Transform panel now moves the main product AND the added
     objects together, because the added objects live inside the turntable pivot group.
- **Verification (owner facts; the harness and its output are not in the repo).** The first
  session's browser checks were blocked by low RAM (the owner's machine has 4 GB). After a PC
  restart with only VS Code open, all checks a-n passed (the letters are the owner's own
  checklist; its individual items are not in the repo: unverified here). Removing an added
  object returns `renderer.info` geometries/textures and the exported PNG sha256 exactly to the
  baseline, including when a copy of the main product itself was added. Real-GPU FPS (Intel HD
  5500, Edge): THE KOP MAIN alone 15.19; plus a Cessna 12.97; plus a second THE KOP MAIN 9.97.
  With no added objects, exports are byte-identical to the original code (from `vite build`
  output: coffee-bike `25cb7940...`, 1,347,129 bytes; the-kop-main `8bab6356...`, 1,354,463
  bytes; these differ from the G8 hashes above because those came from the dev server, and
  build output differs from dev output).
- **A pre-existing finding (not caused by G7a).** A PNG export can fire before the
  environment backdrop texture has loaded: the `TextureLoader` in `StudioStage` has no ready
  gate, and Capture Shot has no disabled state. Real users are covered by the loading
  overlay; scripted clicks are not. It produced one bad test frame. Planned for the cleanup
  slice (see "Next slices").
- **Owner-tested** (owner facts, in his browser, separate from what the repo's node tests
  prove): added a Cessna, moved it and undid, camera presets, the turntable, a PNG export, the
  switch confirm with Cancel and with OK, and an F5 refresh. All as expected.

`app/scripts/test-garage-objects.mjs` (236 lines) prints 84 PASS lines, 0 FAIL, exit code 0,
ending with `ALL CHECKS PASSED (84 PASS)` (run and counted for this update; the owner's own
count matches).

### G7b - layouts save and load added objects, `formatVersion` 2 (commit `3ef75ff`)

Touches 5 files (`git show --stat 3ef75ff`, 801 insertions, 48 deletions):
`app/src/garage/layoutLibrary.js` (210 lines changed), `app/src/garage/garageStore.js` (44),
`app/src/components/StudioCanvas.jsx` (163), `app/src/ui/InspectorRail.jsx` (83) and a new
test script `app/scripts/test-garage-layouts-v2.mjs` (349 lines).

- **Owner-approved decisions.**
  1. Every save writes `formatVersion` 2: the main product's per-part overrides (the `layout`
     field, exactly as in format 1) plus an `objects` array with one entry per added object:
     `{ assetId, source ("builtin" | "imported"), name, transform: { x, y, z, rx, ry, rz, s },
     hidden }`.
  2. Loading replaces the added objects (never merges) and is exactly one undo step.
  3. Objects whose asset is not in this browser are skipped and counted in the load message.
  4. A load that would exceed 1,000,000 triangles or 5 objects is refused whole, with nothing
     changed.
  5. `formatVersion` 1 layouts (G8) still load, parts only; added objects are left untouched.
  6. The wrong-product refusal is unchanged.
  7. A `formatVersion` 2 envelope without an `objects` array is rejected as `"bad-version"`
     (`parseEnvelope`).
- **Approved STOP.** The stage could only draw objects it had loaded itself, and an object's
  triangle count is unknown until it is loaded. So the owner approved an additive
  `loadObjects()` method in `StudioCanvas.jsx`, a pending-object list in `syncObjects`
  (`pendingListRef`), and an additive single-commit store action,
  `garageStore.loadLayoutItems(itemId, parts, objects)` (no existing command changed).
  Approved conditions: the max-5 check happens before anything is loaded; objects load one
  at a time, and the load aborts as soon as the running total exceeds 1,000,000, releasing
  everything loaded so far (`loadBudgetStep`); a product change, or another add or load
  starting, cancels the load and commits nothing; a file that fails to load counts as skipped.
  Also approved as built: hidden objects do not count toward the budget (checked when shown);
  the max-5 check counts every object in the file, including ones that are later skipped;
  "busy" guards while an object is loading; and a "The Asset Library is still loading; try
  again in a moment." message instead of reporting objects as falsely skipped.
- **Verification (owner facts; the harness and its output are not in the repo).** The Step 1
  baseline WAS captured with the original code before the first edit (01:49-01:59 IST; first
  edit 01:59:51). All checks passed, including re-runs of G7a checks d, e and f, both abort
  cases, and memory returning to the baseline after a refused load.
- **Owner-tested** (owner facts, separate from what the repo's node tests prove): saved a
  layout with an added object, pressed F5, loaded it, and the object and its colour came back;
  one Undo removed both; an old G8 (format 1) layout still loads on THE KOP MAIN. All as
  expected.

`app/scripts/test-garage-layouts-v2.mjs` (349 lines) prints 119 PASS lines, 0 FAIL, exit code
0, ending with `ALL CHECKS PASSED (119 PASS)` (run and counted for this update). The owner
separately ran all eleven node test scripts himself after G7b: `test-path` 192,
`test-backdrop` 84, `test-garage` 161, `test-garage-store` 219, `test-garage-select` 67,
`test-garage-part-edit` 65, `test-garage-refit` 55, `test-garage-color` 60,
`test-garage-layouts` 64, `test-garage-objects` 84, `test-garage-layouts-v2` 119, all 0 FAIL.

### G11 - 3D `TransformControls` gizmo (commit `56d2e3b`)

Touches 4 files (`git show --stat 56d2e3b`, 1,128 insertions, 1 deletion): a new pure module
`app/src/garage/gizmo.js` (324 lines; no three.js, no DOM, no React), `app/src/components/
StudioCanvas.jsx` (274 lines changed), `app/src/ui/InspectorRail.jsx` (66) and a new test
script `app/scripts/test-garage-gizmo.mjs` (465 lines). `app/src/garage/garageStore.js` was not
changed. three's own `TransformControls` is used directly (its helper added via `getHelper()`);
it is created only while a gizmo shows and disposed on deselect.

- **Owner-approved decisions.**
  1. The gizmo appears only when exactly one visible thing is selected: a main-product part
     with Parts on, or an added object (`gizmoTarget`).
  2. Move / Rotate / Scale buttons in the rail plus W / E / R shortcuts (`MODE_KEYS`). They
     were implemented because Step 0 found no existing W/E/R handlers (only Escape and Enter).
     The shortcuts are ignored with Ctrl / Meta / Alt, while typing in an input, and mid-drag
     (`shortcutMode`).
  3. Scale follows the field rules: uniform for added objects, minimum 0.05 (`MIN_SCALE`).
  4. A World / Local toggle, default World. (By the code, a scale drag always uses the object's
     own axes: `effectiveSpace` returns `"local"` for scale.)
  5. An optional Snap, default off: 0.05 m, 15 degrees, 0.1 scale (`SNAP`).
  6. One drag is one undo step through the `garageStore` gesture API
     (`createDragSession`); the numeric fields update on release.
  7. The gizmo is never in PNG or Reel exports (the export path hides the helper named
     `garage-gizmo` and restores it afterwards), and it is hidden while the turntable plays or
     an export runs.
  8. The gizmo never moves the camera: OrbitControls is disabled only while a handle is held.
  9. The refit (G5) runs once, on release.
  10. Pressing a handle never changes the selection.
  11. Esc mid-drag cancels exactly: the pre-drag pose comes back and there is no undo entry.
- **A bug found and fixed during G11.** Pressing the uniform-scale cube near its centre made
  `TransformControls` compute absurd scales (21,174,888 was seen on an added object). The
  owner-approved fix clamps gizmo scale drags to 0.05-100 in `gizmo.js` only (`MAX_SCALE` =
  100, `clampScale`). The numeric fields still have no maximum (a candidate for the cleanup
  slice). A dead-centre press on the cube can still jump straight to 100 or 0.05
  (`TransformControls` flips the sign when the drag passes the centre); it is capped and
  undoable.
- **Known quirk: the pivot.** A part's gizmo sits at the part's own origin, the same pivot the
  G4 numeric fields use. On many parts that is the model origin, so the gizmo can appear away
  from the part (the owner saw this in his click test). Moving the pivot to each part's centre
  is a possible future improvement.
- **Verification (owner facts; the harness and its output are not in the repo).** Low RAM
  blocked the before-edit browser baseline, so a `git archive HEAD` copy was built at 16:24:23
  IST, before the first edit at 16:27:03. ORIGINAL = CURRENT exported PNG sha256 in all 12 runs
  (dev-server output: coffee-bike `2b93e56c...`, 1,793,537 bytes; the-kop-main `3fc2abaf...`,
  2,018,888 bytes; dev-server hashes, so they are not comparable with the G7a build hashes).
  All checks a-p passed (the owner's own checklist; its individual items are not in the repo:
  unverified here). Real-GPU FPS (Edge headless, Intel HD 5500, THE KOP MAIN): 10.98 with
  nothing selected, 8.92 with the gizmo visible.
- **Unverified (reported by the agent that built G11).** Ignoring Ctrl / Meta / Alt is checked
  by the node tests only; the typed-back round trip (drag, then type the value back into a
  field) was tested for the position fields only; browser checks b-o ran on the Coffee Bike
  only; object snap is checked in node only; the Reel check used the export frame hooks, not
  a full MP4 file.
- **Owner-tested** (owner facts, in Edge, separate from what the repo's node tests prove): the
  gizmo appears on a selected part; move and rotate drags with Undo; Esc mid-drag snaps back; a
  PNG captured while the gizmo and the selection outline were showing contains neither; the
  gizmo hides during the turntable preview; an added Cessna scales uniformly; orbit works
  afterwards. All as expected.

`app/scripts/test-garage-gizmo.mjs` (465 lines) prints 102 PASS lines, 0 FAIL, exit code 0,
ending with `ALL CHECKS PASSED (102 PASS)` (run and counted for this update; the owner's own
count matches). The owner separately ran all twelve node test scripts himself after G11:
`test-path` 192, `test-backdrop` 84, `test-garage` 161, `test-garage-store` 219,
`test-garage-select` 67, `test-garage-part-edit` 65, `test-garage-refit` 55,
`test-garage-color` 60, `test-garage-layouts` 64, `test-garage-objects` 84,
`test-garage-layouts-v2` 119, `test-garage-gizmo` 102, all 0 FAIL.

### Cleanup slice - old outline out of exports, export lock, backdrop gate, Coffee Bike chip, scale max 100 (commit `8a370eb`)

Touches 7 files (`git show --stat 8a370eb`, 602 insertions, 41 deletions): a new pure module
`app/src/capture/exportGate.js` (140 lines; no three.js, no DOM, no React), `app/src/
components/StudioCanvas.jsx` (84 lines changed), `app/src/ui/InspectorRail.jsx` (48),
`app/src/ui/TopHeader.jsx` (14), `app/src/components/StudioControls.jsx` (14), `app/src/ui/
AssetLibrary.jsx` (2, the Coffee Bike chip fix) and a new test script `app/scripts/
test-cleanup.mjs` (341 lines). This is Garage G9 plus the export-lock and backdrop items left
open in "Next slices" after G11.

- **Owner-approved decisions** (`exportGate.js`'s own numbering).
  1. PNG exports stop including the gold whole-model selection outline and footprint ring
     (G9): `CaptureBridge`'s capture function now hides four named scene objects for the
     synchronous export render and restores them afterward - the part overlay, the gizmo
     helper, the outline (its literal name `"selection-outline"` became the shared constant
     `OUTLINE_NAME`) and a new `RING_NAME` (`"selection-ring"`, now set as the footprint ring
     mesh's `name`). `EXPORT_HIDDEN_NAMES` lists all four; a Reel export already hid the
     outline and ring through `setOverlaysHidden`, so this closes the PNG-only gap.
  2. **The export lock.** `withExportLock(store, fn)` calls `garageStore.setLocked(true)`
     before `fn` runs and releases it in a `finally`, so it always releases: on success, on a
     throw or rejection, and on a cancelled export. Only a call that actually acquired the lock
     releases it (`r.ok && r.changed`), so it never steals a lock someone else holds. Wired at
     both PNG capture (`CaptureBridge`) and Reel export (`InspectorRail`'s
     `handleExportClick`); `GarageSection`'s existing `busy` prop now also reads
     `garageState.locked`, so Garage edits are refused for the length of either export. On
     stage unmount mid-export (a product switch), the cleanup effect calls
     `garageStore.setLocked(false)` when `finishExport` reports it actually aborted a live
     export, so a lock never survives past the export that set it.
  3. **The backdrop gate.** A small state machine (`BACKDROP_STATUS`: `loading` / `ready` /
     `failed` / `none`) tracks the current environment's backdrop load, with a token per load
     attempt so a late result from an environment or product already switched away is ignored.
     Every export button (Capture Shot, header Export, rail Export PNG, rail Export Reel)
     disables itself and shows "Loading backdrop..." (`GATE_LABEL`) while `loading`; `failed`
     never blocks exports (a `console.warn` plus a rail warning, `BACKDROP_FAILED_WARNING`,
     "The backdrop photo could not be loaded. Exports will not include it."); an environment
     with no photo file is `none` and ready at once. This closes the pre-existing G7a finding
     that an export could fire before the backdrop had loaded.
  4. **The Coffee Bike filter chip.** `AssetLibrary.jsx`'s `matchesFilter` now also matches
     `item.id === "the-kop-main"` under the `"coffee"` filter, so THE KOP MAIN lists alongside
     Coffee Bike (Open Issue 16).
  5. **Scale max 100.** `clampFieldScale(n)` clamps to `[MIN_SCALE, MAX_SCALE]` (0.05 to 100,
     importing the gizmo's own constants so the two caps can never drift apart); `NaN` or a
     non-number returns `MIN_SCALE`. Used by every Garage numeric scale field: the per-part
     axis and uniform scale fields (`GarageEditFields`) and the added-object uniform scale
     field (`GarageObjectFields`) - previously they only floored at 0.05 with no ceiling (the
     "no maximum" item left open at G11).
- **Not touched:** `garageStore.js` itself (its existing lock primitive is now only called from
  `exportGate.js`); the gizmo's own `MAX_SCALE`/`MIN_SCALE` values (reused, not changed); G10
  (virtual parts, still not started).
- **Verification.** `node scripts/test-cleanup.mjs` prints 109 PASS lines, 0 FAIL, exit code 0,
  ending with `ALL CHECKS PASSED (109 PASS)` (the 13th node test script; run and counted for
  this documentation update). No browser/PNG verification for this commit is recorded in the
  repo; lint and build were not run for this documentation update.

### M0 - real size and the measure tool (commit `2a6cd74`)

Touches 4 files (`git show --stat 2a6cd74`, 915 insertions, 17 deletions): a new pure module
`app/src/garage/measure.js` (275 lines; no three.js, no DOM, no React, in the pattern of
`gizmo.js`), `app/src/components/StudioCanvas.jsx` (231 lines changed), `app/src/ui/
InspectorRail.jsx` (230) and a new test script `app/scripts/test-measure.mjs` (197 lines).

- **Owner-approved decisions 1-7** (`measure.js`'s own numbering; UI in `InspectorRail.jsx`).
  1. The rail's Size line shows W x H x D for the selected part or added object: real units
     once calibrated (for example "132.1 x 55.9 x 55.9 cm"), else the existing "(model units,
     real size unknown)" fallback (`formatSize`). Size is now read from a MODEL-local box
     (`modelUnitBox`, relative to `modelScene`) instead of the mesh's world box, so it excludes
     the whole-model Transform panel's position/rotation/scale and the turntable pivot groups.
     `describeMesh`'s only consumer is the Garage rail read-out (verified with a repo-wide
     search for this update).
  2. **Set real size:** pick an axis (Width/Height/Depth) and type a real length in cm or in;
     `deriveCalibration` divides that length (in metres) by the chosen axis's current
     model-unit size to get one `metersPerModelUnit` factor for the whole model. Validation:
     the length must be greater than 0 and at most `MAX_REAL_LENGTH_M` (100 m), and the chosen
     axis must be larger than `MIN_AXIS_MODEL_UNITS` (1e-6) - each rejected with its own
     message, with nothing saved.
  3. **"File is in metres"** (`markAsMetres`): a one-click shortcut that writes a calibration of
     exactly 1 (1 model unit = 1 m), the same storage shape as Set real size.
  4. Calibration is stored PER MODEL, on this device, in `localStorage` under
     `sos-units:<assetId>` (`calibrationKey`), for built-in and imported assets alike - the same
     asset calibrated once covers every part of it and every place it is added to the scene.
  5. Not part of undo, and not saved in Garage layouts: calibration is a device-level fact about
     a model, not a scene edit, so it is written straight to `localStorage`
     (`writeCalibration`, bypassing `garageStore` entirely) and is invisible to
     `layoutLibrary.js`'s save/load.
  6. **Reset real size** (`clearCalibration`) removes the stored calibration; the Size line and
     the measure label fall back to the model-units string immediately.
  7. Real size is a label only: no geometry, transform, or export is affected by calibrating -
     only what the rail and the measure label print changes.
  8. **cm/in toggle** (`GarageUnitsToggle`, storage key `sos-units-display`, default `"cm"`): one
     global chip pair drives every Size line and the measure label alike, since both read
     `measure.js`'s live `unit` field from the one shared store instance.
  9. **The measure tool** (`GarageMeasureSection`, a `garage-measure` scene-root group): a
     "Measure: on/off" toggle; the first click on a visible surface (the main product or any
     added object, regardless of the Parts switch) sets point A, the next sets point B and
     draws a line plus a floating distance label at the midpoint; a third click starts a fresh
     pair. Clicking while Measure is on never selects a part (checked before the part-selection
     raycast). The tool is hidden while the turntable plays or an export runs (folded into the
     existing `setOverlaysHidden`) and is separately listed in `EXPORT_HIDDEN_NAMES` for PNG
     captures, so it is never in an export. Esc clears the current pair without turning Measure
     off; the pair is also cleared on a product switch. The label always uses the MAIN
     product's own calibration and divides out only the whole-model Transform panel's uniform
     scale.
- **Not touched:** `garageStore.js`, `layoutLibrary.js`, `gizmo.js` (its `MIN_SCALE`/`MAX_SCALE`
  are only imported, not changed), the undo/redo history.

#### M0 evidence summary (owner facts; the harness and its output are not in the repo)

- PNG export sha256 was identical between the ORIGINAL code and the current code for both
  Coffee Bike and THE KOP MAIN, across 3 repeats each.
- A PNG exported after calibrating a model and after drawing a measure line was unchanged from
  a PNG exported before either action (the measure group and its label sprite are excluded from
  every export, per Decision 9 above).
- `renderer.info` (geometries/textures) showed no growth across repeated calibrate/measure
  cycles.
- Invalid inputs were refused: a zero or negative real length, a length over 100 m, and
  calibrating from an axis at or below `MIN_AXIS_MODEL_UNITS`.
- The owner's own click test passed on 26 Sep.

**Verification.** `node scripts/test-measure.mjs` prints 62 PASS lines, 0 FAIL, exit code 0,
ending with `ALL CHECKS PASSED (62 PASS)` (the 14th node test script; run and counted for this
documentation update). Lint and build were not run for this documentation update.

### Slice plan

| Slice | What | Status | Owner approval needed when reached |
|---|---|---|---|
| G1 | Pure functions plus node tests | **Done** (`6226ba2`) | no |
| G2 | The store (`garageStore.js`) | **Done** (`3b7d9fb`) | no |
| G3 | Part selection by click | **Done** (`3527c6c`) | **yes** (what a click means) - given |
| G4 | Per-part move / rotate / scale / hide, exact reset and undo | **Done** (`d278ef3`) | no |
| G5 | A refit event (`liveFit`) so floor, shadow, presets and Reel follow moved parts | **Done** (`e829e1b`) | **yes** (presets follow moved models) - given |
| G6 | Per-part colour | **Done** (`86f445e`) | **yes** (touches the materials store) - given |
| G7a | Add objects from the library (place, edit, remove; triangle budget; switch confirm) | **Done** (`12ef43b`) | **yes** (budget, placement, switch confirm, and two STOPs) - given |
| G7b | Layouts save and load added objects (`formatVersion` 2) | **Done** (`3ef75ff`) | **yes** (format 2 rules and one STOP) - given |
| G8 | Save and load layouts | **Done** (`15c1995`) | no |
| G9 | Exclude the outline and ring from exports | **Done** (`8a370eb`, as part of the Cleanup slice) | **yes** (PNGs lose the outline and ring) - given |
| G10 | Virtual-part split | not started | no |
| G11 | TransformControls gizmo | **Done** (`56d2e3b`) | **yes** (gizmo rules and the scale cap of 100) - given |

Suggested order (from the report): G1, G2, G3, G4, G5, G6, G8, G7, G9, G10, G11. Each slice
is independently shippable. Done so far, in that order: G1-G6, G8, G7a, G7b, G11, G9 (G11 and
G9 were both built out of order - G11 before G9, and G9 as part of the Cleanup slice,
`8a370eb`); G10 is not started.

### How to verify

From `app`: `node scripts/test-path.mjs` (192 PASS lines), `node scripts/test-backdrop.mjs`
(84 PASS lines), `node scripts/test-garage.mjs` (161 PASS lines), `node scripts/
test-garage-store.mjs` (219 PASS lines), `node scripts/test-garage-select.mjs` (67 PASS
lines), `node scripts/test-garage-part-edit.mjs` (65 PASS lines), `node scripts/
test-garage-refit.mjs` (55 PASS lines), `node scripts/test-garage-color.mjs` (60 PASS
lines), `node scripts/test-garage-layouts.mjs` (64 PASS lines), `node scripts/
test-garage-objects.mjs` (84 PASS lines), `node scripts/test-garage-layouts-v2.mjs` (119 PASS
lines), `node scripts/test-garage-gizmo.mjs` (102 PASS lines), `node scripts/test-cleanup.mjs`
(109 PASS lines), `node scripts/test-measure.mjs` (62 PASS lines). Count the lines that start
with PASS. Observed when this section was written: 192, 84, 161, 219, 67, 65, 55, 60, 64, 84,
119, 102, 109 and 62, no FAIL lines (run and counted for this documentation update; the first
twelve match the owner's own count after G11). Fourteen scripts now (13 -> 14 with this
update: the Cleanup slice added `test-cleanup.mjs` as the 13th, M0 adds `test-measure.mjs` as
the 14th); their PASS lines sum to 1,443. Lint and build were not run for this documentation
update.

| Script | PASS lines |
|---|---|
| `test-path.mjs` | 192 |
| `test-backdrop.mjs` | 84 |
| `test-garage.mjs` | 161 |
| `test-garage-store.mjs` | 219 |
| `test-garage-select.mjs` | 67 |
| `test-garage-part-edit.mjs` | 65 |
| `test-garage-refit.mjs` | 55 |
| `test-garage-color.mjs` | 60 |
| `test-garage-layouts.mjs` | 64 |
| `test-garage-objects.mjs` | 84 |
| `test-garage-layouts-v2.mjs` | 119 |
| `test-garage-gizmo.mjs` | 102 |
| `test-cleanup.mjs` | 109 |
| `test-measure.mjs` | 62 |
| **Total** | **1,443** |

### Verification harness notes

Learned while verifying G8 (owner facts; the harness itself is not in the repo):

- **Switching products in an automated browser.** The model chips' `data-testid` sits on a
  non-interactive wrapper `div`. Click the nested `.sos-asset` button instead, then confirm
  it has `data-active="true"` before measuring anything.
- **Downloads in headless Chromium.** In `headless=new` Chromium, OS downloads reach full
  size and then cancel. The working method is to capture the blob in the page by wrapping
  `URL.createObjectURL`.
- **Identity check.** Use the exported PNG's sha256 as the "nothing changed" check between
  the ORIGINAL code and a slice. The on-screen canvas hash is supporting evidence only: it
  varies across repeats of coffee-bike's default view even on unchanged code. Take the
  ORIGINAL baseline before editing (for example `git archive HEAD` into a scratchpad copy).

Learned while verifying G7a and G7b (owner facts; the harness itself is not in the repo):

- **The lean method when the dev server needs too much RAM.** Run `vite build` on each tree
  (ORIGINAL and the slice) and serve the build output with a small Node static server, one
  tree at a time, instead of running dev servers. Build output hashes differ from dev-server
  hashes, so compare build with build.
- **Before every export, wait for the backdrop texture AND the loading screen.** A scripted
  export can otherwise fire before the environment backdrop has loaded (see G7a,
  "pre-existing finding").

Learned while verifying G11 (owner facts; the harness itself is not in the repo):

- **Do not update or reload VS Code during a session.** A VS Code window reload (for example
  from clicking VS Code's Update button) interrupts a running agent.
- **After a background run, the agent may not wake itself.** The owner nudges it to check its
  log.

Learned while verifying the Cleanup slice and M0 (owner facts; the harness itself is not in the
repo):

- **Agents skip the pre-edit baseline.** The fallback is a clean-`HEAD` build (`git worktree`
  or `git archive`) used as ORIGINAL, built before the first edit.
- **The identity check is the exported PNG's sha256, not the on-screen canvas hash.** The
  canvas hash is non-deterministic across repeats even on unchanged code (see "Learned while
  verifying G8" above); this recurred and is worth repeating here.
- **Build and scratch folders go OUTSIDE the repo.**
- **A VS Code reload interrupts a running agent** (see "Learned while verifying G11" above;
  this recurred).
- **Low RAM blocks browser checks.** Restart the machine with only VS Code open before running
  browser verification (see "Learned while verifying G7a" above; this recurred).
- **A long one-line PowerShell paste can crash PSReadLine in a small terminal.** Make the
  terminal taller, or use shorter commands, to avoid it.

### Next slices

- **G11 - 3D `TransformControls` gizmo** is done (`56d2e3b`).
- **The cleanup slice is done (`8a370eb`):** G9 (the old gold outline and ring out of exports),
  the export lock wired to both PNG and Reel export, the backdrop gate (the pre-existing
  finding under G7a), the Asset Library "Coffee Bike" filter chip fix (Open Issue 16), and a
  maximum scale of 100 on the numeric scale fields. See "Cleanup slice" above. Still open: a
  gizmo pivot at each part's centre instead of the part's origin (see G11, "Known quirk").
- **M0 (real size and the measure tool) is done (`2a6cd74`).** See "M0" above.
- **Next: G10** (virtual parts: the virtual-part split).

## Products and models

### The three built-in products (`app/src/products/registry.js`)

| id | Label | Model file | `frontAz` | Why (registry comments) |
|---|---|---|---|---|
| `coffee-bike` | Coffee Bike | `/models/the_kop_refined.glb` | -90 | The coffee cart and branding face -X in this asset |
| `cessna-172` | Cessna 172 | `/models/cessna-172-tripo.glb` | 0 | The nose points +Z; azimuth 0 is the camera on the +Z side, so +Z is "Front" |
| `the-kop-main` | THE KOP MAIN (name "THE KOP Coffee Bike (MAIN)") | `/models/the-kop-main.glb` | 90 | The THE KOP sign plates sit on the +X face of "Cabinet carcass" (the bike itself runs along z); azimuth 90 is the camera on the +X side, so "Front" shows the sign side |

### THE KOP MAIN (commit `97dd1ac`, 3 files)

- The commit adds `app/public/models/the-kop-main.glb`, one registry entry, and a data-only
  change in `app/src/ui/content.js` (`PRODUCT_CATEGORY` "Retail mobility · hero" and
  `PRODUCT_ICON` "bike" for `the-kop-main`). The `coffee-bike` entry is unchanged. No
  component changed.
- The file (checked for this update): 23,176,392 bytes, sha256
  `f3df6f5a5cc2468df760bb89755e610a712b37770f808e3524bf57b42737ac8d`. Read with a Node
  script from its JSON chunk: 756 nodes, 753 mesh nodes, 629 meshes, 18 materials, 3 texture
  entries over 2 images, generator "Khronos glTF Blender I/O v5.2.40", no extras and no
  copyright field. Triangles: 483,311 counted per node, 473,391 counting each mesh once. The
  largest single mesh is "Temporary descriptor" with 18,900 triangles. Extensions used:
  `KHR_materials_clearcoat`, `KHR_materials_transmission`, `KHR_materials_ior`. The material
  named "Material" has a clearcoat factor of 3 in the file (outside the glTF range 0 to 1).
  How the loader and the app react to it is untested.
- The registry comment says the 98 bike pieces are named `tripo_part_N`, which suggests a
  Tripo origin. That is an inference from the names; the owner confirms the origin and the
  terms of use (unchecked here). The file carries no author or licence.
- Units are unstated (the glTF standard says metres, unverified). The node "Cabinet carcass"
  is 1.35 long (registry comment); against the real cart box of 52 x 22 x 22 inches that is
  within about 2 percent of 52 in if the units are metres (unverified).
- The sign parts are named "Temporary ..." and were left as they are.
- Git history: the 23 MB `the-kop-main.glb` is now in git history for good, even if the file
  is later removed.
- `app/src/ui/AssetLibrary.jsx` (`matchesFilter`) shows the "Coffee Bike" filter chip by
  `item.id === "coffee-bike"`, so THE KOP MAIN does not appear under that chip. Its
  category text ("Retail mobility · hero") matches no other chip either, so by the code it
  shows only under All and Built-in (read from the code, not run in a browser). The Aircraft chip tests `cessna-172` by id the same way.
- The app-stored MAIN test import in the owner's browser (a custom asset) is separate from the
  built-in product; the owner was told to delete it.

### Owner test of MAIN (owner facts, on his own PC, headed Edge)

- The MAIN file imported as a custom asset loaded and rendered in the app; orbiting was
  smooth; the 4 s Turntable was smooth; a 4 s Reel export took about as long as with the old
  bike. He accepts the look of the bike.
- The Reel came out small when the Distance slider had been left above 100 percent (the Reel
  distance is multiplied by the Distance slider) and about a third of the frame width with
  Distance at 100 percent, standing on the Pistons Loft platform.
- After the built-in product was added he reported that the Front and the other camera
  presets, the Reel PNG on Pistons Loft, and the Coffee Bike and Cessna 172 all looked right.
- Not reported: whether clicking to select the 753-part model felt smooth.

### Downloads check (from a read-only report, not in the repo; not re-verified by this update)

Files in `C:\Users\User\Downloads`, produced in another session:

- `THE_KOP_coffee_bike_MAIN.glb` (23,176,392 bytes, sha256 begins `f3df6f5a`, the same start as
  the repo file; seven copies and `THE_KOP_verification_v1` are byte-identical): 756 nodes, 753
  mesh nodes, 629 meshes, 18 materials (17 named), 2 PNG textures of 2048 x 2048, 483,311
  triangles per node (473,391 in unique meshes), generator Blender I/O v5.2.40, no extras or
  licence. (The repo read above agrees on the counts and the generator.)
- 87 percent of node names are meaningful (for example "Cabinet carcass", "Stainless
  countertop", 12 "Espresso / ..." nodes, "Grinder / ...", cups, sidecar tyre and spokes); 98
  bike pieces are named `tripo_part_N` and share one generic textured material.
- The sign parts are named "Temporary KOP wordmark" and "Temporary descriptor", and the sign
  text is complete in this file (in `the_kop_refined.glb` it is clipped). The parts look
  assembled and upright. "Cabinet carcass" is the best match for the real cart box.
- The BYTEBIRD-c172 files: three distinct files (one uncompressed with 26 white materials, one
  uncompressed with 12 colour-role materials, vertex colours and variants, and one
  Draco-compressed that could not be read), 26 named parts, 14,112 triangles, assembled, nose
  along -X in the file, nose wheel about 0.27 units higher than the main wheels; no licence or
  author in any of them.
- Other Downloads files (a 60 MB 12-part plane with 1.95 million triangles, a wheel with
  350,753 vertices, and others) are too heavy to use in the app.

### Weight of MAIN (from a read-only report, not in the repo; sums computed from the file, nothing rendered)

- The 98 `tripo_part` pieces carry 270,091 triangles (55.9 percent); without them the file is
  still 213,220 triangles.
- Only one mesh (the coffee bean, 80 triangles, 125 nodes) is instanced; 43 sets of
  byte-identical meshes (tyre treads, drip-grate holes, spokes) are stored as separate meshes.
- The sidecar wheel is 10.9 percent; the espresso machine and grinder together about 1.3
  percent; the sign descriptor plate alone is 18,900 triangles (also seen in the repo read).
- Textures are about 42.6 MiB of GPU memory by estimate (unverified).
- The report judged that no slimming scenario comes near the shipped bike's budget
  (180,291 triangles, 8 draw calls). MAIN is 753 draw calls by mesh-node count.

## Known Camera Bugs

Resolved: **CAM-001** (camera presets ignored a transformed model) and **CAM-002**
(Top preset elevation, see "Resolved" below).

- **CAM-001** was fixed by the Garage G5 refit event as a side effect (see "Phase 18
  - Garage", G5, for detail): exact for translation and uniform scale of the whole
  model; rotation about the x or z axis is only approximately handled, not fully
  solved.

## Current Studio Status

| Module | Status | Note |
|---|---|---|
| Studio Canvas | Complete | r3f canvas with orbit, transform, capture, on-demand shadows and HDR/probe lighting (`components/StudioCanvas.jsx`). |
| Asset Library | Complete | Registry-driven product/environment gallery plus GLB/HDR/EXR import manager (`ui/AssetLibrary.jsx`, `ui/ImportPanel.jsx`). |
| Camera Studio | Partial | Presets and Save Custom View work. Phase 16A Slice A (`a23e3d0`): the rail's Distance and Height sliders are live, with a "Custom (unsaved)" state. Phase 16A Slice B (`3c05965`): Lock focus is a real toggle (ON by default; the orbit target follows the transformed model, right-drag pan is off while ON) and the live camera is saved in the session. See "Phase 16A Slice A/B" and "Known Camera Bugs". |
| Material Studio | Complete | Live PBR editing, presets, undo/reset, persistence and session capture (`materials/`, `ui/MaterialsManager.jsx`). |
| Render Studio | Partial | PNG capture/export with format chips works. Phase 16B (`0b7c2ce`): a 1080x1920, 30 fps, silent MP4 Reel export of the Turntable from the rail's Animate section; portrait and square exports (PNG and Reel) crop the backdrop instead of squashing it (`1e6077a`); the Reel MP4 puts the model on the painted platform on Pistons Loft and Aviation Hangar (`ea2482c`); portrait and square social PNGs use the Reel framing (`936f6d5`); the Cessna 172 is the Tripo model (`d6b3cfa`). See "Phase 16B". |
| Loading Screen | Complete | Real GLB progress via drei `useProgress` (see Known Limitations for the environment-switch flash). |
| HDRI Environment Library | Partial | 2 of 11 environments have a real HDR; the other 9 use the probe plus a flat JPG. |
| Animation Studio | Partial | Phase 16B (`c99fd69`, `f25d884`, `c936232`, `0b7c2ce`, `ea2482c`, `936f6d5`): Turntable preview and Reel export work (the model spins; the camera is fixed). No GLB animation mixer, no camera moves UI, no saving in sessions. See "Phase 16B". |
| Garage (scene editor) | Partial | Slices G1-G8, G11, the Cleanup slice (G9) and M0 are done (G7 as G7a `12ef43b` and G7b `3ef75ff`; G11 `56d2e3b`; Cleanup `8a370eb`; M0 `2a6cd74`, the latest): part selection by click behind a Parts switch, per-part move/rotate/scale/hide with exact reset and undo, the refit event, per-part colour, save/load of named layouts, adding up to 5 objects under a 1,000,000-triangle budget, layouts that save the added objects (`formatVersion` 2), a 3D `TransformControls` gizmo, exports that exclude the old outline/ring and wait for the backdrop, an export lock, and per-model real-size calibration with a cm/in toggle and a two-point measure tool. G10 (virtual parts) is not started. See "Phase 18". |
| Products | 3 built-in | Coffee Bike, Cessna 172, THE KOP MAIN (`97dd1ac`, heavy: 483,311 triangles). See "Products and models". |

Status is judged from code reading, not from a fresh browser run in this update.

## Open Issues (Next Phase)

1. Camera Studio: Distance, Height (Slice A, `a23e3d0`) and Lock focus plus session capture of the live camera (Slice B, `3c05965`) are live; CAM-002 is fixed (`1a15c38`); CAM-001 is fixed as of Garage G5 (exact for translation and uniform scale of the whole model, rotation about the x or z axis only approximately handled), see "Phase 18 - Garage", G5.
2. Animation Studio: Turntable preview and Reel MP4 export are live, and the Reel puts the model on the platform on Pistons Loft and Aviation Hangar (Phase 16B, through Slice E3; the three social PNG presets use the same framing, `936f6d5`). Open: platform data for the other nine environments (they still float), an in-app video preview (Slice D2), camera moves and session saving; see "Phase 16B".
3. Reel/MP4 export is built (1080x1920, 30 fps, silent) and Instagram accepted an exported file (owner-tested); how it looks inside Instagram is untested.
4. THE KOP branding renders clipped ("THE KOF") in every export. The Phase 17A audit found the Coffee Bike GLB has no textures, so it is in the geometry, not a texture (glyph clipping itself unverified; see "Phase 17A audit findings").
5. Blender: CAM_Shot01_LowHero still requires repair (aimed at nothing). Blender work is frozen.
6. Materials panel (owner-tested, causes not investigated): "Reset this material" appeared to do nothing on a near-white edit of Paint_Burgundy_Gloss (a hard refresh plus "Reset entire model" restored it); in the hex field, typing then deleting characters snaps back to the old value (use Ctrl+A and paste a full code).
7. A near-white colour on a vertex-coloured material looks bright pink, consistent with the picked colour multiplying the vertex colours (unverified).
8. A gold ring appeared around the plane in one 9:16 PNG and not in another; cause unverified (possibly the selection ring; the Reel MP4 hides it, the PNG path was not checked).
9. The other nine environments have no platform data: the Reel and social PNGs centre the model but it floats there.
10. The new Cessna has garbled baked lettering on the fuselage, and its Tripo plan's terms for commercial publication are unchecked. The owner plans to replace it with a final model.
11. The Reel distance is multiplied by the Distance slider % (252 % makes the Reel plane much smaller; 100 % fills about half of the frame).
12. The "Garage" scene editor (per-part move / rotate / scale / hide / recolour, library objects, named layouts) is only partly built: slices G1-G8 and G11 are done (G7 as G7a `12ef43b` and G7b `3ef75ff`; G11, the 3D gizmo, `56d2e3b`, the latest); the cleanup slice is next; G9 and G10 are not started. See "Phase 18".
13. THE KOP MAIN (`97dd1ac`) is heavy: 483,311 triangles and 753 draw calls. Its speed was only tested by the owner in his browser (smooth orbit, Turntable and a 4 s Reel), not measured. Whether clicking to select its 753 parts is smooth was not reported, and the selection outline on 753 parts is unmeasured.
14. MAIN's material "Material" has a clearcoat factor of 3 (outside 0 to 1); how the loader and the app react is untested. Its sign parts are named "Temporary ..." (placeholders).
15. Terms of use: the Tripo terms are unchecked for the Cessna, and for MAIN's 98 `tripo_part` pieces (Tripo origin inferred from the names; the owner confirms).
16. **Fixed in the Cleanup slice (`8a370eb`).** The "Coffee Bike" filter chip's `matchesFilter` now also matches `item.id === "the-kop-main"`, so THE KOP MAIN lists under it alongside Coffee Bike.
17. **The cleanup slice is done (`8a370eb`):** G9 (outline and ring out of exports), the export lock, the backdrop gate, the Coffee Bike chip fix (see 16 above), and a maximum scale of 100 on the numeric fields. **M0 is done (`2a6cd74`):** real-size calibration and the measure tool (see "Phase 18", "M0"). Next Garage step: G10 (virtual parts). G7 is done (G7a `12ef43b`, G7b `3ef75ff`: the triangle budget and layout `formatVersion` 2 are built) and G11 is done (`56d2e3b`: the 3D `TransformControls` gizmo). See "Phase 18", "Next slices".
18. Lighting sliders are NOT locked during a Reel export: the Cleanup slice's export lock covers Garage edits only; the rail's Lighting section is untouched.
19. Real-scale mismatch: a calibrated added object does not display at the main product's real scale - about 19.5% off in one owner test. A "Match real scale" slice is planned; see "Roadmap".
20. The cm/in toggle appeared to reset to cm when switching product (the owner saw "in" on Coffee Bike, then "cm" on THE KOP MAIN after switching); by the code (`sos-units-display`) it is meant to be one global setting, so this needs investigating.
21. Reels are turntable only: no camera moves or multi-shot Reels yet; see "Roadmap", C2.

## Roadmap

In order, per the owner (none started unless noted otherwise):

1. **C1 - Poster studio.**
2. **C2 - camera moves / multi-shot Reels** (Reels are turntable only today; see Open Issue 21).
3. **C3 - detail tour.**
4. **C4 - GLB animation playback + part keyframes.**
5. **Import inspector.**
6. **Match real scale** (a calibrated added object should display at the main product's real scale; see Open Issue 19, about 19.5% off in one owner test).
7. **Modeling:** M1a (shapes/pipes), M1b (extrude + 3D text), M2 (boolean cut, via `three-bvh-csg`), M3 (export GLB).
8. **G10** (Garage virtual parts; see "Phase 18").
9. **Later items:** batch export, colourway Reels, lock all controls during a Reel export (today only the Cleanup slice's Garage lock applies; Lighting is not locked, see Open Issue 18), Configurator.

## Resolved

- **Header crowding** — commit `1724d36` ("Fix header crowding"; it came after the
  two v0.15B commits, so it is not part of v0.15B). CSS only in
  `ui/ui-shell.css`: the brand no longer shrinks, the environment pill shrinks
  with an ellipsis, the brand tag hides at <=1400px and button labels collapse
  to icons at <=1320px.

- **CAM-002 (Top preset elevation), fixed in `1a15c38`.** The
  preset elevation was measured from the model centre, but the camera orbits the
  biased target (H_BIAS/V_BIAS), so Top sat ~83.8deg above the target. Fix in
  `camera/presets.js` `computeCameraShot` only: for `elev >= 90` the position is
  now `target + distance * (0, sin 89deg, cos 89deg)`; the target and distance
  are unchanged. Top is **89deg** from the actual target, not 90: at exactly 90
  the spherical azimuth is undefined (OrbitControls could jump it) and the
  Height mapping already clamps at +/-89deg, so 89 keeps baseline, sliders and
  orbit consistent (Height "up" from Top stays a silent no-op). The tilt is
  toward +z so screen-up is still -z. Front, Side, 3/4, Rear and Low Hero are
  numerically unchanged (max diff 4e-15 on Coffee Bike and Cessna 172). Old
  sessions that saved `cameraPresetId: "top"` without a live view (or with no
  `engine.camera`) restore the corrected Top because it is recomputed; sessions
  saved with a live view, and a Custom view saved from the old Top, restore
  their exact saved numbers.

## Known Limitations

- **Environment JPGs are not panoramas.** The built-in `app/public/environments/*.jpg`
  are flat 3:2 photos (1920 px derivatives), so they cannot be used as lighting;
  that is why HDR files are separate. (Measured from the JPG headers in Phase 16B:
  `propeller-pistons-loft.jpg` is 1264x843 and the other ten are 1920x1281, all
  about 3:2.)
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
  rail header chips (`RAIL_CHIPS` in `ui/content.js`). The rail's Camera controls
  are all live now (Distance and Height in Phase 16A Slice A, Lock focus in
  Slice B); none is Reserved any more.
- **Right-drag pan is disabled by default.** Lock focus is ON by default, and
  with it ON right-drag pan does nothing. Turn Lock OFF in the rail's Camera
  section to pan.
- **No auto-rotate on the live view and no GLB animation mixer.** Phase 16B added
  a Turntable that spins the model only while Play or an export runs; see
  "Phase 16B". (The older `StudioCanvas.jsx` comment saying there is no animation
  code predates it.)
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
- **Creator Studio limits (Phase 17A audit):** selection is whole-model, material edits
  apply to every mesh sharing a material, and there is no per-part transform or hide;
  the Coffee Bike is only 8 material groups. See "Phase 17A audit findings".
- **Materials panel quirks (owner-tested, causes not investigated):** "Reset this
  material" appeared to do nothing on one edit; the hex field snaps back to the old value
  when characters are typed then deleted (select all with Ctrl+A and paste a full code).
  A picked colour on a vertex-coloured material may multiply the vertex colours
  (unverified).
- **Garage feature:** only partly built. G1-G8 (`6226ba2`, `3b7d9fb`, `3527c6c`,
  `d278ef3`, `e829e1b`, `86f445e`, `15c1995`, and G7 as `12ef43b` and `3ef75ff`) and G11
  (`56d2e3b`) are done; G9 and G10 are not started. See "Phase 18".
- **Garage: moved/hidden/resized parts now refit the scene (fixed by G5, `e829e1b`).** The
  fit (`fit.size`, `fit.center`, `floorY`), the floor disc, shadow catcher, ring, camera
  presets, and Reel/PNG framing (`computeReelView`, `reelPose`, `platformReelPose`) are
  re-measured by `refit()` after a part is moved, hidden, or resized, or the whole model is
  transformed. `fit.floorY` itself is still pinned (Decision 1/4, unchanged). Real-GPU
  automated verification of this behaviour did not run for G5 (see below); the owner spot-
  checked the widen/shrink framing and floor position himself on THE KOP MAIN (owner-tested,
  see "Phase 18", G5).
- **Garage: rotation about x/z is only approximately handled by the G5 refit/CAM-001 fix.**
  The fix is exact for translation and uniform scale of the whole model; rotating the whole
  model about the x or z axis is not fully solved in this slice (owner fact).
- **Garage: real-GPU (Edge) automated verification of G5 did not run.** Free RAM stayed below
  the required threshold for the whole automated session. The owner independently verified
  the CAM-001 fix and the widen/shrink framing behaviour on his own machine afterward
  (owner-tested, see "Phase 18", G5).
- **Garage: a hidden part no longer counts toward fit measurements (fixed by G5).**
  `unionBounds` (`bounds.js`) already skipped invisible nodes; G5's `refit()` reads live
  visibility through `adaptObject3D`, so a part hidden with the Garage editor no longer
  contributes to the model's measured bounds.
- **Garage: editing is one part at a time.** G4's edit fields (Position/Rotation/Scale/Hidden)
  are hidden behind a hint whenever 2+ parts are selected, and the G11 gizmo appears only when
  exactly one visible part or added object is selected.
- **Garage: multi-primitive glTF meshes are only tested with synthetic data.** A part in G3/G4
  is one `THREE.Mesh` (a glTF mesh node/primitive); several parts sharing one mesh node is
  only exercised by the node test scripts' synthetic trees, not by a real GLB file (carried
  over from G3, unchanged by G4/G5).
- **Garage: added objects are edited only as whole objects.** No per-part edits inside an
  added object (select, move, recolour or hide one of its parts), and uniform scale only
  (owner-approved, G7a). See "Phase 18", G7a.
- **Garage: the Transform panel moves the whole scene.** The pre-existing whole-model Transform
  panel moves the main product and every added object together, because the added objects
  live inside the turntable pivot group (approved STOP, G7a).
- **Garage: heavy scenes are slow on the owner's GPU.** Real-GPU FPS (Intel HD 5500, Edge,
  owner facts): THE KOP MAIN alone 15.19, plus a Cessna 12.97, plus a second THE KOP MAIN 9.97,
  so about 10 FPS near the triangle budget.
- **Garage: imported assets exist only in the browser they were imported in.** A layout that
  names an imported asset skips that object (and counts it) in any other browser. See "Phase
  18", G7b.
- **Garage: G6 per-part colour covers colour/metalness/roughness/opacity only.** No
  textures, emissive, or clearcoat/transmission per part yet - deferred to a later slice.
  See "Phase 18", G6.
- **Garage: per-part colour overrides are saved by G8 layouts** (together with move / rotate /
  scale / hide), but not the camera, the selection, the whole-model transform panel or the
  Materials panel. See "Phase 18", G8.
- **Garage: layouts save part overrides and added objects, not the old whole-model
  transform.** Since G7b every save is `formatVersion` 2 (per-part overrides of the main
  product plus the added objects); format 1 layouts still load, parts only. The pre-existing
  whole-model Transform panel is not saved in layouts (`partsOnlyLayout` resets it). See
  "Phase 18", G7b.
- **Garage: "X parts skipped" on load is verified by the node tests only**, not clicked through
  in a browser. See "Phase 18", G8.
- **Garage: the export lock is wired, fixed in the Cleanup slice (`8a370eb`).** `capture/
  exportGate.js`'s `withExportLock` calls `garageStore.setLocked` around every PNG capture and
  Reel export, released in a `finally` so it always releases, including on stage unmount for a
  product switch mid-export. See "Phase 18", "Cleanup slice".
- **Exports now wait for the backdrop, fixed in the Cleanup slice (`8a370eb`).** `capture/
  exportGate.js`'s backdrop gate disables every export button and shows "Loading backdrop..."
  while the current environment's texture loads; a failed load warns and allows exports without
  it, so nothing gets stuck. See "Phase 18", "Cleanup slice".
- **Canvas hash is not deterministic (pre-existing, not caused by G8).** The on-screen canvas
  hash of coffee-bike's default view varies across repeats even on unchanged code, while the
  exported PNG sha256 is stable. Use the exported PNG sha256 as the identity check. See
  "Phase 18", "Verification harness notes".
- **Garage: the gizmo sits at a part's own origin, not its centre (G11).** It uses the same
  pivot as the G4 numeric fields; on many parts that is the model origin, so the gizmo can
  appear away from the part (owner-tested). A pivot at each part's centre is a candidate for
  the cleanup slice. See "Phase 18", G11.
- **Garage: a dead-centre press on the gizmo's uniform-scale cube can jump the scale straight
  to 100 or 0.05 (G11).** `TransformControls` flips the sign when the drag passes the centre;
  the gizmo caps scale drags at 0.05-100 (`MAX_SCALE`), and the jump is one undoable step.
  See "Phase 18", G11.
- **Garage: the numeric scale fields are capped at 100, fixed in the Cleanup slice (`8a370eb`).**
  `clampFieldScale` (`capture/exportGate.js`) clamps every Garage scale field (per-part and
  added-object) to the gizmo's own 0.05-100 range, so typing 1000 now saves as 100. See
  "Phase 18", "Cleanup slice".
- **Garage: about 9 FPS with the gizmo on THE KOP MAIN.** Real-GPU FPS (Edge headless, Intel HD
  5500, owner facts): 10.98 with nothing selected, 8.92 with the gizmo visible. See "Phase 18",
  G11.
- **Garage per-part colours and the pre-existing whole-model Materials panel are two
  separate, non-interacting systems by design.** A Garage colour override never appears as a
  row in the Materials panel and is never written to its persistence (IndexedDB
  `sos-materials`); the Materials panel's Undo/Reset/presets do not see or affect a Garage
  override, and vice versa. See "Phase 18", G6.
- **THE KOP MAIN is heavy** (483,311 triangles, 753 draw calls): speed was only tested by the owner in his browser, not measured; the selection outline on 753 parts is unmeasured; the clearcoat factor 3 on the material "Material" is untested; its sign parts are "Temporary"; the 23 MB file is in git history for good; the Tripo origin of its 98 bike pieces is an inference and the terms are unchecked (also unchecked for the Cessna). See "Products and models".
- **Gold ring and outline are out of PNG exports, fixed by G9 in the Cleanup slice (`8a370eb`).**
  `CaptureBridge`'s capture hides the outline and ring (plus the part overlay and the gizmo) for
  the synchronous export render and restores them afterward.
- **Coffee Bike filter chip fixed in the Cleanup slice (`8a370eb`).** The chip now also matches
  `id === "the-kop-main"`, so THE KOP MAIN lists under it too.
- **Environments:** the other nine environments still have no platform data (see Phase 16B).
- **Garage M0: a calibrated added object does not display at the main product's real scale.**
  About 19.5% off in one owner test; a "Match real scale" slice is planned. See "Roadmap".
- **Lighting sliders are not locked during a Reel export.** Only Garage edits are refused by
  the Cleanup slice's export lock; the rail's Lighting section is untouched.
- **The cm/in display toggle may not be as global as the code intends.** The owner saw "in" on
  Coffee Bike reset to "cm" after switching to THE KOP MAIN, though `sos-units-display` is
  meant to be one setting for every model; unverified, uninvestigated.
- **Reels are turntable only.** No camera moves or multi-shot Reels yet; see "Roadmap".

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
- **Phase 16A Slice A** — `a23e3d0` ("Phase 16A Slice A: Camera store,
  Distance/Height sliders, Custom (unsaved) view"): Camera Studio Distance and
  Height sliders, shared camera store, "Custom (unsaved)" state.
- **Phase 16A Slice B** — `3c05965` ("Phase 16A Slice B: Lock focus, follow rule,
  camera saved in session"): Lock focus toggle and follow rule, frame-default
  request, `engine.camera` in the session.
- **CAM-002 fix** — `1a15c38` ("Fix CAM-002: Top preset elevation from biased target
  (89 deg); refresh HANDOFF"): Top preset elevation now measured from the biased
  target (89deg); `app/src/camera/presets.js` and this file.
- **Phase 16B Slice A** — `c99fd69`: path engine and `fitDistance` with tests.
- **Phase 16B Slice B** — `f25d884`: live Turntable preview (Animate section).
- **Phase 16B Slice C** — `c936232`: deterministic frame stepping and Reel framing.
- **Phase 16B Slice D1** — `0b7c2ce`: MP4 Reel export (mediabunny).
- **Phase 16B Slice C2** — `1e6077a`: cover-crop backdrop for portrait and square
  exports.
- **HANDOFF update** — `5dd66a6`: HANDOFF.md through Phase 16B Slice C2.
- **Phase 16B Slice E1** — `9425a0b`: model-on-platform math (pan, elevation,
  photo-to-frame); pure functions and tests, not wired.
- **Phase 16B Slice E2** — `ea2482c`: model on the platform in the Reel MP4
  (`platformReelPose`, registry platform data for Pistons Loft and Aviation Hangar).
- **HANDOFF update** — `4576c13`: HANDOFF.md through Phase 16B Slice E2.
- **Phase 16B Slice E3** — `936f6d5`: portrait and square PNGs (story-reel,
  ig-portrait, ig-square) use the Reel framing.
- **Cessna swap** — `d6b3cfa` ("Replace placeholder Cessna 172 with Tripo model"): the
  registry points at `cessna-172-tripo.glb`, `frontAz` 0; the placeholder GLB and
  generator are kept as a fallback.
- **HANDOFF update** — `9b12544` ("Update HANDOFF.md through the Cessna swap and Phase 17A
  audit"): HANDOFF.md only.
- **Garage G1** — `6226ba2` ("Garage G1: pure part-id, layout, split, bounds and compose
  modules with tests"): 6 new files (`app/src/garage/{bounds,compose,layout,partId,split}.js`
  and `app/scripts/test-garage.mjs`); nothing wired into the app.
- **THE KOP MAIN product** — `97dd1ac` ("Add THE KOP MAIN as a new built-in product"): the
  23 MB `the-kop-main.glb`, a registry entry (`frontAz` 90) and two data-only lines in
  `ui/content.js`.
- **Garage G2** — `3b7d9fb` ("Garage G2: store with history, gestures, selection and lock,
  with tests"): 2 new files, `app/src/garage/garageStore.js` and
  `app/scripts/test-garage-store.mjs`; nothing wired into the app.
- **Garage G3** — `3527c6c` ("Garage G3: part selection by click, behind a Parts switch
  (default off)"): 5 files, 2 new (`app/src/garage/garageMode.js`,
  `app/src/garage/partTree.js`, `app/scripts/test-garage-select.mjs`) plus wiring in
  `app/src/components/StudioCanvas.jsx` and `app/src/ui/InspectorRail.jsx`; the Parts switch
  is off by default.
- **Garage G4** — `d278ef3` ("Garage G4: move/rotate/scale/hide a selected part, with exact
  reset and undo"): 4 files, 1 new (`app/scripts/test-garage-part-edit.mjs`) plus further
  additions to `app/src/garage/garageMode.js`, `app/src/components/StudioCanvas.jsx` and
  `app/src/ui/InspectorRail.jsx`; includes the raycaster-visibility bugfix (see "Phase 18 -
  Garage", G4).
- **Garage G5** — `e829e1b` ("Garage G5: refit event — floor/shadow/camera/Reel framing
  follow moved parts; fixes CAM-001"): 2 files, 1 new (`app/scripts/test-garage-refit.mjs`)
  plus further additions to `app/src/components/StudioCanvas.jsx` (208 lines changed); adds
  `refit()`, `liveFitRef`/`liveFit` and the `adaptObject3D` adapter, and fixes CAM-001 for
  the pre-existing whole-model transform panel as a side effect (see "Phase 18 - Garage", G5).
- **Garage G6** — `86f445e` ("Garage G6: per-part colour override (base colour, metalness,
  roughness, opacity, vertex-colour bypass)"): 4 files, 1 new (`app/scripts/
  test-garage-color.mjs`) plus additions to `app/src/materials/apply.js`,
  `app/src/components/StudioCanvas.jsx` and `app/src/ui/InspectorRail.jsx`; adds a per-part
  colour override kept invisible to the pre-existing Materials panel and its persistence,
  fixes a Materials-panel row-disappearing bug and a stale-override-on-product-switch bug
  found while running it in a browser, and adds `ignoreVertexColors` to replace (rather than
  tint) a model's baked vertex colours (see "Phase 18 - Garage", G6).
- **Garage G8** — `15c1995` ("Garage G8: save/load named layouts (localStorage + .json, one
  undo step)"): 4 files, 2 new (`app/src/garage/layoutLibrary.js`,
  `app/scripts/test-garage-layouts.mjs`) plus an additive `loadPartsOverrides` in
  `app/src/garage/garageStore.js` and `GarageLayoutSection` in `app/src/ui/InspectorRail.jsx`;
  named layouts of per-part overrides in `localStorage` and `.json`, wrong-product refusal,
  skipped-part count, one undo step per load (see "Phase 18 - Garage", G8).
- **Garage G7a** — `12ef43b` ("Garage G7a: add objects to the scene (place, edit, remove;
  triangle budget; switch confirm)"): 5 files, 2 new (`app/src/garage/sceneObjects.js`,
  `app/scripts/test-garage-objects.mjs`) plus additions to `app/src/components/StudioCanvas.jsx`,
  `app/src/ui/InspectorRail.jsx` and `app/src/App.jsx` (the product-switch confirm guard);
  up to 5 added objects under a 1,000,000-triangle budget, placed beside the main product
  (see "Phase 18 - Garage", G7a).
- **Garage G7b** — `3ef75ff` ("Garage G7b: layouts save and load added objects (formatVersion
  2, one undo step)"): 5 files, 1 new (`app/scripts/test-garage-layouts-v2.mjs`) plus changes
  to `app/src/garage/layoutLibrary.js`, an additive `loadLayoutItems` in
  `app/src/garage/garageStore.js`, an additive `loadObjects()` in
  `app/src/components/StudioCanvas.jsx`, and `app/src/ui/InspectorRail.jsx`; layout
  `formatVersion` 2 with added objects, one undo step per load (see "Phase 18 - Garage", G7b).
- **Garage G11** — `56d2e3b` ("Garage G11: 3D gizmo (move/rotate/scale, snap, local/world,
  W/E/R, scale cap 100)"): 4 files, 2 new (`app/src/garage/gizmo.js`,
  `app/scripts/test-garage-gizmo.mjs`) plus additions to `app/src/components/StudioCanvas.jsx`
  and `app/src/ui/InspectorRail.jsx`; `garageStore.js` unchanged; a `TransformControls` gizmo
  on the one selected part or added object, one undo step per drag, gizmo scale drags capped
  at 0.05-100 (see "Phase 18 - Garage", G11).
- **Cleanup slice** — `8a370eb` ("Cleanup: old outline out of exports, export lock, backdrop
  gate, Coffee Bike chip, scale max 100"): 7 files, 2 new (`app/src/capture/exportGate.js`,
  `app/scripts/test-cleanup.mjs`) plus changes to `app/src/components/StudioCanvas.jsx`,
  `app/src/ui/InspectorRail.jsx`, `app/src/ui/TopHeader.jsx`,
  `app/src/components/StudioControls.jsx` and `app/src/ui/AssetLibrary.jsx`; Garage G9 (the old
  outline/ring out of exports), the export lock wired to PNG and Reel export, a backdrop-ready
  gate on every export button, the Coffee Bike filter chip fix, and a 100 cap on the numeric
  scale fields (see "Phase 18 - Garage", "Cleanup slice").
- **Move Blender working files out of the repo** — `bc3926d`: deletes
  `app/public/blender/THE_KOP_Studio_v01.blend` and `.blend1` (17,856,648 and 17,856,856 bytes)
  from the working tree; both remain in git history. `.gitignore` was given `*.blend` and
  `*.blend1` entries in this HANDOFF.md update so they cannot be re-added by accident.
- **Garage M0** — `2a6cd74` ("M0: measure and real size (sizes, calibration, file-in-metres,
  cm/in, measure tool)"): 4 files, 2 new (`app/src/garage/measure.js`,
  `app/scripts/test-measure.mjs`) plus changes to `app/src/components/StudioCanvas.jsx` and
  `app/src/ui/InspectorRail.jsx`; `garageStore.js` and `layoutLibrary.js` unchanged; per-model
  real-size calibration (Set real size, File is in metres, Reset real size), a global cm/in
  display toggle, and a two-point measure tool, never in undo or layouts and never in an export
  (see "Phase 18 - Garage", "M0").
