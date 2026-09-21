/* Garage G1 — world bounds of a plain node tree, and the floor height.
   ---------------------------------------------------------------------------
   Pure JS, no imports (the few matrix helpers below are private copies of the
   ones in compose.js; the test script checks that the two agree). Nothing here
   throws: invalid input returns null or is skipped and counted.

   A node is { visible?, pos?, quat?, scale?, matrix?, box?, children? }.
   `matrix` (16 numbers, column-major), when present, overrides pos/quat/scale.
   `box` is a local { min, max } and only mesh nodes have one. An invisible
   node hides its whole subtree. */

const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const isArr = (a, n) => (Array.isArray(a) || ArrayBuffer.isView(a)) && a.length === n && Array.prototype.every.call(a, isNum);
const isObj = (o) => typeof o === "object" && o !== null && !Array.isArray(o);

function mul(a, b) {
  const out = new Array(16);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
}

function trs(pos, quat, scale) {
  const [x, y, z, w] = quat;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  const [sx, sy, sz] = scale;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    pos[0], pos[1], pos[2], 1,
  ];
}

function apply(m, x, y, z) {
  const w = 1 / (m[3] * x + m[7] * y + m[11] * z + m[15]);
  return [
    (m[0] * x + m[4] * y + m[8] * z + m[12]) * w,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) * w,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) * w,
  ];
}

const validBox = (b) => isObj(b) && isArr(b.min, 3) && isArr(b.max, 3);

// The world axis-aligned box of a local box { min, max } under matrix m, from
// its 8 corners. Conservative: a rotated box grows.
export function boxOfMatrixBox(m, box) {
  if (!isArr(m, 16) || !validBox(box)) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < 8; i += 1) {
    const p = apply(m, i & 1 ? box.max[0] : box.min[0], i & 2 ? box.max[1] : box.min[1], i & 4 ? box.max[2] : box.min[2]);
    for (let a = 0; a < 3; a += 1) {
      if (p[a] < min[a]) min[a] = p[a];
      if (p[a] > max[a]) max[a] = p[a];
    }
  }
  if (![...min, ...max].every(isNum)) return null;
  return { min, max };
}

// The local matrix of a node, or null when its transform is not finite.
function localMatrix(node) {
  if (node.matrix !== undefined) return isArr(node.matrix, 16) ? node.matrix : null;
  const pos = node.pos === undefined ? [0, 0, 0] : node.pos;
  const quat = node.quat === undefined ? [0, 0, 0, 1] : node.quat;
  const scale = node.scale === undefined ? [1, 1, 1] : node.scale;
  if (!isArr(pos, 3) || !isArr(quat, 4) || !isArr(scale, 3)) return null;
  return trs(pos, quat, scale);
}

// The union of the world boxes of every visible mesh node. opts.rootMatrix is
// an optional matrix above the root. A node with a non-finite transform is
// skipped with its whole subtree; a node with a non-finite box is skipped on
// its own; each counts once in `skipped`. Returns null when no visible box
// exists.
export function unionBounds(root, opts) {
  if (!isObj(root)) return null;
  try {
    const above = opts && isArr(opts.rootMatrix, 16) ? opts.rootMatrix : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    let count = 0;
    let skipped = 0;
    const seen = new Set([root]);
    const stack = [{ node: root, parent: above }];
    while (stack.length) {
      const { node, parent } = stack.pop();
      if (node.visible === false) continue;
      const local = localMatrix(node);
      if (!local) {
        skipped += 1;
        continue;
      }
      const world = mul(parent, local);
      if (node.box !== undefined) {
        const wb = boxOfMatrixBox(world, node.box);
        if (!wb) {
          skipped += 1;
        } else {
          count += 1;
          for (let a = 0; a < 3; a += 1) {
            if (wb.min[a] < min[a]) min[a] = wb.min[a];
            if (wb.max[a] > max[a]) max[a] = wb.max[a];
          }
        }
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          if (isObj(child) && !seen.has(child)) {
            seen.add(child);
            stack.push({ node: child, parent: world });
          }
        }
      }
    }
    if (count === 0) return null;
    return {
      min,
      max,
      center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
      size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
      count,
      skipped,
    };
  } catch {
    return null;
  }
}

// Owner decision 1: a part dragged below the model's floor does NOT move the
// floor or the shadow. They stay at the model's ORIGINAL base (homeFloorY);
// the union minimum is only a fallback for a model that has no home floor.
export function floorYFor({ homeFloorY, unionMinY } = {}) {
  if (isNum(homeFloorY)) return homeFloorY;
  if (isNum(unionMinY)) return unionMinY;
  return null;
}
