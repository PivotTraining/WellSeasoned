/* Shared helpers for the maintenance scripts. Extracted because every one of
   them needs the same two things: the catalog out of index.html, and a JSON
   GET that never throws. The older scripts (build-airing, build-films-json)
   still carry their own copies — left alone deliberately, they work and this
   is not the session to churn them. */
const fs = require('fs'), path = require('path'), https = require('https');
const ROOT = path.join(__dirname, '..');
const HTML = () => fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const TMDB_KEY =
  (HTML().match(/TMDB_KEY\s*=\s*'([^']+)'/) || [])[1] ||
  'fe3ebffe226bb1397cc145f58773380d';

/* Pull a balanced array literal out of index.html and eval it. Reading the
   raw text with a regex instead does not work — FILMS entries are quoted three
   different ways ({id:'x', {id:"x", "id":"x") and a pattern for one silently
   misses the others. Always go through the parsed array. */
function literal(name) {
  const s = HTML(), k = s.indexOf('var ' + name + '=[');
  if (k < 0) throw new Error('could not find var ' + name);
  let i = s.indexOf('[', k), d = 0, q = null, out = '';
  for (; i < s.length; i++) {
    const c = s[i]; out += c;
    if (q) { if (c === '\\') { out += s[++i]; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"') { q = c; continue; }
    if (c === '[') d++; else if (c === ']') { d--; if (!d) break; }
  }
  return eval(out);
}

const films = () => literal('FILMS').filter(f => f && !f.noart);
const soon  = () => literal('COMING_SOON');

function get(url, headers) {
  return new Promise(res => {
    const req = https.get(url, { headers: headers || {} }, r => {
      let b = '';
      r.on('data', d => b += d);
      r.on('end', () => {
        let j = null; try { j = JSON.parse(b); } catch (e) {}
        res({ status: r.statusCode, headers: r.headers, json: j, body: b });
      });
    });
    req.on('error', () => res({ status: 0, headers: {}, json: null, body: '' }));
    req.setTimeout(20000, () => { req.destroy(); res({ status: 0, headers: {}, json: null, body: '' }); });
  });
}

const norm = x => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

module.exports = { ROOT, HTML, TMDB_KEY, literal, films, soon, get, norm, today, plusDays };
