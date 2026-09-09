if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) { blob.arrayBuffer().then((buf) => { this.result = buf; if (this.onloadend) this.onloadend(); if (this.onload) this.onload(); }); }
  };
}
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFileSync } from 'fs';

const scene = new THREE.Scene();

// ---------- Materials ----------
const paint = new THREE.MeshStandardMaterial({ color: 0xe0491f, metalness: 0.35, roughness: 0.32, name: 'Paint_Orange' });
const paintDark = new THREE.MeshStandardMaterial({ color: 0xb23215, metalness: 0.4, roughness: 0.35, name: 'Paint_Dark' });
const cream = new THREE.MeshStandardMaterial({ color: 0xfaf3e3, metalness: 0.05, roughness: 0.5, name: 'Cream' });
const chrome = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 1.0, roughness: 0.12, name: 'Chrome' });
const darkChrome = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 1.0, roughness: 0.35, name: 'Dark_Chrome' });
const tire = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.0, roughness: 0.95, name: 'Tire' });
const grillIron = new THREE.MeshStandardMaterial({ color: 0x3c4146, metalness: 0.85, roughness: 0.4, name: 'Grill_Iron' });
const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a33, metalness: 0.0, roughness: 0.7, name: 'Wood' });
const smokeGray = new THREE.MeshStandardMaterial({ color: 0xd8d3c8, metalness: 0.1, roughness: 0.55, name: 'Smoke_Gray' });

const mats = { paint, paintDark, cream, chrome, darkChrome, tire, grillIron, wood, smokeGray };

// ---------- Helpers ----------
const cyl = (rTop, rBot, h, seg=24) => new THREE.CylinderGeometry(rTop, rBot, h, seg);
function mesh(geo, mat, name) { const m = new THREE.Mesh(geo, mat); m.name = name; return m; }
function add(o, mat, name) { const m = mesh(o.geometry, mat, name); m.position.copy(o.position); m.rotation.copy(o.rotation); m.scale.copy(o.scale); return m; }

// bike travels along +X axis; wheels along Z axis
const wheelGroup = (x, y) => {
  const g = new THREE.Group(); g.position.set(x, y, 0); g.name = 'wheel_' + (x<0?'front':'rear');
  const tireMesh = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.075, 14, 40), tire); tireMesh.name='tire';
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.30,0.30,0.07,40), chrome); rim.rotation.x=Math.PI/2; rim.name='rim';
  const spokes = [];
  for (let i=0;i<5;i++){
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.5,8), darkChrome);
    s.rotation.z = (i/5)*Math.PI; s.position.y = 0; s.name='spoke';
    spokes.push(s);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.12,16), chrome); hub.rotation.x=Math.PI/2; hub.name='hub';
  g.add(tireMesh, rim, ...spokes, hub);
  return g;
};

// main frame tube between two points: cylinder with length = distance, aligned
function tube(p1, p2, r, mat, name, extraRot){
  const a = new THREE.Vector3(...p1), b = new THREE.Vector3(...p2);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const t = mesh(new THREE.CylinderGeometry(r, r, len, 16), mat, name);
  t.position.copy(a.clone().add(b).multiplyScalar(0.5));
  t.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
  if (extraRot) t.rotateZ(extraRot);
  return t;
}
const sphere = (r, mat, name, x=0,y=0,z=0) => { const m = mesh(new THREE.SphereGeometry(r, 20, 16), mat, name); m.position.set(x,y,z); return m; };

const root = new THREE.Group(); root.name = 'BBQ_Bike';

const rearX = -0.62, frontX = 0.62, wheelY = 0.32;
// Wheels
const wheelRear = wheelGroup(rearX, wheelY); wheelRear.name = 'WheelRear';
const wheelFront = wheelGroup(frontX, wheelY); wheelFront.name = 'WheelFront';
root.add(wheelRear, wheelFront);

// Frame
root.add(tube([rearX, 0.5, 0], [frontX, 0.5, 0], 0.03, paint, 'TopTube'));            // top tube
root.add(tube([rearX, 0.5, 0], [rearX, 0.32, 0], 0.03, paint, 'SeatTube'));           // seat tube down
root.add(tube([frontX, 0.5, 0], [frontX, 0.32, 0], 0.028, chrome, 'HeadTube'));       // head tube
root.add(tube([0.0, 0.5, 0], [frontX, 0.38, 0], 0.024, cream, 'DownTube'));           // down tube
root.add(tube([0.05, 0.5, 0], [rearX, 0.42, 0], 0.024, cream, 'ChainStay'));
// Fork chrome to front wheel
root.add(tube([frontX, 0.32, 0], [frontX, 0.50, 0], 0.02, chrome, 'ForkL')); 
// Handlebar group
const bar = mesh(new THREE.CylinderGeometry(0.018,0.018,0.55,12), chrome, 'Handlebar'); bar.rotation.z = Math.PI/2; bar.position.set(frontX, 0.66, 0); root.add(bar);
const stem = tube([frontX,0.62,0],[frontX,0.55,0],0.016, chrome, 'Stem'); root.add(stem);
const grip1 = mesh(new THREE.CylinderGeometry(0.021,0.021,0.10,12), tire, 'GripL'); grip1.rotation.z=Math.PI/2; grip1.position.set(frontX+0.22,0.655,0.02); root.add(grip1);
const grip2 = grip1.clone(); grip2.name='GripR'; grip2.position.set(frontX-0.22,0.655,0.02); root.add(grip2);

// Saddle + post
const post = tube([rearX,0.5,0],[rearX,0.68,0],0.015, chrome, 'SeatPost'); root.add(post);
const seat = mesh(new THREE.BoxGeometry(0.14,0.035,0.26), tire, 'Seat'); seat.position.set(rearX,0.70,0); root.add(seat);

