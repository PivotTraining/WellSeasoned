// Shared chrome for every server-rendered page (/f, /read, /boards, ...).
//
// These pages are the site's organic landing surface — for most first-time
// visitors they ARE Well Seasoned — and each one had been written in isolation
// with a system font stack, no mark, no wordmark, no footer and no way out
// except a single CTA. A visitor arriving from search could not tell whose
// site they were on, and pages with no outbound internal links get crawled
// shallowly and pass no authority to each other.
//
// Underscore prefix so Vercel does not treat this as a route.
//
// Deliberately NOT importing the app's stylesheet: index.html carries ~6k
// lines of CSS for an app that is not running here. This is a hand-cut subset
// of the same tokens, so the two read as one site without the weight. Fonts
// come from the same Google Fonts href the app uses, preconnected and
// display=swap, so text paints immediately in the fallback rather than
// blocking on the webfont.
export const SITE = 'https://itswellseasoned.com';

export function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">';

/* The same tokens as the app's :root, trimmed to what these pages use. */
export const CSS =
  ':root{--paper:#EFE2C6;--panel:#FDF8ED;--inset:#E6D6B8;--line:rgba(40,26,10,.18);' +
  '--line-strong:rgba(40,26,10,.30);--ink:#211505;--ink-2:rgba(33,21,5,.66);--ink-3:rgba(33,21,5,.46);' +
  '--gold:#E49B0B;--gold-ink:#7A5206;--gold-soft:#F4B733;--paprika:#BE3B18;--herb:#2E8B57;--herb-ink:#1C6B41;' +
  '--jewel:#2A1206;--on-dark:#F6ECD7;--r:12px;--r-lg:18px;' +
  '--sans:"Inter",system-ui,-apple-system,sans-serif;--display:"Bricolage Grotesque","Inter",sans-serif;' +
  '--serif:"Instrument Serif",Georgia,serif;--mono:"DM Mono",ui-monospace,monospace}' +
  '*{box-sizing:border-box}' +
  'body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);' +
  'font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased}' +
  'a{color:var(--gold-ink)}' +
  '.wrap{max-width:860px;margin:0 auto;padding:0 20px}' +
  /* header */
  'header.site{border-bottom:1px solid var(--line);background:var(--panel)}' +
  'header.site .row{display:flex;align-items:center;gap:12px;padding:13px 0}' +
  'header.site a.brand{display:flex;align-items:center;gap:11px;text-decoration:none;color:var(--ink)}' +
  'header.site img.mark{width:40px;height:40px;display:block}' +
  '.bword{font-family:var(--display);font-weight:800;font-size:19px;letter-spacing:-.3px;display:block;line-height:1.1}' +
  '.btag{font-family:var(--mono);font-size:9.5px;letter-spacing:.17em;text-transform:uppercase;color:var(--ink-3);display:block}' +
  'header.site nav{margin-left:auto;display:flex;gap:16px;font-size:14px;font-weight:600}' +
  'header.site nav a{color:var(--ink-2);text-decoration:none}header.site nav a:hover{color:var(--gold-ink)}' +
  /* breadcrumbs + headings */
  'nav.crumbs{display:flex;flex-wrap:wrap;gap:6px;font-size:12.5px;color:var(--ink-3);margin:20px 0 14px}' +
  'nav.crumbs a{color:var(--ink-2);text-decoration:none}nav.crumbs a:hover{color:var(--gold-ink)}' +
  'h1{font-family:var(--display);font-weight:800;font-size:clamp(28px,4.4vw,40px);line-height:1.05;letter-spacing:-.6px;margin:0 0 10px}' +
  '.lede{font-size:16.5px;line-height:1.58;color:var(--ink-2);margin:0 0 14px;max-width:62ch}' +
  '.caveat{font-size:13.5px;line-height:1.5;color:var(--ink-2);border-left:3px solid var(--gold);padding-left:12px;margin:0 0 16px}' +
  '.count{font-family:var(--mono);font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--ink-3);margin:0 0 14px}' +
  /* verdict rings */
  '.verdicts{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 4px}' +
  '.vcard{flex:1 1 180px;min-width:0;background:var(--panel);border:1px solid var(--line);border-radius:var(--r-lg);padding:14px 16px}' +
  '.vlab{font-family:var(--mono);font-size:10px;letter-spacing:.17em;text-transform:uppercase;color:var(--ink-3)}' +
  '.vnum{font-family:var(--display);font-weight:800;font-size:34px;line-height:1.1;letter-spacing:-1px;margin-top:2px}' +
  '.vnum.good{color:var(--herb-ink)}.vnum.mid{color:var(--gold-ink)}.vnum.low{color:var(--paprika)}' +
  '.vnum.none{color:var(--ink-3);font-size:19px;letter-spacing:-.2px}' +
  '.vsub{font-size:12.5px;color:var(--ink-2);margin-top:3px}' +
  /* lists */
  'ul.list{list-style:none;padding:0;margin:0}' +
  'li.row{display:flex;gap:14px;align-items:flex-start;padding:13px 0;border-top:1px solid var(--line)}' +
  'li.row img,li.row .noart{width:54px;height:81px;flex:none;border-radius:7px;object-fit:cover;background:var(--inset)}' +
  'li.row .body{display:flex;flex-direction:column;gap:2px;min-width:0}' +
  'li.row a{font-family:var(--display);font-size:16.5px;font-weight:700;text-decoration:none;color:var(--ink)}' +
  'li.row a:hover{color:var(--gold-ink)}' +
  'li.row .meta{font-size:12.5px;color:var(--ink-3)}' +
  'li.row .note{font-size:13.5px;color:var(--ink-2);line-height:1.45}' +
  'li.empty{padding:18px 0;color:var(--ink-2);line-height:1.55;border-top:1px solid var(--line)}' +
  /* film page */
  '.filmtop{display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap}' +
  '.filmtop img.poster{width:210px;max-width:44vw;border-radius:var(--r-lg);display:block;box-shadow:0 14px 34px -16px rgba(40,22,6,.55)}' +
  '.filmtop .info{flex:1 1 300px;min-width:0}' +
  '.meta{color:var(--ink-2);font-size:14px;margin:0 0 12px}' +
  '.chips{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0 0}' +
  '.chip{font-size:12.5px;font-weight:600;padding:6px 12px;border-radius:999px;background:var(--panel);border:1px solid var(--line-strong);color:var(--ink-2)}' +
  'p.syn{font-size:16px;line-height:1.6;margin:16px 0 0}' +
  '.cta{display:inline-block;margin-top:22px;background:linear-gradient(160deg,var(--gold-soft),var(--gold));' +
  'color:#2A1B05;font-weight:800;padding:13px 26px;border-radius:999px;text-decoration:none;font-size:15px;' +
  'box-shadow:0 8px 20px -10px rgba(120,80,6,.7)}' +
  'section.more{margin-top:38px}' +
  'section.more h2{font-family:var(--display);font-size:20px;font-weight:800;letter-spacing:-.3px;margin:0 0 4px}' +
  'section.more .sub{font-size:13.5px;color:var(--ink-3);margin:0 0 8px}' +
  /* footer */
  'footer.site{margin-top:52px;border-top:1px solid var(--line);background:var(--panel);padding:24px 0 34px}' +
  'footer.site .ftag{font-family:var(--display);font-weight:700;font-size:14px;display:block;margin-bottom:10px}' +
  'footer.site .links{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:14px;margin-bottom:14px}' +
  'footer.site .links a{color:var(--ink-2);text-decoration:none}footer.site .links a:hover{color:var(--gold-ink)}' +
  'footer.site .fine{font-size:12px;line-height:1.55;color:var(--ink-3);margin:0}' +
  '@media(max-width:620px){header.site nav{display:none}.filmtop img.poster{width:150px}}';

