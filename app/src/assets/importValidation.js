/* Mission 10E (Asset Import Manager) — format validation before any parse.
   Cheap structural checks first (extension, size, magic bytes / JSON shape,
   panorama ratio) so unsupported or corrupt files fail with a clear inline
   message instead of a loader exception. Warnings never block an import. */

export const MAX_GLB_BYTES = 100 * 1024 * 1024; // recommended ceiling
export const HDRI_SIZE_WARN_BYTES = 50 * 1024 * 1024;

const GLB_MAGIC = 0x46546c67; // "glTF"

export function kindForFile(file) {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".glb") || name.endsWith(".gltf")) return "product";
  if (name.endsWith(".hdr") || name.endsWith(".exr")) return "environment";
  return null;
}

export async function validateModelFile(file) {
  const errors = [];
  const warnings = [];
  const kind = kindForFile(file);
  if (kind !== "product") {
    return { ok: false, errors: ["unsupported format — use .glb or .gltf"], warnings };
  }
  if (file.size > MAX_GLB_BYTES) {
    errors.push(`file is ${(file.size / 1048576).toFixed(1)} MB — over the 100 MB recommended limit`);
  }
  if (file.size === 0) errors.push("file is empty");
  if (!errors.length && file.name.toLowerCase().endsWith(".glb")) {
    const head = new DataView(await file.slice(0, 12).arrayBuffer());
    if (head.byteLength < 12 || head.getUint32(0, true) !== GLB_MAGIC) {
      errors.push("not a binary glTF container (bad magic bytes)");
    } else {
      const declared = head.getUint32(8, true);
      if (declared !== file.size) {
        warnings.push(`container length (${declared}) differs from file size (${file.size})`);
      }
    }
  }
  if (!errors.length && file.name.toLowerCase().endsWith(".gltf")) {
    try {
      const json = JSON.parse(await file.text());
      if (!json || json.asset === undefined || !json.scenes) {
        errors.push("glTF JSON lacks asset/scenes description");
      }
    } catch {
      errors.push("glTF JSON could not be parsed");
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}

export async function validateHdriFile(file, parsed) {
  const errors = [];
  const warnings = [];
  const kind = kindForFile(file);
  if (kind !== "environment") {
    return { ok: false, errors: ["unsupported format — use .hdr or .exr"], warnings };
  }
  if (file.size > HDRI_SIZE_WARN_BYTES) {
    warnings.push(`large HDRI (${(file.size / 1048576).toFixed(1)} MB) — previews may take a moment`);
  }
  if (file.size === 0) errors.push("file is empty");
  if (!errors.length && parsed) {
    const ratio = parsed.width / Math.max(1, parsed.height);
    if (ratio < 1.85 || ratio > 2.15) {
      errors.push(`not an equirectangular panorama (ratio ${ratio.toFixed(2)}:1, expected 2:1)`);
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}
