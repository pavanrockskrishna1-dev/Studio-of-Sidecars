/**
 * shotDefs.js — 6 pre-scripted cinematic camera shots.
 *
 * Each shot is defined by a camera `pos` (THREE.Vector3-like) and a look-at
 * `target`, plus a `duration` in seconds. The sequencer interpolates the live
 * camera between these waypoints across the full sequence.
 *
 * Positions/targets are expressed in world units relative to the scene origin.
 */

export const SHOTS = [
  {
    name: 'Hero Wide',
    pos: [0, 8, 18],
    target: [0, 2, 0],
    duration: 3.0,
  },
  {
    name: 'Low Angle',
    pos: [-6, 1.5, 8],
    target: [0, 3, 0],
    duration: 3.0,
  },
  {
    name: 'Drone Pull',
    pos: [4, 12, 10],
    target: [0, 1, 0],
    duration: 3.5,
  },
  {
    name: 'Close Up',
    pos: [1.5, 2.5, 4.5],
    target: [0, 2, 0],
    duration: 2.5,
  },
  {
    name: 'Overhead',
    pos: [0, 20, 2],
    target: [0, 0, 0],
    duration: 3.0,
  },
  {
    name: 'Exit Flyaway',
    pos: [-8, 4, 6],
    target: [2, 2, -4],
    duration: 3.5,
  },
];