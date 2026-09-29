// Stitches header, about, experience, scope and elsewhere into one SVG per width and theme, and draws the section hop
// across it: an ember lifts off the header's status dot and leaps from card to card down the page, throwing sparks and
// sending fire round each card's border as it lands, then drops toward the LinkedIn card. It has to be one image:
// browsers pause an image's animations while it is off screen, so separate panel images drift apart, while one image
// keeps one clock that runs whenever any part of the page is on screen. The LinkedIn card stays its own image so the
// README can link it. Everything the hop draws sits in .chain, which viewers who ask for reduced motion never see.
// Reads the panels gen-header.mjs and gen-sections.mjs wrote, so run it after them.
// usage: node tools/gen-page.mjs assets
import { readFileSync, writeFileSync } from 'node:fs';
const [ASSETS] = process.argv.slice(2);
const PANELS = ['header', 'about', 'experience', 'scope', 'elsewhere'];
const TIERS = ['-narrow', '-medium', '-wide', ''];
const EMBER = '#d95800';
const THEMES = {
  light: { fire: '#d95800', flare: '#8a3a0a', core: '#fffaf5', stroke: true },
  dark:  { fire: '#f0894a', flare: '#f6bb95', core: '#fff1e6', stroke: false },
};
const GAP = 14, CYCLE = 16, START = 3, ER = 3.4; // gap between cards, seconds per cycle, first launch, ember radius
const TITLE = /<text x="([\d.]+)" y="([\d.]+)" font-size="11" letter-spacing="2" fill="#d95800" font-weight="700">[^<]*<\/text>/;
const DOT = /<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="#d95800"\/>/;
const FONT = /@font-face\{[^}]*\}/g;

function read(panel, suffix, theme) {
  const svg = readFileSync(`${ASSETS}/${panel}${suffix}-${theme}.svg`, 'utf8');
  const [, W, H] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg).map(Number);
  const title = /<title[^>]*>([^<]*)<\/title>/.exec(svg), desc = /<desc[^>]*>([^<]*)<\/desc>/.exec(svg);
  const name = title && desc ? `${title[1].trim()}. ${desc[1].trim()}` : /<svg[^>]*\saria-label="([^"]*)"/.exec(svg)[1];
  const style = /<style>([\s\S]*?)<\/style>/.exec(svg)[1];
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
    .replace(/<title[\s\S]*?<\/title>|<desc[\s\S]*?<\/desc>|<style>[\s\S]*?<\/style>/g, '').trim();
  return { W, H, name, style, body };
}

const el = (tag, attrs, inner = '') => `<${tag}${Object.entries(attrs).map(([k, v]) => ` ${k}="${v}"`).join('')}${inner ? `>${inner}</${tag}>` : '/>'}`;
const f = v => +v.toFixed(2);
const kt = list => list.map(x => (x / CYCLE).toFixed(4)).join(';');
const anim = (tag, attrs) => el(tag, { begin: '0s', dur: CYCLE + 's', repeatCount: 'indefinite', ...attrs });
const qb = (a, c, b, u) => (1 - u) ** 2 * a + 2 * (1 - u) * u * c + u * u * b;
function qlen(a, c, b) {
  let l = 0, px = a.x, py = a.y;
  for (let k = 1; k <= 24; k++) { const u = k / 24, x = qb(a.x, c.x, b.x, u), y = qb(a.y, c.y, b.y, u); l += Math.hypot(x - px, y - py); px = x; py = y; }
  return l;
}

