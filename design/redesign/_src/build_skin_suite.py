#!/usr/bin/env python3
"""STUDIO OF SIDECARS · PHASE 2 PREMIUM FINISH SKIN — MASTER BUILD SUITE
Produces:
  1) skin/premium_tokens.css    design tokens
  2) skin/premium_finish.css    component finish rules
  3) skin/premium_icons.svg     premium SVG icon family (sprite)
  4) skin/premium_icons.js      presentational glyph->sprite pass
  5) studio_sidecars_premium_finish.html   canonical <body> byte-identical + skin
The locked Phase-1 shell is never written."""
import re, os, sys, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, '_src')
SKIN = os.path.join(ROOT, 'skin')
SHELL= os.path.join(ROOT, '..', 'studio_sidecars_premium_ui.html')
OUT  = os.path.join(ROOT, 'studio_sidecars_premium_finish.html')
LIVE = ('--live' in sys.argv)   # --live → skin the Phase-2 interactive instead
if LIVE:
    SHELL= os.path.join(ROOT, '..', 'phase2', 'studio_sidecars_phase2_interactive.html')
    OUT  = os.path.join(ROOT, 'studio_sidecars_cinematic.html')

# ---------------------------------------------------------------- icons ----
I = {
 'coffee':'<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5Z"/><path d="M8 2v2"/><path d="M12 2v2"/>',
 'camera':'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
 'phone':'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
 'cube':'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
 'film':'<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
 'archive':'<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
 'palette':'<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.1-.8-.4-1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.6-1.6H17c3 0 5.4-2.4 5.4-5.4C22.4 6.2 17.9 2 12 2z"/>',
 'bike':'<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
 'sofa':'<rect x="3" y="10" width="18" height="6.5" rx="3"/><path d="M7 16.5V21M17 16.5V21M6 10V6.5A2.5 2.5 0 0 1 8.5 4h7A2.5 2.5 0 0 1 18 6.5V10"/>',
 'bulb':'<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
 'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 'sunset':'<path d="M12 10V2"/><path d="m4.9 10.9 1.4 1.4"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m17.7 12.3 1.4-1.4"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
 'upload':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
 'lock':'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
 'star':'<path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.7l-5.8 3 1.1-6.5L2.6 9.3l6.5-.9z"/>',
 'up':'<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
 'dl':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
 'check':'<path d="M20 6 9 17l-5-5"/>',
 'play':'<path d="M8 5v14l11-7z"/>',
}
def sprite_markup():
    sym=''.join('<symbol id="pi-%s" viewBox="0 0 24 24">%s</symbol>'%(k,v) for k,v in I.items())
    return '<svg xmlns="http://www.w3.org/2000/svg" id="pi-sprite" style="display:none" aria-hidden="true">'+sym+'</svg>'

# ------------------------------------------------------------- css split ----
cin = open(os.path.join(SRC,'cinematic.css'),encoding='utf-8').read()
fin = open(os.path.join(SRC,'fin_extra.css'),encoding='utf-8').read()
k = cin.find(':root{')
assert k>=0
start=k+len(':root{'); depth=1; p=start
while depth>0 and p<len(cin):
    if cin[p]=='{': depth+=1
    elif cin[p]=='}': depth-=1
    p+=1
root_block=cin[k:p]
rest=cin[:k]+cin[p:]

TOK_EXTRA="""
  /* ---- premium skin tokens (master): type scale · spacing · glass ---- */
  --t-display:20px; --t-display-w:800; --t-display-lh:1.1;
  --t-body:13px;    --t-body-w:650;    --t-body-lh:1.45;
  --t-body-sm:12.5px;
  --t-meta:10.5px;  --t-meta-lh:1.4;
  --t-caption:9.5px;
  --t-eyebrow:10px; --t-eyebrow-ls:.24em;
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:24px; --sp-6:32px;
  --glass-panel:rgba(14,17,23,.62);
  --glass-rail:rgba(8,10,14,.55);
  --hairline:rgba(255,255,255,.075);
  --touch-min:38px;
"""
tokens_css=('/* ================================================================\n'
 '   PREMIUM TOKENS · Studio of Sidecars Premium Finish Skin (Phase 2)\n'
 '   Single source: colour · glass · type scale · spacing · radius · elevation.\n'
 '   Component rules live in premium_finish.css\n'
 '   ================================================================ */\n')
tokens_css += root_block[:-1] + TOK_EXTRA + '\n}\n'

