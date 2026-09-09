# Design System · Colors

Studio of Sidecars — Premium Finish visual language.

| | |
|---|---|
| Status | Locked reference (Phase 2 approved) |
| Source of truth | `design/redesign/skin/premium_tokens.css` — the `:root` block (`#skin-tokens`) |
| Baseline it overrides | `:root` in `design/studio_sidecars_premium_ui.html` (Phase-1 canonical tokens) |
| Governs | Phase 3 — Live Engine Integration and every future UI phase |
| Type scale / spacing / glass | `typography.md` · `spacing.md` · `glass_material.md` |

---

## 1. Principles

1. **Chrome is monochrome by default.** The product on stage is the only "colored" element; the app chrome is a quiet scale of near-black glass, white hairlines and grey text.
2. **Electric blue is reserved for active/live/attention states only.** It is a *signal*, never a decoration. No blue gradients, blue glows, or blue fills on idle or inactive controls.
3. **One accent family, used rarely.** Fewer, colder accents read more premium than constant highlighting.
4. **Every colour is a token.** No ad-hoc hex in new code — reference the variable.

---

## 2. Token set (Premium Finish, approved values)

### 2.1 Surfaces & atmosphere

| Token | Value | Use |
|---|---|---|
| `--bg` | `#05060a` | Base page colour (deep, near-black charcoal) |
| `--bg2` | `#0a0c11` | Secondary page colour (top-of-gradient) |
| `body` background | `radial-gradient(1100px 620px at 74% -8%, rgba(255,255,255,.03), transparent 60%), radial-gradient(900px 620px at 4% 110%, rgba(255,255,255,.02), transparent 55%), linear-gradient(180deg,#07080d,#05060a 46%)` | Page atmosphere — faint white sheen top-right, floor glow bottom-left, never colourful |
| `.canvas` (stage) | `#030409` | The showroom stage. Near-opaque void so the product owns 80–85 % of attention |

### 2.2 Glass surfaces

| Token | Value | Use |
|---|---|---|
| `--glass-panel` | `rgba(14,17,23,.62)` | Standard glass panel fill (trays, floating chips) |
| `--glass-rail` | `rgba(8,10,14,.55)` | Rail base fill (left/right rails gradient bottom) |
| `--card` | `rgba(20,24,31,.5)` | Quiet card fill (rows, tiles, nested surfaces) |
| `--card-hi` | `rgba(28,33,42,.72)` | Elevated card fill |
| Rails gradient | `linear-gradient(180deg, rgba(13,16,22,.74), rgba(8,10,14,.62))` | `#sideNav` / `.inspector` glass body |

Full recipe (blur, saturation, hairline, inset highlight, shadows) in `glass_material.md`.

### 2.3 Hairlines & shadows

| Token | Value | Use |
|---|---|---|
| `--hairline` (`--line`) | `rgba(255,255,255,.075)` | Default 1 px separators / borders |
| `--line-hi` | `rgba(255,255,255,.14)` | Emphasised border (hover/raised) |
| `--shadow` | `0 40px 110px rgba(0,0,0,.66), 0 2px 10px rgba(0,0,0,.5)` | Elevation: rails, overlays |
| `--shadow-sm` | `0 16px 40px rgba(0,0,0,.42)` | Small elevation: chips, trays |

### 2.4 Text ladder

| Token | Value | Role | Contrast on `#05060a` (approx.) |
|---|---|---|---|
| `--txt` | `#f5f7fa` | Primary text / titles / active | ~19:1 |
| `--txt2` | `#b9c2d0` | Secondary text | ~11:1 |
| `--muted` | `#7e8796` | Meta text, disabled-ish | ~5.5:1 |
| `--faint` | `#535d6c` | Micro captions, eyebrow grey, tags (decorative only) | ~2.9:1 |

### 2.5 Accent (reserved)

