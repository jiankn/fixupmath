// robots.txt：用配置里的域名生成站点地图地址；预览环境（没配域名）禁止抓取
import type { APIRoute } from 'astro';
import { IS_PREVIEW } from '../site';

export const GET: APIRoute = ({ site }) => {
  const body = IS_PREVIEW
    ? ['User-agent: *', 'Disallow: /', '']
    : ['User-agent: *', 'Allow: /', '', `Sitemap: ${new URL('/sitemap-index.xml', site).href}`, ''];
  return new Response(body.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
