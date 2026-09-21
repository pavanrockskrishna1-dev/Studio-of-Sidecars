/* Garage G1 — the saved layout: validation and stable serialisation.
   ---------------------------------------------------------------------------
   Pure JS, no imports: no three.js, no DOM, no clock. validateLayout never
   throws for any input; it returns a brand new object graph (no aliasing with
   the raw value) and drops every unknown field, including the keys
   "__proto__", "constructor" and "prototype".

   {
     version: 1, name,
     items: [ { itemId, assetId, primary, hidden,
                transform: { x, y, z, rx, ry, rz, s },   // whole-model transform
                splits: [partId],
                parts: { partId: { fp?, pos?, quat?, scale?, visible?,
                                   material?: { color?, roughness?, metalness?,
                                                opacity?, ignoreVertexColors? } } } } ],
     frontRef
   }

   Owner decisions recorded here:
   - Decision 4: with several objects the FRONT object defaults to the first
     one (frontRef falls back to the first item's id).
   - Decision 5: layouts live in the browser plus a downloadable .json backup;
     serializeLayout and parseLayoutJson are the two ends of that backup.
   - Decision 6: material.ignoreVertexColors lets one part ignore a model's
     baked vertex colours (the design report called it "flat").
   Whole-model clamps (measured in the app): position and rotation have NO
   clamp, they only have to be finite numbers; the scale is at least 0.05. */

export const LAYOUT_LIMITS = Object.freeze({
  MAX_ITEMS: 20,
  MAX_PARTS_PER_ITEM: 2000,
  MAX_SPLITS_PER_ITEM: 200,
  MAX_NAME: 60,
  MAX_ID: 200,
  MIN_SCALE: 0.05,
  MAX_JSON_CHARS: 2000000,
});

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const TRANSFORM_KEYS = ["x", "y", "z", "rx", "ry", "rz", "s"];
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const isObj = (o) => typeof o === "object" && o !== null && !Array.isArray(o);
const own = (o, k) => (isObj(o) && !FORBIDDEN_KEYS.has(k) && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
const clamp01 = (n) => Math.min(1, Math.max(0, n));
const fix0 = (n) => (n === 0 ? 0 : n);

// Truncate to a cap without leaving half of a surrogate pair at the end.
function cap(str, max) {
  if (str.length <= max) return str;
  let s = str.slice(0, max);
  const last = s.charCodeAt(s.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) s = s.slice(0, -1);
  return s;
}

// Private copy of the part-id grammar in partId.js (modules have no imports;
// the test script checks that the two agree).
function partIdOk(id, allowComponent) {
  if (typeof id !== "string" || id === "" || id.length > LAYOUT_LIMITS.MAX_ID) return false;
  let body = id;
  const cm = /^(.*~\d+)#c(\d+)$/.exec(id);
  if (cm) {
    if (!allowComponent || !Number.isSafeInteger(Number(cm[2]))) return false;
    body = cm[1];
  }
  for (const seg of body.split("/")) {
    const m = /^(.*)~(\d+)$/.exec(seg);
    if (!m || m[1] === "" || !Number.isSafeInteger(Number(m[2])) || /[\s[\].:]/.test(m[1])) return false;
  }
  return true;
}

const numList = (v, n) => Array.isArray(v) && v.length === n && v.every(isNum);

function cleanFingerprint(raw, warn) {
  const bb = own(raw, "bb");
  const v = own(raw, "v");
  const t = own(raw, "t");
  const m = own(raw, "m");
  if (!Number.isSafeInteger(v) || v < 0 || !Number.isSafeInteger(t) || t < 0 || !numList(bb, 6) || typeof m !== "string") {
    warn("fp is not a valid fingerprint and was dropped");
    return undefined;
  }
  return { v, t, bb: bb.map(fix0), m: cap(m, LAYOUT_LIMITS.MAX_ID) };
}

function cleanMaterial(raw, warn) {
  if (!isObj(raw)) {
    warn("material is not an object and was dropped");
    return undefined;
  }
  const out = {};
  const color = own(raw, "color");
  if (color !== undefined) {
    if (typeof color === "string" && COLOR_RE.test(color)) out.color = color.toLowerCase();
    else warn("material.color must be #rrggbb and was dropped");
  }
  for (const k of ["roughness", "metalness", "opacity"]) {
    const v = own(raw, k);
    if (v === undefined) continue;
    if (!isNum(v)) {
      warn(`material.${k} is not a finite number and was dropped`);
      continue;
    }
    out[k] = fix0(clamp01(v));
    if (out[k] !== v) warn(`material.${k} was clamped to 0..1`);
  }
  const ivc = own(raw, "ignoreVertexColors");
  if (ivc !== undefined) {
    if (typeof ivc === "boolean") out.ignoreVertexColors = ivc;
    else warn("material.ignoreVertexColors must be a boolean and was dropped");
  }
  return Object.keys(out).length ? out : undefined;
}

function cleanPart(raw, warn) {
  const out = {};
  const fp = own(raw, "fp");
  if (fp !== undefined) {
    const f = isObj(fp) ? cleanFingerprint(fp, warn) : (warn("fp is not an object and was dropped"), undefined);
    if (f) out.fp = f;
  }
  const pos = own(raw, "pos");
  if (pos !== undefined) {
    if (numList(pos, 3)) out.pos = pos.map(fix0);
    else warn("pos must be 3 finite numbers and was dropped");
  }
  const quat = own(raw, "quat");
  if (quat !== undefined) {
    if (numList(quat, 4)) {
      const len = Math.sqrt(quat[0] * quat[0] + quat[1] * quat[1] + quat[2] * quat[2] + quat[3] * quat[3]);
      if (!Number.isFinite(len) || len === 0) {
        warn("quat has zero length and became the identity");
        out.quat = [0, 0, 0, 1];
      } else if (Math.abs(len - 1) <= 1e-12) {
        out.quat = quat.map(fix0);
      } else {
        out.quat = quat.map((c) => fix0(c / len));
      }
    } else {
      warn("quat must be 4 finite numbers and was dropped");
    }
  }
  const scale = own(raw, "scale");
  if (scale !== undefined) {
    if (numList(scale, 3)) {
      // Negative scale (a mirror) is blocked in this slice.
      out.scale = scale.map((c) => Math.max(LAYOUT_LIMITS.MIN_SCALE, c));
      if (out.scale.some((c, i) => c !== scale[i])) warn(`scale components were clamped to at least ${LAYOUT_LIMITS.MIN_SCALE}`);
    } else {
      warn("scale must be 3 finite numbers and was dropped");
    }
  }
  const visible = own(raw, "visible");
  if (visible !== undefined) {
    if (typeof visible === "boolean") out.visible = visible;
    else warn("visible must be a boolean and was dropped");
  }
  const material = own(raw, "material");
  if (material !== undefined) {
    const mat = cleanMaterial(material, warn);
    if (mat) out.material = mat;
  }
  return Object.keys(out).length ? out : null;
}

function cleanTransform(raw, warn) {
  const out = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 };
  if (raw !== undefined && !isObj(raw)) warn("transform is not an object; identity used");
  for (const k of TRANSFORM_KEYS) {
    const v = own(raw, k);
    if (v === undefined) continue;
    if (isNum(v)) {
      out[k] = fix0(v);
    } else {
      out[k] = 0;
      warn(`transform.${k} is not a finite number; 0 used`);
    }
  }
  if (out.s < LAYOUT_LIMITS.MIN_SCALE) {
    warn(`transform.s was raised to ${LAYOUT_LIMITS.MIN_SCALE}`);
    out.s = LAYOUT_LIMITS.MIN_SCALE;
  }
  return out;
}

