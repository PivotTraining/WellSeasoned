const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, 'ios', 'App', 'App', 'Assets.xcassets');

// same house shaker mark, full-bleed (no rounding — App Store icons must be a
// plain square with no transparency; the OS applies the corner mask itself)
const shaker = `
  <path d="M21 22 a11 11 0 0 1 22 0 v3 h-22 z" fill="#BE8418"></path>
  <circle cx="32" cy="14.8" r="2.3" fill="#F7EFDC"></circle>
  <circle cx="26.5" cy="15.5" r="1.8" fill="#F7EFDC"></circle>
  <circle cx="37.5" cy="15.5" r="1.8" fill="#F7EFDC"></circle>
  <circle cx="28" cy="20.7" r="1.8" fill="#F7EFDC"></circle>
  <circle cx="36" cy="20.7" r="1.8" fill="#F7EFDC"></circle>
  <rect x="19" y="25" width="26" height="5" rx="2.5" fill="#F7EFDC"></rect>
  <path d="M21.5 32 h21 l2.5 19.5 a6.5 6.5 0 0 1 -6.5 7 h-13 a6.5 6.5 0 0 1 -6.5 -7 z" fill="#E5A72E"></path>
  <path transform="translate(32 45)" d="M0,-6.5 L1.95,-2.05 L6.5,-2.05 L2.8,0.95 L4,5.4 L0,2.6 L-4,5.4 L-2.8,0.95 L-6.5,-2.05 L-1.95,-2.05 Z" fill="#2A1B10"></path>`;

const appIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#2A1B10"/>
  <g transform="translate(32 34) scale(0.86) translate(-32 -34.5)">${shaker}</g>
</svg>`;

const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#EFE2C6"/>
  <g transform="translate(32 32) scale(0.5) translate(-32 -34.5)">${shaker}</g>
</svg>`;

const jobs = [
  { file: 'AppIcon.appiconset/AppIcon-512@2x.png', size: 1024, svg: appIcon },
  { file: 'Splash.imageset/splash-2732x2732.png', size: 2732, svg: splash },
  { file: 'Splash.imageset/splash-2732x2732-1.png', size: 2732, svg: splash },
  { file: 'Splash.imageset/splash-2732x2732-2.png', size: 2732, svg: splash },
];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const j of jobs) {
    const p = await b.newPage({ viewport: { width: j.size, height: j.size } });
    const html = `<!doctype html><meta charset=utf-8><style>*{margin:0}html,body{width:${j.size}px;height:${j.size}px}svg{width:${j.size}px;height:${j.size}px;display:block}</style>${j.svg}`;
    await p.setContent(html, { waitUntil: 'load' });
    await p.waitForTimeout(100);
    await p.screenshot({ path: path.join(OUT, j.file) });
    await p.close();
    console.log('wrote', j.file, j.size);
  }
  await b.close();
})();
