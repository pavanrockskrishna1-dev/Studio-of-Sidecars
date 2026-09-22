/* Garage G3 — part index over a duck-typed object tree.
   ---------------------------------------------------------------------------
   Pure JS, no three.js import: a node is any object with an optional string
   name, an optional children array and an isMesh flag. The tree is first copied
   into plain nodes { name, isMesh, children, ref } (iteratively, so a deep tree
   cannot overflow the stack; a cycle is cut; a depth over MAX_DEPTH is refused),
   then partId.js names every mesh, so the ids are exactly what buildPartIds
   gives for the same plain tree. The root itself is never a part.

   A PART here is one mesh node. A model file that merges pieces into one mesh
   yields one part (splitting into components is a later slice).

   Nothing here raises: a bad root or a too-deep tree returns { ok:false, reason }. */

import { buildPartIds } from "./partId.js";

export const MAX_DEPTH = 200;

const isObj = (o) => typeof o === "object" && o !== null && !Array.isArray(o);
const fail = (reason) => ({ ok: false, reason });

// { ok:true, parts:[{ id, ref, name }], byRef:Map(ref -> id), byId:Map(id -> ref) }
// or { ok:false, reason }. Parts are in depth-first, sibling order.
export function buildPartIndex(root, opts) {
  if (!isObj(root)) return fail("bad-root");
  try {
    const maxDepth =
      opts && Number.isSafeInteger(opts.maxDepth) && opts.maxDepth > 0 ? opts.maxDepth : MAX_DEPTH;
    const make = (src) => ({
      name: typeof src.name === "string" ? src.name : "",
      isMesh: src.isMesh === true,
      children: [],
      ref: src,
    });
    const plainRoot = make(root);
    const seen = new Set([root]);
    const stack = [{ src: root, plain: plainRoot, depth: 0 }];
    while (stack.length) {
      const { src, plain, depth } = stack.pop();
      const kids = Array.isArray(src.children) ? src.children : [];
      for (const child of kids) {
        if (!isObj(child) || seen.has(child)) continue;
        if (depth + 1 > maxDepth) return fail("too-deep");
        seen.add(child);
        const p = make(child);
        plain.children.push(p);
        stack.push({ src: child, plain: p, depth: depth + 1 });
      }
    }
    const found = buildPartIds(plainRoot, { isPart: (n) => n.isMesh });
    if (!found) return fail("bad-tree");
    const parts = [];
    const byRef = new Map();
    const byId = new Map();
    for (const { id, node } of found) {
      parts.push({ id, ref: node.ref, name: node.name });
      byRef.set(node.ref, id);
      byId.set(id, node.ref);
    }
    return { ok: true, parts, byRef, byId };
  } catch {
    return fail("bad-tree");
  }
}
