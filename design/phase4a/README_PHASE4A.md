# Phase 4A · Personal Daily Driver UX — Lock Ledger

**Milestone:** Phase 4A — Creator Studio Redesign (daily-driver UX over the locked Phase 3 Live Engine)
**Status:** ✅ **LOCKED — user-approved 2026-09-09 after the polish pass (incl. corrected landing).**
Final acceptance on the shipped artifact: **QA 67/67 green + supplementary UX 12/12 green + landing probes green (first-run & returning).**
This ledger is now the read-only baseline for Phase 5.
**Built from (read-only input):** `design/phase3/studio_sidecars_phase3.html` — Phase 3 body stays **byte-for-byte identical** in the Phase-4A artifact.

---

## Changelog — critical local boot fixes (applied to the locked artifact)
**2026-09-09 · reload flash + spinning demo wheels fix (third follow-up, rebuild 3.99 MB)**
When the artifact is served (http) and reloaded, the engine paints its raw default scene for a
few hundred ms to ~2-3 s before the 4A layer mounts — that flash shows the old Phase 3 chrome
with the demo sidecars (the "old sidecar comes for 2 seconds and go"). The BBQ demo GLB also
auto-plays a "Wheels Spin" animation, so its spinning wheels read as "a round plate moving
upside down". Fixes, both in the 4A layer / head only (canonical body stays byte-identical):
· **Boot flash-guard** — the build now injects a head-only guard (`id="p4a-flash"`) that holds
  the body invisible (charcoal) from first paint until `bootHero()` completes and the 4A stage
  is painted; `revealStage()` then reveals. No engine-default frame ever reaches the screen,
  and a fail-safe always reveals (2.5-12 s) so the page can never stay hidden.
· **Demo spin frozen** — `freezeDemoSpin()` stops the boot demo GLBs' `AnimationMixer`
  (`enabled=false`, `timeScale=0`, actions stopped) on mount and on every demo `asset-loaded`,
  so the BBQ wheels no longer rotate. User-imported models are never touched.
Verified: no raw-engine frame during boot (body hidden until `body.ready` + stage painted);
BBQ `animMixer {en:false,ts:0}` and wheel rotations static; file:// first-run & returning still
boot to the embedded Hero (texture `__p4hero`, Gloss Black Mirror `#0a0b0d`, welcome / studio
chrome); **QA 67/67 · UX essentials green · duplicate 2→4**; `phase3 body identical: True`.
New evidence: `review_flashguard_file_firstrun.png`, `review_flashguard_file_returning.png`,
`review_nospin_returning.png`.

**2026-09-09 · embedded-Hero backdrop fix (second critical follow-up)** (rebuild
`studio_sidecars_phase4a.html` 3.99 MB, re-verified): real browsers refuse to upload **`file://`
images into WebGL** (`SecurityError: Tainted canvases may not be loaded`), so even after the first
fix the Hero *file* loaded but could never paint locally — and offline/sandboxed preview viewers
cannot fetch the file at all. 4A now ships the canonical **Propeller & Pistons Loft Hero as an
inline data-URI copy** (`hero_embed.jpg`, rebuilt from the immutable environment PNG by the build
script) and rebuilds the engine's background texture from it via the engine's own CanvasTexture
(`env.probe`), exactly as the engine builds its own backdrops — never cross-origin, never tainted,
no network required. Result verified in **three contexts**: `file://` (no special flags), `http://`
(unchanged engine path: engine texture kept, models 2) and a **sandboxed offline iframe** — all show
the Hero photo texture (1264×843, backdrop mean luminance ≈ 46 = source), black mirror floor
`#0a0b0d`, welcome over the Hero on first run; charcoal `#0b0e13` remains the never-white fallback.

**2026-09-09 · file:// boot fix** (earlier rebuild): sibling-relative `<base href="../phase3/">`;
4A layer URLs now engine-style relative; 4A mounts on env readiness so local `file://` opens show
the Hero + Gloss Black Mirror platform + welcome even though Chromium refuses `file://` GLB fetches
(products need a local server — toast guides there); dark-charcoal `#0b0e13` backdrop if the Hero
image can't be found (never a white canvas).
Re-verified after the embedded fix: **QA 67/67 · UX 12/12 · file:// real-browser probes green ·
sandboxed-offline probe green · charcoal fallback probe green · http unchanged (models 2)**.

