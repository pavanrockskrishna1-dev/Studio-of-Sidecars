import { useEffect, useState } from "react";
import "./ui-shell.css";
import InspectorRail, { LightingPanel } from "./InspectorRail";
import StudioCapsule from "./StudioCapsule";
import StudioDock from "./StudioDock";
import Sheet from "./Sheet";
import useIdleFade from "./useIdleFade";
import useSessionUi from "./useSessionUi";
import { CreatorBody, MaterialsBody, CameraBody, SaveBody, CaptureBody } from "./SheetContents";
import useFloatingPanelRect from "./useFloatingPanelRect";
import useEngineSelection from "./useEngineSelection";
import { setLightSlot } from "./lightSlot";
import { PRODUCTS } from "../products/registry";

// Slice U1 (Stage B1) — Creator, Materials, Camera, Light, Save and Capture
// each open their own floating Sheet. Garage, Poster and Reel still fall back
// to the pre-existing InspectorRail + the engine's StudioControls panel until
// Stage B2 gives them sheets too. On first launch (active === null) and while
// any sheet is open, none of the old chrome shows at all.
const INSPECTOR_RAIL_TOOLS = new Set(["garage", "poster", "reel"]);
// tall tools dock to the right edge; the rest float above the dock
const SHEETS = {
  creator: { title: "Creator", icon: "cube", side: "right" },
  materials: { title: "Materials", icon: "palette", side: "right" },
  camera: { title: "Camera", icon: "camera" },
  light: { title: "Light", icon: "sun" },
  save: { title: "Save", icon: "save" },
  capture: { title: "Capture", icon: "aperture" },
};

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

  // Slice U1, Stage B1 — the editable project name and Save / Restore / Reset
  // live in the Save sheet; the same studioSession.js calls the header made.
  const session = useSessionUi(assetName);

  // Slice U1 — no panel is open on first launch; which tool (if any) is open
  // is remembered only for this session (plain component state). Clicking the
  // open tool's icon again, or pressing Esc, closes it.
  const [active, setActive] = useState(null);
  const handleDockSelect = (id) => setActive((prev) => (prev === id ? null : id));
  const idle = useIdleFade();
  const sheet = SHEETS[active];

  useEffect(() => {
    if (!sheet) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !e.defaultPrevented) setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  // Slice U1 — the engine's own StudioControls panel (data-studio-controls,
  // App.jsx) is hidden by CSS (ui-shell.css) unless this body attribute says
  // one of the three still-old tools is open. StudioControls.jsx itself
  // never learns it was hidden; the controls the sheets host are portaled out
  // of it (ui/slots.js, ui/lightSlot.js), never copied.
  useEffect(() => {
    if (INSPECTOR_RAIL_TOOLS.has(active)) {
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
  const [railMin, setRailMin] = useState();

  // Room left in each chrome column after the engine panel it dodges. A panel
  // that grew taller than the window leaves less than a card here, and the old
  // height clamp answered that by sliding *up* over the engine; the honest
  // answer is to step down to the icon strip and give the engine the column.
  const railRoom = shoot ? shoot.vh - shoot.bottom - COLUMN_GAP : Infinity;
  const sideRoom = selection ? selection.vh - selection.bottom - DODGE_GAP : Infinity;
  const sideCollapsed = narrow || sideRoom < SIDE_MIN_ROOM;
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
      <StudioDock active={active} onSelect={handleDockSelect} idle={idle} />
      {sheet ? (
        <Sheet
          key={active}
          id={active}
          title={sheet.title}
          icon={sheet.icon}
          side={sheet.side}
          onClose={() => setActive(null)}
        >
          {active === "light" ? (
            <>
              <LightingPanel />
              <div className="sos2-sheet-divider" aria-hidden="true" />
              <span className="sos2-sheet-subhead">Fine-tune</span>
              {/* the engine's real Key/Fill/Rim/Ambient/Shadow/Exposure sliders,
                  portaled here from StudioControls — moved, not duplicated */}
              <div ref={lightSlotCallback} data-testid="ui2-light-slot" />
            </>
          ) : null}
          {active === "creator" ? <CreatorBody selection={assets} onSelect={assets.select} /> : null}
          {active === "materials" ? <MaterialsBody productId={assets.productId} /> : null}
          {active === "camera" ? <CameraBody /> : null}
          {active === "save" ? <SaveBody session={session} /> : null}
          {active === "capture" ? <CaptureBody /> : null}
        </Sheet>
      ) : null}

      {/* Stage B1 fallback: Garage, Poster and Reel still open the
          pre-existing inspector rail until B2. */}
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
