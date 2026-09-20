// Phase 16B Slice D1 - MP4 structure inspector. Plain node, no dependencies.
//   node scripts/inspect-mp4.mjs <file.mp4> [--frames N] [--width W] [--height H]
// Parses the ISO-BMFF boxes itself (64-bit sizes and size 0 handled, never
// reads past the file), prints what it finds and PASS/FAIL lines. Exit code 1
// on any FAIL.
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a));
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? Number(args[i + 1]) : null;
};
if (!file) {
  console.error("usage: node scripts/inspect-mp4.mjs <file.mp4> [--frames N] [--width W] [--height H]");
  process.exit(2);
}
const want = { frames: opt("--frames"), width: opt("--width"), height: opt("--height") };
const buf = readFileSync(file);
const N = buf.length;

let failed = 0;
const say = (s = "") => console.log(s);
function check(name, ok, detail = "") {
  if (!ok) failed += 1;
  say(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}

// ---- bounds-checked readers (a read that would pass the end returns null) ----
const u8 = (o) => (o >= 0 && o + 1 <= N ? buf[o] : null);
const u16 = (o) => (o >= 0 && o + 2 <= N ? buf.readUInt16BE(o) : null);
const u32 = (o) => (o >= 0 && o + 4 <= N ? buf.readUInt32BE(o) : null);
const u64 = (o) => (o >= 0 && o + 8 <= N ? Number(buf.readBigUInt64BE(o)) : null);
const str4 = (o) => (o >= 0 && o + 4 <= N ? buf.toString("latin1", o, o + 4) : null);
const hex2 = (n) => n.toString(16).padStart(2, "0");

// Boxes inside [start, end): { type, start, end, hdr, size, problem? }.
function boxes(start, end) {
  const out = [];
  let o = start;
  while (o + 8 <= end) {
    let size = u32(o);
    const type = str4(o + 4);
    let hdr = 8;
    if (size === null || type === null) break;
    if (size === 1) {
      const big = u64(o + 8);
      if (big === null) break;
      size = big;
      hdr = 16;
    } else if (size === 0) {
      size = end - o; // to the end of the enclosing range
    }
    const problem = size < hdr || o + size > end ? "size runs outside its parent" : null;
    const boxEnd = problem ? end : o + size;
    out.push({ type, start: o, end: boxEnd, hdr, size, problem });
    if (boxEnd <= o) break;
    o = boxEnd;
  }
  return out;
}
const kids = (b) => boxes(b.start + b.hdr, b.end);
const find = (list, type) => list.find((b) => b.type === type);
const findAll = (list, type) => list.filter((b) => b.type === type);
const body = (b) => b.start + b.hdr; // first byte after the box header

say(`file: ${file}  (${N} bytes)`);
say();
say("Top-level boxes (order, offset, size):");
const top = boxes(0, N);
for (const b of top) say(`  ${b.type.padEnd(5)} offset ${String(b.start).padStart(9)}  size ${String(b.size).padStart(9)}${b.problem ? "  !! " + b.problem : ""}`);

// ---- ftyp ----
const ftyp = find(top, "ftyp");
if (ftyp) {
  const b = body(ftyp);
  const brands = [];
  for (let o = b + 8; o + 4 <= ftyp.end; o += 4) brands.push(str4(o));
  say();
  say(`ftyp: major "${str4(b)}", minor ${u32(b + 4)}, compatible [${brands.join(", ")}]`);
}

// ---- moov ----
const moov = find(top, "moov");
const mdat = find(top, "mdat");
const moovKids = moov ? kids(moov) : [];

let mvhd = null;
{
  const b = find(moovKids, "mvhd");
  if (b) {
    const v = u8(body(b));
    const o = body(b) + 4;
    mvhd = v === 1 ? { timescale: u32(o + 16), duration: u64(o + 20) } : { timescale: u32(o + 8), duration: u32(o + 12) };
    say();
    say(`mvhd: timescale ${mvhd.timescale}, duration ${mvhd.duration} = ${(mvhd.duration / mvhd.timescale).toFixed(4)} s`);
  }
}

// video track
let V = null;
for (const trak of findAll(moovKids, "trak")) {
  const tk = kids(trak);
  const mdia = find(tk, "mdia");
  if (!mdia) continue;
  const md = kids(mdia);
  const hdlr = find(md, "hdlr");
  const handler = hdlr ? str4(body(hdlr) + 8) : null;
  if (handler !== "vide") continue;

  const t = {};
  t.handler = handler;
  const tkhd = find(tk, "tkhd");
  if (tkhd) {
    const v = u8(body(tkhd));
    const o = body(tkhd) + 4;
    // fields after version/flags: times, track id, reserved, duration (20 bytes
    // in v0, 32 in v1), then reserved 8, layer, group, volume, reserved, matrix
    const head = v === 1 ? 32 : 20;
    const w = u32(o + head + 8 + 2 + 2 + 2 + 2 + 36);
    const h = u32(o + head + 8 + 2 + 2 + 2 + 2 + 36 + 4);
    t.tkhd = { width: w / 65536, height: h / 65536 };
  }
  const mdhd = find(md, "mdhd");
  if (mdhd) {
    const v = u8(body(mdhd));
    const o = body(mdhd) + 4;
    t.mdhd = v === 1 ? { timescale: u32(o + 16), duration: u64(o + 20) } : { timescale: u32(o + 8), duration: u32(o + 12) };
  }
  const minf = find(md, "minf");
  const stbl = minf ? find(kids(minf), "stbl") : null;
  const st = stbl ? kids(stbl) : [];
  const stsd = find(st, "stsd");
  if (stsd) {
    const entries = boxes(body(stsd) + 8, stsd.end);
    const e = entries[0];
    if (e) {
      const p = body(e);
      t.entry = { type: e.type, width: u16(p + 24), height: u16(p + 26) };
      const child = boxes(p + 78, e.end);
      const avcC = find(child, "avcC");
      if (avcC) {
        const a = body(avcC);
        const prof = u8(a + 1);
        const compat = u8(a + 2);
        const level = u8(a + 3);
        t.avcC = { profile: prof, compat, level, string: `avc1.${hex2(prof)}${hex2(compat)}${hex2(level)}` };
      }
      t.entryChildren = child.map((c) => c.type);
    }
  }
  const stts = find(st, "stts");
  if (stts) {
    const n = u32(body(stts) + 4);
    let samples = 0;
    const durs = new Map();
    for (let i = 0; i < n; i += 1) {
      const c = u32(body(stts) + 8 + i * 8);
      const d = u32(body(stts) + 12 + i * 8);
      if (c === null || d === null) break;
      samples += c;
      durs.set(d, (durs.get(d) ?? 0) + c);
    }
    t.stts = { entries: n, samples, durations: durs };
  }
  const stsz = find(st, "stsz");
  if (stsz) t.stsz = { sampleSize: u32(body(stsz) + 4), count: u32(body(stsz) + 8) };
  const stss = find(st, "stss");
  if (stss) {
    const n = u32(body(stss) + 4);
    const list = [];
    for (let i = 0; i < n; i += 1) {
      const v = u32(body(stss) + 8 + i * 4);
      if (v === null) break;
      list.push(v);
    }
    t.stss = list;
  }
  t.hasCtts = Boolean(find(st, "ctts"));
  const stco = find(st, "stco");
  const co64 = find(st, "co64");
  t.chunks = [];
  if (stco) {
    const n = u32(body(stco) + 4);
    for (let i = 0; i < n; i += 1) {
      const v = u32(body(stco) + 8 + i * 4);
      if (v === null) break;
      t.chunks.push(v);
    }
    t.chunkBox = "stco";
  } else if (co64) {
    const n = u32(body(co64) + 4);
    for (let i = 0; i < n; i += 1) {
      const v = u64(body(co64) + 8 + i * 8);
      if (v === null) break;
      t.chunks.push(v);
    }
    t.chunkBox = "co64";
  }
  V = t;
  break;
}

say();
if (!V) {
  say("no video track found");
} else {
  say("Video track:");
  say(`  hdlr type: ${V.handler}`);
  if (V.tkhd) say(`  tkhd: ${V.tkhd.width} x ${V.tkhd.height}`);
  if (V.mdhd) say(`  mdhd: timescale ${V.mdhd.timescale}, duration ${V.mdhd.duration} = ${(V.mdhd.duration / V.mdhd.timescale).toFixed(4)} s`);
  if (V.entry) say(`  sample entry "${V.entry.type}": ${V.entry.width} x ${V.entry.height}  (children: ${V.entryChildren.join(", ")})`);
  if (V.avcC) say(`  avcC: profile ${V.avcC.profile}, profile-compat ${V.avcC.compat}, level ${V.avcC.level}  ->  ${V.avcC.string}`);
  if (V.stts) {
    const durs = [...V.stts.durations.entries()].map(([d, c]) => `${d} x${c}`).join(", ");
    const constant = V.stts.durations.size === 1;
    say(`  stts: ${V.stts.entries} entr${V.stts.entries === 1 ? "y" : "ies"}, ${V.stts.samples} samples, distinct durations {${durs}}, constant frame rate: ${constant ? "yes" : "NO"}`);
    if (constant && V.mdhd) say(`        frame rate = ${V.mdhd.timescale} / ${[...V.stts.durations.keys()][0]} = ${(V.mdhd.timescale / [...V.stts.durations.keys()][0]).toFixed(4)} fps`);
  }
  if (V.stsz) say(`  stsz: ${V.stsz.count} samples (fixed sample size field ${V.stsz.sampleSize})`);
  if (V.stss) say(`  stss: ${V.stss.length} sync samples, first: [${V.stss.slice(0, 8).join(", ")}]`);
  else say("  stss: absent (every sample is a sync sample, or the box is missing)");
  say(`  ctts: ${V.hasCtts ? "present" : "absent"}`);
  say(`  ${V.chunkBox ?? "chunk offsets"}: ${V.chunks.length} chunk(s), min ${V.chunks.length ? Math.min(...V.chunks) : "-"}, max ${V.chunks.length ? Math.max(...V.chunks) : "-"}`);
}

// ---- checks ----
say();
check("ftyp is the first box", top[0]?.type === "ftyp", `first=${top[0]?.type}`);
check(
  "moov comes before mdat (fast start)",
  Boolean(moov && mdat && moov.start < mdat.start),
  `moov@${moov?.start ?? "-"} mdat@${mdat?.start ?? "-"}`
);
check("no box runs outside its parent", top.every((b) => !b.problem));
if (V && V.stts && V.stsz) {
  check("stts sample count equals stsz sample count", V.stts.samples === V.stsz.count, `stts=${V.stts.samples} stsz=${V.stsz.count}`);
  const delta = [...V.stts.durations.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (V.mdhd && delta) {
    const fps = V.mdhd.timescale / delta;
    const expect = V.stsz.count / fps;
    const dur = V.mdhd.duration / V.mdhd.timescale;
    check("track duration within one frame of samples / fps", Math.abs(dur - expect) <= 1 / fps + 1e-9, `duration=${dur.toFixed(4)} samples/fps=${expect.toFixed(4)}`);
    if (mvhd) {
      const mdur = mvhd.duration / mvhd.timescale;
      check("movie duration within one frame of samples / fps", Math.abs(mdur - expect) <= 1 / fps + 1e-9, `mvhd=${mdur.toFixed(4)}`);
    }
  }
  check("all chunk offsets lie inside the file", V.chunks.length > 0 && V.chunks.every((c) => c >= 0 && c < N), `${V.chunks.length} chunk(s), file ${N} bytes`);
} else {
  check("video track with stts and stsz found", false);
}
if (V && want.frames !== null) check(`frame count equals --frames ${want.frames}`, V.stsz?.count === want.frames, `stsz=${V.stsz?.count}`);
if (V && want.width !== null) check(`width equals --width ${want.width}`, V.tkhd?.width === want.width && V.entry?.width === want.width, `tkhd=${V.tkhd?.width} entry=${V.entry?.width}`);
if (V && want.height !== null) check(`height equals --height ${want.height}`, V.tkhd?.height === want.height && V.entry?.height === want.height, `tkhd=${V.tkhd?.height} entry=${V.entry?.height}`);

say(failed === 0 ? "\nALL CHECKS PASSED" : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
