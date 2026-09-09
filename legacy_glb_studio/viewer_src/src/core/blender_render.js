/* =========================================================================
 *  BLENDER PYTHON RENDER PIPELINE  (core — no UI, no version knowledge)
 *  -------------------------------------------------------------------------
 *  One-click "Render in Blender": snapshot the CURRENT live scene (products,
 *  part transforms, materials, visibility), the CURRENT camera framing, the
 *  CURRENT lighting preset + stage look — and package it all as:
 *
 *     instagram_render.py      self-contained bpy pipeline (Cycles, 1080x1920
 *                              vertical, PNG or MP4). Embeds the GLB.
 *     scene.glb                exported geometry/materials, for inspection
 *     render_windows.bat  +  render_mac_linux.sh   one-click launchers
 *     README_RENDER.txt        instructions
 *
 *  The studio (WebGL real-time editor) is untouched and never slowed down —
 *  everything here runs lazily only when the user clicks Render in Blender.
 * ========================================================================= */
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

/* ------------------------------------------------------------- colour math */
function hexToRgb(hex) {
  const h = parseInt(String(hex).replace('#', ''), 16);
  return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
}
const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export function linTriple(hex) { return hexToRgb(hex).map(s2l); }
function mixC(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function kelvin(k) {
  const t = Math.min(40000, Math.max(1000, k || 5600)) / 100;
  let r, g, b;
  if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04; }
  else { r = 329.7 * Math.pow(t - 60, -0.1332); g = 288.12 * Math.pow(t - 60, -0.0755); b = 255; }
  return [r / 255, g / 255, b / 255];
}

/* ------------------------------------------- export the live meshes to GLB
 *  Snapshot every VISIBLE mesh with its current world transform (part edits
 *  survive) and current material as one flat GLB in live-editor world units.
 *  Hidden parts are dropped; animation clips are ignored (video drives the
 *  camera in Cycles). */
export function snapshotGroup(S) {
  const root = new THREE.Group();
  root.name = 'InstagramExport';
  const cloneMat = (m) => (Array.isArray(m) ? m.map((x) => (x ? x.clone() : x)) : m ? m.clone() : m);
  S.state.models.forEach((rec) => {
    if (!rec.visible) return;
    rec.group.updateMatrixWorld(true);
    const walk = (obj) => {
      if (obj.isMesh && obj.visible) {
        const mm = new THREE.Mesh(obj.geometry, cloneMat(obj.material));
        mm.matrix.copy(obj.matrixWorld);
        mm.matrix.decompose(mm.position, mm.quaternion, mm.scale);
        mm.name = (rec.name ? rec.name + '/' : '') + (obj.name || 'part');
        root.add(mm);
      }
      obj.children.forEach(walk);
    };
    walk(rec.group);
  });
  return root;
}
export function exportGLB(group) {
  return new Promise((resolve, reject) => {
    try {
      const ex = new GLTFExporter();
      ex.parse(group, (res) => {
        if (res instanceof ArrayBuffer) resolve(new Uint8Array(res));
        else resolve(new TextEncoder().encode(JSON.stringify(res)));
      }, (err) => reject(err), { binary: true, embedImages: true });
    } catch (e) { reject(e); }
  });
}

