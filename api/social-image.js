export default async function handler(req,res){
  const raw=String((req.query||{}).src||'');
  let u;
  try{u=new URL(raw);}catch(e){return res.status(400).send('Bad image URL');}
  if(u.protocol!=='https:'||u.hostname!=='image.tmdb.org') return res.status(403).send('Image host not allowed');
  try{
    const r=await fetch(u.toString(),{headers:{'User-Agent':'WellSeasonedSocial/1.0'}});
    if(!r.ok)return res.status(r.status).send('Image unavailable');
    const type=r.headers.get('content-type')||'image/jpeg';
    const buf=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type',type);
    res.setHeader('Cache-Control','public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000');
    res.setHeader('Access-Control-Allow-Origin','*');
    res.status(200).send(buf);
  }catch(e){res.status(502).send('Image unavailable');}
}