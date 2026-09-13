/* ==========================================================================
   Thin-line icon family for the creator UI shell (Agent #2 · UI ONLY).
   One 24x24 grid, 1.6 stroke, `stroke: currentColor` — the design package's
   rule that chrome uses vector glyphs instead of emoji (see
   design/README_PHASE1_UI.md "Premium polish" and redesign/skin/premium_icons.svg).
   Purely presentational: no state, no engine access.
   ========================================================================== */

const PATHS = {
  /* brand + header */
  aperture: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 3.6 8.1 10.4M20.1 12h-7.8M15.9 20.4 12 13.6M3.9 12h7.8" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15.6V4.2M7.8 8.4 12 4.2l4.2 4.2" />
      <path d="M4.2 14.4v3.9a1.7 1.7 0 0 0 1.7 1.7h12.2a1.7 1.7 0 0 0 1.7-1.7v-3.9" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.4A1.6 1.6 0 0 1 5.6 3.8H11v16H5.6A1.6 1.6 0 0 0 4 21.4Z" />
      <path d="M20 5.4a1.6 1.6 0 0 0-1.6-1.6H13v16h5.4a1.6 1.6 0 0 1 1.6 1.6Z" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M9.7 9.4a2.4 2.4 0 0 1 4.6.8c0 1.6-2.3 1.9-2.3 3.5" />
      <path d="M12 16.9h.01" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 8.2h8.4M17.6 8.2H20M4 15.8h3.4M12.6 15.8H20" />
      <circle cx="15" cy="8.2" r="2.1" />
      <circle cx="10.2" cy="15.8" r="2.1" />
    </>
  ),

  /* left sidebar groups */
  sofa: (
    <>
      <path d="M5.4 10.6V8a2.6 2.6 0 0 1 2.6-2.6h8A2.6 2.6 0 0 1 18.6 8v2.6" />
      <path d="M3.4 14.6v-1a1.9 1.9 0 0 1 3.8 0v1.2h9.6v-1.2a1.9 1.9 0 0 1 3.8 0v1.6a2.2 2.2 0 0 1-2.2 2.2H5.6a2.2 2.2 0 0 1-2.2-2.2Z" />
      <path d="M6.4 18.2v1.4M17.6 18.2v1.4" />
    </>
  ),
  bulb: (
    <>
      <path d="M9.4 17.6h5.2M10.4 20.4h3.2" />
      <path d="M12 3.6a5.6 5.6 0 0 0-3.3 10.1v1.9h6.6v-1.9A5.6 5.6 0 0 0 12 3.6Z" />
    </>
  ),
  film: (
    <>
      <rect x="3.4" y="5" width="17.2" height="14" rx="2.2" />
      <path d="M7.6 5v14M16.4 5v14M3.4 12h17.2" />
    </>
  ),
  folder: (
    <path d="M3.6 7.2a2 2 0 0 1 2-2h3.6l2.2 2.6h7a2 2 0 0 1 2 2v7.4a2 2 0 0 1-2 2h-12.8a2 2 0 0 1-2-2Z" />
  ),
  frame: (
    <>
      <rect x="3.4" y="4.8" width="17.2" height="14.4" rx="2.2" />
      <circle cx="8.6" cy="9.8" r="1.6" />
      <path d="M20.6 15.6 16 10.4l-8.6 8" />
    </>
  ),
  lock: (
    <>
      <rect x="4.6" y="10.4" width="14.8" height="9.2" rx="2.2" />
      <path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6" />
    </>
  ),

  /* right inspector */
  camera: (
    <>
      <path d="M3.4 9A2.6 2.6 0 0 1 6 6.4h1.6l1.2-2h6.4l1.2 2H18A2.6 2.6 0 0 1 20.6 9v7.6A2.6 2.6 0 0 1 18 19.2H6a2.6 2.6 0 0 1-2.6-2.6Z" />
      <circle cx="12" cy="12.8" r="3.4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.9" />
      <path d="M12 2.6v2.3M12 19.1v2.3M2.6 12h2.3M19.1 12h2.3M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />
    </>
  ),
  cube: (
    <>
      <path d="M12 3.4 19.6 7.7v8.6L12 20.6 4.4 16.3V7.7Z" />
      <path d="M4.4 7.7 12 12l7.6-4.3M12 12v8.6" />
    </>
  ),
  /* asset library — one glyph per registry product family (same 24 grid) */
  bike: (
    <>
      <circle cx="5.6" cy="16.2" r="3.5" />
      <circle cx="18.4" cy="16.2" r="3.5" />
      <path d="M5.6 16.2 10 9.4h4.6l3.8 6.8M10 9.4l2.8 6.8M14.6 9.4h2.6M8.4 8h3.4" />
      <path d="M12 19.7h.01" />
    </>
  ),
  plane: (
    <>
      <path d="M12 3.4c1 0 1.7.9 1.7 2.3v4.2l6.6 3.9v2.1l-6.6-2v4l2.2 1.7v1.5L12 20.5l-3.9.2v-1.5l2.2-1.7v-4l-6.6 2v-2.1l6.6-3.9V5.7C10.3 4.3 11 3.4 12 3.4Z" />
    </>
  ),
  flame: (
    <>
      <path d="M12 3.6c3.3 3 5.3 5.5 5.3 8.4a5.3 5.3 0 0 1-10.6 0c0-1.5.7-2.9 1.8-4.1.3 1.4 1 2.1 2 2.4-.4-2.5.2-4.7 1.5-6.7Z" />
    </>
  ),
  render: (
    <>
      <rect x="3.4" y="5" width="17.2" height="12.6" rx="2.2" />
      <path d="M8.2 20.4h7.6M9.6 15.4l2.4-3.2 1.8 2.2 1.6-2 2 3" />
    </>
  ),

  /* misc */
  info: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 11v5.4M12 7.9h.01" />
    </>
  ),
  chevron: <path d="M9.6 5.8 15.8 12l-6.2 6.2" />,
};

export default function Icon({ name, size = 18, stroke = 1.6, className, style }) {
  const glyph = PATHS[name];
  if (!glyph) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  );
}