function header(){
  return '<header class="site"><div class="wrap row">' +
    '<a class="brand" href="' + SITE + '/">' +
      '<img class="mark" src="' + SITE + '/brand/ws-logo-icon.svg" alt="" width="40" height="40">' +
      '<span><span class="bword">Well Seasoned</span><span class="btag">Rated by the culture</span></span>' +
    '</a>' +
    /* Real hrefs, not onclick handlers — a pseudo-link passes no crawl signal. */
    '<nav aria-label="Primary">' +
      '<a href="' + SITE + '/boards">Boards</a>' +
      '<a href="' + SITE + '/boards/the-gap">The Gap</a>' +
      '<a href="' + SITE + '/#/browse">Browse</a>' +
    '</nav></div></header>';
}

function footer(boards){
  const links = [
    ['/boards', 'Boards'],
    ['/boards/the-gap', 'Where critics and the culture disagree'],
    ['/boards/free-on-tubi', 'Free on Tubi'],
    ['/boards/black-family-movies', 'Black family movies'],
    ['/boards/unchallenged', 'Unchallenged'],
    ['/#/browse', 'Browse the catalog'],
    ['/#/word', 'The Balcony'],
    ['/join', 'The Table'],
  ].filter((l) => l[0] !== boards);
  return '<footer class="site"><div class="wrap">' +
    '<span class="ftag">Built for the culture. Rated by the culture.</span>' +
    '<div class="links">' + links.map((l) =>
      '<a href="' + SITE + l[0] + '">' + esc(l[1]) + '</a>').join('') + '</div>' +
    '<p class="fine">Two verdicts on every title. The Kitchen is verified critics of the culture; ' +
    'The Table is the community that bought the ticket, and the seal only lands when both agree. ' +
    'Scores are earned, never bought — nothing is seeded and nothing is sold. ' +
    'Film data and artwork via TMDB; this product uses the TMDB API but is not endorsed or certified by TMDB.</p>' +
    '</div></footer>';
}

