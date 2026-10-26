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
import { canAdd, durationAllowed } from "../animation/reelSequence";
import * as reelKeys from "../animation/reelKeys";
import * as reelCycles from "../animation/reelCycles";
import ReelSection from "./ReelSection";
import { BrandingSection, ShotTitleEdit } from "./ReelBranding";
import { brandingSummary, useBranding } from "./useBranding";
import { PIVOT_IDS, PIVOT_LABELS } from "../animation/partKeys";
import * as garageStore from "../garage/garageStore";
import * as garageMode from "../garage/garageMode";
import * as layoutLibrary from "../garage/layoutLibrary";
import * as sceneObjects from "../garage/sceneObjects";
import * as gizmo from "../garage/gizmo";
import { placedPose } from "../garage/placedPoses";
import * as placeMode from "../garage/placeMode";
import * as effectsStore from "../fx/effectsStore";
import CameraDirector from "./CameraDirector";
import { hasCamKeys } from "../animation/cameraKeys";
import { PROPS } from "../products/props";
import * as measure from "../garage/measure";
import { PRODUCTS, getAsset, getProduct, presetLabel } from "../products/registry";
import * as currentProduct from "../products/currentProduct";
import { CAMERA_PRESETS } from "../camera/presets";
import { isHydrated, useRuntimeAssets } from "../assets/runtimeRegistry";
import { checkExportSupport, exportReel, exportShotSequence, saveBlob } from "../animation/exporter";
import { exportPng } from "./engineCapture";
import PosterPanel from "./PosterPanel";
import * as shotStore from "../animation/shotStore";
import * as lowerThirdStore from "../animation/lowerThirdStore.js";
import { shotStatus } from "../animation/shotStore";
import { SHOTS as shotDefs } from "../animation/shotDefs";
import {
  backdropGate,
  exportsAllowed,
  withExportLock,
  clampFieldScale,
  BACKDROP_STATUS,
  GATE_LABEL,
  BACKDROP_FAILED_WARNING,
} from "../capture/exportGate";
import * as gradeStore from "../fx/gradeStore.js";
import { GRADES, GRADE_IDS } from "../fx/gradeShader.js";

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
  { id: "grade", name: "Grade", sub: "cinematic look", icon: "film" },
  { id: "animate", name: "Animate", sub: "turntable preview", icon: "film" },
  { id: "garage", name: "Garage", sub: "pick parts by click", icon: "frame" },
  { id: "poster", name: "Poster", sub: "PNG poster overlay", icon: "swatch" },
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
   (data-preset-name="<Name>", Slice C2c; the visible text and title carry the
   product's display label) with a real click. That runs App's existing
   handleCameraPreset, so there is no second camera state. An absent panel or
   an unknown name is a graceful no-op.
   -------------------------------------------------------------------------- */

// The engine's cards carry data-active (true while that preset is the active,
// not-live view). Chip highlight follows them; null when none / no panel.
function readActiveCameraCard() {
  // document-wide: the Camera dock sheet may have moved the cards out of
  // [data-studio-controls] (ui/slots.js)
  const el = document.querySelector('button[data-active="true"][data-preset-name]');
  return el ? el.dataset.presetName : null;
}

function applyCameraPreset(name) {
  const el = [...document.querySelectorAll("button[data-preset-name]")].find((b) => b.dataset.presetName === name);
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

// labelOf (Slice C2c, optional): the text shown for an item; the item itself
// is still what onSelect / isActive receive.
function Chips({ items, onSelect, activeMoodId, isActive, disabled, labelOf = (t) => t }) {
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
            title={`Apply the ${labelOf(text)} preset`}
            onClick={() => onSelect(text)}
          >
            {labelOf(text)}
          </button>
        ) : (
          <span key={text} className="sos-pchip">
            {labelOf(text)}
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

// Slice U1 Stage B1 — the Distance / Height sliders, extracted so the dock's
// Camera sheet and the rail's Camera card render the very same component (it
// reads the camera store itself, so neither host owns a copy of any state).
export function CameraSliders() {
  const camState = useSyncExternalStore(
    cameraStudio.subscribe,
    cameraStudio.getSnapshot,
    cameraStudio.getSnapshot
  );
  const animState = useSyncExternalStore(
    animationStore.subscribe,
    animationStore.getSnapshot,
    animationStore.getSnapshot
  );
  const disabled = !camState.ready || animState.mode !== "idle";
  return (
    <div className="sos-fields">
      <CameraSlider
        label="Distance"
        testId="ui-camera-distance"
        value={camState.distancePct}
        min={cameraStudio.DISTANCE_MIN}
        max={cameraStudio.DISTANCE_MAX}
        disabled={disabled}
        onChange={cameraStudio.setDistancePct}
      />
      <CameraSlider
        label="Height"
        testId="ui-camera-height"
        value={camState.heightPct}
        min={cameraStudio.HEIGHT_MIN}
        max={cameraStudio.HEIGHT_MAX}
        disabled={disabled}
        onChange={cameraStudio.setHeightPct}
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

// Cinematic Grade (post-processing presets). Live-viewport only: the engine's
// EffectComposer pipeline rebuilds on gradeId, and export frames bypass it.
// The grade selector reads the store with useSyncExternalStore — no local
// useState mirrors it, so the UI can never drift from the engine.
function GradePanel() {
  const gradeId = useSyncExternalStore(
    gradeStore.subscribe,
    gradeStore.getSnapshot,
    gradeStore.getSnapshot
  ).gradeId;
  return (
    <div className="sos-group">
      <div className="sos-group-head">
        <span className="sos-eyebrow">Grade</span>
      </div>
      <div className="sos-chips">
        {GRADE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className="sos-chip"
            data-on={gradeId === id || undefined}
            onClick={() => gradeStore.setGrade(id)}
          >
            {GRADES[id].label}
          </button>
        ))}
      </div>
      <Hint>Live-viewport post-processing. Export frames stay raw.</Hint>
    </div>
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

// Quick placement: sliders named the way people think about a set (left/right,
// back/front, height, turn, size). A drag is one undo step (a store gesture);
// a keyboard step outside a drag is one step each.
const PLACEMENT_SLIDERS = [
  { key: "x", label: "Left / right", min: -6, max: 6, step: 0.01, fmt: (v) => `${v.toFixed(2)} m` },
  { key: "z", label: "Back / front", min: -6, max: 6, step: 0.01, fmt: (v) => `${v.toFixed(2)} m` },
  { key: "y", label: "Height", min: -0.5, max: 4, step: 0.01, fmt: (v) => `${v.toFixed(2)} m` },
  { key: "ry", label: "Turn", min: -180, max: 180, step: 1, fmt: (v) => `${Math.round(v)}°` },
  { key: "s", label: "Size", min: 0.05, max: 5, step: 0.01, fmt: (v) => `×${v.toFixed(2)}` },
];
const wrapDeg = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

function GaragePlacementSliders({ itemId, t, busy }) {
  const dragging = useRef(false);
  const end = () => {
    if (!dragging.current) return;
    dragging.current = false;
    garageStore.endGesture();
  };
  return (
    <>
      <span className="sos-label">Quick placement</span>
      {PLACEMENT_SLIDERS.map((sl) => {
        const value = sl.key === "ry" ? wrapDeg(t.ry) : t[sl.key];
        return (
          <label key={sl.key} className="sos-field sos-slider-field">
            <em>{sl.label}</em>
            <input
              type="range"
              data-testid={`ui-garage-object-slider-${sl.key}`}
              min={sl.min}
              max={sl.max}
              step={sl.step}
              value={Math.min(sl.max, Math.max(sl.min, value))}
              disabled={busy}
              onPointerDown={() => {
                if (!dragging.current && garageStore.beginGesture().ok) dragging.current = true;
              }}
              onPointerUp={end}
              onBlur={end}
              onChange={(e) => garageStore.setItemTransform(itemId, { [sl.key]: Number(e.target.value) })}
            />
            <span className="sos-slider-value">{sl.fmt(value)}</span>
          </label>
        );
      })}
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
  const home = placedPose(itemId);
  return (
    <>
      <GaragePlacementSliders itemId={itemId} t={t} busy={busy} />
      <div className="sos-frow">
        <button
          type="button"
          className="sos-btn sos-btn-ghost"
          data-testid="ui-garage-object-duplicate"
          disabled={busy}
          title="Add a copy of this object beside it"
          onClick={async () => {
            const r = await api.addObject(obj.assetId, { transform: { ...t, x: t.x + 0.4 } });
            setMessage(r.ok ? `Duplicated "${obj.name}".` : r.message || "Could not duplicate it.");
          }}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="sos-btn sos-btn-ghost"
          data-testid="ui-garage-object-snap"
          disabled={busy || typeof api.getFloorY !== "function"}
          title="Stand this object on the ground (one undo step)"
          onClick={() => commit({ y: api.getFloorY() })}
        >
          Snap to ground
        </button>
        {home ? (
          <button
            type="button"
            className="sos-btn sos-btn-ghost"
            data-testid="ui-garage-object-put-back"
            disabled={busy}
            title="Return this object to where it was first placed (one undo step)"
            onClick={() => commit(home)}
          >
            Put back
          </button>
        ) : null}
      </div>
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

// Prop shelf: every prop by group; click one, then click the ground to place it
// there (real-world size, standing on the floor). Esc cancels.
const SHELF_GROUPS = [
  { label: "Halloween", test: (p) => p.seasonal === "halloween" },
  { label: "Trees, barrels & wood", test: (p) => /tree|barrel|firewood/.test(p.id) },
  { label: "BBQ & smoker", test: (p) => /smoker|utensils|letters|venue|box|coal/.test(p.id) },
  { label: "Food", test: () => true },
];

function GaragePropShelf({ busy, propCount }) {
  const max = sceneObjects.OBJECT_LIMITS.MAX_PROPS;
  const full = propCount >= max;
  const place = useSyncExternalStore(placeMode.subscribe, placeMode.getSnapshot, placeMode.getSnapshot);
  useEffect(() => {
    if (!place.assetId) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") placeMode.stopPlacing("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [place.assetId]);
  const left = [...PROPS];
  const groups = SHELF_GROUPS.map((g) => {
    const items = left.filter(g.test);
    for (const it of items) left.splice(left.indexOf(it), 1);
    return { label: g.label, items };
  }).filter((g) => g.items.length);
  const placingName = place.assetId ? (PROPS.find((p) => p.id === place.assetId) || {}).name : "";
  return (
    <>
      <span className="sos-label">
        Prop shelf · {propCount} / {max} props
      </span>
      {full ? (
        <p className="sos-hint">
          <span>The scene has the maximum {max} props. Remove one below to add another.</span>
        </p>
      ) : null}
      {groups.map((g) => (
        <div key={g.label} className="sos-shelf-group">
          <em className="sos-shelf-head">{g.label}</em>
          <div className="sos-shelf">
            {g.items.map((p) => (
              <button
                key={p.id}
                type="button"
                className="sos-pchip"
                data-testid={`ui-garage-shelf-${p.id}`}
                data-on={place.assetId === p.id || undefined}
                aria-pressed={place.assetId === p.id}
                disabled={busy || full}
                title={`Place "${p.name}": click it, then click the ground`}
                onClick={() => (place.assetId === p.id ? placeMode.stopPlacing("") : placeMode.startPlacing(p.id))}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="sos-hint" data-testid="ui-garage-shelf-status">
        <span>
          {place.assetId
            ? `Click the ground to place "${placingName}" · Esc to cancel`
            : place.message || "Pick a prop, then click the ground where you want it."}
        </span>
      </p>
    </>
  );
}

// Effects shelf: 3D effects placed like props (click one, click the ground).
function GarageEffectsShelf({ busy }) {
  const place = useSyncExternalStore(placeMode.subscribe, placeMode.getSnapshot, placeMode.getSnapshot);
  const { effects } = useSyncExternalStore(effectsStore.subscribe, effectsStore.getSnapshot, effectsStore.getSnapshot);
  const counts = {};
  return (
    <>
      <span className="sos-label">
        Effects · {effects.length} / {effectsStore.MAX_EFFECTS}
      </span>
      <div className="sos-shelf">
        {Object.entries(effectsStore.EFFECT_TYPES).map(([type, info]) => {
          const id = `fx:${type}`;
          return (
            <button
              key={type}
              type="button"
              className="sos-pchip"
              data-on={place.assetId === id || undefined}
              aria-pressed={place.assetId === id}
              disabled={busy || effects.length >= effectsStore.MAX_EFFECTS}
              title={`${info.label}: ${info.hint}. Click it, then click the ground.`}
              onClick={() => (place.assetId === id ? placeMode.stopPlacing("") : placeMode.startPlacing(id))}
            >
              {info.label}
            </button>
          );
        })}
      </div>
      {effects.map((e) => {
        counts[e.type] = (counts[e.type] || 0) + 1;
        const name = `${effectsStore.EFFECT_TYPES[e.type].label} ${counts[e.type]}`;
        return (
          <div key={e.id} className="sos-field sos-slider-field sos-fx-row">
            <em>{name}</em>
            <input
              type="range"
              id={`fx-size-${e.id}`}
              aria-label={`${name} size`}
              min={0.25}
              max={4}
              step={0.05}
              value={e.size}
              disabled={busy}
              onChange={(ev) => effectsStore.setEffectSize(e.id, Number(ev.target.value))}
            />
            <button type="button" className="sos-btn sos-btn-ghost" disabled={busy} title={`Remove ${name}`} onClick={() => effectsStore.removeEffect(e.id)}>
              Remove
            </button>
          </div>
        );
      })}
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
    const asset = it ? getAsset(it.assetId) : null;
    return asset ? asset.name : it ? it.assetId : itemId;
  };
  const singleObject = single && isObjectEntry(single) ? single : null;
  const first = count > 0 && !isObjectEntry(selection[0]) ? garageMode.describePart(selection[0].partId) : null;
  const names = selection
    .slice(0, 5)
    .map((e) => (isObjectEntry(e) ? `${objectName(e.itemId)} (object)` : garageMode.describePart(e.partId)?.name ?? e.partId));
  const propCount = layoutNow ? sceneObjects.countObjects(layoutNow.items.filter((i) => !i.primary)).props : 0;
  return (
    <>
      <GaragePropShelf busy={busy} propCount={propCount} />
      <GarageEffectsShelf busy={busy} />
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
  const p = getAsset(assetId);
  return p ? { source: p.source === "imported" ? "imported" : "builtin", name: p.name } : null;
}

function assetExists(assetId) {
  const p = getAsset(assetId);
  return !!p && !p.placeholder && !!p.modelPath;
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
      } else if (resolved.reason === "max-objects" || resolved.reason === "max-props") {
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

// Slice U1 — the Lighting section's content, extracted out of the big
// accordion's inline JSX so it can mount either inside this rail (the "old
// way", Stage A fallback for every other tool) or inside the new dock's
// Light sheet, with the mood bridge logic living in exactly one place. It
// only ever mounts while its host (a RailCard section or a Sheet) is
// visible, so a plain mount-time read is the right way to seed the
// highlight — the old code did the same read from an "on open" callback.
export function LightingPanel() {
  const [activeMoodId, setActiveMoodId] = useState(() => {
    const match = findActiveMoodPreset(readLiveLighting());
    return match ? match.id : null;
  });
  const refreshActiveMood = useCallback(() => {
    const match = findActiveMoodPreset(readLiveLighting());
    setActiveMoodId(match ? match.id : null);
  }, []);
  // Follow the engine sliders' own input events (they bubble to document) so
  // a manual slider move un-highlights the chip while this panel is mounted.
  useEffect(() => {
    const onLightInput = (e) => {
      const t = e.target;
      if (t && t.dataset && String(t.dataset.testid || "").startsWith("light-")) {
        refreshActiveMood();
      }
    };
    document.addEventListener("input", onLightInput, true);
    return () => document.removeEventListener("input", onLightInput, true);
  }, [refreshActiveMood]);
  const handleMoodSelect = useCallback((label) => {
    const preset = moodPresetForLabel(label);
    if (!preset) return; // label with no preset — stay inert
    if (applyMoodPreset(preset.values)) setActiveMoodId(preset.id);
  }, []);
  return (
    <>
      <Chips
        items={INSPECTOR_PLACEHOLDERS.lighting}
        onSelect={handleMoodSelect}
        activeMoodId={activeMoodId}
      />
      <Hint>
        One-click presets — drives the live rig; the Fine-tune sliders below
        stay in sync.
      </Hint>
    </>
  );
}

// Slice U1 Stage B2 - the rail's Camera / Animate / Garage card bodies, exported
// so the dock's Camera, Reel and Garage sheets render the very same components
// (each reads its own stores, so no host owns a copy of any state).
export function CameraFraming() {
  const camState = useSyncExternalStore(
    cameraStudio.subscribe,
    cameraStudio.getSnapshot,
    cameraStudio.getSnapshot
  );
  // Slice C2c: chips show the current product's display labels
  const productId = useSyncExternalStore(currentProduct.subscribe, currentProduct.getSnapshot, currentProduct.getSnapshot);
  const product = getProduct(productId);
  const framingLabel = (name) => {
    const p = presetByName(name);
    return p ? presetLabel(product, p) : name;
  };
  const animState = useSyncExternalStore(
    animationStore.subscribe,
    animationStore.getSnapshot,
    animationStore.getSnapshot
  );
  // the engine cards carry data-active; the chips follow them (document-wide:
  // a dock sheet may host the cards)
  const [activeCard, setActiveCard] = useState(null);
  useEffect(() => {
    const sync = () => setActiveCard(readActiveCameraCard());
    const t = setTimeout(sync, 0);
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
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
  return (
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
        labelOf={framingLabel}
        onSelect={applyCameraPreset}
        disabled={animState.mode !== "idle"}
        isActive={(t) => !camState.live && activeCard === t}
      />
    </>
  );
}

export function CameraLock() {
  const camState = useSyncExternalStore(
    cameraStudio.subscribe,
    cameraStudio.getSnapshot,
    cameraStudio.getSnapshot
  );
  const animState = useSyncExternalStore(
    animationStore.subscribe,
    animationStore.getSnapshot,
    animationStore.getSnapshot
  );
  return (
    <>
      <div className="sos-frow">
        <button
          type="button"
          className="sos-pchip"
          data-testid="ui-camera-lock"
          data-on={camState.lock || undefined}
          aria-pressed={camState.lock}
          disabled={!camState.ready || animState.mode !== "idle"}
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
        One-tap framing. Distance is % of the shot's distance; Height tilts the
        view. Moving the camera makes it Custom (unsaved). Lock ON keeps the
        view centred on the model and disables right-drag pan.
      </Hint>
    </>
  );
}

export function GaragePanel() {
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
  const animState = useSyncExternalStore(
    animationStore.subscribe,
    animationStore.getSnapshot,
    animationStore.getSnapshot
  );
  return (
    <GarageSection
      pickMode={garageModeState.pickMode}
      garageState={garageState}
      busy={animState.mode !== "idle" || garageState.locked}
    />
  );
}

// Slice C2a / C2b: the Reel shot moves and start views.
const REEL_PRESET_LABELS = {
  turntable: "Turntable",
  orbit: "Orbit",
  "push-in": "Push-in",
  "pull-back": "Pull-back reveal",
  slide: "Slide across",
  crane: "Crane up",
};
// Slice C2c: a stored start view (a preset name, or "custom") as the current
// product shows it (registry.presetLabel); the stored value never changes.
const presetByName = (name) => CAMERA_PRESETS.find((p) => p.name === name) ?? null;
const startViewLabelFor = (product, v) => {
  if (v === "custom") return "Custom";
  const p = presetByName(v);
  return p ? presetLabel(product, p) : v;
};
const startViewTestId = (v) => `ui-anim-start-${v === "3/4" ? "34" : v.toLowerCase().replace(/\s+/g, "-")}`;
const shotSummary = (s, viewLabel) => `${REEL_PRESET_LABELS[s.move]} · ${viewLabel(s.startView)} · ${s.durationS} s`;

// Slice C3b: the Custom easing's curve, a cubic Bezier from (0, 0) to (1, 1)
// with two draggable handles (time across, progress up). Handles are clamped
// by reelKeys.clampBezier (time 0..1, so it never runs backwards); the curve
// is committed to the key when the drag ends.
function CurveEditor({ bezier, disabled, onCommit }) {
  const W = 176;
  const H = 140;
  const PAD = 16;
  const [lo, hi] = reelKeys.BEZIER_Y_RANGE;
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null); // { h: 0 | 1, b: [x1, y1, x2, y2] } (shown while dragging)
  const dragRef = useRef(null); // the same, read by the pointer handlers (never a stale render)
  const b = drag ? drag.b : bezier;
  const px = (x, y) => [PAD + x * (W - 2 * PAD), PAD + ((hi - y) / (hi - lo)) * (H - 2 * PAD)];
  const fromClient = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W;
    const sy = ((e.clientY - r.top) / r.height) * H;
    return [(sx - PAD) / (W - 2 * PAD), hi - ((sy - PAD) / (H - 2 * PAD)) * (hi - lo)];
  };
  const moved = (e) => {
    const d = dragRef.current;
    const [x, y] = fromClient(e);
    const next = [...d.b];
    next[d.h * 2] = x;
    next[d.h * 2 + 1] = y;
    return { h: d.h, b: reelKeys.clampBezier(next) };
  };
  const onDown = (h) => (e) => {
    if (disabled) return;
    e.preventDefault();
    svgRef.current.setPointerCapture(e.pointerId);
    dragRef.current = { h, b: [...bezier] };
    setDrag(dragRef.current);
  };
  const onMove = (e) => {
    if (!dragRef.current) return;
    dragRef.current = moved(e);
    setDrag(dragRef.current);
  };
  const onUp = (e) => {
    if (!dragRef.current) return;
    const done = moved(e).b; // the release point itself
    dragRef.current = null;
    setDrag(null);
    onCommit(done);
  };
  const p0 = px(0, 0);
  const p1 = px(b[0], b[1]);
  const p2 = px(b[2], b[3]);
  const p3 = px(1, 1);
  const prog = [0.25, 0.5, 0.75].map((u) => reelKeys.easeProgress(reelKeys.CUSTOM_EASING, u, b).toFixed(3));
  return (
    <div className="sos-curve" data-testid="ui-curve">
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="sos-curve-svg"
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => {
          dragRef.current = null;
          setDrag(null);
        }}
        aria-label="Custom easing curve: drag the two handles"
      >
        <rect x={p0[0]} y={p3[1]} width={p3[0] - p0[0]} height={p0[1] - p3[1]} className="sos-curve-box" />
        <line x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} className="sos-curve-arm" />
        <line x1={p3[0]} y1={p3[1]} x2={p2[0]} y2={p2[1]} className="sos-curve-arm" />
        <path d={`M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${p3[0]} ${p3[1]}`} className="sos-curve-path" />
        {[p1, p2].map((p, h) => (
          <circle key={h} cx={p[0]} cy={p[1]} r={7} className="sos-curve-handle" data-testid={`ui-curve-h${h + 1}`} onPointerDown={onDown(h)} />
        ))}
      </svg>
      <span className="sos-reel-total" data-testid="ui-curve-values">
        handles {b.map((v) => v.toFixed(2)).join(", ")}
      </span>
      <span className="sos-reel-total" data-testid="ui-curve-progress">
        progress at 25 / 50 / 75%: {prog.join(" / ")}
      </span>
    </div>
  );
}

const REL_FIELDS = [
  ["x", "Move x", "m"],
  ["y", "Move y", "m"],
  ["z", "Move z", "m"],
  ["rx", "Rotate x", "deg"],
  ["ry", "Rotate y", "deg"],
  ["rz", "Rotate z", "deg"],
  ["s", "Scale", "x"],
];
const REST_REL = Object.freeze({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 });

// Slice C3a: the selected shot's KEYS (whole objects). Pick the main product
// (posed by the whole-model Transform panel) or an added Garage object (posed
// by the G11 gizmo), set the time (whole frames at 30 fps), and Add key
// captures that object's CURRENT transform. Go to puts the scrubber on the
// key and sets the object's transform to the key's (a normal edit: the
// Transform panel, or one Garage undo step), so it can be adjusted and keyed
// again. The warning re-checks the whole Reel (stage checkKeys) after every
// shot-list, key, Garage, product or Transform panel change; it never blocks
// Play or Export.
// Slice C3b: the picker also offers the main product's parts selected in the
// Garage (Parts on), keyed together as one group: a pivot (centre or one of
// the 12 edges of the group's box) and a RELATIVE move / rotate / scale typed
// here (never a Garage part edit). The easing chip ends with Custom, which
// opens the curve editor.
function ReelKeys({ sequence, shotIndex, busy, productId, onResult }) {
  const garageState = useSyncExternalStore(garageStore.subscribe, garageStore.getSnapshot, garageStore.getSnapshot);
  const layout = garageStore.getLayout();
  const added = layout ? layout.items.filter((i) => !i.primary) : [];
  const primaryId = layout ? layout.items.find((i) => i.primary)?.itemId : null;
  const shot = sequence[shotIndex];
  const keys = shot.keys ?? [];
  const frames = Math.round(shot.durationS * 30);
  const [frameRaw, setFrame] = useState(0);
  const frame = Math.max(0, Math.min(frameRaw, frames));
  // part groups: the Garage's current part selection, and the groups keyed in this shot
  const partName = (id) => garageMode.describePart(id)?.name ?? id.replace(/~\d+$/, "");
  const partGroups = new Map();
  const selectedParts = (garageState.selection || [])
    .filter((e) => e.itemId === primaryId && e.partId !== sceneObjects.OBJECT_PART_ID)
    .map((e) => e.partId);
  if (selectedParts.length) partGroups.set(reelKeys.partsTarget(selectedParts), [...selectedParts].sort());
  for (const k of keys) if (reelKeys.isPartKey(k) && !partGroups.has(k.target)) partGroups.set(k.target, k.parts);
  const groupLabel = (parts) => `Parts: ${partName(parts[0])}${parts.length > 1 ? ` + ${parts.length - 1} more` : ""}`;
  const [targetRaw, setTarget] = useState(reelKeys.PRODUCT_TARGET);
  const target =
    targetRaw === reelKeys.PRODUCT_TARGET || added.some((i) => i.itemId === targetRaw) || partGroups.has(targetRaw) ? targetRaw : reelKeys.PRODUCT_TARGET;
  const targetParts = partGroups.get(target) || null;
  const [pivotDraft, setPivotDraft] = useState("centre");
  const keyedPivot = targetParts ? keys.find((k) => k.target === target)?.pivot : null;
  const pivot = keyedPivot ?? pivotDraft;
  const [rel, setRel] = useState(REST_REL);
  const [openCurve, setOpenCurve] = useState(null); // the target + time of the key whose curve is open
  const scene = {
    productId,
    items: added.map((i) => ({ itemId: i.itemId, assetId: i.assetId })),
    hasPart: (id) => !!garageMode.describePart(id),
  };
  const productName = (id) => getAsset(id)?.name ?? id;
  const nameOf = (k) =>
    reelKeys.isPartKey(k)
      ? groupLabel(k.parts)
      : k.target === reelKeys.PRODUCT_TARGET
        ? `Main product (${productName(k.assetId)})`
        : `${describeAsset(k.assetId)?.name ?? k.assetId} (${k.target})`;
  const addCheck = reelKeys.canAddKey(keys, target, frame / 30);
  const missing = keys.filter((k) => !reelKeys.isKeyLive(k, scene)).length;

  const [warning, setWarning] = useState(null);
  const [checkTick, setCheckTick] = useState(0);
  // the Transform panel's values live in the engine: re-check when they change
  const [poseRev, setPoseRev] = useState(0);
  useEffect(() => {
    let last = JSON.stringify(animationStore.readProductTransform());
    const id = setInterval(() => {
      const now = JSON.stringify(animationStore.readProductTransform());
      if (now !== last) {
        last = now;
        setPoseRev((n) => n + 1);
      }
    }, 500);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (busy) return undefined;
    const id = setTimeout(() => setWarning(animationStore.checkKeys()), 300);
    return () => clearTimeout(id);
  }, [sequence, garageState.revision, productId, busy, checkTick, poseRev]);

  const handleAddKey = () => {
    if (targetParts) {
      return onResult(animationStore.addKey(shotIndex, { t: frame / 30, target, parts: targetParts, assetId: productId, pivot, transform: { ...rel } }));
    }
    const item = target === reelKeys.PRODUCT_TARGET ? null : added.find((i) => i.itemId === target);
    const transform = target === reelKeys.PRODUCT_TARGET ? animationStore.readProductTransform() : item ? item.transform : null;
    const assetId = target === reelKeys.PRODUCT_TARGET ? productId : item ? item.assetId : "";
    if (!transform) return onResult({ ok: false, reason: "That object is not in the scene." });
    return onResult(animationStore.addKey(shotIndex, { t: frame / 30, target, assetId, transform }));
  };
  const handleGoTo = (k) => {
    setFrame(Math.round(k.t * 30));
    if (!reelKeys.isKeyLive(k, scene)) return onResult({ ok: false, reason: "That key's object is not in the scene." });
    setTarget(k.target);
    if (reelKeys.isPartKey(k)) {
      setRel({ ...k.transform }); // part keys: back into the relative fields (no scene change)
      return onResult({ ok: true, reason: "" });
    }
    if (k.target === reelKeys.PRODUCT_TARGET) animationStore.writeProductTransform({ ...k.transform });
    else garageStore.setItemTransform(k.target, { ...k.transform });
    return onResult({ ok: true, reason: "" });
  };
  const handlePivot = (v) => {
    setPivotDraft(v);
    if (keyedPivot) onResult(animationStore.setKeyPivot(shotIndex, target, v));
  };
  const handleEasing = (k, i) => {
    const next = reelKeys.nextEasingWithCustom(k.easing);
    const r = animationStore.setKeyEasing(shotIndex, i, next);
    if (r.ok) setOpenCurve(next === reelKeys.CUSTOM_EASING ? `${k.target}@${k.t}` : null);
    return onResult(r);
  };
  const step = (n) => setFrame(Math.max(0, Math.min(frames, frame + n)));
  const warningText = warning
    ? `Warning: shot ${warning.shot + 1} at ${warning.t.toFixed(2)} s - ${
        warning.kind === "safe"
          ? "the keyed product leaves the Instagram safe area."
          : `the product's ground point is ${Math.round(warning.px)} px off the painted platform.`
      } Play and Export still work.`
    : "";

  return (
    <div className="sos-keys" data-testid="ui-keys">
      <div className="sos-reel-head">
        <span className="sos-label">Shot {shotIndex + 1}: keys</span>
        <span className="sos-reel-total" data-testid="ui-key-count">
          {keys.length} of {reelKeys.MAX_KEYS_PER_SHOT}
        </span>
      </div>
      <select
        className="sos2-input sos-key-target"
        data-testid="ui-key-target"
        value={target}
        disabled={busy}
        aria-label="Object to key"
        onChange={(e) => setTarget(e.target.value)}
      >
        <option value={reelKeys.PRODUCT_TARGET}>Main product ({productName(productId)})</option>
        {added.map((i) => (
          <option key={i.itemId} value={i.itemId}>
            {describeAsset(i.assetId)?.name ?? i.assetId} ({i.itemId})
          </option>
        ))}
        {[...partGroups.entries()].map(([t, parts]) => (
          <option key={t} value={t}>
            {groupLabel(parts)}
          </option>
        ))}
      </select>
      {targetParts ? (
        <>
          <span className="sos-reel-total" data-testid="ui-key-parts">
            {targetParts.length} {targetParts.length === 1 ? "part" : "parts"}: {targetParts.map(partName).join(", ")}
          </span>
          <label className="sos-key-field">
            <span className="sos-label">Pivot</span>
            <select className="sos2-input" data-testid="ui-key-pivot" value={pivot} disabled={busy} onChange={(e) => handlePivot(e.target.value)}>
              {PIVOT_IDS.map((id) => (
                <option key={id} value={id}>
                  {PIVOT_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          <div className="sos-key-rel">
            {REL_FIELDS.map(([f, label, unit]) => (
              <label key={f} className="sos-key-relfield">
                <span>
                  {label} ({unit})
                </span>
                <input
                  type="number"
                  className="sos2-input"
                  data-testid={`ui-key-rel-${f}`}
                  step={f.startsWith("r") ? 1 : f === "s" ? 0.05 : 0.01}
                  value={rel[f]}
                  disabled={busy}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    if (Number.isFinite(n) && (f !== "s" || n > 0)) setRel((r) => ({ ...r, [f]: n }));
                  }}
                />
              </label>
            ))}
          </div>
        </>
      ) : null}
      <div className="sos-key-time">
        <input
          type="range"
          data-testid="ui-key-time"
          min={0}
          max={frames}
          step={1}
          value={frame}
          disabled={busy}
          aria-label="Key time"
          onChange={(e) => setFrame(Number(e.target.value))}
        />
        <span className="sos-reel-total" data-testid="ui-key-time-value">
          {(frame / 30).toFixed(2)} s · frame {frame}
        </span>
      </div>
      <div className="sos-frow">
        {[
          ["start", "Start", () => setFrame(0)],
          ["back-s", "−1 s", () => step(-30)],
          ["back-f", "−1 f", () => step(-1)],
          ["fwd-f", "+1 f", () => step(1)],
          ["fwd-s", "+1 s", () => step(30)],
          ["end", "End", () => setFrame(frames)],
        ].map(([id, label, fn]) => (
          <button key={id} type="button" className="sos-pchip" data-testid={`ui-key-${id}`} disabled={busy} onClick={fn}>
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="sos-btn sos-btn-ghost sos-rail-export"
        data-testid="ui-key-add"
        disabled={busy || !addCheck.ok}
        title={
          addCheck.ok
            ? `Key the ${targetParts ? "parts" : target === reelKeys.PRODUCT_TARGET ? "main product" : "object"} at ${(frame / 30).toFixed(2)} s`
            : addCheck.reason
        }
        onClick={handleAddKey}
      >
        Add key
      </button>
      {!addCheck.ok ? (
        <p className="sos-reel-why" data-testid="ui-key-add-why">
          {addCheck.reason}
        </p>
      ) : null}
      {keys.length ? (
        <ol className="sos-reel-list" data-testid="ui-key-list">
          {keys.map((k, i) => {
            const live = reelKeys.isKeyLive(k, scene);
            const curveOpen = k.easing === reelKeys.CUSTOM_EASING && openCurve === `${k.target}@${k.t}`;
            return (
              <li key={`${k.target}-${k.t}`} className="sos-key-item">
                <div className="sos-key-row" data-live={live || undefined} data-testid={`ui-key-row-${i + 1}`}>
                  <span className="sos-key-sum">
                    {k.t.toFixed(2)} s · {nameOf(k)}
                    {live ? "" : " · not in the scene (ignored)"}
                    {reelKeys.isPartKey(k) ? <span className="sos-key-sub">pivot: {PIVOT_LABELS[k.pivot]}</span> : null}
                  </span>
                  <button
                    type="button"
                    className="sos-pchip"
                    data-testid={`ui-key-easing-${i + 1}`}
                    disabled={busy}
                    title={`Easing to the next key of this object. Click for ${reelKeys.easingLabel(reelKeys.nextEasingWithCustom(k.easing))}.`}
                    onClick={() => handleEasing(k, i)}
                  >
                    {reelKeys.easingLabel(k.easing)}
                  </button>
                  {k.easing === reelKeys.CUSTOM_EASING ? (
                    <button
                      type="button"
                      className="sos-reel-tool"
                      data-testid={`ui-key-curve-${i + 1}`}
                      disabled={busy}
                      aria-pressed={curveOpen}
                      title={curveOpen ? "Hide the curve" : "Edit the curve"}
                      onClick={() => setOpenCurve(curveOpen ? null : `${k.target}@${k.t}`)}
                    >
                      ∿
                    </button>
                  ) : null}
                  <button type="button" className="sos-reel-tool" data-testid={`ui-key-goto-${i + 1}`} disabled={busy} title="Go to this key" onClick={() => handleGoTo(k)}>
                    ⤴
                  </button>
                  <button
                    type="button"
                    className="sos-reel-tool"
                    data-testid={`ui-key-delete-${i + 1}`}
                    disabled={busy}
                    aria-label={`Delete key ${i + 1}`}
                    title="Delete this key"
                    onClick={() => onResult(animationStore.deleteKey(shotIndex, i))}
                  >
                    ✕
                  </button>
                </div>
                {curveOpen ? (
                  <CurveEditor bezier={k.bezier} disabled={busy} onCommit={(b) => onResult(animationStore.setKeyCurve(shotIndex, i, b))} />
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}
      {missing ? (
        <p className="sos-reel-why" data-testid="ui-key-missing">
          {missing} {missing === 1 ? "key targets an object or part" : "keys target objects or parts"} not in the scene (removed, another product, or a changed model): kept but ignored.
        </p>
      ) : null}
      {warningText ? (
        <p className="sos-reel-why sos-key-warning" data-testid="ui-key-warning">
          {warningText}
        </p>
      ) : null}
      <Hint>
        Pose the main product with the Transform panel, or an added object with the Garage gizmo, then Add key. For parts, select
        them in the Garage (Parts on, shift-click adds), pick them here, choose a pivot and type the move. Each key&apos;s easing
        shapes the move to that object&apos;s next key.{" "}
        <button type="button" className="sos-key-recheck" data-testid="ui-key-recheck" disabled={busy} onClick={() => setCheckTick((n) => n + 1)}>
          Check again
        </button>
      </Hint>
    </div>
  );
}

// Slice C4a: a cycle's number field. Typing commits every value that parses and
// is in range (the store refuses the rest); leaving the field shows the stored
// value again.
function CycleNumber({ testId, label, unit, value, step, min, max, disabled, onCommit }) {
  const [draft, setDraft] = useState(null);
  return (
    <label className="sos-key-relfield sos-cycle-num">
      <span>
        {label} ({unit})
      </span>
      <input
        type="number"
        className="sos2-input"
        data-testid={testId}
        step={step}
        min={min}
        max={max}
        value={draft ?? String(value)}
        disabled={disabled}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n) && n >= min && n <= max) onCommit(n);
        }}
        onBlur={() => setDraft(null)}
      />
    </label>
  );
}

// Slice C4a: the selected shot's CYCLES, looping motions that run for the whole
// shot from phase 0: Spin (rpm, or Roll with movement for part groups), Bob,
// Sway and Pulse. The target picker offers what KEYS offers (main product,
// added objects, the Garage's selected parts as one group) plus, owner
// decision, the selected parts' named parent group (e.g. a wheel whose 220
// meshes hang under one node). At most 6 cycles per shot.
function ReelCycles({ sequence, shotIndex, busy, productId, onResult }) {
  const garageState = useSyncExternalStore(garageStore.subscribe, garageStore.getSnapshot, garageStore.getSnapshot);
  const layout = garageStore.getLayout();
  const added = layout ? layout.items.filter((i) => !i.primary) : [];
  const primaryId = layout ? layout.items.find((i) => i.primary)?.itemId : null;
  const shot = sequence[shotIndex];
  const cycles = shot.cycles ?? [];
  const partName = (id) => garageMode.describePart(id)?.name ?? id.replace(/~\d+$/, "");
  const selectedParts = (garageState.selection || [])
    .filter((e) => e.itemId === primaryId && e.partId !== sceneObjects.OBJECT_PART_ID)
    .map((e) => e.partId);
  // the targets: { value -> { label, parts? | group? } }
  const groupTargets = new Map();
  const groupLabel = (parts) => `Parts: ${partName(parts[0])}${parts.length > 1 ? ` + ${parts.length - 1} more` : ""}`;
  const parentLabel = (path) => {
    const n = garageMode.describeGroup(path)?.parts;
    return `Group: ${reelCycles.groupName(path)}${n ? ` (${n} parts)` : ""}`;
  };
  if (selectedParts.length) {
    groupTargets.set(reelKeys.partsTarget(selectedParts), { label: groupLabel([...selectedParts].sort()), parts: [...selectedParts].sort() });
    const parent = reelCycles.sharedParent(selectedParts);
    if (parent && garageMode.describeGroup(parent)) groupTargets.set(reelCycles.groupTarget(parent), { label: parentLabel(parent), group: parent });
  }
  for (const c of cycles) {
    if (groupTargets.has(c.target)) continue;
    if (reelCycles.isPartsCycle(c)) groupTargets.set(c.target, { label: groupLabel(c.parts), parts: c.parts });
    else if (reelCycles.isGroupCycle(c)) groupTargets.set(c.target, { label: parentLabel(c.group), group: c.group });
  }
  const [targetRaw, setTarget] = useState(reelKeys.PRODUCT_TARGET);
  const target =
    targetRaw === reelKeys.PRODUCT_TARGET || added.some((i) => i.itemId === targetRaw) || groupTargets.has(targetRaw) ? targetRaw : reelKeys.PRODUCT_TARGET;
  const [type, setType] = useState("spin");
  const scene = {
    productId,
    items: added.map((i) => ({ itemId: i.itemId, assetId: i.assetId })),
    hasPart: (id) => !!garageMode.describePart(id),
    hasGroup: (path) => !!garageMode.describeGroup(path),
  };
  const productName = (id) => getAsset(id)?.name ?? id;
  const nameOf = (c) =>
    reelCycles.isPartsCycle(c)
      ? groupLabel(c.parts)
      : reelCycles.isGroupCycle(c)
        ? parentLabel(c.group)
        : c.target === reelKeys.PRODUCT_TARGET
          ? `Main product (${productName(c.assetId)})`
          : `${describeAsset(c.assetId)?.name ?? c.assetId} (${c.target})`;
  const addCheck = reelCycles.canAddCycle(cycles);
  const missing = cycles.filter((c) => !reelCycles.isCycleLive(c, scene)).length;
  const R = reelCycles.CYCLE_RANGES;

  const handleAdd = () => {
    const g = groupTargets.get(target);
    const item = added.find((i) => i.itemId === target);
    const assetId = g || target === reelKeys.PRODUCT_TARGET ? productId : item ? item.assetId : "";
    const cycle = { type, target, assetId, ...(g?.parts ? { parts: g.parts } : {}), ...(g?.group ? { group: g.group } : {}) };
    return onResult(animationStore.addCycle(shotIndex, cycle));
  };
  const set = (i, patch) => onResult(animationStore.setCycle(shotIndex, i, patch));
  const onParts = (c) => reelCycles.isPartsCycle(c) || reelCycles.isGroupCycle(c);

  return (
    <div className="sos-keys" data-testid="ui-cycles">
      <div className="sos-reel-head">
        <span className="sos-label">Shot {shotIndex + 1}: cycles</span>
        <span className="sos-reel-total" data-testid="ui-cycle-count">
          {cycles.length} of {reelCycles.MAX_CYCLES_PER_SHOT}
        </span>
      </div>
      <select className="sos2-input sos-key-target" data-testid="ui-cycle-target" value={target} disabled={busy} aria-label="Object or parts to cycle" onChange={(e) => setTarget(e.target.value)}>
        <option value={reelKeys.PRODUCT_TARGET}>Main product ({productName(productId)})</option>
        {added.map((i) => (
          <option key={i.itemId} value={i.itemId}>
            {describeAsset(i.assetId)?.name ?? i.assetId} ({i.itemId})
          </option>
        ))}
        {[...groupTargets.entries()].map(([t, g]) => (
          <option key={t} value={t}>
            {g.label}
          </option>
        ))}
      </select>
      <div className="sos-frow">
        {reelCycles.CYCLE_TYPES.map((ty) => (
          <button
            key={ty}
            type="button"
            className="sos-pchip"
            data-testid={`ui-cycle-type-${ty}`}
            data-on={type === ty || undefined}
            aria-pressed={type === ty}
            disabled={busy}
            onClick={() => setType(ty)}
          >
            {reelCycles.CYCLE_LABELS[ty]}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="sos-btn sos-btn-ghost sos-rail-export"
        data-testid="ui-cycle-add"
        disabled={busy || !addCheck.ok}
        title={addCheck.ok ? `Add a ${reelCycles.CYCLE_LABELS[type]} cycle for the whole shot` : addCheck.reason}
        onClick={handleAdd}
      >
        Add cycle
      </button>
      {!addCheck.ok ? (
        <p className="sos-reel-why" data-testid="ui-cycle-add-why">
          {addCheck.reason}
        </p>
      ) : null}
      {cycles.length ? (
        <ol className="sos-reel-list" data-testid="ui-cycle-list">
          {cycles.map((c, i) => {
            const live = reelCycles.isCycleLive(c, scene);
            const n = i + 1;
            return (
              <li key={`${c.target}-${i}`} className="sos-key-item">
                <div className="sos-key-row" data-live={live || undefined} data-testid={`ui-cycle-row-${n}`}>
                  <span className="sos-key-sum">
                    {reelCycles.CYCLE_LABELS[c.type]} · {nameOf(c)}
                    {live ? "" : " · not in the scene (ignored)"}
                  </span>
                  <button
                    type="button"
                    className="sos-reel-tool"
                    data-testid={`ui-cycle-delete-${n}`}
                    disabled={busy}
                    aria-label={`Delete cycle ${n}`}
                    title="Delete this cycle"
                    onClick={() => onResult(animationStore.deleteCycle(shotIndex, i))}
                  >
                    ✕
                  </button>
                </div>
                <div className="sos-key-rel">
                  {c.type === "spin" ? (
                    <>
                      <CycleNumber testId={`ui-cycle-rpm-${n}`} label={c.roll ? "Speed, unused" : "Speed"} unit="rpm" value={c.rpm} step={1} min={R.rpm[0]} max={R.rpm[1]} disabled={busy || c.roll} onCommit={(v) => set(i, { rpm: v })} />
                      <label className="sos-key-relfield">
                        <span>Axis</span>
                        <select className="sos2-input" data-testid={`ui-cycle-axis-${n}`} value={c.axis} disabled={busy} onChange={(e) => set(i, { axis: e.target.value })}>
                          {reelCycles.CYCLE_AXES.map((a) => (
                            <option key={a} value={a}>
                              {a === "auto" ? "Auto (axle)" : reelCycles.AXIS_LABELS[a]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="sos-key-relfield sos-cycle-roll" title={onParts(c) ? "Turn with the main product's keyed travel (distance / wheel radius)" : "Roll with movement is for part groups (wheels)"}>
                        <span>Roll with movement</span>
                        <input type="checkbox" data-testid={`ui-cycle-roll-${n}`} checked={c.roll} disabled={busy || !onParts(c)} onChange={(e) => set(i, { roll: e.target.checked })} />
                      </label>
                    </>
                  ) : null}
                  {c.type === "bob" ? (
                    <>
                      <CycleNumber testId={`ui-cycle-amp-${n}`} label="Height" unit="m" value={c.amplitude} step={0.01} min={R.amplitude[0]} max={R.amplitude[1]} disabled={busy} onCommit={(v) => set(i, { amplitude: v })} />
                      <CycleNumber testId={`ui-cycle-period-${n}`} label="Period" unit="s" value={c.period} step={0.1} min={R.period[0]} max={R.period[1]} disabled={busy} onCommit={(v) => set(i, { period: v })} />
                    </>
                  ) : null}
                  {c.type === "sway" ? (
                    <>
                      <CycleNumber testId={`ui-cycle-angle-${n}`} label="Angle" unit="deg" value={c.angle} step={1} min={R.angle[0]} max={R.angle[1]} disabled={busy} onCommit={(v) => set(i, { angle: v })} />
                      <CycleNumber testId={`ui-cycle-period-${n}`} label="Period" unit="s" value={c.period} step={0.1} min={R.period[0]} max={R.period[1]} disabled={busy} onCommit={(v) => set(i, { period: v })} />
                      <label className="sos-key-relfield">
                        <span>Pivot</span>
                        <select className="sos2-input" data-testid={`ui-cycle-pivot-${n}`} value={c.pivot} disabled={busy} onChange={(e) => set(i, { pivot: e.target.value })}>
                          {PIVOT_IDS.map((id) => (
                            <option key={id} value={id}>
                              {PIVOT_LABELS[id]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="sos-key-relfield">
                        <span>Axis</span>
                        <select className="sos2-input" data-testid={`ui-cycle-axis-${n}`} value={c.axis} disabled={busy} onChange={(e) => set(i, { axis: e.target.value })}>
                          {reelCycles.CYCLE_AXES.map((a) => (
                            <option key={a} value={a}>
                              {a === "auto" ? "Auto (edge)" : reelCycles.AXIS_LABELS[a]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : null}
                  {c.type === "pulse" ? (
                    <>
                      <CycleNumber testId={`ui-cycle-scale-${n}`} label="Scale" unit="%" value={c.scalePct} step={1} min={R.scalePct[0]} max={R.scalePct[1]} disabled={busy} onCommit={(v) => set(i, { scalePct: v })} />
                      <CycleNumber testId={`ui-cycle-period-${n}`} label="Period" unit="s" value={c.period} step={0.1} min={R.period[0]} max={R.period[1]} disabled={busy} onCommit={(v) => set(i, { period: v })} />
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
      {missing ? (
        <p className="sos-reel-why" data-testid="ui-cycle-missing">
          {missing} {missing === 1 ? "cycle targets an object or parts" : "cycles target objects or parts"} not in the scene (removed, another product, or a changed model): kept but ignored.
        </p>
      ) : null}
      <Hint>
        A cycle loops for the whole shot from its first frame, on top of the camera and the keys. For a wheel, select one of its parts
        in the Garage (Parts on), pick its group here, choose Spin and tick Roll with movement: it turns with the main product&apos;s keyed
        travel.
      </Hint>
    </div>
  );
}

// Slice C2b: the Reel sheet is a shot list (1 to 5 shots, at most 30 s, hard
// cuts between shots). Every edit goes through the animation store, which
// enforces the limits; a blocked Add or duration chip is disabled and the
// reason is written under it. The chip rows edit the selected shot and keep
// the C2a test ids. Play / Export never move the camera first: the stage works
// out each shot's start view itself, and the camera returns to the user's view.
export function AnimatePanel() {
  const animState = useSyncExternalStore(
    animationStore.subscribe,
    animationStore.getSnapshot,
    animationStore.getSnapshot
  );
  // Shot Sequencer: the live cinematic sequence state (separate from the Reel).
  const shotSnap = useSyncExternalStore(
    shotStore.subscribe,
    shotStore.getSnapshot,
    shotStore.getSnapshot
  );
  const ltEnabled = useSyncExternalStore(
    lowerThirdStore.subscribe,
    lowerThirdStore.getSnapshot,
    lowerThirdStore.getSnapshot
  ).enabled;
  const totalSeq = shotDefs.reduce((n, s) => n + s.duration, 0);
  // Slice C2c: start views show the current product's display labels
  const productId = useSyncExternalStore(currentProduct.subscribe, currentProduct.getSnapshot, currentProduct.getSnapshot);
  const startViewLabel = (v) => startViewLabelFor(getProduct(productId), v);
  const animPreviewing = animState.mode === "previewing";
  const animExporting = animState.mode === "exporting";
  // Whether this browser can export an MP4 at all (checked once, on mount;
  // null = still checking). The result is ignored if the panel unmounted.
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
  // Cleanup slice: the export button waits for the backdrop ("failed" never
  // blocks), and a Reel export holds the Garage lock until it ends, however
  // it ends (finished, cancelled or stopped).
  const gate = useSyncExternalStore(backdropGate.subscribe, backdropGate.getSnapshot, backdropGate.getSnapshot);
  const gateBlocked = !exportsAllowed(gate);
  const animBusy = animState.mode !== "idle";
  const [useShotSeqExport, setUseShotSeqExport] = useState(false);
  const handleExportClick = useCallback(async (shotSeq) => {
    const r = await withExportLock(garageStore, () => shotSeq ? exportShotSequence() : exportReel());
    if (r.ok) saveBlob(r.blob, r.filename);
  }, []);
  const [hasCustomView, setHasCustomView] = useState(false);
  useEffect(() => {
    const sync = () => setHasCustomView(!!document.querySelector('[data-testid="custom-view-card"]'));
    const t = setTimeout(sync, 0);
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { subtree: true, childList: true });
    return () => {
      clearTimeout(t);
      observer.disconnect();
    };
  }, []);

  const seq = animState.sequence;
  const total = animState.durationS;
  const brandingNow = useBranding(); // Slice R1: the Branding section's summary
  const [selectedRaw, setSelected] = useState(0);
  const selected = Math.min(selectedRaw, seq.length - 1);
  const shot = seq[selected];
  // The last refused edit's reason (shown until the next successful edit).
  const [notice, setNotice] = useState("");
  const run = (result) => {
    setNotice(result.ok ? "" : result.reason);
    return result.ok;
  };
  const addCheck = canAdd(seq);
  const durationCheck = (n) => durationAllowed(seq, selected, n);
  const blockedDurations = animationStore.DURATIONS.filter((n) => !durationCheck(n).ok);
  const loneTurntable = seq.length === 1 && shot.move === "turntable";
  const missingCustom = hasCustomView ? -1 : seq.findIndex((s) => s.startView === "custom" && !(seq.length === 1 && s.move === "turntable"));
  const blockedReason =
    missingCustom >= 0 ? `Shot ${missingCustom + 1} starts from Custom: save a custom view in the Camera sheet first.` : "";

  const handlePlay = () => {
    if (animPreviewing) return animationStore.stop();
    if (blockedReason) return false;
    return animationStore.play();
  };
  const handleExport = async () => {
    if (blockedReason) return;
    await handleExportClick(useShotSeqExport);
  };
  const handleShotPlay = () => {
    if (shotSnap.status === shotStatus.PLAYING) return;
    shotStore.play();
  };
  const handleShotStop = () => {
    shotStore.stop();
  };
  const handleAdd = () => {
    if (run(animationStore.addShot())) setSelected(animationStore.getSequence().length - 1);
  };
  const handleMove = (i, dir) => {
    if (run(animationStore.moveShot(i, dir)) && selected === i) setSelected(i + dir);
  };
  const handleDelete = (i) => {
    if (run(animationStore.deleteShot(i)) && selected >= i && selected > 0) setSelected(selected - 1);
  };

  // Slice U2: what a collapsed section header says. Keys and cycles belong to
  // the selected shot, so with several shots the summary names it.
  const shotTag = seq.length > 1 ? `Shot ${selected + 1} · ` : "";
  const keysSummary = `${shotTag}${(shot.keys ?? []).length} of ${reelKeys.MAX_KEYS_PER_SHOT}`;
  const cyclesSummary = `${shotTag}${(shot.cycles ?? []).length} of ${reelCycles.MAX_CYCLES_PER_SHOT}`;
  const exportSummary = animExporting ? `Exporting ${animState.progress}%` : "1080×1920 · 30 fps";

  return (
    <div className="sos-reel">
      {/* Slice U2: Play stays at the top of the sheet whatever section is open */}
      <div className="sos-reel-play">
        <button
          type="button"
          className="sos-btn sos-btn-ghost sos-rail-export"
          data-testid="ui-anim-play"
          disabled={animExporting || (!animPreviewing && (!animState.ready || !!blockedReason))}
          title={
            animPreviewing
              ? "Stop: the camera returns to your view from before Play"
              : `Play the Reel (${seq.length} ${seq.length === 1 ? "shot" : "shots"}, ${total} s)`
          }
          onClick={handlePlay}
        >
          {animPreviewing ? "Stop" : "Play"}
        </button>
      </div>
      <Hint>
        {blockedReason
          ? blockedReason
          : animPreviewing
            ? loneTurntable
              ? "Playing. Click the model or press Esc to stop."
              : `Playing shot ${Math.max(0, animState.shot) + 1} of ${seq.length}. Stop, Esc or the end returns the camera to your view.`
            : !animState.ready
              ? "Loading model"
              : loneTurntable
                ? "Spins the model about its own centre; the camera stays put. Loops."
                : `${seq.length === 1 ? "One shot" : `${seq.length} shots with hard cuts`}, ${total} s, each easing in and out. The camera returns to your view afterwards.`}
      </Hint>
      <ReelSection id="shots" title="Shots" summary={`${seq.length} of 5 · ${total} s`}>
        <div className="sos-reel-sec">
          <div className="sos-reel-head">
            <span className="sos-reel-total" data-testid="ui-reel-total">
              {seq.length} of 5 · {total} s of 30 s
            </span>
          </div>
          <ol className="sos-reel-list" data-testid="ui-reel-shots">
            {seq.map((s, i) => (
              <li key={i} className="sos-reel-row" data-on={i === selected || undefined}>
                <button
                  type="button"
                  className="sos-reel-pick"
                  data-testid={`ui-shot-${i + 1}`}
                  aria-pressed={i === selected}
                  disabled={animBusy}
                  title={`Edit shot ${i + 1}`}
                  onClick={() => setSelected(i)}
                >
                  <span className="sos-reel-num">{i + 1}</span>
                  <span className="sos-reel-sum">{shotSummary(s, startViewLabel)}</span>
                  {animPreviewing && animState.shot === i ? <span className="sos-reel-live">playing</span> : null}
                </button>
                <button
                  type="button"
                  className="sos-reel-tool"
                  data-testid={`ui-shot-${i + 1}-up`}
                  aria-label={`Move shot ${i + 1} up`}
                  title={i === 0 ? "Already the first shot." : `Move shot ${i + 1} up`}
                  disabled={animBusy || i === 0}
                  onClick={() => handleMove(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="sos-reel-tool"
                  data-testid={`ui-shot-${i + 1}-down`}
                  aria-label={`Move shot ${i + 1} down`}
                  title={i === seq.length - 1 ? "Already the last shot." : `Move shot ${i + 1} down`}
                  disabled={animBusy || i === seq.length - 1}
                  onClick={() => handleMove(i, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="sos-reel-tool"
                  data-testid={`ui-shot-${i + 1}-delete`}
                  aria-label={`Delete shot ${i + 1}`}
                  title={seq.length === 1 ? "A Reel needs at least one shot." : `Delete shot ${i + 1}`}
                  disabled={animBusy || seq.length === 1}
                  onClick={() => handleDelete(i)}
                >
                  ✕
                </button>
                {/* Slice R1: this shot's title (2 lines) and where it sits */}
                <ShotTitleEdit index={i} shot={s} busy={animBusy} onResult={run} />
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="sos-btn sos-btn-ghost sos-rail-export"
            data-testid="ui-shot-add"
            disabled={animBusy || !addCheck.ok}
            title={addCheck.ok ? "Add a shot at the end" : addCheck.reason}
            onClick={handleAdd}
          >
            Add shot
          </button>
          {!addCheck.ok ? (
            <p className="sos-reel-why" data-testid="ui-shot-add-why">
              {addCheck.reason}
            </p>
          ) : null}

          <span className="sos-label">Shot {selected + 1}: move</span>
          <div className="sos-frow">
            {animationStore.PRESETS.map((id) => (
              <button
                key={id}
                type="button"
                className="sos-pchip"
                data-testid={id === "turntable" ? "ui-anim-turntable" : `ui-anim-preset-${id}`}
                data-on={shot.move === id || undefined}
                aria-pressed={shot.move === id}
                disabled={animBusy}
                onClick={() => run(animationStore.setShot(selected, { move: id }))}
              >
                {REEL_PRESET_LABELS[id]}
              </button>
            ))}
          </div>
          <span className="sos-label">Shot {selected + 1}: start view</span>
          <div className="sos-frow">
            {animationStore.START_VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                className="sos-pchip"
                data-testid={startViewTestId(v)}
                data-on={(!loneTurntable && shot.startView === v) || undefined}
                aria-pressed={!loneTurntable && shot.startView === v}
                disabled={animBusy || loneTurntable || (v === "custom" && !hasCustomView)}
                title={
                  loneTurntable
                    ? "A Turntable on its own spins from the current camera view"
                    : v === "custom" && !hasCustomView
                      ? "Save a custom view in the Camera sheet first"
                      : `Start shot ${selected + 1} from the ${startViewLabel(v)} view`
                }
                onClick={() => run(animationStore.setShot(selected, { startView: v }))}
              >
                {startViewLabel(v)}
              </button>
            ))}
          </div>
          {loneTurntable ? (
            <p className="sos-reel-why">
              A Turntable on its own spins from the current camera view, as before. In a Reel with more shots it starts from its start view.
            </p>
          ) : null}
          <span className="sos-label">Shot {selected + 1}: duration</span>
          <div className="sos-frow">
            {animationStore.DURATIONS.map((n) => {
              const c = durationCheck(n);
              return (
                <button
                  key={n}
                  type="button"
                  className="sos-pchip"
                  data-testid={`ui-anim-duration-${n}`}
                  data-on={shot.durationS === n || undefined}
                  aria-pressed={shot.durationS === n}
                  disabled={animBusy || !c.ok}
                  title={c.ok ? `Shot ${selected + 1} lasts ${n} s` : c.reason}
                  onClick={() => run(animationStore.setShot(selected, { durationS: n }))}
                >
                  {n} s
                </button>
              );
            })}
          </div>
          {blockedDurations.length ? (
            <p className="sos-reel-why" data-testid="ui-duration-why">
              {durationCheck(blockedDurations[0]).reason}
            </p>
          ) : null}
          {/* Slice C3a: what a shot with main-product keys is framed on */}
          <span className="sos-label">Shot {selected + 1}: frame on</span>
          <div className="sos-frow">
            {reelKeys.FRAME_ON.map((v) => (
              <button
                key={v}
                type="button"
                className="sos-pchip"
                data-testid={`ui-frame-on-${v}`}
                data-on={(shot.frameOn ?? "end") === v || undefined}
                aria-pressed={(shot.frameOn ?? "end") === v}
                disabled={animBusy}
                title={
                  v === "start"
                    ? "Frame the camera on the product's keyed pose at the shot's first frame"
                    : "Frame the camera on the product's keyed pose at the shot's last frame"
                }
                onClick={() => run(animationStore.setShot(selected, { frameOn: v }))}
              >
                {v === "start" ? "Start" : "End"}
              </button>
            ))}
          </div>
          {notice ? (
            <p className="sos-reel-why" data-testid="ui-reel-notice">
              {notice}
            </p>
          ) : null}
        </div>
      </ReelSection>
      <ReelSection id="director" title="Camera director" summary={`${shotTag}${hasCamKeys(shot) ? `${shot.cam.keys.length} camera keys` : "uses its move"}`}>
        <CameraDirector selected={selected} shot={shot} busy={animBusy} />
      </ReelSection>
      <ReelSection id="keys" title="Keys" summary={keysSummary}>
        <ReelKeys sequence={seq} shotIndex={selected} busy={animBusy} productId={productId} onResult={run} />
      </ReelSection>
      <ReelSection id="cycles" title="Cycles" summary={cyclesSummary}>
        <ReelCycles sequence={seq} shotIndex={selected} busy={animBusy} productId={productId} onResult={run} />
      </ReelSection>
      <ReelSection id="branding" title="Branding" summary={brandingSummary(seq, brandingNow)}>
        <BrandingSection sequence={seq} busy={animBusy} />
      </ReelSection>
      <ReelSection id="shotseq" title="Shot Sequence" summary={`${shotDefs.length} shots · ${totalSeq}s`}>
        <div className="sos-reel-sec">
          <div className="sos-group">
            <div className="sos-group-head">
              <span className="sos-eyebrow">Cinematic</span>
            </div>
            <button
              type="button"
              className="sos-btn sos-btn-primary"
              data-testid="ui-shotseq-play"
              disabled={shotSnap.status === shotStatus.PLAYING}
              title="Play the 6-shot cinematic sequence in the live viewport"
              onClick={handleShotPlay}
            >
              {shotSnap.status === shotStatus.PLAYING ? "Playing..." : "Play Sequence"}
            </button>
            <button
              type="button"
              className="sos-btn sos-btn-ghost"
              data-testid="ui-shotseq-stop"
              disabled={shotSnap.status !== shotStatus.PLAYING}
              title="Stop the sequence and return the camera to your view"
              onClick={handleShotStop}
            >
              Stop
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
              <button
                className={ltEnabled ? "sos-btn sos-btn-primary" : "sos-btn sos-btn-ghost"}
                style={{ fontSize: 11, padding: "3px 10px" }}
                onClick={() => lowerThirdStore.setEnabled(!ltEnabled)}
              >
                {ltEnabled ? "Title Card On" : "Title Card Off"}
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
              <button
                className={useShotSeqExport ? "sos-btn sos-btn-primary" : "sos-btn sos-btn-ghost"}
                style={{ fontSize: 11, padding: "3px 10px" }}
                data-testid="ui-shotseq-export-toggle"
                title="When on, Export Reel renders the cinematic shot sequence instead of the turntable"
                onClick={() => setUseShotSeqExport((v) => !v)}
              >
                {useShotSeqExport ? "Export: Shot Sequence" : "Export: Turntable"}
              </button>
            </div>
            {shotSnap.status === shotStatus.DONE ? (
              <p className="sos-reel-why">Sequence complete — the camera is yours again.</p>
            ) : null}
          </div>
          <ol className="shot-list" data-testid="ui-shotseq-list">
            {shotDefs.map((s, i) => {
              const active = shotSnap.shotIndex === i;
              return (
                <li key={s.name} className="shot-list-item" data-on={active || undefined}>
                  <span className="shot-list-num">{i + 1}</span>
                  <span className="shot-list-name">{s.name}</span>
                  <span className="shot-list-dur">{s.duration}s</span>
                  {active ? <span className="shot-list-live">playing</span> : null}
                </li>
              );
            })}
          </ol>
        </div>
      </ReelSection>
      <ReelSection id="export" title="Export" summary={exportSummary}>
        <div className="sos-reel-sec">
          <button
            type="button"
            className="sos-btn sos-btn-ghost sos-rail-export"
            data-testid="ui-anim-export"
            disabled={animExporting || gateBlocked || !!blockedReason || !(animState.ready && animState.mode === "idle" && exportSupport?.ok)}
            title={
              animExporting
                ? "Exporting: Cancel is in the capsule at the top"
                : gateBlocked
                  ? "Waiting for the environment backdrop to load"
                  : `Render the Reel (${total} s) at 1080x1920 and save it as one MP4`
            }
            onClick={handleExport}
          >
            {animExporting ? "Exporting..." : gateBlocked ? GATE_LABEL : "Export Reel (MP4)"}
          </button>
          <Hint>
            {animExporting
              ? `Exporting ${animState.progress}% - keep this tab visible. Cancel is in the capsule at the top.`
              : exportSupport === null
                ? "Checking MP4 support..."
                : !exportSupport.ok
                  ? `${exportSupport.reason} MP4 export needs a current Edge or Chrome on localhost or https.`
                  : animState.message
                    ? animState.message
                    : "1080x1920 - 30 fps - silent. On this PC an export can take a while: keep this tab visible."}
          </Hint>
        </div>
      </ReelSection>
    </div>
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

  // Animate (Phase 16B Slice B): the Turntable preview's snapshot. While it
  // previews, the controls that would fight it are disabled here (the shell CSS
  // shield, body[data-anim], covers the header and the engine panel).
  const animState = useSyncExternalStore(
    animationStore.subscribe,
    animationStore.getSnapshot,
    animationStore.getSnapshot
  );
  // Any non-idle mode disables the controls that would fight the animation.
  const animBusy = animState.mode !== "idle";
  // Cleanup slice: the export buttons wait for the backdrop ("failed" never
  // blocks), and a Reel export holds the Garage lock until it ends, however
  // it ends (finished, cancelled or stopped).
  const gate = useSyncExternalStore(backdropGate.subscribe, backdropGate.getSnapshot, backdropGate.getSnapshot);
  const gateBlocked = !exportsAllowed(gate);
  // Materials chips read the live materials store (the one MaterialsManager
  // subscribes to): they enable once a model's materials are ready and
  // highlight the preset currently applied to the focused material.
  const matState = useSyncExternalStore(
    materialStore.subscribe,
    materialStore.getSnapshot,
    materialStore.getSnapshot
  );
  const materialsReady = matState.status === "ready" && matState.entries.length > 0;
  // Cinematic Grade: the live grade id drives the engine's post-processing
  // composer. No local useState mirrors the store — useSyncExternalStore only.
  const gradeId = useSyncExternalStore(
    gradeStore.subscribe,
    gradeStore.getSnapshot,
    gradeStore.getSnapshot
  ).gradeId;
  const handleMaterialSelect = useCallback((label) => {
    const id = MATERIAL_CHIP_PRESETS[label];
    if (id) materialStore.applyPreset(id);
  }, []);

  // Slice U1 — the Lighting card's own mood-highlight state moved into
  // LightingPanel (above), which mounts fresh each time this section (or the
  // new Light sheet) opens, so the accordion here no longer needs to special
  // case it on open/close.
  const openSection = (id) => setOpenId(openId === id ? null : id);
  // From the collapsed strip: bring the rail back with that section open.
  const openFromStrip = (id) => {
    setOpenId(id);
    onCollapse?.();
  };

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
                <CameraFraming />
                <CameraSliders />
                <CameraLock />
              </>
            ) : section.id === "lighting" ? (
              <LightingPanel />
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
                  Materials sheet.
                </Hint>
              </>
            ) : section.id === "grade" ? (
              <GradePanel />
            ) : section.id === "animate" ? (
              <AnimatePanel />
            ) : section.id === "garage" ? (
              <GaragePanel />
            ) : section.id === "poster" ? (
              <PosterPanel />
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
