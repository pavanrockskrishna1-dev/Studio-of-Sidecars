import { useSyncExternalStore } from "react";
import * as parallaxBgStore from "../fx/parallaxBgStore";
import { ENVS } from "../fx/ParallaxBg";

const SWATCHES = {
  city:    "#0e122a",
  market:  "#3d0f05",
  desert:  "#8b3a00",
  arcade:  "#04000c",
  forest:  "#0d2218",
  rooftop: "#060810",
};

export default function EnvPicker() {
  const { env } = useSyncExternalStore(parallaxBgStore.subscribe, parallaxBgStore.getSnapshot);
  return (
    <div className="sos2-env-wrap">
      <div className="sos2-env-row">
        <button
          className={`sos2-env-btn${!env ? " active" : ""}`}
          onClick={() => parallaxBgStore.clearEnv()}
        >Off</button>
        {ENVS.map(e => (
          <button
            key={e.id}
            className={`sos2-env-btn${env === e.id ? " active" : ""}`}
            onClick={() => parallaxBgStore.setEnv(e.id)}
            title={e.label}
          >
            <span className="sos2-env-swatch" style={{ background: SWATCHES[e.id] }} />
            <span className="sos2-env-label">{e.label}</span>
          </button>
        ))}
      </div>
      {env && (
        <p className="sos2-env-hint">Move your mouse to see parallax depth</p>
      )}
    </div>
  );
}
