// Slice P2 — the props shelf: small real-size food models (metres) that the
// Creator sheet drops into the scene. A prop is an ordinary Garage added object
// (garage/sceneObjects.js, StudioCanvas addObject), so it is selectable, moves
// with the gizmo, saves, undoes and takes Reel keys and cycles like any other.
// The only difference is where the asset comes from: this list, NOT PRODUCTS,
// so a prop never shows up as a product card, a model chip or a main product.
//
// `size` is the file's bounding box in metres (x, y, z), measured from the GLB
// and checked by scripts/test-props.mjs. Props are never rescaled on load.
// Source files: "Studio assets/BBQ props/" (textures downscaled to 1024, JPEG
// q85; see HANDOFF "Slice P2").

export const MAX_PROPS = 30; // the same cap as garage/sceneObjects.js OBJECT_LIMITS.MAX_PROPS

export const PROPS = Object.freeze([
  // ── original grill food ─────────────────────────────────────────────────────
  { id: "prop-burger",     name: "Burger",     label: "Burger",     modelPath: "/models/props/burger.glb",     thumbUrl: "/models/props/burger-thumb.jpg",     size: [0.107,  0.0854, 0.11]  },
  { id: "prop-roll",       name: "Roll",       label: "Roll",       modelPath: "/models/props/roll.glb",       thumbUrl: "/models/props/roll-thumb.jpg",       size: [0.0529, 0.24,   0.0564] },
  { id: "prop-wings",      name: "Wings",      label: "Wings",      modelPath: "/models/props/wings.glb",      thumbUrl: "/models/props/wings-thumb.jpg",      size: [0.1186, 0.057,  0.12]  },
  { id: "prop-drumsticks", name: "Drumsticks", label: "Drumsticks", modelPath: "/models/props/drumsticks.glb", thumbUrl: "/models/props/drumsticks-thumb.jpg", size: [0.22,   0.1241, 0.165] },

  // ── new BBQ Ride food ───────────────────────────────────────────────────────
  { id: "prop-bbq-chicken-burger",     name: "Chicken Burger",     label: "Chicken Burger",     modelPath: "/models/bbq_chicken_burger.glb",           thumbUrl: "/models/props/thumbs/prop-bbq-chicken-burger.jpg", size: [0.12, 0.09, 0.12]  },
  { id: "prop-bbq-chicken-burger-v2",  name: "Chicken Burger V2",  label: "Chicken Burger V2",  modelPath: "/models/bbq_chicken_burger_v2.glb",        thumbUrl: "/models/props/thumbs/prop-bbq-chicken-burger-v2.jpg", size: [0.12, 0.09, 0.12]  },
  { id: "prop-bbq-chicken-roll",       name: "Chicken Roll",       label: "Chicken Roll",       modelPath: "/models/bbq_chicken_roll.glb",             thumbUrl: "/models/props/thumbs/prop-bbq-chicken-roll.jpg", size: [0.12, 0.09, 0.15]  },
  { id: "prop-bbq-chicken-wing",       name: "Chicken Wing",       label: "Chicken Wing",       modelPath: "/models/bbq_chicken_wing_single.glb",      thumbUrl: "/models/props/thumbs/prop-bbq-chicken-wing.jpg", size: [0.09, 0.04, 0.14]  },
  { id: "prop-bbq-chicken-drumsticks", name: "Chicken Drumsticks", label: "Chicken Drumsticks", modelPath: "/models/bbq_chicken_drumsticks_pair.glb",  thumbUrl: "/models/props/thumbs/prop-bbq-chicken-drumsticks.jpg", size: [0.17, 0.09, 0.22]  },
  { id: "prop-bbq-box-closed",         name: "BBQ Box (Closed)",   label: "BBQ Box Closed",     modelPath: "/models/bbq_box_closed.glb",               thumbUrl: "/models/props/thumbs/prop-bbq-box-closed.jpg", size: [0.18, 0.14, 0.18]  },
  { id: "prop-bbq-box-open",           name: "BBQ Box (Open)",     label: "BBQ Box Open",       modelPath: "/models/bbq_box_open.glb",                 thumbUrl: "/models/props/thumbs/prop-bbq-box-open.jpg", size: [0.18, 0.14, 0.18]  },
  { id: "prop-bbq-coal-bed",           name: "Coal Bed",           label: "Coal Bed",           modelPath: "/models/bbq_coal_bed_tile.glb",            thumbUrl: "/models/props/thumbs/prop-bbq-coal-bed.jpg", size: [0.30, 0.06, 0.30], surfaceFloor: true  },

  // ── BBQ Smith scene dressing ────────────────────────────────────────────────
  { id: "prop-bbqsmith-barrel-table",   name: "Barrel Table",      label: "Barrel Table",      modelPath: "/models/bbqsmith_barrel_table.glb",       thumbUrl: "/models/props/thumbs/prop-bbqsmith-barrel-table.jpg", size: [0.55, 0.90, 0.55]  },
  { id: "prop-bbqsmith-whisky-barrel",  name: "Whisky Barrel",     label: "Whisky Barrel",     modelPath: "/models/bbqsmith_whisky_barrel.glb",      thumbUrl: "/models/props/thumbs/prop-bbqsmith-whisky-barrel.jpg", size: [0.42, 0.50, 0.42]  },
  { id: "prop-bbqsmith-half-barrel",    name: "Half Barrel",       label: "Half Barrel",       modelPath: "/models/bbqsmith_half_barrel.glb",        thumbUrl: "/models/props/thumbs/prop-bbqsmith-half-barrel.jpg", size: [0.50, 0.45, 0.50]  },
  { id: "prop-bbqsmith-smoker-wagon",   name: "Smoker Wagon",      label: "Smoker Wagon",      modelPath: "/models/bbqsmith_smoker_wagon.glb",       thumbUrl: "/models/props/thumbs/prop-bbqsmith-smoker-wagon.jpg", size: [1.20, 1.10, 0.65]  },
  { id: "prop-bbqsmith-firewood",       name: "Firewood Counter",  label: "Firewood Counter",  modelPath: "/models/bbqsmith_firewood_counter.glb",   thumbUrl: "/models/props/thumbs/prop-bbqsmith-firewood.jpg", size: [0.60, 0.80, 0.40]  },
  { id: "prop-bbqsmith-utensils",       name: "Hanging Utensils",  label: "Hanging Utensils",  modelPath: "/models/bbqsmith_hanging_utensils.glb",   thumbUrl: "/models/props/thumbs/prop-bbqsmith-utensils.jpg", size: [0.32, 0.55, 0.06]  },
  { id: "prop-bbqsmith-bare-tree",      name: "Bare Tree",         label: "Bare Tree",         modelPath: "/models/bbqsmith_bare_tree.glb",          thumbUrl: "/models/props/thumbs/prop-bbqsmith-bare-tree.jpg", size: [0.50, 2.40, 0.50]  },
  { id: "prop-bbqsmith-bbq-letters",    name: "BBQ Letters",       label: "BBQ Letters",       modelPath: "/models/bbqsmith_bbq_letters.glb",        thumbUrl: "/models/props/thumbs/prop-bbqsmith-bbq-letters.jpg", size: [0.85, 0.32, 0.12]  },
  { id: "prop-bbqsmith-venue",          name: "BBQ Venue",         label: "BBQ Venue",         modelPath: "/models/bbqsmith_venue.glb",              thumbUrl: "/models/props/thumbs/prop-bbqsmith-venue.jpg", size: [5.00, 3.50, 7.00]  },
  { id: "prop-firewood-storage",        name: "Firewood Storage",  label: "Firewood Storage",  modelPath: "/models/firewoodstorage3dmodel.glb",      thumbUrl: "/models/props/thumbs/prop-firewood-storage.jpg", size: [0.80, 0.65, 0.40]  },

  // ── Halloween seasonal ───────────────────────────────────────────────────────
  { id: "prop-halloween-pumpkin-crab",  name: "Pumpkin Crab",      label: "Pumpkin Crab 🦀",   modelPath: "/models/props/halloween-pumpkin-crab.glb", thumbUrl: "/models/props/thumbs/prop-halloween-pumpkin-crab.jpg", size: [0.60, 0.45, 0.55], seasonal: "halloween" },

  // ── scene dressing (pack A) ─────────────────────────────────────────────────
  { id: "prop-log",             name: "Log",             label: "Log",             modelPath: "/models/props/prop-log.glb",             thumbUrl: null, size: [1.128, 0.589, 1.216] },
  { id: "prop-blackboard",      name: "Blackboard",      label: "Blackboard",      modelPath: "/models/props/prop-blackboard.glb",      thumbUrl: null, size: [3.634, 1.63, 0.065] },
  { id: "prop-bin",             name: "Bin",             label: "Bin",             modelPath: "/models/props/prop-bin.glb",             thumbUrl: null, size: [0.604, 1.118, 0.591] },
  { id: "prop-shovel",          name: "Shovel",          label: "Shovel",          modelPath: "/models/props/prop-shovel.glb",          thumbUrl: null, size: [0.328, 1.505, 0.136] },
  { id: "prop-balloons",        name: "Balloons",        label: "Balloons",        modelPath: "/models/props/prop-balloons.glb",        thumbUrl: null, size: [1.093, 1.789, 0.973] },
  { id: "prop-table-chairs",    name: "Table & Chairs",  label: "Table & Chairs",  modelPath: "/models/props/prop-table-chairs.glb",    thumbUrl: null, size: [0.88, 0.80, 1.305] },
  { id: "prop-street-light",    name: "Street Light",    label: "Street Light",    modelPath: "/models/props/prop-street-light.glb",    thumbUrl: null, size: [1.458, 2.394, 2.135] },
  { id: "prop-lemon",           name: "Lemon",           label: "Lemon",           modelPath: "/models/props/prop-lemon.glb",           thumbUrl: null, size: [0.106, 0.087, 0.118] },
  { id: "prop-stone",           name: "Stone",           label: "Stone",           modelPath: "/models/props/prop-stone.glb",           thumbUrl: null, size: [1.155, 1.135, 1.261] },
  { id: "prop-pumpkin",         name: "Pumpkin",         label: "Pumpkin",         modelPath: "/models/props/prop-pumpkin.glb",         thumbUrl: null, size: [0.345, 0.303, 0.343], seasonal: "halloween" },
  { id: "prop-oak-tree",        name: "Oak Tree",        label: "Oak Tree",        modelPath: "/models/props/prop-oak-tree.glb",        thumbUrl: null, size: [4.336, 3.63, 3.312] },
  { id: "prop-jack-o-lantern",  name: "Jack-o-Lantern",  label: "Jack-o-Lantern",  modelPath: "/models/props/prop-jack-o-lantern.glb",  thumbUrl: null, size: [2.397, 2.546, 2.028], seasonal: "halloween" },
  { id: "prop-spider",          name: "Spider",          label: "Spider",          modelPath: "/models/props/prop-spider.glb",          thumbUrl: null, size: [0.172, 0.03, 0.148],  seasonal: "halloween" },
  { id: "prop-bbqride-logo",    name: "BBQ Ride Logo",   label: "BBQ Ride Logo",   modelPath: "/models/props/prop-bbqride-logo.glb",    thumbUrl: null, size: [0.1, 0.1, 0.003] },

  // ── scene dressing (pack B) ─────────────────────────────────────────────────
  { id: "prop-christmas-tree",     name: "Christmas Tree",   label: "Christmas Tree",   modelPath: "/models/props/prop-christmas-tree.glb",     thumbUrl: null, size: [1.254, 1.78, 1.212],   seasonal: "christmas" },
  { id: "prop-fire-barrel",        name: "Fire Barrel",      label: "Fire Barrel",      modelPath: "/models/props/prop-fire-barrel.glb",         thumbUrl: null, size: [0.966, 1.192, 0.966] },
  { id: "prop-campfire",           name: "Campfire",         label: "Campfire",         modelPath: "/models/props/prop-campfire.glb",            thumbUrl: null, size: [0.671, 0.614, 0.753] },
  { id: "prop-stylized-tree",      name: "Stylized Tree",    label: "Stylized Tree",    modelPath: "/models/props/prop-stylized-tree.glb",       thumbUrl: null, size: [5.886, 7.273, 4.794] },
  { id: "prop-milling-machine",    name: "Milling Machine",  label: "Milling Machine",  modelPath: "/models/props/prop-milling-machine.glb",     thumbUrl: null, size: [1.504, 1.792, 1.55] },
  { id: "prop-lathe",              name: "Lathe",            label: "Lathe",            modelPath: "/models/props/prop-lathe.glb",               thumbUrl: null, size: [2.653, 1.976, 1.08] },
  { id: "prop-dog",                name: "Dog",              label: "Dog",              modelPath: "/models/props/prop-dog.glb",                 thumbUrl: null, size: [0.291, 0.71, 1.023] },
  { id: "prop-human-dance",        name: "Dancer",           label: "Dancer",           modelPath: "/models/props/prop-human-dance.glb",         thumbUrl: null, size: [1.547, 0.253, 1.72] },
  { id: "prop-human-walk-f",       name: "Woman Walking",    label: "Woman Walking",    modelPath: "/models/props/prop-human-walk-f.glb",        thumbUrl: null, size: [1.547, 0.253, 1.72] },
  { id: "prop-human-wave",         name: "Person Waving",    label: "Person Waving",    modelPath: "/models/props/prop-human-wave.glb",          thumbUrl: null, size: [1.828, 0.326, 1.821] },
  { id: "prop-human-phone",        name: "On The Phone",     label: "On The Phone",     modelPath: "/models/props/prop-human-phone.glb",         thumbUrl: null, size: [1.828, 0.326, 1.821] },
  { id: "prop-human-walk-m",       name: "Man Walking",      label: "Man Walking",      modelPath: "/models/props/prop-human-walk-m.glb",        thumbUrl: null, size: [1.828, 0.326, 1.821] },
  { id: "prop-human-walk-phone",   name: "Walking & Talking",label: "Walking & Talking",modelPath: "/models/props/prop-human-walk-phone.glb",    thumbUrl: null, size: [1.828, 0.326, 1.821] },
  { id: "prop-human-riverdance",   name: "River Dance",      label: "River Dance",      modelPath: "/models/props/prop-human-riverdance.glb",    thumbUrl: null, size: [1.828, 0.326, 1.821] },
]);

export const isPropId = (id) => PROPS.some((p) => p.id === id);
