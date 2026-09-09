# Studio of Sidecars · Design System

The permanent reference for all future UI work (Phase 3 — Live Engine Integration and beyond).

**Status:** Locked — extracted from the approved Phase 1 / Phase 1.5 / Phase 2 artifacts. No
Phase 1, 1.5, or 2 asset is modified by this folder; it documents the visual language those
phases established so every future phase consumes the same tokens without redesigning them.

## Principles at a glance

- Premium Finish is a **visual skin over the locked Phase-1 shell**. Phase 3 swaps
  canonical ↔ premium by including/omitting three skin blocks — no engine code changes.
- One quiet **glass material**; chrome is monochrome; **electric blue is reserved for
  active states**; the **product owns 80–85 %** of visual attention on an unframed stage.
- One **24 × 24 · 1.6-stroke · `currentColor`** icon family. **No emoji anywhere.**
- Motion is subtle and 60 FPS; Honor Pad is touch-first with **13–15 px** readable text.

## The documents

| File | Contents |
|---|---|
| `colors.md` | Full token set (surfaces, glass fills, hairlines, text ladder, reserved accent), canonical → premium mapping, and exactly when blue is allowed |
| `typography.md` | Single system UI stack; display/body/meta hierarchy; per-component size map; Honor Pad 13–15 px floors (verbatim) |
| `spacing.md` | 4 px spacing scale, locked layout constants (260/318 px rails, breakpoints), radius tokens, per-region spacing |
| `icons.md` | Locked icon spec (24×24, 1.6, round, `currentColor`, zero emoji), 17-glyph inventory, sizing map, sprite swap contract |
| `glass_material.md` | The one-material system: blur 28–30 px, saturation, hairlines, surface ladder, loudness ladder, unframed stage, performance rules |
| `motion_tokens.md` | Inherited duration/easing tokens (180/340/620/900 ms + 4 curves, verbatim), usage map, reduced-motion collapse |
| `components.md` | Anatomy + approved specs of every chrome component (top bar, V1–V6 chips, rails, inspector, dock, trays, stage HUD, Learn, overlays) with the immutable id map |
| `honor_pad_guidelines.md` | 1194×834 / 834×1112 contract (full workflow vs. compact rails), ≥40 px targets, no-hover-only interaction, QA checklist |

## Source artifacts these reference (locked)

| Artifact | Path |
|---|---|
| Phase-1 canonical shell (immutable) | `design/studio_sidecars_premium_ui.html` |
| Phase-2 Premium Finish skin | `design/redesign/studio_sidecars_premium_finish.html` · `skin/premium_tokens.css` · `skin/premium_finish.css` · `skin/premium_icons.svg` · `skin/premium_icons.js` |
| Phase-2 interactive prototype (motion + engine layer) | `design/phase2/studio_sidecars_phase2_interactive.html` · `design/redesign/studio_sidecars_cinematic.html` |
| Visual proof | `design/redesign/exports/premium_finish_master/` |

## Change control

- Values here were read directly from the locked artifacts. If a source file changes in a
  future approved phase, update the matching doc in the same change.
- Any deviation for new work requires an entry in the relevant doc (approved like a phase),
  shipped as a new layer — never by editing the locked Phase 1 / 1.5 / 2 files.
