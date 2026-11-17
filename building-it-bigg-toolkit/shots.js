const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
  const p=await b.newPage({viewport:{width:1080,height:1920}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('file:///home/claude/anim/render.html'); await p.evaluate(()=>window.ready);
  const times=process.argv.slice(2).map(Number);
  for(const t of times){
    const d=await p.evaluate(t=>{render(t);return document.getElementById('c').toDataURL('image/jpeg',0.85)},t);
    fs.writeFileSync(`/home/claude/anim/shots/f_${t.toFixed(2)}.jpg`,Buffer.from(d.split(',')[1],'base64'));
  }
  console.log('errors:',errs.length?errs.slice(0,5):'none');
  await b.close();
})();
