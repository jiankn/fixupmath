import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { readPageDates, buildLastmodMap } from './sitemap-lastmod';
import { live, liveCategories } from '../data/calculators';

const pageDates = readPageDates(fileURLToPath(new URL('../pages', import.meta.url)));
const map = buildLastmodMap(pageDates);

describe('sitemap lastmod', () => {
  it('每个已上线的计算器都有 updated 日期', () => {
    const missing = live().filter((c) => !pageDates[c.slug]).map((c) => c.slug);
    expect(missing).toEqual([]);
  });

  it('分类页和首页取下属计算器里最新的日期', () => {
    const newest = Object.values(pageDates).sort().at(-1);
    expect(map['/']).toBe(newest);
    for (const cat of liveCategories()) expect(map[`/${cat.slug}/`]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('没有日期的静态页不写 lastmod', () => {
    expect(map['/about/']).toBeUndefined();
  });
});
