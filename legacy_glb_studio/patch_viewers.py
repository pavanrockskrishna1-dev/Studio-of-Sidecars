#!/usr/bin/env python3
# Surgical upgrade of the 7 single-file BBQ Bike viewers.
import pathlib

ROOT = pathlib.Path('/home/user/unzipped')

TAIL_JS = r'''
/* ================= Shared BBQ Bike Viewer upgrades (module scope) ================= */
let __toastEl = null;
function __toast(msg, isErr) {
  if (!__toastEl) {
    __toastEl = document.createElement('div');
    __toastEl.style.cssText = 'position:fixed;bottom:26px;left:26px;z-index:999999;max-width:72vw;padding:12px 18px;border-radius:12px;font:600 14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#fff;box-shadow:0 10px 34px rgba(0,0,0,.45);opacity:0;transition:opacity .25s;pointer-events:none;white-space:pre-wrap;background:#0f766e;';
    document.body.appendChild(__toastEl);
  }
  __toastEl.textContent = msg;
  __toastEl.style.background = isErr ? '#c2410c' : '#0f766e';
  __toastEl.style.opacity = '1';
  clearTimeout(__toastEl._t);
  __toastEl._t = setTimeout(function () { __toastEl.style.opacity = '0'; }, 3800);
}
function __notify(msg, isErr) {
  try { if (typeof showNotification === 'function') { showNotification(msg); return; } } catch (e) {}
  __toast(msg, isErr);
}
function __downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
function __snapshot(scale, label) {
  try {
    const c = renderer.domElement;
    const w = c.width, h = c.height;
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(w * (scale || 1)));
    out.height = Math.max(1, Math.round(h * (scale || 1)));
    out.getContext('2d').drawImage(c, 0, 0, out.width, out.height);
    out.toBlob(function (b) {
      if (b) __downloadBlob(b, (label || 'bbq-bike') + '_' + Date.now() + '.png');
      else __notify('Screenshot failed - please try again.', true);
    }, 'image/png');
  } catch (e) { __notify('Screenshot error: ' + e.message, true); }
}
function __shotHi() {
  try {
    const c = renderer.domElement;
    const w = c.width, h = c.height;
    renderer.setSize(Math.min(4000, Math.round(w * 2)), Math.min(4000, Math.round(h * 2)), false);
    renderer.render(scene, camera);
    __snapshot(1, 'bbq-bike-hires');
    renderer.setSize(w, h, false);
    renderer.render(scene, camera);
  } catch (e) {
    __notify('High-res capture error: ' + e.message, true);
    try { renderer.setSize(window.innerWidth, window.innerHeight); renderer.render(scene, camera); } catch (e2) {}
  }
}
let __rec = null, __recChunks = [];
function __toggleRecord() {
  try {
    if (__rec) { __rec.stop(); return; }
    const c = renderer.domElement;
    if (!c.captureStream) { __notify('Video recording needs a recent Chrome / Edge / Firefox browser.', true); return; }
    const stream = c.captureStream(30);
    const mime = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9'))
      ? 'video/webm;codecs=vp9' : 'video/webm';
    __rec = new MediaRecorder(stream, { mimeType: mime });
    __recChunks = [];
    __rec.ondataavailable = function (e) { if (e.data && e.data.size) __recChunks.push(e.data); };
    __rec.onstop = function () {
      const blob = new Blob(__recChunks, { type: 'video/webm' });
      __downloadBlob(blob, 'bbq-bike_record_' + Date.now() + '.webm');
      __rec = null;
      __notify('Video saved ✔');
      const b = document.getElementById('__btnRecord');
      if (b) { b.innerHTML = '⏺️ Record'; b.classList.remove('__recOn'); }
    };
    __rec.start(250);
    const b = document.getElementById('__btnRecord');
    if (b) { b.innerHTML = '⏹ Stop'; b.classList.add('__recOn'); }
    __notify('Recording… click Stop when done.');
  } catch (e) { __notify('Record error: ' + e.message, true); __rec = null; }
}
function __fitToObj(obj) {
  if (!obj) return;
  try {
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius || 1, 0.001);
    const fovRad = ((camera.fov || 45) * Math.PI) / 360;
    const dist = Math.max((radius / Math.tan(fovRad)) * 1.6, 0.2);
    camera.near = Math.max(radius / 100, 0.01);
    camera.far = Math.max(radius * 500, 100);
    camera.position.set(center.x + dist * 0.9, center.y + dist * 0.45, center.z + dist);
    camera.updateProjectionMatrix();
    if (typeof controls !== 'undefined' && controls) { controls.target.copy(center); controls.update(); }
  } catch (e) { /* non-fatal */ }
}
function __loadDemoBike() {
  const inp = document.getElementById('file');
  if (!inp) { __notify('File input not found.', true); return; }
  __notify('Loading demo BBQ bike model…');
  fetch('demo-bbq-bike.glb', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
    .then(function (buf) {
      const f = new File([buf], 'demo-bbq-bike.glb', { type: 'model/gltf-binary' });
      const dt = new DataTransfer(); dt.items.add(f);
      inp.files = dt.files;
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    })
    .catch(function () {
      __notify('Could not auto-load the demo here.\nClick "Choose GLB File" and pick demo-bbq-bike.glb from the project folder.\n(When served over http the button loads it instantly.)', true);
    });
}
/* Drag & drop any .glb / .gltf anywhere on the page */
(function () {
  const ov = document.createElement('div');
  ov.id = '__dropHint';
  ov.textContent = '📁 Drop your .glb / .gltf file here';
  ov.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:999998;color:#fff;font:700 20px/1.4 system-ui,sans-serif;pointer-events:none;border:4px dashed rgba(255,255,255,.75);background:rgba(8,10,14,.6);';
  document.body.appendChild(ov);
  let hideT = null;
  window.addEventListener('dragenter', function (e) { e.preventDefault(); ov.style.display = 'flex'; clearTimeout(hideT); });
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('dragleave', function () { hideT = setTimeout(function () { ov.style.display = 'none'; }, 140); });
  window.addEventListener('drop', function (e) {
    e.preventDefault(); ov.style.display = 'none';
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length) return;
    const glbs = Array.from(files).filter(function (f) { return /\.(glb|gltf)$/i.test(f.name); });
    if (!glbs.length) { __notify('Drop a .glb or .gltf file.', true); return; }
    const inp = document.getElementById('file');
    if (!inp) return;
    const dt = new DataTransfer();
    glbs.forEach(function (f) { dt.items.add(f); });
    inp.files = dt.files;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    __notify('Loading ' + glbs.length + ' model' + (glbs.length > 1 ? 's' : '') + '…');
  });
})();
window.__snapshot = __snapshot;
window.__shotHi = __shotHi;
window.__toggleRecord = __toggleRecord;
window.__fitToObj = __fitToObj;
window.__demoModel = __loadDemoBike;
'''