/* --------------------------------------------------- environment panels */
function envPanels(kind) {
  const P = [];
  const add = (w, h, x, y, z, hex, intensity) => P.push({ w, h, pos: [x, y, z], color: linTriple(hex), intensity });
  if (kind === 'softbox' || kind === 'studio') {
    add(3.4, 2.2, -6.5, 2.0, 0, 0xffffff, 2.2);
    add(3.4, 2.2, 6.5, 2.0, 0, 0xfff4e0, 2.2);
    add(9, 1.6, 0, 7.2, 0, 0xffffff, 2.6);
    add(1.8, 1.8, 0, 2.4, -7.4, 0, 0xffeedd, 1.3);
  } else if (kind === 'coffeeshop') {
    add(3.2, 3.2, 8.2, 2.6, 0, 0xffe9c4, 3.2);
    add(0.5, 3.4, 9.2, 2.6, 0, 0xffd9a0, 1.0);
    add(0.5, 3.4, 7.2, 2.6, 0, 0xffd9a0, 1.0);
    add(1.0, 1.0, 0, 8.4, 0, 0xffc27a, 4);
    add(1.0, 1.0, 2.6, 8.4, 1.8, 0, 0xffc27a, 3);
    add(1.0, 1.0, -2.4, 8.4, -2, 0, 0xffc27a, 3);
    add(4, 1.2, -8, 1.4, 0, 0x6b4a2b, 1.1);
  } else if (kind === 'morning') {
    add(2.6, 2.6, -7, 5, 0, 0xfff2cc, 5.2);
    add(9, 1.4, 0, 10, 0, 0xeaf4ff, 2.6);
    add(12, 2.2, 0, 0.4, -9, 0, 0xdff0ff, 1.4);
    add(5, 1.6, 7, 1.2, 3, 0x8fc2a0, 1.0);
  } else if (kind === 'nightcafe') {
    add(0.14, 1.6, -6.8, 3.1, 2.4, 0xff9a5a, 6);
    add(0.14, 0.5, -6.9, 1.6, 0.4, 0xffd0a0, 3);
    add(1.8, 1.0, 6.8, 2.2, 0, 0x7aa2ff, 3.2);
    add(1.8, 1.0, 6.8, 0.9, 0, 0x9db8ff, 1.6);
    for (let i = -2; i <= 2; i++) {
      add(0.45, 0.45, i * 2.2, 7.6, 0, 0xffc27a, 3.4);
      add(0.45, 0.45, i * 2.2 - 1.1, 7.6, 2.2, 0, 0x9db8ff, 1.4);
    }
  }
  return P;
}

/* -------------------------------------------------------------- light rig */
function buildLights(S, presetKey, sunScale) {
  const p = S.LIGHT_PRESETS[presetKey] || S.LIGHT_PRESETS.classic;
  const T = kelvin(p.temp || 5600);
  const lhex = (rgb) => linTriple((Math.round(rgb[0] * 255) << 16) | (Math.round(rgb[1] * 255) << 8) | Math.round(rgb[2] * 255));
  const key = mixC(hexToRgb(p.keyC), T, 0.5);
  const fill = mixC(hexToRgb(p.fillC), T, 0.4);
  const rim = mixC(hexToRgb(p.rimC), T, 0.3);
  const s = sunScale || 1;
  return [
    { type: 'SUN', name: 'Key', pos: [6, 9, 6], color: lhex(key), energy: 2.6 * p.key * s },
    { type: 'SUN', name: 'Fill', pos: [-7, 3, -5], color: lhex(fill), energy: 1.8 * p.fill * s },
    { type: 'SUN', name: 'Rim', pos: [0, 1.5, -8], color: lhex(rim), energy: 2.4 * p.rim * s },
    { type: 'SUN', name: 'Top', pos: [0, 12, 0.2], color: lhex(T), energy: 2.0 * p.top * s },
  ];
}

/* -------------------------------------------------------- assemble config */
export function buildRenderConfig(S, opts) {
  const presetKey = opts.lighting || S.lightName() || 'softbox';
  const preset = S.LIGHT_PRESETS[presetKey] || S.LIGHT_PRESETS.classic;
  const B = S.bounds();
  const R = Math.max(B.radius, 0.001);
  const relPos = S.camera.position.clone().sub(B.center).divideScalar(R);
  const relTgt = S.controls.target.clone().sub(B.center).divideScalar(R);
  return {
    out: opts.out,
    glb_b64: opts.glbB64,
    size: [1080, 1920],
    samples: opts.samples || 128,
    fps: 30,
    denoise: opts.denoise !== false,
    motion: opts.motion || 'still',
    duration: opts.duration || 6,
    sunScale: opts.sunScale ?? 1,
    emissiveScale: opts.emissiveScale ?? 1,
    floorGloss: !!S.gridState.floorGloss,
    camera: {
      fov: S.camera.fov || 42,
      relPos: relPos.toArray(),
      relTgt: relTgt.toArray(),
      az0: Math.atan2(relPos.x, relPos.z),
    },
    bounds: { cx: B.center.x, cy: B.center.y, cz: B.center.z, r: R },
    bg: linTriple(preset.bg),
    floorColor: linTriple(S.gridState.floorGloss ? 0x0d0e12 : 0x101318),
    lights: buildLights(S, presetKey, opts.sunScale ?? 1),
    panels: envPanels(preset.env),
    env: preset.env,
    presetKey,
  };
}

