/* Garage G8 — named layouts: envelope build/parse and per-product storage.
   ---------------------------------------------------------------------------
   Pure JS. No three.js, no DOM, no direct localStorage access — every storage
   call goes through an injected `storage` object ({ getItem, setItem,
   removeItem }, the same shape as window.localStorage) so node tests can pass
   a mock and the app can pass the real thing. Nothing here throws.

   Envelope: { kind, formatVersion, productId, name, savedAt, layout }, where
   `layout` is a layout.js-validated layout holding ONLY per-part edits
   (Owner decision 1): each item's whole-model transform and whole-item
   hidden flag are reset before validation, so a save can never carry the
   old whole-model transform panel or the Materials panel into a layout.

   Storage key: "sos-garage-layouts:<productId>", one JSON array of envelopes
   per product (Owner decision 2). resolveLoad() is the pure decision logic
   behind Owner decisions 3 and 4 (wrong-product refusal, missing-parts
   count) — it takes an injected `existsFn(partId)` instead of touching the
   live model, so it is also testable without a stage. */

import { validateLayout, serializeLayout, LAYOUT_LIMITS } from "./layout.js";

export const ENVELOPE_KIND = "sos-garage-layout";
export const ENVELOPE_FORMAT_VERSION = 1;
export const MAX_NAME = 60;
export const MAX_UPLOAD_BYTES = 1024 * 1024;

const isObj = (o) => typeof o === "object" && o !== null && !Array.isArray(o);
const isStr = (s) => typeof s === "string";

export function keyForProduct(productId) {
  return `sos-garage-layouts:${productId}`;
}

// Trimmed, capped at MAX_NAME; null when nothing usable remains.
export function cleanLayoutName(raw) {
  if (!isStr(raw)) return null;
  const s = raw.trim();
  if (s.length === 0) return null;
  return s.length > MAX_NAME ? s.slice(0, MAX_NAME) : s;
}

// Strips the whole-model transform and whole-item hidden flag from every
// item, leaving only the parts map (move/rotate/scale/hide/colour overrides).
export function partsOnlyLayout(layout) {
  return {
    ...layout,
    items: layout.items.map((it) => ({
      ...it,
      hidden: false,
      transform: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 },
    })),
  };
}

// Builds a fresh, validated envelope from a live layout (as garageStore's
// getLayout() returns it). Never aliases the input.
export function buildEnvelope({ productId, name, layout, savedAt }) {
  if (!isStr(productId) || productId === "") return { ok: false, reason: "bad-product" };
  const cleanName = cleanLayoutName(name);
  if (!cleanName) return { ok: false, reason: "bad-name" };
  if (!isObj(layout)) return { ok: false, reason: "bad-layout" };
  const v = validateLayout(partsOnlyLayout(layout));
  if (!v.ok) return { ok: false, reason: "invalid-layout", errors: v.errors };
  return {
    ok: true,
    envelope: {
      kind: ENVELOPE_KIND,
      formatVersion: ENVELOPE_FORMAT_VERSION,
      productId,
      name: cleanName,
      savedAt: isStr(savedAt) ? savedAt : new Date().toISOString(),
      layout: v.layout,
    },
  };
}

// Validates an envelope's shape and its inner layout. Does NOT compare the
// productId against any "current" product — see resolveLoad for that.
export function parseEnvelope(raw) {
  if (!isObj(raw)) return { ok: false, reason: "bad-envelope" };
  if (raw.kind !== ENVELOPE_KIND) return { ok: false, reason: "bad-kind" };
  if (raw.formatVersion !== ENVELOPE_FORMAT_VERSION) return { ok: false, reason: "bad-version" };
  if (!isStr(raw.productId) || raw.productId === "") return { ok: false, reason: "bad-product" };
  const name = cleanLayoutName(raw.name);
  if (!name) return { ok: false, reason: "bad-name" };
  if (!isStr(raw.savedAt) || raw.savedAt === "") return { ok: false, reason: "bad-savedAt" };
  const v = validateLayout(raw.layout);
  if (!v.ok) return { ok: false, reason: "invalid-layout", errors: v.errors };
  return {
    ok: true,
    envelope: {
      kind: ENVELOPE_KIND,
      formatVersion: ENVELOPE_FORMAT_VERSION,
      productId: raw.productId,
      name,
      savedAt: raw.savedAt,
      layout: v.layout,
    },
  };
}

export function parseEnvelopeJson(text) {
  if (typeof text !== "string") return { ok: false, reason: "bad-json" };
  if (text.length > LAYOUT_LIMITS.MAX_JSON_CHARS) return { ok: false, reason: "too-large" };
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: "bad-json" };
  }
  return parseEnvelope(raw);
}

