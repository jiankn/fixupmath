// FixUpMath 的品牌与公开联系方式。
export const SITE = {
  name: 'FixUpMath',
  url: 'https://fixupmath.com',
  tagline: 'Free calculators for home, yard, and building projects',
  description:
    'Free, accurate calculators for concrete, landscaping, decks, flooring, roofing, and other home projects. Get material quantities, bag counts, and cost estimates.',
  contactEmail: 'hello@fixupmath.com',
  locale: 'en_US',
  // 社交账号等，建立后填入，用于 Organization 结构化数据
  sameAs: [] as string[],
};

export const ADSENSE_CLIENT = import.meta.env.PUBLIC_ADSENSE_CLIENT as string | undefined;

// 本地开发、显式预览构建及非正式站点地址不允许索引。
const configuredUrl = import.meta.env.SITE_URL || process.env.SITE_URL || SITE.url;
export const IS_PREVIEW = import.meta.env.DEV
  || (import.meta.env.SITE_PREVIEW || process.env.SITE_PREVIEW) === 'true'
  || new URL(configuredUrl).origin !== SITE.url;