/* =========================================================================
 *  GENERATED BLENDER PYTHON — self-contained Cycles pipeline.
 *  IMPORTANT: keep this code free of backslashes and of the character pair
 *  "${" so it can live inside a JS template literal untouched.
 * ========================================================================= */
function pythonPipeline() {
  return String.raw`# -*- coding: utf-8 -*-
# =========================================================================
#  instagram_render.py  — generated by GLB Commercial Studio
#  Blender Python (Instagram Quality) · Cycles · 1080 x 1920 vertical
# -------------------------------------------------------------------------
#  Run with Blender 3.4+:
#     blender -b -P instagram_render.py                      (headless)
#     blender -b -P instagram_render.py -- --samples 256     (options)
#  Or open Blender -> Scripting -> open this file -> Run Script.
#  Optional flags after "--":  --samples N --width W --height H
#                              --frames N --out PATH --no-denoise
#  The .glb is embedded, so this single file renders by itself. A copy
#  (scene.glb) ships next to it for inspection.
# =========================================================================
import bpy, json, os, sys, math, base64, tempfile
from mathutils import Vector

CONFIG = json.loads(r'''__JSON__''')

OUT       = CONFIG['out']
SIZE      = list(CONFIG['size'])
SAMPLES   = int(CONFIG['samples'])
FPS       = int(CONFIG['fps'])
MOTION    = CONFIG['motion']
DUR       = float(CONFIG['duration'])
DENOISE   = CONFIG['denoise']
SUN_SCALE = float(CONFIG.get('sunScale', 1.0))
EMIT_S    = float(CONFIG.get('emissiveScale', 1.0))
BG        = CONFIG['bg']
FLOOR_C   = CONFIG['floorColor']
FLOOR_GL  = bool(CONFIG['floorGloss'])
B         = CONFIG['bounds']

def conv(v):
    return Vector((v[0], -v[2], v[1]))

def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    try:
        bpy.ops.outliner.orphans_purge()
    except Exception:
        pass

def import_glb(b64):
    path = os.path.join(tempfile.gettempdir(), 'instagram_scene.glb')
    with open(path, 'wb') as fh:
        fh.write(base64.b64decode(b64))
    bpy.ops.import_scene.gltf(filepath=path)
    try:
        os.remove(path)
    except Exception:
        pass

def scene_bounds():
    objs = [o for o in bpy.data.objects if o.type == 'MESH']
    if not objs:
        return None
    inf = 1e18
    mn = Vector((inf, inf, inf))
    mx = Vector((-inf, -inf, -inf))
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            for i in range(3):
                if w[i] < mn[i]: mn[i] = w[i]
                if w[i] > mx[i]: mx[i] = w[i]
    return (mn + mx) * 0.5, (mx - mn).length * 0.5, mn[2]

def simple_mat(name, base, rough, metal):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf is not None:
        bsdf.inputs['Base Color'].default_value = (base[0], base[1], base[2], 1.0)
        bsdf.inputs['Roughness'].default_value = rough
        bsdf.inputs['Metallic'].default_value = metal
    return mat

def emissive_mat(name, color, strength):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    for n in list(tree.nodes):
        if n.type != 'OUTPUT_MATERIAL':
            tree.nodes.remove(n)
    out = next(n for n in tree.nodes if n.type == 'OUTPUT_MATERIAL')
    em = tree.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (color[0], color[1], color[2], 1.0)
    em.inputs['Strength'].default_value = strength
    tree.links.new(em.outputs[0], out.inputs['Surface'])
    return mat

def setup_world():
    world = bpy.data.worlds.new('InstagramWorld')
    bpy.context.scene.world = world
    world.use_nodes = True
    tree = world.node_tree
    for n in list(tree.nodes):
        if n.type != 'OUTPUT_WORLD':
            tree.nodes.remove(n)
    out = next(n for n in tree.nodes if n.type == 'OUTPUT_WORLD')
    bg = tree.nodes.new('ShaderNodeBackground')
    bg.inputs['Color'].default_value = (BG[0], BG[1], BG[2], 1.0)
    bg.inputs['Strength'].default_value = 1.0
    tree.links.new(bg.outputs[0], out.inputs['Surface'])

def add_floor(minz, radius):
    side = min(max(radius * 10.0, 6.0), 140.0)
    bpy.ops.mesh.primitive_plane_add(size=side, location=(0.0, 0.0, minz - 0.002))
    obj = bpy.context.object
    rough = 0.16 if FLOOR_GL else 0.60
    metal = 0.55 if FLOOR_GL else 0.05
    obj.data.materials.append(simple_mat('StageFloor', FLOOR_C, rough, metal))
    return obj

def aim_at(obj, target):
    d = target - obj.location
    if d.length > 1e-6:
        obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

def add_sun(name, web_pos, color, energy, target):
    lam = bpy.data.lights.new(name, 'SUN')
    lam.color = (color[0], color[1], color[2])
    lam.energy = max(energy, 0.0)
    obj = bpy.data.objects.new(name, lam)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = conv(web_pos)
    aim_at(obj, target)
    return obj

def add_panel(panel, target):
    w = panel['w']; h = panel['h']; pos = panel['pos']
    strength = float(panel['intensity']) * EMIT_S
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=conv(pos))
    obj = bpy.context.object
    obj.scale = (w, 1.0, h)
    obj.data.materials.append(emissive_mat('EnvPanel', panel['color'], strength))
    d = target - obj.location
    if d.length > 1e-6:
        obj.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return obj

def setup_scene(center, minz, radius):
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.samples = SAMPLES
    try:
        scn.cycles.use_denoising = DENOISE
    except Exception:
        pass
    scn.render.resolution_x = int(SIZE[0])
    scn.render.resolution_y = int(SIZE[1])
    scn.render.resolution_percentage = 100
    scn.render.fps = FPS
    try:
        scn.view_settings.view_transform = 'Filmic'
        scn.view_settings.look = 'None'
        scn.view_settings.exposure = 0.0
    except Exception:
        pass
    setup_world()
    for l in CONFIG.get('lights', []):
        add_sun(l['name'], l['pos'], l['color'], l['energy'], center)
    for p in CONFIG.get('panels', []):
        add_panel(p, center)
    add_floor(minz, radius)

def add_camera(center, relpos, reltgt, fov):
    cam_data = bpy.data.cameras.new('InstagramCamera')
    cam = bpy.data.objects.new('InstagramCamera', cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam_data.lens = 50.0
    cam_data.sensor_fit = 'VERTICAL'
    cam_data.angle = math.radians(float(fov))
    pos = center + conv([relpos[0] * B['r'], relpos[1] * B['r'], relpos[2] * B['r']])
    tgt = center + conv([reltgt[0] * B['r'], reltgt[1] * B['r'], reltgt[2] * B['r']])
    cam.location = pos
    d = tgt - pos
    if d.length > 1e-6:
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam
    return cam, tgt

def motion_web(name, u, t, az0, dist, elev):
    # returns a position in web (y-up) coordinates, relative to the product centre
    C = Vector((B['cx'], B['cy'], B['cz']))
    R = B['r']
    if name == 'orbit' or name == 'orbit360':
        a = az0 + u * math.pi * 2.0
        return C + Vector((math.sin(a) * dist, elev * dist, math.cos(a) * dist))
    if name == 'dolly':
        r0 = max(dist, R * 2.6); r1 = R * 1.05
        ease = u * u * (3.0 - 2.0 * u)
        dd = r0 + (r1 - r0) * ease
        h0 = max(R * 0.9, 0.4); h1 = R * 0.42
        hh = h0 + (h1 - h0) * ease
        return C + Vector((math.sin(az0) * dd, hh, math.cos(az0) * dd))
    if name == 'crane':
        a = az0 + u * math.pi * 2.0
        rr = max(dist * 0.82, R * 0.5)
        h = R * (0.35 + 1.7 * (0.5 + 0.5 * math.sin(u * math.pi * 2.0)))
        return C + Vector((math.sin(a) * rr, h, math.cos(a) * rr))
    if name == 'handheld':
        a = az0 + u * math.pi * 2.0
        jx = math.sin(t * 1.7) * R * 0.05 + math.sin(t * 3.3 + 1.2) * R * 0.03
        jy = math.cos(t * 1.9) * R * 0.04 + math.sin(t * 4.1) * R * 0.02
        return C + Vector((math.sin(a) * dist + jx, elev * dist + jy, math.cos(a) * dist))
    return C + Vector((math.sin(az0) * dist, elev * dist, math.cos(az0) * dist))

def animate_camera(cam, tgt, center, az0, dist, elev):
    frames = int(DUR * FPS)
    if frames < 2:
        frames = 2
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = frames
    for f in range(1, frames + 1):
        u = (f - 1) / (frames - 1)
        t = u * DUR
        pweb = motion_web(MOTION, u, t, az0, dist, elev)
        pos = center + conv([pweb[0] - B['cx'], pweb[1] - B['cy'], pweb[2] - B['cz']])
        cam.location = pos
        d = tgt - pos
        if d.length > 1e-6:
            cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        cam.keyframe_insert(data_path='location', frame=f)
        cam.keyframe_insert(data_path='rotation_euler', frame=f)

def main():
    clear_scene()
    import_glb(CONFIG['glb_b64'])
    bd = scene_bounds()
    if bd is None:
        print('[blender-render] ERROR: no mesh geometry found in the export.')
        return 1
    center, radius, minz = bd
    setup_scene(center, minz, radius)
    cam, tgt = add_camera(center, CONFIG['camera']['relPos'],
                          CONFIG['camera']['relTgt'], CONFIG['camera']['fov'])
    relp = CONFIG['camera']['relPos']
    dist = math.sqrt(relp[0] * relp[0] + relp[1] * relp[1] + relp[2] * relp[2]) * B['r']
    elev = relp[1] / math.sqrt(max(relp[0] * relp[0] + relp[2] * relp[2], 1e-9)) if dist > 1e-9 else 0.2
    if MOTION != 'still':
        animate_camera(cam, tgt, center, CONFIG['camera']['az0'], dist, elev)

    base = os.path.dirname(os.path.abspath(__file__))
    out = OUT if os.path.isabs(OUT) else os.path.join(base, OUT)
    if str(out).lower().endswith('.mp4'):
        if MOTION == 'still':
            bpy.context.scene.frame_start = 1
            bpy.context.scene.frame_end = 1
        bpy.context.scene.render.image_settings.file_format = 'FFMPEG'
        bpy.context.scene.render.ffmpeg.format = 'MPEG4'
        bpy.context.scene.render.ffmpeg.codec = 'H264'
        bpy.context.scene.render.ffmpeg.audio_codec = 'NONE'
        bpy.context.scene.render.filepath = out
        bpy.ops.render.render(animation=True)
    else:
        bpy.context.scene.render.image_settings.file_format = 'PNG'
        bpy.context.scene.render.filepath = out
        bpy.ops.render.render(write_still=True)
    print('[blender-render] DONE -> ' + out)
    return 0

if '--' in sys.argv:
    a = sys.argv[sys.argv.index('--') + 1:]
    i = 0
    while i < len(a):
        k = a[i]
        if k == '--samples' and i + 1 < len(a): SAMPLES = int(a[i + 1]); i += 2
        elif k == '--width' and i + 1 < len(a): SIZE[0] = int(a[i + 1]); i += 2
        elif k == '--height' and i + 1 < len(a): SIZE[1] = int(a[i + 1]); i += 2
        elif k == '--frames' and i + 1 < len(a): DUR = float(int(a[i + 1])) / FPS; i += 2
        elif k == '--out' and i + 1 < len(a): OUT = a[i + 1]; i += 2
        elif k == '--no-denoise': DENOISE = False; i += 1
        else: i += 1

rc = main()
sys.exit(rc if rc is not None else 0)
`;
}