// Deterministic (sorted-key) pretty JSON, reusing layout.js's own writer for
// the inner layout so upload/download round-trips exactly.
export function serializeEnvelope(envelope) {
  try {
    const layoutText = serializeLayout(envelope.layout);
    if (layoutText === null) return null;
    const out = {
      kind: envelope.kind,
      formatVersion: envelope.formatVersion,
      productId: envelope.productId,
      name: envelope.name,
      savedAt: envelope.savedAt,
      layout: JSON.parse(layoutText),
    };
    return JSON.stringify(out, null, 2);
  } catch {
    return null;
  }
}

/* ---- per-product storage (injected) ---- */

function readList(storage, productId) {
  try {
    const raw = storage.getItem(keyForProduct(productId));
    if (!isStr(raw)) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out = [];
    for (const e of parsed) {
      const r = parseEnvelope(e);
      if (r.ok && r.envelope.productId === productId) out.push(r.envelope);
    }
    return out;
  } catch {
    return [];
  }
}

function writeList(storage, productId, list) {
  try {
    storage.setItem(keyForProduct(productId), JSON.stringify(list));
    return { ok: true };
  } catch {
    return { ok: false, reason: "storage-error" };
  }
}

// Newest first.
export function listLayouts(storage, productId) {
  if (!isObj(storage) || !isStr(productId) || productId === "") return [];
  return readList(storage, productId).sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0));
}

export function findLayout(storage, productId, name) {
  if (!isObj(storage) || !isStr(productId) || !isStr(name)) return null;
  return readList(storage, productId).find((e) => e.name === name) || null;
}

// { ok:false, reason:"exists", existing } when a same-named layout is already
// there and overwrite !== true — the caller shows "Overwrite?" and calls
// again with overwrite:true (Owner decision 6).
export function saveLayout(storage, { productId, name, layout, overwrite = false, savedAt } = {}) {
  if (!isObj(storage)) return { ok: false, reason: "bad-storage" };
  const built = buildEnvelope({ productId, name, layout, savedAt });
  if (!built.ok) return built;
  const list = readList(storage, productId);
  const idx = list.findIndex((e) => e.name === built.envelope.name);
  if (idx >= 0 && overwrite !== true) return { ok: false, reason: "exists", existing: list[idx] };
  const nextList = list.slice();
  if (idx >= 0) nextList[idx] = built.envelope;
  else nextList.push(built.envelope);
  const w = writeList(storage, productId, nextList);
  if (!w.ok) return w;
  return { ok: true, envelope: built.envelope };
}

export function deleteLayout(storage, productId, name) {
  if (!isObj(storage) || !isStr(productId) || !isStr(name)) return { ok: false, reason: "bad-input" };
  const list = readList(storage, productId);
  const next = list.filter((e) => e.name !== name);
  if (next.length === list.length) return { ok: true, changed: false };
  const w = writeList(storage, productId, next);
  if (!w.ok) return w;
  return { ok: true, changed: true };
}

/* ---- load resolution (pure; existsFn is injected so this needs no stage) ---- */

// existsFn(partId) -> boolean: whether the CURRENT model still has that part
// (the app passes id => garageMode.describePart(id) !== null).
// Refuses (ok:false, reason:"wrong-product") without looking at existsFn at
// all when the envelope's productId does not match — nothing is ever applied
// in that case (Owner decision 3). Otherwise every saved part id is checked;
// matching ones are kept, the rest are dropped and counted (Owner decision 4).
export function resolveLoad(envelopeRaw, expectedProductId, existsFn) {
  const parsed = parseEnvelope(envelopeRaw);
  if (!parsed.ok) return { ok: false, reason: "invalid" };
  const env = parsed.envelope;
  if (!isStr(expectedProductId) || expectedProductId === "") return { ok: false, reason: "no-product" };
  if (env.productId !== expectedProductId) return { ok: false, reason: "wrong-product", productId: env.productId };
  const item = env.layout.items[0];
  const check = typeof existsFn === "function" ? existsFn : () => true;
  const ids = Object.keys(item.parts);
  const parts = {};
  let skipped = 0;
  for (const id of ids) {
    let ok;
    try {
      ok = check(id) === true;
    } catch {
      ok = false;
    }
    if (ok) parts[id] = item.parts[id];
    else skipped += 1;
  }
  return {
    ok: true,
    name: env.name,
    itemId: item.itemId,
    parts,
    total: ids.length,
    matched: ids.length - skipped,
    skipped,
  };
}
