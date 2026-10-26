import { useEffect, useState, useSyncExternalStore } from "react";
import { useBranding } from "./useBranding";
import * as animationStore from "../animation/animationStore";
import { clampTitleText, TITLE_POSITIONS, DEFAULT_TITLE_POS, MAX_TITLE_LINE_CHARS } from "../animation/shotTitle";
import { brandingState, endCardFits, activeKit, END_CARD_S, REEL_MAX_S, MAX_END_TEXT_CHARS, MAX_HANDLE_CHARS } from "../poster/branding";
import { posterState, ensureLogoImage, getCachedLogoImage } from "../poster/poster.js";

/* ==========================================================================
   Slice R1 - Reel branding controls (UI ONLY)
   --------------------------------------------------------------------------
   BrandingSection is the body of the Reel sheet's "Branding" section: the logo
   bug, the end card and its line, and the handle. ShotTitleEdit sits inside
   each shot's row: that shot's title (2 lines) and where it goes. Everything
   branding comes from the ACTIVE Poster kit; the state lives in
   poster/branding.js (session-saved), the titles in the shot list.
   ========================================================================== */

const POS_LABELS = { top: "Top", middle: "Middle", bottom: "Bottom" };

function OnOff({ label, on, onSet, disabled, id, title }) {
  return (
    <>
      <span className="sos-label">{label}</span>
      <div className="sos-frow">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            className="sos-pchip"
            data-testid={`ui-branding-${id}-${v ? "on" : "off"}`}
            data-on={on === v || undefined}
            aria-pressed={on === v}
            disabled={disabled && v !== on}
            title={title}
            onClick={() => onSet(v)}
          >
            {v ? "On" : "Off"}
          </button>
        ))}
      </div>
    </>
  );
}

export function BrandingSection({ sequence, busy }) {
  const b = useBranding();
  const kitId = useSyncExternalStore(posterState.subscribe, () => posterState.getSnapshot().kitId, () => posterState.getSnapshot().kitId);
  // the active kit is read on every render (the Poster sheet edits it in storage)
  const kit = activeKit();
  const [, setLoaded] = useState(0);
  useEffect(() => {
    let alive = true;
    ensureLogoImage(kitId).then(() => alive && setLoaded((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [kitId]);
  const hasLogo = !!getCachedLogoImage(kit.id);
  const reelS = sequence.reduce((n, s) => n + s.durationS, 0);
  const fit = endCardFits(reelS);
  const [notice, setNotice] = useState("");
  const handleValue = b.handle ?? kit.handle1 ?? "";

  return (
    <div className="sos-reel-sec" data-testid="ui-branding">
      <p className="sos-reel-why" style={{ color: "var(--sos2-text-2)" }} data-testid="ui-branding-kit">
        Uses the {kit.name} kit (logo, colours, font). Change it in the Poster sheet.
      </p>
      <OnOff label="Logo (top right, every frame)" id="logo" on={b.logo} disabled={busy} onSet={(v) => brandingState.setLogo(v)} />
      {b.logo && !hasLogo ? (
        <p className="sos-reel-why" data-testid="ui-branding-nologo">
          The {kit.name} kit has no logo yet. Add one in the Poster sheet.
        </p>
      ) : null}

      <OnOff
        label={`End card (last ${END_CARD_S.toFixed(1)} s)`}
        id="endcard"
        on={b.endCard}
        disabled={busy || (!b.endCard && !fit.ok)}
        title={fit.ok ? "Hold the last frame, dim it and show the logo, handle and a line" : fit.reason}
        onSet={(v) => {
          const r = brandingState.setEndCard(v, reelS);
          setNotice(r.ok ? "" : r.reason);
        }}
      />
      {!fit.ok && !b.endCard ? (
        <p className="sos-reel-why" data-testid="ui-branding-endcard-why">
          {fit.reason} Shorten a shot to turn it on.
        </p>
      ) : null}
      {b.endCard ? (
        <p className="sos-reel-why" style={{ color: "var(--sos2-text-2)" }} data-testid="ui-branding-endcard-len">
          The Reel becomes {reelS + END_CARD_S} s (limit {REEL_MAX_S} s).
        </p>
      ) : null}
      {notice ? <p className="sos-reel-why">{notice}</p> : null}
      <label className="sos-field">
        <em>End card line</em>
        <input
          type="text"
          data-testid="ui-branding-endtext"
          value={b.endText}
          maxLength={MAX_END_TEXT_CHARS}
          disabled={busy}
          placeholder="Franchise enquiries — DM us"
          onChange={(e) => brandingState.setEndText(e.target.value)}
        />
      </label>
      <label className="sos-field">
        <em>Handle (blank hides it)</em>
        <input
          type="text"
          data-testid="ui-branding-handle"
          value={handleValue}
          maxLength={MAX_HANDLE_CHARS}
          disabled={busy}
          placeholder="@yourbrand"
          onChange={(e) => brandingState.setHandle(e.target.value)}
        />
      </label>
      {b.handle !== null ? (
        <button
          type="button"
          className="sos-btn sos-btn-ghost"
          data-testid="ui-branding-handle-kit"
          disabled={busy}
          title="Use the handle saved in the kit again"
          onClick={() => brandingState.setHandle(null)}
        >
          Use the kit&apos;s handle
        </button>
      ) : null}
    </div>
  );
}

// One shot's title: two lines of text and where they sit (inside the shot's row).
export function ShotTitleEdit({ index, shot, busy, onResult }) {
  const title = shot.title ?? { text: "", pos: DEFAULT_TITLE_POS };
  const [l1 = "", l2 = ""] = clampTitleText(title.text).split("\n");
  const set = (patch) => onResult(animationStore.setShot(index, { title: { ...title, ...patch } }));
  const setLines = (a, b) => set({ text: clampTitleText(b !== "" ? `${a}\n${b}` : a) });
  return (
    <div className="sos-reel-title" data-testid={`ui-shot-${index + 1}-title`}>
      <input
        type="text"
        aria-label={`Shot ${index + 1} title, line 1`}
        data-testid={`ui-shot-${index + 1}-title-1`}
        placeholder="Title (optional)"
        maxLength={MAX_TITLE_LINE_CHARS}
        value={l1}
        disabled={busy}
        onChange={(e) => setLines(e.target.value, l2)}
      />
      <input
        type="text"
        aria-label={`Shot ${index + 1} title, line 2`}
        data-testid={`ui-shot-${index + 1}-title-2`}
        placeholder="Second line (optional)"
        maxLength={MAX_TITLE_LINE_CHARS}
        value={l2}
        disabled={busy}
        onChange={(e) => setLines(l1, e.target.value)}
      />
      <div className="sos-frow" role="group" aria-label={`Shot ${index + 1} title position`}>
        {TITLE_POSITIONS.map((p) => (
          <button
            key={p}
            type="button"
            className="sos-pchip"
            data-testid={`ui-shot-${index + 1}-title-${p}`}
            data-on={title.pos === p || undefined}
            aria-pressed={title.pos === p}
            disabled={busy}
            onClick={() => set({ pos: p })}
          >
            {POS_LABELS[p]}
          </button>
        ))}
      </div>
    </div>
  );
}
