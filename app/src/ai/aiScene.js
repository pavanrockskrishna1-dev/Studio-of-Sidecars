import { OCCASIONS } from "../animation/occasionDefs.js";
import { EFFECT_TYPES } from "../fx/effectsStore.js";
import { PROPS, isPropId } from "../products/props.js";
import * as occasionStore from "../animation/occasionStore.js";
import * as gradeStore from "../fx/gradeStore.js";
import * as effectsStore from "../fx/effectsStore.js";
import * as garageStore from "../garage/garageStore.js";
import * as garageMode from "../garage/garageMode.js";
import * as stageLook from "../fx/stageLook.js";
import * as lookStore from "../fx/lookStore.js";
import * as animationStore from "../animation/animationStore.js";

let state = { busy: false, error: null, result: null };
const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const getSnapshot = () => state;
function set(patch) { state = { ...state, ...patch }; for (const fn of listeners) fn(); }

function buildPrompt(userText, context = {}) {
  const productName = context.productName ?? "BBQ Bike";
  const occasionList = OCCASIONS.map((o) => `  ${o.id} — ${o.name}`).join("\n");
  const effectList = Object.entries(EFFECT_TYPES).map(([k, v]) => `  ${k} — ${v.label}`).join("\n");
  const propList = PROPS.map((p) => `  ${p.id} — ${p.name}`).join("\n");

  return `You are configuring a 3D studio scene for a short promotional reel.

The vehicle currently on stage is: "${productName}"
The user described the scene as: "${userText}"

Your job: build a scene that visually showcases the "${productName}" in the described setting. Choose props, effects, stage look, and reel shots that complement this specific vehicle and bring the description to life.

Available occasion IDs (particles + background atmosphere):
${occasionList}

Available grade IDs: raw, warm, moody, cinema

Stage look (backdrop):
  studio — indoor HDRI photo backdrop (default, clean product shot)
  night  — dark sky with moonlight, no HDRI (halloween, diwali night, late-night vibes)
  day    — outdoor blue sky with warm sun, no HDRI (summer, road trips, outdoor markets)

Look preset (cinematic post-processing):
  off     — no post processing
  moonlit — cool blue dramatic (pairs with night stage)
  sunset  — warm amber golden hour (pairs with day or warm diwali)
  studio  — crisp neutral punch (pairs with studio stage)

Available effect types:
${effectList}

Available prop IDs — ONLY use IDs exactly as listed here:
${propList}

Reel moves: turntable, orbit, push-in, pull-back, slide, crane
Reel start views: Front, Side, 3/4, Rear, Top, Low Hero
Shot durations: 4, 8, or 12 seconds. Total must not exceed 30 s. Use 2–4 shots.

Prop motion cycles (on placed props in shot 0):
  bob   — vertical float: amplitude 0.02–0.12, period 1–3 s
  spin  — rotation: rpm 10–60, axis "auto"
  sway  — swing: angle 5–20, period 1.5–3 s, pivot "centre", axis "auto"
  pulse — scale throb: scalePct 3–8, period 0.5–2 s

Constraints:
- The default camera looks at the FRONT of the vehicle from a slight angle
- Position [x, y, z]: x is left/right, y = 0 (ground), z is front/back
- z = 0 is the bike's centre. POSITIVE z is towards the camera. NEGATIVE z is behind the bike (out of frame).
- Place flanking props at x = ±3 to ±5, z = 0 to 2 — this puts them to the sides and slightly in front, visible from the default view
- Place background props (trees, large items) at x = ±3 to ±6, z = -2 to -4
- NEVER place props at z beyond -5 — they will be behind the scene and invisible
- Keep props at least 2 m from origin (bike is at [0,0,0])
- at most 6 effects, at most 6 props, at most 4 propCycles
- propIndex in propCycles is the 0-based index into the "props" array
- use 2–4 reel shots that tell a cinematic story: e.g. Low Hero wide → 3/4 orbit → push-in front
- IMPORTANT: only use prop assetId values from the list above — do not invent new IDs

Respond ONLY with a single JSON object, no markdown, no prose:
{
  "occasion": "<id or 'none'>",
  "grade": "<raw|warm|moody|cinema>",
  "stageLook": "<studio|night|day>",
  "lookPreset": "<off|moonlit|sunset|studio>",
  "effects": [
    { "type": "<effectType>", "position": [x, y, z], "size": <0.5–2.0> }
  ],
  "props": [
    { "assetId": "<propId>", "position": [x, y, z], "rotation": [rx, ry, rz], "scale": <0.8–1.5> }
  ],
  "reel": {
    "shots": [
      { "move": "<move>", "startView": "<startView>", "durationS": <4|8|12> }
    ]
  },
  "propCycles": [
    { "propIndex": 0, "type": "<bob|spin|sway|pulse>", "amplitude": 0.06, "period": 2 }
  ]
}`;
}

