/* ENGINE · onboarding.js — Phase 3. Learn Studio: spotlight + tooltips + video placeholders. */
import { CFG } from './config.js';

const STEPS = [
  { target: '#dock label[for="tlCam"]', title: 'Camera', icon: 'camera',
    body: 'Tap a one-tap framing — Front, ¾ hero, Side, Detail, Top — or drag the stage to orbit freely.' },
  { target: '#dock label[for="tlLight"]', title: 'Lighting', icon: 'sun',
    body: 'Cycle cinematic looks: Softbox, Café window, Golden hour, Night neon, Backlit rim.' },
  { target: '#dock label[for="tlMat"]', title: 'Materials', icon: 'palette',
    body: 'Tap a part of the product to select it, then apply a quick finish or fine-tune it in the inspector.' },
  { target: '#dock label[for="tlFloor"]', title: 'Floor', icon: 'cube',
    body: 'Swap the studio floor — Gloss Black Mirror, White Studio, Café Wood, Concrete, Marble.' },
  { target: '.cv-toggle', title: 'Demo / Empty', icon: 'coffee',
    body: 'Demo keeps the product staged. Empty clears the stage so you can drop in your own GLB sidecar.' },
  { target: '#tbExport', title: 'Export Studio', icon: 'dl',
    body: 'Render PNG/JPG/transparent stills, record a reel, or export the scene as GLB.' },
  { target: '#tbHelp', title: 'Shortcuts', icon: 'play',
    body: 'G move · R rotate · S scale · X delete · Z undo · ⇧Z redo. Watch the mini tutorial below when you are ready.' },
];

export function init(engine) {
  engine.onboarding = { open: false, step: 0 };
}

function buildOverlay(engine, onClose) {
  const host = document.getElementById('sosOv');
  if (!host) return null;
  host.classList.add('p3');
  host.hidden = false;
  host.innerHTML = '';
  const ov = document.createElement('div');
  ov.className = 'p3-tour';
  ov.innerHTML = `
    <div class="p3-spot"></div>
    <div class="p3-tooltip">
      <div class="p3-tt-head"><i data-i></i><b data-t></b><button class="p3-x" title="Close">✕</button></div>
      <div class="p3-tt-body"><span data-b></span>
        <div class="p3-video-slot"><i data-play></i><span>Video placeholder · sample reel</span></div>
      </div>
      <div class="p3-tt-foot"><span data-step></span><button data-back>Back</button><button data-next>Next</button></div>
    </div>`;
  host.appendChild(ov);
  engine._tour = { host, ov, onClose };
  return ov;
}

export function start(engine) {
  if (engine.onboarding.open) { stop(engine); return; }
  engine.onboarding.open = true;
  const ov = buildOverlay(engine, () => stop(engine));
  if (!ov) return;
  engine.onboarding.step = 0;
  bindTour(engine, ov);
  showStep(engine, 0);
}
export function stop(engine) {
  const t = engine._tour;
  engine.onboarding.open = false;
  if (t) {
    t.ov.remove();
    if (t.host) { t.host.innerHTML = ''; t.host.hidden = true; t.host.classList.remove('p3'); }
  }
  engine._tour = null;
  try { localStorage.setItem('sos:p3:tour', 'done'); } catch (e) {}
}
function markDone(engine) { try { localStorage.setItem('sos:p3:tour', 'done'); } catch (e) {} }

function bindTour(engine, ov) {
  const icons = { camera: 'camera', sun: 'sun', palette: 'palette', cube: 'cube', coffee: 'coffee', dl: 'dl', play: 'play' };
  ov.querySelector('.p3-x').onclick = () => stop(engine);
  ov.querySelector('[data-back]').onclick = () => { const s = Math.max(0, engine.onboarding.step - 1); engine.onboarding.step = s; showStep(engine, s); };
  ov.querySelector('[data-next]').onclick = () => {
    if (engine.onboarding.step >= STEPS.length - 1) { markDone(engine); stop(engine); return; }
    const s = engine.onboarding.step + 1; engine.onboarding.step = s; showStep(engine, s);
  };
}

function spotEl(engine, targetSel) {
  const el = document.querySelector(targetSel);
  return el;
}

function showStep(engine, i) {
  const t = engine._tour; if (!t) return;
  const ov = t.ov;
  const s = STEPS[i];
  const icons = { camera: 'camera', sun: 'sun', palette: 'palette', cube: 'cube', coffee: 'coffee', dl: 'dl', play: 'play' };
  ov.querySelector('[data-t]').textContent = s.title;
  ov.querySelector('[data-i]').innerHTML = `<svg class="pi pi-${icons[s.icon] || 'play'}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><use href="#pi-${icons[s.icon] || 'play'}"/></svg>`;
  ov.querySelector('[data-b]').textContent = s.body;
  ov.querySelector('[data-step]').textContent = (i + 1) + ' / ' + STEPS.length;
  const next = ov.querySelector('[data-next]');
  next.textContent = (i === STEPS.length - 1) ? 'Done' : 'Next';
  const tgt = spotEl(engine, s.target);
  const spot = ov.querySelector('.p3-spot');
  if (tgt) {
    const r = tgt.getBoundingClientRect();
    const pad = 10;
    spot.style.display = 'block';
    spot.style.left = (r.left - pad) + 'px';
    spot.style.top = (r.top - pad) + 'px';
    spot.style.width = (r.width + pad * 2) + 'px';
    spot.style.height = (r.height + pad * 2) + 'px';
    // tooltip above the target when space allows
    const tip = ov.querySelector('.p3-tooltip');
    tip.style.left = Math.min(Math.max(r.left - 40, 12), innerWidth - 380) + 'px';
    tip.style.top = (r.top - tip.offsetHeight - 26 > 8 ? r.top - tip.offsetHeight - 26 : r.bottom + 18) + 'px';
  } else {
    spot.style.display = 'none';
    const tip = ov.querySelector('.p3-tooltip');
    tip.style.left = '50%'; tip.style.top = '36%'; tip.style.transform = 'translateX(-50%)';
  }
}
export function restartIfNeeded(engine) {
  try { if (localStorage.getItem('sos:p3:tour') !== 'done') start(engine); } catch (e) { start(engine); }
}
