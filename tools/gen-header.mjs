// Generates assets/header-light.svg and assets/header-dark.svg: name, stack line, the contribution grid and a
// portrait panel. Light gets an ASCII portrait in the ember ramp on paper; dark gets the same face as burner
// dots (halftone) on the dark panel. IBM Plex Mono subsets (OFL, from google/fonts) are embedded so text renders
// identically everywhere. The portraits come from tiny RGBA samples of the photo with its background removed;
// nothing higher-resolution needs to live in the repo.
// The grid is one row per year since the account was created and one cell per week, read from
// tools/contributions.json (written by .github/workflows/contributions.yml). Without that file every cell stays idle.
// usage: node tools/gen-header.mjs tools assets [--dark-portrait=halftone|cells] [--synthetic]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const [TOOLS, OUT, ...flags] = process.argv.slice(2);
const darkStyle = (flags.find(f => f.startsWith('--dark-portrait=')) || '--dark-portrait=halftone').split('=')[1];
const synthetic = flags.includes('--synthetic');
mkdirSync(OUT, { recursive: true });
const b64 = f => readFileSync(f).toString('base64');
const fontCss =
  `@font-face{font-family:'IBM Plex Mono';font-weight:400;src:url(data:font/woff2;base64,${b64(TOOLS + '/fonts/IBMPlexMono-Regular.woff2')}) format('woff2')}` +
  `@font-face{font-family:'IBM Plex Mono';font-weight:700;src:url(data:font/woff2;base64,${b64(TOOLS + '/fonts/IBMPlexMono-Bold.woff2')}) format('woff2')}`;

const themes = {
  light: { paper: '#fbf7f0', border: '#d1c9c3', ink: '#29231e', muted: '#77706b', ember: '#d95800',
           levels: ['#e3ddd8', '#f0cdb6', '#edb793', '#e8834a', '#d95800'], panel: '#fbf7f0', seam: '#e6dfd6', portrait: 'ascii' },
  dark:  { paper: '#1c1714', border: '#38322d', ink: '#eae3de', muted: '#98918b', ember: '#d95800',
           levels: ['#322d29', '#4f3324', '#7d5238', '#b04a12', '#d95800'], panel: '#120e0b', seam: '#38322d', portrait: darkStyle },
};
const emberLight = ['#29231e', '#4a2612', '#8a3a0a', '#c04d05', '#d95800', '#e8834a', '#edb793', '#f3d3bb', '#f8e9dd'];
const emberDark = ['#1a120c', '#4a230f', '#8a3a0a', '#c04d05', '#d95800', '#eb6200', '#f0894a', '#f6bb95', '#fbe6d6'];
const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function ramp(stops, t) { t = Math.max(0, Math.min(0.9999, t)); const n = stops.length - 1, i = Math.floor(t * n), f = t * n - i; const a = hexToRgb(stops[i]), b = hexToRgb(stops[i + 1]); return toHex(a.map((v, k) => v + (b[k] - v) * f)); }
const esc = c => c === '<' ? '&lt;' : c === '&' ? '&amp;' : c === '>' ? '&gt;' : c;
function sample(file, w, h) { const raw = readFileSync(file); return (x, y) => { const i = (y * w + x) * 4; return { a: raw[i + 3] / 255, l: (0.2126 * raw[i] + 0.7152 * raw[i + 1] + 0.0722 * raw[i + 2]) / 255 }; }; }

