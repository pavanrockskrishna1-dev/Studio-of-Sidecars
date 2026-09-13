import { useCallback, useState } from "react";
import Icon from "./icons";
import { ASSET_COUNT, LIBRARY_GROUPS } from "./content";
import AssetGrid from "./AssetLibrary";

/* ==========================================================================
   Left creator sidebar — the Asset Library (Agent #2 · UI ONLY)
   --------------------------------------------------------------------------
   Rebuilt on the shell's existing accordion: one reusable <SidebarGroup> whose
   body is now the asset grid (see AssetLibrary.jsx), fed by the engine
   registries through ui/content.js. It replaces the placeholder creator
   content (Furniture / Lighting / Scenes / Projects), because the studio can
   only display what its registries ship today: two products and eleven
   studio backgrounds, plus announced hardware that stays inert.

   Interaction contract:
     · group disclosure is shell state (open / collapsed);
     · a real card delegates selection to the engine's own picker, so the
       engine stays the single authority over product + environment state;
     · a placeholder card is inert by construction — no handler, no tab stop,
       aria-disabled — on the same treatment every other placeholder row in
       this shell already uses;
     · the panel scrolls internally and never grows over the stage.
   ========================================================================== */

function SidebarGroup({ group, open, onToggle, collapsed, activeId, onSelect }) {
  return (
    <section className="sos-group" data-open={open}>
      <button
        type="button"
        className="sos-group-head"
        aria-expanded={collapsed ? undefined : open}
        data-testid={`ui-group-${group.id}`}
        title={
          collapsed
            ? `${group.name} — expand the creator panel`
            : `${group.name} — ${group.items.length} item${group.items.length === 1 ? "" : "s"}`
        }
        onClick={onToggle}
      >
        <span className="sos-tile" aria-hidden="true">
          <Icon name={group.icon} size={16} />
        </span>
        <span className="sos-group-txt">
          <span className="sos-group-name">{group.name}</span>
          <span className="sos-group-sub">{group.sub}</span>
        </span>
        <span className="sos-count">{group.items.length}</span>
        <Icon name="chevron" size={13} className="sos-chev" />
      </button>
      {open ? (
        <div className="sos-group-body" data-layout="grid">
          <AssetGrid
            group={group}
            collapsed={collapsed}
            activeId={activeId}
            onSelect={onSelect}
          />
        </div>
      ) : null}
    </section>
  );
}

export default function CreatorSidebar({
  dodgeBelow = 0,
  collapsed = false,
  onCollapse,
  selection = {},
  onSelect,
}) {
  // disclosure state only — asset state belongs to the engine
  const [open, setOpen] = useState(() =>
    Object.fromEntries(LIBRARY_GROUPS.map((g) => [g.id, Boolean(g.open)]))
  );

  // Collapsed: a tile is an "expand and open this collection" shortcut, so the
  // icon rail is still a way in rather than a dead strip.
  const toggle = useCallback(
    (id) => {
      if (collapsed) {
        setOpen((prev) => ({ ...prev, [id]: true }));
        onCollapse?.();
        return;
      }
      setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
    },
    [collapsed, onCollapse]
  );

  return (
    <aside
      className="sos-side sos-panel"
      aria-label="Asset library"
      data-engine-ready={selection.ready || undefined}
      // park below the engine's selection inspector when it is open
      style={dodgeBelow ? { "--sos-dodge": `${dodgeBelow}px` } : undefined}
    >
      <div className="sos-side-head">
        <span className="sos-eyebrow">Creator</span>
        <span className="sos-meta">{ASSET_COUNT} assets</span>
        <button
          type="button"
          className="sos-collapse"
          data-testid="ui-side-collapse"
          aria-label={collapsed ? "Expand creator panel" : "Collapse creator panel to icons"}
          title={collapsed ? "Expand panel" : "Collapse to icons — gives the stage the room back"}
          onClick={onCollapse}
        >
          <Icon name="chevron" size={12} stroke={2} />
        </button>
      </div>

      <div className="sos-side-scroll">
        {LIBRARY_GROUPS.map((group) => (
          <SidebarGroup
            key={group.id}
            group={group}
            open={Boolean(open[group.id])}
            collapsed={collapsed}
            onToggle={() => toggle(group.id)}
            activeId={group.kind === "product" ? selection.productId : selection.environmentId}
            onSelect={(id) => onSelect?.(group.kind, id)}
          />
        ))}
      </div>

      <div className="sos-side-foot">
        <span className="sos-row-ico" aria-hidden="true">
          <Icon name="lock" size={13} stroke={1.7} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span className="sos-row-name">Private Workspace</span>
          <span className="sos-row-sub">100% offline · this device</span>
        </span>
      </div>
    </aside>
  );
}
