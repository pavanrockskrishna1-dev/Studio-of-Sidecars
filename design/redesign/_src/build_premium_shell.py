#!/usr/bin/env python3
"""Builds the PREMIUM FINISH SKIN HTML.

Architecture (per approved correction):
  studio_sidecars_premium_ui.html  = immutable canonical baseline (never written)
  studio_sidecars_premium_finish.html = OVERLAY SKIN over the EXACT canonical DOM.
    Body markup (ids, hierarchy, V1-V6 chips, dock, inspector, asset tree, asset
    paths, Hero demo scene) is inherited byte-for-byte — verified below.
    Only two things are added, both OUTSIDE <body>:
      1) skin stylesheet  (visual layer, premium_finish.css)
      2) presentational icon pass (premium_icons.js -> swaps emoji glyphs for SVG)
  Engine swap contract: render canonical = load the two skin files off;
  render premium = include them. Engine code never changes.

Also emits the standalone skin assets under skin/ for external <link>/<script>
use by Phase 3."""
import re, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # design/redesign
SRC  = os.path.join(ROOT, '_src')
SKIN = os.path.join(ROOT, 'skin')
SHELL= os.path.join(ROOT, '..', 'studio_sidecars_premium_ui.html')
OUT  = os.path.join(ROOT, 'studio_sidecars_premium_finish.html')

css   = open(os.path.join(SRC,'cinematic.css'),encoding='utf-8').read()
css   = css + '\n' + open(os.path.join(SRC,'fin_extra.css'),encoding='utf-8').read()
icons = open(os.path.join(SRC,'cinematic.js'),encoding='utf-8').read()

# ---- publish standalone skin assets ----
os.makedirs(SKIN, exist_ok=True)
open(os.path.join(SKIN,'premium_finish.css'),'w',encoding='utf-8').write(css)
open(os.path.join(SKIN,'premium_icons.js'),'w',encoding='utf-8').write(icons)

# ---- read locked canonical shell ----
s = open(SHELL, encoding='utf-8').read()
def body_of(html):
    a = html.find('<html')
    b = html.find('<body', a)
    e = html.rfind('</body>') + len('</body>')
    return html[b:e]
body_orig = body_of(s)

head_close = s.rindex('</head>')
s = s[:head_close] + ('\n<style id="skin-premium">\n' + css + '\n</style>\n') + s[head_close:]
html_close = s.rindex('</html>')
s = s[:html_close] + ('\n<script id="skin-icons" data-skin="premium">\n' + icons + '\n</script>\n') + s[html_close:]

note = ('<!-- PREMIUM FINISH SKIN (overlay over the immutable Phase-1 canonical shell).\n'
        '     <body> is byte-for-byte identical to studio_sidecars_premium_ui.html.\n'
        '     Skin = <style id="skin-premium"> (head) + <script id="skin-icons"> (after </body>).\n'
        '     To render canonical: drop those two blocks. Engine code is unchanged. -->\n')
s = s.replace('<!doctype html>', '<!doctype html>\n' + note, 1)
s = s.replace('<title>Studio of Sidecars — Premium UI (Phase 1 Final)</title>',
              '<title>Studio of Sidecars — Premium Finish Skin</title>')

open(OUT,'w',encoding='utf-8').write(s)
print('wrote', OUT, '%.1f MB' % (os.path.getsize(OUT)/1e6))

# ---- invariant: <body> of skin == <body> of canonical shell ----
body_new = body_of(s)
print('body identical to canonical:', body_orig == body_new)
if body_orig != body_new:
    for i,(a,b) in enumerate(zip(body_orig,body_new)):
        if a!=b:
            print('first diff at',i); print('canon...',repr(body_orig[i-60:i+60])); print('skin....',repr(body_new[i-60:i+60])); break
print('skin assets written under', SKIN)
