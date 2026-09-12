// One-shot generator: builds a low-poly Cessna 172 placeholder and exports
// it as app/public/models/cessna-172.glb.
// The FINAL asset later replaces this file — no code changes needed.
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { writeFileSync } from "node:fs";

// Minimal FileReader shim — GLTFExporter expects the Web API, Node lacks it.
// (Only used for embedded resources; this model has none, but the code path
// still constructs it.)
if (typeof globalThis.FileReader === "undefined") {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob
        .arrayBuffer()
        .then((buf) => {
          this.result = buf;
          this.onloadend?.();
        })
        .catch((e) => this.onerror?.(e));
    }
  };
}

// ---- materials (placeholder-grade PBR) ----
const matBody = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5, metalness: 0.1 });
const matWing = new THREE.MeshStandardMaterial({ color: 0xdcdcdc, roughness: 0.55, metalness: 0.1 });
const matCanopy = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.3, metalness: 0.2 });
const matDark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.1 });

const plane = new THREE.Group();
plane.name = "cessna-172-placeholder";

const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  plane.add(m);
  return m;
};

// Fuselage: main tube + nose cone + tail cone (nose points +X)
add(new THREE.CylinderGeometry(0.42, 0.42, 5.0, 24), matBody, 0, 0, 0, 0, 0, Math.PI / 2);
add(new THREE.ConeGeometry(0.42, 1.1, 24), matBody, 3.05, 0, 0, 0, 0, -Math.PI / 2);
add(new THREE.ConeGeometry(0.42, 1.1, 24), matBody, -3.05, 0, 0, 0, 0, Math.PI / 2);

// Cockpit canopy
add(new THREE.BoxGeometry(1.6, 0.55, 1.0), matCanopy, 0.9, 0.62, 0);

// Low wing (single engine, low-wing C172 layout)
add(new THREE.BoxGeometry(2.4, 0.14, 11.0), matWing, -0.2, -0.28, 0);

// Tail: horizontal stabilizer + vertical fin
add(new THREE.BoxGeometry(1.0, 0.1, 3.4), matWing, -3.1, -0.05, 0);
add(new THREE.BoxGeometry(1.3, 1.1, 0.09), matWing, -3.15, 0.65, 0);

// Landing gear: two main legs + wheels
add(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 12), matDark, 0.55, -0.65, 0.85);
add(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 12), matDark, 0.55, -0.65, -0.85);
add(new THREE.CylinderGeometry(0.38, 0.38, 0.18, 24), matDark, 0.55, -0.98, 1.0, Math.PI / 2, 0, 0);
add(new THREE.CylinderGeometry(0.38, 0.38, 0.18, 24), matDark, 0.55, -0.98, -1.0, Math.PI / 2, 0, 0);
// Tail wheel
add(new THREE.SphereGeometry(0.12, 12, 12), matDark, -3.2, -1.15, 0);

// Propeller: spinner + two blades
add(new THREE.ConeGeometry(0.13, 0.35, 16), matDark, 3.75, 0, 0, 0, 0, -Math.PI / 2);
add(new THREE.BoxGeometry(0.06, 1.7, 0.22), matDark, 3.55, 0, 0);
add(new THREE.BoxGeometry(0.06, 1.7, 0.22), matDark, 3.55, 0, 0, Math.PI / 2, 0, 0);

// Sit the wheels on y=0 (studio floor anchors to box min)
plane.position.y = 1.36;

// ---- export ----
new GLTFExporter().parse(
  plane,
  (result) => {
    writeFileSync(new URL("../public/models/cessna-172.glb", import.meta.url), Buffer.from(result));
    const box = new THREE.Box3().setFromObject(plane);
    const size = box.getSize(new THREE.Vector3());
    console.log("WROTE app/public/models/cessna-172.glb");
    console.log(`bbox size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)} m, min.y=${box.min.y.toFixed(2)}`);
  },
  (err) => { console.error("EXPORT FAILED:", err); process.exit(1); },
  { binary: true }
);
