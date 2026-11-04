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

const PRODUCT_PROP_HINTS = {
  "bbq-bike": {
    family: "BBQ / Street Food",
    tip: "Prioritise BBQ food items, smoke/fire props and rustic barrel furniture near the bike.",
    preferred: [
      "prop-bbq-chicken-burger", "prop-bbq-box-open", "prop-bbqsmith-barrel-table",
      "prop-bbqsmith-smoker-wagon", "prop-fire-barrel", "prop-bbq-chicken-wing",
      "prop-bbqsmith-whisky-barrel", "prop-bbqsmith-firewood", "prop-campfire",
      "prop-bbqsmith-bbq-letters",
    ],
  },
  "coffee-bike": {
    family: "Café / Coffee",
    tip: "Prioritise café atmosphere — blackboard, seating, friendly characters. Light, welcoming tone.",
    preferred: [
      "prop-blackboard", "prop-table-chairs", "prop-balloons", "prop-lemon",
      "prop-human-wave", "prop-human-walk-f", "prop-dog",
    ],
  },
  "the-kop-main": {
    family: "Café / Coffee",
    tip: "Prioritise café atmosphere — blackboard, seating, friendly characters. Light, welcoming tone.",
    preferred: [
      "prop-blackboard", "prop-table-chairs", "prop-balloons", "prop-lemon",
      "prop-human-wave", "prop-human-walk-f", "prop-dog",
    ],
  },
};

function validateAndClamp(config) {
  const skippedIds = [];

  if (Array.isArray(config.props)) {
    config.props = config.props.slice(0, 6).map((p) => {
      if (!p || !isPropId(p.assetId)) {
        skippedIds.push(p?.assetId ?? "?");
        return null;
      }
      const pos = Array.isArray(p.position) ? [...p.position] : [0, 0, 0];
      pos[2] = Math.max(-4.5, Math.min(3, pos[2] ?? 0));
      const x = pos[0] ?? 0;
      if (Math.abs(x) < 1.5) pos[0] = (x >= 0 ? 1 : -1) * 2.2;
      p.position = pos;
      return p;
    }).filter(Boolean);
  }

  if (Array.isArray(config.effects)) config.effects = config.effects.slice(0, 5);
  if (Array.isArray(config.propCycles)) config.propCycles = config.propCycles.slice(0, 4);
  if (Array.isArray(config.reel?.shots)) config.reel.shots = config.reel.shots.slice(0, 4);

  return { config, skippedIds };
}

let state = { busy: false, error: null, result: null };
const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const getSnapshot = () => state;
function set(patch) { state = { ...state, ...patch }; for (const fn of listeners) fn(); }

