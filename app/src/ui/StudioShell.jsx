import { useEffect, useState, useSyncExternalStore } from "react";
import "./ui-shell.css";
import StudioCapsule from "./StudioCapsule";
import StudioDock from "./StudioDock";
import Sheet from "./Sheet";
import useIdleFade from "./useIdleFade";
import useSessionUi from "./useSessionUi";
import usePosterKitDefault from "./usePosterKitDefault";
import {
  CreatorBody,
  MaterialsBody,
  CameraBody,
  LightBody,
  SaveBody,
  CaptureBody,
  GarageBody,
  PosterBody,
  PosterMakerBody,
  ReelBody,
  OccasionBody,
} from "./SheetContents";
import OccasionParticles from "./OccasionParticles";
import OccasionBackground from "./OccasionBackground";
import PlaceBanner from "./PlaceBanner";
import useEngineSelection from "./useEngineSelection";
import { PosterOverlayHost } from "./PosterPanel";
import { BrandingOverlayHost } from "./BrandingOverlay";
import MotionLabOverlay from "./MotionLabOverlay";
import LowerThird from "./LowerThird";
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

// The nine sheets. Slice U2: no sheet opens in the middle of the screen (it
// would cover the product); every sheet docks to the right edge, from below the
// capsule to just above the dock row, and scrolls inside. `tall` sheets always
// stretch to the dock row; the others are as tall as their content.
const SHEETS = {
  creator: { title: "Creator", icon: "cube", tall: true },
  materials: { title: "Materials", icon: "palette", tall: true },
  camera: { title: "Camera", icon: "camera" },
  light: { title: "Light", icon: "sun" },
  garage: { title: "Garage", icon: "frame", tall: true },
  poster: { title: "Poster", icon: "swatch", tall: true },
  reel: { title: "Reel", icon: "film", tall: true },
  posterMaker: { title: "Poster Maker", icon: "render" },
  occasions: { title: "Occasions", icon: "occasions", tall: true },
  save: { title: "Save", icon: "save" },
  capture: { title: "Capture", icon: "aperture" },
};

// Placement of up to two open sheets: the first one docks to the right edge; a
// second open sheet (the pinned one keeps its place) docks to the LEFT edge, so
// two sheets are never on the same side. At 1366x768 the left (16-396) and
// right (970-1350) columns never overlap each other or the dock (440-927,
// bottom row), and the middle of the view stays free.
function placeSheets(pinnedId, normalId) {
  const out = {};
  if (pinnedId) out[pinnedId] = "right";
  if (normalId) out[normalId] = pinnedId ? "left" : "right";
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
  // Slice B1: the BBQ Ride poster kit is the default while the BBQ Bike is loaded
  usePosterKitDefault(assets.productId);

  // Which sheets are open: at most one pinned and one normal. Clicking an icon
  // whose sheet is open closes it; otherwise it opens as the normal sheet (and
  // replaces the previous normal one - a pinned sheet is left alone). Plain
  // component state, remembered only for this session.
  const [pinnedId, setPinnedId] = useState(null);
  const [normalId, setNormalId] = useState(null);
  const [motionLabOpen, setMotionLabOpen] = useState(false);
  const idle = useIdleFade();
  // Slice U2: while a Reel plays or exports every open sheet slides out of view
  // (the sheets stay mounted, so they come back exactly as they were).
  const away =
    useSyncExternalStore(animationStore.subscribe, animationStore.getSnapshot, animationStore.getSnapshot).mode !== "idle";
  const openIds = [pinnedId, normalId].filter(Boolean);

  const handleDockSelect = (id) => {
    if (id === "animate") { setMotionLabOpen((v) => !v); return; }
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
      case "posterMaker":
        return <PosterMakerBody />;
      case "occasions":
        return <OccasionBody />;
      case "save":
        return <SaveBody session={session} />;
      case "capture":
        return <CaptureBody />;
      default:
        return null;
    }
  };

  const currentProduct = PRODUCTS.find((p) => p.id === assets.productId);

  return (
    <div className="sos-shell" data-sos-shell="">
      {/* Themed 2D background — sits at z-index -1, behind the Three.js
          canvas (z-index 0 with alpha: true). Defaults to #050505 when no
          occasion is active so there is zero visual change from the old
          canvas background. */}
      <OccasionBackground />
      <PlaceBanner />
      {/* Slice U1 - the opening state: capsule + dock, tab order capsule ->
          dock -> open sheets. The old TopHeader, VersionTabs, CreatorSidebar
          and InspectorRail are not rendered (their files are untouched, just
          unreferenced here). */}
      {/* the poster preview overlay: always mounted, portaled to <body> at
          z-index 1 (below this shell, so the capsule, dock and sheets stack
          above it), pointer-events none; shown while Poster is On */}
      <PosterOverlayHost />
      <BrandingOverlayHost />
      <LowerThird />
      <OccasionParticles />
      {motionLabOpen && currentProduct && (
        <MotionLabOverlay
          modelPath={currentProduct.modelPath}
          modelName={currentProduct.name}
          onClose={() => setMotionLabOpen(false)}
        />
      )}
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
          away={away}
          onPin={() => handlePin(id)}
          onClose={() => (id === pinnedId ? setPinnedId(null) : setNormalId(null))}
        >
          {body(id)}
        </Sheet>
      ))}
    </div>
  );
}
