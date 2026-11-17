"""Build timeline.json: scenes, caption words, anchors and SFX cues, from the aligned VO."""
import json, re

al = json.load(open('/home/claude/work/align_final.json'))
T_END = 93.0

# Display tokens per line: "text|spokenWordCount", '*' prefix = highlight
D = [
 "He beat *every *rival in his way. Then, on *November *12th, *2026...|3 he was *gone.",
 "Jensen Huang. Born in *Taiwan, 1963.|3 Sent to *America at *nine, to a Kentucky boarding school, where he *cleaned *toilets.",
 "Competitive *table-tennis|2 player. High-school|2 grad at *sixteen. Electrical *engineer.",
 "*1993.|3 A *Denny's booth. Three engineers, one bet: chips built just for *graphics. The catch? *Dozens of rivals had the same idea.",
 "Their first chip bet on the *wrong *tech. Jensen flew to *Japan, admitted it to *Sega... and Sega invested *five *million *dollars anyway.",
 "He laid off more than *half the company. *One *month of payroll left. Everything rode on *one *chip.",
 "The *RIVA *128|3 hit. Then *GeForce *256|3 sold as the world's first *GPU. And mighty *3dfx?|2 Nvidia *bought what was left of it.",
 "Then the *giants came. AMD bought Nvidia's biggest rival, *ATI. *Intel built its own GPU, Larrabee... and *cancelled it.",
 "Jensen's *weirdest bet: *CUDA. Turn a *gaming chip into a general-purpose|2 *brain. Wall Street didn't *get it.",
 "*2012:|2 *AlexNet, an AI trained on two Nvidia *gaming *cards, crushed the field. A decade later, *ChatGPT arrived, and the *world needed *Nvidia.",
 "The first *five-trillion-dollar|3 company *ever. Even *DeepSeek's shock couldn't *stop it.",
 "Then, the one fight he *couldn't *win. Reports of a *spy *plot China calls it a smear. An admitted *affair.",
 "On *November *12th, he *resigned. From a *Denny's booth to the *top of the world... and *out.",
]

words = []  # display words
lines = []
k = 0
for li, line in enumerate(D):
    toks = line.split()
    lstart = None
    for tok in toks:
        n = 1
        if '|' in tok:
            tok, n = tok.split('|'); n = int(n)
        hi = tok.startswith('*'); tok = tok.lstrip('*')
        seg = al[k:k + n]; k += n
        t0, t1 = seg[0][1], seg[-1][2]
        if lstart is None: lstart = t0
        words.append(dict(text=tok, t0=round(t0, 3), t1=round(t1, 3), hi=hi, line=li))
    lines.append(dict(t0=round(lstart, 3), t1=round(words[-1]['t1'], 3)))
assert k == len(al), (k, len(al))

# Caption chunks: <=3 words, break after punctuation
chunks = []
cur = []
for i, w in enumerate(words):
    cur.append(i)
    end_punct = re.search(r'[.,?:!]$|\.\.\.$', w['text'])
    nxt_line_change = i + 1 < len(words) and words[i + 1]['line'] != w['line']
    if len(cur) == 3 or end_punct or nxt_line_change or i == len(words) - 1:
        chunks.append(cur); cur = []
cap = []
for ci, c in enumerate(chunks):
    t0 = words[c[0]]['t0'] - 0.06
    t1 = words[c[-1]]['t1'] + 0.25
    if ci + 1 < len(chunks):
        t1 = min(t1, words[chunks[ci + 1][0]]['t0'] - 0.06)
        if words[chunks[ci + 1][0]]['t0'] - words[c[-1]]['t1'] < 0.45:
            t1 = words[chunks[ci + 1][0]]['t0'] - 0.06
    cap.append(dict(w=c, t0=round(t0, 3), t1=round(t1, 3)))

# anchor helper: time of the n-th display word in line li
def A(li, idx):
    ws = [w for w in words if w['line'] == li]
    return ws[idx]['t0']

def AE(li, idx):
    ws = [w for w in words if w['line'] == li]
    return ws[idx]['t1']

ids = ['hook', 'origin', 'grind', 'dennys', 'flop', 'brink', 'comeback', 'giants', 'cuda', 'ai', 'peak', 'scandal', 'exit']
scenes = []
for i, sid in enumerate(ids):
    s0 = 0.0 if i == 0 else lines[i]['t0'] - 0.12
    s1 = T_END if i == len(ids) - 1 else lines[i + 1]['t0'] - 0.12
    scenes.append(dict(id=sid, t0=round(s0, 3), t1=round(s1, 3)))

