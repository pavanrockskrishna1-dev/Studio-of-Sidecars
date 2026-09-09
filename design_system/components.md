# Design System · Components

Studio of Sidecars — master inventory of chrome components, their anatomy and states.

| | |
|---|---|
| Status | Locked reference (Phase 2 approved) |
| Source of truth | DOM in `design/studio_sidecars_premium_ui.html` (ids/hierarchy) + chrome rules in `design/redesign/skin/premium_finish.css` |
| Governs | Phase 3 — Live Engine Integration and every future UI phase |
| Golden rule | The skin is **presentational**. New phases compose from these parts; they never add a competing visual language. |

> id map (immutable): `#topStrip` · `#appBrand` > `#soLogo/#soTitle/#soTag` ·
> `#projPill` · `#topbar` > `.vchip[data-vid]` (V1–V6) · `#appActions` (`#tbExport
> #tbLearn #tbHelp #tbSettings`) · `#sideNav` (`#navVersions #navAssets #navScenes
> #navProjects #navFavs`) · `#inspector > #inBody` · `#dock` (`.dk-btn`) · overlays
> `#sosSplash #sosOv #saveOv` · engine host `#cv`. Never rename or re-parent.

---

## 1. State system (shared vocabulary)

| State | Recipe |
|---|---|
| Default | Hairline border `rgba(255,255,255,.05–.075)`, transparent/glass fill, text `--muted`–`--txt2` |
| Hover | White lift `rgba(255,255,255,.03–.055)`, text `#fff` |
| Press | `transform:scale(.96)`; fast (180 ms) |
| On / selected | White-lift chip `rgba(255,255,255,.06–.1)` + `--line-hi` border + `#fff` text; tick/caret shown |
| Hero | Solid white fill (`#fff`) — only the primary CTA and stage-mode toggle |
| Disabled | Faint text, no lift, no cursor change beyond `not-allowed` (rare in chrome) |
| Focus | `1.5px rgba(150,195,255,.55)` ring, 2 px offset (keyboard/touch) |

Accent blue is **not** an "on" colour — see `colors.md` §4.

---

## 2. Region anatomy & component specs (approved values)

### 2.1 Top bar `#topStrip` (floating, ~115 px incl. pad)
- `#soLogo` — 40×40, radius 13, glass tile + hairline, mark 21–22.
- `#soTitle` 15/750 · `#soTag` eyebrow 8.5/.22em.
- `#projPill` — height 38, radius 999, hairline glass; live `.dot` 6 px green glow.
- `#topbar` — segmented pill (radius 999, padding 4) holding **V1–V6 `.vchip`**:
  height 38, radius 999, micro index `i`, state `.cd` dot (accent `#a6c8ff` glow when on).
  Active is radio-driven (workspace switch) — never re-implement as a tab bar.
- `#appActions` — `.abtn` height 40/radius 12: quiet default, `.learn` quieter,
  `.icon` 40×40, `.primary` = **solid white Export** (the only white CTA).

### 2.2 Left rail `#sideNav` (260 px → 96 px compact)
- `.phead` — eyebrow `.t` (10/.24em) + subtitle `.s` (10.5–12) + `.more`.
- `details.group` accordions — summary min-height 44/radius 13, `.gn` 12.5/700,
  `.gc` count pill, `.gv` chevron; open = faint glass wash.
- `.vrow` version rows — min-height 46/radius 12; `.vt` icon well 27×27/radius 9;
  `.vn b` 12.5 + `.vn span` 9.5 sub; `.vtag` micro; `.on` = white-lift + white tick
  `.tick` 17×17 (check icon 10).
- `.pill-grid .tile` asset tiles — radius 14; `tt-ic` icon well 34 tall/radius 10;
  `b` 11 + `span` 9.
- `.tag` — radius 999, gold `pi-star` for favourites, `.b` count.
- `.proj-row` — radius 12; `.proj-th` 32×32 monogram tile; `.pi b/span`;
  `.live` micro status.
