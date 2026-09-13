/* Mission 11A (Agent #2) — the Materials Manager, mounted inside the existing
   Creator Sidebar section (no second sidebar, no second editor: this is the
   shell's accordion, its group chrome and its disclosure behaviour).

   How it reaches the 3D model without touching the engine: the stage loads a
   product with drei's `useGLTF(product.modelPath)`, and that loader keeps ONE
   cached result per path. Calling the same hook from the sidebar with the same
   path returns the very same scene object the renderer is drawing — so the
   editor writes to live materials while App.jsx, StudioCanvas.jsx and
   StudioControls.jsx stay byte-for-byte untouched. If the asset is not in the
   cache the hook call returns synchronously, so this subtree never suspends and
   adds no delay of its own to the shell's own repaints. While a model is still
   being read the section says so on one line instead of showing stale rows: the
   editor never claims a state the engine does not have.

   Which model it edits is not the manager's decision either: it follows
   `useEngineSelection`, i.e. the id the engine's own Model chips report. */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useGLTF } from "@react-three/drei";
import Icon from "./icons";
import { getProduct } from "../products/registry";
import { getRuntimeEntry } from "../assets/runtimeRegistry";
import { MATERIAL_CATEGORIES, MATERIAL_PRESETS } from "../materials/presets";
import * as store from "../materials/store";
import "../materials/textures"; // shared texture cache (imported for its side effect: one cache, no duplication)

/* ── staged model resolution (read-only over both registries) ─────────────── */

function resolveStaged(productId) {
  if (!productId) return null;
  const builtIn = getProduct(productId);
  if (builtIn && builtIn.id === productId) return { id: productId, name: builtIn.name, modelPath: builtIn.modelPath };
  const runtime = getRuntimeEntry && getRuntimeEntry(productId);
  if (runtime && runtime.modelPath) return { id: productId, name: runtime.name, modelPath: runtime.modelPath };
  return null;
}

/* ── the bridge ──────────────────────────────────────────────────────────── */

/**
 * The staged model's scene, reached through the engine's OWN loader cache.
 * `useGLTF.preload(path)` returns the promise already in that cache (it never
 * starts a second download while the engine is loading the same file), so by the
 * time the bridge renders, `useGLTF(path)` resolves synchronously. Keeping the
 * suspense out of the shell is deliberate: a suspended boundary in this subtree
 * parks every sibling update — including the asset library's own active state —
 * on React's retry backoff, which measured up to ~8s here.
 */
function MaterialBridge({ staged }) {
  const { scene } = useGLTF(staged.modelPath);
  const attached = useRef(null);
  useEffect(() => {
    if (!scene) return undefined;
    attached.current = scene;
    store.attach(scene, { modelKey: staged.id, productName: staged.name });
    return () => {
      if (attached.current === scene) store.detach();
    };
  }, [scene, staged.id, staged.name]);
  return null;
}

/* ── small UI atoms ──────────────────────────────────────────────────────── */

