# Design System · Motion Tokens

Studio of Sidecars — the motion language (inherited from the Phase-2 prototype; the
finish layer adds **no** new timing values).

| | |
|---|---|
| Status | Locked reference (Phase 2 approved) |
| Source of truth | `:root` motion tokens in `design/phase2/studio_sidecars_phase2_interactive.html` (verbatim below) |
| Governs | Phase 3 — Live Engine Integration and every future UI phase |
| Character | Subtle, 60 FPS, configurator-calm — never bouncy UI for its own sake |

---

## 1. Duration tokens (verbatim)

```css
:root{
  --p2-t-fast:.18s;       /* 180 ms */
  --p2-t-med:.34s;        /* 340 ms */
  --p2-t-slow:.62s;       /* 620 ms */
  --p2-t-slower:.9s;      /* 900 ms */
  --p2-ease-out:    cubic-bezier(.22,.8,.3,1);   /* standard deceleration */
  --p2-ease-in:     cubic-bezier(.5,0,.75,.4);   /* acceleration */
  --p2-ease-spring: cubic-bezier(.16,1.35,.3,1); /* tiny overshoot pops only */
  --p2-ease-inout:  cubic-bezier(.65,.05,.36,1); /* large choreographed moves */
  --p2-blur:6px;
  --p2-glow:rgba(106,165,255,.5);
}
```

Phase 3 must keep the **same names and numeric values** (either CSS vars or the
matching ms values in Web Animations API calls) so the app never mixes speeds.

---

## 2. When to use which token

| Token | Typical use |
|---|---|
| `--p2-t-fast` 180 ms | Hover colour lifts, icon swaps, chip press feedback, chevron rotation |
| `--p2-t-med` 340 ms | Panel/tray rise, dock active pill cross-fade, tooltip/guide morph, small overlays |
| `--p2-t-slow` 620 ms | Sheet/dialog transitions, environment cross-fades, spotlight moves |
| `--p2-t-slower` 900 ms | Tour progress, large choreography, stage camera feel |

### Approved surface behaviours (already shipped in the finish)
- `:active` press pop — `transform:scale(.96)` on dock buttons (spring-fast, transform only).
- Hover = quiet white-lift colour transitions (180 ms) — no translate, no bounce.
- Tray rise and dock active pill cross-fade (340 ms), `--p2-ease-out`.
- Guide/spotlight morph (340–620 ms).
- Chevron rotates with the `[open]` state (180 ms).
- Stage sweep/sheen and glow are engine-owned Phase-2 behaviours (`.p2s-*`), unchanged.

---

## 3. Rules

1. **Animate transform/opacity only** (GPU-friendly) — never layout properties
   (width, top, padding) for visible motion on touch devices.
2. **60 FPS floor** on Honor Pad and desktop. If a move drops frames, simplify it
   (shorter distance, single layer, no blur animation). Never animate `backdrop-filter`.
3. **Subtlety**: amplitude is configurator-scale, not dashboard-cartoon. No infinite
   idling animations except approved live dots / engine sheen at very low cost.
4. **Reduced motion is mandatory** — the shipped collapse:

```css
@media (prefers-reduced-motion:reduce){
  *{animation-duration:.001s!important;transition-duration:.001s!important;
    animation-iteration-count:1!important;}
}
```

5. **No new timing values.** Everything a future phase animates must map onto the
   four durations + four easings above; genuinely new choreography still reuses the
   token set (pick the closest step) and is documented here.

---

## 4. Cross-phase contract

- The finish layer (visual skin) never changes engine behaviour or these tokens.
- Phase 3 engine transitions (camera moves, environment swaps, apply-feedback)
  should use `--p2-ease-inout`/`--p2-ease-out` at `--p2-t-slow`/`--p2-t-slower`
  with opacity/transform cross-fades, keeping one motion voice across the app.

---

*Related: `glass_material.md` · `components.md` · `honor_pad_guidelines.md`*
