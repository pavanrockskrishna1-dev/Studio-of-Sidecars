import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
w,h=im.size
x0,x1,y0,y1 = int(w*0.55), int(w*0.98), int(h*0.1), int(h*0.9)  # right-side pure canvas zone
c = im.crop((x0,y0,x1,y1))
px=list(c.getdata()); n=len(px)
lit=sum(1 for r,g,b in px if (r*0.3+g*0.6+b*0.1)>60)/n
orange=sum(1 for r,g,b in px if r>110 and 30<g<190 and b<100)/n
bright=sum(1 for r,g,b in px if max(r,g,b)>100)/n
print(f"canvas-region lit>60: {lit*100:.1f}%  orange: {orange*100:.2f}%  any-bright: {bright*100:.1f}%")
# also compute mean luminance
lum=sum((r*0.3+g*0.6+b*0.1) for r,g,b in px)/n
print(f"mean luminance: {lum:.1f}/255")
