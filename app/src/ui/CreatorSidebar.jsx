import { useCallback, useState } from "react";
import Icon from "./icons";
import { SIDEBAR_GROUPS } from "./content";

/* ==========================================================================
   Left creator sidebar (Agent #2 · UI ONLY)
   --------------------------------------------------------------------------
   Collapsible groups from the mockup's `#sideNav`, rebuilt as one reusable
   <SidebarGroup> + <SidebarRow> pair driven by ui/content.js:
   Furniture · Lighting · Scenes · Projects · Studio Backgrounds, with the
   Private Workspace strip pinned to the footer.

   Scope note: only the group disclosure is interactive (chrome state). Every
   row is inert by contract — `aria-disabled`, no handler — because the
   engines for these libraries do not exist yet. Making them look live would
   be worse than an honest placeholder.
   ========================================================================== */

function RowGlyph({ name, thumb }) {
  if (thumb) {
    return (
      <img
        className="sos-row-thumb"
        src={thumb}
        alt=""
        width="30"
        height="20"
        loading="lazy"
        draggable="false"
      />
    );
  }
  return (
    <span className="sos-row-ico" aria-hidden="true">
      <Icon name={name} size={13} stroke={1.7} />
    </span>
  );
}

function SidebarRow({ item }) {
  return (
    <button
      type="button"
      className="sos-row"
      aria-disabled="true"
      tabIndex={-1}
      title={`${item.name} — UI shell only in this build`}
    >
      <RowGlyph name={item.icon} thumb={item.thumb} />
      <span style={{ minWidth: 0 }}>
        <span className="sos-row-name">{item.name}</span>
        {item.meta ? <span className="sos-row-sub">{item.meta}</span> : null}
      </span>
      {item.tag ? <span className="sos-tag">{item.tag}</span> : null}
    </button>
  );
}

function SidebarGroup({ group, open, onToggle, collapsed }) {
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
        <div className="sos-group-body" role="list">
          {group.items.map((item) => (
            <SidebarRow key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function CreatorSidebar({
  dodgeBelow = 0,
  collapsed = false,
  onCollapse,
}) {
  // disclosure state only — never touches scene, camera or asset state
  const [open, setOpen] = useState(() =>
    Object.fromEntries(SIDEBAR_GROUPS.map((g) => [g.id, Boolean(g.open)]))
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
      aria-label="Creator library"
      // park below the engine's selection inspector when it is open
      style={dodgeBelow ? { "--sos-dodge": `${dodgeBelow}px` } : undefined}
    >
      <div className="sos-side-head">
        <span className="sos-eyebrow">Creator</span>
        <span className="sos-meta">{SIDEBAR_GROUPS.length} collections</span>
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
        {SIDEBAR_GROUPS.map((group) => (
          <SidebarGroup
            key={group.id}
            group={group}
            open={Boolean(open[group.id])}
            collapsed={collapsed}
            onToggle={() => toggle(group.id)}
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
