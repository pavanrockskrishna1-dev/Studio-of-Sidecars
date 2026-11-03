import { useCallback, useEffect, useRef, useState } from "react";
import { getCanvas } from "../animation/animationStore";

/* ── shared helpers ─────────────────────────────────────────── */

function loadImages(urls) {
  const flat = Array.isArray(urls) ? urls : [urls];
  return Promise.all(flat.map(src => new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  })));
}

function drawFitImg(ctx, img, cx, cy, fitW, fitH) {
  if (!img) return;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const ar = iw / ih;
  let dw = fitW, dh = fitW / ar;
  if (dh > fitH) { dh = fitH; dw = fitH * ar; }
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
}

function glowText(ctx, text, x, y, font, fill, glow, blur = 20) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = glow;
  ctx.shadowBlur = blur;
  ctx.fillStyle = glow;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawPill(ctx, cx, cy, w, h, r, fill, stroke, strokeW = 0) {
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (strokeW) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    ctx.stroke();
  }
}

function speedLines(ctx, cx, cy, count, minLen, maxLen, color, alpha) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const len = minLen + (maxLen - minLen) * ((i % 5) / 5);
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * (minLen * 0.3), cy + Math.sin(angle) * (minLen * 0.3));
    ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    ctx.stroke();
  }
  ctx.restore();
}

/* ── sticker asset URLs ─────────────────────────────────────── */

const STICKER_URLS = {
  torn: Array.from({ length: 13 }, (_, i) => `/stickers/torn/PNG-${String(i + 1).padStart(2, "0")}.png`),
  sauces: Array.from({ length: 8 }, (_, i) => `/stickers/bbq/sauce-${i + 1}.png`),
  sauceBtls: Array.from({ length: 8 }, (_, i) => `/stickers/bbq/sauce-${i + 9}.png`),
  campfire: "/stickers/camping/camp-21.png",
  cookingPot: "/stickers/camping/camp-29.png",
  marshmallow: "/stickers/camping/camp-25.png",
  mug: "/stickers/camping/camp-19.png",
};

/* ── templates ─────────────────────────────────────────────── */

const TEMPLATES = [
  { id: "torn-reveal", label: "TORN PAPER" },
  { id: "sauce-drip", label: "SAUCE DRIP" },
  { id: "campfire", label: "CAMPFIRE" },
  { id: "neon-speed", label: "NEON SPEED" },
  { id: "cinematic", label: "CINEMATIC" },
  { id: "story-ad", label: "STORY AD" },
  { id: "violet-glass", label: "VIOLET GLASS" },
  { id: "ember-night", label: "EMBER NIGHT" },
  { id: "haunted-story", label: "HAUNTED STORY" },
  { id: "neon-midnight", label: "NEON MIDNIGHT" },
];

const DEFAULT_OPTS = {
  "torn-reveal":  { headline: "RIDERS ONLY",      sub: "Every Sunday, 6 AM",      price: "₹99" },
  "sauce-drip":   { headline: "THE BBQ BEAST",    sub: "Fresh Sauces Daily",      price: "₹99" },
  "campfire":     { headline: "CAMPFIRE RIDE",    sub: "Join the Tribe",          price: "₹99" },
  "neon-speed":   { headline: "FULL THROTTLE",    sub: "Speed Meets Flavor",      price: "₹99" },
  "cinematic":    { headline: "THE RIDE",         sub: "Cinematic BBQ Journey",   price: "₹99" },
  "story-ad":     { headline: "SWIPE UP",         sub: "Limited Spots Available", price: "₹99" },
  "violet-glass":  { headline: "RIDE NIGHT",       sub: "Every Friday 7PM",        price: "₹99" },
  "ember-night":   { headline: "FULL THROTTLE",    sub: "Served Hot Every Night",  price: "₹149" },
  "haunted-story": { headline: "THE DARK RIDE",    sub: "Pumpkin Spiced BBQ",      price: "₹199" },
  "neon-midnight": { headline: "NIGHT MARKET",     sub: "Open Midnight–4AM",        price: "₹99" },
};

const SIZES = { "1:1": { w: 1080, h: 1080 }, "9:16": { w: 1080, h: 1920 } };

/* ── scene snapshot ────────────────────────────────────────── */

function drawScene(ctx, sceneImg, cx, cy, fitW, fitH) {
  if (!sceneImg) {
    ctx.fillStyle = "#2a1800";
    ctx.fillRect(0, 0, cx * 2, cy * 2);
    ctx.strokeStyle = `rgba(224,90,26,0.4)`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(4, 4, cx * 2 - 8, cy * 2 - 8);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "400 16px Oswald,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Open SCENE to load bike", cx, cy);
    return;
  }
  drawFitImg(ctx, sceneImg, cx, cy, fitW, fitH);
}

/* ── template draw functions ───────────────────────────────── */

