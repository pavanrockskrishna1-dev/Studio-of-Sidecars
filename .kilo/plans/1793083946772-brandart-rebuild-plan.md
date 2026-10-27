# BrandArt.jsx Rebuild Plan — 6 Motion-Graphic 2.5D Templates

## Goal
Replace the existing 6 templates in `app/src/ui/BrandArt.jsx` with 6 new motion-graphic 2.5D templates that use PNG sticker assets from `app/public/stickers/` and the live bike snapshot from the animation canvas.

---

## Architecture Overview

### File to Modify
- `app/src/ui/BrandArt.jsx` — complete rewrite of templates, keep component shell (RAF loop, canvas ref, controls)

### Key Imports to Keep
```jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { getCanvas } from "../animation/animationStore"; // for scene snapshot
```

### New Constants & Helpers (Top of File)

#### Sticker URL Map
```jsx
const STICKER_URLS = {
  torn: Array.from({length:13}, (_,i) => `/stickers/torn/PNG-${String(i+1).padStart(2,'0')}.png`),
  sauces: Array.from({length:8}, (_,i) => `/stickers/bbq/sauce-${i+1}.png`),
  sauceBtls: Array.from({length:8}, (_,i) => `/stickers/bbq/sauce-${i+9}.png`),
  campfire: "/stickers/camping/camp-21.png",
  cookingPot: "/stickers/camping/camp-29.png",
  marshmallow: "/stickers/camping/camp-25.png",
  mug: "/stickers/camping/camp-19.png",
};
```

#### Image Loader
```jsx
function loadImages(urls) {
  const flat = Array.isArray(urls) ? urls : [urls];
  return Promise.all(flat.map(src => new Promise(res => {
    const img = new Image(); img.onload = () => res(img);
    img.onerror = () => res(null); img.src = src;
  })));
}
```

#### Shared Drawing Helpers
```jsx
function drawFitImg(ctx, img, cx, cy, fitW, fitH) {
  if (!img) return;
  const ar = img.naturalWidth / img.naturalHeight;
  let dw = fitW, dh = fitW / ar;
  if (dh > fitH) { dh = fitH; dw = fitH * ar; }
  ctx.drawImage(img, cx - dw/2, cy - dh/2, dw, dh);
}

function glowText(ctx, text, x, y, font, fill, glow, blur=20) {
  ctx.save(); ctx.font = font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = glow; ctx.shadowBlur = blur;
  ctx.fillStyle = glow; ctx.fillText(text, x, y);
  ctx.shadowBlur = 0; ctx.fillStyle = fill; ctx.fillText(text, x, y);
  ctx.restore();
}

function drawPill(ctx, cx, cy, w, h, r, fill, stroke, strokeW=0) {
  ctx.beginPath(); ctx.roundRect(cx-w/2, cy-h/2, w, h, r);
  ctx.fillStyle = fill; ctx.fill();
  if (strokeW) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeW; ctx.stroke(); }
}

function speedLines(ctx, cx, cy, count, minLen, maxLen, color, alpha) {
  ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const len = minLen + (maxLen - minLen) * ((i % 5) / 5);
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * (minLen * 0.3), cy + Math.sin(angle) * (minLen * 0.3));
    ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    ctx.stroke();
  }
  ctx.restore();
}
```

---

## Template Definitions

### Template IDs & Labels
| ID | Label | Canvas Size |
|----|-------|-------------|
| `torn-reveal` | TORN PAPER | 1080×1080 |
| `sauce-drip` | SAUCE DRIP | 1080×1080 |
| `campfire` | CAMPFIRE | 1080×1080 |
| `neon-speed` | NEON SPEED | 1080×1080 |
| `cinematic` | CINEMATIC | 1080×1080 |
| `story-ad` | STORY AD | 1080×1920 |

### State Additions
```jsx
const [art, setArt] = useState("torn-reveal");  // default to first new template
const [accent, setAccent] = useState("#e05a1a"); // color picker
// Keep: headline, sub, price, ratio, paletteId (for backwards compat)
// Remove: cta, date, spec1-3, neon1-3, ing1-2, ARTS, PALETTES, SIZES (redefine)
```

### Size Map
```jsx
const SIZES = {
  "1:1": {w:1080, h:1080},
  "9:16": {w:1080, h:1920},
};
// Only show 1:1 for first 5 templates, 9:16 for story-ad
```

