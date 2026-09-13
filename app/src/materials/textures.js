/* Mission 11A (Agent #2) — procedural material textures.
   ---------------------------------------------------------------------------
   Two hard rules from the mission drive this module:

   · "No texture duplication" — every texture is built ONCE and cached by name.
     Applying Walnut to five parts of a model assigns the same THREE.Texture
     instance five times, so texture memory stays flat no matter how many
     presets a user applies. Nothing here is ever disposed by the editor: the
     cache is module-scoped and shared by every product in the session.
   · "No network" — patterns are generated on a canvas at module demand, so the
     editor works offline and adds no payload to the repo.

   Patterns are painted in grayscale on purpose: a standard material's `color`
   multiplies its `map`, so the grain keeps its contrast while the preset's
   colour supplies the hue (Walnut, Oak and Mahogany therefore share ONE wood
   texture and differ only in colour + roughness). */

import * as THREE from "three";

const SIZE = 256;
const cache = new Map();

function canvas() {
  const c = document.createElement("canvas");
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#cfcfcf";
  ctx.fillRect(0, 0, SIZE, SIZE);
  return { c, ctx };
}

function finish(c, { repeat = [1, 1] } = {}) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/* Long, slightly wandering grain lines — reads as timber on a countertop or
   a fairing trim once multiplied by the preset colour. */
function drawWood(ctx) {
  for (let i = 0; i < 46; i += 1) {
    const y = (i / 46) * SIZE + Math.sin(i * 1.7) * 3;
    const w = 0.6 + (i % 4) * 0.7;
    ctx.strokeStyle = `rgba(${90 + (i % 5) * 16},${80 + (i % 5) * 14},${70 + (i % 5) * 12},${0.16 + (i % 3) * 0.09})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= SIZE; x += 16) {
      ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 4.2 + Math.sin(x * 0.005 + i * 0.4) * 7);
    }
    ctx.stroke();
  }
  // a couple of knots so the tiling is less obvious at large scale
  for (let k = 0; k < 3; k += 1) {
    const cx = 40 + k * 88;
    const cy = 60 + ((k * 97) % 140);
    for (let r = 2; r < 20; r += 3) {
      ctx.strokeStyle = `rgba(96,80,66,${0.16 - r * 0.006})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.7, r * 0.75, 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/* Pebbled hide: small irregular cells, softly lit. */
function drawLeather(ctx) {
  for (let i = 0; i < 900; i += 1) {
    const x = (i * 71) % SIZE;
    const y = (i * 133) % SIZE;
    const r = 2 + (i % 5);
    const light = 150 + ((i * 7) % 70);
    ctx.fillStyle = `rgba(${light},${light},${light},0.5)`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.72, (i % 7) * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(60,60,60,0.4)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 60; i += 1) {
    const x = (i * 97) % SIZE;
    const y = (i * 61) % SIZE;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6 + (i % 9), y + 4 + (i % 7));
    ctx.stroke();
  }
}

/* 2×2 twill: the classic carbon look, drawn as a checker of highlight tiles. */
function drawCarbon(ctx) {
  const cell = SIZE / 16;
  for (let gy = 0; gy < 16; gy += 1) {
    for (let gx = 0; gx < 16; gx += 1) {
      const horiz = ((gx >> 1) + (gy >> 1)) % 2 === 0;
      const t = (gx % 2) + (gy % 2);
      const base = horiz ? 205 : 150;
      const g = ctx.createLinearGradient(
        gx * cell,
        gy * cell,
        horiz ? gx * cell + cell : gx * cell,
        horiz ? gy * cell : gy * cell + cell
      );
      g.addColorStop(0, `rgba(${base - 40},${base - 40},${base - 36},1)`);
      g.addColorStop(0.5, `rgba(${base + 34 + t * 6},${base + 34 + t * 6},${base + 30},1)`);
      g.addColorStop(1, `rgba(${base - 55},${base - 55},${base - 50},1)`);
      ctx.fillStyle = g;
      ctx.fillRect(gx * cell, gy * cell, cell, cell);
    }
  }
}

/* Fine horizontal streaks — brushed aluminium / satin metal. */
function drawBrushed(ctx) {
  for (let y = 0; y < SIZE; y += 1) {
    const v = 150 + Math.sin(y * 0.9) * 22 + ((y * 37) % 11) * 3.4;
    ctx.strokeStyle = `rgba(${v},${v},${v},0.55)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(SIZE, y + 0.5);
    ctx.stroke();
  }
}

const DRAW = {
  wood: { fn: drawWood, repeat: [2, 1] },
  leather: { fn: drawLeather, repeat: [3, 3] },
  carbon: { fn: drawCarbon, repeat: [4, 4] },
  brushed: { fn: drawBrushed, repeat: [2, 2] },
};

/**
 * The one shared texture instance for a pattern name, or null when the preset
 * needs no map (paints, glass, rubber). Never returns a copy.
 */
export function materialTexture(name) {
  if (!name || !DRAW[name]) return null;
  if (cache.has(name)) return cache.get(name);
  const { c, ctx } = canvas();
  DRAW[name].fn(ctx);
  const tex = finish(c, { repeat: DRAW[name].repeat });
  cache.set(name, tex);
  return tex;
}

/** Number of textures this module has ever created — a gate asserts it stops
    growing no matter how many presets are applied. */
export const textureCacheSize = () => cache.size;
export const textureCacheNames = () => [...cache.keys()].sort();
