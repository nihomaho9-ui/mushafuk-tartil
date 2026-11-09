import fs from 'node:fs'; import {seg} from './cases.mjs';
const cache=new Map();
const rd=(r,s,a)=>{const k=`${r}-${s}-${a}`; if(!cache.has(k)){const b=fs.readFileSync(`audio/${k}.f32`);cache.set(k,new Float32Array(b.buffer,b.byteOffset,b.byteLength/4).slice()); if(cache.size>40)cache.delete(cache.keys().next().value);} return cache.get(k);};
function pieces(r,s,a){const x=rd(r,s,a); const sg=seg(r,s,a); const n=sg.length; const b=[0]; for(let i=1;i<n;i++) b.push(Math.round((sg[i-1].en+sg[i].st)/2*16)); b.push(x.length); const P={}; sg.forEach((w,i)=>P[w.pos]=x.subarray(Math.min(b[i],x.length),Math.min(b[i+1],x.length))); return P;}
function fade(a){const o=a.slice();const f=Math.min(160,o.length>>1);for(let i=0;i<f;i++){o[i]*=i/f;o[o.length-1-i]*=i/f;}return o;}
export function assemble(c){const out=[];
  for(const p of c.parts){ if(!p.keep){out.push(rd(c.r,p.s,p.a));continue;}
    const P=pieces(c.r,p.s,p.a);
    for(const pos of p.keep){ if(p.replace&&pos===p.replace.at){const D=pieces(c.r,p.replace.donor.s,p.replace.donor.a); out.push(fade(D[p.replace.donor.pos]));} else out.push(fade(P[pos])); } }
  const n=out.reduce((a,x)=>a+x.length,0); const o=new Float32Array(n+16000); let q=0; for(const x of out){o.set(x,q);q+=x.length;} return o;}
