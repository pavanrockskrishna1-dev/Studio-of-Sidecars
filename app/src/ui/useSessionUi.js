import { useEffect, useState } from "react";
import { readSavedSession, restoreSession, resetSession, saveSession } from "../session/studioSession";

/* ==========================================================================
   Slice U1, Stage B1 — Save sheet state (new file, UI ONLY)
   --------------------------------------------------------------------------
   The editable project name (follows the loaded asset until edited), the
   "can restore" flag and the short "Saved / Restored / Reset" flash that the
   old header kept in StudioShell. All three actions are the same
   studioSession.js calls the header made; nothing in the session module
   changed.
   ========================================================================== */

export default function useSessionUi(assetName) {
  const [nameOverride, setNameOverride] = useState(null);
  const [canRestore, setCanRestore] = useState(() => Boolean(readSavedSession()));
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    if (!flash) return undefined;
    const t = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(t);
  }, [flash]);

  const onSave = () => {
    const res = saveSession(nameOverride);
    if (res.ok) {
      setCanRestore(true);
      setFlash("saved");
    } else {
      setFlash("save failed");
    }
  };
  const onRestore = () => {
    const snap = restoreSession();
    if (!snap) return;
    setNameOverride(snap.projectName ?? null);
    setFlash("restored");
  };
  const onReset = () => {
    if (!window.confirm("Reset the entire studio session? Camera, lighting, environment, materials, transforms and viewer controls return to their defaults.")) return;
    if (resetSession()) {
      setNameOverride(null);
      setFlash("reset");
    }
  };

  return {
    projectName: nameOverride ?? assetName,
    onProjectNameChange: setNameOverride,
    onProjectNameBlur: () => {
      if (nameOverride !== null && !nameOverride.trim()) setNameOverride(null);
    },
    canRestore,
    flash,
    onSave,
    onRestore,
    onReset,
  };
}
