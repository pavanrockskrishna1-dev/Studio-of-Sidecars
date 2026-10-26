import { useSyncExternalStore } from "react";
import * as shotStore from "../animation/shotStore.js";
import * as lowerThirdStore from "../animation/lowerThirdStore.js";

export default function LowerThird() {
  const shotStatus = useSyncExternalStore(
    shotStore.subscribe, shotStore.getSnapshot, shotStore.getSnapshot
  ).status;
  const { enabled, title, subtitle } = useSyncExternalStore(
    lowerThirdStore.subscribe, lowerThirdStore.getSnapshot, lowerThirdStore.getSnapshot
  );

  const visible = enabled && shotStatus === "playing";

  return (
    <div className="lower-third" data-visible={visible || undefined} aria-hidden="true">
      <div className="lower-third__bar" />
      <div className="lower-third__copy">
        <span className="lower-third__title">{title}</span>
        <span className="lower-third__sub">{subtitle}</span>
      </div>
    </div>
  );
}
