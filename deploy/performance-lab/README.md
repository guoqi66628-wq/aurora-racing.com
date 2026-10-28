# Performance Lab 独立部署

本目录保留上游 [v5.0.0](https://github.com/tsunam1202/aurora-performance-lab/releases/tag/v5.0.0) 的静态站点，官网导航指向 `https://lab.aurora-racing.com/`。`site/` 是原始文件，不会随官网 Vite 构建自动发布。图片已上传至七牛云的 `performance-lab/v5.0.0/assets/` 前缀；HTML、CSS 和 JavaScript 仍由 Lab 站点提供。

上线步骤：

1. 在 DNS 中将 `lab.aurora-racing.com` 指向用于托管该站点的服务器或静态托管服务。
2. 在项目根目录运行 `node scripts/package-performance-lab.cjs`，将生成的 `build/lab-cdn-v5/` 内全部文件上传到宝塔面板中该域名的网站根目录，保留目录结构。首页设为 `index.html`。发布目录只含 `index.html`、`css/` 和 `js/`，图片地址指向七牛 CDN。
3. 为该域名签发并启用 HTTPS 证书，开启 HTTP 到 HTTPS 的跳转。
4. 访问子域名并检查首页、配件、评测、文化和服务页面，以及图片加载和手机显示；再发布包含 LAB 导航入口的官网构建产物。

页面使用哈希路由，无需配置 SPA 路径重写。官网与 Lab 分别发布；更新本目录不会自动更新线上站点。上游内容、联系人及素材来源说明分别见 `UPSTREAM-README.md` 和 `ASSET-SOURCES.json`。上游说明指出第三方品牌素材的来源链接不等同于使用授权，上线前应由运营方确认使用权限。

更新图片时，应使用新的版本前缀，调整 `scripts/package-performance-lab.cjs`、`scripts/sync-performance-lab.cjs` 和 `scripts/verify-performance-lab-cdn.cjs` 中的地址，再运行 `node --env-file-if-exists=.env.deploy scripts/sync-performance-lab.cjs` 预演，添加 `--upload` 上传，最后运行 `node scripts/verify-performance-lab-cdn.cjs` 检查。上传脚本不会删除或覆盖现有对象；已存在且内容相同的对象会跳过。
