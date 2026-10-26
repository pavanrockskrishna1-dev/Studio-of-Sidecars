import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { reelTime } from "../animation/reelTime";
import { DOOR_OPEN } from "../animation/halloweenSet";
import * as occasionStore from "../animation/occasionStore";

// Halloween: 16 purple bats burst out of the BBQ Bike's cabinet as its door
// flips open (the Halloween Night set's finale shot) and scatter toward the
// camera and the sky. Model frame (metres, Y up, the bike's front +Z). Each
// bat's flight is a pure function of the Reel time, so preview and export match.

const COUNT = 16;
const BURST_AT = DOOR_OPEN.startS + DOOR_OPEN.openS * 0.45; // once the door is about half open
const SPAWN = new THREE.Vector3(0.71, 0.6, 0.55); // inside the cabinet, behind the door
const MOUTH_Z = 1.2; // just out past the open door

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), s | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function makeFlights() {
  const r = rng(13);
  return Array.from({ length: COUNT }, (_, i) => {
    const back = r() < 0.3; // a few peel off back over the grill into the trees
    return {
      delay: i * 0.066 + r() * 0.1,
      life: 2.1 + r() * 0.7,
      size: 0.85 + r() * 0.6,
      start: new THREE.Vector3(SPAWN.x + (r() - 0.5) * 0.36, SPAWN.y + (r() - 0.5) * 0.4, SPAWN.z - r() * 0.3),
      mouth: new THREE.Vector3(SPAWN.x + (r() - 0.5) * 0.4, SPAWN.y + (r() - 0.5) * 0.25, MOUTH_Z),
      far: back
        ? new THREE.Vector3(SPAWN.x + (r() - 0.5) * 5, 1.8 + r() * 2, -(1.5 + r() * 2.5))
        : new THREE.Vector3(SPAWN.x - 3.2 + r() * 6.6, 0.9 + r() * 2.5, 2 + r() * 2.5),
      flap: 7.5 + r() * 2,
      phase: r() * Math.PI * 2,
    };
  });
}

function wingGeometry(side) {
  const pts = [[0, 0.03], [0.06, 0.05], [0.12, 0.06], [0.18, 0.03], [0.17, -0.02], [0.13, -0.005], [0.1, -0.04], [0.065, -0.015], [0.035, -0.045], [0, -0.02]];
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * side, y)));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2); // lie flat: span along X, length along Z
  return g;
}

const smooth = (k) => k * k * (3 - 2 * k);
const _p = new THREE.Vector3();
const _prev = new THREE.Vector3();
const _ctrl = new THREE.Vector3();

// position of bat f at e seconds after its burst (null before it leaves / after it is gone)
function flightAt(f, e, out) {
  const k = (e - f.delay) / f.life;
  if (k < 0 || k > 1) return null;
  if (k < 0.12) return out.copy(f.start).lerp(f.mouth, smooth(k / 0.12));
  const q = (k - 0.12) / 0.88;
  _ctrl.copy(f.mouth).add({ x: 0, y: 0.5, z: 0.6 });
  out.copy(f.mouth).multiplyScalar((1 - q) * (1 - q)).addScaledVector(_ctrl, 2 * (1 - q) * q).addScaledVector(f.far, q * q);
  out.x += Math.sin(e * 11 + f.phase) * 0.06;
  out.y += Math.cos(e * 9 + f.phase) * 0.05;
  return out;
}

export default function BatBurst() {
  const { occasionId } = useSyncExternalStore(occasionStore.subscribe, occasionStore.getSnapshot, occasionStore.getSnapshot);
  const flights = useMemo(makeFlights, []);
  const res = useMemo(() => {
    const body = new THREE.SphereGeometry(0.03, 10, 6);
    body.scale(1, 0.8, 1.6);
    const eye = new THREE.SphereGeometry(0.006, 6, 4);
    const skin = new THREE.MeshStandardMaterial({ color: 0x14061f, emissive: 0x5a1890, emissiveIntensity: 0.6, roughness: 0.7, side: THREE.DoubleSide });
    const glow = new THREE.MeshBasicMaterial({ color: 0xff7a1a, toneMapped: false });
    return { body, eye, skin, glow, wingL: wingGeometry(1), wingR: wingGeometry(-1) };
  }, []);
  const bats = useRef([]);

  useEffect(() => () => Object.values(res).forEach((r) => r.dispose?.()), [res]);

  useFrame(() => {
    const live = occasionId === "halloween" && reelTime.active && reelTime.shot === DOOR_OPEN.shot;
    const e = reelTime.t - BURST_AT;
    flights.forEach((f, i) => {
      const b = bats.current[i];
      if (!b) return;
      const at = live ? flightAt(f, e, _p) : null;
      b.group.visible = !!at;
      if (!at) return;
      const before = flightAt(f, e - 1 / 30, _prev) || f.start;
      b.group.position.copy(at);
      const dx = at.x - before.x;
      const dy = at.y - before.y;
      const dz = at.z - before.z;
      b.group.rotation.set(-Math.atan2(dy, Math.hypot(dx, dz)) * 0.6, Math.atan2(dx, dz), Math.sin(e * 5 + f.phase) * 0.25, "YXZ");
      b.group.scale.setScalar(f.size);
      const flap = Math.sin(e * f.flap * 2 + f.phase);
      b.left.rotation.z = flap * 0.9;
      b.right.rotation.z = -flap * 0.9;
    });
  });

  if (occasionId !== "halloween") return null;
  return (
    <group>
      {flights.map((f, i) => (
        <group key={i} visible={false} ref={(g) => { if (g) bats.current[i] = { group: g, left: g.children[1], right: g.children[2] }; }}>
          <mesh geometry={res.body} material={res.skin} />
          <mesh geometry={res.wingL} material={res.skin} position={[0.02, 0, 0]} />
          <mesh geometry={res.wingR} material={res.skin} position={[-0.02, 0, 0]} />
          <mesh geometry={res.eye} material={res.glow} position={[0.012, 0.012, 0.045]} />
          <mesh geometry={res.eye} material={res.glow} position={[-0.012, 0.012, 0.045]} />
        </group>
      ))}
    </group>
  );
}
