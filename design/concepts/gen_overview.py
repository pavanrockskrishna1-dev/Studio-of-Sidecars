#!/usr/bin/env python3
# Builds labelled overview contact sheets (desktop row + Honor Pad row) for the 5 concepts
import os
OUT = os.path.dirname(os.path.abspath(__file__))

CONCEPTS = [
    ('A', 'Apple Minimal Studio', 'CAMERA · whisper chrome · floating glass'),
    ('B', 'Automotive Showroom',   'MOTORCYCLE · cinematic floor · config dock'),
    ('C', 'Creator Workspace',     'CHAIR · modular floating tools · contextual'),
    ('D', 'Museum Gallery',        'PERFUME · spotlight pedestal · bare space'),
    ('E', 'Nothing Futuristic',    'CUBE · thin outlines · electric-blue glow'),
]
TH = 560            # thumbnail width
PAD = 40
GAP = 22

def esc(t):
    return t.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')

def build(rows, path_pat, label, head_h, img_h):
    # rows: list of filenames
    W = PAD*2 + TH*5 + GAP*4
    # header
    parts = [f'<text x="{PAD}" y="{88}" font-family="Space Grotesk" font-weight="600" font-size="54" fill="#F2F5FA" letter-spacing="-0.015em">STUDIO OF SIDECARS</text>']
    parts.append(f'<text x="{PAD}" y="{126}" font-family="Inter" font-weight="500" font-size="17" fill="rgba(237,242,248,0.55)">Premium 3D Creator Studio — UI direction concepts · five different layout families · no implementation</text>')
    # columns
    x0 = PAD
    y0 = head_h
    rows_svg = []
    for ri, files in enumerate(rows):
        lbl = label[ri]
        yy = y0 + ri*(img_h[ri] + 132)
        rows_svg.append(f'<text x="{PAD}" y="{yy-16}" font-family="Inter" font-weight="700" font-size="12" fill="rgba(237,242,248,0.45)" letter-spacing="0.3em">{esc(lbl)}</text>')
        for ci, f in enumerate(files):
            cx = x0 + ci*(TH+GAP)
            rows_svg.append(f'<image x="{cx}" y="{yy}" width="{TH}" height="{img_h[ri]}" preserveAspectRatio="none" href="{path_pat(ci)}"/>')
            rows_svg.append(f'<rect x="{cx}" y="{yy}" width="{TH}" height="{img_h[ri]}" fill="none" stroke="rgba(255,255,255,0.14)"/>')
            letter, name, tag = CONCEPTS[ci]
            cy2 = yy + img_h[ri] + 34
            rows_svg.append(f'<circle cx="{cx+12}" cy="{cy2-6}" r="3.5" fill="#5B9BFF"/>')
            rows_svg.append(f'<text x="{cx+26}" y="{cy2}" font-family="Space Grotesk" font-weight="600" font-size="21" fill="#F6F8FC">CONCEPT {letter}</text>')
            rows_svg.append(f'<text x="{cx+TH}" y="{cy2}" font-family="Space Grotesk" font-weight="500" font-size="21" fill="#C9D4E6" text-anchor="end">{esc(name)}</text>')
            rows_svg.append(f'<text x="{cx+26}" y="{cy2+28}" font-family="Inter" font-weight="600" font-size="10.5" fill="rgba(237,242,248,0.4)" letter-spacing="0.22em">{esc(tag)}</text>')
    H = y0 + sum(img_h) + 132*len(rows) - 132  # rough
    H = rows_svg[-1] and (y0 + len(rows)*max(img_h)) + 132*len(rows) + 40
    body = ''.join(parts+rows_svg)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
           f'<style>@import url("fonts/faces.css");text{{font-variant-numeric:tabular-nums;}}</style>'
           f'<rect width="{W}" height="{H}" fill="#0A0C0F"/>'
           f'{body}</svg>')
    return svg, W, H

