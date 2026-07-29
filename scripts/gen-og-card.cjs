/* Branded 1200x630 link-preview cards for /f/<id> pages.
 *
 * Why this exists: api/f.js used to hand social platforms the raw TMDB
 * poster as og:image. Posters are 2:3 portrait; Threads/X/Facebook/iMessage
 * all render og:image in a ~1.91:1 LANDSCAPE card, so every poster got
 * centre-cropped to its middle band — on The Thomas Crown Affair that meant
 * the preview showed a pair of gloves and half the title treatment with
 * Michael B. Jordan's face cropped clean off. A portrait image can never
 * survive that crop, so the fix is to ship a real landscape card built for
 * the slot instead of hoping the crop lands well.
 *
 * The card mirrors the home FEATURED carousel slide (the site's best-looking
 * unit): dark stage, gold-foil eyebrow, big display title, gold-ringed
 * poster on the right, brand mark bottom-left. Real catalog data only —
 * title/year/director/synopsis come straight from api/films.json, same as
 * the page itself. Nothing invented.
 *
 * Usage:  node scripts/gen-og-card.cjs <film-id> [<film-id> ...]
 * Output: og/<film-id>.jpg  (+ the id registered in api/og-cards.json)
 *
 * Requires Playwright (NODE_PATH=/opt/node22/lib/node_modules) and outbound
 * access to image.tmdb.org + fonts.googleapis.com, so it's a build-time tool
 * run by hand — never at request time.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const films = JSON.parse(fs.readFileSync(path.join(ROOT, 'api/films.json'), 'utf8'));
const OG_DIR = path.join(ROOT, 'og');
const MANIFEST = path.join(ROOT, 'api/og-cards.json');

const ids = process.argv.slice(2);
if (!ids.length) { console.error('usage: node scripts/gen-og-card.cjs <film-id> [...]'); process.exit(1); }

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* Poster is fetched to a temp file and referenced as file:// — Playwright in
   a sandbox can't always reach image.tmdb.org directly, and a broken poster
   would silently bake an empty box into a card we then ship. */
function fetchPoster(url, dest) {
  execFileSync('curl', ['-sSL', '--fail', url, '-o', dest], { stdio: 'pipe' });
  if (!fs.statSync(dest).size) throw new Error('empty poster download');
}

