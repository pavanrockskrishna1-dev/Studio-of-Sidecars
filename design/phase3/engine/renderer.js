/* ENGINE · renderer.js — Phase 3. Owns the WebGL context on the locked #cv canvas. */
import * as THREE from 'three';

export function init(engine) {
  const canvas = engine.canvas;
  const r = new THREE.WebGLRenderer({
    canvas, antialias: true, preserveDrawingBuffer: true,
    powerPreference: 'high-performance', stencil: false,
  });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.0;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.setClearColor(0x05060a, 1);
  engine.renderer = r;
  engine.canvasCtx = r.getContext();
  return r;
}

/* Fit the live renderer to the locked stage element (CSS px -> device px). */
export function resizeTo(engine, w, h, pixelRatio) {
  const r = engine.renderer;
  const pr = Math.min(pixelRatio || (typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1), 2);
  engine.cssW = w; engine.cssH = h;
  engine.canvas.style.width = w + 'px';
  engine.canvas.style.height = h + 'px';
  r.setPixelRatio(pr);
  r.setSize(w, h, false);
  engine.pr = pr;
}
