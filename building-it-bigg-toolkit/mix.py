import numpy as np, subprocess, json
from scipy.io import wavfile
SR=48000
def lufs(path):
    r=subprocess.run(['ffmpeg','-hide_banner','-i',path,'-af','ebur128','-f','null','-'],capture_output=True,text=True).stderr
    return float(r.split('Summary')[1].split('I:')[1].split('LUFS')[0])
_,vo=wavfile.read('vo_final.wav'); vo=vo.astype(np.float32)/32768
_,mu=wavfile.read('music.wav'); _,fx=wavfile.read('sfx.wav')
N=int(93.0*SR)
def fit(x):
    x=x if x.ndim==1 else x.mean(1)
    y=np.zeros(N,np.float32); y[:min(N,len(x))]=x[:N]; return y
vo_m=fit(vo); mu=fit(mu); fx=fit(fx)
wavfile.write('mu_tmp.wav',SR,mu); wavfile.write('fx_tmp.wav',SR,fx)
gm=10**((-23-lufs('mu_tmp.wav'))/20); gf=10**((-25.5-lufs('fx_tmp.wav'))/20)
mu*=gm; fx*=gf
# duck envelope from VO
hop=int(.01*SR); n=N//hop
rms=np.sqrt((vo_m[:n*hop].reshape(n,hop)**2).mean(1))
act=(20*np.log10(rms+1e-9)>-42).astype(float)
g=np.zeros(n); a_att=1-np.exp(-1/4); a_rel=1-np.exp(-1/30)
for i in range(n):
    prev=g[i-1] if i else 0; a=a_att if act[i]>prev else a_rel; g[i]=prev+a*(act[i]-prev)
duck=10**(-9*g/20); duck=np.repeat(duck,hop); duck=np.pad(duck,(0,N-len(duck)),constant_values=duck[-1])
mix=vo_m*1.0+mu*duck+fx*0.9
wavfile.write('mix_pre.wav',SR,np.stack([mix,mix],1).astype(np.float32))
