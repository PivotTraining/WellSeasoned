#!/usr/bin/env node
/* Builds data/airing.json — the next episode to air for every TV title in the
   catalog, straight from TMDB.
   Why precomputed and not fetched live: TMDB has no bulk "next episode" call,
   and its on_the_air feed is global and misses most US shows (it found 4 of our
   176). Doing it live would mean ~176 requests per visitor. So we do it once
   here and ship one small file.
   Staleness is handled by the CLIENT, not by trusting this file: it drops any
   entry whose air date has passed, so a stale build shows FEWER shows than
   reality rather than a wrong date. Re-run this weekly, same as
   build-films-json.cjs.
   NOTE on location: this lives in data/, NOT api/. On Vercel api/ is the
   serverless-functions directory and its files are not served statically —
   api/films.json 404s publicly too; it only works because api/f.js *imports*
   it server-side. data/ is served static, same as og/ and word/.
   Usage: node scripts/build-airing.cjs                                       */
const fs=require('fs'), path=require('path'), https=require('https');
const ROOT=path.join(__dirname,'..');
const KEY=(fs.readFileSync(path.join(ROOT,'index.html'),'utf8').match(/TMDB_KEY\s*=\s*'([^']+)'/)||[])[1]
  || 'fe3ebffe226bb1397cc145f58773380d';

function get(url){
  return new Promise(res=>{
    https.get(url,r=>{ let b=''; r.on('data',d=>b+=d); r.on('end',()=>{ try{res(JSON.parse(b));}catch(e){res(null);} }); })
      .on('error',()=>res(null));
  });
}
function films(){
  const s=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const k=s.indexOf('var FILMS=[');let i=s.indexOf('[',k),d=0,q=null,out='';
  for(;i<s.length;i++){const c=s[i];out+=c;
    if(q){if(c==='\\'){out+=s[++i];continue}if(c===q)q=null;continue}
    if(c==="'"||c==='"'){q=c;continue}
    if(c==='[')d++;else if(c===']'){d--;if(!d)break}}
  return eval(out);
}
(async()=>{
  const tv=films().filter(f=>f&&!f.noart&&f.type==='tv');
  console.log('TV titles to check:',tv.length);
  const out={}; let found=0, n=0; const skipped=[];
  for(const f of tv){
    n++;
    const q=await get('https://api.themoviedb.org/3/search/tv?api_key='+KEY+
      '&query='+encodeURIComponent(f.title)+'&first_air_date_year='+f.year);
    /* Do NOT trust search rank. A title+year query for "Queens" returned
       "Binge Queens" — a different, 14-season show — and would have shipped a
       fake air date for it. Same failure class as the trailer sweep. Require
       the matched TMDB name to equal our title once normalized. */
    const norm=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
    const hit=(q&&q.results||[]).filter(r=>norm(r.name)===norm(f.title))[0];
    if(!hit){ if(q&&q.results&&q.results[0]) skipped.push(f.title+' -> "'+q.results[0].name+'" (name mismatch)'); continue; }
    const d=await get('https://api.themoviedb.org/3/tv/'+hit.id+'?api_key='+KEY);
    if(!d) continue;
    const ne=d.next_episode_to_air;
    if(ne&&ne.air_date){
      out[f.id]={tmdb:hit.id,status:d.status||'',season:ne.season_number,episode:ne.episode_number,
                 name:ne.name||'',air_date:ne.air_date,
                 premiere:(ne.episode_number===1)};
      found++;
      console.log('  %s  %s  S%sE%s %s', ne.air_date, f.id.slice(0,26).padEnd(26), ne.season_number, ne.episode_number, (ne.name||'').slice(0,30));
    }
    if(n%25===0) console.log('  …checked',n,'of',tv.length);
  }
  const file=path.join(ROOT,'data','airing.json');
  fs.writeFileSync(file,JSON.stringify({built:new Date().toISOString().slice(0,10),shows:out},null,0));
  console.log('\nairing.json: %d shows with a scheduled next episode (of %d checked)',found,tv.length);
  if(skipped.length){ console.log('rejected on name mismatch (%d):',skipped.length); skipped.slice(0,12).forEach(x=>console.log('   ',x)); }
})();
