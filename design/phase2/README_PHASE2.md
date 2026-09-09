# Studio of Sidecars — Phase 2 · Interactions & Motion

**Status: COMPLETE (prototype + docs). Phase 1 / 1.5 remain locked and untouched.**
Phase 3 (live engine integration) has **not** started.

---

## What this folder is

A **single-file, self-contained interaction prototype** layered on the frozen Phase-1 premium shell. It demonstrates every Phase-2 scope item without a live 3D engine and without touching any locked asset:

- 2.1 Camera preset library (Front · ¾ hero · Side · Detail · Top · Orbit spin)
- 2.2 Environment switcher — full-bleed Studio Backgrounds (Hero default + the 10 presets), crossfade + settle + floor sheen
- 2.3 Material/finish hit-tests & finish previews on the product-zone ring
- 2.4 Lighting presets (Softbox · Café window · Golden hour · Night neon · Backlit rim + Colour grades)
- 2.5 Learn Studio onboarding tour (11 steps, V1–V6 workspaces)
- 2.6 Motion polish (boot splash, toasts, dock pop, chip motion, idle drift, pointer parallax, reduced-motion support)
- 2.7 Render presets + export workflow modal (9:16 reel · 1:1 · 4:5 · 16:9 · Blender Cycles/GLB)

## Main deliverable

**`studio_sidecars_phase2_interactive.html`** — open in any browser (offline, single file; environment imagery embedded as data URIs). Also downloadable for the Honor Pad. No build step.

## Locked-file guarantees

- `../studio_sidecars_premium_ui.html` (Phase 1) — **byte-identical**, never written by this phase.
- `../environments/…` Hero + 10 Studio Backgrounds (Phase 1.5) — read-only; the prototype embeds *derived display proxies* (1440×960 JPEG), never the 4K masters, and never writes them.

## Docs (`docs/`)

| File | Covers |
|---|---|
| `MOTION_SPEC_tokens.md` | Tokens (180/340/620/900 ms, easing curves, blur/glow), 60 FPS contract, component choreography, hand-off notes |
| `CAMERA_PRESET_LIBRARY.md` | 2.1 preset table, framing-system map, pairing checklist |
| `CAMERA_ENVIRONMENT_TRANSITIONS.md` | 2.2 timing sequence for environment crossfade & camera moves, composition rules |
| `ONBOARDING_V1_V6.md` | 2.5 full 11-step tour table, motion contract, workspace mapping |

## Source layout

```
phase2/_src/p2.css        interaction & motion stylesheet (builds into the file)
phase2/_src/p2.js         engine: stage, switcher, presets, tour, export (builds in)
phase2/_src/build.py      assembles the single file from the locked shell + css + js
phase2/_uri/*.b64        base64 proxies of the 11 environments (+ manifest.json)
phase2/_runtime/*.jpg    the 1440×960 display proxies (source of the b64)
phase2/exports/*.png     QA evidence boards (1440×900, 1194×834, 834×1112)
```

Rebuild after edits: `python3 phase2/_src/build.py`.

## Verified

Headless QA at 1440×900, 1194×834 and 834×1112: default, env switching, camera/lighting/render picks, export modal, onboarding — **0 console/page errors**, no horizontal overflow, switcher never overlaps the dock in portrait.
