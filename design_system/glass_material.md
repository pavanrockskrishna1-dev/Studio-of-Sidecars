# Design System · Glass Material

Studio of Sidecars — the single quiet-glass material system.

| | |
|---|---|
| Status | Locked reference (Phase 2 approved) |
| Source of truth | `design/redesign/skin/premium_finish.css` (all chrome rules) + tokens in `skin/premium_tokens.css` |
| Governs | Phase 3 — Live Engine Integration and every future UI phase |
| Benchmarks | Apple Vision Pro · Porsche / Audi configurators · Substance 3D Stager · Vectary — one calm material, no busy chrome |

---

## 1. The material (one recipe, tuned by opacity only)

All chrome is the **same deep-charcoal translucent glass**. Vary opacity, blur and
elevation by how much the surface must recede — never introduce a second "material".

| Property | Value |
|---|---|
| Base hue | Deep charcoal `#0a0d12…` family |
| Fill | `--glass-panel: rgba(14,17,23,.62)` (floating panels) · `--glass-rail: rgba(8,10,14,.55)` (rail base) |
| Backdrop blur | **28–30 px** with `saturate(1.35–1.4)` |
| Hairline | `1 px rgba(255,255,255,.06–.075)` (`.075` default token) |
| Inset top highlight | `inset 0 1px 0 rgba(255,255,255,.04–.06)` — the only "edge light" |
| Elevation | Large soft shadows, never hard drop shadows |
| Corners | 22 px rails · 20 px trays · 16 px dock buttons · 999 px pills |
| Fallback | Fill is translucent before `backdrop-filter`, so surfaces degrade gracefully where blur is unsupported |

Reference declarations (`premium_finish.css`):

```css
#sideNav,.inspector{            /* rails */
  border-radius:22px;
  background:linear-gradient(180deg,rgba(13,16,22,.74),rgba(8,10,14,.62));
  border:1px solid rgba(255,255,255,.06);
  backdrop-filter:blur(30px) saturate(1.4);
  box-shadow:0 26px 70px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.04);
}
#dock{                          /* floating dock pill */
  bottom:16px; border-radius:999px;
  background:rgba(9,12,17,.68);
  border:1px solid rgba(255,255,255,.07);
  backdrop-filter:blur(28px) saturate(1.35);
  box-shadow:0 30px 80px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06);
}
.trays{                         /* contextual preset sheet */
  background:rgba(10,13,18,.74); border-radius:20px; padding:12px 14px;
  backdrop-filter:blur(28px) saturate(1.35);
  box-shadow:0 26px 70px rgba(0,0,0,.55);
}
.cv-toggle,.cv-tag,.cv-status .pill{   /* tiny stage HUD chips */
  background:rgba(7,9,13,.5); border:1px solid rgba(255,255,255,.06);
  backdrop-filter:blur(14px);          /* small floats blur less */
}
```

---

## 2. Surface ladder (what sits on what)

| Layer | Surface | Notes |
|---|---|---|
| 0 · Void | Page `#05060a` gradient + `.canvas #030409` | Stage must read as a room, product-owned |
| 1 · Quiet rails | `#sideNav` (260 px) & `.inspector` (318 px) glass | Highest blur (30 px); floating off the stage edges |
| 2 · Dock & trays | Floating pill + contextual sheets | Second blur step (28 px); appears only when needed |
| 3 · Stage HUD | Tiny chips (toggle, tag, status) | Lighter blur (14 px) keeps chips inexpensive |
| 4 · Text & controls | White-lift chips, hairlines | 0-blur elements that sit on glass |

Rule: **content sits on glass, glass sits on the void** — nothing sits on content.

---

## 3. Loudness ladder (in place of card borders)

- Default controls: text `--muted`/`--txt2`, hairline border, transparent glass fill.
- **Hover = white lift**: `rgba(255,255,255,.03–.05)` fill, text to `#fff`.
- **Active/"on" = white-lift chip**: `rgba(255,255,255,.06–.1)` fill + `--line-hi` border.
- **Hero / primary = solid white** CTA (Export). White is the loudest step.
- **Accent blue** is reserved for active/live states only (see `colors.md` §4).

This is why chrome stays monochrome by default and only the product (and one white
CTA) commands attention.

---

## 4. Unframed showroom stage

- The canvas is a rounded near-black room (`#030409`, radius 26 px) with a **hairline
  inner edge** (`inset 0 0 0 1px rgba(255,255,255,.03)`) — not a bordered panel.
- The product (sidecar, object) owns **80–85 % of visual attention**; chrome recedes.
- Do not draw frames, watermarks, or labelled boxes around the stage in future phases.

---

## 5. Rules & performance

1. **One material.** No flat white panels, no blue glass, no extra blur styles.
2. **Fewer nested borders.** Separate content with spacing; only one hairline per
   surface boundary (chrome ≈35 % lighter than a dashboard).
3. Blur on **fixed chrome only** — rails, dock, trays, stage chips. Never per-row,
   per-card, or behind scrolling lists (backdrop-filter cost → dropped frames).
4. Keep blur ≤ 30 px and saturation gentle (1.35–1.4); high blur on huge areas
   damages 60 fps on Honor Pad.
5. Honor `prefers-reduced-motion`; glass itself is static (see `motion_tokens.md`).
6. New surfaces must copy the ladder recipe — a future component cannot invent its
   own fill/blur/border combination without a design-system entry.

---

*Related: `colors.md` · `spacing.md` · `components.md` · `honor_pad_guidelines.md`*
