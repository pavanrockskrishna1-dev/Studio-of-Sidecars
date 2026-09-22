import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
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
import { checkExportSupport, exportReel, saveBlob } from "../animation/exporter";
import { exportPng } from "./engineCapture";

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

const fmtUnits = (n) => (Number.isFinite(n) ? n.toFixed(3) : "?");

// Garage G3 — the Parts switch and the selected part's read-out. All state comes
// from the Garage stores; nothing here touches the engine.
function GarageSection({ pickMode, selection, busy }) {
  const count = selection.length;
  const first = count > 0 ? garageMode.describePart(selection[0].partId) : null;
  const names = selection
    .slice(0, 5)
    .map((e) => garageMode.describePart(e.partId)?.name ?? e.partId);
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
      <div data-testid="ui-garage-readout">
        {count === 0 ? (
          <p className="sos-hint">
            <span>No part selected</span>
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
            <p className="sos-hint">
              <span>
                Size {fmtUnits(first.size.x)} x {fmtUnits(first.size.y)} x {fmtUnits(first.size.z)}{" "}
                (model units, real size unknown)
              </span>
            </p>
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
  const handleExportClick = useCallback(async () => {
    const r = await exportReel();
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
                      : !(animState.ready && animState.mode === "idle" && exportSupport?.ok)
                  }
                  title={
                    animExporting
                      ? "Cancel the running export"
                      : "Render the turntable at 1080x1920 and save it as an MP4"
                  }
                  onClick={animExporting ? animationStore.cancelExport : handleExportClick}
                >
                  {animExporting ? "Cancel export" : "Export Reel (MP4)"}
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
                selection={garageState.selection}
                busy={animState.mode !== "idle"}
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
                  disabled={animBusy}
                  title="Export PNG — captures the current view with the chosen format (same as Capture Shot)"
                  onClick={exportPng}
                >
                  <Icon name="upload" size={15} />
                  Export PNG
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
