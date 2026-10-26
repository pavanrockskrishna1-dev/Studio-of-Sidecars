/* The ground surfaces the Day and Night stages can stand the bike and props
   on (fx/DayStage.jsx, fx/NightStage.jsx, fx/GroundSurface.jsx). Plain data,
   no imports, so scripts/test-ground-surfaces.mjs can check it in plain node.

   "soil" is the original night-stage ground: no texture files, just a plain
   dark material, kept exactly as it was before this module existed. Every
   other surface has a colour + normal + roughness photo texture under
   public/textures/ground/<id>/ (see the README there for sources and
   licence) - CC0 1K JPGs from ambientCG, re-compressed to stay small.

   tileMeters is the real-world size (metres) one texture tile is meant to
   cover, used to set the texture's repeat for the stage's ground radius so
   the tiling reads as a believable scale rather than a stretched or
   obviously-repeating pattern. swatch is the chip colour shown in the UI
   before the texture has loaded (sampled from the texture itself). */

export const GROUND_SURFACES = Object.freeze({
  soil: { label: "Soil", swatch: "#1a1612", textured: false },
  grass: { label: "Grass", swatch: "#65842c", textured: true, tileMeters: 2.2 },
  cobblestone: { label: "Cobblestone", swatch: "#766e62", textured: true, tileMeters: 1.4 },
  asphalt: { label: "Asphalt", swatch: "#565248", textured: true, tileMeters: 4.5 },
  sand: { label: "Sand", swatch: "#b59e71", textured: true, tileMeters: 3.2 },
  deck: { label: "Wooden deck", swatch: "#9e7147", textured: true, tileMeters: 2.6 },
});
export const GROUND_IDS = Object.keys(GROUND_SURFACES);
export const DEFAULT_GROUND = { night: "soil", day: "grass" };

export const isGroundId = (id) => GROUND_IDS.includes(id);
export const textureBase = (id) => `/textures/ground/${id}/`;