function drawTornReveal(ctx, W, H, t, cache, sceneImg, opts) {
  // L0 BG
  const bg = ctx.createLinearGradient(0, H * 0.35, 0, H * 0.65);
  bg.addColorStop(0, "rgba(26,8,0,0.95)");
  bg.addColorStop(0.5, "rgba(224,90,26,0.1)");
  bg.addColorStop(1, "rgba(26,8,0,0.95)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // L1 Bike
  ctx.save();
  ctx.globalAlpha = Math.min(1, t * 1.5);
  drawScene(ctx, sceneImg, W / 2, H * 0.52, 900, 750);
  ctx.restore();

  // L2 Torn papers
  const slideIn = Math.min(1, t / 0.7);
  const ease = slideIn * slideIn;

  const tornArr = cache.torn || [];
  const torn0 = tornArr[0];
  const torn1 = tornArr[1];
  const torn3 = tornArr[3];

  // Paper A — top left
  if (torn0) {
  ctx.save();
  ctx.translate(-60 + (1 - ease) * 80, -40);
  ctx.rotate(Math.sin(t * 0.8 + 0) * 0.026);
  ctx.drawImage(torn0, 0, 0, torn0.naturalWidth, torn0.naturalHeight,
    0, 0, 420, torn0.naturalHeight * 420 / torn0.naturalWidth);
  ctx.restore();
  }

  ctx.save();
  ctx.translate(-60 + (1 - ease) * 80 + 210, 170);
  ctx.fillStyle = opts.accent;
  ctx.font = "700 18px 'Saira Stencil One',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BBQ RIDE", 0, 0);
  ctx.fillStyle = "#fff";
  ctx.font = "700 36px Oswald,sans-serif";
  ctx.fillText(opts.headline, 0, 28);
  ctx.restore();

  // Paper B — bottom right
  if (torn1) {
  ctx.save();
  ctx.translate(W - 320 + ease * 80, H - 280);
  ctx.rotate(-Math.PI / 4 + Math.sin(t * 0.6) * 0.03);
  ctx.drawImage(torn1, 0, 0, torn1.naturalWidth, torn1.naturalHeight,
    0, 0, 380, torn1.naturalHeight * 380 / torn1.naturalWidth);
  ctx.restore();
  }

  ctx.save();
  ctx.translate(W - 320 + ease * 80 + 190, H - 280 + 120);
  ctx.rotate(Math.PI);
  ctx.fillStyle = opts.accent;
  ctx.font = "700 52px Oswald,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.price, 0, 0);
  ctx.fillStyle = "#fff";
  ctx.font = "400 16px Oswald,sans-serif";
  ctx.fillText("ONLY", 0, -40);
  ctx.restore();

  // Paper C — center bottom
  if (torn3) {
  ctx.save();
  ctx.translate(W / 2 + Math.sin(t * 0.4) * 8, H - 60);
  ctx.drawImage(torn3, 0, 0, torn3.naturalWidth, torn3.naturalHeight,
    0, 0, 200, torn3.naturalHeight * 200 / torn3.naturalWidth);
  ctx.restore();
  }

  ctx.save();
  ctx.translate(W / 2 + Math.sin(t * 0.4) * 8, H - 60 + 100);
  ctx.fillStyle = "#fff";
  ctx.font = "400 18px Oswald,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.sub, 0, 0);
  ctx.restore();

  // L3 Decor
  ctx.save();
  ctx.strokeStyle = opts.accent;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.3;
  ctx.beginPath(); ctx.moveTo(W - 40, 40); ctx.lineTo(W - 140, 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - 100, 40); ctx.lineTo(W - 100, 140); ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "400 14px Oswald,sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("@ bbqrideindia", 32, H - 28);
}

