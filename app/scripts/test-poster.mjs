// Slice C1a — checks for app/src/poster/poster.js: percent -> pixel layout
// maths at both poster sizes (1080x1350 and 1080x1080), kit save/load/corrupt
// storage, the aspect guard, text fitting, the label-list commands (cap at 6),
// and getPosterSpec. Plain node, no browser, no three.js, no canvas package —
// a tiny fake 2D context stands in for the real one (measureText derives a
// width from the current font size so fitFontSize/truncateToWidth behave
// exactly like the real canvas would for text that is too wide).
// Run from the app folder:  node scripts/test-poster.mjs   (exit code 1 on any FAIL)

import * as p from "../src/poster/poster.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}

/* ---------------------------- fake storage -------------------------------- */
// Same shape as garage/measure.js's test helper: an in-memory Map with
// switches to simulate a broken storage.
function fakeStorage({ throwOnGet = false, throwOnSet = false, seed = {} } = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => {
      if (throwOnGet) throw new Error("boom");
      return map.has(k) ? map.get(k) : null;
    },
    setItem: (k, v) => {
      if (throwOnSet) throw new Error("boom");
      map.set(k, String(v));
    },
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

/* ------------------------------- fake ctx --------------------------------- */
// A minimal 2D context: records every call, and derives measureText's width
// from the current font's px size so the real fitting/truncation logic in
// poster.js actually exercises its shrink/truncate branches.
function fakeCtx() {
  const calls = [];
  const ctx = {
    font: "16px sans",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    textAlign: "left",
    textBaseline: "alphabetic",
    save: () => calls.push(["save"]),
    restore: () => calls.push(["restore"]),
    beginPath: () => calls.push(["beginPath"]),
    moveTo: (x, y) => calls.push(["moveTo", x, y]),
    lineTo: (x, y) => calls.push(["lineTo", x, y]),
    arcTo: (...a) => calls.push(["arcTo", ...a]),
    arc: (...a) => calls.push(["arc", ...a]),
    closePath: () => calls.push(["closePath"]),
    fill: () => calls.push(["fill", ctx.fillStyle]),
    stroke: () => calls.push(["stroke", ctx.strokeStyle]),
    fillRect: (x, y, w, h) => calls.push(["fillRect", x, y, w, h, ctx.fillStyle]),
    fillText: (t, x, y) => calls.push(["fillText", t, x, y, ctx.font, ctx.fillStyle]),
    drawImage: (...a) => calls.push(["drawImage", ...a]),
    measureText: (t) => {
      const m = /([\d.]+)px/.exec(ctx.font);
      const size = m ? parseFloat(m[1]) : 16;
      return { width: (t ? t.length : 0) * size * 0.55 };
    },
  };
  return { ctx, calls };
}

const near = (a, b, eps = 1e-9) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= eps;

/* ============================== percent -> px ============================== */
check("pct: 0% is 0", near(p.pct(1080, 0), 0));
check("pct: 100% is the full dimension", near(p.pct(1080, 100), 1080));
check("pct: 50% of 1350 (portrait height)", near(p.pct(1350, 50), 675));
check("pct: a non-finite percent gives 0", near(p.pct(1080, NaN), 0));
check("pct: a string-number percent still works", near(p.pct(1080, "10"), 108));

/* ================================ aspect guard =============================== */
check("aspectKeyFor: 1080x1350 is 4:5", p.aspectKeyFor(1080, 1350) === "4:5");
check("aspectKeyFor: 1080x1080 is 1:1", p.aspectKeyFor(1080, 1080) === "1:1");
check("aspectKeyFor: a scaled 4:5 (2160x2700) still reads 4:5", p.aspectKeyFor(2160, 2700) === "4:5");
check("aspectKeyFor: a scaled 1:1 (2160x2160) still reads 1:1", p.aspectKeyFor(2160, 2160) === "1:1");
check("aspectKeyFor: 9:16 (story-reel) is neither", p.aspectKeyFor(1080, 1920) === null);
check("aspectKeyFor: 16:9 (web-hero) is neither", p.aspectKeyFor(1600, 900) === null);
check("aspectKeyFor: zero height is null, not a throw/NaN", p.aspectKeyFor(1080, 0) === null);
check("aspectKeyFor: negative dims are null", p.aspectKeyFor(-1080, 1350) === null);
check("aspectKeyFor: NaN dims are null", p.aspectKeyFor(NaN, 1080) === null);
check("posterAspectOk: true for 1080x1350", p.posterAspectOk(1080, 1350) === true);
check("posterAspectOk: true for 1080x1080", p.posterAspectOk(1080, 1080) === true);
check("posterAspectOk: false for 1080x1920", p.posterAspectOk(1080, 1920) === false);
check("POSTER_SIZES has exactly the two owner-approved sizes", near(p.POSTER_SIZES["4:5"].width, 1080) && near(p.POSTER_SIZES["4:5"].height, 1350) && near(p.POSTER_SIZES["1:1"].width, 1080) && near(p.POSTER_SIZES["1:1"].height, 1080));
check("POSTER_ASPECT_MESSAGE is the owner-approved copy", p.POSTER_ASPECT_MESSAGE === "Poster needs 4:5 or 1:1");

/* ================================ text fitting =============================== */
{
  const { ctx } = fakeCtx();
  const longText = "A".repeat(200);
  const size = p.fitFontSize(ctx, longText, 300, { family: "Oswald", startSize: 80, minSize: 12 });
  check("fitFontSize: shrinks an overlong string down toward minSize", size < 80, `size=${size}`);
  check("fitFontSize: never shrinks below minSize", size >= 12);
  ctx.font = `400 ${size}px "Oswald"`;
  check("fitFontSize: the chosen size fits (or has hit minSize)", ctx.measureText(longText).width <= 300 || size === 12);
}
{
  const { ctx } = fakeCtx();
  const size = p.fitFontSize(ctx, "hi", 5000, { family: "Oswald", startSize: 40, minSize: 12 });
  check("fitFontSize: short text keeps the requested start size", size === 40);
}
{
  const { ctx } = fakeCtx();
  ctx.font = `400 20px "Oswald"`;
  const truncated = p.truncateToWidth(ctx, "A".repeat(50), 100);
  check("truncateToWidth: an overlong string is shortened", truncated.length < 50);
  check("truncateToWidth: the result ends with an ellipsis", truncated.endsWith("…"));
  check("truncateToWidth: the result fits the max width", ctx.measureText(truncated).width <= 100);
  const untouched = p.truncateToWidth(ctx, "short", 5000);
  check("truncateToWidth: text that already fits is returned unchanged", untouched === "short");
  check("truncateToWidth: empty text is empty", p.truncateToWidth(ctx, "", 100) === "");
}

/* ============================ kits: save/load/corrupt ========================= */
{
  const kits = p.defaultKits();
  check("defaultKits: has bbq-ride and the-kop", !!kits["bbq-ride"] && !!kits["the-kop"]);
  check("defaultKits: BBQ Ride ships filled in (decision 3)", kits["bbq-ride"].handle1 === "@bbqrideindia" && kits["bbq-ride"].hashtag === "#bbqrideindia" && kits["bbq-ride"].whatsapp1 === "+91 81052 08810" && kits["bbq-ride"].whatsapp2 === "+91 74069 36974");
  check("defaultKits: THE KOP ships blank text, colours only", kits["the-kop"].handle1 === "" && kits["the-kop"].hashtag === "" && kits["the-kop"].colors.bg === "#141414");
}
{
  const storage = fakeStorage();
  const before = p.readKits(storage);
  check("readKits: no storage entry falls back to the presets", before["bbq-ride"].handle1 === "@bbqrideindia");
  const edited = { ...before, "bbq-ride": { ...before["bbq-ride"], handle2: "@edited" } };
  const wrote = p.writeKits(storage, edited);
  check("writeKits: reports success", wrote === true);
  const after = p.readKits(storage);
  check("readKits: round-trips an edit (simulated reload)", after["bbq-ride"].handle2 === "@edited");
  check("readKits: an untouched kit still reads back correctly", after["the-kop"].colors.accent === "#FF7A1A");
}
{
  const storage = fakeStorage({ seed: { [p.KITS_KEY]: "{not valid json" } });
  const kits = p.readKits(storage);
  check("readKits: corrupt JSON falls back to the presets without throwing", kits["bbq-ride"].handle1 === "@bbqrideindia");
}
{
  const storage = fakeStorage({ seed: { [p.KITS_KEY]: JSON.stringify({ "bbq-ride": "not an object" }) } });
  const kits = p.readKits(storage);
  check("readKits: a corrupt single kit shape falls back to that kit's preset", kits["bbq-ride"].handle1 === "@bbqrideindia");
}
{
  const storage = fakeStorage({ seed: { [p.KITS_KEY]: JSON.stringify(p.defaultKits()) } });
  const kits = p.readKits(storage);
  check("readKits: a valid full save round-trips exactly", kits["bbq-ride"].whatsapp1 === "+91 81052 08810");
}
{
  const storage = fakeStorage({ throwOnGet: true });
  check("readKits: a storage that throws on get falls back to the presets", p.readKits(storage)["bbq-ride"].handle1 === "@bbqrideindia");
}
{
  const storage = fakeStorage({ throwOnSet: true });
  check("writeKits: a storage that throws on set reports failure, not a throw", p.writeKits(storage, p.defaultKits()) === false);
}
check("readKits: a null/missing storage falls back to the presets", p.readKits(null)["the-kop"].name === "THE KOP");
check("writeKits: a null storage reports failure, not a throw", p.writeKits(null, p.defaultKits()) === false);

{
  const storage = fakeStorage();
  check("readActiveKitId: defaults to bbq-ride", p.readActiveKitId(storage) === "bbq-ride");
  check("writeActiveKitId: reports success", p.writeActiveKitId(storage, "the-kop") === true);
  check("readActiveKitId: round-trips the write", p.readActiveKitId(storage) === "the-kop");
}
check("readActiveKitId: a null storage defaults to bbq-ride", p.readActiveKitId(null) === "bbq-ride");

/* ============================ drawPoster: layout at both sizes ================ */
{
  const kit = p.defaultKits()["bbq-ride"];
  for (const [key, size] of Object.entries(p.POSTER_SIZES)) {
    const { ctx, calls } = fakeCtx();
    const spec = {
      templateId: "franchise-hero",
      kit,
      toggles: p.defaultToggles(),
      headline1: "COFFEE",
      headline2: "SIDECARS",
      subline: "the mobile espresso bike",
      logoImage: null,
    };
    p.drawPoster(ctx, size.width, size.height, spec);
    const drewFooterBg = calls.some((c) => c[0] === "fillRect" && c[5] === kit.colors.bg);
    const drewLogoBadge = calls.some((c) => c[0] === "fill" && c[1] === "#FFFFFF");
    const drewCta = calls.some((c) => c[0] === "fill" && c[1] === kit.colors.accent);
    const drewHeadlineText = calls.some((c) => c[0] === "fillText" && c[1] === "COFFEE");
    // Slice P1 (owner decision): with no logo loaded the export draws nothing in
    // the logo slot, so no white badge fill is expected here.
    check(`drawPoster franchise-hero at ${key} (${size.width}x${size.height}): draws without throwing, hits every toggled-on element, and leaves the logo slot empty with no logo`, drewFooterBg && !drewLogoBadge && drewCta && drewHeadlineText);
    const withLogo = fakeCtx();
    p.drawPoster(withLogo.ctx, size.width, size.height, { ...spec, logoImage: { width: 300, height: 100 } });
    const drewBadgeWithLogo = withLogo.calls.some((c) => c[0] === "fill" && c[1] === "#FFFFFF");
    check(`drawPoster franchise-hero at ${key} (${size.width}x${size.height}): with a logo loaded the white logo badge is still drawn`, drewBadgeWithLogo);
  }
}

/* ================== logo badge: square, aspect-ratio-kept fit (owner fix) ====== */
{
  const kit = p.defaultKits()["bbq-ride"];
  // A deliberately non-square logo (3:1), on both poster sizes, since the
  // badge must be square (sized off width only) regardless of aspect.
  const logoImage = { width: 300, height: 100 };
  for (const [key, size] of Object.entries(p.POSTER_SIZES)) {
    const { ctx, calls } = fakeCtx();
    p.drawPoster(ctx, size.width, size.height, {
      templateId: "franchise-hero",
      kit,
      toggles: p.defaultToggles(),
      logoImage,
    });
    const draw = calls.find((c) => c[0] === "drawImage");
    check(`logo badge at ${key}: drawImage was called`, !!draw);
    if (draw) {
      const [, , , , dw, dh] = draw;
      const expectedSize = p.pct(size.width, p.LOGO_BADGE_SIZE_PCT);
      check(`logo badge at ${key}: fitted image keeps the 3:1 source aspect ratio`, Math.abs(dw / dh - logoImage.width / logoImage.height) < 1e-6);
      check(`logo badge at ${key}: fitted image fits inside the square badge with padding`, dw <= expectedSize && dh <= expectedSize);
      check(`logo badge at ${key}: badge sizing is exactly 180px at a 1080-wide poster (owner spec)`, size.width === 1080 ? Math.abs(expectedSize - 180) < 1e-6 : true);
    }
  }
  // Sanity: the badge stays the SAME pixel size at 4:5 and 1:1 (both are 1080
  // wide), unlike the old height-relative sizing which differed between them.
  const badgeAt4x5 = p.pct(p.POSTER_SIZES["4:5"].width, p.LOGO_BADGE_SIZE_PCT);
  const badgeAt1x1 = p.pct(p.POSTER_SIZES["1:1"].width, p.LOGO_BADGE_SIZE_PCT);
  check("logo badge is the same square size at both poster sizes", Math.abs(badgeAt4x5 - badgeAt1x1) < 1e-6);
}
{
  // A toggle turned off must skip that element entirely (owner decision: each
  // element has its own on/off switch).
  const kit = p.defaultKits()["bbq-ride"];
  const { ctx, calls } = fakeCtx();
  const spec = {
    templateId: "franchise-hero",
    kit,
    toggles: { ...p.defaultToggles(), cta: false, footer: false },
    headline1: "COFFEE",
    headline2: "SIDECARS",
    subline: "",
    logoImage: null,
  };
  p.drawPoster(ctx, 1080, 1350, spec);
  const drewCta = calls.some((c) => c[0] === "fill" && c[1] === kit.colors.accent);
  const drewFooterBg = calls.some((c) => c[0] === "fillRect" && c[5] === kit.colors.bg);
  check("drawPoster: cta:false skips the CTA pill", !drewCta);
  check("drawPoster: footer:false skips the footer strip", !drewFooterBg);
}
{
  // Label boxes template, three labels, at 1:1.
  const kit = p.defaultKits()["bbq-ride"];
  const { ctx, calls } = fakeCtx();
  const labels = [
    { ...p.defaultLabel(0), text: "Espresso" },
    { ...p.defaultLabel(1), text: "Cold Brew", style: "white" },
    { ...p.defaultLabel(2), text: "Pour Over" },
  ];
  const spec = { templateId: "label-boxes", kit, toggles: p.defaultToggles(), labels, logoImage: null };
  p.drawPoster(ctx, 1080, 1080, spec);
  const texts = calls.filter((c) => c[0] === "fillText").map((c) => c[1]);
  check("drawPoster label-boxes: draws all three label texts", ["Espresso", "Cold Brew", "Pour Over"].every((t) => texts.includes(t)));
}
{
  // A 7th label is never accepted by the store, but drawPoster itself also
  // defensively caps at MAX_LABELS if handed a longer array directly.
  const kit = p.defaultKits()["bbq-ride"];
  const { ctx, calls } = fakeCtx();
  const labels = Array.from({ length: 8 }, (_, i) => ({ ...p.defaultLabel(i), text: `L${i}` }));
  p.drawPoster(ctx, 1080, 1080, { templateId: "label-boxes", kit, toggles: p.defaultToggles(), labels, logoImage: null });
  const texts = calls.filter((c) => c[0] === "fillText").map((c) => c[1]);
  check("drawPoster: caps labels at MAX_LABELS even if handed more", !texts.includes("L6") && !texts.includes("L7"));
}
check("drawPoster: a null ctx is a silent no-op, never a throw", (() => {
  try {
    p.drawPoster(null, 1080, 1350, { templateId: "franchise-hero", kit: p.defaultKits()["bbq-ride"] });
    return true;
  } catch {
    return false;
  }
})());
check("drawPoster: a zero size is a silent no-op, never a throw", (() => {
  const { ctx } = fakeCtx();
  try {
    p.drawPoster(ctx, 0, 0, { templateId: "franchise-hero", kit: p.defaultKits()["bbq-ride"] });
    return true;
  } catch {
    return false;
  }
})());
check("drawPoster: a missing spec is a silent no-op, never a throw", (() => {
  const { ctx } = fakeCtx();
  try {
    p.drawPoster(ctx, 1080, 1350, null);
    return true;
  } catch {
    return false;
  }
})());

/* ============================== live poster state ============================== */
{
  const storage = fakeStorage();
  const st = p.createPosterState({ storage });
  const s0 = st.getSnapshot();
  check("createPosterState: starts disabled with the Franchise Hero template", s0.enabled === false && s0.templateId === "franchise-hero");
  check("createPosterState: starts with every element toggle on", Object.values(s0.toggles).every((v) => v === true));
  check(
    "createPosterState: prefills the BBQ Ride Franchise Hero starter copy on an untouched fresh state (owner fix)",
    s0.headline1 === p.FRANCHISE_HERO_BBQ_DEFAULTS.headline1 &&
      s0.headline2 === p.FRANCHISE_HERO_BBQ_DEFAULTS.headline2 &&
      s0.subline === p.FRANCHISE_HERO_BBQ_DEFAULTS.subline &&
      s0.textTouched === false
  );
  st.setEnabled(true);
  check("setEnabled: flips the live snapshot", st.getSnapshot().enabled === true);
  st.setTemplateId("label-boxes");
  check("setTemplateId: switches template", st.getSnapshot().templateId === "label-boxes");
  st.setTemplateId("bogus");
  check("setTemplateId: an unknown id falls back to franchise-hero", st.getSnapshot().templateId === "franchise-hero");
  st.setToggle("cta", false);
  check("setToggle: flips one element, leaves the others", st.getSnapshot().toggles.cta === false && st.getSnapshot().toggles.footer === true);
  st.setHeadline1("Hello");
  st.setHeadline2("World");
  st.setSubline("sub");
  check("setHeadline1/2/setSubline: commit text", st.getSnapshot().headline1 === "Hello" && st.getSnapshot().headline2 === "World" && st.getSnapshot().subline === "sub");

  for (let i = 0; i < p.MAX_LABELS; i += 1) st.addLabel();
  check(`addLabel: fills up to MAX_LABELS (${p.MAX_LABELS})`, st.getSnapshot().labels.length === p.MAX_LABELS);
  const addedMore = st.addLabel();
  check("addLabel: refuses a 7th label", addedMore === false && st.getSnapshot().labels.length === p.MAX_LABELS);
  st.updateLabel(0, { text: "Updated" });
  check("updateLabel: patches one label by index", st.getSnapshot().labels[0].text === "Updated");
  st.removeLabel(0);
  check("removeLabel: removes exactly one", st.getSnapshot().labels.length === p.MAX_LABELS - 1);

  st.setKitId("the-kop");
  check("setKitId: updates the live snapshot", st.getSnapshot().kitId === "the-kop");
  check("setKitId: persists the active kit id", p.readActiveKitId(storage) === "the-kop");

  let notified = 0;
  const unsub = st.subscribe(() => {
    notified += 1;
  });
  st.setEnabled(false);
  check("subscribe: a listener hears a change", notified === 1);
  unsub();
  st.setEnabled(true);
  check("subscribe: an unsubscribed listener hears nothing more", notified === 1);
}

/* ==================== prefill never overwrites owner text (owner fix) ========== */
{
  const storage = fakeStorage();
  const st = p.createPosterState({ storage });
  check(
    "fresh state: prefilled and not yet touched",
    st.getSnapshot().headline1 === p.FRANCHISE_HERO_BBQ_DEFAULTS.headline1 && st.getSnapshot().textTouched === false
  );
  st.setHeadline1("My Own Line");
  check("setHeadline1: marks textTouched", st.getSnapshot().textTouched === true);
  st.setTemplateId("label-boxes");
  st.setTemplateId("franchise-hero");
  check(
    "leaving and returning to Franchise Hero never re-fires the prefill once touched",
    st.getSnapshot().headline1 === "My Own Line"
  );
  st.setKitId("the-kop");
  st.setKitId("bbq-ride");
  check(
    "leaving and returning to the BBQ Ride kit never re-fires the prefill once touched",
    st.getSnapshot().headline1 === "My Own Line"
  );

  const st2 = p.createPosterState({ storage: fakeStorage() });
  st2.setHeadline1(""); // the owner deliberately clears it to blank
  check(
    "explicitly clearing a field to blank also latches textTouched (never re-filled)",
    st2.getSnapshot().headline1 === "" && st2.getSnapshot().textTouched === true
  );
  st2.setTemplateId("label-boxes");
  st2.setTemplateId("franchise-hero");
  check("a deliberately blank headline stays blank across a template round-trip", st2.getSnapshot().headline1 === "");

  // THE KOP active from construction (no starter copy of its own): the
  // fields start genuinely blank, not prefilled.
  const st3 = p.createPosterState({ storage: fakeStorage({ seed: { [p.ACTIVE_KEY]: "the-kop" } }) });
  check(
    "THE KOP kit gets no BBQ Ride prefill",
    st3.getSnapshot().headline1 === "" && st3.getSnapshot().textTouched === false
  );
  st3.setKitId("bbq-ride");
  check(
    "switching to BBQ Ride while still untouched now prefills",
    st3.getSnapshot().headline1 === p.FRANCHISE_HERO_BBQ_DEFAULTS.headline1
  );
}

/* =============================== getPosterSpec ================================ */
{
  const storage = fakeStorage({ seed: { [p.KITS_KEY]: JSON.stringify(p.defaultKits()), [p.ACTIVE_KEY]: "bbq-ride" } });
  p.posterState.setEnabled(false);
  check("getPosterSpec: null while the poster is off", p.getPosterSpec(storage) === null);
  p.posterState.setEnabled(true);
  p.posterState.setTemplateId("franchise-hero");
  p.posterState.setHeadline1("COFFEE");
  const spec = p.getPosterSpec(storage);
  check("getPosterSpec: returns a spec with the active kit's real text", !!spec && spec.kit.handle1 === "@bbqrideindia" && spec.headline1 === "COFFEE");
  check("getPosterSpec: logoImage is null with nothing cached (never awaits)", spec.logoImage === null);
  p.posterState.setEnabled(false);
}

console.log(failed === 0 ? `\nALL CHECKS PASSED (${passed} PASS)` : `\n${failed} FAILED, ${passed} PASSED`);
process.exit(failed === 0 ? 0 : 1);
