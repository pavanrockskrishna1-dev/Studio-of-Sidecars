import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
w,h = im.size
px = im.load()
orange=purple=lit=0
omin=(1e9,1e9); omax=(-1,-1)
for y in range(0,h,3):
    for x in range(0,w,3):
        r,g,b = px[x,y]
        l = r*0.3+g*0.6+b*0.1
        if l>60: lit+=1
        if r>110 and 30<g<190 and b<100:
            orange+=1
            omin=(min(omin[0],x),min(omin[1],y)); omax=(max(omax[0],x),max(omax[1],y))
        if r>150 and b>150 and g<120:
            purple+=1
n=len(range(0,h,3))*len(range(0,w,3))
print(f"size={w}x{h} sampled={n}")
print(f"lit%={100*lit/n:.1f} orange%={100*orange/n:.2f} purple={purple}")
if orange: print(f"orange bbox: x[{omin[0]},{omax[0]}] y[{omin[1]},{omax[1]}] w={omax[0]-omin[0]} h={omax[1]-omin[1]}")
