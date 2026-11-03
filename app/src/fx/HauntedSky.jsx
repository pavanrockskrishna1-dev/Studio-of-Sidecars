import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// The purple haunted sky: a big dome around the whole set (not a flat backdrop)
// whose horizon colour equals the stage fog, so the far ground melts into it.
// Only the blurred purple glow of the painted reference is used, so no painted
// trees appear in the sky - the trees are the real 3D props. The dome follows
// the camera, so it is always centred on the view.
export const HAUNTED_HORIZON = 0x3a1560;
const SKY_URL = "/textures/sky/haunted-purple.png";

const VERT = "varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const FRAG = `uniform sampler2D map; uniform vec3 horizon; varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float u = atan(d.x, d.z) / 6.2831853 + 0.5;
    u = abs(fract(u * 2.0) * 2.0 - 1.0);
    float h = clamp(d.y, 0.0, 1.0);
    vec3 col = texture2D(map, vec2(u, 0.08 + 0.92 * pow(h, 0.6))).rgb;
    col = mix(horizon, col, smoothstep(0.02, 0.34, d.y));
    col = mix(col, horizon * 0.6, smoothstep(0.0, -0.25, d.y));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;

export default function HauntedSky() {
  const mesh = useRef(null);
  const uniforms = useMemo(() => ({ map: { value: null }, horizon: { value: new THREE.Color(HAUNTED_HORIZON) } }), []);
  useEffect(() => {
    const im = new Image();
    let tex = null;
    im.onload = () => {
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 512;
      const x = c.getContext("2d");
      x.filter = "blur(14px)";
      x.drawImage(im, 150, 70, 300, 170, -40, -40, 1104, 592);
      tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      uniforms.map.value = tex;
    };
    im.src = SKY_URL;
    return () => {
      im.onload = null; // prevent a late-firing callback from leaking the texture
      if (tex) tex.dispose();
    };
  }, [uniforms]);
  useFrame(({ camera }) => { if (mesh.current) mesh.current.position.copy(camera.position); });
  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[90, 48, 24]} />
      <shaderMaterial uniforms={uniforms} vertexShader={VERT} fragmentShader={FRAG} side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
}
