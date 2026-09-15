// Generates the section panels (about, experience, technical scope, elsewhere, LinkedIn card) in light and dark, at
// four widths. GitHub's README column ranges from about 310px on a phone to 846px on a wide desktop, so each panel is
// laid out parametrically by width and rendered at 330, 500, 720 and 896px (suffixes -narrow, -medium, -wide, none).
// Line breaks inside panels are computed here because SVG text does not wrap; Plex Mono advances 0.6em per glyph.
// usage: node tools/gen-sections.mjs tools assets
import { readFileSync, writeFileSync } from 'node:fs';
const [TOOLS, OUT] = process.argv.slice(2);
const b64 = f => readFileSync(f).toString('base64');
const fontCss = `@font-face{font-family:'IBM Plex Mono';font-weight:400;src:url(data:font/woff2;base64,${b64(TOOLS + '/fonts/IBMPlexMono-Regular.woff2')}) format('woff2')}@font-face{font-family:'IBM Plex Mono';font-weight:700;src:url(data:font/woff2;base64,${b64(TOOLS + '/fonts/IBMPlexMono-Bold.woff2')}) format('woff2')}`;
const themes = {
  light: { paper: '#fbf7f0', border: '#d1c9c3', ink: '#29231e', muted: '#77706b', ember: '#d95800', idle: '#e3ddd8', warm: '#edb793', line: '#d1c9c3', rule: '#ece6dd', card: '#f6f1e8' },
  dark:  { paper: '#1c1714', border: '#38322d', ink: '#eae3de', muted: '#98918b', ember: '#d95800', idle: '#322d29', warm: '#7d5238', line: '#38322d', rule: '#2a2420', card: '#221c18' },
};
const TIERS = { '-narrow': 330, '-medium': 500, '-wide': 720, '': 896 };
const pad = W => W >= 720 ? 48 : W >= 500 ? 32 : 20;
const chars = (px, fs) => Math.max(8, Math.floor(px / (fs * 0.6)));
function wrap(text, max) { const out = []; let line = ''; for (const w of text.split(' ')) { if ((line + ' ' + w).trim().length > max) { out.push(line.trim()); line = w; } else line += ' ' + w; } if (line.trim()) out.push(line.trim()); return out; }
const head = (W, H, t, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}">
<style>${fontCss}text{font-family:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace}.g{animation:gl 5s ease-in-out infinite}@keyframes gl{0%,80%,100%{opacity:1}15%{opacity:.55}}@media (prefers-reduced-motion:reduce){.g{animation:none}}</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="6" fill="${t.paper}" stroke="${t.border}"/>`;
const lerpHex = (a, b, f) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) + (parseInt(b.slice(i, i + 2), 16) - parseInt(a.slice(i, i + 2), 16)) * f).toString(16).padStart(2, '0')).join('');
const title = (t, s, x, y = 30) => `<text x="${x}" y="${y}" font-size="11" letter-spacing="2" fill="${t.ember}" font-weight="700">${s}</text>`;
const label = (t, s, x, y, anchor = 'start', fs = 10) => `<text x="${x}" y="${y}" font-size="${fs}" letter-spacing="1.5" fill="${t.muted}" text-anchor="${anchor}">${s}</text>`;
const body = (t, lines, x, y, fs = 11.5, lh = 18, fill = null, weight = 400) => lines.map((s, i) => `<text x="${x}" y="${y + i * lh}" font-size="${fs}" font-weight="${weight}" fill="${fill || t.ink}">${s}</text>`).join('');
const bullet = (t, x, y) => `<rect x="${x}" y="${y - 7}" width="5" height="5" rx="1" fill="${t.ember}"/>`;

// ---------- About ----------
const ABOUT = 'Software engineer at Sportradar (formerly NSoft), based between Imotski, Croatia and Mostar, Bosnia and Herzegovina. Backend is where I go deepest: four years of production Java, Spring and Kubernetes behind real-time betting games, where a wrong answer costs money. I plan work as carefully as I build it, and around that core I cover a lot of ground. If it has to ship, I learn it and ship it.';
function about(t, W) {
  const P = pad(W), fs = W >= 720 ? 12.5 : 11.5, lh = W >= 720 ? 21 : 17;
  const lines = wrap(ABOUT, chars(W - 2 * P, fs));
  return head(W, 54 + lines.length * lh + 10, t, 'About: software engineer at Sportradar, formerly NSoft, between Imotski and Mostar; deepest in backend, careful in planning, wide in range') + title(t, 'ABOUT', P) + body(t, lines, P, 60, fs, lh) + `</svg>`;
}

// ---------- Experience: two stacked cards ----------
const TENURE_START = { y: 2022, m: 10 }; // October 2022
const NOW = new Date();
const MONTHS_IN = (NOW.getUTCFullYear() - TENURE_START.y) * 12 + (NOW.getUTCMonth() + 1 - TENURE_START.m);
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const YEARS_LABEL = `${(WORDS[Math.round(MONTHS_IN / 12)] || Math.round(MONTHS_IN / 12)).toUpperCase()} YEARS AND COUNTING`;
const FT_BULLETS = [
  'Backend services for real-time betting games: game logic, ticket processing, settlement, and the feed systems that supply them.',
  'Kubernetes operators and Helm-based deployment tooling for game services.',
  'Planning and sequencing delivery across services: scoping, specs, and getting things to production.',
];
const FL_ROWS = [
  ['BACKEND', 'Cardano DEX and launchpad', 'VyFinance · TMinusOne · 2025'],
  ['WEB', 'WordPress sites', 'for clients, over the years'],
  ['WEB', 'Custom plugins', 'tailored to what each client needed'],
  ['WEB', 'Webshops', 'built and handed over'],
];
// Tenure block in the header grid's idiom: one row per year, twelve month cells, employed months lit, the current
// month as the pulsing dot, months not yet reached left as gaps.
function tenureBlock(t, x0, y0) {
  const step = 9.3, size = 7.5, years = [];
  for (let y = TENURE_START.y; y <= NOW.getUTCFullYear(); y++) years.push(y);
  let s = '';
  years.forEach((y, r) => {
    for (let m = 1; m <= 12; m++) {
      const idx = (y - TENURE_START.y) * 12 + (m - TENURE_START.m);
      if (idx > MONTHS_IN) continue;
      const x = x0 + (m - 1) * step, yy = y0 + r * step;
      if (idx === MONTHS_IN) s += `<circle cx="${(x + size / 2).toFixed(1)}" cy="${(yy + size / 2).toFixed(1)}" r="${size / 2}" fill="${t.ember}"/><circle cx="${(x + size / 2).toFixed(1)}" cy="${(yy + size / 2).toFixed(1)}" r="${size / 2}" fill="none" stroke="${t.ember}" stroke-width="1.2" opacity=".4"><animate attributeName="r" values="${size / 2};${size + 3};${size / 2}" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".4;0;.4" dur="2.6s" repeatCount="indefinite"/></circle>`;
      else s += `<rect x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${size}" height="${size}" rx="1.5" fill="${idx < 0 ? t.idle : t.ember}"/>`;
    }
    s += `<text x="${(x0 + 12 * step + 4).toFixed(1)}" y="${(y0 + r * step + size - 0.5).toFixed(1)}" font-size="7.5" fill="${t.muted}">${String(y).slice(2)}</text>`;
  });
  return { svg: s, w: 12 * step + 20, h: years.length * step };
}
function experience(t, W) {
  const P = pad(W), xC = P, wC = W - 2 * P, ip = W >= 500 ? 20 : 16, inner = wC - 2 * ip, y0 = 50;
  const fs = W >= 720 ? 10.5 : 10.5, lh = 16;
  let ty = y0 + 26, card = label(t, 'FULL-TIME', xC + ip, ty);
  const sideBlock = W >= 720; // tenure block sits top-right beside the text on wide panels, under the role line otherwise
  if (W >= 500) card += label(t, YEARS_LABEL, xC + wC - ip, ty, 'end');
  ty += 24;
  const nameLines = W >= 500 ? ['Sportradar (formerly NSoft) · Mostar'] : ['Sportradar (formerly NSoft)'];
  card += body(t, nameLines, xC + ip, ty, 12.5, 18, t.ink, 700); ty += 18;
  card += body(t, [W >= 500 ? 'Software Engineer · October 2022 to now' : 'Software Engineer · Oct 2022 to now'], xC + ip, ty, W >= 500 ? 11 : 10.5, 16, t.muted); ty += 14;
  if (W < 500) { card += label(t, YEARS_LABEL, xC + ip, ty + 8, 'start', 9); ty += 18; }
  if (sideBlock) { const tb = tenureBlock(t, xC + wC - ip - (12 * 9.3 + 20), y0 + 40); card += tb.svg; ty += 18; }
  else { const tb = tenureBlock(t, xC + ip, ty); card += tb.svg; ty += tb.h + 16; }
  for (const b of FT_BULLETS) { const lines = wrap(b, chars(inner - 14, fs)); card += bullet(t, xC + ip, ty) + body(t, lines, xC + ip + 14, ty, fs, lh); ty += lines.length * lh + 6; }
  const hT = ty - y0 + 8;
  let s = title(t, 'EXPERIENCE', P) + `<rect x="${xC}" y="${y0}" width="${wC}" height="${hT}" rx="5" fill="${t.card}" stroke="${t.border}"/>` + card;
  const fy = y0 + hT + 12; let ry = fy + 26;
  let fl = label(t, W >= 500 ? 'FREELANCE · PART-TIME, ALONGSIDE THE ROLE' : 'FREELANCE · PART-TIME, ALONGSIDE', xC + ip, ry); ry += 30;
  const cols = W >= 640 ? 2 : 1, colW = inner / cols, rowH = 44;
  FL_ROWS.forEach(([kind, name, sub], i) => {
    const x = xC + ip + (i % cols) * colW, y = ry + Math.floor(i / cols) * rowH;
    fl += `<text x="${x}" y="${y}" font-size="8" letter-spacing="1.2" fill="${t.ember}" font-weight="700">${kind}</text><text x="${x + 66}" y="${y}" font-size="11" fill="${t.ink}">${name}</text><text x="${x + 66}" y="${y + 15}" font-size="9.5" fill="${t.muted}">${sub}</text>`;
  });
  const hF = 26 + 30 + Math.ceil(FL_ROWS.length / cols) * rowH - 6;
  s += `<rect x="${xC}" y="${fy}" width="${wC}" height="${hF}" rx="5" fill="none" stroke="${t.border}"/>` + fl;
  return head(W, fy + hF + 20, t, `Experience: Software Engineer at Sportradar, formerly NSoft, since October 2022, ${YEARS_LABEL.toLowerCase()}. Freelance, part-time alongside the role: Cardano backends, WordPress sites, custom plugins, webshops.`) + s + `</svg>`;
}

