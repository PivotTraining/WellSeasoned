#!/usr/bin/env node
/* Regenerate api/films.json from the catalog in index.html so every title has
   a crawlable /f/<id> share page. Adds any films missing from films.json and
   backfills posters from WS_POSTERS; never overwrites existing poster/data.
   Run:  node scripts/build-films-json.cjs
   No dependencies. Run it whenever the FILMS catalog changes. */
'use strict';
var fs = require('fs');
var path = require('path');
var root = path.join(__dirname, '..');
var src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// Pull a balanced [...] / {...} literal that starts at `var <name>=`, string-aware.
function extractLiteral(text, marker, open, close) {
  var i = text.indexOf(marker);
  if (i < 0) throw new Error('not found: ' + marker);
  var j = text.indexOf(open, i);
  var depth = 0, inStr = false, q = '', esc = false;
  for (var k = j; k < text.length; k++) {
    var c = text[k];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === q) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; q = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return text.slice(j, k + 1); }
  }
  throw new Error('unbalanced literal for ' + marker);
}

var FILMS = eval('(' + extractLiteral(src, 'var FILMS=', '[', ']') + ')');
var WS_POSTERS = eval('(' + extractLiteral(src, 'var WS_POSTERS=', '{', '}') + ')');

var out = {};
try { out = JSON.parse(fs.readFileSync(path.join(root, 'api/films.json'), 'utf8')); } catch (e) {}

var added = 0, backfilled = 0;
FILMS.forEach(function (f) {
  if (!f || !f.id) return;
  var pinned = WS_POSTERS[f.id] || null;
  if (!out[f.id]) {
    out[f.id] = { t: f.title, y: f.year, d: (f.syn || '').slice(0, 300), p: pinned, tv: f.type === 'tv' };
    added++;
  } else if (!out[f.id].p && pinned) {
    out[f.id].p = pinned; backfilled++;
  }
});

fs.writeFileSync(path.join(root, 'api/films.json'), JSON.stringify(out));
console.log('films.json: ' + Object.keys(out).length + ' total (' + added + ' added, ' + backfilled + ' posters backfilled)');
