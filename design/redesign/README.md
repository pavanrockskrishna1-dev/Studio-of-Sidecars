# Studio of Sidecars — Redesign pass ("Premium Finish Skin", Phase 2)

Critique-first UI refresh of the Phase-1 chrome against Porsche / Audi / Apple Vision Pro / Substance Stager / Vectary-class configurator quality, implemented as an **overlay skin** that preserves the Phase-1 layout, DOM, ids, hierarchy, asset paths and the Phase-2 interaction engine byte-for-byte.

## Master deliverables

| # | File | What it is |
|---|---|---|
| 1 | `skin/premium_tokens.css` | **Design tokens** — finish `:root` (deep-charcoal glass, hairline, accent, spacing scale, type floors incl. the Honor Pad 13–15 px media query). Mirror of the `#skin-tokens` block in the HTML. |
| 2 | `skin/premium_finish.css` | **Component finish rules** — glass chrome, quiet loudness ladder, unframed showroom stage. Mirror of the `#skin-premium` block. |
| 3 | `skin/premium_icons.svg` | **Master SVG icon family** — 24×24 `<symbol>` sprite, 1.6-stroke `currentColor` (coffee camera phone cube film archive palette bike sofa bulb sun sunset upload lock star up dl check play). |
| 4 | `skin/premium_icons.js` | **Master icon pass** — runtime sprite boot (`#pi-sprite` into `<head>`) + emoji→`<svg class="pi"><use href="#pi-…">` swap. Mirror of the `#skin-icons` script. |
| 5 | `studio_sidecars_premium_finish.html` | **Premium Finish SKIN HTML** — canonical `<body>` inherited **byte-for-byte** (build-time verified `True`); adds only `#skin-tokens` + `#skin-premium` in `<head>` and `#skin-icons` before `</html>`. |
| — | `studio_sidecars_cinematic.html` | Interactive premium prototype — the same skin over the Phase-2 engine layer (environment switcher, tool trays, Learn tour, export). Used for hero-bearing screen captures. |
| 6–12 | `exports/premium_finish_master/` | Desktop artboard, Honor Pad landscape + portrait artboards, Home Studio, Environment Library, Camera/Lighting/Materials/Floor panels, Learn Studio onboarding — at all three sizes. |

## Skin / engine swap contract

- Render **canonical** = open `../studio_sidecars_premium_ui.html` (or omit the three skin blocks `#skin-tokens` `#skin-premium` `#skin-icons`).
- Render **premium** = include the three skin blocks. **Engine code is unchanged.** The sprite is injected at runtime so the static `<body>` stays pristine.
- Verified invariants: body equality `True`; element ids, V1–V6 chips, dock, inspector, library paths, Hero / Studio Background assets untouched; only presentational rules added.

## Approval screens (master visual package)

`exports/premium_finish_master/` — artboards + all screens captured from the final build at
**1440 × 900**, **1194 × 834 (Honor Pad landscape)**, **834 × 1112 (Honor Pad portrait)**:

- `artboard_1440x900.png` · `artboard_1194x834.png` · `artboard_834x1112.png` — 01 Home Studio
- `screen_02_environment_library.png` — Hero + 10 Studio Background presets (11 large cards) at each size
- `screen_03a_camera_panel.png` · `03b_lighting` · `03c_materials` · `03d_floor` — one tool panel open at a time (desktop + landscape; the locked ≤980 px compact layout hides the dock tray in portrait)
- `screen_04_learn_studio.png` — Learn Studio spotlight + tooltip (onboarding stage)
- Contact sheets: `overview_desktop.png` · `overview_honorpad_landscape.png` · `overview_honorpad_portrait.png` · `artboard_compare_3_sizes.png`

Legacy desktop grid refreshed from the final build: `exports/premium_screens/_overview_2x2.png`.
Older artboards remain in `exports/` for history.

## Source & rebuild

```
redesign/_src/cinematic.css       finish-layer stylesheet source (tokens + component rules)
redesign/_src/fin_extra.css       baked-SVG sizing helpers for the skin
redesign/_src/cinematic.js        icon-pass source (glyph map + runtime pass)
redesign/_src/build_skin_suite.py master builder: tokens css · finish css · icons svg/js · skin HTML (+ body-equality assertion)
redesign/_src/master_capture.mjs  headless capture of artboards + all screens at 3 sizes
redesign/_src/sheets_master.py    contact-sheet assembly (PIL)
redesign/_src/qa_premium_shell.mjs · qa_cinematic.mjs · shoot_screens.mjs   earlier QA/capture tooling
```

Rebuild:

- Skin HTML (canonical shell):  `python3 redesign/_src/build_skin_suite.py`
- Interactive prototype:        `python3 redesign/_src/build_skin_suite.py --live`
- Screens:                      `node redesign/_src/master_capture.mjs` (needs playwright-core + `/usr/bin/chromium`)
- Sheets:                       `python3 redesign/_src/sheets_master.py`

Inputs: `design/studio_sidecars_premium_ui.html` (locked canonical, never written) and
`design/phase2/studio_sidecars_phase2_interactive.html` (interactive derivative, read-only input).

## Verified

- 0 console/page errors at 1440×900, 1194×834 and 834×1112 for every captured state.
- No overflow; sprite injected (`#pi-sprite`); icons live (21 `<svg class="pi">` at rest).
- All cartoon emoji gone — no visible emoji in any screen; one unified 1.6-stroke icon family.
- All Phase-2 interactions intact (environment switch w/ 11 presets, camera/lighting/materials/floor trays, Learn tour).
- Honor Pad body floors ≥ 13 px; touch targets ≥ 38 px; motion uses the Phase-2 timing set.
