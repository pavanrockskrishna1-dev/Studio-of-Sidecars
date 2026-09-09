# 🔥 BBQ Bike 3D Studio — Single File Viewer

**One file. No installs. No internet needed. Works with ANY `.glb`.**

## Files

| File | What it is |
|---|---|
| `BBQ_Bike_3D_Viewer.html` | **The finished app — a single self-contained HTML file.** All 3D engine code (three.js), the demo BBQ-bike model, and every feature are baked inside it (~1.1 MB). Double-click it in any modern browser (Chrome/Edge/Firefox/Safari) and it just works — even offline. |
| `demo-bbq-bike.glb` | The demo model (52 parts, chrome/paint/wood materials, built-in wheel-spin animation) in case you want to upload it manually. |

## What it does — all working, verified, zero console errors

- **Opens instantly showing a demo BBQ bike** (embedded — no file needed).
- **Upload any `.glb` / `.gltf`** (button or **drag-and-drop anywhere**). Every model is auto-centered and scaled to the same stage. Add several models at once — each appears in the Models list (show/hide 👁️, delete 🗑️).
- **Parts editor** — every mesh is listed; select one to recolor it, apply materials (chrome / glossy / metal / gloss paint / matte / rubber / glow), move (X/Y/Z), rotate, scale, or hide it.
- **Animation player** — if the `.glb` contains animation clips (Blender keyframes/rigs), pick a clip and press **Play**. The demo bike's wheels spin.
- **7 lighting presets** (Studio, Sunset, Dawn, Night, Warehouse, Forest, Ocean), background colour, backdrop image, brightness.
- **Turntable auto-rotate** with speed, **6 camera angles**, fit/reset view, grid, wireframe.
- **Capture** — 📷 PNG photo, 🖼️ 4K PNG, ⏺️ WebM video recording (Chrome/Edge/Firefox desktop). Perfect for Instagram reels/posts.
- Friendly toast messages instead of popups; failures are caught and explained.

## Using it with YOUR BBQ bike model

Your model on Google Drive is `1UWAo2bFXguH0fvliiMnQf5GAMF_j-rf-` — right now that Drive file is **not public** (it asks for a Google sign-in), so it can't be fetched automatically.

1. Open that Drive link, sign in, **Download** the `.glb`.
2. Open `BBQ_Bike_3D_Viewer.html`.
3. **Drag the `.glb` onto the page** (or click **Choose .glb/.gltf**).
4. It appears on the stage — rotate it, try a Sunset preset, hit Auto-Rotate, then **⏺️ Record** for an Instagram-ready reel.

## Notes

- The whole thing runs offline: three.js and the demo model are embedded in the HTML.
- To keep your own `.glb` *inside* the file permanently, tell the person who maintains it the model ID / file path — I can rebuild the file with your model embedded (needs the file made public or attached).
- Old drafts (7 earlier HTML viewers + a React project) are NOT part of this deliverable — this single file replaces them all.

*Build date: 2026-09-08*
