// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 正式站默认使用已确认域名；预览构建可覆盖 SITE_URL 并设置 SITE_PREVIEW=true。
const site = process.env.SITE_URL || 'https://fixupmath.com';

export default defineConfig({
  site,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap()],
});
