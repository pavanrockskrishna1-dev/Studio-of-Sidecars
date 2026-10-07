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

export const MAX_PROPS = 12;

export const PROPS = Object.freeze([
  { id: "prop-burger", name: "Burger", label: "Burger", modelPath: "/models/props/burger.glb", thumbUrl: "/models/props/burger-thumb.jpg", size: [0.107, 0.0854, 0.11] },
  { id: "prop-roll", name: "Roll", label: "Roll", modelPath: "/models/props/roll.glb", thumbUrl: "/models/props/roll-thumb.jpg", size: [0.0529, 0.24, 0.0564] },
  { id: "prop-wings", name: "Wings", label: "Wings", modelPath: "/models/props/wings.glb", thumbUrl: "/models/props/wings-thumb.jpg", size: [0.1186, 0.057, 0.12] },
  { id: "prop-drumsticks", name: "Drumsticks", label: "Drumsticks", modelPath: "/models/props/drumsticks.glb", thumbUrl: "/models/props/drumsticks-thumb.jpg", size: [0.22, 0.1241, 0.165] },
]);

export const isPropId = (id) => PROPS.some((p) => p.id === id);
