import { useEffect, useState } from "react";
import "./ui-shell.css";
import CreatorSidebar from "./CreatorSidebar";
import InspectorRail, { LightingPanel } from "./InspectorRail";
import StudioCapsule from "./StudioCapsule";
import StudioDock from "./StudioDock";
import Sheet from "./Sheet";
import useIdleFade from "./useIdleFade";
import useFloatingPanelRect from "./useFloatingPanelRect";
import useEngineSelection from "./useEngineSelection";
import { exportPng } from "./engineCapture";
import { setLightSlot } from "./lightSlot";
import { PRODUCTS } from "../products/registry";
import { saveSession } from "../session/studioSession";

// Slice U1 (Stage A) — which dock tools still fall back to the pre-existing
// panel while only Light has a real dock sheet. Creator/Materials share the
// old Asset Library sidebar (its own internal disclosure decides what's
// open); Camera/Garage/Poster/Reel share the old Inspector Rail accordion.
// Stage B moves each of these into its own dock sheet.
const CREATOR_SIDE_TOOLS = new Set(["creator", "materials"]);
const INSPECTOR_RAIL_TOOLS = new Set(["camera", "garage", "poster", "reel"]);
// The old-way tools above still want the engine's own StudioControls panel
// visible beside them (camera cards, capture, format...). Light does not —
// its one real Sheet has the moved Lighting sliders instead. On first launch
// (active === null) nothing from the old chrome shows at all.
const SHOW_STUDIO_CONTROLS_FOR = new Set([
  "creator",
  "materials",
  "camera",
  "garage",
  "poster",
  "reel",
]);

/* ==========================================================================
   StudioShell — the creator UI (Agent #2 · UI ONLY)
   --------------------------------------------------------------------------
   Composes the whole chrome layer: top header, floating V1–V6 tabs, the left
   creator sidebar and the right inspector rail.

   Integration is deliberately additive. It mounts as a SIBLING of <App/> in
   src/main.jsx rather than by editing App.jsx (Studio Engine territory), and
   every region is `position: fixed` inside one pointer-transparent wrapper, so
   the WebGL stage keeps the full viewport: the canvas never shrinks, and orbit
   / zoom / pan / picking behave exactly as before outside the panels.

   Z-order: shell 8 < StudioControls 10 < SelectionInspector 20 < Capture 40.
   The shell can therefore never cover an engine control; where the two would
   share a corner it parks underneath instead — see useFloatingPanelRect.
   ========================================================================== */

// clearance the chrome keeps around a measured engine panel
const DODGE_GAP = 10;
const COLUMN_GAP = 10;

// What the chrome needs left in its own column to be worth showing expanded:
// its head, one usable card and the pinned footer. Below that the panel steps
// down to its icon strip on its own — the engine's column is never covered.
const RAIL_MIN_ROOM = 132;
const SIDE_MIN_ROOM = 168;

// The design package's own compact tier: below this width the rails shrink to
// icon strips so the stage keeps priority (Phase-1 keeps 96px icon rails on a
// portrait tablet). Users can override either rail at any size.
const NARROW_QUERY = "(max-width: 1140px)";

function useNarrow() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia(NARROW_QUERY).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

