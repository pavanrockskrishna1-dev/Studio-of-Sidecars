# Design System · Spacing & Geometry

Studio of Sidecars — Premium Finish spacing, radius and layout tokens.

| | |
|---|---|
| Status | Locked reference (Phase 2 approved) |
| Source of truth | `design/redesign/skin/premium_tokens.css` + layout constants in `design/studio_sidecars_premium_ui.html` |
| Governs | Phase 3 — Live Engine Integration and every future UI phase |

---

## 1. Spacing scale (4 px grid)

| Token | Value | Typical use |
|---|---|---|
| `--sp-1` | `4 px` | Micro gaps inside a row, icon padding |
| `--sp-2` | `8 px` | Compact gap; inner padding of pills/chips |
| `--sp-3` | `12 px` | Row/padding gap inside cards |
| `--sp-4` | `16 px` | Panel padding, stage insets, dock lift |
| `--sp-5` | `24 px` | Section separation inside rails |
| `--sp-6` | `32 px` | Large grouping / breathing room |

- All spacing is a multiple of 4. Tight inset is allowed down to 2 px only for
  hairlines/seam alignment, never for layout rhythm.
- Chrome density was reduced ≈35 % vs. a typical dashboard: prefer **whitespace**
  over borders; use spacing, not nested-card lines, to separate content
  (see `glass_material.md` §5).

---

## 2. Layout constants (locked, do not change)

| Constant | Canonical (Phase-1) | Premium (same) | Note |
|---|---|---|---|
| `--sb-w` (left rail) | `260 px` | `260 px` | Collapses to `96 px` ≤ 980 px |
| `--in-w` (inspector) | `318 px` | `318 px` | Collapses to `96 px` ≤ 980 px; hidden ≤ 640 |
| `--pad` | `16 px` | `10 px` | Viewport inset for the floating chrome |
| Breakpoints | `1240 / 980 / 640` | same | Tablet, compact, phone |
| Stage | `.viewport` inset `var(--pad)`; `.canvas` fills remainder | same | Showroom, unframed |
| Dock | bottom `16 px`, centered | same | Floating glass pill |

Do **not** change rail widths, breakpoints, or region geometry — the engine and
layout invariance were verified against the canonical shell for all three viewports.

---

## 3. Radius tokens

| Token | Value | Canonical | Use |
|---|---|---|---|
| `--r-lg` | `26 px` | 20 px | Stage/canvas corner, hero containers |
| `--r-md` | `20 px` | 18 px | Glass panels, trays, large sheets |
| `--r-sm` | `12 px` | 13 px | Buttons, rows, small controls |

Context-specific radii (approved, from `premium_finish.css`):

| Surface | Radius |
|---|---|
| Rails `#sideNav`, `.inspector` | 22 px |
| Rail group/card nests | 11–16 px |
| Dock pill | `999 px`; dock buttons 16 px |
| Tray sheet | 20 px; preset tile 16 px (thumb 52 px tall) |
| Segmented controls (workspace chips, stage toggle) | `999 px` pills |
| Logo tile | 13 px |
| Icon wells (`tt-ic`, `ci`, `gi`) | 9–11 px |
| Action buttons `.abtn` | 12 px |

Soft geometry (26/22/20/16/12) is part of the premium read — avoid sharp corners
except in micro wells where 8–9 px keeps icons crisp.

---

## 4. Component spacing map (approved)

| Region | Rule |
|---|---|
| Top bar | `padding:9px 18px 8px`; column gaps 10–12 px; chips separated by 4–7 px |
| Rails | Panel header `padding:0 10px 8px`; group lists gap 4 px; rows min-height 44–46 px |
| Inspector | Card `summary` min-height 50 px; body padding `4px 15px 15px`; control gap 13 px |
| Dock | Pill padding `6px 8px`, button gap 2 px; preset tray padding `12px 14px`, tile gap 8 px |
| Stage HUD | Floating pills sit 14 px from the stage edge |
| Bottom sheet / overlays | 16–24 px from stage edges; learn cards ≥ 24 px padding |

---

## 5. Rules

1. Compose with `--sp-*` tokens, never one-off px (except the approved micro set).
2. One region, one padding language — do not mix 10 px and 16 px glass insets arbitrarily.
3. Density targets: desktop chrome ≈35 % lighter than a dashboard; tablets even airier.
4. Touch spacing between discrete targets ≥ 8 px on Honor Pad; see `honor_pad_guidelines.md`.
5. Geometry changes (widths/breakpoints) require layout-invariance re-verification and a phase change — never an in-place edit.

---

*Related: `colors.md` · `glass_material.md` · `components.md` · `honor_pad_guidelines.md`*
