import { useSyncExternalStore } from "react";
import { titleLines } from "../animation/shotTitle";
import { brandingState } from "../poster/branding";

// Slice R1 - the Reel branding state as a hook, and the Branding section's
// collapsed one-line summary ("Logo · 2 titles · End card", or "Off").
export function useBranding() {
  return useSyncExternalStore(brandingState.subscribe, brandingState.getSnapshot, brandingState.getSnapshot);
}

export function brandingSummary(sequence, b) {
  const n = sequence.filter((s) => s.title && titleLines(s.title.text).length).length;
  const parts = [];
  if (b.logo) parts.push("Logo");
  if (n) parts.push(`${n} ${n === 1 ? "title" : "titles"}`);
  if (b.endCard) parts.push("End card");
  return parts.length ? parts.join(" · ") : "Off";
}
