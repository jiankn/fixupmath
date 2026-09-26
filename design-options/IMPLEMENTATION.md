# Fieldwork 实施记录

品牌 FixUpMath，正式域名 https://fixupmath.com，联系邮箱 hello@fixupmath.com。

本次统一首页、7 个分类页、30 个计算器和页头页脚。首页加入客户端搜索与分类筛选；正文增加页内目录；保留原有公式、袋重、单位、价格、分享及本地项目累加。默认浅色，页脚提供持久化深色外观切换。新增输入空值/范围错误反馈，以及编辑时隐藏手机浮动摘要的逻辑。

首页图片由内置 image_gen 生成，源文件位于 ../src/assets/project-planning.png，Astro 构建时输出响应式 WebP。图像提示：Photorealistic editorial website photograph for FixUpMath. A homeowner in a charcoal work shirt at a wood workbench studying a patio plan, with measuring tape and pencil. Bright natural daylight, practical craftsmanship, neutral palette, no logos or text. Landscape target 1280×720. 原始工具返回尺寸由生成器决定，网页使用响应式优化输出。

验证：113 项现有公式测试通过；Astro 类型检查无错误（4 个既有未使用导入提示）；43 个静态页面构建成功。浏览器抽查首页搜索空状态与清除、混凝土与地板实时重算、空值错误、390px 手机及 768px 平板布局。修复了文章表格导致的整页水平溢出。正式 robots.txt 和 sitemap 指向 fixupmath.com。

尚未执行线上部署或 DNS 修改。本地预览 npm run dev。预览部署务必设置 SITE_PREVIEW=true。
