# FixUpMath 家装计算器站（英文，面向美国市场）

品牌：**FixUpMath**；正式域名：`https://fixupmath.com`；联系邮箱：`hello@fixupmath.com`。

视觉采用 Fieldwork 方案：施工橙、浅灰输入区、炭黑结果栏。首页包含 30 个工具的搜索与分类，页脚可切换深色外观。

## 常用命令

```bash
npm run dev      # 本地开发，http://localhost:4321
npm test         # 跑计算公式的自动测试（改公式后必跑）
npm run check    # 类型检查
npm run build    # 生成静态网站到 dist/
npm run deploy   # 构建并部署到 Cloudflare Workers Static Assets（首次需 npx wrangler login）
```

## 部署

项目名称统一为 `fixupmath`（npm 包名与 Cloudflare Worker 名称）。本项目使用 Astro 静态生成，构建输出为 `dist/`，计算在访客浏览器中运行，不需要服务端 Worker 脚本。

当前部署目标是 **Cloudflare Workers Static Assets**，由 `wrangler.toml` 的 `[assets]` 配置和 `wrangler deploy` 命令确定。Pages 也支持静态网站，但并非本项目当前的部署目标；“静态网站”不代表必须使用 Pages。

- 本地部署：首次执行 `npx wrangler login` 登录，然后执行 `npm run deploy`。
- 使用 Cloudflare Workers 的 Git 自动部署时：项目名称填 `fixupmath`，构建命令填 `npm run build`，部署命令填 `npx wrangler deploy`；静态目录 `./dist` 已在配置中指定。
- 部署后，在 `fixupmath` Worker 的 Settings → Domains & Routes 中添加正式自定义域名 `fixupmath.com`。
- 正式构建使用 `SITE_URL=https://fixupmath.com`（默认值），不要设置 `SITE_PREVIEW=true`，以免禁止搜索引擎索引。

参考：[Cloudflare Workers Static Assets 官方文档](https://developers.cloudflare.com/workers/static-assets/)。

## 目录

| 位置 | 作用 |
|---|---|
| `src/lib/` | 计算引擎（纯函数）和测试。**所有公式都在这里**，页面和浏览器脚本共用 |
| `src/calculators/` | 每个计算器一份配置（输入项 + 公式 + 结果格式）。`shared.ts` 是共用的形状和散装材料模板 |
| `src/components/calc/` | 通用计算器框架：按配置渲染界面，负责网址同步、项目合计、手机悬浮栏 |
| `src/components/CalcPage.astro` | 计算器页面模板：面包屑、正文、相关计算器、更新日期、结构化数据 |
| `src/data/calculators.ts` | 计算器注册表：分类、网址、上线状态、相关计算器。新计算器上线就把 `status` 改成 `live` |
| `src/components/concrete/` | 混凝土计算器（早于框架，单独实现） |
| `src/pages/` | 页面。每个计算器一个页面，网址形如 `/concrete-calculator/` |
| `src/layouts/Base.astro` | 全站外壳：标题、描述、canonical、结构化数据、页头页脚 |
| `src/components/AdSlot.astro` | 广告位，配置了 AdSense ID 才会出现 |

## 环境变量（见 `.env.example`）

- `SITE_URL`：默认 `https://fixupmath.com`，用于 canonical 和站点地图。非正式域名构建自动禁止索引。
- `SITE_PREVIEW=true`：预览部署必须设置；即使 canonical 使用正式域名，也会输出 noindex 和禁止抓取的 robots.txt。本地开发默认禁止索引。
- `PUBLIC_ADSENSE_CLIENT`：AdSense 发布商 ID，不填不显示任何广告位

## 加一个新计算器的步骤

1. 在 `src/lib/` 写计算函数，并在 `engines.test.ts` 加测试，用手算的例子核对
2. 在 `src/calculators/<id>.ts` 写配置（参照 `gravel.ts` 或 `deck.ts`），文件名必须等于配置里的 `id`；
   在 `configs.test.ts` 加一条端到端测试
3. 在 `src/pages/<slug>.astro` 用 `CalcPage` 写页面：公式 + 算例 + 引擎生成的速查表 + 常见问题 + 计算说明。
   速查表的数字一律用引擎算，不要手写
4. 在 `src/data/calculators.ts` 把状态改成 `live`，填好 `related`
5. `npm test && npm run check && npm run build`

输入项类型：长度（自带单位选择，支持「英尺 + 英寸」）、面积、数字、下拉、价格；
`showWhen` 可以让某个输入只在另一个选项为特定值时出现。

## 数据库

目前全是静态页面，计算在浏览器里完成，不需要数据库。以后要做用户反馈、保存项目等功能时，再在 `wrangler.toml` 里接 Cloudflare D1。

## 上线前待办

- [x] 品牌 FixUpMath、正式域名 fixupmath.com
- [x] 联系邮箱 hello@fixupmath.com
- [ ] 在 Cloudflare Worker `fixupmath` 绑定域名，在 Search Console 提交站点地图 `/sitemap-index.xml`
- [ ] 页面满约 20 个后申请 AdSense，拿到 ID 后设置 `PUBLIC_ADSENSE_CLIENT`
- [ ] 面向欧盟 / 英国访客的广告同意弹窗（在 AdSense 后台开启 Google 的同意管理）
