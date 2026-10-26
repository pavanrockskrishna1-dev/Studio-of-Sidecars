// The Reel moment the stage is showing while a keyed preview or export runs:
// shot index and seconds into that shot. Written by applyKeyed (keyedScene.js),
// read by effects that must happen at an exact Reel moment (e.g. the bat burst).
export const reelTime = { active: false, shot: -1, t: 0 };
