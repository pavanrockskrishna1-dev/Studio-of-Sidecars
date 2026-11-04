import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { registerFx } from "./fxClock";
import { BIKE_ANCHORS, anchorFromBox } from "./bikeAnchors";
import { createHistory, record, at as historyAt } from "./bikeAnchorHistory";
import { seeded } from "./PremiumEffects";

const sprite = (draw, size = 64) => {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const radial = (stops) => (ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
};

const smokeTex = () => sprite(radial([[0, "rgba(200,190,180,0.4)"], [0.4, "rgba(180,170,160,0.15)"], [1, "rgba(150,140,130,0)"]]), 128);
const puffTex = () => sprite(radial([[0, "rgba(220,225,230,0.6)"], [0.3, "rgba(180,190,200,0.2)"], [1, "rgba(120,130,140,0)"]]), 64);
const glowTex = () => sprite(radial([[0, "rgba(255,255,255,1)"], [0.2, "rgba(255,200,150,0.8)"], [0.6, "rgba(255,100,50,0.2)"], [1, "rgba(255,50,0,0)"]]), 128);
const redGlowTex = () => sprite(radial([[0, "rgba(255,180,180,1)"], [0.2, "rgba(255,50,50,0.8)"], [0.6, "rgba(200,0,0,0.2)"], [1, "rgba(50,0,0,0)"]]), 128);

function BikeFxGrill({ effect }) {
  const { scene } = useThree();
  const nodeName = BIKE_ANCHORS.grill.node;
  const geometry = useMemo(() => new THREE.BufferGeometry(), []);
  const material = useMemo(() => new THREE.PointsMaterial({
    map: smokeTex(),
    size: 1.5,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    vertexColors: true
  }), []);

  useEffect(() => () => {
    geometry.dispose();
    material.map?.dispose();
    material.dispose();
  }, [geometry, material]);

  const count = 120;
  const spacing = 3.2 / count;
  useEffect(() => {
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 4), 4));
  }, [geometry]);

  const history = useMemo(() => createHistory(), []);
  const rand = useMemo(() => seeded(99, count * 4), []);
  const box = useMemo(() => new THREE.Box3(), []);

  useEffect(() => registerFx((t) => {
    const node = scene.getObjectByName(nodeName);
    if (!node) {
      material.opacity = 0;
      return;
    }
    material.opacity = 1;
    node.updateWorldMatrix(true, true);
    box.setFromObject(node);
    const anchor = anchorFromBox({ min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] }, BIKE_ANCHORS.grill.rule);
    record(history, t, anchor);

    const pos = geometry.attributes.position;
    const col = geometry.attributes.color;
    for (let i = 0; i < count; i++) {
      const tb = i * spacing;
      const life = 3.2;
      const age = ((t - tb) % life + life) % life;
      const birthTime = t - age;
      const base = historyAt(history, birthTime);
      if (!base) {
         col.setW(i, 0);
         continue;
      }
      const rx = rand[i * 4] - 0.5;
      const rz = rand[i * 4 + 1] - 0.5;
      const rise = age * 0.5 * effect.size;
      const driftX = rx * age * 0.4 * effect.size;
      const driftZ = rz * age * 0.4 * effect.size;
      
      pos.setXYZ(i, base[0] + driftX, base[1] + rise, base[2] + driftZ);
      
      let alpha = 0;
      if (age < 0.4) alpha = age / 0.4;
      else alpha = Math.max(0, 1 - (age - 0.4) / 2.8);
      
      col.setXYZW(i, 1, 1, 1, alpha);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    material.size = 1.5 * effect.size;
  }), [scene, nodeName, geometry, material, history, rand, effect.size, box]);

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

