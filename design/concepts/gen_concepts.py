#!/usr/bin/env python3
# Studio of Sidecars — 5 premium UI concepts (desktop + Honor Pad landscape)
# Pure-vector artboard composer -> SVG -> rasterized to PNG. No HTML/CSS app shipped.
import math, os, re

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'exported')
os.makedirs(OUT, exist_ok=True)

# ---------------- design tokens ----------------
BG   = '#0B0D10'
INK  = '#EDF2F8'
SUB  = 'rgba(237,242,248,0.60)'
FNT  = 'rgba(237,242,248,0.36)'
BLU  = '#5B9BFF'
BLU2 = '#7FB1FF'
LINE = 'rgba(255,255,255,0.10)'
LINES= 'rgba(255,255,255,0.055)'

IC = {  # minimal 24x24 stroke icon paths (stroke-linecap round unless noted)
 'cube':'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
 'sphere':'<circle cx="12" cy="12" r="8.2"/><ellipse cx="12" cy="12" rx="8.2" ry="3.4"/><path d="M4 12h16"/>',
 'light':'<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.2 5.2l1.9 1.9M16.9 16.9l1.9 1.9M18.8 18.8l-1.9-1.9M7.1 7.1 5.2 5.2"/>',
 'cam':'<path d="M14.6 4.4h-5.2L7.2 7H4.4a2 2 0 0 0-2 2v8.6a2 2 0 0 0 2 2h15.2a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2.8z"/><circle cx="12" cy="13" r="3.4"/>',
 'palette':'<path d="M12 3.2a8.8 8.8 0 1 0 0 17.6h1a1.6 1.6 0 0 0 1.2-2.6 1.6 1.6 0 0 1 1.3-2.6h2a4.9 4.9 0 0 0 4.9-4.9c0-4.2-4.5-7.5-10.4-7.5z"/><circle cx="7.8" cy="9.4" r="1.1"/><circle cx="10.6" cy="6.7" r="1.1"/><circle cx="14.2" cy="6.9" r="1.1"/><circle cx="17" cy="9.6" r="1.1"/>',
 'rotate':'<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v3.4h-3.4"/>',
 'plus':'<path d="M12 5v14M5 12h14"/>',
 'minus':'<path d="M5 12h14"/>',
 'reset':'<path d="M4.8 9A8 8 0 1 1 4 12"/><path d="M4.6 4.6V9H9"/>',
 'maximize':'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
 'sliders':'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
 'play':'<path d="M8 5.5v13l11-6.5z"/>',
 'share':'<path d="M12 15V4M8.5 7.5 12 4l3.5 3.5"/><path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/>',
 'save':'<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
 'heart':'<path d="M12 20.5S4 15.2 4 9.8A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.8c0 5.4-8 10.7-8 10.7z"/>',
 'grid':'<rect x="4" y="4" width="6.6" height="6.6" rx="1.4"/><rect x="13.4" y="4" width="6.6" height="6.6" rx="1.4"/><rect x="4" y="13.4" width="6.6" height="6.6" rx="1.4"/><rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.4"/>',
 'droplet':'<path d="M12 3.5s6 6.4 6 10.4a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z"/>',
 'select':'<path d="M5 4l5 15 2.6-5.6L18 12z"/>',
 'hand':'<path d="M7.5 12V6.6a1.6 1.6 0 0 1 3.2 0V11M10.7 11V5.4a1.6 1.6 0 0 1 3.2 0V11M13.9 11.2V7a1.6 1.6 0 0 1 3.2 0v6.4c0 4-2.4 6.4-5.4 6.4-3 0-4.9-2-4.9-2l-1.9-3.2a1.6 1.6 0 0 1 2.4-2z"/>',
 'chevL':'<path d="M14.5 6 8.5 12l6 6"/>',
 'chevR':'<path d="M9.5 6l6 6-6 6"/>',
 'chevU':'<path d="M6 14.5l6-6 6 6"/>',
 'chevD':'<path d="M6 9.5l6 6 6-6"/>',
 'scan':'<rect x="3.5" y="6" width="17" height="12.5" rx="2.6"/><circle cx="12" cy="12.2" r="2.3"/>',
 'camera':'<path d="M4 8h2.2l1.6-2.2h8.4L17.8 8H20a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.2"/>',
 'focus':'<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="2.6"/><path d="M12 2.4v3.4M12 18.2v3.4M2.4 12h3.4M18.2 12h3.4"/>',
 'bolt':'<path d="M13 2.5 5.5 13H11l-1 8.5L17.5 11H12z"/>',
 'export':'<path d="M12 15V4M8.5 7.5 12 4l3.5 3.5"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
 'orbit':'<ellipse cx="12" cy="12" rx="9" ry="4.4"/><circle cx="12" cy="7.6" r="1"/><path d="M3.6 12v0a9.6 8.8 0 0 0 16.8 0"/>',
 'ring':'<circle cx="12" cy="12" r="7.4"/><circle cx="12" cy="12" r="2.4"/>',
 'layers':'<path d="M12 3 3.5 7.5 12 12l8.5-4.5z"/><path d="M3.5 12 12 16.5l8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
 'move':'<path d="M12 2.6V21.4M2.6 12h18.8M6 6l6-6 6 6M6 18l6 6 6-6M18 6l6 6-6 6M6 6l-6 6 6 6"/>'.replace('M6 6l6-6 6 6','M12 6l6-6 6 6').replace('M6 18l6 6 6-6','M12 18l-6 6-6-6'),
 'wand':'<path d="M6 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/><path d="M18 13l.9 1.8 1.9.9-1.9.9L18 18.4l-.9-1.8-1.9-.9 1.9-.9z"/><path d="M11 5l9 9-1.8 1.8-9-9z"/>',
}

