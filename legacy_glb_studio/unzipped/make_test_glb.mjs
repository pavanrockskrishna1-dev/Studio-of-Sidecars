// Minimal FileReader shim for Node (Blob.arrayBuffer path used by GLTFExporter)
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onloadend) this.onloadend();
        if (this.onload) this.onload();
      });
    }
  };
}
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFileSync } from 'fs';

const scene = new THREE.Scene();
const body = new THREE.Mesh(
  new THREE.BoxGeometry(0.9, 0.45, 0.5),
  new THREE.MeshStandardMaterial({ color: 0xc2410c, metalness: 0.6, roughness: 0.4, name: 'BodyPaint' })
);
body.position.set(0, 0.32, 0); body.name = 'body';
const wheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.12, 24);
wheelGeo.rotateZ(Math.PI / 2);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, name: 'Tire' });
const wheelF = new THREE.Mesh(wheelGeo, wheelMat); wheelF.position.set(-0.45, 0.25, 0); wheelF.name='wheel_front';
const wheelB = new THREE.Mesh(wheelGeo, wheelMat); wheelB.position.set(0.45, 0.25, 0); wheelB.name='wheel_back';
const grill = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.18, 0.42),
  new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.9, roughness: 0.25, name: 'Chrome' })
);
grill.position.set(0, 0.58, 0.05); grill.name='grill';
const frame = new THREE.Mesh(
  new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8),
  new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.5, roughness: 0.5, name:'Frame' })
);
frame.rotation.z = Math.PI/2;
frame.position.set(0, 0.55, 0); frame.name='frame';
scene.add(body, wheelF, wheelB, grill, frame);
scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

const exporter = new GLTFExporter();
const result = await exporter.parseAsync(scene, { binary: true });
// parseAsync returns ArrayBuffer (binary) — handle both
const bytes = result instanceof ArrayBuffer ? result : await result.arrayBuffer();
writeFileSync('/home/user/unzipped/test-model.glb', Buffer.from(bytes));
console.log('written test-model.glb', bytes.byteLength, 'bytes');
