/* Pure display helper — converts raw GLB animation clip names to human-readable
   labels. No imports, no side effects; safe to import in both the browser and
   plain Node (for tests). */

export function cleanClipName(raw) {
  if (typeof raw !== "string" || raw === "") return raw;
  // Exact known aliases
  if (raw === "mixamo.com") return "Mixamo";
  // "Take 001", "Take 01", "Take 1" → "Take 1"
  const takeMatch = /^Take\s+0*(\d+)$/.exec(raw);
  if (takeMatch) return `Take ${takeMatch[1]}`;
  // camelCase → insert spaces before uppercase letters that follow lowercase
  let s = raw.replace(/([a-z])([A-Z])/g, "$1 $2");
  // underscores and hyphens → spaces
  s = s.replace(/[_-]/g, " ");
  // collapse runs of whitespace
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return raw;
  // Sentence case: first char upper, rest lower
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