function buildPrompt(userText, context = {}) {
  const productName = context.productName ?? "BBQ Bike";
  const productFamily = PRODUCT_PROP_HINTS[context.productId ?? ""]?.family ?? "vehicle";

  const occasionList = OCCASIONS.map((o) => `  ${o.id} — ${o.name}`).join("\n");
  const effectList = Object.entries(EFFECT_TYPES).map(([k, v]) => `  ${k} — ${v.label}`).join("\n");
  const propList = PROPS.map((p) => `  ${p.id} — ${p.name}`).join("\n");

  return `You are an award-winning commercial director specialising in short, emotional product reels.

Product on stage: "${productName}" (category: ${productFamily})
Director's brief: "${userText}"

====================
YOUR GOAL
====================

Create a cinematic 16–20 second scene in 3 acts that makes the "${productName}" look irresistible.

Act 1 — ESTABLISH (use 8 s): Wider or lower shot that sets mood and world.
Act 2 — REVEAL (use 8 s): Show the product with personality (orbit, slide, or gentle movement).
Act 3 — DESIRE (use 4 s): Closer, more intimate shot — makes the viewer want it.

Total: 3 shots, 20 s. Use 4 shots only if the brief truly demands it (max 28 s).

====================
COMPOSITION RULES
====================

- Asymmetric, layered compositions: foreground prop + product + background prop.
- 4 to 6 props total. No more.
- 1 hero prop (closest to camera, most interesting), 2–3 supporting, 1–2 background.
- Include one unexpected but fitting detail that adds personality.
- Never repeat the same camera move in one reel.
- Never make the scene feel empty or perfectly symmetrical.
- Prefer imperfect, natural placement over grid alignment.

====================
PLACEMENT RULES
====================

- Product sits at [0, 0, 0].
- Positive Z = towards camera. Negative Z = behind product.
- Never place any prop at Z below −4.2.
- Keep all props at least 2.2 m from the product centre.
- Flanking (sides): x = ±3.2 to ±5.2, z = 0.3 to 1.8
- Background: x = ±3.5 to ±6.0, z = −2.0 to −3.8
- Vary prop scale for depth (0.75 to 1.6). Closer props slightly larger.

====================
EFFECTS PLACEMENT
====================

- Place effects beside or slightly behind the product, never in front of it.
- Preferred positions: x = ±2.5 to ±4.5, z = −1.0 to −2.5, y = 0 to 0.5.
- Use size 0.8–1.4 for background fill; 0.6–0.9 for accent.
- 0 to 2 effects maximum.

====================
LOOK PAIRINGS
====================

stageLook + lookPreset combinations that work:
  studio + studio  — clean commercial product shot (default safe)
  studio + sunset  — warm golden indoor
  night  + moonlit — cool dramatic atmospheric
  night  + studio  — mysterious dark
  day    + sunset  — warm outdoor golden hour
  day    + off     — natural daylight

Never pair night with sunset. Never pair day with moonlit.

====================
PROP MOTION (propCycles)
====================

Add motion to 1–2 props for life. propIndex is the 0-based position of the prop in the props array.
  bob   — gentle vertical float (good for food, lanterns)
  spin  — slow rotation (good for wheels, orbs)
  sway  — soft pendulum (good for hanging items, plants)
  pulse — subtle breathing scale (good for hero prop or fire)

====================
AVAILABLE OPTIONS
====================

Occasion IDs (leave "none" if the brief has no seasonal context):
${occasionList}

Grade: raw | warm | moody | cinema
Stage Look: studio | night | day
Look Preset: off | moonlit | sunset | studio

Effect types:
${effectList}

Prop IDs — use ONLY these exact IDs, no variations:
${propList}

Camera moves: turntable | orbit | push-in | pull-back | slide | crane
Start views: Front | Side | 3/4 | Rear | Top | Low Hero
Shot durations: 4 | 8 | 12  (seconds only — no other values)

====================
OUTPUT
====================

Respond with ONLY a valid JSON object. No markdown fences. No explanation. No comments. No trailing commas.

{
  "occasion": "<id or none>",
  "grade": "<raw|warm|moody|cinema>",
  "stageLook": "<studio|night|day>",
  "lookPreset": "<off|moonlit|sunset|studio>",
  "effects": [
    { "type": "<effectType>", "position": [x, y, z], "size": <number> }
  ],
  "props": [
    { "assetId": "<exact prop id>", "position": [x, y, z], "rotation": [rx, ry, rz], "scale": <number> }
  ],
  "reel": {
    "shots": [
      { "move": "<move>", "startView": "<startView>", "durationS": <4|8|12> }
    ]
  },
  "propCycles": [
    { "propIndex": <0-based index into props array>, "type": "<bob|spin|sway|pulse>", "amplitude": <number>, "period": <number> }
  ]
}`;
}

/* ===================== "Use my scene" mode (keep the scene) =====================
   The person picks the stage and the props first; the builder then only DIRECTS
   the reel with what is already there: camera shots, grade, look, a few extra
   effects and motion on the props that exist. It never adds, moves or removes
   a prop and never changes the stage. */

const round2 = (n) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

// What is on the stage right now, for the builder's brief and its suggestion bar.
export function readScene() {
  const hasLayout = garageStore.getSnapshot().hasLayout;
  const layout = hasLayout ? garageStore.getLayout() : null;
  const props = [];
  if (layout) {
    for (const item of layout.items) {
      if (item.primary || item.hidden) continue;
      const def = PROPS.find((p) => p.id === item.assetId);
      const t = item.transform || {};
      props.push({
        itemId: item.itemId,
        assetId: item.assetId,
        name: def ? def.name : item.assetId,
        position: [round2(t.x), round2(t.y), round2(t.z)],
      });
    }
  }
  return {
    stage: stageLook.getSnapshot().look,
    occasion: occasionStore.getSnapshot().occasionId,
    props,
    effectCount: effectsStore.getSnapshot().effects.length,
  };
}