def icon(name, x, y, s, stroke='currentColor', w=1.6, o=1.0):
    return (f'<g transform="translate({x},{y})" fill="none" stroke="{stroke}" stroke-width="{w}" '
            f'stroke-linecap="round" stroke-linejoin="round" opacity="{o}">'
            f'<g transform="translate(0,0) scale({s/24})">' + IC[name] + '</g></g>')

def iconset(entries, parent_grp=False):
    return ''.join(icon(n, x, y, s, st, w, o) for n, x, y, s, st, w, o in entries)

def esc(txt):
    return (txt.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))

def T(x, y, s, txt, size, fill=INK, fam='Inter', wgt=400, ls=0, anchor='start', op=1.0, italic=False, style=None):
    txt = esc(txt)
    stl = ' font-style="italic"' if italic else ''
    if style: stl += style
    lsp = f' letter-spacing="{ls}em"' if ls else ''
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-family="{fam}" font-weight="{wgt}" font-size="{size}" '
            f'fill="{fill}" text-anchor="{anchor}"{lsp}{stl} opacity="{op}">{txt}</text>')

def W1(est, maxw):  # shrink font if too wide
    return est

def tw(txt, size, fam='Inter'):
    m = 0.58 if fam == 'Inter' else 0.56
    return len(txt) * size * m

def glass(x, y, w, h, r=18, base='rgba(9,11,15,0.46)', stroke=LINE, sheen=True, blur=True):
    g = f'<g>'
    if blur:
        g += f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r}" fill="rgba(0,0,0,0.42)" filter="url(#softBlur)" opacity="0.7"/>'
    g += f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r}" fill="{base}"/>'
    if sheen:
        g += (f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r}" '
              f'fill="url(#sheenV)"/>')
    g += f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r}" fill="none" stroke="{stroke}"/>'
    g += '</g>'
    return g

def hairline(x1, y, x2, stroke='rgba(255,255,255,0.09)', opacity=1):
    return f'<line x1="{x1:.1f}" y1="{y:.1f}" x2="{x2:.1f}" y2="{y:.1f}" stroke="{stroke}" opacity="{opacity}"/>'

def roundBtn(x, y, d, ic, fill='rgba(15,18,24,0.4)', stroke=LINE, icc='rgba(255,255,255,0.75)', isz=17, sw=1.5):
    r = d / 2
    return (f'<g><circle cx="{x}" cy="{y}" r="{r}" fill="rgba(0,0,0,0.34)" filter="url(#softBlur)" opacity="0.75"/>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"/>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#sheenC)"/>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{stroke}"/>' +
            icon(ic, x - isz / 2, y - isz / 2, isz, icc, sw) + '</g>')

def gloss_disc(cx, cy, r, grad='discGrad'):
    pass

def px_rect_overlay(w, h, fill):
    return f'<rect width="{w}" height="{h}" fill="{fill}"/>'

# -----------------------------------------------------------------------------------
# shared defs
def defs_block():
    return f'''<defs>
 <radialGradient id="spot" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="rgba(255,255,255,0.16)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/></radialGradient>
 <radialGradient id="vign" cx="0.5" cy="0.5" r="0.72"><stop offset="0.55" stop-color="rgba(4,5,7,0)"/><stop offset="1" stop-color="rgba(4,5,7,0.6)"/></radialGradient>
 <linearGradient id="sheenV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,255,255,0.10)"/><stop offset="0.45" stop-color="rgba(255,255,255,0.025)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/></linearGradient>
 <radialGradient id="sheenC" cx="0.5" cy="0.32" r="0.6"><stop offset="0" stop-color="rgba(255,255,255,0.12)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/></radialGradient>
 <radialGradient id="discGrad" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="rgba(255,255,255,0.10)"/><stop offset="0.7" stop-color="rgba(255,255,255,0.02)"/><stop offset="1" stop-color="rgba(255,255,255,0.10)"/></radialGradient>
 <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(91,155,255,0)"/><stop offset="0.6" stop-color="rgba(91,155,255,0.05)"/><stop offset="1" stop-color="rgba(91,155,255,0.10)"/></linearGradient>
 <filter id="softBlur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="14"/></filter>
 <filter id="miniBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>'''

def svg_open(w, h):
    return f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
def svg_close():
    return '</svg>'

FONTCSS = ('<style>@import url("../fonts/faces.css");'
           'text{font-variant-numeric:tabular-nums;}</style>')

# base layers: product image full bleed + light adjustments
def product_layer(w, h, asset, floor_boost=0.0, accent_hue=False):
    # full-bleed cover image of the render
    lay = f'<image x="0" y="0" width="{w}" height="{h}" preserveAspectRatio="xMidYMid slice" href="{asset}"/>'
    return lay

