import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Icon from "./icons";
import {
  CAMERA_FRAMINGS,
  INSPECTOR_PLACEHOLDERS,
  RAIL_CHIPS,
} from "./content";
import {
  MOOD_KNOBS,
  findActiveMoodPreset,
  moodPresetForLabel,
  moodPresetId,
} from "../lighting/moodPresets";
import * as materialStore from "../materials/store";
import * as cameraStudio from "../camera/cameraStudio";
import * as animationStore from "../animation/animationStore";
import * as garageStore from "../garage/garageStore";
import * as garageMode from "../garage/garageMode";
import * as layoutLibrary from "../garage/layoutLibrary";
import * as sceneObjects from "../garage/sceneObjects";
import * as gizmo from "../garage/gizmo";
import * as measure from "../garage/measure";
import { PRODUCTS } from "../products/registry";
import { isHydrated, useRuntimeAssets } from "../assets/runtimeRegistry";
import { checkExportSupport, exportReel, saveBlob } from "../animation/exporter";
import { exportPng } from "./engineCapture";
import {
  backdropGate,
  exportsAllowed,
  withExportLock,
  clampFieldScale,
  BACKDROP_STATUS,
  GATE_LABEL,
  BACKDROP_FAILED_WARNING,
} from "../capture/exportGate";

/* ==========================================================================
   Right inspector rail (Agent #2 · UI ONLY)
   --------------------------------------------------------------------------
   The mockup's `#inspector`: an exclusive accordion (one section open) holding
   Camera · Lighting · Materials · Render.

   Two honesty rules shaped this file:
   1. The engine already owns camera framing — its Studio Controls panel is
      docked directly above this rail, so the rail mirrors the real preset
      names (read from camera/presets.js, never duplicated) instead of
      shipping a second, decorative set of buttons that do nothing.
   2. Everything the engine has not built yet (materials, render) is a
      labelled placeholder with inert controls — visibly a shell, never a
      dead-looking fake. Mission 13C: the Lighting chips are no longer
      placeholders — they drive the engine's real lighting state through the
      engine's own slider pipeline (below); materials and render stay shell.
   ========================================================================== */

const SECTIONS = [
  { id: "camera", name: "Camera", sub: "one-tap framing", icon: "camera" },
  { id: "lighting", name: "Lighting", sub: "cinematic looks", icon: "sun" },
  { id: "materials", name: "Materials", sub: "tap a part to style", icon: "cube" },
  { id: "render", name: "Render", sub: "output presets", icon: "render" },
  { id: "animate", name: "Animate", sub: "turntable preview", icon: "film" },
  { id: "garage", name: "Garage", sub: "pick parts by click", icon: "frame" },
];

/* --------------------------------------------------------------------------
   Mission 13C — mood preset bridge (new work for this mission, built and
   verified in its verification report).

   The rail is a sibling of <App/> (see StudioShell.jsx), so it has no props
   from the engine and no store it may mirror: the ONLY sanctioned path into
   the engine's lighting state is the engine's own six slider inputs
   (data-testid="light-*" in StudioControls.jsx), whose onChange runs App's
   real setLighting. This bridge drives those inputs the React-controlled way
   — native value setter + a dispatched input event — so a preset is applied
   by the EXISTING pipeline, with no second lighting state, no new panel and
   no engine edit.

   Two dynamics the code has to respect (both verified in the browser):
   - React's change plugin ignores an input event whose value equals the
     value it last tracked, so a knob already at its preset value is SKIPPED
     (nothing to change) instead of dispatched;
   - each slider carries its own value tracker, so six different sliders may
     each take exactly one changed dispatch in the same gesture.

   If the engine panel is not in the DOM (it is, in every reachable state of
   this app — see the mount matrix in the Phase B report), setLightKnob
   reports false and the click is a graceful no-op: no state change, no
   active highlight, no throw.
   -------------------------------------------------------------------------- */

const lightKnobEl = (knob) => document.querySelector(`[data-testid="light-${knob}"]`);

function setLightKnob(knob, value) {
  const el = lightKnobEl(knob);
  if (!el) return false;
  if (Math.abs(parseFloat(el.value) - value) < 1e-9) return true; // already there
  const setNativeValue = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  setNativeValue.call(el, String(value));
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}

// true only when all six knobs are (or now are) at the preset's values.
function applyMoodPreset(values) {
  return MOOD_KNOBS.every((k) => setLightKnob(k, values[k]));
}

// The rig's live six, as numbers — or null when the engine panel is absent.
function readLiveLighting() {
  const values = {};
  for (const k of MOOD_KNOBS) {
    const el = lightKnobEl(k);
    if (!el) return null;
    values[k] = parseFloat(el.value);
  }
  return values;
}

/* --------------------------------------------------------------------------
   Camera chips — same bridge idea as the lighting one: the rail is a sibling
   of <App/>, so it drives the engine's OWN Camera cards in StudioControls
   (title="<Name> shot") with a real click. That runs App's existing
   handleCameraPreset, so there is no second camera state. An absent panel or
   an unknown name is a graceful no-op.
   -------------------------------------------------------------------------- */

// The engine's cards carry data-active (true while that preset is the active,
// not-live view). Chip highlight follows them; null when none / no panel.
function readActiveCameraCard() {
  const el = document.querySelector('[data-studio-controls] button[data-active="true"]');
  return el ? el.title.replace(/ shot$/, "") : null;
}

function applyCameraPreset(name) {
  const el = document.querySelector(
    `[data-studio-controls] button[title="${name} shot"]`
  );
  if (!el) return false;
  el.click();
  return true;
}

/* --------------------------------------------------------------------------
   Materials chips — each chip label maps to a real preset in
   materials/presets.js and is applied through the SAME store MaterialsManager
   uses (store.applyPreset → the focused material of the live model). Two
   labels have no exact preset, so they use the nearest real one:
   Candy Red → Racing Red, Tan Leather → Brown Leather.
   -------------------------------------------------------------------------- */

const MATERIAL_CHIP_PRESETS = {
  Chrome: "metal-chrome",
  "Candy Red": "paint-racing-red",
  "Matte Charcoal": "paint-matte-black",
  Brass: "metal-brass",
  "Tan Leather": "leather-brown",
};

/* --------------------------------------------------------------------------
   Render section — same bridge idea again. There is no export code to copy:
   Export PNG uses the shared exportPng() (./engineCapture.js), which clicks the
   engine's own Capture Shot button. The aspect chips set the engine's own Format select
   (data-testid="cap-format"), i.e. the real exportOpts.presetId the capture
   reads. A chip with no real system behind it is marked Reserved.
   -------------------------------------------------------------------------- */

const FORMAT_SELECT = '[data-testid="cap-format"]';

// chip label → engine export preset id (capture/exportOptions.js EXPORT_PRESETS)
const RENDER_CHIP_FORMATS = {
  "Reel · 9:16": "story-reel",
  "Post · 1:1": "ig-square",
  "Hero · 4:5": "ig-portrait",
  "Wide · 16:9": "web-hero",
};

const readExportFormat = () => document.querySelector(FORMAT_SELECT)?.value ?? null;

function applyExportFormat(label) {
  const id = RENDER_CHIP_FORMATS[label];
  const el = document.querySelector(FORMAT_SELECT);
  if (!id || !el) return false;
  if (el.value === id) return true; // already there
  const setNativeValue = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    "value"
  ).set;
  setNativeValue.call(el, id);
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function Chips({ items, onSelect, activeMoodId, isActive, disabled }) {
  return (
    <div className="sos-frow">
      {items.map((text) => {
        const on = isActive ? isActive(text) : moodPresetId(text) === activeMoodId;
        return onSelect ? (
          <button
            key={text}
            type="button"
            className="sos-pchip"
            data-on={on || undefined}
            aria-pressed={on}
            disabled={disabled}
            title={`Apply the ${text} preset`}
            onClick={() => onSelect(text)}
          >
            {text}
          </button>
        ) : (
          <span key={text} className="sos-pchip">
            {text}
          </span>
        );
      })}
    </div>
  );
}

