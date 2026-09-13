/* ==========================================================================
   BBQ Bike UI pack — asset manifest (Agent #2 · UI ONLY, Mission 10B)
   --------------------------------------------------------------------------
   Every image here is a still that was derived from the Google Drive asset
   pack by an offline renderer, then committed as a studio plate. The GLBs stay
   out of the app on purpose: nothing in this file can be loaded, selected or
   registered, and nothing here is fed to the WebGL stage. It is branding and
   reference art for the Creator shell.

   What this deliberately is NOT:
     · not a registry — `app/src/products/registry.js` decides what the studio
       can display, and the BBQ Bike is intentionally absent from it (Mission
       11A lands that);
     · not a second library — the Asset Library reads the engine registries
       (see content.js); this module only names picture files;
     · not interactive data — no ids, no handlers, no store. The `id` fields
       below key a purely local <img> swap inside the panel.

   Provenance is kept next to each entry (`source`) because these files are the
   only place the pack's originals are recorded: `Machine letters.glb`, for
   instance, is a wordmark sculpted from engine parts that reads "MACHINE", and
   `coffee bike kop.glb` is an untextured geometry variant — the panel says so
   rather than letting a visitor assume the clay render is the shipped bike.
   ========================================================================== */

const PACK_DIR = "/bbq";

/** Brand mark. Rendered front-on from the logo GLB in the pack. */
export const BRAND_MARK = {
  src: `${PACK_DIR}/brand-wordmark.jpg`,
  alt: "Brand wordmark rendered in three dimensions from engine parts: pistons, forks, a gear, spark plugs and exhaust pipes spelling MACHINE.",
  source: "Machine letters.glb",
  label: "Brand mark",
};

/**
 * Switchable hero views of the BBQ Bike. `views` is what the local segmented
 * control cycles; each entry names the GLB the still came from.
 */
export const BBQ_VIEWS = [
  {
    id: "hero",
    src: `${PACK_DIR}/bbq-bike-hero.jpg`,
    short: "Front 3/4",
    label: "Front three-quarter",
    alt: "Maroon classic motorcycle with white wheels and exhaust, shown from the front three-quarter on a dark studio plate.",
    source: "re_classic_350_red.glb",
  },
  {
    id: "profile",
    src: `${PACK_DIR}/bbq-bike-profile.jpg`,
    short: "Profile",
    label: "Left profile",
    alt: "The same motorcycle in flat left profile: tank badge, engine fins, duplex exhaust and spoked wheels.",
    source: "re_classic_350_red.glb",
  },
  {
    id: "rear",
    src: `${PACK_DIR}/bbq-bike-rear.jpg`,
    short: "Rear",
    label: "Rear three-quarter",
    alt: "Rear three-quarter view with the tail lamp, amber indicators and a number plate reading KA 03 JR 1980.",
    source: "re_classic_350_red.glb",
  },
];

/** Card art for the announced-but-unshipped product card. Preview only. */
export const BBQ_CARD_THUMB = `${PACK_DIR}/bbq-bike-card.jpg`;

/** Reference plates: the hardware pieces that are not the bike itself. */
export const BBQ_REFERENCES = [
  {
    id: "chassis",
    src: `${PACK_DIR}/sidecar-chassis.jpg`,
    label: "Sidecar chassis",
    sub: "ladder frame, three-quarter",
    alt: "Black tubular sidecar ladder frame with a single spoked wheel, shown beside the maroon motorcycle it mounts to.",
    source: "re classic chassis sidecar.glb",
  },
  {
    id: "layout",
    src: `${PACK_DIR}/sidecar-layout.jpg`,
    label: "Chassis layout",
    sub: "plan view",
    alt: "Top-down plan view of the sidecar frame and the motorcycle, showing how the chassis bolts in line with the rear axle.",
    source: "re classic chassis sidecar.glb",
  },
  {
    id: "coffee-geometry",
    src: `${PACK_DIR}/coffee-bike-geometry.jpg`,
    label: "Coffee Bike geometry",
    sub: "untextured pack variant",
    alt: "Clay-shaded render of the coffee bike and its cabinet sidecar from the pack: geometry only, with a single pink panel.",
    source: "coffee bike kop.glb",
  },
];

/**
 * Material swatches — the baseColor maps actually embedded in the pack's GLBs,
 * under the material names those files carry. Downscaled to 132px squares.
 */
export const BBQ_MATERIALS = [
  {
    src: `${PACK_DIR}/materials/burgundy-fuel-tank.jpg`,
    label: "Burgundy fuel tank",
    source: "coffee bike kop.glb · Meteor___burgundy_fuel_tank",
  },
  {
    src: `${PACK_DIR}/materials/sidecar-mudguard.jpg`,
    label: "Fitted mudguard",
    source: "coffee bike kop.glb · Sidecar___fitted_burgundy_mudguard",
  },
  {
    src: `${PACK_DIR}/materials/front-cabinet-branding.jpg`,
    label: "Front cabinet branding",
    source: "coffee bike kop.glb · KOP___front_cabinet_branding",
  },
  {
    src: `${PACK_DIR}/materials/cabinet-door-branding.jpg`,
    label: "Cabinet door branding",
    source: "coffee bike kop.glb · KOP___cabinet_door_branding",
  },
  {
    src: `${PACK_DIR}/materials/inner-chassis-rail.jpg`,
    label: "Inner chassis rail",
    source: "coffee bike kop.glb · Repair___inner_chassis_rail",
  },
  {
    src: `${PACK_DIR}/materials/bbq-part-0-basecolor.jpg`,
    label: "BBQ bodywork · part 0",
    source: "re_classic_350_red.glb · tripo_part_0_basecolor",
  },
  {
    src: `${PACK_DIR}/materials/bbq-part-2-basecolor.jpg`,
    label: "BBQ bodywork · part 2",
    source: "re_classic_350_red.glb · tripo_part_2_basecolor",
  },
];

export const BBQ_PACK = {
  name: "BBQ Bike",
  tag: "UI preview",
  sub: "reference only",
  /** honest one-liner about what the panel is, shown under the section head */
  note: "Stills from the Drive asset pack. Not in the product registry — nothing here loads into the stage. Engine integration is Mission 11A.",
  brand: BRAND_MARK,
  views: BBQ_VIEWS,
  references: BBQ_REFERENCES,
  materials: BBQ_MATERIALS,
};

export default BBQ_PACK;
