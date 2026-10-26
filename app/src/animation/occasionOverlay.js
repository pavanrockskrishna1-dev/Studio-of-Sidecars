/* The occasion pack, baked into exported video frames.
   The live studio shows the occasion as DOM layers (OccasionBackground,
   OccasionParticles, LowerThird) that never reach the WebGL canvas, so the MP4
   exporter composites this instead: grade, atmosphere, particles and the
   caption, drawn on a 2D canvas over each rendered frame. Everything is a pure
   function of the frame time t, so a frame renders the same on every export. */

import { getOccasion } from "./occasionDefs";
import { GRADES } from "../fx/gradeShader";

const TAU = Math.PI * 2;

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const wrap = (v, lo, hi) => lo + ((((v - lo) % (hi - lo)) + (hi - lo)) % (hi - lo));
const smooth = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

// Tint and vignette of the occasion's grade, as 2D compositing.
function drawGrade(ctx, W, H, gradeId, withVignette = true) {
  const g = GRADES[gradeId];
  if (!g || gradeId === "raw") return;
  const m = Math.max(...g.tint);
  const [r, gg, b] = g.tint.map((c) => Math.round((255 * c) / m));
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = `rgb(${r},${gg},${b})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  if (withVignette) vignette(ctx, W, H, g.vignette * 0.7);
}

function vignette(ctx, W, H, amount, color = "0,0,0") {
  const v = ctx.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.hypot(W, H) * 0.58);
  v.addColorStop(0, `rgba(${color},0)`);
  v.addColorStop(1, `rgba(${color},${amount})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/* ---- Halloween: moonlit mist, falling leaves, bats, caption ---- */

function makeHalloween(W, H) {
  const rnd = seeded(31);
  const leaves = Array.from({ length: 18 }, () => ({
    x0: rnd() * W,
    y0: rnd() * H,
    vy: 40 + rnd() * 70,
    vx: -18 + rnd() * 26,
    sway: 20 + rnd() * 45,
    swayF: 0.6 + rnd() * 1.2,
    spin: (rnd() - 0.5) * 4,
    size: 7 + rnd() * 9,
    hue: 18 + rnd() * 22,
    light: 34 + rnd() * 22,
    ph: rnd() * TAU,
    near: rnd() < 0.1,
  }));
  const bats = Array.from({ length: 5 }, (_, i) => ({
    y0: H * (0.06 + rnd() * 0.36),
    speed: (90 + rnd() * 140) * (i % 2 ? -1 : 1),
    x0: rnd() * (W + 400) - 200,
    bob: 10 + rnd() * 25,
    bobF: 0.8 + rnd() * 1.5,
    size: 18 + rnd() * 26,
    flap: 7 + rnd() * 5,
    ph: rnd() * TAU,
  }));
  return { leaves, bats };
}

function drawLeaf(ctx, l, x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(rot * 1.7)));
  ctx.fillStyle = `hsl(${l.hue}, 85%, ${l.light}%)`;
  const s = l.size;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 0.8, -s * 0.3, s * 0.15, s * 0.9);
  ctx.lineTo(0, s * 1.15);
  ctx.lineTo(-s * 0.15, s * 0.9);
  ctx.quadraticCurveTo(-s * 0.8, -s * 0.3, 0, -s);
  ctx.fill();
  ctx.restore();
}

function drawBat(ctx, x, y, size, flip, wingPhase) {
  const wing = Math.sin(wingPhase) * size * 0.7;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = "#07050d";
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.22, size * 0.16, 0, 0, TAU);
  ctx.fill();
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(d * size * 0.05, -size * 0.05);
    ctx.quadraticCurveTo(d * size * 0.7, -wing * 0.9, d * size * 1.1, 0);
    ctx.quadraticCurveTo(d * size * 0.5, wing * 0.35, d * size * 0.05, size * 0.1);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(d * size * 0.1, -size * 0.14);
    ctx.lineTo(d * size * 0.2, -size * 0.34);
    ctx.lineTo(0, -size * 0.18);
    ctx.fill();
  }
  ctx.restore();
}

