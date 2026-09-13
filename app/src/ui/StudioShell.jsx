import { useEffect, useState } from "react";
import "./ui-shell.css";
import TopHeader from "./TopHeader";
import VersionTabs from "./VersionTabs";
import CreatorSidebar from "./CreatorSidebar";
import InspectorRail from "./InspectorRail";
import useFloatingPanelRect from "./useFloatingPanelRect";
import { getEnvironment, DEFAULT_ENVIRONMENT_ID } from "../environments/registry";

/* ==========================================================================
   StudioShell — the creator UI (Agent #2 · UI ONLY)
   --------------------------------------------------------------------------
   Composes the whole chrome layer: top header, floating V1–V6 tabs, the left
   creator sidebar and the right inspector rail.

   Integration is deliberately additive. It mounts as a SIBLING of <App/> in
   src/main.jsx rather than by editing App.jsx (Studio Engine territory), and
   every region is `position: fixed` inside one pointer-transparent wrapper, so
   the WebGL stage keeps the full viewport: the canvas never shrinks, and orbit
   / zoom / pan / picking behave exactly as before outside the panels.

   Z-order: shell 8 < StudioControls 10 < SelectionInspector 20 < Capture 40.
   The shell can therefore never cover an engine control; where the two would
   share a corner it parks underneath instead — see useFloatingPanelRect.
   ========================================================================== */

// clearance the chrome keeps around a measured engine panel
const DODGE_GAP = 10;
const COLUMN_GAP = 10;

// The design package's own compact tier: below this width the rails shrink to
// icon strips so the stage keeps priority (Phase-1 keeps 96px icon rails on a
// portrait tablet). Users can override either rail at any size.
const NARROW_QUERY = "(max-width: 1140px)";

function useNarrow() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia(NARROW_QUERY).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

export default function StudioShell() {
  // The engine owns environment state; until it is lifted out of App.jsx the
  // header reads the locked hero default from the environment registry, so the
  // shell never invents its own source of truth. TopHeader takes an
  // `environment` prop, so a one-line state lift in App makes it live.
  const environment = getEnvironment(DEFAULT_ENVIRONMENT_ID);

  const shoot = useFloatingPanelRect("shoot-controls");
  const selection = useFloatingPanelRect("selection-inspector");
  const narrow = useNarrow();
  // undefined = follow the breakpoint, boolean = user override
  const [sideMin, setSideMin] = useState();
  const [railMin, setRailMin] = useState();
  const sideCollapsed = sideMin ?? narrow;
  const railCollapsed = railMin ?? narrow;

  // The engine panel's column is reserved at its REAL width, so a header
  // action can never slide underneath it on a narrower window.
  const style = shoot
    ? { "--sos-engine-col": `${shoot.width + COLUMN_GAP * 2}px` }
    : undefined;

  return (
    <div
      className="sos-shell"
      data-sos-shell=""
      data-side-min={sideCollapsed || undefined}
      data-rail-min={railCollapsed || undefined}
      style={style}
    >
      <TopHeader environment={environment} />
      <VersionTabs />
      <CreatorSidebar
        dodgeBelow={selection ? selection.bottom + DODGE_GAP : 0}
        collapsed={sideCollapsed}
        onCollapse={() => setSideMin(!sideCollapsed)}
      />
      <InspectorRail
        dodgeBelow={shoot ? shoot.bottom + DODGE_GAP : 0}
        collapsed={railCollapsed}
        onCollapse={() => setRailMin(!railCollapsed)}
      />
    </div>
  );
}
