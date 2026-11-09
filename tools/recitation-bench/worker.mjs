import fs from 'node:fs'; import {makeSession,runClip} from './engine.mjs'; import {assemble} from './clip.mjs';
const [casesF,outF,variantJ]=process.argv.slice(2); const cases=JSON.parse(fs.readFileSync(casesF)); const variant=JSON.parse(variantJ||'{}');
let sess=await makeSession(variant); let done=0;
for(const c of cases){ try{ const pcm=assemble(c); const r=await runClip(sess,pcm,c.exp,!!variant.app); fs.appendFileSync(outF,JSON.stringify({id:c.id,...r})+'\n'); }catch(e){fs.appendFileSync(outF,JSON.stringify({id:c.id,err:String(e)})+'\n'); sess=await makeSession(variant);} done++; }