function cardHTML(f, posterFile) {
  const meta = [
    f.d0 ? null : null,
  ];
  const line = [
    f.dir ? (f.tv ? 'Created by ' : 'Dir. ') + f.dir : null,
    f.y || null,
    f.genre || null,
  ].filter(Boolean).join('  ·  ');
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:1200px;height:630px;overflow:hidden}
  .stage{position:relative;width:1200px;height:630px;display:flex;align-items:center;gap:54px;
    padding:0 72px;background:linear-gradient(135deg,#241a12,#140d08 58%,#0b0705);overflow:hidden}
  /* frozen gold spotlight — the carousel's conic sweep, held still */
  .stage::after{content:'';position:absolute;top:-40%;left:-10%;width:900px;height:900px;
    background:radial-gradient(circle,rgba(255,214,130,.16),transparent 62%);pointer-events:none}
  .copy{position:relative;z-index:2;flex:1 1 auto;min-width:0}
  .ey{display:inline-block;font-family:"DM Mono",monospace;font-size:19px;font-weight:500;
    letter-spacing:.18em;text-transform:uppercase;
    background:linear-gradient(90deg,#a9720b,#f9dd8b 45%,#f4c542);-webkit-background-clip:text;background-clip:text;color:transparent}
  .ttl{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-weight:800;color:#FBF3DE;
    font-size:${f.t.length > 26 ? 62 : f.t.length > 16 ? 74 : 86}px;line-height:1.0;letter-spacing:-.018em;margin:18px 0 16px;
    text-shadow:0 4px 30px rgba(0,0,0,.6)}
  .meta{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-size:23px;font-weight:700;color:rgba(246,236,215,.72)}
  .brand{position:absolute;left:72px;bottom:46px;z-index:2;display:flex;align-items:center;gap:13px}
  .mark{width:38px;height:44px;flex:none;filter:drop-shadow(0 2px 6px rgba(0,0,0,.6))}
  .bword{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-weight:800;font-size:21px;color:#FBF3DE;line-height:1.1}
  .btag{font-family:"DM Mono",monospace;font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:#C9A961;margin-top:2px}
  .art{position:relative;z-index:2;flex:none;width:300px;height:450px;border-radius:16px;overflow:hidden;
    box-shadow:0 0 0 2px rgba(244,197,66,.6),0 0 0 10px rgba(14,9,5,.5),0 26px 60px rgba(0,0,0,.66),0 0 60px rgba(228,155,11,.22)}
  .art img{width:100%;height:100%;object-fit:cover;display:block}
</style></head><body>
  <div class="stage">
    <div class="copy">
      <span class="ey">${esc(f.ey)}</span>
      <h1 class="ttl">${esc(f.t)}</h1>
      <div class="meta">${esc(line)}</div>
    </div>
    <div class="art"><img src="file://${posterFile}"></div>
    <div class="brand">
      <svg class="mark" viewBox="0 0 22 26" fill="none">
        <path d="M6 9c0-2.8 2.2-5 5-5s5 2.2 5 5v1H6V9z" fill="#F4C542"/>
        <rect x="4.5" y="10" width="13" height="13.5" rx="2.4" fill="#E49B0B"/>
        <circle cx="9" cy="7.2" r=".8" fill="#241703"/><circle cx="11" cy="6.4" r=".8" fill="#241703"/><circle cx="13" cy="7.2" r=".8" fill="#241703"/>
        <path d="M8 14h6M8 17h6M8 20h4" stroke="#241703" stroke-width="1.1" stroke-linecap="round" opacity=".6"/>
      </svg>
      <div><div class="bword">Well Seasoned</div><div class="btag">Rated by the culture</div></div>
    </div>
  </div>
</body></html>`;
}

(async () => {
  if (!fs.existsSync(OG_DIR)) fs.mkdirSync(OG_DIR, { recursive: true });
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  for (const id of ids) {
    const base = films[id];
    if (!base) { console.error('!! no such film in api/films.json:', id); continue; }
    if (!base.p) { console.error('!! no poster for', id, '- skipping (never ship an empty card)'); continue; }

    // extras the crawler JSON doesn't carry; read straight out of index.html
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const re = new RegExp('[{,]\\s*(?:id|"id")\\s*:\\s*["\']' + id.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '["\'][\\s\\S]{0,1400}?reviews', 'm');
    const chunk = (src.match(re) || [''])[0];
    const grab = (k) => { const m = chunk.match(new RegExp('(?:^|[,{])\\s*(?:' + k + '|"' + k + '")\\s*:\\s*["\']([^"\']*)["\']')); return m ? m[1] : ''; };
    const f = Object.assign({}, base, { dir: grab('dir'), genre: grab('genre') });

    // Eyebrow: real, from the catalog. Upcoming titles lead with the date.
    const soonRe = new RegExp('"title"\\s*:\\s*"' + f.t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '"\\s*,\\s*"date"\\s*:\\s*"([0-9-]+)"');
    const soonM = src.match(soonRe);
    const soonDate = soonM ? soonM[1] : null;
    if (soonDate && new Date(soonDate) > new Date()) {
      const d = new Date(soonDate + 'T12:00:00Z');
      // A series doesn't open "in theaters" — say what's actually true for it.
      f.ey = (f.tv ? 'Premieres ' : 'In theaters ') + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    } else {
      f.ey = 'Two verdicts · One seal';
    }

    const tmp = path.join(OG_DIR, '.' + id + '.poster.jpg');
    const hi = f.p.replace('/w500/', '/w780/');
    try { fetchPoster(hi, tmp); } catch (e) { fetchPoster(f.p, tmp); }

    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    const tmpHtml = path.join(OG_DIR, '.' + id + '.html');
    fs.writeFileSync(tmpHtml, cardHTML(f, tmp));
    await page.goto('file://' + tmpHtml);
    await page.waitForFunction(() => {
      const i = document.querySelector('.art img');
      return i && i.complete && i.naturalWidth > 0 && document.fonts.status === 'loaded';
    }, { timeout: 20000 });
    await page.waitForTimeout(250);
    const out = path.join(OG_DIR, id + '.jpg');
    await page.screenshot({ path: out, type: 'jpeg', quality: 90 });
    await page.close();
    fs.unlinkSync(tmpHtml); fs.unlinkSync(tmp);

    manifest[id] = 1;
    console.log('og card ->', path.relative(ROOT, out), '(' + (fs.statSync(out).size / 1024).toFixed(0) + 'kb)');
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log('manifest:', Object.keys(manifest).length, 'card(s)');
  await browser.close();
})();