// Cargo/grill platform over rear wheel + wooden deck
const deck = mesh(new THREE.BoxGeometry(0.55,0.035,0.42), wood, 'Deck');
deck.position.set(rearX, 0.62, 0); root.add(deck);
const deckRailL = mesh(new THREE.BoxGeometry(0.5,0.05,0.03), paintDark, 'RailL'); deckRailL.position.set(rearX,0.66,-0.21); root.add(deckRailL);
const deckRailR = deckRailL.clone(); deckRailR.name='RailR'; deckRailR.position.z = 0.21; root.add(deckRailR);
// support struts from frame to deck
root.add(tube([rearX,0.5,0],[rearX-0.2,0.62,0],0.016, paintDark, 'StrutA'));
root.add(tube([rearX,0.5,0],[rearX+0.22,0.62,0],0.016, paintDark, 'StrutB'));

// ================== THE BBQ GRILL ==================
const grillGroup = new THREE.Group(); grillGroup.name = 'BBQ_Grill';
// main barrel
const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.5,32), grillIron); barrel.rotation.z=Math.PI/2; barrel.name='Barrel'; grillGroup.add(barrel);
// end caps
const capL = new THREE.Mesh(new THREE.CylinderGeometry(0.225,0.225,0.02,32), grillIron); capL.name='CapL'; capL.position.set(-0.26,0,0); grillGroup.add(capL);
const capR = capL.clone(); capR.name='CapR'; capR.position.x = 0.26; grillGroup.add(capR);
// charcoal grate look: slats on top opening
for (let i=-4;i<=4;i++){
  const slat = mesh(new THREE.BoxGeometry(0.02,0.02,0.5), paintDark, 'Slat');
  slat.position.set(i*0.05, 0.215, 0); grillGroup.add(slat);
}
// lid (half shell) hinged open with angle
const lid = new THREE.Mesh(new THREE.SphereGeometry(0.232, 32, 16, 0, Math.PI*2, 0, Math.PI/2), grillIron); 
lid.rotation.z = Math.PI; // make hemisphere
lid.scale.set(1,1,1);
// simpler: use a half-cylinder as raised lid
const lidHalf = new THREE.Mesh(new THREE.CylinderGeometry(0.225,0.225,0.5,32,1,true,0,Math.PI), grillIron);
lidHalf.name='Lid'; lidHalf.position.y = 0.25; lidHalf.rotation.z = Math.PI/2; 
grillGroup.add(lidHalf);
// lid knob
const knob = sphere(0.03, darkChrome,'Knob',0, 0.5, 0); grillGroup.add(knob);
// smoke stack
const stack = mesh(new THREE.CylinderGeometry(0.05,0.06,0.16,14), darkChrome,'Stack'); stack.position.set(0.0,0.5,0); grillGroup.add(stack);
// vents on side (little cylinders sticking out)
const vent1 = mesh(new THREE.CylinderGeometry(0.035,0.035,0.08,12), darkChrome,'Vent1'); vent1.rotation.x=Math.PI/2; vent1.position.set(0,-0.1,-0.26); grillGroup.add(vent1);
const vent2 = vent1.clone(); vent2.name='Vent2'; vent2.rotation.z=Math.PI; vent2.position.z = 0.26; grillGroup.add(vent2);
grillGroup.position.set(rearX, 0.86, 0);
root.add(grillGroup);

// skewer / tongs decor
const tongs = mesh(new THREE.BoxGeometry(0.03,0.34,0.03), cream, 'Tongs'); tongs.position.set(rearX+0.3, 0.55, 0.05); tongs.rotation.x=0.4; root.add(tongs);

// Front basket
const basket = mesh(new THREE.BoxGeometry(0.12,0.16,0.3), chrome, 'Basket'); basket.position.set(frontX+0.02, 0.72, 0); root.add(basket);

// ground shadow not needed

scene.add(root);
root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

// ---------- Animation: wheels spin ----------
const Z = new THREE.Vector3(0, 0, 1);
function quatTrack(nodeName, duration, totalRad) {
  // Sample many keyframes so the wheel visibly rotates through the whole turn.
  const n = Math.round(duration / 0.25) + 1;
  const times = [], values = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * duration;
    const q = new THREE.Quaternion().setFromAxisAngle(Z, (t / duration) * totalRad);
    times.push(t); values.push(q.x, q.y, q.z, q.w);
  }
  return new THREE.QuaternionKeyframeTrack(nodeName + '.quaternion', times, values);
}
const SPIN_TIME = 4;                  // one full revolution per 4 s
const spinClip = new THREE.AnimationClip('Wheels Spin', SPIN_TIME, [
  quatTrack('WheelFront', SPIN_TIME, Math.PI * 2),
  quatTrack('WheelRear', SPIN_TIME, Math.PI * 2),
]);
root.animations = [spinClip];

// Flatten: put every part directly under a THREE.Scene so wheels are TOP-LEVEL nodes.
// (Exporting a Group adds a wrapper node, which makes GLTFLoader prefix animation
//  tracks with the wrapper name and breaks plain '<node>.quaternion' bindings.)
const flatScene = new THREE.Scene();
while (root.children.length) flatScene.add(root.children[0]);
flatScene.name = 'BBQ_Bike_Scene';
const exporter = new GLTFExporter();
const result = await exporter.parseAsync(flatScene, { binary: true, animations: [spinClip] });
const bytes = result instanceof ArrayBuffer ? result : await result.arrayBuffer();
writeFileSync('/home/user/unzipped/demo-bbq-bike.glb', Buffer.from(bytes));
console.log('demo-bbq-bike.glb written:', bytes.byteLength, 'bytes');
