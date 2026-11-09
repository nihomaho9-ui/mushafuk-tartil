// node run.mjs NAME VARIANT_JSON [subset: dev|all] [workers]
import fs from 'node:fs'; import {spawn} from 'node:child_process';
const [name,variant='{}',subset='dev',nw='7']=process.argv.slice(2);
let cases=JSON.parse(fs.readFileSync('cases.json'));
const H=(c)=>[...c.r+c.s+':'+c.b].reduce((a,ch)=>(a*31+ch.charCodeAt(0))%1000,0);
if(subset==='dev') cases=cases.filter(c=>H(c)%3===0);
if(subset==='held') cases=cases.filter(c=>H(c)%3!==0);
fs.mkdirSync('res/'+name,{recursive:true}); const done=new Set(); for(const f of fs.readdirSync('res/'+name)) for(const l of fs.readFileSync('res/'+name+'/'+f,'utf8').split('\n')) if(l) done.add(JSON.parse(l).id);
cases=cases.filter(c=>!done.has(c.id)); console.log(name,'todo',cases.length);
// longest first, round-robin
const W=+nw; const parts=Array.from({length:W},()=>[]); cases.forEach((c,i)=>parts[i%W].push(c));
await Promise.all(parts.map((p,i)=>new Promise(res=>{fs.writeFileSync(`part-${name}-${i}.json`,JSON.stringify(p)); const ch=spawn('node',['worker.mjs',`part-${name}-${i}.json`,`res/${name}/w${i}.jsonl`,variant],{stdio:'inherit'}); ch.on('exit',res);})));
console.log('finished',name);
