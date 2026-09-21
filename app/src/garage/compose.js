/* Garage G1 — matrix, quaternion and part-override maths.
   ---------------------------------------------------------------------------
   Pure math over plain numbers and arrays: no imports, no three.js, no DOM, no
   clock, no randomness. Matrices are column-major arrays of 16 numbers with
   the same layout as three.js Matrix4.elements; quaternions are [x, y, z, w];
   vectors are arrays of 3 numbers. Nothing here throws: invalid input returns
   null.

   The whole-model transform { x, y, z, rx, ry, rz, s } is read exactly as the
   studio's transform group reads it: position in metres, rotation in DEGREES
   as an Euler XYZ triple, ONE uniform scale s. */

const DEG2RAD = Math.PI / 180;

const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const isVec3 = (a) => (Array.isArray(a) || ArrayBuffer.isView(a)) && a.length === 3 && isNum(a[0]) && isNum(a[1]) && isNum(a[2]);
const isQuat = (a) => (Array.isArray(a) || ArrayBuffer.isView(a)) && a.length === 4 && isNum(a[0]) && isNum(a[1]) && isNum(a[2]) && isNum(a[3]);
const isMat = (m) => {
  if (!(Array.isArray(m) || ArrayBuffer.isView(m)) || m.length !== 16) return false;
  for (let i = 0; i < 16; i += 1) if (!isNum(m[i])) return false;
  return true;
};
const isObj = (o) => typeof o === "object" && o !== null && !Array.isArray(o);

export function identityMatrix() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

// a times b: applying the result to a point applies b first, then a.
export function matMul(a, b) {
  if (!isMat(a) || !isMat(b)) return null;
  const out = new Array(16);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      out[c * 4 + r] =
        a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
}

// Same formula as three.js Matrix4.compose.
export function matFromTRS(pos, quat, scale) {
  if (!isVec3(pos) || !isQuat(quat) || !isVec3(scale)) return null;
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

// Euler XYZ (radians) to a quaternion, the same formula as three.js.
function quatFromEulerXYZ(x, y, z) {
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);
  return [
    s1 * c2 * c3 + c1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 + s1 * s2 * c3,
    c1 * c2 * c3 - s1 * s2 * s3,
  ];
}

// The whole-model transform t = { x, y, z, rx, ry, rz, s } (rotation in
// degrees, Euler XYZ, uniform scale). A missing field takes its identity value.
export function matFromEulerXYZDeg(t) {
  if (!isObj(t)) return null;
  const get = (k, d) => (t[k] === undefined ? d : t[k]);
  const x = get("x", 0);
  const y = get("y", 0);
  const z = get("z", 0);
  const rx = get("rx", 0);
  const ry = get("ry", 0);
  const rz = get("rz", 0);
  const s = get("s", 1);
  if (![x, y, z, rx, ry, rz, s].every(isNum)) return null;
  return matFromTRS([x, y, z], quatFromEulerXYZ(rx * DEG2RAD, ry * DEG2RAD, rz * DEG2RAD), [s, s, s]);
}

// T(centre) times Ry(spin) times T(-centre): spin about the vertical axis
// through centre. At spin 0 the result is exactly the identity.
export function pivotMatrix(centre, spinYRad) {
  if (!isVec3(centre) || !isNum(spinYRad)) return null;
  const c = Math.cos(spinYRad);
  const s = Math.sin(spinYRad);
  const [cx, cy, cz] = centre;
  return [
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    cx - (c * cx + s * cz), cy - cy, cz - (-s * cx + c * cz), 1,
  ];
}

export function transformPoint(m, p) {
  if (!isMat(m) || !isVec3(p)) return null;
  const [x, y, z] = p;
  const w = 1 / (m[3] * x + m[7] * y + m[11] * z + m[15]);
  return [
    (m[0] * x + m[4] * y + m[8] * z + m[12]) * w,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) * w,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) * w,
  ];
}

// Hamilton product a times b (b acts first).
export function quatMul(a, b) {
  if (!isQuat(a) || !isQuat(b)) return null;
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    ax * bw + aw * bx + ay * bz - az * by,
    ay * bw + aw * by + az * bx - ax * bz,
    az * bw + aw * bz + ax * by - ay * bx,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function quatNormalize(q) {
  if (!isQuat(q)) return null;
  const len = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
  if (!Number.isFinite(len) || len === 0) return null;
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

const isZero3 = (v) => v[0] === 0 && v[1] === 0 && v[2] === 0;
const isOne3 = (v) => v[0] === 1 && v[1] === 1 && v[2] === 1;
const isIdentityQuat = (q) => q[0] === 0 && q[1] === 0 && q[2] === 0 && q[3] === 1;

const copyBase = (b) => ({ pos: [b.pos[0], b.pos[1], b.pos[2]], quat: [b.quat[0], b.quat[1], b.quat[2], b.quat[3]], scale: [b.scale[0], b.scale[1], b.scale[2]] });

// base = { pos, quat, scale }, ov = { pos?, quat?, scale? }.
// pos = base.pos + ov.pos; quat = normalize(ov.quat * base.quat) (the delta
// acts in the parent frame); scale = base.scale times ov.scale per component.
// A field that is absent or exactly the identity is copied from base with no
// arithmetic and no normalisation, so an empty or identity override returns
// values exactly equal to base.
export function applyPartOverride(base, ov) {
  if (!isObj(base) || !isObj(ov)) return null;
  if (!isVec3(base.pos) || !isQuat(base.quat) || !isVec3(base.scale)) return null;
  const out = copyBase(base);
  if (ov.pos !== undefined) {
    if (!isVec3(ov.pos)) return null;
    if (!isZero3(ov.pos)) out.pos = [base.pos[0] + ov.pos[0], base.pos[1] + ov.pos[1], base.pos[2] + ov.pos[2]];
  }
  if (ov.quat !== undefined) {
    if (!isQuat(ov.quat)) return null;
    if (!isIdentityQuat(ov.quat)) {
      const q = quatNormalize(quatMul(ov.quat, base.quat));
      if (!q) return null;
      out.quat = q;
    }
  }
  if (ov.scale !== undefined) {
    if (!isVec3(ov.scale)) return null;
    if (!isOne3(ov.scale)) out.scale = [base.scale[0] * ov.scale[0], base.scale[1] * ov.scale[1], base.scale[2] * ov.scale[2]];
  }
  return out;
}

// A fresh copy of the base pose (no arrays shared with the input).
export function resetToBase(base) {
  if (!isObj(base) || !isVec3(base.pos) || !isQuat(base.quat) || !isVec3(base.scale)) return null;
  return copyBase(base);
}