def _insert_at_tail(src, code):
    idx = src.rfind('</script>')
    assert idx != -1
    return src[:idx] + code + '\n' + src[idx:]

def _inject_button_html(src, html):
    return src.replace('</body>', html + '</body>', 1)

def _add_room_env(src):
    if 'RoomEnvironment' in src:
        return src
    imp = "        import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';\n"
    anchor = "        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';"
    assert anchor in src, 'GLTF import anchor missing'
    src = src.replace(anchor, imp + anchor, 1)
    env_code = '''
        // PBR reflections - makes chrome / metal / gloss paint render correctly
        try {
            const __pmrem = new THREE.PMREMGenerator(renderer);
            __pmrem.compileEquirectangularShader();
            scene.environment = __pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        } catch (__e) { console.warn('PBR env skipped', __e && __e.message); }
'''
    env_anchor = '        // Controls\n        const controls = new OrbitControls(camera, canvas);'
    if env_anchor not in src:
        env_anchor = '        const controls = new OrbitControls(camera, canvas);'
    assert env_anchor in src, 'controls anchor missing for env'
    return src.replace(env_anchor, env_code + '\n' + env_anchor, 1)

def _auto_fit_hook(src, add_anchor, fit_arg):
    code = ('\n                    if (!window.__bikeFitted) { window.__bikeFitted = true; '
            '__fitToObj(' + fit_arg + '); }\n')
    assert add_anchor in src, 'auto-fit anchor missing'
    return src.replace(add_anchor, add_anchor + code, 1)