# Named anchors used by the animation (all in seconds)
anc = {
 'hook_nov': A(0, 9), 'hook_gone': A(0, 14), 'hook_he': A(0, 12),
 'or_taiwan': A(1, 4), 'or_sent': A(1, 6), 'or_kentucky': A(1, 13), 'or_cleaned': A(1, 18),
 'gr_hs': A(2, 3), 'gr_ee': A(2, 7),
 'dn_booth': A(3, 1), 'dn_three': A(3, 4), 'dn_chips': A(3, 8), 'dn_graphics': A(3, 12), 'dn_catch': A(3, 13), 'dn_dozens': A(3, 15),
 'fl_wrong': A(4, 6), 'fl_jensen': A(4, 8), 'fl_admitted': A(4, 12), 'fl_and': A(4, 16), 'fl_five': A(4, 19),
 'br_half': A(5, 5), 'br_one': A(5, 8), 'br_every': A(5, 13), 'br_chip': A(5, 17),
 'cb_hit': A(6, 3), 'cb_geforce': A(6, 5), 'cb_gpu': A(6, 12), 'cb_mighty': A(6, 14), 'cb_3dfx': A(6, 15), 'cb_bought': A(6, 17), 'cb_left': A(6, 20),
 'gi_giants': A(7, 2), 'gi_amd': A(7, 4), 'gi_ati': A(7, 8), 'gi_intel': A(7, 9), 'gi_larrabee': A(7, 14), 'gi_cancelled': A(7, 16),
 'cu_cuda': A(8, 3), 'cu_turn': A(8, 4), 'cu_brain': A(8, 10), 'cu_wall': A(8, 11),
 'ai_alexnet': A(9, 1), 'ai_crushed': A(9, 9), 'ai_decade': A(9, 13), 'ai_chatgpt': A(9, 15), 'ai_world': A(9, 18), 'ai_needed': A(9, 19),
 'pk_five': A(10, 2), 'pk_ever': A(10, 4), 'pk_even': A(10, 5), 'pk_deepseek': A(10, 6), 'pk_stop': A(10, 9),
 'sc_couldnt': A(11, 5), 'sc_reports': A(11, 7), 'sc_china': A(11, 11), 'sc_admitted': A(11, 17), 'sc_affair': A(11, 18),
 'ex_resigned': A(12, 4), 'ex_from': A(12, 5), 'ex_top': A(12, 11), 'ex_and': A(12, 15), 'ex_out': A(12, 16), 'ex_outEnd': AE(12, 16),
}
anc = {k: round(v, 3) for k, v in anc.items()}

# SFX cues
sfx = []
def S(kind, t, gain=1.0): sfx.append(dict(k=kind, t=round(t, 3), g=gain))
for sc in scenes[1:]:
    if sc['id'] in ('scandal','exit'): continue
    S('whoosh', sc['t0'] - 0.08, 0.8)
S('boom', 0.0, 0.9)
S('stamp', anc['hook_nov'], 0.8)
S('scratch', anc['hook_gone'] + 0.05, 1.0)
S('pop', anc['or_taiwan'], 0.5); S('plane', anc['or_sent'] - 0.1, 0.6); S('pop', anc['or_kentucky'], 0.5)
for i in range(4): S('squeak', anc['or_cleaned'] + i * 0.32, 0.45)
for i in range(6): S('tock', lines[2]['t0'] + 0.15 + i * 0.27, 0.5)
S('pop', anc['gr_hs'], 0.5); S('levelup', anc['gr_ee'] + 0.2, 0.5)
S('cup', anc['dn_booth'], 0.4); S('cup', anc['dn_three'], 0.4); S('cup', anc['dn_chips'], 0.4)
S('sparkle', anc['dn_graphics'], 0.6); S('jingle', anc['dn_dozens'], 0.6)
S('jingle', lines[4]['t0'], 0.5); S('buzzer', anc['fl_wrong'], 0.7); S('plane', anc['fl_jensen'], 0.5)
for i in range(7): S('coin', anc['fl_five'] + i * 0.11, 0.5)
for i in range(9): S('heart', lines[5]['t0'] + 0.1 + i * 0.62, 0.8)
S('tick', anc['br_one'], 0.6); S('riser', anc['br_every'] - 0.2, 0.6)
S('slam', anc['cb_hit'], 0.9); S('powerup', anc['cb_geforce'], 0.7); S('bell', anc['cb_gpu'], 0.6)
S('jingle', anc['cb_mighty'], 0.6)
for i, dt in enumerate([0.0, 0.32, 0.64]): S('hit', anc['cb_3dfx'] + 0.25 + dt, 0.9)
S('ko', anc['cb_bought'], 0.8); S('coin', anc['cb_left'], 0.5)
S('rumble', anc['gi_giants'] - 0.1, 0.8); S('jingle', anc['gi_amd'] - 0.15, 0.5); S('hit', anc['gi_ati'], 0.9)
S('jingle', anc['gi_intel'], 0.5); S('crash', anc['gi_cancelled'], 1.0); S('stamp', anc['gi_cancelled'] + 0.35, 0.8)
S('crack', anc['cu_cuda'], 0.7); S('sparkle', anc['cu_brain'], 0.6); S('sadtrom', anc['cu_wall'] + 0.4, 0.5)
S('powerup', anc['ai_alexnet'], 0.6); S('whoosh', anc['ai_crushed'], 0.6); S('pop', anc['ai_chatgpt'], 0.6)
for i in range(5): S('pop', anc['ai_chatgpt'] + 0.15 + i * 0.12, 0.35)
S('rumble', anc['ai_world'], 0.6)
for i in range(10): S('coin', anc['pk_five'] + i * 0.09, 0.45)
S('jingle', anc['pk_even'] - 0.1, 0.5); S('thunder', anc['pk_deepseek'] + 0.05, 1.0); S('riser', anc['pk_stop'] - 0.15, 0.6)
S('scratch', lines[11]['t0'] - 0.1, 0.9)
S('glitch', lines[11]['t0'] + 0.3, 0.6)
S('stamp', anc['sc_reports'], 0.5); S('stamp', anc['sc_admitted'], 0.5)
S('stamp', lines[12]['t0'] + 0.1, 0.5)
S('whoosh', anc['ex_outEnd'] + 0.35, 0.7)

tl = dict(T_END=T_END, FPS=30, words=words, lines=lines, cap=cap, scenes=scenes, anc=anc, sfx=sorted(sfx, key=lambda s: s['t']))
json.dump(tl, open('/home/claude/work/timeline.json', 'w'), indent=0)
for s in scenes: print(s)
print(len(words), 'words', len(cap), 'chunks', len(sfx), 'sfx')
