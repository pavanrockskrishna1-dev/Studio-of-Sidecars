if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) { blob.arrayBuffer().then((buf) => { this.result = buf; if (this.onloadend) this.onloadend(); if (this.onload) this.onload(); }); }
  };
}
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFileSync } from 'fs';
const scene = new THREE.Scene();
const mk = (geo, color, x,y,z,name) => {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, metalness: 0.0, roughness: 0.9, name }));
  m.position.set(x,y,z); m.name=name; return m;
};
scene.add(mk(new THREE.BoxGeometry(1.0,0.6,0.5), 0xff8800, 0, 0.45, 0, 'body'));       // bright orange diffuse
scene.add(mk(new THREE.BoxGeometry(0.3,0.8,0.2), 0x00ccff, 0, 0.1, -0.25, 'stand'));  // cyan
scene.add(mk(new THREE.BoxGeometry(1.4,0.1,0.6), 0x33ff33, 0, 0.75, 0.1, 'grilltop')); // green
const exporter = new GLTFExporter();
const result = await exporter.parseAsync(scene, { binary: true });
const bytes = result instanceof ArrayBuffer ? result : await result.arrayBuffer();
writeFileSync('/home/user/unzipped/test-diffuse.glb', Buffer.from(bytes));
console.log('diffuse model written', bytes.byteLength);
