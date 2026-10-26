export const GRADES = {
  raw:    { label: "Raw",    bloom: 0,    grain: 0,    vignette: 0,    tint: [1.00, 1.00, 1.00] },
  warm:   { label: "Warm",   bloom: 0.35, grain: 0.04, vignette: 0.55, tint: [1.12, 0.98, 0.82] },
  moody:  { label: "Moody",  bloom: 0.20, grain: 0.06, vignette: 0.75, tint: [0.88, 0.94, 1.08] },
  cinema: { label: "Cinema", bloom: 0.55, grain: 0.08, vignette: 0.65, tint: [1.06, 1.00, 0.90] },
};
export const GRADE_IDS = Object.keys(GRADES);

export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tint:     { value: [1, 1, 1] },
    vigAmt:   { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec3 tint;
    uniform float vigAmt;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      c.rgb *= tint;
      float d = length(vUv - 0.5) * 1.41421;
      float vig = 1.0 - vigAmt * d * d;
      c.rgb *= vig;
      gl_FragColor = c;
    }
  `,
};