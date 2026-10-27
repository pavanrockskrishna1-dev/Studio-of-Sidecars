import { useEffect, useState } from "react";
import Icon from "./icons";
import { buildLibraryGroups } from "./content";
import ImportPanel from "./ImportPanel";
import AssetGrid from "./AssetLibrary";
import MaterialsManager from "./MaterialsManager";
import AssetPreview from "./AssetPreview";
import PropsShelf from "./PropsShelf";
import PropGroupShelf from "./PropGroupShelf";
import PosterPanel from "./PosterPanel";
import PosterMakerPanel from "./PosterMakerPanel";
import BrandArt from "./BrandArt";
import PostStudio from "./PostStudio";
import CaptionGen from "./CaptionGen";
import AiScenePanel from "./AiScenePanel";
import {
  AnimatePanel,
  CameraFraming,
  CameraLock,
  CameraSliders,
  GaragePanel,
  LightingPanel,
  MangaPanel,
} from "./InspectorRail";
import ScenePresets from "./ScenePresets";
import { setLightSlot } from "./lightSlot";
import LookPanel from "./LookPanel";
import MoodPanel from "./MoodPanel";
import StagePanel from "./StagePanel";
import ProjectsPanel from "./ProjectsPanel";
import OccasionSheet from "./OccasionSheet";
import { hydrateRuntimeAssets, useRuntimeAssets } from "../assets/runtimeRegistry";
import { slotRef } from "./slots";

/* ==========================================================================
   Slice U1, Stage B — the bodies of the dock sheets (new file, UI ONLY)
   --------------------------------------------------------------------------
   Each body hosts real controls that already exist: the library, importer and
   Materials Manager are rendered here directly (their old home, the creator
   sidebar, is not mounted for these tools any more), and the controls that
   live inside the engine's StudioControls panel are moved in through named
   slots (ui/slots.js) so there is never a second copy.
   ========================================================================== */

// The BBQ Bike card is an announced, inert product; its reference stills (the
// Front 3/4 / Profile / Rear views and the rest of the UI pack) live in this
// disclosure directly under the product cards, where the old sidebar's BBQ
// Bike section used to sit.
function BbqReference() {
  const [open, setOpen] = useState(false);
  return (
    <div className="sos2-bbq" data-testid="ui2-bbq-reference">
      <button
        type="button"
        className="sos2-disclosure"
        aria-expanded={open}
        data-testid="ui2-bbq-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <span>BBQ Bike · reference views</span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open ? <AssetPreview collapsed={false} /> : null}
    </div>
  );
}

export function CreatorBody({ selection, onSelect }) {
  const runtimeVersion = useRuntimeAssets();
  useEffect(() => {
    hydrateRuntimeAssets();
  }, []);
  void runtimeVersion;
  const groups = buildLibraryGroups();
  return (
    <>
      <span className="sos2-sheet-subhead">Environment and model</span>
      <div className="sos2-slot" ref={slotRef("creator-pickers")} data-testid="ui2-slot-creator-pickers" />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <span className="sos2-sheet-subhead">Import assets</span>
      <p className="sos2-note">GLB · glTF · HDR · EXR — stored on this device</p>
      <ImportPanel collapsed={false} />
      {groups.map((group) => (
        <section key={group.id} className="sos2-lib-group">
          <div className="sos2-sheet-divider" aria-hidden="true" />
          <span className="sos2-sheet-subhead">
            {group.name} <span className="sos2-count">{group.items.length}</span>
          </span>
          <AssetGrid
            group={group}
            collapsed={false}
            activeId={group.kind === "product" ? selection.productId : selection.environmentId}
            onSelect={(id) => onSelect?.(group.kind, id)}
          />
          {group.kind === "product" ? <BbqReference /> : null}
        </section>
      ))}
    </>
  );
}

export function MaterialsBody({ productId }) {
  return <MaterialsManager collapsed={false} productId={productId} />;
}

export function CameraBody() {
  return (
    <>
      <div className="sos2-slot" ref={slotRef("camera")} data-testid="ui2-slot-camera" />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <CameraFraming />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <span className="sos2-sheet-subhead">Distance and height</span>
      <CameraSliders />
      <CameraLock />
    </>
  );
}

