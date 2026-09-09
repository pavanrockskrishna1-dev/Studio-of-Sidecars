import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readFileSync } from 'fs';
const loader = new GLTFLoader();
const data = readFileSync('/home/user/unzipped/demo-bbq-bike.glb');
const buf = data.buffer.slice(data.byteOffset, data.byteOffset+data.byteLength);
loader.parse(buf, '', (gltf) => {
  const scene = gltf.scene;
  const meshCount = {m:0};
  scene.traverse(o=>{ if(o.isMesh) meshCount.m++; });
  const names = [];
  scene.traverse(o=>{ if(o.name) names.push(o.name); });
  console.log('meshes:', meshCount.m);
  console.log('animations:', gltf.animations.map(a=>a.name), 'duration', gltf.animations[0] && gltf.animations[0].duration);
  console.log('sample node names:', names.slice(0,8).join(', '), '...');
  const b = new THREE.Box3().setFromObject(scene);
  console.log('bbox center', b.getCenter(new THREE.Vector3()).toArray().map(x=>+x.toFixed(2)), 'size', b.getSize(new THREE.Vector3()).toArray().map(x=>+x.toFixed(2)));
}, (e)=>{ console.error('ERR', e.message); process.exit(1); });
