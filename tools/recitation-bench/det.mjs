import fs from 'node:fs';
const n=process.argv[2]; const cases=new Map(JSON.parse(fs.readFileSync('cases.json')).map(c=>[c.id,c]));
const cnt={};
for(const f of fs.readdirSync('res/'+n))for(const l of fs.readFileSync('res/'+n+'/'+f,'utf8').split('\n'))if(l){const r=JSON.parse(l);const c=cases.get(r.id); if(['clean','restart'].includes(c.kind))continue; const seen=new Set(); for(const i of r.issues){const key=JSON.stringify([i.s,i.a,i.w,i.kind]); if(seen.has(key))continue; seen.add(key); const inT=i.s===c.s&&i.a===c.b; const k=`${c.kind.padEnd(6)} ${inT?'TARGET':'other '} ${i.kind} ${i.src||'word'}${i.note?' note':''}${i.atStop||i.t>=r.dur-1.2?' @stop':''}`; cnt[k]=(cnt[k]||0)+1;}}
for(const k of Object.keys(cnt).sort()) console.log(String(cnt[k]).padStart(4),k);
