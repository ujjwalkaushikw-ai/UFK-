#!/bin/bash
# Usage: clean_vo.sh vo_tight.wav vo_final.wav [tempo]   -- denoise, EQ, de-ess, compress, two-pass loudnorm to -16 LUFS
IN=$1; OUT=$2; TEMPO=${3:-1.10}
CH="highpass=f=80,lowpass=f=15000,afftdn=nf=-52:nr=14:tn=1,atempo=$TEMPO,equalizer=f=3500:t=q:w=1.2:g=2,deesser=i=0.35,acompressor=threshold=-30dB:ratio=3:attack=8:release=120:makeup=8"
J=$(ffmpeg -hide_banner -y -i "$IN" -af "$CH,loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
g(){ echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -v error -y -i "$IN" -af "$CH,loudnorm=I=-16:TP=-1.5:LRA=7:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" -ac 2 -c:a pcm_s16le "$OUT"
