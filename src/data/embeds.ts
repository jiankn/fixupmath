// 可嵌入计算器清单：/embed/<slug>/ 的极简版本，供其他网站用 iframe 引用。
// 只放与外链推广对象（园艺、木工、建材）最相关的几款；新增时同时确认嵌入页实际高度。
export interface EmbedEntry {
  slug: string;
  /** iframe 默认高度（px）：按 760px 宽实测（2026-10-01）；自动高度脚本生效时会被覆盖 */
  height: number;
}

export const EMBEDS: EmbedEntry[] = [
  { slug: 'concrete-calculator', height: 1920 },
  { slug: 'mulch-calculator', height: 1600 },
  { slug: 'gravel-calculator', height: 1920 },
  { slug: 'topsoil-calculator', height: 1950 },
  { slug: 'cubic-yard-calculator', height: 1950 },
  { slug: 'board-foot-calculator', height: 1280 },
];

export const embedOf = (slug: string) => EMBEDS.find((e) => e.slug === slug);

/** 给站长复制的嵌入代码。署名链接放在 iframe 外面，链接到对应计算器页，锚文本只用品牌名。 */
export function embedSnippet(origin: string, slug: string, name: string, height: number): string {
  const base = origin.replace(/\/$/, '');
  return [
    `<iframe src="${base}/embed/${slug}/" title="${name}" width="100%" height="${height}" style="border:0;max-width:760px" loading="lazy"></iframe>`,
    `<p style="font-size:13px;margin:4px 0 0">${name} by <a href="${base}/${slug}/">FixUpMath</a></p>`,
    `<script>addEventListener("message",function(e){if(e.origin!=="${base}"||!e.data||!e.data.fixupmathHeight)return;document.querySelectorAll('iframe[src^="${base}/embed/"]').forEach(function(f){if(f.contentWindow===e.source)f.style.height=e.data.fixupmathHeight+"px"})})</script>`,
  ].join('\n');
}