def _demo_pill(extra=''):
    return ('''<div style="position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99995;display:flex;gap:8px;align-items:center;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <button id="__btnDemo" onclick="__demoModel()" title="Instantly load the included demo BBQ bike model" style="background:linear-gradient(135deg,#059669,#0d9488);color:#fff;border:none;border-radius:999px;padding:9px 16px;font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.5);">🚴 Load Demo BBQ Bike</button>
''' + extra + '''</div>
''')

def _quick_stack():
    return ('''<div id="__btnWrap" style="position:fixed;top:20px;right:20px;z-index:99990;display:flex;flex-direction:column;gap:8px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <button id="__btnShot" onclick="__snapshot(1,'bbq-bike')" title="Save a PNG photo of the view" style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;border:none;border-radius:12px;padding:10px 16px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4);">📷 Photo</button>
  <button id="__btnHiRes" onclick="__shotHi()" title="Save a high-resolution PNG" style="background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;border:none;border-radius:12px;padding:10px 16px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4);">🖼️ 4K Shot</button>
  <button id="__btnRecord" onclick="__toggleRecord()" title="Record a video of the rotating model" style="background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;border:none;border-radius:12px;padding:10px 16px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4);">⏺️ Record</button>
</div>
''')

def _anim_button_html():
    return '''  <button id="__btnAnim" onclick="__toggleAnimBike()" style="display:none;background:linear-gradient(135deg,#f59e0b,#ea580c);color:#fff;border:none;border-radius:999px;padding:9px 16px;font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.5);">▶ Play Built-in Animation</button>
'''

# ============ 1) STANDALONE_VIEWER (has env already; add quick actions, demo, auto-fit, tail) ============
def upgrade_standalone():
    f = ROOT / 'STANDALONE_VIEWER.html'
    src = f.read_text(encoding='utf-8')
    src = _insert_at_tail(src, TAIL_JS)
    # add auto-fit after the single scene.add(model)
    src = _auto_fit_hook(src, '                    scene.add(model);', 'model')
    # buttons: quick actions + demo pill
    src = _inject_button_html(src, _quick_stack() + _demo_pill())
    f.write_text(src, encoding='utf-8')
    print('STANDALONE upgraded')

# ============ 2) ENHANCED_VIEWER (no env; modelGroup.add(model)) ============
def upgrade_enhanced():
    f = ROOT / 'ENHANCED_VIEWER.html'
    src = f.read_text(encoding='utf-8')
    src = _add_room_env(src)
    src = _insert_at_tail(src, TAIL_JS)
    src = _auto_fit_hook(src, '                    modelGroup.add(model);', 'modelGroup')
    src = _inject_button_html(src, _quick_stack() + _demo_pill())
    f.write_text(src, encoding='utf-8')
    print('ENHANCED upgraded')

# ============ 3) ADVANCED_MULTI_MODEL_VIEWER (no env; multi model) ============
def upgrade_advanced():
    f = ROOT / 'ADVANCED_MULTI_MODEL_VIEWER.html'
    src = f.read_text(encoding='utf-8')
    src = _add_room_env(src)
    src = _insert_at_tail(src, TAIL_JS)
    src = _auto_fit_hook(src, '                    scene.add(model);', 'model')
    src = _inject_button_html(src, _quick_stack() + _demo_pill())
    f.write_text(src, encoding='utf-8')
    print('ADVANCED upgraded')

# ============ 4) ULTIMATE_VIEWER (no env; already capture) ============
def upgrade_ultimate():
    f = ROOT / 'ULTIMATE_VIEWER.html'
    src = f.read_text(encoding='utf-8')
    src = _add_room_env(src)
    src = _insert_at_tail(src, TAIL_JS)
    src = _auto_fit_hook(src, '                    scene.add(model);', 'model')
    src = _inject_button_html(src, _demo_pill())
    f.write_text(src, encoding='utf-8')
    print('ULTIMATE upgraded')

