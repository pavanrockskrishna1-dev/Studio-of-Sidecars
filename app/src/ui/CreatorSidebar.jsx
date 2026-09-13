import { useCallback, useEffect, useState } from "react";
import Icon from "./icons";
import { GROUP_DEFS, buildLibraryGroups } from "./content";
import ImportPanel from "./ImportPanel";
import { hydrateRuntimeAssets, useRuntimeAssets } from "../assets/runtimeRegistry";
import { BBQ_PACK } from "./bbqPack";
import AssetGrid from "./AssetLibrary";
import AssetPreview from "./AssetPreview";
import MaterialsManager from "./MaterialsManager";

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
  // Mission 10E — rehydrate persisted imports once, then rebuild the library
  // groups whenever the runtime registry mirrors something new in or out.
  const runtimeVersion = useRuntimeAssets();
  useEffect(() => {
    hydrateRuntimeAssets();
  }, []);
  // useRuntimeAssets() above re-renders this component on every registry
  // change, so a plain rebuild here is always current — no memo needed.
  void runtimeVersion;
  const groups = buildLibraryGroups();
  const assetCount = groups.reduce((n, g) => n + g.items.length, 0);

  // disclosure state only — asset state belongs to the engine
  const [open, setOpen] = useState(() =>
    Object.fromEntries(GROUP_DEFS.map((g) => [g.id, Boolean(g.open)]))
  );
  // the pack section's disclosure is shell state too; the pack itself is
  // read-only artwork, so there is nothing to select and no bridge to wire
  const [packOpen, setPackOpen] = useState(true);
  // materials disclosure is shell state too; the material values themselves
  // live on the three.js materials, and only their snapshot is persisted
  const [matOpen, setMatOpen] = useState(true);

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
        <span className="sos-meta">{assetCount} assets</span>
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
        <section className="sos-group" data-open="true">
          <button type="button" className="sos-group-head" aria-expanded="true" data-testid="ui-group-import">
            <span className="sos-tile" aria-hidden="true">
              <Icon name="upload" size={16} />
            </span>
            <span className="sos-group-txt">
              <span className="sos-group-name">Import Assets</span>
              <span className="sos-group-sub">GLB · glTF · HDR · EXR — stored on this device</span>
            </span>
          </button>
          <div className="sos-group-body">
            <ImportPanel collapsed={collapsed} />
          </div>
        </section>
        {groups.map((group) => (
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

        {/* Mission 11A — the Materials Manager edits the materials of whatever
            the engine currently has staged, so it follows `selection.productId`
            and owns no model state of its own. */}
        <section className="sos-group" data-open={matOpen}>
          <button
            type="button"
            className="sos-group-head"
            aria-expanded={collapsed ? undefined : matOpen}
            data-testid="ui-group-materials"
            title={collapsed ? "Materials — expand the creator panel" : "Materials — live PBR editing for the staged model"}
            onClick={() => (collapsed ? onCollapse?.() : setMatOpen((v) => !v))}
          >
            <span className="sos-tile" aria-hidden="true">
              <Icon name="palette" size={16} />
            </span>
            <span className="sos-group-txt">
              <span className="sos-group-name">Materials</span>
              <span className="sos-group-sub">live editing · staged model</span>
            </span>
            <span className="sos-tag">Live</span>
            <Icon name="chevron" size={13} className="sos-chev" />
          </button>
          {matOpen ? (
            <div className="sos-group-body">
              <MaterialsManager
                collapsed={collapsed}
                productId={selection.productId}
                onExpand={onCollapse}
              />
            </div>
          ) : null}
        </section>

        <section className="sos-group" data-open={packOpen}>
          <button
            type="button"
            className="sos-group-head"
            aria-expanded={collapsed ? undefined : packOpen}
            data-testid="ui-group-bbq-pack"
            title={
              collapsed
                ? `${BBQ_PACK.name} — expand the creator panel`
                : `${BBQ_PACK.name} — ${BBQ_PACK.tag.toLowerCase()}: ${
                    BBQ_PACK.views.length + BBQ_PACK.references.length + BBQ_PACK.materials.length
                  } stills`
            }
            onClick={() => (collapsed ? onCollapse?.() : setPackOpen((v) => !v))}
          >
            <span className="sos-tile" aria-hidden="true">
              <Icon name="flame" size={16} />
            </span>
            <span className="sos-group-txt">
              <span className="sos-group-name">{BBQ_PACK.name}</span>
              <span className="sos-group-sub">{BBQ_PACK.sub}</span>
            </span>
            <span className="sos-tag">{BBQ_PACK.tag}</span>
            <Icon name="chevron" size={13} className="sos-chev" />
          </button>
          {packOpen ? (
            <div className="sos-group-body" data-layout="grid">
              <AssetPreview collapsed={collapsed} />
            </div>
          ) : null}
        </section>
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
