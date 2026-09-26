/* Slice C1a — Poster studio panel (owner decisions 1-8).
   ---------------------------------------------------------------------------
   Self-contained: reads/writes the poster module's own live store
   (poster/poster.js) and the Garage export lock directly, so mounting this
   panel needs nothing from App.jsx or from InspectorRail's own state — it
   never touches the 3D scene, camera, lights or Garage.

   Bundles the two offline fonts (decision 5) so the CSS import happens
   wherever the panel first mounts; both the live preview below and the PNG
   export (components/StudioCanvas.jsx) wait for document.fonts.ready before
   calling drawPoster. */
import "@fontsource/saira-stencil-one/400.css";
import "@fontsource/oswald/400.css";
import "@fontsource/oswald/500.css";
import "@fontsource/oswald/600.css";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Icon from "./icons";
import * as garageStore from "../garage/garageStore";
import { EXPORT_PRESETS } from "../capture/exportOptions";
import {
  posterState,
  readKits,
  writeKits,
  aspectKeyFor,
  POSTER_SIZES,
  POSTER_ASPECT_MESSAGE,
  MAX_LABELS,
  drawPoster,
  saveLogo,
  ensureLogoImage,
  invalidateLogoImage,
  FONT_LOAD_SPECS,
} from "../poster/poster.js";

const FORMAT_SELECT = '[data-testid="cap-format"]';

function readFormatPresetId() {
  const el = document.querySelector(FORMAT_SELECT);
  return el && el.value ? el.value : "current";
}

// null (not 4:5 or 1:1, including "current" — a live-view aspect the panel
// cannot know ahead of the actual render) or "4:5" / "1:1".
function currentAspectKey() {
  const preset = EXPORT_PRESETS.find((p) => p.id === readFormatPresetId());
  if (preset && preset.width > 0) return aspectKeyFor(preset.width, preset.height);
  return null;
}

// The largest rectangle of the given aspect ratio that fits centered inside
// the current viewport — the same "fit the target aspect inside what's on
// screen" rule an export/crop frame guide uses. In CSS pixels.
function computeFrameRect(aspectW, aspectH) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const targetRatio = aspectW / aspectH;
  const viewportRatio = vw / vh;
  let w, h;
  if (viewportRatio > targetRatio) {
    h = vh;
    w = h * targetRatio;
  } else {
    w = vw;
    h = w / targetRatio;
  }
  return { x: (vw - w) / 2, y: (vh - h) / 2, w, h };
}

function TextField({ label, value, onChange, disabled, testId, placeholder }) {
  return (
    <label className="sos-field">
      <em>{label}</em>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        data-testid={testId}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ColorField({ label, value, onChange, disabled, testId }) {
  return (
    <label className="sos-field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <em style={{ flex: 1 }}>{label}</em>
      <input
        type="color"
        value={value}
        disabled={disabled}
        data-testid={testId}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 28, height: 22, padding: 0, border: "none", background: "none" }}
      />
    </label>
  );
}

function ToggleChip({ label, on, onClick, disabled, testId }) {
  return (
    <button
      type="button"
      className="sos-pchip"
      data-on={on || undefined}
      aria-pressed={on}
      disabled={disabled}
      data-testid={testId}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function NumField({ label, value, onChange, disabled, testId }) {
  return (
    <label className="sos-field">
      <em>{label}</em>
      <input
        type="number"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        data-testid={testId}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(0, Math.min(100, n)));
        }}
      />
    </label>
  );
}

