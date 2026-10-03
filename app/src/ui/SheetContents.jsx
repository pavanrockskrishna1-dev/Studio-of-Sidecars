import { useEffect } from "react";
import Icon from "./icons";
import { buildLibraryGroups } from "./content";
import ImportPanel from "./ImportPanel";
import AssetGrid from "./AssetLibrary";
import MaterialsManager from "./MaterialsManager";
import { CameraSliders } from "./InspectorRail";
import { hydrateRuntimeAssets, useRuntimeAssets } from "../assets/runtimeRegistry";
import { slotRef } from "./slots";

/* ==========================================================================
   Slice U1, Stage B1 — the bodies of the five dock sheets (new file, UI ONLY)
   --------------------------------------------------------------------------
   Each body hosts real controls that already exist: the library, importer and
   Materials Manager are rendered here directly (their old home, the creator
   sidebar, is not mounted for these tools any more), and the controls that
   live inside the engine's StudioControls panel are moved in through named
   slots (ui/slots.js) so there is never a second copy.
   ========================================================================== */

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
      <span className="sos2-sheet-subhead">Distance and height</span>
      <CameraSliders />
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