### Template Selector UI
Horizontal scrolling button row at top of panel:
```jsx
const TEMPLATES = [
  {id:"torn-reveal", label:"TORN PAPER"},
  {id:"sauce-drip", label:"SAUCE DRIP"},
  {id:"campfire", label:"CAMPFIRE"},
  {id:"neon-speed", label:"NEON SPEED"},
  {id:"cinematic", label:"CINEMATIC"},
  {id:"story-ad", label:"STORY AD"},
];
```

### Default Opts Per Template
```jsx
const DEFAULT_OPTS = {
  "torn-reveal":  { headline:"RIDERS ONLY",      sub:"Every Sunday, 6 AM",      price:"₹99" },
  "sauce-drip":   { headline:"THE BBQ BEAST",    sub:"Fresh Sauces Daily",      price:"₹99" },
  "campfire":     { headline:"CAMPFIRE RIDE",    sub:"Join the Tribe",          price:"₹99" },
  "neon-speed":   { headline:"FULL THROTTLE",    sub:"Speed Meets Flavor",      price:"₹99" },
  "cinematic":    { headline:"THE RIDE",         sub:"Cinematic BBQ Journey",   price:"₹99" },
  "story-ad":     { headline:"SWIPE UP",         sub:"Limited Spots Available", price:"₹99" },
};
```

---

## Template Implementation Details

### Common Patterns
- All draw functions: `drawXxx(ctx, W, H, t, imgCache, sceneImg, opts)`
- `sceneImg` = `sceneImgRef.current` (updated every RAF frame)
- If `sceneImg` null → draw placeholder: `#2a1800` fill, dashed orange stroke, "Open SCENE to load bike" centered
- Stickers with `null` → skip silently
- Animations loop via `sin/cos/modulo`; initial slide-in uses `Math.min(1, t/duration)`
- `opts.accent` overrides default orange `#e05a1a`

---

### 1. TORN PAPER REVEAL (`torn-reveal`)
**Canvas:** 1080×1080

**Layers:**
- **L0 BG:** `#1a0800` + horizontal orange gradient band at y=H*0.5 (±150px, alpha 0.08)
- **L1 Bike:** `drawFitImg(sceneImg, W/2, H*0.52, 900, 750)` with fade-in `globalAlpha = Math.min(1, t*1.5)`
- **L2 Torn Papers (3):**
  - `torn[0]` top-left: scale ~420w, pos `(-60+slideIn*80, -40)`, slideIn=`Math.min(1,t/0.7)` eased `x^2`
    - Text: "BBQ RIDE" 18px Saira Stencil One orange, `opts.headline` 36px Oswald white
  - `torn[1]` bottom-right: scale ~380w, rotated ~175deg, pos `(W-320+(1-slideIn)*80, H-280)`
    - Text (rotated 180°): `opts.price` 52px Oswald 700 orange, "ONLY" 16px white above
  - `torn[3]` center-bottom: scale ~200w, no rotation, text: `opts.sub` 18px Oswald white
- **L3 Decor:** 2 thin orange speed lines top-right (alpha 0.3), "@ bbqrideindia" 14px Oswald rgba(255,255,255,0.4) bottom-left (32, H-28)

**Animation:**
- Papers slide in once (slideIn)
- Bike fades in over ~0.67s
- After settle: paper wobble `±Math.sin(t*0.8+idx)*1.5°`

---

### 2. SAUCE DRIP (`sauce-drip`)
**Canvas:** 1080×1080

**Layers:**
- **L0 BG:** `#0f0f0f` + halftone dot grid (20px spacing, r=2, `#1a1a1a`)
- **L1 Sauce Squirts (4 border pieces):**
  - `sauces[0]` left edge: x=-20, y=H*0.25, scale 300h, rot 90°
  - `sauces[4]` right edge: x=W-60, y=H*0.35, scale 260h, rot -90°
  - `sauces[2]` top-right: x=W*0.75, y=-20, scale 220h, rot 180°
  - `sauces[6]` bottom-left: x=60, y=H-20, scale 240h
  - Drip-in: `yOff = Math.max(0,(0.5-t)*200)`, stagger start `t=i*0.15`
