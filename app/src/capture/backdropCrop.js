/* Phase 16B, Slice C2 - backdrop "cover" crop for portrait and square exports.
   ---------------------------------------------------------------------------
   three.js draws a texture scene.background as a full-screen quad with uv 0..1,
   so the flat 3:2 environment photo is squashed to any other export aspect. For
   an export frame that is portrait or square, withBackdropCrop() temporarily
   sets the background texture's repeat and offset so the photo is shown with a
   centred "cover" fit (no distortion, the sides are cropped), renders, and
   puts the original values back in the same synchronous task.

   Pure JS, duck-typed, no imports: it never imports three or react. */

// Only portrait and square exports get the crop; landscape stays as it is.
export const needsCoverCrop = (targetAspect) =>
  Number.isFinite(targetAspect) && targetAspect > 0 && targetAspect <= 1 + 1e-9;

const isPositive = (n) => typeof n === "number" && Number.isFinite(n) && n > 0;
const clamp01 = (n) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0.5));

// The uv window { repeatX, repeatY, offsetX, offsetY } that shows an image of
// imageAspect (width / height) with a "cover" fit in a frame of targetAspect.
// focus is where the window sits in the spare space (0.5 = centred). Returns
// null when an aspect is not a finite positive number.
export function coverCrop(imageAspect, targetAspect, focus = { x: 0.5, y: 0.5 }) {
  if (!isPositive(imageAspect) || !isPositive(targetAspect)) return null;
  let repeatX = 1;
  let repeatY = 1;
  if (targetAspect < imageAspect) repeatX = targetAspect / imageAspect;
  else if (targetAspect > imageAspect) repeatY = imageAspect / targetAspect;
  const fx = clamp01(focus && focus.x);
  const fy = clamp01(focus && focus.y);
  return {
    repeatX,
    repeatY,
    offsetX: (1 - repeatX) * fx,
    offsetY: (1 - repeatY) * fy,
  };
}

const UV_MAPPING = 300; // THREE.UVMapping

// Calls render() exactly once and returns its result. For a portrait / square
// targetAspect and a plain UV-mapped image texture on scene.background, the
// texture's repeat / offset hold the cover crop while render() runs and are
// restored afterwards, even if render() throws. Anything else: just render().
// Because the restore is in the same synchronous call, an aborted, canceled or
// unmounted export never leaves a crop behind.
export function withBackdropCrop(scene, targetAspect, render) {
  const bg = scene ? scene.background : null;
  let crop = null;
  if (
    needsCoverCrop(targetAspect) &&
    bg &&
    bg.isTexture === true &&
    bg.mapping === UV_MAPPING &&
    bg.rotation === 0 &&
    bg.image
  ) {
    const iw = bg.image.width || bg.image.naturalWidth;
    const ih = bg.image.height || bg.image.naturalHeight;
    if (isPositive(iw) && isPositive(ih)) crop = coverCrop(iw / ih, targetAspect);
  }
  if (!crop) return render();

  const saved = {
    rx: bg.repeat.x,
    ry: bg.repeat.y,
    ox: bg.offset.x,
    oy: bg.offset.y,
  };
  bg.repeat.set(crop.repeatX, crop.repeatY);
  bg.offset.set(crop.offsetX, crop.offsetY);
  bg.updateMatrix(); // do not depend on matrixAutoUpdate
  try {
    return render();
  } finally {
    bg.repeat.set(saved.rx, saved.ry);
    bg.offset.set(saved.ox, saved.oy);
    bg.updateMatrix();
  }
}