# -----------------------------------------------------------------------------------
# CONCEPT A — Apple Minimal Studio (camera, floating micro glass, near-invisible chrome)
def conceptA(w, h, asset, tablet=False):
    u = h / 900.0
    m = w * 0.033
    parts = []
    parts.append(product_layer(w, h, asset))
    # tone: cool, airy center, gentle floor sheen, soft vignette
    cx, cy = w / 2, h * 0.40
    parts.append(f'<ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="{w*0.55:.0f}" ry="{h*0.42:.0f}" fill="rgba(255,255,255,0.05)"/>')
    parts.append(f'<ellipse cx="{w*0.5:.0f}" cy="{h*0.52:.0f}" rx="{w*0.16:.0f}" ry="{h*0.05:.0f}" fill="rgba(120,170,255,0.10)"/>')
    parts.append('<rect width="%d" height="%d" fill="url(#vign)"/>' % (w, h))
    parts.append('<rect width="%d" height="%d" fill="url(#floorGrad)" opacity="0.5"/>' % (w, h))
    # top wordmark, centered, tiny
    parts.append(hairline(w*0.5-190*u, h*0.072, w*0.5-40*u, 'rgba(255,255,255,0.22)', 0.55))
    parts.append(hairline(w*0.5+40*u, h*0.072, w*0.5+190*u, 'rgba(255,255,255,0.22)', 0.55))
    parts.append(T(w/2, h*0.052, '', 'STUDIO OF SIDECARS', 10.5*u, 'rgba(244,248,253,0.72)', 'Inter', 600, 0.34, 'middle'))
    # top right: two whisper icons
    rx = w - m - 22*u
    parts.append(roundBtn(rx, 34*u, 44*u, 'share', 'rgba(10,12,16,0.28)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.66)', 18*u, 1.5))
    parts.append(roundBtn(rx-54*u, 34*u, 44*u, 'save', 'rgba(10,12,16,0.28)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.66)', 18*u, 1.5))
    # floating segmented control (icons only), bottom-center
    cw = 5*58 + 4*10 + 24
    sw_, sh_ = cw*u, 64*u
    bx, by = w/2 - sw_/2, h*0.885
    parts.append(glass(bx, by, sw_, sh_, 22*u, base='rgba(9,11,16,0.42)'))
    iconsA = [('rotate', bx+12), ('light', bx+12+58), ('sphere', bx+12+116), ('palette', bx+12+174), ('cam', bx+12+232)]
    for i, (icn, ix) in enumerate(iconsA):
        cx2 = ix + 29*u
        if i == 0:
            parts.append(f'<rect x="{ix+6*u:.0f}" y="{by+7*u:.0f}" width="{46*u:.0f}" height="{50*u:.0f}" rx="15" fill="rgba(255,255,255,0.07)"/>')
        parts.append(icon(icn, cx2-12*u, by+32*u-12*u, 24*u, 'rgba(255,255,255,0.92)' if i == 0 else 'rgba(255,255,255,0.45)', 1.5, 1.0))
        if i < 4:
            parts.append(f'<line x1="{cx2+29*u:.0f}" y1="{by+16*u:.0f}" x2="{cx2+29*u:.0f}" y2="{by+sh_-16*u:.0f}" stroke="rgba(255,255,255,0.07)"/>')
    # bottom-left micro caption
    parts.append(T(m, h*0.942, '', 'OBSIDIAN · CAMERA', 23*u, INK, 'Space Grotesk', 600, -0.005, 'start'))
    parts.append(T(m, h*0.942+30*u, '', 'MIRRORLESS — 45 MM  F/1.4  ·  MATTE ONYX  ·  640 G', 11*u, 'rgba(237,242,248,0.5)', 'Inter', 500, 0.06, 'start'))
    parts.append(T(m, h*0.942+47*u, '', 'OBJ N° 04', 9.5*u, 'rgba(237,242,248,0.3)', 'Inter', 600, 0.16, 'start'))
    # bottom-right round capture button
    capx, capy = w-m, h*0.905
    parts.append(f'<circle cx="{capx:.0f}" cy="{capy:.0f}" r="42*u" fill="none" stroke="rgba(255,255,255,0.16)" opacity="0"/>')
    parts.append(f'<circle cx="{capx:.0f}" cy="{capy:.0f}" r="26*u" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.35)"/>')
    parts.append(f'<circle cx="{capx:.0f}" cy="{capy:.0f}" r="10*u" fill="rgba(255,255,255,0.85)"/>')
    parts.append(f'<circle cx="{capx:.0f}" cy="{capy:.0f}" r="15*u" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>')
    parts.append(T(capx, capy+46*u, '', 'CAPTURE', 8.5*u, 'rgba(237,242,248,0.4)', 'Inter', 600, 0.3, 'middle'))
    return parts

