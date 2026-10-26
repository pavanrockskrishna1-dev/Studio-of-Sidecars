// Slice R1 - checks for the Reel branding overlays: app/src/poster/branding.js
// (kit -> overlay values, the safe-area layout of the logo bug, the titles at
// all 3 positions and the end card, title fades, end-card timing and the 28 s
// guard, the logo size rule, the empty handle, the session form, Reset, OFF =
// nothing drawn), app/src/animation/shotTitle.js and the per-shot titles in
// reelSequence.js / animationStore.js. Plain node, no browser, no three.js: text
// is measured by a fake 2D context. Run from the app folder:
//   node scripts/test-branding.mjs   (exit code 1 on any FAIL)
import { readFileSync } from "node:fs";
import * as b from "../src/poster/branding.js";
import * as t from "../src/animation/shotTitle.js";
import * as r from "../src/animation/reelSequence.js";
import * as store from "../src/animation/animationStore.js";
import { readKits, writeKits, FONT_HEAD, FONT_BODY } from "../src/poster/poster.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}
const json = (v) => JSON.stringify(v);
const near = (a, c, e = 1e-6) => Math.abs(a - c) <= e;

/* ---- a fake 2D context: text width = chars x size x 0.55; every call recorded ---- */
function fakeCtx() {
  const calls = [];
  const stack = [];
  const ctx = {
    font: "10px sans-serif",
    fillStyle: "#000",
    globalAlpha: 1,
    shadowColor: "transparent",
    shadowBlur: 0,
    shadowOffsetY: 0,
    textAlign: "start",
    textBaseline: "alphabetic",
    scaleX: 1,
    scaleY: 1,
    calls,
    measureText(text) {
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 10);
      return { width: String(text).length * size * 0.55 };
    },
    save() {
      stack.push({ ...this });
    },
    restore() {
      Object.assign(this, stack.pop());
    },
    scale(x, y) {
      this.scaleX *= x;
      this.scaleY *= y;
    },
    fillRect(x, y, w, h) {
      calls.push({ op: "fillRect", x, y, w, h, fillStyle: this.fillStyle });
    },
    drawImage(img, x, y, w, h) {
      calls.push({ op: "drawImage", img, x, y, w, h, alpha: this.globalAlpha, sx: this.scaleX, sy: this.scaleY });
    },
    fillText(text, x, y) {
      calls.push({ op: "fillText", text, x, y, font: this.font, fillStyle: this.fillStyle, alpha: this.globalAlpha, shadowBlur: this.shadowBlur, shadowColor: this.shadowColor, align: this.textAlign });
    },
  };
  return ctx;
}
const fakeImg = (w, h = w) => ({ naturalWidth: w, naturalHeight: h, width: w, height: h });

/* ---- two different kits from the real kit data ---- */
const mem = { v: null, getItem() { return this.v; }, setItem(_k, val) { this.v = val; } };
const kits0 = readKits(mem);
const coffee = { ...kits0["the-kop"], id: "the-kop", colors: { bg: "#2b1d14", text: "#F4E7D3", accent: "#C8873A" }, handle1: "@thekopcoffee" };
writeKits(mem, { ...kits0, "the-kop": coffee });
const kits = readKits(mem);
const BBQ = kits["bbq-ride"];
const KOP = kits["the-kop"];
const SEQ = [
  { move: "orbit", startView: "3/4", durationS: 4, title: { text: "Fire up the grill", pos: "bottom" } },
  { move: "slide", startView: "Side", durationS: 4, title: { text: "Built to roam\nBuilt to feed", pos: "top" } },
  { move: "crane", startView: "Top", durationS: 4 },
];
const ON = { logo: true, endCard: true, endText: "Franchise enquiries — DM us", handle: null };
const LOGO = fakeImg(262);
const spec = (kit, state = ON, seq = SEQ, img = LOGO) => b.buildBrandingSpec({ state, sequence: seq, kit, logoImage: img });

/* ============================ constants ============================ */
check("frame is 1080x1920 at 30 fps", b.FRAME_W === 1080 && b.FRAME_H === 1920 && b.FPS === 30);
check("safe area is x 60-1020, y 220-1500", json(b.SAFE) === json({ x0: 60, x1: 1020, y0: 220, y1: 1500 }));
check("logo bug is 160 px wide at 90% opacity", b.LOGO_BUG_W === 160 && b.LOGO_BUG_ALPHA === 0.9);
check("fade is 0.4 s, end card 2.0 s at 40% brightness", b.FADE_S === 0.4 && b.END_CARD_S === 2 && b.END_BRIGHTNESS === 0.4);
check("logo upscale limit is 1.5x", b.MAX_UPSCALE === 1.5);
check("end card is 60 frames at 30 fps", b.END_CARD_FRAMES === 60);
check("Reel maximum with the end card is 28 s", b.REEL_MAX_S === 28);
check("title positions are top, middle, bottom; max 2 lines", json(t.TITLE_POSITIONS) === '["top","middle","bottom"]' && t.MAX_TITLE_LINES === 2);