function BikeFxExhaust({ effect }) {
  const { scene } = useThree();
  const nodeName = BIKE_ANCHORS.exhaust.node;
  const geometry = useMemo(() => new THREE.BufferGeometry(), []);
  const material = useMemo(() => new THREE.PointsMaterial({
    map: puffTex(),
    size: 0.8,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    vertexColors: true
  }), []);

  useEffect(() => () => {
    geometry.dispose();
    material.map?.dispose();
    material.dispose();
  }, [geometry, material]);

  const count = 40;
  const life = 0.9;
  const spacing = life / count;
  useEffect(() => {
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 4), 4));
  }, [geometry]);

  const history = useMemo(() => createHistory(), []);
  const rand = useMemo(() => seeded(88, count * 4), []);
  const box = useMemo(() => new THREE.Box3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const dirVec = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => registerFx((t) => {
    const node = scene.getObjectByName(nodeName);
    if (!node) {
      material.opacity = 0;
      return;
    }
    material.opacity = 1;
    node.updateWorldMatrix(true, true);
    box.setFromObject(node);
    const anchor = anchorFromBox({ min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] }, BIKE_ANCHORS.exhaust.rule);
    record(history, t, anchor);

    node.getWorldQuaternion(q);
    const defDir = BIKE_ANCHORS.exhaust.dir;
    dirVec.set(defDir[0], defDir[1], defDir[2]).applyQuaternion(q).normalize();

    const pos = geometry.attributes.position;
    const col = geometry.attributes.color;
    for (let i = 0; i < count; i++) {
      const tb = i * spacing;
      const age = ((t - tb) % life + life) % life;
      const birthTime = t - age;
      const base = historyAt(history, birthTime);
      if (!base) {
         col.setW(i, 0);
         continue;
      }
      
      const rx = rand[i * 4] - 0.5;
      const ry = rand[i * 4 + 1] - 0.5;
      const rz = rand[i * 4 + 2] - 0.5;
      
      const dist = age * 1.5 * effect.size;
      const spread = age * 0.4 * effect.size;
      
      pos.setXYZ(
        i,
        base[0] + dirVec.x * dist + rx * spread,
        base[1] + dirVec.y * dist + ry * spread,
        base[2] + dirVec.z * dist + rz * spread
      );
      
      let alpha = age < 0.1 ? age / 0.1 : Math.max(0, 1 - (age - 0.1) / 0.8);
      
      let r = 1, g = 1, b = 1;
      if (age < 0.2) {
        r = 0.8; g = 0.9; b = 1.0;
      }
      
      col.setXYZW(i, r, g, b, alpha);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    material.size = 0.8 * effect.size;
  }), [scene, nodeName, geometry, material, history, rand, effect.size, box, q, dirVec]);

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

function BikeFxHeadlight({ effect }) {
  const { scene } = useThree();
  const nodeName = BIKE_ANCHORS.headlight.node;
  
  const coneGeo = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.55, 3.0, 32, 1, true);
    geo.translate(0, -1.5, 0);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);
  
  const coneMat = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 8; c.height = 256;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "rgba(255,225,160,0.16)");
    g.addColorStop(0.45, "rgba(255,225,160,0.06)");
    g.addColorStop(1, "rgba(255,225,160,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    
    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }, []);

  const spriteGeo = useMemo(() => new THREE.BufferGeometry(), []);
  const spriteMat = useMemo(() => new THREE.PointsMaterial({
    map: glowTex(),
    size: 0.8,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }), []);

  useEffect(() => () => {
    coneGeo.dispose();
    coneMat.map?.dispose();
    coneMat.dispose();
    spriteGeo.dispose();
    spriteMat.map?.dispose();
    spriteMat.dispose();
  }, [coneGeo, coneMat, spriteGeo, spriteMat]);

  useEffect(() => {
    spriteGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
  }, [spriteGeo]);

  const box = useMemo(() => new THREE.Box3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const dirVec = useMemo(() => new THREE.Vector3(), []);
  const coneRef = useRef();

  useEffect(() => registerFx((t) => {
    const node = scene.getObjectByName(nodeName);
    if (!node) {
      coneMat.opacity = 0;
      spriteMat.opacity = 0;
      return;
    }
    coneMat.opacity = 1;
    spriteMat.opacity = 1;
    
    node.updateWorldMatrix(true, true);
    box.setFromObject(node);
    const anchor = anchorFromBox({ min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] }, BIKE_ANCHORS.headlight.rule);
    
    node.getWorldQuaternion(q);
    const defDir = BIKE_ANCHORS.headlight.dir;
    dirVec.set(defDir[0], defDir[1], defDir[2]).applyQuaternion(q).normalize();
    
    if (coneRef.current) {
      coneRef.current.position.set(anchor[0], anchor[1], anchor[2]);
      const target = new THREE.Vector3(anchor[0] + dirVec.x, anchor[1] + dirVec.y, anchor[2] + dirVec.z);
      coneRef.current.lookAt(target);
      coneRef.current.scale.setScalar(effect.size);
    }
    
    const pos = spriteGeo.attributes.position;
    pos.setXYZ(0, anchor[0], anchor[1], anchor[2]);
    pos.needsUpdate = true;
    spriteMat.size = 0.8 * effect.size;
  }), [scene, nodeName, box, q, dirVec, effect.size, coneMat, spriteMat, spriteGeo]);

  return (
    <group>
      <mesh ref={coneRef} geometry={coneGeo} material={coneMat} frustumCulled={false} />
      <points geometry={spriteGeo} material={spriteMat} frustumCulled={false} />
    </group>
  );
}

