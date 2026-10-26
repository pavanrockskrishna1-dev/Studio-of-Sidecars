import { OCCASIONS } from "../animation/occasionDefs.js";
import { EFFECT_TYPES } from "../fx/effectsStore.js";
import { PROPS } from "../products/props.js";
import * as occasionStore from "../animation/occasionStore.js";
import * as gradeStore from "../fx/gradeStore.js";
import * as effectsStore from "../fx/effectsStore.js";
import * as garageStore from "../garage/garageStore.js";

let state = { busy: false, error: null };
const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const getSnapshot = () => state;
function set(patch) { state = { ...state, ...patch }; for (const fn of listeners) fn(); }

function buildPrompt(userText) {
  const occasionList = OCCASIONS.map((o) => `  ${o.id} — ${o.name}`).join("\n");
  const gradeList = "  raw, warm, moody, cinema";
  const effectList = Object.entries(EFFECT_TYPES).map(([k, v]) => `  ${k} — ${v.label}`).join("\n");
  const propList = PROPS.map((p) => `  ${p.id} — ${p.name}`).join("\n");

  return `You are configuring a 3D BBQ bike studio scene. The user described: "${userText}"

Available occasion IDs:
${occasionList}

Available grade IDs:
${gradeList}

Available effect types:
${effectList}

Available prop IDs:
${propList}

Constraints:
- position [x, y, z] is world-space; x and z in range -8 to 8, y = 0 (floor level)
- at most 6 effects total, at most 6 props total
- do not place props at [0,0,0] — the bike is there; keep at least 2 m away from origin
- choose props and effects that match the scene description's mood and theme
- the response must be valid JSON parseable by JSON.parse

Respond ONLY with a single JSON object, no markdown, no prose:
{
  "occasion": "<id or 'none'>",
  "grade": "<raw|warm|moody|cinema>",
  "effects": [
    { "type": "<effectType>", "position": [x, y, z], "size": <0.5-2.0> }
  ],
  "props": [
    { "assetId": "<propId>", "position": [x, y, z], "rotation": [rx, ry, rz], "scale": <0.8-1.5> }
  ]
}`;
}

export async function buildScene(prompt, apiKey) {
  set({ busy: true, error: null });
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        max_tokens: 1024,
        messages: [{ role: "user", content: buildPrompt(prompt) }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`API error ${res.status}${body ? ": " + body.slice(0, 200) : ""}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string") throw new Error("Unexpected response format from API.");

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

    if (Array.isArray(config.props)) {
      for (const prop of config.props.slice(0, 6)) {
        if (!prop || !prop.assetId) continue;
        const pos = Array.isArray(prop.position) ? prop.position : [0, 0, 0];
        const rot = Array.isArray(prop.rotation) ? prop.rotation : [0, 0, 0];
        garageStore.addItem({
          assetId: prop.assetId,
          transform: {
            x: pos[0] ?? 0,
            y: pos[1] ?? 0,
            z: pos[2] ?? 0,
            rx: rot[0] ?? 0,
            ry: rot[1] ?? 0,
            rz: rot[2] ?? 0,
            s: prop.scale ?? 1,
          },
        });
      }
    }

    set({ busy: false, error: null });
  } catch (err) {
    set({ busy: false, error: err.message ?? "Something went wrong" });
  }
}

export function clearError() { set({ error: null }); }
