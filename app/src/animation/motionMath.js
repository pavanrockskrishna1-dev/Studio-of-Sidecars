export function normMotion(v) {
  if (!v || typeof v !== "object") return undefined;
  if (typeof v.id !== "string" || (!v.id.startsWith("b:") && !v.id.startsWith("o:"))) return undefined;
  
  let texts = undefined;
  if (Array.isArray(v.texts)) {
    texts = v.texts.map(t => {
      if (t === null || t === undefined) return undefined;
      return String(t).trim().substring(0, 60);
    }).slice(0, 6); // up to 6 strings
    while (texts.length > 0 && texts[texts.length - 1] === undefined) {
      texts.pop();
    }
    if (texts.length === 0) texts = undefined;
  }

  return {
    id: v.id,
    ...(texts ? { texts } : {}),
    ...(v.clear ? { clear: true } : {}),
    ...(v.hold ? { hold: true } : {})
  };
}

export function motionLocalTime(localS, durS, shotDurS, hold) {
  if (localS < 0 || shotDurS <= 0 || durS <= 0) return null;
  if (localS >= shotDurS) return null;
  const limit = Math.min(durS, shotDurS);
  if (localS >= limit) {
    if (hold) return limit;
    return null;
  }
  return localS;
}
