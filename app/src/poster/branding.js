/* Slice R1 - Reel branding overlays: logo bug, per-shot titles, end card.
   ---------------------------------------------------------------------------
   No React, no three.js. Branding comes from the ACTIVE Poster kit (its colours,
   its logo image, its first handle, its fonts); there is no second branding
   system. One drawing function, drawBranding(), paints every overlay on a 2D
   canvas in the 1080x1920 Reel frame: the live preview overlay during Play and
   the MP4 exporter (animation/exporter.js, composited onto every frame) both
   call it, so preview and export are the same pixels.

   Layout rules (all in 1080x1920 frame pixels, inside the Instagram safe area
   x 60-1020, y 220-1500, REEL_SAFE_AREA):
   - logo bug: top right, 160 px wide, 90% opacity, every frame of the Reel;
   - title: per shot, max 2 lines, Top / Middle / Bottom, kit font + colour with
     a soft shadow, fades in 0.4 s and out 0.4 s inside the shot, shrinks to fit;
   - end card: after the last shot the final frame is held for 2.0 s, darkened
     to 40% brightness, with the kit logo, the handle (when not empty) and one
     optional line. It counts toward the 28 s maximum of a Reel.
   A logo is never drawn larger than 1.5x its own pixel size. */

import { REEL_SAFE_AREA } from "../animation/path.js";
import { titleLines } from "../animation/shotTitle.js";
import {
  FONT_HEAD,
  FONT_BODY,
  fitFontSize,
  truncateToWidth,
  readKits,
  posterState,
  getCachedLogoImage,
  ensureLogoImage,
} from "./poster.js";

export const FRAME_W = 1080;
export const FRAME_H = 1920;
export const FPS = 30;
export const SAFE = Object.freeze({ x0: REEL_SAFE_AREA.x0, x1: REEL_SAFE_AREA.x1, y0: REEL_SAFE_AREA.y0, y1: REEL_SAFE_AREA.y1 });

export const LOGO_BUG_W = 160;
export const LOGO_BUG_MAX_H = 240;
export const LOGO_BUG_ALPHA = 0.9;
export const LOGO_BUG_GAP = 24; // room kept between the bug and a Top title
export const MAX_UPSCALE = 1.5; // a logo is never drawn larger than this x its pixel size
export const FADE_S = 0.4;
export const END_CARD_S = 2;
export const END_CARD_FRAMES = END_CARD_S * FPS;
export const END_BRIGHTNESS = 0.4;
export const REEL_MAX_S = 28; // the practical maximum of a Reel (7 x 4 s), end card included
export const MAX_END_TEXT_CHARS = 80;
export const MAX_HANDLE_CHARS = 40;

const SHADOW_PAD = 16; // keeps the text's own shadow inside the safe area too
const TITLE_START = 96;
const TITLE_MIN = 28;
const TITLE_LINE_H = 1.12;
const CARD_LOGO_W = 520;
const CARD_LOGO_MAX_H = 420;
const CENTER_Y = (SAFE.y0 + SAFE.y1) / 2;

/* ------------------------------- state --------------------------------- */

export const endCardFits = (reelS) =>
  reelS + END_CARD_S <= REEL_MAX_S
    ? { ok: true, reason: "" }
    : {
        ok: false,
        reason: `The end card adds ${END_CARD_S} s: a ${reelS} s Reel would be ${reelS + END_CARD_S} s and the limit is ${REEL_MAX_S} s.`,
      };

const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");

