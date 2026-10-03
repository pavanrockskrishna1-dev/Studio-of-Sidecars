/* ==========================================================================
   Slice U1, Stage A — floating status capsule (new file, UI ONLY)
   --------------------------------------------------------------------------
   Top-centre floating pill: brand + product name today. Status messages
   (selected part + size + material, export progress) are a Stage B item and
   are not built yet — this component is intentionally the only place that
   text is composed so that later addition is a one-file change.
   ========================================================================== */

export default function StudioCapsule({ productName, idle }) {
  return (
    <div className="sos2-capsule" data-idle={idle || undefined} role="status" aria-label="Studio status">
      <span className="sos2-capsule-brand">Studio of Sidecars</span>
      {productName ? (
        <>
          <span className="sos2-capsule-dot" aria-hidden="true">
            ·
          </span>
          <span className="sos2-capsule-product">{productName}</span>
        </>
      ) : null}
    </div>
  );
}
