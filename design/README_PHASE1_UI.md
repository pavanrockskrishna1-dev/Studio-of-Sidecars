# Studio of Sidecars — Phase 1 · Premium UI (Final Design Package)

Static HTML/CSS skin only — no engine logic, no JavaScript. Visual reference:
Apple Pro apps / Figma / high-end automotive configurators. Not Blender.

## Files
| File | What |
|---|---|
| `studio_sidecars_premium_ui.html` | The static premium shell (self-contained) — sidecar hero viewport (v1.0 approved baseline). |
| `exports/artboard_desktop_1440x900.png` | Desktop — full workspace (demo scene). |
| `exports/artboard_floor_presets_1440x900.png` | Desktop with Floor tool open — 5 floor preset thumbnails. |
| `exports/artboard_honorpad_landscape_1194x834.png` | Honor Pad landscape. |
| `exports/artboard_honorpad_portrait_834x1112.png` | Honor Pad portrait (icon-rail panels, chips wrap). |
| `exports/artboard_empty_state_1440x900.png` | Empty canvas — GLB drop zone. |
| `assets/hero_sidecar_showroom.jpg` | Hero viewport composition — user's sidecar hero (MW_v1_FINAL_hero34) restaged to the showroom brief. |

Try it (pure CSS): click the **creator dock** buttons — Camera / Lighting /
Materials / Floor / Render each reveal a one-tap preset tray (Floor shows the
five thumbnail presets). The **○ Empty canvas** toggle shows the drop zone.

## Hero viewport — FINAL composition (locked spec)
`MW_v1_FINAL_hero34.png` is embedded **byte-for-byte as provided** (original PNG
data URI, no cut-out, no restage, no regeneration, no vehicle modification).
- Product occupies **~36% of the viewport width** (35–40% band) and is centered,
  full sidecar visible, generous negative space on all sides.
- Presented as a **luxury product display** on a CSS circular glossy black
  reflective turntable; the whole stage reads as a pulled-back showroom shot.
- Dark cinematic charcoal studio, subtle **electric-blue rim glows**, soft haze,
  reflective floor tone under the platform. No props/walls/furniture.
- Layout verified across desktop 1440, Honor Pad landscape 1194, portrait 834:
  centered, no overflow, dock clear (gaps 71/56/121 → final 19/9/57 from plate).

## Spec coverage
| Spec | Implementation |
|---|---|
| Top Premium App Bar | `Studio of Sidecars` + current project (`Coffee Bike Launch`) + chips V1 Classic · V2 Instagram Commercial · V3 Blender Python · V4 Creator Studio · V5 Asset Library · V6 Brand Studio + Export / Learn Studio / Settings / Help. |
| Left floating sidebar | Versions (open) · Assets · Scenes · Projects · Favorites — collapsible groups, large icon tiles, 50px+ rows, offline footer. |
| Main viewport 82–85% | Canvas fills the stage behind floating glass panels. Demo scene = sidecar showroom hero (small, centered, turntable); empty GLB drop zone included. |
| Right floating inspector | Camera · Lighting · Materials · Render — exclusive accordion (`<details name>`), one open at a time. |
| Bottom floating creator dock | Select · Camera · Lighting · Materials ┃ Floor · Render — electric blue active pill. |
| Interaction rules | Advanced controls hidden; no node editor; one-tap presets for Camera / Lighting / Floor / Render; floor thumbnails: White Studio · Gloss Black Mirror · Café Wood · Concrete Loft · Marble Luxury. |
| Responsive | Desktop 1440, Honor Pad landscape 1194×834, portrait 834×1112 — verified: no horizontal overflow, nothing clipped, chips never cut off. |
| Future-proofing | See ID compatibility map in the HTML header: `#topStrip`, `#appBrand/#soLogo/#soTitle/#soTag`, `#projPill`, `#topbar .vchip[data-vid]`, `#appActions`, `#cv`, `#sideNav`, `#inspector`, `#dock`, `#sosSplash/#sosOv/#saveOv`. |

## Tokens
```
bg #0b0d11 · glass rgba(18,21,28,.78) blur(24–28px) · accent electric blue #2f7bff
radius 20 / 18 / 13 px · border rgba(255,255,255,.08) · shadows 0 20px 54px rgba(0,0,0,.52)
touch targets ≥ 38–60 px
```

## Premium polish (reference-derived)
Iterated against the approved cinematic reference set (SW_Talking_Hero_SlimTub,
SW_V2_Hero_Night, SW_Ride_SpeedTears — warm-keyed studio product cinematography):
- **Thin-line SVG icon system** replaces emoji in all primary chrome: dock (6),
  left sidebar groups (5), right inspector cards (4), top actions (2). 17 crisp
  1.6px-stroke glyphs; `stroke=currentColor` so they inherit electric-blue/hover.
- **Cinematic ambience** tuned to the references' teal-and-amber grade: electric-
  blue edge rim + haze (UI accent) complemented by a warm soft pool under the
  product that matches the hero's own warm floor reflection (seamless blend).
- Hero stage verified at 1440 / 1194 / 834: no overflow, product centered,
  exact MW PNG still the single byte-identical embed.