// ASCII portrait: 68x41 cells at 4.2x7px (Plex Mono advances 0.6em); dark pixels become dense glyphs on paper.
// Alpha from the cut-out blends edge pixels toward paper so the silhouette ends softly.
function ascii(x0, y0) {
  const W = 68, H = 41, px = sample(TOOLS + '/portrait-68x41.rgba', W, H), chars = '@%#*+=-:. ';
  let rows = '';
  for (let y = 0; y < H; y++) {
    let line = '', run = '', runFill = null;
    const flush = () => { if (run) line += runFill === 'none' ? run : `<tspan fill="${runFill}">${run}</tspan>`; run = ''; };
    for (let x = 0; x < W; x++) {
      const { a, l: lum } = px(x, y);
      if (a < 0.12) { if (runFill !== 'none') { flush(); runFill = 'none'; } run += ' '; continue; }
      const l = 1 - (1 - lum) * a;
      const c = chars[Math.floor(Math.min(0.999, l) * chars.length)], fill = ramp(emberLight, Math.round(l * 12) / 12);
      if (fill !== runFill) { flush(); runFill = fill; }
      run += esc(c);
    }
    flush();
    rows += `<text class="p" x="${x0}" y="${y0 + y * 7 + 5.7}" xml:space="preserve">${line}</text>\n`;
  }
  return rows;
}
// Halftone portrait: 36x36 burner dots, radius from luminance, with the same slow pulse the burner had.
function halftone(x0, y0) {
  const N = 36, step = 8, px = sample(TOOLS + '/portrait-36x36.rgba', N, N);
  let dots = '';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const { a, l: lum } = px(x, y); if (a < 0.12) continue;
    const l = Math.pow(lum, 0.9) * a;
    dots += `<circle class="d" cx="${x0 + x * step + step / 2}" cy="${y0 + y * step + step / 2}" r="${(0.6 + l * 3.4).toFixed(2)}" fill="${ramp(emberDark, 0.25 + l * 0.75)}" style="animation-delay:${(x * 0.06 + y * 0.02).toFixed(2)}s"/>`;
  }
  return dots;
}
// Ignition-cell portrait: 36x36 squares in the grid's idiom, coloured by luminance, a slow wave passing through.
function cells(x0, y0) {
  const N = 36, step = 8, px = sample(TOOLS + '/portrait-36x36.rgba', N, N);
  let rects = '';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const { a, l: lum } = px(x, y); const l = lum * a;
    const fill = a < 0.12 ? '#1d1613' : ramp(emberDark, 0.12 + l * 0.85);
    rects += `<rect x="${x0 + x * step}" y="${y0 + y * step}" width="6" height="6" rx="1.2" fill="${fill}"${a >= 0.12 ? ` class="c" style="animation-delay:${(x * 0.05 + y * 0.03).toFixed(2)}s"` : ''}/>`;
  }
  return rects;
}

// Contribution data: { updated, years: { "2022": [53 weekly totals, null where the week has not happened] } }.
function contributions() {
  if (synthetic) { // deterministic placeholder for local previews only; never committed as data
    const years = {}; let seed = 7; const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    for (let y = 2022; y <= 2026; y++) years[y] = Array.from({ length: 53 }, (_, w) => (y === 2022 && w < 40) || (y === 2026 && w > 37) ? null : Math.floor(rnd() * rnd() * 60));
    return { updated: null, years };
  }
  try { return JSON.parse(readFileSync(TOOLS + '/contributions.json', 'utf8')); } catch { return null; }
}
// Cells are 7.5px on a 9.3px step: 53 weeks fit the 491px the left panel has beside the year labels.
// Levels are quartiles of the non-zero weeks, so the scale adapts to however busy the years were.
function grid(t) {
  const data = contributions(), years = data ? Object.keys(data.years).sort() : ['2022', '2023', '2024', '2025', '2026'];
  const all = data ? years.flatMap(y => data.years[y]).filter(v => v > 0).sort((a, b) => a - b) : [];
  const q = k => all.length ? all[Math.min(all.length - 1, Math.floor(all.length * k))] : Infinity;
  const cut = [q(0.25), q(0.5), q(0.75)];
  const level = v => v == null || v === 0 ? 0 : v <= cut[0] ? 1 : v <= cut[1] ? 2 : v <= cut[2] ? 3 : 4;
  const step = 9.3, size = 7.5, x0 = 48, y0 = 182;
  let s = '';
  years.forEach((y, r) => {
    const row = data ? data.years[y] : Array(53).fill(null);
    for (let w = 0; w < 53; w++) {
      const v = row[w], lv = level(v);
      if (v === null && data) continue; // a week that has not happened yet leaves a gap, like the calendar itself
      s += `<rect x="${(x0 + w * step).toFixed(1)}" y="${(y0 + r * step).toFixed(1)}" width="${size}" height="${size}" rx="1.5" fill="${t.levels[lv]}"${lv ? ` class="g" style="animation-delay:${(w * 0.06 + r * 0.1).toFixed(2)}s"` : ''}/>`;
    }
    s += `<text x="${(x0 + 53 * step + 4).toFixed(1)}" y="${(y0 + r * step + size - 0.5).toFixed(1)}" font-size="7.5" fill="${t.muted}">${String(y).slice(2)}</text>`;
  });
  const cap = `CONTRIBUTIONS SINCE ${years[0]} · ONE ROW PER YEAR` + (data && data.updated ? ` · UPDATED ${data.updated}` : '');
  return s + `<text x="48" y="${(y0 + years.length * step + 22).toFixed(1)}" font-size="9.5" letter-spacing="1.5" fill="${t.muted}">${cap}</text>`;
}

