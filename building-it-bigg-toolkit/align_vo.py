import wave, json, re
from pocketsphinx import Decoder
TEXT = """he beat every rival in his way then on november twelfth twenty twenty six he was gone
jensen huang born in taiwan nineteen sixty three sent to america at nine to a kentucky boarding school where he cleaned toilets
competitive table tennis player high school grad at sixteen electrical engineer
nineteen ninety three a dennys booth three engineers one bet chips built just for graphics the catch dozens of rivals had the same idea
their first chip bet on the wrong tech jensen flew to japan admitted it to sega and sega invested five million dollars anyway
he laid off more than half the company one month of payroll left everything rode on one chip
the riva one twenty eight hit then geforce two fifty six sold as the worlds first gpu and mighty three dfx nvidia bought what was left of it
then the giants came amd bought nvidias biggest rival ati intel built its own gpu larrabee and cancelled it
jensens weirdest bet cuda turn a gaming chip into a general purpose brain wall street didnt get it
twenty twelve alexnet an ai trained on two nvidia gaming cards crushed the field a decade later chatgpt arrived and the world needed nvidia
the first five trillion dollar company ever even deepseeks shock couldnt stop it
then the one fight he couldnt win reports of a spy plot china calls it a smear an admitted affair
on november twelfth he resigned from a dennys booth to the top of the world and out"""
EXTRA = {
 'nvidia':'EH N V IH D IY AH','nvidias':'EH N V IH D IY AH Z','jensen':'JH EH N S AH N','jensens':'JH EH N S AH N Z',
 'huang':'HH W AA NG','geforce':'JH IY F AO R S','riva':'R IY V AH','cuda':'K UW D AH','alexnet':'AE L EH K S N EH T',
 'chatgpt':'CH AE T JH IY P IY T IY','deepseeks':'D IY P S IY K S','larrabee':'L AE R AH B IY','dfx':'D IY EH F EH K S',
 'gpu':'JH IY P IY Y UW','ati':'EY T IY AY','amd':'EY EH M D IY','dennys':'D EH N IY Z','worlds':'W ER L D Z','didnt':'D IH D AH N T','couldnt':'K UH D AH N T',
}
w=wave.open('vo16.wav'); raw=w.readframes(w.getnframes())
d=Decoder(samprate=16000, bestpath=False, beam=1e-120, wbeam=1e-100, pbeam=1e-120)
for k,v in EXTRA.items():
    if d.lookup_word(k) is None: d.add_word(k, v, True)
words=TEXT.split()
missing=[x for x in set(words) if d.lookup_word(x) is None]
print('missing',missing)
d.set_align_text(' '.join(words))
d.start_utt(); d.process_raw(raw, full_utt=True); d.end_utt()
out=[]
print('hyp', (d.hyp().hypstr[:80] if d.hyp() else None))
for s in d.seg():
    if s.word in ('<s>','</s>','<sil>') or s.word.startswith('['): continue
    out.append((re.sub(r'\(\d+\)','',s.word), s.start_frame*0.01, (s.end_frame+1)*0.01))
print(len(out), len(words))
json.dump(out, open('align.json','w'))
for n,a,b in out: print(f"{a:7.2f}-{b:7.2f} {n}")
