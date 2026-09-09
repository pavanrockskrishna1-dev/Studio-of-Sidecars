#!/usr/bin/env python3
"""Upgrade the 7 single-file BBQ bike HTML viewers with shared, tested additions."""
import pathlib, re, json

ROOT = pathlib.Path('/home/user/unzipped')
HELPERS = pathlib.Path('/home/user/upgrade_helpers.js').read_text(encoding='utf-8')
SHOT = "__snapshot(1, 'bbq-bike');"
RECORD = "__toggleRecord();"

def read(name): return (ROOT / name).read_text(encoding='utf-8')
def write(name, src): (ROOT / name).write_text(src, encoding='utf-8')

def inject_helpers(src):
    """Insert the shared upgrade helper script right before </body>."""
    return src.replace('</body>', '<script>\n' + HELPERS + '\n</script>\n</body>', 1)

def inject_buttons(src, buttons_html, insert_anchor):
    """Insert floating quick-buttons div right after an anchor snippet (the container that holds file controls etc)."""
    assert insert_anchor in src, f'anchor not found: {insert_anchor[:60]}'
    return src.replace(insert_anchor, insert_anchor + '\n' + buttons_html, 1)

def add_capture_button(src, label_after=None):
    """Insert capture+record quick buttons; also add minimal style. Returns src."""
    btn = ('<div id="__btnWrap" style="position:fixed;top:20px;right:20px;z-index:99990;display:flex;flex-direction:column;gap:8px;font-family:system-ui,-apple-system,\'Segoe UI\',Roboto,sans-serif;">'
           '<button id="__btnShot" onclick="__snapshot(1,\'bbq-bike\')" style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4);">📷 Photo</button>'
           '<button id="__btnHiRes" onclick="__shotHi()" style="background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4);">🖼 4K Shot</button>'
           '<button id="__btnRecord" onclick="__toggleRecord()" style="background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4);">⏺️ Record</button>'
           '<button id="__btnDemo" onclick="__demoModel()" title="Instantly load the included demo BBQ bike model" style="background:linear-gradient(135deg,#059669,#0d9488);color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4);">🚴 Demo Model</button>'
           '</div>')
    # place right after the fixed container that has the file input (best effort by anchor)
    anchors = ['<div class="controls">', '<div class="panel"', '<div id="panel"']
    for a in anchors:
        if a in src:
            return inject_buttons(src, btn, a)
    return inject_buttons(src, btn, '</style>')

def ensure_room_env(src, import_anchor=None, env_var='scene'):
    """Add RoomEnvironment import + scene.environment when missing (PBR fix)."""
    if 'RoomEnvironment' in src:
        return src
    if import_anchor is None:
        import_anchor = 'import { GLTFLoader }'
    assert import_anchor in src, f'import anchor missing: {import_anchor[:50]}'
    src = src.replace(import_anchor,
        "import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';\n" + import_anchor, 1)
    needle = '// Controls\n        const controls = new OrbitControls(camera, canvas);'
    if needle not in src:
        needle = "const controls = new OrbitControls(camera, canvas);"
    env_code = '''
        // Environment reflections (PBR) - makes chrome/metal/paint look real
        try {
            const pmremGenerator = new THREE.PMREMGenerator(renderer);
            pmremGenerator.compileEquirectangularShader();
            scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        } catch (__e) { console.warn('PBR env skipped:', __e && __e.message); }
'''
    assert needle in src, f'controls needle missing'
    return src.replace(needle, env_code + '\n' + needle, 1)

def add_cam_auto_fit(src, place_after, fn_name, needs_decl=True):
    """Insert __fitTo declaration + a generic call helper to be invoked after first model load."""
    decl = '' if not needs_decl else '''
        // Auto-fit camera to a loaded object
        function fitCameraTo(object) {
            if (!object) return;
            try {
                const box = new THREE.Box3().setFromObject(object);
                if (box.isEmpty()) return;
                const center = box.getCenter(new THREE.Vector3());
                const sphere = box.getBoundingSphere(new THREE.Sphere());
                const radius = Math.max(sphere.radius || 1, 0.001);
                const fovRad = ((camera.fov || 45) * Math.PI) / 360;
                const dist = Math.max((radius / Math.tan(fovRad)) * 1.6, 0.2);
                camera.near = Math.max(radius / 100, 0.01);
                camera.far = Math.max(radius * 500, 100);
                camera.updateProjectionMatrix();
                camera.position.set(center.x + dist * 0.9, center.y + dist * 0.45, center.z + dist);
                camera.lookAt(center);
                if (typeof controls !== 'undefined' && controls) { controls.target.copy(center); controls.update(); }
            } catch (e) { /* ignore */ }
        }
'''
    return src.replace(place_after, place_after + decl, 1)

def add_drop_helpers(src, file_ids=None):
    # shared file-request/merge/button helpers are already in HELPERS for drag/drop & demo.
    return src

def patch_loader_error(src, loader_call_anchor, error_args='(error)', replace_fragment=None):
    """Ensure loader.load has an error callback that shows a toast; loader callback already success.
       loader.load(url, onLoad [, onProgress] [, onError])  -> find loader.load( ... success ... ) ; ensure ', (error)=>{...}' appended if only 2 args
       We'll do targeted per-file since signatures vary."""
    return src

def add_toast_on_load_errors(src):
    # Some files already pass an onError that alert()s; ensure at least console+notify
    if 'error loading model' in src.lower():
        pass
    return src

def upgrade_basic(src, name, add_capture):
    """STANDALONE / ENHANCED style: single model var, controls var, camera, animate."""
    src = ensure_room_env(src, import_anchor='import { GLTFLoader }')
    if add_capture:
        src = add_capture_button(src)
    # 1) expose demo-able file input change -> loader with error toast, and fit after load
    # anchor: the end of the loader success (the unique 'placeholder.style.display = \'none\'' line is generic but fine per-file transform)
    return src

print("Transform module loaded OK.")
