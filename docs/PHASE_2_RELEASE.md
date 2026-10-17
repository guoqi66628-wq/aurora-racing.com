# 第二阶段上线交接（2026-10-17）

状态：用户于 2026-10-17 确认已在宝塔手动上传并上线成功；本机随后完成公开端点的只读复核。本轮只替换官网静态文件和工作台登录页静态文件；i3pro、认证服务、Nginx、数据清理服务及账号密码均不需改动。最终状态见[第二阶段收尾记录](PHASE_2_CLOSEOUT.md)。

## 发布包

| 本地文件 | 服务器目标 | 用途 |
| --- | --- | --- |
| `build/phase2-release-20261017/telemetry-login.zip` | `/srv/i3pro-login/` | 新登录页、CSS/JS、阿里巴巴普惠体及许可 |
| `build/phase2-release-20261017/aurora-website.zip` | 宝塔中 `aurora-racing.com` 站点的**现有网站根目录** | 桌面入口、移除手机入口及官网静态资源 |
| `build/phase2-release-20261017/SHA256SUMS.txt` | 可留在本地 | 上传后核对 ZIP 完整性 |

两个 ZIP 的根层就是待发布文件，解压时不要多套一层目录。官网包已剔除独立登录页 HTML、专用脚本/样式及三份普惠体文件；登录包仍保留共用的运行时文件。不要把登录包上传到官网根目录，也不要把官网包上传到 `/srv/i3pro-login/`。

## 宝塔操作顺序

1. 在宝塔确认 `aurora-racing.com` 的实际网站根目录。把该目录当前的 `index.html` 和 `/srv/i3pro-login/telemetry-login.html` 及其 `assets/` 备份到公开网站目录之外；保留旧带哈希资源，方便回退及已打开的页面继续使用。
2. 把 `telemetry-login.zip` 上传到服务器的**临时目录**并解压。先将其中 `assets/` 的文件合并到 `/srv/i3pro-login/assets/`，再用其中 `telemetry-login.html` 覆盖 `/srv/i3pro-login/telemetry-login.html`。不要删除原目录后重建。
3. 访问 `https://telemetry.aurora-racing.com/login`：页面应正常显示；浏览器开发者工具中 `/login-assets/` 下的 JS、CSS 和三个普惠体 WOFF2 应返回 200。用共享账号测试正确/错误密码，以及带参数的分享链接回到原场次。
4. 把 `aurora-website.zip` 上传到另一个临时目录并解压。先把除 `index.html` 以外的内容合并到官网现有根目录，再最后覆盖 `index.html`。保留原有其他文件及旧带哈希资源，不要清空网站根目录。
5. 强制刷新官网：桌面导航最右侧显示 TELEMETRY，手机汉堡菜单没有该入口；点击桌面入口应打开工作台登录页。再检查官网首屏、导航、图片和控制台。无须重启 Nginx 或 Python 服务。

若任一步异常，先把相应站点备份的 HTML 恢复，旧资源保持原位；检查新文件路径后再重试。登录页 HTML 和官网 `index.html` 都应最后替换，使引用的资源先就位。**上线完成要以服务器和浏览器实测为准**，本地发布包不能代替线上验收。

## 本地放行检查

- TypeScript 检查、Vite 生产构建通过。
- 分享链接回跳 2 项测试和活跃心跳 5 项测试通过。
- 七牛资源预演显示 `public/` 的 166 个本地资源与远端一致；构建引用的 88 个 CDN 资源均可访问。七牛 `dist/` 预演发现 10 个待上传对象，但本次宝塔官网包含有它们，官网 HTML 使用站点自身的 `/assets/` 路径。
- 发布包根层 HTML 引用完整：官网 3 个、登录页 4 个；登录 CSS 引用的 3 个普惠体字体均在包内。官网包无登录页专用文件。ZIP 校验值见 `SHA256SUMS.txt`。

本机没有连接宝塔服务器、上传 ZIP、切换生产页面或改动服务配置；上传由用户在宝塔手动完成。上线后只读复核：官网首页 200 且包含本轮 `main-CSxYrBfv.js`；登录页 200 且包含本轮 `telemetry-Byceq1y4.js`；登录 CSS 和普惠体常规字体均为 200；匿名访问 `/auth/session` 为 401。
