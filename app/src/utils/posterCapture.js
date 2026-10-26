import * as THREE from "three";

// Poster Maker — a one-click high-res PNG of the current live view (the same
// WebGL canvas the owner sees: the bike, props, effects, placed lights,
// ground and sky), never a video or a render. The trick: temporarily boost
// the renderer's pixel ratio and size, draw one frame, read the canvas as a
// PNG, then put the renderer back exactly as it was.

export const POSTER_FORMATS = Object.freeze({
  square: { width: 1080, height: 1080, label: "Square" },
  portrait: { width: 1080, height: 1350, label: "Portrait" },
  landscape: { width: 1920, height: 1080, label: "Landscape" },
});

export const POSTER_QUALITIES = Object.freeze({
  standard: { scale: 1.5, label: "Standard" },
  high: { scale: 3, label: "High" },
});

// The stage (StudioCanvas) registers { gl, scene, camera } here once mounted,
// so the Poster panel — a sibling UI tree, not a child of the Canvas — can
// trigger a capture without prop-drilling. Same module-level pattern as
// garage/garageMode.js's apiRef.
export const posterApiRef = { current: null };

export function registerPosterApi(api) {
  posterApiRef.current = api;
  return () => {
    if (posterApiRef.current === api) posterApiRef.current = null;
  };
}

/**
 * Renders one frame at the target poster size and returns it as a PNG data
 * URL. Restores the renderer's pixel ratio and size before returning.
 * @param {{gl: import('three').WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, format: keyof typeof POSTER_FORMATS, quality: keyof typeof POSTER_QUALITIES}} opts
 * @returns {Promise<{dataUrl: string, widthPx: number, heightPx: number}>}
 */
export function posterCapture({ gl, scene, camera, format, quality }) {
  const spec = POSTER_FORMATS[format] || POSTER_FORMATS.square;
  const q = POSTER_QUALITIES[quality] || POSTER_QUALITIES.standard;
  const dpr = typeof window !== "undefined" && window.devicePixelRatio ? window.devicePixelRatio : 1;
  const maxTextureSize = (gl.capabilities && gl.capabilities.maxTextureSize) || 4096;
  const ratioLimit = maxTextureSize / Math.max(spec.width, spec.height);
  const ratio = Math.max(1, Math.min(dpr * q.scale, ratioLimit));

  const prevPixelRatio = gl.getPixelRatio();
  const prevSize = gl.getSize(new THREE.Vector2());
  const prevAspect = camera.aspect;

  const restore = () => {
    gl.setPixelRatio(prevPixelRatio);
    gl.setSize(prevSize.x, prevSize.y, false);
    camera.aspect = prevAspect;
    camera.updateProjectionMatrix();
    gl.render(scene, camera);
  };

  gl.setPixelRatio(ratio);
  gl.setSize(spec.width, spec.height, false);
  camera.aspect = spec.width / spec.height;
  camera.updateProjectionMatrix();
  gl.render(scene, camera);

  return new Promise((resolve, reject) => {
    // One frame to let the resized draw settle before the canvas is read.
    requestAnimationFrame(() => {
      try {
        const dataUrl = gl.domElement.toDataURL("image/png");
        restore();
        resolve({
          dataUrl,
          widthPx: Math.round(spec.width * ratio),
          heightPx: Math.round(spec.height * ratio),
        });
      } catch (err) {
        restore();
        reject(err);
      }
    });
  });
}