/* ---------------------------------------------------------------- mini zip */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(u8) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
const te = new TextEncoder();
const enc = (s) => te.encode(s);
const p16 = (arr, v) => arr.push(v & 255, (v >>> 8) & 255);
const p32 = (arr, v) => arr.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255);
const u8c = (arr) => new Uint8Array(arr);
export function makeZip(entries) {
  const locals = [];
  const central = [];
  let offset = 0;
  entries.forEach((e) => {
    const name = enc(e.name);
    const data = e.data;
    const crc = crc32(data);
    const ln = name.length;
    // --- local file header (30 bytes) ---
    const lh = [];
    p32(lh, 0x04034b50);      // signature
    p16(lh, 20);              // version needed to extract
    p16(lh, 0x0800);          // general purpose flag (UTF-8 names)
    p16(lh, 0);               // method: store
    p16(lh, 0);               // mod time
    p16(lh, 0x21);            // mod date (1980-01-01)
    p32(lh, crc);
    p32(lh, data.length);     // compressed size (= size, store)
    p32(lh, data.length);     // uncompressed size
    p16(lh, ln);
    p16(lh, 0);               // extra field length
    locals.push(u8c(lh), name, data);
    // --- central directory header (46 bytes) ---
    const cd = [];
    p32(cd, 0x02014b50);      // signature
    p16(cd, 20);              // version made by
    p16(cd, 20);              // version needed
    p16(cd, 0x0800);          // flags
    p16(cd, 0);               // method
    p16(cd, 0);               // mod time
    p16(cd, 0x21);            // mod date
    p32(cd, crc);
    p32(cd, data.length);
    p32(cd, data.length);
    p16(cd, ln);
    p16(cd, 0);               // extra len
    p16(cd, 0);               // comment len
    p16(cd, 0);               // disk number start
    p16(cd, 0);               // internal attributes
    p32(cd, 0);               // external attributes
    p32(cd, offset);          // local header offset
    central.push(u8c(cd), name);
    offset += 30 + ln + data.length;
  });
  const cdStart = offset;
  const cdBytes = [];
  central.forEach((x) => cdBytes.push(x));
  const cdSize = central.reduce((s, x) => s + x.length, 0);
  // --- end of central directory (22 bytes) ---
  const eocd = [];
  p32(eocd, 0x06054b50);
  p16(eocd, 0);               // disk number
  p16(eocd, 0);               // cd start disk
  p16(eocd, entries.length);  // entries on this disk
  p16(eocd, entries.length);  // total entries
  p32(eocd, cdSize);
  p32(eocd, cdStart);
  p16(eocd, 0);               // comment len
  const total = new Uint8Array(cdStart + cdSize + 22);
  let p = 0;
  locals.forEach((x) => { total.set(x, p); p += x.length; });
  cdBytes.forEach((x) => { total.set(x, p); p += x.length; });
  total.set(u8c(eocd), p);
  return total;
}