## What this phase is

The app is a **personal daily 3D creator studio** for a commercial pilot/aviation author: calm,
non-overwhelming, Porsche / Vision-Pro / Substance-inspired with mechanical-aviation personality
(charcoal-dominant, brass / walnut / leather accents, warm tungsten, glass blur, refined micro-motion).
Phase 4A is a **UX skin + experience layer** on the locked Phase 3 engine — no engine architecture
changes, no capability removal, placeholders only where the roadmap points (Pilot Sandbox,
AI reference prep, etc.).

## Deliverable

`design/phase4a/studio_sidecars_phase4a.html` — single 3.99 MB file.
- `<base href="../phase3/">` (sibling-relative) lets the engine's base-relative asset/env
  paths keep resolving over **http(s) and file://**. (An absolute `/design/phase3/` base breaks
  under `file://` — it resolves against the drive root, so the Hero/env images and GLBs fail
  and the stage can show the engine default white floor.)
- Appended only: `<style id="p4a-skin">` (incl. polish stylesheet) + `<script id="p4a-boot">`.
- Canonical DOM untouched: hidden via CSS (`#dock`, `.trays`, `#sideNav`, `.inspector`,
  `.cv-toggle/.cv-tag/.cv-legend`, topbar `.vchip`s, `#tbExport/#tbLearn`), reused as data bridges
  (Workspaces buttons click the canonical `.vchip[data-vid]` elements).
- Build asserts **Phase 3 `<body>` identical → True** every time.

### Source layout
```
design/phase4a/
  studio_sidecars_phase4a.html   ← release artifact (rebuilt by script)
  _src/p4a.css                   ← design tokens + experience skin
  _src/p4a_polish.css            ← polish pass (boot purity, FAB, swatches, cards, gallery, smart order)
  _src/p4a.js                    ← experience layer (IIFE on window.P3); embeds Hero data-URI
  _src/hero_embed.jpg            ← canonical Hero (PNG → q88 JPEG, 1264×843) inlined by build
  _src/build_phase4a.py          ← assembler + integrity probes
  _src/p4a_qa.mjs                ← Phase-4A QA harness (67 checks)
  exports/artboard_*.png         ← desktop + Honor-Pad artboards
```

## Requirements coverage

