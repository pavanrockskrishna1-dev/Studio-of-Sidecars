#!/usr/bin/env python3
"""Phase 3 · assembles studio_sidecars_phase3.html — the Live GLB Engine derivative.

Takes the LOCKED Premium Finish skin HTML (canonical <body> preserved byte-for-byte)
and adds three engine blocks ONLY:
  1) <style id="engine-tokens"> ... (see below, mirrors design tokens for engine UI)
  2) <style id="engine-css">   (p3.css — engine presentational layer)
  3) <script id="engine-boot"> (esbuild IIFE bundle of the modular engine + three)

Render canonical = omit the skin + engine blocks. No Phase-1/1.5/2 file is written.
"""
import os, sys, re

ROOT  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))     # design/phase3
SRC   = os.path.join(ROOT, '_src')
INP   = os.path.join(ROOT, '..', 'redesign', 'studio_sidecars_premium_finish.html')
OUT   = os.path.join(ROOT, 'studio_sidecars_phase3.html')
CSS   = os.path.join(SRC, 'p3.css')
JS    = '/tmp/p3engine.js'
if not os.path.exists(JS):
    raise SystemExit('bundle missing — run bundle.mjs first')

def body_of(html):
    a = html.find('<html'); b = html.find('<body', a); e = html.rfind('</body>') + len('</body>')
    return html[b:e]

css  = open(CSS, encoding='utf-8').read()
js   = open(JS, encoding='utf-8').read()
s    = open(INP, encoding='utf-8').read()
body_orig = body_of(s)

note = ('<!-- PHASE 3 · LIVE GLB ENGINE (derivative). Same canonical <body> as Phase 1/2; adds\n'
        '     skin blocks (#skin-tokens · #skin-premium · #skin-icons) + ENGINE blocks\n'
        '     (#engine-css · #engine-boot). Engine plugs into the locked ids/hierarchy;\n'
        '     no Phase-1/1.5/2 file is modified. Render canonical = omit these blocks. -->\n')
s = s.replace('<!doctype html>', '<!doctype html>\n' + note, 1)
s = s.replace('<title>Studio of Sidecars — Premium UI (Phase 1 Final)</title>',
              '<title>Studio of Sidecars — Live Engine (Phase 3)</title>')
head_close = s.rindex('</head>')
inject = ('\n<style id="engine-css">\n' + css + '\n</style>\n')
s = s[:head_close] + inject + s[head_close:]
html_close = s.rindex('</html>')
s = s[:html_close] + '\n<script id="engine-boot" data-p3="3">\n' + js + '\n</script>\n' + s[html_close:]
open(OUT, 'w', encoding='utf-8').write(s)
print('wrote', OUT, '%.2f MB' % (os.path.getsize(OUT) / 1e6))
print('body identical to canonical:', body_of(s) == body_orig)
for probe in ['id="engine-css"', 'id="engine-boot"', 'Live Engine (Phase 3)']:
    print(probe, 'ok' if probe in s else 'MISSING')
