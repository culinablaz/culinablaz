// Writes tools/contributions.json: weekly contribution totals per year since the account was created.
// Uses only the public contribution calendar (counts, no repository names), so the workflow's GITHUB_TOKEN is enough.
// usage: GITHUB_TOKEN=... node tools/fetch-contributions.mjs <login> <out>
import { writeFileSync } from 'node:fs';
const [login = 'culinablaz', out = 'tools/contributions.json'] = process.argv.slice(2);
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is required');
async function gql(query, variables) {
  const r = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}
const created = (await gql('query($l:String!){user(login:$l){createdAt}}', { l: login })).user.createdAt;
const now = new Date(), firstYear = new Date(created).getUTCFullYear(), lastYear = now.getUTCFullYear();
const years = {};
for (let y = firstYear; y <= lastYear; y++) {
  const from = `${y}-01-01T00:00:00Z`, to = y === lastYear ? now.toISOString() : `${y}-12-31T23:59:59Z`;
  const d = await gql('query($l:String!,$f:DateTime!,$t:DateTime!){user(login:$l){contributionsCollection(from:$f,to:$t){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}', { l: login, f: from, t: to });
  // The calendar pads to whole weeks, so days from the neighbouring year are dropped; weeks not yet reached stay null.
  const arr = Array(53).fill(null);
  for (const w of d.user.contributionsCollection.contributionCalendar.weeks) for (const day of w.contributionDays) {
    const dt = new Date(day.date + 'T00:00:00Z');
    if (dt.getUTCFullYear() !== y) continue;
    const idx = Math.min(52, Math.floor((dt - Date.UTC(y, 0, 1)) / 86400000 / 7));
    arr[idx] = (arr[idx] ?? 0) + day.contributionCount;
  }
  years[y] = arr;
}
writeFileSync(out, JSON.stringify({ login, updated: now.toISOString().slice(0, 10), years }) + '\n');
console.log('wrote', out, Object.keys(years).join(' '));