# ============ 5) FINAL_ULTIMATE_VIEWER (no env) ============
def upgrade_final_ultimate():
    f = ROOT / 'FINAL_ULTIMATE_VIEWER.html'
    src = f.read_text(encoding='utf-8')
    src = _add_room_env(src)
    src = _insert_at_tail(src, TAIL_JS)
    src = _auto_fit_hook(src, '                    scene.add(model);', 'model')
    src = _inject_button_html(src, _demo_pill())
    f.write_text(src, encoding='utf-8')
    print('FINAL_ULTIMATE upgraded')

# ============ 6) ABSOLUTE_FINAL_VIEWER (two scene.add(model); hook FIRST only) ============
def upgrade_absolute():
    f = ROOT / 'ABSOLUTE_FINAL_VIEWER.html'
    src = f.read_text(encoding='utf-8')
    src = _add_room_env(src)
    src = _insert_at_tail(src, TAIL_JS)
    anchor = '                    scene.add(model);'
    assert anchor in src
    src = src.replace(anchor, anchor + '\n                    if (!window.__bikeFitted) { window.__bikeFitted = true; __fitToObj(model); }', 1)
    src = _inject_button_html(src, _demo_pill())
    f.write_text(src, encoding='utf-8')
    print('ABSOLUTE_FINAL upgraded')

# ============ 7) ULTIMATE_SPECIAL_VIEWER (no env; + animation player) ============
ANIM_TAIL = r'''
/* Built-in GLB animation player (loaded clip -> play/pause) */
window.__toggleAnimBike = function () {
  const clip = window.__bikeClip;
  if (!clip) { __notify('No animation found - this model has no built-in clips.', true); return; }
  const btn = document.getElementById('__btnAnim');
  if (!window.__bikeMixer) {
    try {
      window.__bikeClock = new THREE.Clock();
      window.__bikeMixer = new THREE.AnimationMixer(window.__bikeRoot);
      window.__bikeAction = window.__bikeMixer.clipAction(clip);
      window.__bikeAction.play();
      __notify('▶ Playing: ' + clip.name);
      if (btn) { btn.innerHTML = '⏸ Pause Animation'; }
    } catch (e) { __notify('Animation start error: ' + e.message, true); }
    return;
  }
  const paused = window.__bikeAction.paused;
  window.__bikeAction.paused = !paused;
  if (btn) { btn.innerHTML = window.__bikeAction.paused ? '▶ Play Built-in Animation' : '⏸ Pause Animation'; }
};
'''

def upgrade_special():
    f = ROOT / 'ULTIMATE_SPECIAL_VIEWER.html'
    src = f.read_text(encoding='utf-8')
    src = _add_room_env(src)
    src = _insert_at_tail(src, TAIL_JS + ANIM_TAIL)
    # 1) record clip + root when a loaded model carries animations
    hook = '''\n                    if (gltf.animations && gltf.animations.length) {
                        window.__bikeClip = gltf.animations[0];
                        window.__bikeRoot = gltf.scene;
                        window.__bikeMixer = null; window.__bikeAction = null;
                        const __ab = document.getElementById('__btnAnim');
                        if (__ab) { __ab.style.display = 'inline-block'; __ab.innerHTML = '▶ Play Built-in Animation'; }
                    }'''
    anchor = '                    scene.add(model);'
    assert anchor in src
    src = src.replace(anchor, anchor + hook, 1)
    # auto-fit after main model first load
    src = src.replace(anchor, anchor + '\n                    if (!window.__bikeFitted) { window.__bikeFitted = true; __fitToObj(model); }', 1)
    # 2) advance mixer inside animate()
    anim_anchor = '        function animate() {\n            requestAnimationFrame(animate);'
    assert anim_anchor in src
    src = src.replace(anim_anchor, anim_anchor + r'''

            if (window.__bikeMixer && window.__bikeClock) {
                window.__bikeMixer.update(window.__bikeClock.getDelta());
            }''', 1)
    # 3) buttons
    src = _inject_button_html(src, _demo_pill(_anim_button_html()))
    f.write_text(src, encoding='utf-8')
    print('ULTIMATE_SPECIAL upgraded')

if __name__ == '__main__':
    for fn in [upgrade_standalone, upgrade_enhanced, upgrade_advanced,
               upgrade_ultimate, upgrade_final_ultimate, upgrade_absolute, upgrade_special]:
        fn()
    print('ALL DONE')
