import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
w,h = im.size
W,H = 64, 40
im2 = im.resize((W,H))
px = im2.load()
grid = []
for y in range(H):
    row=''
    for x in range(W):
        r,g,b = px[x,y]
        l = r*0.3+g*0.6+b*0.1
        isorange = r>110 and 30<g<190 and b<100
        row += '#' if isorange else ('+' if l>80 else ('.' if l>30 else ' '))
    grid.append(row)
print('\n'.join(grid))