// logo: the corner logo on/off. endCard + endText: the end card and its one
// optional line. handle: null follows the active kit's handle; a string (even
// "") is the user's own and wins.
export function createBrandingState() {
  const initial = Object.freeze({ logo: false, endCard: false, endText: "", endText2: "", handle: null });
  let snapshot = initial;
  const listeners = new Set();
  const set = (patch) => {
    snapshot = Object.freeze({ ...snapshot, ...patch });
    for (const fn of Array.from(listeners)) fn();
  };
  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot: () => snapshot,
    setLogo: (v) => set({ logo: !!v }),
    // Turning it on needs the Reel's length (without the card): { ok, reason }.
    setEndCard(v, reelS) {
      if (v) {
        const fit = endCardFits(reelS);
        if (!fit.ok) return fit;
      }
      set({ endCard: !!v });
      return { ok: true, reason: "" };
    },
    setEndText: (s) => set({ endText: str(s, MAX_END_TEXT_CHARS) }),
    setEndText2: (s) => set({ endText2: str(s, MAX_END_TEXT_CHARS) }),
    setHandle: (s) => set({ handle: s === null ? null : str(s, MAX_HANDLE_CHARS) }),
    reset: () => set({ ...initial }),
    // The plain form saved with the session.
    forSession: () => ({ ...snapshot }),
    // A sanitized restore; false when the saved data is not an object. The end
    // card stays off when it would not fit the Reel (reelS = its length).
    restore(raw, reelS) {
      if (!raw || typeof raw !== "object") return false;
      const endCard = raw.endCard === true && endCardFits(reelS).ok;
      set({
        logo: raw.logo === true,
        endCard,
        endText: str(raw.endText, MAX_END_TEXT_CHARS),
        endText2: str(raw.endText2 ?? "", MAX_END_TEXT_CHARS),
        handle: typeof raw.handle === "string" ? str(raw.handle, MAX_HANDLE_CHARS) : null,
      });
      return true;
    },
  };
}

export const brandingState = createBrandingState();

// Seconds the preview / export holds the last frame for the end card.
export const endHoldS = () => (brandingState.getSnapshot().endCard ? END_CARD_S : 0);

// Where the live preview is in time: the stage sets the performance.now() the
// preview started at (null when not previewing); the overlay reads it.
let previewStart = null;
export const setPreviewClock = (ms) => {
  previewStart = ms;
};
export const getPreviewClock = () => previewStart;

/* ------------------------------- the spec ------------------------------ */

export function activeKit(storage) {
  const kits = readKits(storage);
  return kits[posterState.getSnapshot().kitId] || kits["bbq-ride"];
}

// What is drawn, or null when nothing would be (so OFF costs nothing and the
// exporter keeps its old path). sequence: the shot list; kit: the active
// Poster kit; logoImage: its decoded logo (or null).
export function buildBrandingSpec({ state, sequence, kit, logoImage }) {
  let t0 = 0;
  const shots = [];
  for (const s of sequence) {
    const lines = s.title ? titleLines(s.title.text) : [];
    if (lines.length) shots.push({ t0, durationS: s.durationS, lines, pos: s.title.pos, animStyle: s.title.animStyle ?? "fade" });
    t0 += s.durationS;
  }
  const reelS = t0;
  const logo = state.logo && logoImage ? { img: logoImage } : null;
  const endCard =
    state.endCard && endCardFits(reelS).ok
      ? {
          img: logoImage || null,
          handle: String(state.handle ?? kit.handle1 ?? "").trim(),
          text: String(state.endText ?? "").trim(),
          text2: String(state.endText2 ?? "").trim(),
        }
      : null;
  if (!logo && !shots.length && !endCard) return null;
  return { colors: kit.colors, reelS, logo, shots, endCard, totalS: reelS + (endCard ? END_CARD_S : 0) };
}

// The spec for the current stores (the exporter and the preview overlay).
// Reads the logo from the decoded-image cache only: never awaits.
export function getBrandingSpec(sequence, storage) {
  const kit = activeKit(storage);
  return buildBrandingSpec({
    state: brandingState.getSnapshot(),
    sequence,
    kit,
    logoImage: getCachedLogoImage(kit.id),
  });
}

// Loads the active kit's logo and the poster fonts (call before reading the cache).
export function prepareBranding(storage) {
  return ensureLogoImage(activeKit(storage).id);
}

/* ------------------------------- layout -------------------------------- */

// 0..1: fades in over FADE_S, holds, fades out over FADE_S, within the shot.
export function titleAlpha(local, durationS) {
  return Math.max(0, Math.min(1, local / FADE_S, (durationS - local) / FADE_S));
}

const nativeSize = (img) => [img.naturalWidth || img.width || 0, img.naturalHeight || img.height || 0];

// Draw size of a logo: targetW wide, never above MAX_UPSCALE x its own size,
// never taller than maxH.
export function logoSize(img, targetW, maxH) {
  const [nw, nh] = nativeSize(img);
  if (!(nw > 0) || !(nh > 0)) return null;
  let w = Math.min(targetW, nw * MAX_UPSCALE);
  let h = (w * nh) / nw;
  const hMax = Math.min(maxH, nh * MAX_UPSCALE);
  if (h > hMax) {
    h = hMax;
    w = (h * nw) / nh;
  }
  return { w, h };
}

