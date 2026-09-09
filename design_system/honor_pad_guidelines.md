# Design System · Honor Pad Guidelines

Studio of Sidecars — tablet (Honor Pad) design rules. **Touch-first, readable, 60 FPS.**

| | |
|---|---|
| Status | Locked reference (Phase 2 approved) |
| Verified viewports | Landscape `1194 × 834` · Portrait `834 × 1112` (desktop baseline `1440 × 900`) |
| Source of truth | Readability floor + compact rules in `design/redesign/skin/premium_finish.css` and the canonical ≤980 px layout in `design/studio_sidecars_premium_ui.html` |
| Governs | Phase 3 — Live Engine Integration and every future UI phase |

---

## 1. Viewport contract (locked)

| Size | Chrome behaviour |
|---|---|
| `1440 × 900` desktop | Full workflow: 260 px rail · 318 px inspector · floating dock + trays |
| `1194 × 834` landscape | **Full creator workflow** — same rails/dock/trays as desktop, slightly tightened |
| `834 × 1112` portrait | **Compact rails only** — side rails collapse to 96 px icon columns; groups/rows render vertically; dock at bottom; dock tray hidden by the locked ≤980 layout |

Rules:
- **Portrait uses compact rails only** — do not widen side panels or invent a new
  portrait navigation in a future phase.
- **Landscape shows the full creator workflow** — never hide core tools just because
  it is a tablet.
- Both must ship the identical product experience — only chrome density changes.

---

## 2. Readability floor (13–15 px body)

The floor media query (verbatim in `typography.md` §4) guarantees:

| Role | Min size on Honor Pad |
|---|---|
| Primary / readable text (row names, section titles, buttons) | **13.5 px** |
| Readable copy at large | 13–15 px |
| Meta / secondary (sub-lines, labels, tags) | **11.5 px** |
| Eyebrows / micro captions | 9–10 px — decorative only, never essential content |

Design rule: on a tablet **every interactive or informational element the user must
read is ≥ 13 px**; anything below 11 px is optional decoration.

---

## 3. Touch targets (≥ 40 px where possible)

| Control | Locked size | vs. 40 px goal |
|---|---|---|
| Dock buttons `.dk-btn` | height 54 · min-width 64 | ✅ well above |
| Top action `.abtn` (compact) | height 38–40 · radius 12 | ✅ 38 min → pad a touch-listening area if custom |
| Radio chips `.rchip` | height 38 · radius 11 | ~38 — keep ≥ 34 min, add padding if label-only |
| Workspace chip `.vchip` | height 36–38 · radius 999 | ✅ |
| Stage toggle labels | height 32 | 32 — acceptable as it is an inline segmented switch |
| Separators between targets | ≥ 8 px gap | |

Locked token: `--touch-min:38px` is the *minimum*; prefer 44+ for primary actions.
Bottom-thumb-first: primary actions (dock, Export) live in the bottom zone, and
secondary reveal panels open upward (trays rise) — never require a top-corner reach
to act.

---

## 4. Interaction rules (no hover-only)

1. Every hover state needs a visible `:active` and an "on"/selected state — tablets
   have no hover.
2. No hover-only discoverability (tooltips on hover, ghost actions that appear on
   hover). Use always-visible affordances or long-press/tap equivalents.
3. Target spacing ≥ 8 px to avoid misfires; keep targets ≥ 38 px even in dense trays.
4. Keep all `:focus` rings for keyboard / pointer ("focus-within" when a panel opens).
5. Large touch surfaces animate with `transform:scale(.96)` press feedback
   (180 ms, transform only — see `motion_tokens.md`).
6. Virtual-keyboard caution: don't put critical controls in a zone that a keyboard
   can cover when a text field opens (future phases).

---

## 5. Layout & chrome on Honor Pad

- Landscape: same two rails + dock + trays; increase column gaps slightly; type is
  raised by the floor query; chrome remains the same glass material.
- Portrait: rails become **icon columns** (96 px) — group summaries collapse to
  vertical icon+chevron cells, cards to icon tiles, text hides; the Environment
  Library and Learn overlays still render over the stage (11 preset cards grid
  tested at all three sizes).
- Stage keeps the product at **80–85 %** focus even when rails collapse.
- Honor `prefers-reduced-motion`; blur stays on fixed chrome only (rails/dock) to
  keep 60 FPS.

---

## 6. QA checklist for every future screen

- [ ] Renders at 1194×834 and 834×1112 with **no horizontal overflow**.
- [ ] All readable text ≥ 13 px; meta ≥ 11.5 px.
- [ ] All touch targets ≥ 38 px (primary ≥ 40) with ≥ 8 px gaps.
- [ ] No hover-only controls; focus/active/on states present.
- [ ] No visible emoji; icons from the sprite family.
- [ ] 0 console errors; motion 60 FPS; reduced-motion honoured.
- [ ] Canonical ↔ Premium swap still intact (skin blocks only).

Reference evidence: captures under `design/redesign/exports/premium_finish_master/`
(`honorpad_ls/`, `honorpad_pt/`).

---

*Related: `typography.md` · `spacing.md` · `components.md` · `motion_tokens.md`*
