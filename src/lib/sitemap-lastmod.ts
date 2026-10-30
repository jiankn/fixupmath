// 站点地图的 lastmod（最后修改日期）：直接取页面上 updated="YYYY-MM-DD" 的日期，
// 和页面上显示的 "Last updated" 保持一致。只有内容真正改动时才改这个日期，Google 才会信任 lastmod。
// 分类页和首页没有自己的日期，取它们列出的计算器里最新的一个。
// 关于、隐私等静态页没有可靠日期，就不写 lastmod（不写比写错好）。
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { live, liveCategories, byCategory } from '../data/calculators';

const UPDATED_RE = /\bupdated="(\d{4}-\d{2}-\d{2})"/;

/** 读 src/pages 下每个页面源码里的 updated 日期，返回 { 页面 slug: 日期 } */
export function readPageDates(pagesDir: string): Record<string, string> {
  const dates: Record<string, string> = {};
  for (const file of readdirSync(pagesDir)) {
    if (!file.endsWith('.astro')) continue;
    const m = readFileSync(join(pagesDir, file), 'utf8').match(UPDATED_RE);
    if (m) dates[file.slice(0, -'.astro'.length)] = m[1];
  }
  return dates;
}

const latest = (dates: (string | undefined)[]) =>
  dates.filter((d): d is string => !!d).sort().at(-1);

/** 生成 { 站内路径: 日期 }，路径形如 /concrete-calculator/ */
export function buildLastmodMap(pageDates: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [slug, date] of Object.entries(pageDates)) map[`/${slug}/`] = date;

  for (const cat of liveCategories()) {
    const d = latest(byCategory(cat.slug).filter((c) => c.status === 'live').map((c) => pageDates[c.slug]));
    if (d) map[`/${cat.slug}/`] = d;
  }

  const home = latest(live().map((c) => pageDates[c.slug]));
  if (home) map['/'] = home;
  return map;
}
