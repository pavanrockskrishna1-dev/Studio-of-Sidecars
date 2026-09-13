import Icon from "./icons";

/* ==========================================================================
   Top header (Agent #2 · UI ONLY)
   --------------------------------------------------------------------------
   Brand + current environment read-out + the two header actions, per the
   mockup's `#topStrip`. Export is deliberately visual-only, so it takes an
   optional handler that this mission never supplies.

   `environment` is optional on purpose: the shell cannot know the live value
   (environment state is owned by App/StudioCanvas, which another mission
   owns), so it falls back to the locked hero default from the environment
   registry. The moment the engine exposes its state, passing the prop makes
   the read-out live — no other change needed here.
   ========================================================================== */

export default function TopHeader({ environment, versionLabel = "V1 · Classic" }) {
  return (
    <header className="sos-topbar sos-panel" aria-label="Studio header">
      <div className="sos-brand">
        <span className="sos-brand-tile" aria-hidden="true">
          <Icon name="aperture" size={19} />
        </span>
        <span className="sos-brand-txt">
          <span className="sos-brand-name">Studio of Sidecars</span>
          <span className="sos-brand-tag">Private · 3D creator studio</span>
        </span>
      </div>

      <span className="sos-divider" aria-hidden="true" />

      <div
        className="sos-env"
        title={
          environment?.mood
            ? `${environment.name} — ${environment.mood}`
            : environment?.name
        }
      >
        <span className="sos-dot" aria-hidden="true" />
        <span>
          <span className="sos-env-name">{environment?.name ?? "Studio"}</span>
          <span className="sos-env-sub">{versionLabel}</span>
        </span>
      </div>

      <div className="sos-actions">
        {/* visual only in this build: the export pipeline belongs to the engine */}
        <button
          type="button"
          className="sos-btn sos-btn-primary"
          data-testid="ui-export"
          title="Export — visual only in this build"
        >
          Export
          <Icon name="upload" size={15} />
        </button>
        <button
          type="button"
          className="sos-btn sos-btn-ghost"
          data-testid="ui-learn"
          title="Learn Studio — visual only in this build"
        >
          <Icon name="book" size={15} />
          Learn Studio
        </button>
        <button
          type="button"
          className="sos-icon-btn"
          title="Help"
          aria-label="Help"
        >
          <Icon name="help" size={16} />
        </button>
        <button
          type="button"
          className="sos-icon-btn"
          title="Settings"
          aria-label="Settings"
        >
          <Icon name="sliders" size={16} />
        </button>
      </div>
    </header>
  );
}