function layoutLogoBug(logo) {
  const s = logoSize(logo.img, LOGO_BUG_W, LOGO_BUG_MAX_H);
  if (!s) return null;
  return { img: logo.img, x: SAFE.x1 - s.w, y: SAFE.y0, w: s.w, h: s.h, alpha: LOGO_BUG_ALPHA };
}

function titleAlphaByStyle(local, durationS, animStyle) {
  if (animStyle === "flash") {
    return local > 0.1 && local < durationS - 0.1 ? 1 : 0;
  }
  return Math.max(0, Math.min(1, local / FADE_S, (durationS - local) / FADE_S));
}

function titleDyByStyle(local, durationS, animStyle) {
  if (animStyle !== "slide-up") return 0;
  const SLIDE_PX = 44;
  if (local < FADE_S) return SLIDE_PX * (1 - local / FADE_S);
  if (local > durationS - FADE_S) return -SLIDE_PX * (1 - (durationS - local) / FADE_S);
  return 0;
}

function layoutTitle(ctx, shot, local, logoOn) {
  const animStyle = shot.animStyle ?? "fade";
  const alpha = titleAlphaByStyle(local, shot.durationS, animStyle);
  const dy = titleDyByStyle(local, shot.durationS, animStyle);
  if (!(alpha > 0)) return null;
  const left = SAFE.x0;
  const right = SAFE.x1 - (shot.pos === "top" && logoOn ? LOGO_BUG_W + LOGO_BUG_GAP : 0);
  const maxW = right - left - 2 * SHADOW_PAD;
  const cx = (left + right) / 2;
  // one size for both lines: the smaller of what each line needs
  let size = TITLE_START;
  for (const line of shot.lines) {
    size = Math.min(size, fitFontSize(ctx, line, maxW, { family: FONT_HEAD, weight: "400", startSize: TITLE_START, minSize: TITLE_MIN }));
  }
  ctx.font = `400 ${size}px "${FONT_HEAD}"`;
  const texts = shot.lines.map((l) => truncateToWidth(ctx, l, maxW)); // backstop at the minimum size
  const widths = texts.map((l) => ctx.measureText(l).width);
  const lineH = size * TITLE_LINE_H;
  const blockH = texts.length * lineH;
  let y0;
  if (shot.pos === "top") y0 = SAFE.y0 + SHADOW_PAD;
  else if (shot.pos === "middle") y0 = CENTER_Y - blockH / 2;
  else y0 = SAFE.y1 - SHADOW_PAD - blockH;
  const w = Math.max(...widths);
  return {
    alpha,
    dy,
    size,
    pos: shot.pos,
    lines: texts.map((text, i) => ({ text, x: cx, y: y0 + lineH * (i + 0.5), w: widths[i] })),
    rect: { x: cx - w / 2, y: y0, w, h: blockH },
  };
}

function layoutCard(ctx, card) {
  const gapLogo = 44;
  const gapLine = 28;
  const maxW = SAFE.x1 - SAFE.x0 - 2 * SHADOW_PAD;
  const logo = card.img ? logoSize(card.img, CARD_LOGO_W, CARD_LOGO_MAX_H) : null;
  const text = (value, family, weight, start, min) => {
    const size = fitFontSize(ctx, value, maxW, { family, weight, startSize: start, minSize: min });
    ctx.font = `${weight} ${size}px "${family}"`;
    const t = truncateToWidth(ctx, value, maxW);
    return { text: t, size, w: ctx.measureText(t).width, h: size * 1.2 };
  };
  const handle = card.handle ? text(card.handle, FONT_BODY, "600", 60, 24) : null;
  const line = card.text ? text(card.text, FONT_BODY, "500", 46, 22) : null;
  const line2 = card.text2 ? text(card.text2, FONT_BODY, "400", 38, 20) : null;
  let H = 0;
  if (logo) H += logo.h;
  if (handle) H += (H ? gapLogo : 0) + handle.h;
  if (line) H += (H ? (handle ? gapLine : gapLogo) : 0) + line.h;
  if (line2) H += gapLine + line2.h;
  let y = Math.max(SAFE.y0, CENTER_Y - H / 2);
  const out = { logo: null, handle: null, line: null, line2: null, rect: { x: SAFE.x0, y, w: SAFE.x1 - SAFE.x0, h: H } };
  const cx = (SAFE.x0 + SAFE.x1) / 2;
  if (logo) {
    out.logo = { img: card.img, x: cx - logo.w / 2, y, w: logo.w, h: logo.h };
    y += logo.h + gapLogo;
  }
  if (handle) {
    out.handle = { text: handle.text, size: handle.size, x: cx, y: y + handle.h / 2, w: handle.w };
    y += handle.h + gapLine;
  }
  if (line) {
    out.line = { text: line.text, size: line.size, x: cx, y: y + line.h / 2, w: line.w };
    y += line.h + gapLine;
  }
  if (line2) {
    out.line2 = { text: line2.text, size: line2.size, x: cx, y: y + line2.h / 2, w: line2.w };
  }
  return out;
}

