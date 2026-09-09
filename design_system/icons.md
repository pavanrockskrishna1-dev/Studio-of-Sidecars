# Design System · Icon Family (SVG, locked)

Studio of Sidecars — one unified outline icon system. **No emoji anywhere in the interface.**

| | |
|---|---|
| Status | Locked reference (Phase 2 approved) |
| Source of truth | `design/redesign/skin/premium_icons.svg` (sprite art) · `skin/premium_icons.js` (runtime pass) · glyph map in `design/redesign/_src/cinematic.js` |
| Rebuild | `design/redesign/_src/build_skin_suite.py` (art lives in the builder `I = {…}` dict and is mirrored into the two artifacts) |
| Governs | Phase 3 — Live Engine Integration and every future UI phase |

---

## 1. Locked icon spec

| Property | Value |
|---|---|
| ViewBox / artboard | `0 0 24 24` |
| Stroke width | `1.6` |
| Stroke linecap | `round` |
| Stroke linejoin | `round` |
| Fill | `none` (exceptions: gold favourite star is filled) |
| Colour | `currentColor` — never hard-coded inside the glyph |
| Sizing | CSS width/height on the `<svg>` (see sizing map) |
| Accessibility | `aria-hidden="true"`; text/alt lives in markup, not in glyphs |
| Emoji | **0** — the whole interface renders no emoji glyphs |

Markup shape (produced by the icon pass):

```html
<svg class="pi pi-coffee" viewBox="0 0 24 24" width="16" height="16"
     fill="none" stroke="currentColor" stroke-width="1.6"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <use href="#pi-coffee"/>
</svg>
```

---

## 2. Glyph inventory (17 symbols, `#pi-<name>`)

| id | Semantic | Where used |
|---|---|---|
| `pi-camera` | Capture / V1 · Classic Studio | Workspace chip V1, camera panels |
| `pi-phone` | Feed / V2 · Instagram Commercial | Workspace chip V2 |
| `pi-cube` | 3D object / V3 · Blender Python | Workspace chip V3 |
| `pi-film` | Edit / V4 · Creator Studio | Workspace chip V4 |
| `pi-archive` | Library / V5 · Asset Library | Workspace chip V5 |
| `pi-palette` | Brand / V6 · Brand Studio | Workspace chip V6 |
| `pi-coffee` | Empty-stage dropzone & asset tile | Drop hint, asset thumb |
| `pi-bike`, `pi-sofa`, `pi-bulb` | Asset thumbnails | Asset-library tiles |
| `pi-sun`, `pi-sunset` | Look/lighting tiles | Look presets |
| `pi-upload` | Upload action | Dropzone action |
| `pi-lock` | Private workspace | Side footer lock |
| `pi-star` | Favourite | Gold star on favourite rows/tags (filled) |
| `pi-up` | Export arrow | Export CTA |
| `pi-dl` | Download | Render-pack download |
| `pi-check` | Selected tick | Active version row, applied state |
| `pi-play` | Play / Learn Studio | Video placeholders, tour |

Dock buttons (Select · Camera · Lighting · Materials · Floor · Render) and panel
headers already shipped inline SVG in the Phase-1 shell; the skin **restyles weight
only** — their glyphs are part of the locked canonical DOM and are not swapped.

---

## 3. Sizing map (px, locked)

| Context | Size |
|---|---|
| Workspace-chip / version index wells | 14 |
| Row tick (selected) | 10 |
| Tile icon wells (`tt-ic`) | 15–16 |
| Tag (favourite star) | 10–11 |
| Private lock (side footer) | 13 |
| Action buttons `.abtn` / small icons | 14 (Export CTA 12) |
| Dock buttons `.dk-btn` | 19 (21 on compact) |
| Project thumbnail / empty dropzone | 26 |
| Dropzone action | 13 |
| Logo mark | 21–22 |

Use the context size — one icon, many scales, identical geometry.

---

## 4. How icons reach the screen (swap contract)

1. The static shell's `<body>` is **byte-identical** to canonical (it still contains
   emoji *text* in source). Pristine body is what keeps canonical ↔ skin swappable.
2. `premium_icons.js` boot appends the hidden sprite (`<svg id="pi-sprite">`) to
   `<head>`, then a presentational pass replaces emoji text with `<svg><use>` icons.
3. Net effect: **no visible emoji**, one 1.6-stroke family, and engine/DOM untouched.

Phase 3 must keep this pattern: canonical render = omit the three skin blocks;
premium render = include them. New engine UI should call the same sprite
(`<use href="#pi-…">`) rather than duplicating glyph paths.

---

## 5. Rules & change control

1. **No new emoji.** Review any future screen for stray emoji before handoff.
2. **One icon style.** Never mix filled/cartoon/other-weight icons with this family.
3. Colours come from context via `currentColor`; stroke stays 1.6, geometry stays 24×24.
4. Adding a glyph = add the symbol in the builder `I` dict and both artifacts
   (`premium_icons.svg`, `premium_icons.js`), then rebuild and re-run the capture QA.
   Because those artifacts are **locked Phase-2 files**, a new glyph for Phase 3
   ships as an *additive* symbol set in a Phase-3-owned layer, or is approved as a
   versioned change — never an in-place edit of the locked files.
5. Prefer reuse: the 17 glyphs plus the canonical dock set cover the current UI.
6. Name new symbols `pi-<kebab-name>` under the same conventions so the `<use>` swap stays uniform.

---

*Related: `colors.md` (gold star, glyph tints) · `components.md` · `motion_tokens.md`*