# -----------------------------------------------------------------------------------
# CONCEPT B — Automotive Configurator (motorcycle showroom, big info + step dock)
def conceptB(w, h, asset, tablet=False):
    u = h / 900.0
    m = w * 0.030
    parts = []
    parts.append(product_layer(w, h, asset))
    # showroom floor boost, horizon sheen
    parts.append(f'<ellipse cx="{w*0.5:.0f}" cy="{h*0.62:.0f}" rx="{w*0.5:.0f}" ry="{h*0.16:.0f}" fill="rgba(255,255,255,0.045)"/>')
    parts.append(hairline(w*0.06, h*0.715, w*0.94, 'rgba(150,190,255,0.10)'))
    parts.append(hairline(w*0.06, h*0.718, w*0.94, 'rgba(0,0,0,0.3)'))
    parts.append('<rect width="%d" height="%d" fill="url(#vign)"/>' % (w, h))
    parts.append('<rect width="%d" height="%d" fill="url(#floorGrad)" opacity="0.6"/>' % (w, h))
    # brand monogram top-left + config file
    parts.append(T(m+2, 40*u, '', 'SC', 20*u, '#FFFFFF', 'Space Grotesk', 700, 0.1))
    parts.append(T(m+2+34*u, 40*u, '', 'VELOCE  —  CONFIGURATOR  2026', 9.5*u, 'rgba(237,242,248,0.42)', 'Inter', 600, 0.22))
    # top-right pills
    pxr = w - m - 0
    parts.append(glass(pxr-170*u, 22*u, 76*u, 40*u, 13*u, base='rgba(9,11,16,0.35)'))
    parts.append(T(pxr-132*u, 22*u+25*u, '', 'SAVE', 10*u, 'rgba(255,255,255,0.75)', 'Inter', 600, 0.14, 'middle'))
    parts.append(glass(pxr-86*u, 22*u, 86*u, 40*u, 13*u, base='rgba(9,11,16,0.35)'))
    parts.append(T(pxr-43*u, 22*u+25*u, '', 'SHARE', 10*u, 'rgba(255,255,255,0.75)', 'Inter', 600, 0.14, 'middle'))
    # hero text lower-left (on floor)
    lx = m + 8*u
    parts.append(T(lx, h-150*u, '', 'VELOCE R1', 58*u, INK, 'Space Grotesk', 700, -0.012))
    parts.append(T(lx, h-116*u, '', 'CAFÉ RACER   ·   935 CC / 96 HP   ·   DUAL-SPORT TYRES', 12*u, 'rgba(237,242,248,0.55)', 'Inter', 500, 0.10))
    parts.append(T(lx, h-95*u, '', 'CONFIG N° 07 — MODIFICATIONS UNSAVED', 9*u, 'rgba(237,242,248,0.3)', 'Inter', 600, 0.2))
    # CTA pills
    parts.append(glass(lx, h-70*u, 128*u, 44*u, 14*u, base='#EEF3FA'))
    parts.append(T(lx+64*u, h-70*u+27*u, '', 'CONFIGURE', 11*u, '#0B0D10', 'Inter', 700, 0.1, 'middle'))
    parts.append(f'<rect x="{lx+142*u:.0f}" y="{h-70*u:.0f}" width="{128*u:.0f}" height="{44*u:.0f}" rx="14" fill="none" stroke="rgba(255,255,255,0.28)"/>')
    parts.append(T(lx+142*u+64*u, h-70*u+27*u, '', 'SPECS', 11*u, 'rgba(255,255,255,0.85)', 'Inter', 600, 0.12, 'middle'))
    # color swatches pill (between hero and dock bottom center?) -> put above dock right? place near hero
    parts.append(T(lx, h-70*u, '', '', 0.01))  # noop
    # step dock bottom center
    dstr = ['EXTERIOR', 'INTERIOR', 'FINISH', 'SOUND', 'DRIVE']
    iw = 132*u
    cw2 = len(dstr)*iw + 16*u
    bx = w/2 - cw2/2 + 8*u
    by = h-88*u
    parts.append(glass(bx-8*u, by, cw2, 58*u, 18*u, base='rgba(8,10,14,0.5)'))
    for i, lab in enumerate(dstr):
        ix = bx + i*iw
        if i == 0:
            parts.append(f'<rect x="{ix-4*u:.0f}" y="{by+8*u:.0f}" width="{iw-8*u:.0f}" height="{42*u:.0f}" rx="12" fill="rgba(255,255,255,0.86)"/>')
            parts.append(T(ix + iw/2, by+32*u, '', lab, 10.5*u, '#0B0D10', 'Inter', 700, 0.10, 'middle'))
        else:
            parts.append(T(ix + iw/2, by+32*u, '', lab, 10.5*u, 'rgba(237,242,248,0.5)', 'Inter', 600, 0.10, 'middle'))
    parts.append(T(bx + cw2 - 8*u - 60*u, by+47*u, '', '', 0.1))
    # color dot chips appended inside right area of dock? place to dock right side externally
    dotx = bx + cw2 + 30*u
    dots = ['#F4F1EA', '#11141A', '#C7A15B', '#8A2E2E', '#5B9BFF']
    for i, c in enumerate(dots):
        parts.append(f'<circle cx="{dotx+i*26*u:.0f}" cy="{by+29*u:.0f}" r="{7.5*u:.0f}" fill="{c}" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>')
    if len(dots) >= 1:
        parts.append(f'<circle cx="{dotx:.0f}" cy="{by+29*u:.0f}" r="10.5*u" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.4" opacity="0"/>')
    # right floating control column
    ccx = w - m - 30*u
    cy0 = h/2 - 130*u
    cw_ = 56*u
    parts.append(glass(ccx-cw_/2, cy0-14*u, cw_, 288*u, 20*u, base='rgba(8,10,14,0.4)'))
    tools = ['zoom+', 'zoom-', None, 'orbit', 'reset', None, 'fov', 'save']
    byy = cy0 - 14*u
    for k, t in enumerate(tools):
        iy = byy + 20*u + k*34*u
        if t is None:
            parts.append(hairline(ccx-14*u, iy, ccx+14*u, 'rgba(255,255,255,0.08)'))
            continue
        if t == 'zoom+':
            parts.append(icon('plus', ccx-11*u, iy-11*u, 22*u, 'rgba(255,255,255,0.7)', 1.7))
        elif t == 'zoom-':
            parts.append(icon('minus', ccx-11*u, iy-11*u, 22*u, 'rgba(255,255,255,0.7)', 1.7))
        elif t == 'fov':
            parts.append(icon('focus', ccx-11*u, iy-11*u, 22*u, 'rgba(255,255,255,0.7)', 1.7))
        else:
            parts.append(icon(t, ccx-11*u, iy-11*u, 22*u, 'rgba(255,255,255,0.7)', 1.7))
    return parts

