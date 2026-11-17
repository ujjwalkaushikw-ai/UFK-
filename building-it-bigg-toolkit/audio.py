"""Procedural chiptune score + SFX for the Boss Rush Short, mixed under the cleaned VO."""
import json, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
TL = json.load(open('/home/claude/work/timeline.json'))
T = TL['T_END']
N = int(T * SR) + SR
SC = {s['id']: s for s in TL['scenes']}
rng = np.random.default_rng(7)

def tt(d): return np.arange(int(d * SR)) / SR
def env(n, a=0.005, r=0.08, sus=1.0):
    e = np.ones(n) * sus
    na = max(1, int(a * SR)); nr = max(1, min(n, int(r * SR)))
    e[:na] = np.linspace(0, 1, na) * sus if na < n else 1
    e[-nr:] *= np.linspace(1, 0, nr)
    return e
def sq(f, d, duty=.5):
    t = tt(d); return np.where((t * f) % 1 < duty, 1.0, -1.0)
def tri(f, d):
    t = tt(d); return 2 * np.abs(2 * ((t * f) % 1) - 1) - 1
def sine(f, d):
    return np.sin(2 * np.pi * f * tt(d))
def noise(d): return rng.uniform(-1, 1, int(d * SR))
def lp(x, fc, order=2): return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x)
def hp(x, fc, order=2): return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def expd(n, k): return np.exp(-np.arange(n) / SR * k)
def add(buf, x, t0, g=1.0):
    i = int(t0 * SR)
    if i < 0: x = x[-i:]; i = 0
    j = min(len(buf), i + len(x))
    if j > i: buf[i:j] += x[:j - i] * g
def mtof(m): return 440 * 2 ** ((m - 69) / 12)

# ---------------- music ----------------
BPM = 120; BEAT = 60 / BPM; BAR = BEAT * 4
music = np.zeros(N)
# chord roots (midi) Am F C G
PROG = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [55, 60, 64]), (55, [55, 59, 62])]
LEAD = [76, None, 72, 74, 76, None, 79, 76, 77, None, 76, 74, 72, None, 69, 72,  # bar 1-2
        76, None, 72, 74, 76, 79, 81, None, 79, 77, 76, 74, 76, None, None, None]
def section(t):
    s = TL['scenes']
    ids = [x['id'] for x in s]
    for x in reversed(s):
        if t >= x['t0']: sid = x['id']; break
    if sid == 'hook': return 'gone' if t >= TL['anc']['hook_gone'] else 'hook'
    if sid in ('origin', 'grind'): return 'light'
    if sid in ('dennys', 'flop'): return 'groove'
    if sid == 'brink': return 'tension'
    if sid in ('comeback', 'giants', 'cuda', 'ai'): return 'full'
    if sid == 'peak': return 'peak' if t < TL['anc']['pk_even'] - .1 else 'storm'
    if sid == 'scandal': return 'drone'
    return 'outro'

def kick(g=1.0):
    d = .32; t = tt(d); f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * expd(len(t), 11) * g
def snare(g=1.0):
    d = .2; n = bp(noise(d), 1500, 7000) * expd(int(d * SR), 22) + sine(185, d) * expd(int(d * SR), 30) * .5
    return n * g
def hat(g=1.0):
    d = .05; return hp(noise(d), 7000) * expd(int(d * SR), 70) * g

