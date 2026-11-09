import fs from 'node:fs'; import {execFileSync} from 'node:child_process';
import {TARGETS,SUDAIS,RECITERS} from './set.mjs';
const need=new Set(); for(const [s,a] of TARGETS){for(const x of [a-1,a,a+1]) if(x>=1) need.add(s+':'+x);}
const jobs=[];
for(const r of RECITERS){ for(const k of need){const [s,a]=k.split(':').map(Number); if(r==='sudais'&&!SUDAIS.has(s))continue;
  const segs=JSON.parse(fs.readFileSync(`seg/${r}-${s}.json`)); const e=segs.find(x=>x.verse_key===k); if(!e)continue;
  let u=e.url; u=u.startsWith('//')?'https:'+u:u.startsWith('http')?u:'https://verses.quran.com/'+u;
  const out=`audio/${r}-${s}-${a}.f32`; if(!fs.existsSync(out)) jobs.push([u,out]);}}
console.log('jobs',jobs.length);
let i=0; async function worker(){while(i<jobs.length){const [u,out]=jobs[i++];try{const b=Buffer.from(await (await fetch(u)).arrayBuffer());fs.writeFileSync(out+'.mp3',b);execFileSync('ffmpeg',['-loglevel','error','-y','-i',out+'.mp3','-ar','16000','-ac','1','-f','f32le',out]);fs.unlinkSync(out+'.mp3');}catch(e){console.log('fail',u,e.message)}}}
await Promise.all(Array.from({length:12},worker)); console.log('done', fs.readdirSync('audio').length);
