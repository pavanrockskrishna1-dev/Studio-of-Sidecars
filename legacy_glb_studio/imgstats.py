import sys
from PIL import Image
p = sys.argv[1]
im = Image.open(p).convert('RGB'); w,h=im.size
c = im.crop((int(w*0.3),int(h*0.25),int(w*0.7),int(h*0.75))).resize((120,120))
px=list(c.getdata()); n=len(px)
lit=sum(1 for r,g,b in px if (r*0.3+g*0.6+b*0.1)>50)/n
orange=sum(1 for r,g,b in px if r>120 and 40<g<160 and b<90)/n
print(round(lit*100,1), round(orange*100,1))