| # | Requirement | Where |
|---|---|---|
| 1 | **Landing = the immutable Propeller & Pistons Loft Hero on EVERY load** (`bootHero()` runs on first-run and returning sessions): `hero` environment (`HERO_propeller_pistons_loft.png`), centred **black reflective circular platform** (`Gloss Black Mirror`, `#0a0b0d` / rough .05 / metal .75), `¾ hero` framing, neutral light. First launch shows the full-screen Hero behind the cinematic “What are we creating today?” card — no dark veil/blur (`backdrop-filter:none`, soft edge vignette only) — with New Product / New Pilot Sandbox Diagram / Load Recent Work. Toolbar, top strip, dock, library, inspector, HUD and Quick-Create hidden (`opacity 0` + `pointer-events none`) until dismiss or a creation choice; after entering, the Hero stays the default and reopens from Home | `bootHero()` in `p4a.js` + welcome-hidden & clear-overlay rules in `p4a_polish.css` |
| 2 | Welcome **first-run only**; small Home reopen affordance (top-bar home icon) | `sos:p4a:seen` in localStorage; `showWelcome(true)` |
| 3 | Bottom Creator Toolbar — exactly **7** tactile tools: Select · Camera · Environments · Lighting · Materials · **Sandbox (NEXT)** · Render | `.p4-dock`; large targets (70×60 desktop, 62×56 pad-L, 54×54 portrait) |
| 4 | One panel at a time in the right Creator Inspector; friendly copy; no Blender-level complexity up front | `.p4-rail.R` single-host suite, sections & cards |
| 5 | **Quick Create FAB** (floating, right edge): Import GLB · New Product · New Sandbox Diagram · Duplicate Scene · Capture Screenshot; `Ctrl+K` toggles; tucks beside the inspector | `.p4-fab` + `.p4-fabmenu` (`buildFloatingActions`) |
| 6 | **Sandbox:** premium gallery replaces the dead SOON placeholder — hero block + four diagram-type cards (Pressure & Attitude, Performance Envelope, Flight Plan, eBook Diagram) all badged **“Next update”** + concept previews | `buildSandboxPanel()` |
| 7 | **Render panel is creator-first:** Render Photo · Transparent PNG · Instagram Reel · eBook Diagram · Export Project as primary visual action cards; canvas format/resolution + technical exports (Scene GLB / JSON / Blender pack) live under a collapsed **Advanced** section | `RACTS` + `.p4-adv` `<details>` |
| 8 | **Camera presets as large visual thumbnail cards** (miniature SVG framing previews + check state), grouped Hero & story / Product & detail / Motion, followed by lens & look sliders, saved cameras, focus lock | `.p4-camcard` (`camArt()`) |
| 9 | **Materials as realistic swatches:** brushed & mirror metal, powder coat, leather grain, walnut/oak wood, glass, rubber, vinyl — procedural chip textures (per-surface kind) instead of flat colour disks; favourites + recently used + grouped catalogue, tap or drag onto part/model | `.sw-chip.sw--metal|chrome|powder|leather|wood|glass|rubber|vinyl` |
| 10 | **Creator Library smart-first ordering:** Workspaces → Projects → **Favourites → Recently opened → Collections** → folders/categories last; tag chips lead with Favourites / Recently opened / Collections; typing shows a single **Search results** group above the folders | reworked `renderLibrary()` |
| 11 | Environments: **Hero pinned card + 10** locked studio tiles, name + atmosphere tag, camera position preserved | Env rail (11 cards), platform swatches, cinematic crossfade via engine |
| 12 | Lighting: one-tap cinematic look cards + Advanced sliders collapsed | 6 look cards wired to the engine light rig |
| 13 | Hero home: canvas dominates (~86 %), immersive negative space, product stays hero; no page overflow | rail 296–352 px, dock floats |
| 14 | Motion 200–350 ms, glass blur/fade/scale/depth, `prefers-reduced-motion` honoured | token sets in `p4a.css` |
| 15 | Honor Pad landscape/portrait optimized; top rail collapses to mini icons in portrait | media queries; portrait dock ≥54 px, targets ≥ 48 px |

## Local-file (file://) boot fix — 2026-09-09 critical follow-up
- **Root cause of the white stage:** opening the single-file artifact via `file://` with the old
  absolute `<base href="/design/phase3/">` resolved to a drive-root path, so the Hero backdrop
  (`design/environments/hero/HERO_propeller_pistons_loft.png`) failed and the engine defaulted to
  its white platform; 4A also gated mounting on the boot demo GLBs, which browsers refuse to
  `fetch()` under `file://` — so `bootHero()` never ran to apply the black mirror floor.
- **Fixes:** sibling-relative `<base href="../phase3/">` (works identically over http and file);
  4A layer URLs switched to engine-style base-relative (`../environments/…`, `assets/…`);
  4A now mounts on **env readiness** (not on model count) so local `file://` runs show the
  full-screen **Propeller & Pistons Loft Hero + centred Gloss Black Mirror platform + welcome**;
  and if the Hero image still cannot be found the scene falls back to a **dark charcoal backdrop
  `#0b0e13`** (never a white canvas) — verified by blocking the Hero asset (backdrop = color
  `#0b0e13`, rendered centre pixel ~ (5,5,5)).
- **Note:** Chromium cannot `fetch()` `file://` GLBs by design, so the demo *products* only load
  over a local server (`python3 -m http.server 8137` etc.). The 4A landing still shows the correct
  Hero/black-platform first screen under `file://`, with a toast guiding to a local server for GLBs.

