import films from './films.json' with { type: 'json' };
import { SITE, esc, shell, crumbs, crumbLd } from './_shell.js';

const SB='https://iherwgeuxwpapjreoofq.supabase.co';
const KEY='sb_publishable_Owy8s8-j6LzxYhDmpCo53w_7ehrsGuh';
const H={apikey:KEY,Authorization:'Bearer '+KEY};

async function sb(path){
  try{
    const r=await fetch(SB+'/rest/v1/'+path,{headers:H});
    if(!r.ok)return [];
    const j=await r.json();
    return Array.isArray(j)?j:[];
  }catch(e){return [];}
}
async function count(table,query){
  try{
    const r=await fetch(SB+'/rest/v1/'+table+'?select=*'+(query?'&'+query:''),
      {headers:{...H,Prefer:'count=exact',Range:'0-0'}});
    const cr=r.headers.get('content-range')||'';
    const n=parseInt(cr.split('/')[1],10);
    return Number.isFinite(n)?n:null;
  }catch(e){return null;}
}
function pct(v){const n=(v.for_count||0)+(v.against_count||0);return n?Math.round((v.for_count||0)/n*100):null;}
function nfmt(n){return n==null?'—':Number(n).toLocaleString('en-US');}
function metric(label,value,note){return '<div style="padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--panel)"><div class="vlab">'+esc(label)+'</div><div style="font-family:var(--heading);font-size:38px;line-height:1;margin-top:6px">'+esc(value)+'</div>'+(note?'<div class="meta" style="margin-top:6px">'+esc(note)+'</div>':'')+'</div>';}

export default async function handler(req,res){
  const weekAgo=new Date(Date.now()-7*86400000).toISOString();
  const [vc,votesAll,votes7,comments7]=await Promise.all([
    sb('vote_counts?select=film_slug,for_count,against_count'),
    count('votes'),
    count('votes','created_at=gte.'+encodeURIComponent(weekAgo)),
    count('comments','created_at=gte.'+encodeURIComponent(weekAgo))
  ]);

  const rows=vc.map(v=>{
    const f=films[v.film_slug]; if(!f)return null;
    const total=(v.for_count||0)+(v.against_count||0);
    return {id:v.film_slug,title:f.t,total,table:pct(v),for_count:v.for_count||0,against_count:v.against_count||0};
  }).filter(Boolean);

  const one=rows.filter(r=>r.total===1).length;
  const split=rows.filter(r=>r.total>=4&&r.table>=50&&r.table<=69).sort((a,b)=>b.total-a.total).slice(0,6);
  const most=rows.slice().sort((a,b)=>b.total-a.total).slice(0,6);
  const coverage=Object.keys(films).length?Math.round(rows.length/Object.keys(films).length*100):0;
  const url=SITE+'/table-report';
  const path=[{name:'Well Seasoned',href:SITE+'/'},{name:'The Table Report',self:url}];

  const splitHtml=split.length?split.map(r=>'<li class="row"><span class="body"><a href="'+SITE+'/f/'+encodeURIComponent(r.id)+'">'+esc(r.title)+'</a><span class="note">'+r.table+'% Seasoned · '+r.total+' verdicts</span></span></li>').join(''):'<li class="empty">No qualifying split titles right now.</li>';
  const mostHtml=most.length?most.map(r=>'<li class="row"><span class="body"><a href="'+SITE+'/f/'+encodeURIComponent(r.id)+'">'+esc(r.title)+'</a><span class="note">'+(r.table==null?'Still counting':r.table+'% Seasoned')+' · '+r.total+' verdicts</span></span></li>').join(''):'<li class="empty">No verdicts yet.</li>';

  const body=crumbs(path)+
    '<span class="vlab">Live audience intelligence · refreshed from The Table</span>'+
    '<h1>The Table Report</h1>'+
    '<p class="lede">What the room is actually doing on Well Seasoned: how many verdicts have been cast, which titles are still waiting on a second opinion, and where the audience is genuinely split.</p>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:22px 0">'+
      metric('Verdicts cast',nfmt(votesAll),'All time')+
      metric('This week',nfmt(votes7),'New verdicts in the last 7 days')+
      metric('Catalog ruled on',coverage+'%',nfmt(rows.length)+' titles carry at least one verdict')+
      metric('One verdict only',nfmt(one),'Still waiting on the rest of the room')+
      metric('Comments this week',nfmt(comments7),'Conversation beyond the score')+
    '</div>'+
    '<h2 style="margin-top:32px">The room is split</h2>'+
    '<p class="lede" style="font-size:15px">Titles sitting between 50% and 69% Seasoned with at least four verdicts. These are the arguments worth joining.</p>'+
    '<ul class="list">'+splitHtml+'</ul>'+
    '<h2 style="margin-top:32px">Most ruled-on</h2>'+
    '<ul class="list">'+mostHtml+'</ul>'+
    '<a class="cta" href="'+SITE+'/#/unchallenged">Settle an open verdict →</a>'+
    '<p class="caveat" style="margin-top:22px">Every number on this page comes from live public Well Seasoned vote data. No estimated audience sizes and no fabricated engagement.</p>';

  const ld={'@context':'https://schema.org','@type':'Dataset',name:'Well Seasoned Table Report',description:'Live aggregate audience verdict data from Well Seasoned.',url};
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=900, stale-while-revalidate=3600');
  res.status(200).send(shell({title:'The Table Report — Well Seasoned',desc:'Live Well Seasoned audience verdicts, split titles and participation data.',url,ld:[ld,crumbLd(path)],body}));
}