step = BEAT / 2  # 8th notes
nsteps = int(T / step) + 1
for k in range(nsteps):
    t0 = k * step
    sec = section(t0)
    if sec in ('gone',): continue
    bar = int(t0 // BAR); beat8 = k % 8
    root, chord = PROG[bar % 4]
    if sec == 'drone' or sec == 'tension':
        continue
    # drums
    if sec in ('groove', 'full', 'peak', 'storm', 'hook'):
        if beat8 % 2 == 0: add(music, kick(.9 if sec != 'hook' else 1.0), t0)
        if sec in ('groove', 'full', 'peak', 'storm') and beat8 in (2, 6): add(music, snare(.55), t0)
        add(music, hat(.25 if beat8 % 2 else .15), t0)
    elif sec == 'light':
        if beat8 in (0, 4): add(music, kick(.55), t0)
        if beat8 % 2: add(music, hat(.18), t0)
    elif sec == 'outro':
        if beat8 == 0 and bar % 2 == 0: add(music, kick(.35), t0)
    # bass (8ths)
    if sec in ('hook', 'groove', 'full', 'peak', 'storm'):
        f = mtof(root - 12 + (12 if beat8 % 2 else 0))
        x = lp(sq(f, step * .9, .5), 900) * env(int(step * .9 * SR), .003, .04)
        add(music, x, t0, .22)
    # arp (16ths)
    if sec in ('light', 'groove', 'full', 'peak'):
        for h in range(2):
            n = chord[(beat8 * 2 + h) % 3] + 12
            x = lp(sq(mtof(n), step / 2 * .8, .125), 4500) * env(int(step / 2 * .8 * SR), .002, .03)
            add(music, x, t0 + h * step / 2, .07 if sec == 'light' else .06)
    # lead
    if sec in ('full', 'peak', 'hook'):
        idx = (k % 32)
        n = LEAD[idx]
        if n and not (sec == 'hook' and t0 < 1.0):
            nn = n + (12 if sec == 'peak' else 0)
            dur = step * .95
            x = lp(sq(mtof(nn), dur, .25), 5000) * env(int(dur * SR), .004, .06)
            vib = 1 + 0.0
            add(music, x, t0, .085)
    if sec == 'outro':
        OUT = [69, None, 72, None, 76, None, 74, None, 72, None, None, None, 69, None, None, None]
        n = OUT[k % 16]
        if n:
            dur = step * 1.8
            x = tri(mtof(n), dur) * env(int(dur * SR), .01, .5)
            add(music, x, t0, .16)
        if beat8 == 0:
            for cn in chord:
                d = BAR; x = lp(tri(mtof(cn), d), 1500) * env(int(d * SR), .3, .8)
                add(music, x, t0, .04)

# tension / drone pads
def pad(t0, t1, notes, g, lpf=600, wob=0.0):
    d = t1 - t0; x = np.zeros(int(d * SR))
    for n in notes: x += lp(sq(mtof(n), d, .5), lpf) * .5 + tri(mtof(n) * 1.003, d) * .5
    e = np.ones(len(x)); a = int(.4 * SR); r = int(.6 * SR); e[:a] = np.linspace(0, 1, a); e[-r:] = np.linspace(1, 0, r)
    if wob: e *= 1 - wob * (0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * tt(d)))
    add(music, x * e, t0, g)
pad(SC['brink']['t0'], SC['brink']['t1'], [45, 52], .07, 500)
add(music, lp(noise(SC['brink']['t1'] - TL['anc']['br_every']), 300) * np.linspace(0, 1, int((SC['brink']['t1'] - TL['anc']['br_every']) * SR)), TL['anc']['br_every'], .25)
pad(SC['scandal']['t0'] + .1, SC['scandal']['t1'] + .4, [33, 40, 45], .085, 350, .3)
# hook: ominous low drone under the pulse
pad(0, TL['anc']['hook_gone'], [33, 45], .05, 400)

# ---------------- SFX ----------------
sfx = np.zeros(N)
def S_whoosh():
    d = .42; n = noise(d); e = np.sin(np.linspace(0, np.pi, len(n))) ** 2
    return bp(n, 400, 4000) * e
def S_boom():
    d = 1.4; return (sine(48, d) * 1.0 + lp(noise(d), 200) * .8) * expd(int(d * SR), 3.2)
def S_stamp():
    d = .22; return (lp(noise(d), 1200) * 1.0 + sine(95, d)) * expd(int(d * SR), 26)
def S_scratch():
    d = .45; t = tt(d); f = 300 + 900 * np.abs(np.sin(2 * np.pi * 3.3 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR; x = (2 * ((ph / (2 * np.pi)) % 1) - 1) * .6 + bp(noise(d), 800, 5000) * .6
    return x * env(len(t), .005, .1)
def S_pop():
    d = .09; t = tt(d); f = 500 + 1400 * t / d; return np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(len(t), 35)
def S_plane():
    d = 1.4; return lp(noise(d), 700) * np.sin(np.linspace(0, np.pi, int(d * SR))) * 1.3
def S_squeak():
    d = .13; t = tt(d); f = 1900 + 500 * np.sin(2 * np.pi * 30 * t); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), .01, .05) * .6
def S_tock():
    d = .06; return (sine(1150, d) + hp(noise(d), 3000) * .5) * expd(int(d * SR), 90)
def S_levelup():
    x = np.concatenate([lp(sq(mtof(n), .07, .25), 6000) * env(int(.07 * SR), .002, .02) for n in (72, 76, 79, 84)]); return x * .6
def S_cup():
    d = .25; return (sine(2600, d) + sine(3900, d) * .6) * expd(int(d * SR), 22) * .5
