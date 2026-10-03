import { useMemo, useState } from "react";
import Icon from "./icons";
import { PLACEHOLDER_HINT, PLACEHOLDER_TAG } from "./content";
import { useRuntimeAssets, updateAssetRecord, removeAsset, duplicateAsset, replaceAssetFiles, getRuntimeEntry, nudgeEngineRender } from "../assets/runtimeRegistry";
import { renderGlbThumbnail, renderHdriPreviews } from "../assets/thumbnail";

/* ==========================================================================
   Asset Library grid (Agent #2 shell · extended by Mission 10E)
   --------------------------------------------------------------------------
   Same card language and the same delegated selection contract as 10A
   (`onSelect(id)` → the engine's own picker). Mission 10E adds, purely in
   this shell layer: live search, filter chips, sorting, favorites and the
   per-imported-asset actions (rename / replace / delete / duplicate /
   reveal thumbnail). Built-in cards stay exactly as inert/active as before;
   only entries mirrored by the runtime registry get the action menu.
   ========================================================================== */

const FAV_KEY = "sos-asset-favs";
const readFavs = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
  } catch {
    return new Set();
  }
};
const writeFavs = (set) => {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
};

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

export function AssetCard({ item, active, onSelect, favorite, onToggleFav, actions, menu }) {
  const inert = Boolean(item.placeholder);
  const state = inert
    ? PLACEHOLDER_HINT
    : active
      ? "shown in the stage now"
      : "show in the stage";
  const shown = item.short || item.name;
  return (
    <div
      className="sos-asset-wrap"
      data-testid={`asset-card-${item.id}`}
      data-active={active || undefined}
    >
      <button
        type="button"
        className="sos-asset"
        data-inert={inert || undefined}
        data-active={active || undefined}
        aria-disabled={inert ? "true" : undefined}
        aria-pressed={inert ? undefined : Boolean(active)}
        tabIndex={inert ? -1 : 0}
        title={`${item.name} — ${state}`}
        aria-label={shown}
        onClick={inert ? undefined : () => onSelect(item.id)}
      >
        <span className="sos-asset-media">
          <CardPlate item={item} />
        </span>
        <span className="sos-asset-txt">
          <span className="sos-row-name">{shown}</span>
          {!inert && item.category ? <span className="sos-row-sub">{item.category}</span> : null}
          {/* B1: status tags sit in the text block, never over the thumbnail */}
          {inert ? <span className="sos-tag sos-asset-badge">{PLACEHOLDER_TAG}</span> : null}
          {item.source === "imported" ? <span className="sos-tag sos-tag-imp sos-asset-badge">imported</span> : null}
        </span>
        {active ? <span className="sos-asset-state" aria-hidden="true" /> : null}
      </button>
      {!inert ? (
        <span className="sos-asset-tools">
          <button
            type="button"
            className="sos-star"
            data-on={favorite || undefined}
            aria-label={favorite ? `Unfavorite ${item.name}` : `Favorite ${item.name}`}
            title={favorite ? "Remove from favorites" : "Add to favorites"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFav?.(item.id);
            }}
          >
            {favorite ? "★" : "☆"}
          </button>
          {actions ? (
            <button
              type="button"
              className="sos-star"
              aria-label={`Actions for ${item.name}`}
              title="Rename · replace · duplicate · delete"
              data-testid={`asset-menu-${item.id}`}
              onClick={(e) => {
                e.stopPropagation();
                actions(item.id);
              }}
            >
              ⋯
            </button>
          ) : null}
        </span>
      ) : null}
      {menu ? <div className="sos-cardmenu">{menu}</div> : null}
    </div>
  );
}

const PRODUCT_FILTERS = [
  { id: "all", label: "All" },
  { id: "coffee", label: "Coffee Bike" },
  { id: "bbq", label: "BBQ Bike" },
  { id: "aircraft", label: "Aircraft" },
  { id: "imported", label: "Imported" },
  { id: "builtin", label: "Built-in" },
];
const ENV_FILTERS = [
  { id: "all", label: "All" },
  { id: "Studio", label: "Studio" },
  { id: "Coffee Lifestyle", label: "Coffee Lifestyle" },
  { id: "Aviation", label: "Aviation" },
  { id: "Outdoor", label: "Outdoor" },
  { id: "imported", label: "Imported" },
];
const SORTS = [
  { id: "name", label: "Name" },
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
];

function matchesFilter(kind, item, filter) {
  if (filter === "all") return true;
  if (filter === "imported") return item.source === "imported";
  if (filter === "builtin") return item.source !== "imported" && !item.placeholder;
  if (kind === "product") {
    if (filter === "coffee") return item.id === "coffee-bike" || item.id === "the-kop-main";
    if (filter === "bbq") return item.id === "bbq-bike";
    if (filter === "aircraft") return item.id === "cessna-172" || (item.source === "imported" && item.category === "Aircraft");
  }
  return item.category === filter;
}