export default function StudioShell() {
  // The engine owns asset state. The shell reads and drives it through the
  // engine's own picker (useEngineSelection), so neither the capsule nor the
  // library keeps a private copy.
  const assets = useEngineSelection();

  // Phase 15A — Studio Session. The project name follows the loaded asset until
  // the user edits it (null = follow); it is saved and restored with the session.
  // Everything else in a session is read from / written to the engine itself.
  const assetName = PRODUCTS.find((p) => p.id === assets.productId)?.name ?? "";

  // Slice U1, Stage A — Save is re-housed onto the dock (still the same
  // studioSession.saveSession call TopHeader used to make, with no project
  // name override — the editable project name field has no home in this
  // stage). Restore, Reset, Learn Studio, Help and Settings have no dock icon
  // yet in the locked Stage A opening state (only Creator, Materials,
  // Camera, Light, Garage, Poster, Reel, Save and Capture) — they are
  // temporarily unreachable from the UI until Stage B moves every remaining
  // tool into its own dock sheet. Nothing in session/studioSession.js changed.
  const handleSave = () => {
    saveSession(null);
  };

  // Slice U1, Stage A — no panel is open on first launch; which tool (if
  // any) is open is remembered only for this session (plain component state,
  // not persisted). Only "light" gets the new, polished Sheet; every other
  // id still opens its existing panel "the old way" (see the two Sets above)
  // until Stage B gives it a dock sheet of its own.
  const [active, setActive] = useState(null);
  const handleDockSelect = (id) => setActive((prev) => (prev === id ? null : id));
  const closeLight = () => setActive((prev) => (prev === "light" ? null : prev));
  const idle = useIdleFade();

  // Slice U1 — the engine's own StudioControls panel (data-studio-controls,
  // App.jsx) is hidden by CSS (ui-shell.css) unless this body attribute says
  // an old-way tool that still wants it beside it is open; on launch and
  // while the Light sheet is open it stays hidden. StudioControls.jsx itself
  // is untouched by this — it never learns it was hidden.
  useEffect(() => {
    if (SHOW_STUDIO_CONTROLS_FOR.has(active)) {
      document.body.dataset.sosOldPanel = "1";
    } else {
      delete document.body.dataset.sosOldPanel;
    }
    return () => {
      delete document.body.dataset.sosOldPanel;
    };
  }, [active]);

  // Slice U1 — the Light sheet's slot for the engine's real Lighting sliders
  // (see ui/lightSlot.js): registered while the sheet is mounted, cleared on
  // close, so StudioControls' LightingRow portals here instead of a copy.
  const lightSlotCallback = (el) => setLightSlot(el || null);

  const shoot = useFloatingPanelRect("shoot-controls");
  const selection = useFloatingPanelRect("selection-inspector");
  const narrow = useNarrow();
  // undefined = follow the layout, boolean = user override
  const [sideMin, setSideMin] = useState();
  const [railMin, setRailMin] = useState();

  // Room left in each chrome column after the engine panel it dodges. A panel
  // that grew taller than the window leaves less than a card here, and the old
  // height clamp answered that by sliding *up* over the engine; the honest
  // answer is to step down to the icon strip and give the engine the column.
  const railRoom = shoot ? shoot.vh - shoot.bottom - COLUMN_GAP : Infinity;
  const sideRoom = selection ? selection.vh - selection.bottom - DODGE_GAP : Infinity;
  const sideCollapsed = sideMin ?? (narrow || sideRoom < SIDE_MIN_ROOM);
  const railShift = railRoom < RAIL_MIN_ROOM;
  const railCollapsed = railMin ?? (narrow || railShift);

  // The engine panel's column is reserved at its REAL width, so a header
  // action can never slide underneath it on a narrower window.
  const style = shoot
    ? { "--sos-engine-col": `${shoot.width + COLUMN_GAP * 2}px` }
    : undefined;

  return (
    <div
      className="sos-shell"
      data-sos-shell=""
      data-side-min={sideCollapsed || undefined}
      data-rail-min={railCollapsed || undefined}
      // the engine owns this column outright when no usable strip fits under
      // it; the rail then stands just left of that column, still reachable
      data-rail-shift={railShift || undefined}
      style={style}
    >
      {/* Slice U1 — the opening state: capsule + dock, tab order capsule ->
          dock -> open sheet. The old TopHeader and VersionTabs are not
          rendered (their files are untouched, just unreferenced here). */}
      <StudioCapsule productName={assetName} idle={idle} />
      <StudioDock
        active={active}
        onSelect={handleDockSelect}
        onSave={handleSave}
        onCapture={exportPng}
        idle={idle}
      />
      {active === "light" ? (
        <Sheet id="light" title="Light" icon="sun" onClose={closeLight}>
          <LightingPanel />
          <div className="sos2-sheet-divider" aria-hidden="true" />
          <span className="sos2-sheet-subhead">Fine-tune</span>
          {/* the engine's real Key/Fill/Rim/Ambient/Shadow/Exposure sliders,
              portaled here from StudioControls — moved, not duplicated */}
          <div ref={lightSlotCallback} data-testid="ui2-light-slot" />
        </Sheet>
      ) : null}

      {/* Stage A fallback: every other tool still opens the pre-existing
          panel "the old way" until Stage B gives it a dock sheet. */}
      {CREATOR_SIDE_TOOLS.has(active) ? (
        <CreatorSidebar
          dodgeBelow={selection ? selection.bottom + DODGE_GAP : 0}
          collapsed={sideCollapsed}
          onCollapse={() => setSideMin(!sideCollapsed)}
          selection={assets}
          onSelect={assets.select}
        />
      ) : null}
      {INSPECTOR_RAIL_TOOLS.has(active) ? (
        <InspectorRail
          dodgeBelow={shoot ? shoot.bottom + DODGE_GAP : 0}
          collapsed={railCollapsed}
          onCollapse={() => setRailMin(!railCollapsed)}
        />
      ) : null}
    </div>
  );
}