/* ============================ kit -> overlay values ============================ */
{
  const sB = spec(BBQ);
  const sK = spec(KOP);
  check("BBQ Ride kit: colours come from the kit", json(sB.colors) === json(BBQ.colors));
  check("coffee kit: colours come from the kit", json(sK.colors) === json(coffee.colors));
  check("the two kits give different colours", sB.colors.text !== sK.colors.text && sB.colors.accent !== sK.colors.accent);
  check("BBQ Ride handle is @bbqrideindia (kit handle1)", sB.endCard.handle === "@bbqrideindia");
  check("coffee kit handle is its own", sK.endCard.handle === "@thekopcoffee");
  check("the second kit's default handle is empty", defaultHandle("the-kop") === "");
  check("both specs carry the same 3 shots timeline (2 titled shots)", sB.shots.length === 2 && sB.shots[0].t0 === 0 && sB.shots[1].t0 === 4 && sB.reelS === 12);
  check("title lines: 1 line then 2 lines", json(sB.shots.map((s) => s.lines.length)) === "[1,2]");
  const user = spec(BBQ, { ...ON, handle: " @mine " });
  check("a typed handle wins over the kit's (trimmed)", user.endCard.handle === "@mine");
  const cardB = b.layoutBranding(fakeCtx(), sB, 12.5).card;
  const ctxB = fakeCtx();
  b.drawBranding(ctxB, 1080, 1920, sB, 12.5);
  const ctxK = fakeCtx();
  b.drawBranding(ctxK, 1080, 1920, sK, 12.5);
  const handleOf = (c) => c.calls.find((x) => x.op === "fillText" && x.font.includes(FONT_BODY) && x.font.startsWith("600"));
  check("end card handle is drawn in the kit's accent colour (BBQ)", handleOf(ctxB)?.fillStyle === BBQ.colors.accent && handleOf(ctxB)?.text === "@bbqrideindia");
  check("end card handle is drawn in the kit's accent colour (coffee)", handleOf(ctxK)?.fillStyle === coffee.colors.accent && handleOf(ctxK)?.text === "@thekopcoffee");
  const titleOf = (c) => c.calls.find((x) => x.op === "fillText" && x.font.includes(FONT_HEAD));
  const cT = fakeCtx();
  b.drawBranding(cT, 1080, 1920, sK, 2);
  check("title uses the kit font and the kit text colour (coffee)", titleOf(cT)?.font.includes(FONT_HEAD) && titleOf(cT)?.fillStyle === coffee.colors.text);
  check("title is drawn with a shadow", titleOf(cT)?.shadowBlur > 0 && titleOf(cT)?.shadowColor !== "transparent");
  check("end card layout has the logo, the handle and the line", !!cardB.logo && !!cardB.handle && cardB.line.text === "Franchise enquiries — DM us");
}
function defaultHandle(id) {
  return readKits({ getItem: () => null })[id].handle1;
}

