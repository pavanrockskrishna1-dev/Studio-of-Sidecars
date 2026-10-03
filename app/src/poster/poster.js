/* Slice C1a — Poster studio (PNG posters), owner decisions 1-8.
   ---------------------------------------------------------------------------
   No React, no three.js: brand kits, the two poster templates, the percent ->
   pixel layout maths, and the single 2D draw function (drawPoster) shared by
   the live preview overlay and the PNG export, so preview and export are
   always the exact same call at two different sizes. The poster never reads
   or writes the 3D scene, camera, lights or Garage.

   Storage follows the pattern already used by garage/measure.js: functions
   take an injected `storage` (falls back to the real localStorage), so they
   are testable from plain Node with a fake storage and never throw on a
   missing/broken one. Kit text and colours persist to localStorage
   (decision 3); the logo image reuses the app's existing IndexedDB asset
   store (assets/idb.js) instead of adding a second storage mechanism. */

import { idbPut, idbGet } from "../assets/idb.js";

const isObj = (v) => v !== null && typeof v === "object";
const isStr = (v) => typeof v === "string";

function safeLocalStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/* ============================== brand kits =============================== */

export const KITS_KEY = "sos-brand-kits";
export const ACTIVE_KEY = "sos-brand-active";

const DEFAULT_COLORS = Object.freeze({ bg: "#141414", text: "#FFFFFF", accent: "#FF7A1A" });

function emptyKit(id, name) {
  return {
    id,
    name,
    colors: { ...DEFAULT_COLORS },
    handle1: "",
    handle2: "",
    hashtag: "",
    whatsapp1: "",
    whatsapp2: "",
  };
}

// The two owner-approved presets (decision 3). BBQ Ride ships filled in; THE
// KOP ships with blank text fields (colours only) for the owner to fill.
export function defaultKits() {
  const bbq = emptyKit("bbq-ride", "BBQ Ride");
  bbq.handle1 = "@bbqrideindia";
  bbq.handle2 = "@theceopilot";
  bbq.hashtag = "#bbqrideindia";
  bbq.whatsapp1 = "+91 81052 08810";
  bbq.whatsapp2 = "+91 74069 36974";
  const kop = emptyKit("the-kop", "THE KOP");
  return { "bbq-ride": bbq, "the-kop": kop };
}

function isPlainKit(k) {
  return (
    isObj(k) &&
    isStr(k.name) &&
    isObj(k.colors) &&
    isStr(k.colors.bg) &&
    isStr(k.colors.text) &&
    isStr(k.colors.accent)
  );
}

// Reads the saved kits. A missing key, invalid JSON, a wrong shape, or a
// storage that throws all fall back to the two presets (decision: never
// crash on a corrupt sos-brand-kits value) — merged field-by-field so a
// partially-corrupt single kit still keeps its good fields.
export function readKits(storage = safeLocalStorage()) {
  const defaults = defaultKits();
  if (!isObj(storage)) return defaults;
  let raw;
  try {
    raw = storage.getItem(KITS_KEY);
  } catch {
    return defaults;
  }
  if (!isStr(raw)) return defaults;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaults;
  }
  if (!isObj(parsed)) return defaults;
  const out = {};
  for (const id of Object.keys(defaults)) {
    out[id] = isPlainKit(parsed[id])
      ? { ...defaults[id], ...parsed[id], id, colors: { ...defaults[id].colors, ...parsed[id].colors } }
      : defaults[id];
  }
  for (const id of Object.keys(parsed)) {
    if (!out[id] && isPlainKit(parsed[id])) out[id] = { ...parsed[id], id };
  }
  return out;
}

export function writeKits(storage = safeLocalStorage(), kits) {
  if (!isObj(storage) || !isObj(kits)) return false;
  try {
    storage.setItem(KITS_KEY, JSON.stringify(kits));
    return true;
  } catch {
    return false;
  }
}

export function readActiveKitId(storage = safeLocalStorage()) {
  if (!isObj(storage)) return "bbq-ride";
  try {
    const id = storage.getItem(ACTIVE_KEY);
    return isStr(id) && id ? id : "bbq-ride";
  } catch {
    return "bbq-ride";
  }
}

