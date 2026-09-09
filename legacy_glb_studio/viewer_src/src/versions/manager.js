import { toast } from '../core/ui.js';
import {
  listVersions, getActiveVersion, activateById,
  duplicateVersion, removeVersion, renameVersion, onVersionChange,
} from './registry.js';

/* =========================================================================
 *  VERSION MANAGER — the panel UI.
 *  Lists every installed version (V1, V2, …) with its own stored camera
 *  presets, lighting presets, UI layout (template) and export settings;
 *  lets you create a new version by duplicating any installed version, and
 *  rename / remove the user-created ones. GLB products are never touched.
 * ========================================================================= */

const state = { editing: null };

export function mountManager(host, S) {
  if (!host || host.dataset.mounted) return;
  host.dataset.mounted = '1';
  onVersionChange(() => render(host, S));
  render(host, S);
}

function fmtName(key) { return String(key || '').toUpperCase(); }
function lightLabel(v) {
  const k = v.memory.lighting || v.defaultLighting;
  for (const g of v.lightingOptions || []) {
    for (const o of g.options) if (o.value === k) return o.label.replace(/^[^\s]*\s/, '');
  }
  return k;
}

function pill(text, tip) {
  const p = document.createElement('span');
  p.className = 'vm-pill';
  p.textContent = text;
  if (tip) p.title = tip;
  return p;
}

function rowFor(host, S, v) {
  const row = document.createElement('div');
  row.className = 'vm-row' + (getActiveVersion() === v ? ' on' : '');
  row.dataset.vid = v.id;

  const editing = state.editing === v.id;
  const head = document.createElement('div');
  head.className = 'vm-top';
  const ico = document.createElement('span'); ico.className = 'vm-ico'; ico.textContent = v.icon;
  const info = document.createElement('div'); info.className = 'vm-id';

  if (editing) {
    const inp = document.createElement('input');
    inp.className = 'vm-name-edit';
    inp.type = 'text';
    inp.value = v.label;
    inp.dataset.testid = 'vm-rename-input';
    const done = () => {
      const val = inp.value.trim();
      if (val && val !== v.label) { renameVersion(v.id, { label: val }); toast('✏️ Renamed to "' + val + '"'); }
      else toast('Version name unchanged');
      state.editing = null;
      render(host, S);
    };
    const cancel = () => { state.editing = null; render(host, S); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); done(); } if (e.key === 'Escape') cancel(); });
    inp.addEventListener('blur', () => { if (state.editing === v.id) { state.editing = null; render(host, S); } });
    info.appendChild(inp);
    const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'vm-save'; ok.textContent = '✓';
    ok.addEventListener('click', done);
    info.appendChild(ok);
    setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) {} }, 0);
  } else {
    const nm = document.createElement('span'); nm.className = 'vm-name';
    nm.innerHTML = '<b>' + v.short + '</b> · ' + v.label;
    nm.title = v.tagline;
    const sub = document.createElement('div'); sub.className = 'vm-tag';
    sub.textContent = (v.tpl === 'classic' ? 'Classic template' : v.tpl === 'commercial' ? 'Instagram Commercial template' : v.tpl) +
      (v.userCreated ? ' · runtime copy' : ' · built-in') + (getActiveVersion() === v ? ' · ' : '');
    info.append(nm, sub);
  }
  head.append(ico, info);
  if (getActiveVersion() === v) {
    const badge = document.createElement('span'); badge.className = 'vm-badge'; badge.textContent = '● in use';
    head.appendChild(badge);
  }
  row.appendChild(head);

  /* stored per-version settings summary */
  const meta = document.createElement('div');
  meta.className = 'vm-meta';
  meta.append(
    pill('📐 export ' + fmtName(v.memory.format || v.defaultFormat), 'Stored export format — applied when this version is opened'),
    pill('💡 ' + lightLabel(v), 'Stored lighting preset'),
    pill('▦ ' + ((v.memory.guide !== undefined ? v.memory.guide : !!v.defaultGuide) ? 'guide on' : 'guide off'), 'Stored safe-frame guide state'),
  );
  row.appendChild(meta);

  const detail = document.createElement('div');
  detail.className = 'vm-cams';
  detail.textContent = '🎥 cameras: ' + (v.cameraPresets || []).map((c) => c.label).join(' · ') +
    (v.moves && v.moves.length ? '   🎞 moves: ' + v.moves.map((m) => m.key).join(', ') : '');
  row.appendChild(detail);

  const acts = document.createElement('div');
  acts.className = 'vm-actions';
  const use = document.createElement('button');
  use.type = 'button';
  if (getActiveVersion() === v) { use.textContent = '✓ In use'; use.disabled = true; }
  else {
    use.textContent = '▶ Switch here';
    use.addEventListener('click', () => { activateById(v.id, S); });
  }
  acts.appendChild(use);

  const dup = document.createElement('button');
  dup.type = 'button';
  dup.textContent = '⧉ Duplicate';
  dup.title = 'Create a new version by duplicating "' + v.label + '" (settings copied, products stay loaded)';
  dup.addEventListener('click', () => { duplicateVersion(v.id, S); });
  acts.appendChild(dup);

  if (v.userCreated) {
    const rn = document.createElement('button');
    rn.type = 'button';
    rn.textContent = '✎';
    rn.title = 'Rename this version';
    rn.addEventListener('click', () => { state.editing = v.id; render(host, S); });
    acts.appendChild(rn);
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'vm-del';
    del.textContent = '🗑';
    del.title = 'Remove this version (only runtime copies can be removed)';
    del.addEventListener('click', () => { if (removeVersion(v.id, S)) toast('Removed ' + v.short); });
    acts.appendChild(del);
  }
  row.appendChild(acts);
  return row;
}

function render(host, S) {
  host.innerHTML = '';
  const note = document.createElement('div');
  note.className = 'vm-note';
  note.textContent = 'Every version keeps its own cameras, lighting, panels and export format — the loaded .glb products are shared and never reloaded. Duplicate any version to mint a fresh copy (V6, V7, …).';
  host.appendChild(note);

  /* --- create: duplicate the current version --- */
  const cur = getActiveVersion();
  const create = document.createElement('div');
  create.className = 'vm-create';
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.id = 'vmNewName';
  inp.placeholder = 'Name for the new version…';
  if (cur) inp.value = cur.label + ' Copy';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'primary';
  btn.id = 'vmDupBtn';
  btn.textContent = cur ? '⧉ Create from ' + cur.short : '⧉ Duplicate';
  btn.title = cur ? 'Create a brand-new version by duplicating the current one (' + cur.label + ')' : '';
  btn.addEventListener('click', () => {
    if (!cur) { toast('No version active to duplicate.', true); return; }
    const label = inp.value.trim() || undefined;
    const v = duplicateVersion(cur.id, S, { label });
    if (v) toast('⧉ New version ' + v.short + ' created & opened');
  });
  create.append(inp, btn);
  host.appendChild(create);

  const listTitle = document.createElement('div');
  listTitle.className = 'vm-list-title';
  listTitle.textContent = 'Installed versions (' + listVersions().length + ')';
  host.appendChild(listTitle);

  const list = document.createElement('div');
  list.id = 'vmRows';
  listVersions().forEach((v) => list.appendChild(rowFor(host, S, v)));
  host.appendChild(list);
}