/* ============================ safe area: every element, all 3 positions ============================ */
{
  const inside = (rc, pad = 0) => rc.x >= b.SAFE.x0 + pad && rc.x + rc.w <= b.SAFE.x1 - pad && rc.y >= b.SAFE.y0 + pad && rc.y + rc.h <= b.SAFE.y1 - pad;
  const texts = {
    short: "Grill",
    one: "Fire up the grill",
    long2: ["INDIA'S FIRST BBQ BIKE WITH A FULL GRILL ON THE SIDECAR", "FRANCHISE ENQUIRIES OPEN ACROSS THE COUNTRY NOW OK"].join("\n"),
    word: "W".repeat(60),
  };
  for (const [tName, text] of Object.entries(texts)) {
    for (const pos of t.TITLE_POSITIONS) {
      for (const logoOn of [false, true]) {
        const seq = [{ move: "orbit", startView: "3/4", durationS: 8, title: { text, pos } }];
        const sp = spec(BBQ, { ...ON, logo: logoOn, endCard: false }, seq);
        const ctx = fakeCtx();
        const L = b.layoutBranding(ctx, sp, 4);
        const name = `title "${tName}" at ${pos}, logo ${logoOn ? "on" : "off"}`;
        const ok = !!L.title && inside(L.title.rect) && L.title.lines.every((l) => l.x - l.w / 2 >= b.SAFE.x0 && l.x + l.w / 2 <= b.SAFE.x1 && l.y - L.title.size * 0.6 >= b.SAFE.y0 && l.y + L.title.size * 0.6 <= b.SAFE.y1);
        check(`${name}: every line inside the safe area (text + shadow)`, ok, L.title ? `size ${L.title.size}, rect ${json(L.title.rect)}` : "no title");
        check(`${name}: at most 2 lines and shrunk to fit`, L.title.lines.length <= 2 && L.title.lines.every((l) => l.w <= b.SAFE.x1 - b.SAFE.x0 - 2 * 16 + 1e-6));
        if (logoOn && pos === "top") {
          const lg = L.logo;
          const overlap = !(L.title.rect.x + L.title.rect.w <= lg.x || lg.x + lg.w <= L.title.rect.x || L.title.rect.y + L.title.rect.h <= lg.y || lg.y + lg.h <= L.title.rect.y);
          check(`${name}: does not overlap the logo bug`, !overlap);
        }
      }
    }
  }
  {
    const ctx = fakeCtx();
    const sp = spec(BBQ, { ...ON, endCard: false }, [{ move: "orbit", startView: "3/4", durationS: 4, title: { text: texts.long2, pos: "bottom" } }]);
    const L = b.layoutBranding(ctx, sp, 2);
    check("a long 2-line text is smaller than a short one", L.title.size < b.layoutBranding(ctx, spec(BBQ, { ...ON, endCard: false }, [{ move: "orbit", startView: "3/4", durationS: 4, title: { text: "Grill", pos: "bottom" } }]), 2).title.size);
    const pos = (p) => b.layoutBranding(fakeCtx(), spec(BBQ, { ...ON, logo: false, endCard: false }, [{ move: "orbit", startView: "3/4", durationS: 4, title: { text: "Hi", pos: p } }]), 2).title.rect;
    check("Top sits at the top of the safe area, Bottom at the bottom, Middle in between", pos("top").y < pos("middle").y && pos("middle").y < pos("bottom").y && pos("top").y <= 240 && pos("bottom").y + pos("bottom").h >= 1480);
  }
  // logo bug and end card
  for (const [name, kit] of [["BBQ Ride", BBQ], ["coffee", KOP]]) {
    const sp = spec(kit);
    const bug = b.layoutBranding(fakeCtx(), sp, 1).logo;
    check(`${name}: logo bug is inside the safe area, top right, 160 px wide`, inside(bug) && bug.w === 160 && near(bug.x + bug.w, 1020) && bug.y === 220 && bug.alpha === 0.9);
    const card = b.layoutBranding(fakeCtx(), sp, 12.2).card;
    check(`${name}: every end-card element is inside the safe area`, inside(card.rect) && inside(card.logo) && card.handle.x - card.handle.w / 2 >= 60 && card.handle.x + card.handle.w / 2 <= 1020 && card.line.x - card.line.w / 2 >= 60 && card.line.x + card.line.w / 2 <= 1020 && card.line.y + 20 <= 1500);
    check(`${name}: end card is centred horizontally`, near(card.logo.x + card.logo.w / 2, 540) && card.handle.x === 540 && card.line.x === 540);
  }
  {
    const longCard = spec(BBQ, { ...ON, handle: "@" + "x".repeat(40), endText: "Q".repeat(80) });
    const card = b.layoutBranding(fakeCtx(), longCard, 12.2).card;
    check("a long handle and a long end line shrink to fit the safe width", card.handle.w <= 960 && card.line.w <= 960);
  }
}

