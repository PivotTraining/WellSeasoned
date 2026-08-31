#!/usr/bin/env node
/* Standing regression check. Lives in the repo on purpose: it was being
   rewritten from scratch every time the sandbox restarted, which is wasted
   work and drifts each time. One command, same checks, every session.
     node scripts/verify.cjs            # all routes, desktop + mobile
     node scripts/verify.cjs --quick    # desktop only, core routes
   Fails with a non-zero exit if any route throws or overflows, so it can also
   be a CI gate. Supabase and TMDB are mocked — this checks that the app
   renders and does not throw, not that live data is correct.             */
const path=require('path'), fs=require('fs');
const ROOT=path.join(__dirname,'..');
// Playwright lives outside the repo in this sandbox; fall back to the global
// install so the harness runs without a NODE_PATH env var in front of it.
var _pwRoots = [process.env.NODE_PATH, '/opt/node22/lib/node_modules'].filter(Boolean);
var chromium = null;
for (var i = 0; i < _pwRoots.length && !chromium; i++) {
  try { chromium = require(path.join(_pwRoots[i], 'playwright')).chromium; } catch (e) {}
}
if (!chromium) chromium = require('playwright').chromium;

const QUICK=process.argv.includes('--quick');
const ROUTES=['/','/browse','/kids','/rankings','/bracket','/soon','/events','/word','/wire',
  '/couch','/shop','/theaters','/join','/kitchen','/perfect-ten','/film/sinners'];
const CORE=['/','/browse','/soon','/word','/film/sinners'];

let AIR='{"built":"","shows":{}}';
try{ AIR=fs.readFileSync(path.join(ROOT,'data','airing.json'),'utf8'); }catch(e){}

(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const views=QUICK?[{width:1280,height:1000,n:'desktop'}]
                   :[{width:1280,height:1000,n:'desktop'},{width:390,height:844,n:'mobile'}];
  const routes=QUICK?CORE:ROUTES;
  let bad=0;
  for(const vp of views){
    const p=await b.newPage({viewport:{width:vp.width,height:vp.height}});
    const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
    // catch-all FIRST, specific LAST — last registered wins
    await p.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
    await p.route('**/data/airing.json',r=>r.fulfill({status:200,contentType:'application/json',body:AIR}));
    await p.route('**/api.themoviedb.org/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"results":[],"cast":[],"crew":[]}'}));
    const over=[];
    for(const h of routes){
      await p.goto('file://'+path.join(ROOT,'index.html')+'#'+h,{waitUntil:'domcontentloaded'});
      await p.waitForTimeout(QUICK?600:850);
      const o=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      if(o>0) over.push(h+'='+o);
    }
    // FILMS must parse and carry no duplicate ids
    const cat=await p.evaluate(()=>{
      const seen={};let dup=0;
      FILMS.forEach(f=>{if(f&&f.id){if(seen[f.id])dup++;seen[f.id]=1}});
      return {n:FILMS.filter(f=>f&&!f.noart).length,dup:dup};
    });
    const ok=!errs.length&&!over.length&&!cat.dup;
    if(!ok) bad++;
    console.log(`${vp.n.padEnd(8)} routes:${routes.length} films:${cat.n} dupIds:${cat.dup} overflow:${over.length?over.join(','):'none'} errors:${errs.length}${errs.length?' '+errs[0].slice(0,90):''}`);
    await p.close();
  }
  await b.close();
  if(bad){ console.error('FAIL'); process.exit(1); }
  console.log('PASS');
})();
