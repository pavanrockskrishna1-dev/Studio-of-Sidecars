# Learn Studio · Onboarding Flow — V1–V6 (Phase 2.5)

**Product:** Studio of Sidecars
**Entry points:** top bar **Learn Studio** (and **Help**) — also replayable any time; first-run auto-suggestion toast points at the environment switcher.
**Format:** 11-step guided overlay tour. Each step: dim veil + **highlight box** that morphs (340 ms `ease-out`) around the referenced element + bottom **guide card** with title, copy, dot progress, and Back / Skip / Next (or Start creating on the last step).
**Layer rule:** the tour only *highlights and dims*; it never mutates or hides locked chrome.

---

## 1. Step table (exact copy shipped in the engine)

| # | Guide title | Highlight target | Copy (summary) |
|---|---|---|---|
| 1 | Welcome to Studio of Sidecars | `#topStrip` (whole top rail) | Six workspaces, kept scene across switches, choose **V1–V6** any time |
| 2 | V1 · Classic | `.vchip[data-vid="classic"]` | Clean real-time showcase workspace for hero shots |
| 3 | V2 · Instagram Commercial | `.vchip[data-vid="commercial"]` | Default workspace — 9:16 reel ready, cinematic lighting + one-tap presets |
| 4 | V3 · Blender Python | `.vchip[data-vid="blender"]` | One-tap offline Cycles render pack export (PNG + MP4 pipeline) |
| 5 | V4 · Creator Studio | `.vchip[data-vid="creator"]` | One-tap shot builder + playable reel workflow |
| 6 | V5 · Asset Library | `.vchip[data-vid="assetlib"]` | Tap-to-place embedded assets, search & favourites |
| 7 | V6 · Brand Studio | `.vchip[data-vid="brandstudio"]` | Brand kits, watermarking, Creator Hub: projects/presets/batch export |
| 8 | The stage & environment | `.canvas` (stage) | Live studio background — Studio Backgrounds switches the **10 environments**; only the background changes |
| 9 | Creator dock | `#dock` | Select · Camera · Lighting · Materials · Floor · Render → one-tap preset trays |
| 10 | Inspector | `aside.inspector` | Camera / Lighting / Materials / Render cards — exclusive accordion |
| 11 | You're ready | *(none — full view)* | Tap anywhere to begin; reopen anytime via **Learn Studio** |

---

## 2. Interaction & motion contract

- Dots show position (`0/11` style label + expanding active dot), Back/Skip/Next per step; final step swaps to **Start creating**.
- Highlight box = element rect inflated by the per-step gap (20 px chips, 40 px rails, 70 px stage) → 2 px accent ring + huge soft shadow that dims the rest of the app.
- Highlight element missing at any moment (e.g., a workspace chip collapsed by responsive layout) → the step still plays with the card; box hides gracefully. No step is skipped silently.
- Escaping: **Skip** exits; **Start creating** exits; pressing anywhere behind the card on non-highlight steps is not intercepted (Next is always available on the card).
- Overlays reuse the locked `#sosOv` host — content is injected per use and fully cleared on exit (nothing leaks between tours/export).

---

## 3. Workspace heritage mapping (V1–V6)

The tour teaches the six workspaces in **left-to-right order of the chips**, matching the product heritage of the prior multi-version studio (Classic showcase → Instagram reel/commercial pipeline → Blender Cycles offline export → Creator one-tap shots → Asset Library → Brand Studio/Creator Hub). **V2 Instagram Commercial is the default** boot workspace shown in the splash, so first-time users land on the money path and the tour orients around it.

---

## 4. Phase-3 note

Steps 8–10 become live tooltips bound to engine tool state once the real rig loads: highlight a *selected* part after Select, show live render dims after a Render pick, etc. Step content and order are engineered to stay valid — copy lives in one `STEPS` array.
