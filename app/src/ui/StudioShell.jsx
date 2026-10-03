import { useEffect, useState } from "react";
import "./ui-shell.css";
import StudioCapsule from "./StudioCapsule";
import StudioDock from "./StudioDock";
import Sheet from "./Sheet";
import useIdleFade from "./useIdleFade";
import useSessionUi from "./useSessionUi";
import {
  CreatorBody,
  MaterialsBody,
  CameraBody,
  LightBody,
  SaveBody,
  CaptureBody,
  GarageBody,
  PosterBody,
  ReelBody,
} from "./SheetContents";
import useEngineSelection from "./useEngineSelection";
import { PosterOverlayHost } from "./PosterPanel";
import { PRODUCTS } from "../products/registry";
import * as animationStore from "../animation/animationStore";
import * as garageStore from "../garage/garageStore";
import * as measure from "../garage/measure";

/* ==========================================================================
   StudioShell — the creator UI (Agent #2 · UI ONLY)
   --------------------------------------------------------------------------
   Slice U1, Stage B2: the shell is the capsule, the dock and the dock's nine
   sheets. Every dock icon opens its own floating Sheet with the real controls
   moved in (ui/SheetContents.jsx, ui/slots.js, ui/lightSlot.js); the old
   left Asset Library, right StudioControls panel and InspectorRail never
   render from any icon any more (their files are still in the repo for a later
   cleanup slice; StudioControls itself stays mounted but hidden, because the
   engine's handlers live in it and the sheets portal its controls out).

   Integration is deliberately additive. It mounts as a SIBLING of <App/> in
   src/main.jsx rather than by editing App.jsx (Studio Engine territory), and
   every region is `position: fixed` inside one pointer-transparent wrapper, so
   the WebGL stage keeps the full viewport: the canvas never shrinks, and orbit
   / zoom / pan / picking behave exactly as before outside the sheets.

   Z-order: shell 8 < StudioControls 10 < SelectionInspector 20 < Capture 40.
   ========================================================================== */

// Where each sheet docks when nothing else is open. Tall tools stretch down an
// edge of the screen; the rest float above the dock.
const SHEETS = {
  creator: { title: "Creator", icon: "cube", side: "right", tall: true },
  materials: { title: "Materials", icon: "palette", side: "right", tall: true },
  camera: { title: "Camera", icon: "camera", side: "center" },
  light: { title: "Light", icon: "sun", side: "center" },
  garage: { title: "Garage", icon: "frame", side: "right", tall: true },
  poster: { title: "Poster", icon: "swatch", side: "right", tall: true },
  reel: { title: "Reel", icon: "film", side: "center" },
  save: { title: "Save", icon: "save", side: "center" },
  capture: { title: "Capture", icon: "aperture", side: "center" },
};

// Placement of up to two open sheets (the pinned one is older). If the newer
// one would land where the older one is, it moves to the other side: an edge
// sheet goes to the opposite edge, a centre sheet to the right edge. At
// 1366x768 the three columns (left 16-396, centre 513-853, right 970-1350)
// never overlap each other or the dock (440-927, bottom row).
function placeSheets(pinnedId, normalId) {
  const out = {};
  if (pinnedId) out[pinnedId] = SHEETS[pinnedId].side;
  if (normalId) {
    let side = SHEETS[normalId].side;
    if (pinnedId && out[pinnedId] === side) {
      side = side === "right" ? "left" : side === "left" ? "right" : "right";
    }
    out[normalId] = side;
  }
  return out;
}

export default function StudioShell() {
  // The engine owns asset state. The shell reads and drives it through the
  // engine's own picker (useEngineSelection), so neither the capsule nor the
  // library keeps a private copy.
  const assets = useEngineSelection();

  // Phase 15A — Studio Session. The project name follows the loaded asset until
  // the user edits it (null = follow); it is saved and restored with the session.
  const assetName = PRODUCTS.find((p) => p.id === assets.productId)?.name ?? "";
  const session = useSessionUi(assetName);

  // Which sheets are open: at most one pinned and one normal. Clicking an icon
  // whose sheet is open closes it; otherwise it opens as the normal sheet (and
  // replaces the previous normal one - a pinned sheet is left alone). Plain
  // component state, remembered only for this session.
  const [pinnedId, setPinnedId] = useState(null);
  const [normalId, setNormalId] = useState(null);
  const idle = useIdleFade();
  const openIds = [pinnedId, normalId].filter(Boolean);

  const handleDockSelect = (id) => {
    if (id === pinnedId) setPinnedId(null);
    else if (id === normalId) setNormalId(null);
    else setNormalId(id);
  };
  const handlePin = (id) => {
    if (id === pinnedId) {
      // unpin: it becomes the normal sheet (a different normal one closes)
      setPinnedId(null);
      setNormalId(id);
    } else {
      // pin: it replaces any other pinned sheet
      setPinnedId(id);
      if (normalId === id) setNormalId(null);
    }
  };

  // Esc closes only the unpinned sheet. It stays out of the way while Esc has
  // another job on the stage: stopping a turntable preview / export, and the
  // Garage clearing its part selection or its measure pair (the canvas
  // handlers act on the same keypress; a second Esc then closes the sheet).
  useEffect(() => {
    if (!normalId) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (animationStore.getSnapshot().mode !== "idle") return;
      if (normalId === "garage") {
        const m = measure.getSnapshot();
        if (garageStore.getSnapshot().selectionCount > 0 || m.pointA || m.pointB) return;
      }
      setNormalId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [normalId]);

  const sides = placeSheets(pinnedId, normalId);
  const body = (id) => {
    switch (id) {
      case "creator":
        return <CreatorBody selection={assets} onSelect={assets.select} />;
      case "materials":
        return <MaterialsBody productId={assets.productId} />;
      case "camera":
        return <CameraBody />;
      case "light":
        return <LightBody />;
      case "garage":
        return <GarageBody />;
      case "poster":
        return <PosterBody />;
      case "reel":
        return <ReelBody />;
      case "save":
        return <SaveBody session={session} />;
      case "capture":
        return <CaptureBody />;
      default:
        return null;
    }
  };

  return (
    <div className="sos-shell" data-sos-shell="">
      {/* Slice U1 - the opening state: capsule + dock, tab order capsule ->
          dock -> open sheets. The old TopHeader, VersionTabs, CreatorSidebar
          and InspectorRail are not rendered (their files are untouched, just
          unreferenced here). */}
      {/* the poster preview overlay: always mounted, portaled to <body> at
          z-index 1 (below this shell, so the capsule, dock and sheets stack
          above it), pointer-events none; shown while Poster is On */}
      <PosterOverlayHost />
      <StudioCapsule productName={assetName} idle={idle} />
      <StudioDock openIds={openIds} onSelect={handleDockSelect} idle={idle} />
      {openIds.map((id) => (
        <Sheet
          key={id}
          id={id}
          title={SHEETS[id].title}
          icon={SHEETS[id].icon}
          side={sides[id]}
          tall={SHEETS[id].tall}
          pinned={id === pinnedId}
          onPin={() => handlePin(id)}
          onClose={() => (id === pinnedId ? setPinnedId(null) : setNormalId(null))}
        >
          {body(id)}
        </Sheet>
      ))}
    </div>
  );
}