export default function AssetGrid({ group, activeId, onSelect, collapsed }) {
  useRuntimeAssets(); // re-derive cards whenever the runtime registry changes
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [favs, setFavs] = useState(readFavs);
  const [menuFor, setMenuFor] = useState(null);
  const [renameFor, setRenameFor] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [reveal, setReveal] = useState(null);

  const items = useMemo(() => {
    // A stored imported asset can predate the name fallback in ImportPanel's
    // save() and have no (or a non-string) `name` — never crash the search
    // filter or the sort on it, fall back to the asset's id, then "".
    const nameOf = (it) => (typeof it.name === "string" ? it.name : it.id || "");
    const q = query.trim().toLowerCase();
    const list = group.items.filter(
      (it) => matchesFilter(group.kind, it, filter) && (!q || nameOf(it).toLowerCase().includes(q))
    );
    const idx = new Map(group.items.map((it, i) => [it.id, i]));
    const stamp = (it) => it.importedAt || idx.get(it.id) || 0;
    if (sort === "name") list.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    if (sort === "newest") list.sort((a, b) => stamp(b) - stamp(a));
    if (sort === "oldest") list.sort((a, b) => stamp(a) - stamp(b));
    return list;
  }, [group, query, filter, sort]);

  const toggleFav = (id) => {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeFavs(next);
      return next;
    });
  };

  const doRename = async (id) => {
    const name = renameValue.trim();
    if (name) await updateAssetRecord(id, { name });
    setRenameFor(null);
    setMenuFor(null);
  };

  const doDelete = async (id) => {
    if (id === activeId) {
      const fallback = group.items.find((it) => it.source !== "imported" && !it.placeholder);
      if (fallback) onSelect(fallback.id);
      await new Promise((r) => setTimeout(r, 400));
    }
    await removeAsset(id);
    setMenuFor(null);
  };

  const doReplace = async (id, file) => {
    const entry = getRuntimeEntry(id);
    if (!entry) return;
    const buffer = await file.arrayBuffer();
    if (entry.record.kind === "product") {
      const { thumb } = await renderGlbThumbnail(buffer);
      await replaceAssetFiles(id, { file, thumb });
    } else {
      const ext = file.name.toLowerCase().endsWith(".exr") ? "exr" : "hdr";
      const pre = await renderHdriPreviews(buffer, ext);
      await replaceAssetFiles(id, { file: pre.backdrop, thumb: pre.thumb, thumbWide: pre.thumbWide });
    }
    setMenuFor(null);
  };

  const filters = group.kind === "product" ? PRODUCT_FILTERS : ENV_FILTERS;

  return (
    <div
      className="sos-lib"
      role="group"
      data-testid={`asset-grid-${group.kind}`}
      aria-label={`${group.name} — ${items.length} asset${items.length === 1 ? "" : "s"}`}
      aria-hidden={collapsed ? "true" : undefined}
    >
      {!collapsed ? (
        <div className="sos-lib-tools">
          <input
            className="sos-search"
            type="search"
            placeholder={`Search ${group.kind === "product" ? "products" : "environments"}…`}
            aria-label={`Search ${group.name}`}
            data-testid={`lib-search-${group.kind}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="sos-lib-chips" role="group" aria-label="Filters">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                className="sos-chip"
                data-on={filter === f.id || undefined}
                data-testid={`lib-filter-${group.kind}-${f.id.replace(/\W+/g, "-")}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="sos-lib-chips" role="group" aria-label="Sort">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                className="sos-chip"
                data-on={sort === s.id || undefined}
                data-testid={`lib-sort-${group.kind}-${s.id}`}
                onClick={() => setSort(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {items.map((item) => (
        <AssetCard
          key={item.id}
          item={item}
          active={!item.placeholder && item.id === activeId}
          onSelect={(id) => {
            if (item.source === "imported") {
              // imported entries can appear a render behind the engine
              // panel: nudge additively, then reuse the bridge unchanged
              nudgeEngineRender();
              setTimeout(() => onSelect(id), 350);
              return;
            }
            onSelect(id);
          }}
          favorite={favs.has(item.id)}
          onToggleFav={toggleFav}
          actions={item.source === "imported" ? (id) => setMenuFor(menuFor === id ? null : id) : null}
          menu={
            menuFor === item.id ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setRenameFor(item.id);
                    setRenameValue(item.name);
                  }}
                >
                  Rename
                </button>
                <label>
                  Replace file
                  <input
                    type="file"
                    accept={group.kind === "product" ? ".glb,.gltf" : ".hdr,.exr"}
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) doReplace(item.id, f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button type="button" onClick={() => duplicateAsset(item.id)}>
                  Duplicate metadata
                </button>
                <button type="button" onClick={() => setReveal(item)}>
                  Reveal thumbnail
                </button>
                <button
                  type="button"
                  data-testid={`asset-delete-${item.id}`}
                  onClick={() => doDelete(item.id)}
                >
                  Delete
                </button>
              </>
            ) : renameFor === item.id ? (
              <span className="sos-rename">
                <input
                  value={renameValue}
                  autoFocus
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") doRename(item.id);
                  }}
                />
                <button type="button" onClick={() => doRename(item.id)}>Save</button>
              </span>
            ) : null
          }
        />
      ))}
      {reveal ? (
        <div
          className="sos-thumbview"
          role="dialog"
          aria-label={`Thumbnail of ${reveal.name}`}
          onClick={() => setReveal(null)}
        >
          <img src={reveal.thumb || reveal.thumbWide} alt={reveal.name} />
          <span className="sos-row-sub">{reveal.name} — generated preview</span>
        </div>
      ) : null}
    </div>
  );
}