export function writeActiveKitId(storage = safeLocalStorage(), id) {
  if (!isObj(storage) || !isStr(id)) return false;
  try {
    storage.setItem(ACTIVE_KEY, id);
    return true;
  } catch {
    return false;
  }
}

/* --------------------------- logo (IndexedDB) ---------------------------- */
// Reuses the app's existing IndexedDB asset store (assets/idb.js, one object
// store keyed by `id`) instead of opening a second database.

const LOGO_PREFIX = "poster-logo:";

export async function saveLogo(kitId, dataUrl) {
  await idbPut({ id: LOGO_PREFIX + kitId, dataUrl });
}

export async function loadLogoDataUrl(kitId) {
  try {
    const rec = await idbGet(LOGO_PREFIX + kitId);
    return rec && isStr(rec.dataUrl) ? rec.dataUrl : null;
  } catch {
    return null;
  }
}

// In-memory decoded-image cache (kitId -> HTMLImageElement | null | Promise),
// so drawPoster (synchronous) always has an already-decoded image to draw.
const logoImageCache = new Map();

export function getCachedLogoImage(kitId) {
  const v = logoImageCache.get(kitId);
  return v instanceof Promise ? null : v || null;
}

export async function ensureLogoImage(kitId) {
  // Slice P1: every poster draw (the PNG export in components/StudioCanvas.jsx
  // and the live preview) awaits this before drawing, so it is where the
  // poster's font faces are guaranteed loaded (see ensurePosterFonts above).
  await ensurePosterFonts();
  const existing = logoImageCache.get(kitId);
  if (existing !== undefined) return existing instanceof Promise ? existing : existing;
  const p = (async () => {
    const dataUrl = await loadLogoDataUrl(kitId);
    if (!dataUrl || typeof Image === "undefined") {
      logoImageCache.set(kitId, null);
      return null;
    }
    const img = await new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = dataUrl;
    });
    logoImageCache.set(kitId, img);
    return img;
  })();
  logoImageCache.set(kitId, p);
  return p;
}

export function invalidateLogoImage(kitId) {
  logoImageCache.delete(kitId);
}

/* =============================== templates =============================== */

export const TEMPLATES = Object.freeze({
  "franchise-hero": Object.freeze({ id: "franchise-hero", name: "Franchise Hero" }),
  "label-boxes": Object.freeze({ id: "label-boxes", name: "Label boxes" }),
});

export function defaultToggles() {
  return { logo: true, headline: true, subline: true, cta: true, footer: true };
}

export const MAX_LABELS = 6;

export function defaultLabel(i = 0) {
  return {
    text: "",
    style: "accent", // "accent" | "white"
    boxX: 20 + (i % 3) * 25,
    boxY: 30 + Math.floor(i / 3) * 20,
    tipX: 50,
    tipY: 55,
  };
}

/* ============================== aspect guard =============================== */
// Decision 1: PNG posters only at 4:5 (1080x1350) and 1:1 (1080x1080). Any
// other aspect ratio (not just other pixel size) is refused.

export const POSTER_SIZES = Object.freeze({
  "4:5": Object.freeze({ width: 1080, height: 1350 }),
  "1:1": Object.freeze({ width: 1080, height: 1080 }),
});

export const POSTER_ASPECT_MESSAGE = "Poster needs 4:5 or 1:1";

const ASPECT_EPS = 1e-3;

export function aspectKeyFor(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const ratio = width / height;
  if (Math.abs(ratio - 4 / 5) < ASPECT_EPS) return "4:5";
  if (Math.abs(ratio - 1) < ASPECT_EPS) return "1:1";
  return null;
}

export function posterAspectOk(width, height) {
  return aspectKeyFor(width, height) !== null;
}

/* ============================ percent -> pixel ============================ */

export function pct(dim, percent) {
  const n = Number(percent);
  return (Number.isFinite(n) ? n : 0) / 100 * dim;
}

/* ================================ text fitting ============================= */
// Shrinks an integer px font size until `text` fits maxWidth (down to
// minSize); never throws on an empty/zero-width ctx.measureText.

