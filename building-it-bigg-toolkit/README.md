# Building it Bigg — toolkit (from video #1, Jensen Huang)

Attach this zip at the start of each new video so the engine is reused, not rebuilt.
Scripts were written for paths under /home/claude/{work,anim}; adjust paths at the top of each file.

| File | Reusable? | What it does |
|---|---|---|
| head_cutout.py | yes | Removes a baked checkerboard (or uses real alpha) and adds the black sticker outline |
| align_vo.py | edit TEXT + EXTRA words | pocketsphinx forced alignment of the script (spoken form) to the VO → align.json |
| tighten_vo.py | edit SPECIAL pauses | Shortens pauses (0.13s in-line / 0.30s between lines / dramatic beats), remaps word times |
| clean_vo.sh | yes | Denoise, EQ, de-ess, compress, tempo, two-pass loudnorm −16 LUFS |
| build_timeline.py | rewrite D (display lines), anchors, SFX cues | Captions, scenes, anchors, SFX → timeline.json (also divide times by tempo first) |
| anim.js | engine = everything above `/* ================= SCENES` + master render; scenes = per person | Deterministic canvas renderer: wobble primitives, props, stick-figure rig + poses, bobble spring, HUD/boss bar, captions, level cards |
| build_html.py | yes | Inlines timeline + head into render.html |
| shots.js / sheet.py | yes | Test stills at given times → contact sheet for QA |
| render_all.js | yes | Headless Chrome → JPEG frames piped to ffmpeg, one mp4 per scene (`node render_all.js 7,12` re-renders only those) |
| audio.py | edit section() mapping | Chiptune score with story-driven intensity + 30 synthesized SFX |
| mix.py | yes | Music −23 LUFS, SFX −25.5, 9 dB ducking under VO; then alimiter + loudnorm −14 LUFS |
| thumb.js | edit text/pose | Thumbnail render from the engine |
