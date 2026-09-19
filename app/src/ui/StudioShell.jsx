import { useEffect, useState } from "react";
import "./ui-shell.css";
import TopHeader from "./TopHeader";
import VersionTabs from "./VersionTabs";
import CreatorSidebar from "./CreatorSidebar";
import InspectorRail from "./InspectorRail";
import useFloatingPanelRect from "./useFloatingPanelRect";
import useEngineSelection from "./useEngineSelection";
import { getEnvironment, DEFAULT_ENVIRONMENT_ID } from "../environments/registry";
import { PRODUCTS } from "../products/registry";
import {
  readSavedSession,
  resetSession,
  restoreSession,
  saveSession,
} from "../session/studioSession";

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

// Phase 15A — how long a session button shows its "Saved / Restored / Reset" flash
const FLASH_MS = 1800;

export default function StudioShell() {
  // The engine owns asset state. The shell reads and drives it through the
  // engine's own picker (useEngineSelection), so neither the header nor the
  // library keeps a private copy: the environment title is the live one, and
  // falls back to the locked hero default only until the engine is mounted.
  const assets = useEngineSelection();
  const environment = getEnvironment(assets.environmentId ?? DEFAULT_ENVIRONMENT_ID);

  // Phase 15A — Studio Session. The project name follows the loaded asset until
  // the user edits it (null = follow); it is saved and restored with the session.
  // Everything else in a session is read from / written to the engine itself.
  const assetName = PRODUCTS.find((p) => p.id === assets.productId)?.name ?? "";
  const [nameOverride, setNameOverride] = useState(null);
  const [canRestore, setCanRestore] = useState(() => readSavedSession() !== null);
  const [flash, setFlash] = useState(null);
  useEffect(() => {
    if (!flash) return undefined;
    const t = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(t);
  }, [flash]);

  const handleSave = () => {
    const res = saveSession(nameOverride);
    if (res.ok) {
      setCanRestore(true);
      setFlash("saved");
    }
  };
  const handleRestore = () => {
    const snap = restoreSession();
    if (!snap) return;
    setNameOverride(snap.projectName ?? null);
    setFlash("restored");
  };
  const handleReset = () => {
    if (!window.confirm("Reset the entire studio session? Camera, lighting, environment, materials, transforms and viewer controls return to their defaults.")) return;
    if (resetSession()) {
      setNameOverride(null);
      setFlash("reset");
    }
  };

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
      <TopHeader
        environment={environment}
        projectName={nameOverride ?? assetName}
        onProjectNameChange={setNameOverride}
        onProjectNameBlur={() => {
          if (nameOverride !== null && !nameOverride.trim()) setNameOverride(null);
        }}
        session={{ canRestore, flash, onSave: handleSave, onRestore: handleRestore, onReset: handleReset }}
      />
      <VersionTabs />
      <CreatorSidebar
        dodgeBelow={selection ? selection.bottom + DODGE_GAP : 0}
        collapsed={sideCollapsed}
        onCollapse={() => setSideMin(!sideCollapsed)}
        selection={assets}
        onSelect={assets.select}
      />
      <InspectorRail
        dodgeBelow={shoot ? shoot.bottom + DODGE_GAP : 0}
        collapsed={railCollapsed}
        onCollapse={() => setRailMin(!railCollapsed)}
      />
    </div>
  );
}
