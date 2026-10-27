/* ==========================================================================
   Studio toolbar (UI ONLY)
   --------------------------------------------------------------------------
   Manga redesign: a full-width strip along the bottom edge with six labelled
   sections. Each one opens its own sheet (StudioShell groups the old tool
   sheets under these six). This component only reports which id was clicked
   and highlights every id whose sheet is open (up to two: one pinned, one
   not). The labels are visible, so there is no hover tooltip any more.
   ========================================================================== */

const TOOLS = [
  { id: "scene", label: "Scene", glyph: "◉" },
  { id: "style", label: "Style", glyph: "✦" },
  { id: "props", label: "Props", glyph: "⬡" },
  { id: "create", label: "Create", glyph: "▲" },
  { id: "reel", label: "Reel", glyph: "▷" },
  { id: "export", label: "Export", glyph: "↓" },
];

export default function StudioDock({ openIds = [], onSelect, idle }) {
  return (
    <nav className="sos2-dock" data-idle={idle || undefined} aria-label="Studio tools">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          className="sos2-dock-btn"
          data-on={openIds.includes(t.id) || undefined}
          aria-pressed={openIds.includes(t.id)}
          data-testid={`ui2-dock-${t.id}`}
          onClick={() => onSelect(t.id)}
        >
          <span className="sos2-dock-glyph" aria-hidden="true">
            {t.glyph}
          </span>
          <span className="sos2-dock-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