/* ============================ fades ============================ */
{
  check("title alpha is 0 at the shot's first instant", b.titleAlpha(0, 4) === 0);
  check("title alpha is 0.5 at 0.2 s", near(b.titleAlpha(0.2, 4), 0.5));
  check("title alpha is 1 at 0.4 s and in the middle", b.titleAlpha(0.4, 4) === 1 && b.titleAlpha(2, 4) === 1 && b.titleAlpha(1.0, 8) === 1);
  check("title alpha is 0.5 at 0.2 s before the end", near(b.titleAlpha(3.8, 4), 0.5));
  check("title alpha at the shot's last export frame is 1/30 / 0.4", near(b.titleAlpha(4 - 1 / 30, 4), 1 / 30 / 0.4));
  check("title alpha is 0 at the shot's end", b.titleAlpha(4, 4) === 0);
  check("a 12 s shot fades over 0.4 s only (alpha 1 at 5 s)", b.titleAlpha(5, 12) === 1);
  const sp = spec(BBQ, { ...ON, endCard: false });
  const alphaAt = (tt) => b.layoutBranding(fakeCtx(), sp, tt).title?.alpha ?? 0;
  check("layout: shot 1 title is not drawn at t = 0 (alpha 0)", alphaAt(0) === 0);
  check("layout: shot 1 title alpha 1 mid-shot (t = 2)", alphaAt(2) === 1);
  check("layout: shot 1 title fades out (t = 3.8 -> 0.5)", near(alphaAt(3.8), 0.5));
  check("layout: shot 2 title starts from 0 at the cut (t = 4) and is 0.5 at 4.2", alphaAt(4) === 0 && near(alphaAt(4.2), 0.5));
  check("layout: shot 3 has no title", b.layoutBranding(fakeCtx(), sp, 10).title === null);
  const drawnAlpha = (tt) => {
    const c = fakeCtx();
    b.drawBranding(c, 1080, 1920, sp, tt);
    return c.calls.find((x) => x.op === "fillText")?.alpha;
  };
  check("the drawn text carries the fade alpha", near(drawnAlpha(0.2), 0.5) && drawnAlpha(2) === 1);
}

/* ============================ end card: timing and the 28 s guard ============================ */
{
  const sp = spec(BBQ);
  check("spec total is the Reel + 2 s", sp.reelS === 12 && sp.totalS === 14);
  const at = (tt) => b.layoutBranding(fakeCtx(), sp, tt);
  check("no end card or dimming on the last Reel frame (t = 11 + 29/30)", at(12 - 1 / 30).dim === 0 && at(12 - 1 / 30).card === null);
  check("end card starts at t = 12 s: dim 0.6 (40% brightness)", near(at(12).dim, 0.6) && !!at(12).card);
  check("end card is still up on its last frame (t = 13 + 29/30)", !!at(14 - 1 / 30).card);
  check("nothing is drawn from t = 14 s on", at(14).card === null && at(14).dim === 0);
  check("the logo bug is not drawn on end-card frames (the big logo replaces it)", at(12.5).logo === null && at(12.5).title === null);
  check("the logo bug is drawn on every Reel frame (t = 0 .. 11 + 29/30)", [0, 4, 11.99].every((tt) => !!at(tt).logo));
  const noCard = spec(BBQ, { ...ON, endCard: false });
  check("end card off: totalS = Reel and nothing after the Reel", noCard.totalS === 12 && noCard.endCard === null && b.layoutBranding(fakeCtx(), noCard, 12.5).card === null);
  const drawn = fakeCtx();
  b.drawBranding(drawn, 1080, 1920, sp, 12.5);
  const rect = drawn.calls.find((x) => x.op === "fillRect");
  check("the dim is a full-frame black rectangle at alpha 0.6", rect.x === 0 && rect.y === 0 && rect.w === 1080 && rect.h === 1920 && rect.fillStyle === "rgba(0, 0, 0, 0.6)");
  // the 28 s guard
  check("endCardFits: 24 s ok, 26 s ok, 28 s refused (30 s limit would be 28 + 2 > 28)", b.endCardFits(24).ok && b.endCardFits(26).ok && !b.endCardFits(28).ok);
  const why = b.endCardFits(28).reason;
  check("the refusal says why (2 s, 30 s total, 28 s limit)", /2 s/.test(why) && /30 s/.test(why) && /28 s/.test(why), why);
  const st = b.createBrandingState();
  const refused = st.setEndCard(true, 28);
  check("setEndCard(true) is refused at 28 s and the state stays off", refused.ok === false && st.getSnapshot().endCard === false);
  check("setEndCard(true) at 24 s works; turning it off always works", st.setEndCard(true, 24).ok && st.getSnapshot().endCard === true && st.setEndCard(false, 28).ok && st.getSnapshot().endCard === false);
  // through the shot list: with the card on, a longer Reel is refused
  b.brandingState.reset();
  store.resetSequence();
  for (let i = 0; i < 2; i += 1) store.addShot(); // 8 + 8 + 8 = 24
  check("shot list at 24 s", store.getSnapshot().durationS === 24, String(store.getSnapshot().durationS));
  check("end card can be turned on at 24 s", b.brandingState.setEndCard(true, store.getSnapshot().durationS).ok);
  const add = store.addShot();
  check("with the end card on, Add shot (+4 s = 28 s) is refused with the reason", add.ok === false && /28 s/.test(add.reason) && store.getSnapshot().sequence.length === 3, add.reason);
  const dur = store.setShot(2, { durationS: 12 });
  check("with the end card on, a longer shot (28 s) is refused", dur.ok === false && store.getSnapshot().durationS === 24);
  check("a shorter Reel is still allowed", store.setShot(0, { durationS: 4 }).ok && store.getSnapshot().durationS === 20);
  check("back to 24 s (+ 2 = 26) is allowed", store.setShot(0, { durationS: 8 }).ok && store.getSnapshot().durationS === 24);
  b.brandingState.setEndCard(false, 24);
  check("with the end card off the same Add shot works (24 -> 28)", store.addShot().ok && store.getSnapshot().durationS === 28);
  check("... and then the end card cannot be turned on (28 s)", b.brandingState.setEndCard(true, 28).ok === false);
  store.resetSequence();
  b.brandingState.reset();
}