function cleanItem(raw, index, warnings) {
  const warnAt = (msg) => warnings.push(`items[${index}]: ${msg}`);
  const assetId = own(raw, "assetId");
  if (typeof assetId !== "string" || assetId === "") {
    warnAt("assetId is missing; item dropped");
    return null;
  }
  let itemId = own(raw, "itemId");
  if (typeof itemId !== "string" || itemId === "") {
    itemId = `item-${index + 1}`;
    warnAt(`itemId is missing; "${itemId}" used`);
  }
  const item = {
    itemId: cap(itemId, LAYOUT_LIMITS.MAX_ID),
    assetId: cap(assetId, LAYOUT_LIMITS.MAX_ID),
    primary: false,
    hidden: own(raw, "hidden") === true,
    transform: cleanTransform(own(raw, "transform"), warnAt),
    splits: [],
    parts: {},
  };
  const splits = own(raw, "splits");
  if (splits !== undefined) {
    if (!Array.isArray(splits)) {
      warnAt("splits is not an array and was dropped");
    } else {
      const seen = new Set();
      for (const id of splits) {
        if (!partIdOk(id, false)) {
          warnAt("a split id is not a valid part id and was dropped");
        } else if (!seen.has(id)) {
          if (seen.size >= LAYOUT_LIMITS.MAX_SPLITS_PER_ITEM) {
            warnAt(`splits capped at ${LAYOUT_LIMITS.MAX_SPLITS_PER_ITEM}`);
            break;
          }
          seen.add(id);
          item.splits.push(id);
        }
      }
    }
  }
  const parts = own(raw, "parts");
  if (parts !== undefined) {
    if (!isObj(parts)) {
      warnAt("parts is not an object and was dropped");
    } else {
      // Sorted so that the cap keeps the same parts whatever the key order.
      const keys = Object.keys(parts).sort();
      let kept = 0;
      for (const key of keys) {
        if (FORBIDDEN_KEYS.has(key)) continue;
        if (!partIdOk(key, true)) {
          warnAt(`part key "${cap(key, 40)}" is not a valid part id and was dropped`);
          continue;
        }
        if (kept >= LAYOUT_LIMITS.MAX_PARTS_PER_ITEM) {
          warnAt(`parts capped at ${LAYOUT_LIMITS.MAX_PARTS_PER_ITEM}`);
          break;
        }
        const rawPart = own(parts, key);
        if (!isObj(rawPart)) {
          warnAt(`part "${cap(key, 40)}" is not an object and was dropped`);
          continue;
        }
        const part = cleanPart(rawPart, (msg) => warnAt(`part "${cap(key, 40)}": ${msg}`));
        if (part) {
          item.parts[key] = part;
          kept += 1;
        }
      }
    }
  }
  return item;
}