# -----------------------------------------------------------------------------------
# CONCEPT C — Creator Workspace (chair; modular floating tools + contextual)
def conceptC(w, h, asset, tablet=False):
    u = h / 900.0
    m = w * 0.026
    parts = []
    parts.append(product_layer(w, h, asset))
    parts.append('<rect width="%d" height="%d" fill="url(#vign)"/>' % (w, h))
    parts.append('<rect width="%d" height="%d" fill="url(#floorGrad)" opacity="0.35"/>' % (w, h))
    # top floating glass strip (mac-style unified): traffic dots + breadcrumb + actions
    tx, ty, th, tw2 = m, 20*u, 58*u, w - 2*m
    parts.append(glass(tx, ty, tw2, th, 20*u, base='rgba(10,12,17,0.5)'))
    for i, c in enumerate(['#FF5F57', '#FEBC2E', '#28C840']):
        parts.append(f'<circle cx="{tx+24*u+i*18*u:.0f}" cy="{ty+th/2:.0f}" r="5.5*u" fill="{c}" opacity="0.92"/>')
    # brand + project
    parts.append(T(tx+90*u, ty+th/2+4*u, '', 'SOF — CREATOR', 12*u, 'rgba(255,255,255,0.95)', 'Space Grotesk', 600, 0.02))
    parts.append(T(tx+200*u, ty+th/2+4*u, '', '›', 13*u, 'rgba(255,255,255,0.3)', 'Inter', 400))
    parts.append(T(tx+226*u, ty+th/2+4*u, '', 'KAYA LOUNGE', 12*u, 'rgba(255,255,255,0.62)', 'Inter', 500))
    parts.append(T(tx+226*u + tw('KAYA LOUNGE', 12)*1 + 20*u, ty+th/2+4*u, '', 'SHADING', 12*u, 'rgba(255,255,255,0.95)', 'Inter', 600, 0.02))
    # right side actions
    ax = tx + tw2 - 34*u
    parts.append(icon('grid', ax-34*u, ty+20*u, 20*u, 'rgba(255,255,255,0.55)', 1.5))
    parts.append(icon('export', ax, ty+20*u, 20*u, 'rgba(255,255,255,0.75)', 1.5))
    # left vertical tool rail
    rx = m + 10*u
    ry = ty + th + 30*u
    rh = 8*52 + 60*u
    parts.append(glass(rx-10*u, ry-14*u, 62*u, rh, 19*u, base='rgba(10,12,17,0.42)'))
    tools = ['select', 'move', 'light', 'cube', 'palette', 'layers', 'focus', 'plus']
    for i, t in enumerate(tools):
        iy = ry + 20*u + i*52*u
        if t == 'select':
            parts.append(f'<rect x="{rx+4*u:.0f}" y="{iy-16*u:.0f}" width="{44*u:.0f}" height="{44*u:.0f}" rx="13" fill="rgba(91,155,255,0.16)"/>')
            parts.append(f'<rect x="{rx+4*u:.0f}" y="{iy-16*u:.0f}" width="{44*u:.0f}" height="{44*u:.0f}" rx="13" fill="none" stroke="rgba(129,173,255,0.55)"/>')
            parts.append(icon(t, rx+13*u, iy-9*u, 22*u, '#CFE0FF', 1.6))
        else:
            parts.append(icon(t, rx+13*u, iy-9*u, 22*u, 'rgba(255,255,255,0.5)', 1.5))
    parts.append(hairline(rx-4*u, ry+8*52+6*u, rx+46*u, 'rgba(255,255,255,0.08)'))
    # contextual card (right)
    cw_ = (w - 2*m) - (rx + 62*u + m)
    cwd = min(270*u, cw_ * 0.30)
    cxx = w - m - cwd
    cyy = ty + th + 30*u
    # right card floating
    parts.append(glass(cxx, cyy, cwd, 300*u, 20*u, base='rgba(10,12,17,0.46)'))
    parts.append(T(cxx+20*u, cyy+28*u, '', 'SELECTED OBJECT', 9*u, 'rgba(237,242,248,0.36)', 'Inter', 700, 0.18))
    parts.append(T(cxx+20*u, cyy+52*u, '', 'KAYA — SHELL', 17*u, INK, 'Space Grotesk', 600))
    parts.append(T(cxx+20*u, cyy+71*u, '', 'FURNITURE / LOUNGE · LOD 0', 9.5*u, 'rgba(237,242,248,0.4)', 'Inter', 500, 0.06))
    parts.append(hairline(cxx+20*u, cyy+88*u, cxx+cwd-20*u, LINE))
    # material chips w/ swatches
    mats = [('BONE', '#F3EBDD', True), ('GRAPHITE', '#2A2E35', False), ('COPPER', '#B06F45', False)]
    x = cxx + 20*u
    for nm, cc, act in mats:
        wd = 26 + len(nm)*7.2
        parts.append(f'<rect x="{x:.0f}" y="{cyy+102*u:.0f}" width="{wd*u:.0f}" height="{36*u:.0f}" rx="11" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)"/>')
        parts.append(f'<circle cx="{x+15*u:.0f}" cy="{cyy+120*u:.0f}" r="6*u" fill="{cc}" stroke="rgba(255,255,255,0.3)"/>')
        parts.append(T(x+27*u, cyy+120*u+3*u, '', nm, 8*u, 'rgba(255,255,255,0.7)', 'Inter', 700, 0.06))
        x += wd*u + 8*u
    # property sliders
    def slider(yy, label, val, pct):
        parts.append(T(cxx+20*u, yy, '', label, 9.5*u, 'rgba(237,242,248,0.55)', 'Inter', 600, 0.10))
        parts.append(T(cxx+cwd-20*u, yy, '', val, 9.5*u, 'rgba(237,242,248,0.85)', 'Inter', 600, 0, 'end'))
        track_w = cwd - 40*u
        parts.append(f'<rect x="{cxx+20*u:.0f}" y="{yy+13*u:.0f}" width="{track_w:.0f}" height="2" rx="1" fill="rgba(255,255,255,0.12)"/>')
        parts.append(f'<rect x="{cxx+20*u:.0f}" y="{yy+13*u:.0f}" width="{track_w*pct/100:.0f}" height="2" rx="1" fill="{BLU}"/>')
        parts.append(f'<circle cx="{cxx+20*u+track_w*pct/100:.0f}" cy="{yy+14*u:.0f}" r="5*u" fill="{BLU2}"/>')
    slider(cyy+170*u, 'ROUGHNESS', '0.32', 32)
    slider(cyy+220*u, 'SHEEN', '0.86', 86)
    slider(cyy+270*u, 'HDRI STRENGTH', '1.00', 100)
    # mini zoom context tag floating near product bottom-right of center
    ztx = w*0.5 + w*0.13
    zty = h*0.6
    parts.append(glass(ztx, zty, 74*u, 30*u, 10*u, base='rgba(10,12,17,0.35)'))
    parts.append(T(ztx+37*u, zty+19*u, '', 'FOV 40°', 9*u, 'rgba(255,255,255,0.75)', 'Inter', 600, 0.04, 'middle'))
    parts.append(icon('focus', ztx+16*u, zty+7*u, 15*u, 'rgba(255,255,255,0.4)', 1.4))
    # bottom timeline floating
    tlw = w - 2*m - (rx + 62*u + m) - cwd - 40*u
    tlx = rx + 62*u + m
    tly = h - 96*u
    tlh = 66*u
    parts.append(glass(tlx, tly, tlw, tlh, 18*u, base='rgba(10,12,17,0.44)'))
    # play + timecode
    parts.append(f'<circle cx="{tlx+30*u:.0f}" cy="{tly+33*u:.0f}" r="15*u" fill="rgba(255,255,255,0.08)"/>')
    parts.append(icon('play', tlx+30*u-8*u, tly+33*u-8*u, 16*u, 'rgba(255,255,255,0.8)', 1.6))
    parts.append(T(tlx+58*u, tly+38*u, '', '00:04:12', 10.5*u, 'rgba(237,242,248,0.7)', 'Space Grotesk', 500, 0.04))
    # scrubber
    sx = tlx + 150*u
    s_w = tlw - 190*u
    parts.append(hairline(sx, tly+33*u, sx+s_w, 'rgba(255,255,255,0.14)'))
    # keyframe ticks on the line
    for j in range(9):
        parts.append(f'<rect x="{sx + j*(s_w-8)/8:.0f}" y="{tly+27*u:.0f}" width="2" height="{12*u:.0f}" rx="1" fill="rgba(255,255,255,0.18)"/>')
    parts.append(f'<rect x="{sx + s_w*0.34:.0f}" y="{tly+33*u:.0f}" width="{s_w*0.34:.0f}" height="2" fill="{BLU}"/>')
    parts.append(f'<circle cx="{sx+s_w*0.34:.0f}" cy="{tly+34*u:.0f}" r="6*u" fill="{BLU2}"/>')
    parts.append(T(sx+s_w+18*u, tly+38*u, '', '0.4 / 1.2 s', 9*u, 'rgba(237,242,248,0.4)', 'Space Grotesk', 500))
    return parts