// ---------- Technical scope: heat rows ----------
const SCOPE = [
  ['Backend', 18, 'Java · Spring Boot · service design · APIs · data modelling'],
  ['AI tooling', 17, 'Daily agent usage and research · superpowers contributor'],
  ['Planning', 16, 'Scoping · specs · sequencing the build · shipping'],
  ['Platform', 15, 'Kubernetes · Helm · Docker · Jenkins · GitHub Actions'],
  ['Data', 10, 'PostgreSQL · Kafka · Flyway · Testcontainers'],
  ['Systems', 11, 'Linux · Bash · Python for tooling · Rust at patch level'],
  ['Blockchain', 8, 'Cardano · Blockfrost, from two contracts'],
  ['Frontend', 6, 'Vue 3 · TypeScript · a deliberate focus for 2026'],
];
function scope(t, W) {
  const P = pad(W), side = W >= 800; // notes beside the cells on the widest panel, wrapped under them otherwise
  const nameW = W >= 500 ? 112 : 96, cellStep = side ? 14 : Math.min(14, Math.floor((W - 2 * P - nameW) / 20 * 10) / 10), cell = Math.round(cellStep * 0.79 * 10) / 10;
  const noteFs = side ? 10.5 : 9.5, noteLh = 13, top = 44;
  let s = title(t, 'TECHNICAL SCOPE', P) + label(t, 'DEPTH', W - P, 30, 'end'), y = top;
  for (const [i, [name, n, note]] of SCOPE.entries()) {
    s += `<text x="${P}" y="${y + 13}" font-size="${W >= 500 ? 13 : 12}" fill="${t.ink}">${name}</text>`;
    for (let c = 0; c < 20; c++) { const lit = c < n; s += `<rect x="${(P + nameW + c * cellStep).toFixed(1)}" y="${y + 3}" width="${cell}" height="${cell}" rx="2" fill="${lit ? lerpHex(t.warm, t.ember, c / 19) : t.idle}"${lit ? ` class="g" style="animation-delay:${(c * 0.05 + i * 0.12).toFixed(2)}s"` : ''}/>`; }
    if (side) { s += `<text x="${P + nameW + 20 * cellStep + 20}" y="${y + 13}" font-size="${noteFs}" fill="${t.muted}">${note}</text>`; y += 34; }
    else { const lines = wrap(note, chars(W - 2 * P, noteFs)); s += body(t, lines, P, y + 31, noteFs, noteLh, t.muted); y += 31 + lines.length * noteLh - 2; }
  }
  return head(W, y + (side ? 10 : 14), t, 'Technical scope by depth: backend and AI tooling deepest, then planning, platform, systems, data, blockchain, frontend') + s + `</svg>`;
}