export async function buildScene(prompt, apiKey, context = {}) {
  set({ busy: true, error: null, result: null });
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        max_tokens: 1500,
        messages: [
          { role: "system", content: "You are a JSON-only API. Output only a single valid JSON object. No markdown, no prose, no thinking tags." },
          { role: "user", content: buildPrompt(prompt, context) },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`API error ${res.status}${body ? ": " + body.slice(0, 200) : ""}`);
    }

    const data = await res.json();
    let text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string") throw new Error("Unexpected response format from API.");

    text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    let config;
    try {
      config = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found in response.");
      config = JSON.parse(match[0]);
    }

    occasionStore.setOccasion(config.occasion ?? "none");
    gradeStore.setGrade(config.grade ?? "raw");

    const validLooks = ["studio", "night", "day"];
    if (validLooks.includes(config.stageLook)) stageLook.setStageLook(config.stageLook);
    const validPresets = ["off", "moonlit", "sunset", "studio"];
    if (validPresets.includes(config.lookPreset)) lookStore.setLookPreset(config.lookPreset);

    effectsStore.clearEffects();
    if (Array.isArray(config.effects)) {
      for (const effect of config.effects.slice(0, 6)) {
        if (!effect || !effect.type) continue;
        const pos = Array.isArray(effect.position) ? effect.position : [0, 0, 0];
        const result = effectsStore.addEffect(effect.type, pos);
        if (result.ok && typeof effect.size === "number") {
          const snap = effectsStore.getSnapshot();
          const added = snap.effects[snap.effects.length - 1];
          if (added) effectsStore.setEffectSize(added.id, effect.size);
        }
      }
    }

    // Clear any existing non-primary items so each build starts fresh and
    // doesn't accumulate phantom props that cause slow loading later.
    const existingLayout = garageStore.getLayout();
    if (existingLayout) {
      for (const item of existingLayout.items.slice()) {
        if (!item.primary) garageStore.removeItem(item.itemId);
      }
    }

    const placedItems = [];
    let propsPlaced = 0;
    const stageApi = garageMode.apiRef.current;
    const floorY = stageApi && typeof stageApi.getFloorY === "function" ? stageApi.getFloorY() : 0;
    if (Array.isArray(config.props) && stageApi && typeof stageApi.addObject === "function") {
      for (const prop of config.props.slice(0, 6)) {
        if (!prop || !prop.assetId || !isPropId(prop.assetId)) {
          placedItems.push(null);
          continue;
        }
        const pos = Array.isArray(prop.position) ? prop.position : [0, 0, 0];
        const rot = Array.isArray(prop.rotation) ? prop.rotation : [0, 0, 0];
        const r = await stageApi.addObject(prop.assetId, {
          transform: {
            x: pos[0] ?? 0, y: floorY + (pos[1] ?? 0), z: pos[2] ?? 0,
            rx: rot[0] ?? 0, ry: rot[1] ?? 0, rz: rot[2] ?? 0,
            s: prop.scale ?? 1,
          },
        });
        if (r?.ok) { placedItems.push({ itemId: r.itemId, assetId: prop.assetId }); propsPlaced++; }
        else placedItems.push(null);
      }
    }

    const VALID_MOVES = ["turntable", "orbit", "push-in", "pull-back", "slide", "crane"];
    const VALID_VIEWS = ["Front", "Side", "3/4", "Rear", "Top", "Low Hero", "custom"];
    const VALID_DURATIONS = [4, 8, 12];
    if (Array.isArray(config.reel?.shots) && config.reel.shots.length > 0) {
      animationStore.resetSequence();
      const shots = config.reel.shots.slice(0, 5);
      const s0 = shots[0];
      if (s0) {
        animationStore.setShot(0, {
          move: VALID_MOVES.includes(s0.move) ? s0.move : "orbit",
          startView: VALID_VIEWS.includes(s0.startView) ? s0.startView : "3/4",
          durationS: VALID_DURATIONS.includes(s0.durationS) ? s0.durationS : 8,
        });
      }
      for (let i = 1; i < shots.length; i++) {
        const added = animationStore.addShot();
        if (!added.ok) break;
        const s = shots[i];
        animationStore.setShot(i, {
          move: VALID_MOVES.includes(s.move) ? s.move : "orbit",
          startView: VALID_VIEWS.includes(s.startView) ? s.startView : "3/4",
          durationS: VALID_DURATIONS.includes(s.durationS) ? s.durationS : 8,
        });
      }
    }

    const VALID_CYCLE_TYPES = ["spin", "bob", "sway", "pulse"];
    if (Array.isArray(config.propCycles)) {
      for (const pc of config.propCycles.slice(0, 4)) {
        if (!pc || !VALID_CYCLE_TYPES.includes(pc.type)) continue;
        if (typeof pc.propIndex !== "number") continue;
        const placed = placedItems[pc.propIndex];
        if (!placed) continue;
        const { propIndex: _pi, ...cycleFields } = pc;
        animationStore.addCycle(0, { ...cycleFields, target: placed.itemId, assetId: placed.assetId });
      }
    }

    const shotCount = animationStore.getSnapshot().sequence.length;
    const stageName = config.stageLook ?? "studio";
    const presetName = config.lookPreset && config.lookPreset !== "off" ? ` · ${config.lookPreset}` : "";
    const resultText = `✦ Built — ${shotCount} shot${shotCount !== 1 ? "s" : ""} · ${stageName}${presetName} · ${propsPlaced} prop${propsPlaced !== 1 ? "s" : ""}`;
    set({ busy: false, error: null, result: resultText });
  } catch (err) {
    set({ busy: false, error: err.message ?? "Something went wrong", result: null });
  }
}

export function clearError() { set({ error: null, result: null }); }