# -----------------------------------------------------------------------------------
# CONCEPT D — Museum Gallery (perfume; object as art; huge negative space)
def conceptD(w, h, asset, tablet=False):
    u = h / 900.0
    m = w * 0.035
    parts = []
    parts.append(product_layer(w, h, asset))
    # cool darkening + warm centre pool to read as gallery spotlight
    parts.append('<rect width="%d" height="%d" fill="rgba(6,7,9,0.35)"/>' % (w, h))
    cx, cy = w/2, h*0.47
    # can't reference f-string defined id dynamically ok because literal; reuse static def instead:
    parts.append(f'<ellipse cx="{cx:.0f}" cy="{h*0.40:.0f}" rx="{w*0.36:.0f}" ry="{h*0.34:.0f}" fill="url(#spot)" opacity="0.6"/>')
    parts.append('<rect width="%d" height="%d" fill="url(#vign)" opacity="1.1"/>' % (w, h))
    parts.append('<rect width="%d" height="%d" fill="url(#vign)"/>' % (w, h))
    # mat frame
    fw = min(22*u, w*0.02)
    parts.append(f'<rect x="{fw:.0f}" y="{fw:.0f}" width="{w-2*fw:.0f}" height="{h-2*fw:.0f}" fill="none" stroke="rgba(255,255,255,0.07)"/>')
    # top-left gallery caption
    parts.append(T(m+fw, h*0.09, '', 'STUDIO OF SIDECARS — GALLERY', 9*u, 'rgba(237,242,248,0.42)', 'Inter', 600, 0.34))
    # thin vertical divider + floor guide
    parts.append(hairline(w/2, h*0.845, w/2+90*u, 'rgba(255,255,255,0.16)'))
    # bottom center caption block
    by = h*0.855
    parts.append(hairline(w/2-230*u, by, w/2-70*u, 'rgba(255,255,255,0.28)'))
    parts.append(hairline(w/2+70*u, by, w/2+230*u, 'rgba(255,255,255,0.28)'))
    parts.append(T(w/2, by-16*u, '', 'NOIR 05', 22*u, 'rgba(248,251,255,0.96)', 'Space Grotesk', 600, 0.16, 'middle'))
    parts.append(T(w/2, by-16*u+26*u, '', 'EAU DE PARFUM — AMBER & CEDAR — 2026', 9.5*u, 'rgba(237,242,248,0.55)', 'Inter', 500, 0.26, 'middle'))
    # page dots
    for i in range(5):
        rr = 2.4*u if i != 0 else 3*u
        col = 'rgba(237,242,248,0.85)' if i == 0 else 'rgba(237,242,248,0.22)'
        parts.append(f'<circle cx="{w/2+(i-2)*20*u:.0f}" cy="{by+52*u:.0f}" r="{rr:.0f}" fill="{col}"/>')
    # corner nav chevrons
    parts.append(roundBtn(m+fw+20*u, h-m-fw-20*u, 40*u, 'chevL', 'rgba(8,9,11,0.3)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.6)', 18*u, 1.6))
    parts.append(roundBtn(w-m-fw-20*u, h-m-fw-20*u, 40*u, 'chevR', 'rgba(8,9,11,0.3)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.6)', 18*u, 1.6))
    return parts

