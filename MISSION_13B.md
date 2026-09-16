# Sidecars Studio — Mission 13B
## Camera Director (Instagram Studio) — Production Mission

Read in this order before any work:
1. WATCHERS_AUDIT_REACT_v1.md
2. PROJECT_STATE.json
3. HANDOFF.md
4. MISSION_13A_PHASE0.md (context only — this mission does NOT depend on video export)

## Objective

Build a real Camera Director that creates Instagram-ready shots from existing Sidecars Studio assets. No video export — camera orchestration and PNG capture only.

## Scope — Camera Rigs (framing/aspect only, reuse existing export presets)

- Real vertical camera rig (1080×1920 Reel)
- Portrait camera rig (1080×1350 Feed)
- Story camera rig (1080×1920 Story)
- Square camera rig (1080×1080 Post)

## Scope — Camera Presets

- Hero
- Orbit
- Product close-up
- Turntable

## Registry Addition — Desi Street Dog

A third product entry, added to `products/registry.js` **using the schema that file already
uses** — not a new schema. Confirmed fields in the current registry: `id`, `name`, `label`,
`modelPath`, `frontAz`.

```js
{
  id: "desi-street-dog",
  name: "Desi Street Dog",
  label: "Desi Street Dog",
  modelPath: "/models/desi-street-dog.glb",
  // frontAz is UNKNOWN — the agent must determine the model's actual front-facing
  // direction (same way frontAz was set for coffee-bike and cessna-172) rather than
  // guessing 0. Do not ship a frontAz value that hasn't been checked against the model.
  frontAz: null, // TODO: determine from model inspection before use
}
```

Note: the file in `app/public/models/` is named `desi-street-dog.glb` (hyphenated, matching
the style of `cessna-172.glb`) — not the original Tripo export name
(`desi_street_dog_3d_model.glb`). Use the actual filename above; a mismatch here means the
registry entry fails to load and nothing else in this mission can be verified.

`type: "character"`, `defaultAnimation: "preset:quadruped:walk"`, and any lighting-profile
link are **new fields that do not exist in the schema today**. If this mission adds them,
they must be:
1. Added to the registry consistently (not just on this one entry), and
2. Actually read and used by real code (e.g. the animation is actually played, the type
   actually changes behavior) — not just declared as data.

A field that exists in the registry but is never read by any component is the same failure
class as the Inspector Rail chips in the last audit: it looks configured but does nothing.

### Model facts (confirmed by direct inspection of the uploaded GLB)
- Generator: Tripo AI
- 28 nodes forming a real skeleton (head, spine, left/right limb segments, bones)
- One built-in animation: `preset:quadruped:walk`
- This is the first rigged, animated asset in the studio — everything else (Coffee Bike,
  Cessna 172) is static geometry

## Camera Presets to Verify Specifically on the Dog

- Portrait — full-body vertical framing
- Hero Low Angle — cinematic character shot
- Orbit — 360° character showcase
- Walk Follow — camera tracks the existing `preset:quadruped:walk` animation (this requires
  the camera to update per-frame against a moving rig, which is different from framing a
  static model — call this out explicitly in the verification evidence, don't fold it into
  "Orbit" as if it's the same math)

## Deliverables

1. Camera Director panel in the React app — **new component**, does not touch or repurpose
   `ui/InspectorRail.jsx` (that panel's Chips/VisualField are dead by design; do not wire
   into it or "fix" it as part of this mission)
2. One-click switching between camera presets
3. Safe framing using the existing `computeCameraShot()` math — no new framing algorithm
4. Desi Street Dog added to `products/registry.js` per the schema above
5. Save/load camera presets per product (Coffee Bike, Desi Street Dog, Cessna 172)
6. PNG capture using the existing export pipeline (`capture/exportOptions.js`,
   `StudioCanvas.jsx` toBlob path) — no new export mechanism

## Watchers Success Criteria

A feature is verified only if:
- Camera preset changes the actual Three.js camera (not a UI-only state change)
- Exported PNG matches the selected aspect ratio
- Framing works correctly for different model sizes/proportions — confirmed on all three
  registry products, not just Coffee Bike
- `products/registry.js` actually contains the `desi-street-dog` entry (file evidence, not
  a claim)
- Any new field on that entry (type, animation, etc.) is demonstrated as read by real code
- Evidence includes file/function names and exported images

## Explicitly Out of Scope

- ❌ Video recording
- ❌ MP4/WebM export
- ❌ Animation timeline changes or new animations (only use the dog's existing
  `preset:quadruped:walk`)
- ❌ Mascot system or Sidecar Universe character logic
- ❌ AI behavior or pathfinding for the dog
- ❌ Blender modifications
- ❌ Commits or pushes unless instructed

## Required Response Format

MISSION

INSPECTION

EXECUTION

VERIFICATION

STATUS
- ✅ Complete
- 🔄 In Progress
- ⛔ Blocked
