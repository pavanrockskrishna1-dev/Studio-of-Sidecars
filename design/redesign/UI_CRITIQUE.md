# UI Critique — Why Studio of Sidecars reads as a “dashboard” (not a premium app)

**Benchmarks:** Porsche configurator, Audi configurator, Apple Vision Pro / visionOS design language, Vectary configurators.
**File audited:** the Phase-1 premium shell as shown in the interactive prototype (`studio_sidecars_phase2_interactive.html`, chrome inherited byte-identical from `studio_sidecars_premium_ui.html`).

This is a design critique of the *chrome*, written from an actual audit of the shipped CSS and DOM (specific tokens and rules cited below are real values from the file), not from general impressions.

---

## 0. What is already good (keep)

Before tearing it down: the shell has a sound *information architecture*. Tool regions are where a pro expects them (top workspace switcher, left asset tree, right inspector, bottom tool dock, centre canvas); the whole chrome floats over a dark canvas; control density is logically grouped; tokens are centralised in `:root`; the dock/radio state machine is clever; and the current accent system is *consistent*. The problems are in the *materials, rhythm, hierarchy and restraint* — the layer above structure. That is exactly what separates a tool dashboard from a premium configurator.

---

## 1. Overall visual hierarchy — “every surface is shouting quietly”

Premium configurators run a **strict loudness ladder**: the subject (car/product/scene) is the loudest thing on screen, chrome is organised into ~3 descending tiers, and each tier is differentiated by *contrast of text and translucency* — not by adding boxes.

The shell instead differentiates with **borders, fills and rings everywhere**, which collapses the ladder:

| Location | Current treatment (from CSS) | Why it fails |
|---|---|---|
| Body backdrop | 2 blue radial glows + gradient on `body` | Ambient colour competes with every environment behind it |
| Workspace chips | `.vchip.on` = blue gradient fill **+** 1px blue border **+** 3px `--accsoft` ring **+** glowing dot | “on” is signalled 4 ways at once |
| Selected rows | `.vrow.on`, `.rchip.on`, `.pr-tile.on`, `.mat-row.on` all use accent wash **+** accent border **+** outer ring | The accent stops meaning anything when every selection has it |
| Top-right actions | Export (gradient), Learn (accent border+wash), Help/Settings (filled cards) | 3 different button styles in 40px of horizontal space |
| Floating HUD | `.cv-toggle`, `.cv-tag`, `.cv-status` (pills), `.cv-hint`, `.cv-legend` — up to 5 chips/pills/labels layered on the canvas at once | Stage corners get busier than the product zone |

**Net effect:** nothing is *quiet*. Apple’s rule — “UI defers to content; chrome should feel like it is resting on the glass, not organised against the content” — is violated in the opposite direction: content is organised *inside* an app of equal-weight boxes.

---

## 2. Spacing & density — too many tiers, too little air

Audited metrics at 1440×900:

- **Chrome footprint:** left panel **260 px** + right inspector **318 px** + `--pad 16 px` margins + top strip of ~68 px + dock ≈ 60 px + its preset tray ≈ 100 px. On a 1440 px screen the two side rails consume **~40 % of the width**, so the hero stage gets ~860 px of a 1440 px display.
- **Text micro-scale:** body controls are 11.5–12.5 px; *meta* is 9.5–10 px; *micro-labels* are 9–10 px with letterspacing `.14em–.17em`. In a single sidebar group you find four text sizes inside one 54 px row (icon, name 13.5, count 10, meta 9.5).
- **Boxes per surface:** an open sidebar group is a box (border) containing boxed rows; tiles are boxes containing icon-boxes containing text; the inspector card is a box containing fields that are chips inside rows. Each extra nested box eats 8–14 px of padding — which is why panels feel *full*, not *layered*.
- **Vertical rhythm** is set by `gap:6–13px` inconsistently across `#sideNav`, `.scroll`, `.gbody`, `.trays` — the eye cannot predict the next gap.

Porsche/Audi/Vectary counter-model: chrome width shrinks, air grows, *one* scale does meta, panels are allowed to be empty. Vectary panels rest at the edge; the configurator row is a slim filmstrip; Porsche drops the entire 2D chrome when you go fullscreen-preview. A premium app would rather show 4 fewer tools at rest than 6 tools squeezed.

---

## 3. Glass, shadows & light — “dashboard glass”, not material

