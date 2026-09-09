# Camera Preset Library — Phase 2.1

**Product:** Studio of Sidecars · Interaction layer
**How it runs now:** virtual framing applied to the full-bleed Studio-Background stage (translate + scale on the stage frame + a short “framing flash” guide). Phase 3 will reproduce the same framing with a real camera rig on the loaded product.

---

## 1. Presets (exact names, as shipped)

Six one-tap presets. They are what the Camera tray and the Inspector → *Framing* chips write to.

| Preset chip | Virtual value | Lens marker | Intended shot |
|---|---|---|---|
| `Front` | scale 1.00 · x 0 % · y 0 % | 24 mm | Hero lock — the standard front product hero (matches Hero camera perspective) |
| `¾ hero` | scale 1.055 · x −2.2 % · y −1.6 % | 28 mm | Three-quarter marketing hero, slight push-in, camera left |
| `Side` | scale 1.015 · x −4.0 % · y +0.4 % | profile | True profile pass along the platform axis |
| `Detail` | scale 1.16 · x +3.0 % · y +0.8 % | 70 mm | Compressed macro emphasis on the product zone |
| `Top` | scale 1.10 · x 0 % · y −3.2 % | aerial | Straight-over shot for layouts / fabric prints |
| `Orbit spin` | auto 17 s ±7° rotate-Y + breathing scale 1.02–1.045 | turntable | Autonomous shelf/display turntable (engine: turntable dolly) |

**Interaction contract**

- Every pick animates the stage move over **1.1 s `cubic-bezier(.22,.8,.3,1)`** (no linear snaps).
- The pick flashes a thin framing guide (1.5 s) showing the recomposed frame around the product zone, then fades.
- `Double-click the stage` = back to `Front` (reset).
- `Orbit spin` disables idle drift and pointer parallax while active (they would fight the turntable); picking any other preset re-enables them.
- Chip state is exclusive within its group and echoed in the Canvas-status pill (`CAM · <name>`).

---

## 2. Framing system map

1. **Stage frame** — camera container. Receives preset translate/scale; carries the orbit animation class.
2. **Parallax wrapper** — ±1.15 % / ±0.85 % pointer counter-move (desktop only; `pointer:fine` gated). Nested so real camera and pointer parallax never fight the same property.
3. **Crossfade pair** — two cover images; the environment switcher crossfades between them *inside* the current camera framing, so camera and environment are orthogonal, composable layers.
4. **Product zone guide ring** (`.p2-slot`) — the empty centre platform area reserved for the product in Phase 3; visible in Learn mode and during material feedback. It rides with the camera frame.

---

## 3. Reel checklist for shots

| Shot goal | Preset | Light preset to pair |
|---|---|---|
| Hero default | Front | Softbox |
| Launch key art | ¾ hero | Golden hour / Backlit rim |
| Texture / finish close | Detail | Café window |
| Shelf layout sheet | Top | Softbox |
| Social proof loop | Orbit spin | Night neon |

---

## 4. Hand-off note (Phase 3)

The real camera rig should adopt:

- 24 mm hero default on the locked Hero perspective (no floor-line drift),
- 28 mm three-quarter as the “product face” angle,
- 70 mm for finish material hit-tests (matches 2.3),
- turntable easing of `cubic-bezier(.65,.05,.36,1)` for Orbit,
- the same 1.1 s camera *settle* curve so UI and engine agree.
