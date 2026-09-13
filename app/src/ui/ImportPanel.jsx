import { useCallback, useRef, useState } from "react";
import Icon from "./icons";
import {
  kindForFile,
  validateModelFile,
  validateHdriFile,
} from "../assets/importValidation";
import { renderGlbThumbnail, renderHdriPreviews } from "../assets/thumbnail";
import {
  registerAsset,
  findByName,
  nudgeEngineRender,
} from "../assets/runtimeRegistry";

/* ==========================================================================
   Mission 10E (Asset Import Manager) — the Import Panel.
   A sidebar section in the shell's own design language: drag zone, browse
   button, staged progress bar and inline validation messages. No browser
   popups anywhere — metadata is collected in an inline editor card and the
   finished asset is mirrored into the live registries by the additive
   runtime layer, so the Asset Library shows it on the next render.
   ========================================================================== */

const PRODUCT_CATEGORIES = ["Product", "Aircraft", "Coffee Lifestyle", "Other"];
const ENV_CATEGORIES = ["Studio", "Coffee Lifestyle", "Aviation", "Outdoor"];

const baseName = (file) => file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Imported asset";

function newId(kind) {
  return `${kind === "product" ? "imported" : "imported-env"}-${Date.now().toString(36)}-${Math.floor(Math.random() * 46656).toString(36)}`;
}

