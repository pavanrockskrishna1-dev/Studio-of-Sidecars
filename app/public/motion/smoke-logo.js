(window.KINEMA_TEMPLATES = window.KINEMA_TEMPLATES || []).push({
  id: "smoke-logo",
  label: "Smoke Writes the Logo",
  desc: "Smoke rises from the grill, thickens and settles into the BBQ Ride badge.",
  kind: "card",
  dur: 3.8,
  fields: [],
  build(fields, KINEMA) {
    const { mkShape, mkImage, mkParticle, K, B, pj } = KINEMA;
    const P = pj('Smoke Writes the Logo', '#0A0705', 3.8); P.w = 1080; P.h = 1920; P.fps = 30;
    const IMG = '/brand/bbqride-badge.png';
    const badgeMatte = (name) => {
      const m = mkImage({ src: IMG, w: 980, h: 980, name: name });
      K(m.props.scale, [[1.6, 0.96, 'easeOut'], [2.6, 1, 'easeOut']]);
      return m;
    };

    // room haze: two big dark-warm soft blobs so the smoke has air to live in
    const haze = mkShape({ shape: 'ellipse', w: 1500, h: 1500, fill: '#2A1608', name: 'room haze' });
    haze.fx = [{ type: 'blur', enabled: true, radius: 40 }]; haze.props.y.base = -200;
    K(haze.props.opacity, [[0, 0, 'hold'], [0.4, 0, 'easeOut'], [1.6, 0.55, 'easeOut'], [3.8, 0.4, 'easeInOut']]);

    // warm glow behind the finished logo
    const glow = mkShape({ shape: 'ellipse', w: 900, h: 900, fill: '#E8861E', name: 'logo glow' });
    glow.blendMode = 'Add'; glow.fx = [{ type: 'glow', enabled: true, color: '#FF5A10', blur: 120, spread: 50 }];
    K(glow.props.opacity, [[0, 0, 'hold'], [1.8, 0, 'easeOut'], [2.7, 0.55, 'easeOut'], [3.8, 0.38, 'easeInOut']]);
    K(glow.props.scale, [[1.8, 0.7, 'easeOut'], [2.8, 1.1, 'easeOut'], [3.8, 1, 'easeInOut']]);

    // gold fill: only visible where the badge artwork is (the badge image is the matte above it)
    const gold = mkShape({ shape: 'rect', w: 1100, h: 1100, radius: 0, fillType: 'gradient', fillA: '#FBDD92', fillB: '#B5650E', fillAngle: 70, name: 'gold fill' });
    gold.trackMatte = 'alpha';
    K(gold.props.opacity, [[0, 0, 'hold'], [2.0, 0, 'easeOut'], [2.9, 1, 'easeOut']]);
    K(gold.props.scale, [[1.6, 0.96, 'easeOut'], [2.6, 1, 'easeOut']]);

    // smoke inside the logo shape: soft grey-warm puffs drifting up, clipped to the artwork
    const logoSmoke = mkParticle({ name: 'logo smoke', shape: 'circle', count: 300, rate: 130, life: 1.9, speed: 30, spread: 360, angle: 90, sizeStart: 110, sizeEnd: 170, colorStart: '#EFE3D2', colorEnd: '#A89A8C', gravity: -10, soft: true, sizeJitter: 0.45, flicker: 0, wobble: 40, fade: true });
    logoSmoke.blendMode = 'Screen'; logoSmoke.trackMatte = 'alpha';
    // the emitter scribbles across the badge in a zig-zag, so the smoke "writes" the artwork line by line
    const pts = [[-430, 430], [430, 430], [430, 215], [-430, 215], [-430, 0], [430, 0], [430, -215], [-430, -215], [-430, -430], [430, -430]];
    K(logoSmoke.props.x, pts.map((q, i) => [0.95 + i * 0.17, q[0], 'linear']));
    K(logoSmoke.props.y, pts.map((q, i) => [0.95 + i * 0.17, q[1], 'linear']));
    K(logoSmoke.props.opacity, [[0, 0, 'hold'], [0.9, 0, 'easeOut'], [1.0, 1, 'easeOut'], [2.9, 0.9, 'easeInOut'], [3.8, 0.4, 'easeInOut']]);
    // free smoke: three plumes of different thickness rise from the grill, curl and drift toward the logo
    const plume = (nm, x0, cnt, rate, sz0, sz1, spd, wob, opa, delay, sway) => {
      const e = mkParticle({ name: nm, shape: 'circle', count: cnt, rate: rate, life: 3.8, speed: spd, spread: 30, angle: 90, sizeStart: sz0, sizeEnd: sz1, colorStart: '#E2D6C6', colorEnd: '#6E6258', gravity: -40, soft: true, sizeJitter: 0.6, flicker: 0, wobble: wob, fade: true });
      e.blendMode = 'Screen'; e.props.y = B(-900); e.props.x = B(x0);
      K(e.props.opacity, [[0, 0, 'hold'], [delay, 0, 'easeOut'], [delay + 0.6, opa, 'easeOut'], [2.6, opa, 'easeInOut'], [3.4, opa * 0.35, 'easeOut'], [3.8, 0, 'easeIn']]);
      K(e.props.x, [[delay, x0, 'easeInOut'], [delay + 1.4, x0 + sway, 'easeInOut'], [3.6, x0 - sway * 0.6, 'easeInOut']]);
      return e;
    };
    const plumeA = plume('smoke plume A', -90, 260, 80, 60, 300, 560, 230, 0.34, 0.3, 120);
    const plumeB = plume('smoke plume B', 70, 160, 50, 38, 200, 640, 180, 0.3, 0.45, -150);
    const plumeC = plume('smoke plume C', -20, 120, 36, 90, 340, 480, 120, 0.22, 0.6, 90);
    // embers: they start with the smoke, then rise around the finished logo
    const embers = mkParticle({ name: 'embers', shape: 'circle', count: 110, rate: 40, life: 2.6, speed: 280, spread: 130, angle: 90, sizeStart: 24, sizeEnd: 3, colorStart: '#FFB347', colorEnd: '#FF3A08', gravity: -45, soft: true, sizeJitter: 0.6, flicker: 0.6, wobble: 70 });
    embers.blendMode = 'Add'; embers.props.y = B(-640);
    K(embers.props.opacity, [[0, 0, 'hold'], [0.6, 0, 'easeOut'], [0.8, 1, 'easeOut']]);

    // one clean ring when the logo locks in
    const ring = mkShape({ shape: 'ellipse', w: 980, h: 980, fill: 'none', strokeW: 6, strokeColor: '#FFB04A', name: 'lock ring' });
    ring.blendMode = 'Add'; ring.fx = [{ type: 'glow', enabled: true, color: '#FF7A20', blur: 28, spread: 8 }];
    K(ring.props.scale, [[2.6, 0.92, 'easeOut'], [3.5, 1.7, 'easeOut']]);
    K(ring.props.opacity, [[0, 0, 'hold'], [2.6, 0.9, 'easeOut'], [3.5, 0, 'easeIn']]);

    // top to bottom; a matted layer is clipped by the layer directly above it
    P.layers = [embers, plumeC, plumeB, plumeA, ring, badgeMatte('matte A'), logoSmoke, badgeMatte('matte B'), gold, glow, haze];
    P.bloom = { on: true, threshold: 0.82, intensity: 0.7, radius: 1.8 };
    return P;
  }
});