// Flight plan: charge on the status dot, then one arc onto each card's top edge (right, left, right, left), a beat on
// each landing, and a last arc off the bottom toward the LinkedIn arrow in the card below.
function plan(cards, W, dot, exitX) {
  const spots = [{ x: dot.x, y: dot.y }, ...cards.slice(1).map((c, i) => ({ x: Math.round(W * (i % 2 ? 0.22 : 0.78)), y: c.y + 0.5 - ER }))];
  const last = cards[cards.length - 1], exit = { x: exitX, y: last.y + last.H + ER * 3 };
  const kts = [0, START, START + 0.5], kl = [0, 0, 0], spl = ['0 0 1 1', '0 0 1 1'], lands = [];
  let t = START + 0.5, len = 0, d = `M${spots[0].x} ${spots[0].y}`;
  [...spots.slice(1), exit].forEach((b, i, all) => {
    const a = spots[i], h = Math.min(26 + Math.abs(b.x - a.x) * 0.04, a.y - ER - 4), c = { x: (a.x + b.x) / 2, y: a.y - 2 * h };
    d += ` Q${c.x.toFixed(2)} ${c.y.toFixed(2)} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
    len += qlen(a, c, b); t += 0.45 + Math.sqrt(Math.max(0, b.y - a.y)) / 38; // longer drops take longer
    kts.push(t); kl.push(len); spl.push('.4 0 .8 .75');
    if (i < all.length - 1) { lands.push(t); t += 0.55; kts.push(t); kl.push(len); spl.push('0 0 1 1'); }
  });
  kts.push(CYCLE); kl.push(len); spl.push('0 0 1 1');
  return { spots, d, kt: kts, kl: kl.map(v => v / len), spl, lands, launch: START + 0.5, end: t };
}

// A card's rounded outline split at the landing point into two halves that meet underneath.
function halves(x0, y0, x1, y1, r, lx) {
  const pts = [];
  const arc = (cx, cy, a0) => { for (let k = 0; k <= 6; k++) { const a = (a0 + k * 15) * Math.PI / 180; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  arc(x1 - r, y0 + r, -90); arc(x1 - r, y1 - r, 0); arc(x0 + r, y1 - r, 90); arc(x0 + r, y0 + r, 180); pts.push(pts[0]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = cum[cum.length - 1];
  const at = s => {
    s = ((s % total) + total) % total; let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const f = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
  };
  const s0 = total - ((x1 - r) - Math.min(x1 - r, Math.max(x0 + r, lx))), half = total / 2, n = Math.ceil(half / 5);
  const walk = dir => 'M' + Array.from({ length: n + 1 }, (_, i) => at(s0 + dir * half * i / n).map(v => v.toFixed(1)).join(' ')).join(' L');
  return [walk(1), walk(-1)];
}

function hop(cards, W, H, dot, exitX, t) {
  const p = plan(cards, W, dot, exitX);
  let s = el('defs', {}, el('filter', { id: 'glow', filterUnits: 'userSpaceOnUse', x: -20, y: -20, width: W + 40, height: H + 40 }, el('feGaussianBlur', { stdDeviation: 2.4 })));
  // fire round each card: the header lights as the ember launches, the others where it lands
  [[0, p.launch], ...p.lands.map((L, i) => [i + 1, L])].forEach(([k, L]) => {
    const c = cards[k], lx = p.spots[k].x;
    let fire = '';
    for (const [w, o, blur] of [[5, 0.4, true], [1.6, 1, false]]) for (const d of halves(0.5, c.y + 0.5, W - 0.5, c.y + c.H - 0.5, 6, lx)) {
      fire += el('path', { d, fill: 'none', stroke: t.fire, 'stroke-width': w, opacity: o, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, 'stroke-linecap': 'round', ...(blur ? { filter: 'url(#glow)' } : {}) },
        anim('animate', { attributeName: 'stroke-dashoffset', values: '1;1;0;0', keyTimes: kt([0, L, L + 0.8, CYCLE]), calcMode: 'spline', keySplines: '0 0 1 1;.25 .6 .4 1;0 0 1 1' }));
    }
    s += el('g', { opacity: 0 }, fire + anim('animate', { attributeName: 'opacity', values: '0;0;1;1;0;0', keyTimes: kt([0, L - 0.005, L, L + 1, L + 2.6, CYCLE]) }));
    if (k === 0) return;
    // the title flares: a copy in the flare colour laid over it, so calm viewers keep the plain title
    s += el('g', { transform: `translate(0 ${c.y})`, opacity: 0 }, c.title.replace(`fill="${EMBER}"`, `fill="${t.flare}"`)
      + anim('animate', { attributeName: 'opacity', values: '0;0;1;0;0', keyTimes: kt([0, L - 0.005, L, L + 0.9, CYCLE]) }));
    // a fan of sparks thrown up from the landing, falling back as they fade
    for (let i = 0; i < 7; i++) {
      const ang = (200 + i * 140 / 6) * Math.PI / 180, dist = 12 + ((i * 37) % 9), dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
      s += el('g', { transform: `translate(${lx} ${f(c.y + 0.5)})` }, el('circle', { r: 1.3, fill: t.fire, opacity: 0 },
        anim('animateMotion', { path: `M0 0 Q${f(dx * 0.6)} ${f(dy * 0.6 - 5)} ${f(dx)} ${f(dy + 9)}`, keyPoints: '0;0;1;1', keyTimes: kt([0, L, L + 0.65, CYCLE]), calcMode: 'spline', keySplines: '0 0 1 1;.2 .7 .4 1;0 0 1 1' })
        + anim('animate', { attributeName: 'opacity', values: '0;0;1;0;0', keyTimes: kt([0, L - 0.005, L, L + 0.65, CYCLE]) })));
    }
  });
  // the status dot swells as it charges
  s += el('circle', { cx: dot.x, cy: dot.y, r: dot.r, fill: EMBER }, anim('animate', { attributeName: 'r', values: `${dot.r};${dot.r};${f(dot.r * 1.7)};${dot.r};${dot.r}`, keyTimes: kt([0, p.launch - 0.055, p.launch - 0.05, p.launch + 0.3, CYCLE]) }));
  // the ember, with a short trail of fading copies a few frames behind it
  const motion = extra => anim('animateMotion', { path: p.d, calcMode: 'spline', keyPoints: p.kl.map(v => v.toFixed(4)).join(';'), keyTimes: kt(p.kt), keySplines: p.spl.join(';'), ...extra });
  const visible = o => `0;0;${o};${o};0;0`, vt = kt([0, START - 0.005, START, p.end - 0.25, p.end, CYCLE]);
  for (const [n, o, r] of [[3, 0.12, 0.6], [2, 0.25, 0.72], [1, 0.45, 0.85]]) {
    const begin = f(n * 0.035) + 's';
    s += el('g', { opacity: 0 }, motion({ begin }) + anim('animate', { attributeName: 'opacity', values: visible(o), keyTimes: vt, begin }) + el('circle', { r: f(ER * r), fill: t.fire }));
  }
  const times = [0], vals = ['1 1'];
  for (const L of p.lands) { times.push(L - 0.005, L + 0.05, L + 0.2); vals.push('1 1', '1.5 .6', '1 1'); }
  times.push(CYCLE); vals.push('1 1');
  const body = el('circle', { r: f(ER * 2.4), fill: EMBER, opacity: 0.22 }) + el('circle', { r: ER, fill: t.core, ...(t.stroke ? { stroke: EMBER, 'stroke-width': 1 } : {}) })
    + anim('animateTransform', { attributeName: 'transform', type: 'scale', values: vals.join(';'), keyTimes: kt(times) });
  s += el('g', { opacity: 0 }, motion({}) + anim('animate', { attributeName: 'opacity', values: visible(1), keyTimes: vt }) + el('g', {}, body));
  return el('g', { class: 'chain' }, s);
}

for (const [theme, t] of Object.entries(THEMES)) for (const suffix of TIERS) {
  const parts = PANELS.map(p => ({ p, ...read(p, suffix, theme) }));
  const W = parts[0].W, cards = [];
  let y = 0, styles = [], groups = '';
  for (const part of parts) {
    // scope's depth cells become .sg so its glow rule cannot reach the header's contribution grid
    const body = part.p === 'header' ? part.body : part.body.replace(/class="g"/g, 'class="sg"');
    const style = part.p === 'header' ? part.style : part.style.replace(FONT, '').replace(/\.g\{/g, '.sg{');
    if (!styles.includes(style)) styles.push(style);
    const title = TITLE.exec(part.body);
    cards.push({ y, H: part.H, title: title && title[0] });
    groups += `\n<g transform="translate(0 ${y})">\n${body}\n</g>`;
    y += part.H + GAP;
  }
  const H = y - GAP;
  const [, dx, dy, dr] = DOT.exec(parts[0].body).map(Number);
  const link = readFileSync(`${ASSETS}/link-linkedin${suffix}-${theme}.svg`, 'utf8');
  const exitX = +/<text x="([\d.]+)"[^>]*>CONTACT</.exec(link)[1];
  const label = parts.map(x => x.name).join(' ').replace(/"/g, '&quot;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}">
<style>${styles.join('\n')}
@media (prefers-reduced-motion:reduce){.chain{display:none}}</style>${groups}
${hop(cards, W, H, { x: dx, y: dy, r: dr }, W - exitX - 9, t)}
</svg>
`;
  writeFileSync(`${ASSETS}/page${suffix}-${theme}.svg`, svg);
}
console.log('pages written:', TIERS.length, 'tiers × 2 themes');