def main():
    desktop = ['exported/conceptA_apple_desktop.png', 'exported/conceptB_showroom_desktop.png', 'exported/conceptC_workspace_desktop.png', 'exported/conceptD_gallery_desktop.png', 'exported/conceptE_nothing_desktop.png']
    tablet  = ['exported/conceptA_apple_tablet.png', 'exported/conceptB_showroom_tablet.png', 'exported/conceptC_workspace_tablet.png', 'exported/conceptD_gallery_tablet.png', 'exported/conceptE_nothing_tablet.png']
    # direct construction:
    W = PAD*2 + TH*5 + GAP*4
    img_h = [900/1440*TH, 834/1194*TH]
    rows = [desktop, tablet]
    head_h = 168
    x0 = PAD
    parts = [f'<text x="{PAD}" y="{70}" font-family="Space Grotesk" font-weight="600" font-size="50" fill="#F2F5FA" letter-spacing="-0.015em">STUDIO OF SIDECARS</text>',
             f'<text x="{PAD}" y="{108}" font-family="Inter" font-weight="500" font-size="16" fill="rgba(237,242,248,0.55)">Premium 3D Creator Studio — UI direction concepts · five different layout families · pure visuals, no implementation</text>',
             f'<text x="{PAD}" y="{146}" font-family="Inter" font-weight="600" font-size="11" fill="rgba(140,170,220,0.75)" letter-spacing="0.26em">CONCEPT SET 01  —  PRODUCTS SHOWN AS PLACEHOLDER STUDIO ASSETS (CAMERA / MOTORCYCLE / CHAIR / PERFUME / CUBE)</text>']
    blocks=[]
    for ri, files in enumerate(rows):
        yy = head_h + ri*(img_h[ri] + 148)
        blocks.append(f'<line x1="{PAD}" y1="{yy-26}" x2="{W-PAD}" y2="{yy-26}" stroke="rgba(255,255,255,0.08)"/>')
        blocks.append(f'<text x="{PAD}" y="{yy-6}" font-family="Inter" font-weight="700" font-size="12" fill="rgba(237,242,248,0.42)" letter-spacing="0.32em">{esc(["DESKTOP  ·  1440 × 900","HONOR PAD LANDSCAPE  ·  1194 × 834"][ri])}</text>')
        for ci, f in enumerate(files):
            cx = x0 + ci*(TH+GAP)
            blocks.append(f'<image x="{cx}" y="{yy}" width="{TH}" height="{img_h[ri]:.1f}" preserveAspectRatio="none" href="{f}"/>')
            blocks.append(f'<rect x="{cx}" y="{yy}" width="{TH}" height="{img_h[ri]:.1f}" fill="none" stroke="rgba(255,255,255,0.13)"/>')
            letter, name, tag = CONCEPTS[ci]
            cy2 = yy + img_h[ri] + 30
            blocks.append(f'<circle cx="{cx+13}" cy="{cy2-8}" r="3.6" fill="#5B9BFF"/>')
            blocks.append(f'<text x="{cx+27}" y="{cy2}" font-family="Space Grotesk" font-weight="600" font-size="21" fill="#F6F8FC">{letter} · {esc(name)}</text>')
            blocks.append(f'<text x="{cx}" y="{cy2+29}" font-family="Inter" font-weight="600" font-size="10" fill="rgba(237,242,248,0.4)" letter-spacing="0.2em">{esc(tag)}</text>')
    H = head_h + 2*img_h[0] + 148*2 - 0 + 34
    H = int(head_h + sum(img_h) + 148*len(rows)) + 40
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
           f'<style>@import url("fonts/faces.css");text{{font-variant-numeric:tabular-nums;}}</style>'
           f'<rect width="{W}" height="{H}" fill="#0A0C0F"/>' + ''.join(parts) + ''.join(blocks) + '</svg>')
    out = os.path.join(OUT, 'OVERVIEW_concept_set_01.svg')
    open(out, 'w').write(svg)
    print(out, W, 'x', H)

if __name__ == '__main__':
    main()