// Everything to paint at time t (seconds from the Reel start): { dim, logo,
// title, card }. dim is the black overlay alpha (0 = none). ctx is used only to
// measure text. Nothing is drawn before t = 0 or after the end card.
export function layoutBranding(ctx, spec, t) {
  const out = { dim: 0, logo: null, title: null, card: null };
  if (!spec || !Number.isFinite(t) || t < 0) return out;
  if (t < spec.reelS - 1e-9) {
    if (spec.logo) out.logo = layoutLogoBug(spec.logo);
    for (const shot of spec.shots) {
      if (t >= shot.t0 - 1e-9 && t < shot.t0 + shot.durationS - 1e-9) {
        out.title = layoutTitle(ctx, shot, Math.max(0, t - shot.t0), !!out.logo);
        break;
      }
    }
    return out;
  }
  if (spec.endCard && t < spec.reelS + END_CARD_S - 1e-9) {
    out.dim = 1 - END_BRIGHTNESS;
    out.card = layoutCard(ctx, spec.endCard);
  }
  return out;
}

/* ------------------------------- drawing ------------------------------- */

function drawTextLine(ctx, text, x, y, size, family, weight, color) {
  ctx.font = `${weight} ${size}px "${family}"`;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// The one draw function (preview overlay AND export). Paints over whatever is
// already on ctx (the caller clears it or has drawn the 3D frame) in a w x h
// canvas of the 9:16 Reel frame. Never throws on a missing spec.
export function drawBranding(ctx, w, h, spec, t) {
  if (!ctx || !(w > 0) || !(h > 0) || !spec) return;
  ctx.save();
  // A canvas that is in the page inherits its letter spacing, kerning and text
  // rendering from the page's CSS; a detached one does not. Fixing them makes
  // the preview overlay and the exporter's canvas draw the same glyphs.
  ctx.letterSpacing = "0px";
  ctx.wordSpacing = "0px";
  ctx.fontKerning = "normal";
  ctx.textRendering = "optimizeLegibility";
  ctx.scale(w / FRAME_W, h / FRAME_H);
  const L = layoutBranding(ctx, spec, t);
  const colors = spec.colors;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (L.dim > 0) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(0, 0, 0, ${L.dim})`;
    ctx.fillRect(0, 0, FRAME_W, FRAME_H);
  }
  if (L.logo) {
    ctx.globalAlpha = L.logo.alpha;
    ctx.drawImage(L.logo.img, L.logo.x, L.logo.y, L.logo.w, L.logo.h);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;
  if (L.title) {
    ctx.globalAlpha = L.title.alpha;
    const dy = L.title.dy ?? 0;
    for (const line of L.title.lines) drawTextLine(ctx, line.text, line.x, line.y + dy, L.title.size, FONT_HEAD, "400", colors.text);
  }
  if (L.card) {
    ctx.globalAlpha = 1;
    if (L.card.logo) {
      ctx.shadowColor = "transparent";
      ctx.drawImage(L.card.logo.img, L.card.logo.x, L.card.logo.y, L.card.logo.w, L.card.logo.h);
      ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    }
    if (L.card.handle) drawTextLine(ctx, L.card.handle.text, L.card.handle.x, L.card.handle.y, L.card.handle.size, FONT_BODY, "600", colors.accent);
    if (L.card.line) drawTextLine(ctx, L.card.line.text, L.card.line.x, L.card.line.y, L.card.line.size, FONT_BODY, "500", colors.text);
    if (L.card.line2) drawTextLine(ctx, L.card.line2.text, L.card.line2.x, L.card.line2.y, L.card.line2.size, FONT_BODY, "400", colors.text);
  }
  ctx.restore();
}