/* ------------------------------------------------------------ package */
export function renderPython(cfg) {
  return pythonPipeline().replace('__JSON__', JSON.stringify(cfg));
}
export async function buildRenderPackage(S, opts) {
  const glbBytes = await exportGLB(snapshotGroup(S));
  const outName = opts.out || 'instagram_1080x1920';
  const outFile = (opts.output === 'mp4' ? outName + '.mp4' : outName + '.png');
  const cfg = buildRenderConfig(S, Object.assign({}, opts, { out: outFile, glbB64: bytesToB64(glbBytes) }));
  const py = renderPython(cfg);
  const files = [
    { name: 'instagram_render.py', data: enc(py) },
    { name: 'scene.glb', data: glbBytes },
    { name: 'README_RENDER.txt', data: enc(renderReadme(outFile, cfg)) },
    { name: 'render_windows.bat', data: enc(batScript()) },
    { name: 'render_mac_linux.sh', data: enc(shScript()) },
  ];
  return { name: 'blender_instagram_render.zip', bytes: makeZip(files), cfg };
}

export function bytesToB64(u8) {
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) bin += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
  return btoa(bin);
}

function renderReadme(outFile, cfg) {
  return [
    'BLENDER PYTHON (INSTAGRAM QUALITY)  -  one-click render pack',
    '=============================================================',
    'Generated by the GLB Commercial Studio from the live scene you had',
    'open: product geometry + materials + part transforms, the current',
    'camera framing, the ' + cfg.presetKey + ' lighting rig and a 1080x1920',
    'vertical output were captured in this package.',
    '',
    'FILES',
    '  instagram_render.py   the whole render: rebuilds the scene in',
    '                        Blender (Cycles) and renders it. The .glb is',
    '                        embedded, so this single file is all you need.',
    '  scene.glb             the exported product scene, for inspection.',
    '  render_windows.bat    one-click launcher (Windows).',
    '  render_mac_linux.sh   one-click launcher (macOS / Linux).',
    '',
    'HOW TO RENDER  (pick one)',
    '  1) One click',
    '       Windows:  double-click render_windows.bat',
    '       macOS/Linux:  chmod +x render_mac_linux.sh  then run it',
    '     (the launcher finds Blender automatically; set the BLENDER env',
    '      var or edit the file if Blender lives somewhere unusual)',
    '',
    '  2) Command line',
    '       blender -b -P instagram_render.py',
    '       blender -b -P instagram_render.py -- --samples 256',
    '       blender -b -P instagram_render.py -- --width 1080 --height 1920',
    '       blender -b -P instagram_render.py -- --frames 180',
    '       blender -b -P instagram_render.py -- --out my_reel.png',
    '',
    '  3) Inside the Blender UI: open instagram_render.py in the Scripting',
    '     workspace and press Run Script; the scene appears on your screen.',
    '',
    'OUTPUT',
    '  ' + outFile + '  (' + (outFile.endsWith('.mp4') ? 'MP4 H.264 reel, 30 fps' : 'PNG at 1080x1920') + ')',
    '  rendered with Cycles and saved next to this file.',
    '',
    'TIPS',
    '  - Quality: 128 samples is the default; 256+ for glass/chrome close-ups.',
    '  - Lighting: open the CONFIG at the top of the .py to adjust sunScale',
    '    (overall light power) and emissiveScale (softbox power).',
    '  - The Blender scene is fully editable once loaded: move the camera,',
    '    change materials, then press F12 to re-render.',
    '  - This is a snapshot of the studio: tweak the web studio and click',
    '    "Render in Blender" again to regenerate everything.',
    '',
  ].join('\n');
}