def S_sparkle():
    x = np.zeros(int(.6 * SR))
    for i in range(7):
        n = (sine(2000 + 400 * i, .12) * expd(int(.12 * SR), 30)); j = int(i * .07 * SR); x[j:j + len(n)] += n * .4
    return x
def S_jingle():
    return np.concatenate([lp(sq(mtof(n), .085, .5), 5000) * env(int(.085 * SR), .002, .02) for n in (72, 76, 79, 84, 88)]) * .55
def S_buzzer():
    d = .55; return lp(sq(110, d) + sq(117, d), 2500) * env(int(d * SR), .005, .08) * .45
def S_coin():
    a = lp(sq(mtof(83), .07, .5), 7000); b = lp(sq(mtof(88), .22, .5), 7000) * expd(int(.22 * SR), 9)
    return np.concatenate([a, b]) * .35
def S_heart():
    d = .16; th = sine(55, d) * expd(int(d * SR), 18) + lp(noise(d), 120) * expd(int(d * SR), 30)
    x = np.zeros(int(.4 * SR)); x[:len(th)] += th; j = int(.18 * SR); x[j:j + len(th)] += th * .7; return x * 1.4
def S_tick():
    d = .04; return hp(noise(d), 2000) * expd(int(d * SR), 120)
def S_riser():
    d = 1.0; t = tt(d); f = 200 + 1600 * (t / d) ** 2
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * .4 + bp(noise(d), 1000, 6000) * .5) * (t / d) ** 1.5
def S_slam():
    return np.concatenate([kick(1.4)[:int(.3 * SR)], np.zeros(int(.3 * SR))]) + np.pad(lp(noise(.6), 2500) * expd(int(.6 * SR), 8), (0, 0))[:int(.6 * SR)] * .8
def S_powerup():
    x = np.concatenate([lp(sq(mtof(n), .05, .25), 7000) for n in range(60, 88, 3)]); return x * env(len(x), .005, .1) * .45
def S_bell():
    d = 1.6; return (sine(880, d) + sine(2210, d) * .5 + sine(3520, d) * .25) * expd(int(d * SR), 3) * .45
def S_hit():
    d = .22; return (lp(noise(d), 3000) + sine(70, d) * 1.2) * expd(int(d * SR), 20)
def S_ko():
    d = .9; t = tt(d); f = 600 * np.exp(-t * 3)
    return S_hit_pad(d) + np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(len(t), 3) * .5
def S_hit_pad(d):
    x = np.zeros(int(d * SR)); h = S_hit(); x[:len(h)] += h * 1.3; return x
def S_rumble():
    d = 1.6; return lp(noise(d), 120) * np.sin(np.linspace(0, np.pi, int(d * SR))) * 2.2
def S_crash():
    d = 1.3; return (lp(noise(d), 4000) * expd(int(d * SR), 4) + sine(50, d) * expd(int(d * SR), 6) * 1.2)
def S_crack():
    d = .3; return hp(noise(d), 1500) * expd(int(d * SR), 25) * .8
def S_sadtrom():
    x = np.concatenate([lp(sq(mtof(n), dd, .5), 1200) * env(int(dd * SR), .01, .05) for n, dd in ((58, .3), (57, .3), (56, .3), (55, .8))])
    t = np.arange(len(x)) / SR; return x * (1 + .15 * np.sin(2 * np.pi * 6 * t)) * .3
def S_thunder():
    d = 2.2; c = hp(noise(.12), 1000) * expd(int(.12 * SR), 25)
    x = lp(noise(d), 300) * expd(int(d * SR), 1.6) * 2.0; x[:len(c)] += c; return x
def S_glitch():
    x = np.concatenate([sq(200 + 1800 * rng.random(), .025, .5) * (rng.random() > .3) for _ in range(16)]); return lp(x, 6000) * .3
FX = {k[2:]: v for k, v in globals().items() if k.startswith('S_') and k != 'S_hit_pad'}
for e in TL['sfx']:
    f = FX[e['k']]; x = f()
    add(sfx, x / (np.max(np.abs(x)) + 1e-9) * 0.5, e['t'], e['g'])

wavfile.write('/home/claude/work/music.wav', SR, (music / (np.max(np.abs(music)) + 1e-9) * .8).astype(np.float32))
wavfile.write('/home/claude/work/sfx.wav', SR, (sfx / (np.max(np.abs(sfx)) + 1e-9) * .8).astype(np.float32))
print('ok', len(music) / SR)
