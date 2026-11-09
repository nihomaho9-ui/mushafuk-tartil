import fs from 'node:fs';
const RECS={7:'alafasy',6:'husary',9:'minshawi',3:'sudais'};
const SURAHS=[1,2,36,67,78,93,102,103,112,113,114];
for (const [id,name] of Object.entries(RECS)){
  for (const s of SURAHS){
    if (name==='sudais' && ![1,93,102,103,112,113,114,78].includes(s)) continue;
    const f=`seg/${name}-${s}.json`;
    if(!fs.existsSync(f)){
      let all=[];for(let pg=1;pg<20;pg++){const r=await (await fetch(`https://api.quran.com/api/v4/recitations/${id}/by_chapter/${s}?fields=segments&per_page=50&page=${pg}`)).json();all.push(...r.audio_files);if(!r.pagination.next_page)break;}
      fs.writeFileSync(f,JSON.stringify(all));
    }
    const af=JSON.parse(fs.readFileSync(f));
    console.log(name,s,af.length,'segs',af.filter(a=>a.segments?.length).length, af[0]?.url);
  }
}