function drawSauceDrip(ctx, W, H, t, cache, sceneImg, opts) {
  // L0 BG
  ctx.fillStyle = "#0f0f0f";
  ctx.fillRect(0, 0, W, H);

  const dotG = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  dotG.addColorStop(0, "rgba(224,90,26,0.04)");
  dotG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = dotG;
  ctx.fillRect(0, 0, W, H);

  // Halftone dot grid
  for (let y = 0; y < H; y += 20) {
    for (let x = 0; x < W; x += 20) {
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(x + 10, y + 10, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // L1 Sauce Squirts (4 border pieces, stagger drip in)
  const sauceArr = cache.sauces || [];
  const sauceBtlArr = cache.sauceBtls || [];
  const squirts = [
    { img: sauceArr[0],  x: -20,        y: H * 0.25,   h: 300, rot: Math.PI / 2 },
    { img: sauceArr[4],  x: W - 60,     y: H * 0.35,   h: 260, rot: -Math.PI / 2 },
    { img: sauceArr[2],  x: W * 0.75,   y: -20,        h: 220, rot: Math.PI },
    { img: sauceArr[6],  x: 60,         y: H - 20,     h: 240, rot: 0 },
  ];

  squirts.forEach(({ img, x, y, h, rot }, i) => {
    if (!img) return;
    const start = i * 0.15;
    if (t < start) return;
    const yOff = Math.max(0, (0.5 - t) * 200) * Math.max(0, Math.min(1, (t - start) / 0.3));
    ctx.save();
    ctx.translate(x + img.naturalWidth / 2, y + h / 2 + yOff);
    ctx.rotate(rot);
    const ar = img.naturalWidth / img.naturalHeight;
    const dw = h * ar;
    ctx.drawImage(img, -dw / 2, -h / 2, dw, h);
    ctx.restore();
  });

  // L2 Sauce Bottles (3 corners)
  const bottles = [
    { img: sauceBtlArr[0], x: 40,   y: H - 100, h: 80,  rot: 0 },
    { img: sauceBtlArr[4], x: W - 80, y: H - 90,  h: 75,  rot: 0 },
    { img: sauceBtlArr[2], x: W - 60, y: 90,    h: 70,  rot: -15 * Math.PI / 180 },
  ];

  bottles.forEach(({ img, x, y, h, rot }) => {
    if (!img) return;
    const ar = img.naturalWidth / img.naturalHeight;
    const dw = h * ar;
    const bounce = Math.sin(t * 2) * 4;
    ctx.save();
    ctx.translate(x + dw / 2, y + h / 2 + bounce);
    ctx.rotate(rot);
    ctx.drawImage(img, -dw / 2, -h / 2, dw, h);
    ctx.restore();
  });

  // L3 Bike
  ctx.save();
  ctx.fillStyle = `rgba(224,90,26,0.08)`;
  ctx.fillRect(0, 0, W, H);
  drawScene(ctx, sceneImg, W / 2, H * 0.48, 820, 680);
  ctx.restore();

  // L4 Typography
  ctx.fillStyle = "#fff";
  ctx.font = "700 22px 'Saira Stencil One',sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BBQ RIDE INDIA", W / 2, 50);

  ctx.fillStyle = "#fff";
  ctx.font = "700 54px Oswald,sans-serif";
  ctx.fillText(opts.headline, W / 2, H * 0.85);

  const pillSlide = Math.min(1, (t - 0.8) / 0.4);
  const pillY = H * 0.93 + Math.max(0, (0.8 - t) * 100);
  ctx.save();
  ctx.translate(W / 2, pillY);
  ctx.scale(pillSlide, pillSlide);
  drawPill(ctx, 0, 0, 220, 54, 27, opts.accent, "#000", 2);
  ctx.fillStyle = "#fff";
  ctx.font = "700 36px Oswald,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.price, 0, 0);
  ctx.restore();
}

function drawCampfire(ctx, W, H, t, cache, sceneImg, opts) {
  // L0 BG — radial gradient
  const bg = ctx.createRadialGradient(W / 2, H * 0.6, 0, W / 2, H * 0.6, 600);
  bg.addColorStop(0, "rgba(26,10,0,1)");
  bg.addColorStop(1, "rgba(5,5,5,1)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft glow bottom radial
  const glowG = ctx.createRadialGradient(W / 2, H * 0.78, 0, W / 2, H * 0.78, 350);
  glowG.addColorStop(0, "rgba(224,90,26,0.15)");
  glowG.addColorStop(1, "rgba(224,90,26,0)");
  ctx.fillStyle = glowG;
  ctx.fillRect(0, 0, W, H);

  // L1 Campfire
  const fireScale = 1 + Math.sin(t * 6) * 0.04;
  const fireAlpha = 0.9 + Math.sin(t * 5) * 0.1;
  ctx.save();
  ctx.translate(W / 2, H * 0.78);
  ctx.scale(fireScale, fireScale);
  ctx.globalAlpha = fireAlpha;
  const fireImg = cache.campfire;
  if (fireImg) {
    const ar = fireImg.naturalWidth / fireImg.naturalHeight;
    const dw = 280 * ar;
    ctx.drawImage(fireImg, -dw / 2, -140, dw, 280);
  }
  ctx.restore();

  // L2 Cooking Pot
  const potImg = cache.cookingPot;
  if (potImg) {
    const potAr = potImg.naturalWidth / potImg.naturalHeight;
    const potDw = 180 * potAr;
    const sway = Math.sin(t * 0.7) * 0.04;
    ctx.save();
    ctx.translate(W * 0.72, H * 0.70);
    ctx.rotate(sway);
    ctx.drawImage(potImg, -potDw / 2, -90, potDw, 180);
    ctx.restore();

    // Steam
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    for (let i = 0; i < 3; i++) {
      const sy = H * 0.70 - 90 - ((t * 15 + i * 20) % 60);
      const sx = W * 0.72 + Math.sin(t + i) * 4;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 14 + i * 2, 22 + i * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // L3 Bike
  drawScene(ctx, sceneImg, W / 2, H * 0.44, 820, 660);

  // L4 Marshmallows
  const mallowImg = cache.marshmallow;
  if (mallowImg) {
    const mAr = mallowImg.naturalWidth / mallowImg.naturalHeight;
    const mDw = 140 * mAr;
    const wobble = Math.sin(t * 2) * 0.05;
    ctx.save();
    ctx.translate(W * 0.22, H * 0.72);
    ctx.rotate(30 * Math.PI / 180 + wobble);
    ctx.drawImage(mallowImg, -mDw / 2, -70, mDw, 140);
    ctx.restore();
  }

  // L5 Mug + Steam
  const mugImg = cache.mug;
  if (mugImg) {
    const mugAr = mugImg.naturalWidth / mugImg.naturalHeight;
    const mugDw = 100 * mugAr;
    const bobble = Math.sin(t * 1.5 + 2) * 3;
    ctx.save();
    ctx.translate(W * 0.78, H * 0.76 + bobble);
    ctx.drawImage(mugImg, -mugDw / 2, -50, mugDw, 100);
    ctx.restore();

    // Mug steam circles
    for (let i = 0; i < 3; i++) {
      const steamY = H * 0.76 - 50 - ((t * 20 + i * 15) % 40);
      const steamX = W * 0.78 + Math.cos(t + i) * 6;
      const alpha = 0.2 * (1 - ((t * 20 + i * 15) % 40) / 40);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(steamX, steamY, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // L7 Typography
  ctx.fillStyle = opts.accent;
  ctx.font = "700 18px 'Saira Stencil One',sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("BBQ RIDE", 32, 36);

  glowText(ctx, opts.headline, W / 2, 80, "700 58px Oswald,sans-serif", "#fff", opts.accent);

  ctx.fillStyle = opts.accent;
  ctx.font = "400 22px Oswald,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(opts.sub, W / 2, H * 0.9);

  drawPill(ctx, W / 2, H * 0.95, 260, 64, 32, opts.accent, "#000", 2);
  ctx.fillStyle = "#fff";
  ctx.font = "700 38px Oswald,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.price, W / 2, H * 0.95);
}

function drawNeonSpeed(ctx, W, H, t, cache, sceneImg, opts) {
  // BG
  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.75);
  bg.addColorStop(0, "#0a0a0a");
  bg.addColorStop(1, "#1a1a1a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Speed lines (rotating)
  ctx.save();
  ctx.translate(W / 2, H * 0.52);
  ctx.rotate(t * 0.12);
  speedLines(ctx, 0, 0, 36, 180, 480, opts.accent, 0.4);
  ctx.restore();

  // Bike
  drawScene(ctx, sceneImg, W / 2, H * 0.52, 820, 680);

  // Neon frame — 4 corner L-brackets
  const frameIn = Math.min(1, t / 0.4);
  const bracketLen = 30 * frameIn;
  const bracketW = 4;
  const strokeGlow = 14 * frameIn;

  ctx.save();
  ctx.lineCap = "round";

  // Top-left
  ctx.strokeStyle = opts.accent;
  ctx.lineWidth = bracketW;
  ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(40 + bracketLen, 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(40, 40 + bracketLen); ctx.stroke();
  // Glow passes
  for (const gw of [strokeGlow * 0.8, strokeGlow * 0.5, strokeGlow * 0.2]) {
    ctx.lineWidth = gw;
    ctx.strokeStyle = `rgba(224,90,26,${0.12})`;
    ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(40 + bracketLen, 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(40, 40 + bracketLen); ctx.stroke();
  }

  // Top-right
  ctx.beginPath(); ctx.moveTo(W - 40, 40); ctx.lineTo(W - 40 - bracketLen, 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - 40, 40); ctx.lineTo(W - 40, 40 + bracketLen); ctx.stroke();
  for (const gw of [strokeGlow * 0.8, strokeGlow * 0.5, strokeGlow * 0.2]) {
    ctx.lineWidth = gw;
    ctx.strokeStyle = `rgba(224,90,26,${0.12})`;
    ctx.beginPath(); ctx.moveTo(W - 40, 40); ctx.lineTo(W - 40 - bracketLen, 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - 40, 40); ctx.lineTo(W - 40, 40 + bracketLen); ctx.stroke();
  }

  // Bottom-left
  ctx.beginPath(); ctx.moveTo(40, H - 40); ctx.lineTo(40 + bracketLen, H - 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(40, H - 40); ctx.lineTo(40, H - 40 - bracketLen); ctx.stroke();
  for (const gw of [strokeGlow * 0.8, strokeGlow * 0.5, strokeGlow * 0.2]) {
    ctx.lineWidth = gw;
    ctx.strokeStyle = `rgba(224,90,26,${0.12})`;
    ctx.beginPath(); ctx.moveTo(40, H - 40); ctx.lineTo(40 + bracketLen, H - 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(40, H - 40); ctx.lineTo(40, H - 40 - bracketLen); ctx.stroke();
  }

  // Bottom-right
  ctx.beginPath(); ctx.moveTo(W - 40, H - 40); ctx.lineTo(W - 40 - bracketLen, H - 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - 40, H - 40); ctx.lineTo(W - 40, H - 40 - bracketLen); ctx.stroke();
  for (const gw of [strokeGlow * 0.8, strokeGlow * 0.5, strokeGlow * 0.2]) {
    ctx.lineWidth = gw;
    ctx.strokeStyle = `rgba(224,90,26,${0.12})`;
    ctx.beginPath(); ctx.moveTo(W - 40, H - 40); ctx.lineTo(W - 40 - bracketLen, H - 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - 40, H - 40); ctx.lineTo(W - 40, H - 40 - bracketLen); ctx.stroke();
  }
  ctx.restore();

  // Price badge
  const pulse = 1 + Math.sin(t * 3) * 0.04;
  ctx.save();
  ctx.translate(W * 0.78, H * 0.76);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = "#0f0f0f";
  ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = opts.accent;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowColor = opts.accent;
  ctx.shadowBlur = 12;
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "700 26px 'Saira Stencil One',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("₹", -10, -12);

  ctx.fillStyle = "#fff";
  ctx.font = "700 52px Oswald,sans-serif";
  ctx.fillText(opts.price, 12, 0);
  ctx.restore();

  // Headline
  ctx.fillStyle = "#fff";
  ctx.font = "500 36px Oswald,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(opts.headline, W / 2, H * 0.9);

  // Brand
  ctx.fillStyle = opts.accent;
  ctx.font = "700 16px 'Saira Stencil One',sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("BBQ RIDE INDIA", 32, 28);

  // Scan line
  const scanY = (t * 90) % H;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(0, scanY, W, 1);
}

function drawCinematic(ctx, W, H, t, cache, sceneImg, opts) {
  // BG
  ctx.fillStyle = "#060606";
  ctx.fillRect(0, 0, W, H);

  // Bike
  drawScene(ctx, sceneImg, W / 2, H * 0.5, 940, 780);

  // Left accent stripe
  ctx.fillStyle = opts.accent;
  ctx.fillRect(0, 0, 10, H);

  // Letterbox bars
  const barSlide = Math.min(1, t / 0.7);
  const barH = barSlide * H * 0.14;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, barH);
  ctx.fillRect(0, H - barH, W, barH);

  // Title (after bars settle)
  if (t > 0.7) {
    const titleSlide = Math.min(1, (t - 0.7) * 3);
    const titleX = 44 - 100 * (1 - titleSlide);

    ctx.fillStyle = "#fff";
    ctx.font = "600 64px Oswald,sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(opts.headline, titleX, H * 0.07);

    ctx.fillStyle = opts.accent;
    ctx.font = "400 20px Oswald,sans-serif";
    ctx.fillText(opts.sub, titleX, H * 0.07 + 80);
  }

  // Bottom bar price pill
  if (t > 0.5) {
    const priceSlide = Math.min(1, (t - 0.5) * 2);
    const priceY = H - barH - 40 - 100 * (1 - priceSlide);
    ctx.save();
    ctx.translate(W * 0.86, priceY);
    ctx.scale(priceSlide, priceSlide);
    drawPill(ctx, 0, 0, 200, 56, 28, opts.accent, "#000", 2);
    ctx.fillStyle = "#fff";
    ctx.font = "700 42px Oswald,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(opts.price, 0, 0);
    ctx.restore();
  }

  // Scan lines
  for (let y = 0; y < H; y += 6) {
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(0, y, W, 1);
  }
}

function drawStoryAd(ctx, W, H, t, cache, sceneImg, opts) {
  // BG linear gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0f0f0f");
  bg.addColorStop(1, "#1a0800");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Top brand bar
  ctx.fillStyle = "#0f0f0f";
  ctx.fillRect(0, 0, W, 130);
  ctx.fillStyle = "#fff";
  ctx.font = "700 24px 'Saira Stencil One',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BBQ RIDE INDIA", W / 2, 65);
  ctx.fillStyle = opts.accent;
  ctx.beginPath(); ctx.arc(W / 2 - 160, 65, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W / 2 + 160, 65, 4, 0, Math.PI * 2); ctx.fill();

  // Rule line
  ctx.strokeStyle = opts.accent;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 130); ctx.lineTo(W, 130); ctx.stroke();

  // Bike
  drawScene(ctx, sceneImg, W / 2, H * 0.39, 920, 680);

  // Glow behind bike
  const glowG = ctx.createRadialGradient(W / 2, H * 0.62, 0, W / 2, H * 0.62, 360);
  glowG.addColorStop(0, "rgba(224,90,26,0.3)");
  glowG.addColorStop(1, "rgba(224,90,26,0)");
  ctx.fillStyle = glowG;
  ctx.fillRect(0, 0, W, H);

  // Rule 2
  ctx.beginPath(); ctx.moveTo(0, H * 0.63); ctx.lineTo(W, H * 0.63); ctx.stroke();

  // Text block
  ctx.fillStyle = "#fff";
  ctx.font = "600 68px Oswald,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.headline, W / 2, H * 0.70);

  ctx.fillStyle = opts.accent;
  ctx.font = "400 28px Oswald,sans-serif";
  ctx.fillText(opts.sub, W / 2, H * 0.70 + 80);

  // Price pill
  const pulse = 1 + Math.sin(t * 2.5) * 0.03;
  ctx.save();
  ctx.translate(W / 2, H * 0.83);
  ctx.scale(pulse, pulse);
  drawPill(ctx, 0, 0, 300, 82, 41, "#e05a1a", "#000", 2);
  ctx.fillStyle = "#fff";
  ctx.font = "700 50px Oswald,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.price, 0, 0);
  ctx.restore();

  // Bottom CTA bar
  ctx.fillStyle = "#0f0f0f";
  ctx.fillRect(0, H - 130, W, 130);
  const ctaY = H - 130 + 65 + Math.sin(t * 3) * 5;
  ctx.fillStyle = "#fff";
  ctx.font = "500 20px Oswald,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SWIPE UP ↑", W / 2, ctaY);

  // Handle
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "400 15px Oswald,sans-serif";
  ctx.fillText("@ bbqrideindia", W / 2, H - 148);
}

/* ── draw dispatch ─────────────────────────────────────────── */

function drawNeonMidnight(ctx, W, H, t, cache, sceneImg, opts) {
  // Black background
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // Draw scene
  drawScene(ctx, sceneImg, W / 2, H * 0.45, 860, 700);

  // Scanline shimmer
  for (let y = 0; y < H; y += 8) {
    ctx.fillStyle = `rgba(201,255,71,${0.025 + 0.015 * Math.sin(t * 3 + y / H * 8)})`;
    ctx.fillRect(0, y, W, 1);
  }

  // Neon corner brackets around scene frame
  const sceneX = W / 2 - 430;
  const sceneY = H * 0.1;
  const sceneW = 860;
  const sceneH = 700;

  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#c9ff47";

  // Top-left bracket
  ctx.beginPath();
  ctx.moveTo(sceneX, sceneY);
  ctx.lineTo(sceneX - 72, sceneY);
  ctx.lineTo(sceneX - 72, sceneY - 72);
  ctx.lineTo(sceneX, sceneY - 72);
  ctx.closePath();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "#c9ff47";
  ctx.stroke();

  // Top-right bracket
  ctx.beginPath();
  ctx.moveTo(sceneX + sceneW, sceneY);
  ctx.lineTo(sceneX + sceneW + 72, sceneY);
  ctx.lineTo(sceneX + sceneW + 72, sceneY - 72);
  ctx.lineTo(sceneX + sceneW, sceneY - 72);
  ctx.closePath();
  ctx.stroke();

  // Bottom-left bracket
  ctx.beginPath();
  ctx.moveTo(sceneX, sceneY + sceneH);
  ctx.lineTo(sceneX - 72, sceneY + sceneH);
  ctx.lineTo(sceneX - 72, sceneY + sceneH + 72);
  ctx.lineTo(sceneX, sceneY + sceneH + 72);
  ctx.closePath();
  ctx.stroke();

  // Bottom-right bracket
  ctx.beginPath();
  ctx.moveTo(sceneX + sceneW, sceneY + sceneH);
  ctx.lineTo(sceneX + sceneW + 72, sceneY + sceneH);
  ctx.lineTo(sceneX + sceneW + 72, sceneY + sceneH + 72);
  ctx.lineTo(sceneX + sceneW, sceneY + sceneH + 72);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
  ctx.shadowBlur = 0;

  // Headline
  ctx.fillStyle = "#fff";
  ctx.font = "600 58px Oswald";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.headline, W / 2, H * 0.73);

  // Sub
  ctx.fillStyle = "#c9ff47";
  ctx.font = "22px Oswald";
  ctx.fillText(opts.sub, W / 2, H * 0.73 + 70);

  // Price (no pill, just text)
  ctx.fillStyle = "#c9ff47";
  ctx.font = "700 56px Oswald";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.price, W / 2, H * 0.85);
}

function drawHauntedStory(ctx, W, H, t, cache, sceneImg, opts) {
  // Linear gradient bg
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#1a0535");
  bgGrad.addColorStop(1, "#1a0600");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Top brand bar
  ctx.fillStyle = "#0d0015";
  ctx.fillRect(0, 0, W, 110);

  // Text "BBQ RIDE"
  ctx.fillStyle = "#fff";
  ctx.font = "700 28px 'Saira Stencil One'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BBQ RIDE", W / 2, 46);

  // Text "THIS HALLOWEEN"
  ctx.fillStyle = "#b47eff";
  ctx.font = "400 16px Oswald";
  ctx.fillText("THIS HALLOWEEN", W / 2, 82);

  // Draw scene
  drawScene(ctx, sceneImg, W / 2, H * 0.44, 820, 660);

  // Orange glow under scene
  const glowGrad = ctx.createRadialGradient(W / 2, H * 0.65, 0, W / 2, H * 0.65, 340);
  glowGrad.addColorStop(0, "rgba(224,90,26,0.32)");
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  // Bat sprites
  if (!cache.bats) {
    cache.bats = [];
    for (let i = 0; i < 6; i++) {
      cache.bats.push({
        x: -60,
        y: Math.random() * H * 0.55,
        speed: 1.2 + Math.random() * 2,
        phase: Math.random() * 6,
      });
    }
  }

  const bats = cache.bats;
  for (const bat of bats) {
    bat.x += bat.speed * (1 / 60) * W * 0.5;
    if (bat.x > W + 60) {
      bat.x = -60;
      bat.y = Math.random() * H * 0.55;
    }

    // Draw bat wing shape
    ctx.save();
    ctx.translate(bat.x, bat.y);
    ctx.fillStyle = "rgba(160,40,240,0.55)";
    ctx.beginPath();
    // Left wing
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-22, -12, -40, 8, -30, 2);
    // Right wing
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(22, -12, 40, 8, 30, 2);
    ctx.fill();
    ctx.restore();
  }

  // Horizontal glow line
  ctx.fillStyle = opts.accent;
  ctx.fillRect(0, H * 0.64 - 1, W, 2);

  // Text block
  ctx.fillStyle = "#fff";
  ctx.font = "600 62px Oswald";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.headline, W / 2, H * 0.72);

  ctx.fillStyle = "#b47eff";
  ctx.font = "24px Oswald";
  ctx.fillText(opts.sub, W / 2, H * 0.72 + 76);

  // Price pill at H*0.84
  drawPill(ctx, W / 2, H * 0.84, 200, 54, 27, opts.accent, "#000", 2);
}

function drawEmberNight(ctx, W, H, t, cache, sceneImg, opts) {
  // Black background
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // Draw scene
  drawScene(ctx, sceneImg, W / 2, H * 0.45, 880, 700);

  // Radial orange glow at bottom
  const glowGrad = ctx.createRadialGradient(W / 2, H * 0.88, 0, W / 2, H * 0.88, 480);
  glowGrad.addColorStop(0, "rgba(224,90,26,0.5)");
  glowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  // Ember particles
  if (!cache.embers) {
    cache.embers = [];
    for (let i = 0; i < 28; i++) {
      cache.embers.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -40 - Math.random() * 60,
        r: 2 + Math.random() * 3,
        hue: 25 + Math.random() * 30,
      });
    }
  }

  const embers = cache.embers;
  for (const ember of embers) {
    ember.y += ember.vy * (1 / 60);
    ember.x += ember.vx * (1 / 60);
    if (ember.y < -10) {
      ember.y = H + 10;
      ember.x = Math.random() * W;
    }
    ctx.fillStyle = `hsla(${ember.hue},100%,65%,0.7)`;
    ctx.beginPath();
    ctx.arc(ember.x, ember.y, ember.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bottom glass bar
  const barY = H * 0.82;
  const barW = W - 80;
  const barH = 96;
  const barX = 40;

  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 8);
  ctx.fill();
  ctx.strokeStyle = opts.accent;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Headline inside glass bar
  ctx.fillStyle = "#fff";
  ctx.font = "600 48px Oswald";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.headline, W / 2, barY + 30);

  // Sub inside glass bar
  ctx.fillStyle = opts.accent;
  ctx.font = "20px Oswald";
  ctx.fillText(opts.sub, W / 2, barY + 56);

  // Left accent stripe
  ctx.fillStyle = opts.accent;
  ctx.fillRect(0, 0, 6, H);
}

function drawVioletGlass(ctx, W, H, t, cache, sceneImg, opts) {
  // Draw background
  const bg = ctx.createLinearGradient(0, H * 0.35, 0, H * 0.65);
  bg.addColorStop(0, "#0d0018");
  bg.addColorStop(0.5, "#1a0535");
  bg.addColorStop(1, "#100808");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Dark overlay
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 0, W, H);

  // Frosted glass panel - centered at W/2, H*0.72, size 760×300px
  const panelX = W / 2;
  const panelY = H * 0.72;
  const panelW = 760;
  const panelH = 300;
  const scaleIn = Math.min(1, t / 0.4);

  ctx.save();
  ctx.translate(panelX, panelY);
  ctx.scale(scaleIn, scaleIn);
  ctx.translate(-panelX, -panelY);

  ctx.shadowBlur = 28;
  ctx.shadowColor = "rgba(140,60,255,0.55)";

  // Rounded rectangle panel
  const radius = 16;
  ctx.beginPath();
  ctx.roundRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, radius);
  ctx.fillStyle = "rgba(70,20,160,0.50)";
  ctx.fill();
  ctx.strokeStyle = "rgba(200,160,255,0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.restore();

  // Inside panel: headline
  ctx.fillStyle = "#fff";
  ctx.font = "600 54px Oswald";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.headline, panelX, panelY - 30);

  // Inside panel: sub
  ctx.fillStyle = opts.accent;
  ctx.font = "400 22px Oswald";
  ctx.fillText(opts.sub, panelX, panelY + 26);

  // Price pill below panel
  drawPill(ctx, W / 2, H * 0.82, 220, 54, 27, opts.accent, "#000", 2);

  // Reset shadow
  ctx.shadowBlur = 0;
}