- `.side-foot` — private `.lock` 28×28/radius 9 green glyph; `b` 11 + `span` 9.5.
- Sections: `#navVersions #navAssets #navScenes #navProjects #navFavs` (locked).

### 2.3 Inspector `#inspector` (318 px → 96 px compact)
- `details.card` sections — summary min-height 50/radius 16; `.ci` icon well
  11 radius; `.ct b` 13/700 + `.ct span` 9; open = faint wash + chevron rotate.
- `.cbody` — `field label` (10–11.5/.06em), `.row-chips .rchip` (height 38/radius 11;
  `.on` white-lift), `.slider` (track `#1b212c`, white thumb `em`), `.switch`
  (`.knob`, on = white knob, `em` travels 22 px), `.mat-row` materials
  (`.sw` swatch 32×32/radius 10, `.mn b/span`; `.on` white-lift), `.micro .m`
  metric tiles (radius 11, `b` 11), `.sub` note, `#btnDoExport` render CTA.

### 2.4 Creator dock `#dock` (floating pill, bottom 16)
- Pill radius 999; `#tlSelect … #tlRender` radios drive `label.dk-btn[for=…]`
  via `:checked ~ #dock` sibling selectors (locked mechanism).
- `.dk-btn` — min-width 64, height 54, radius 16, icon 19 (21 compact), label 9.5/700.
- On = white-lift chip (`.dk-btn` active) — the dock is a **tool switcher**, never tabs.
- `.sep` hairlines between groups; `.trays` contextual sheet above the dock.

### 2.5 Preset tray `.trays` (contextual, one tool at a time)
- Glass sheet radius 20; `.tray-lbl` eyebrow 8.5/.22em.
- `.pr-tile` preset tiles — width 106, radius 16, `.thumb` 52 tall, `.tt` 9.5;
  `.on` = white ring `rgba(255,255,255,.2)` + 3 px soft halo.
- Apply state shows check + ring; tray dismisses after apply (Phase-2 behaviour).

### 2.6 Stage HUD (floating over the showroom)
- `.cv-toggle` segmented pill (Demo/Empty) — labels 32/radius 999; `.on` = solid white.
- `.cv-tag` — current project/environment tag pill, live `.dot`.
- `.cv-status .pill` — render/status pills; `.on` white-lift.
- `.cv-hint` micro bar · `.cv-legend` tiny tracked legend.
- Engine host: `.cv-scene` (`#cv` canvas area), `.cv-empty` dropzone (`dz-ic` icon
  26, `dz-act` 13) — content reserved for Phase 3.

### 2.7 Learn Studio onboarding
- Spotlight + `.p2-guidecard` tooltip cards (320–360 px comfortable width), arrow to
  the anchor; card body is sized to accept **video/asset placeholders** in Phase 3.
- Tour navigators (`#p2Next`, steps) — dock-style ghost buttons, `.on`-adjacent
  white-lift primary.

### 2.8 Overlays `#sosSplash #sosOv #saveOv`
- Full-screen dim + centered glass card (same material ladder); export flow
  (`#btnDoExport`, packs) — structure locked, presentational rules apply.

---

## 3. Composition rules for future phases

1. Build new UI from this kit (rail rows, chips, cards, dock, trays, HUD pills,
   guidecards) — don't invent a new chrome style.
2. One tool/panel open at a time on the dock; overlays are contextual, never
   persistent side-columns beyond the two locked rails.
3. Rows/cards must have explicit `hover` AND `:active`/`on` equivalents so touch
   works without hover (see `honor_pad_guidelines.md`).
4. Never remove a capability to simplify (presentation ≠ power).
5. Never restyle by *selector-soup*: a new visual belongs in the skin layer or a
   Phase-3 owned overlay CSS block, not edits to the canonical file.

---

*Related: all design-system files; visual proof in `design/redesign/exports/premium_finish_master/`*