function BikeFxTaillight({ effect }) {
  const { scene } = useThree();
  const nodeName = BIKE_ANCHORS.taillight.node;
  
  const spriteGeo = useMemo(() => new THREE.BufferGeometry(), []);
  const spriteMat = useMemo(() => new THREE.PointsMaterial({
    map: redGlowTex(),
    size: 0.6,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true
  }), []);

  const largeGeo = useMemo(() => new THREE.BufferGeometry(), []);
  const largeMat = useMemo(() => new THREE.PointsMaterial({
    map: redGlowTex(),
    size: 1.2,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true
  }), []);

  useEffect(() => () => {
    spriteGeo.dispose();
    spriteMat.map?.dispose();
    spriteMat.dispose();
    largeGeo.dispose();
    largeMat.map?.dispose();
    largeMat.dispose();
  }, [spriteGeo, spriteMat, largeGeo, largeMat]);

  useEffect(() => {
    spriteGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
    spriteGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(4), 4));
    largeGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
    largeGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(4), 4));
  }, [spriteGeo, largeGeo]);

  const box = useMemo(() => new THREE.Box3(), []);
  
  useEffect(() => registerFx((t) => {
    const node = scene.getObjectByName(nodeName);
    if (!node) {
      spriteMat.opacity = 0;
      largeMat.opacity = 0;
      return;
    }
    spriteMat.opacity = 1;
    largeMat.opacity = 1;
    
    node.updateWorldMatrix(true, true);
    box.setFromObject(node);
    const anchor = anchorFromBox({ min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] }, BIKE_ANCHORS.taillight.rule);
    
    const pulse = 0.8 + 0.2 * Math.sin(t * 4);
    
    const pos1 = spriteGeo.attributes.position;
    const col1 = spriteGeo.attributes.color;
    pos1.setXYZ(0, anchor[0], anchor[1], anchor[2]);
    col1.setXYZW(0, 1, 1, 1, pulse);
    pos1.needsUpdate = true;
    col1.needsUpdate = true;
    
    const pos2 = largeGeo.attributes.position;
    const col2 = largeGeo.attributes.color;
    pos2.setXYZ(0, anchor[0], anchor[1], anchor[2]);
    col2.setXYZW(0, 1, 1, 1, pulse * 0.4);
    pos2.needsUpdate = true;
    col2.needsUpdate = true;
    
    spriteMat.size = 0.6 * effect.size;
    largeMat.size = 1.2 * effect.size;
  }), [scene, nodeName, box, spriteGeo, spriteMat, largeGeo, largeMat, effect.size]);

  return (
    <group>
      <points geometry={spriteGeo} material={spriteMat} frustumCulled={false} />
      <points geometry={largeGeo} material={largeMat} frustumCulled={false} />
    </group>
  );
}

export default function BikeFx({ effect }) {
  if (effect.type === "bikegrill") return <BikeFxGrill effect={effect} />;
  if (effect.type === "bikeexhaust") return <BikeFxExhaust effect={effect} />;
  if (effect.type === "bikeheadlight") return <BikeFxHeadlight effect={effect} />;
  if (effect.type === "biketaillight") return <BikeFxTaillight effect={effect} />;
  return null;
}