function drawFrame(ctx, W, H, t, cache, sceneImg, opts) {
  ctx.clearRect(0, 0, W, H);
  switch (opts.tmpl) {
    case "torn-reveal":   drawTornReveal(ctx, W, H, t, cache, sceneImg, opts); break;
    case "sauce-drip":    drawSauceDrip(ctx, W, H, t, cache, sceneImg, opts); break;
    case "campfire":      drawCampfire(ctx, W, H, t, cache, sceneImg, opts); break;
    case "neon-speed":    drawNeonSpeed(ctx, W, H, t, cache, sceneImg, opts); break;
    case "cinematic":     drawCinematic(ctx, W, H, t, cache, sceneImg, opts); break;
    case "story-ad":      drawStoryAd(ctx, W, H, t, cache, sceneImg, opts); break;
    case "violet-glass":  drawVioletGlass(ctx, W, H, t, cache, sceneImg, opts); break;
    case "ember-night":   drawEmberNight(ctx, W, H, t, cache, sceneImg, opts); break;
    case "haunted-story": drawHauntedStory(ctx, W, H, t, cache, sceneImg, opts); break;
    case "neon-midnight": drawNeonMidnight(ctx, W, H, t, cache, sceneImg, opts); break;
  }
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════════ */

async function loadGifJs() {
  if (window.GIF) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("gif.js failed to load"));
    document.head.appendChild(s);
  });
}

