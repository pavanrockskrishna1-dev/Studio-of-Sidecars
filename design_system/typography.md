# Design System · Typography

Studio of Sidecars — Premium Finish type language.

| | |
|---|---|
| Status | Locked reference (Phase 2 approved) |
| Source of truth | `design/redesign/skin/premium_tokens.css` (type tokens) · component rules in `skin/premium_finish.css` |
| Governs | Phase 3 — Live Engine Integration and every future UI phase |
| Honor Pad floors | `honor_pad_guidelines.md` (readability floor 13–15 px body) |

---

## 1. Family (single stack, no web fonts)

```
--font: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Inter,
        Roboto, "Helvetica Neue", Arial, sans-serif;
```

The product is fully offline/single-file, so the UI uses the system UI stack only —
Apple Vision Pro / Porsche / Audi-class configurators are *native-feeling*, not
display-type driven. Never introduce a webfont into the offline artifact.

---

## 2. Type tokens (three-level hierarchy: display · body · meta)

| Token | Size | Weight | Line height | Role |
|---|---|---|---|---|
| `--t-display` | `20 px` | `800` | `1.1` | Numeric/hero readouts, big stat — *rare* |
| `--t-body` | `13 px` | `650` | `1.45` | Readable body/copy floor on desktop |
| `--t-body-sm` | `12.5 px` | `650` | — | Secondary body |
| `--t-meta` | `10.5 px` | — | `1.4` | Meta, timestamps, captions |
| `--t-caption` | `9.5 px` | — | — | Micro labels — accessory only, never essential |
| `--t-eyebrow` | `10 px` | `800` | — | Uppercase section eyebrows, `letter-spacing .24em` |

Spacing: `--t-display-lh:1.1`, `--t-body-lh:1.45`, `--t-meta-lh:1.4`, `--t-eyebrow-ls:.24em`.

### Usage rules
- Body text (13 px on desktop) is for things the user reads; meta (≤10.5) is for
  things that decorate; captions (≤9.5) only for non-essential footers/legends.
- Line height is spacious by default (1.45 body) — do not compress multi-line chrome text.
- Eyebrows are **uppercase, tracked**, and grey (`#4f5a69`–`#6c7686`); they replace boxed labels.

---

## 3. Approved chrome sizes (component map)

| Component | Size / weight | Notes |
|---|---|---|
| Brand title `#soTitle` | 15 px / 750, `-0.01em` | Only 15 px string |
| Brand tag `#soTag` | 8.5 px / `.22em` uppercase | Decorative |
| Project pill `#projPill` | 12 px / 650 | |
| Workspace chip `.vchip` | 11.5 px / 650 | Micro index `i` = 8.5/800, `.cd` dot |
| Action button `.abtn` | 12–13 px / 650–750 | Primary 750 |
| Side header `.phead .t` | 10 px / 800 / `.24em` eyebrow | `.phead .s` = 10.5–12 / 650 |
| Group title `.gn` | 12.5 px / 700 | Count pill `.gc` = 9 px / 700 |
| Version row `.vrow .vn b` | 12.5 px / 650 | Sub-line 9.5 px |
| Tile `.tile b` | 11 px / 650 | Sub-line 9 px |
| Card title `.ct b` | 13 px / 700 | Sub-line 9 px |
| Field label | 10–11.5 px / 750, `0.06em` | Labels sit above controls |
| Radio chips `.rchip` | 11.5–13 px / 600 | |
| Inspector rows `.mat-row .mn b` | 12 px / 650 | |
| Micro metric `.micro .m b` | 11 px | |
| Dock label `.dk-btn` | 9.5 px / 700 | Accessory under icon |
| Tray label `.tray-lbl` | 8.5 px / 800 / `.22em` | Uppercase eyebrow |
| Stage HUD `.cv-*` | 9.5–12 px | Pill text 10.5–11 |
| Tags `.tag` | 10.5–12.5 px / 650 | |
| Side footer `.side-foot b` | 11 px / 650 | |

Weights used across the product are **650 · 700 · 750 · 800** only; numerals inherit.

---

## 4. Honor Pad readability floor (verbatim from `premium_finish.css`)

```css
/* honor pad readability floor */
@media (max-width:1240px) and (orientation:landscape), (max-width:900px){
  .vrow .vn span,.proj-row .pi span,.tile span,.mat-row .mn span,
  details.card>summary .ct span,.side-foot span,.phead .s{font-size:11.5px}
  .vrow .vn b,.proj-row .pi b,.mat-row .mn b,.tile b{font-size:13.5px}
  .rchip{font-size:13px}
  .abtn{font-size:13px}
  .tag{font-size:12.5px}
  .field label{font-size:11.5px}
}
```

Interpretation (locked):
- **Body/primary text ≥ 13.5 px** on Honor Pad landscape and portrait.
- **Meta/secondary ≥ 11.5 px** — never below on a touch screen.
- Any new Phase-3 text introduced on a pad viewport must respect these floors:
  13–15 px for anything readable, 11.5 px for supporting text, and no *essential*
  content below 11 px.

---

## 5. Rules

1. Use the token/floor system — do not invent sizes (exceptions require a note here).
2. Keep the three-level hierarchy; a screen should read as display → body → meta, never flat.
3. High contrast: body `#f5f7fa` on `#05060a` (≈19:1); never drop body text below `--txt2` grey.
4. Uppercase, tracked text is for eyebrows and micro status only — not sentences.
5. On very small HUD chrome use `font-variant-numeric` default tabular where numbers change
   (engine readouts) to avoid jitter.
6. No italic, no underline body links, no emoji glyphs in text (see `icons.md`).

---

*Related: `colors.md` · `spacing.md` · `honor_pad_guidelines.md` · `components.md`*
