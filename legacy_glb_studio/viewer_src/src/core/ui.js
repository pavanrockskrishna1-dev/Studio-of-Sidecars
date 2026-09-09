/* Shared UI helpers (engine-level, format-agnostic). */
export const $ = (id) => document.getElementById(id);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

let toastTimer = null;
export function toast(msg, isErr) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = isErr ? 'err' : '';
  el.style.opacity = '1';
  el.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(20px)';
  }, isErr ? 5600 : 3000);
}

/** Make a <details> section shell with a summary. */
export function section(title, open = true, ns = '') {
  const d = document.createElement('details');
  d.className = 'ver-section';
  d.dataset.ver = ns;
  if (open) d.open = true;
  const s = document.createElement('summary');
  s.textContent = title;
  d.appendChild(s);
  return d;
}

/** Build a labeled slider row inside a section. */
export function sliderRow(ns, label, id, opts = {}) {
  const wrap = document.createElement('div');
  const lab = document.createElement('label');
  lab.className = 'fld';
  lab.innerHTML = label + ' <span class="out" id="' + ns + id + 'Out">' + (opts.display || '') + '</span>';
  const inp = document.createElement('input');
  inp.type = 'range';
  inp.id = ns + id;
  inp.min = String(opts.min ?? 0);
  inp.max = String(opts.max ?? 1);
  inp.step = String(opts.step ?? 0.01);
  inp.value = String(opts.value ?? opts.min ?? 0);
  if (opts.onInput) inp.addEventListener('input', opts.onInput);
  wrap.append(lab, inp);
  return wrap;
}

export function labelSelect(ns, label, id, groups, onChange, selVal) {
  const wrap = document.createElement('div');
  const lab = document.createElement('label');
  lab.className = 'fld';
  lab.textContent = label;
  const sel = document.createElement('select');
  sel.id = ns + id;
  groups.forEach((g) => {
    const og = document.createElement('optgroup');
    og.label = g.label;
    g.options.forEach((o) => {
      const op = document.createElement('option');
      op.value = o.value;
      op.textContent = o.label;
      og.appendChild(op);
    });
    sel.appendChild(og);
  });
  if (selVal !== undefined) sel.value = selVal;
  sel.addEventListener('change', () => onChange && onChange(sel.value));
  wrap.append(lab, sel);
  return wrap;
}

export function buttonsRow(ns, buttons) {
  const row = document.createElement('div');
  row.className = 'row';
  buttons.forEach((b) => {
    const btn = document.createElement('button');
    btn.id = ns + b.id;
    btn.type = 'button';
    btn.textContent = b.label || '';
    btn.title = b.title || '';
    btn.className = b.cls || '';
    if (b.onclick) btn.addEventListener('click', b.onclick);
    row.appendChild(btn);
  });
  return row;
}

export function chipRow(ns, chips, onPick) {
  const row = document.createElement('div');
  row.className = 'seg';
  chips.forEach((c) => {
    const btn = document.createElement('button');
    btn.dataset.preset = c.key;
    btn.textContent = c.label;
    if (c.title) btn.title = c.title;
    btn.addEventListener('click', () => onPick && onPick(c.key, btn));
    row.appendChild(btn);
  });
  return row;
}