export default function BrandArt() {
  const [art, setArt]     = useState("torn-reveal");
  const [ratio, setRatio] = useState("1:1");
  const [accent, setAccent] = useState("#e05a1a");
  const [headline, setHL]     = useState("");
  const [sub, setSub]         = useState("");
  const [price, setPrice]     = useState("₹99");

  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const rafRef       = useRef(null);
  const tRef         = useRef(0);
  const lastTsRef    = useRef(null);
  const imgCacheRef  = useRef({});

  const TEMPLATE_IDS = TEMPLATES.map(t => t.id);
  const tmplIdx = TEMPLATE_IDS.indexOf(art);

  // Reset text opts when template changes
  useEffect(() => {
    const def = DEFAULT_OPTS[art];
    if (def) {
      setHL(def.headline);
      setSub(def.sub);
      setPrice(def.price);
    }
  }, [art]);

  // Auto-switch ratio for story-ad
  useEffect(() => {
    if (art === "story-ad") setRatio("9:16");
    else if (ratio === "9:16") setRatio("1:1");
  }, [art, ratio]);

  // Asset preloader
  useEffect(() => {
    Promise.all([
      loadImages(STICKER_URLS.torn).then(imgs => { imgCacheRef.current.torn = imgs; }),
      loadImages(STICKER_URLS.sauces).then(imgs => { imgCacheRef.current.sauces = imgs; }),
      loadImages(STICKER_URLS.sauceBtls).then(imgs => { imgCacheRef.current.sauceBtls = imgs; }),
      (async () => {
        const [fire, pot, mall, mug] = await loadImages([
          STICKER_URLS.campfire, STICKER_URLS.cookingPot,
          STICKER_URLS.marshmallow, STICKER_URLS.mug,
        ]);
        imgCacheRef.current.campfire = fire;
        imgCacheRef.current.cookingPot = pot;
        imgCacheRef.current.marshmallow = mall;
        imgCacheRef.current.mug = mug;
      })(),
    ]);
  }, []);

  const drawFrameWrap = useCallback((canvas, t2, W, H) => {
    const ctx = canvas.getContext("2d");
    const sceneImg = getCanvas();
    const opts = {
      tmpl: art,
      headline, sub, price, accent,
    };
    drawFrame(ctx, W, H, t2, imgCacheRef.current, sceneImg, opts);
  }, [art, headline, sub, price, accent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w, h } = SIZES[ratio];
    canvas.width = w;
    canvas.height = h;
    tRef.current = 0;
    lastTsRef.current = null;

    let stopped = false;
    const loop = (ts) => {
      if (stopped) return;
      if (lastTsRef.current !== null) tRef.current = (tRef.current + (ts - lastTsRef.current) / 1000) % 8;
      lastTsRef.current = ts;
      drawFrameWrap(canvas, tRef.current, w, h);
      rafRef.current = requestAnimationFrame(loop);
    };
    document.fonts.ready.then(() => {
      if (!stopped) rafRef.current = requestAnimationFrame(loop);
    });
    return () => { stopped = true; cancelAnimationFrame(rafRef.current); };
  }, [ratio, drawFrameWrap]);

  const onMouseMove = (e) => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // parallax handled by mouseRef if needed; kept for API compat
  };

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `art-${art}-${ratio.replace(":", "x")}.png`;
    a.click();
  };

  const downloadGif = async () => {
    await loadGifJs();
    const { w, h } = SIZES[ratio];
    const off = document.createElement("canvas");
    off.width = Math.round(w * 0.5);
    off.height = Math.round(h * 0.5);
    const FRAMES = 20;
    const gif = new window.GIF({ workers: 2, quality: 8, width: off.width, height: off.height });
    const ctx2 = off.getContext("2d");
    for (let f = 0; f < FRAMES; f++) {
      const ft = (f / FRAMES) * 8;
      const tmp = document.createElement("canvas");
      tmp.width = w; tmp.height = h;
      drawFrameWrap(tmp, ft, w, h);
      ctx2.clearRect(0, 0, off.width, off.height);
      ctx2.drawImage(tmp, 0, 0, off.width, off.height);
      gif.addFrame(ctx2, { copy: true, delay: 100 });
    }
    gif.on("finished", blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `art-${art}-${ratio.replace(":", "x")}.gif`;
      a.click();
    });
    gif.render();
  };

  const { w, h } = SIZES[ratio];

  return (
    <div className="sos2-posts sos2-art">
      <div className="sos2-posts-tabs">
        {TEMPLATES.map(a => (
          <button key={a.id}
            className={`sos2-posts-tab${art === a.id ? " active" : ""}`}
            onClick={() => setArt(a.id)}>
            {a.label}
          </button>
        ))}
      </div>

      <div ref={containerRef} className="sos2-posts-preview-wrap"
        style={{ aspectRatio: `${w}/${h}` }}
        onMouseMove={onMouseMove}>
        <canvas ref={canvasRef} className="sos2-posts-canvas" />
      </div>

      <div className="sos2-posts-row">
        <label className="sos2-posts-field"><span>Accent</span>
          <input type="color" value={accent} onChange={e => setAccent(e.target.value)} />
        </label>
      </div>

      <label className="sos2-posts-field"><span>Headline</span>
        <input value={headline} onChange={e => setHL(e.target.value)} />
      </label>
      <label className="sos2-posts-field"><span>Sub</span>
        <input value={sub} onChange={e => setSub(e.target.value)} />
      </label>
      <label className="sos2-posts-field"><span>Price</span>
        <input value={price} onChange={e => setPrice(e.target.value)} />
      </label>

      <div className="sos2-posts-row">
        <button className="sos2-posts-dl" onClick={downloadPng}>↓ PNG</button>
        <button className="sos2-posts-dl sos2-posts-dl-gif" onClick={downloadGif}>
          ↓ GIF
        </button>
      </div>
    </div>
  );
}

/* ── GIF loader ───────────────────────────────────────────── */