TYPE_TAIL="""
/* ================================================================
   TYPE SCALE (premium skin) — three levels + Honor Pad floor.
   Display: 13.5-16 · Body: 13+ · Meta: 10.5 desk / 11.5+ pad.
   ================================================================ */
#soTitle{font-size:16px;letter-spacing:-.015em}
#soTag{font-size:9px;letter-spacing:.22em}
.vchip{font-size:12.5px;font-weight:650}
details.group>summary .gn{font-size:13.5px}
details.group>summary .gc{font-size:9.5px}
.vrow .vn b{font-size:13px}
.vrow .vn span{font-size:10.5px}
.proj-row .pi b{font-size:13px}
.proj-row .pi span{font-size:10.5px}
.tile b{font-size:12px;font-weight:650}
.tile span{font-size:10px}
.tag{font-size:12px}
details.card>summary .ct b{font-size:13.5px}
details.card>summary .ct span{font-size:10px}
.field label{font-size:11px;letter-spacing:.05em}
.rchip{font-size:12.5px}
.mat-row .mn b{font-size:13px}
.mat-row .mn span{font-size:10px}
.micro .m b{font-size:11.5px}
.micro .m{font-size:9.5px}
.abtn{font-size:13px;font-weight:700}
.dk-btn{font-size:10px;font-weight:800}
.tray .tray-lbl{font-size:9px}
.tray-row .rchip,.tray .pr-tile .tt{font-size:12px}
.cv-toggle label{font-size:12px}
.cv-tag{font-size:12px}
.cv-status .pill{font-size:11.5px}
.cv-hint{font-size:12px}
.cv-legend{font-size:9.5px}
.phead .t{font-size:10.5px}
.phead .s{font-size:12px}
.side-foot b{font-size:12.5px}
.side-foot span{font-size:10.5px}
/* honor pad readability floor */
@media (max-width:1240px) and (orientation:landscape), (max-width:900px){
  .vrow .vn span,.proj-row .pi span,.tile span,.mat-row .mn span,
  details.card>summary .ct span,.side-foot span,.phead .s{font-size:11.5px}
  .vrow .vn b,.proj-row .pi b,.mat-row .mn b,.tile b{font-size:13.5px}
  .rchip{font-size:13px}
  .abtn{font-size:13px}
  .tag{font-size:12.5px}
  .field label{font-size:11.5px}
}
"""
finish_css = rest + fin + '\n' + TYPE_TAIL

# ------------------------------------------------------------ icon script --
js = open(os.path.join(SRC,'cinematic.js'),encoding='utf-8').read()
# 1) sprite bootstrap injected at top
sprite_html = sprite_markup().replace("'", "\\'")
boot = ("(function(){\n"
        "  try{\n"
        "    if(!document.getElementById('pi-sprite')){\n"
        "      var h=document.createElement('span');\n"
        "      h.innerHTML='"+sprite_html+"';\n"
        "      var s=h.firstChild;\n"
        "      (document.head||document.documentElement).appendChild(s);\n"
        "    }\n"
        "  }catch(e){}\n"
        "})();\n")
# 2) swap inline-path svg() for sprite <use> svg()
f0=js.find('function svg(')
f1=js.find('\n}', f0)
use_svg = "function svg(name,size){\n" \
          "  return '<svg class=\"pi pi-'+name+'\" viewBox=\"0 0 24 24\" width=\"'+size+'\" height=\"'+size+'\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><use href=\"#pi-'+name+'\"/></svg>';\n}"
js = js[:f0] + use_svg + js[f1+2:]
# 3) drop the now-unused inline ICONS literal
js = re.sub(r'var ICONS=\{[^}]*\};\n','',js,count=1)
icons_js = boot + '\n' + js

# ------------------------------------------------------------ write assets -
os.makedirs(SKIN, exist_ok=True)
open(os.path.join(SKIN,'premium_tokens.css'),'w',encoding='utf-8').write(tokens_css)
open(os.path.join(SKIN,'premium_finish.css'),'w',encoding='utf-8').write(finish_css)
svg_art = '<!-- premium_icons.svg · Studio of Sidecars icon family · 24×24 · stroke 1.6 -->\n' + sprite_markup()
open(os.path.join(SKIN,'premium_icons.svg'),'w',encoding='utf-8').write(svg_art)
open(os.path.join(SKIN,'premium_icons.js'),'w',encoding='utf-8').write(icons_js)
print('skin assets:', sorted(os.listdir(SKIN)))

# ------------------------------------------------------------ build html ---
def body_of(html):
    a=html.find('<html'); b=html.find('<body',a); e=html.rfind('</body>')+len('</body>')
    return html[b:e]
s=open(SHELL,encoding='utf-8').read(); body_orig=body_of(s)
head_close=s.rindex('</head>')
inject=('\n<style id="skin-tokens">\n'+tokens_css+'\n</style>\n'
        '\n<style id="skin-premium">\n'+finish_css+'\n</style>\n')
s=s[:head_close]+inject+s[head_close:]
html_close=s.rindex('</html>')
s=s[:html_close]+'\n<script id="skin-icons" data-skin="premium">\n'+icons_js+'\n</script>\n'+s[html_close:]
note=('<!-- PREMIUM FINISH SKIN (Phase 2 master) -- overlay skin.\\n'
      '     Static canonical: <body> byte-for-byte identical to the Phase-1 shell;\\n'
      '     Live mode: derivative of the Phase-2 interactive prototype.\\n'
      '     Skin blocks: #skin-tokens \\u00b7 #skin-premium \\u00b7 #skin-icons (runtime sprite).\\n'
      '     Render canonical = omit these blocks. Engine code is unchanged. -->\\n')
s=s.replace('<!doctype html>','<!doctype html>\\n'+note,1)
if LIVE:
    s=s.replace('<title>Studio of Sidecars \\u2014 Phase 2 \\u00b7 Interactive Prototype</title>',
                '<title>Studio of Sidecars \\u2014 Cinematic UI (Premium Finish)</title>')
else:
    s=s.replace('<title>Studio of Sidecars \\u2014 Premium UI (Phase 1 Final)</title>',
                '<title>Studio of Sidecars \\u2014 Premium Finish Skin</title>')
open(OUT,'w',encoding='utf-8').write(s)
print('wrote',OUT,'%.1f MB'%(os.path.getsize(OUT)/1e6))
if LIVE:
    print('mode: live (phase-2 interactive derivative)')
else:
    print('body identical to canonical:', body_of(s)==body_orig)
    t=s[s.find('<body'):]; KEEP={'\u25cf','\u25cb','\u2022'}
    left=sorted({ch for ch in t if unicodedata.category(ch)=='So' and ch not in KEEP})
    print('residual symbols (source, swapped at runtime):', left if left else 'NONE')
