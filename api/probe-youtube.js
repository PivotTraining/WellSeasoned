const ids=['RnRf-r-RdA4','jjr5mf9i42Q','A5s136fciMo','MZIcLNFK4rU','r-x0zCk3f64','eYkhefDTiXk','5ckqV_uf8E0','MZAV0HKRDVk','v_2DNrMUSjI','uO4wsV7HEUY','RHYQYYm5jLM','DZPMP3vDGVk'];
export default async function handler(req,res){
  const out=[];
  for(const id of ids){
    try{
      const r=await fetch('https://www.youtube.com/oembed?url='+encodeURIComponent('https://www.youtube.com/watch?v='+id)+'&format=json');
      out.push({id,status:r.status,data:r.ok?await r.json():null});
    }catch(e){out.push({id,error:String(e)});}
  }
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.status(200).json(out);
}