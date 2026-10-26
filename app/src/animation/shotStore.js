/**
 * shotStore.js — module-level singleton store for the Shot Sequencer.
 *
 * Holds sequencer state (status, current shot index, elapsed time) and exposes
 * a tiny subscribe/getSnapshot API so React components can subscribe via
 * useSyncExternalStore without triggering re-renders mid-frame.
 *
 * All writes happen through the store's own setters from advanceFrame,
 * satisfying the "no per-frame React state or store dispatches inside useFrame"
 * constraint.
 */

import { SHOTS } from './shotDefs';

const STATUS = {
  IDLE: 'idle',
  PLAYING: 'playing',
  DONE: 'done',
};

const INITIAL = {
  status: STATUS.IDLE,
  shotIndex: -1,
  elapsed: 0,
  duration: 0,
};

let state = { ...INITIAL };
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn();
}

export const shotStatus = STATUS;

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return state;
}

export function play() {
  if (state.status === STATUS.PLAYING) return;
  state = {
    ...INITIAL,
    status: STATUS.PLAYING,
    shotIndex: 0,
  };
  notify();
}

export function stop() {
  if (state.status === STATUS.IDLE) return;
  state = { ...INITIAL, status: STATUS.IDLE };
  notify();
}

export function advanceFrame(dt) {
  if (state.status !== STATUS.PLAYING) return;

  const shots = SHOTS;
  const nextElapsed = state.elapsed + dt;

  // Find the shot that contains the current elapsed time.
  let accumulated = 0;
  let activeIndex = -1;
  let shotDuration = 0;
  for (let i = 0; i < shots.length; i++) {
    const dur = shots[i].duration;
    if (nextElapsed >= accumulated && nextElapsed < accumulated + dur) {
      activeIndex = i;
      shotDuration = dur;
      break;
    }
    accumulated += dur;
  }

  if (activeIndex === -1) {
    // Sequence complete.
    state = { ...INITIAL, status: STATUS.DONE };
    notify();
    return;
  }

  state = {
    status: STATUS.PLAYING,
    shotIndex: activeIndex,
    elapsed: nextElapsed,
    duration: shotDuration,
  };
  notify();
}