# Sidecars Studio — Mission 13C
## Inspector Lighting Presets

Read in this order before any work:
1. WATCHERS_AUDIT_REACT_v1.md
2. PROJECT_STATE.json
3. HANDOFF.md

## Mission Objective

Turn the five Inspector Rail mood chips into real one-click lighting presets that drive the
existing lighting rig. Do **not** duplicate or rebuild the working sliders in
`StudioControls.jsx`.

## VERIFIED — Do Not Modify or Rebuild

Confirmed working in the audit; reuse as-is:
- `lighting/profiles.js` (key/fill/rim/ambient/shadow/exposure model, per-environment
  starting profiles)
- `StudioControls.jsx` live sliders — real `<input>` elements bound to live state
- Lighting state itself: `const [lighting, setLighting] = useState(...)` in `App.jsx`

## Confirmed Gap — Read Before Estimating Scope

Lighting state today is **plain React `useState` in `App.jsx`, with no persistence** — it
resets on every reload, same as camera position and everything else in the Studio
controls. This was confirmed by direct inspection, not assumed. `lighting/profiles.js`'s
own comment says as much ("Session-only (React state), like everything else in the Studio
controls").

This matters for scoping: "reload restores the last preset" is **not** a "reconnect
existing persistence" task — persistence for lighting doesn't exist yet. If Phase C below
is included, it is new work, not a wiring fix.

## NOT IMPLEMENTED — Mission Scope

The Inspector Rail's lighting chips (`ui/InspectorRail.jsx`, via `INSPECTOR_PLACEHOLDERS` in
`ui/content.js`) are structurally dead: `Chips` renders plain `<span>` tags with no
`onClick`. This mission makes them real.

| Inspector Chip | Action |
|---|---|
| Golden Hour | Apply a predefined warm lighting profile |
| Night Neon | Apply a neon/night profile |
| Softbox Key | Apply a soft studio portrait profile |
| Café Window | Apply a window-light profile |
| Backlit Rim | Apply a rim-light emphasis profile |

Each chip updates the existing six lighting values (key/fill/rim/ambient/shadow/exposure) in
one action.

## Phased Approach

### Phase A — Extract and register (data first, no numbers yet)
1. Read the actual chip list and current values directly from `ui/InspectorRail.jsx` and
   `ui/content.js` — do not invent or assume labels beyond what's there.
2. Create `lighting/moodPresets.js` as a new registry file, following the existing pattern
   in `lighting/profiles.js` (plain exported data, no JSX).
3. Report back the exact chip list found before assigning any values — this is a check-in
   point, not a silent assumption.

### Phase B — Calibrate and wire
1. Assign real key/fill/rim/ambient/shadow/exposure values to each of the 5 presets in
   `lighting/moodPresets.js` (informed by the existing `ENV_LIGHTING_PROFILES` value ranges
   in `lighting/profiles.js`, not arbitrary numbers).
2. Add `onClick` handlers to the Inspector Rail chips that call the existing lighting
   setter with the preset's values.
3. Add an active-preset highlight state (which chip, if any, matches current live values).

### Phase C — Persistence (optional, call out explicitly if included)
If persisting the selected preset across reload is wanted, this phase adds localStorage
persistence for lighting state — new functionality, following the pattern already used in
`materials/store.js` favorites persistence. State this explicitly in the mission report; do
not fold it silently into Phase B as if it already existed.

## Deliverables

- Clickable chips (`onClick` handlers) — Phase B
- Preset definitions stored as data in `lighting/moodPresets.js`, not hard-coded in JSX —
  Phase A/B
- Active preset highlight — Phase B
- Live viewport update — Phase B
- Preset persistence — only if Phase C is explicitly taken on

## Watchers Success Criteria

A preset is Verified only if:
- Clicking a chip changes the real scene lighting immediately (the actual six values, not
  just a UI state change)
- The six underlying values change to the preset's calibrated numbers
- If Phase C is included: reloading restores the selected preset, backed by real
  localStorage evidence — if Phase C is not included, this criterion does not apply and
  should not be silently claimed as met

## Explicitly Out of Scope

- No new sliders — the six controls in `StudioControls.jsx` already work
- No duplicate lighting panel
- No HDRI/environment expansion
- No camera or material work
- No numeric preset values invented before Phase A's chip-list check-in

## Required Response Format

MISSION

INSPECTION

EXECUTION

VERIFICATION

STATUS
- ✅ Complete
- 🔄 In Progress
- ⛔ Blocked