| Token | Value | Permitted uses |
|---|---|---|
| `--acc` | `#6aa5ff` | Active accent text/lines, live dots, engine highlight |
| `--acc2` | `#a6c8ff` | Brighter accent for the *current* state marker |
| `--accsoft` | `rgba(106,165,255,.12)` | Faint active wash behind a selected control |
| `--accline` | `rgba(150,195,255,.38)` | Active hairline |
| `--ok` | `#34d399` | Live / online / private-lock status green (kept from canonical) |

Engine-owned accent (Phase-2 interactive token, consumed not changed): `--p2-glow: rgba(106,165,255,.5)` for the 3D stage highlight beams only.

### 2.6 Component palette (approved specific values)

| Element | Value |
|---|---|
| Primary CTA (`#tbExport`) | Fill `#fff`, text `#0a0c11` — the single white accent in chrome |
| Logo tile | `linear-gradient(160deg, rgba(255,255,255,.12), rgba(255,255,255,.025))` + hairline `rgba(255,255,255,.11)` |
| Favourite star glyph | Gold `#d8b45c` (fill, stroke none) |
| Private-workspace lock glyph | Green `#9fdcbd` on `rgba(255,255,255,.03)` tile |
| Live dot (project pill) | Glow `rgba(120,220,180,.7–.8)` |
| Active-chip index letter (`vchip.on i`) | `#9ec2ff` (only place accent is on a quiet control label) |
| Focus ring | `1.5px rgba(150,195,255,.55)` offset 2 px |
| Text selection | `rgba(106,165,255,.25)` |
| Scrollbar thumb | `#232b38` |
| Preset-tile selected ring | `rgba(255,255,255,.2)` + `0 0 0 3px rgba(255,255,255,.04)` (white-lift, not blue) |

---

## 3. Canonical → Premium mapping

| Surface | Phase-1 canonical | Phase-2 premium | Direction |
|---|---|---|---|
| `--bg` | `#0b0d11` | `#05060a` | Deeper |
| `--bg2` | `#10141b` | `#0a0c11` | Deeper |
| `--glass` | `rgba(18,21,28,.78)` | `rgba(14,17,23,.62)` | More transparent (floating) |
| `--card` | `rgba(23,28,36,.92)` | `rgba(20,24,31,.5)` | Much lighter touch (quiet cards) |
| `--card-hi` | `rgba(29,35,45,.97)` | `rgba(28,33,42,.72)` | Lighter |
| `--line` | `rgba(255,255,255,.08)` | `rgba(255,255,255,.075)` | Softer hairline |
| `--acc` | `#2f7bff` (default blue, used freely) | `#6aa5ff` (rarer, cooler) | Reserved |
| `--r-lg/-md/-sm` | 20 / 18 / 13 | 26 / 20 / 12 | Softer geometry |
| `--pad` | 16 | 10 | Floating inset stage |

Rule of thumb for the future: **premium is deeper, lighter, softer and quieter than canonical**, never louder.

---

## 4. When is blue allowed? (enforcement list)

**Allowed (active / attention):**
- Keyboard focus ring and text selection.
- The active workspace chip's index letter + its live dot glow.
- The active stage mode in `#stDemo`/`#stEmpty`? No — active stage toggles use **white solid fill**; blue stays off them.
- Engine stage highlight beams (`--p2-glow`), live-status dots.
- Links/hot actions *only if* the component is documented as accent-bearing.

**Never:**
- Blue gradient or glow on an inactive control.
- Blue borders on idle buttons/chips.
- Blue body/label text (labels are grey).
- Blue on hover (hover is a *white lift*, see `components.md`).

---

## 5. Change control

- Phase 3 and later must **reference tokens by name**; they must not restate raw colour values.
- Adjusting a token value is a **visual-language change** — record it in the design system and gate it through the same approval used for a phase. The locked Phase-1/1.5/2 files are never edited in place; changes arrive as a new versioned layer (the skin-over-canonical pattern from Phase 2).
- New colour needs: a token + an entry in this file + usage in exactly one place first (prove it), then expand.

---

*Related: `typography.md` · `spacing.md` · `glass_material.md` · `components.md` · `icons.md` · `motion_tokens.md` · `honor_pad_guidelines.md`*
