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

// Read-only value bar: the mockup's slider look without pretending to drive
// anything. Kept as a div (not an <input>) so it can never steal focus or
// fire a change the engine would ignore.
function VisualField({ label, value, fill }) {
  return (
    <div className="sos-field">
      <div className="sos-field-top">
        <span className="sos-label">{label}</span>
        <span className="sos-field-val">{value}</span>
      </div>
      <div className="sos-slider" aria-hidden="true">
        <i style={{ width: fill }} />
        <b style={{ left: fill }} />
      </div>
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

export default function InspectorRail({
  dodgeBelow = 0,
  collapsed = false,
  onCollapse,
}) {
  const [openId, setOpenId] = useState("camera");

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
                <span className="sos-label">Framing</span>
                <Chips
                  items={CAMERA_FRAMINGS}
                  onSelect={applyCameraPreset}
                  isActive={() => false}
                />
                <div className="sos-fields">
                  <VisualField label="Distance" value="1.8 m" fill="46%" />
                  <VisualField label="Height" value="0.9 m" fill="38%" />
                </div>
                <div className="sos-switchrow">
                  <span className="sos-label">Lock focus on product</span>
                  <span className="sos-switch" aria-hidden="true">
                    <b />
                  </span>
                </div>
                <Hint>One-tap framing — drives the engine's camera presets.</Hint>
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
            ) : (
              <>
                <Chips items={INSPECTOR_PLACEHOLDERS[section.id]} />
                <Hint>{section.name} preset — UI shell only.</Hint>
              </>
            )}
          </RailCard>
        ))}
      </div>

      <div className="sos-rail-foot">
        <span className="sos-meta">
          CAMERA · LIGHTING · MATERIALS LIVE · RENDER SHELL
        </span>
      </div>
    </aside>
  );
}
