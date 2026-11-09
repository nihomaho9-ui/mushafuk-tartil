import fs from 'node:fs';
const n=process.argv[2]; const cases=new Map(JSON.parse(fs.readFileSync('cases.json')).map(c=>[c.id,c]));
const cnt={}; const ex=[];
for(const f of fs.readdirSync('res/'+n))for(const l of fs.readFileSync('res/'+n+'/'+f,'utf8').split('\n'))if(l){const r=JSON.parse(l);const c=cases.get(r.id); if(!['clean','restart'].includes(c.kind))continue; for(const i of r.issues){if(i.note)continue; const k=`${c.kind} ${i.kind} ${i.src||'word'}${i.atStop?' stop':''}`; cnt[k]=(cnt[k]||0)+1; if(ex.length<40)ex.push(`${r.id} ${i.s}:${i.a} w${i.w} ${i.kind} ${i.src||''} t=${i.t}`);}}
console.log(cnt); console.log(ex.join('\n'));