/* ============================ logo size: never more than 1.5x native ============================ */
{
  const bug = b.logoSize(fakeImg(262), 160, 240);
  check("262 px logo: bug is 160 px (below 1.5x)", bug.w === 160 && bug.h === 160);
  const card = b.logoSize(fakeImg(262), 520, 420);
  check("262 px logo: end card is capped at 1.5x = 393 px (not 520)", near(card.w, 393) && near(card.h, 393));
  const tiny = b.logoSize(fakeImg(80), 160, 240);
  check("80 px logo: bug is capped at 120 px", near(tiny.w, 120));
  const big = b.logoSize(fakeImg(1024), 520, 420);
  check("1024 px logo: bug 160 / card 520 (no code change for a bigger file)", b.logoSize(fakeImg(1024), 160, 240).w === 160 && big.w === 420 && big.h === 420 && b.logoSize(fakeImg(1024, 400), 520, 420).w === 520);
  const tall = b.logoSize(fakeImg(100, 400), 160, 240);
  check("a tall logo is held to the height limit and 1.5x", tall.h <= 240 && tall.w <= 150 && near(tall.w / tall.h, 0.25));
  check("a 0-size image gives no size", b.logoSize(fakeImg(0), 160, 240) === null);
  for (const native of [60, 120, 262, 500, 2048]) {
    const sp = spec(BBQ, ON, SEQ, fakeImg(native));
    for (const [tt, scale] of [[1, 1], [12.5, 1], [1, 0.5], [12.5, 0.4]]) {
      const c = fakeCtx();
      b.drawBranding(c, 1080 * scale, 1920 * scale, sp, tt);
      const imgs = c.calls.filter((x) => x.op === "drawImage");
      const okSize = imgs.length === 1 && imgs.every((x) => (x.w * 1) <= native * 1.5 + 1e-6 && x.h <= native * 1.5 + 1e-6);
      check(`drawn logo <= 1.5x its ${native} px at t=${tt}, canvas scale ${scale}`, okSize, imgs.map((x) => `${x.w.toFixed(0)}x${x.h.toFixed(0)}`).join(","));
    }
  }
  const c2 = fakeCtx();
  b.drawBranding(c2, 1080, 1920, spec(BBQ), 1);
  check("the bug is drawn at 90% opacity", c2.calls.find((x) => x.op === "drawImage").alpha === 0.9);
}

/* ============================ empty handle ============================ */
{
  const kopNoHandle = { ...KOP, handle1: "" };
  const sp = spec(kopNoHandle);
  const card = b.layoutBranding(fakeCtx(), sp, 12.5).card;
  check("empty kit handle: no handle line on the end card", card.handle === null && !!card.logo && !!card.line);
  const c = fakeCtx();
  b.drawBranding(c, 1080, 1920, sp, 12.5);
  check("empty kit handle: no 600-weight handle text is drawn", !c.calls.some((x) => x.op === "fillText" && x.font.startsWith("600")));
  check("a blank / spaces-only typed handle also hides the line", b.layoutBranding(fakeCtx(), spec(BBQ, { ...ON, handle: "   " }), 12.5).card.handle === null);
  check("typing a handle on a kit with none shows it", b.layoutBranding(fakeCtx(), spec(kopNoHandle, { ...ON, handle: "@kopcoffee" }), 12.5).card.handle.text === "@kopcoffee");
  check("an empty typed handle ('') overrides the kit's and hides the line", b.layoutBranding(fakeCtx(), spec(BBQ, { ...ON, handle: "" }), 12.5).card.handle === null);
  check("no end-card line typed: no line drawn", b.layoutBranding(fakeCtx(), spec(BBQ, { ...ON, endText: "" }), 12.5).card.line === null);
  check("end card with no logo image still has the handle and dims", (() => { const l = b.layoutBranding(fakeCtx(), spec(BBQ, ON, SEQ, null), 12.5); return l.card.logo === null && !!l.card.handle && l.dim > 0; })());
}

