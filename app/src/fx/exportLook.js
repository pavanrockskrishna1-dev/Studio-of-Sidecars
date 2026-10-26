import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { warmthTint } from "./lookStore";

/* The Look engine: ONE finish shared by the live view and the Reel export, so
   what you see while editing is what exports. The scene renders into an HDR
   target (multisampled for crisp edges), bright things bloom (fire, eyes,
   embers), tone mapping, then a display-space grade: contrast, saturation,
   warmth, a light sharpen and a soft vignette. Smooth mode (live only) drops
   the multisampling and runs the bloom at half resolution. */

// High threshold: only genuinely bright light (fire, lamps, eyes, embers)
// glows; a well-lit model on a bright backdrop must not wash out.
const BLOOM_RADIUS = 0.4;
const BLOOM_THRESHOLD = 0.92;

const LookShader = {
  uniforms: {
    tDiffuse: { value: null },
    texel: { value: new THREE.Vector2() },
    contrast: { value: 1 },
    saturation: { value: 1 },
    tint: { value: new THREE.Vector3(1, 1, 1) },
    vignette: { value: 0 },
    sharpen: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 texel;
    uniform float contrast, saturation, vignette, sharpen;
    uniform vec3 tint;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec3 blur = 0.25 * (texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)).rgb + texture2D(tDiffuse, vUv - vec2(texel.x, 0.0)).rgb
                        + texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb + texture2D(tDiffuse, vUv - vec2(0.0, texel.y)).rgb);
      c += (c - blur) * sharpen;
      c *= tint;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, saturation);
      c = (c - 0.5) * contrast + 0.5;
      float d = length(vUv - 0.5) * 1.41421;
      c *= 1.0 - vignette * d * d;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }
  `,
};

// { render(), setParams(params), dispose() } drawing the look onto the canvas
// at w x h. params: lookStore params. opts.smooth: the cheaper live variant
// (no focus blur: it renders the scene's depth a second time).
// opts.getFocus(): metres from the camera to what it looks at (focus blur).
export function createLook(gl, scene, camera, w, h, params, { smooth = false, getFocus = null } = {}) {
  const target = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: smooth ? 0 : 4 });
  const composer = new EffectComposer(gl, target);
  composer.setPixelRatio(1);
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));
  // focus blur: sharp where the camera looks, softer in front and behind
  const bokeh = smooth ? null : new BokehPass(scene, camera, { focus: 5, aperture: 0, maxblur: 0 });
  if (bokeh) composer.addPass(bokeh);
  const bloomRes = smooth ? new THREE.Vector2(w / 2, h / 2) : new THREE.Vector2(w, h);
  const bloom = new UnrealBloomPass(bloomRes, params.bloom, BLOOM_RADIUS, BLOOM_THRESHOLD);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(LookShader);
  grade.uniforms.texel.value.set(1 / w, 1 / h);
  composer.addPass(grade);
  const prevExposure = gl.toneMappingExposure;
  let exposure = 1;

  const setParams = (p) => {
    exposure = p.exposure;
    bloom.strength = p.bloom;
    bloom.enabled = p.bloom > 0.001;
    grade.uniforms.contrast.value = p.contrast;
    grade.uniforms.saturation.value = p.saturation;
    grade.uniforms.tint.value.fromArray(warmthTint(p.warmth));
    grade.uniforms.vignette.value = p.vignette;
    grade.uniforms.sharpen.value = p.sharpen;
    if (bokeh) {
      const b = p.focusBlur ?? 0;
      bokeh.enabled = b > 0.001;
      bokeh.uniforms.aperture.value = 0.004 * b;
      bokeh.uniforms.maxblur.value = 0.012 * b;
    }
  };
  setParams(params);

  return {
    render() {
      gl.toneMappingExposure = exposure;
      if (bokeh && bokeh.enabled) {
        // the Reel changes the camera's aspect and far plane between shots
        bokeh.uniforms.aspect.value = camera.aspect;
        bokeh.uniforms.nearClip.value = camera.near;
        bokeh.uniforms.farClip.value = camera.far;
        if (getFocus) bokeh.uniforms.focus.value = Math.max(0.2, getFocus());
      }
      composer.render();
    },
    setParams,
    dispose() {
      gl.toneMappingExposure = prevExposure;
      composer.dispose();
      target.dispose();
    },
  };
}
