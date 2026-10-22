import films from './films.json' with { type: 'json' };

const SUPABASE_URL='https://iherwgeuxwpapjreoofq.supabase.co';
const SUPABASE_KEY='sb_publishable_Owy8s8-j6LzxYhDmpCo53w_7ehrsGuh';
const H={apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY};

async function sb(path){
  try{
    const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{headers:H});
    if(!r.ok)return [];
    const j=await r.json();
    return Array.isArray(j)?j:[];
  }catch(e){return [];}
}
async function count(table,query){
  try{
    const r=await fetch(SUPABASE_URL+'/rest/v1/'+table+'?select=*'+(query?'&'+query:''),
      {headers:{...H,Prefer:'count=exact',Range:'0-0'}});
    const cr=r.headers.get('content-range')||'';
    const n=parseInt(cr.split('/')[1],10);
    return Number.isFinite(n)?n:null;
  }catch(e){return null;}
}
function tableScore(v){
  const n=(v?.for_count||0)+(v?.against_count||0);
  return n?Math.round((v.for_count||0)/n*100):null;
}
function titleOf(id){return films[id]?.t||id;}

export default async function handler(req,res){
  const weekAgo=new Date(Date.now()-7*86400000).toISOString();
  const monthAgo=new Date(Date.now()-30*86400000).toISOString();
  const [votes,kitchen,recent,votesAll,votes7,votes30,commentsAll,comments7,articles,hype]=await Promise.all([
    sb('vote_counts?select=film_slug,for_count,against_count'),
    sb('kitchen_scores?select=film_slug,k,critics'),
    sb('votes?select=film_slug,created_at&created_at=gte.'+encodeURIComponent(weekAgo)+'&limit=1000'),
    count('votes'),
    count('votes','created_at=gte.'+encodeURIComponent(weekAgo)),
    count('votes','created_at=gte.'+encodeURIComponent(monthAgo)),
    count('comments'),
    count('comments','created_at=gte.'+encodeURIComponent(weekAgo)),
    count('articles'),
    count('excitement_votes')
  ]);

  const V={},K={};
  votes.forEach(v=>V[v.film_slug]=v);
  kitchen.forEach(k=>K[k.film_slug]=k);

  const out=Object.keys(films).map(id=>{
    const f=films[id],v=V[id]||{},k=K[id]||{};
    const total=(v.for_count||0)+(v.against_count||0);
    const table=tableScore(v);
    return {
      id,title:f.t,year:f.y||null,poster:f.p||null,tv:!!f.tv,
      where:Array.isArray(f.w)?f.w:[],genre:f.gn||'',
      kitchen:k.k??null,critics:k.critics??null,
      table,for_count:v.for_count||0,against_count:v.against_count||0,total,
      gap:(k.k!=null&&table!=null)?Math.abs(k.k-table):null,
      href:'/f/'+encodeURIComponent(id)
    };
  }).filter(x=>x.title).sort((a,b)=>a.title.localeCompare(b.title));

  const tall={};
  recent.forEach(v=>tall[v.film_slug]=(tall[v.film_slug]||0)+1);
  const topWeek=Object.keys(tall).sort((a,b)=>tall[b]-tall[a]).slice(0,8)
    .map(id=>({id,title:titleOf(id),verdicts:tall[id],href:'/f/'+encodeURIComponent(id)}));

  const withVerdict=out.filter(x=>x.total>0).length;
  const oneVerdict=out.filter(x=>x.total===1).length;
  const split=out.filter(x=>x.total>=4&&x.table>=50&&x.table<=69)
    .sort((a,b)=>b.total-a.total).slice(0,12);
  const gap=out.filter(x=>x.total>=1&&x.gap!=null)
    .sort((a,b)=>b.gap-a.gap).slice(0,12);
  const settled=out.filter(x=>x.total>=4&&x.table>=85)
    .sort((a,b)=>b.total-a.total).slice(0,12);

  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=1800');
  res.status(200).json({
    generated_at:new Date().toISOString(),
    report:{
      votes_all_time:votesAll,votes_7d:votes7,votes_30d:votes30,
      films_with_verdict:withVerdict,catalog:out.length,
      coverage:out.length?Number((withVerdict/out.length*100).toFixed(1)):null,
      one_verdict:oneVerdict,comments_all_time:commentsAll,
      comments_7d:comments7,published_articles:articles,hype_votes:hype,top_week:topWeek
    },
    boards:{split,gap,settled},
    films:out
  });
}