// ---------- Elsewhere ----------
const ELSEWHERE = [
  ['OPEN SOURCE', 'Patches upstream when something I use is broken: pop-os/freedesktop-icons (Rust), obra/superpowers.'],
  ['HOMELAB', 'Self-hosted Kubernetes on a private network, partly on Raspberry Pis, for testing configuration and behaviour before it reaches anything that matters.'],
  ['EDUCATION', 'FSRE, University of Mostar · Bachelor\'s degree, Computer Science'],
  ['LANGUAGES', 'Croatian (native) · English (full professional) · German (limited working)'],
  ['OTHERWISE', 'Tinkering with hardware and software, making music, exploring side projects.'],
];
function elsewhere(t, W) {
  const P = pad(W), side = W >= 720, labelW = 122, fs = side ? 11.5 : 11, lh = side ? 18 : 16;
  let y = side ? 62 : 56, s = title(t, 'ELSEWHERE', P);
  for (const [k, text] of ELSEWHERE) {
    if (side) { const lines = wrap(text, chars(W - 2 * P - labelW, fs)); s += label(t, k, P, y) + body(t, lines, P + labelW, y, fs, lh); y += lines.length * lh + 14; }
    else { const lines = wrap(text, chars(W - 2 * P, fs)); s += label(t, k, P, y) + body(t, lines, P, y + 17, fs, lh); y += 17 + lines.length * lh + 12; }
  }
  return head(W, y + (side ? 6 : 0), t, 'Elsewhere: open source patches, a self-hosted Kubernetes homelab, computer science at FSRE, Croatian, English and German') + s + `</svg>`;
}

// ---------- LinkedIn card: the README wraps it in the real link ----------
function card(t, W) {
  const P = pad(W), H = 72;
  return head(W, H, t, 'Contact: LinkedIn, /in/culinablaz') + label(t, 'CONTACT', P, 27) + `<text x="${P}" y="50" font-size="13" font-weight="700" fill="${t.ink}">LinkedIn · /in/culinablaz</text><path d="M${W - P - 18} 44h18m-6 -6l6 6l-6 6" fill="none" stroke="${t.ember}" stroke-width="1.75" stroke-linecap="square"/></svg>`;
}

for (const [name, t] of Object.entries(themes)) for (const [suffix, W] of Object.entries(TIERS)) for (const [k, fn] of Object.entries({ about, experience, scope, elsewhere, 'link-linkedin': card })) writeFileSync(`${OUT}/${k}${suffix}-${name}.svg`, fn(t, W));
console.log('sections written:', Object.keys(TIERS).length, 'tiers × 2 themes × 5 panels');
