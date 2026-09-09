if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) { blob.arrayBuffer().then((buf) => { this.result = buf; if (this.onloadend) this.onloadend(); if (this.onload) this.onload(); }); }
  };
}
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFileSync } from 'fs';

const scene = new THREE.Scene();

/* Coffee-cup commercial set: ceramic espresso cup + saucer, crema, chrome spoon, coffee beans */

const ceramic = new THREE.MeshPhysicalMaterial({ color: 0xf5f0e8, metalness: 0.02, roughness: 0.16, name: 'GlossCeramic', clearcoat: 0.4, clearcoatRoughness: 0.2 });
const ceramicDark = new THREE.MeshPhysicalMaterial({ color: 0x2b2620, metalness: 0.05, roughness: 0.5, name: 'DarkCeramic' });
const chrome = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 1.0, roughness: 0.07, name: 'ChromeSpoon' });
const gold = new THREE.MeshStandardMaterial({ color: 0xffc25e, metalness: 0.95, roughness: 0.32, name: 'GoldTrim' });
const crema = new THREE.MeshStandardMaterial({ color: 0x9a5a1e, metalness: 0.0, roughness: 0.06, name: 'Crema' });
const coffee = new THREE.MeshStandardMaterial({ color: 0x2a1205, metalness: 0.0, roughness: 0.5, name: 'Coffee' });
const bean = new THREE.MeshStandardMaterial({ color: 0x4b2c12, metalness: 0.05, roughness: 0.75, name: 'RoastBean' });
const wood = new THREE.MeshStandardMaterial({ color: 0x7c4a23, metalness: 0.0, roughness: 0.6, name: 'Wood' });

const sceneRoot = new THREE.Group(); sceneRoot.name = 'Coffee_Commercial_Set';

// saucer
const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.48, 0.06, 48), ceramic);
saucer.position.y = 0.03; saucer.name = 'Saucer'; sceneRoot.add(saucer);
const saucerRim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 12, 48), ceramicDark);
saucerRim.rotation.x = Math.PI/2; saucerRim.position.y = 0.062; saucerRim.name='SaucerRim'; sceneRoot.add(saucerRim);

// espresso cup (tilted at a slight angle for style)
const cup = new THREE.Group(); cup.name = 'EspressoCup';
const body = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.20, 0.30, 48), ceramic);
body.position.y = 0.15; body.name = 'CupBody';
// inner
const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 48), ceramicDark);
inner.position.y = 0.285; inner.name='CupInner';
// crema disc
const cremaDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.02, 48), crema);
cremaDisc.position.y = 0.29; cremaDisc.name='Crema';
const handle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 14, 40, Math.PI*1.4), ceramic);
handle.position.set(0.20, 0.20, 0); handle.rotation.y = -0.4; handle.rotation.z = 0.15; handle.name='Handle';
cup.add(body, inner, cremaDisc, handle);
cup.rotation.z = -0.18; // stylish tilt
cup.position.y = 0.06;
sceneRoot.add(cup);

// gold spoon on saucer
const spoon = new THREE.Group(); spoon.name='Spoon';
const spoonHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 16), chrome);
spoonHandle.rotation.z = Math.PI/2; spoonHandle.position.x = 0.22; spoonHandle.name='SpoonHandle';
const spoonBowl = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 12, 0, Math.PI*2, 0, Math.PI/2), chrome);
spoonBowl.rotation.x = Math.PI/2; spoonBowl.position.x = 0.49; spoonBowl.name='SpoonBowl';
spoon.add(spoonHandle, spoonBowl);
spoon.position.set(0.05, 0.09, 0.3); spoon.rotation.y = 0.5; spoon.rotation.z = 0.06;
sceneRoot.add(spoon);

// gold ring accent on saucer edge
const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.008, 10, 64), gold);
ring.rotation.x = Math.PI/2; ring.position.y = 0.075; ring.name='GoldRing';
sceneRoot.add(ring);

// a few coffee beans scattered
function addBean(x, z, ry, rz) {
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 10), bean);
  b.scale.set(1, 0.72, 0.78); b.position.set(x, 0.05, z); b.rotation.set(0.5, ry, rz); b.name='CoffeeBean';
  sceneRoot.add(b);
}
addBean(0.42, -0.28, 0.7, 0.9);
addBean(0.5, -0.2, -0.5, 0.2);
addBean(-0.45, 0.35, 1.4, -0.3);
addBean(-0.38, 0.44, 0.2, 1.1);

// steam (subtle smoke columns - decorative, unlit-ish)
for (let i = 0; i < 3; i++) {
  const st = new THREE.Mesh(new THREE.TorusGeometry(0.05 - i*0.008, 0.008, 8, 20, Math.PI), crema);
  st.rotation.x = Math.PI/2; st.position.set(0, 0.42 + i*0.1, i*0.01); st.scale.y = 1.2; st.name='Steam';
  sceneRoot.add(st);
}

scene.add(sceneRoot);
sceneRoot.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

const exporter = new GLTFExporter();
const result = await exporter.parseAsync(sceneRoot, { binary: true });
const bytes = result instanceof ArrayBuffer ? result : await result.arrayBuffer();
writeFileSync('/home/user/unzipped/demo-coffee-set.glb', Buffer.from(bytes));
console.log('demo-coffee-set.glb written:', bytes.byteLength, 'bytes');