export function validateLayout(raw) {
  const errors = [];
  const warnings = [];
  const fail = (msg) => ({ ok: false, layout: null, errors: [...errors, msg], warnings });
  try {
    if (!isObj(raw)) return fail("layout is not an object");
    if (own(raw, "version") !== 1) return fail("version must be exactly 1");
    const rawItems = own(raw, "items");
    if (!Array.isArray(rawItems) || rawItems.length < 1) return fail("items must be an array of 1 to " + LAYOUT_LIMITS.MAX_ITEMS);
    if (rawItems.length > LAYOUT_LIMITS.MAX_ITEMS) return fail(`items has ${rawItems.length} entries; the limit is ${LAYOUT_LIMITS.MAX_ITEMS}`);
    const rawName = own(raw, "name");
    const items = [];
    const ids = new Set();
    rawItems.forEach((ri, i) => {
      if (!isObj(ri)) {
        warnings.push(`items[${i}]: not an object; item dropped`);
        return;
      }
      const item = cleanItem(ri, i, warnings);
      if (!item) return;
      if (ids.has(item.itemId)) {
        warnings.push(`items[${i}]: duplicate itemId "${cap(item.itemId, 40)}"; item dropped`);
        return;
      }
      ids.add(item.itemId);
      items.push(item);
    });
    if (items.length === 0) return fail("no valid items");
    items[0].primary = true;
    const rawFront = own(raw, "frontRef");
    let frontRef = items[0].itemId;
    if (rawFront !== undefined) {
      if (typeof rawFront === "string" && ids.has(rawFront)) frontRef = rawFront;
      else warnings.push("frontRef does not name an item; the first item is the front");
    }
    return {
      ok: true,
      layout: {
        version: 1,
        name: typeof rawName === "string" ? cap(rawName, LAYOUT_LIMITS.MAX_NAME) : "",
        items,
        frontRef,
      },
      errors,
      warnings,
    };
  } catch {
    return fail("layout could not be read");
  }
}

// Stable JSON: object keys sorted, arrays in order. Null for anything that
// cannot be written (cycles, or nesting deeper than 64).
export function serializeLayout(layout) {
  const write = (v, depth) => {
    if (depth > 64) throw new Error("too deep");
    if (v === null || typeof v === "boolean" || typeof v === "string") return JSON.stringify(v);
    if (typeof v === "number") return Number.isFinite(v) ? JSON.stringify(v) : "null";
    if (Array.isArray(v)) return `[${v.map((e) => (e === undefined ? "null" : write(e, depth + 1))).join(",")}]`;
    if (typeof v === "object") {
      const parts = [];
      for (const k of Object.keys(v).sort()) {
        if (v[k] !== undefined && typeof v[k] !== "function") parts.push(`${JSON.stringify(k)}:${write(v[k], depth + 1)}`);
      }
      return `{${parts.join(",")}}`;
    }
    return "null";
  };
  try {
    return write(layout, 0);
  } catch {
    return null;
  }
}

export function parseLayoutJson(text) {
  const bad = (msg) => ({ ok: false, layout: null, errors: [msg], warnings: [] });
  if (typeof text !== "string") return bad("text is not a string");
  if (text.length > LAYOUT_LIMITS.MAX_JSON_CHARS) return bad(`text is longer than ${LAYOUT_LIMITS.MAX_JSON_CHARS} characters`);
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return bad(`invalid JSON: ${e && e.message ? e.message : "parse error"}`);
  }
  return validateLayout(raw);
}
