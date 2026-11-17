const {chromium}=require('/opt/npm-tools/node_modules/playwright'); const fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
  const p=await b.newPage({viewport:{width:1080,height:1920}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/anim/render.html'); await p.evaluate(()=>window.ready);
  const mk=async(mode)=>p.evaluate((mode)=>{
    const t=2.2; BOIL=3; ctx.setTransform(1,0,0,1,0,0); ctx.filter='none';
    // left half bright world, right half grayscale
    ctx.save(); ctx.translate(540,1000); ctx.scale(1.12,1.12); ctx.translate(-540,-1000); hookWorld(t,false,0); ctx.restore();
    if(mode==='bg'){ return document.getElementById('c').toDataURL('image/png'); }
    // giant Jensen
    jensen({x:540,y:1180,s:1.75,outfit:'leather',pose:POSE.cross(t),bob:{a:-0.12,dy:0}});
    // text
    txt('HE BEAT', 540, 300, {size:150, fill:'#fff', sw:26});
    txt('EVERY RIVAL', 540, 450, {size:150, fill:YEL, sw:26});
    ctx.save(); ctx.translate(540,1560); ctx.rotate(-0.05);
    rr(-470,-110,940,220,24,'#e5383b',10); txt('EXCEPT ONE', 0, 6, {size:140, fill:'#fff', sw:20}); ctx.restore();
    // 4 X'd rivals counter
    rr(330,1720,420,90,16,'rgba(10,10,14,.85)',6); txt('RIVALS DEFEATED: 4', 540, 1766, {size:40, font:MONO, weight:700, fill:YEL, sw:0});
    return document.getElementById('c').toDataURL('image/png');
  },mode);
  fs.writeFileSync('thumb_vertical.png',Buffer.from((await mk('full')).split(',')[1],'base64'));
  // jensen-only layer for landscape compose
  const jl=await p.evaluate(()=>{ ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,W,H); BOIL=3;
    jensen({x:540,y:1700,s:2.6,outfit:'leather',pose:POSE.cross(2.2),bob:{a:-0.1,dy:0}}); return document.getElementById('c').toDataURL('image/png');});
  fs.writeFileSync('jensen_layer.png',Buffer.from(jl.split(',')[1],'base64'));
  fs.writeFileSync('bg_layer.png',Buffer.from((await mk('bg')).split(',')[1],'base64'));
  console.log('errors',errs); await b.close();
})();