// The live 2D overlay on the stage: fixed to the viewport (pointer-events
// none, so orbit/drag underneath is unaffected), drawn by the exact same
// drawPoster() call the PNG export uses, just at a smaller pixel size.
// Owner click-test fix: this used to float a small ~216x270 card at z-index
// 40 (the same layer as the Capture Shot lightbox) — well above the shell's
// z-index 8, so it sat on top of the Inspector rail and covered its fields.
// It now fills the STAGE at the real on-screen export-frame rectangle (the
// largest area of the target aspect that fits the current viewport, exactly
// what computeFrameRect above works out), at z-index 1 — above the 3D canvas
// (z-index 0) but below every UI layer (shell 8, StudioControls 10,
// SelectionInspector 20, CapturePreview 40; see the stacking-order comment at
// the top of ui-shell.css, which this file does not touch). The canvas's own
// pixel buffer is sized by devicePixelRatio so it stays sharp on hi-DPI
// screens; drawPoster is still handed the exact same spec as the export, just
// at this rectangle's buffer size instead of the export's 1080-wide size.
function PosterPreviewOverlay({ spec, aspectKey, logoVersion }) {
  const canvasRef = useRef(null);
  // The rect is derived from aspectKey (render-time data) plus the live
  // window size; the effect below only subscribes to the "window resized"
  // external event and bumps a counter from its callback, never calling
  // setState synchronously in the effect body itself.
  const [resizeTick, setResizeTick] = useState(0);
  useEffect(() => {
    const onResize = () => setResizeTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const rect = useMemo(() => {
    if (!aspectKey) return null;
    const { width, height } = POSTER_SIZES[aspectKey];
    return computeFrameRect(width, height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspectKey, resizeTick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rect || !spec) return undefined;
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.max(1, Math.round(rect.w * dpr));
    const bh = Math.max(1, Math.round(rect.h * dpr));
    canvas.width = bw;
    canvas.height = bh;
    const ctx = canvas.getContext("2d");
    let cancelled = false;

    // Always await the logo image before drawing — never trust a
    // synchronously-read cache, which can still be mid-decode the first time
    // a kit's logo is used in a session. ensureLogoImage is cache-backed, so
    // once decoded this resolves immediately on later redraws.
    const drawNow = async () => {
      const logoImage = await ensureLogoImage(spec.kit?.id);
      if (cancelled) return;
      ctx.clearRect(0, 0, bw, bh);
      drawPoster(ctx, bw, bh, { ...spec, logoImage });
    };

    // Owner click-test fix: a canvas fillText with an unloaded @font-face
    // silently falls back to a system serif/sans instead of waiting, and
    // nothing in the DOM renders text in Saira Stencil One / Oswald to make
    // the browser treat them as "needed" — so document.fonts.ready alone can
    // (and did) resolve before either face was actually fetched, leaving the
    // preview stuck on the fallback font forever (it never redrew). Explicitly
    // request every (family, weight) drawPoster uses via document.fonts.load
    // before the first draw, and redraw again on every 'loadingdone' as a
    // backstop in case a variant wasn't covered above.
    Promise.all([document.fonts.ready, ...FONT_LOAD_SPECS.map((f) => document.fonts.load(f).catch(() => null))]).then(
      drawNow
    );
    const onLoadingDone = () => drawNow();
    document.fonts.addEventListener("loadingdone", onLoadingDone);

    return () => {
      cancelled = true;
      document.fonts.removeEventListener("loadingdone", onLoadingDone);
    };
  }, [spec, rect, logoVersion]);

  if (!rect || !spec) return null;
  // Portalled straight to <body>: PosterPanel lives inside .sos-rail, which
  // carries the shared .sos-panel glass material (backdrop-filter in
  // ui-shell.css) — backdrop-filter establishes a new containing block for
  // `position: fixed` descendants per the CSS spec, so without the portal
  // this canvas would be positioned relative to the RAIL's box, not the
  // viewport (confirmed: getBoundingClientRect landed at the rail's on-screen
  // position instead of the intended centred frame rect). The portal is the
  // fix; nothing in ui-shell.css is touched.
  return createPortal(
    <canvas
      ref={canvasRef}
      data-testid="ui-poster-preview"
      data-rect={`${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.w)},${Math.round(rect.h)}`}
      style={{
        position: "fixed",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        zIndex: 1,
        pointerEvents: "none",
        outline: "1px solid rgba(255,255,255,0.2)",
        outlineOffset: "-1px",
      }}
    />,
    document.body
  );
}

export default function PosterPanel() {
  const s = useSyncExternalStore(posterState.subscribe, posterState.getSnapshot, posterState.getSnapshot);
  const garageState = useSyncExternalStore(garageStore.subscribe, garageStore.getSnapshot, garageStore.getSnapshot);
  const locked = garageState.locked;

  const [kits, setKits] = useState(() => readKits());
  const [formatTick, setFormatTick] = useState(0);
  const [logoVersion, setLogoVersion] = useState(0);
  const [logoBusy, setLogoBusy] = useState(false);

  // The Render Format chips dispatch a real "change" event on the engine's
  // select when clicked (InspectorRail.applyExportFormat) — that is the only
  // signal this panel needs to know the export aspect might have changed.
  useEffect(() => {
    const onChange = (e) => {
      if (e.target && e.target.dataset && e.target.dataset.testid === "cap-format") {
        setFormatTick((t) => t + 1);
      }
    };
    document.addEventListener("change", onChange, true);
    return () => document.removeEventListener("change", onChange, true);
  }, []);

  // formatTick is a trigger only (bumped by the change-listener effect above);
  // currentAspectKey() itself reads the engine's live DOM select, not React
  // state, so it is intentionally absent from the dependency list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const aspectKey = useMemo(() => currentAspectKey(), [formatTick]);

  const kit = kits[s.kitId] || kits["bbq-ride"];

  // logoImage is intentionally absent here: PosterPreviewOverlay always
  // awaits ensureLogoImage(kit.id) itself right before drawing (never a
  // synchronously-read, possibly-still-decoding cache), the same rule the
  // export path follows in components/StudioCanvas.jsx.
  const spec = useMemo(
    () => ({
      templateId: s.templateId,
      kit,
      toggles: s.toggles,
      headline1: s.headline1,
      headline2: s.headline2,
      subline: s.subline,
      labels: s.labels,
    }),
    [s.templateId, kit, s.toggles, s.headline1, s.headline2, s.subline, s.labels]
  );

  const commitKits = useCallback((next) => {
    setKits(next);
    writeKits(undefined, next);
  }, []);

  const patchKit = useCallback(
    (patch) => {
      const next = { ...kits, [kit.id]: { ...kit, ...patch } };
      commitKits(next);
    },
    [kits, kit, commitKits]
  );

  const patchColors = useCallback(
    (patch) => patchKit({ colors: { ...kit.colors, ...patch } }),
    [patchKit, kit]
  );

  const handleLogoFile = useCallback(
    async (file) => {
      if (!file) return;
      setLogoBusy(true);
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error || new Error("read failed"));
          reader.readAsDataURL(file);
        });
        await saveLogo(kit.id, dataUrl);
        invalidateLogoImage(kit.id);
        await ensureLogoImage(kit.id);
        setLogoVersion((v) => v + 1);
      } catch (err) {
        console.error("Poster logo upload failed:", err);
      } finally {
        setLogoBusy(false);
      }
    },
    [kit]
  );

  return (
    <>
      <div className="sos-field-top">
        <span className="sos-label">Poster</span>
        <ToggleChip
          label={s.enabled ? "On" : "Off"}
          on={s.enabled}
          disabled={locked}
          testId="ui-poster-enabled"
          onClick={() => posterState.setEnabled(!s.enabled)}
        />
      </div>

      {s.enabled && !aspectKey ? (
        <p className="sos-hint" role="alert" data-testid="ui-poster-aspect-warning">
          <Icon name="info" size={12} stroke={1.8} />
          <span>{POSTER_ASPECT_MESSAGE} — pick Post &middot;1:1 or Hero &middot;4:5 in Render above.</span>
        </p>
      ) : null}

      {s.enabled ? (
        <PosterPreviewOverlay spec={spec} aspectKey={aspectKey} logoVersion={logoVersion} />
      ) : null}

      {!s.enabled ? (
        <p className="sos-hint">
          <Icon name="info" size={12} stroke={1.8} />
          <span>Adds a 2D layer on top of the exported PNG — the 3D scene is never touched.</span>
        </p>
      ) : (
        <>
          <span className="sos-label">Template</span>
          <div className="sos-frow">
            <ToggleChip
              label="Franchise Hero"
              on={s.templateId === "franchise-hero"}
              disabled={locked}
              testId="ui-poster-template-franchise-hero"
              onClick={() => posterState.setTemplateId("franchise-hero")}
            />
            <ToggleChip
              label="Label boxes"
              on={s.templateId === "label-boxes"}
              disabled={locked}
              testId="ui-poster-template-label-boxes"
              onClick={() => posterState.setTemplateId("label-boxes")}
            />
          </div>

          <span className="sos-label">Brand kit</span>
          <div className="sos-frow">
            {Object.values(kits).map((k) => (
              <ToggleChip
                key={k.id}
                label={k.name}
                on={s.kitId === k.id}
                disabled={locked}
                testId={`ui-poster-kit-${k.id}`}
                onClick={() => posterState.setKitId(k.id)}
              />
            ))}
          </div>

          <label className="sos-field">
            <em>Logo (PNG)</em>
            <input
              type="file"
              accept="image/png"
              disabled={locked || logoBusy}
              data-testid="ui-poster-logo-upload"
              onChange={(e) => {
                const f = e.target.files?.[0];
                handleLogoFile(f);
                e.target.value = "";
              }}
            />
          </label>

          <div className="sos-frow">
            <ColorField label="Background" value={kit.colors.bg} onChange={(v) => patchColors({ bg: v })} disabled={locked} testId="ui-poster-color-bg" />
            <ColorField label="Text" value={kit.colors.text} onChange={(v) => patchColors({ text: v })} disabled={locked} testId="ui-poster-color-text" />
            <ColorField label="Accent" value={kit.colors.accent} onChange={(v) => patchColors({ accent: v })} disabled={locked} testId="ui-poster-color-accent" />
          </div>

          <TextField label="Handle 1" value={kit.handle1} onChange={(v) => patchKit({ handle1: v })} disabled={locked} testId="ui-poster-handle1" />
          <TextField label="Handle 2" value={kit.handle2} onChange={(v) => patchKit({ handle2: v })} disabled={locked} testId="ui-poster-handle2" />
          <TextField label="Hashtag" value={kit.hashtag} onChange={(v) => patchKit({ hashtag: v })} disabled={locked} testId="ui-poster-hashtag" />
          <TextField label="WhatsApp 1" value={kit.whatsapp1} onChange={(v) => patchKit({ whatsapp1: v })} disabled={locked} testId="ui-poster-whatsapp1" />
          <TextField label="WhatsApp 2" value={kit.whatsapp2} onChange={(v) => patchKit({ whatsapp2: v })} disabled={locked} testId="ui-poster-whatsapp2" />

          <span className="sos-label">Elements</span>
          <div className="sos-frow">
            <ToggleChip label="Logo" on={s.toggles.logo} disabled={locked} testId="ui-poster-toggle-logo" onClick={() => posterState.setToggle("logo", !s.toggles.logo)} />
            {s.templateId === "franchise-hero" ? (
              <>
                <ToggleChip label="Headline" on={s.toggles.headline} disabled={locked} testId="ui-poster-toggle-headline" onClick={() => posterState.setToggle("headline", !s.toggles.headline)} />
                <ToggleChip label="Subline" on={s.toggles.subline} disabled={locked} testId="ui-poster-toggle-subline" onClick={() => posterState.setToggle("subline", !s.toggles.subline)} />
                <ToggleChip label="CTA" on={s.toggles.cta} disabled={locked} testId="ui-poster-toggle-cta" onClick={() => posterState.setToggle("cta", !s.toggles.cta)} />
              </>
            ) : null}
            <ToggleChip label="Footer" on={s.toggles.footer} disabled={locked} testId="ui-poster-toggle-footer" onClick={() => posterState.setToggle("footer", !s.toggles.footer)} />
          </div>

          {s.templateId === "franchise-hero" ? (
            <>
              <TextField label="Headline 1" value={s.headline1} onChange={posterState.setHeadline1} disabled={locked} testId="ui-poster-headline1" placeholder="COFFEE" />
              <TextField label="Headline 2" value={s.headline2} onChange={posterState.setHeadline2} disabled={locked} testId="ui-poster-headline2" placeholder="SIDECARS" />
              <TextField label="Subline" value={s.subline} onChange={posterState.setSubline} disabled={locked} testId="ui-poster-subline" placeholder="the mobile espresso bike" />
            </>
          ) : (
            <>
              <span className="sos-label">Labels ({s.labels.length}/{MAX_LABELS})</span>
              {s.labels.map((label, i) => (
                <div key={i} className="sos-field" style={{ gap: 6, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="sos-field-top">
                    <TextField
                      label={`Label ${i + 1}`}
                      value={label.text}
                      onChange={(v) => posterState.updateLabel(i, { text: v })}
                      disabled={locked}
                      testId={`ui-poster-label-${i}-text`}
                    />
                    <button
                      type="button"
                      className="sos-pchip"
                      disabled={locked}
                      data-testid={`ui-poster-label-${i}-remove`}
                      title="Remove this label"
                      onClick={() => posterState.removeLabel(i)}
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                  <div className="sos-frow">
                    <ToggleChip label="Accent box" on={label.style !== "white"} disabled={locked} testId={`ui-poster-label-${i}-style-accent`} onClick={() => posterState.updateLabel(i, { style: "accent" })} />
                    <ToggleChip label="White box" on={label.style === "white"} disabled={locked} testId={`ui-poster-label-${i}-style-white`} onClick={() => posterState.updateLabel(i, { style: "white" })} />
                  </div>
                  <div className="sos-frow">
                    <NumField label="Box X%" value={label.boxX} onChange={(v) => posterState.updateLabel(i, { boxX: v })} disabled={locked} testId={`ui-poster-label-${i}-boxx`} />
                    <NumField label="Box Y%" value={label.boxY} onChange={(v) => posterState.updateLabel(i, { boxY: v })} disabled={locked} testId={`ui-poster-label-${i}-boxy`} />
                    <NumField label="Tip X%" value={label.tipX} onChange={(v) => posterState.updateLabel(i, { tipX: v })} disabled={locked} testId={`ui-poster-label-${i}-tipx`} />
                    <NumField label="Tip Y%" value={label.tipY} onChange={(v) => posterState.updateLabel(i, { tipY: v })} disabled={locked} testId={`ui-poster-label-${i}-tipy`} />
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="sos-btn sos-btn-ghost sos-rail-export"
                disabled={locked || s.labels.length >= MAX_LABELS}
                data-testid="ui-poster-label-add"
                onClick={() => posterState.addLabel()}
              >
                <Icon name="plus" size={14} />
                Add label
              </button>
            </>
          )}
        </>
      )}
    </>
  );
}