function buildKeepScenePrompt(userText, context = {}) {
  const productName = context.productName ?? "BBQ Bike";
  const scene = context.scene ?? readScene();
  const effectList = Object.entries(EFFECT_TYPES).map(([k, v]) => `  ${k} — ${v.label}`).join("\n");
  const propLines = scene.props.length
    ? scene.props.map((p, i) => `  ${i}: ${p.name} at [${p.position.join(", ")}]`).join("\n")
    : "  (no props placed)";
  const occasion = scene.occasion && scene.occasion !== "none" ? `, occasion: ${scene.occasion}` : "";

  return `You are an award-winning commercial director specialising in short, emotional product reels.

The person has ALREADY built the scene. Do NOT add, move or remove props and do NOT change the stage.
Your job is to direct the reel using exactly what is on the stage.

Product on stage: "${productName}" at [0, 0, 0]. Positive Z is towards the camera.
Stage: ${scene.stage}${occasion}
Props on the stage (index: name at [x, y, z]):
${propLines}

Director's brief: "${userText}"

====================
THE REEL
====================

- 3 shots, 16 to 20 seconds in total (4 shots, up to 28 s, only if the brief truly needs it).
- Act 1 ESTABLISH (8 s): a wider or lower shot that sets the mood.
- Act 2 REVEAL (8 s): the product with personality (orbit or slide).
- Act 3 DESIRE (4 s): a closer, more intimate shot.
- Never repeat the same camera move. If the brief names a prop or a side, pick start views that show it
  (props with a positive X are on the bike's right, negative X on its left).

====================
MOOD AND LIGHT
====================

Grade: raw | warm | moody | cinema
Look Preset: off | moonlit | sunset | studio
Pair it with the stage: night -> moonlit or studio; day -> sunset or off; studio -> studio or sunset.

====================
EFFECTS (optional, 0 to 2, added to what is there)
====================

${effectList}
Place them beside or behind the product (x = ±2.5 to ±4.5, z = -1 to -2.5, y = 0 to 0.5), size 0.6 to 1.2.
Do not put an effect on top of a prop.

====================
PROP MOTION (optional, 0 to 2)
====================

Use only the prop indexes listed above.
  bob — gentle float (food, lanterns) | spin — slow turn (wheels, orbs) | sway — soft pendulum | pulse — gentle breathing (a hero prop or fire)

Camera moves: turntable | orbit | push-in | pull-back | slide | crane
Start views: Front | Side | 3/4 | Rear | Top | Low Hero
Shot durations: 4 | 8 | 12 (seconds only)

====================
OUTPUT
====================

Respond with ONLY a valid JSON object. No markdown fences. No explanation. No trailing commas.

{
  "note": "<one plain sentence, 20 words at most, saying the idea of the reel>",
  "grade": "<raw|warm|moody|cinema>",
  "lookPreset": "<off|moonlit|sunset|studio>",
  "effects": [ { "type": "<effectType>", "position": [x, y, z], "size": <number> } ],
  "reel": { "shots": [ { "move": "<move>", "startView": "<startView>", "durationS": <4|8|12> } ] },
  "propCycles": [ { "propIndex": <index from the list>, "type": "<bob|spin|sway|pulse>", "amplitude": <number>, "period": <number> } ]
}`;
}

const VALID_MOVES_KEEP = ["turntable", "orbit", "push-in", "pull-back", "slide", "crane"];
const VALID_VIEWS_KEEP = ["Front", "Side", "3/4", "Rear", "Top", "Low Hero", "custom"];
const VALID_DURATIONS_KEEP = [4, 8, 12];
const VALID_CYCLES_KEEP = ["spin", "bob", "sway", "pulse"];

function shotFields(s) {
  return {
    move: VALID_MOVES_KEEP.includes(s?.move) ? s.move : "orbit",
    startView: VALID_VIEWS_KEEP.includes(s?.startView) ? s.startView : "3/4",
    durationS: VALID_DURATIONS_KEEP.includes(s?.durationS) ? s.durationS : 8,
  };
}

