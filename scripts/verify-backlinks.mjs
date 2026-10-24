// 外链验收：读取 reports/backlink-plan/backlinks.csv 中填了 live_url 的行，
// 抓取页面，确认是否真有指向 fixupmath.com 的链接或嵌入，并记录链接属性，结果写回 CSV。
// 用法：npm run backlinks:verify            （只检查有 live_url 的行）
//      npm run backlinks:verify -- --dry-run （只打印，不写回）
import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../reports/backlink-plan/backlinks.csv', import.meta.url);
const dryRun = process.argv.includes('--dry-run');
const HOST = /(^|\.)fixupmath\.com$/i;

// 最小 CSV 解析/序列化：支持引号、逗号和换行
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((v) => v !== ''));
  return { head, rows: body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? '']))) };
}
const esc = (v) => (/[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
const toCsv = (head, rows) => [head, ...rows.map((r) => head.map((h) => r[h] ?? ''))].map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))?.slice(1).find((v) => v !== undefined) ?? '';
const isOurs = (href, base) => {
  try { return HOST.test(new URL(href, base).hostname); } catch { return false; }
};

async function check(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FixUpMath-backlink-check/1.0; +https://fixupmath.com/contact/)' },
  });
  const html = await res.text();
  const links = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => ({ tag: m[0].slice(0, m[0].indexOf('>') + 1), text: m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() }))
    .filter((l) => isOurs(attr(l.tag, 'href'), res.url));
  const embed = [...html.matchAll(/<iframe\b[^>]*>/gi)].some((m) => isOurs(attr(m[0], 'src'), res.url));
  // 同一页多条链接时优先报告不带 nofollow/sponsored/ugc 的那条
  const best = links.find((l) => !/nofollow|sponsored|ugc/i.test(attr(l.tag, 'rel'))) ?? links[0];
  return {
    http_status: String(res.status),
    link_found: links.length ? 'yes' : 'no',
    link_rel: best ? attr(best.tag, 'rel') || 'follow' : '',
    anchor: best?.text.slice(0, 80) ?? '',
    embed_found: embed ? 'yes' : 'no',
  };
}

const { head, rows } = parseCsv(await readFile(file, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
let checked = 0, found = 0;
for (const row of rows) {
  if (!row.live_url) continue;
  checked++;
  try {
    Object.assign(row, await check(row.live_url), { verified_at: today });
  } catch (err) {
    Object.assign(row, { http_status: 'error', link_found: 'unknown', verified_at: today });
    console.warn(`${row.id}: ${err.message}`);
  }
  // 只有脚本亲眼看到链接或嵌入才算 live；之前 live、这次没找到的标 lost
  if (row.link_found === 'yes' || row.embed_found === 'yes') { row.status = 'live'; found++; }
  else if (row.status === 'live' && row.link_found === 'no') row.status = 'lost';
  console.log(`${row.id.padEnd(5)} ${row.http_status.padEnd(5)} link=${row.link_found} rel=${row.link_rel || '-'} embed=${row.embed_found} ${row.live_url}`);
}
console.log(`\n已检查 ${checked} 个页面，确认 ${found} 个有链接或嵌入。`);
if (!dryRun && checked) await writeFile(file, toCsv(head, rows));