export function SaveBody({ session }) {
  return (
    <>
      <label className="sos2-field-label" htmlFor="ui2-project-name">
        Project name
      </label>
      <input
        id="ui2-project-name"
        className="sos2-input"
        type="text"
        value={session.projectName}
        maxLength={60}
        spellCheck={false}
        placeholder="Project name"
        title="Project name — defaults to the loaded asset; saved with the studio session"
        data-testid="ui-project-name"
        onChange={(e) => session.onProjectNameChange?.(e.target.value)}
        onBlur={session.onProjectNameBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      <div className="sos2-btn-row">
        <button
          type="button"
          className="sos2-btn sos2-btn-primary"
          data-testid="ui-session-save"
          title="Save Studio Session — camera, lighting, environment, materials, viewer settings, asset and transforms (local only, not an export)"
          onClick={session.onSave}
        >
          <Icon name="save" size={14} /> Save
        </button>
        <button
          type="button"
          className="sos2-btn"
          data-testid="ui-session-restore"
          title="Restore the last saved studio session"
          disabled={!session.canRestore}
          onClick={session.onRestore}
        >
          <Icon name="folder" size={14} /> Restore
        </button>
        <button
          type="button"
          className="sos2-btn"
          data-testid="ui-session-reset"
          title="Reset Entire Studio Session — camera, lighting, environment, materials, transforms and viewer controls"
          onClick={session.onReset}
        >
          <Icon name="undo" size={14} /> Reset
        </button>
      </div>
      <p className="sos2-note" role="status" aria-live="polite" data-testid="ui2-session-status">
        {session.flash ? `Session ${session.flash}` : "Saved on this device only — not an export."}
      </p>
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <ProjectsPanel session={session} />
    </>
  );
}

export function CaptureBody() {
  return (
    <>
      <div className="sos2-slot" ref={slotRef("capture-options")} data-testid="ui2-slot-capture-options" />
      <div className="sos2-slot sos2-slot-gap" ref={slotRef("capture-button")} data-testid="ui2-slot-capture-button" />
    </>
  );
}

// the engine's real Key/Fill/Rim/Ambient/Shadow/Exposure sliders are portaled in
// from StudioControls (ui/lightSlot.js) - moved, not duplicated
const lightSlotRef = (el) => setLightSlot(el || null);

export function LightBody() {
  return (
    <>
      <ScenePresets />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <MoodPanel />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <StagePanel />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <LookPanel />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <LightingPanel />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <MangaPanel />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <span className="sos2-sheet-subhead">Fine-tune</span>
      <div ref={lightSlotRef} data-testid="ui2-light-slot" />
    </>
  );
}

export function GarageBody() {
  return <GaragePanel />;
}

// PosterPanel's live preview overlay is already portaled to document.body (see
// PosterPanel.jsx), so nothing here - and no sheet ancestor - can contain it.
// Brand Art and the motion post templates moved here from InspectorRail, which
// is no longer mounted.
export function PosterBody() {
  return (
    <>
      <PosterPanel />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <span className="sos2-sheet-subhead">Brand Art</span>
      <BrandArt />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <span className="sos2-sheet-subhead">Motion Posters</span>
      <PostStudio />
    </>
  );
}

// Poster Maker — a one-click high-res PNG export of the live view, separate
// from the branding Poster overlay above (logo/end-card settings for the
// Reel/Capture export). See ui/PosterMakerPanel.jsx.
export function PosterMakerBody() {
  return <PosterMakerPanel />;
}

export function ReelBody() {
  return <AnimatePanel />;
}

// The Instagram caption generator moved here from InspectorRail, which is no
// longer mounted.
export function AiBody({ productId }) {
  return (
    <>
      <AiScenePanel productId={productId} />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <span className="sos2-sheet-subhead">Instagram Captions</span>
      <CaptionGen productId={productId} />
    </>
  );
}

export { default as OccasionBody } from "./OccasionSheet";

/* --------------------------------------------------------------------------
   Manga redesign — the six toolbar sections. Each one stacks the existing
   bodies above in one scrolling sheet; every slot (slotRef / lightSlotRef)
   still appears in exactly one section, so a pinned and an open sheet never
   claim the same portal target.
   -------------------------------------------------------------------------- */

export function SceneBody({ selection, onSelect }) {
  return (
    <>
      <CreatorBody selection={selection} onSelect={onSelect} />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <span className="sos2-sheet-subhead">Camera</span>
      <CameraBody />
    </>
  );
}

export function StyleBody({ productId }) {
  return (
    <>
      <LightBody />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <span className="sos2-sheet-subhead">Materials</span>
      <MaterialsBody productId={productId} />
    </>
  );
}

// The prop shelves moved here from the Creator body.
export function PropsBody() {
  return (
    <>
      <PropGroupShelf />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <span className="sos2-sheet-subhead">Props</span>
      <PropsShelf />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <span className="sos2-sheet-subhead">Garage</span>
      <GarageBody />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <span className="sos2-sheet-subhead">Occasions</span>
      <OccasionSheet />
    </>
  );
}

export function CreateBody({ productId }) {
  return (
    <>
      <PosterBody />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <AiBody productId={productId} />
    </>
  );
}

// Motion Lab is a full-screen overlay owned by StudioShell, not a sheet, so the
// Reel section carries its toggle.
export function ReelSectionBody({ motionLabOpen, onToggleMotionLab }) {
  return (
    <>
      <button
        type="button"
        className="sos2-btn sos2-btn-primary sos2-motionlab-toggle"
        aria-pressed={motionLabOpen}
        data-testid="ui2-reel-motionlab"
        onClick={onToggleMotionLab}
      >
        {motionLabOpen ? "Close Motion Lab" : "Open Motion Lab"}
      </button>
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <ReelBody />
    </>
  );
}

export function ExportBody({ session }) {
  return (
    <>
      <span className="sos2-sheet-subhead">Capture</span>
      <CaptureBody />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <span className="sos2-sheet-subhead">Poster Maker</span>
      <PosterMakerBody />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <span className="sos2-sheet-subhead">Save</span>
      <SaveBody session={session} />
    </>
  );
}
