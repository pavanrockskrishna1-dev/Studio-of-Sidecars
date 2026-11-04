let _uid = 0;
const uid = () => 'id_' + (++_uid);

const baseProps = (extra) => Object.assign({
  x: { base: 0, keys: null },
  y: { base: 0, keys: null },
  z: { base: 0, keys: null },
  rx: { base: 0, keys: null },
  ry: { base: 0, keys: null },
  rz: { base: 0, keys: null },
  scale: { base: 1, keys: null },
  opacity: { base: 1, keys: null }
}, extra);

const B = (val) => ({ base: val, keys: null });
const K = (prop, keys) => { prop.keys = keys; return prop; };
const fo = (t, d) => Math.floor(t / d) * d;
const pj = (name, bg, dur) => ({
  name: name || 'Project',
  w: 1920, h: 1080, fps: 30, dur: dur || 4,
  bg: bg || '#0B0C0F', layers: [],
  id: uid()
});

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function mkText(o) { o = o || {};
  return Object.assign({
    id: uid(), type: 'text', name: o.text ? String(o.text).split('\n')[0].slice(0, 20) : 'Text',
    visible: true, text: o.text == null ? 'HEADLINE' : o.text, font: o.font || 'Space Grotesk', size: o.size || 120,
    spacing: o.spacing || 0, align: o.align || 'center', fill: o.fill || '#F2EFE7', strokeW: o.strokeW || 0,
    strokeColor: o.strokeColor || '#0F1013', extrude: o.extrude || 0, animators: [],
    weight: o.weight || 'normal', italic: o.italic === true,
    fillType: o.fillType || 'solid', fillA: o.fillA || '#FF4D26', fillB: o.fillB || '#000000', gradAngle: o.gradAngle || 0,
    boxW: o.boxW || 0, boxH: o.boxH || 0, boxWrap: o.boxWrap === true, lineHeight: o.lineHeight || 1.16,
    textPath: o.textPath || null, textPathOffset: o.textPathOffset || 0, textPathReverse: o.textPathReverse === true,
    textPathPerp: o.textPathPerp !== false, textPathClamp: o.textPathClamp || 'hide',
    fx: [], props: baseProps()
  }, o);
}

function mkShape(o) { o = o || {};
  return Object.assign({
    id: uid(), type: 'shape', name: o.name || cap(o.shape || 'rect'), visible: true,
    shape: o.shape || 'rect', w: o.w == null ? 420 : o.w, h: o.h == null ? 280 : o.h, radius: o.radius == null ? 26 : o.radius,
    sides: o.sides || 6, inner: o.inner == null ? 0.45 : o.inner, fill: o.fill == null ? '#FF4D26' : o.fill,
    fillType: o.fillType || 'solid', fillA: o.fillA || '#FF4D26', fillB: o.fillB || '#000000', fillAngle: o.fillAngle || 0,
    strokeW: o.strokeW || 0, strokeColor: o.strokeColor || '#F2EFE7', extrude: o.extrude || 0, dash: o.dash || 0,
    fx: [], props: baseProps()
  }, o);
}

function mkImage(o) { o = o || {};
  return Object.assign({
    id: uid(), type: 'image', name: o.name || 'Image', visible: true,
    src: o.src || '', w: o.w || 400, h: o.h || 300, fx: [], props: baseProps()
  }, o);
}

function mkPath(o) { o = o || {};
  return Object.assign({
    id: uid(), type: 'path', name: o.name || 'Path', visible: true,
    d: Array.isArray(o.d) ? o.d : [], fill: o.fill == null ? 'none' : o.fill, strokeW: o.strokeW == null ? 3 : o.strokeW,
    strokeColor: o.strokeColor || '#F2EFE7', closed: o.closed === true, brushType: o.brushType || 'round',
    fx: [], props: baseProps({
      trimStart: B(o.trimStart == null ? 0 : o.trimStart),
      trimEnd: B(o.trimEnd == null ? 1 : o.trimEnd),
      trimOffset: B(o.trimOffset == null ? 0 : o.trimOffset),
      offsetDist: B(o.offsetDist == null ? 0 : o.offsetDist)
    })
  }, o);
}

function mkParticle(o) { o = o || {};
  return Object.assign({
    id: uid(), type: 'particle', name: o.name || 'Particles', visible: true,
    shape: o.shape || 'circle',
    count: o.count == null ? 60 : o.count,
    rate: o.rate == null ? 20 : o.rate,
    life: o.life == null ? 2 : o.life,
    speed: o.speed == null ? 140 : o.speed,
    spread: o.spread == null ? 360 : o.spread,
    angle: o.angle == null ? 270 : o.angle,
    sizeStart: o.sizeStart == null ? 12 : o.sizeStart,
    sizeEnd: o.sizeEnd == null ? 2 : o.sizeEnd,
    colorStart: o.colorStart || '#FF8A1E',
    colorEnd: o.colorEnd || '#FF0000',
    gravity: o.gravity == null ? 80 : o.gravity,
    fade: o.fade !== false,
    soft: o.soft === true,
    trail: o.trail == null ? 0 : o.trail,
    sizeJitter: o.sizeJitter == null ? 0 : o.sizeJitter,
    flicker: o.flicker == null ? 0 : o.flicker,
    wobble: o.wobble == null ? 0 : o.wobble,
    fx: [], props: baseProps()
  }, o);
}

function mkCamera(o) { o = o || {};
  return Object.assign({
    id: uid(), type: 'camera', name: o.name || 'Camera', visible: true,
    fov: o.fov == null ? 800 : o.fov,
    shake: o.shake == null ? 0 : o.shake,
    shakeFreq: o.shakeFreq == null ? 12 : o.shakeFreq,
    dofEnabled: o.dofEnabled === true,
    dofFocus: o.dofFocus == null ? 0 : o.dofFocus,
    dofRange: o.dofRange == null ? 200 : o.dofRange,
    dofMax: o.dofMax == null ? 12 : o.dofMax,
    fx: [], props: baseProps()
  }, o);
}

function mkNull(o) { o = o || {};
  return Object.assign({
    id: uid(), type: 'null', name: o.name || 'Null', visible: true,
    fx: [], props: baseProps()
  }, o);
}

export const KINEMA = {
  mkText, mkShape, mkImage, mkParticle, mkPath, mkNull, mkCamera,
  pj, B, K, fo
};
export function resetUid() { _uid = 0; }
