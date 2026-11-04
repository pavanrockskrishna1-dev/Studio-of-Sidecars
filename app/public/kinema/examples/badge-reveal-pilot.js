(function () {
  const K_ = window.KINEMA; const { mkShape, mkImage, mkParticle, K, B, pj } = K_;
  window.__buildPilot = function (opts) {
    opts = opts || {};
    const P = pj('BBQ Ride Badge Reveal', '#0A0604', 3.6); P.w = 1080; P.h = 1920; P.fps = 30;
    const IMG = '/brand/bbqride-badge.png';
    const glow = mkShape({ shape: 'ellipse', w: 820, h: 820, fill: '#FF6A1A', name: 'ember glow' });
    glow.blendMode = 'Add'; glow.fx = [{ type: 'glow', enabled: true, color: '#FF5A10', blur: 120, spread: 60 }];
    K(glow.props.opacity, [[0, 0, 'hold'], [0.6, 0, 'easeOut'], [1.5, 0.9, 'easeOut'], [3.6, 0.55, 'easeInOut']]);
    K(glow.props.scale, [[0.6, 0.6, 'easeOut'], [1.6, 1.15, 'easeOut'], [3.6, 1.0, 'easeInOut']]);
    const disc = mkShape({ shape: 'ellipse', w: 930, h: 930, fillType: 'gradient', fillA: '#F2BC5A', fillB: '#B5601A', fillAngle: 90, name: 'gold disc' });
    const discMatte = mkShape({ shape: 'ellipse', w: 930, h: 930, fill: '#FFFFFF', name: 'disc matte' });
    const badge = mkImage({ src: IMG, w: 980, h: 980, name: 'badge' });
    for (const L of [disc, discMatte, badge]) {
      K(L.props.scale, [[0.5, 0.55, 'backOut'], [1.4, 1, 'easeOut']]);
      K(L.props.rz, [[0.5, -24, 'backOut'], [1.4, 0, 'easeOut']]);
      K(L.props.opacity, [[0, 0, 'hold'], [0.5, 0, 'easeOut'], [0.85, 1, 'easeOut']]);
    }
    const sweep = mkShape({ shape: 'rect', w: 170, h: 1300, radius: 0, fillType: 'gradient', fillA: '#FFFFFF', fillB: '#FFFFFF', name: 'sweep' });
    sweep.props.rz = B(18); sweep.blendMode = 'Add'; sweep.trackMatte = 'alpha';
    sweep.fx = [{ type: 'blur', enabled: true, radius: 14 }];
    K(sweep.props.x, [[1.55, -760, 'linear'], [2.15, 760, 'easeInOut']]);
    K(sweep.props.opacity, [[0, 0, 'hold'], [1.5, 0, 'linear'], [1.7, 0.85, 'easeOut'], [2.1, 0.85, 'linear'], [2.2, 0, 'easeIn']]);
    const ring = mkShape({ shape: 'ellipse', w: 980, h: 980, fill: 'none', strokeW: 7, strokeColor: '#FFB04A', name: 'shockwave' });
    ring.blendMode = 'Add'; ring.fx = [{ type: 'glow', enabled: true, color: '#FF7A20', blur: 30, spread: 10 }];
    K(ring.props.scale, [[1.2, 0.9, 'easeOut'], [2.2, 1.9, 'easeOut']]);
    K(ring.props.opacity, [[0, 0, 'hold'], [1.2, 0.9, 'easeOut'], [2.2, 0, 'easeIn']]);
    const orbit = mkShape({ shape: 'ellipse', w: 1040, h: 1040, fill: 'none', strokeW: 2.5, strokeColor: '#FF9A3A', dash: 18, name: 'orbit' });
    K(orbit.props.rz, [[0, 0, 'linear'], [3.6, 100]]);
    K(orbit.props.opacity, [[0, 0, 'hold'], [1.3, 0, 'easeOut'], [1.9, 0.55, 'easeOut'], [3.6, 0.55, 'linear']]);
    const embers = mkParticle({ name: 'embers', shape: 'circle', count: 120, rate: 46, life: 2.4, speed: 230, spread: 150, angle: 90, sizeStart: 10, sizeEnd: 1, colorStart: '#FFC864', colorEnd: '#FF3A08', gravity: -40 });
    embers.blendMode = 'Add'; embers.props.y = B(-380);
    embers.fx = [{ type: 'glow', enabled: true, color: '#FF8A1E', blur: 14, spread: 4 }];
    K(embers.props.opacity, [[0, 0, 'hold'], [1.2, 0, 'easeOut'], [1.3, 1, 'easeOut']]);
    P.layers = [embers, discMatte, sweep, badge, disc, orbit, ring, glow];
    if (opts.bloom) P.bloom = opts.bloom;
    return P;
  };
  window.__sheet = async function (P, frames, th) {
    const W = P.w, H = P.h; th = th || 380;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    K_.seed(1234); ctx.clearRect(0, 0, W, H); K_.renderProject(ctx, JSON.parse(JSON.stringify(P)), 1.5);
    await new Promise(r => setTimeout(r, 700));
    const run = JSON.parse(JSON.stringify(P)); K_.seed(1234);
    const want = new Set(frames), out = {}; const t0 = performance.now(); const last = Math.max(...frames);
    for (let f = 0; f <= last; f++) {
      ctx.clearRect(0, 0, W, H); K_.renderProject(ctx, run, f / 30);
      if (want.has(f)) { const c = document.createElement('canvas'); c.height = th; c.width = Math.round(th * W / H); c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height); out[f] = c; }
      if (f % 15 === 0) await new Promise(r => setTimeout(r, 0));
    }
    return { out, ms: Math.round((performance.now() - t0) / (last + 1)) };
  };
})();
