# KOP Shot Pack 001 — Version 1.1 (Canonical, Frozen)

**Film:** "The Coffee Bike Talks to the Dogs"
**Runtime:** 45–60 sec
**Format:** Instagram Reel, 1080×1920 primary
**Purpose:** Launch film for THE KOP coffee bike — production/marketing deal with BBQRide India

This document is the canonical, frozen shot list for KOP Shot Pack 001. Every
shot description below corresponds to something independently verified to
exist in the actual assets — not inferred, not assumed. No Arena or Claude
Code session should modify these shot descriptions without re-running this
same verification discipline.

## Hero Assets — Only These Two

- **KOP Coffee Bike GLB** — `app/public/models/the_kop_refined.glb`
- **Desi Street Dog GLB** — `app/public/models/desi-street-dog.glb`
  (or the lighter `desi_dog_lite.glb` / `desi_dog_tiny.glb` variants for
  faster rendering — confirmed identical skeleton and animation clip,
  smaller file size only)

**Explicitly excluded from Launch Film v1:** trees, bush, Husky/Shiba/Fox/Wolf,
cartoon motorcycle, puppy Shiba variant. These may be used in future content,
not this film.

## Verified Dog Poses — The Only Two That Exist

The Desi Street Dog GLB has exactly one animation clip:
`preset:quadruped:walk` (2.583s, 62 frames at 24fps). All 62 frames were
individually rendered and inspected, with bone positions quantified
mathematically (not eyeballed) before ruling any pose in or out.

| Pose | Frame | Timestamp | Use |
|---|---|---|---|
| Mid-stride | Frame 4 | t=0.167s | Wide, low-angle, side-profile, composite placement |
| Face close-up | Frame 6 | t=0.250s | Face crop, foreground reaction shot |

**Explicitly prohibited — do not describe or request these, they do not
exist in this asset:**
- ❌ Standing pose
- ❌ Sitting pose
- ❌ Barking pose
- ❌ Tail wag
- ❌ Head tilt
- ❌ Any pose not evidenced by the two frames above

## Locked Dialogue (Verbatim — Typography Only)

The coffee bike has no rig for lip-sync or speech. This line appears as
clean on-screen typography (elegant premium lower-third, not a comic speech
bubble) — never attempt to animate it as spoken dialogue:

> "BBQRide India builders have built me — so I serve coffee as hot and as
> strong as I am, while on the go."

## Shot Structure — 22 Total

16 direct shots (Acts I–III) + 6 composite shots (Act IV).

### Act I — Hero Arrival (Shots 01–06)

| Shot | Duration | Description |
|---|---|---|
| 01 | 3s | Low Hero — Coffee Bike enters frame in sunrise light |
| 02 | 2.5s | Three-quarter front hero reveal |
| 03 | 2s | Front wheel + chrome close-up |
| 04 | 2.5s | Full side silhouette against warm light |
| 05 | 2s | Rear coffee cart catching sunlight |
| 06 | 2s | Top-down symmetrical product portrait |

Purpose: introduce the Coffee Bike as the hero. No logo appears yet —
audience falls in love with the object first.

### Act II — Coffee Ritual (Shots 07–12)

| Shot | Description |
|---|---|
| 07 | Steam rising from the espresso machine |
| 08 | Chrome grinder reflections |
| 09 | Tamper pressing coffee |
| 10 | Slow coffee pour |
| 11 | Wood grain and maroon paint detail |
| 12 | Coffee cup with warm steam |

Purpose: sell craftsmanship and warmth. Steam is the "voice before the
voice."

### Act III — Dog Reaction Library (Shots 13–16)

Built entirely from the two verified poses above, using camera variety
rather than invented performance:

| Shot | Verified Pose | Camera Language |
|---|---|---|
| 13 | Frame 4 | Wide, eye-level — first notice |
| 14 | Frame 4 | Low-angle, close — presence |
| 15 | Frame 6 | Tight face crop — curiosity beat |
| 16 | Frame 4 | Side silhouette in Golden Hour |

Purpose: build emotion without dialogue, without inventing behavior the
asset can't perform.

### Act IV — Celebration Composites (Shots 17–22)

These are the only composite shots — each built from clones of the Desi
Street Dog GLB placed manually into a scene with the Coffee Bike, since the
current app renders one object at a time (no live multi-object staging).

| Shot | Description |
|---|---|
| 17 | Scout clone (Frame 4) positioned near the Coffee Bike |
| 18 | Second clone (Frame 4) positioned beside the coffee cart from a different camera angle |
| 19 | Third clone (Frame 6 close crop) placed in the foreground as a reaction composition |
| 20 | Three clones of the same verified pose set gathered around the Coffee Bike |
| 21 | Golden Hour celebration composition with the Coffee Bike as the visual center |
| 22 | Final brand frame — Coffee Bike, three clones, THE KOP + BBQRide India branding |

## Visual Rules (Locked)

| Element | Rule |
|---|---|
| Lighting | Golden Hour for hero scenes; Café Window for coffee close-ups |
| Color Palette | Deep Maroon • Brass Gold • Walnut Wood • Cream |
| Typography | Elegant premium lower-third, never comic speech bubbles |
| Camera | Static-held premium compositions; movement created through editing cuts, not live camera animation (no orbit/dolly/crane — not built yet) |
| Aspect Ratio | Primary: 1080×1920 (Reel) |

## Production Workflow

| Stage | Output |
|---|---|
| A | Generate Shots 01–16 individually (direct captures) |
| B | Create composite Shots 17–22 using cloned Desi Dog GLB placements |
| C | Export all shots as PNGs |
| D | Assemble into Reel v1 in post-production editing |

## Status

**VERSION 1.1 — FROZEN.** Safe to hand to Arena or Claude Code for
rendering: every shot description corresponds to something independently
verified to exist. Do not add shots, poses, or assets without re-running
verification and updating this document's version number.

Round-table sign-off: Krishna (Creative Director) — story locked. Claude Pro
(Film Director) — shot language locked. Watchers (Producer) — production
scope locked.
