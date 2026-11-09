import fs from 'node:fs'; import {makeSession} from './engine.mjs'; import {assemble} from './clip.mjs';
const [id,variant='{}']=process.argv.slice(2); const c=JSON.parse(fs.readFileSync('cases.json')).find(x=>x.id===id);
const sess=await makeSession(JSON.parse(variant)); const pcm=assemble(c); let cur=0; const log=[];
sess.setSink(m=>{ if(m.type==='word_progress') log.push(`${(cur/16000).toFixed(1)} wp ${m.surah}:${m.ayah} wi=${m.word_index}/${m.total_words} m=[${(m.matched_indices||[]).join(',')}]`); else if(m.type.startsWith('correction')) {const i=m.issue||m.state?.issue; log.push(`${(cur/16000).toFixed(1)} ${m.type} ${m.state?.phase||''} ${i?`${i.surah}:${i.ayah} w${i.word} ${i.kind} ${i.source||''}`:''}`); if(m.state?.phase==='error'){sess.z.correct('review_later');}} });
sess.z.setExpected(c.exp);
for(let p=0;p<pcm.length;p+=7680){cur=Math.min(pcm.length,p+7680);await sess.s.feed(pcm.subarray(p,cur));}
await sess.s.stop();
console.log(JSON.stringify({kind:c.kind,tw:c.tw,parts:c.parts.map(p=>p.a+(p.keep?'*':''))}));
let last=''; for(const l of log){const k=l.replace(/^\S+ /,''); if(k!==last) console.log(l); last=k;}
