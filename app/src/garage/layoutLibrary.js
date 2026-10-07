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
   live model, so it is also testable without a stage.

   Garage G7b — formatVersion 2 adds `objects`, one entry per added object:
   { assetId, source ("builtin" | "imported"), name, transform: { x, y, z,
   rx, ry, rz, s }, hidden }. `layout` stays exactly as in format 1 (the main
   product's per-part edits only). Owner decisions recorded here:
   - Decision 1: every save writes formatVersion 2.
   - Decision 3: an object whose asset is not in this browser is skipped and
     counted (resolveLoad's injected `assetExistsFn(assetId)`).
   - Decision 4: more than OBJECT_LIMITS.MAX_ADDED objects refuses the whole
     load before anything is loaded; loadBudgetStep() is the running
     triangle check the stage applies while it loads the objects one by one.
   - Decision 5: formatVersion 1 envelopes still parse and resolve exactly as
     in G8 (resolved.objects is null: added objects are left untouched).
   A formatVersion 2 envelope without an `objects` array is "bad-version". */

import { validateLayout, serializeLayout, LAYOUT_LIMITS } from "./layout.js";
import { OBJECT_LIMITS, checkBudget, countObjects } from "./sceneObjects.js";

export const ENVELOPE_KIND = "sos-garage-layout";
export const ENVELOPE_FORMAT_VERSION = 2;
export const MAX_NAME = 60;
export const MAX_UPLOAD_BYTES = 1024 * 1024;
// Parse ceiling for `objects` (a layout can never hold more items than this);
// the owner's max-5 rule is applied by resolveLoad, so 6 still parses and is
// then refused with its own message.
export const MAX_ENVELOPE_OBJECTS = LAYOUT_LIMITS.MAX_ITEMS - 1;
export const MAX_OBJECT_NAME = 120;
export const OBJECT_SOURCES = Object.freeze(["builtin", "imported"]);

const isObj = (o) => typeof o === "object" && o !== null && !Array.isArray(o);
const isStr = (s) => typeof s === "string";
const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const TRANSFORM_KEYS = ["x", "y", "z", "rx", "ry", "rz", "s"];
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

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

// Garage G7b — one saved object, strictly: every field present and valid, or
// null (a malformed object makes the whole envelope invalid, never half-read).
// The transform goes through layout.js's own cleaning (scale >= 0.05).
export function cleanObject(raw) {
  if (!isObj(raw)) return null;
  const { assetId, source, name, transform, hidden } = raw;
  if (!isStr(assetId) || assetId === "" || assetId.length > LAYOUT_LIMITS.MAX_ID) return null;
  if (!OBJECT_SOURCES.includes(source)) return null;
  if (!isStr(name)) return null;
  if (typeof hidden !== "boolean") return null;
  if (!isObj(transform) || !TRANSFORM_KEYS.every((k) => isNum(transform[k]))) return null;
  const t = {};
  for (const k of TRANSFORM_KEYS) t[k] = transform[k];
  const v = validateLayout({ version: 1, name: "x", items: [{ itemId: "o", assetId, transform: t }] });
  if (!v.ok || v.layout.items.length !== 1) return null;
  const cleanName = name.trim().slice(0, MAX_OBJECT_NAME) || assetId;
  return { assetId, source, name: cleanName, transform: v.layout.items[0].transform, hidden };
}

// The added (non-primary) items of a live layout as saved objects.
// describeAsset(assetId) -> { source, name } | null (the app looks the asset
// up in the live registry); a missing or failing lookup saves it as a
// built-in named by its id.
function objectsOfLayout(layout, describeAsset) {
  const out = [];
  for (const it of layout.items) {
    if (it.primary) continue;
    let d;
    try {
      d = typeof describeAsset === "function" ? describeAsset(it.assetId) : null;
    } catch {
      d = null;
    }
    const o = cleanObject({
      assetId: it.assetId,
      source: d && OBJECT_SOURCES.includes(d.source) ? d.source : "builtin",
      name: d && isStr(d.name) && d.name.trim() ? d.name : it.assetId,
      transform: it.transform,
      hidden: it.hidden === true,
    });
    if (!o) return null;
    out.push(o);
  }
  return out;
}

// Builds a fresh, validated formatVersion 2 envelope from a live layout (as
// garageStore's getLayout() returns it). `layout` keeps only the primary
// item's part edits; every other item becomes an entry of `objects`. Never
// aliases the input.
export function buildEnvelope({ productId, name, layout, savedAt, describeAsset }) {
  if (!isStr(productId) || productId === "") return { ok: false, reason: "bad-product" };
  const cleanName = cleanLayoutName(name);
  if (!cleanName) return { ok: false, reason: "bad-name" };
  if (!isObj(layout) || !Array.isArray(layout.items)) return { ok: false, reason: "bad-layout" };
  const primary = layout.items.find((i) => isObj(i) && i.primary) || layout.items[0];
  if (!isObj(primary)) return { ok: false, reason: "bad-layout" };
  const mainOnly = { ...layout, items: [primary], frontRef: primary.itemId };
  const v = validateLayout(partsOnlyLayout(mainOnly));
  if (!v.ok) return { ok: false, reason: "invalid-layout", errors: v.errors };
  const objects = objectsOfLayout(layout, describeAsset);
  if (!objects) return { ok: false, reason: "bad-objects" };
  return {
    ok: true,
    envelope: {
      kind: ENVELOPE_KIND,
      formatVersion: ENVELOPE_FORMAT_VERSION,
      productId,
      name: cleanName,
      savedAt: isStr(savedAt) ? savedAt : new Date().toISOString(),
      layout: v.layout,
      objects,
    },
  };
}

// Validates an envelope's shape and its inner layout. Does NOT compare the
// productId against any "current" product — see resolveLoad for that.
// formatVersion 1 (G8) and 2 (G7b) both parse; the result keeps its version.
export function parseEnvelope(raw) {
  if (!isObj(raw)) return { ok: false, reason: "bad-envelope" };
  if (raw.kind !== ENVELOPE_KIND) return { ok: false, reason: "bad-kind" };
  const version = raw.formatVersion;
  if (version !== 1 && version !== 2) return { ok: false, reason: "bad-version" };
  if (version === 2 && !Array.isArray(raw.objects)) return { ok: false, reason: "bad-version" };
  if (!isStr(raw.productId) || raw.productId === "") return { ok: false, reason: "bad-product" };
  const name = cleanLayoutName(raw.name);
  if (!name) return { ok: false, reason: "bad-name" };
  if (!isStr(raw.savedAt) || raw.savedAt === "") return { ok: false, reason: "bad-savedAt" };
  const v = validateLayout(raw.layout);
  if (!v.ok) return { ok: false, reason: "invalid-layout", errors: v.errors };
  const envelope = {
    kind: ENVELOPE_KIND,
    formatVersion: version,
    productId: raw.productId,
    name,
    savedAt: raw.savedAt,
    layout: v.layout,
  };
  if (version === 2) {
    if (raw.objects.length > MAX_ENVELOPE_OBJECTS) return { ok: false, reason: "bad-objects" };
    const objects = [];
    for (const o of raw.objects) {
      const c = cleanObject(o);
      if (!c) return { ok: false, reason: "bad-objects" };
      objects.push(c);
    }
    envelope.objects = objects;
  }
  return { ok: true, envelope };
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
// the inner layout (and, format 2, the objects) so upload/download
// round-trips exactly.
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
    if (envelope.formatVersion === 2) {
      const objectsText = serializeLayout(envelope.objects);
      if (objectsText === null || !Array.isArray(envelope.objects)) return null;
      out.objects = JSON.parse(objectsText);
    }
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
export function saveLayout(storage, { productId, name, layout, overwrite = false, savedAt, describeAsset } = {}) {
  if (!isObj(storage)) return { ok: false, reason: "bad-storage" };
  const built = buildEnvelope({ productId, name, layout, savedAt, describeAsset });
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
// Garage G7b — for formatVersion 2 the object count is checked next (more
// than OBJECT_LIMITS.MAX_ADDED refuses the whole load, reason "max-objects",
// before anything is loaded), then assetExistsFn(assetId) splits the objects
// into kept ones and skipped ones ({ assetId, name, reason: "missing" }).
// Format 1 resolves with objects: null (added objects are left untouched).
export function resolveLoad(envelopeRaw, expectedProductId, existsFn, assetExistsFn) {
  const parsed = parseEnvelope(envelopeRaw);
  if (!parsed.ok) return { ok: false, reason: "invalid" };
  const env = parsed.envelope;
  if (!isStr(expectedProductId) || expectedProductId === "") return { ok: false, reason: "no-product" };
  if (env.productId !== expectedProductId) return { ok: false, reason: "wrong-product", productId: env.productId };
  // Slice P2: props have their own cap and do not count as added objects.
  if (env.formatVersion === 2) {
    const n = countObjects(env.objects);
    if (n.objects > OBJECT_LIMITS.MAX_ADDED) {
      return { ok: false, reason: "max-objects", count: n.objects, message: maxObjectsMessage(n.objects) };
    }
    if (n.props > OBJECT_LIMITS.MAX_PROPS) {
      return { ok: false, reason: "max-props", count: n.props, message: `Refused: this layout has ${n.props} props; the maximum is ${OBJECT_LIMITS.MAX_PROPS}. Nothing was changed.` };
    }
  }
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
  const out = {
    ok: true,
    formatVersion: env.formatVersion,
    name: env.name,
    itemId: item.itemId,
    parts,
    total: ids.length,
    matched: ids.length - skipped,
    skipped,
    objects: null,
    objectsTotal: 0,
    skippedObjects: [],
  };
  if (env.formatVersion === 2) {
    const has = typeof assetExistsFn === "function" ? assetExistsFn : () => true;
    out.objects = [];
    out.objectsTotal = env.objects.length;
    for (const o of env.objects) {
      let ok;
      try {
        ok = has(o.assetId) === true;
      } catch {
        ok = false;
      }
      if (ok) out.objects.push(o);
      else out.skippedObjects.push({ assetId: o.assetId, name: o.name, reason: "missing" });
    }
  }
  return out;
}

/* ---- load limits and messages (pure; the stage and the rail share them) ---- */

export function maxObjectsMessage(count) {
  return `Refused: this layout has ${count} added objects; the maximum is ${OBJECT_LIMITS.MAX_ADDED}. Nothing was changed.`;
}

// One step of the running triangle check while a layout's objects load one by
// one (Owner decision 4): `running` is the main product's visible triangles
// plus every object loaded so far; `objectTriangles` the next object's. Over
// OBJECT_LIMITS.MAX_TRIANGLES refuses the whole load (exactly the limit is
// allowed). { ok:true, total } | { ok:false, reason, total, message }.
export function loadBudgetStep(running, objectTriangles) {
  const r = checkBudget(running, objectTriangles, "Loading");
  if (r.ok) return { ok: true, total: r.total };
  if (r.reason !== "over-budget") return { ok: false, reason: r.reason, message: "Could not count the triangles; nothing was changed." };
  return {
    ok: false,
    reason: "over-budget",
    total: r.total,
    message: `Refused: loading this layout would make the scene at least ${fmt(r.total)} triangles, over the ${fmt(OBJECT_LIMITS.MAX_TRIANGLES)} limit. Nothing was changed.`,
  };
}

const SKIP_REASONS = {
  missing: "not in this browser's Asset Library",
  "load-failed": "could not be loaded",
  empty: "has nothing to show",
};

// The rail's line after a successful load. skippedObjects: [{ name, reason }].
export function loadResultMessage({ name, partsSkipped = 0, skippedObjects = [] } = {}) {
  const bits = [];
  if (partsSkipped > 0) bits.push(`${partsSkipped} part${partsSkipped === 1 ? "" : "s"} skipped`);
  if (skippedObjects.length > 0) {
    const n = skippedObjects.length;
    const why = skippedObjects.map((o) => `${o.name}: ${SKIP_REASONS[o.reason] || "skipped"}`).join("; ");
    bits.push(`${n} object${n === 1 ? "" : "s"} skipped (${why})`);
  }
  return bits.length ? `Loaded "${name}" — ${bits.join(", ")}.` : `Loaded "${name}".`;
}
