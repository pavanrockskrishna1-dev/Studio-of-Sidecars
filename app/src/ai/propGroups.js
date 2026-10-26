export const PROP_GROUPS = Object.freeze([
  {
    id: "bbq-stall",
    name: "BBQ Stall",
    icon: "🔥",
    props: [
      { id: "prop-bbqsmith-barrel-table", x: -3.8, y: 0,    z: 1.0, s: 1.0 },
      { id: "prop-bbqsmith-barrel-table", x:  3.8, y: 0,    z: 0.8, s: 1.0 },
      { id: "prop-bbq-chicken-burger",    x: -3.8, y: 0.92, z: 1.0, s: 1.2 },
      { id: "prop-bbq-box-open",          x:  3.8, y: 0.92, z: 0.8, s: 1.2 },
      { id: "prop-fire-barrel",           x: -2.5, y: 0,    z: 2.0, s: 1.0 },
    ],
  },
  {
    id: "night-market",
    name: "Night Market",
    icon: "🌃",
    props: [
      { id: "prop-street-light", x: -5.0, y: 0, z: -0.5, s: 1.0 },
      { id: "prop-street-light", x:  5.0, y: 0, z: -0.5, s: 1.0 },
      { id: "prop-fire-barrel",  x: -3.5, y: 0, z:  1.5, s: 1.0 },
      { id: "prop-human-wave",   x:  4.0, y: 0, z:  1.2, s: 1.0 },
    ],
  },
  {
    id: "festival",
    name: "Festival",
    icon: "🎉",
    props: [
      { id: "prop-balloons",      x: -4.0, y: 0, z:  1.0, s: 1.0 },
      { id: "prop-balloons",      x:  4.0, y: 0, z:  1.0, s: 1.0 },
      { id: "prop-stylized-tree", x: -6.5, y: 0, z: -2.0, s: 0.7 },
      { id: "prop-stylized-tree", x:  6.5, y: 0, z: -2.0, s: 0.7 },
    ],
  },
  {
    id: "cafe-corner",
    name: "Café Corner",
    icon: "☕",
    props: [
      { id: "prop-blackboard",   x: -4.5, y: 0, z: -0.5, s: 1.0 },
      { id: "prop-table-chairs", x:  4.0, y: 0, z:  0.5, s: 1.0 },
      { id: "prop-dog",          x: -2.5, y: 0, z:  1.5, s: 1.0 },
      { id: "prop-human-walk-f", x:  3.5, y: 0, z:  1.8, s: 1.0 },
    ],
  },
  {
    id: "workshop",
    name: "Workshop",
    icon: "🔧",
    props: [
      { id: "prop-lathe",             x: -5.0, y: 0, z:  0.0, s: 1.0 },
      { id: "prop-milling-machine",   x:  5.0, y: 0, z:  0.0, s: 1.0 },
      { id: "prop-firewood-storage",  x: -3.5, y: 0, z:  1.5, s: 1.0 },
      { id: "prop-bbqsmith-firewood", x:  3.5, y: 0, z: -1.0, s: 1.0 },
    ],
  },
]);