/* ============================ OFF = nothing drawn ============================ */
{
  const OFF = { logo: false, endCard: false, endText: "", handle: null };
  const plain = [{ move: "orbit", startView: "3/4", durationS: 4 }, { move: "slide", startView: "Side", durationS: 4 }];
  check("everything off: no spec at all (the exporter keeps its old path)", spec(BBQ, OFF, plain) === null);
  check("logo on but the kit has no logo image: nothing to draw, no spec", spec(BBQ, { ...OFF, logo: true }, plain, null) === null);
  check("a title with only spaces is no title: no spec", spec(BBQ, OFF, [{ move: "orbit", startView: "3/4", durationS: 4, title: { text: "   \n  ", pos: "top" } }]) === null);
  check("one title alone makes a spec", spec(BBQ, OFF, [{ move: "orbit", startView: "3/4", durationS: 4, title: { text: "Hi", pos: "top" } }]) !== null);
  check("drawing a null spec draws nothing and does not throw", (() => { const c = fakeCtx(); b.drawBranding(c, 1080, 1920, null, 1); return c.calls.length === 0; })());
  check("drawing at t < 0 or NaN draws nothing", (() => { const c = fakeCtx(); b.drawBranding(c, 1080, 1920, spec(BBQ), -1); b.drawBranding(c, 1080, 1920, spec(BBQ), NaN); return c.calls.length === 0; })());
  check("default branding state is all off", json(b.createBrandingState().getSnapshot()) === json({ logo: false, endCard: false, endText: "", handle: null }));
  check("endHoldS is 0 with the end card off, 2 with it on", (() => { b.brandingState.reset(); const a = b.endHoldS(); b.brandingState.setEndCard(true, 8); const c = b.endHoldS(); b.brandingState.reset(); return a === 0 && c === 2; })());
  // the shot list without titles is exactly what it was before R1
  const old = [{ move: "orbit", startView: "3/4", durationS: 8 }];
  check("a Reel without titles saves exactly the old session form", json(r.sequenceToSession(old)) === json([{ move: "orbit", startView: "3/4", durationS: 8 }]));
  store.resetSequence();
  store.setShot(0, { durationS: 4 });
  check("the default shot has no title key", !("title" in store.getSnapshot().sequence[0]));
  store.setShot(0, { title: { text: "", pos: "bottom" } });
  check("an empty title at the default position is stored as nothing", !("title" in store.getSnapshot().sequence[0]));
  store.resetSequence();
}

/* ============================ per-shot titles in the shot list ============================ */
{
  store.resetSequence();
  const ok = store.setShot(0, { title: { text: "Fire up the grill", pos: "top" } });
  check("setShot with a title works", ok.ok && store.getSnapshot().sequence[0].title.pos === "top");
  check("the title is part of the frozen shot", Object.isFrozen(store.getSnapshot().sequence[0]));
  check("an invalid position is refused", store.setShot(0, { title: { text: "x", pos: "left" } }).ok === false);
  check("a non-string title text is refused", store.setShot(0, { title: { text: 5, pos: "top" } }).ok === false);
  store.setShot(0, { title: { text: "line one is fine\nline two\nline three", pos: "middle" } });
  check("a third line is dropped (max 2 lines)", store.getSnapshot().sequence[0].title.text === "line one is fine\nline two");
  store.setShot(0, { title: { text: "x".repeat(200), pos: "middle" } });
  check("a line is cut to 60 characters", store.getSnapshot().sequence[0].title.text.length === t.MAX_TITLE_LINE_CHARS);
  store.setShot(0, { title: { text: "Keep me ", pos: "bottom" } });
  check("typing a trailing space is kept while typing", store.getSnapshot().sequence[0].title.text === "Keep me ");
  check("the drawn lines are trimmed", json(t.titleLines("  a  \n  b  \nc")) === '["a","b"]');
  store.setShot(0, { title: { text: "Keep", pos: "bottom" } });
  store.setShot(0, { frameOn: "start" });
  check("other edits keep the title", store.getSnapshot().sequence[0].title.text === "Keep");
  store.addKey(0, { t: 0, target: "product", assetId: "coffee-bike", transform: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 }, easing: "smooth" });
  check("adding a key keeps the title (shotBase)", store.getSnapshot().sequence[0].title?.text === "Keep" && store.getSnapshot().sequence[0].keys?.length === 1);
  store.addShot();
  store.moveShot(0, 1);
  check("moving a shot moves its title with it", store.getSnapshot().sequence[1].title?.text === "Keep" && !store.getSnapshot().sequence[0].title);
  store.setShot(1, { title: { text: "", pos: "bottom" } });
  check("clearing the text at the default position removes the title", !store.getSnapshot().sequence[1].title);
  store.setShot(1, { title: { text: "", pos: "top" } });
  check("a position chosen before any text is kept", store.getSnapshot().sequence[1].title?.pos === "top");
  check("... but it draws nothing (no visible text)", spec(BBQ, { logo: false, endCard: false, endText: "", handle: null }, store.getSnapshot().sequence) === null);
  store.resetSequence();
}

