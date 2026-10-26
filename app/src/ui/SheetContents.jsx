import { useEffect, useState } from "react";
import Icon from "./icons";
import { buildLibraryGroups } from "./content";
import ImportPanel from "./ImportPanel";
import AssetGrid from "./AssetLibrary";
import MaterialsManager from "./MaterialsManager";
import AssetPreview from "./AssetPreview";
import PropsShelf from "./PropsShelf";
import PosterPanel from "./PosterPanel";
import {
  AnimatePanel,
  CameraFraming,
  CameraLock,
  CameraSliders,
  GaragePanel,
  LightingPanel,
} from "./InspectorRail";
import { setLightSlot } from "./lightSlot";
import LookPanel from "./LookPanel";
import ProjectsPanel from "./ProjectsPanel";
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
          {group.kind === "product" ? (
            <>
              <div className="sos2-sheet-divider" aria-hidden="true" />
              <span className="sos2-sheet-subhead">Props</span>
              <PropsShelf />
            </>
          ) : null}
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
      <LookPanel />
      <div className="sos2-sheet-divider" aria-hidden="true" />
      <LightingPanel />
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
export function PosterBody() {
  return <PosterPanel />;
}

export function ReelBody() {
  return <AnimatePanel />;
}

export { default as OccasionBody } from "./OccasionSheet";
