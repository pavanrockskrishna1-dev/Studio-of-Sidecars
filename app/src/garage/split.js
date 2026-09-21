/* Garage G1 — connected components of a triangle mesh.
   ---------------------------------------------------------------------------
   Pure JS over typed arrays: no imports, no three.js, no DOM. Vertices are
   welded by quantised position, vertices that share a triangle are joined with
   a union-find, and components are numbered in order of FIRST APPEARANCE when
   scanning triangles 0 to T-1, so the numbering is deterministic.

   Known limitation: two triangles that only touch at ONE coincident vertex are
   one component.

   Nothing is extracted here: the result is counts, a component per triangle
   and a bounding box per component. Never throws: returns { ok:false, reason }
   with reason "bad-input", "non-finite", "bad-index" or "too-large". */

const DEFAULT_MAX_VERTICES = 500000;

const isArrayLike = (a) => Array.isArray(a) || ArrayBuffer.isView(a);

export function splitComponents(input) {
  const fail = (reason) => ({ ok: false, reason });
  if (typeof input !== "object" || input === null) return fail("bad-input");
  const { positions, indices } = input;
  if (!isArrayLike(positions) || positions.length % 3 !== 0) return fail("bad-input");
  const maxVertices = input.maxVertices === undefined ? DEFAULT_MAX_VERTICES : input.maxVertices;
  if (!Number.isSafeInteger(maxVertices) || maxVertices < 0) return fail("bad-input");
  const V = positions.length / 3;
  if (V > maxVertices) return fail("too-large");
  if (input.weldEps !== undefined && !(typeof input.weldEps === "number" && Number.isFinite(input.weldEps) && input.weldEps >= 0)) {
    return fail("bad-input");
  }

  let T;
  let idx = null;
  if (indices === undefined || indices === null) {
    if (V % 3 !== 0) return fail("bad-input");
    T = V / 3;
  } else {
    if (!isArrayLike(indices) || indices.length % 3 !== 0) return fail("bad-input");
    T = indices.length / 3;
    idx = new Int32Array(indices.length);
    for (let i = 0; i < indices.length; i += 1) {
      const n = indices[i];
      if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n >= V) return fail("bad-index");
      idx[i] = n;
    }
  }

  // Positions as doubles, with the bounding box of the whole input.
  const pos = new Float64Array(positions.length);
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < V; v += 1) {
    for (let a = 0; a < 3; a += 1) {
      const n = positions[v * 3 + a];
      if (typeof n !== "number" || !Number.isFinite(n)) return fail("non-finite");
      pos[v * 3 + a] = n;
      if (n < lo[a]) lo[a] = n;
      if (n > hi[a]) hi[a] = n;
    }
  }

  const extent = V ? Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) : 0;
  let eps = input.weldEps === undefined ? extent * 1e-5 : input.weldEps;
  // A zero cell size cannot quantise: use a tiny relative one instead.
  if (!(eps > 0)) eps = extent > 0 ? extent * 1e-12 : 1;

  // Weld: an open-addressing hash of the quantised positions. rep[v] is the
  // first vertex that has the same quantised position as v.
  let size = 16;
  while (size < V * 2) size *= 2;
  const mask = size - 1;
  const table = new Int32Array(size).fill(-1);
  const q = new Float64Array(V * 3);
  const rep = new Int32Array(V);
  for (let v = 0; v < V; v += 1) {
    const qx = Math.round(pos[v * 3] / eps);
    const qy = Math.round(pos[v * 3 + 1] / eps);
    const qz = Math.round(pos[v * 3 + 2] / eps);
    q[v * 3] = qx;
    q[v * 3 + 1] = qy;
    q[v * 3 + 2] = qz;
    let h = Math.imul(qx | 0, 73856093) ^ Math.imul(qy | 0, 19349663) ^ Math.imul(qz | 0, 83492791);
    h ^= Math.imul(Math.floor(qx / 4294967296) | 0, 2654435761) ^ Math.imul(Math.floor(qy / 4294967296) | 0, 40503) ^ Math.floor(qz / 4294967296);
    h ^= h >>> 15;
    let slot = h & mask;
    for (;;) {
      const other = table[slot];
      if (other === -1) {
        table[slot] = v;
        rep[v] = v;
        break;
      }
      if (q[other * 3] === qx && q[other * 3 + 1] === qy && q[other * 3 + 2] === qz) {
        rep[v] = other;
        break;
      }
      slot = (slot + 1) & mask;
    }
  }

  // Union-find over the welded vertices.
  const parent = new Int32Array(V);
  for (let v = 0; v < V; v += 1) parent[v] = v;
  const find = (a) => {
    let x = a;
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const corner = (t, k) => (idx ? idx[t * 3 + k] : t * 3 + k);
  for (let t = 0; t < T; t += 1) {
    const ra = find(rep[corner(t, 0)]);
    const rb = find(rep[corner(t, 1)]);
    const rc = find(rep[corner(t, 2)]);
    if (ra !== rb) parent[rb] = ra;
    const rab = find(ra);
    if (rab !== rc) parent[rc] = rab;
  }

  // Number the components by first appearance over triangles 0..T-1.
  const label = new Int32Array(V).fill(-1);
  const componentOfTriangle = new Int32Array(T);
  let count = 0;
  for (let t = 0; t < T; t += 1) {
    const root = find(rep[corner(t, 0)]);
    if (label[root] === -1) {
      label[root] = count;
      count += 1;
    }
    componentOfTriangle[t] = label[root];
  }

  const triangleCounts = new Int32Array(count);
  const bbox = new Float64Array(count * 6);
  for (let c = 0; c < count; c += 1) {
    bbox[c * 6] = bbox[c * 6 + 1] = bbox[c * 6 + 2] = Infinity;
    bbox[c * 6 + 3] = bbox[c * 6 + 4] = bbox[c * 6 + 5] = -Infinity;
  }
  for (let t = 0; t < T; t += 1) {
    const c = componentOfTriangle[t];
    triangleCounts[c] += 1;
    for (let k = 0; k < 3; k += 1) {
      const v = corner(t, k);
      for (let a = 0; a < 3; a += 1) {
        const n = pos[v * 3 + a];
        if (n < bbox[c * 6 + a]) bbox[c * 6 + a] = n;
        if (n > bbox[c * 6 + 3 + a]) bbox[c * 6 + 3 + a] = n;
      }
    }
  }
  return { ok: true, count, triangles: T, vertices: V, componentOfTriangle, triangleCounts, bbox };
}