- **L2 Sauce Bottles (3 corners):**
  - `sauceBtls[0]` bottom-left: (40, H-100), 80h, bounce `sin(t*2)*4`
  - `sauceBtls[4]` bottom-right: (W-80, H-90), 75h, bounce `sin(t*2+1.5)*4`
  - `sauceBtls[2]` top-right: (W-60, 90), 70h, rot -15°
  - Slide down from above after t=0.6
- **L3 Bike:** `drawFitImg(sceneImg, W/2, H*0.48, 820, 680)` + warm tint `rgba(224,90,26,0.08)` fillRect over bike
- **L4 Typography:**
  - Top center: "BBQ RIDE INDIA" 22px Saira Stencil One white tracked, y=50
  - Headline: `opts.headline` 54px Oswald 600 white y=H*0.85
  - Price pill: `drawPill(W/2, H*0.93, 220,54,27, orange, opts.price 36px Oswald bold white)`
    - Drop-in: `y = H*0.93 + Math.max(0,(0.8-t)*100)`

**Animation:** Stagger drips 0.15s, bottles bounce ±4px, bike fade 0.5s, pill drops at t=0.8

---

### 3. CAMPFIRE MEETUP (`campfire`)
**Canvas:** 1080×1080

**Layers:**
- **L0 BG:** Radial gradient center(W/2,H*0.6) r=600: inner `#1a0a00` → outer `#050505` + soft glow bottom radial orange→transparent rx=350,ry=80
- **L1 Campfire:** `campfire` img at (W/2, H*0.78), scale 280h
  - Flicker: scale pulse `1+sin(t*6)*0.04`, alpha `0.9+sin(t*5)*0.1`
  - Glow: radial gradient orange→transparent larger radius behind
- **L2 Cooking Pot:** `cookingPot` at (W*0.72, H*0.70), scale 180h, sway `rotate(sin(t*0.7)*0.04)`
  - Steam: 3 white ellipses floating up (y-=t*15%60)
- **L3 Bike:** `drawFitImg(sceneImg, W/2, H*0.44, 820, 660)`
- **L4 Marshmallows:** `marshmallow` at (W*0.22, H*0.72), scale 140h, rot 30° + wobble `sin(t*2)*0.05`
- **L5 Mug:** `mug` at (W*0.78, H*0.76), scale 100h, bobble `y+=sin(t*1.5+2)*3`
- **L6 Mug Steam:** 3 circles r=8 white alpha 0.2→0 floating above mug
- **L7 Typography:**
  - Top-left: "BBQ RIDE" 18px Saira Stencil One orange (32,36)
  - Headline: `opts.headline` 58px Oswald 600 white top-center (y=80) with glow
  - Sub: `opts.sub` 22px Oswald orange y=H*0.9
  - Price pill: `drawPill(W/2, H*0.95, fill="#e05a1a", price 38px Oswald bold white)`

---

### 4. NEON SPEED (`neon-speed`)
**Canvas:** 1080×1080

**Layers:**
- **BG:** Radial `#0a0a0a` → `#1a1a1a`
- **Speed Lines:** `speedLines(ctx, W/2, H*0.52, 36, 180, 480, "#e05a1a", 0.4)` with rotation `angle+=t*0.12`
- **Bike:** `drawFitImg(sceneImg, W/2, H*0.52, 820, 680)`
- **Neon Frame:** 4 corner L-brackets (30px arms, 4px stroke) orange
  - Glow: 3 passes lineWidth 14/8/3 alpha 0.12/0.2/1
  - Animate in: scale 0.6→1 over t=0→0.4
- **Price Badge:** Circle r=110 at (W*0.78, H*0.76) fill `#0f0f0f` stroke orange 3px + glow
  - "₹" 26px + `opts.price` 52px Oswald 700 inside, pulse scale `1+sin(t*3)*0.04`
- **Headline:** `opts.headline` 36px Oswald 500 white (W/2, H*0.9)
- **Brand:** "BBQ RIDE INDIA" 16px Saira Stencil One tracked orange top-left (32,28)
- **Scan Line:** 1px white horizontal y=(t*90)%H alpha 0.05

---

### 5. CINEMATIC (`cinematic`)
**Canvas:** 1080×1080

**Layers:**
- **BG:** `#060606` solid
- **Bike:** `drawFitImg(sceneImg, W/2, H*0.5, 940, 780)` nearly full bleed
- **Left Accent:** Vertical stripe x=0→10 full height fill orange
- **Letterbox Bars:** Top/bottom h=H*0.14 fill black
  - Animate in: `slideBar=Math.min(1,t/0.7)`, top h=slideBar*H*0.14, bottom same