export function fitFontSize(ctx, text, maxWidth, { family, weight = "400", startSize, minSize = 10 }) {
  let size = Math.max(minSize, Math.round(startSize));
  const set = (s) => {
    ctx.font = `${weight} ${s}px "${family}"`;
  };
  set(size);
  if (!Number.isFinite(maxWidth) || maxWidth <= 0 || !text) return size;
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    set(size);
  }
  return size;
}

export function truncateToWidth(ctx, text, maxWidth) {
  if (!text) return "";
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return text;
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "…";
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = text.slice(0, mid) + ellipsis;
    if (ctx.measureText(candidate).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? text.slice(0, lo) + ellipsis : ellipsis;
}

/* ================================== drawing ================================ */

const FONT_HEAD = "Saira Stencil One";
const FONT_BODY = "Oswald";

// Owner click-test fix: canvas fillText with an unloaded @font-face silently
// falls back to a system font instead of waiting or throwing, and nothing in
// the DOM renders text in these two families to make the browser treat them
// as "needed" — so document.fonts.ready alone can resolve before either face
// has actually been fetched. Every exact (family, weight) pair drawPoster
// sets via ctx.font, for explicit document.fonts.load() calls before a draw
// that must be correct the first time (the live preview; see PosterPanel.jsx).
export const FONT_LOAD_SPECS = Object.freeze([
  `400 16px "${FONT_HEAD}"`,
  `400 16px "${FONT_BODY}"`,
  `500 16px "${FONT_BODY}"`,
  `600 16px "${FONT_BODY}"`,
]);

// Slice P1 (font race). The faces above are split into unicode-range subsets
// (latin, latin-ext, cyrillic, ...), and document.fonts.load(font) with no text
// only fetches the subset covering a space. Loading with this sample (printable
// ASCII, Latin-1 supplement, Latin Extended-A and the poster's punctuation)
// fetches every subset the poster text can use, so the awaited faces cover the
// headline, subline, handles, hashtag and WhatsApp numbers.
export const FONT_PRELOAD_TEXT = (() => {
  let t = "";
  for (let c = 0x20; c <= 0x7e; c += 1) t += String.fromCharCode(c);
  for (let c = 0xa0; c <= 0x17f; c += 1) t += String.fromCharCode(c);
  return t + "\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u20b9\u20ac";
})();

let posterFontsPromise = null;

// Resolves once every FONT_LOAD_SPECS face has been explicitly requested with
// FONT_PRELOAD_TEXT and fetched, and document.fonts.ready has settled. Nothing
// in the DOM renders these families, so document.fonts.ready alone can resolve
// before either is fetched (the old race: the first Poster-on export drew in a
// fallback font). Cached: later calls resolve immediately. A no-op where there
// is no document (the node tests).
export function ensurePosterFonts() {
  if (typeof document === "undefined" || !document.fonts || typeof document.fonts.load !== "function") {
    return Promise.resolve();
  }
  if (!posterFontsPromise) {
    posterFontsPromise = Promise.all(
      FONT_LOAD_SPECS.map((f) => document.fonts.load(f, FONT_PRELOAD_TEXT).catch(() => null))
    )
      .then(() => document.fonts.ready)
      .then(() => undefined);
  }
  return posterFontsPromise;
}

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

// A square badge (e.g. 180x180 at 1080 wide) so it reads the same shape at
// both poster sizes (both are 1080 wide) rather than a wide rectangular tab.
// Sized off width only (never height) so it stays square regardless of
// aspect. The logo is fitted inside with padding, aspect ratio kept.
export const LOGO_BADGE_SIZE_PCT = (180 / 1080) * 100;
const LOGO_BADGE_MARGIN_PCT = 4;
const LOGO_BADGE_RADIUS_PCT = 1.4;
const LOGO_BADGE_PAD_PCT = 1.2;

// Slice P1: with no logo loaded the slot is empty in the exported PNG (no white
// square). The live preview alone passes `logoPlaceholder: true` and gets a
// faint dashed rounded box with "Add logo" so the slot is still discoverable.
// With a logo loaded both draw the white badge and the fitted logo as before.
function drawLogoBadge(ctx, w, h, kit, logoImage, placeholder) {
  const size = pct(w, LOGO_BADGE_SIZE_PCT);
  const x = pct(w, LOGO_BADGE_MARGIN_PCT);
  const y = pct(w, LOGO_BADGE_MARGIN_PCT);
  const radius = pct(w, LOGO_BADGE_RADIUS_PCT);
  if (!logoImage) {
    if (!placeholder) return;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
    ctx.lineWidth = Math.max(1, pct(w, 0.25));
    ctx.setLineDash([pct(w, 1.1), pct(w, 0.8)]);
    roundRect(ctx, x, y, size, size, radius);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `500 ${pct(w, 1.6)}px "${FONT_BODY}"`;
    ctx.fillText("Add logo", x + size / 2, y + size / 2);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, x, y, size, size, radius);
  ctx.fill();
  if (logoImage.width > 0 && logoImage.height > 0) {
    const pad = pct(w, LOGO_BADGE_PAD_PCT);
    const avail = size - pad * 2;
    const scale = Math.min(avail / logoImage.width, avail / logoImage.height);
    const iw = logoImage.width * scale;
    const ih = logoImage.height * scale;
    ctx.drawImage(logoImage, x + (size - iw) / 2, y + (size - ih) / 2, iw, ih);
  }
  ctx.restore();
}

function drawFooterBar(ctx, w, h, kit) {
  const barH = pct(h, 6);
  const y = h - barH;
  const pad = pct(w, 4);
  ctx.save();
  ctx.fillStyle = kit.colors.bg;
  ctx.fillRect(0, y, w, barH);
  ctx.fillStyle = kit.colors.text;
  ctx.textBaseline = "middle";

  ctx.textAlign = "left";
  const leftMax = pct(w, 44);
  const leftSize = fitFontSize(ctx, kit.hashtag || "", leftMax, {
    family: FONT_BODY,
    weight: "500",
    startSize: pct(h, 2.2),
    minSize: 12,
  });
  ctx.font = `500 ${leftSize}px "${FONT_BODY}"`;
  ctx.fillText(truncateToWidth(ctx, kit.hashtag || "", leftMax), pad, y + barH / 2);

  const right = [kit.handle1, kit.handle2].filter(Boolean).join("  ·  ");
  ctx.textAlign = "right";
  const rightMax = pct(w, 48);
  const rightSize = fitFontSize(ctx, right, rightMax, {
    family: FONT_BODY,
    weight: "400",
    startSize: pct(h, 1.9),
    minSize: 11,
  });
  ctx.font = `400 ${rightSize}px "${FONT_BODY}"`;
  ctx.fillText(truncateToWidth(ctx, right, rightMax), w - pad, y + barH / 2);
  ctx.restore();
}

function drawHeadline(ctx, w, h, headline1, headline2, subline, kit) {
  const rightPad = pct(w, 5);
  const maxW = pct(w, 56);
  ctx.save();
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  let y = pct(h, 6);

  if (headline1) {
    const s1 = fitFontSize(ctx, headline1, maxW, {
      family: FONT_HEAD,
      startSize: pct(h, 5.2),
      minSize: 20,
    });
    ctx.font = `400 ${s1}px "${FONT_HEAD}"`;
    ctx.fillStyle = kit.colors.text;
    ctx.fillText(truncateToWidth(ctx, headline1, maxW), w - rightPad, y);
    y += s1 * 1.08;
  }
  if (headline2) {
    const s2 = fitFontSize(ctx, headline2, maxW, {
      family: FONT_HEAD,
      startSize: pct(h, 7.6),
      minSize: 24,
    });
    ctx.font = `400 ${s2}px "${FONT_HEAD}"`;
    ctx.fillStyle = kit.colors.accent;
    ctx.fillText(truncateToWidth(ctx, headline2, maxW), w - rightPad, y);
    y += s2 * 1.08;
  }
  if (subline) {
    const upper = subline.toUpperCase();
    const s3 = fitFontSize(ctx, upper, maxW, {
      family: FONT_BODY,
      weight: "500",
      startSize: pct(h, 2.1),
      minSize: 12,
    });
    ctx.font = `500 ${s3}px "${FONT_BODY}"`;
    ctx.fillStyle = "#CCCCCC";
    ctx.fillText(truncateToWidth(ctx, upper, maxW), w - rightPad, y + pct(h, 0.8));
  }
  ctx.restore();
}

function drawCtaBar(ctx, w, h, kit) {
  const barH = pct(h, 6.5);
  const barW = pct(w, 78);
  const x = (w - barW) / 2;
  const y = h - pct(h, 15);
  ctx.save();
  ctx.fillStyle = kit.colors.accent;
  roundRect(ctx, x, y, barW, barH, barH / 2);
  ctx.fill();

  const nums = [kit.whatsapp1, kit.whatsapp2].filter(Boolean).join("   |   ");
  const text = nums ? `WHATSAPP   ${nums}` : "WHATSAPP";
  const maxW = barW - pct(w, 6);
  const size = fitFontSize(ctx, text, maxW, {
    family: FONT_BODY,
    weight: "600",
    startSize: pct(h, 2.3),
    minSize: 14,
  });
  ctx.font = `600 ${size}px "${FONT_BODY}"`;
  ctx.fillStyle = "#141414";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(truncateToWidth(ctx, text, maxW), x + barW / 2, y + barH / 2 + pct(h, 0.15));
  ctx.restore();
}

function drawLabel(ctx, w, h, label, kit) {
  if (!label || !label.text) return;
  const boxX = pct(w, label.boxX);
  const boxY = pct(h, label.boxY);
  const tipX = pct(w, label.tipX);
  const tipY = pct(h, label.tipY);
  const padX = pct(w, 1.6);
  const padY = pct(h, 1);

  const fontSize = fitFontSize(ctx, label.text, pct(w, 34), {
    family: FONT_BODY,
    weight: "500",
    startSize: pct(h, 2),
    minSize: 12,
  });
  ctx.font = `500 ${fontSize}px "${FONT_BODY}"`;
  const textW = ctx.measureText(label.text).width;
  const boxW = textW + padX * 2;
  const boxH = fontSize + padY * 2;
  const x = boxX - boxW / 2;
  const y = boxY - boxH / 2;

  ctx.save();
  ctx.strokeStyle = kit.colors.accent;
  ctx.lineWidth = Math.max(1.5, pct(h, 0.14));
  ctx.beginPath();
  ctx.moveTo(boxX, boxY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(tipX, tipY, Math.max(3, pct(h, 0.3)), 0, Math.PI * 2);
  ctx.fillStyle = kit.colors.accent;
  ctx.fill();

  const white = label.style === "white";
  ctx.fillStyle = white ? "#FFFFFF" : kit.colors.accent;
  roundRect(ctx, x, y, boxW, boxH, Math.min(boxH / 2, pct(h, 0.8)));
  ctx.fill();
  ctx.fillStyle = "#141414";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label.text, boxX, boxY + pct(h, 0.1));
  ctx.restore();
}

// The one draw function shared by the live preview and the PNG export.
// `spec`:
//   { templateId, kit, toggles, headline1, headline2, subline, labels,
//     logoImage, logoPlaceholder }   (logoPlaceholder: the live preview only)
// Never throws: missing fields simply draw nothing for that element.
export function drawPoster(ctx, w, h, spec) {
  if (!ctx || !(w > 0) || !(h > 0) || !spec) return;
  const kit = isObj(spec.kit) ? spec.kit : defaultKits()["bbq-ride"];
  const templateId = spec.templateId === "label-boxes" ? "label-boxes" : "franchise-hero";
  const toggles = isObj(spec.toggles) ? spec.toggles : defaultToggles();

  if (templateId === "franchise-hero") {
    if (toggles.logo !== false) drawLogoBadge(ctx, w, h, kit, spec.logoImage || null, spec.logoPlaceholder === true);
    if (toggles.headline !== false || toggles.subline !== false) {
      drawHeadline(
        ctx,
        w,
        h,
        toggles.headline !== false ? spec.headline1 : "",
        toggles.headline !== false ? spec.headline2 : "",
        toggles.subline !== false ? spec.subline : "",
        kit
      );
    }
    if (toggles.cta !== false) drawCtaBar(ctx, w, h, kit);
    if (toggles.footer !== false) drawFooterBar(ctx, w, h, kit);
  } else {
    if (toggles.logo !== false) drawLogoBadge(ctx, w, h, kit, spec.logoImage || null, spec.logoPlaceholder === true);
    if (toggles.footer !== false) drawFooterBar(ctx, w, h, kit);
    const labels = Array.isArray(spec.labels) ? spec.labels.slice(0, MAX_LABELS) : [];
    for (const label of labels) drawLabel(ctx, w, h, label, kit);
  }
}

/* ============================== live poster state ============================
   The pattern of garage/measure.js's createMeasureState(): a factory (for
   isolated tests) plus one shared module instance the app uses. Session-only
   (never persisted) except kitId, which mirrors the persisted active kit. */

// Owner click-test fix: a first-time Franchise Hero + BBQ Ride export had no
// headline/subline (the fields simply start blank), so the exported poster
// looked broken. Auto-fills these three fields with the BBQ Ride starter copy
// the moment that template+kit combo is reached, but ONLY while the owner has
// never touched any of the three fields (textTouched below) — the instant any
// of setHeadline1/setHeadline2/setSubline is called, even to clear a field to
// "", textTouched latches true forever and this prefill never fires again, so
// owner text is never overwritten.
export const FRANCHISE_HERO_BBQ_DEFAULTS = Object.freeze({
  headline1: "OWN THE",
  headline2: "FIRE.",
  subline: "INDIA'S FIRST BBQ BIKE · FRANCHISE ENQUIRIES OPEN",
});

function withFranchiseDefaults(next) {
  if (next.templateId === "franchise-hero" && next.kitId === "bbq-ride" && !next.textTouched) {
    return { ...next, ...FRANCHISE_HERO_BBQ_DEFAULTS };
  }
  return next;
}

export function createPosterState({ storage = safeLocalStorage() } = {}) {
  let snapshot = Object.freeze(
    withFranchiseDefaults({
      enabled: false,
      templateId: "franchise-hero",
      toggles: defaultToggles(),
      headline1: "",
      headline2: "",
      subline: "",
      textTouched: false,
      labels: [],
      kitId: readActiveKitId(storage),
    })
  );
  const listeners = new Set();
  const notify = () => {
    for (const fn of Array.from(listeners)) fn();
  };
  const set = (patch) => {
    snapshot = Object.freeze(withFranchiseDefaults({ ...snapshot, ...patch }));
    notify();
  };
  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot: () => snapshot,
    setEnabled: (v) => set({ enabled: !!v }),
    setTemplateId: (id) => set({ templateId: id === "label-boxes" ? "label-boxes" : "franchise-hero" }),
    setToggle: (key, v) => set({ toggles: { ...snapshot.toggles, [key]: !!v } }),
    setHeadline1: (s) => set({ headline1: String(s ?? ""), textTouched: true }),
    setHeadline2: (s) => set({ headline2: String(s ?? ""), textTouched: true }),
    setSubline: (s) => set({ subline: String(s ?? ""), textTouched: true }),
    setLabels: (labels) => set({ labels: Array.isArray(labels) ? labels.slice(0, MAX_LABELS) : [] }),
    addLabel: () => {
      if (snapshot.labels.length >= MAX_LABELS) return false;
      set({ labels: [...snapshot.labels, defaultLabel(snapshot.labels.length)] });
      return true;
    },
    removeLabel: (i) => set({ labels: snapshot.labels.filter((_, idx) => idx !== i) }),
    updateLabel: (i, patch) =>
      set({ labels: snapshot.labels.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }),
    setKitId: (id) => {
      writeActiveKitId(storage, id);
      set({ kitId: id });
    },
  };
}

export const posterState = createPosterState();

// Assembles the full drawPoster spec from the live poster state + the active
// kit's saved text/colours + its cached (already-decoded) logo image, or null
// while the poster is off. Reads a synchronously-cached logo only — never
// awaits — so it is always safe to call from the export's synchronous task.
export function getPosterSpec(storage = safeLocalStorage()) {
  const s = posterState.getSnapshot();
  if (!s.enabled) return null;
  const kits = readKits(storage);
  const kit = kits[s.kitId] || kits["bbq-ride"];
  return {
    templateId: s.templateId,
    kit,
    toggles: s.toggles,
    headline1: s.headline1,
    headline2: s.headline2,
    subline: s.subline,
    labels: s.labels,
    logoImage: getCachedLogoImage(s.kitId),
  };
}
