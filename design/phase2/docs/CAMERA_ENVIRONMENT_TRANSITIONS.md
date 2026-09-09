# Camera & Environment Transition Library — Phase 2.2

**Product:** Studio of Sidecars · interaction layer
Defines, with timing, every transition the prototype performs between **cameras** and between the **10 Studio Backgrounds** (Hero is default #0). Numbers below are what the shipped engine runs; Phase 3 must reproduce them with real depth/reflection work.

---

## 1. The stage layout

```
main.stage > div.viewport > section.canvas   (locked chrome)
  └ div.layer.cv-scene.p2s                    ← Phase-2 stage host (replaces demo layer)
      ├ div.p2s-frame                         camera container (preset translate/scale · orbit anim)
      │   ├ div.p2s-par                       pointer parallax wrapper
      │   │   ├ img#p2Cur   (current)         drift anim
      │   │   ├ img#p2Prev  (incoming)        crossfade target
      │   │   ├ grade / rim / beam overlays   light presets (2.4)
      │   │   └ sheen floor sweep
      │   ├ vignette
      │   └ product-zone slot ring
      ├ cam framing flash overlay
      └ render safe-frame overlay (2.7)
```

Camera transforms act on `.p2s-frame`; environment fades act on the image pair inside it; lighting grades act on tint layers. **All three stacks are independent**, so switching environment under a held camera pose is exact.

---

## 2. Environment switch (the headline transition)

| Phase | Time | What happens | Easing |
|---|---|---|---|
| 0 | 0 ms | `#p2Prev.src` = new environment; incoming layer at opacity 0, scale 1.02 (slightly oversized so the settle reads as a camera push) | — |
| 1 | 0 → 620 ms | Incoming fades to opacity 1 over the outgoing frame | `--p2-t-slow ease-out` |
| 1b | 0 → ~600 ms | Incoming settles scale 1.02 → 1.0 | 0.9 s `ease-out` |
| 2 | ~120 ms | Floor sheen sweeps bottom→mid across the stage (screen-floor reflection cue) | `--p2-t-slower ease-out`; fades out by ~900 ms |
| 3 | 900 ms | Source swap: `p2Cur.src = p2Prev.src`, incoming hidden (opacity 0, scale 1.001) | — |
| 4 | 900 ms | Camera framing re-applied so a held preset is never corrupted by the swap | transform 1.1 s `ease-out` |

End-state: only one image is painted (no duplicate decode), current environment remembered in state, switcher card ring updates, mood text + legend updated, toast confirms.

**Idle motion afterwards** — the current image runs the 46 s alternate drift (±1.15 % / scale 1.055) so a static switch never feels frozen.

---

## 3. Camera transitions

| From → To | Behaviour | Duration / easing |
|---|---|---|
| Any preset → any preset | Stage translate/scale re-frames; framing flash overlays the new composition for 1.5 s | 1.1 s `ease-out` |
| → Orbit spin | Class-based 17 s ±7° rotate-Y loop; drift & parallax suspend | 17 s `ease-inout infinite` |
| Orbit → static | Loop removed, static preset re-applied | 1.1 s `ease-out` |
| Double-click stage | Snap back to Front | 1.1 s `ease-out` |
| Empty-canvas toggle | Stage hidden per locked chrome; safe-frame overlay cleared | locked CSS |

---

## 4. Parallel-with transitions

Because environment, camera and lighting are independent layers, these compositions are all legal and one-tap:

- Change background **while** Detail camera is held → new environment arrives already in Detail framing (crossfade happens under the camera transform).
- Pick a light preset **during** an environment settle → grades fade in on the incoming image at the tail of the crossfade.
- Orbit while switching backgrounds → the crossfade rides the turntable; parallax stays off until orbit ends.

**Rule of one motion:** toast only after settle; sheen only on environment change; flash only on explicit camera picks.

---

## 5. Hand-off note (Phase 3)

Real equivalents to implement later:

- Crossfade becomes a proper **frame blend** of two render buffers (or dolly-push between environments with the same Hero camera).
- Sheen becomes the **live floor reflection** resolving to glossy platform quality (Phase 1.5 floor-reflection rule).
- Scale-settle (1.02 → 1) becomes a **real dolly push-in** on scene load; keep the same curve.
- Drift/orbit become **turntable + ambient camera** animation; tokens above define the feel.
