/* ENGINE · config-dual-studio.js — Phase 3 Extended · Dual-studio mode (Coffee Bike + Cessna 172).
   Extends config.js with product catalogs, camera presets per product, and aircraft-specific settings. */

export const STUDIO_CATALOG = {
  coffee_bike: {
    id: 'coffee_bike',
    label: 'Coffee Bike',
    short: 'CB',
    icon: '☕',
    description: 'Premium commercial coffee delivery motorcycle',
    model: { path: 'assets/models/demo-coffee-set.glb', secondary: 'assets/models/demo-bbq-bike.glb' },
    defaultEnv: 'coffee_roastery_workshop',
    defaultCam: '¾ hero',
    defaultFloor: 'Café Wood',
    defaultLight: 'Café window',
    materials: [
      { name: 'Frame', color: '#2a2d33', rough: 0.92, metal: 0.0 },
      { name: 'Engine Block', color: '#1a1a1a', rough: 0.78, metal: 0.15 },
      { name: 'Chrome', color: '#c8ccd2', rough: 0.32, metal: 0.95 },
      { name: 'Seat', color: '#6b4a2c', rough: 0.5, metal: 0.0 },
    ],
    cameras: {
      'Front': { az: 0.0, el: 0.06, dist: 3.1 },
      '¾ hero': { az: -0.62, el: 0.34, dist: 3.4 },
      'Side': { az: Math.PI / 2, el: 0.02, dist: 3.6 },
      'Detail': { az: -0.9, el: 0.42, dist: 1.55 },
      'Top': { az: 0.0, el: 1.46, dist: 2.6 },
      'Orbit spin': { az: 0.0, el: 0.3, dist: 3.6, orbit: true },
      'Reel 9:16': { az: -0.32, el: 0.28, dist: 3.2 }, // Instagram stories
    },
  },
  cessna_172: {
    id: 'cessna_172',
    label: 'Cessna 172',
    short: 'C172',
    icon: '✈️',
    description: 'Classic high-wing aircraft - 4-seat general aviation',
    model: {
      path: 'assets/models/cessna-172-fuselage.glb',
      parts: [
        { name: 'engine', path: 'assets/models/cessna-172-engine.glb', position: [0, 0.5, -1.2] },
        { name: 'propeller', path: 'assets/models/cessna-172-propeller.glb', position: [0, 0.55, -1.5] },
        { name: 'wings', path: 'assets/models/cessna-172-wings.glb', position: [0, 0.3, 0] },
        { name: 'landing_gear', path: 'assets/models/cessna-172-gear.glb', position: [0, 0, 0] },
      ],
    },
    defaultEnv: 'aviation_heritage_hangar',
    defaultCam: '¾ hero',
    defaultFloor: 'Concrete Loft',
    defaultLight: 'Softbox',
    materials: [
      { name: 'Fuselage', color: '#ffffff', rough: 0.16, metal: 0.0 }, // Classic white
      { name: 'Engine Block', color: '#3a3a3a', rough: 0.88, metal: 0.05 },
      { name: 'Propeller', color: '#1a1a1a', rough: 0.72, metal: 0.2 },
      { name: 'Landing Gear', color: '#2a2d33', rough: 0.92, metal: 0.0 },
      { name: 'Windshield', color: '#a8c5d9', rough: 0.05, metal: 0.3 },
    ],
    cameras: {
      'Front': { az: 0.0, el: 0.08, dist: 8.5 },
      '¾ hero': { az: -0.52, el: 0.32, dist: 9.2 },
      'Side Profile': { az: Math.PI / 2, el: 0.12, dist: 10.0 },
      'Below': { az: -0.9, el: -0.35, dist: 7.5 },
      'Top': { az: 0.0, el: 1.4, dist: 9.0 },
      'Orbit spin': { az: 0.0, el: 0.28, dist: 9.5, orbit: true },
      'Reel 9:16': { az: -0.32, el: 0.25, dist: 8.8 }, // Instagram stories
      'Cockpit': { az: 0.0, el: 0.5, dist: 2.2 }, // Interior close-up
    },
  },
};

/* Product-specific environment selections */
export const STUDIO_ENV_AFFINITY = {
  coffee_bike: [
    'coffee_roastery_workshop',
    'vintage_garage_studio',
    'industrial_steel_factory',
    'coal_and_fire_forge',
    'hero',
  ],
  cessna_172: [
    'aviation_heritage_hangar',
    'royal_enfield_heritage_workshop', // Can work as workshop backdrop
    'matte_white_photography_studio',
    'marble_luxury_showroom',
    'hero',
  ],
};

/* Product-specific lighting */
export const STUDIO_LIGHT_AFFINITY = {
  coffee_bike: ['Café window', 'Golden hour', 'Softbox', 'Night neon'],
  cessna_172: ['Softbox', 'Night neon', 'Backlit rim', 'Café window'],
};

/* Product-specific floors */
export const STUDIO_FLOOR_AFFINITY = {
  coffee_bike: ['Café Wood', 'Concrete Loft', 'White Studio', 'Gloss Black Mirror'],
  cessna_172: ['Concrete Loft', 'White Studio', 'Gloss Black Mirror', 'Marble Luxury'],
};

/* Global product state manager (to be integrated into engine) */
export class StudioManager {
  constructor(defaultStudio = 'coffee_bike') {
    this.currentStudio = defaultStudio;
    this.studios = STUDIO_CATALOG;
    this.listeners = [];
  }

  switchStudio(studioId) {
    if (!this.studios[studioId]) {
      console.warn(`Studio ${studioId} not found`);
      return false;
    }
    this.currentStudio = studioId;
    this.notify('studio-changed', studioId);
    return true;
  }

  getCurrent() {
    return this.studios[this.currentStudio];
  }

  getCurrentConfig() {
    const studio = this.getCurrent();
    return {
      id: studio.id,
      label: studio.label,
      model: studio.model,
      env: studio.defaultEnv,
      camera: studio.defaultCam,
      floor: studio.defaultFloor,
      light: studio.defaultLight,
      cameras: studio.cameras,
    };
  }

  on(event, callback) {
    this.listeners.push({ event, callback });
  }

  notify(event, data) {
    this.listeners
      .filter(l => l.event === event)
      .forEach(l => l.callback(data));
  }
}

export default STUDIO_CATALOG;
