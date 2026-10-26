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
  /* stacked material plates — the pack's swatch block */
  swatch: (
    <>
      <path d="M12 3.4 20.4 8 12 12.6 3.6 8Z" />
      <path d="m3.6 12.4 8.4 4.6 8.4-4.6M3.6 16.6 12 21.2l8.4-4.6" />
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
  /* Mission 11A — Materials Manager vocabulary */
  palette: (
    <>
      <path d="M12 3.7a8.3 8.3 0 1 0 0 16.6c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.8-.5-1.1-.3-.3-.5-.7-.5-1.1 0-.9.8-1.7 1.8-1.7h1.4a4.3 4.3 0 0 0 4.3-4.3c0-3.7-3.7-6.7-8.3-6.7Z" />
      <circle cx="8" cy="9.2" r=".9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.4" r=".9" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="9.4" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  star: (
    <path d="m12 4.2 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.9l5.4-.8Z" />
  ),
  occasions: (
    <>
      <path d="M12 3v1.5M12 19.5V21M3 12H4.5M19.5 12H21M5.6 5.6l1 1M17.4 17.4l1 1M18.4 5.6l-1 1M6.6 17.4l-1 1" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 8.5a1 1 0 0 1 1 1v1.8l1.2.7" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6" />
      <path d="m15.2 15.2 4.2 4.2" />
    </>
  ),
  copy: (
    <>
      <rect x="8.6" y="8.6" width="11" height="11" rx="2.2" />
      <path d="M15.4 5.4H6.4a2.2 2.2 0 0 0-2.2 2.2v9" />
    </>
  ),
  trash: (
    <>
      <path d="M4.8 7.2h14.4M9.4 7.2V5.4a1.2 1.2 0 0 1 1.2-1.2h2.8a1.2 1.2 0 0 1 1.2 1.2v1.8" />
      <path d="M6.6 7.2 7.6 19a1.6 1.6 0 0 0 1.6 1.4h5.6A1.6 1.6 0 0 0 16.4 19l1-11.8" />
    </>
  ),
  edit: (
    <>
      <path d="m5 18.6.9-3.6 9.5-9.5a1.9 1.9 0 0 1 2.7 2.7l-9.5 9.5Z" />
      <path d="M4.4 20.4h6.2" />
    </>
  ),
  undo: (
    <>
      <path d="M4.6 9.4h8.6a5 5 0 1 1 0 10H8.2" />
      <path d="m8 5.4-3.4 4 3.4 4" />
    </>
  ),
  plus: <path d="M12 5.6v12.8M5.6 12h12.8" />,
  pin: (
    <>
      <path d="M9 3.8h6l-.9 5.4 3.1 3v1.6h-4.7V20L12 21l-.5-1V13.8H6.8v-1.6l3.1-3Z" />
    </>
  ),
  /* Slice U2: the sheet header's peek button (the Reel sections reuse "chevron") */
  eye: (
    <>
      <path d="M2.8 12S6.2 5.8 12 5.8 21.2 12 21.2 12 17.8 18.2 12 18.2 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  save: (
    <>
      <path d="M5.6 3.8h10.2l3.6 3.6v11.4a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 18.8V5.4a1.6 1.6 0 0 1 1.6-1.6Z" />
      <path d="M8 3.8v4.6h6.4V3.8M7.6 20.4v-6.2h8.8v6.2" />
    </>
  ),
  /* Animation Studio / MotionLab launcher — keyframe diamond on a timeline */
  motion: (
    <>
      <path d="M3.6 12h6.2M14.2 12h6.2" />
      <path d="M12 9.2 14.8 12 12 14.8 9.2 12Z" fill="currentColor" stroke="none" />
      <path d="M12 5v1.6M12 17.4V19M7.4 6.8l1.1 1.1M15.5 15l1.1 1.1M6.8 16.6l1.1-1.1M15 8.5l1.1-1.1" />
    </>
  ),
  /* Generic close / dismiss */
  close: <path d="M6 6l12 12M18 6 6 18" />,
};

export default function Icon({ name, size = 18, stroke = 1.6, className, style, filled = false }) {
  const glyph = PATHS[name];
  if (!glyph) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      fill={filled ? "currentColor" : "none"}
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