function Slider({ label, testId, value, min = 0, max = 1, step = 0.01, onChange, hint }) {
  const v = typeof value === "number" ? value : min;
  return (
    <label className="sos-mat-field" title={hint}>
      <span className="sos-mat-field-head">
        <span className="sos-mat-field-name">{label}</span>
        <span className="sos-mat-field-num">{v.toFixed(2)}</span>
      </span>
      <input
        type="range"
        data-testid={testId}
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

function Star({ on, onClick, testId, label }) {
  return (
    <button
      type="button"
      className="sos-mat-star"
      data-on={on || undefined}
      data-testid={testId}
      aria-label={on ? `Unfavorite ${label}` : `Favorite ${label}`}
      title={on ? "Remove from favorites" : "Add to favorites"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Icon name="star" size={11} stroke={1.7} filled={on} />
    </button>
  );
}

/* ── preset library ──────────────────────────────────────────────────────── */

function PresetLibrary({ st, query, setQuery, cat, setCat }) {
  const pool = useMemo(() => {
    const favs = new Set(st.favorites);
    const all = [...MATERIAL_PRESETS, ...st.custom];
    const byCat =
      cat === "all"
        ? all
        : cat === "favorites"
        ? all.filter((p) => favs.has(p.id))
        : cat === "custom"
        ? st.custom
        : all.filter((p) => p.category === cat);
    const q = query.trim().toLowerCase();
    return q ? byCat.filter((p) => p.name.toLowerCase().includes(q)) : byCat;
  }, [st.custom, st.favorites, cat, query]);

  return (
    <div className="sos-mat-lib">
      <div className="sos-mat-tools">
        <span className="sos-mat-search">
          <Icon name="search" size={12} />
          <input
            type="search"
            data-testid="mat-search"
            value={query}
            placeholder="Search presets"
            aria-label="Search material presets"
            onChange={(e) => setQuery(e.target.value)}
          />
        </span>
      </div>
      <div className="sos-mat-cats" role="group" aria-label="Material categories">
        {MATERIAL_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className="sos-mat-cat"
            data-on={cat === c.id || undefined}
            data-testid={`mat-cat-${c.id}`}
            aria-pressed={cat === c.id}
            onClick={() => setCat(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      {pool.length ? (
        <ul className="sos-mat-grid">
          {pool.map((p) => {
            const active = store.matchesPreset(p.id);
            return (
              /* A button may not contain a button, so the star and the custom
                 actions sit beside the card as their own row — the same shape
                 AssetLibrary gives its favourite/menu tools. */
              <li key={p.id} className="sos-mat-cell">
                <button
                  type="button"
                  className="sos-mat-preset"
                  data-active={active || undefined}
                  data-testid={`mat-preset-${p.id}`}
                  title={`${p.name} — ${p.category}${active ? " · applied to this material" : ""}`}
                  aria-label={`Apply ${p.name}`}
                  onClick={() => store.applyPreset(p.id)}
                >
                  <span className="sos-mat-thumb" style={{ backgroundImage: p.swatch }} aria-hidden="true" />
                  <span className="sos-mat-preset-name">{p.name}</span>
                </button>
                <span className="sos-mat-cell-tools">
                  <Star on={st.favorites.includes(p.id)} testId={`mat-fav-${p.id}`} label={p.name} onClick={() => store.toggleFavorite(p.id)} />
                  {p.custom ? (
                    <span className="sos-mat-custom-tools">
                      <RenameButton preset={p} />
                      <button type="button" data-testid={`mat-dup-${p.id}`} title="Duplicate preset" aria-label={`Duplicate ${p.name}`} onClick={() => store.duplicateCustom(p.id)}>
                        <Icon name="copy" size={11} />
                      </button>
                      <button type="button" data-testid={`mat-del-${p.id}`} title="Delete preset" aria-label={`Delete ${p.name}`} onClick={() => store.deleteCustom(p.id)}>
                        <Icon name="trash" size={11} />
                      </button>
                    </span>
                  ) : (
                    <span className="sos-mat-cell-cat">{p.category}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="sos-mat-empty-inline">
          {cat === "favorites"
            ? "No favorites yet — tap the star on a preset to keep it here."
            : cat === "custom"
            ? "No custom presets yet — tune a material, then Save current as preset."
            : "Nothing matches that search."}
        </p>
      )}
    </div>
  );
}

function RenameButton({ preset }) {
  // null = not editing; otherwise the draft label. Keeping the draft as the
  // single piece of edit state means it always starts from the live name, so no
  // effect has to re-sync it (and no render-phase state write either).
  const [draft, setDraft] = useState(null);
  if (draft === null) {
    return (
      <button
        type="button"
        data-testid={`mat-rename-${preset.id}`}
        title="Rename preset"
        aria-label={`Rename ${preset.name}`}
        onClick={() => setDraft(preset.name)}
      >
        <Icon name="edit" size={11} />
      </button>
    );
  }
  const commit = () => {
    store.renameCustom(preset.id, draft);
    setDraft(null);
  };
  return (
    <input
      className="sos-mat-rename"
      data-testid={`mat-rename-input-${preset.id}`}
      value={draft}
      aria-label={`Rename ${preset.name}`}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setDraft(null);
      }}
    />
  );
}

/* ── inspector ───────────────────────────────────────────────────────────── */

function Inspector({ entry, values }) {
  const isPhysical = Boolean(entry.currentMaterial && entry.currentMaterial.isMeshPhysicalMaterial);
  const set = (k) => (v) => store.setParams({ [k]: v });
  return (
    <div className="sos-mat-inspect" data-testid="mat-inspector">
      <div className="sos-mat-inspect-head">
        <span className="sos-mat-swatch" style={{ background: values.color || "#888" }} aria-hidden="true" />
        <span className="sos-mat-inspect-name" title={entry.meshNames.join(", ")}>
          {entry.name}
          <em>
            {entry.meshCount} mesh{entry.meshCount === 1 ? "" : "es"}
            {values.texture ? ` · ${values.texture}` : ""}
          </em>
        </span>
        <button
          type="button"
          className="sos-mat-mini"
          data-testid="mat-undo"
          disabled={!store.canUndo()}
          title="Undo the last change to this material"
          onClick={() => store.undo()}
        >
          <Icon name="undo" size={11} /> Undo
        </button>
      </div>

      <label className="sos-mat-field sos-mat-field-color">
        <span className="sos-mat-field-head">
          <span className="sos-mat-field-name">Colour</span>
          <span className="sos-mat-field-num">{values.color}</span>
        </span>
        <span className="sos-mat-color-row">
          <input type="color" data-testid="mat-color" value={values.color || "#888888"} onChange={(e) => store.setParams({ color: e.target.value })} />
          <input
            type="text"
            className="sos-mat-hex"
            data-testid="mat-color-hex"
            value={values.color || ""}
            aria-label="Colour hex value"
            spellCheck="false"
            onChange={(e) => {
              const v = e.target.value.trim();
              if (/^#[0-9a-f]{6}$/i.test(v)) store.setParams({ color: v });
            }}
          />
        </span>
      </label>

      <Slider label="Metalness" testId="mat-metalness" value={values.metalness} onChange={set("metalness")} hint="1 = metal, 0 = dielectric" />
      <Slider label="Roughness" testId="mat-roughness" value={values.roughness} onChange={set("roughness")} hint="0 = mirror sharp, 1 = fully matte" />
      <Slider label="Reflection" testId="mat-env" min={0} max={2} value={values.envMapIntensity} onChange={set("envMapIntensity")} hint="How much of the studio environment this material reflects" />
      <Slider label="Opacity" testId="mat-opacity" value={values.opacity} onChange={set("opacity")} hint="Below 1 turns blending on automatically" />
      {isPhysical ? (
        <>
          <Slider label="Clearcoat" testId="mat-clearcoat" value={values.clearcoat} onChange={set("clearcoat")} hint="The lacquer layer over the pigment" />
          <Slider label="Transmission" testId="mat-transmission" value={values.transmission} onChange={set("transmission")} hint="Glass: light passing through the surface" />
        </>
      ) : null}

      <div className="sos-mat-actions">
        <SavePreset />
        <button type="button" className="sos-mat-mini" data-testid="mat-reset-selected" onClick={() => store.resetMaterial(entry.id)}>
          <Icon name="undo" size={11} /> Reset this material
        </button>
      </div>
    </div>
  );
}

function SavePreset() {
  const [naming, setNaming] = useState(false);
  const [text, setText] = useState("");
  const commit = () => {
    const saved = store.saveCustom(text);
    if (saved) {
      setText("");
      setNaming(false);
    }
  };
  if (!naming) {
    return (
      <button type="button" className="sos-mat-mini sos-mat-save" data-testid="mat-save" title="Save this material's values as a preset" onClick={() => setNaming(true)}>
        <Icon name="plus" size={11} /> Save as preset
      </button>
    );
  }
  return (
    <span className="sos-mat-save-row">
      <input
        className="sos-mat-name"
        data-testid="mat-save-input"
        value={text}
        placeholder="THE KOP Walnut Chrome"
        aria-label="New preset name"
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setNaming(false);
        }}
      />
      <button type="button" className="sos-mat-mini" data-testid="mat-save-commit" onClick={commit}>
        Save
      </button>
      <button type="button" className="sos-mat-mini" onClick={() => setNaming(false)} aria-label="Cancel">
        ✕
      </button>
    </span>
  );
}

/* ── the section ─────────────────────────────────────────────────────────── */

export default function MaterialsManager({ collapsed = false, productId, onExpand }) {
  const st = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const staged = useMemo(() => resolveStaged(productId), [productId]);

  useEffect(() => {
    store.hydrate();
  }, []);

  // Warm the loader cache the engine already fills, then let the bridge render.
  // The result lives in the store, next to everything else this section reads.
  useEffect(() => {
    if (!staged) {
      store.setStagedReady(null);
      return undefined;
    }
    let alive = true;
    Promise.resolve(useGLTF.preload(staged.modelPath))
      .catch(() => null) // a failed read stays a status line, never a crash in the shell
      .then(() => {
        if (alive) store.setStagedReady(staged.modelPath);
      });
    return () => {
      alive = false;
    };
  }, [staged]);

  const ready = st.status === "ready" && st.entries.length > 0;

  if (collapsed) {
    return (
      <button type="button" className="sos-mat-collapsed" data-testid="mat-collapsed" title="Materials — expand the creator panel" onClick={onExpand}>
        <Icon name="palette" size={15} />
        {st.entries.length ? <span className="sos-mat-collapsed-count">{st.entries.length}</span> : null}
      </button>
    );
  }

  return (
    <div className="sos-mat" data-testid="materials-manager" data-ready={ready || undefined}>
      {staged && st.stagedReady === staged.modelPath ? <MaterialBridge staged={staged} /> : null}
      {staged && st.stagedReady !== staged.modelPath ? (
        <p className="sos-mat-note" data-testid="mat-reading">
          Reading {staged.name}’s materials…
        </p>
      ) : null}

      <p className="sos-mat-sub">
        {staged ? (
          <>
            <strong>{staged.name}</strong> · {st.entries.length} material{st.entries.length === 1 ? "" : "s"}
            {store.editingCount() ? ` · ${store.editingCount()} edited` : " · as imported"}
          </>
        ) : (
          "No model in the stage yet — pick a product and its materials appear here."
        )}
      </p>

      {ready ? (
        <>
          <ul className="sos-mat-list" data-testid="mat-list" aria-label="Editable materials on this model">
            {st.entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="sos-mat-row"
                  data-active={st.focusedId === entry.id || undefined}
                  data-testid={`mat-row-${entry.persistKey || entry.id}`}
                  aria-pressed={st.focusedId === entry.id}
                  title={entry.meshNames.length ? `Meshes: ${entry.meshNames.join(", ")}` : entry.name}
                  onClick={() => store.focus(entry.id)}
                >
                  <span className="sos-mat-dot" style={{ background: (st.values[entry.id] || {}).color || "#777" }} aria-hidden="true" />
                  <span className="sos-mat-row-name">{entry.name}</span>
                  <span className="sos-mat-row-meta">
                    {entry.meshCount}
                    <Icon name="cube" size={9} />
                  </span>
                  {st.edited[entry.id] ? <span className="sos-mat-edited" title="Edited from its imported state" aria-label="edited" /> : null}
                </button>
              </li>
            ))}
          </ul>

          {st.focusedId && st.values[st.focusedId] ? <Inspector entry={st.entries.find((e) => e.id === st.focusedId)} values={st.values[st.focusedId]} /> : null}

          <PresetLibrary st={st} query={query} setQuery={setQuery} cat={cat} setCat={setCat} />

          <div className="sos-mat-foot">
            <button type="button" className="sos-mat-mini" data-testid="mat-reset-model" onClick={() => store.resetModel()} title="Restore every material to the imported asset's values">
              <Icon name="undo" size={11} /> Reset entire model
            </button>
            {st.storage === "off" ? <span className="sos-mat-warn">Local storage unavailable — presets last for this session only.</span> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
