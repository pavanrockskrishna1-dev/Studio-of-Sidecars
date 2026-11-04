(function () {
  const K_ = window.KINEMA; const { mkShape, mkImage, mkParticle, K, B, pj } = K_;
  window.__buildPilot = function (opts) {
    opts = opts || {};
    const P = pj('BBQ Ride Badge Reveal', '#0A0604', 3.6); P.w = 1080; P.h = 1920; P.fps = 30;
    const IMG = '/brand/bbqride-badge.png';
    const enter = (L) => {
      K(L.props.scale, [[0.5, 0.55, 'backOut'], [1.4, 1, 'easeOut']]);
      K(L.props.rz, [[0.5, -24, 'backOut'], [1.4, 0, 'easeOut']]);
      K(L.props.opacity, [[0, 0, 'hold'], [0.5, 0, 'easeOut'], [0.85, 1, 'easeOut']]);
      return L;
    };
    const glow = mkShape({ shape: 'ellipse', w: 820, h: 820, fill: '#FF6A1A', name: 'ember glow' });
    glow.blendMode = 'Add'; glow.fx = [{ type: 'glow', enabled: true, color: '#FF5A10', blur: 120, spread: 60 }];
    K(glow.props.opacity, [[0, 0, 'hold'], [0.6, 0, 'easeOut'], [1.5, 0.9, 'easeOut'], [3.6, 0.55, 'easeInOut']]);
    K(glow.props.scale, [[0.6, 0.6, 'easeOut'], [1.6, 1.15, 'easeOut'], [3.6, 1.0, 'easeInOut']]);
    // metallic gold disc: deep base + soft edge falloff + two clipped highlights
    const disc = enter(mkShape({ shape: 'ellipse', w: 930, h: 930, fillType: 'gradient', fillA: '#E0A03C', fillB: '#7E3C0E', fillAngle: 60, name: 'gold disc' }));
    const edge = enter(mkShape({ shape: 'ellipse', w: 905, h: 905, fill: 'none', strokeW: 90, strokeColor: '#3A1A05', name: 'edge shade' }));
    edge.fx = [{ type: 'blur', enabled: true, radius: 26 }]; edge.props.opacity.base = 0.55;
    K(edge.props.opacity, [[0, 0, 'hold'], [0.5, 0, 'easeOut'], [0.85, 0.6, 'easeOut']]);
    const badge = enter(mkImage({ src: IMG, w: 980, h: 980, name: 'badge' }));
    const clipMatte = (name) => enter(mkShape({ shape: 'ellipse', w: 930, h: 930, fill: '#FFFFFF', name: name }));
    // static sheen band (diagonal, soft) clipped to the disc
    const sheen = enter(mkShape({ shape: 'rect', w: 300, h: 1300, radius: 0, fill: '#FFFFFF', name: 'sheen band' }));
    sheen.props.rz.base = 28; sheen.props.x.base = -150; sheen.blendMode = 'Add'; sheen.trackMatte = 'alpha';
    sheen.fx = [{ type: 'blur', enabled: true, radius: 38 }];
    K(sheen.props.opacity, [[0, 0, 'hold'], [0.5, 0, 'easeOut'], [1.1, 0.12, 'easeOut']]);
    sheen.props.rz.keys = null; sheen.props.scale.keys = null;
    // top-left hot spot
    const spot = mkShape({ shape: 'ellipse', w: 420, h: 240, fill: '#FFF2CC', name: 'hot spot' });
    spot.props.x.base = -190; spot.props.y.base = 250; spot.props.rz.base = 35; spot.blendMode = 'Add'; spot.trackMatte = 'alpha';
    spot.fx = [{ type: 'blur', enabled: true, radius: 40 }];
    K(spot.props.opacity, [[0, 0, 'hold'], [0.7, 0, 'easeOut'], [1.3, 0.2, 'easeOut']]);
    // moving light sweep
    const sweep = mkShape({ shape: 'rect', w: 110, h: 1300, radius: 0, fill: '#FFFFFF', name: 'sweep' });
    sweep.props.rz = B(18); sweep.blendMode = 'Add'; sweep.trackMatte = 'alpha';
    sweep.fx = [{ type: 'blur', enabled: true, radius: 30 }];
    K(sweep.props.x, [[1.55, -760, 'linear'], [2.15, 760, 'easeInOut']]);
    K(sweep.props.opacity, [[0, 0, 'hold'], [1.5, 0, 'linear'], [1.7, 0.6, 'easeOut'], [2.1, 0.6, 'linear'], [2.2, 0, 'easeIn']]);
    const ring = mkShape({ shape: 'ellipse', w: 980, h: 980, fill: 'none', strokeW: 7, strokeColor: '#FFB04A', name: 'shockwave' });
    ring.blendMode = 'Add'; ring.fx = [{ type: 'glow', enabled: true, color: '#FF7A20', blur: 30, spread: 10 }];
    K(ring.props.scale, [[1.2, 0.9, 'easeOut'], [2.2, 1.9, 'easeOut']]);
    K(ring.props.opacity, [[0, 0, 'hold'], [1.2, 0.9, 'easeOut'], [2.2, 0, 'easeIn']]);
    const orbit = mkShape({ shape: 'ellipse', w: 1040, h: 1040, fill: 'none', strokeW: 2.5, strokeColor: '#FF9A3A', dash: 18, name: 'orbit' });
    K(orbit.props.rz, [[0, 0, 'linear'], [3.6, 100]]);
    K(orbit.props.opacity, [[0, 0, 'hold'], [1.3, 0, 'easeOut'], [1.9, 0.55, 'easeOut'], [3.6, 0.55, 'linear']]);
    // embers: big soft glowing sprites with variety and drift + fast thin sparks with trails
    const embers = mkParticle({ name: 'embers', shape: 'circle', count: 150, rate: 60, life: 2.6, speed: 300, spread: 130, angle: 90, sizeStart: 30, sizeEnd: 4, colorStart: '#FFB347', colorEnd: '#FF3A08', gravity: -45, soft: true, sizeJitter: 0.6, flicker: 0.6, wobble: 70 });
    embers.blendMode = 'Add'; embers.props.y = B(-590);
    K(embers.props.opacity, [[0, 0, 'hold'], [1.2, 0, 'easeOut'], [1.3, 1, 'easeOut']]);
    const sparks = mkParticle({ name: 'sparks', shape: 'circle', count: 90, rate: 40, life: 1.3, speed: 520, spread: 70, angle: 90, sizeStart: 6, sizeEnd: 1.5, colorStart: '#FFE9A8', colorEnd: '#FF7A1A', gravity: 260, soft: false, trail: 2.2, sizeJitter: 0.5 });
    sparks.blendMode = 'Add'; sparks.props.y = B(-560);
    K(sparks.props.opacity, [[0, 0, 'hold'], [1.25, 0, 'easeOut'], [1.35, 1, 'easeOut']]);
    const side = (x, nm) => { const e = mkParticle({ name: nm, shape: 'circle', count: 60, rate: 22, life: 2.8, speed: 260, spread: 70, angle: 90, sizeStart: 24, sizeEnd: 3, colorStart: '#FFB347', colorEnd: '#FF3A08', gravity: -40, soft: true, sizeJitter: 0.6, flicker: 0.6, wobble: 80 }); e.blendMode = 'Add'; e.props.x = B(x); e.props.y = B(-470); K(e.props.opacity, [[0, 0, 'hold'], [1.3, 0, 'easeOut'], [1.4, 1, 'easeOut']]); return e; };
    const embersL = side(-420, 'embers L'), embersR = side(420, 'embers R');    // top to bottom. A matted layer is clipped by the layer directly above it.
    P.layers = [embers, embersL, embersR, sparks, clipMatte('m3'), sweep, clipMatte('m2'), spot, clipMatte('m1'), sheen, badge, edge, disc, orbit, ring, glow];
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
