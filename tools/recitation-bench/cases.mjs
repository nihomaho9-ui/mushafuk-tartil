import fs from 'node:fs'; import {TARGETS,SUDAIS,RECITERS} from './set.mjs';
const corpus=JSON.parse(fs.readFileSync((process.env.TARTIL_REPO||new URL('../..',import.meta.url).pathname.replace(/\/$/,''))+'/public/corpus.json','utf8'));
export const W=(s,a)=>corpus.surahs[s-1].ayahs[a-1]?.w??null;
export const nAyah=(s)=>corpus.surahs[s-1].ayahs.length;
const segCache={}; export function seg(r,s,a){const k=r+s; segCache[k]??=JSON.parse(fs.readFileSync(`seg/${r}-${s}.json`)); const e=segCache[k].find(x=>x.verse_key===`${s}:${a}`); return e?.segments?.filter(x=>x.length>=4).map(x=>({pos:x[1]-1,st:x[2],en:x[3]}));}
export const has=(r,s,a)=>fs.existsSync(`audio/${r}-${s}-${a}.f32`);
// deterministic rng
let seed=7; const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
export function build(){
  const cases=[]; let mism=0;
  for(const r of RECITERS) for(const [s,b] of TARGETS){
    if(r==='sudais'&&!SUDAIS.has(s)) continue;
    const A=b>1&&has(r,s,b-1)?b-1:null, C=b<nAyah(s)&&has(r,s,b+1)?b+1:null;
    const words=W(s,b); const sg=seg(r,s,b); if(!sg){continue;}
    if(sg.length!==words.length){mism++;}
    const ok=sg.length===words.length;
    const start=A??b; const exp={surah:s,ayah:start,ayahEnd:Math.min(nAyah(s),Math.max((C??b)+1,start+7))};
    const full=(a)=>({s,a}); const base={r,s,b,exp};
    const id=(k)=>`${r}-${s}-${b}-${k}`;
    cases.push({...base,id:id('clean'),kind:'clean',parts:[A&&full(A),full(b),C&&full(C)].filter(Boolean)});
    if(!ok||words.length<4) continue;
    const n=words.length; const k=1+Math.floor(rnd()*(n-2)); // interior word
    const wordsOf=(drop)=>({s,a:b,keep:sg.map(x=>x.pos).filter(p=>!drop.includes(p))});
    cases.push({...base,id:id('omit'),kind:'omit',tw:k,parts:[A&&full(A),wordsOf([k]),C&&full(C)].filter(Boolean)});
    // substitution: word from another surah/ayah with different phonemes
    let donor=null; for(let t=0;t<50&&!donor;t++){const [ds,da]=TARGETS[Math.floor(rnd()*TARGETS.length)]; if(ds===s&&Math.abs(da-b)<3)continue; if(!has(r,ds,da))continue; const dsg=seg(r,ds,da); const dw=W(ds,da); if(!dsg||dsg.length!==dw.length||dw.length<3)continue; const j=1+Math.floor(rnd()*(dw.length-2)); if(dw[j][1]===words[k][1])continue; const len=dsg[j].en-dsg[j].st, len0=sg[k].en-sg[k].st; if(len<250||Math.abs(len-len0)>len0*0.8)continue; donor={s:ds,a:da,pos:j};}
    if(donor) cases.push({...base,id:id('sub'),kind:'sub',tw:k,parts:[A&&full(A),{s,a:b,keep:sg.map(x=>x.pos),replace:{at:k,donor}},C&&full(C)].filter(Boolean)});
    cases.push({...base,id:id('rep'),kind:'rep',tw:k,parts:[A&&full(A),{s,a:b,keep:sg.flatMap(x=>x.pos===k?[k,k]:[x.pos])},C&&full(C)].filter(Boolean)});
    if(n>=6){const k2=Math.min(k,n-4); cases.push({...base,id:id('restart'),kind:'restart',parts:[A&&full(A),{s,a:b,keep:sg.flatMap(x=>x.pos===k2+2?[k2+2,k2,k2+1,k2+2]:[x.pos])},C&&full(C)].filter(Boolean)});}
    cases.push({...base,id:id('trunc'),kind:'trunc',tw:n-2,parts:[A&&full(A),wordsOf([n-2,n-1]),C&&full(C)].filter(Boolean)});
    if(A&&C&&has(r,s,b+2)){ cases.push({...base,id:id('skip'),kind:'skip',parts:[full(A),full(C),full(b+2)]});
      cases.push({...base,id:id('order'),kind:'order',parts:[full(A),full(C),full(b)]}); }
  }
  return {cases,mism};
}
if(process.argv[1].endsWith('cases.mjs')){const {cases,mism}=build(); const by={}; for(const c of cases) by[c.kind]=(by[c.kind]||0)+1; console.log(cases.length,by,'segMismatch',mism); fs.writeFileSync('cases.json',JSON.stringify(cases));}
