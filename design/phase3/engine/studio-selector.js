/* ENGINE · studio-selector.js — Phase 3 Extended · Product selector UI + state manager.
   Handles Coffee Bike ↔ Cessna 172 switching, environment/camera/light sync per product. */

import { STUDIO_CATALOG, STUDIO_ENV_AFFINITY, STUDIO_LIGHT_AFFINITY, STUDIO_FLOOR_AFFINITY, StudioManager } from './config-dual-studio.js';

export function initStudioSelector(engine) {
  // Create global studio manager
  engine.studioManager = new StudioManager('coffee_bike');
  engine.currentStudioId = 'coffee_bike';

  // Listen for studio changes
  engine.studioManager.on('studio-changed', async (studioId) => {
    await switchStudio(engine, studioId);
  });

  // Build UI selector (inject into existing toolbar)
  buildStudioSelectorUI(engine);
}

/* Main studio switcher: loads product model, syncs camera/env/light */
export async function switchStudio(engine, studioId) {
  const studio = STUDIO_CATALOG[studioId];
  if (!studio) {
    console.error(`Studio ${studioId} not found`);
    return;
  }

  console.info(`[Studio] Switching to ${studio.label}...`);
  engine._noHistory = true;

  try {
    // 1. Clear scene
    const SceneMod = engine.SceneMod || await import('./scene.js');
    SceneMod.clearModels(engine);

    // 2. Load product model(s)
    const AssetMod = engine.AssetMod || await import('./assets.js');
    
    if (studioId === 'cessna_172') {
      // Load Cessna as multi-part assembly
      await loadAircraftAssembly(engine, studio, AssetMod);
    } else {
      // Load Coffee Bike as single/dual model
      await AssetMod.loadModel(engine, studio.model.path, { isDemo: true });
      if (studio.model.secondary) {
        await AssetMod.loadModel(engine, studio.model.secondary, { isSecondary: true });
      }
    }

    // 3. Sync environment
    const EnvMod = engine.EnvMod || await import('./environment.js');
    const affineEnv = STUDIO_ENV_AFFINITY[studioId][0];
    await EnvMod.setEnv(engine, affineEnv || studio.defaultEnv, { immediate: true });

    // 4. Sync lighting
    const LightMod = engine.LightMod || await import('./lighting.js');
    const affineLight = STUDIO_LIGHT_AFFINITY[studioId][0];
    LightMod.applyPreset(engine, affineLight || studio.defaultLight, { silent: true });

    // 5. Sync floor
    const floor = STUDIO_FLOOR_AFFINITY[studioId][0];
    SceneMod.buildFloor(engine, floor || studio.defaultFloor);

    // 6. Set camera
    const CameraMod = engine.CameraMod || await import('./camera.js');
    const defaultCam = studio.cameras[studio.defaultCam] || studio.cameras['¾ hero'];
    CameraMod.setPreset(engine, studio.defaultCam, { instant: true });

    // 7. Update UI
    engine.currentStudioId = studioId;
    updateStudioSelectorUI(engine, studioId);
    refreshStudioInfo(engine, studio);

    // 8. Refresh HUD
    if (engine.ui && engine.ui.stats) engine.ui.stats();

    console.info(`[Studio] ${studio.label} loaded. Models: ${engine.models.length}, Parts: ${engine.parts?.length || 0}`);

  } catch (err) {
    console.error(`[Studio] Failed to switch to ${studioId}:`, err);
  } finally {
    engine._noHistory = false;
  }
}

/* Load Cessna 172 as multi-part assembly (fuselage + engine + propeller + wings + gear) */
async function loadAircraftAssembly(engine, studio, AssetMod) {
  const parts = studio.model.parts || [];
  
  // Load fuselage (primary)
  console.info('[Aircraft] Loading fuselage...');
  await AssetMod.loadModel(engine, studio.model.path, { isDemo: true });

  // Load each part and position
  for (const part of parts) {
    console.info(`[Aircraft] Loading ${part.name}...`);
    try {
      const entry = await AssetMod.loadModel(engine, part.path, { isSecondary: true });
      if (entry && entry.root && part.position) {
        // Position part in scene
        entry.root.position.set(...part.position);
        console.info(`[Aircraft] ${part.name} positioned at [${part.position.join(', ')}]`);
      }
    } catch (err) {
      console.warn(`[Aircraft] Failed to load ${part.name}:`, err);
      // Graceful fallback: continue with other parts
    }
  }
}

/* Build selector UI (horizontal pill buttons or dropdown) */
function buildStudioSelectorUI(engine) {
  if (!engine.dom || !engine.dom.stage) return;

  const selectorContainer = document.createElement('div');
  selectorContainer.id = 'studio-selector';
  selectorContainer.className = 'studio-selector';
  selectorContainer.innerHTML = `
    <div class="selector-wrap">
      <label class="selector-label">Studio:</label>
      <div class="selector-pills">
        <button class="selector-pill on" data-studio="coffee_bike">
          <span class="icon">☕</span>
          <span class="label">Coffee Bike</span>
        </button>
        <button class="selector-pill" data-studio="cessna_172">
          <span class="icon">✈️</span>
          <span class="label">Cessna 172</span>
        </button>
      </div>
    </div>
  `;

  // Insert before dock (floating toolbar)
  const dock = document.getElementById('dock');
  if (dock && dock.parentNode) {
    dock.parentNode.insertBefore(selectorContainer, dock);
  } else {
    engine.dom.stage.appendChild(selectorContainer);
  }

  // Wire click handlers
  selectorContainer.querySelectorAll('.selector-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const studioId = btn.dataset.studio;
      engine.studioManager.switchStudio(studioId);
    });
  });

  // Add to engine for updates
  engine.studioSelectorUI = selectorContainer;
}

/* Update selector UI after switch */
function updateStudioSelectorUI(engine, studioId) {
  if (!engine.studioSelectorUI) return;

  engine.studioSelectorUI.querySelectorAll('.selector-pill').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.studio === studioId);
  });
}

/* Refresh HUD legend with product info */
function refreshStudioInfo(engine, studio) {
  const legend = engine.dom?.legend;
  if (!legend) return;

  legend.innerHTML = `${studio.label} · ${studio.description.toUpperCase()} · PHASE 3 ENGINE`;
}

/* Export switcher functions for external use */
export { switchStudio, loadAircraftAssembly };
