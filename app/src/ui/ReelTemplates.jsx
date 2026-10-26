import { useState } from "react";
import { REEL_TEMPLATES } from "../animation/reelTemplates.js";
import * as animationStore from "../animation/animationStore.js";

export default function ReelTemplates({ busy, onApplied }) {
  const [applied, setApplied] = useState(null);

  const applyTemplate = (template) => {
    if (busy) return;
    animationStore.resetSequence();
    animationStore.setShot(0, template.shots[0]);
    for (let i = 1; i < template.shots.length; i++) {
      const r = animationStore.addShot();
      if (r.ok) animationStore.setShot(i, template.shots[i]);
    }
    setApplied(template.id);
    onApplied?.();
  };

  const totalS = (t) => t.shots.reduce((n, s) => n + s.durationS, 0);

  return (
    <div className="reel-templates">
      <div className="reel-templates-label">Templates</div>
      <div className="reel-templates-grid">
        {REEL_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            className="reel-tpl-card"
            data-active={applied === t.id || undefined}
            disabled={busy}
            title={`${t.shots.length} shot${t.shots.length !== 1 ? "s" : ""} · ${totalS(t)} s`}
            onClick={() => applyTemplate(t)}
          >
            <span className="reel-tpl-icon">{t.icon}</span>
            <span className="reel-tpl-name">{t.name}</span>
            <span className="reel-tpl-meta">{t.shots.length}s · {totalS(t)}s</span>
          </button>
        ))}
      </div>
    </div>
  );
}
