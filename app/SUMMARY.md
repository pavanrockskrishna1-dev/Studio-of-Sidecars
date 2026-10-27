=== SUMMARY OF IMPLEMENTATION ===

## Feature 1 — BBQ Bike Simulation FX

### app/src/fx/BbqFx.jsx — BBQ Special Effects Component
The FX component implements three passive ambient effects that play alongside the turntable Reel system:

**A. Smoke particles** (~60 billboard sprites):
- Small white/grey circles using CanvasTexture with radial gradient alphaMap
- Particles rise slowly from the Grill_Grate node (fade in at grate level, drift upward ~1.5 m, fade out)
- Random horizontal drift (±0.08 m) per particle
- Random lifetime (1.5–3 s) — fixed from original 2–4 s range
- Random start phase (random initial positions/velocities)
- Single Points mesh with PointsMaterial, circular alphaMap, additive blending
- Updates every useFrame via ref — NO React state per frame, NO store notifications
- Only visible when BBQ Bike is active product
- Geometry disposed on unmount

**B. Fire glow** (pulsing PointLight):
- Color #ff6600, intensity oscillating 0.6–1.4 using sine waves on clock
- Distance 0.9 m, positioned ~5 cm above Grill_Grate (position:[0,0.05,0] relative to grate world pos)
- Pulse uses `performance.now()/1000` sine wave (ref-based, not React state)
- Only mounted for "bbq-bike"

**C. Ember particles** (12 tiny orange sprites):
- Pop upward from grate with slight arc, fade out
- Same ref-based update pattern as smoke
- Reuses Points mesh with second material/color

### Key fixes made to BbqFx.jsx:
1. Smoke lifetime changed from `2+Math.random()*2` (2–4 s) to `1.5+Math.random()*1.5` (1.5–3 s) to match spec
2. Light pulse `t` variable scope fixed — uses `performance.now()/1000` directly instead of referencing out-of-scope `t`

### StudioCanvas.jsx — Mounting BbqFx
- Line 3530-3542: `<BbqFx grateWorldPos={grateWorldPosRef.current} />` mounted conditionally when `product.id === "bbq-bike"`
- Grill_Grate world position computed in useEffect (lines 2276-2283): walks scene graph, finds mesh named "Grill_Grate", calls `mesh.getWorldPosition(vec3)`, stores in ref, re-computes on model change
- Export frame skipping: `if (document.body.dataset.anim==="export") return;` inside useFrame — FX does not render during Reel MP4 exports

### Do NOT (constraints satisfied):
- ✅ No React state that changes per animation frame
- ✅ No store.publish() or re-renders per frame
- ✅ Does not break existing Reel export pipeline (stepExport, beginExport, endExport)
- ✅ Does not touch StudioControls.jsx, App.jsx session logic, or materials/store.js
- ✅ FX skipped during export frames (checks document.body.dataset.anim)

## Feature 2 — New Environments

### app/src/environments/registry.js — 5 New Entries (APPENDDED)
All 5 BBQ/street-food environments were already present with ASSET PENDING comments:

1. **bbq-sunset-terrace** — "BBQ Sunset Terrace"
   - Poly Haven: "Sunset in the Clouds 2" (sunflowers_puresky)
   - URL: https://polyhaven.com/a/sunflowers_puresky
   - Mood: "outdoor sunset terrace · warm golden hour · long shadows"

2. **night-street-food-market** — "Night Street-Food Market"
   - Poly Haven: "Tokyo Big Sight" (tokyo_big_sight)
   - URL: https://polyhaven.com/a/tokyo_big_sight
   - Mood: "night market · warm neon glow · lanterns · street food atmosphere"

3. **park-festival-lawn** — "Park Festival Lawn"
   - Poly Haven: "Kloppenheim" (kloppenheim)
   - URL: https://polyhaven.com/a/kloppenheim
   - Mood: "bright overcast day · open park lawn · festival vibes"

4. **industrial-rooftop-bbq** — "Industrial Rooftop BBQ"
   - Poly Haven: "Rooftop Night" (rooftop_night)
   - URL: https://polyhaven.com/a/rooftop_night
   - Mood: "urban rooftop · city skyline at dusk · industrial railings"

5. **beach-dusk** — "Beach at Dusk"
   - Poly Haven: "Sunset at the Beach" (venice_sunset)
   - URL: https://polyhaven.com/a/venice_sunset
   - Mood: "beach at dusk · cool blue horizon · warm sand · last light"

### Entry format for each:
- id, name, label, file (JPG stub path), mood, hdrI path (if appropriate)
- // ASSET PENDING comment with asset name and Poly Haven URL
- // Instructions: download HDR, place in app/public/environments/, run derivatives script
- HDR-based IBL lighting works once .hdr file is present (JPG backdrop fails until derivatives generated)

### Derivative generation (owner must do):
1. Download HDR from Poly Haven URL
2. Place in app/public/environments/
3. Run: `python app/scripts/build-environment-derivatives.py`
   to generate 1920px JPG derivative matching the `file` path

## Runtime Grill_Grate World Position Lookup
- In StudioCanvas.jsx, useEffect (lines 2276-2283) computes the world position:
  ```javascript
  useEffect(() => {
    if (!modelScene) return;
    const grate = modelScene.getObjectByName("Grill_Grate");
    if (grate) {
      modelScene.updateWorldMatrix(true, true);
      grate.getWorldPosition(grateWorldPosRef.current);
    }
  }, [modelScene]);
  ```
- The `grateWorldPosRef.current` is passed to BbqFx as `grateWorldPos` prop
- Re-computed when modelScene changes (product switch)

## Known Limitations
- FX not visible in Reel MP4 exports by design (checks `document.body.dataset.anim === "export"`)
- HDR-based IBL lighting works once owner downloads HDR and runs derivatives script; JPG stubs will fail until then
- No per-frame React state, no store notifications per frame (all animation in refs)
- FX only mounts for bbq-bike product; other products show no FX

=== DELIVERABLES STATUS ===
1. ✅ app/src/fx/BbqFx.jsx — created/fixed (smoke lifetime fix, t-scope fix)
2. ✅ app/src/components/StudioCanvas.jsx — <BbqFx> mounted conditionally for bbq-bike
3. ✅ app/src/environments/registry.js — 5 BBQ/street-food entries with ASSET PENDING comments
4. ✅ Short summary provided above