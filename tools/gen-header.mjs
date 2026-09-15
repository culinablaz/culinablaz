// Generates the header in light and dark at four widths (330, 500, 720, 896; suffixes -narrow, -medium, -wide, none):
// name, stack line, the contribution grid and a portrait panel of burner dots: bright-on-dark for the dark theme,
// inverted like a print halftone on paper for the light theme (pass --dark-portrait=ascii for the ASCII version). Below 600px the portrait stacks under
// the text in a shorter panel, above it sits to the right. IBM Plex Mono subsets (OFL, from google/fonts) are embedded so text renders
// identically everywhere. The portraits come from tiny RGBA samples of the photo with its background removed.
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
           levels: ['#e3ddd8', '#f0cdb6', '#edb793', '#e8834a', '#d95800'], panel: '#fbf7f0', seam: '#e6dfd6', portrait: darkStyle, onPaper: true },
  dark:  { paper: '#1c1714', border: '#38322d', ink: '#eae3de', muted: '#98918b', ember: '#d95800',
           levels: ['#322d29', '#4f3324', '#7d5238', '#b04a12', '#d95800'], panel: '#120e0b', seam: '#38322d', portrait: darkStyle, onPaper: false },
};
const TIERS = { '-narrow': 330, '-medium': 500, '-wide': 720, '': 896 };
const emberLight = ['#29231e', '#4a2612', '#8a3a0a', '#c04d05', '#d95800', '#e8834a', '#edb793', '#f3d3bb', '#f8e9dd'];
const emberDark = ['#1a120c', '#4a230f', '#8a3a0a', '#c04d05', '#d95800', '#eb6200', '#f0894a', '#f6bb95', '#fbe6d6'];
const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function ramp(stops, t) { t = Math.max(0, Math.min(0.9999, t)); const n = stops.length - 1, i = Math.floor(t * n), f = t * n - i; const a = hexToRgb(stops[i]), b = hexToRgb(stops[i + 1]); return toHex(a.map((v, k) => v + (b[k] - v) * f)); }
const esc = c => c === '<' ? '&lt;' : c === '&' ? '&amp;' : c === '>' ? '&gt;' : c;
function sample(file, w, h) { const raw = readFileSync(file); return (x, y) => { const i = (y * w + x) * 4; return { a: raw[i + 3] / 255, l: (0.2126 * raw[i] + 0.7152 * raw[i + 1] + 0.0722 * raw[i + 2]) / 255 }; }; }

// ASCII portrait: 68x41 glyph cells; Plex Mono advances 0.6em, so a cell is fs*0.6 wide and fs tall.
function ascii(x0, y0, fs) {
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
    rows += `<text x="${x0}" y="${(y0 + y * fs + fs * 0.82).toFixed(1)}" font-size="${fs}" xml:space="preserve" style="white-space:pre">${line}</text>\n`;
  }
  return rows;
}
// Halftone portrait: 36x36 burner dots with the burner's slow pulse. On the dark panel bright pixels become the
// large bright dots (the face glows); on paper it inverts like a print halftone, dark pixels become the large
// ink-and-ember dots and highlights stay small and pale.
function halftone(x0, y0, step, paper) {
  const N = 36, px = sample(TOOLS + '/portrait-36x36.rgba', N, N), rMax = step * 0.425;
  let dots = '';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const { a, l: lum } = px(x, y); if (a < 0.12) continue;
    const l = paper ? (1 - lum) * a : Math.pow(lum, 0.9) * a;
    const fill = paper ? ramp(emberLight, 0.9 - l * 0.85) : ramp(emberDark, 0.25 + l * 0.75);
    dots += `<circle class="d" cx="${(x0 + x * step + step / 2).toFixed(1)}" cy="${(y0 + y * step + step / 2).toFixed(1)}" r="${(0.5 + l * rMax).toFixed(2)}" fill="${fill}" style="animation-delay:${(x * 0.06 + y * 0.02).toFixed(2)}s"/>`;
  }
  return dots;
}
// Ignition-cell portrait: 36x36 squares in the grid's idiom, coloured by luminance, a slow wave passing through.
function cells(x0, y0, step) {
  const N = 36, px = sample(TOOLS + '/portrait-36x36.rgba', N, N), size = step * 0.75;
  let rects = '';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const { a, l: lum } = px(x, y); const l = lum * a;
    const fill = a < 0.12 ? '#1d1613' : ramp(emberDark, 0.12 + l * 0.85);
    rects += `<rect x="${(x0 + x * step).toFixed(1)}" y="${(y0 + y * step).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="1.2" fill="${fill}"${a >= 0.12 ? ` class="c" style="animation-delay:${(x * 0.05 + y * 0.03).toFixed(2)}s"` : ''}/>`;
  }
  return rects;
}
// Portrait fitted into a panel: ASCII glyph size from the panel width, dot step from it likewise; both centred.
function portrait(t, px, py, pw, ph) {
  if (t.portrait === 'ascii') { const fs = Math.min(7.2, Math.floor(Math.min((pw - 10) / 68 / 0.6, (ph - 10) / 41) * 10) / 10); const w = 68 * fs * 0.6, h = 41 * fs; return ascii(px + (pw - w) / 2, py + (ph - h) / 2, fs); }
  const step = Math.min(8, Math.floor(Math.min((pw - 12) / 36, (ph - 12) / 36) * 10) / 10), w = 36 * step;
  return t.portrait === 'cells' ? cells(px + (pw - w) / 2, py + (ph - w) / 2, step) : halftone(px + (pw - w) / 2, py + (ph - w) / 2, step, t.onPaper);
}