# -----------------------------------------------------------------------------------
# CONCEPT E — Nothing Futuristic Studio (metallic cube; thin outlines, blue glow)
def conceptE(w, h, asset, tablet=False):
    u = h / 900.0
    m = w * 0.04
    parts = []
    parts.append('<rect width="%d" height="%d" fill="#07080A"/>' % (w, h))
    # deep blue ambient glow behind product
    gx = w*0.36
    parts.append(f'<ellipse cx="{gx:.0f}" cy="{h*0.52:.0f}" rx="{w*0.34:.0f}" ry="{h*0.42:.0f}" fill="url(#blueGlow)" opacity="0.85"/>')
    parts.append(product_layer(w, h, asset))
    # monochrome grade down + slight blue tint edges
    parts.append('<rect width="%d" height="%d" fill="rgba(4,5,7,0.28)"/>' % (w, h))
    # thin vignette only at very edge
    parts.append('<rect width="%d" height="%d" fill="url(#vign)" opacity="0.7"/>' % (w, h))
    # grid dots watermark right-top
    gdx, gdy = w - m - 120*u, 84*u
    for rr in range(5):
        for cc in range(7):
            parts.append(f'<circle cx="{gdx+cc*10*u:.0f}" cy="{gdy+rr*10*u:.0f}" r="1" fill="rgba(255,255,255,0.13)"/>')
    # header hairline
    hh = 66*u
    parts.append(hairline(m, hh, w-m, 'rgba(255,255,255,0.14)'))
    parts.append(T(m, 40*u, '', 'SOF', 13*u, '#fff', 'Space Grotesk', 700, 0.12))
    parts.append(T(m+46*u, 40*u, '', '—  STUDIO OF SIDECARS', 9.5*u, 'rgba(255,255,255,0.45)', 'Inter', 500, 0.3))
    parts.append(T(w/2, 40*u, '', 'SHELF · N°09', 9.5*u, 'rgba(255,255,255,0.4)', 'Inter', 500, 0.3, 'middle'))
    parts.append(f'<circle cx="{w-m-24*u:.0f}" cy="{37*u:.0f}" r="2.6*u" fill="{BLU}"/>')
    parts.append(T(w-m-70*u, 40*u, '', 'LIVE — SYNCED', 9*u, 'rgba(255,255,255,0.55)', 'Inter', 600, 0.24, 'end'))
    # right spec sheet divider
    divx = w*0.565
    parts.append(hairline(divx, hh+24*u, divx, h*0.78, 'rgba(255,255,255,0.12)'))
    parts.append(hairline(divx, h*0.78, w-m, 'rgba(255,255,255,0.08)'))
    # spec rows
    sy = hh + 72*u
    rows = [('MATERIAL', 'POLISHED CHROME'), ('SURFACE', 'MIRROR 98.2 %'), ('EDGE PROFILE', 'BEVEL · 0.4 MM'),
            ('DIMENSION', '24 × 24 × 24 CM'), ('MASS', '18.40 KG'), ('LIGHT SRC', 'AZURE · 30°')]
    rh2 = (h*0.70 - sy) / len(rows)
    for i, (lab, val) in enumerate(rows):
        yy = sy + i*rh2 + rh2*0.5
        parts.append(T(divx+34*u, yy-8*u, '', lab, 8.5*u, 'rgba(255,255,255,0.34)', 'Inter', 600, 0.28))
        parts.append(T(divx+34*u, yy+18*u, '', val, 17*u, 'rgba(255,255,255,0.92)', 'Space Grotesk', 500, 0.02))
        parts.append(hairline(divx+34*u, sy + (i+1)*rh2 - 4*u, w-m, 'rgba(255,255,255,0.07)'))
    # spec sheet label
    parts.append(T(divx+34*u, sy-44*u, '', 'SPECIFICATION', 10*u, 'rgba(255,255,255,0.5)', 'Inter', 600, 0.3))
    parts.append(f'<rect x="{divx+34*u:.0f}" y="{sy-40*u:.0f}" width="16*u" height="1.6*u" fill="rgba(255,255,255,0.7)"/>')
    # object name bottom-left (under cube area)
    parts.append(T(m, h-64*u, '', 'META CUBE — C09', 30*u, '#fff', 'Space Grotesk', 600, -0.01))
    parts.append(T(m, h-40*u, '', 'SCULPT · MIRROR CHROME · 001', 9.5*u, 'rgba(255,255,255,0.42)', 'Inter', 500, 0.24))
    # outline control chips bottom-right (right side above nothing) 
    chx = w - m
    chips = ['ROTATE', 'LIGHT', 'STUDIO', 'SHADOW']
    cwd2 = [64*u, 48*u, 62*u, 60*u]
    total_w = sum(cwd2) + 12*u*(len(chips)-1)
    for i, (cp, cw3) in enumerate(zip(chips, cwd2)):
        xx = chx - total_w + sum(cwd2[:i]) + 12*u*i
        if cp == 'STUDIO':
            parts.append(f'<rect x="{xx:.0f}" y="{h-92*u:.0f}" width="{cw3:.0f}" height="{40*u:.0f}" rx="11" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.1"/>')
            parts.append(T(xx+cw3/2, h-67*u, '', cp, 9*u, '#fff', 'Inter', 700, 0.2, 'middle'))
            parts.append(f'<rect x="{xx+cw3/2-10*u:.0f}" y="{h-47*u:.0f}" width="20*u" height="2*u" rx="1" fill="{BLU}"/>')
        else:
            parts.append(f'<rect x="{xx:.0f}" y="{h-92*u:.0f}" width="{cw3:.0f}" height="{40*u:.0f}" rx="11" fill="none" stroke="rgba(255,255,255,0.26)" stroke-width="1"/>')
            parts.append(T(xx+cw3/2, h-67*u, '', cp, 9*u, 'rgba(255,255,255,0.55)', 'Inter', 600, 0.18, 'middle'))
    return parts

