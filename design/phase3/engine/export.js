import * as THREE from 'three';
/* ENGINE · export.js — Phase 3. Export Studio: PNG/JPG/transparent, WebM reel, GLB, JSON. */
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { FORMATS, EXPORT_STILLS } from './config.js';

export function init(engine) {
  engine.exportCfg = { format: '9:16 reel', res: '1080p' };
  engine.fmtKey = key => engine.exportCfg.format = FORMATS[key] ? key : engine.exportCfg.format;
  return { setFormat, still, record, glb, jsonState, download };
}

export function setFormat(engine, label) {
  if (FORMATS[label]) engine.exportCfg.format = label;
  if (engine.bus) engine.bus.emit('format', engine.exportCfg.format);
}

export function setRes(engine, resLabel) { engine.exportCfg.res = resLabel; }

function fmtSize(engine, mul) {
  const f = FORMATS[engine.exportCfg.format] || FORMATS['9:16 reel'];
  const m = { '1080p': 1, '2K': 1.4, '4K': 2.6 }[engine.exportCfg.res] || 1;
  return { w: Math.round(f.w * m), h: Math.round(f.h * m), label: f.key, name: f.label };
}

/* Temporarily resize the live renderer + camera aspect, render, restore. */
export async function still(engine, { type = 'PNG', transparent = false, outW, outH } = {}) {
  const r = engine.renderer, cam = engine.camera;
  const prevW = r.domElement.width, prevH = r.domElement.height;
  const prevCssW = engine.cssW, prevCssH = engine.cssH;
  const prevAspect = cam.aspect;
  const { w, h } = outW ? { w: outW, h: outH } : fmtSize(engine, 1);
  const pr = Math.min(devicePixelRatio || 1, 2);
  const pw = Math.round(w * pr), ph = Math.round(h * pr);
  const prevBg = engine.scene.background;
  const floorWas = engine.floorMesh ? engine.floorMesh.visible : true;
  try {
    engine.renderer.setSize(pw, ph, false);
    engine.canvas.style.width = w + 'px'; engine.canvas.style.height = h + 'px';
    cam.aspect = w / h; cam.updateProjectionMatrix();
    if (transparent) {
      engine.scene.background = null;
      engine.renderer.setClearAlpha(0);
      if (engine.floorMesh) engine.floorMesh.visible = false;
    }
    engine.renderer.render(engine.scene, cam);
    const blob = await new Promise(res => engine.canvas.toBlob(res, type === 'JPG' ? 'image/jpeg' : 'image/png', 0.95));
    // restore
    if (transparent) {
      engine.scene.background = prevBg;
      engine.renderer.setClearAlpha(1);
      if (engine.floorMesh) engine.floorMesh.visible = floorWas;
    }
    engine.renderer.setSize(prevW, prevH, false);
    engine.canvas.style.width = prevCssW + 'px'; engine.canvas.style.height = prevCssH + 'px';
    cam.aspect = prevAspect; cam.updateProjectionMatrix();
    engine.renderer.render(engine.scene, cam);
    return blob;
  } catch (err) {
    engine.renderer.setSize(prevW, prevH, false);
    if (transparent) { engine.scene.background = prevBg; engine.renderer.setClearAlpha(1); if (engine.floorMesh) engine.floorMesh.visible = floorWas; }
    cam.aspect = prevAspect; cam.updateProjectionMatrix();
    throw err;
  }
}

/* MediaRecorder WebM reel at the chosen format; animates an orbit pass. */
export function record(engine, { seconds = 4, mute = false } = {}) {
  const r = engine.renderer, cam = engine.camera, ctl = engine.controls;
  const prevW = r.domElement.width, prevH = r.domElement.height;
  const prevCssW = engine.cssW, prevCssH = engine.cssH;
  const prevAspect = cam.aspect;
  const { w, h } = fmtSize(engine, 0.55); // keep recording affordable
  const pr = Math.min(devicePixelRatio || 1, 1.6);
  const pw = Math.round(w * pr), ph = Math.round(h * pr);
  const prevAuto = ctl.autoRotate;
  return new Promise(async (resolve, reject) => {
    try {
      engine.renderer.setSize(pw, ph, false);
      engine.canvas.style.width = w + 'px'; engine.canvas.style.height = h + 'px';
      cam.aspect = w / h; cam.updateProjectionMatrix();
      const stream = engine.canvas.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: pickMime(), videoBitsPerSecond: 9e6 });
      const chunks = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      const stopped = new Promise(ok => { rec.onstop = () => ok(new Blob(chunks, { type: rec.mimeType || 'video/webm' })); });
      rec.start();
      ctl.autoRotate = true; ctl.autoRotateSpeed = -1.1;
      await new Promise(ok => setTimeout(ok, seconds * 1000));
      ctl.autoRotate = prevAuto;
      rec.stop();
      const blob = await stopped;
      engine.renderer.setSize(prevW, prevH, false);
      engine.canvas.style.width = prevCssW + 'px'; engine.canvas.style.height = prevCssH + 'px';
      cam.aspect = prevAspect; cam.updateProjectionMatrix();
      engine.renderer.render(engine.scene, cam);
      resolve(blob);
    } catch (err) {
      ctl.autoRotate = false;
      engine.renderer.setSize(prevW, prevH, false);
      engine.canvas.style.width = prevCssW + 'px'; engine.canvas.style.height = prevCssH + 'px';
      cam.aspect = prevAspect; cam.updateProjectionMatrix();
      reject(err);
    }
  });
}
function pickMime() {
  const ok = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4;codecs=avc1'];
  return ok.find(m => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || 'video/webm';
}

export function glb(engine) {
  const exporter = new GLTFExporter();
  // export an array so roots are not reparented away from the live scene
  const objs = engine.models.filter(m => m.root.visible).map(m => m.root);
  return new Promise((res, rej) => exporter.parse(objs, r => res(r), rej, { binary: true, onlyVisible: true }));
}

export function jsonState(engine) { return engine.snapshotState ? JSON.stringify(engine.snapshotState()) : '{}'; }

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 600);
}