// Contribution data: { updated, updatedAt, years: { "2022": [53 weekly totals, null where the week has not happened] } }.
function contributions() {
  if (synthetic) {
    const years = {}; let seed = 7; const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    for (let y = 2022; y <= 2026; y++) years[y] = Array.from({ length: 53 }, (_, w) => (y === 2022 && w < 40) || (y === 2026 && w > 37) ? null : Math.floor(rnd() * rnd() * 60));
    return { updated: null, years };
  }
  try { return JSON.parse(readFileSync(TOOLS + '/contributions.json', 'utf8')); } catch { return null; }
}
function caption(data, firstYear, long) {
  if (!data) return `CONTRIBUTIONS SINCE ${firstYear}`;
  const total = Object.values(data.years).flat().reduce((a, v) => a + (v || 0), 0).toLocaleString('en-US');
  const stamp = data.updatedAt ? data.updatedAt.replace('T', ' ').slice(0, 16) + ' UTC' : data.updated;
  return `${total} CONTRIBUTIONS SINCE ${firstYear}` + (stamp ? (long ? ` · UPDATED ${stamp}` : ` · ${stamp}`) : '');
}
// One row per year, 53 week cells per row; levels are quartiles of the non-zero weeks so the scale adapts to the years.
function grid(t, x0, y0, step, fs, long) {
  const size = Math.round(step * 0.8 * 10) / 10;
  const data = contributions(), years = data ? Object.keys(data.years).sort() : ['2022', '2023', '2024', '2025', '2026'];
  const all = data ? years.flatMap(y => data.years[y]).filter(v => v > 0).sort((a, b) => a - b) : [];
  const q = k => all.length ? all[Math.min(all.length - 1, Math.floor(all.length * k))] : Infinity;
  const cut = [q(0.25), q(0.5), q(0.75)];
  const level = v => v == null || v === 0 ? 0 : v <= cut[0] ? 1 : v <= cut[1] ? 2 : v <= cut[2] ? 3 : 4;
  let s = '';
  years.forEach((y, r) => {
    const row = data ? data.years[y] : Array(53).fill(null);
    for (let w = 0; w < 53; w++) {
      const v = row[w], lv = level(v);
      if (v === null && data) continue; // a week that has not happened yet leaves a gap, like the calendar itself
      s += `<rect x="${(x0 + w * step).toFixed(1)}" y="${(y0 + r * step).toFixed(1)}" width="${size}" height="${size}" rx="${Math.min(1.5, size / 5).toFixed(1)}" fill="${t.levels[lv]}"${lv ? ` class="g" style="animation-delay:${(w * 0.06 + r * 0.1).toFixed(2)}s"` : ''}/>`;
    }
    s += `<text x="${(x0 + 53 * step + 3).toFixed(1)}" y="${(y0 + r * step + size - 0.3).toFixed(1)}" font-size="${fs}" fill="${t.muted}">${String(y).slice(2)}</text>`;
  });
  return { svg: s + `<text x="${x0}" y="${(y0 + years.length * step + (long ? 22 : 16)).toFixed(1)}" font-size="${long ? 9.5 : 8}" letter-spacing="${long ? 1.5 : 1}" fill="${t.muted}">${caption(data, years[0], long)}</text>`, h: years.length * step + (long ? 26 : 20) };
}

