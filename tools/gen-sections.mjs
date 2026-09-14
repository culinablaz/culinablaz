// Generates the section panels in light and dark: about, experience (timeline plus role details), technical scope
// (heat rows), elsewhere (open source, education, languages, homelab, otherwise) and the LinkedIn card.
// Line breaks inside panels are manual: SVG text does not wrap, and at 11.5px Plex Mono runs 6.9px per glyph.
// usage: node tools/gen-sections.mjs tools assets
import { readFileSync, writeFileSync } from 'node:fs';
const [TOOLS, OUT] = process.argv.slice(2);
const b64 = f => readFileSync(f).toString('base64');
const fontCss = `@font-face{font-family:'IBM Plex Mono';font-weight:400;src:url(data:font/woff2;base64,${b64(TOOLS + '/fonts/IBMPlexMono-Regular.woff2')}) format('woff2')}@font-face{font-family:'IBM Plex Mono';font-weight:700;src:url(data:font/woff2;base64,${b64(TOOLS + '/fonts/IBMPlexMono-Bold.woff2')}) format('woff2')}`;
const themes = {
  light: { paper: '#fbf7f0', border: '#d1c9c3', ink: '#29231e', muted: '#77706b', ember: '#d95800', idle: '#e3ddd8', warm: '#edb793', line: '#d1c9c3', rule: '#ece6dd' },
  dark:  { paper: '#1c1714', border: '#38322d', ink: '#eae3de', muted: '#98918b', ember: '#d95800', idle: '#322d29', warm: '#7d5238', line: '#38322d', rule: '#2a2420' },
};
const head = (W, H, t, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}">
<style>${fontCss}text{font-family:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace}</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="6" fill="${t.paper}" stroke="${t.border}"/>`;
const lerpHex = (a, b, f) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) + (parseInt(b.slice(i, i + 2), 16) - parseInt(a.slice(i, i + 2), 16)) * f).toString(16).padStart(2, '0')).join('');
const title = (t, s, y = 30) => `<text x="48" y="${y}" font-size="11" letter-spacing="2" fill="${t.ember}" font-weight="700">${s}</text>`;
const label = (t, s, x, y) => `<text x="${x}" y="${y}" font-size="10" letter-spacing="1.5" fill="${t.muted}">${s}</text>`;
const body = (t, lines, x, y, size = 11.5, lh = 18, fill = null) => lines.map((s, i) => `<text x="${x}" y="${y + i * lh}" font-size="${size}" fill="${fill || t.ink}">${s}</text>`).join('');
const bullet = (t, x, y) => `<rect x="${x}" y="${y - 7}" width="5" height="5" rx="1" fill="${t.ember}"/>`;

// Experience: timeline across the top, then the roles as text with ember bullets.
function experience(t) {
  const W = 896, H = 372, x0 = 96, x1 = 848, y = 82;
  const yr = v => x0 + ((v - 2022) / (2026.75 - 2022)) * (x1 - x0);
  let s = head(W, H, t, 'Experience: Software Engineer at Sportradar, formerly NSoft, since October 2022; contract backend work on Cardano in 2025') + title(t, 'EXPERIENCE');
  for (let v = 2022; v <= 2026; v++) s += `<line x1="${yr(v)}" y1="${y - 6}" x2="${yr(v)}" y2="${y + 6}" stroke="${t.line}"/><text x="${yr(v)}" y="${y + 24}" font-size="10.5" fill="${t.muted}" text-anchor="middle">${v}</text>`;
  s += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${t.line}"/>`;
  const a = yr(2022.75), c = yr(2026.7);
  s += `<rect x="${a}" y="${y - 22}" width="${c - a}" height="10" rx="2" fill="${t.ember}"/>`;
  s += `<text x="${a}" y="${y - 30}" font-size="11.5" fill="${t.ink}">Sportradar (formerly NSoft) · Software Engineer</text>`;
  s += `<circle cx="${c}" cy="${y - 17}" r="5" fill="${t.ember}" opacity=".25"><animate attributeName="r" values="5;11;5" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".3;0;.3" dur="2.6s" repeatCount="indefinite"/></circle>`;
  const c1a = yr(2025.17), c2b = yr(2025.67);
  s += `<rect x="${c1a}" y="${y + 34}" width="${c2b - c1a}" height="6" rx="1.5" fill="${t.ember}" opacity=".7"/><text x="${c2b}" y="${y + 56}" font-size="10.5" fill="${t.muted}" text-anchor="end">TMinusOne · VyFinance, part-time contracts</text>`;
  s += `<line x1="48" y1="${y + 74}" x2="${W - 48}" y2="${y + 74}" stroke="${t.rule}"/>`;
  let ty = y + 102;
  s += `<text x="48" y="${ty}" font-size="12.5" font-weight="700" fill="${t.ink}">Sportradar</text><text x="140" y="${ty}" font-size="11.5" fill="${t.muted}">formerly NSoft · Games iGaming team · Mostar</text>`;
  s += body(t, ['Software Engineer, October 2022 to present'], 48, ty + 20, 11.5, 18, t.muted);
  const bullets = [
    ['Backend services for real-time betting games: game logic, ticket processing, settlement,', 'and the feed systems that supply them.'],
    ['Kubernetes operators and Helm-based deployment tooling for game services.'],
    ['Planning and sequencing delivery across services: scoping, specs, and getting things to production.'],
  ];
  ty += 48;
  for (const lines of bullets) { s += bullet(t, 48, ty) + body(t, lines, 62, ty); ty += lines.length * 18 + 6; }
  ty += 6;
  s += `<text x="48" y="${ty}" font-size="12.5" font-weight="700" fill="${t.ink}">VyFinance · TMinusOne</text><text x="238" y="${ty}" font-size="11.5" fill="${t.muted}">part-time contracts · March to August 2025</text>`;
  s += body(t, ['Backend for a decentralised exchange and a token launchpad on Cardano, including data ingestion over Blockfrost.'], 48, ty + 20);
  return s + `</svg>`;
}
// Technical scope: 20 ignition cells per area, lit count = depth, hotter to the right.
function scope(t) {
  const rows = [
    ['Backend', 18, 'Java · Spring Boot · service design · APIs · data modelling'],
    ['Planning', 16, 'Scoping · specs · sequencing the build · shipping'],
    ['Platform', 15, 'Kubernetes · Helm · Docker · Jenkins · GitHub Actions'],
    ['Data', 10, 'PostgreSQL · Kafka · Flyway · Testcontainers'],
    ['Systems', 11, 'Linux · Bash · Python for tooling · Rust at patch level'],
    ['AI tooling', 12, 'Coding agents daily · superpowers contributor'],
    ['Blockchain', 8, 'Cardano · Blockfrost, from two contracts'],
    ['Frontend', 6, 'Vue 3 · TypeScript · a deliberate focus for 2026'],
  ];
  const W = 896, rowH = 34, top = 44, H = top + rows.length * rowH + 22;
  let s = head(W, H, t, 'Technical scope by depth: backend and planning deepest, then platform, AI tooling, systems, data, blockchain, frontend') + title(t, 'TECHNICAL SCOPE') + label(t, 'DEPTH', 810, 30);
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
  const x0 = 34, x1 = 372, y = 78, yr = v => x0 + ((v - 2022) / (2026.75 - 2022)) * (x1 - x0);
  let s = title(t, 'EXPERIENCE', 30).replace('x="48"', `x="${NP}"`);
  for (let v = 2022; v <= 2026; v++) s += `<line x1="${yr(v)}" y1="${y - 5}" x2="${yr(v)}" y2="${y + 5}" stroke="${t.line}"/><text x="${yr(v)}" y="${y + 20}" font-size="9" fill="${t.muted}" text-anchor="middle">${v}</text>`;
  s += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${t.line}"/>`;
  const a = yr(2022.75), c = yr(2026.7);
  s += `<rect x="${a}" y="${y - 20}" width="${c - a}" height="9" rx="2" fill="${t.ember}"/><text x="${a}" y="${y - 27}" font-size="10" fill="${t.ink}">Sportradar (formerly NSoft) · Software Engineer</text>`;
  s += `<circle cx="${c}" cy="${y - 15.5}" r="4" fill="${t.ember}" opacity=".25"><animate attributeName="r" values="4;10;4" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".3;0;.3" dur="2.6s" repeatCount="indefinite"/></circle>`;
  const c1a = yr(2025.17), c2b = yr(2025.67);
  s += `<rect x="${c1a}" y="${y + 28}" width="${c2b - c1a}" height="5" rx="1.5" fill="${t.ember}" opacity=".7"/><text x="${c2b}" y="${y + 47}" font-size="9" fill="${t.muted}" text-anchor="end">TMinusOne · VyFinance, part-time contracts</text>`;
  let ty = y + 74;
  s += `<line x1="${NP}" y1="${ty - 14}" x2="${NW - NP}" y2="${ty - 14}" stroke="${t.rule}"/>`;
  s += `<text x="${NP}" y="${ty}" font-size="12" font-weight="700" fill="${t.ink}">Sportradar</text><text x="100" y="${ty}" font-size="10.5" fill="${t.muted}">formerly NSoft · Games iGaming · Mostar</text>`;
  s += body(t, ['Software Engineer, October 2022 to present'], NP, ty + 18, 10.5, 16, t.muted); ty += 40;
  for (const b of ['Backend services for real-time betting games: game logic, ticket processing, settlement, and the feed systems that supply them.', 'Kubernetes operators and Helm-based deployment tooling for game services.', 'Planning and sequencing delivery across services: scoping, specs, and getting things to production.']) {
    const lines = wrap(b, 48); s += bullet(t, NP, ty) + body(t, lines, NP + 12, ty, 11, 16); ty += lines.length * 16 + 6;
  }
  ty += 4;
  s += `<text x="${NP}" y="${ty}" font-size="12" font-weight="700" fill="${t.ink}">VyFinance · TMinusOne</text>`;
  s += body(t, ['part-time contracts · March to August 2025'], NP, ty + 16, 10.5, 16, t.muted); ty += 34;
  const l2 = wrap('Backend for a decentralised exchange and a token launchpad on Cardano, including data ingestion over Blockfrost.', NCH);
  s += body(t, l2, NP, ty, 11, 16); ty += l2.length * 16;
  return head(NW, ty + 12, t, 'Experience') + s + `</svg>`;
}
function scopeNarrow(t) {
  const rows = [
    ['Backend', 18, 'Java · Spring Boot · service design · APIs · data modelling'],
    ['Planning', 16, 'Scoping · specs · sequencing the build · shipping'],
    ['Platform', 15, 'Kubernetes · Helm · Docker · Jenkins · GitHub Actions'],
    ['Data', 10, 'PostgreSQL · Kafka · Flyway · Testcontainers'],
    ['Systems', 11, 'Linux · Bash · Python for tooling · Rust at patch level'],
    ['AI tooling', 12, 'Coding agents daily · superpowers contributor'],
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
