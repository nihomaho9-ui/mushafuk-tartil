// Runs clips through @tilawa/core exactly as the app configures it (same model, corpus, config, structural rules).
import fs from 'node:fs';
const REPO=process.env.TARTIL_REPO||new URL('../..',import.meta.url).pathname.replace(/\/$/,'');
const ort = await import(REPO+'/node_modules/onnxruntime-web/dist/ort.wasm.min.mjs').catch(()=>import(REPO+'/node_modules/onnxruntime-web/dist/ort.node.min.mjs'));
const core = await import(REPO+'/node_modules/@tilawa/core/dist/index.js');
ort.env.wasm.numThreads=1;
export async function makeSession(variant={}){
  const model=fs.readFileSync(REPO+'/public/model.onnx');
  const corpus=JSON.parse(fs.readFileSync(REPO+'/public/corpus.json','utf8'));
  let sink=null;
  const s=await core.createRecognitionSession({ort,model:model.buffer.slice(model.byteOffset,model.byteOffset+model.byteLength),corpus,stayOnSurah:true,
    config:{outsideJumpCost:24,commitDwell:4,backfillRatio:2,...(variant.config||{})},
    onEvent:(m)=>sink&&sink(m)});
  const z=s.zipformer;
  await z.setStructural(variant.structural||{ayahOrder:true,similarVerse:true,timing:'pause'});
  z.setSlipHead(variant.slipHead??'high');
  z.setMode('correction');
  if(variant.thresholds) Object.assign(z.correction.thresholds,variant.thresholds);
  const total=(su,a)=>corpus.surahs[su-1].ayahs[a-1].w.length;
  return {s,z,total,setSink:(f)=>{sink=f}};
}
const CH=7680;
export async function runClip(sess,pcm,expected,app=false){
  const {s,z}=sess; let pos=0; let cur=0;
  const issues=[]; const words=new Map(); const engineWords=new Map(); const firstSeen={},lastMatched={},lastCursor={},matchedSets={}; const snaps=[]; const snapped2=new Set();
  const vsnap=(su,a)=>z.verdicts().filter(v=>v.surah===su&&v.ayah===a).map(v=>[v.word,v.state,r2(v.heardRatio),r2(v.distance),r2(v.margin),v.vowelErrors??0,r2(v.slip)]);
  // App sequence gate (src/main.ts seqOk + reveal): a later ayah is not shown until the current one's last word was.
  let seqS=expected.surah, seqA=expected.ayah, seqDone=false, seqHold=false;
  const total=(su,a)=>sess.total(su,a); let flushing=false; const checked=new Set();
  // Mirror of src/main.ts checkFinishedAyah.
  const checkFinished=(su,a)=>{const key=su+':'+a; if(a<2||checked.has(key))return; checked.add(key);
    const v=z.verdicts().filter(x=>x.surah===su&&x.ayah===a-1).sort((x,y)=>x.word-y.word); if(v.length<3)return; const found=[];
    const lost=(x)=>x.state==='skipped'||(x.state==='wrong'&&x.distance>=0.5); let k=v.length; while(k>0&&lost(v[k-1]))k--;
    if(k<v.length&&k>0&&v[k-1].state!=='skipped') found.push({s:su,a:a-1,w:v[k].word,kind:'possible_omission',src:'app_tail'});
    const fine=(x)=>!!x&&(x.state==='ok'||x.state==='unsure')&&x.distance<=0.25;
    for(let i=1;i<k-1;i++){const x=v[i]; if(!fine(v[i-1])||!fine(v[i+1]))continue; if(x.state==='skipped'&&x.heardRatio<=0.35)found.push({s:su,a:a-1,w:x.word,kind:'possible_omission',src:'app_inner'}); else if(x.state==='wrong'&&x.distance>=0.6&&x.margin>=0.5)found.push({s:su,a:a-1,w:x.word,kind:'possible_substitution',src:'app_inner'});}
    for(const f of found){ if(!issues.some(i=>!i.note&&i.s===f.s&&i.a===f.a&&Math.abs((i.w??-99)-f.w)<=1)) issues.push({...f,t:cur/16000}); } };
  const seqOk=(su,a)=>{ if(su===seqS&&a<=seqA) return true; const follows=(su===seqS&&a===seqA+1)||(su===seqS+1&&a===1);
    if(app&&follows&&!seqDone&&total(seqS,seqA)<=2){for(let i=0;i<total(seqS,seqA);i++){const k=seqS+':'+seqA+':'+i;if(!words.has(k))words.set(k,cur/16000);} seqDone=true;}
    if(follows&&seqDone){seqS=su;seqA=a;seqDone=false;seqHold=false;return true;}
    if(!seqHold){seqHold=true;issues.push({s:seqS,a:seqA,w:null,kind:'app_hold',t:cur/16000});} return false; };
  const handle=(m)=>{
    if(m.type==='correction'||m.type==='correction_note'){
      const issue=m.type==='correction_note'?m.issue:m.state?.issue; const ph=m.state?.phase;
      if(m.type==='correction_note'&&issue){issues.push({...pick(issue),note:true,t:cur/16000});return;}
      if(ph==='error'&&issue){ if(!(app&&issue.source==='similar_verse'&&issue.kind==='possible_omission')) issues.push({...pick(issue),t:cur/16000}); z.correct('review_later'); if(typeof issue.wordIndex==='number') z.correction.suppressed?.delete(issue.wordIndex);}
      if(ph==='corrected'&&issue){z.correct('continue');}
      return;
    }
    if(m.type==='word_progress'&&m.surah&&m.ayah){const idx=new Set(m.matched_indices??[]);for(let i=0;i<=(m.word_index??-1);i++)idx.add(i); if(!idx.size) return;
      for(const i of idx){const k=m.surah+':'+m.ayah+':'+i;if(!engineWords.has(k))engineWords.set(k,cur/16000);}
      {const ak=m.surah+':'+m.ayah; if(firstSeen[ak]==null&&m.ayah>1) snaps.push({t:cur/16000,at:ak,why:'start',v:vsnap(m.surah,m.ayah-1)}); if((m.word_index??-1)>=2&&!snapped2.has(ak)&&m.ayah>1){snapped2.add(ak);snaps.push({t:cur/16000,at:ak,why:'wi2',v:vsnap(m.surah,m.ayah-1)});} firstSeen[ak]??=cur/16000; const T=total(m.surah,m.ayah); if((m.matched_indices??[]).includes(T-1)) lastMatched[ak]??=cur/16000; if((m.word_index??-1)>=T-1) lastCursor[ak]??=cur/16000; matchedSets[ak]=[...new Set([...(matchedSets[ak]||[]),...(m.matched_indices??[])])];}
      if(app) checkFinished(m.surah,m.ayah);
      if(!seqOk(m.surah,m.ayah)) return;
      for(const i of idx){const k=m.surah+':'+m.ayah+':'+i;if(!words.has(k))words.set(k,cur/16000); if(i===total(m.surah,m.ayah)-1&&m.surah===seqS&&m.ayah===seqA) seqDone=true;}}
  };
  sess.setSink(handle);
  z.setExpected(expected);
  const t0=performance.now(); let maxFeed=0;
  for(;pos<pcm.length;pos+=CH){cur=Math.min(pcm.length,pos+CH);const a=performance.now();await s.feed(pcm.subarray(pos,Math.min(pcm.length,pos+CH)));maxFeed=Math.max(maxFeed,performance.now()-a);}
  pos=pcm.length; cur=pos; const atStopFrom=issues.length;
  snaps.push({t:cur/16000,why:'prestop',v:z.verdicts().map(v=>[v.surah,v.ayah,v.word,v.state,r2(v.heardRatio),r2(v.distance),r2(v.margin)])});
  const ph=z.correction?.state?.phase; if(ph&&ph!=='idle') z.correct('review_later');
  flushing=true; const fl=await s.stop(); if(Array.isArray(fl)) for(const m of fl) handle(m);
  // drain remaining structural issues raised at stop
  flushing=false; for(let k=0;k<10&&!app;k++){const st=z.correction?.state; if(st?.phase==='error'&&st.issue){issues.push({...pick(st.issue),t:cur/16000,atStop:true}); z.correct('review_later');} else break;}
  for(let k=atStopFrom;k<issues.length;k++) issues[k].atStop=true;
  const wall=performance.now()-t0;
  s.reset(); sess.setSink(null);
  return {issues,words:Object.fromEntries(words),engineWords:engineWords.size,firstSeen,lastMatched,lastCursor,snaps,matched:Object.fromEntries(Object.entries(matchedSets).map(([k,v])=>[k,v.length])),wall,maxFeed,dur:pcm.length/16000};
}
const r2=(x)=>typeof x==='number'&&Number.isFinite(x)?Math.round(x*100)/100:null;
const pick=(i)=>({s:i.surah,a:i.ayah,w:i.word,wi:i.wordIndex,kind:i.kind,src:i.source,words:i.words});
