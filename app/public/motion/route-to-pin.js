(window.KINEMA_TEMPLATES = window.KINEMA_TEMPLATES || []).push({
  id: "route-to-pin",
  label: "Route to the Pin",
  desc: "A glowing route snakes up the screen, a map pin drops in and the place name slides up.",
  kind: "overlay",
  dur: 3.8,
  fields: [
    { key: "place", label: "Line 1", default: "WE ARE HERE TODAY" },
    { key: "spot", label: "Line 2", default: "MG ROAD, BENGALURU" }
  ],
  build(fields, KINEMA) {
    const { mkShape, mkText, mkPath, mkParticle, K, B, pj } = KINEMA;
    const P = pj('Route to the Pin', 'rgba(0,0,0,0)', 3.8); P.w = 1080; P.h = 1920; P.fps = 30;
    const get = (key, def) => (fields && fields[key] != null && fields[key] !== '' ? fields[key] : def);
    const tPlace = get('place', 'WE ARE HERE TODAY'), tSpot = get('spot', 'MG ROAD, BENGALURU');
    const END_Y = -430; // where the pin lands

    // the route: an S-curve rising from the bottom of the frame to the pin
    const S = [
      { type: 'M', pts: [[-260, 760]] },
      { type: 'C', pts: [[-260, 520], [300, 520], [300, 260]] },
      { type: 'C', pts: [[300, 20], [-260, 20], [-260, -180]] },
      { type: 'C', pts: [[-260, -330], [-60, -330], [0, END_Y + 40]] }
    ];
    const road = mkPath({ name: 'route glow', d: S, fill: 'none', strokeW: 30, strokeColor: '#FF5A10', brushType: 'round' });
    road.blendMode = 'Add'; road.fx = [{ type: 'blur', enabled: true, radius: 22 }];
    K(road.props.trimEnd, [[0.15, 0, 'easeOut'], [1.5, 1, 'easeInOut']]);
    K(road.props.opacity, [[0, 0, 'hold'], [0.15, 0.85, 'easeOut'], [3.3, 0.85, 'easeOut'], [3.8, 0, 'easeIn']]);
    const core = mkPath({ name: 'route core', d: S, fill: 'none', strokeW: 9, strokeColor: '#FFE9B0', brushType: 'round' });
    core.blendMode = 'Add';
    K(core.props.trimEnd, [[0.15, 0, 'easeOut'], [1.5, 1, 'easeInOut']]);
    K(core.props.opacity, [[0, 0, 'hold'], [0.15, 1, 'easeOut'], [3.3, 1, 'easeOut'], [3.8, 0, 'easeIn']]);

    // dust of embers along the head of the route
    const trail = mkParticle({ name: 'route sparks', shape: 'circle', count: 80, rate: 40, life: 1.0, speed: 90, spread: 360, angle: 90, sizeStart: 16, sizeEnd: 2, colorStart: '#FFC15A', colorEnd: '#FF3A08', gravity: -30, soft: true, sizeJitter: 0.6, flicker: 0.5, wobble: 40 });
    trail.blendMode = 'Add';
    K(trail.props.opacity, [[0, 0, 'hold'], [1.4, 0, 'easeOut'], [1.5, 1, 'easeOut'], [2.4, 0.4, 'easeOut'], [3.4, 0, 'easeIn']]);
    trail.props.x = B(0); trail.props.y = B(END_Y + 10);

    // landing rings
    const ring = (name, t0) => {
      const r = mkShape({ shape: 'ellipse', w: 150, h: 150, fill: 'none', strokeW: 8, strokeColor: '#FF7A20', name: name });
      r.blendMode = 'Add'; r.props.y = B(END_Y - 10);
      K(r.props.scale, [[t0, 0.3, 'hold'], [t0 + 0.9, 3.2, 'easeOut']]);
      K(r.props.opacity, [[0, 0, 'hold'], [t0, 0.9, 'easeOut'], [t0 + 0.9, 0, 'easeIn']]);
      return r;
    };
    const ring1 = ring('landing ring 1', 1.5), ring2 = ring('landing ring 2', 2.3);

    // the pin: a teardrop = circle head + triangle point, with a white dot
    const head = mkShape({ shape: 'ellipse', w: 130, h: 130, fill: '#FF5A10', name: 'pin head' });
    head.fx = [{ type: 'glow', enabled: true, color: '#FF7A1A', blur: 26, spread: 6 }];
    const dot = mkShape({ shape: 'ellipse', w: 46, h: 46, fill: '#FFF2CC', name: 'pin dot' });
    const point = mkPath({ name: 'pin point', d: [{ type: 'M', pts: [[-48, 20]] }, { type: 'L', pts: [[48, 20]] }, { type: 'L', pts: [[0, -75]] }, { type: 'Z', pts: [] }], fill: '#FF5A10', strokeW: 0 });
    const drop = [[1.0, 1000, 'hold'], [1.5, END_Y + 95, 'easeIn'], [1.62, END_Y + 125, 'easeOut'], [1.78, END_Y + 95, 'easeIn'], [3.4, END_Y + 95, 'easeOut'], [3.8, 1000, 'easeIn']];
    K(head.props.y, drop.map(([t, y, e]) => [t, y, e]));
    K(dot.props.y, drop.map(([t, y, e]) => [t, y, e]));
    K(point.props.y, drop.map(([t, y, e]) => [t, y === 1000 ? 1000 : y - 70, e]));
    for (const L of [head, dot, point]) K(L.props.opacity, [[0, 0, 'hold'], [1.0, 0, 'easeOut'], [1.05, 1, 'easeOut'], [3.5, 1, 'easeOut'], [3.8, 0, 'easeIn']]);

    // readable label panel so the words work over any footage
    const panel = mkShape({ shape: 'rect', w: 860, h: 250, radius: 40, fill: '#0A0705', name: 'label panel' });
    panel.props.y.base = END_Y - 230;
    K(panel.props.scale, [[1.8, 0.7, 'hold'], [2.3, 1, 'backOut']]);
    K(panel.props.opacity, [[0, 0, 'hold'], [1.8, 0, 'easeOut'], [2.2, 0.55, 'easeOut'], [3.4, 0.55, 'easeOut'], [3.8, 0, 'easeIn']]);
    const place = mkText({ text: tPlace, font: 'Space Grotesk', size: 50, spacing: 10, weight: 'bold', fill: '#F2EFE7', name: 'line 1' });
    K(place.props.y, [[1.9, END_Y - 180, 'hold'], [2.4, END_Y - 160, 'backOut']]);
    K(place.props.opacity, [[0, 0, 'hold'], [1.9, 0, 'easeOut'], [2.3, 1, 'easeOut'], [3.4, 1, 'easeOut'], [3.8, 0, 'easeIn']]);
    const spot = mkText({ text: tSpot, font: 'Unbounded', size: 56, fill: '#FFB347', weight: 'bold', name: 'line 2' });
    K(spot.props.y, [[2.0, END_Y - 270, 'hold'], [2.5, END_Y - 250, 'backOut']]);
    K(spot.props.opacity, [[0, 0, 'hold'], [2.0, 0, 'easeOut'], [2.4, 1, 'easeOut'], [3.4, 1, 'easeOut'], [3.8, 0, 'easeIn']]);

    P.layers = [spot, place, panel, point, dot, head, ring2, ring1, trail, core, road];
    P.bloom = { on: true, threshold: 0.8, intensity: 0.7, radius: 1.8 };
    return P;
  }
});
