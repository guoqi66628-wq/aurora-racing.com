# 第二阶段收尾记录

记录日期：2026-10-17（Asia/Shanghai）。用户确认官网和工作台登录页已通过宝塔手动上传，上线成功。本记录区分用户确认与本机只读检查；未使用共享账号登录生产环境。

## 本轮上线内容

- 官网桌面导航最右侧保留 TELEMETRY 入口，手机汉堡菜单移除该入口。
- 登录页采用白色圆角双栏布局：左侧循环流动的线路动画，右侧阿里巴巴普惠体表单；整体边框有四色柔光，输入框在鼠标悬停时呼吸发光。Logo 使用 `logo-mobile.webp`，表单下方提供 i3pro GitHub 仓库入口。
- 保留共享账号验证、密码显隐、错误提示和分享链接原场次回跳。服务端认证、分析器、Nginx 与 15 天数据清理策略本轮未修改。

## 发布与验证

正式归档位于 `build/phase2-release-20261017/`，包含 `aurora-website.zip`、`telemetry-login.zip`、`SHA256SUMS.txt` 和 `README_DEPLOY.md`。官网包不含登录页专用文件；登录包包含三个原始普惠体 WOFF2 及许可文本。两个 ZIP 的 SHA-256 分别为：

```text
4E28537553AFE2870E8AE64323947BC6A63FAFBB3ECDCC6B124468D93394511C  aurora-website.zip
619FD38E649F558D7395EEDE2EDED67CB7C02ED191DF823A3A1E1E219831F3DD  telemetry-login.zip
```

上线前 `npm run lint`、`npm run build` 均通过；分享回跳 2 项、活动心跳 5 项测试通过。七牛资源预演显示 `public/` 166 个文件与远端一致，构建引用的 88 个 CDN 资源均可访问。打包检查确认官网 3 个 HTML 资源引用、登录页 4 个 HTML 资源引用和 3 个普惠体字体引用均有对应文件。

上线后从本机进行匿名只读检查：

| 地址/资源 | 结果 |
| --- | --- |
| `https://aurora-racing.com/` | 200，HTML 引用本轮 `main-CSxYrBfv.js` |
| `https://telemetry.aurora-racing.com/login` | 200，HTML 引用本轮 `telemetry-Byceq1y4.js` |
| 登录页 CSS 与普惠体常规字体 | 均为 200，字体 MIME 为 `font/woff2` |
| 未登录的 `/auth/session` | 401 |

本机无法以真实账号独立验证登录成功、完整分析流程或具体分享场次；“上线成功”来自用户反馈。第一阶段关于共享账号、并发和数据清理的运行边界仍见[第一阶段收尾记录](PHASE_1_CLOSEOUT.md)。

## 本地清理与保留

本次仅清理 `build/` 中 10 处可重建的临时文件或目录，合计 **133,422,576 字节（约 127.2 MiB）**：字体下载页面、下载用 ZIP、构建期字体工具、旧版第二阶段登录 ZIP、独立登录包展开目录，以及两个正式发布包的展开副本。未清理服务器、上传数据、备份或凭证。

保留正式发布 ZIP、校验值、上线说明、当前 `dist/`、源码与许可、第一阶段交付归档及其参考/测试记录。`build/` 受 Git 忽略，正式发布 ZIP 只在本机工作区，应另外保存一份以便回退。登录展开目录可随时由 `npm run package:telemetry` 重建；无需保留上轮较旧的 `telemetry-login-phase2.zip`。本轮未提交或推送 Git。
