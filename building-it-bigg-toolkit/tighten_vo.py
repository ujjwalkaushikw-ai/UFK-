import json, numpy as np
from scipy.io import wavfile
sr,x=wavfile.read('vo48.wav'); x=x.astype(np.float32)
al=json.load(open('align.json'))
LINES=[l.split() for l in open('/home/claude/align.py').read().split('TEXT = """')[1].split('"""')[0].strip().split('\n')]
# word -> line index
wl=[]; 
for li,l in enumerate(LINES): wl+= [li]*len(l)
starts=[a for _,a,_ in al]
# speech mask
hop=int(sr*0.01); n=len(x)//hop
db=20*np.log10(np.sqrt((x[:n*hop].reshape(n,hop)**2).mean(1))+1e-9)
sp=db>-47
# close tiny holes (<120ms) and remove tiny blips (<60ms)
def runs(m):
    out=[];i=0
    while i<len(m):
        j=i
        while j<len(m) and m[j]==m[i]: j+=1
        out.append([bool(m[i]),i,j]); i=j
    return out
for v,a,b in runs(sp):
    if not v and b-a<12 and a>0: sp[a:b]=True
for v,a,b in runs(sp):
    if v and b-a<6: sp[a:b]=False
R=[(a,b) for v,a,b in runs(sp) if v]
PAD=6  # 60ms padding
R=[(max(0,a-PAD),min(n,b+PAD)) for a,b in R]
# merge overlaps
M=[]
for a,b in R:
    if M and a<=M[-1][1]: M[-1]=(M[-1][0],max(M[-1][1],b))
    else: M.append((a,b))
# special dramatic pauses: keep longer gap before these word indices (orig time)
def widx(line,pos): return sum(len(l) for l in LINES[:line])+pos
SPECIAL={widx(0,14):0.42,  # ...2026 | he was gone
         widx(12,15):0.55, # ... world | and out
         widx(11,1):0.38,  # then | the one fight
         widx(7,17):0.30,  # larrabee | and cancelled it
         widx(5,14):0.28,  # left | everything rode on one chip
         widx(3,15):0.30,  # graphics | the catch
         widx(6,17):0.28}  # gpu | and mighty 3dfx
def next_word(t):
    for i,s in enumerate(starts):
        if s>=t-0.02: return i
    return None
out=[]; segs=[]  # (o0,o1,n0,n1)
cur=0
def emit(o0,o1,targetlen=None):
    global cur
    seg=x[o0:o1]
    out.append(seg); segs.append((o0/sr,o1/sr,cur/sr,(cur+len(seg))/sr)); cur+=len(seg)
lead=int(0.25*sr)
# lead-in: 0.25s of room tone
first=M[0][0]*hop
out.append(x[max(0,first-lead):first]); cur=len(out[0]); segs.append((max(0,first-lead)/sr,first/sr,0,cur/sr))
for k,(a,b) in enumerate(M):
    emit(a*hop,b*hop)
    if k+1<len(M):
        g0=b*hop; g1=M[k+1][0]*hop; g=(g1-g0)/sr
        wi=next_word(g1/sr+0.06)
        prev_wi=wi-1 if wi else 0
        between_lines = wi is not None and wi>0 and wl[wi]!=wl[wi-1]
        T=0.30 if between_lines else 0.13
        if wi in SPECIAL: T=SPECIAL[wi]
        T=min(g,T)
        h=int(T*sr/2); xf=int(0.012*sr)
        A=x[g0:g0+h+xf].copy(); B=x[g1-h-xf:g1].copy()
        if len(A)>xf and len(B)>xf:
            ramp=np.linspace(0,1,xf,dtype=np.float32)
            mid=A[-xf:]*(1-ramp)+B[:xf]*ramp
            gap=np.concatenate([A[:-xf],mid,B[xf:]])
        else: gap=x[g0:g1]
        out.append(gap); segs.append((g0/sr,g1/sr,cur/sr,(cur+len(gap))/sr)); cur+=len(gap)
tail=x[M[-1][1]*hop:M[-1][1]*hop+int(0.4*sr)]
out.append(tail); segs.append((M[-1][1]*hop/sr,(M[-1][1]*hop+len(tail))/sr,cur/sr,(cur+len(tail))/sr)); cur+=len(tail)
y=np.concatenate(out)
wavfile.write('vo_tight.wav',sr,y)
def mapt(t):
    for o0,o1,n0,n1 in segs:
        if o0-1e-6<=t<=o1+1e-6:
            return n0+(t-o0)*((n1-n0)/(o1-o0) if o1>o0 else 0)
    # between: nearest
    best=min(segs,key=lambda s:min(abs(t-s[0]),abs(t-s[1])))
    return best[2] if abs(t-best[0])<abs(t-best[1]) else best[3]
newal=[(w,mapt(a),mapt(b)) for w,a,b in al]
json.dump(newal,open('align_tight.json','w'))
print('orig %.2f -> tight %.2f s, speech regions %d'%(len(x)/sr,len(y)/sr,len(M)))
