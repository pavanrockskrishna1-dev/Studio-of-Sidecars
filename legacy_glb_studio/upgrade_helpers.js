/* ================= BBQ BIKE VIEWER UPGRADES (shared) ================= */
function __toast(msg, isErr) {
  let el = document.getElementById('__bikeToast');
  if (!el) {
    el = document.createElement('div');
    el.id = '__bikeToast';
    el.style.cssText = 'position:fixed;bottom:26px;right:26px;z-index:999999;max-width:72vw;padding:12px 18px;border-radius:12px;font:600 14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#fff;box-shadow:0 10px 34px rgba(0,0,0,.45);opacity:0;transition:opacity .25s;pointer-events:none;white-space:pre-wrap;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.background = isErr ? '#c2410c' : '#0f766e';
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(function () { el.style.opacity = '0'; }, 3800);
}
function __notify(msg, isErr) {
  try { if (typeof showNotification === 'function') { showNotification(msg); return; } } catch (e) {}
  __toast(msg, isErr);
}
function downloadBlob(blob, name) {
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
    const ctx = out.getContext('2d');
    ctx.drawImage(c, 0, 0, out.width, out.height);
    out.toBlob(function (b) {
      if (b) downloadBlob(b, (label || 'bbq-bike') + '_' + Date.now() + '.png');
      else __notify('Screenshot failed - try again', true);
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
    __notify('High-res error: ' + e.message, true);
    try { renderer.setSize(window.innerWidth, window.innerHeight); renderer.render(scene, camera); } catch (e2) {}
  }
}
let __rec = null, __chunks = [];
function __toggleRecord() {
  try {
    if (__rec) { __rec.stop(); return; }
    const c = renderer.domElement;
    if (!c.captureStream) { __notify('Recording needs a recent browser (Chrome/Edge/Firefox)', true); return; }
    const stream = c.captureStream(30);
    const mime = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) ? 'video/webm;codecs=vp9' : 'video/webm';
    __rec = new MediaRecorder(stream, { mimeType: mime });
    __chunks = [];
    __rec.ondataavailable = function (e) { if (e.data && e.data.size) __chunks.push(e.data); };
    __rec.onstop = function () {
      const blob = new Blob(__chunks, { type: 'video/webm' });
      downloadBlob(blob, 'bbq-bike_record_' + Date.now() + '.webm');
      __rec = null;
      __notify('Video saved ✔');
      const b = document.getElementById('__btnRecord');
      if (b) { b.innerHTML = '⏺️ Record'; b.classList.remove('rec-on'); }
    };
    __rec.start(250);
    const b = document.getElementById('__btnRecord');
    if (b) { b.innerHTML = '⏹ Stop'; b.classList.add('rec-on'); }
    __notify('Recording… click Stop when done');
  } catch (e) { __notify('Record error: ' + e.message, true); __rec = null; }
}
function __fitTo(obj) {
  try {
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = sphere.radius || 1;
    const fovRad = ((camera.fov || 45) * Math.PI) / 360;
    const dist = Math.max((radius / Math.tan(fovRad)) * 1.5, 0.2);
    camera.near = Math.max(radius / 100, 0.01);
    camera.far = Math.max(radius * 300, 100);
    camera.position.set(center.x + dist * 0.9, center.y + dist * 0.55, center.z + dist);
    camera.updateProjectionMatrix();
    if (typeof controls !== 'undefined' && controls) { controls.target.copy(center); controls.update(); }
  } catch (e) { /* non-fatal */ }
}
function __demoModel() {
  const inp = document.getElementById('file');
  if (!inp) return;
  __notify('Loading demo BBQ bike…');
  fetch('demo-bbq-bike.glb', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
    .then(function (buf) {
      const file = new File([buf], 'demo-bbq-bike.glb', { type: 'model/gltf-binary' });
      const dt = new DataTransfer();
      dt.items.add(file);
      inp.files = dt.files;
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    })
    .catch(function () {
      __notify('Could not auto-load the demo here.\nClick "Choose GLB File" and pick demo-bbq-bike.glb from the project folder.\n(Use the live server for the one-click demo.)', true);
    });
}
/* Drag & drop a .glb / .gltf anywhere on the page */
(function () {
  window.addEventListener('dragover', function (e) { e.preventDefault(); e.stopPropagation(); });
  window.addEventListener('drop', function (e) {
    e.preventDefault(); e.stopPropagation();
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length) return;
    const glbs = Array.from(files).filter(function (f) { return /\.(glb|gltf)$/i.test(f.name); });
    if (!glbs.length) { __notify('Drop a .glb or .gltf file', true); return; }
    const inp = document.getElementById('file');
    if (!inp) return;
    const dt = new DataTransfer();
    glbs.forEach(function (f) { dt.items.add(f); });
    inp.files = dt.files;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const ov = document.createElement('div');
  ov.id = '__dropHint';
  ov.textContent = '📁 Drop your .glb / .gltf file';
  ov.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:999998;color:#fff;font:700 20px/1.4 system-ui,sans-serif;pointer-events:none;border:3px dashed rgba(255,255,255,.7);background:rgba(8,10,14,.6);';
  document.body.appendChild(ov);
  let t = null;
  window.addEventListener('dragenter', function () { ov.style.display = 'flex'; clearTimeout(t); });
  window.addEventListener('dragleave', function () { t = setTimeout(function () { ov.style.display = 'none'; }, 120); });
  window.addEventListener('drop', function () { ov.style.display = 'none'; });
})();
