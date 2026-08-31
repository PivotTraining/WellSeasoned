#!/usr/bin/env node
/* Weekly catalog health check. Reports; it does not auto-fix.
   Every check here exists because the corresponding bug actually shipped:
     art-watch    — Varnell Hill sat on nopo:true for weeks after Paramount+
                    published its key art. nopo/nobd are a snapshot of what
                    TMDB had the day a title was added, not a permanent fact.
     trailer-watch— recent titles gain official trailers over time and nothing
                    was looking. Reported only: wiring one needs a channel
                    judgement a script should not make.
     link-rot     — pinned poster URLs are absolute and can 404.
     where-drift  — ten titles pointed at BET+ months after it shut down, so
                    the site was sending people to a dead app.
   Usage: node scripts/catalog-health.cjs [--limit N]                        */
const fs=require('fs'), path=require('path'), https=require('https');
const ROOT=path.join(__dirname,'..');
const KEY=(fs.readFileSync(path.join(ROOT,'index.html'),'utf8').match(/TMDB_KEY\s*=\s*'([^']+)'/)||[])[1]
  || 'fe3ebffe226bb1397cc145f58773380d';
const LIMIT=(()=>{const i=process.argv.indexOf('--limit');return i>0?+process.argv[i+1]:0;})();

const get=u=>new Promise(r=>{https.get(u,x=>{let b='';x.on('data',d=>b+=d);x.on('end',()=>{try{r(JSON.parse(b))}catch(e){r(null)}})}).on('error',()=>r(null))});
const head=u=>new Promise(r=>{https.request(u,{method:'HEAD'},x=>r(x.statusCode)).on('error',()=>r(0)).end()});
const norm=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,'');

function films(){
  const s=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const k=s.indexOf('var FILMS=[');let i=s.indexOf('[',k),d=0,q=null,o='';
  for(;i<s.length;i++){const c=s[i];o+=c;
    if(q){if(c==='\\'){o+=s[++i];continue}if(c===q)q=null;continue}
    if(c==="'"||c==='"'){q=c;continue}
    if(c==='[')d++;else if(c===']'){d--;if(!d)break}}
  const F=eval(o);
  const T=eval('('+s.slice(s.indexOf('var WS_TRAILERS=')+16,s.indexOf('};',s.indexOf('var WS_TRAILERS=')) +1)+')');
  const W=eval('('+s.slice(s.indexOf('var WS_POSTERS')+15,s.indexOf('};',s.indexOf('var WS_POSTERS'))+1)+')');
  return {F:F.filter(f=>f&&!f.noart),T,W};
}
async function tmdb(f){
  const kind=f.type==='tv'?'tv':'movie';
  const dk=kind==='tv'?'first_air_date_year':'year';
  const q=await get(`https://api.themoviedb.org/3/search/${kind}?api_key=${KEY}&query=${encodeURIComponent(f.title)}&${dk}=${f.year}`);
  // never trust search rank — require the name to match (the 'Binge Queens' lesson)
  const hit=(q&&q.results||[]).filter(r=>norm(r.name||r.title)===norm(f.title))[0];
  if(!hit) return null;
  return {kind,id:hit.id,poster:hit.poster_path,backdrop:hit.backdrop_path};
}

(async()=>{
  const {F,T,W}=films();
  const out={art:[],trailers:[],rot:[],where:[]};

  // 1. art-watch — flagged titles whose art may since have been published
  for(const f of F.filter(f=>f.nopo||f.nobd)){
    const m=await tmdb(f); if(!m) continue;
    if(f.nopo&&m.poster) out.art.push(`${f.id}: poster now on TMDB (${m.poster}) — nopo can come off`);
    if(f.nobd&&m.backdrop) out.art.push(`${f.id}: backdrop now on TMDB (${m.backdrop}) — nobd can come off`);
  }

  // 2. trailer-watch — recent titles with no pinned trailer
  let recent=F.filter(f=>f.year>=2025&&!T[f.id]);
  if(LIMIT) recent=recent.slice(0,LIMIT);
  for(const f of recent){
    const m=await tmdb(f); if(!m) continue;
    const v=await get(`https://api.themoviedb.org/3/${m.kind}/${m.id}/videos?api_key=${KEY}`);
    const t=((v&&v.results)||[]).filter(x=>x.site==='YouTube'&&(x.type==='Trailer'||x.type==='Teaser'))[0];
    if(t) out.trailers.push(`${f.id}: candidate ${t.key} "${(t.name||'').slice(0,44)}" — verify the channel before wiring`);
  }

  // 3. link-rot on pinned posters
  const pins=Object.entries(W); const sample=LIMIT?pins.slice(0,LIMIT):pins;
  for(const [id,url] of sample){ const c=await head(url); if(c!==200) out.rot.push(`${id}: pinned poster returned ${c}`); }

  // 4. where-drift — services that no longer exist
  const DEAD=[/BET\+/i,/HBO Go/i,/DC Universe/i,/Quibi/i,/Seeso/i];
  F.forEach(f=>(f.where||[]).forEach(w=>{ if(DEAD.some(re=>re.test(w))) out.where.push(`${f.id}: listed on "${w}", which no longer exists`); }));

  const total=Object.values(out).reduce((n,a)=>n+a.length,0);
  const lines=['# Catalog health — '+new Date().toISOString().slice(0,10),''];
  const sect=(t,a)=>{ lines.push(`## ${t} (${a.length})`); lines.push(a.length?a.map(x=>'- '+x).join('\n'):'- nothing'); lines.push(''); };
  sect('Art now available',out.art); sect('Trailer candidates',out.trailers);
  sect('Dead poster links',out.rot); sect('Dead streaming services',out.where);
  fs.writeFileSync(path.join(ROOT,'catalog-health.md'),lines.join('\n'));
  console.log(lines.join('\n'));
  console.log('FINDINGS='+total);
})();
