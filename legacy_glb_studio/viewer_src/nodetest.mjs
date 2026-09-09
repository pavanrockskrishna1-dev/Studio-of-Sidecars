import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readFileSync } from 'fs';
const gltf = await new Promise((res, rej) => {
  const data = readFileSync('/home/user/unzipped/demo-bbq-bike.glb');
  const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  new GLTFLoader().parse(buf, '', res, rej);
});
const g = gltf.scene;
const clip = gltf.animations[0];
console.log('clip', clip.name, 'tracks:', clip.tracks.map(t => t.name).join(', '));
console.log('values front:', Array.from(clip.tracks[0].values).map(v => +v.toFixed(4)).join(', '));
const mixer = new THREE.AnimationMixer(g);
const action = mixer.clipAction(clip);
action.play();
const wf = g.getObjectByName('WheelFront');
for (let i = 0; i <= 20; i++) { mixer.update(0.1); }
console.log('after ~2s: action time', action.time.toFixed(2), 'WheelFront qz', wf.quaternion.z.toFixed(4));
for (let i = 0; i <= 10; i++) { mixer.update(0.1); }
console.log('after ~3s: action time', action.time.toFixed(2), 'WheelFront qz', wf.quaternion.z.toFixed(4));
console.log('bindings:', action._propertyBindings.map(b => b.binding.node ? b.binding.node.name : 'NULL'));