/* ============================ session: save, restore, old session, Reset ============================ */
{
  store.resetSequence();
  b.brandingState.reset();
  store.setShot(0, { durationS: 8, title: { text: "Own the fire\nBuilt in India", pos: "top" } });
  store.addShot();
  store.setShot(1, { title: { text: "Grill on wheels", pos: "bottom" } });
  b.brandingState.setLogo(true);
  b.brandingState.setEndText("Franchise enquiries — DM us");
  b.brandingState.setHandle("@mine");
  b.brandingState.setEndCard(true, store.getSnapshot().durationS);
  // what studioSession.saveSession writes
  const snap = JSON.parse(JSON.stringify({ reel: store.sequenceForSession(), branding: b.brandingState.forSession() }));
  check("the session carries the titles inside the shots", snap.reel[0].title.text === "Own the fire\nBuilt in India" && snap.reel[0].title.pos === "top" && snap.reel[1].title.pos === "bottom");
  check("the session carries logo, end card, its line and the handle", json(snap.branding) === json({ logo: true, endCard: true, endText: "Franchise enquiries — DM us", handle: "@mine" }));
  // Reset (what studioSession.resetSession calls)
  store.resetSequence();
  b.brandingState.reset();
  check("Reset: branding is all off again", json(b.brandingState.getSnapshot()) === json({ logo: false, endCard: false, endText: "", handle: null }));
  check("Reset: the shot list is the default single shot with no title", store.getSnapshot().sequence.length === 1 && !store.getSnapshot().sequence[0].title);
  // Restore (what studioSession.restoreSession calls)
  store.restoreSequence(snap.reel);
  b.brandingState.restore(snap.branding, store.getSnapshot().durationS);
  check("Restore: titles are back with their text and position", store.getSnapshot().sequence[0].title.text === "Own the fire\nBuilt in India" && store.getSnapshot().sequence[0].title.pos === "top" && store.getSnapshot().sequence[1].title.text === "Grill on wheels");
  check("Restore: logo, end card, line and handle are back", json(b.brandingState.getSnapshot()) === json(snap.branding));
  check("the restored Reel builds the same spec as before", spec(BBQ, b.brandingState.getSnapshot(), store.getSnapshot().sequence).reelS === 16);
  // an old session: no `branding`, no titles
  const oldSnap = { reel: [{ move: "orbit", startView: "3/4", durationS: 8 }] };
  b.brandingState.reset();
  b.brandingState.setLogo(true);
  store.restoreSequence(oldSnap.reel);
  if (oldSnap.branding) b.brandingState.restore(oldSnap.branding, store.getSnapshot().durationS); // as restoreSession does
  check("an old session loads: shots as saved, no title", store.getSnapshot().sequence.length === 1 && !("title" in store.getSnapshot().sequence[0]));
  check("an old session without `branding` leaves the branding state as it is", b.brandingState.getSnapshot().logo === true);
  b.brandingState.reset();
  // sanitizing
  check("restore refuses a non-object", b.brandingState.restore(null, 8) === false && b.brandingState.restore("x", 8) === false);
  b.brandingState.restore({ logo: "yes", endCard: 1, endText: 5, handle: 7 }, 8);
  check("restore: wrong types become off / empty / follow-the-kit", json(b.brandingState.getSnapshot()) === json({ logo: false, endCard: false, endText: "", handle: null }));
  b.brandingState.restore({ logo: true, endCard: true, endText: "x".repeat(500), handle: "h".repeat(500) }, 28);
  check("restore: the end card stays off when the Reel is 28 s", b.brandingState.getSnapshot().endCard === false && b.brandingState.getSnapshot().logo === true);
  check("restore: text fields are length-limited", b.brandingState.getSnapshot().endText.length === b.MAX_END_TEXT_CHARS && b.brandingState.getSnapshot().handle.length === b.MAX_HANDLE_CHARS);
  b.brandingState.reset();
  const junk = r.sequenceFromSession([{ move: "orbit", startView: "3/4", durationS: 8, title: { text: "ok", pos: "nowhere" } }, { move: "orbit", startView: "3/4", durationS: 4, title: 5 }, { move: "slide", startView: "Side", durationS: 4, title: { text: "Fine", pos: "middle" } }]);
  check("a bad saved title is dropped (a bad position falls back to Bottom), the shot is kept", junk.length === 3 && junk[0].title.text === "ok" && junk[0].title.pos === "bottom" && !junk[1].title && junk[2].title.text === "Fine");
  check("a saved title survives a JSON round trip exactly", json(r.sequenceToSession(r.sequenceFromSession(JSON.parse(JSON.stringify(snap.reel))))) === json(snap.reel));
  store.resetSequence();
  b.brandingState.reset();
  const sess = readFileSync(new URL("../src/session/studioSession.js", import.meta.url), "utf8");
  check("studioSession saves `branding` next to `reel`", /branding:\s*brandingState\.forSession\(\)/.test(sess));
  check("studioSession restores it only when the session has it", /if \(snap\.branding\) brandingState\.restore\(snap\.branding, animationStore\.getSnapshot\(\)\.durationS\)/.test(sess));
  check("studioSession Reset turns the branding off", /brandingState\.reset\(\)/.test(sess));
}

