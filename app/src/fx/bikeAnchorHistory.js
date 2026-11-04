export function createHistory(maxAgeS = 6) {
  return {
    maxAgeS,
    samples: []
  };
}

export function record(h, t, p) {
  if (h.samples.length > 0 && t < h.samples[h.samples.length - 1].t) {
    h.samples = [];
  }
  h.samples.push({ t, p: [...p] });
  while (h.samples.length > 0 && h.samples[0].t < t - h.maxAgeS) {
    h.samples.shift();
  }
}

export function at(h, t) {
  if (h.samples.length === 0) return null;
  if (t <= h.samples[0].t) return [...h.samples[0].p];
  const last = h.samples[h.samples.length - 1];
  if (t >= last.t) return [...last.p];
  
  let i = h.samples.length - 1;
  while (i > 0 && h.samples[i].t > t) {
    i--;
  }
  const s0 = h.samples[i];
  const s1 = h.samples[i + 1];
  const f = (t - s0.t) / (s1.t - s0.t);
  return [
    s0.p[0] + (s1.p[0] - s0.p[0]) * f,
    s0.p[1] + (s1.p[1] - s0.p[1]) * f,
    s0.p[2] + (s1.p[2] - s0.p[2]) * f
  ];
}
