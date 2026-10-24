import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const key = 'd693829580b5c955529b2897c32585e8';
const origin = 'https://fixupmath.com';
const stateFile = new URL('.indexnow-state.json', root);
const read = (path) => readFile(new URL(path, root), 'utf8');
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replaceAll('&amp;', '&'));
const request = (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(30000) });

async function main() {
  const robots = await read('dist/robots.txt');
  if (/Disallow:\s*\//i.test(robots) || !robots.includes(`${origin}/sitemap-index.xml`)) {
    console.log('IndexNow skipped: this build does not allow production indexing.');
    return;
  }
  const urls = new Set();
  for (const sitemap of locs(await read('dist/sitemap-index.xml'))) {
    const location = new URL(sitemap);
    if (location.origin !== origin) throw new Error('Unexpected sitemap host.');
    for (const url of locs(await read(`dist${location.pathname}`))) urls.add(url);
  }
  const current = {};
  for (const url of urls) {
    const location = new URL(url);
    if (location.origin !== origin || location.search || location.hash) throw new Error(`Invalid URL: ${url}`);
    const html = await read(`dist${location.pathname}index.html`);
    if (/<meta\b[^>]*\bcontent=["'][^"']*noindex/i.test(html)) continue;
    current[url] = createHash('sha256').update(html).digest('hex');
  }
  let previous = {};
  try {
    previous = JSON.parse(await readFile(stateFile, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const changed = Object.keys(current).filter((url) => process.argv.includes('--all') || current[url] !== previous[url]);
  const deleted = Object.keys(previous).filter((url) => !(url in current));
  const urlList = [...changed, ...deleted];
  console.log(`IndexNow: ${changed.length} new/updated, ${deleted.length} removed URLs.`);
  if (process.argv.includes('--dry-run')) {
    console.log(urlList.join('\n'));
    return;
  }
  if (!urlList.length) return;
  const keyLocation = `${origin}/${key}.txt`;
  const verification = await request(keyLocation);
  if (verification.status !== 200 || (await verification.text()).trim() !== key) {
    throw new Error('The production key file is unavailable. Deploy the build before submitting.');
  }
  for (let offset = 0; offset < urlList.length; offset += 10000) {
    const response = await request('https://www.bing.com/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(origin).host, key, keyLocation, urlList: urlList.slice(offset, offset + 10000) }),
    });
    if (![200, 202].includes(response.status)) {
      throw new Error(`Bing IndexNow HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
    }
    console.log(`Bing IndexNow HTTP ${response.status}: ${response.status === 202 ? 'received; key validation pending' : 'submitted successfully'}.`);
  }
  await writeFile(stateFile, `${JSON.stringify(current, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`IndexNow failed: ${error.message}`);
  process.exitCode = 1;
});