- **Title (after bars settle t>0.7):**
  - `opts.headline` 64px Oswald 600 white left-aligned (44, H*0.07)
  - Slide in: `titleSlide=Math.min(1,(t-0.7)*3)`, x=44-100*(1-titleSlide)
  - `opts.sub` 20px Oswald 400 orange below, same slide
- **Bottom Bar Price:** `opts.price` 42px Oswald 700 white in orange pill right side of bottom bar
  - Slides up when t>0.5
- **Scan Lines:** 1px rgba(255,255,255,0.04) every 6px horizontal full canvas

---

### 6. STORY AD (`story-ad`)
**Canvas:** 1080×1920 (9:16)

**Layers:**
- **BG:** Linear gradient top `#0f0f0f` → bottom `#1a0800`
- **Top Brand Bar:** y=0 h=130 fill `#0f0f0f`
  - "BBQ RIDE INDIA" 24px Saira Stencil One white centered y=65
  - Orange bullets • at x=W/2±160
- **Rule:** 2px orange line y=130 full width
- **Bike:** `drawFitImg(sceneImg, W/2, H*0.39, 920, 680)` centered
- **Glow:** Radial orange `rgba(224,90,26,0.3)`→transparent at (W/2, H*0.62) rx=360, ry=65
- **Text Block:**
  - `opts.headline` 68px Oswald 600 white centered y=H*0.70
  - `opts.sub` 28px Oswald 400 orange centered y=H*0.70+80
- **Price Pill:** `drawPill(W/2, H*0.83, 300,82,41, "#e05a1a")` with `opts.price` 50px Oswald 700 white
  - Pulse scale `1+sin(t*2.5)*0.03`
- **Rule 2:** 2px orange line y=H*0.63 full width
- **Bottom CTA Bar:** y=H-130 h=130 fill `#0f0f0f`
  - "SWIPE UP ↑" 20px Oswald 500 white centered, arrow y+=sin(t*3)*5
- **Handle:** "@ bbqrideindia" 15px Oswald rgba(255,255,255,0.4) y=H-148 centered

**Preview:** Renders at 1080×1920 in 9:16 preview box (panel scrolls to show it)

---

## Scene Snapshot Capture (Like PostStudio)

```jsx
const sceneImgRef = useRef(null);

const captureScene = useCallback(() => {
  const canvas = getCanvas(); // from animationStore
  if (!canvas) { sceneImgRef.current = null; return; }
  const img = new Image();
  img.onload = () => { sceneImgRef.current = img; };
  img.src = canvas.toDataURL("image/jpeg", 0.82);
}, []);

useEffect(() => { captureScene(); }, [captureScene]);

// Also re-capture periodically or on shot change for freshness
```

---

## RAF Loop & Draw Dispatch

```jsx
const drawFrame = useCallback((canvas, t, W, H) => {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  const opts = { headline, sub, price, accent };
  const imgCache = imgCacheRef.current;
  const sceneImg = sceneImgRef.current;
  
  switch (art) {
    case "torn-reveal":   drawTornReveal(ctx, W, H, t, imgCache, sceneImg, opts); break;
    case "sauce-drip":    drawSauceDrip(ctx, W, H, t, imgCache, sceneImg, opts); break;
    case "campfire":      drawCampfire(ctx, W, H, t, imgCache, sceneImg, opts); break;
    case "neon-speed":    drawNeonSpeed(ctx, W, H, t, imgCache, sceneImg, opts); break;
    case "cinematic":     drawCinematic(ctx, W, H, t, imgCache, sceneImg, opts); break;
    case "story-ad":      drawStoryAd(ctx, W, H, t, imgCache, sceneImg, opts); break;
  }
}, [art, headline, sub, price, accent]);
```

---

## Controls Panel (Below Canvas)

1. **Template Selector** — horizontal scroll buttons
2. **Aspect Ratio** — chips (1:1 for templates 1-5, 9:16 for story-ad; auto-switch)
3. **Accent Color Picker** — input type="color" bound to `accent` state
4. **Text Fields** — Headline, Sub, Price (3 fields, update per template defaults)
5. **Download** — PNG / GIF buttons (reuse existing logic)

---

## Asset Preloader Effect

