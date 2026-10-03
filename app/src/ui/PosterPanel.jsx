/* Slice C1a — Poster studio panel (owner decisions 1-8).
   ---------------------------------------------------------------------------
   Self-contained: reads/writes the poster module's own live store
   (poster/poster.js) and the Garage export lock directly, so mounting this
   panel needs nothing from App.jsx or from InspectorRail's own state — it
   never touches the 3D scene, camera, lights or Garage.

   Bundles the two offline fonts (decision 5) so the CSS import happens
   wherever this module is first imported; both the live preview and the PNG
   export (components/StudioCanvas.jsx) wait for document.fonts.ready before
   calling drawPoster.

   Slice U1 Stage B2: the live preview overlay is no longer mounted by the
   panel (so it vanished whenever the Poster sheet was closed). The shell
   always mounts <PosterOverlayHost/> (below), which shows the overlay whenever
   Poster is On and the export Format is 4:5 or 1:1; the panel keeps only the
   controls and tells the host when the kit or logo changed (notifyPoster). */
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
  ensurePosterFonts,
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

    // Always await the logo image before drawing - never trust a
    // synchronously-read cache, which can still be mid-decode the first time
    // a kit's logo is used in a session. ensureLogoImage is cache-backed, so
    // once decoded this resolves immediately on later redraws. It also awaits
    // the poster's font faces (ensurePosterFonts, poster/poster.js) - the very
    // same awaited faces the PNG export uses - so the preview never draws in a
    // fallback font. The preview alone asks for the dashed "Add logo" slot.
    const drawNow = async () => {
      const logoImage = await ensureLogoImage(spec.kit?.id);
      if (cancelled) return;
      ctx.clearRect(0, 0, bw, bh);
      drawPoster(ctx, bw, bh, { ...spec, logoImage, logoPlaceholder: true });
    };

    // Owner click-test fix: a canvas fillText with an unloaded @font-face
    // silently falls back to a system font instead of waiting. The faces are
    // requested explicitly (ensurePosterFonts) before the first draw, and the
    // preview redraws on every 'loadingdone' as a backstop.
    ensurePosterFonts().then(drawNow);
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

// The panel edits the brand kits in its own state (persisted to localStorage)
// and the logo in the poster module's storage; the overlay host lives elsewhere,
// so the panel pings it on every kit / logo change.
const POSTER_SYNC_EVENT = "sos-poster-sync";
function notifyPoster() {
  window.dispatchEvent(new Event(POSTER_SYNC_EVENT));
}

// Mounted once by StudioShell, always: owns everything the overlay needs (the
// poster store, the export Format, the saved kits) so the preview stays on the
// stage while Poster is On, whether or not the Poster sheet is open.
export function PosterOverlayHost() {
  const s = useSyncExternalStore(posterState.subscribe, posterState.getSnapshot, posterState.getSnapshot);
  // bumped when the export Format select changes or the panel changes a kit /
  // logo; the values themselves are re-read from the live DOM select and from
  // storage, never copied
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const onChange = (e) => {
      if (e.target && e.target.dataset && e.target.dataset.testid === "cap-format") bump();
    };
    document.addEventListener("change", onChange, true);
    window.addEventListener(POSTER_SYNC_EVENT, bump);
    return () => {
      document.removeEventListener("change", onChange, true);
      window.removeEventListener(POSTER_SYNC_EVENT, bump);
    };
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const aspectKey = useMemo(() => currentAspectKey(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const kits = useMemo(() => readKits(), [tick]);
  const kit = kits[s.kitId] || kits["bbq-ride"];
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
  if (!s.enabled) return null;
  return <PosterPreviewOverlay spec={spec} aspectKey={aspectKey} logoVersion={tick} />;
}

export default function PosterPanel() {
  const s = useSyncExternalStore(posterState.subscribe, posterState.getSnapshot, posterState.getSnapshot);
  const garageState = useSyncExternalStore(garageStore.subscribe, garageStore.getSnapshot, garageStore.getSnapshot);
  const locked = garageState.locked;

  const [kits, setKits] = useState(() => readKits());
  const [formatTick, setFormatTick] = useState(0);
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

  const commitKits = useCallback((next) => {
    setKits(next);
    writeKits(undefined, next);
    notifyPoster();
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
        notifyPoster();
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
          <span>{POSTER_ASPECT_MESSAGE} — in the Capture sheet, set Format to &ldquo;Instagram Portrait&rdquo; (4:5) or &ldquo;Instagram Square&rdquo; (1:1).</span>
        </p>
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
