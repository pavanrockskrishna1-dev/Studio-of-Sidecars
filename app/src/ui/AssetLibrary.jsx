import Icon from "./icons";
import { PLACEHOLDER_HINT, PLACEHOLDER_TAG } from "./content";

/* ==========================================================================
   Asset Library grid (Agent #2 · UI ONLY)
   --------------------------------------------------------------------------
   One reusable <AssetGrid> / <AssetCard> pair, driven entirely by cards the
   sidebar derives from the engine registries. The grid is the mockup's card
   language (glass plate, 12px radius, accent reserved for state) at the
   column width the shell already owns, so it needs no new layout contract:
   auto-fill keeps it a 2-up at 260px, 1-up when the column is tight, and
   wider later without touching this file.

   Selecting is delegated, never reimplemented — `onSelect(id)` is the bridge
   that invokes the engine's own picker (see useEngineSelection). A placeholder
   card gets no handler at all, and reuses the inert treatment `.sos-row`
   already defines (muted text, default cursor, no pointer affordance).
   ========================================================================== */

function CardPlate({ item }) {
  if (item.thumb) {
    return (
      <img
        className="sos-asset-plate-img"
        src={item.thumb}
        alt=""
        width="120"
        height="54"
        loading="lazy"
        decoding="async"
        draggable="false"
      />
    );
  }
  return (
    <span className="sos-asset-plate" aria-hidden="true">
      <Icon name={item.icon} size={20} stroke={1.6} />
    </span>
  );
}

export function AssetCard({ item, active, onSelect }) {
  const inert = Boolean(item.placeholder);
  const state = inert
    ? PLACEHOLDER_HINT
    : active
      ? "shown in the stage now"
      : "show in the stage";
  // `short` is the registry's compressed label; the full name stays in the
  // accessible name (title) so nothing is lost, only re-flowed.
  const shown = item.short || item.name;
  return (
    <button
      type="button"
      className="sos-asset"
      data-inert={inert || undefined}
      data-active={active || undefined}
      data-testid={`asset-card-${item.id}`}
      aria-disabled={inert ? "true" : undefined}
      aria-pressed={inert ? undefined : Boolean(active)}
      tabIndex={inert ? -1 : 0}
      title={`${item.name} — ${state}`}
      aria-label={shown}
      onClick={inert ? undefined : () => onSelect(item.id)}
    >
      <span className="sos-asset-media">
        <CardPlate item={item} />
        {inert ? <span className="sos-tag">{PLACEHOLDER_TAG}</span> : null}
      </span>
      <span className="sos-asset-txt">
        <span className="sos-row-name">{shown}</span>
        {!inert && item.category ? <span className="sos-row-sub">{item.category}</span> : null}
      </span>
      {active ? <span className="sos-asset-state" aria-hidden="true" /> : null}
    </button>
  );
}

export default function AssetGrid({ group, activeId, onSelect, collapsed }) {
  return (
    <div
      className="sos-lib"
      role="group"
      data-testid={`asset-grid-${group.kind}`}
      aria-label={`${group.name} — ${group.items.length} asset${group.items.length === 1 ? "" : "s"}`}
      // the collapsed strip hides bodies in CSS; keep the tiles out of the
      // accessibility tree as well so the rail announces only what is usable
      aria-hidden={collapsed ? "true" : undefined}
    >
      {group.items.map((item) => (
        <AssetCard
          key={item.id}
          item={item}
          active={!item.placeholder && item.id === activeId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
