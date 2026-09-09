#!/usr/bin/env python3
"""Builds the Phase 2 interactive prototype file.
Derivative of the locked Phase-1 shell (studio_sidecars_premium_ui.html):
- layout / chrome copied verbatim
- demo-scene block swapped for a full-bleed Studio-Background stage
- Phase-2 CSS + interaction engine appended (no engine logic yet)
- 11 environment proxies embedded as data-URIs (read-only derived copies)
The locked shell and the frozen environment assets are never written to.
"""
import base64, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # design/phase2
SRC  = os.path.join(ROOT, '_src')
SHELL = os.path.join(ROOT, '..', 'studio_sidecars_premium_ui.html')  # locked
OUT   = os.path.join(ROOT, 'studio_sidecars_phase2_interactive.html')

css = open(os.path.join(SRC, 'p2.css'), encoding='utf-8').read()
js  = open(os.path.join(SRC, 'p2.js'), encoding='utf-8').read()

# ---- environment registry literal ----
meta = json.load(open(os.path.join(ROOT, '_uri', 'manifest.json'), encoding='utf-8'))
order = meta['order']
names = meta['names']; moods = meta['moods']
items = []
for k in order:
    b64 = open(os.path.join(ROOT, '_uri', k + '.b64'), encoding='utf-8').read().strip()
    items.append({"id": k, "name": names[k], "mood": moods[k], "src": "data:image/jpeg;base64," + b64})
envs_lit = json.dumps(items, ensure_ascii=False, separators=(',', ':'))
js = js.replace('__P2_ENVS__', envs_lit)

# ---- read locked shell ----
s = open(SHELL, encoding='utf-8').read()

# 1) replace the demo-scene block with an empty .cv-scene that the JS stage will fill
start = s.index('<!-- loaded demo scene -->')
end   = s.index('<!-- empty state -->')
replacement = ('<!-- Phase 2 · studio background stage (filled by p2 engine) -->\n'
               '      <div class="layer cv-scene p2s"></div>\n\n      ')
s = s[:start] + replacement + s[end:]

# 2) relabel the two content labels of the cv toggle (new prototype file only)
s = s.replace('<label for="stDemo">● Demo scene</label>', '<label for="stDemo">● Studio background</label>')
s = s.replace('<label for="stEmpty">○ Empty canvas</label>', '<label for="stEmpty">○ Empty canvas</label>')

# 3) inject Phase-2 stylesheet right before </head>
i = s.rindex('</head>')
s = s[:i] + '<style id="p2css">\n' + css + '\n</style>\n' + s[i:]

# 4) inject Phase-2 engine right before </body>
i = s.rindex('</body>')
s = s[:i] + '<script id="p2js">\n' + js + '\n</script>\n' + s[i:]

# 5) title + meta note
s = s.replace('<title>Studio of Sidecars — Premium UI (Phase 1 Final)</title>',
              '<title>Studio of Sidecars — Phase 2 · Interactive Prototype</title>')
note = ('<!-- PHASE 2 INTERACTIVE PROTOTYPE (derivative of the locked Phase-1 premium shell).\n'
        '     Chrome & layout identical to studio_sidecars_premium_ui.html (locked, unmodified).\n'
        '     Stage = full-bleed Studio Backgrounds (Hero + 10 presets, read-only derived proxies).\n'
        '     Modules: 2.1 camera · 2.2 environment switcher · 2.3 materials · 2.4 lighting ·\n'
        '              2.5 learn studio (onboarding V1–V6) · 2.6 motion polish · 2.7 render presets\n'
        '     No engine logic; product compositing is Phase 3. -->\n')
s = s.replace('<!doctype html>', '<!doctype html>\n' + note, 1)

open(OUT, 'w', encoding='utf-8').write(s)
print('wrote', OUT, '%.1f MB' % (os.path.getsize(OUT) / 1e6))
# sanity
print('p2css present:', '<style id="p2css">' in s)
print('p2js present:', '<script id="p2js">' in s)
print('cv-scene kept:', 'class="layer cv-scene p2s"' in s)
print('old demo img gone:', 'ss-img' not in s)
print('envs in js:', s.count('data:image/jpeg;base64,'))