```jsx
const imgCacheRef = useRef({});

useEffect(() => {
  Promise.all([
    loadImages(STICKER_URLS.torn).then(imgs => { imgCacheRef.current.torn = imgs; }),
    loadImages(STICKER_URLS.sauces).then(imgs => { imgCacheRef.current.sauces = imgs; }),
    loadImages(STICKER_URLS.sauceBtls).then(imgs => { imgCacheRef.current.sauceBtls = imgs; }),
    loadImages([STICKER_URLS.campfire, STICKER_URLS.cookingPot,
                STICKER_URLS.marshmallow, STICKER_URLS.mug])
      .then(([f,p,m,mu]) => {
        imgCacheRef.current.campfire = f;
        imgCacheRef.current.cookingPot = p;
        imgCacheRef.current.marshmallow = m;
        imgCacheRef.current.mug = mu;
      }),
  ]);
}, []);
```

---

## Cleanup Checklist

- [ ] Remove old templates: `drawSteam`, `drawDiorama`, `drawWindow`, `drawPulse`, `drawBikeHero`, `drawMangaPanel`
- [ ] Remove old helpers: `hex2rgb`, `rr`, `rnd`, `sh`, `noSh`, `drawWheel`, `drawFoodIcon`
- [ ] Remove old constants: `PALETTES`, `ARTS`, old `SIZES` (keep 1:1 and 9:16)
- [ ] Remove old state: `cta`, `date`, `spec1-3`, `neon1-3`, `ing1-2`, `paletteId`, `gifBusy`, `gifProg`
- [ ] Remove old controls: palette chips, extraControls per template, CTA field
- [ ] Add new state: `accent`, `art` (new template IDs)
- [ ] Add new constants: `TEMPLATES`, `DEFAULT_OPTS`, `STICKER_URLS`, new `SIZES`
- [ ] Add helpers: `loadImages`, `drawFitImg`, `glowText`, `drawPill`, `speedLines`
- [ ] Implement 6 draw functions
- [ ] Implement scene capture from animationStore
- [ ] Implement asset preloader
- [ ] Update UI: template selector, color picker, text fields, aspect ratio auto-switch

---

## Validation Steps

1. **Load test:** Open BrandArt panel, verify all 6 templates render without console errors
2. **Asset load:** Verify all 33 sticker images load (check Network tab)
3. **Scene capture:** With animation stage running, verify bike appears in templates
4. **Animation:** Verify each template animates smoothly (60fps, no jank)
5. **Responsive:** Switch templates, verify canvas resizes correctly (1:1 ↔ 9:16)
6. **Text editing:** Change headline/sub/price, verify live update
7. **Color picker:** Change accent, verify color propagates to all template elements
8. **Export:** PNG download works for each template at correct dimensions
9. **Fallback:** With no scene loaded, verify placeholder renders correctly
10. **Missing assets:** Simulate failed image load, verify templates degrade gracefully

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `sceneImgRef` stale | Capture on every RAF frame or use `getCanvas()` directly in draw |
| Sticker 404s | `loadImages` returns `null` on error; draw functions check `if (!img) return` |
| Font loading | `document.fonts.ready.then()` before RAF starts (already in place) |
| Memory (gif.js) | Reuse existing GIF export logic; offscreen canvas at 0.5x |
| Canvas size mismatch | Use `SIZES[ratio]` for canvas.width/height; CSS aspect-ratio for preview |

---

## Out of Scope

- Adding `sceneImgRef` export to `animationStore.js` (BrandArt captures own snapshot)
- Modifying `animationStore.js` or `PostStudio.jsx`
- New dependencies (Canvas 2D API only)
- Font loading (assumes Oswald, Saira Stencil One available via CSS)
- GIF export optimization (reuse existing)

---

## Implementation Order

1. **Constants & Helpers** — STICKER_URLS, loadImages, drawFitImg, glowText, drawPill, speedLines
2. **Asset Preloader** — useEffect with Promise.all loading into imgCacheRef
3. **Scene Capture** — captureScene using getCanvas(), sceneImgRef
4. **6 Draw Functions** — one per template, following specs exactly
5. **State & UI** — new template IDs, accent color, text fields, template selector
6. **RAF Dispatch** — switch on `art` calling appropriate draw function
7. **Cleanup** — remove old code, verify no dead imports
8. **Testing** — run through validation checklist