export function crumbs(items){
  return '<nav class="crumbs" aria-label="Breadcrumb">' + items.map((it, i) =>
    (i ? '<span>/</span>' : '') +
    (it.href ? '<a href="' + esc(it.href) + '">' + esc(it.name) + '</a>' : '<span>' + esc(it.name) + '</span>')
  ).join('') + '</nav>';
}

export function crumbLd(items){
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1,
      name: it.name, item: it.href || it.self })) };
}

/* One page shell for every server-rendered route. */
export function shell(o){
  const img = o.image || (SITE + '/og.png');
  const lds = (o.ld || []).map((j) => '<script type="application/ld+json">' + JSON.stringify(j) + '</script>').join('');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>' + esc(o.title) + '</title>' +
    '<meta name="description" content="' + esc(o.desc) + '">' +
    '<link rel="canonical" href="' + esc(o.url) + '">' +
    '<link rel="icon" href="' + SITE + '/brand/ws-favicon.svg">' +
    '<meta name="theme-color" content="#EFE2C6">' +
    '<meta property="og:type" content="' + (o.ogType || 'website') + '">' +
    '<meta property="og:site_name" content="Well Seasoned">' +
    '<meta property="og:url" content="' + esc(o.url) + '">' +
    '<meta property="og:title" content="' + esc(o.title) + '">' +
    '<meta property="og:description" content="' + esc(o.desc) + '">' +
    '<meta property="og:image" content="' + esc(img) + '">' +
    (o.imageSized ? '<meta property="og:image:width" content="1200">' +
      '<meta property="og:image:height" content="630"><meta property="og:image:type" content="image/jpeg">' +
      (o.imageAlt ? '<meta property="og:image:alt" content="' + esc(o.imageAlt) + '">' : '') : '') +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + esc(o.title) + '">' +
    '<meta name="twitter:description" content="' + esc(o.desc) + '">' +
    '<meta name="twitter:image" content="' + esc(img) + '">' +
    (o.head || '') + lds + FONTS +
    '<style>' + CSS + (o.css || '') + '</style></head><body>' +
    header() +
    '<main class="wrap">' + o.body + '</main>' +
    footer(o.hideFooterLink) +
    '</body></html>';
}
