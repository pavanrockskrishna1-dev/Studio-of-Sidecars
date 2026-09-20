# ☕🔥 Premium GLB Commercial Studio — Handoff

## Start here (updated through Phase 16B Slice E2; HEAD `ea2482c`, the Slice E2 commit; all work through Phase 16B Slice E2 is committed)

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
  4. Phase 16A / 16B (Camera Studio; Animation Studio and Reels)
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

## Phase 16B - Animation Studio and Reels (Slices A, B, C, D1, C2, E1, E2)

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

(`5dd66a6` is a HANDOFF.md-only commit between C2 and E1.)

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
  on-screen view are unchanged (byte-identical in the E2 probes; probe results,
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

- `node scripts/test-path.mjs` - 167 PASS lines and `ALL CHECKS PASSED` (counted
  when this section was written; the owner also ran it after E2 and reported 167).
- `node scripts/test-backdrop.mjs` - 84 PASS lines and `ALL CHECKS PASSED` (counted;
  the owner also reported 84).
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

### Known limitations and open items

- **Portrait PNGs still use the live camera** (unchanged by design), so the model
  can still float above the platform and a wide model such as the Cessna can be
  clipped: the owner's own 9:16 PNG of the Cessna on Aviation Hangar shows the plane
  floating with the wing tips cut off. Proposed Slice E3: make portrait PNGs use the
  same Reel framing as the Reel MP4. It needs the owner's approval because
  existing portrait PNGs would change (not started).
- The model no longer floats in the Reel MP4 on Pistons Loft and Aviation Hangar
  (Slice E2, confirmed by the owner). The other nine environments have no
  platform data and keep the old framing (the model floats there).
- The platform numbers in the registry are estimates from the JPG (plus or minus
  3-4 px; the 8 degree floor angle plus or minus 1.5); tune them by eye.
- The Cessna 172 is placeholder geometry (`app/scripts/gen-c172-placeholder.mjs`,
  replace `app/public/models/cessna-172.glb` with the final asset).
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
- CAM-001 is still deferred (see "Known Camera Bugs"). Audio and the Blender
  track are deferred.

### Next slices (proposed, not started)

- Slice E3: portrait PNGs use the same Reel framing (owner approval needed).
- Platform data for more environments (measure and look first), and tuning
  `reelAnchorRy` if the owner wants the model further forward.
- Slice D2: an in-app video preview window.
- Slice E: camera moves (`makeMove`) and saving an animation in the session
  (optional `engine.animation` field, no version bump).

Tooling reminders (Playwright / SwiftShader versus the real GPU, Project rules)
are in "Known Limitations" and "Project rules" below.

## Known Camera Bugs

Still open:

- **CAM-001:** camera presets ignore a transformed model (they frame the model's
  original bounds, not its current transform).

Resolved: **CAM-002** (Top preset elevation), see "Resolved" below.

## Current Studio Status

| Module | Status | Note |
|---|---|---|
| Studio Canvas | Complete | r3f canvas with orbit, transform, capture, on-demand shadows and HDR/probe lighting (`components/StudioCanvas.jsx`). |
| Asset Library | Complete | Registry-driven product/environment gallery plus GLB/HDR/EXR import manager (`ui/AssetLibrary.jsx`, `ui/ImportPanel.jsx`). |
| Camera Studio | Partial | Presets and Save Custom View work. Phase 16A Slice A (`a23e3d0`): the rail's Distance and Height sliders are live, with a "Custom (unsaved)" state. Phase 16A Slice B (`3c05965`): Lock focus is a real toggle (ON by default; the orbit target follows the transformed model, right-drag pan is off while ON) and the live camera is saved in the session. See "Phase 16A Slice A/B" and "Known Camera Bugs". |
| Material Studio | Complete | Live PBR editing, presets, undo/reset, persistence and session capture (`materials/`, `ui/MaterialsManager.jsx`). |
| Render Studio | Partial | PNG capture/export with format chips works. Phase 16B (`0b7c2ce`): a 1080x1920, 30 fps, silent MP4 Reel export of the Turntable from the rail's Animate section; portrait and square exports (PNG and Reel) crop the backdrop instead of squashing it (`1e6077a`); the Reel MP4 puts the model on the painted platform on Pistons Loft and Aviation Hangar (`ea2482c`); portrait PNGs still use the live camera. See "Phase 16B". |
| Loading Screen | Complete | Real GLB progress via drei `useProgress` (see Known Limitations for the environment-switch flash). |
| HDRI Environment Library | Partial | 2 of 11 environments have a real HDR; the other 9 use the probe plus a flat JPG. |
| Animation Studio | Partial | Phase 16B (`c99fd69`, `f25d884`, `c936232`, `0b7c2ce`, `ea2482c`): Turntable preview and Reel export work (the model spins; the camera is fixed). No GLB animation mixer, no camera moves UI, no saving in sessions. See "Phase 16B". |

Status is judged from code reading, not from a fresh browser run in this update.

## Open Issues (Next Phase)

1. Camera Studio: Distance, Height (Slice A, `a23e3d0`) and Lock focus plus session capture of the live camera (Slice B, `3c05965`) are live; CAM-002 is fixed (`1a15c38`). Next: CAM-001; see "Known Camera Bugs".
2. Animation Studio: Turntable preview and Reel MP4 export are live, and the Reel puts the model on the platform on Pistons Loft and Aviation Hangar (Phase 16B, through Slice E2). Open: portrait PNGs on the same framing (proposed Slice E3, needs owner approval), platform data for the other nine environments, an in-app video preview (Slice D2), camera moves and session saving; see "Phase 16B".
3. Reel/MP4 export is built (1080x1920, 30 fps, silent) and Instagram accepted an exported file (owner-tested); how it looks inside Instagram is untested.
4. THE KOP branding renders clipped ("THE KOF") in every export. Believed to be in the model/texture, not in this React app's export code. UNVERIFIED at the source.
5. Blender: CAM_Shot01_LowHero still requires repair (aimed at nothing). Blender work is frozen.

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
