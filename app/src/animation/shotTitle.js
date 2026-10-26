/* Slice R1 - the per-shot title text of a Reel (pure data rules, no DOM).
   ---------------------------------------------------------------------------
   A shot may carry `title: { text, pos }`: text is at most 2 lines (a line
   break splits them) of at most MAX_TITLE_LINE_CHARS characters, pos is where
   the block sits inside the Instagram safe area. The stored text keeps the
   user's spaces (so typing a space between two words works); the lines that
   are drawn are trimmed (titleLines). A title with no visible text and the
   default position is no title at all (normTitle returns undefined). */

export const TITLE_POSITIONS = Object.freeze(["top", "middle", "bottom"]);
export const DEFAULT_TITLE_POS = "bottom";
export const TITLE_ANIM_STYLES = Object.freeze(["fade", "slide-up", "flash"]);
export const DEFAULT_TITLE_ANIM = "fade";
export const MAX_TITLE_LINES = 2;
export const MAX_TITLE_LINE_CHARS = 60;

// The stored text: at most 2 lines, each cut to the character limit, spaces kept.
export function clampTitleText(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/\r/g, "")
    .split("\n")
    .slice(0, MAX_TITLE_LINES)
    .map((l) => l.slice(0, MAX_TITLE_LINE_CHARS))
    .join("\n");
}

// The lines that are drawn: trimmed, empty ones dropped, at most 2.
export function titleLines(text) {
  return clampTitleText(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_TITLE_LINES);
}

export const isTitle = (t) =>
  !!t && typeof t === "object" && typeof t.text === "string" && TITLE_POSITIONS.includes(t.pos);

// A clean { text, pos, animStyle } or undefined (no visible text and the defaults).
export function normTitle(t) {
  if (!t || typeof t !== "object") return undefined;
  const text = clampTitleText(t.text);
  const pos = TITLE_POSITIONS.includes(t.pos) ? t.pos : DEFAULT_TITLE_POS;
  const animStyle = TITLE_ANIM_STYLES.includes(t.animStyle) ? t.animStyle : DEFAULT_TITLE_ANIM;
  if (!titleLines(text).length && pos === DEFAULT_TITLE_POS && animStyle === DEFAULT_TITLE_ANIM) return undefined;
  return { text, pos, animStyle };
}

export const hasTitle = (shot) => !!shot && !!shot.title && titleLines(shot.title.text).length > 0;