# -----------------------------------------------------------------------------------
CONCEPTS = [
    ('A', 'apple',    conceptA),
    ('B', 'showroom', conceptB),
    ('C', 'workspace', conceptC),
    ('D', 'gallery',  conceptD),
    ('E', 'nothing',  conceptE),
]

ASSETS = {
    'A': 'render_a_camera.png',
    'B': 'render_b_motorcycle.png',
    'C': 'render_c_chair.png',
    'D': 'render_d_perfume.png',
    'E': 'render_e_cube.png',
}

SIZES = [('desktop', 1440, 900), ('tablet', 1194, 834)]

def blueGlow_extra(parts_extra):
    pass

_lit_u = re.compile(r'="(\d+(?:\.\d+)?)\*u"')

def build_svg(letter, size_w, size_h, asset, concept_fn, extra_defs=''):
    body = concept_fn(size_w, size_h, asset, tablet=(size_h < 900))
    body = [_lit_u.sub(lambda m: '="%.1f"' % (float(m.group(1)) * size_h / 900.0), b) for b in body]
    # ensure a blue glow radial for E
    d = defs_block()
    d = d.replace('</defs>', '''
 <radialGradient id="blueGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="rgba(61,138,255,0.20)"/><stop offset="0.6" stop-color="rgba(61,138,255,0.07)"/><stop offset="1" stop-color="rgba(61,138,255,0)"/></radialGradient>
</defs>''')
    return (svg_open(size_w, size_h) + FONTCSS + d + ''.join(body) + svg_close())

def main():
    files = []
    for letter, tag, fn in CONCEPTS:
        asset = '../assets/' + ASSETS[letter]
        for plat, sw, sh in SIZES:
            svg = build_svg(letter, sw, sh, asset, fn)
            name = f'concept{letter}_{tag}_{plat}'
            svgp = os.path.join(OUT, name + '.svg')
            open(svgp, 'w').write(svg)
            files.append((name, svgp, sw, sh))
    # print manifest
    for name, svgp, sw, sh in files:
        print(f'{name:34s} {sw}x{sh}  svg={os.path.getsize(svgp)}B')

if __name__ == '__main__':
    main()
