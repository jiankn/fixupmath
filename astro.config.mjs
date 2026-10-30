// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';
import { readPageDates, buildLastmodMap } from './src/lib/sitemap-lastmod';

// 正式站默认使用已确认域名；预览构建可覆盖 SITE_URL 并设置 SITE_PREVIEW=true。
const site = process.env.SITE_URL || 'https://fixupmath.com';

// 站点地图里每个网址的最后修改日期，来自页面上的 updated 日期
const lastmod = buildLastmodMap(readPageDates(fileURLToPath(new URL('./src/pages', import.meta.url))));

export default defineConfig({
  site,
  trailingSlash: 'always',
  build: { format: 'directory' },
  // 嵌入版页面不收录，也不进站点地图
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/embed/'),
      serialize(item) {
        const date = lastmod[new URL(item.url).pathname];
        return date ? { ...item, lastmod: date } : item;
      },
    }),
  ],
});
