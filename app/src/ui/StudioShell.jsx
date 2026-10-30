import { useEffect, useState, useSyncExternalStore } from "react";
import "./ui-shell.css";
import StudioCapsule from "./StudioCapsule";
import StudioDock from "./StudioDock";
import Sheet from "./Sheet";
import useIdleFade from "./useIdleFade";
import useSessionUi from "./useSessionUi";
import usePosterKitDefault from "./usePosterKitDefault";
import {
  SceneBody,
  StyleBody,
  PropsBody,
  CreateBody,
  ReelSectionBody,
  ExportBody,
} from "./SheetContents";
import OccasionParticles from "./OccasionParticles";
import OccasionBackground from "./OccasionBackground";
import AppGuide, { useGuide } from "./AppGuide";
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
   Slice U1, Stage B2: the shell is the capsule, the dock and the dock's
   sheets (manga redesign: six toolbar sections, each grouping the older tool
   sheets). Every toolbar section opens its own floating Sheet with the real controls
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

// The six toolbar sections (manga redesign). Each sheet stacks the old tool
// sheets it groups (see the section bodies in SheetContents.jsx). Slice U2: no
// sheet opens in the middle of the screen (it would cover the product); every
// sheet docks to an edge, from below the capsule to just above the toolbar,
// and scrolls inside.
const SHEETS = {
  scene: { title: "Scene", icon: "cube", tall: true },
  style: { title: "Style", icon: "sun", tall: true },
  props: { title: "Props", icon: "frame", tall: true },
  create: { title: "Posters & AI", icon: "star", tall: true },
  reel: { title: "Reel", icon: "film", tall: true },
  export: { title: "Export & Save", icon: "aperture", tall: true },
};

// Placement of up to two open sheets: the first one docks to the right edge; a
// second open sheet (the pinned one keeps its place) docks to the LEFT edge, so
// two sheets are never on the same side. At 1366x768 the left (16-396) and
// right (970-1350) columns never overlap each other, both stop above the
// full-width toolbar, and the middle of the view stays free.
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
  const [normalId, setNormalId] = useState("scene");
  const [motionLabOpen, setMotionLabOpen] = useState(false);
  const guide = useGuide();
  const idle = useIdleFade();
  // Slice U2: while a Reel plays or exports every open sheet slides out of view
  // (the sheets stay mounted, so they come back exactly as they were).
  const away =
    useSyncExternalStore(animationStore.subscribe, animationStore.getSnapshot, animationStore.getSnapshot).mode !== "idle";
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
  // Garage (in Props) clearing its part selection or its measure pair (the
  // canvas handlers act on the same keypress; a second Esc then closes the sheet).
  useEffect(() => {
    if (!normalId) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (animationStore.getSnapshot().mode !== "idle") return;
      if (normalId === "props") {
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
      case "scene":
        return <SceneBody selection={assets} onSelect={assets.select} />;
      case "style":
        return <StyleBody productId={assets.productId} />;
      case "props":
        return <PropsBody />;
      case "create":
        return <CreateBody productId={assets.productId} />;
      case "reel":
        return (
          <ReelSectionBody motionLabOpen={motionLabOpen} onToggleMotionLab={() => setMotionLabOpen((v) => !v)} />
        );
      case "export":
        return <ExportBody session={session} />;
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
      {openIds.length === 0 && (
        <div className="sos-canvas-hint" aria-hidden="true">
          <span>Tap <strong>SCENE</strong> to pick your product &amp; environment</span>
        </div>
      )}
      <AppGuide open={guide.open} onClose={guide.close} />
      <StudioCapsule productName={assetName} idle={idle} />
      <StudioDock openIds={openIds} onSelect={handleDockSelect} idle={idle} onGuide={guide.show} />
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
