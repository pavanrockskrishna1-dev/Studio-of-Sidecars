(window.KINEMA_TEMPLATES = window.KINEMA_TEMPLATES || []).push({
  id: "smoke-to-flame",
  label: "Smoke to Flame Logo",
  desc: "Smoke writes the BBQ Ride badge, then the logo catches fire and burns.",
  kind: "card",
  dur: 5.6,
  fields: [],
  build(fields, KINEMA) {
    const { mkShape, mkImage, mkParticle, K, B, pj } = KINEMA;
    const P = pj('Smoke to Flame Logo', '#0A0705', 5.6); P.w = 1080; P.h = 1920; P.fps = 30;
    const IMG = '/brand/bbqride-badge.png';
    const IGN = 3.0; // the moment the logo catches fire
    const badgeImg = (name) => {
      const m = mkImage({ src: IMG, w: 980, h: 980, name: name });
      K(m.props.scale, [[1.6, 0.96, 'easeOut'], [2.6, 1, 'easeOut']]);
      return m;
    };

    const haze = mkShape({ shape: 'ellipse', w: 1500, h: 1500, fill: '#2A1608', name: 'room haze' });
    haze.fx = [{ type: 'blur', enabled: true, radius: 40 }]; haze.props.y.base = -200;
    K(haze.props.opacity, [[0, 0, 'hold'], [0.4, 0, 'easeOut'], [1.6, 0.55, 'easeOut'], [IGN + 0.5, 0.75, 'easeOut'], [5.6, 0.6, 'easeInOut']]);

    // firelight washing the whole room once the logo burns
    const firelight = mkShape({ shape: 'ellipse', w: 1700, h: 1700, fill: '#FF5A10', name: 'firelight' });
    firelight.blendMode = 'Add'; firelight.fx = [{ type: 'blur', enabled: true, radius: 40 }]; firelight.props.y.base = 120;
    const fl = [[0, 0, 'hold'], [IGN, 0, 'easeOut']];
    for (let i = 0; i < 22; i++) fl.push([IGN + 0.4 + i * 0.1, 0.07 + 0.03 * Math.sin(i * 12.9898), 'linear']);
    K(firelight.props.opacity, fl);

    const glow = mkShape({ shape: 'ellipse', w: 900, h: 900, fill: '#E8861E', name: 'logo glow' });
    glow.blendMode = 'Add'; glow.fx = [{ type: 'glow', enabled: true, color: '#FF5A10', blur: 120, spread: 50 }];
    K(glow.props.opacity, [[0, 0, 'hold'], [1.8, 0, 'easeOut'], [2.7, 0.5, 'easeOut'], [IGN + 0.5, 0.4, 'easeOut'], [5.6, 0.35, 'easeInOut']]);
    K(glow.props.scale, [[1.8, 0.7, 'easeOut'], [2.8, 1.05, 'easeOut'], [5.6, 1.12, 'easeInOut']]);

    // gold fill, only inside the badge artwork
    const gold = mkShape({ shape: 'rect', w: 1100, h: 1100, radius: 0, fillType: 'gradient', fillA: '#FBDD92', fillB: '#B5650E', fillAngle: 70, name: 'gold fill' });
    gold.trackMatte = 'alpha';
    K(gold.props.opacity, [[0, 0, 'hold'], [2.0, 0, 'easeOut'], [2.9, 1, 'easeOut'], [IGN + 0.5, 0.6, 'easeOut']]);
    K(gold.props.scale, [[1.6, 0.96, 'easeOut'], [2.6, 1, 'easeOut']]);

    // white-hot to red fire colour inside the artwork, flickering
    const hot = mkShape({ shape: 'rect', w: 1100, h: 1100, radius: 0, fillType: 'gradient', fillA: '#FFF0B0', fillB: '#FF3A06', fillAngle: 90, name: 'fire colour' });
    hot.trackMatte = 'alpha';
    const hk = [[0, 0, 'hold'], [IGN - 0.02, 0, 'easeOut'], [IGN + 0.08, 0.9, 'easeOut']];
    for (let i = 0; i < 34; i++) hk.push([IGN + 0.2 + i * 0.07, 0.62 + 0.28 * Math.sin(i * 7.31) * Math.cos(i * 2.17), 'linear']);
    K(hot.props.opacity, hk);

    // smoke writing the artwork (zig-zag brush, clipped to the badge)
    const logoSmoke = mkParticle({ name: 'logo smoke', shape: 'circle', count: 300, rate: 130, life: 1.9, speed: 30, spread: 360, angle: 90, sizeStart: 110, sizeEnd: 170, colorStart: '#EFE3D2', colorEnd: '#A89A8C', gravity: -10, soft: true, sizeJitter: 0.45, flicker: 0, wobble: 40, fade: true });
    logoSmoke.blendMode = 'Screen'; logoSmoke.trackMatte = 'alpha';
    const pts = [[-430, 430], [430, 430], [430, 215], [-430, 215], [-430, 0], [430, 0], [430, -215], [-430, -215], [-430, -430], [430, -430]];
    K(logoSmoke.props.x, pts.map((q, i) => [0.95 + i * 0.17, q[0], 'linear']));
    K(logoSmoke.props.y, pts.map((q, i) => [0.95 + i * 0.17, q[1], 'linear']));
    K(logoSmoke.props.opacity, [[0, 0, 'hold'], [0.9, 0, 'easeOut'], [1.0, 1, 'easeOut'], [2.9, 0.9, 'easeInOut'], [IGN + 0.2, 0, 'easeIn']]);

    // hot halo around the artwork: the badge itself under Add (black adds nothing, the glow adds light)
    const halo = badgeImg('burning halo');
    halo.blendMode = 'Add'; halo.fx = [{ type: 'glow', enabled: true, color: '#FF6A1A', blur: 22, spread: 6 }];
    K(halo.props.opacity, [[0, 0, 'hold'], [IGN - 0.02, 0, 'easeOut'], [IGN + 0.3, 0.55, 'easeOut']]);

    // smoke plumes from the grill
    const plume = (nm, x0, cnt, rate, sz0, sz1, spd, wob, opa, delay, sway) => {
      const e = mkParticle({ name: nm, shape: 'circle', count: cnt, rate: rate, life: 3.8, speed: spd, spread: 30, angle: 90, sizeStart: sz0, sizeEnd: sz1, colorStart: '#E2D6C6', colorEnd: '#6E6258', gravity: -40, soft: true, sizeJitter: 0.6, flicker: 0, wobble: wob, fade: true });
      e.blendMode = 'Screen'; e.props.y = B(-900); e.props.x = B(x0);
      K(e.props.opacity, [[0, 0, 'hold'], [delay, 0, 'easeOut'], [delay + 0.6, opa, 'easeOut'], [2.6, opa, 'easeInOut'], [IGN + 0.6, opa * 0.3, 'easeOut'], [5.6, opa * 0.2, 'easeInOut']]);
      K(e.props.x, [[delay, x0, 'easeInOut'], [delay + 1.4, x0 + sway, 'easeInOut'], [5.4, x0 - sway * 0.6, 'easeInOut']]);
      return e;
    };
    const plumeA = plume('smoke plume A', -90, 260, 80, 60, 300, 560, 230, 0.34, 0.3, 120);
    const plumeB = plume('smoke plume B', 70, 160, 50, 38, 200, 640, 180, 0.3, 0.45, -150);
    const plumeC = plume('smoke plume C', -20, 120, 36, 90, 340, 480, 120, 0.22, 0.6, 90);

    // flame tongues: emitters along the top and sides of the badge, rising and licking upward
    const flames = [];
    const flame = (nm, x, y, cnt, rate, spd, sz0, sz1, wob) => {
      const e = mkParticle({ name: nm, shape: 'circle', count: cnt, rate: rate, life: 1.15, speed: spd, spread: 34, angle: 90, sizeStart: sz0, sizeEnd: sz1, colorStart: '#FFB347', colorEnd: '#FF2A00', gravity: -90, soft: true, sizeJitter: 0.55, flicker: 0.5, wobble: wob, fade: true });
      e.blendMode = 'Add'; e.props.x = B(x); e.props.y = B(y);
      K(e.props.opacity, [[0, 0, 'hold'], [IGN, 0, 'easeOut'], [IGN + 0.5, 1, 'easeOut']]);
      flames.push(e);
    };
    [-400, -265, -130, 0, 130, 265, 400].forEach((x, i) => flame('flame top ' + i, x, Math.round(Math.sqrt(490 * 490 - x * x)) - 30, 50, 32, 360, 80, 12, 130));
    flame('flame side L1', -470, 120, 36, 24, 260, 60, 10, 100); flame('flame side R1', 470, 120, 36, 24, 260, 60, 10, 100);
    flame('flame side L2', -440, -200, 30, 20, 220, 54, 10, 90); flame('flame side R2', 440, -200, 30, 20, 220, 54, 10, 90);

    // sparks thrown off by the fire
    const sparks = mkParticle({ name: 'fire sparks', shape: 'circle', count: 110, rate: 46, life: 1.6, speed: 520, spread: 80, angle: 90, sizeStart: 6, sizeEnd: 1.5, colorStart: '#FFE9A8', colorEnd: '#FF7A1A', gravity: 220, soft: false, trail: 2.2, sizeJitter: 0.5 });
    sparks.blendMode = 'Add'; sparks.props.y = B(420);
    K(sparks.props.opacity, [[0, 0, 'hold'], [IGN + 0.1, 0, 'easeOut'], [IGN + 0.3, 0.55, 'easeOut']]);

    // ignition: one white-hot flash and a ring
    const flash = mkShape({ shape: 'ellipse', w: 1100, h: 1100, fill: '#FFF2CC', name: 'ignition flash' });
    flash.blendMode = 'Add'; flash.fx = [{ type: 'blur', enabled: true, radius: 50 }];
    K(flash.props.opacity, [[0, 0, 'hold'], [IGN - 0.04, 0, 'easeOut'], [IGN + 0.03, 0.4, 'easeOut'], [IGN + 0.3, 0, 'easeIn']]);
    K(flash.props.scale, [[IGN - 0.04, 0.55, 'easeOut'], [IGN + 0.3, 1.0, 'easeOut']]);
    const ring = mkShape({ shape: 'ellipse', w: 980, h: 980, fill: 'none', strokeW: 6, strokeColor: '#FFB04A', name: 'ignition ring' });
    ring.blendMode = 'Add'; ring.fx = [{ type: 'glow', enabled: true, color: '#FF7A20', blur: 28, spread: 8 }];
    K(ring.props.scale, [[IGN, 0.95, 'easeOut'], [IGN + 0.9, 1.8, 'easeOut']]);
    K(ring.props.opacity, [[0, 0, 'hold'], [IGN, 0.9, 'easeOut'], [IGN + 0.9, 0, 'easeIn']]);

    // top to bottom; a matted layer is clipped by the layer directly above it
    P.layers = [sparks, ...flames, flash, ring, halo, badgeImg('matte hot'), hot, badgeImg('matte A'), logoSmoke, badgeImg('matte B'), gold, plumeC, plumeB, plumeA, glow, firelight, haze];
    P.bloom = { on: true, threshold: 0.88, intensity: 0.5, radius: 1.8 };
    return P;
  }
});
