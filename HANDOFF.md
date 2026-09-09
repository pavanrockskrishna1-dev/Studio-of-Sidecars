# ☕🔥 Premium GLB Commercial Studio — Handoff

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
