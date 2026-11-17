import sys, glob
from PIL import Image, ImageDraw
files=sys.argv[2:]; out=sys.argv[1]
tw,th=360,640; cols=min(4,len(files)); rows=(len(files)+cols-1)//cols
S=Image.new('RGB',(cols*tw+(cols+1)*8, rows*(th+30)+8),(40,40,40)); d=ImageDraw.Draw(S)
for i,f in enumerate(files):
    im=Image.open(f).resize((tw,th)); x=8+(i%cols)*(tw+8); y=8+(i//cols)*(th+30)
    S.paste(im,(x,y)); d.text((x+4,y+th+6),f.split('/')[-1],fill=(255,255,0))
S.save(out,quality=88)
