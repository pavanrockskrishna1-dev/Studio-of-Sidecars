/* The "Halloween Night" set: one click lays out the BBQ Bike Halloween scene
   (the layout approved in Blender) and its Reel - the bike riding in with its
   wheels rolling, the cabinet door flipping open in the finale.
   The layout and the build steps now live with every other set in
   occasionSetDefs.js / occasionSets.js; this file stays as the Halloween door
   into them, because fx/BatBurst.jsx times the bat burst off DOOR_OPEN and
   ui/OccasionSheet.jsx builds the set through buildHalloweenSet. */

import { buildOccasionSet, SET_PRODUCT_ID, RIDE_IN, DOOR_OPEN } from "./occasionSets";

export { SET_PRODUCT_ID, RIDE_IN, DOOR_OPEN };

// Lays out the set and its Reel. onProgress(text) reports each step.
// Resolves { ok, message, warnings }.
export const buildHalloweenSet = (opts) => buildOccasionSet("halloween", opts);
