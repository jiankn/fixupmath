# 修改与验证记录

本轮更新共享展示模板、六页 metadata、三页正文；没有修改计算公式、URL 或 canonical。

| 页面 | Title：修改前 → 修改后 | 描述字符：前 → 后 | H1 |
|---|---|---:|---|
| /carpet-calculator/ | Carpet Calculator: Square Yards & Feet for Any Room \| FixUpMath → Carpet Calculator: Measure Square Feet & Yards \| FixUpMath | 153 → 154 | Carpet Calculator（保留） |
| /concrete-calculator/ | Concrete Calculator for Footings, Columns & Stairs \| FixUpMath → Concrete Calculator: Footings, Columns & Stairs \| FixUpMath | 188 → 155 | Concrete Calculator（保留） |
| /conduit-fill-calculator/ | Conduit Fill Calculator: EMT & PVC, NEC Chapter 9 \| FixUpMath → Conduit Fill Calculator: EMT & PVC \| FixUpMath | 171 → 145 | Conduit Fill Calculator（保留） |
| /square-footage-calculator/ | Square Footage Calculator: Feet & Inches, Any Shape \| FixUpMath → Square Footage Calculator: Feet & Inches, Any Shape \| FixUpMath | 177 → 152 | Square Footage Calculator（保留） |
| /voltage-drop-calculator/ | Voltage Drop Calculator: Copper & Aluminum, 1- and 3-Phase \| FixUpMath → Voltage Drop Calculator: Copper & Aluminum \| FixUpMath | 167 → 156 | Voltage Drop Calculator（保留） |
| /wallpaper-calculator/ | Wallpaper Calculator: How Many Rolls You Need, with Pattern Repeat \| FixUpMath → Wallpaper Calculator: Rolls & Pattern Repeat \| FixUpMath | 163 → 144 | Wallpaper Calculator（保留） |

所有 60 页补齐 og:image / twitter:image、大图卡片、图片尺寸和替代说明。品牌图为原生 SVG 图形渲染的 1200×630 PNG；视觉复用现有品牌颜色与口号，不包含新的功效或认证承诺。

## 验证

- 249 个测试通过（18 个文件）。
- Astro check：0 errors、0 warnings，5 个原有 hints。
- 生产构建：69 页（含 8 个不进 sitemap 的 embed 和 404）。
- 修改前和修改后，60 个 sitemap 页面均通过生产 HTML 审计；修改后额外校验分享图与卡片属性。
- 每页一个 H1，title/description 唯一，canonical 对应 sitemap，无 noindex 冲突，JSON-LD 可解析，站内链接存在，robots 允许抓取，404 产物存在。
- PNG 实测 1200×630，已目视检查。
- 当前公开访问样本：首页、robots、两个 sitemap、BTU、电压降，普通与 Googlebot UA 共 12 次均 HTTP 200；UA 测试不能替代真实 Googlebot 来源验证。

## 限制

- 不能通过本次修改承诺 Google 重新收录。
- 当前 Cloudflare 机器人拦截已关闭，没有为已经关闭的规则再添加全站放行。历史拦截已证实，规则的人类可读名称及具体旧表达式未取到，不推断为 AI 拦截。
- 只读 GSC API 无“请求编入索引”能力；本轮未把 URL Inspection 历史状态描述为实时测试。
- 本轮本地完成；没有 push 或部署。Git SHA 见任务最终回复或 `git log -1`。
