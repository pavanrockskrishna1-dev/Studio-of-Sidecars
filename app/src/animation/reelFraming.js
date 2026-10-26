// How a Reel frames its shots. "scene" (the default) fits the product AND every
// added object, as the Garage always has; "product" fits the main product only,
// so a set dressed around it (trees, barrels) shows without shrinking it.
// Read by the stage when a preview or export starts.
export const reelFraming = { mode: "scene" };

export function setReelFraming(mode) {
  reelFraming.mode = mode === "product" ? "product" : "scene";
}
