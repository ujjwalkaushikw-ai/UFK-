import base64, json
tl=json.load(open('/home/claude/work/timeline.json'))
head=base64.b64encode(open('/home/claude/anim/head_sticker.png','rb').read()).decode()
js=open('/home/claude/anim/anim.js').read()
html=f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{{margin:0;background:#000}}canvas{{display:block}}</style></head>
<body><canvas id="c" width="1080" height="1920"></canvas>
<script>window.TL={json.dumps(tl)};window.HEAD_SRC="data:image/png;base64,{head}";</script>
<script>{js}</script></body></html>"""
open('/home/claude/anim/render.html','w').write(html)
