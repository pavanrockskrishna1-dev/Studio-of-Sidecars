import { VERSION_TABS } from "./content";

/* ==========================================================================
   Floating version navigation (Agent #2 · UI ONLY)
   --------------------------------------------------------------------------
   V1–V6 exactly as listed in PROJECT_STATE.json. Only V1 Classic is active in
   this build: the remaining workspaces are rendered as reserved slots
   (`aria-disabled`) rather than fake switches, so a click can never imply a
   version the React app does not ship yet. Phase 15A: each reserved slot now
   carries a visible "Reserved" badge so it reads as "not built yet" rather
   than as a broken tab.
   ========================================================================== */

export default function VersionTabs() {
  return (
    <nav className="sos-tabs-wrap" aria-label="Studio versions">
      <div className="sos-tabs sos-panel" role="tablist" aria-label="V1–V6">
        {VERSION_TABS.map((v) => {
          const active = Boolean(v.active);
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              className="sos-tab"
              aria-selected={active}
              aria-disabled={active ? undefined : "true"}
              data-testid={`ui-version-${v.short}`}
              aria-label={`${v.short} ${v.name}${active ? "" : " (reserved)"}`}
              title={
                active
                  ? `${v.short} · ${v.name} — active workspace`
                  : `${v.short} · ${v.name} — reserved, not wired in this build`
              }
            >
              <span className="sos-tab-dot" aria-hidden="true" />
              <b>{v.short}</b>
              <span className="sos-tab-txt">
                <span className="sos-tab-name">{v.name}</span>
                <span className="sos-tab-name-sm">{v.compact}</span>
                {active ? null : <span className="sos-tab-badge">Reserved</span>}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
