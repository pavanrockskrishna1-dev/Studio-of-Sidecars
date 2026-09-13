import { useState } from "react";
import Icon from "./icons";
import { BBQ_PACK } from "./bbqPack";

/* ==========================================================================
   BBQ Bike UI pack panel (Agent #2 · UI ONLY, Mission 10B)
   --------------------------------------------------------------------------
   A read-only viewer for the pack's stills, built out of the shell's own
   parts: the glass plate, 12px radii, hairlines, the `.sos-tag` badge and the
   thin-line icon family. It is presentational by construction —

     · no `onSelect`, no bridge, no store: the only state here is which still
       is showing, and it is local to this panel (same as a group's disclosure);
     · plain <img> elements, so nothing can reach the WebGL stage. The pack's
       GLBs are never referenced by the app at runtime;
     · the announced product card in the library above stays inert — this panel
       is where the artwork is allowed to be *seen*.

   Provenance is part of the design: every plate names the file it came from,
   because two of them are not what a visitor would assume (the wordmark reads
   "MACHINE", and the Coffee Bike plate is the pack's untextured geometry).
   ========================================================================== */

function Plate({ item, wide = false }) {
  return (
    <figure className="sos-pack-plate" data-wide={wide || undefined}>
      <img
        className="sos-pack-img"
        src={item.src}
        alt={item.alt || `${item.label} — studio plate preview`}
        width={wide ? 520 : 360}
        height={wide ? 310 : 215}
        loading="lazy"
        decoding="async"
        draggable="false"
      />
      <figcaption className="sos-pack-cap">
        <span className="sos-pack-cap-name">{item.label}</span>
        {item.sub ? <span className="sos-pack-cap-sub">{item.sub}</span> : null}
        {item.source ? <span className="sos-pack-cap-src">{item.source}</span> : null}
      </figcaption>
    </figure>
  );
}

/**
 * Segmented angle control. Deliberately not a set of "real" buttons that could
 * be mistaken for selection: they only change which still the panel shows, and
 * `aria-pressed` states that plainly.
 */
function AngleSwitch({ views, value, onChange }) {
  return (
    <div className="sos-pack-angles" role="group" aria-label="Preview angle">
      {views.map((v) => (
        <button
          key={v.id}
          type="button"
          className="sos-pack-angle"
          data-active={value === v.id || undefined}
          aria-pressed={value === v.id}
          title={`${v.label} — still from ${v.source}`}
          onClick={() => onChange(v.id)}
        >
          {v.short}
        </button>
      ))}
    </div>
  );
}

export default function AssetPreview({ collapsed = false }) {
  const [angle, setAngle] = useState(() => BBQ_PACK.views[0].id);
  const view = BBQ_PACK.views.find((v) => v.id === angle) ?? BBQ_PACK.views[0];

  return (
    <div className="sos-pack" data-testid="bbq-pack" aria-label="BBQ Bike — UI preview pack">
      <div className="sos-pack-brand">
        <img
          className="sos-pack-brand-img"
          src={BBQ_PACK.brand.src}
          alt={BBQ_PACK.brand.alt}
          width="520"
          height="150"
          loading="lazy"
          decoding="async"
          draggable="false"
          title={`${BBQ_PACK.brand.label} — rendered from ${BBQ_PACK.brand.source}`}
        />
        <span className="sos-pack-brand-meta">
          <span className="sos-pack-brand-name">{BBQ_PACK.brand.label}</span>
          <span className="sos-pack-cap-src">{BBQ_PACK.brand.source}</span>
        </span>
        <span className="sos-tag">{BBQ_PACK.tag}</span>
      </div>

      <Plate item={view} wide />
      <AngleSwitch views={BBQ_PACK.views} value={view.id} onChange={setAngle} />

      <div className="sos-pack-block">
        <span className="sos-pack-block-head">
          <span className="sos-row-ico" aria-hidden="true">
            <Icon name="frame" size={13} stroke={1.7} />
          </span>
          Chassis + geometry reference
        </span>
        <div className="sos-pack-refs">
          {BBQ_PACK.references.map((item) => (
            <Plate key={item.id} item={item} />
          ))}
        </div>
      </div>

      <div className="sos-pack-block">
        <span className="sos-pack-block-head">
          <span className="sos-row-ico" aria-hidden="true">
            <Icon name="swatch" size={13} stroke={1.7} />
          </span>
          Material swatches from the pack
        </span>
        <div className="sos-pack-mats">
          {BBQ_PACK.materials.map((m) => (
            <span
              key={m.src}
              className="sos-pack-mat"
              title={`${m.label} — ${m.source}`}
              data-testid={`bbq-material-${m.src.split("/").pop().replace(".jpg", "")}`}
            >
              <img
                src={m.src}
                alt={`${m.label} texture swatch`}
                width="66"
                height="66"
                loading="lazy"
                decoding="async"
                draggable="false"
              />
              <span className="sos-pack-mat-name">{m.label}</span>
            </span>
          ))}
        </div>
      </div>

      <p className="sos-pack-note" data-hidden={collapsed || undefined}>
        <span className="sos-row-ico" aria-hidden="true">
          <Icon name="info" size={13} stroke={1.7} />
        </span>
        <span>{BBQ_PACK.note}</span>
      </p>
    </div>
  );
}
