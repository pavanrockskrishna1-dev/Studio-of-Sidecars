(window.KINEMA_TEMPLATES = window.KINEMA_TEMPLATES || []).push({
  id: "burning-logo",
  label: "Burning Logo",
  desc: "The BBQ Ride badge catches fire and burns. Transparent background, for any reel.",
  kind: "overlay",
  dur: 3.6,
  fields: [],
  build(fields, KINEMA) {
    const { mkShape, mkImage, mkParticle, K, B, pj } = KINEMA;
    const P = pj('Burning Logo', 'rgba(0,0,0,0)', 3.6); P.w = 1080; P.h = 1920; P.fps = 30;
    const IMG = '/brand/bbqride-badge.png';
    const IGN = 0.5; // the badge appears, then catches fire
    const badgeImg = (name) => {
      const m = mkImage({ src: IMG, w: 980, h: 980, name: name });
      K(m.props.scale, [[0, 0.9, 'easeOut'], [0.7, 1, 'easeOut']]);
      return m;
    };

    // firelight and glow are soft and low so the badge stays readable over any footage
    const firelight = mkShape({ shape: 'ellipse', w: 1500, h: 1500, fill: '#FF5A10', name: 'firelight' });
    firelight.blendMode = 'Add'; firelight.fx = [{ type: 'blur', enabled: true, radius: 40 }]; firelight.props.y.base = 100;
    const fl = [[0, 0, 'hold'], [IGN, 0, 'easeOut']];
    for (let i = 0; i < 28; i++) fl.push([IGN + 0.4 + i * 0.1, 0.07 + 0.03 * Math.sin(i * 12.9898), 'linear']);
    K(firelight.props.opacity, fl);

    const glow = mkShape({ shape: 'ellipse', w: 900, h: 900, fill: '#E8861E', name: 'logo glow' });
    glow.blendMode = 'Add'; glow.fx = [{ type: 'glow', enabled: true, color: '#FF5A10', blur: 120, spread: 50 }];
    K(glow.props.opacity, [[0, 0, 'hold'], [0.5, 0.3, 'easeOut'], [IGN + 0.5, 0.4, 'easeOut'], [3.6, 0.35, 'easeInOut']]);

    // a solid gold base so the badge reads even before it burns
    const gold = mkShape({ shape: 'rect', w: 1100, h: 1100, radius: 0, fillType: 'gradient', fillA: '#FBDD92', fillB: '#B5650E', fillAngle: 70, name: 'gold fill' });
    gold.trackMatte = 'alpha';
    K(gold.props.opacity, [[0, 0, 'hold'], [0.5, 1, 'easeOut'], [IGN + 0.5, 0.6, 'easeOut']]);
    K(gold.props.scale, [[0, 0.9, 'easeOut'], [0.7, 1, 'easeOut']]);

    // white-hot to red fire colour inside the artwork, flickering
    const hot = mkShape({ shape: 'rect', w: 1100, h: 1100, radius: 0, fillType: 'gradient', fillA: '#FFF0B0', fillB: '#FF3A06', fillAngle: 90, name: 'fire colour' });
    hot.trackMatte = 'alpha';
    const hk = [[0, 0, 'hold'], [IGN - 0.02, 0, 'easeOut'], [IGN + 0.08, 0.9, 'easeOut']];
    for (let i = 0; i < 40; i++) hk.push([IGN + 0.2 + i * 0.07, 0.62 + 0.28 * Math.sin(i * 7.31) * Math.cos(i * 2.17), 'linear']);
    K(hot.props.opacity, hk);

    const halo = badgeImg('burning halo');
    halo.blendMode = 'Add'; halo.fx = [{ type: 'glow', enabled: true, color: '#FF6A1A', blur: 22, spread: 6 }];
    K(halo.props.opacity, [[0, 0, 'hold'], [IGN - 0.02, 0, 'easeOut'], [IGN + 0.3, 0.55, 'easeOut']]);

    const flames = [];
    const flame = (nm, x, y, cnt, rate, spd, sz0, sz1, wob) => {
      const e = mkParticle({ name: nm, shape: 'circle', count: cnt, rate: rate, life: 1.15, speed: spd, spread: 34, angle: 90, sizeStart: sz0, sizeEnd: sz1, colorStart: '#FFB347', colorEnd: '#FF2A00', gravity: -90, soft: true, sizeJitter: 0.55, flicker: 0.5, wobble: wob, fade: true });
      e.blendMode = 'Add'; e.props.x = B(x); e.props.y = B(y);
      K(e.props.opacity, [[0, 0, 'hold'], [IGN, 0, 'easeOut'], [IGN + 0.4, 1, 'easeOut']]);
      flames.push(e);
    };
    [-400, -265, -130, 0, 130, 265, 400].forEach((x, i) => flame('flame top ' + i, x, Math.round(Math.sqrt(490 * 490 - x * x)) - 30, 50, 32, 360, 80, 12, 130));
    flame('flame side L1', -470, 120, 36, 24, 260, 60, 10, 100); flame('flame side R1', 470, 120, 36, 24, 260, 60, 10, 100);
    flame('flame side L2', -440, -200, 30, 20, 220, 54, 10, 90); flame('flame side R2', 440, -200, 30, 20, 220, 54, 10, 90);

    const sparks = mkParticle({ name: 'fire sparks', shape: 'circle', count: 110, rate: 46, life: 1.6, speed: 520, spread: 80, angle: 90, sizeStart: 6, sizeEnd: 1.5, colorStart: '#FFE9A8', colorEnd: '#FF7A1A', gravity: 220, soft: false, trail: 2.2, sizeJitter: 0.5 });
    sparks.blendMode = 'Add'; sparks.props.y = B(420);
    K(sparks.props.opacity, [[0, 0, 'hold'], [IGN + 0.1, 0, 'easeOut'], [IGN + 0.3, 1, 'easeOut']]);

    const flash = mkShape({ shape: 'ellipse', w: 1100, h: 1100, fill: '#FFF2CC', name: 'ignition flash' });
    flash.blendMode = 'Add'; flash.fx = [{ type: 'blur', enabled: true, radius: 50 }];
    K(flash.props.opacity, [[0, 0, 'hold'], [IGN - 0.04, 0, 'easeOut'], [IGN + 0.03, 0.4, 'easeOut'], [IGN + 0.3, 0, 'easeIn']]);
    K(flash.props.scale, [[IGN - 0.04, 0.55, 'easeOut'], [IGN + 0.3, 1.0, 'easeOut']]);

    // top to bottom; a matted layer is clipped by the layer directly above it
    P.layers = [sparks, ...flames, flash, halo, badgeImg('matte hot'), hot, badgeImg('matte B'), gold, glow, firelight];
    P.bloom = { on: true, threshold: 0.88, intensity: 0.5, radius: 1.8 };
    return P;
  }
});
