import * as THREE from "three";
import { GROUND_SURFACES, textureBase } from "./groundSurfaces.js";

// Shared colour/normal/roughness texture set per ground surface - one load
// per surface id across every mount (switching Day/Night/studio or placing
// a new stage never re-fetches a surface already used this session).
const _cache = new Map();
const _loader = new THREE.TextureLoader();

function load(url, { srgb = false } = {}) {
  const tex = _loader.load(url);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeCanvasTexture(draw, { srgb = true } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  draw(ctx, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeFlatNormalTexture(base = 160) {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = `rgb(${base}, ${base}, ${base})`;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i += 1) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 5 + 1;
      const alpha = 0.04 + Math.random() * 0.12;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { srgb: false });
}

function makeRoughnessTexture(grayscale = 170) {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = `rgb(${grayscale}, ${grayscale}, ${grayscale})`;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i += 1) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() * 8 + 2;
      ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + Math.random() * 0.16})`;
      ctx.fillRect(x, y, size, size);
    }
  }, { srgb: false });
}

function makeFrostedGlassSet() {
  return {
    color: makeCanvasTexture((ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#eaf4ff");
      grad.addColorStop(0.5, "#dfeaf6");
      grad.addColorStop(1, "#cdd7e8");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      for (let x = 0; x <= w; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(110,160,220,0.18)";
      for (let i = 0; i < 130; i += 1) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * w, Math.random() * h);
        ctx.lineTo(Math.random() * w, Math.random() * h);
        ctx.stroke();
      }
    }),
    normal: makeFlatNormalTexture(180),
    roughness: makeRoughnessTexture(180),
  };
}

function makeBlackMirrorSet() {
  return {
    color: makeCanvasTexture((ctx, w, h) => {
      const base = ctx.createLinearGradient(0, 0, w, h);
      base.addColorStop(0, "#1b2028");
      base.addColorStop(0.45, "#090d12");
      base.addColorStop(1, "#05080c");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      const glow = ctx.createRadialGradient(w * 0.35, h * 0.25, 10, w * 0.35, h * 0.25, w * 0.7);
      glow.addColorStop(0, "rgba(255,255,255,0.18)");
      glow.addColorStop(0.3, "rgba(188,210,255,0.12)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i += 1) {
        ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.08})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
    }),
    normal: makeFlatNormalTexture(130),
    roughness: makeRoughnessTexture(90),
  };
}

function makeMarbleSet() {
  return {
    color: makeCanvasTexture((ctx, w, h) => {
      ctx.fillStyle = "#f7f4f1";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(150,150,150,0.55)";
      ctx.lineWidth = 4;
      for (let i = 0; i < 26; i += 1) {
        const offset = i * 26;
        ctx.beginPath();
        ctx.moveTo(-30 + offset * 0.35, h * (0.12 + (i % 6) * 0.08));
        for (let x = 0; x <= w + 80; x += 32) {
          const y = h * 0.18 + Math.sin((x + offset) * 0.08) * (16 + (i % 3) * 18);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }),
    normal: makeFlatNormalTexture(210),
    roughness: makeRoughnessTexture(200),
  };
}

function makeSnowSet() {
  return {
    color: makeCanvasTexture((ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#f9fcff");
      grad.addColorStop(1, "#ebf3fb");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 3800; i += 1) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const radius = Math.random() * 3 + 1;
        ctx.fillStyle = `rgba(110, 150, 210, ${0.08 + Math.random() * 0.18})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }),
    normal: makeFlatNormalTexture(220),
    roughness: makeRoughnessTexture(220),
  };
}

function makeRangoliSet() {
  return {
    color: makeCanvasTexture((ctx, w, h) => {
      ctx.fillStyle = "#18130d";
      ctx.fillRect(0, 0, w, h);
      const palette = ["#ffb703", "#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#9b5de5", "#ff7b00", "#f94144"];
      const step = 96;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const color = palette[(x / step + y / step) % palette.length];
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(x + step / 2, y + 8);
          ctx.lineTo(x + step - 8, y + step / 2);
          ctx.lineTo(x + step / 2, y + step - 8);
          ctx.lineTo(x + 8, y + step / 2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          ctx.fillRect(x + 18, y + 18, step - 36, step - 36);
        }
      }
      for (let i = 0; i < 14; i += 1) {
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 40, 0, Math.PI * 2);
        ctx.stroke();
      }
    }),
    normal: makeFlatNormalTexture(110),
    roughness: makeRoughnessTexture(120),
  };
}

function makeNeonGridSet() {
  return {
    color: makeCanvasTexture((ctx, w, h) => {
      ctx.fillStyle = "#090d1a";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(67, 197, 255, 0.9)";
      ctx.lineWidth = 3;
      for (let x = 0; x <= w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255, 82, 196, 0.8)";
      ctx.lineWidth = 2;
      for (let x = 16; x < w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 18, h);
        ctx.stroke();
      }
      for (let y = 16; y < h; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + 18);
        ctx.stroke();
      }
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.5, 30, w * 0.5, h * 0.5, w * 0.7);
      glow.addColorStop(0, "rgba(67,197,255,0.12)");
      glow.addColorStop(0.5, "rgba(255,82,196,0.08)");
      glow.addColorStop(1, "rgba(9,13,26,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    }),
    normal: makeFlatNormalTexture(110),
    roughness: makeRoughnessTexture(90),
  };
}

function proceduralGroundSet(id) {
  const map = {
    frostedglass: makeFrostedGlassSet,
    blackmirror: makeBlackMirrorSet,
    marble: makeMarbleSet,
    snow: makeSnowSet,
    rangoli: makeRangoliSet,
    neongrid: makeNeonGridSet,
  };
  const builder = map[id];
  if (!builder) return null;
  const set = builder();
  return set;
}

/** { color, normal, roughness } textures for a textured or procedural ground surface, or null for "soil". */
export function groundTextureSet(id) {
  const def = GROUND_SURFACES[id];
  if (!def || !(def.textured || def.procedural)) return null;
  if (_cache.has(id)) return _cache.get(id);
  let set;
  if (def.textured) {
    const base = textureBase(id);
    set = {
      color: load(`${base}color.jpg`, { srgb: true }),
      normal: load(`${base}normal.jpg`),
      roughness: load(`${base}roughness.jpg`),
    };
  } else {
    set = proceduralGroundSet(id);
  }
  if (!set) return null;
  _cache.set(id, set);
  return set;
}

// Sets the repeat on an already-loaded texture set for a ground disc of the
// given radius, so the tiling matches the surface's real-world tile size
// (groundSurfaces.js tileMeters) however large the stage's ground is.
export function setGroundRepeat(set, id, radiusMeters) {
  const def = GROUND_SURFACES[id];
  if (!set || !def || !def.tileMeters) return;
  const tiles = Math.max(1, Math.round((radiusMeters * 2) / def.tileMeters));
  for (const tex of Object.values(set)) tex.repeat.set(tiles, tiles);
}

export function clearGroundTextureCache() {
  for (const set of _cache.values()) {
    for (const tex of Object.values(set)) tex.dispose();
  }
  _cache.clear();
}
