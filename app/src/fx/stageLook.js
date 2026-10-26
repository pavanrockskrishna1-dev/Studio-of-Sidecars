// The stage's look. "studio" (default): the environment's backdrop photo and
// the studio lights. "night": the stage's own night set (NightStage.jsx) - a
// dark sky, a ground, moonlight - with no backdrop photo or HDRI. "day": an
// outdoor daylight set (DayStage.jsx) - a blue sky, a ground, a warm sun -
// also with no backdrop photo or HDRI.
// `ground` is the selectable ground surface (groundSurfaces.js) the Day and
// Night stages stand the bike and props on; the studio look ignores it (it
// keeps its backdrop photo and floor disc). Switching to a different stage
// resets ground to that stage's own default (DEFAULT_GROUND) unless a ground
// id is passed explicitly - so a project/session that saved one can restore
// it exactly (see setStageLook below and session/studioSession.js).
import { DEFAULT_GROUND, isGroundId } from "./groundSurfaces.js";

let state = { look: "studio", ground: DEFAULT_GROUND.night };
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export const getSnapshot = () => state;

/** @param {string} look "studio" | "night" | "day"
    @param {string} [ground] a specific ground surface id to restore; left out
    picks that stage's own default ONLY when `look` is actually changing. */
export function setStageLook(look, ground) {
  const next = look === "night" || look === "day" ? look : "studio";
  let nextGround = state.ground;
  if (isGroundId(ground)) nextGround = ground;
  else if (next !== state.look && DEFAULT_GROUND[next]) nextGround = DEFAULT_GROUND[next];
  if (next === state.look && nextGround === state.ground) return;
  state = { look: next, ground: nextGround };
  for (const fn of listeners) fn();
}

export function setGround(id) {
  if (!isGroundId(id) || id === state.ground) return;
  state = { ...state, ground: id };
  for (const fn of listeners) fn();
}

// true for either stage with its own sky/ground/lights and no backdrop photo
// or HDRI (NightStage.jsx, DayStage.jsx) - everywhere StudioCanvas treats
// "night" specially, it treats "day" the same way.
export const isOutdoor = (look) => look === "night" || look === "day";
