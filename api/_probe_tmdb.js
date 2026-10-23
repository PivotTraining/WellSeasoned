const KEY='fe3ebffe226bb1397cc145f58773380d';
const targets=[
  {title:'The Eyes of Ghana',type:'movie',year:2026},
  {title:'Kordell Stewart: Slash & Burn',type:'movie',year:2026},
  {title:'Church Wives',type:'tv',year:2026},
  {title:'Terry McMillan Presents: Paradise with You',type:'movie',year:2026},
  {title:'Love & Hip Hop: The Final Chapter',type:'tv',year:2026},
  {title:'God With Us',type:'movie',year:2026},
  {title:"Search Party: Where's PawPaw?",type:'movie',year:2026},
  {title:'Crime and Punishment in America',type:'tv',year:2026},
  {title:'Above the Below',type:'movie',year:2026},
  {title:'Frisco King',type:'tv',year:2026}
];
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
async function j(url){const r=await fetch(url);if(!r.ok)return null;return r.json();}
export default async function handler(req,res){
  const out=[];
  for(const t of targets){
    const kind=t.type==='tv'?'tv':'movie';
    const search=await j('https://api.themoviedb.org/3/search/'+kind+'?api_key='+KEY+'&query='+encodeURIComponent(t.title)+(kind==='tv'?'&first_air_date_year=':'&year=')+t.year);
    const arr=(search&&search.results)||[];
    let hit=arr.find(x=>norm(x.title||x.name)===norm(t.title))||arr[0]||null;
    if(!hit){out.push({target:t,hit:null});continue;}
    const det=await j('https://api.themoviedb.org/3/'+kind+'/'+hit.id+'?api_key='+KEY+'&append_to_response=videos,credits,content_ratings,release_dates');
    out.push({target:t,hit,details:det});
  }
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  res.status(200).json(out);
}