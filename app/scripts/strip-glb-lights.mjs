// Removes lights embedded in a GLB (KHR_lights_punctual). A light baked into a prop
// file is loaded by three.js and blows the whole scene out. Usage:
//   node scripts/strip-glb-lights.mjs path/to/file.glb
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const file = process.argv[2];
if (!file) { console.error("usage: node scripts/strip-glb-lights.mjs file.glb"); process.exit(1); }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(file);
const root = doc.getRoot();
const ext = root.listExtensionsUsed().find((e) => e.extensionName === "KHR_lights_punctual");
const lights = ext ? ext.listProperties() : [];
for (const n of root.listNodes()) n.setExtension("KHR_lights_punctual", null);
lights.forEach((l) => l.dispose());
if (ext) ext.dispose();
await io.write(file, doc);
console.log(`removed ${lights.length} light(s) from ${file}`);
