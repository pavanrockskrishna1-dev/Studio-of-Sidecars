import { useState, useSyncExternalStore } from 'react';
import { subscribe, getSnapshot, setOccasion } from '../animation/occasionStore';
import { OCCASIONS, getOccasion } from '../animation/occasionDefs';
import { setGrade } from '../fx/gradeStore';
import { setContent, setEnabled } from '../animation/lowerThirdStore';
import * as garageMode from '../garage/garageMode';
import * as animStore from '../animation/animationStore';
import * as currentProduct from '../products/currentProduct';
import { buildHalloweenSet, SET_PRODUCT_ID } from '../animation/halloweenSet';
import { setLookPreset } from '../fx/lookStore';

/* ==========================================================================
   OccasionSheet — Occasion Pack selector within the Studio's "Occasions" sheet.

   Selecting an occasion applies:
     · cinematic grade (gradeStore)
     · lower-third title + subtitle (lowerThirdStore)
     · particle overlay type (occasionStore → OccasionParticles reads it)
   ========================================================================== */

// occasions with a matching Look (Light → Look); others keep the current look
const OCCASION_LOOKS = { halloween: 'moonlit', diwali: 'sunset' };

function applyOccasion(id) {
  const occ = getOccasion(id);
  setOccasion(id);
  if (OCCASION_LOOKS[id]) setLookPreset(OCCASION_LOOKS[id]);
  if (typeof setGrade === 'function') setGrade(occ.grade);
  setContent(occ.lowerThird.title, occ.lowerThird.subtitle);
  setEnabled(id !== 'none');
}

