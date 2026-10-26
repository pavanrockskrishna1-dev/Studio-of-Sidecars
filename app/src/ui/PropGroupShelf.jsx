import { useState } from "react";
import { PROP_GROUPS } from "../ai/propGroups.js";
import * as garageStore from "../garage/garageStore.js";
import * as garageMode from "../garage/garageMode.js";

async function applyGroup(group, setBusy) {
  const stageApi = garageMode.apiRef.current;
  if (!stageApi || typeof stageApi.addObject !== "function") return;
  setBusy(true);
  try {
    const layout = garageStore.getLayout();
    if (layout) {
      for (const item of layout.items.slice()) {
        if (!item.primary) garageStore.removeItem(item.itemId);
      }
    }
    const floorY = typeof stageApi.getFloorY === "function" ? stageApi.getFloorY() : 0;
    for (const p of group.props) {
      await stageApi.addObject(p.id, {
        transform: { x: p.x, y: floorY + p.y, z: p.z, rx: 0, ry: 0, rz: 0, s: p.s ?? 1 },
      });
    }
  } finally {
    setBusy(false);
  }
}

function clearStage(setBusy) {
  setBusy(true);
  try {
    const layout = garageStore.getLayout();
    if (layout) {
      for (const item of layout.items.slice()) {
        if (!item.primary) garageStore.removeItem(item.itemId);
      }
    }
  } finally {
    setBusy(false);
  }
}

export default function PropGroupShelf() {
  const [busy, setBusy] = useState(false);
  return (
    <div className="sos2-propgroup-shelf" data-testid="ui-prop-groups">
      <span className="sos2-sheet-subhead">
        Scene Groups {busy ? <span className="sos2-propgroup-loading">placing…</span> : null}
      </span>
      <div className="sos2-propgroup-grid">
        {PROP_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            className="sos2-propgroup-chip"
            data-testid={`ui-propgroup-${g.id}`}
            disabled={busy}
            onClick={() => applyGroup(g, setBusy)}
          >
            <span className="sos2-propgroup-icon">{g.icon}</span>
            <span className="sos2-propgroup-name">{g.name}</span>
            <span className="sos2-propgroup-count">{g.props.length} props</span>
          </button>
        ))}
        <button
          type="button"
          className="sos2-propgroup-chip sos2-propgroup-clear"
          data-testid="ui-propgroup-clear"
          disabled={busy}
          onClick={() => clearStage(setBusy)}
        >
          <span className="sos2-propgroup-icon">🗑️</span>
          <span className="sos2-propgroup-name">Clear Stage</span>
          <span className="sos2-propgroup-count">remove all</span>
        </button>
      </div>
    </div>
  );
}
