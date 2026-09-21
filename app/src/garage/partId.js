/* Garage G1 — stable part ids, fingerprints and re-matching.
   ---------------------------------------------------------------------------
   Pure JS over plain trees { name, children: [...] }: no imports, no three.js,
   no DOM. Nothing here throws: invalid input returns null (or an "unmatched"
   result).

   A part id is the path of a node from the root (the root itself is excluded):
   segments joined by "/", each segment being sanitisedName + "~" + n, where n
   is the 0-based index among the siblings with the same name. An empty or fully
   stripped name is written "#". A split component of a part adds "#c" + k. */

// Same rule as three.js PropertyBinding.sanitizeNodeName: whitespace becomes
// "_" and the reserved characters [ ] . : / are removed.
export function sanitizeNodeName(name) {
  if (typeof name !== "string") return "";
  return name.replace(/\s/g, "_").replace(/[[\].:/]/g, "");
}

const isObj = (o) => typeof o === "object" && o !== null;

// Sibling indices are counted per WRITTEN name, so an unnamed node ("#") and a
// node literally named "#" share one counter and can never collide.
const writtenName = (name) => {
  const s = sanitizeNodeName(name);
  return s === "" ? "#" : s;
};

export function buildPartIds(root, opts) {
  if (!isObj(root) || Array.isArray(root)) return null;
  try {
    const isPart = opts && typeof opts.isPart === "function" ? opts.isPart : null;
    const keep = (node) => {
      if (!isPart) return true;
      try {
        return Boolean(isPart(node));
      } catch {
        return false;
      }
    };
    const out = [];
    const seen = new Set([root]);
    const stack = [];
    const pushChildren = (node, prefix) => {
      const kids = Array.isArray(node.children) ? node.children : [];
      const counts = new Map();
      const items = [];
      for (const child of kids) {
        if (!isObj(child) || Array.isArray(child) || seen.has(child)) continue;
        seen.add(child);
        const w = writtenName(child.name);
        const n = counts.get(w) || 0;
        counts.set(w, n + 1);
        items.push({ node: child, id: `${prefix}${prefix ? "/" : ""}${w}~${n}` });
      }
      for (let i = items.length - 1; i >= 0; i -= 1) stack.push(items[i]);
    };
    pushChildren(root, "");
    while (stack.length) {
      const it = stack.pop();
      if (keep(it.node)) out.push({ id: it.id, node: it.node });
      pushChildren(it.node, it.id);
    }
    return out;
  } catch {
    return null;
  }
}

export function partIdOfComponent(partId, k) {
  if (typeof partId !== "string" || !Number.isSafeInteger(k) || k < 0) return null;
  return `${partId}#c${k}`;
}

const COMPONENT_RE = /^(.*~\d+)#c(\d+)$/;
const SEGMENT_RE = /^(.*)~(\d+)$/;

// { segments: [{ name, index }], component: k | null }, or null when malformed.
// "#" is reported as the empty name.
export function parsePartId(id) {
  if (typeof id !== "string" || id === "") return null;
  let body = id;
  let component = null;
  const cm = COMPONENT_RE.exec(id);
  if (cm) {
    body = cm[1];
    component = Number(cm[2]);
    if (!Number.isSafeInteger(component)) return null;
  }
  const segments = [];
  for (const seg of body.split("/")) {
    const m = SEGMENT_RE.exec(seg);
    if (!m) return null;
    const index = Number(m[2]);
    if (!Number.isSafeInteger(index)) return null;
    if (m[1] === "") return null;
    if (/[\s[\].:]/.test(m[1])) return null;
    segments.push({ name: m[1] === "#" ? "" : m[1], index });
  }
  return { segments, component };
}

const round4 = (n) => Math.round(n * 1e4) / 1e4 + 0;

export function fingerprint(info) {
  if (!isObj(info)) return null;
  const { verts, tris, bbox, materialName } = info;
  if (!Number.isSafeInteger(verts) || verts < 0) return null;
  if (!Number.isSafeInteger(tris) || tris < 0) return null;
  if (!Array.isArray(bbox) && !ArrayBuffer.isView(bbox)) return null;
  if (bbox.length !== 6) return null;
  const bb = [];
  for (let i = 0; i < 6; i += 1) {
    if (typeof bbox[i] !== "number" || !Number.isFinite(bbox[i])) return null;
    bb.push(round4(bbox[i]));
  }
  if (typeof materialName !== "string") return null;
  return { v: verts, t: tris, bb, m: materialName };
}

export function fingerprintsMatch(a, b) {
  if (!isObj(a) || !isObj(b)) return false;
  if (a.v !== b.v || a.t !== b.t || a.m !== b.m) return false;
  if (!Array.isArray(a.bb) || !Array.isArray(b.bb) || a.bb.length !== 6 || b.bb.length !== 6) return false;
  for (let i = 0; i < 6; i += 1) {
    if (!(Math.abs(a.bb[i] - b.bb[i]) <= 1.0001e-4)) return false;
  }
  return true;
}

// saved = { id, fp? }, current = [{ id, fp }]. Returns { status, match,
// candidates } with status "exact", "fingerprint", "ambiguous" or "unmatched".
// G1 safety choice: several fingerprint matches (mirrored twins) are listed as
// candidates and NOT applied; an override is never applied silently when the
// status is "ambiguous" or "unmatched".
export function resolvePart(saved, current) {
  const none = { status: "unmatched", match: null, candidates: [] };
  if (!isObj(saved) || typeof saved.id !== "string" || !Array.isArray(current)) return none;
  const entries = current.filter((e) => isObj(e) && typeof e.id === "string");
  const same = entries.find((e) => e.id === saved.id);
  if (same && (saved.fp === undefined || saved.fp === null || fingerprintsMatch(saved.fp, same.fp))) {
    return { status: "exact", match: same, candidates: [] };
  }
  if (saved.fp === undefined || saved.fp === null) return none;
  const hits = entries.filter((e) => e !== same && fingerprintsMatch(saved.fp, e.fp));
  if (hits.length === 1) return { status: "fingerprint", match: hits[0], candidates: [hits[0]] };
  if (hits.length > 1) return { status: "ambiguous", match: null, candidates: hits };
  return none;
}