- Panels use `--glass rgba(18,21,28,.78)` with **heavy black** alpha and blur. At .78 the glass is nearly opaque — so there is almost no *scene through the glass*, which is the entire point of glassmorphism. Apple/Vision carry **≤ .55–.65 alpha with 25–40 px blur + 1.2–1.5 saturate**, and let bright pixels diffuse through so the material visibly belongs to the scene.
- **Every panel edge is double-stroked:** hairline border + inset top highlight (`inset 0 1px 0 rgba(255,255,255,.06)` on `.canvas`, on pills, on buttons) + drop shadow. Combined with heavy 20–54 px black shadows, panels read as *stuck-on cards*.
- **Light is inconsistent:** the top strip has its own full-width dark band and blur; side panels have their own shadows; the canvas has an inset highlight that makes it look like a recessed window; the dock has another. Five lighting sources ⇒ no coherent “single studio light”.
- Blue is used as a *material* (gradient tile for logo, blue washes on selections, radial glows on body) rather than as a **state colour**. Porsche and Apple keep chrome near-monochrome and reserve hue for the product and for the single active action.

---

## 4. Hero product presentation — a picture inside an app, not a showroom

The worst offender, and the one that matters most for a configurator:

- The stage is framed like an **embedded screenshot**: `.canvas` gets `border:1px`, `border-radius:20px`, a full `inset` highlight line and `box-shadow: var(--shadow)` — a bevelled, bordered, floating rectangle. The environment *is* the showroom, but it is presented as a media element *inside* the app rather than the room the app lives in.
- Chrome (side panels, HUD pills, legend, hint text) then sits **on top of and around** that rectangle, so the eye has: dark page → frame → scene → five HUD chips → labels → trays. Porsche’s canvas is effectively edge-to-edge; its chrome is marginal and translucent enough that the car owns 85 % of the screen.
- The **product zone itself is empty** by Phase-1.5 rule (correct), but nothing signals luxury intent: no graded floor contact, no rim glow, no composition guide — the scene arrives as a plain stretched JPEG proxy under a vignette. (Phase 3 will add the object; the *presentation frame* can already be fixed now, which this redesign does.)
- Micro-copy stacked on the scene (“Drag to orbit · pinch to zoom…”, legends, format pills) belongs to a dev preview, not a retail-grade configurator. Audi shows *one* contextual hint at a time, fades it, and never stacks 3.

---

## 5. Balance of the four regions

- **Top strip is over-instrumented:** brand tile + product pill + centred segmented control + 4 action buttons on one line. Porsche compresses to brand + one nav + profile. The shell *needs* all of these, but at rest it should reduce to ~3 visual weights, not 5.
- **Side rails are symmetrical and heavy:** both ~full height, both bordered glass, both with headers and counts. On the iPad portrait (834 px) both are collapsed to 84–96 px rails of icon groups — a hidden second system that redesign must not forget.
- **Dock** (good idea) is styled as the loudest element: blue gradient active state + 4px ring + icon drop-glow, height 60 px, with its own preset tray floating above — two stacked control decks above the stage bottom. Vision-style docks are quiet glass; activity is a *small* luminous dot/underline, not a blue button.
- **Inspector** uses exclusive accordions (good) but every card is a filled box with its own border/shadow; inside, labels are uppercase micro with meta under each control — dense fill patterns.

---

## 6. Touch-first (Honor Pad) — built but not designed

- Hit targets are OK (≥38–44 px) but **the density fights the target**: rows are 50 px with 9.5 px meta text; chips are 40 px with 11.5 px text — great targets, poor legibility at arm’s length.
- Hover states that reveal actions (`.p2-envcard .ap`, “APPLY”) are **mouse-only** — on a touchscreen there is no affordance until you guess.
- The drawer-style second chrome at ≤980 px (icon rails) creates two cognitive models of the same app.
- Nothing is thumb-optimised at the bottom (dock is centred mid-screen area; tray pops *above* the dock, far from thumbs). Apple puts primary actions where the thumb lives; Vectary keeps primary spec controls reachable at the bottom edge.

---

## 7. Verdict

The shell is a **competent professional tool UI** whose anatomy is right, but whose *finish layer* is about 3 tiers too busy:

1. Too many **borders/fills/rings** signal “state” for every micro-state.
2. One **accent colour** is doing duty as material, state, glow and gradient — so it stops being precious.
3. The stage is **framed like a screenshot** instead of being the showroom the app floats inside.
4. **Text and spacing are over-layered** — four text sizes and nested boxes per panel kill the calm that premium apps buy with emptiness.
5. Iconography is **mixed**: some inline SVG (good) but a dozen **cartoon emoji** (☕🎬📲🐍🎥🧰🎨🌆🛵…) still sit in brand, versions, assets and projects — instant “dashboard” tell that no Porsche/Audi/Vision screen would carry.
6. The dock & panels use **filled blue** as their active material — Vision/Porsche use white-on-glass states with hairline emphasis.

The redesign in the companion file keeps this exact layout and every interaction, and replaces the finish layer: one quiet glass material, a strict loudness ladder, an unframed cinematic stage, monochrome chrome with a *single* reserved accent, a cleaner type scale, and a full SVG icon pass replacing the emoji.
