export const BIKE_ANCHORS = {
  grill: { node: "Grill_Grate", rule: "top-centre", dir: [0, 1, 0] },
  exhaust: { node: "Exhaust", rule: "rear-low", dir: [0, 0.2, -1] },
  headlight: { node: "Handlebar_Headlamp", rule: "front-mid", dir: [0, 0, 1] },
  taillight: { node: "Rear_Mudguard", rule: "rear-mid", dir: [0, 0, -1] }
};

export function anchorFromBox(box, rule) {
  const min = box.min;
  const max = box.max;
  const cx = (min[0] + max[0]) / 2;
  const cz = (min[2] + max[2]) / 2;
  switch (rule) {
    case "top-centre":
      return [cx, max[1], cz];
    case "rear-low":
      return [cx, min[1] + 0.12 * (max[1] - min[1]) + 0.05, min[2]];
    case "front-mid":
      return [cx, min[1] + 0.35 * (max[1] - min[1]), max[2]];
    case "rear-mid":
      return [cx, min[1] + 0.55 * (max[1] - min[1]), min[2]];
    default:
      return [cx, (min[1] + max[1]) / 2, cz];
  }
}

export function bikeAnchorsFromBoxes(boxesByNodeName) {
  const result = { grill: null, exhaust: null, headlight: null, taillight: null };
  for (const [key, info] of Object.entries(BIKE_ANCHORS)) {
    const box = boxesByNodeName[info.node];
    if (box) {
      result[key] = anchorFromBox(box, info.rule);
    }
  }
  return result;
}
