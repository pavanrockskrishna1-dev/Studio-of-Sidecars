# Studio of Sidecars · Premium Finish — Redesign Specification

Companion to `UI_CRITIQUE.md`. This spec documents the redesign of the **chrome only** — every criticism has a concrete change; the locked Phase-1 layout, DOM ids, radios and all Phase-2 interactions are preserved and verified.

**File chain (read-only rule intact):**
`studio_sidecars_premium_ui.html` (locked Phase-1 canonical baseline) → `phase2/studio_sidecars_phase2_interactive.html` (interaction layer) → **`studio_sidecars_cinematic.html`** (interactive premium prototype) and **`studio_sidecars_premium_finish.html`** (premium finish *skin* over the canonical static shell). Nothing upstream is ever written.

---

## 1. How each critique maps to a change

| Critique (see UI_CRITIQUE.md §) | Fix applied | Where |
|---|---|---|
| Body has two blue radial glows competing with the scene | Neutral white-light leak gradients only (3 % white) | `body` |
| `soLogo` is a saturated blue gradient tile with a coffee emoji | Frosted white-glass tile + monochrome coffee **SVG mark**; reserved as the only “lit” object in the header | `#soLogo` |
| Workspace chips signal “on” 4 ways (blue gradient + border + ring + glow) | Quiet segmented control; active = white text on 10 % white glass + hairline + a 5 px accent dot only | `.vchip.on` |
| Selected rows/vchips everywhere in blue wash + ring | Selection = soft white glass (6–10 %) + hairline; **accent reserved for state dots, focus, and the active frame tint only** | `.vrow.on`, `.rchip.on`, `.tile`, `.mat-row` |
| Three different button styles in the top bar | One white CTA (Export), one ghost (Learn), two hairline icon circles; single family, one size | `#appActions .abtn` |
| `.canvas` framed like a screenshot (border + inset highlight + heavy shadow) | Unframed cinematic stage: hairline 5 %, larger 26 px radius, deep soft *ambient* shadow, internal micro hairline instead of the recessed highlight | `.canvas` |
| Heavy 78 % black glass → almost no scene through panels | Black-glass at ~62–74 % with `blur(28–30px) saturate(1.4)`; the stage visibly glows through the panels | `#sideNav`, `.inspector`, `#dock`, `.trays` |
| Double-stroked edges (border + inset highlight on everything) | Single hairline per surface; inset highlight only where genuinely lit from above (logo, dock) | global |
| Type: four sizes per panel, micro-caps everywhere | One eyebrow tier (10 px / +0.24em, faint), one body tier (12–12.5 px), one meta tier (9–9.5 px); labels de-bolded and quieted | `.phead`, `.gn`, labels, `.vn` |
| Emoji iconography (☕🎬📲🐍🎥🧰🎨🌆🛵💡🚲🪑🔒…) | Full stroke-SVG pass; project thumbs become editorial monograms | see §5 |
| Dock active = blue gradient + 4 px ring + glow on icon | Dock is quiet glass; active = white text, 10 % white glass, hairline; 1.6-stroke 19 px icons | `#dock .dk-btn` |
| 5 HUD chips layered on the stage | Ghost pills (42 % black, hairline, 14 px blur); active toggle is a white pill; hint/legend text reduced to faint | `.cv-toggle`, `.cv-tag`, `.cv-status`, `.cv-hint`, `.cv-legend` |

---

## 2. Layout invariance (measured, all three sizes)

The finish never moves a region. Verified computed geometry:

| Surface | 1440×900 | 1194×834 | 834×1112 |
|---|---|---|---|
| Left panel | 260 px @ x=10 | 260 px @ x=10 | 96 px rail (Phase-1 compact) |
| Right panel | 318 px @ x=1112 | 318 px @ x=866 | 96 px rail (Phase-1 compact) |
| Dock (centred) | w=431 @ x=505 | w=431 @ x=382 | w=399 @ x=218 |
| Stage canvas | 1420×767 | 1174×702 | 814×943 |
| Horizontal overflow | none | none | none |

Interactions re-verified at all three sizes: environment switch, orbit camera, tray state, export modal, Learn tour — **0 console/page errors**.

---

## 3. Token changes (the ones that matter)

| Token | Before | After | Reason |
|---|---|---|---|
| `--bg` | `#0b0d11` | `#05060a` | deeper, quieter room |
| `--glass` | `rgba(18,21,28,.78)` | `rgba(14,17,23,.62)` | glass must read as glass |
| `--line` | white .08 | white .075 | hairline, not stroke |
| `--acc` | `#2f7bff` (over-used) | `#6aa5ff` reserved | scarcity = value |
| `--r-lg/md/sm` | 20/18/13 | 26/20/12 | calmer radii |
| primary CTA | blue gradient | near-white | monochrome stage + one lit button (Apple/Porsche pattern) |
| selection fill | accent wash | white glass 6–10 % | selection ≠ branding |
| body gradient | blue radial glows | 3 % white light-leak | scene owns colour |
| stage frame | border + inset highlight | hairline + ambient depth | unframe the showroom |

---

## 4. Motion inheritance

The finish keeps the Phase-2 motion layer (tokens 180/340/620/900 ms, listed easing curves, 60 FPS contract, reduced-motion collapse) untouched. New surfaces reuse the same tokens: hover lifts, dock press pop, tray rise, guide morph. Nothing in the finish layer adds a new timing value.

