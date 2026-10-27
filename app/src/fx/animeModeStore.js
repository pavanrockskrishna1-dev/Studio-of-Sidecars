const PALETTES = {
  ink: { stops: [0x333333, 0x787878, 0xbebebe, 0xf2f2f2] },
  warm: { stops: [0x4a3728, 0xc47a3c, 0xe8b87d, 0xfff0d0] },
  cool: { stops: [0x1a1f3a, 0x3d4a8c, 0x7a8fcc, 0xc8d4f0] },
};

let state = { anime: false, toonPalette: "ink" };
const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const getSnapshot = () => state;
export const toggleAnime = () => {
  state = { ...state, anime: !state.anime };
  for (const fn of listeners) fn();
};
export const setAnime = (on) => {
  if (state.anime === on) return;
  state = { ...state, anime: on };
  for (const fn of listeners) fn();
};
export const setToonPalette = (palette) => {
  if (!PALETTES[palette]) return;
  if (state.toonPalette === palette) return;
  state = { ...state, toonPalette: palette };
  for (const fn of listeners) fn();
};