const STYLE = t => `<style>${fontCss}
text{font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.g{animation:glow 4.5s ease-in-out infinite}
@keyframes glow{0%,80%,100%{opacity:1}30%{opacity:.5}}
.d{animation:pulse 3.4s ease-in-out infinite}
@keyframes pulse{0%,70%,100%{opacity:.78}22%{opacity:1}}
.c{animation:ig 4.2s ease-in-out infinite}
@keyframes ig{0%,75%,100%{opacity:1}20%{opacity:.62}}
.cur{fill:${t.ember};animation:blink 1.1s steps(1) infinite}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.g,.cur,.d,.c{animation:none}}
</style>`;
const open = (t, W, H, desc) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">Blaž Čulina</title>
<desc id="d">Software engineer at Sportradar, formerly NSoft. Java, Spring, Kubernetes, Kafka, PostgreSQL. Contribution grid since 2022. ${desc}</desc>
${STYLE(t)}
<defs><clipPath id="card"><rect width="${W}" height="${H}" rx="6"/></clipPath></defs>`;
const frame = (t, W, H) => `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="6" fill="none" stroke="${t.border}"/>`;
// Text block: status dot and label, name with the blinking cursor, stack line. Returns its bottom y.
function textBlock(t, x, y, nameFs) {
  const labelFs = nameFs >= 40 ? 11 : 9.5, stackFs = nameFs >= 40 ? 13 : 10.5;
  const cursorX = x + 11 * nameFs * 0.6 - 11 * nameFs * 0.03 + 8, cursorW = Math.round(nameFs * 0.43), cursorH = Math.round(nameFs * 0.13);
  const yLabel = y + 11, yName = yLabel + nameFs * 1.33, yStack = yName + nameFs * 0.7;
  return { svg: `<circle cx="${x + 5}" cy="${yLabel - 4}" r="${labelFs * 0.8}" fill="${t.ember}" opacity=".14"/><circle cx="${x + 5}" cy="${yLabel - 4}" r="${labelFs * 0.4}" fill="${t.ember}"/>
<text x="${x + 22}" y="${yLabel}" font-size="${labelFs}" letter-spacing="${labelFs * 0.18}" fill="${t.muted}">SOFTWARE ENGINEER · SPORTRADAR</text>
<text x="${x}" y="${yName.toFixed(1)}" font-size="${nameFs}" font-weight="700" letter-spacing="${(-nameFs * 0.03).toFixed(2)}" fill="${t.ink}">Blaž Čulina</text>
<rect class="cur" x="${cursorX.toFixed(1)}" y="${(yName - cursorH).toFixed(1)}" width="${cursorW}" height="${cursorH}"/>
<text x="${x}" y="${yStack.toFixed(1)}" font-size="${stackFs}" fill="${t.muted}">Java · Spring · Kubernetes · Kafka · PostgreSQL</text>`, bottom: yStack };
}
function header(t, W) {
  if (W < 600) { // stacked: text and grid on top, portrait panel underneath
    const P = W >= 500 ? 28 : 20, nameFs = W >= 500 ? 34 : 30;
    const tb = textBlock(t, P, 24, nameFs);
    const step = Math.floor((W - 2 * P - 22) / 53 * 10) / 10;
    const g = grid(t, P, tb.bottom + 18, step, 6, false);
    const split = Math.round(tb.bottom + 18 + g.h + 12), PH = W >= 500 ? 250 : 200, H = split + PH; // a shorter portrait panel on phones: the face, not a full screen of it
    return open(t, W, H, 'Portrait below.') + `<g clip-path="url(#card)"><rect width="${W}" height="${H}" fill="${t.paper}"/><rect y="${split}" width="${W}" height="${PH}" fill="${t.panel}"/></g>
<line x1="0" y1="${split + 0.5}" x2="${W}" y2="${split + 0.5}" stroke="${t.seam}"/>${frame(t, W, H)}
${tb.svg}
${g.svg}
${portrait(t, 0, split, W, PH)}</svg>
`;
  }
  const H = 300, P = W >= 896 ? 48 : 36, PW = 300, L = W - PW, nameFs = W >= 896 ? 46 : 40;
  const tb = textBlock(t, P, 36, nameFs);
  const step = Math.min(9.3, Math.floor((L - 2 * P - 22) / 53 * 10) / 10);
  const g = grid(t, P, tb.bottom + 26, step, 7.5, true);
  return open(t, W, H, 'Portrait on the right.') + `<g clip-path="url(#card)"><rect width="${W}" height="${H}" fill="${t.paper}"/><rect x="${L}" width="${PW}" height="${H}" fill="${t.panel}"/></g>
<line x1="${L + 0.5}" y1="0" x2="${L + 0.5}" y2="${H}" stroke="${t.seam}"/>${frame(t, W, H)}
${tb.svg}
${g.svg}
${portrait(t, L, 0, PW, H)}</svg>
`;
}
for (const [name, t] of Object.entries(themes)) for (const [suffix, W] of Object.entries(TIERS)) {
  const svg = header(t, W);
  writeFileSync(`${OUT}/header${suffix}-${name}.svg`, svg);
}
console.log('headers written:', Object.keys(TIERS).length, 'tiers × 2 themes');