---

## 5. Icon pass (monochrome, single weight)

~Two dozen emoji across brand, versions, assets, projects, favourites, empty state and footers are replaced by 1.6-stroke `currentColor` SVGs:

- V1–V6 → camera · phone · cube · film · archive · palette (workspace semantics)
- Asset tiles → coffee · bike · sofa · bulb; Look tiles → sun / sunset
- Project thumbs → initial monograms (editorial)
- Favourites → gold-filled star; lock → lock glyph; empty state → coffee; Export/download arrows & selection checks → stroke arrows/check
- Dock and panel-head icons were **already** inline SVG in the Phase-1 shell and are kept (restyled weight only)

Result: every pixel-level glyph on screen shares one weight, one cap and `currentColor`.

---

## 6. What this is NOT (scope guard)

- Not a new layout — region geometry is byte-for-byte the Phase-1 shell’s.
- Not a product composite — the stage remains the Phase-1.5 empty-centre showroom; Phase 3 adds the object.
- Not an engine — interactions are the Phase-2 prototype layer, unchanged.
- The locked `studio_sidecars_premium_ui.html` and all `environments/` assets are never written by this phase.

---

## 7. Skin architecture & engine-swap contract (approved correction)

The Premium Finish is an **overlay skin**, not a replacement shell.

| Asset | Role |
|---|---|
| `design/studio_sidecars_premium_ui.html` | Immutable Phase-1 canonical baseline |
| `design/redesign/studio_sidecars_premium_finish.html` | Skin HTML: canonical `<body>` **byte-for-byte identical** (build-time verified `True`); adds `<style id="skin-tokens">` + `<style id="skin-premium">` in `<head>` and `<script id="skin-icons">` before `</html>` |
| `design/redesign/skin/premium_tokens.css` | **Master tokens artifact** — the finish `:root` (glass tokens, spacing scale, type floor + Honor Pad floor media query), mirror of the `#skin-tokens` block |
| `design/redesign/skin/premium_finish.css` | **Master skin stylesheet** — component finish rules, mirror of the `#skin-premium` block |
| `design/redesign/skin/premium_icons.svg` | **Master icon family** — 24×24 symbols (coffee camera phone cube film archive palette bike sofa bulb sun sunset upload lock star up dl check play), 1.6-stroke `currentColor` |
| `design/redesign/skin/premium_icons.js` | **Master icon pass** — runtime sprite boot (appends `#pi-sprite` to `<head>`) + emoji→`<svg class="pi"><use href="#pi-…">` swap |
| `design/redesign/studio_sidecars_cinematic.html` | Interactive premium prototype (same skin over the Phase-2 engine layer; env library, trays, Learn tour) |

- **No element ids, V1–V6 chips, dock logic, inspector structure, asset-library paths, or Hero/Background assets change** between canonical and premium. Verified by the body-equality assertion in `build_skin_suite.py`.
- **Phase-3 swap:** render canonical = omit the three skin blocks (`#skin-tokens`, `#skin-premium`, `#skin-icons`); render premium = include them. **Engine code is unchanged.** Because the sprite is injected at runtime by the icon pass, the static `<body>` stays pristine and identical to canonical.
- Capability note: cartoon emoji cannot be removed with CSS alone, so the skin ships a tiny presentational icon pass that swaps glyphs for sprite SVGs at runtime; it never touches engine state or hooks.

---

## 8. Approval screens (produced before any engine work)

Master visual package in `design/redesign/exports/premium_finish_master/` — artboards and every screen captured from the final skin build at all three required sizes, with 0 console/page errors, no overflow, no visible emoji, sprite icons live:

| Artboard | Path |
|---|---|
| Desktop · 1440 × 900 | `desktop/artboard_1440x900.png` |
| Honor Pad landscape · 1194 × 834 | `honorpad_ls/artboard_1194x834.png` |
| Honor Pad portrait · 834 × 1112 | `honorpad_pt/artboard_834x1112.png` |

Screens per size (11-card Environment Library renders at all three):

1. **Home Studio** — `artboard_<size>.png` / `screen_01_home_studio` (hero stage, chrome at rest)
2. **Environment Library** — Hero + 10 Studio Background presets, large cards, apply state (`screen_02_environment_library.png`)
3. **Camera / Lighting / Materials / Floor** tool panels — one open at a time, dock active + preset tray (`screen_03a…03d_*_panel.png`; desktop + Honor Pad landscape — the locked canonical ≤980px layout hides the dock tray in portrait)
4. **Learn Studio** onboarding — spotlight highlight + tooltip card (`screen_04_learn_studio.png`)

Contact sheets (approval grids): `overview_desktop.png`, `overview_honorpad_landscape.png`, `overview_honorpad_portrait.png`, `artboard_compare_3_sizes.png`. The legacy desktop grid `premium_screens/_overview_2x2.png` was refreshed from the final build. Tooltip cards are sized to accept optional **video/asset placeholders** in the card body once Phase-3 content exists.

### Deliverable-artifact ↔ screen provenance

Screens are captured from the *rendered skin* — the interactive premium prototype for hero-bearing states (Home/Environment/Learn) and the static skin shell where noted; the static `studio_sidecars_premium_finish.html` remains the byte-equality artifact, and the four `skin/premium_*` files remain the master assets Phase 3 will load.
