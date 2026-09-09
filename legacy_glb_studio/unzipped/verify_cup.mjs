import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readFileSync } from 'fs';
const data = readFileSync('/home/user/unzipped/demo-coffee-set.glb');
const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
new GLTFLoader().parse(buf, '', (g) => {
  let meshes = 0; const names = [];
  g.scene.traverse(o => { if (o.isMesh) { meshes++; names.push(o.name); } });
  console.log('cup demo meshes:', meshes, '| sample:', names.slice(0,8).join(', '));
}, (e) => { console.error('ERR', e.message); process.exit(1); });
