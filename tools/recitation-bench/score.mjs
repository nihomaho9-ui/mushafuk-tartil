import fs from 'node:fs'; import {seg} from './cases.mjs';
const alen=(r,s,a)=>fs.statSync(`audio/${r}-${s}-${a}.f32`).size/4/16000;
const names=process.argv.slice(2); const cases=new Map(JSON.parse(fs.readFileSync('cases.json')).map(c=>[c.id,c]));
const load=(n)=>{const m=new Map();for(const f of fs.readdirSync('res/'+n))for(const l of fs.readFileSync('res/'+n+'/'+f,'utf8').split('\n'))if(l){const r=JSON.parse(l);m.set(r.id,r);}return m;};
const R=names.map(load); const common=[...R[0].keys()].filter(id=>R.every(m=>m.has(id)&&!m.get(id).err));
const hard=(i)=>!i.note;
const FILTER=globalThis.FILTER||(()=>true); // notes don't interrupt
function judge(c,r){ const seen=new Set(); r.issues=r.issues.filter(i=>{const k=JSON.stringify([i.s,i.a,i.w,i.kind,i.note]);if(seen.has(k))return false;seen.add(k);return true;}).filter(FILTER); const iss=r.issues.filter(hard); const notes=r.issues.filter(i=>i.note);
  const inT=(i)=>i.s===c.s&&i.a===c.b;
  switch(c.kind){
    case 'clean': case 'restart': return {fp:iss.length, fpNote:notes.length};
    case 'omit': case 'sub': case 'trunc': { const hit=iss.find(i=>inT(i)&&(i.w==null||Math.abs(i.w-c.tw)<=1||(i.words>1))); const any=iss.some(inT); const other=iss.filter(i=>!inT(i)).length; return {det:!!(hit||any),loc:!!hit,other}; }
    case 'rep': { const hit=r.issues.find(i=>inT(i)&&Math.abs((i.w??-9)-c.tw)<=1); const any=r.issues.some(inT); return {det:any,loc:!!hit,other:iss.filter(i=>!inT(i)).length}; }
    case 'skip': { const hit=iss.find(i=>i.s===c.s&&i.a===c.b); const any=iss.length>0; return {det:any,loc:!!hit,other:iss.filter(i=>!(i.s===c.s&&i.a===c.b)).length}; }
    case 'order': { const hit=iss.find(i=>i.s===c.s&&(i.a===c.b||i.a===c.b+1)); return {det:iss.length>0,loc:!!hit,other:0}; }
  }}
const kinds=['clean','restart','omit','sub','rep','trunc','skip','order'];
for(const [ni,n] of names.entries()){ const m=R[ni]; const rows={};
  let wall=0,dur=0,maxFeed=0,cov=0,covN=0,lat=[];
  for(const id of common){const c=cases.get(id),r=m.get(id); const j=judge(c,r); const k=c.kind; rows[k]??={n:0,fp:0,fpClips:0,fpNote:0,det:0,loc:0,other:0}; const x=rows[k]; x.n++; if(j.fp!=null){x.fp+=j.fp;x.fpClips+=j.fp>0?1:0;x.fpNote+=j.fpNote;} if(j.det)x.det++; if(j.loc)x.loc++; x.other+=j.other||0;
    wall+=r.wall;dur+=r.dur;maxFeed=Math.max(maxFeed,r.maxFeed);
    if(k==='clean'){ let off=0; for(const p of c.parts){ const sg=seg(c.r,p.s,p.a); for(const w of sg){ covN++; const t=r.words[`${p.s}:${p.a}:${w.pos}`]; if(t!=null){cov++; lat.push(t-(off+w.en/1000));} } off+=alen(c.r,p.s,p.a);} }
  }
  console.log(`== ${n}  (${common.length} clips, ${(dur/60).toFixed(0)} min audio, ${(dur/(wall/1000)).toFixed(1)}x realtime per core, max feed ${Math.round(maxFeed)}ms)`);
  lat.sort((a,b)=>a-b); const q=(f)=>lat.length?lat[Math.floor(f*(lat.length-1))].toFixed(2):'-';
  console.log(`tracking: words revealed ${(100*cov/covN).toFixed(1)}% of ${covN}; reveal delay after word end median ${q(0.5)}s p90 ${q(0.9)}s (audio fed in 0.48s chunks)`);
  for(const k of kinds){const x=rows[k]; if(!x)continue; if(k==='clean'||k==='restart') console.log(`${k.padEnd(8)} n=${x.n} falseFlags=${x.fp} clipsWithFalseFlag=${x.fpClips} (${(100*x.fpClips/x.n).toFixed(1)}%) notes=${x.fpNote}`); else console.log(`${k.padEnd(8)} n=${x.n} detected=${(100*x.det/x.n).toFixed(1)}% rightPlace=${(100*x.loc/x.n).toFixed(1)}% extraFlagsElsewhere=${x.other}`);}
}
