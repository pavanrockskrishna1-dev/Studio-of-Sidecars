// Checks the AI Reel Builder's suggestion bar (src/ai/briefSuggestions.js) in plain node.
import { suggestBriefs, BRIEF_ADDONS, appendToBrief, MAX_SUGGESTIONS } from "../src/ai/briefSuggestions.js";

let failed = 0;
let passed = 0;
function check(name, ok, info) {
  if (ok) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}${info ? "  " + info : ""}`);
  }
}

const empty = suggestBriefs({ stage: "studio", occasion: "none", props: [] });
check("an empty studio scene still gets suggestions", empty.length >= 2 && empty.length <= MAX_SUGGESTIONS);
check("suggestions are unique non-empty strings", new Set(empty).size === empty.length && empty.every((s) => typeof s === "string" && s.trim()));
check("bad input does not throw and still returns suggestions", suggestBriefs(null).length >= 2 && suggestBriefs({}).length >= 2);

const diwali = suggestBriefs({ stage: "night", occasion: "diwali", props: [{ name: "BBQ Letters" }, { name: "Chicken Burger" }, { name: "Barrel" }] });
check("an occasion brief comes first", /Diwali/.test(diwali[0]), diwali[0]);
check("a prop-specific brief names the letters", diwali.some((s) => /BBQ letters/.test(s)));
check("a food prop brief names the food", diwali.some((s) => /chicken burger/.test(s)));
check("three or more props add the show-off-every-prop brief", diwali.some((s) => /every prop/.test(s)));
check("never more than the cap", diwali.length <= MAX_SUGGESTIONS);

const night = suggestBriefs({ stage: "night", occasion: "none", props: [] });
const day = suggestBriefs({ stage: "day", occasion: "none", props: [] });
check("the stage changes the suggestions", night.join("|") !== day.join("|"));

check("add-ons cover Mood, Pace and Focus", ["Mood", "Pace", "Focus"].every((g) => BRIEF_ADDONS.some((a) => a.group === g)));
check("appendToBrief adds with a space", appendToBrief("Warm reel.", "Slow, cinematic pace.") === "Warm reel. Slow, cinematic pace.");
check("appendToBrief does not double a phrase", appendToBrief("A. Slow, cinematic pace.", "Slow, cinematic pace.") === "A. Slow, cinematic pace.");
check("appendToBrief works on an empty brief", appendToBrief("", "Quick, punchy cuts.") === "Quick, punchy cuts.");

console.log(failed ? `${failed} CHECK(S) FAILED (${passed} PASS)` : `ALL CHECKS PASSED (${passed} PASS)`);
process.exit(failed ? 1 : 0);
