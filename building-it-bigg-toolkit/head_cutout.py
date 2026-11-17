"""Cut a head out of a PNG whose 'transparent' checkerboard is baked in, then add a black sticker outline.
Usage: python3 head_cutout.py input.png head_sticker.png"""
import sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
im=Image.open(sys.argv[1]).convert('RGBA'); a=np.array(im)
if a[...,3].min()<250:  # real alpha already
    fg=a[...,3]>100; rgb=im.convert('RGB')
else:
    rgb=im.convert('RGB'); x=np.array(rgb).astype(np.float32); v=x.mean(2); ch=x.max(2)-x.min(2)
    m=ndi.uniform_filter(v,5); sd=np.sqrt(np.maximum(ndi.uniform_filter(v*v,5)-m*m,0)); neu=ch<12
    cand=neu&((v>=243)|((v>=180)&(v<=208))|((v>=208)&(v<=242)&(sd<4))); cand|=neu&(v>=180)&(ch<8)&(sd<40)
    lab,_=ndi.label(cand); border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    fg=~np.isin(lab,list(border)); fg=ndi.binary_opening(fg,iterations=2)
    l2,n2=ndi.label(fg); fg=l2==(1+int(np.argmax(ndi.sum(fg,l2,range(1,n2+1)))))
    fg=ndi.binary_fill_holes(ndi.binary_closing(ndi.binary_fill_holes(fg),iterations=3)); fg=ndi.binary_erosion(fg,iterations=2)
out=rgb.copy(); out.putalpha(Image.fromarray((fg*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6)))
out=out.crop(out.getbbox()); al=np.array(out)[...,3]>100; pad=24
A=np.zeros((al.shape[0]+2*pad,al.shape[1]+2*pad),bool); A[pad:-pad,pad:-pad]=al
yy,xx=np.mgrid[-11:12,-11:12]; D=ndi.binary_dilation(A,structure=(xx*xx+yy*yy)<=121)
ol=Image.fromarray((D*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
c=Image.new('RGBA',ol.size,(0,0,0,0)); c.paste(Image.new('RGBA',ol.size,(17,17,17,255)),(0,0),ol); c.alpha_composite(out,(pad,pad))
c=c.resize((c.width*3//4,c.height*3//4),Image.LANCZOS); c.save(sys.argv[2]); print('saved',c.size)
