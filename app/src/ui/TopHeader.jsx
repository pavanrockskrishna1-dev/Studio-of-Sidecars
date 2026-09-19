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

   Phase 15A adds the session controls: an editable project name (defaults to
   the loaded asset's name, saved with the session) and Save / Restore / Reset
   Studio Session. They only call the handlers StudioShell passes in; the
   session itself lives in ../session/studioSession.js.
   ========================================================================== */

export default function TopHeader({
  environment,
  versionLabel = "V1 · Classic",
  projectName = "",
  onProjectNameChange,
  onProjectNameBlur,
  session,
}) {
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

      <input
        className="sos-project"
        type="text"
        value={projectName}
        maxLength={60}
        spellCheck={false}
        placeholder="Project name"
        aria-label="Project name"
        title="Project name — defaults to the loaded asset; saved with the studio session"
        data-testid="ui-project-name"
        onChange={(e) => onProjectNameChange?.(e.target.value)}
        onBlur={onProjectNameBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />

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
        {session ? (
          <div className="sos-session" role="group" aria-label="Studio session">
            <button
              type="button"
              className="sos-btn sos-btn-ghost sos-btn-session"
              data-testid="ui-session-save"
              title="Save Studio Session — camera, lighting, environment, materials, viewer settings, asset and transforms (local only, not an export)"
              onClick={session.onSave}
            >
              <Icon name="save" size={15} />
              <span className="sos-btn-label">{session.flash === "saved" ? "Saved" : "Save"}</span>
            </button>
            {session.canRestore ? (
              <button
                type="button"
                className="sos-btn sos-btn-ghost sos-btn-session"
                data-testid="ui-session-restore"
                title="Restore the last saved studio session"
                onClick={session.onRestore}
              >
                <Icon name="folder" size={15} />
                <span className="sos-btn-label">{session.flash === "restored" ? "Restored" : "Restore"}</span>
              </button>
            ) : null}
            <button
              type="button"
              className="sos-btn sos-btn-ghost sos-btn-session"
              data-testid="ui-session-reset"
              title="Reset Entire Studio Session — camera, lighting, environment, materials, transforms and viewer controls"
              onClick={session.onReset}
            >
              <Icon name="undo" size={15} />
              <span className="sos-btn-label">{session.flash === "reset" ? "Reset done" : "Reset"}</span>
            </button>
            <span className="sos-session-live" role="status" aria-live="polite">
              {session.flash ? `Session ${session.flash}` : ""}
            </span>
          </div>
        ) : null}
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
          <span className="sos-btn-label">Learn Studio</span>
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
