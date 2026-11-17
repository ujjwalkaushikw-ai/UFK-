const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const {spawn}=require('child_process'); const fs=require('fs');
const TL=JSON.parse(fs.readFileSync('/home/claude/work/timeline.json'));
const FPS=30; const OUT='/home/claude/anim/scenes';
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
  const p=await b.newPage({viewport:{width:1080,height:1920}});
  await p.goto('file:///home/claude/anim/render.html'); await p.evaluate(()=>window.ready);
  const only=process.argv[2]?process.argv[2].split(',').map(Number):null;
  for(let i=0;i<TL.scenes.length;i++){
    if(only&&!only.includes(i)) continue;
    const sc=TL.scenes[i]; const f0=Math.round(sc.t0*FPS), f1=Math.round(sc.t1*FPS);
    const tmp=`${OUT}/scene_${String(i).padStart(2,'0')}.tmp.mp4`, fin=tmp.replace('.tmp','');
    const ff=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-r','30',tmp]);
    let ferr=''; ff.stderr.on('data',d=>ferr+=d);
    const t0=Date.now();
    for(let f=f0;f<f1;f++){
      const d=await p.evaluate(t=>{render(t);return document.getElementById('c').toDataURL('image/jpeg',0.93)},f/FPS);
      const buf=Buffer.from(d.slice(d.indexOf(',')+1),'base64');
      if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r));
    }
    ff.stdin.end();
    const code=await new Promise(r=>ff.on('close',r));
    if(code===0){fs.renameSync(tmp,fin);console.log(`scene ${i} ${sc.id}: ${f1-f0} frames in ${((Date.now()-t0)/1000).toFixed(1)}s`);}
    else console.log(`scene ${i} FAILED`,ferr);
  }
  await b.close();
})();
