#!/usr/bin/env python3
"""Builds the "Cinematic" premium-finish derivative of the Phase-2 interactive
prototype. Appends the cinematic CSS + JS pass. Locked Phase-1 shell and all
environment assets remain untouched; the Phase-2 file stays as-is as input."""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # design/redesign
SRC=os.path.join(ROOT,'_src')
INP=os.path.join(os.path.dirname(ROOT),'phase2','studio_sidecars_phase2_interactive.html')
OUT=os.path.join(ROOT,'studio_sidecars_cinematic.html')

css=open(os.path.join(SRC,'cinematic.css'),encoding='utf-8').read()
js=open(os.path.join(SRC,'cinematic.js'),encoding='utf-8').read()
s=open(INP,encoding='utf-8').read()

note='''<!-- CINEMATIC FINISH (derivative of the Phase-2 interactive prototype).
     Same DOM/layout as the locked Phase-1 chrome; finish layer only:
     glass material, loudness ladder, unframed stage, SVG icon pass.
     Engine (phase-2 interactions) untouched. -->'''
s=s.replace('<!doctype html>','<!doctype html>\n'+note,1)
s=s.replace('<title>Studio of Sidecars — Phase 2 · Interactive Prototype</title>',
            '<title>Studio of Sidecars — Cinematic UI</title>')
i=s.rindex('</head>')
s=s[:i]+'<style id="cin">\n'+css+'\n</style>\n'+s[i:]
i=s.rindex('</body>')
s=s[:i]+'<script id="cinjs">\n'+js+'\n</script>\n'+s[i:]
open(OUT,'w',encoding='utf-8').write(s)
print('wrote',OUT,'%.1f MB'%(os.path.getsize(OUT)/1e6))
for probe in ['<style id="cin">','<script id="cinjs">','Cinematic UI']:
    print(probe,'ok' if probe in s else 'MISSING')
