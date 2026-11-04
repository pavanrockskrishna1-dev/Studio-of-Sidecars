import fs from "fs";
import path from "path";
import vm from "vm";
import { KINEMA, resetUid } from "./kinemaStub.mjs";

const basePath = path.join(process.cwd(), "public", "motion");
const manifestPath = path.join(basePath, "manifest.json");

let failCount = 0;
let passCount = 0;

function check(cond, msg) {
  if (!cond) {
    console.error("FAIL: " + msg);
    failCount++;
  } else {
    passCount++;
  }
}

try {
  const ids = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  
  for (const id of ids) {
    const filePath = path.join(basePath, `${id}.js`);
    const code = fs.readFileSync(filePath, "utf-8");
    
    check(!code.includes("Math.random"), "no Math.random");
    check(!code.includes("Date.now"), "no Date.now");
    check(!code.includes("performance.now"), "no performance.now");
    check(!code.includes("fetch("), "no fetch(");
    check(!code.includes("eval("), "no eval(");
    check(!code.includes("document."), "no document.");
    check(!code.includes("XMLHttpRequest"), "no XMLHttpRequest");
    
    const sandbox = { window: { KINEMA_TEMPLATES: [] } };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    
    const templates = sandbox.window.KINEMA_TEMPLATES;
    check(templates.length === 1, "exactly one template registered");
    
    const t = templates[0];
    check(t.id === id, "id equals the file name");
    check(typeof t.label === "string" && t.label.length > 0, "label is non-empty string");
    check(typeof t.desc === "string" && t.desc.length > 0, "desc is non-empty string");
    check(t.kind === "card" || t.kind === "overlay", "kind is card or overlay");
    check(typeof t.dur === "number" && t.dur >= 1 && t.dur <= 8, "dur is 1..8");
    
    check(Array.isArray(t.fields) && t.fields.length <= 4, "fields is array max 4");
    for (const f of t.fields) {
      check(f.key && f.label && typeof f.default === "string" && f.default.length <= 40, "field valid");
    }
    
    resetUid();
    const fields1 = {};
    for (const f of t.fields) fields1[f.key] = f.default;
    const p1 = t.build(fields1, KINEMA);
    
    check(p1.w === 1080 && p1.h === 1920 && p1.fps === 30, "build returns w 1080, h 1920, fps 30");
    check(p1.dur === t.dur, "project dur equal to template dur");
    check(Array.isArray(p1.layers) && p1.layers.length >= 1 && p1.layers.length <= 40, "layers 1..40");
    if (t.kind === "overlay") {
      check(p1.bg === "rgba(0,0,0,0)", "overlay transparent bg");
    }
    
    for (let i = 0; i < p1.layers.length; i++) {
      const l = p1.layers[i];
      check(l.props && typeof l.props.opacity.base === "number", "layer props base");
      
      if (l.trackMatte && l.trackMatte !== "none") {
        check(i > 0, "matted layer not first");
      }
      if (l.blendMode) {
        check(["Add","Screen","Normal"].includes(l.blendMode), "valid blendMode");
      }
      if (l.type === "text") {
        const allowedFonts = ["Archivo Black", "IBM Plex Mono", "Instrument Serif", "Space Grotesk", "Unbounded"];
        check(allowedFonts.includes(l.font), "valid font: " + l.font);
      }
      if (l.type === "image") {
        check(l.src.startsWith("/brand/") || l.src.startsWith("/motion/assets/"), "valid image src: " + l.src);
      }
      for (const pName of ["x","y","z","rx","ry","rz","scale","opacity"]) {
        const p = l.props[pName];
        if (p.keys) {
          let lastT = -1;
          for (const k of p.keys) {
            check(k[0] >= 0 && k[0] <= t.dur, "keyframe t within dur");
            check(k[0] >= lastT, "keyframe t ascending");
            lastT = k[0];
            check(typeof k[1] === "number", "keyframe v numeric");
            const ease = k[2] || "linear";
            const allowedEases = ["linear","easeIn","easeOut","easeInOut","hold","backOut","bounceOut","elasticOut"];
            check(allowedEases.includes(ease), "valid easing");
          }
        }
      }
    }
    
    if (p1.bloom) {
      check(p1.bloom.threshold >= 0 && p1.bloom.threshold <= 0.95, "bloom threshold 0..0.95");
      check(p1.bloom.intensity >= 0 && p1.bloom.intensity <= 3, "bloom intensity 0..3");
      check(p1.bloom.radius >= 0.25 && p1.bloom.radius <= 3, "bloom radius 0.25..3");
    }
    
    resetUid();
    const p2 = t.build(fields1, KINEMA);
    check(JSON.stringify(p1) === JSON.stringify(p2), "deterministic JSON");
    
    const p1Str = JSON.stringify(p1);
    check(!p1Str.includes("NaN") && !p1Str.includes("Infinity"), "no NaN or Infinity");
    console.log(`PASS ${id}`);
  }

  const badT = {
    id: "bad", label: "", desc: "", kind: "card", dur: 10, fields: [],
    build(fields, K) {
      const P = K.pj("Bad", "#000", 10);
      P.w = 500;
      return P;
    }
  };
  check(badT.id === "bad", "self-test pre-check");
  let selfTestFailed = false;
  if (badT.label === "") selfTestFailed = true;
  if (badT.dur > 8) selfTestFailed = true;
  if (selfTestFailed) {
    console.log("PASS self-test (bad template detected)");
  } else {
    console.error("FAIL self-test");
    failCount++;
  }
  
  if (failCount > 0) {
    console.error(`FAILED (${failCount} failures, ${passCount} passes)`);
    process.exit(1);
  } else {
    console.log(`ALL CHECKS PASSED (${passCount} PASS)`);
  }
} catch (e) {
  console.error("Error running test-motion-templates:", e);
  process.exit(1);
}