// Applies a "keep my scene" answer. Returns the text for the result card.
function applyKeepScene(config, scene) {
  if (["raw", "warm", "moody", "cinema"].includes(config.grade)) gradeStore.setGrade(config.grade);
  if (["off", "moonlit", "sunset", "studio"].includes(config.lookPreset)) {
    const bad = (scene.stage === "night" && config.lookPreset === "sunset") || (scene.stage === "day" && config.lookPreset === "moonlit");
    if (!bad) lookStore.setLookPreset(config.lookPreset);
  }

  // effects are ADDED to the ones already placed (at most 2 new ones)
  const stageApi = garageMode.apiRef.current;
  const floorY = stageApi && typeof stageApi.getFloorY === "function" ? stageApi.getFloorY() : 0;
  if (Array.isArray(config.effects)) {
    for (const effect of config.effects.slice(0, 2)) {
      if (!effect || !effect.type) continue;
      const pos = Array.isArray(effect.position) ? effect.position : [0, 0, 0];
      const r = effectsStore.addEffect(effect.type, [pos[0] ?? 0, floorY + Math.max(0, Math.min(0.5, pos[1] ?? 0)), pos[2] ?? 0]);
      if (r.ok && typeof effect.size === "number") {
        const list = effectsStore.getSnapshot().effects;
        const added = list[list.length - 1];
        if (added) effectsStore.setEffectSize(added.id, Math.max(0.4, Math.min(1.6, effect.size)));
      }
    }
  }

  // the Reel
  if (Array.isArray(config.reel?.shots) && config.reel.shots.length > 0) {
    const shots = config.reel.shots.slice(0, 4);
    animationStore.resetSequence();
    animationStore.setShot(0, shotFields(shots[0]));
    for (let i = 1; i < shots.length; i++) {
      if (!animationStore.addShot().ok) break;
      animationStore.setShot(i, shotFields(shots[i]));
    }
  }

  // motion on the props that really exist
  let cycles = 0;
  if (Array.isArray(config.propCycles)) {
    for (const pc of config.propCycles.slice(0, 2)) {
      if (!pc || !VALID_CYCLES_KEEP.includes(pc.type) || !Number.isInteger(pc.propIndex)) continue;
      const prop = scene.props[pc.propIndex];
      if (!prop) continue;
      const { propIndex: _pi, ...fields } = pc;
      if (animationStore.addCycle(0, { ...fields, target: prop.itemId, assetId: prop.assetId }).ok !== false) cycles += 1;
    }
  }

  const sequence = animationStore.getSnapshot().sequence;
  const moves = sequence.map((s) => s.move).join(" → ");
  const kept = `kept your ${scene.props.length} prop${scene.props.length === 1 ? "" : "s"} and the ${scene.stage} stage`;
  const note = typeof config.note === "string" && config.note.trim() ? `\n${config.note.trim().slice(0, 160)}` : "";
  return `✦ Reel directed · ${sequence.length} shot${sequence.length === 1 ? "" : "s"} (${moves}) · ${cycles} prop motion${cycles === 1 ? "" : "s"} · ${kept}${note}`;
}

export async function buildScene(prompt, apiKey, context = {}) {
  set({ busy: true, error: null, result: null });
  const keepScene = context.keepScene === true;
  const sceneNow = keepScene ? (context.scene ?? readScene()) : null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        temperature: 0.3,
        max_tokens: 2200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a JSON-only API. Output only a single valid JSON object. No markdown, no prose, no thinking tags." },
          { role: "user", content: keepScene ? buildKeepScenePrompt(prompt, { ...context, scene: sceneNow }) : buildPrompt(prompt, context) },
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

    if (keepScene) {
      set({ busy: false, error: null, result: applyKeepScene(config, sceneNow) });
      return;
    }

    const { config: cleanConfig, skippedIds } = validateAndClamp(config);
    config = cleanConfig;

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
    // Capture floorY once before the async loop using the current API.
    const _initApi = garageMode.apiRef.current;
    const floorY = _initApi && typeof _initApi.getFloorY === "function" ? _initApi.getFloorY() : 0;
    if (Array.isArray(config.props)) {
      for (const prop of config.props.slice(0, 6)) {
        if (!prop || !prop.assetId || !isPropId(prop.assetId)) {
          placedItems.push(null);
          continue;
        }
        // Re-read apiRef on each await boundary — registerApi re-runs after each
        // garageStore change (refit → setLiveFit → re-render → new addObject closure).
        const stageApi = garageMode.apiRef.current;
        if (!stageApi || typeof stageApi.addObject !== "function") {
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

    const sequence = animationStore.getSnapshot().sequence;
    const shotCount = sequence.length;
    const shotMoves = sequence.map((s) => s.move).join(" → ");
    const stageName = config.stageLook ?? "studio";
    const presetName = config.lookPreset && config.lookPreset !== "off" ? ` · ${config.lookPreset}` : "";
    const skippedNote = skippedIds.length ? ` · ${skippedIds.length} prop${skippedIds.length !== 1 ? "s" : ""} skipped` : "";
    const resultText = `✦ Built · ${stageName}${presetName} · ${propsPlaced} props · ${shotMoves}${skippedNote}`;
    set({ busy: false, error: null, result: resultText });
  } catch (err) {
    set({ busy: false, error: err.message ?? "Something went wrong", result: null });
  }
}

export function clearError() { set({ error: null, result: null }); }
