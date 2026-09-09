#!/usr/bin/env python3
"""Approval contact sheets for the Phase-2 Premium Finish master screens."""
import os
from PIL import Image, ImageDraw, ImageFont
ROOT='/home/user/design/redesign/exports/premium_finish_master'
def font(path,size):
    for cand in (path, path.replace('.ttf','Bold.ttf'), '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
        if cand and os.path.exists(cand): return ImageFont.truetype(cand,size)
    return ImageFont.load_default()
FB=font('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',40)
FREG=font('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',30)
FL=font('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',52)
def fits(im, w, h):
    iw,ih=im.size; s=min(w/iw,h/ih)
    return im.resize((int(iw*s),int(ih*s)),Image.LANCZOS)
def sheet(path, title, subtitle, shots, cols, gap=34, margin=46, header=120):
    capH=70
    thumbs=[Image.open(os.path.join(ROOT,s)).convert('RGB') for s,_ in shots]
    W=2720
    avail=W-2*margin-(cols-1)*gap
    colW=avail//cols
    rows=(len(shots)+cols-1)//cols
    rowH=int(colW/(max((th.width/th.height) for th in thumbs)))+capH
    H=header+rows*rowH+(rows-1)*gap
    img=Image.new('RGB',(W,H),(13,15,20)); d=ImageDraw.Draw(img)
    d.rectangle([0,0,W,header-14],fill=(10,11,15))
    d.line([(margin,header-30),(W-margin,header-30)],fill=(70,78,92),width=2)
    d.text((margin,26),title,font=FL,fill=(238,242,248))
    d.text((margin,86),subtitle,font=FB,fill=(122,133,150))
    for i,(s,capt) in enumerate(shots):
        r,c=divmod(i,cols)
        x=margin+c*(colW+gap); y=header+margin//2+r*(rowH+gap)
        tw=colW; th=rowH-capH
        th_im=fits(Image.open(os.path.join(ROOT,s)).convert('RGB'),tw-8,th-8)
        ox=x+(tw-th_im.width)//2; oy=y+(th-th_im.height)//2
        d.rounded_rectangle([x,y,x+tw,y+th],radius=14,fill=(21,24,31),outline=(52,60,74),width=2)
        img.paste(th_im,(ox,oy))
        capY=y+th+18
        d.text((x+8,capY),capt[0],font=FB,fill=(164,214,255))
        d.text((x+8+96,capY+8),capt[1],font=FB,fill=(236,240,247))
    img.save(path); print('sheet',os.path.basename(path),img.size)
sheet(ROOT+'/overview_desktop.png','PREMIUM FINISH · DESKTOP STUDIO','Master screens · 1440 × 900 · static premium finish skin + Phase-2 interactive', [
 ('desktop/artboard_1440x900.png',('01','Home Studio')),('desktop/screen_02_environment_library.png',('02','Environment Library · 11 presets')),
 ('desktop/screen_03a_camera_panel.png',('03a','Camera')),('desktop/screen_03b_lighting_panel.png',('03b','Lighting')),
 ('desktop/screen_03c_materials_panel.png',('03c','Materials')),('desktop/screen_03d_floor_panel.png',('03d','Floor')),
 ('desktop/screen_04_learn_studio.png',('04','Learn Studio')),],4)
sheet(ROOT+'/overview_honorpad_landscape.png','PREMIUM FINISH · HONOR PAD LANDSCAPE','Master screens · 1194 × 834 · readability floor 13–15 px · touch-first', [
 ('honorpad_ls/artboard_1194x834.png',('01','Home Studio')),('honorpad_ls/screen_02_environment_library.png',('02','Environment Library')),
 ('honorpad_ls/screen_03a_camera_panel.png',('03a','Camera')),('honorpad_ls/screen_03b_lighting_panel.png',('03b','Lighting')),
 ('honorpad_ls/screen_03c_materials_panel.png',('03c','Materials')),('honorpad_ls/screen_03d_floor_panel.png',('03d','Floor')),
 ('honorpad_ls/screen_04_learn_studio.png',('04','Learn Studio')),],4)
sheet(ROOT+'/overview_honorpad_portrait.png','PREMIUM FINISH · HONOR PAD PORTRAIT','Master screens · 834 × 1112 · slim glass rails · bottom dock · compact canonical layout', [
 ('honorpad_pt/artboard_834x1112.png',('01','Home Studio')),('honorpad_pt/screen_02_environment_library.png',('02','Environment Library')),
 ('honorpad_pt/screen_04_learn_studio.png',('04','Learn Studio')),],3)
# 3-size artboard comparison row
imgs=[Image.open(os.path.join(ROOT,d)).convert('RGB') for d in
      ['desktop/artboard_1440x900.png','honorpad_ls/artboard_1194x834.png','honorpad_pt/artboard_834x1112.png']]
H=520; heights=[int(H*1.0),int(H*0.9),int(H*0.95)]
scales=[h/(i.height) for h,i in zip(heights,imgs)]
tw=[int(im.width*s) for im,s in zip(imgs,scales)]
pad=20; gap=24; TOP=20
W=pad+sum(tw)+gap*(len(imgs)-1)+pad
Hf=TOP+H+150
img=Image.new('RGB',(W,Hf),(13,15,20)); d=ImageDraw.Draw(img)
x=pad
for im,s,cap,tw_,th_ in zip(imgs,scales,['DESKTOP · 1440 × 900','HONOR PAD LANDSCAPE · 1194 × 834','HONOR PAD PORTRAIT · 834 × 1112'],tw,heights):
    nh=int(im.height*s); im2=im.resize((tw_,nh),Image.LANCZOS)
    y=TOP+(H-nh)//2
    img.paste(im2,(x,y))
    d.rectangle([x,TOP,x+tw_,TOP+H],outline=(60,68,82),width=1)
    d.text((x+10,TOP+H+18),cap,font=FB,fill=(236,240,247))
    x+=tw_+gap
img.save(ROOT+'/artboard_compare_3_sizes.png'); print('sheet artboard_compare_3_sizes.png',img.size)