export default function ImportPanel({ collapsed }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(null); // { name, pct, stage }
  const [msgs, setMsgs] = useState([]); // [{ level, text }]
  const [pending, setPending] = useState(null); // metadata editor payload
  const fileRef = useRef(null);

  const push = useCallback((level, text) => {
    setMsgs((prev) => [...prev.slice(-4), { level, text }]);
  }, []);

  const ingest = useCallback(
    async (file) => {
      const kind = kindForFile(file);
      if (!kind) {
        push("error", `${file.name}: unsupported format (.glb .gltf .hdr .exr only)`);
        return;
      }
      setBusy({ name: file.name, pct: 8, stage: "reading file" });
      let buffer;
      try {
        buffer = await file.arrayBuffer();
      } catch {
        push("error", `${file.name}: could not read file`);
        setBusy(null);
        return;
      }
      setBusy({ name: file.name, pct: 30, stage: "validating format" });
      try {
        if (kind === "product") {
          const check = await validateModelFile(file);
          check.warnings.forEach((w) => push("warn", `${file.name}: ${w}`));
          if (!check.ok) {
            check.errors.forEach((e) => push("error", `${file.name}: ${e}`));
            setBusy(null);
            return;
          }
          setBusy({ name: file.name, pct: 55, stage: "rendering thumbnail · framing model" });
          const { thumb, meta } = await renderGlbThumbnail(buffer);
          meta.warnings.forEach((w) => push("warn", `${file.name}: ${w}`));
          if (findByName("product", baseName(file))) {
            push("warn", `an asset named “${baseName(file)}” already exists`);
          }
          setBusy(null);
          setPending({ kind, file, thumb, meta, name: baseName(file), category: PRODUCT_CATEGORIES[0], notes: "" });
        } else {
          setBusy({ name: file.name, pct: 55, stage: "decoding panorama · rendering previews" });
          const ext = file.name.toLowerCase().endsWith(".exr") ? "exr" : "hdr";
          let previews;
          try {
            previews = await renderHdriPreviews(buffer, ext);
          } catch {
            push("error", `${file.name}: could not decode as ${ext.toUpperCase()}`);
            setBusy(null);
            return;
          }
          const check = await validateHdriFile(file, { width: previews.width, height: previews.height });
          check.warnings.forEach((w) => push("warn", `${file.name}: ${w}`));
          if (!check.ok) {
            check.errors.forEach((e) => push("error", `${file.name}: ${e}`));
            setBusy(null);
            return;
          }
          if (findByName("environment", baseName(file))) {
            push("warn", `an environment named “${baseName(file)}” already exists`);
          }
          setBusy(null);
          setPending({
            kind,
            file: previews.backdrop,
            thumb: previews.thumb,
            thumbWide: previews.thumbWide,
            meta: { ratio: previews.ratio, equirect: `${previews.width}×${previews.height}` },
            name: baseName(file),
            category: ENV_CATEGORIES[0],
            notes: "",
          });
        }
      } catch (err) {
        push("error", `${file.name}: ${String(err && err.message ? err.message : err).slice(0, 120)}`);
        setBusy(null);
      }
    },
    [push]
  );

  const handleFiles = useCallback(
    (list) => {
      const files = Array.from(list || []);
      files.forEach((f) => ingest(f));
    },
    [ingest]
  );

  const save = useCallback(async () => {
    if (!pending) return;
    const record = {
      id: newId(pending.kind),
      kind: pending.kind,
      name: pending.name.trim() || baseName(pending.file),
      category: pending.category,
      notes: pending.notes,
      createdAt: Date.now(),
      file: pending.file,
      thumb: pending.thumb,
      thumbWide: pending.thumbWide || null,
      meta: pending.meta || {},
    };
    await registerAsset(record);
    nudgeEngineRender();
    push("success", `${record.name} imported — now in the ${pending.kind === "product" ? "Product Library" : "Environment Library"}`);
    setPending(null);
  }, [pending, push]);

  if (collapsed) return null;

  return (
    <div className="sos-import" data-testid="import-panel">
      <div
        className="sos-drop"
        data-over={over || undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handleFiles(e.dataTransfer?.files);
        }}
      >
        <Icon name="upload" size={16} stroke={1.6} />
        <span className="sos-drop-txt">Drop GLB / HDRI here</span>
        <button
          type="button"
          className="sos-btn"
          data-testid="import-browse"
          onClick={() => fileRef.current?.click()}
        >
          Browse files
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".glb,.gltf,.hdr,.exr"
          multiple
          hidden
          data-testid="import-file-input"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {busy ? (
        <div className="sos-progress" role="progressbar" aria-valuenow={busy.pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${busy.pct}%` }} />
          <em>{busy.stage} — {busy.name}</em>
        </div>
      ) : null}

      {msgs.length ? (
        <ul className="sos-msgs" data-testid="import-messages">
          {msgs.map((m, i) => (
            <li key={i} data-level={m.level}>{m.text}</li>
          ))}
        </ul>
      ) : null}

      {pending ? (
        <div className="sos-meta-edit" data-testid="import-metadata">
          <span className="sos-eyebrow">Asset metadata</span>
          <label className="sos-field">
            <em>Name</em>
            <input
              value={pending.name}
              data-testid="import-name"
              onChange={(e) => setPending((p) => ({ ...p, name: e.target.value }))}
            />
          </label>
          <label className="sos-field">
            <em>Category</em>
            <select
              value={pending.category}
              data-testid="import-category"
              onChange={(e) => setPending((p) => ({ ...p, category: e.target.value }))}
            >
              {(pending.kind === "product" ? PRODUCT_CATEGORIES : ENV_CATEGORIES).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="sos-field">
            <em>Notes</em>
            <input
              value={pending.notes}
              placeholder="optional"
              onChange={(e) => setPending((p) => ({ ...p, notes: e.target.value }))}
            />
          </label>
          {pending.meta && pending.meta.bbox ? (
            <span className="sos-row-sub">
              bbox {pending.meta.bbox.size.join(" × ")} · cam {pending.meta.cameraDistance} · {pending.meta.meshes} meshes
            </span>
          ) : null}
          {pending.meta && pending.meta.ratio ? (
            <span className="sos-row-sub">panorama {pending.meta.equirect} · ratio {pending.meta.ratio}:1</span>
          ) : null}
          <div className="sos-meta-actions">
            <button type="button" className="sos-btn sos-btn-gold" data-testid="import-save" onClick={save}>
              Save to library
            </button>
            <button type="button" className="sos-btn" onClick={() => setPending(null)}>
              Discard
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