function drawHalloween(ctx, W, H, st, t, dur, caption) {
  // night sky falling into the scene from the top
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.42);
  sky.addColorStop(0, "rgba(6,10,32,0.6)");
  sky.addColorStop(0.55, "rgba(10,18,52,0.2)");
  sky.addColorStop(1, "rgba(10,18,52,0)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.42);

  // full moon with a cold halo
  const mx = W * 0.76;
  const my = H * 0.1;
  const halo = ctx.createRadialGradient(mx, my, 20, mx, my, W * 0.42);
  halo.addColorStop(0, "rgba(190,210,255,0.3)");
  halo.addColorStop(0.18, "rgba(120,150,230,0.08)");
  halo.addColorStop(1, "rgba(60,80,170,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H * 0.5);
  ctx.fillStyle = "#f3eccd";
  ctx.beginPath();
  ctx.arc(mx, my, 62, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(170,160,130,0.35)";
  for (const [dx, dy, r] of [[-18, -12, 13], [16, 10, 9], [-6, 22, 7], [22, -20, 6]]) {
    ctx.beginPath();
    ctx.arc(mx + dx, my + dy, r, 0, TAU);
    ctx.fill();
  }

  // (no full-frame mist here: a screen-blended haze lifts every black and flattens
  // the picture; the scene's own 3D fog gives the depth)

  // bats across the sky
  for (const b of st.bats) {
    const x = wrap(b.x0 + b.speed * t, -200, W + 200);
    const y = b.y0 + Math.sin(t * b.bobF + b.ph) * b.bob;
    drawBat(ctx, x, y, b.size, b.speed < 0, b.ph + t * b.flap);
  }

  // falling autumn leaves (a few large ones close to the lens)
  for (const l of st.leaves) {
    const y = wrap(l.y0 + l.vy * t, -40, H + 40);
    const x = wrap(l.x0 + l.vx * t + Math.sin(t * l.swayF + l.ph) * l.sway, -40, W + 40);
    if (l.near) {
      ctx.save();
      ctx.filter = "blur(3px)";
      drawLeaf(ctx, { ...l, size: l.size * 2.2 }, x, y, l.ph + t * l.spin);
      ctx.restore();
    } else {
      drawLeaf(ctx, l, x, y, l.ph + t * l.spin);
    }
  }

  vignette(ctx, W, H, 0.25, "2,3,14");

  if (caption && caption.title) drawCaption(ctx, W, H, caption, t, dur);
}

// Lower third: slides in for the closing seconds (the whole reel when it is
// short), holds, fades before the end.
function drawCaption(ctx, W, H, caption, t, dur) {
  const start = dur > 12 ? dur - 7 : 1.2;
  const inA = smooth(start, start + 0.8, t);
  const outA = 1 - smooth(dur - 1.2, dur - 0.4, t);
  const a = inA * outA;
  if (a <= 0) return;
  const x = W * 0.08;
  const y = H * 0.775;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate((1 - inA) * -60, 0);
  const bar = ctx.createLinearGradient(x, 0, x + W * 0.7, 0);
  bar.addColorStop(0, "rgba(8,6,18,0.82)");
  bar.addColorStop(1, "rgba(8,6,18,0)");
  ctx.fillStyle = bar;
  ctx.fillRect(x - 24, y - 70, W * 0.78, 150);
  ctx.fillStyle = "#ff7a1a";
  ctx.fillRect(x - 24, y - 70, 8, 150);
  ctx.shadowColor = "rgba(255,110,20,0.65)";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#ffb347";
  ctx.font = "700 66px Oswald, 'Arial Narrow', sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(caption.title, x, y + 4);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(235,228,255,0.92)";
  ctx.font = "500 36px Oswald, 'Arial Narrow', sans-serif";
  ctx.fillText(caption.subtitle || "", x, y + 56);
  ctx.restore();
}

// An overlay for the occasion, or null when there is none ("none" or unknown).
// draw(ctx, t, dur) paints over a frame already drawn on ctx (W x H).
export function makeOccasionOverlay(occasionId, W, H, caption) {
  if (!occasionId || occasionId === "none") return null;
  const occ = getOccasion(occasionId);
  if (!occ || occ.id === "none") return null;
  const halloween = occasionId === "halloween" ? makeHalloween(W, H) : null;
  return {
    async prepare() {
      if (document.fonts && document.fonts.load) {
        await Promise.all([document.fonts.load("700 66px Oswald"), document.fonts.load("500 36px Oswald")]).catch(() => {});
      }
    },
    draw(ctx, t, dur) {
      // Halloween frames are graded by the export look (fx/exportLook.js); a second
      // multiply grade on top only darkens them
      if (!halloween) drawGrade(ctx, W, H, occ.grade);
      if (halloween) drawHalloween(ctx, W, H, halloween, t, dur, caption);
      else if (caption && caption.title) drawCaption(ctx, W, H, caption, t, dur);
    },
  };
}
