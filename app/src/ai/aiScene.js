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
        temperature: 0.3,
        max_tokens: 2200,
        response_format: { type: "json_object" },
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