### 2026-09-09 follow-up — the real-browser blocker was WebGL taint, fixed with an embedded Hero
The first fix made the Hero *file* resolve under `file://`, yet a real browser still showed no photo.
Root cause: **browsers refuse to upload `file://` images into WebGL** — the engine decodes the PNG,
creates its CanvasTexture, and every upload throws `SecurityError: Tainted canvases may not be
loaded`, so the backdrop silently stays blank (earlier headless checks only passed because they used
a test-only `--allow-file-access-from-files` flag that real browsers never have). Offline/sandboxed
preview viewers (e.g. the workspace in-app HTML preview, which has no network) can't fetch the file
at all.
Fix: the build script now embeds the canonical Hero PNG as a small inline **data-URI JPEG**
(`_src/hero_embed.jpg`, q88, 1264×843) inside `p4a-boot`; on boot the 4A layer rebuilds the engine's
background texture from that data URI using the engine's own CanvasTexture class (`env.probe` —
created on every env set, so it is available even when the external file load failed), mirroring the
engine's own `ov()` texture settings. A data-URI source is never cross-origin, so the upload always
succeeds and needs no network. Healthy `http://` loads keep the engine's own (higher-fidelity)
backdrop untouched; the embedded copy is used under `file://`, whenever the engine reports the
backdrop not ready, and in sandboxed/offline viewers. Dark charcoal `#0b0e13` remains the fallback if
even that fails.
Verified without any special flags: **file:// first-run** (welcome over real Hero photo + Gloss Black
Mirror, chrome hidden) and **returning** (studio on the same Hero); **sandboxed offline iframe**
(`sandbox="allow-scripts"`, no network — Hero photo still renders); **http control** unchanged
(models 2, engine texture); **QA 67/67 · UX 12/12**.
New evidence artboards: `review_embeded_localfile_firstrun.png`, `review_embeded_localfile_studio.png`,
`review_embeded_offline_sandbox.png`, `review_embeded_http_firstrun.png`.

## Polish-pass directive (this ledger covers it)
Six review requirements landed on top of the pre-polish build: premium Sandbox “Coming in the next update”
gallery; Render creator-first with technical exports under Advanced; camera visual thumbnail cards;
realistic material swatches (metal / leather / walnut / powder coat / chrome / glass / rubber);
library starts Favourites → Recent → Collections → Search before folders; floating Quick Create
(Import GLB, New Product, New Sandbox Diagram, Duplicate Scene, Capture Screenshot).
Plus the **boot/landing fix**: the Hero is now the default workspace on **every** load (previously the
engine fell back to White Studio for returning sessions). First launch shows the **full-screen**
Propeller & Pistons Loft Hero + centred black mirror platform behind the welcome card — the old heavy
full-screen veil/blur and the legacy `.p3-toolbar`/`#topStrip` leak measured pre-polish are both gone
(verified: clear overlay, editor chrome at 0 opacity / `pointer-events none` until dismiss/creation;
returning sessions open in the studio on the same Hero default).

## Directives honoured
- Charcoal + brass identity (accent **blue reserved for active states**; monochrome chrome default).
- Welcome first-run only; **Home** affordance for reopening.
- No edits to canonical DOM/ids, Hero environment, Studio Background Library, Design System tokens, or the Phase 3 engine.
- Not built in 4A (premium placeholders only): AI reference-image generation, real Pilot Sandbox simulations,
  modular product builder, Blender-export workflow, animation editor, new environment assets, Phase 5 AI tools.
- Locked icon spec: 24×24 / 1.6 stroke / currentColor / no emoji; touch ≥ 40 px; Honor-Pad text 13–15 px nominal.
- **Do not begin Phase 5 or further feature work until this pass is reviewed and approved.**

## QA ledger — main harness (`p4a_qa.mjs`) → **67 passed / 0 failed**

Environment: headless Chromium (SwiftShader), static server on `127.0.0.1:8137`, engine @ 60 fps.