/* ============================ one drawing function, shared by preview and export ============================ */
{
  const exporter = readFileSync(new URL("../src/animation/exporter.js", import.meta.url), "utf8");
  const overlay = readFileSync(new URL("../src/ui/BrandingOverlay.jsx", import.meta.url), "utf8");
  check("the exporter draws with branding.drawBranding", /import \{[^}]*drawBranding[^}]*\} from "\.\.\/poster\/branding"/.test(exporter) && /drawBranding\(/.test(exporter));
  check("the preview overlay draws with branding.drawBranding", /import \{[^}]*drawBranding[^}]*\} from "\.\.\/poster\/branding"/.test(overlay) && /drawBranding\(/.test(overlay));
  check("both build the spec with getBrandingSpec", /getBrandingSpec\(/.test(exporter) && /getBrandingSpec\(/.test(overlay));
  check("no second drawing code in the exporter or the overlay (no fillText / drawImage of branding)", !/fillText|\.fillRect/.test(exporter) && !/fillText|fillRect/.test(overlay));
  check("with no spec the exporter hands the encoder the stage canvas, untouched", /let source = canvas;\s*\n\s*if \(spec\) \{/.test(exporter.replace(/\r/g, "")));
  // the same call at two sizes is the same drawing scaled
  const sp = spec(BBQ);
  const a = fakeCtx();
  const c = fakeCtx();
  b.drawBranding(a, 1080, 1920, sp, 2);
  b.drawBranding(c, 540, 960, sp, 2);
  const key = (x) => x.calls.map((k) => ({ ...k, img: undefined }));
  check("the same call at 540x960 makes the same sequence of drawing operations", json(key(a).map((k) => k.op + k.text)) === json(key(c).map((k) => k.op + k.text)));
  check("the same call twice is identical (deterministic)", (() => { const d = fakeCtx(); b.drawBranding(d, 1080, 1920, sp, 2); return json(key(a)) === json(key(d)); })());
  check("scale is w / 1080 and h / 1920", (() => { const d = fakeCtx(); b.drawBranding(d, 540, 960, sp, 1); return near(d.calls.find((x) => x.op === "drawImage").sx, 0.5); })());
}

/* ============================ module hygiene ============================ */
{
  const src = readFileSync(new URL("../src/poster/branding.js", import.meta.url), "utf8");
  check("branding.js has no import from three or react", !/from ["'](three|react)/.test(src));
  const st = readFileSync(new URL("../src/animation/shotTitle.js", import.meta.url), "utf8");
  check("shotTitle.js has no imports at all", !/^import /m.test(st));
  check("fonts are the poster's: Saira Stencil One and Oswald", FONT_HEAD === "Saira Stencil One" && FONT_BODY === "Oswald");
}

console.log("");
console.log(failed === 0 ? `ALL CHECKS PASSED (${passed} PASS)` : `${failed} FAILED, ${passed} passed`);
process.exit(failed === 0 ? 0 : 1);
