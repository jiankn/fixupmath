# 混凝土页拆分：板计算器 + 袋数计算器（2026-11-08）

来源：竞品关键词缺口报告（`C:\找需求\research\fixupmath-gap-20261108\报告.md`）补页清单第一批。规矩沿用 `page-expansion-20261024.md`：一页一个搜索意图、一个主词。

## 三页分工

| 主词 | 页面 | 用户要做的事 | 和其他两页的边界 |
| --- | --- | --- | --- |
| concrete slab calculator | /concrete-slab-calculator/ | 长 × 宽 × 厚（可选加厚边、损耗）→ 立方码、ft³、m³、40/60/80 lb 袋数、预拌下单量（¼ 码进位）、重量、可选价格 | 常见板尺寸表、每码铺多少平方英尺、板厚建议、加厚边都搬到这里 |
| concrete bag calculator | /concrete-bag-calculator/ | 已知体积（yd³/ft³/m³）、小板或柱坑 → 40/50/60/80 lb 或自定义出方量的袋数、整托盘 + 散袋、搬运重量、可选价格 | 每码袋数表、每袋几码、部分码数表、柱坑袋数表、托盘表都在这里 |
| concrete calculator | /concrete-calculator/（改） | 通用多形状：基础/墙、圆柱、圆板、管、台阶，可混合加入项目 | 删除了每码袋数表、板尺寸表、每码覆盖面积、板厚三节；例子换成 20 ft 条形基础；title/description 改为突出基础、柱、台阶；关键词去掉 slab/patio/driveway/quikrete |

三页互相有上下文内链；混凝土页 related 列表加了两页。首页“露台例子”链接、沥青页“同一块板”、钢筋页“浇筑量”改指向板计算器。站内搜索：`concrete slab calculator`、`concrete bag calculator`、`bags of concrete` 首位分别是新页，`concrete` 仍是混凝土页（已写进测试）。

## 数据出处（核实日期 2026-11-08）

- 每袋出方量：QUIKRETE Concrete Mix No. 1101 技术数据表，Revised October 2022：40 lb 0.30、50 lb 0.375、60 lb 0.45、80 lb 0.60 ft³。https://www.quikrete.com/pdfs/data_sheet-concrete%20mix%201101.pdf
- Sakrete High-Strength Concrete Mix 产品页：40/60/80 lb 出方量相同（无 50 lb）。https://www.sakrete.com/product/high-strength-concrete-mix/
- 托盘袋数：QUIKRETE 1101 产品页：40 lb 80、60 lb 56、80 lb 42。50 lb 未公开，页面写“Ask the store”，计算器不显示托盘行。https://www.quikrete.com/lowes/product_1101.asp
- 没有写任何价格；价格只用用户自己填的。

## 公式

- 板：L × W × t；加厚边按四周矩形带：[L·W − (L−2B)(W−2B)] × (边缘总深 − 板厚)，实际斜坡边会略少，偏安全。损耗在项目合计后加一次。
- 袋数：体积 × (1 + 损耗) ÷ 出方量，向上取整（整除不多进一袋）。柱坑：π(d/2)² × 深 × 个数。

## 其他改动

- 通用计算器的“加入项目”描述：下拉单位接在数字后面（“Volume: 10 cubic feet”），不再显示成单独一项。
- 全站样式加了 `.table-wrap.fit`（表头可换行、手机上缩小内边距），新两页的表格在 375px 下不再需要横向滚动。
- 两页加入可嵌入清单（/embed/…，760px 实测默认高度 1802 / 1614 px）。

## 验证

- `npm test`：18 个文件 249 个测试通过（新增 `concrete-split.test.ts` 21 个：出处数据、手算、加厚边、公制、项目合计、自定义袋、托盘、登记；搜索排序 4 条）。
- `npm run check`：0 错误 0 警告（5 个原有提示）。`npm run build`：69 页构建成功。
- 构建产物：三页 title 以主词开头、H1 与主词一致、self-canonical、WebApplication JSON-LD、无重复 id、进站点地图（lastmod 2026-11-08）和 Concrete & Masonry 分类页。
- 浏览器（开发服务器）：板页加厚边 16×12 ft 结果 4.02 yd³ / 订 4.25 码，与手算一致，分享链接参数正确；袋数页从分享链接还原柱坑 4 个 → 15 袋 60 lb，加入项目后合计 37 袋，自定义出方量生效；控制台无错误。375px 下三页和两个嵌入页都无横向滚动。

## 没做 / 留意

- 混凝土页的计算器默认形状仍是 Slab（组件、嵌入和旧分享链接都依赖它），没改；正文和 title 已不再争 slab 词。
- 未 push、未部署。
