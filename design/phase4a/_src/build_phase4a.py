#!/usr/bin/env python3
"""Phase 4A · Personal Daily Driver UX — single-file build.
Base = Phase 3 engine artifact (READ-ONLY input). Adds:
  · <base href> so engine asset/env paths keep resolving
  · <style id="p4a-skin">   (experience skin)
  · <script id="p4a-boot">  (experience layer)
Writes design/phase4a/studio_sidecars_phase4a.html.
Canonical body stays byte-for-byte identical to the Phase 3 body.
"""
import os, pathlib, sys, re, base64 as _b64

ROOT = pathlib.Path('/home/user')
P3   = ROOT / 'design/phase3/studio_sidecars_phase3.html'
SRC  = ROOT / 'design/phase4a/_src'
OUT  = ROOT / 'design/phase4a/studio_sidecars_phase4a.html'

css  = (SRC / 'p4a.css').read_text(encoding='utf-8')
pol  = SRC / 'p4a_polish.css'
if pol.exists():
    css += '\n' + pol.read_text(encoding='utf-8')
js   = (SRC / 'p4a.js').read_text(encoding='utf-8')
base = P3.read_text(encoding='utf-8')

# Embed the canonical Hero (Propeller & Pistons Loft) as an inline data-URI copy.
# Local contexts cannot always render the engine's external-file backdrop: real browsers
# refuse to upload file:// images into WebGL (taint), and sandboxed/offline viewers
# cannot fetch the file at all. The p4a layer rebuilds the engine's background texture
# from this embedded copy, so the Hero shows identically over http://, file:// and in
# preview sandboxes. Rebuild this file whenever the canonical environment artwork changes.
hero_jpg = SRC / 'hero_embed.jpg'
if hero_jpg.exists():
    hero_b64 = _b64.b64encode(hero_jpg.read_bytes()).decode('ascii')
    js = js.replace('__P4_HERO_JPEG_B64__', hero_b64)
else:
    print('WARNING: %s missing — Hero embed disabled (charcoal fallback only).' % hero_jpg)

# Sibling-relative <base> for the engine's base-relative asset/env paths (engine cfg uses
# '../environments/...' and 'assets/...'). '../phase3/' resolves to the Phase 3 folder from
# the phase4a document over http(s) AND file:// — an absolute '/design/phase3/' would break
# under file:// (drive-root resolution) and show a white/fallback stage.
if '<base ' not in base[:60000]:
    base = base.replace('</head>', '<base href="../phase3/">\n</head>', 1)

# Boot flash-guard (head-only; the canonical body stays byte-for-byte identical). The engine
# paints its default demo scene (raw chrome + demo sidecars incl. the spinning-wheel BBQ GLB)
# up to ~2-3 s before the 4A layer mounts — the "old sidecar for 2 seconds" on every reload.
# This guard hides the body (charcoal behind it) from the very first paint; p4a.js reveals
# once the 4A boot is visually complete (revealStage/watchReveal). A 12 s fail-safe always
# reveals even if the boot layer throws.
flash_head = ('\n<style id="p4a-flash">'
              'html.p4flash,html.p4flash body{background:#0b0e13!important}'
              'html.p4flash body{visibility:hidden}'
              '</style>\n'
              '<script id="p4a-flash-boot">(function(){try{document.documentElement.classList.add("p4flash");'
              'setTimeout(function(){try{document.documentElement.classList.remove("p4flash");}catch(e){}},12000);}catch(e){}})();</script>\n')
if 'id="p4a-flash"' not in base:
    base = base.replace('<base href="../phase3/">', '<base href="../phase3/">' + flash_head, 1)

style_block = ('\n<style id="p4a-skin">\n' + css + '\n</style>\n')
if 'id="p4a-skin"' not in base:
    base = base.replace('</head>', style_block + '</head>', 1)

js_block = ('\n<script id="p4a-boot">\n/* Phase 4A · Personal Daily Driver UX — layered over the Phase 3 engine (read-only). */\n'
            + js + '\n</script>\n')
if 'id="p4a-boot"' not in base:
    base = base.replace('</html>', js_block + '</html>', 1)

OUT.write_text(base, encoding='utf-8')

# integrity probes
probes = ['id="engine-css"', 'id="engine-boot"', 'id="p4a-skin"', 'id="p4a-boot"',
          'Live Engine (Phase 3)', '<base href="../phase3/">',
          'id="p4a-flash"', 'p4flash',
          'data:image/jpeg;base64,' in js,
          '__P4_HERO_JPEG_B64__' not in js]
ok = all((p if isinstance(p, bool) else p in base) for p in probes)
# body identical to phase3 body
b3 = P3.read_text(encoding='utf-8')
def body(t):
    a = t.rfind('<body>'); b = t.rfind('</body>')
    return t[a:b] if a >= 0 and b >= 0 else None
same = body(base) == body(b3)

print('wrote %s  (%.2f MB)' % (OUT, OUT.stat().st_size / 1e6))
print('probes:', {str(p)[:60]: (p if isinstance(p, bool) else p in base) for p in probes})
print('phase3 body identical: %r' % same)
sys.exit(0 if ok and same else 1)