| Section | Checks | Result |
|---|---|---|
| A / A2 | boot engine + 4A chrome, parts indexed, fps loop, rail opens · **returning session boots to Hero default** (loft + black mirror + ¾ hero, chrome live) | 6/6 |
| B | Workspaces V1–V6 drive canonical vchips (hidden) | 3/3 |
| C | Env rail (Hero + 10), 5 platforms, card click switches engine, camera preserved | 4/4 |
| D | 6 cinematic looks; warm-workshop drives rig (Warm override, 1.12×) | 2/2 |
| E | Materials realistic swatches (8 cats / 27) · finish applies + override recorded | 2/2 |
| F | Camera chips incl. Hero/Product/Reel; preset chip drives engine | 2/2 |
| G | Select rail model list + Move/Rotate/Scale + actions; transform recorded; **UI undo**; **keyboard ctrl+z / ctrl+shift+z** | 5/5 |
| H | Render creator-first actions (photo/png/reel/ebook/project) · Advanced holds canvas + 3 technical exports; still PNG 463 KB, GLB 463 KB, scene JSON non-empty | 6/6 |
| I | Right rail hosts one panel at a time; close returns clean stage | 2/2 |
| J | First-run purity (hero env, **Gloss Black Mirror #0a0b0d**, ¾ hero, all chrome at 0) · 3 cards fit · New Product closes welcome → Object Studio on the Hero · creation choice reveals editor (black mirror kept) | 8/8 |
| K | Layouts desktop 1440×900 · Honor Pad landscape 1194×834 · portrait 834×1112: canvas dominance, dock inside viewport, touch targets ≥ 48 px, portrait mini-rail, no overflow, 60 fps, zero console errors | 27/27 |
| L | History/autosave functional | 1/1 |

### Supplementary UX pass (`/tmp/p3build/_p4ux.mjs`) → **12/12**
Search → single results group above folders · Quick Create menu items (import/plus/sandbox/dup/camera) ·
Duplicate Scene grows stage 2 → 4 · realistic swatch kinds (metal/chrome/powder/leather/wood/glass/rubber) ·
material override + recent · Sandbox gallery no-SOON (Next-update badges) · 12 camera thumbnail cards ·
Reel card drives engine · Render creator-first with technical exports under Advanced · Library group order
Favourites → Recently opened → Collections → folders · tag chips lead smart-first.

### Environment note
Reel (WebM) export remains **headless-capture-limited** (recorded as such in the Phase 3 ledger —
no Xvfb/headed capture in this environment). Still/GLB/JSON hard-pass on the 4A artifact; the reel
code path is engine-verified. SwiftShader may log a benign `BackgroundMaterial` shader VALIDATE notice.

## Build numbers (final, shipped artifact)
- Release `studio_sidecars_phase4a.html` — **3.99 MB**; `phase3 body identical: True`.
- Engine blocks intact: `#engine-css`, `#engine-boot` present; only `#p4a-skin`/`#p4a-boot`/`<base>` added.
- QA run: **67/67 PASS, 0 notes** · UX supplement: **12/12 PASS** (incl. returning-session Hero default) · boot probes: pure first-run **and** returning-session Hero default — console clean.
- Local-boot probes (rebuilt artifact, no special flags): `file://` first-run/returning show the
  **embedded Hero photo** (`scene.background.__p4hero` true, texture 1264×843, backdrop luminance ≈ 46
  = source) + Gloss Black Mirror `#0a0b0d` + welcome over Hero; **sandboxed offline iframe**
  (no network) same; **http control** unchanged (engine texture kept, models 2).

## Artboards (`design/phase4a/exports/`)
`artboard_welcome.png` · `artboard_select.png` · `artboard_select_undo.png` · `artboard_camera.png` ·
`artboard_environments.png` · `artboard_lighting.png` · `artboard_materials.png` · `artboard_render.png` ·
`artboard_desktop_home.png` · `artboard_desktop_render.png` ·
`artboard_pad_landscape_home.png` · `artboard_pad_landscape_render.png` ·
`artboard_pad_portrait_home.png` · `artboard_pad_portrait_render.png`
Review set for this pass (also in `exports/`): `review_landing_firstrun.png` · `review_landing_returning.png` ·
`review_render.png` · `review_render_advanced.png` · `review_camera.png` · `review_materials.png` ·
`review_sandbox.png` · `review_library.png` · `review_quickcreate.png` · `review_tablet_render.png` ·
`review_tablet_materials.png` · `review_embeded_localfile_firstrun.png` ·
`review_embeded_localfile_studio.png` · `review_embeded_offline_sandbox.png` ·
`review_embeded_http_firstrun.png`.

## Rebuild & QA commands
```bash
python3 design/phase4a/_src/build_phase4a.py          # assembler + body-identity probe
node   design/phase4a/_src/p4a_qa.mjs                 # needs a static server on :8137 + /tmp/p3build deps
node   _p4ux.mjs                                      # supplementary UX pass (from /tmp/p3build)
```
(Default QA URL `http://127.0.0.1:8137/design/phase4a/studio_sidecars_phase4a.html`; artboards → `exports/`.)

## Next-phase guardrail
Phase 4A is now a **read-only input** (user-approved, LOCKED 2026-09-09). Phase 5 (AI tools:
reference-image generation, Pilot Sandbox simulations, etc.) builds on this file and the locked
engine with the same layering rule — new experience blocks only, canonical body identical,
engine untouched.
