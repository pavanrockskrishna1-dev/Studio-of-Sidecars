export const REEL_TEMPLATES = Object.freeze([
  {
    id: "product-drop",
    name: "Product Drop",
    icon: "🎬",
    shots: [
      { move: "push-in",   startView: "Low Hero", durationS: 8 },
      { move: "turntable", startView: "3/4",      durationS: 12 },
      { move: "pull-back", startView: "Front",    durationS: 8 },
    ],
  },
  {
    id: "festival-night",
    name: "Festival Night",
    icon: "✨",
    shots: [
      { move: "crane",   startView: "3/4",  durationS: 8 },
      { move: "orbit",   startView: "Side", durationS: 12 },
      { move: "push-in", startView: "Front", durationS: 8 },
    ],
  },
  {
    id: "street-reveal",
    name: "Street Reveal",
    icon: "🏍️",
    shots: [
      { move: "slide",   startView: "Side", durationS: 8 },
      { move: "orbit",   startView: "3/4",  durationS: 12 },
      { move: "push-in", startView: "Front", durationS: 4 },
    ],
  },
  {
    id: "hero-shot",
    name: "Hero Shot",
    icon: "⭐",
    shots: [
      { move: "turntable", startView: "3/4", durationS: 12 },
    ],
  },
  {
    id: "quick-drop",
    name: "Quick Drop",
    icon: "⚡",
    shots: [
      { move: "push-in", startView: "Low Hero", durationS: 4 },
      { move: "orbit",   startView: "3/4",      durationS: 8 },
    ],
  },
  {
    id: "cinematic",
    name: "Cinematic",
    icon: "🎥",
    shots: [
      { move: "crane",   startView: "Top",  durationS: 8 },
      { move: "slide",   startView: "Side", durationS: 8 },
      { move: "push-in", startView: "3/4",  durationS: 8 },
    ],
  },
  {
    id: "low-hero-circle",
    name: "Low & Round",
    icon: "🔄",
    shots: [
      { move: "push-in", startView: "Low Hero", durationS: 8 },
      { move: "orbit",   startView: "Low Hero", durationS: 12 },
    ],
  },
  {
    id: "full-showcase",
    name: "Full Showcase",
    icon: "🌟",
    shots: [
      { move: "crane",     startView: "Top",    durationS: 8 },
      { move: "orbit",     startView: "3/4",    durationS: 8 },
      { move: "push-in",   startView: "Front",  durationS: 8 },
      { move: "pull-back", startView: "Rear",   durationS: 4 },
    ],
  },
]);
