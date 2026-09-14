// Generates the section panels in light and dark: about, experience (timeline plus role details), technical scope
// (heat rows), elsewhere (open source, education, languages, homelab, otherwise) and the LinkedIn card.
// Line breaks inside panels are manual: SVG text does not wrap, and at 11.5px Plex Mono runs 6.9px per glyph.
// usage: node tools/gen-sections.mjs tools assets
import { readFileSync, writeFileSync } from 'node:fs';
const [TOOLS, OUT] = process.argv.slice(2);
const b64 = f => readFileSync(f).toString('base64');
const fontCss = `@font-face{font-family:'IBM Plex Mono';font-weight:400;src:url(data:font/woff2;base64,${b64(TOOLS + '/fonts/IBMPlexMono-Regular.woff2')}) format('woff2')}@font-face{font-family:'IBM Plex Mono';font-weight:700;src:url(data:font/woff2;base64,${b64(TOOLS + '/fonts/IBMPlexMono-Bold.woff2')}) format('woff2')}`;
const themes = {
  light: { paper: '#fbf7f0', border: '#d1c9c3', ink: '#29231e', muted: '#77706b', ember: '#d95800', idle: '#e3ddd8', warm: '#edb793', line: '#d1c9c3', rule: '#ece6dd', card: '#f6f1e8' },
  dark:  { paper: '#1c1714', border: '#38322d', ink: '#eae3de', muted: '#98918b', ember: '#d95800', idle: '#322d29', warm: '#7d5238', line: '#38322d', rule: '#2a2420', card: '#221c18' },
};
const head = (W, H, t, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}">
<style>${fontCss}text{font-family:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace}</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="6" fill="${t.paper}" stroke="${t.border}"/>`;
const lerpHex = (a, b, f) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) + (parseInt(b.slice(i, i + 2), 16) - parseInt(a.slice(i, i + 2), 16)) * f).toString(16).padStart(2, '0')).join('');
const title = (t, s, y = 30) => `<text x="48" y="${y}" font-size="11" letter-spacing="2" fill="${t.ember}" font-weight="700">${s}</text>`;
const label = (t, s, x, y) => `<text x="${x}" y="${y}" font-size="10" letter-spacing="1.5" fill="${t.muted}">${s}</text>`;
const body = (t, lines, x, y, size = 11.5, lh = 18, fill = null) => lines.map((s, i) => `<text x="${x}" y="${y + i * lh}" font-size="${size}" fill="${fill || t.ink}">${s}</text>`).join('');
const bullet = (t, x, y) => `<rect x="${x}" y="${y - 7}" width="5" height="5" rx="1" fill="${t.ember}"/>`;

// Experience: two stacked cards. The full-time card carries the weight (headline, tenure block, bullets); the
// freelance card sits under it, outlined and shorter, as a portfolio list rather than a duration, so part-time
// work alongside the role never reads as a second job or as job-hopping.
const TENURE_START = { y: 2022, m: 10 }; // October 2022
const NOW = new Date();
const MONTHS_IN = (NOW.getUTCFullYear() - TENURE_START.y) * 12 + (NOW.getUTCMonth() + 1 - TENURE_START.m); // months completed before the current one
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
// Tenure block in the header grid's idiom: one row per year, twelve month cells, same 7.5px cells on a 9.3px step,
// employed months lit, the current month as the pulsing dot, months not yet reached left as gaps.
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
function experience(t) {
  const W = 896, y0 = 50, xC = 48, wC = 800, hT = 214, hF = 150, H = y0 + hT + 14 + hF + 24;
  let s = title(t, 'EXPERIENCE');
  s += `<rect x="${xC}" y="${y0}" width="${wC}" height="${hT}" rx="5" fill="${t.card}" stroke="${t.border}"/>` + label(t, 'FULL-TIME', xC + 20, y0 + 26) + label(t, YEARS_LABEL, xC + wC - 20, y0 + 26).replace('<text ', '<text text-anchor="end" ');
  s += `<text x="${xC + 20}" y="${y0 + 50}" font-size="12.5" font-weight="700" fill="${t.ink}">Sportradar (formerly NSoft) · Mostar</text><text x="${xC + 20}" y="${y0 + 68}" font-size="11" fill="${t.muted}">Software Engineer · October 2022 to now</text>`;
  const tb = tenureBlock(t, xC + wC - 20 - (12 * 9.3 + 20), y0 + 40); s += tb.svg;
  let ty = y0 + 100;
  for (const b of FT_BULLETS) { const lines = wrapText(b, 92); s += bullet(t, xC + 20, ty) + body(t, lines, xC + 34, ty, 10.5, 16); ty += lines.length * 16 + 6; }
  const fy = y0 + hT + 14;
  s += `<rect x="${xC}" y="${fy}" width="${wC}" height="${hF}" rx="5" fill="none" stroke="${t.border}"/>` + label(t, 'FREELANCE · PART-TIME, ALONGSIDE THE ROLE', xC + 20, fy + 26);
  FL_ROWS.forEach(([kind, name, sub], i) => { const x = xC + 20 + (i % 2) * 390, y = fy + 56 + Math.floor(i / 2) * 44; s += `<text x="${x}" y="${y}" font-size="8" letter-spacing="1.2" fill="${t.ember}" font-weight="700">${kind}</text><text x="${x + 70}" y="${y}" font-size="11" fill="${t.ink}">${name}</text><text x="${x + 70}" y="${y + 15}" font-size="9.5" fill="${t.muted}">${sub}</text>`; });
  return head(W, H, t, `Experience: Software Engineer at Sportradar, formerly NSoft, since October 2022, ${YEARS_LABEL.toLowerCase()}. Freelance, part-time alongside the role: Cardano backends, WordPress sites, custom plugins, webshops.`) + s + `</svg>`;
}
function wrapText(text, max) {
  const out = []; let line = '';
  for (const word of text.split(' ')) { if ((line + ' ' + word).trim().length > max) { out.push(line.trim()); line = word; } else line += ' ' + word; }
  if (line.trim()) out.push(line.trim());
  return out;
}
// Technical scope: 20 ignition cells per area, lit count = depth, hotter to the right.
function scope(t) {
  const rows = [
    ['Backend', 18, 'Java · Spring Boot · service design · APIs · data modelling'],
    ['AI tooling', 17, 'Daily agent usage and research · superpowers contributor'],
    ['Planning', 16, 'Scoping · specs · sequencing the build · shipping'],
    ['Platform', 15, 'Kubernetes · Helm · Docker · Jenkins · GitHub Actions'],
    ['Data', 10, 'PostgreSQL · Kafka · Flyway · Testcontainers'],
    ['Systems', 11, 'Linux · Bash · Python for tooling · Rust at patch level'],
    ['Blockchain', 8, 'Cardano · Blockfrost, from two contracts'],
    ['Frontend', 6, 'Vue 3 · TypeScript · a deliberate focus for 2026'],
  ];
  const W = 896, rowH = 34, top = 44, H = top + rows.length * rowH + 22;
  let s = head(W, H, t, 'Technical scope by depth: backend and AI tooling deepest, then planning, platform, systems, data, blockchain, frontend') + title(t, 'TECHNICAL SCOPE') + label(t, 'DEPTH', 810, 30);
  rows.forEach(([name, n, note], i) => {
    const y = top + i * rowH;
    s += `<text x="48" y="${y + 16}" font-size="13" fill="${t.ink}">${name}</text>`;
    for (let c = 0; c < 20; c++) { const lit = c < n; s += `<rect x="${170 + c * 14}" y="${y + 5}" width="11" height="11" rx="2" fill="${lit ? lerpHex(t.warm, t.ember, c / 19) : t.idle}"${lit ? ` class="g" style="animation-delay:${(c * 0.05 + i * 0.12).toFixed(2)}s"` : ''}/>`; }
    s += `<text x="470" y="${y + 16}" font-size="10.5" fill="${t.muted}">${note}</text>`;
  });
  return s + `<style>.g{animation:gl 5s ease-in-out infinite}@keyframes gl{0%,80%,100%{opacity:1}15%{opacity:.55}}</style></svg>`;
}
// Elsewhere: labelled rows. Repository links live in the markdown under the panel, since images cannot carry links.
function elsewhere(t) {
  const rows = [
    ['OPEN SOURCE', ['Patches upstream when something I use is broken: pop-os/freedesktop-icons (Rust), obra/superpowers.']],
    ['HOMELAB', ['Self-hosted Kubernetes on a private network, partly on Raspberry Pis, for testing configuration', 'and behaviour before it reaches anything that matters.']],
    ['EDUCATION', ['FSRE, University of Mostar · Bachelor\'s degree, Computer Science']],
    ['LANGUAGES', ['Croatian (native) · English (full professional) · German (limited working)']],
    ['OTHERWISE', ['Tinkering with hardware and software, making music, exploring side projects.']],
  ];
  const W = 896; let y = 62, s = '';
  for (const [k, lines] of rows) { s += label(t, k, 48, y) + body(t, lines, 170, y); y += lines.length * 18 + 14; }
  return head(W, y + 6, t, 'Elsewhere: open source patches, homelab, education at FSRE, languages, interests') + title(t, 'ELSEWHERE') + s + `</svg>`;
}

// About: the intro as a panel. Four lines at 12.5px (7.5px per glyph) stay under 104 characters each.
function about(t) {
  const lines = [
    'Software engineer at Sportradar (formerly NSoft), based between Imotski, Croatia and Mostar,',
    'Bosnia and Herzegovina. Backend is where I go deepest: four years of production Java, Spring and',
    'Kubernetes behind real-time betting games, where a wrong answer costs money. I plan work as carefully',
    'as I build it, and around that core I cover a lot of ground. If it has to ship, I learn it and ship it.',
  ];
  const W = 896, H = 148;
  return head(W, H, t, 'Software engineer at Sportradar, formerly NSoft, between Imotski and Mostar. Deepest in backend, careful in planning, wide in range.') + title(t, 'ABOUT') + body(t, lines, 48, 60, 12.5, 21) + `</svg>`;
}
// Link card: an image wrapped in an anchor by the README, since an image cannot carry a link itself.
function card(t, kind, name, W = 896) {
  const H = 72;
  return head(W, H, t, `${kind}: ${name}`) + label(t, kind, 20, 27) +
    `<text x="20" y="50" font-size="13" font-weight="700" fill="${t.ink}">${name}</text>` +
    `<path d="M${W - 38} 44h18m-6 -6l6 6l-6 6" fill="none" stroke="${t.ember}" stroke-width="1.75" stroke-linecap="square"/></svg>`;
}
const cards = { 'link-linkedin': t => card(t, 'CONTACT', 'LinkedIn · /in/culinablaz') };
for (const [name, t] of Object.entries(themes)) for (const [k, fn] of Object.entries({ about, experience, scope, elsewhere, ...cards })) writeFileSync(`${OUT}/${k}-${name}.svg`, fn(t));
console.log('sections written');

// Narrow variants for phones (400px wide, served below 640px). Text is word-wrapped here because SVG will not.
function wrap(text, max) {
  const out = []; let line = '';
  for (const word of text.split(' ')) { if ((line + ' ' + word).trim().length > max) { out.push(line.trim()); line = word; } else line += ' ' + word; }
  if (line.trim()) out.push(line.trim());
  return out;
}
const NW = 400, NP = 20, NCH = 52; // width, padding, characters per line at 11.5px
function aboutNarrow(t) {
  const lines = wrap('Software engineer at Sportradar (formerly NSoft), based between Imotski, Croatia and Mostar, Bosnia and Herzegovina. Backend is where I go deepest: four years of production Java, Spring and Kubernetes behind real-time betting games, where a wrong answer costs money. I plan work as carefully as I build it, and around that core I cover a lot of ground. If it has to ship, I learn it and ship it.', NCH);
  const H = 54 + lines.length * 17 + 8;
  return head(NW, H, t, 'About') + title(t, 'ABOUT', 30).replace('x="48"', `x="${NP}"`) + body(t, lines, NP, 56, 11.5, 17) + `</svg>`;
}
function experienceNarrow(t) {
  const y0 = 50, xC = NP, wC = NW - 2 * NP; let ty = y0 + 26;
  let s = title(t, 'EXPERIENCE', 30).replace('x="48"', `x="${NP}"`);
  let card = label(t, 'FULL-TIME', xC + 16, ty) + label(t, YEARS_LABEL, xC + wC - 16, ty).replace('<text ', '<text text-anchor="end" '); ty += 22;
  card += `<text x="${xC + 16}" y="${ty}" font-size="12" font-weight="700" fill="${t.ink}">Sportradar (formerly NSoft)</text>`; ty += 16;
  card += `<text x="${xC + 16}" y="${ty}" font-size="10.5" fill="${t.muted}">Software Engineer · Mostar · October 2022 to now</text>`; ty += 14;
  const tb = tenureBlock(t, xC + 16, ty); card += tb.svg; ty += tb.h + 16;
  for (const b of FT_BULLETS) { const lines = wrap(b, 44); card += bullet(t, xC + 16, ty) + body(t, lines, xC + 28, ty, 10.5, 15); ty += lines.length * 15 + 6; }
  const hT = ty - y0 + 6;
  s += `<rect x="${xC}" y="${y0}" width="${wC}" height="${hT}" rx="5" fill="${t.card}" stroke="${t.border}"/>` + card;
  const fy = y0 + hT + 12; let ry = fy + 26;
  let fl = label(t, 'FREELANCE · PART-TIME, ALONGSIDE THE ROLE', xC + 16, ry); ry += 26;
  for (const [kind, name, sub] of FL_ROWS) { fl += `<text x="${xC + 16}" y="${ry}" font-size="8" letter-spacing="1.2" fill="${t.ember}" font-weight="700">${kind}</text><text x="${xC + 82}" y="${ry}" font-size="11" fill="${t.ink}">${name}</text><text x="${xC + 82}" y="${ry + 14}" font-size="9.5" fill="${t.muted}">${sub}</text>`; ry += 36; }
  const hF = ry - fy - 8;
  s += `<rect x="${xC}" y="${fy}" width="${wC}" height="${hF}" rx="5" fill="none" stroke="${t.border}"/>` + fl;
  return head(NW, fy + hF + 20, t, 'Experience') + s + `</svg>`;
}
function scopeNarrow(t) {
  const rows = [
    ['Backend', 18, 'Java · Spring Boot · service design · APIs · data modelling'],
    ['AI tooling', 17, 'Daily agent usage and research · superpowers contributor'],
    ['Planning', 16, 'Scoping · specs · sequencing the build · shipping'],
    ['Platform', 15, 'Kubernetes · Helm · Docker · Jenkins · GitHub Actions'],
    ['Data', 10, 'PostgreSQL · Kafka · Flyway · Testcontainers'],
    ['Systems', 11, 'Linux · Bash · Python for tooling · Rust at patch level'],
    ['Blockchain', 8, 'Cardano · Blockfrost, from two contracts'],
    ['Frontend', 6, 'Vue 3 · TypeScript · a deliberate focus for 2026'],
  ];
  const rowH = 44, top = 50, H = top + rows.length * rowH + 6;
  let s = title(t, 'TECHNICAL SCOPE', 30).replace('x="48"', `x="${NP}"`) + label(t, 'DEPTH', NW - NP, 30).replace('<text ', '<text text-anchor="end" ');
  rows.forEach(([name, n, note], i) => {
    const y = top + i * rowH;
    s += `<text x="${NP}" y="${y + 12}" font-size="12" fill="${t.ink}">${name}</text>`;
    for (let c = 0; c < 20; c++) { const lit = c < n; s += `<rect x="${112 + c * 13.4}" y="${y + 2}" width="10" height="10" rx="2" fill="${lit ? lerpHex(t.warm, t.ember, c / 19) : t.idle}"${lit ? ` class="g" style="animation-delay:${(c * 0.05 + i * 0.12).toFixed(2)}s"` : ''}/>`; }
    s += `<text x="${NP}" y="${y + 30}" font-size="9.5" fill="${t.muted}">${note}</text>`;
  });
  return head(NW, H, t, 'Technical scope') + s + `<style>.g{animation:gl 5s ease-in-out infinite}@keyframes gl{0%,80%,100%{opacity:1}15%{opacity:.55}}</style></svg>`;
}
function elsewhereNarrow(t) {
  const rows = [
    ['OPEN SOURCE', 'Patches upstream when something I use is broken: pop-os/freedesktop-icons (Rust), obra/superpowers.'],
    ['HOMELAB', 'Self-hosted Kubernetes on a private network, partly on Raspberry Pis, for testing configuration and behaviour before it reaches anything that matters.'],
    ['EDUCATION', 'FSRE, University of Mostar · Bachelor\'s degree, Computer Science'],
    ['LANGUAGES', 'Croatian (native) · English (full professional) · German (limited working)'],
    ['OTHERWISE', 'Tinkering with hardware and software, making music, exploring side projects.'],
  ];
  let y = 56, s = title(t, 'ELSEWHERE', 30).replace('x="48"', `x="${NP}"`);
  for (const [k, text] of rows) { const lines = wrap(text, NCH); s += label(t, k, NP, y) + body(t, lines, NP, y + 17, 11, 16); y += 17 + lines.length * 16 + 12; }
  return head(NW, y, t, 'Elsewhere') + s + `</svg>`;
}
function cardNarrow(t) { return card(t, 'CONTACT', 'LinkedIn · /in/culinablaz', NW).replace('x="20" y="27"', `x="${NP}" y="27"`); }
for (const [name, t] of Object.entries(themes)) for (const [k, fn] of Object.entries({ about: aboutNarrow, experience: experienceNarrow, scope: scopeNarrow, elsewhere: elsewhereNarrow, 'link-linkedin': cardNarrow })) writeFileSync(`${OUT}/${k}-narrow-${name}.svg`, fn(t));
console.log('narrow sections written');