function copyHashtags(hashtags) {
  const text = hashtags.join(' ');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

// Halloween reel: 5 dramatic cinematic shots totalling 28 s.
const HALLOWEEN_REEL = [
  { move: 'orbit',      startView: 'Low Hero', durationS: 8 },
  { move: 'push-in',    startView: '3/4',      durationS: 4 },
  { move: 'slide',      startView: 'Side',     durationS: 4 },
  { move: 'crane',      startView: 'Front',    durationS: 4 },
  { move: 'pull-back',  startView: '3/4',      durationS: 8 },
];

function buildHalloweenReel() {
  animStore.resetSequence();
  animStore.setShot(0, HALLOWEEN_REEL[0]);
  for (let i = 1; i < HALLOWEEN_REEL.length; i++) {
    animStore.addShot();
    animStore.setShot(i, HALLOWEEN_REEL[i]);
  }
}

export default function OccasionSheet() {
  const [crabStatus, setCrabStatus] = useState('');
  const [reelStatus, setReelStatus] = useState('');
  const [setStatus, setSetStatus] = useState({ busy: false, text: '', notes: [] });
  const productId = useSyncExternalStore(currentProduct.subscribe, currentProduct.getSnapshot, currentProduct.getSnapshot);
  const { occasionId } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const active = getOccasion(occasionId);

  return (
    <div className="sos2-occ-sheet">
      <p className="sos2-occ-intro">
        One tap sets the grade, particles, caption and hashtags for any occasion.
      </p>

      <div className="sos2-occ-grid">
        {OCCASIONS.map(occ => {
          const isActive = occ.id === occasionId;
          return (
            <button
              key={occ.id}
              type="button"
              className="sos2-occ-card"
              data-active={isActive || undefined}
              style={{ '--occ-accent': occ.accent }}
              onClick={() => applyOccasion(occ.id)}
              aria-pressed={isActive}
            >
              <span className="sos2-occ-emoji" aria-hidden="true">{occ.emoji}</span>
              <span className="sos2-occ-name">{occ.name}</span>
              <span className="sos2-occ-tag">{occ.tagline}</span>
            </button>
          );
        })}
      </div>

      {occasionId !== 'none' && (
        <div className="sos2-occ-detail">
          <div className="sos2-occ-detail-head">
            <span style={{ fontSize: 20 }} aria-hidden="true">{active.emoji}</span>
            <span className="sos2-occ-detail-name">{active.name}</span>
          </div>

          <div className="sos2-occ-row">
            <span className="sos2-occ-label">Grade</span>
            <span className="sos2-occ-val">{active.grade}</span>
          </div>
          <div className="sos2-occ-row">
            <span className="sos2-occ-label">Particles</span>
            <span className="sos2-occ-val">{active.particles ?? 'none'}</span>
          </div>
          <div className="sos2-occ-row">
            <span className="sos2-occ-label">Caption</span>
            <span className="sos2-occ-val sos2-occ-caption">
              {active.lowerThird.title}<br />
              <span className="sos2-occ-sub">{active.lowerThird.subtitle}</span>
            </span>
          </div>

          <div className="sos2-occ-hash-wrap">
            <p className="sos2-occ-label">Hashtags</p>
            <div className="sos2-occ-hashtags">
              {active.hashtags.map(h => (
                <span key={h} className="sos2-occ-htag">{h}</span>
              ))}
            </div>
            <button
              type="button"
              className="sos2-occ-copy"
              onClick={() => copyHashtags(active.hashtags)}
            >
              Copy all hashtags
            </button>
          </div>

          {occasionId === 'halloween' && (
            <div className="sos2-occ-scene-tools">
              <p className="sos2-occ-label">Scene</p>

              <button
                type="button"
                className="sos2-occ-action sos2-occ-action--set"
                disabled={setStatus.busy || productId !== SET_PRODUCT_ID}
                onClick={async () => {
                  setSetStatus({ busy: true, text: 'Building the set…', notes: [] });
                  const r = await buildHalloweenSet({
                    productId,
                    onProgress: (text) => setSetStatus((s) => ({ ...s, text })),
                  });
                  setSetStatus({ busy: false, text: r.message, notes: r.warnings || [] });
                }}
              >
                🎃 Build Halloween Night set
              </button>
              <p className="sos2-occ-scene-sub">
                {productId === SET_PRODUCT_ID
                  ? 'Replaces the props in the scene: trees, barrels, crab, food. The bike rides in, its door opens in the finale.'
                  : 'Switch to the BBQ Bike to use this set.'}
              </p>
              {setStatus.text && <p className="sos2-occ-scene-note">{setStatus.text}</p>}
              {setStatus.notes.map((n) => (
                <p key={n} className="sos2-occ-scene-sub">{n}</p>
              ))}

              <button
                type="button"
                className="sos2-occ-action"
                disabled={!!crabStatus && crabStatus !== 'error'}
                onClick={async () => {
                  const api = garageMode.apiRef.current;
                  if (!api) { setCrabStatus('Not ready — reload and try again'); return; }
                  setCrabStatus('Loading crab…');
                  // Place crab to the right of the bike at floor level, facing it
                  const r = await api.addObject('prop-halloween-pumpkin-crab', {
                    transform: { x: 2.2, y: 0, z: 0.2, rx: 0, ry: 90, rz: 0, s: 1 },
                  });
                  setCrabStatus(r.ok ? 'Pumpkin Crab is in the scene! 🦀 Use Garage to reposition.' : (r.message || 'Could not add'));
                  if (!r.ok) setTimeout(() => setCrabStatus(''), 3500);
                }}
              >
                🦀 Drop the Pumpkin Crab
              </button>
              {crabStatus && (
                <p className="sos2-occ-scene-note">{crabStatus}</p>
              )}

              <button
                type="button"
                className="sos2-occ-action sos2-occ-action--reel"
                onClick={() => {
                  buildHalloweenReel();
                  setReelStatus('Reel loaded — open Reel to preview! 🎬');
                  setTimeout(() => setReelStatus(''), 4000);
                }}
              >
                🎬 Build Halloween Reel
              </button>
              <p className="sos2-occ-scene-sub">
                5 shots · 28 s · Low orbit → Push-in → Slide → Crane → Pull-back
              </p>
              {reelStatus && (
                <p className="sos2-occ-scene-note" style={{ color: '#22c55e' }}>{reelStatus}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
