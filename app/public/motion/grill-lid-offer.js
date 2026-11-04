(window.KINEMA_TEMPLATES = window.KINEMA_TEMPLATES || []).push({
  id: "grill-lid-offer",
  label: "Grill Lid Offer",
  desc: "A grill lid lifts, firelight and smoke pour out and the offer rises from the glow.",
  kind: "card",
  dur: 3.6,
  fields: [
    { key: "title", label: "Title", default: "FRESH OFF THE GRILL" },
    { key: "offer", label: "Offer", default: "FLAT 20% OFF" },
    { key: "sub", label: "Small print", default: "THIS WEEKEND ONLY" }
  ],
  build(fields, KINEMA) {
    const { mkShape, mkText, mkParticle, K, B, pj } = KINEMA;
    const P = pj('Grill Lid Offer', '#07080B', 3.6); P.w = 1080; P.h = 1920; P.fps = 30;
    const get = (key, def) => (fields && fields[key] != null && fields[key] !== '' ? fields[key] : def);
    const tTitle = get('title', 'FRESH OFF THE GRILL'), tOffer = get('offer', 'FLAT 20% OFF'), tSub = get('sub', 'THIS WEEKEND ONLY');
    const BASE_Y = -520; // centre of the grill body; its top edge is at BASE_Y + 170

    // room firelight (soft, low) so the offer text never gets blown out
    const room = mkShape({ shape: 'ellipse', w: 1500, h: 1100, fill: '#FF5A10', name: 'room firelight' });
    room.blendMode = 'Add'; room.fx = [{ type: 'blur', enabled: true, radius: 60 }]; room.props.y.base = 40;
    K(room.props.opacity, [[0, 0, 'hold'], [0.5, 0, 'easeOut'], [1.6, 0.22, 'easeOut'], [3.6, 0.3, 'easeInOut']]);

    // grill body, charcoal with a cooler edge light
    const base = mkShape({ shape: 'rect', w: 880, h: 340, radius: 60, fillType: 'gradient', fillA: '#2A2D33', fillB: '#0E1014', fillAngle: 90, name: 'grill body' });
    base.props.y.base = BASE_Y;
    K(base.props.opacity, [[0, 0, 'hold'], [0.25, 1, 'easeOut']]);
    const baseRim = mkShape({ shape: 'rect', w: 880, h: 340, radius: 60, fill: 'none', strokeW: 3, strokeColor: '#5B6270', name: 'body rim' });
    baseRim.props.y.base = BASE_Y; baseRim.props.opacity.base = 0.7;
    K(baseRim.props.opacity, [[0, 0, 'hold'], [0.3, 0.7, 'easeOut']]);

    // the slit of firelight where the lid opens
    const slit = mkShape({ shape: 'rect', w: 820, h: 10, radius: 5, fill: '#FFB347', name: 'light slit' });
    slit.blendMode = 'Add'; slit.fx = [{ type: 'glow', enabled: true, color: '#FF6A1A', blur: 40, spread: 12 }]; slit.props.y.base = BASE_Y + 175;
    K(slit.props.opacity, [[0, 0, 'hold'], [0.3, 0, 'easeOut'], [0.55, 1, 'easeOut'], [1.5, 0.9, 'easeInOut'], [3.6, 0.7, 'easeInOut']]);
    K(slit.props.scale, [[0.3, 0.2, 'easeOut'], [0.7, 1, 'easeOut']]);

    // the shaft of light that pours upward out of the grill
    const shaft = mkShape({ shape: 'rect', w: 760, h: 1100, radius: 0, fillType: 'gradient', fillA: '#FFB347', fillB: '#000000', fillAngle: 90, name: 'light shaft' });
    shaft.blendMode = 'Add'; shaft.fx = [{ type: 'blur', enabled: true, radius: 60 }]; shaft.props.y.base = BASE_Y + 175 + 520;
    K(shaft.props.opacity, [[0, 0, 'hold'], [0.6, 0, 'easeOut'], [1.5, 0.42, 'easeOut'], [3.6, 0.5, 'easeInOut']]);
    K(shaft.props.scale, [[0.6, 0.35, 'easeOut'], [1.6, 1, 'easeOut']]);

    // the lid: a domed shape that lifts and tilts back
    const lid = mkShape({ shape: 'rect', w: 860, h: 300, radius: 150, fillType: 'gradient', fillA: '#3A3E46', fillB: '#14161A', fillAngle: 90, name: 'grill lid' });
    K(lid.props.y, [[0, BASE_Y + 170 + 120, 'hold'], [0.5, BASE_Y + 170 + 120, 'easeOut'], [1.4, BASE_Y + 170 + 330, 'backOut']]);
    K(lid.props.rz, [[0.5, 0, 'easeOut'], [1.4, -16, 'backOut']]);
    K(lid.props.x, [[0.5, 0, 'easeOut'], [1.4, -50, 'backOut']]);
    K(lid.props.opacity, [[0, 0, 'hold'], [0.25, 1, 'easeOut']]);
    // brushed-metal highlight riding on the lid
    const sheen = mkShape({ shape: 'rect', w: 640, h: 26, radius: 13, fill: '#FFFFFF', name: 'lid sheen' });
    sheen.blendMode = 'Add'; sheen.fx = [{ type: 'blur', enabled: true, radius: 8 }];
    K(sheen.props.y, [[0, BASE_Y + 170 + 205, 'hold'], [0.5, BASE_Y + 170 + 205, 'easeOut'], [1.4, BASE_Y + 170 + 430, 'backOut']]);
    K(sheen.props.rz, [[0.5, 0, 'easeOut'], [1.4, -16, 'backOut']]);
    K(sheen.props.x, [[0.5, 0, 'easeOut'], [1.4, -50, 'backOut']]);
    K(sheen.props.opacity, [[0, 0, 'hold'], [0.5, 0.0, 'easeOut'], [1.0, 0.35, 'easeOut'], [3.6, 0.2, 'easeInOut']]);

    // smoke curling out of the gap, and sparks
    const smoke = mkParticle({ name: 'smoke', shape: 'circle', count: 200, rate: 60, life: 3.0, speed: 300, spread: 40, angle: 90, sizeStart: 70, sizeEnd: 280, colorStart: '#D9CCBB', colorEnd: '#6E6258', gravity: -40, soft: true, sizeJitter: 0.6, flicker: 0, wobble: 160, fade: true });
    smoke.blendMode = 'Screen'; smoke.props.y.base = BASE_Y + 200;
    K(smoke.props.opacity, [[0, 0, 'hold'], [0.7, 0, 'easeOut'], [1.3, 0.3, 'easeOut'], [3.6, 0.22, 'easeInOut']]);
    const embers = mkParticle({ name: 'embers', shape: 'circle', count: 110, rate: 36, life: 2.4, speed: 330, spread: 55, angle: 90, sizeStart: 24, sizeEnd: 3, colorStart: '#FFB347', colorEnd: '#FF3A08', gravity: -50, soft: true, sizeJitter: 0.6, flicker: 0.6, wobble: 70 });
    embers.blendMode = 'Add'; embers.props.y.base = BASE_Y + 200;
    K(embers.props.opacity, [[0, 0, 'hold'], [0.7, 0, 'easeOut'], [0.9, 1, 'easeOut']]);
    const sparks = mkParticle({ name: 'sparks', shape: 'circle', count: 70, rate: 28, life: 1.4, speed: 560, spread: 45, angle: 90, sizeStart: 6, sizeEnd: 1.5, colorStart: '#FFE9A8', colorEnd: '#FF7A1A', gravity: 240, soft: false, trail: 2.2, sizeJitter: 0.5 });
    sparks.blendMode = 'Add'; sparks.props.y.base = BASE_Y + 200;
    K(sparks.props.opacity, [[0, 0, 'hold'], [0.8, 0, 'easeOut'], [1.0, 1, 'easeOut']]);

    // the words rise out of the glow
    const title = mkText({ text: tTitle, font: 'Space Grotesk', size: 46, spacing: 8, weight: 'bold', fill: '#F2EFE7', name: 'title' });
    K(title.props.y, [[1.3, 380, 'hold'], [2.0, 520, 'backOut']]);
    K(title.props.opacity, [[0, 0, 'hold'], [1.3, 0, 'easeOut'], [1.8, 1, 'easeOut']]);
    const offer = mkText({ text: tOffer, font: 'Unbounded', size: 92, weight: 'bold', fill: '#FFE2A0', name: 'offer' });
    offer.fx = [{ type: 'glow', enabled: true, color: '#FF7A1A', blur: 26, spread: 6 }];
    K(offer.props.y, [[1.5, 240, 'hold'], [2.4, 330, 'elasticOut']]);
    K(offer.props.scale, [[1.5, 0.4, 'hold'], [2.4, 1, 'elasticOut']]);
    K(offer.props.opacity, [[0, 0, 'hold'], [1.5, 0, 'easeOut'], [1.9, 1, 'easeOut']]);
    const line = mkShape({ shape: 'rect', w: 640, h: 8, radius: 4, fill: '#F5C84C', name: 'gold underline' });
    line.blendMode = 'Add'; line.props.y.base = 232;
    K(line.props.scale, [[2.2, 0, 'hold'], [2.8, 1, 'easeOut']]);
    K(line.props.opacity, [[0, 0, 'hold'], [2.2, 1, 'easeOut']]);
    const sub = mkText({ text: tSub, font: 'IBM Plex Mono', size: 34, spacing: 8, fill: '#FFB347', name: 'small print' });
    K(sub.props.y, [[2.4, 160, 'hold'], [3.0, 170, 'easeOut']]);
    K(sub.props.opacity, [[0, 0, 'hold'], [2.4, 0, 'easeOut'], [3.0, 1, 'easeOut']]);

    P.layers = [sparks, sub, line, offer, title, embers, smoke, sheen, lid, shaft, slit, baseRim, base, room];
    P.bloom = { on: true, threshold: 0.84, intensity: 0.55, radius: 1.8 };
    return P;
  }
});