// Range input bound to the camera store. The slider pins at its ends while the
// mouse wheel can go further, so the label always shows the true number.
function CameraSlider({ label, testId, value, min, max, disabled, onChange }) {
  return (
    <div className="sos-field">
      <div className="sos-field-top">
        <label className="sos-label" htmlFor={testId}>
          {label}
        </label>
        <span className="sos-field-val" data-testid={`${testId}-value`}>
          {value}%
        </span>
      </div>
      <input
        id={testId}
        data-testid={testId}
        type="range"
        min={min}
        max={max}
        step={1}
        value={Math.max(min, Math.min(max, value))}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Hint({ children }) {
  return (
    <p className="sos-hint">
      <Icon name="info" size={12} stroke={1.8} />
      <span>{children}</span>
    </p>
  );
}

function RailCard({ section, open, onToggle, collapsed, onOpenFromStrip, children }) {
  const panelId = `sos-card-${section.id}`;
  return (
    <section className="sos-card" data-open={open}>
      <button
        type="button"
        className="sos-card-head"
        aria-expanded={collapsed ? undefined : open}
        aria-controls={panelId}
        data-testid={`ui-inspector-${section.id}`}
        onClick={collapsed ? onOpenFromStrip : onToggle}
        title={
          collapsed
            ? `${section.name} — expand the inspector on this section`
            : `${section.name} — ${open ? "collapse" : "expand"} panel`
        }
      >
        <span className="sos-tile" aria-hidden="true">
          <Icon name={section.icon} size={16} />
        </span>
        <span className="sos-group-txt">
          <span className="sos-group-name">{section.name}</span>
          <span className="sos-group-sub">{section.sub}</span>
        </span>
        <Icon name="chevron" size={13} className="sos-chev" />
      </button>
      {open ? (
        <div className="sos-card-body" id={panelId} role="region">
          {children}
        </div>
      ) : null}
    </section>
  );
}

// Garage G4 — a compact numeric field in the rail's own field style
// (.sos-field / native input, already styled in ui-shell.css), mirroring the
// whole-model transform panel's convention: commits on blur or Enter, keeps a
// draft string while focused so typing is never fought, and always displays
// the committed value once unfocused (so Reset instantly re-shows it).
const fmtNum = (n) => (Number.isFinite(n) ? String(Math.round(n * 1000) / 1000) : "0");

function GarageNumField({ label, value, step, unit, testId, disabled, onCommit }) {
  const [draft, setDraft] = useState(null);
  const display = draft !== null ? draft : fmtNum(value);
  const commit = () => {
    const n = parseFloat(display);
    if (Number.isFinite(n)) onCommit(n);
    setDraft(null);
  };
  return (
    <label className="sos-field">
      <em>
        {label}
        {unit ? ` (${unit})` : ""}
      </em>
      <input
        type="number"
        step={step}
        data-testid={testId}
        disabled={disabled}
        value={display}
        onFocus={() => setDraft(fmtNum(value))}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}

// Garage G4 — the single selected part's numeric edit fields: position,
// rotation, scale (uniform + an advanced per-axis disclosure) and hidden, plus
// Reset part. Reads garageMode.getPartTransform (base composed with any
// override) and writes through garageMode.commitPartEdit (pos/rot/scale) or
// directly through garageStore (hidden, reset) — both are already the exact
// commands the store's undo history tracks, so Undo/Redo below covers them.
function GarageEditFields({ itemId, partId, busy }) {
  const [scaleAdvanced, setScaleAdvanced] = useState(false);
  const t = garageMode.getPartTransform(itemId, partId);
  if (!t) {
    return (
      <p className="sos-hint">
        <span>Part transform not available yet.</span>
      </p>
    );
  }
  const commitPos = (axis, v) => {
    const pos = t.pos.slice();
    pos[axis] = v;
    garageMode.commitPartEdit(itemId, partId, { pos });
  };
  const commitRot = (axis, v) => {
    const rot = t.rot.slice();
    rot[axis] = v;
    garageMode.commitPartEdit(itemId, partId, { rot });
  };
  const commitScaleAxis = (axis, v) => {
    const scale = t.scale.slice();
    scale[axis] = clampFieldScale(v);
    garageMode.commitPartEdit(itemId, partId, { scale });
  };
  const commitScaleUniform = (v) => {
    const s = clampFieldScale(v);
    garageMode.commitPartEdit(itemId, partId, { scale: [s, s, s] });
  };
  const toggleHidden = () => {
    garageStore.setPartOverride(itemId, partId, { visible: t.hidden });
  };
  return (
    <>
      <span className="sos-label">Position</span>
      <div className="sos-fields">
        <GarageNumField label="X" unit="m" step={0.05} testId="ui-garage-pos-x" disabled={busy} value={t.pos[0]} onCommit={(v) => commitPos(0, v)} />
        <GarageNumField label="Y" unit="m" step={0.05} testId="ui-garage-pos-y" disabled={busy} value={t.pos[1]} onCommit={(v) => commitPos(1, v)} />
        <GarageNumField label="Z" unit="m" step={0.05} testId="ui-garage-pos-z" disabled={busy} value={t.pos[2]} onCommit={(v) => commitPos(2, v)} />
      </div>
      <span className="sos-label">Rotation</span>
      <div className="sos-fields">
        <GarageNumField label="X" unit="deg" step={1} testId="ui-garage-rot-x" disabled={busy} value={t.rot[0]} onCommit={(v) => commitRot(0, v)} />
        <GarageNumField label="Y" unit="deg" step={1} testId="ui-garage-rot-y" disabled={busy} value={t.rot[1]} onCommit={(v) => commitRot(1, v)} />
        <GarageNumField label="Z" unit="deg" step={1} testId="ui-garage-rot-z" disabled={busy} value={t.rot[2]} onCommit={(v) => commitRot(2, v)} />
      </div>
      <span className="sos-label">Scale</span>
      <div className="sos-fields">
        <GarageNumField
          label="Uniform"
          unit="x"
          step={0.05}
          testId="ui-garage-scale-uniform"
          disabled={busy}
          value={t.scale[0]}
          onCommit={commitScaleUniform}
        />
      </div>
      <div className="sos-frow">
        <button
          type="button"
          className="sos-pchip"
          data-testid="ui-garage-scale-advanced"
          data-on={scaleAdvanced || undefined}
          aria-pressed={scaleAdvanced}
          disabled={busy}
          title="Show per-axis scale fields"
          onClick={() => setScaleAdvanced((v) => !v)}
        >
          Advanced: per-axis
        </button>
      </div>
      {scaleAdvanced ? (
        <div className="sos-fields">
          <GarageNumField label="X" unit="x" step={0.05} testId="ui-garage-scale-x" disabled={busy} value={t.scale[0]} onCommit={(v) => commitScaleAxis(0, v)} />
          <GarageNumField label="Y" unit="x" step={0.05} testId="ui-garage-scale-y" disabled={busy} value={t.scale[1]} onCommit={(v) => commitScaleAxis(1, v)} />
          <GarageNumField label="Z" unit="x" step={0.05} testId="ui-garage-scale-z" disabled={busy} value={t.scale[2]} onCommit={(v) => commitScaleAxis(2, v)} />
        </div>
      ) : null}
      <div className="sos-frow">
        <label className="sos-pchip" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <input
            type="checkbox"
            data-testid="ui-garage-hidden"
            checked={t.hidden}
            disabled={busy}
            onChange={toggleHidden}
          />
          Hidden
        </label>
      </div>
      <button
        type="button"
        className="sos-btn sos-btn-ghost sos-rail-export"
        data-testid="ui-garage-reset-part"
        disabled={busy || !t.overridden}
        title="Reset this part to its original transform and visibility"
        onClick={() => garageStore.resetPart(itemId, partId)}
      >
        Reset part
      </button>
      <Hint>Part edits don&rsquo;t yet update the camera, floor, or shadow — coming soon.</Hint>
    </>
  );
}

// Garage G6 — a compact slider using the SAME classes the Materials panel's
// own Slider draws with (.sos-mat-field etc., defined once in ui-shell.css),
// so a per-part colour override reads like the model-wide editor without a
// new stylesheet rule.
function GarageColorSlider({ label, testId, value, disabled, onCommit }) {
  const v = typeof value === "number" ? value : 0;
  return (
    <label className="sos-mat-field">
      <span className="sos-mat-field-head">
        <span className="sos-mat-field-name">{label}</span>
        <span className="sos-mat-field-num">{v.toFixed(2)}</span>
      </span>
      <input
        type="range"
        data-testid={testId}
        min={0}
        max={1}
        step={0.01}
        disabled={disabled}
        value={v}
        onChange={(e) => onCommit(parseFloat(e.target.value))}
      />
    </label>
  );
}

// Garage G6 — the single selected part's colour override: base colour,
// metalness/roughness/opacity and an "ignore baked colours" escape hatch for
// vertex-painted models (Owner decisions 1-3 in HANDOFF's G6 slice). Reads
// garageMode.apiRef.current.getPartMaterial (the part's composed effective
// values — the ORIGINAL material's own values wherever no override field
// exists) and writes through .commitPartMaterial (authoritative-copy, same
// single-selection guard as commitPartEdit) or garageStore.setPartOverride
// directly for the full reset — the exact same direct-store pattern
// GarageEditFields' toggleHidden already uses above. This override lives
// ONLY in garageStore's parts map: it is never a materialGroups() row and
// never touches "sos-materials" persistence (see StudioCanvas.jsx's
// applyPartMaterial and materials/apply.js's Garage-clone exclusion).
function GarageColorFields({ itemId, partId, busy }) {
  const api = garageMode.apiRef.current;
  const m = api && typeof api.getPartMaterial === "function" ? api.getPartMaterial(itemId, partId) : null;
  if (!m) {
    return (
      <p className="sos-hint">
        <span>Part material not available yet.</span>
      </p>
    );
  }
  const commit = (patch) => {
    if (api && typeof api.commitPartMaterial === "function") api.commitPartMaterial(itemId, partId, patch);
  };
  return (
    <>
      <span className="sos-label">Colour override</span>
      <label className="sos-mat-field">
        <span className="sos-mat-field-head">
          <span className="sos-mat-field-name">Base colour</span>
        </span>
        <span className="sos-mat-color-row">
          <input
            type="color"
            data-testid="ui-garage-color"
            disabled={busy}
            value={m.color}
            onChange={(e) => commit({ color: e.target.value })}
          />
          <input
            type="text"
            className="sos-mat-hex"
            data-testid="ui-garage-color-hex"
            disabled={busy}
            value={m.color}
            aria-label="Part colour hex value"
            spellCheck="false"
            onChange={(e) => {
              const v = e.target.value.trim();
              if (/^#[0-9a-f]{6}$/i.test(v)) commit({ color: v });
            }}
          />
        </span>
      </label>
      <GarageColorSlider label="Metalness" testId="ui-garage-metalness" disabled={busy} value={m.metalness} onCommit={(v) => commit({ metalness: v })} />
      <GarageColorSlider label="Roughness" testId="ui-garage-roughness" disabled={busy} value={m.roughness} onCommit={(v) => commit({ roughness: v })} />
      <GarageColorSlider label="Opacity" testId="ui-garage-opacity" disabled={busy} value={m.opacity} onCommit={(v) => commit({ opacity: v })} />
      <div className="sos-frow">
        <label className="sos-pchip" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <input
            type="checkbox"
            data-testid="ui-garage-ignore-vertex-colors"
            checked={m.ignoreVertexColors}
            disabled={busy}
            onChange={(e) => commit({ ignoreVertexColors: e.target.checked })}
          />
          Ignore baked colours
        </label>
      </div>
      <button
        type="button"
        className="sos-btn sos-btn-ghost sos-rail-export"
        data-testid="ui-garage-reset-color"
        disabled={busy || !m.overridden}
        title="Remove this part's colour override"
        onClick={() => garageStore.setPartOverride(itemId, partId, { material: null })}
      >
        Reset colour
      </button>
    </>
  );
}

// Garage M0 — real-size calibration for the selected part or added object
// (Owner decisions 1-4, 6): the Size line (real units once calibrated, the
// existing "(model units, real size unknown)" fallback until then — the
// SAME formatting measure.js's on-canvas label uses), an axis choice + a
// typed real length to derive this MODEL's real-world scale, "File is in
// metres", and "Reset real size". assetId is the OWNING model's asset id:
// the main product's for a part, the object's own for an added object
// (Owner decision 4 — calibration is per model, on this device, never per
// selection). size is that selection's CURRENT model-unit box (already
// including its own Garage scale — StudioCanvas's describeMesh /
// getObjectModelSize), or null while it is not available yet.
const SIZE_AXES = [
  { key: "x", label: "Width" },
  { key: "y", label: "Height" },
  { key: "z", label: "Depth" },
];

function GarageSizeControls({ assetId, size, busy }) {
  const measureState = useSyncExternalStore(measure.subscribe, measure.getSnapshot, measure.getSnapshot);
  const [axis, setAxis] = useState("x");
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  const storage = typeof localStorage === "undefined" ? null : localStorage;
  // Re-read on every render: measureState (subscribed above) changes on a
  // calibrationRev bump from ANY selection's Set real size / File is in
  // metres / Reset real size, which is exactly the re-render trigger this
  // needs — calibration itself is never cached here, storage stays the one
  // source of truth (same convention as layoutLibrary's injected storage).
  const calibration = measure.readCalibration(storage, assetId);

  const setRealSize = () => {
    const length = parseFloat(draft);
    const r = measure.deriveCalibration({
      axisModelUnits: size ? size[axis] : NaN,
      length,
      unit: measureState.unit,
    });
    if (!r.ok) {
      setMessage(r.message);
      return;
    }
    const ok = measure.writeCalibration(storage, assetId, r.metersPerModelUnit);
    setMessage(ok ? "Real size set." : "Could not save: browser storage is unavailable or full.");
    if (ok) measure.touchCalibration();
  };

  const fileIsMetres = () => {
    const ok = measure.markAsMetres(storage, assetId);
    setMessage(ok ? "Marked as metres (1 model unit = 1 m)." : "Could not save: browser storage is unavailable or full.");
    if (ok) measure.touchCalibration();
  };

  const resetRealSize = () => {
    measure.clearCalibration(storage, assetId);
    setMessage("Real size cleared.");
    measure.touchCalibration();
  };

  return (
    <>
      <span className="sos-label">Size</span>
      <p className="sos-hint" data-testid="ui-garage-size">
        <span>{measure.formatSize(size, calibration, measureState.unit)}</span>
      </p>
      <div className="sos-frow">
        {SIZE_AXES.map((a) => (
          <button
            key={a.key}
            type="button"
            className="sos-pchip"
            data-testid={`ui-garage-size-axis-${a.key}`}
            data-on={axis === a.key || undefined}
            aria-pressed={axis === a.key}
            disabled={busy}
            title={`Set real size along ${a.label}`}
            onClick={() => setAxis(a.key)}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div className="sos-fields">
        <label className="sos-field">
          <em>Real length ({measureState.unit})</em>
          <input
            type="number"
            step={0.1}
            data-testid="ui-garage-size-length"
            disabled={busy}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
      </div>
      <div className="sos-frow">
        <button
          type="button"
          className="sos-btn sos-btn-ghost"
          data-testid="ui-garage-size-set"
          disabled={busy || draft === "" || !size}
          title="Derive this model's real-world scale from the chosen axis"
          onClick={setRealSize}
        >
          Set real size
        </button>
        <button
          type="button"
          className="sos-btn sos-btn-ghost"
          data-testid="ui-garage-size-metres"
          disabled={busy}
          title="Mark this model's file as already being in metres (1 model unit = 1 m)"
          onClick={fileIsMetres}
        >
          File is in metres
        </button>
      </div>
      <div className="sos-frow">
        <button
          type="button"
          className="sos-btn sos-btn-ghost"
          data-testid="ui-garage-size-reset"
          disabled={busy || calibration === null}
          title="Remove this model's real-size calibration"
          onClick={resetRealSize}
        >
          Reset real size
        </button>
      </div>
      {message ? (
        <p className="sos-hint" data-testid="ui-garage-size-status">
          <span>{message}</span>
        </p>
      ) : null}
    </>
  );
}

// Garage G7a — the selected ADDED object's whole-object fields (Decision 5):
// position (m), rotation (degrees, Euler XYZ) and one uniform scale (at least
// 0.05; the layout's item transform has no per-axis scale), plus hidden and
// Remove — the same GarageNumField conventions as the G4 part fields. Each
// commit is one garageStore command (setItemTransform / setItemHidden via the
// stage, which applies the triangle limit to showing / removeItem), so each
// is one undo step. Nothing here edits a part inside the object.
function GarageObjectFields({ itemId, busy }) {
  const [message, setMessage] = useState("");
  const api = garageMode.apiRef.current;
  const obj = api && typeof api.listObjects === "function" ? api.listObjects().find((o) => o.itemId === itemId) : null;
  if (!obj) {
    return (
      <p className="sos-hint">
        <span>Object not available yet.</span>
      </p>
    );
  }
  const t = obj.transform;
  const commit = (patch) => garageStore.setItemTransform(itemId, patch);
  const toggleHidden = () => {
    const r = api.setObjectHidden(itemId, !obj.hidden);
    setMessage(r.ok ? "" : r.message);
  };
  // Garage M0 — the object's model-unit size (already including its own
  // Garage scale, t.s) and the asset it's calibrated as (Owner decision 4).
  const objSize = typeof api.getObjectModelSize === "function" ? api.getObjectModelSize(itemId) : null;
  return (
    <>
      <GarageSizeControls assetId={obj.assetId} size={objSize} busy={busy} />
      <span className="sos-label">Object position</span>
      <div className="sos-fields">
        <GarageNumField label="X" unit="m" step={0.05} testId="ui-garage-object-pos-x" disabled={busy} value={t.x} onCommit={(v) => commit({ x: v })} />
        <GarageNumField label="Y" unit="m" step={0.05} testId="ui-garage-object-pos-y" disabled={busy} value={t.y} onCommit={(v) => commit({ y: v })} />
        <GarageNumField label="Z" unit="m" step={0.05} testId="ui-garage-object-pos-z" disabled={busy} value={t.z} onCommit={(v) => commit({ z: v })} />
      </div>
      <span className="sos-label">Object rotation</span>
      <div className="sos-fields">
        <GarageNumField label="X" unit="deg" step={1} testId="ui-garage-object-rot-x" disabled={busy} value={t.rx} onCommit={(v) => commit({ rx: v })} />
        <GarageNumField label="Y" unit="deg" step={1} testId="ui-garage-object-rot-y" disabled={busy} value={t.ry} onCommit={(v) => commit({ ry: v })} />
        <GarageNumField label="Z" unit="deg" step={1} testId="ui-garage-object-rot-z" disabled={busy} value={t.rz} onCommit={(v) => commit({ rz: v })} />
      </div>
      <span className="sos-label">Object scale</span>
      <div className="sos-fields">
        <GarageNumField
          label="Uniform"
          unit="x"
          step={0.05}
          testId="ui-garage-object-scale"
          disabled={busy}
          value={t.s}
          onCommit={(v) => commit({ s: clampFieldScale(v) })}
        />
      </div>
      <div className="sos-frow">
        <label className="sos-pchip" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <input
            type="checkbox"
            data-testid="ui-garage-object-hidden"
            checked={obj.hidden}
            disabled={busy}
            onChange={toggleHidden}
          />
          Hidden
        </label>
      </div>
      {message ? (
        <p className="sos-hint" data-testid="ui-garage-object-status">
          <span>{message}</span>
        </p>
      ) : null}
      <button
        type="button"
        className="sos-btn sos-btn-ghost sos-rail-export"
        data-testid="ui-garage-object-remove-selected"
        disabled={busy}
        title="Remove this object from the scene (one undo step)"
        onClick={() => garageStore.removeItem(itemId)}
      >
        Remove object
      </button>
      <Hint>Added objects move, turn, scale and hide as whole objects; their parts are not editable.</Hint>
    </>
  );
}

// Garage G7a — "Add object" (a built-in product or an imported asset from
// the Asset Library, both listed in the live PRODUCTS registry), the running
// triangle counter (Decision 2) and one row per added object (select / remove).
// Adding goes through the stage (garageMode.apiRef.current.addObject), which
// applies the max-5 and triangle rules before its single garageStore.addItem.
function GarageObjectsSection({ garageState, busy }) {
  useRuntimeAssets(); // an asset imported while this is open appears at once
  const [pick, setPick] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const api = garageMode.apiRef.current;
  const ready = !!(api && typeof api.addObject === "function");
  const choices = PRODUCTS.filter((p) => !p.placeholder && p.modelPath);
  const chosen = choices.some((p) => p.id === pick) ? pick : choices[0] ? choices[0].id : "";
  // Read per render: every garageStore commit re-renders this section
  // (garageState is a fresh snapshot), so the list and counter stay current.
  const objects = ready && garageState.hasLayout ? api.listObjects() : [];
  const tris = ready && garageState.hasLayout ? api.getSceneTriangles() : null;
  const add = async () => {
    if (!ready || adding || !chosen) return;
    setAdding(true);
    setMessage("Loading the object…");
    try {
      const r = await api.addObject(chosen);
      setMessage(r && r.message ? r.message : "The object could not be added.");
    } finally {
      setAdding(false);
    }
  };
  const remove = (o) => {
    const r = garageStore.removeItem(o.itemId);
    setMessage(r.ok ? `Removed "${o.name}".` : "The object could not be removed.");
  };
  return (
    <>
      <span className="sos-label">Objects</span>
      <label className="sos-field">
        <em>Add object</em>
        <select
          data-testid="ui-garage-add-select"
          value={chosen}
          disabled={busy || adding}
          onChange={(e) => setPick(e.target.value)}
        >
          {choices.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.source === "imported" ? " (imported)" : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="sos-frow">
        <button
          type="button"
          className="sos-btn sos-btn-ghost"
          data-testid="ui-garage-add"
          disabled={busy || adding || !ready || !chosen}
          title="Add the chosen object beside the main product (one undo step)"
          onClick={add}
        >
          {adding ? "Adding…" : "Add object"}
        </button>
      </div>
      <p className="sos-hint" data-testid="ui-garage-triangles" data-level={tris ? tris.level : undefined}>
        <span>{tris ? tris.message : "Scene triangles: not available yet"}</span>
      </p>
      {message ? (
        <p className="sos-hint" data-testid="ui-garage-objects-status">
          <span>{message}</span>
        </p>
      ) : null}
      {objects.length === 0 ? (
        <p className="sos-hint">
          <span>No added objects (up to {sceneObjects.OBJECT_LIMITS.MAX_ADDED}).</span>
        </p>
      ) : (
        <div data-testid="ui-garage-object-list">
          {objects.map((o) => (
            <div className="sos-frow" key={o.itemId} data-testid="ui-garage-object-row" data-item-id={o.itemId}>
              <span className="sos-hint" style={{ flex: 1 }}>
                <span>
                  {o.name}
                  {o.hidden ? " (hidden)" : ""}
                </span>
              </span>
              <button
                type="button"
                className="sos-btn sos-btn-ghost"
                data-testid="ui-garage-object-select"
                disabled={busy}
                title={`Select "${o.name}" (the whole object)`}
                onClick={() => garageStore.select([{ itemId: o.itemId, partId: sceneObjects.OBJECT_PART_ID }])}
              >
                Select
              </button>
              <button
                type="button"
                className="sos-btn sos-btn-ghost"
                data-testid="ui-garage-object-remove"
                disabled={busy}
                title={`Remove "${o.name}" (one undo step)`}
                onClick={() => remove(o)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Garage G11 — the 3D gizmo's settings: Move / Rotate / Scale, World / Local
// axes and Snap (0.05 m, 15 degrees, 0.1). The gizmo itself lives in the
// stage; these only write the gizmo settings store it follows.
function GarageGizmoControls({ isObject, busy }) {
  const s = useSyncExternalStore(gizmo.subscribe, gizmo.getSnapshot, gizmo.getSnapshot);
  return (
    <>
      <span className="sos-label">Gizmo</span>
      <div className="sos-frow">
        {gizmo.GIZMO_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            className="sos-pchip"
            data-testid={`ui-garage-gizmo-${mode}`}
            data-on={s.mode === mode || undefined}
            aria-pressed={s.mode === mode}
            disabled={busy}
            title={`${gizmo.MODE_LABELS[mode]} with the gizmo (${Object.keys(gizmo.MODE_KEYS).find((k) => gizmo.MODE_KEYS[k] === mode).toUpperCase()})`}
            onClick={() => gizmo.setMode(mode)}
          >
            {gizmo.MODE_LABELS[mode]}
          </button>
        ))}
      </div>
      <div className="sos-frow">
        <button
          type="button"
          className="sos-pchip"
          data-testid="ui-garage-gizmo-space"
          data-on={s.space === "local" || undefined}
          aria-pressed={s.space === "local"}
          disabled={busy}
          title={
            s.space === "local"
              ? "Axes: Local (the object's own axes). Click for World."
              : "Axes: World. Click for Local (the object's own axes)."
          }
          onClick={gizmo.toggleSpace}
        >
          {s.space === "local" ? "Axes: Local" : "Axes: World"}
        </button>
        <button
          type="button"
          className="sos-pchip"
          data-testid="ui-garage-gizmo-snap"
          data-on={s.snap || undefined}
          aria-pressed={s.snap}
          disabled={busy}
          title={`Snap is ${s.snap ? "ON" : "OFF"}: ${gizmo.SNAP.translate} m, ${gizmo.SNAP.rotate} degrees, ${gizmo.SNAP.scale} scale`}
          onClick={gizmo.toggleSnap}
        >
          {s.snap ? "Snap: on" : "Snap: off"}
        </button>
      </div>
      <Hint>
        Drag a handle in the view (W / E / R switch Move / Rotate / Scale; Esc cancels a drag). Each drag
        is one undo step; the fields below update on release. Scale always uses the object&rsquo;s own axes
        {isObject ? " and stays uniform for an added object" : ""}.
      </Hint>
    </>
  );
}

// Garage M0 — the cm/in display toggle (Owner decision 6): global, stored on
// this device, drives every Size line and the measure tool's label alike
// (both read measure.js's live `unit`, so this one chip covers all of them).
function GarageUnitsToggle({ busy }) {
  const measureState = useSyncExternalStore(measure.subscribe, measure.getSnapshot, measure.getSnapshot);
  return (
    <>
      <span className="sos-label">Units</span>
      <div className="sos-frow">
        {measure.UNITS.map((u) => (
          <button
            key={u}
            type="button"
            className="sos-pchip"
            data-testid={`ui-garage-units-${u}`}
            data-on={measureState.unit === u || undefined}
            aria-pressed={measureState.unit === u}
            disabled={busy}
            title={`Show real sizes in ${u === "cm" ? "centimetres" : "inches"}`}
            onClick={() => measure.setUnit(u)}
          >
            {u}
          </button>
        ))}
      </div>
    </>
  );
}

// Garage M0 — the two-point measure tool (Owner decision 7): a Measure
// toggle and a plain status line. The distance itself is never duplicated
// here — StudioCanvas draws the one line + label in the view (it alone
// knows the live whole-model Transform panel scale the conversion needs),
// so the rail only reports how many points are picked.
function GarageMeasureSection({ busy }) {
  const measureState = useSyncExternalStore(measure.subscribe, measure.getSnapshot, measure.getSnapshot);
  const status = measureState.pointA
    ? measureState.pointB
      ? "Two points picked — see the distance label in the view. Click again to start a new pair."
      : "First point picked — click a second surface point."
    : measureState.active
      ? "Click two surface points on the main product or an added object."
      : "";
  return (
    <>
      <span className="sos-label">Measure</span>
      <div className="sos-frow">
        <button
          type="button"
          className="sos-pchip"
          data-testid="ui-garage-measure"
          data-on={measureState.active || undefined}
          aria-pressed={measureState.active}
          disabled={busy}
          title={
            measureState.active
              ? "Measure is ON: click two surface points to draw a distance line. Click to turn OFF."
              : "Measure is OFF. Click to turn ON: click two surface points to draw a distance line."
          }
          onClick={measure.toggleActive}
        >
          {measureState.active ? "Measure: on" : "Measure: off"}
        </button>
      </div>
      {status ? (
        <p className="sos-hint" data-testid="ui-garage-measure-status">
          <span>{status}</span>
        </p>
      ) : null}
      <Hint>
        Measure uses the main product&rsquo;s real-size calibration. Esc clears the current pair without
        turning Measure off; switching product also clears it.
      </Hint>
    </>
  );
}

// Garage G3/G4 — the Parts switch and the selected part's read-out (and, from
// G4, its numeric edit fields when exactly one part is selected). All state
// comes from the Garage stores; nothing here touches the engine directly.
// Garage G7a — a selection entry on an ADDED object means the whole object:
// its read-out and fields replace the part ones.
function GarageSection({ pickMode, garageState, busy }) {
  const selection = garageState.selection;
  const count = selection.length;
  const single = garageMode.singleSelectedPart(garageState);
  const layoutNow = garageState.hasLayout ? garageStore.getLayout() : null;
  const primaryItem = layoutNow ? layoutNow.items.find((i) => i.primary) : null;
  const primaryItemId = primaryItem ? primaryItem.itemId : "i0";
  const isObjectEntry = (e) => e.itemId !== primaryItemId;
  const objectName = (itemId) => {
    const it = layoutNow ? layoutNow.items.find((i) => i.itemId === itemId) : null;
    const asset = it ? PRODUCTS.find((p) => p.id === it.assetId) : null;
    return asset ? asset.name : it ? it.assetId : itemId;
  };
  const singleObject = single && isObjectEntry(single) ? single : null;
  const first = count > 0 && !isObjectEntry(selection[0]) ? garageMode.describePart(selection[0].partId) : null;
  const names = selection
    .slice(0, 5)
    .map((e) => (isObjectEntry(e) ? `${objectName(e.itemId)} (object)` : garageMode.describePart(e.partId)?.name ?? e.partId));
  return (
    <>
      <span className="sos-label">Parts</span>
      <div className="sos-frow">
        <button
          type="button"
          className="sos-pchip"
          data-testid="ui-garage-parts"
          data-on={pickMode || undefined}
          aria-pressed={pickMode}
          disabled={busy}
          title={
            pickMode
              ? "Parts is ON: a click selects one part. Click to turn OFF."
              : "Parts is OFF: a click selects the whole model. Click to turn ON."
          }
          onClick={garageMode.togglePickMode}
        >
          {pickMode ? "Parts: on" : "Parts: off"}
        </button>
      </div>
      <GarageUnitsToggle busy={busy} />
      <GarageMeasureSection busy={busy} />
      <div data-testid="ui-garage-readout">
        {count === 0 ? (
          <p className="sos-hint">
            <span>No part selected</span>
          </p>
        ) : singleObject ? (
          <p className="sos-hint">
            <span>{objectName(singleObject.itemId)} (whole added object)</span>
          </p>
        ) : count === 1 && first ? (
          <>
            <p className="sos-hint">
              <span>{first.name}</span>
            </p>
            <p className="sos-hint">
              <span>Path: {first.path}</span>
            </p>
            <p className="sos-hint">
              <span>
                {first.triangles.toLocaleString()} triangles, {first.vertices.toLocaleString()} vertices
              </span>
            </p>
            <GarageSizeControls assetId={garageState.primaryAssetId} size={first.size} busy={busy} />
            <p className="sos-hint">
              <span>Material: {first.materialName || "(unnamed)"}</span>
            </p>
          </>
        ) : (
          <>
            <p className="sos-hint">
              <span>{count} parts selected</span>
            </p>
            <p className="sos-hint">
              <span>
                {names.join(", ")}
                {count > names.length ? `, and ${count - names.length} more` : ""}
              </span>
            </p>
          </>
        )}
      </div>
      <button
        type="button"
        className="sos-btn sos-btn-ghost sos-rail-export"
        data-testid="ui-garage-clear"
        disabled={count === 0}
        title="Clear the part selection"
        onClick={garageStore.clearSelection}
      >
        Clear
      </button>
      <Hint>
        Parts on: click selects a part, shift-click adds, Esc clears. Parts off: click selects the
        whole model as before.
      </Hint>
      {/* Garage G4 — editing is numeric fields only, and only for exactly one
          selected part (Owner decisions 1 and 2). */}
      {singleObject || (single && pickMode) ? <GarageGizmoControls isObject={!!singleObject} busy={busy} /> : null}
      {singleObject ? (
        <GarageObjectFields itemId={singleObject.itemId} busy={busy} />
      ) : single ? (
        <>
          <GarageEditFields itemId={single.itemId} partId={single.partId} busy={busy} />
          <GarageColorFields itemId={single.itemId} partId={single.partId} busy={busy} />
        </>
      ) : (
        <Hint>Select exactly one part to edit it.</Hint>
      )}
      <GarageObjectsSection garageState={garageState} busy={busy} />
      <span className="sos-label">History</span>
      <div className="sos-frow">
        <button
          type="button"
          className="sos-btn sos-btn-ghost"
          data-testid="ui-garage-undo"
          disabled={busy || !garageState.canUndo}
          title="Undo the last Garage edit"
          onClick={garageStore.undo}
        >
          Undo
        </button>
        <button
          type="button"
          className="sos-btn sos-btn-ghost"
          data-testid="ui-garage-redo"
          disabled={busy || !garageState.canRedo}
          title="Redo the last undone Garage edit"
          onClick={garageStore.redo}
        >
          Redo
        </button>
      </div>
      <GarageLayoutSection productId={garageState.primaryAssetId} busy={busy} />
    </>
  );
}

// Garage G8 — save/load named layouts. Saves ONLY garageStore's per-part
// overrides (Owner decision 1: never the camera, selection, whole-model
// transform panel or Materials panel) into localStorage, one key per product
// via layoutLibrary.js's injected-storage helpers, plus a plain .json
// download/upload backup. productId is garageState.primaryAssetId, which
// StudioCanvas already sets to the live product id on every stage mount, so
// no extra plumbing is needed to know "the current product". Loading goes
// through garageStore.loadPartsOverrides so it is exactly one undo step.
// Garage G7b — saves also carry every added object (formatVersion 2), and a
// format-2 load replaces the added objects too, still as one undo step.
// Garage G7b — what a saved object records about its asset, and whether an
// asset is available in this browser (built-ins, plus imported assets from
// the Asset Library, which the runtime registry mirrors into PRODUCTS).
function describeAsset(assetId) {
  const p = PRODUCTS.find((x) => x.id === assetId);
  return p ? { source: p.source === "imported" ? "imported" : "builtin", name: p.name } : null;
}

function assetExists(assetId) {
  return PRODUCTS.some((p) => p.id === assetId && !p.placeholder && p.modelPath);
}

function GarageLayoutSection({ productId, busy }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [pendingOverwrite, setPendingOverwrite] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // refreshKey has no direct read below — bumping it forces a re-read of
  // localStorage after a save/delete, which happens outside React state.
  const layouts = useMemo(() => {
    if (typeof localStorage === "undefined" || !productId) return [];
    return layoutLibrary.listLayouts(localStorage, productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const saveReasonMessage = (reason) => {
    if (reason === "bad-name") return "Enter a name (1-60 characters) before saving.";
    if (reason === "bad-product") return "No product is loaded yet.";
    if (reason === "storage-error") return "Could not save: browser storage is unavailable or full.";
    return "This layout could not be saved.";
  };

  const runSave = (overwrite) => {
    if (typeof localStorage === "undefined" || !productId) {
      setMessage("No product is loaded yet.");
      return;
    }
    const layout = garageStore.getLayout();
    if (!layout) {
      setMessage("No layout to save yet.");
      return;
    }
    // Garage G7b — every save is formatVersion 2: the main product's part
    // edits plus every added object (its source, name, transform, hidden).
    const r = layoutLibrary.saveLayout(localStorage, { productId, name, layout, overwrite, describeAsset });
    if (!r.ok) {
      if (r.reason === "exists") {
        setPendingOverwrite(r.existing.name);
        setMessage(`"${r.existing.name}" already exists — Overwrite?`);
      } else {
        setPendingOverwrite(null);
        setMessage(saveReasonMessage(r.reason));
      }
      return;
    }
    setPendingOverwrite(null);
    const n = r.envelope.objects.length;
    setMessage(n > 0 ? `Saved "${r.envelope.name}" with ${n} added object${n === 1 ? "" : "s"}.` : `Saved "${r.envelope.name}".`);
    refresh();
  };

  // Shared by "Load" (a saved-list row) and Upload (a file picked from disk):
  // wrong-product is refused before anything is touched (Owner decision 3),
  // then matching parts are applied and the rest counted as skipped (decision
  // 4), as one garageStore commit (decision 5).
  // Garage G7b — a formatVersion 1 envelope still takes exactly that path
  // (added objects untouched). A formatVersion 2 envelope goes through the
  // stage's loadObjects, which loads its objects and REPLACES the added
  // objects and the parts in one commit; objects whose asset is not in this
  // browser are skipped and counted. Only the newest load writes its result.
  const loadSeqRef = useRef(0);
  const applyEnvelope = async (raw) => {
    if (!productId) {
      setMessage("No product is loaded yet.");
      return;
    }
    const resolved = layoutLibrary.resolveLoad(raw, productId, (id) => garageMode.describePart(id) !== null, assetExists);
    if (!resolved.ok) {
      if (resolved.reason === "wrong-product") {
        setMessage(`Refused: this layout was saved for "${resolved.productId}", not the current product.`);
      } else if (resolved.reason === "max-objects") {
        setMessage(resolved.message);
      } else {
        setMessage("This layout is not valid and was not applied.");
      }
      return;
    }
    const layout = garageStore.getLayout();
    const item = layout ? layout.items.find((i) => i.primary) : null;
    if (!item) {
      setMessage("No model is loaded yet.");
      return;
    }
    if (resolved.objects === null) {
      const r = garageStore.loadPartsOverrides(item.itemId, resolved.parts);
      if (!r.ok) {
        setMessage("This layout could not be applied.");
        return;
      }
      setMessage(layoutLibrary.loadResultMessage({ name: resolved.name, partsSkipped: resolved.skipped }));
      return;
    }
    const api = garageMode.apiRef.current;
    if (!api || typeof api.loadObjects !== "function") {
      setMessage("The stage is not ready yet; the layout was not loaded.");
      return;
    }
    if (resolved.skippedObjects.length > 0 && !isHydrated()) {
      setMessage("The Asset Library is still loading; try again in a moment.");
      return;
    }
    const seq = (loadSeqRef.current += 1);
    setMessage("Loading layout...");
    const r = await api.loadObjects(resolved.parts, resolved.objects);
    if (loadSeqRef.current !== seq) return;
    if (!r || !r.ok) {
      setMessage(r && r.message ? r.message : "This layout could not be applied; nothing was changed.");
      return;
    }
    setMessage(
      layoutLibrary.loadResultMessage({
        name: resolved.name,
        partsSkipped: resolved.skipped,
        skippedObjects: [...resolved.skippedObjects, ...r.skipped],
      })
    );
  };

  const doDelete = (entryName) => {
    if (typeof localStorage === "undefined" || !productId) return;
    layoutLibrary.deleteLayout(localStorage, productId, entryName);
    if (pendingOverwrite === entryName) setPendingOverwrite(null);
    setMessage(`Deleted "${entryName}".`);
    refresh();
  };

  const doDownload = (entry) => {
    const text = layoutLibrary.serializeEnvelope(entry);
    if (!text) {
      setMessage("Could not prepare the download.");
      return;
    }
    const safe = entry.name.replace(/[^a-z0-9-_]+/gi, "_") || "layout";
    saveBlob(new Blob([text], { type: "application/json" }), `${safe}.json`);
  };

  const handleUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > layoutLibrary.MAX_UPLOAD_BYTES) {
      setMessage("That file is too large (over 1 MB) and was not read.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = layoutLibrary.parseEnvelopeJson(text);
      if (!parsed.ok) {
        setMessage("That file is not a valid layout and was not applied.");
        return;
      }
      applyEnvelope(parsed.envelope);
    };
    reader.onerror = () => setMessage("Could not read that file.");
    reader.readAsText(file);
  };

  return (
    <>
      <span className="sos-label">Layouts</span>
      <label className="sos-field">
        <em>Name</em>
        <input
          type="text"
          data-testid="ui-garage-layout-name"
          disabled={busy}
          value={name}
          maxLength={60}
          onChange={(e) => {
            setName(e.target.value);
            setPendingOverwrite(null);
          }}
        />
      </label>
      <div className="sos-frow">
        <button
          type="button"
          className="sos-btn sos-btn-ghost"
          data-testid="ui-garage-layout-save"
          disabled={busy || layoutLibrary.cleanLayoutName(name) === null}
          title="Save the current part edits and added objects as a named layout"
          onClick={() => runSave(false)}
        >
          Save
        </button>
        <label
          className="sos-btn sos-btn-ghost"
          style={{ display: "inline-flex", alignItems: "center", cursor: busy ? "default" : "pointer" }}
        >
          Upload .json
          <input
            type="file"
            accept="application/json,.json"
            data-testid="ui-garage-layout-upload"
            disabled={busy}
            style={{ display: "none" }}
            onChange={handleUpload}
          />
        </label>
      </div>
      {pendingOverwrite ? (
        <div className="sos-frow">
          <button
            type="button"
            className="sos-btn sos-btn-ghost"
            data-testid="ui-garage-layout-overwrite"
            disabled={busy}
            onClick={() => runSave(true)}
          >
            Overwrite
          </button>
          <button
            type="button"
            className="sos-btn sos-btn-ghost"
            data-testid="ui-garage-layout-cancel-overwrite"
            disabled={busy}
            onClick={() => setPendingOverwrite(null)}
          >
            Cancel
          </button>
        </div>
      ) : null}
      {message ? (
        <p className="sos-hint" data-testid="ui-garage-layout-status">
          <span>{message}</span>
        </p>
      ) : null}
      {layouts.length === 0 ? (
        <p className="sos-hint">
          <span>No saved layouts for this product yet.</span>
        </p>
      ) : (
        <div data-testid="ui-garage-layout-list">
          {layouts.map((entry) => (
            <div className="sos-frow" key={entry.name} data-testid="ui-garage-layout-row" data-layout-name={entry.name}>
              <span className="sos-hint" style={{ flex: 1 }}>
                <span>{entry.name}</span>
              </span>
              <button
                type="button"
                className="sos-btn sos-btn-ghost"
                data-testid="ui-garage-layout-load"
                disabled={busy}
                title={`Load "${entry.name}"`}
                onClick={() => applyEnvelope(entry)}
              >
                Load
              </button>
              <button
                type="button"
                className="sos-btn sos-btn-ghost"
                data-testid="ui-garage-layout-download"
                disabled={busy}
                title={`Download "${entry.name}" as .json`}
                onClick={() => doDownload(entry)}
              >
                Download
              </button>
              <button
                type="button"
                className="sos-btn sos-btn-ghost"
                data-testid="ui-garage-layout-delete"
                disabled={busy}
                title={`Delete "${entry.name}"`}
                onClick={() => doDelete(entry.name)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function InspectorRail({
  dodgeBelow = 0,
  collapsed = false,
  onCollapse,
}) {
  const [openId, setOpenId] = useState("camera");

  // Render chips highlight the engine's live Format select (null = no panel).
  const [exportFormat, setExportFormat] = useState(null);
  useEffect(() => {
    if (openId !== "render") return undefined;
    const sync = (e) => {
      if (!e || !e.target || !e.target.matches || e.target.matches(FORMAT_SELECT)) {
        setExportFormat(readExportFormat());
      }
    };
    // initial read + follow the engine's own select while the card is open
    const t = setTimeout(sync, 0);
    document.addEventListener("change", sync, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener("change", sync, true);
    };
  }, [openId]);

  // Camera: sliders and the Custom (unsaved) tag read the camera store (a
  // read-only snapshot of the live camera); the framing chips highlight from
  // the engine cards' data-active, which App clears while the view is live.
  const camState = useSyncExternalStore(
    cameraStudio.subscribe,
    cameraStudio.getSnapshot,
    cameraStudio.getSnapshot
  );
  // Animate (Phase 16B Slice B): the Turntable preview's snapshot. While it
  // previews, the controls that would fight it are disabled here (the shell CSS
  // shield, body[data-anim], covers the header and the engine panel).
  const animState = useSyncExternalStore(
    animationStore.subscribe,
    animationStore.getSnapshot,
    animationStore.getSnapshot
  );
  // Garage G3: the Parts switch and the part selection (both external stores).
  const garageModeState = useSyncExternalStore(
    garageMode.subscribe,
    garageMode.getSnapshot,
    garageMode.getSnapshot
  );
  const garageState = useSyncExternalStore(
    garageStore.subscribe,
    garageStore.getSnapshot,
    garageStore.getSnapshot
  );
  const animPreviewing = animState.mode === "previewing";
  const animExporting = animState.mode === "exporting";
  // Any non-idle mode disables the controls that would fight the animation.
  const animBusy = animState.mode !== "idle";
  // Whether this browser can export an MP4 at all (checked once, on mount;
  // null = still checking). The result is ignored if the rail unmounted.
  const [exportSupport, setExportSupport] = useState(null);
  useEffect(() => {
    let alive = true;
    checkExportSupport().then((r) => {
      if (alive) setExportSupport(r);
    });
    return () => {
      alive = false;
    };
  }, []);
  // Cleanup slice: the export buttons wait for the backdrop ("failed" never
  // blocks), and a Reel export holds the Garage lock until it ends, however
  // it ends (finished, cancelled or stopped).
  const gate = useSyncExternalStore(backdropGate.subscribe, backdropGate.getSnapshot, backdropGate.getSnapshot);
  const gateBlocked = !exportsAllowed(gate);
  const handleExportClick = useCallback(async () => {
    const r = await withExportLock(garageStore, () => exportReel());
    if (r.ok) saveBlob(r.blob, r.filename);
  }, []);
  const [activeCard, setActiveCard] = useState(null);
  useEffect(() => {
    const root = document.querySelector("[data-studio-controls]");
    if (!root) return undefined;
    const sync = () => setActiveCard(readActiveCameraCard());
    const t = setTimeout(sync, 0);
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-active"],
    });
    return () => {
      clearTimeout(t);
      observer.disconnect();
    };
  }, []);

  // Materials chips read the live materials store (the one MaterialsManager
  // subscribes to): they enable once a model's materials are ready and
  // highlight the preset currently applied to the focused material.
  const matState = useSyncExternalStore(
    materialStore.subscribe,
    materialStore.getSnapshot,
    materialStore.getSnapshot
  );
  const materialsReady = matState.status === "ready" && matState.entries.length > 0;
  const handleMaterialSelect = useCallback((label) => {
    const id = MATERIAL_CHIP_PRESETS[label];
    if (id) materialStore.applyPreset(id);
  }, []);

  // Mission 13C — which mood preset (if any) matches the rig's live values.
  // null = no chip highlighted (the default and every manually adjusted state).
  const [activeMoodId, setActiveMoodId] = useState(null);
  const refreshActiveMood = useCallback(() => {
    const match = findActiveMoodPreset(readLiveLighting());
    setActiveMoodId(match ? match.id : null);
  }, []);

  // The highlight is maintained from event handlers only (never from an
  // effect body): recompute when the Lighting card opens, clear it whenever
  // the card closes or another section takes the accordion, and recompute on
  // every change of any engine lighting slider (see the listener below), so a
  // manual slider move un-highlights the chip.
  const openSection = (id) => {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next === "lighting") refreshActiveMood();
    else if (openId === "lighting") setActiveMoodId(null);
  };
  // From the collapsed strip: bring the rail back with that section open.
  const openFromStrip = (id) => {
    setOpenId(id);
    if (id === "lighting") refreshActiveMood();
    else if (openId === "lighting") setActiveMoodId(null);
    onCollapse?.();
  };

  const handleMoodSelect = useCallback((label) => {
    const preset = moodPresetForLabel(label);
    if (!preset) return; // label with no preset — stay inert
    if (applyMoodPreset(preset.values)) setActiveMoodId(preset.id);
  }, []);

  // While the Lighting card is open, listen for the engine sliders' own input
  // events (they bubble to document) and keep the highlight in sync with the
  // rig's real values.
  useEffect(() => {
    if (openId !== "lighting") return;
    const onLightInput = (e) => {
      const t = e.target;
      if (t && t.dataset && String(t.dataset.testid || "").startsWith("light-")) {
        refreshActiveMood();
      }
    };
    document.addEventListener("input", onLightInput, true);
    return () => document.removeEventListener("input", onLightInput, true);
  }, [openId, refreshActiveMood]);

  return (
    <aside
      className="sos-rail sos-panel"
      aria-label="Inspector"
      // the engine's Studio Controls panel owns the top of this column
      style={dodgeBelow ? { "--sos-dodge": `${dodgeBelow}px` } : undefined}
    >
      <div className="sos-rail-head">
        <button
          type="button"
          className="sos-collapse"
          data-testid="ui-rail-collapse"
          aria-label={collapsed ? "Expand inspector" : "Collapse inspector to icons"}
          title={collapsed ? "Expand inspector" : "Collapse to icons — gives the stage the room back"}
          onClick={onCollapse}
        >
          <Icon name="chevron" size={12} stroke={2} />
        </button>
        <div className="sos-chips">
          {RAIL_CHIPS.map((chip) => (
            <span key={chip.id} className="sos-chip" data-live={chip.live || undefined}>
              {chip.text}
            </span>
          ))}
        </div>
      </div>

      {gate.status === BACKDROP_STATUS.FAILED ? (
        <p className="sos-hint" role="alert" data-testid="ui-backdrop-warning">
          <span>{BACKDROP_FAILED_WARNING}</span>
        </p>
      ) : null}

      <div className="sos-rail-scroll">
        {SECTIONS.map((section) => (
          <RailCard
            key={section.id}
            section={section}
            open={openId === section.id}
            collapsed={collapsed}
            onOpenFromStrip={() => openFromStrip(section.id)}
            onToggle={() => openSection(section.id)}
          >
            {section.id === "camera" ? (
              <>
                <div className="sos-field-top">
                  <span className="sos-label">Framing</span>
                  {camState.live ? (
                    <span className="sos-pchip-badge" data-testid="ui-camera-live-tag">
                      Custom (unsaved)
                    </span>
                  ) : null}
                </div>
                <Chips
                  items={CAMERA_FRAMINGS}
                  onSelect={applyCameraPreset}
                  disabled={animBusy}
                  isActive={(t) => !camState.live && activeCard === t}
                />
                <div className="sos-fields">
                  <CameraSlider
                    label="Distance"
                    testId="ui-camera-distance"
                    value={camState.distancePct}
                    min={cameraStudio.DISTANCE_MIN}
                    max={cameraStudio.DISTANCE_MAX}
                    disabled={!camState.ready || animBusy}
                    onChange={cameraStudio.setDistancePct}
                  />
                  <CameraSlider
                    label="Height"
                    testId="ui-camera-height"
                    value={camState.heightPct}
                    min={cameraStudio.HEIGHT_MIN}
                    max={cameraStudio.HEIGHT_MAX}
                    disabled={!camState.ready || animBusy}
                    onChange={cameraStudio.setHeightPct}
                  />
                </div>
                <div className="sos-frow">
                  <button
                    type="button"
                    className="sos-pchip"
                    data-testid="ui-camera-lock"
                    data-on={camState.lock || undefined}
                    aria-pressed={camState.lock}
                    disabled={!camState.ready || animBusy}
                    title={
                      camState.lock
                        ? "Lock focus is ON: the view stays centred on the model. Click to turn OFF."
                        : "Lock focus is OFF. Click to centre the view on the model and lock it."
                    }
                    onClick={() => cameraStudio.setLock(!camState.lock)}
                  >
                    Lock focus on product
                  </button>
                </div>
                <Hint>
                  One-tap framing. Distance is % of the shot's distance; Height
                  tilts the view. Moving the camera makes it Custom (unsaved).
                  Lock ON keeps the view centred on the model and disables
                  right-drag pan.
                </Hint>
              </>
            ) : section.id === "lighting" ? (
              <>
                <Chips
                  items={INSPECTOR_PLACEHOLDERS.lighting}
                  onSelect={handleMoodSelect}
                  activeMoodId={activeMoodId}
                />
                <Hint>
                  One-click presets — drives the live rig; the panel's sliders
                  stay in sync.
                </Hint>
              </>
            ) : section.id === "materials" ? (
              <>
                <Chips
                  items={INSPECTOR_PLACEHOLDERS.materials}
                  onSelect={handleMaterialSelect}
                  isActive={(t) =>
                    materialsReady && materialStore.matchesPreset(MATERIAL_CHIP_PRESETS[t])
                  }
                  disabled={!materialsReady}
                />
                <Hint>
                  Applies to the selected material — full editor in the
                  Materials panel.
                </Hint>
              </>
            ) : section.id === "animate" ? (
              <>
                <span className="sos-label">Preset</span>
                <div className="sos-frow">
                  <span className="sos-pchip" data-on data-testid="ui-anim-turntable">
                    Turntable
                  </span>
                </div>
                <span className="sos-label">Duration</span>
                <div className="sos-frow">
                  {animationStore.DURATIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="sos-pchip"
                      data-testid={`ui-anim-duration-${n}`}
                      data-on={animState.durationS === n || undefined}
                      aria-pressed={animState.durationS === n}
                      disabled={animBusy}
                      onClick={() => animationStore.setDurationS(n)}
                    >
                      {n} s
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="sos-btn sos-btn-ghost sos-rail-export"
                  data-testid="ui-anim-play"
                  disabled={animExporting || (!animState.ready && !animPreviewing)}
                  title={
                    animPreviewing
                      ? "Stop the turntable preview"
                      : "Play the turntable preview: the model turns about its own centre (loops)"
                  }
                  onClick={() => (animPreviewing ? animationStore.stop() : animationStore.play())}
                >
                  {animPreviewing ? "Stop" : "Play"}
                </button>
                <Hint>
                  {animPreviewing
                    ? "Playing. Click the model or press Esc to stop."
                    : animState.ready
                      ? "Spins the model about its own centre; the camera stays put. Loops."
                      : "Loading model"}
                </Hint>
                <span className="sos-label">Reel export</span>
                <button
                  type="button"
                  className="sos-btn sos-btn-ghost sos-rail-export"
                  data-testid="ui-anim-export"
                  disabled={
                    animExporting
                      ? false
                      : gateBlocked || !(animState.ready && animState.mode === "idle" && exportSupport?.ok)
                  }
                  title={
                    animExporting
                      ? "Cancel the running export"
                      : gateBlocked
                        ? "Waiting for the environment backdrop to load"
                        : "Render the turntable at 1080x1920 and save it as an MP4"
                  }
                  onClick={animExporting ? animationStore.cancelExport : handleExportClick}
                >
                  {animExporting ? "Cancel export" : gateBlocked ? GATE_LABEL : "Export Reel (MP4)"}
                </button>
                <Hint>
                  {animExporting
                    ? `Exporting ${animState.progress}% - keep this tab visible.`
                    : exportSupport === null
                      ? "Checking MP4 support..."
                      : !exportSupport.ok
                        ? `${exportSupport.reason} MP4 export needs a current Edge or Chrome on localhost or https.`
                        : animState.message
                          ? animState.message
                          : "1080x1920 - 30 fps - silent. On this PC an export can take a while: keep this tab visible."}
                </Hint>
              </>
            ) : section.id === "garage" ? (
              <GarageSection
                pickMode={garageModeState.pickMode}
                garageState={garageState}
                busy={animState.mode !== "idle" || garageState.locked}
              />
            ) : (
              <>
                <span className="sos-label">Format</span>
                <Chips
                  items={INSPECTOR_PLACEHOLDERS.render.filter((t) => RENDER_CHIP_FORMATS[t])}
                  onSelect={applyExportFormat}
                  isActive={(t) => exportFormat === RENDER_CHIP_FORMATS[t]}
                />
                {INSPECTOR_PLACEHOLDERS.render.some((t) => !RENDER_CHIP_FORMATS[t]) ? (
                  <div className="sos-frow">
                    {INSPECTOR_PLACEHOLDERS.render
                      .filter((t) => !RENDER_CHIP_FORMATS[t])
                      .map((t) => (
                        <span
                          key={t}
                          className="sos-pchip"
                          aria-disabled="true"
                          title={`${t} — reserved, not wired in this build`}
                        >
                          {t}
                          <span className="sos-pchip-badge">Reserved</span>
                        </span>
                      ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="sos-btn sos-btn-ghost sos-rail-export"
                  data-testid="ui-rail-export-png"
                  disabled={animBusy || gateBlocked}
                  title={
                    gateBlocked
                      ? "Waiting for the environment backdrop to load"
                      : "Export PNG — captures the current view with the chosen format (same as Capture Shot)"
                  }
                  onClick={exportPng}
                >
                  <Icon name="upload" size={15} />
                  {gateBlocked ? GATE_LABEL : "Export PNG"}
                </button>
                <Hint>
                  Same capture as Capture Shot: opens the preview, where
                  Download PNG saves the file.
                </Hint>
              </>
            )}
          </RailCard>
        ))}
      </div>

      <div className="sos-rail-foot">
        <span className="sos-meta">
          CAMERA · LIGHTING · MATERIALS · RENDER LIVE
        </span>
      </div>
    </aside>
  );
}
