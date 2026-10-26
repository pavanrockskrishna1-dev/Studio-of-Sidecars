// Where each added object was first placed this session (itemId -> transform),
// so the Garage's "Put back" can return a moved prop to its spot.
const placed = new Map();

export const recordPlaced = (itemId, transform) => {
  if (itemId && transform && !placed.has(itemId)) placed.set(itemId, { ...transform });
};
export const placedPose = (itemId) => (placed.has(itemId) ? { ...placed.get(itemId) } : null);
