# Motion Specification & Animation Tokens — Phase 2.6

**Product:** Studio of Sidecars · Interaction & Motion Layer (Phase 2)
**Scope:** every animated surface in the interactive prototype must read as premium, stay subtle, and complete at **60 FPS** on an Honor Pad (834×1112 / 1194×834) and desktop.
**Layer rule:** no animated value ever mutates the locked Phase-1 layout metrics or the frozen Hero / Studio-Background pixels — motion is applied as an overlay (transform, opacity, filters) only.

---

## 1. Tokens (single source of truth)

Defined once on `:root` in the Phase-2 stylesheet and reused by every rule.

| Token | Value | Use |
|---|---|---|
| `--p2-t-fast` | **180 ms** | hover lifts, chip presses, icon pops, immediate feedback |
| `--p2-t-med` | **340 ms** | tray/environment-bar open/close, toast in/out, guide highlight moves, slot flash |
| `--p2-t-slow` | **620 ms** | image crossfade, light-grade transitions, splash fade, onboard card switches |
| `--p2-t-slower` | **900 ms** | long settle of environment scale, sheen return, modal completes |
| `--p2-ease-out` | `cubic-bezier(.22,.8,.3,1)` | default entrance & settling (fast start, soft landing) |
| `--p2-ease-in` | `cubic-bezier(.5,0,.75,.4)` | exit/departure, anything that must disappear without lingering |
| `--p2-ease-spring` | `cubic-bezier(.16,1.35,.3,1)` | playful recoveries: card enter from the switcher row, dock press |
| `--p2-ease-inout` | `cubic-bezier(.65,.05,.36,1)` | long loops (orbit, loading bar) and reversible tweens |
| `--p2-blur` | `6 px` | glass blur used behind floating bars/pills/toasts |
| `--p2-glow` | `rgba(106,165,255,.5)` | accent halo for active chips, guide ring, camera flash |

**Reduced motion** (global rule, lowest layer): under `prefers-reduced-motion: reduce`, every animation/transition is collapsed to ~0.001 s while staying functional.

---

## 2. Perf contract (60 FPS)

1. **Animate only `transform` and `opacity`** for chrome and stage layers — never `top/left/width/height` except one-shot geometry (safe frame sizing), never `filter` during a tween except on tiny glyphs.
2. `will-change: transform, opacity` is declared only on the stage frame, crossfade images, env cards, and toast — on the few elements that actually tween continuously. No blanket `will-change:auto→all`.
3. Stage imagery is pre-scaled JPEG proxies (1440×960, 41–298 KB) embedded as data URIs; decode cost is paid once at load, not per frame.
4. Pointer-parallax is **disabled when `pointer:coarse`** (tablet touch) and gated to a rAF; crossfade swap copies `src` (no re-decode).
5. Splash / guide / export overlays use `backdrop-filter` only while visible and are fully removed from the tree when closed.

---

## 3. Component choreography

| Surface | What it does | Timing / easing |
|---|---|---|
| Boot splash | Card fade-rise in, indeterminate bar loop | fade-in `--p2-t-slow ease-out`; bar loop 1.1 s `ease-inout`; total 1.2 s, auto-hide |
| Toast | Slide 16 px up + fade; auto-dismiss | in `--p2-t-med spring`, out `--p2-t-med ease-in`; holds ~1.8–3.2 s |
| Environment switcher bar | Bar + cards rise & spring in; header separate | bar `--p2-t-med spring`; cards `--p2-t-slow ease-out both` staggered by DOM (animation-fill both) |
| Env card hover | Lift −3 px + 1.015 scale, edge glow, “APPLY” tag reveal | `--p2-t-fast ease-out` |
| Environment switch | Crossfade (below), incoming layer settles from 1.02 → 1, floor sheen sweeps bottom→mid | fade `--p2-t-slow ease-out`; settle 0.9 s; sheen `--p2-t-slower ease-out` |
| Cinematic drift (idle) | Background drifts ±1.15 % / scale to 1.055 over 46 s, alternate | 46 s `ease-in-out infinite alternate` (imperceptible per frame; kills “sticker” feel) |
| Camera preset move | Stage re-frames via translate/scale on the frame | 1.1 s `ease-out`; framing flash overlays 1.5 s (animates 0→1→0) |
| Orbit spin | Auto rotate-Y ±7° + breathing scale, 17 s loop | 17 s `ease-inout infinite` (manual move still available) |
| Pointer parallax (desktop) | Stage counter-moves ±1.15 % / ±0.85 % under the cursor | 0.55 s `ease-out`, rAF-throttled |
| Light preset switch | Grade, rim, beam overlays cross-fade tints | `--p2-t-slow ease-out` on opacity + background |
| Material pick | Slot ring flash + finish-coloured glow pulse | flash ring `.flash` 1.7 s; glow 0.6 s `ease-out` |
| Dock press | Btn lift −2 px → spring pop (1.14 scale) on `.on` | `--p2-t-fast spring`; pop `--p2-t-med spring` |
| Version chip pop | Selected workspace chip pops scale .96→1.045 | `--p2-t-slow ease-out` |
| Chip / row hover | Micro lift on rchips, tiles, rows, action buttons | `--p2-t-fast ease-out` |
| Inspector accordion | Card exclusive states animate as locked chrome allows | native Phase-1 timing preserved; no new override |
| Guide overlay | Highlight box morphs between targets + dim veil; card transitions | box `--p2-t-med ease-out`; veil `--p2-t-med` |
| Export modal | Rows step-lock with spinner dots, then success; completion toast | row 520 ms cadence; finish pop `--p2-t-med spring` |

---

## 4. Tonal guidance

- **One motion at a time.** The stage, the switcher bar, and the toasts never animate together; toasts de-prioritise behind modal/guide overlays.
- **Distance = time.** Big geometry (environment settle) uses slow/springy; micro UI uses fast. Nothing decorative ever exceeds ~1.5 s except idle loops and the 46 s drift.
- **Loudness budget.** Sheen sweep fires only on environment change; cam flash only on explicit camera preset pick; drift/parallax are < 1.2 % so they read as *alive* rather than *moving*.
- **Truthfulness.** Every animation in the prototype stands in for a Phase-3 engine behaviour; the spec below documents the intended real-world equivalent so motion survives engine integration unchanged in *feel*.

---

## 5. Hand-off note (Phase 3)

These tokens are exposed as CSS custom properties on the same `:root`, so the live engine layer can be dropped in without re-tuning durations. Real camera/elevation work (dolly, focus pull, DoF, ray-traced reflection of the floor) will inherit the same curves — see *Camera & Environment Transition Library*.
