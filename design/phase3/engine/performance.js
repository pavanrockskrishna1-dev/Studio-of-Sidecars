/* ENGINE · performance.js — Phase 3. Honor-Pad-first adaptive perf, 60 FPS targeting. */
export function init(engine) {
  engine.perf = { fps: 60, ms: 16, low: false, samples: 0, sum: 0, dpr: 1, shadow: true };
  engine.perf.dpr = Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1, 2);
}

/* Called every frame with delta-seconds. Returns nothing; self adjusts. */
export function sample(engine, dt) {
  const p = engine.perf;
  const ms = dt * 1000;
  p.sum += ms; p.samples++;
  if (p.samples >= 40) {
    p.ms = p.sum / p.samples; p.sum = 0; p.samples = 0;
    p.fps = Math.round(1000 / Math.max(p.ms, 0.1));
    adapt(engine);
  }
  return p;
}

function adapt(engine) {
  const p = engine.perf;
  if (p.ms > 22 && p.dpr > 1 && engine.renderer) {          // ~<45fps
    p.dpr = Math.max(1, p.dpr - 0.5);
    engine.renderer.setPixelRatio(p.dpr);
    p.low = true;
  } else if (p.ms > 28 && engine.renderer.shadowMap.enabled) {
    engine.renderer.shadowMap.enabled = false;
    engine.renderer.shadowMap.needsUpdate = true;
    p.shadow = false;
  } else if (p.ms < 14 && p.shadow === false) {
    engine.renderer.shadowMap.enabled = true;
    engine.renderer.shadowMap.needsUpdate = true;
    p.shadow = true;
  }
  engine.bus && engine.bus.emit('perf', { fps: p.fps, dpr: p.dpr, shadow: p.shadow, low: p.low });
}

export function snapshotQuality(engine) {
  const p = engine.perf;
  return { fps: p.fps, ms: Math.round(p.ms * 10) / 10, dpr: p.dpr, shadow: p.shadow, low: p.low };
}

export function degrade(engine) {
  const p = engine.perf;
  p.dpr = 1; engine.renderer.setPixelRatio(1);
  p.shadow = false; engine.renderer.shadowMap.enabled = false;
  engine.bus && engine.bus.emit('perf', { fps: p.fps, dpr: 1, shadow: false, low: true });
}
export function restoreQuality(engine) {
  const p = engine.perf;
  p.dpr = Math.min(devicePixelRatio || 1, 2); engine.renderer.setPixelRatio(p.dpr);
  p.shadow = true; engine.renderer.shadowMap.enabled = true;
  p.low = false;
  engine.bus && engine.bus.emit('perf', { fps: p.fps, dpr: p.dpr, shadow: true, low: false });
}
