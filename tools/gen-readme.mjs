// Generates README.md from the panels in assets/. Each panel becomes a light and a dark block: a <picture> that picks
// the width tier matching GitHub's README column, wrapped in the anchor GitHub's theme CSS keys on
// (#gh-light-mode-only / #gh-dark-mode-only). One tag per line keeps each block an HTML block, which GitHub needs
// to preserve every <source>. The alt text is the panel's own accessible name read from its light SVG (aria-label,
// or title and desc), so the README always says exactly what the panels show. README.md is a build output: change
// wording in gen-header.mjs or gen-sections.mjs, regenerate the assets, then rerun this.
// usage: node tools/gen-readme.mjs assets README.md
import { readFileSync, writeFileSync } from 'node:fs';
const [ASSETS, OUT] = process.argv.slice(2);
const PANELS = ['header', 'about', 'experience', 'scope', 'elsewhere', 'link-linkedin'];
const LINKS = { 'link-linkedin': 'https://www.linkedin.com/in/culinablaz' };
// Width tiers matched to the column GitHub gives the README: viewport minus 82px below 768px, minus 385px up to
// 1011px, minus 449px above (capped near 846px). The fallback <img> is the 896px design.
const SOURCES = [
  ['-narrow', '(max-width: 491px), (min-width: 768px) and (max-width: 794px)'],
  ['-medium', '(max-width: 681px), (min-width: 795px) and (max-width: 984px), (min-width: 1012px) and (max-width: 1048px)'],
  ['-wide', '(max-width: 767px), (min-width: 985px) and (max-width: 1208px)'],
];
function name(panel) {
  const svg = readFileSync(`${ASSETS}/${panel}-light.svg`, 'utf8');
  const title = svg.match(/<title[^>]*>([^<]*)<\/title>/), desc = svg.match(/<desc[^>]*>([^<]*)<\/desc>/);
  if (title && desc) return `${title[1].trim()}. ${desc[1].trim()}`;
  const label = svg.match(/<svg[^>]*\saria-label="([^"]*)"/);
  if (!label) throw new Error(`${panel}: no accessible name in the SVG`);
  return label[1]; // already XML-escaped, which is also valid HTML escaping
}
const block = (panel, theme, alt) => [
  `<a href="${LINKS[panel] || ''}#gh-${theme}-mode-only">`,
  '  <picture>',
  ...SOURCES.map(([suffix, media]) => `    <source media="${media}" srcset="${ASSETS}/${panel}${suffix}-${theme}.svg">`),
  `    <img alt="${alt}" src="${ASSETS}/${panel}-${theme}.svg" width="100%">`,
  '  </picture>',
  '</a>',
].join('\n');
writeFileSync(OUT, PANELS.map(p => { const alt = name(p); return block(p, 'light', alt) + '\n' + block(p, 'dark', alt); }).join('\n\n') + '\n');
console.log('README written:', PANELS.length, 'panels × 2 themes');