function batScript() {
  return '@echo off\r\n'
    + 'REM Blender Python (Instagram Quality) - one-click render (Windows)\r\n'
    + 'setlocal\r\n'
    + 'set "BLENDER="\r\n'
    + 'if defined BLENDER goto :found\r\n'
    + 'where blender >nul 2>nul && (set "BLENDER=blender" & goto :found)\r\n'
    + 'for %%P in ("%ProgramFiles%\\Blender Foundation\\Blender 4.5\\blender.exe" "%ProgramFiles%\\Blender Foundation\\Blender 4.4\\blender.exe" "%ProgramFiles%\\Blender Foundation\\Blender 4.3\\blender.exe" "%ProgramFiles%\\Blender Foundation\\Blender 4.2\\blender.exe" "%ProgramFiles%\\Blender Foundation\\Blender 4.1\\blender.exe" "%ProgramFiles%\\Blender Foundation\\Blender 4.0\\blender.exe" "%ProgramFiles%\\Blender Foundation\\Blender 3.6\\blender.exe" "%ProgramFiles%\\Blender Foundation\\Blender 3.4\\blender.exe") do (\r\n'
    + '  if exist %%P set "BLENDER=%%~P" & goto :found\r\n'
    + ')\r\n'
    + 'echo Blender was not found. Install Blender 3.4+ from blender.org, or set\r\n'
    + 'echo the BLENDER environment variable to the full path of blender.exe\r\n'
    + 'pause\r\n'
    + 'exit /b 1\r\n'
    + ':found\r\n'
    + 'echo Rendering with %BLENDER% ... first run compiles shaders, please wait.\r\n'
    + '"%BLENDER%" --background --factory-startup --python "%~dp0instagram_render.py"\r\n'
    + 'echo.\r\n'
    + 'echo Done - the output PNG/MP4 is next to this file.\r\n'
    + 'pause\r\n';
}

function shScript() {
  return '#!/usr/bin/env bash\n'
    + '# Blender Python (Instagram Quality) - one-click render (macOS / Linux)\n'
    + 'set -e\n'
    + 'cd "$(dirname "$0")"\n'
    + 'BIN="' + '${' + 'BLENDER:-}' + '"\n'
    + 'if [ -z "$BIN" ]; then\n'
    + '  if command -v blender >/dev/null 2>&1; then\n'
    + '    BIN="blender"\n'
    + '  elif [ -x "/Applications/Blender.app/Contents/MacOS/Blender" ]; then\n'
    + '    BIN="/Applications/Blender.app/Contents/MacOS/Blender"\n'
    + '  fi\n'
    + 'fi\n'
    + 'if [ -z "$BIN" ]; then\n'
    + '  echo "Blender not found. Install Blender 3.4+ from blender.org or set:"\n'
    + '  echo "  export BLENDER=/path/to/blender"\n'
    + '  exit 1\n'
    + 'fi\n'
    + 'echo "Rendering with: $BIN   (first run compiles shaders, please wait)"\n'
    + '"$BIN" --background --factory-startup --python "$(pwd)/instagram_render.py"\n'
    + 'echo "Done - the output PNG/MP4 is next to this file."\n';
}