function header(t) {
  const portrait = t.portrait === 'ascii' ? ascii(603, 5) : t.portrait === 'cells' ? cells(603, 6) : halftone(602, 6);
  // 11 glyphs at 46px with -1.4px tracking put the cursor at x≈346.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 896 300" width="896" height="300" role="img" aria-labelledby="t d">
<title id="t">Blaž Čulina</title>
<desc id="d">Software engineer at Sportradar, formerly NSoft. Java, Spring, Kubernetes, Kafka, PostgreSQL. Contribution grid since 2022, one row per year. Portrait on the right.</desc>
<style>${fontCss}
text{font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.p{font-size:7px;white-space:pre}
.g{animation:glow 4.5s ease-in-out infinite}
@keyframes glow{0%,80%,100%{opacity:1}30%{opacity:.5}}
.d{animation:pulse 3.4s ease-in-out infinite}
@keyframes pulse{0%,70%,100%{opacity:.78}22%{opacity:1}}
.c{animation:ig 4.2s ease-in-out infinite}
@keyframes ig{0%,75%,100%{opacity:1}20%{opacity:.62}}
.cur{fill:${t.ember};animation:blink 1.1s steps(1) infinite}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.g,.cur,.d,.c{animation:none}}
</style>
<defs><clipPath id="card"><rect width="896" height="300" rx="6"/></clipPath></defs>
<g clip-path="url(#card)"><rect width="896" height="300" fill="${t.paper}"/><rect x="596" width="300" height="300" fill="${t.panel}"/></g>
<line x1="596.5" y1="0" x2="596.5" y2="300" stroke="${t.seam}"/>
<rect x=".5" y=".5" width="895" height="299" rx="6" fill="none" stroke="${t.border}"/>
<circle cx="53" cy="55" r="9" fill="${t.ember}" opacity=".14"/><circle cx="53" cy="55" r="4.5" fill="${t.ember}"/>
<text x="70" y="59" font-size="11" letter-spacing="2" fill="${t.muted}">SOFTWARE ENGINEER · SPORTRADAR</text>
<text x="48" y="120" font-size="46" font-weight="700" letter-spacing="-1.4" fill="${t.ink}">Blaž Čulina</text>
<rect class="cur" x="346" y="114" width="20" height="6"/>
<text x="48" y="152" font-size="13" fill="${t.muted}">Java · Spring · Kubernetes · Kafka · PostgreSQL</text>
${grid(t)}
${portrait}</svg>
`;
}

for (const [name, t] of Object.entries(themes)) {
  const svg = header(t);
  writeFileSync(`${OUT}/header-${name}.svg`, svg);
  console.log(`header-${name}.svg`, t.portrait, svg.length, 'bytes');
}
