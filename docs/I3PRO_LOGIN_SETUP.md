# 工作台入口与品牌登录页接入

已部署用户的分享链接修复见 [分享页面代理升级](I3PRO_SHARE_PROXY_SETUP.md)。2026-10-15 的新 `/session/` 入口由认证服务直接校验并流式转发页面，不再使用新增的 Lua 子请求；根页面和 API 仍保留原检查。旧方案及故障记录见 [历史记录](I3PRO_SHARE_UPGRADE.md)。

更新时间：2026-10-14。适用于已经按 `I3PRO_DEPLOY_GUIDE.md` 部署 i3pro，并启用了 Nginx Basic Auth 的服务器。

本地源码和部署文件已准备。用户已在服务器部署认证服务并通过 12 项测试；登录后出现的 500 已由日志定位到 Lua 子请求与 HTTP/2 的兼容问题。下面的协议配置修正已写入本地文件，仍需在服务器应用并验收；助手未直接连接服务器操作。

## 1. 已完成的内容

- 官网桌面导航最右侧增加 `TELEMETRY` 按钮。
- 手机汉堡菜单最底部增加工作台入口，点击后收起菜单。
- 两端入口均指向 `/login`，每次点击都显示账号密码表单，不自动恢复进入工作台。
- 独立登录页面沿用官网的黑白、极光紫、Outfit 字体与赛车图片；手机优先显示表单。
- 账号密码继续使用 `/etc/i3pro-auth/htpasswd`，无需重建账号。
- 认证服务使用 Python 3.11 标准库与服务器已有的 `htpasswd`，不引入数据库或 Python 第三方包。

浏览器自带的 Basic Auth 弹窗无法通过官网 CSS 美化。因此自定义表单接入一个本机认证服务，由 Nginx 已安装的 Lua 模块检查登录 Cookie，再转发到原来的 i3pro 服务。密码只通过 HTTPS 请求体和 `htpasswd` 标准输入传递，不写入 URL、前端存储或日志。

2026-10-13 已由服务器输出确认：Nginx 1.28.3 编译了 `lua_nginx_module`，没有 `http_auth_request_module`。当前两个配置文件已改为 `access_by_lua_block` 加内部子请求，无需重新编译 Nginx。认证失败返回 401，认证服务异常则返回 503，不会放行到 i3pro。

参考：[Lua 模块访问控制官方说明](https://github.com/openresty/lua-nginx-module#access_by_lua_block)、[htpasswd 官方说明](https://httpd.apache.org/docs/2.4/programs/htpasswd.html)。

## 2. 本地预览与构建

在官网项目目录的 PowerShell 中执行：

```powershell
npm.cmd run dev
```

打开 `http://localhost:3000/` 查看导航，打开 `http://localhost:3000/telemetry-login.html` 查看登录页。端口如被占用，以 Vite 实际输出为准。静态预览没有认证服务，提交时会显示服务未接入的提示，不会模拟登录成功。

发布前运行：

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run verify:assets
npm.cmd run package:telemetry
```

生成的两份文件用途不同：

| 文件 | 放到哪里 |
| --- | --- |
| `dist/` 的内容 | 原官网站点根目录，更新导航入口 |
| `build/telemetry-login/` 的内容 | 服务器 `/srv/i3pro-login/`，提供工作台登录页 |
| `deploy/telemetry/auth_service.py`、`test_auth_service.py` | 服务器 `/opt/aurora-telemetry-auth/` |
| `deploy/telemetry/aurora-telemetry-auth.service` | 服务器 `/etc/systemd/system/` |
| `deploy/telemetry/nginx-locations.conf` | 用于合并工作台 HTTPS 站点配置，不能整份覆盖宝塔配置 |

登录页复用现有 CDN 图片与字体；打包脚本将登录页 JS/CSS 路径改为独立的 `/login-assets/`，避免占用 i3pro 自身的静态资源路径。`build/telemetry-login/` 中的 HTML 和 `assets/` 必须一起上传。不要将服务端 Python 文件放进公开站点目录。

## 3. 服务器预检查

以下命令在服务器宝塔终端或 SSH 执行。先备份工作台 Nginx 配置和官网静态文件。

```bash
/www/server/nginx/sbin/nginx -V 2>&1
command -v python3.11
command -v htpasswd
command -v setfacl
ss -lntp
```

确认：

- Nginx 编译参数包含 `lua_nginx_module`（当前服务器已确认）。本次使用已有 Lua 模块，无需安装 `auth_request` 模块；保存新配置后仍须执行 `nginx -t` 检查，并验收认证成功、失败和服务异常时的实际行为。
- Python 路径为 `/usr/bin/python3.11`，否则同步修改 service 的 `ExecStart`。
- htpasswd 路径为 `/usr/bin/htpasswd`；不同时在 service 中加入 `Environment=TELEMETRY_HTPASSWD=实际绝对路径`。
- 8732 端口空闲。认证服务只监听 `127.0.0.1:8732`，不开放公网端口。
- 若缺少 `setfacl`，Alibaba Cloud Linux 3 可安装 `yum install -y acl`。

## 4. 上传文件并启动认证服务

首次创建专用账号和目录（如已存在，先核实用途，不重复创建）：

```bash
useradd --system --user-group --no-create-home --shell /usr/sbin/nologin aurora-auth
install -d -m 755 /opt/aurora-telemetry-auth /srv/i3pro-login
```

通过宝塔文件管理器上传第 2 节列出的文件。让服务代码和登录页文件由 root 管理，服务运行账号只负责读取。

只给认证账号读取原密码文件的权限：

```bash
setfacl -m u:aurora-auth:--x /etc/i3pro-auth
setfacl -m u:aurora-auth:r-- /etc/i3pro-auth/htpasswd
runuser -u aurora-auth -- test -r /etc/i3pro-auth/htpasswd
```

检查原 Nginx 用户仍能读取密码文件，以便继续使用旧认证和随时回滚。若配置的密码文件路径不同，同时修改 service 中的 `TELEMETRY_PASSWORD_FILE` 和上述权限路径。

运行测试并启动：

```bash
cd /opt/aurora-telemetry-auth
PYTHONDONTWRITEBYTECODE=1 /usr/bin/python3.11 -m unittest -v test_auth_service
systemd-analyze verify /etc/systemd/system/aurora-telemetry-auth.service
systemctl daemon-reload
systemctl enable --now aurora-telemetry-auth
systemctl status aurora-telemetry-auth --no-pager
curl -i http://127.0.0.1:8732/auth/session
```

最后一条应返回 `401` 和 `{"authenticated": false}`。测试会在临时目录生成测试账号，不改动真实密码文件；服务器安装了 htpasswd 时还会执行真实密码校验测试。

## 5. 合并工作台 Nginx 配置

### 已部署后登录出现 500：当前服务器的兼容修正

服务器日志明确报错 `http2 requests not supported yet`，调用点为 `ngx.location.capture`；本机 i3pro 的 8731 端口返回 200。当前构建的 Lua 子请求无法处理这次 HTTP/2 请求。完整配置已改用 HTTPS 下的 HTTP/1.1，并关闭 HTTP/3 广告，避免浏览器选择另一条未经验证的协议路径。

已经完成登录页和认证服务部署时，只需修改工作台站点配置，无需重新创建账号、上传登录页或重启认证服务：

1. 在宝塔 `telemetry.aurora-racing.com` 的配置文件中删除 `listen 443 quic;`，将 `http2 on;` 改为 `http2 off;`，在同一 `server` 中设置 `http3 off;`。保留 `listen 443 ssl;` 和证书配置。不要重复添加已有指令。
2. 将该站点及其包含文件中已有的所有 `add_header Alt-Svc ...;` 改为 `add_header Alt-Svc "clear" always;`，清除旧的 HTTP/3 广告。使用下方片段方式时，也必须同步修改外层 `server` 的协议设置；只替换 locations 不够。
3. 在服务器执行以下命令，只有检查通过才重载：

```bash
/www/server/nginx/sbin/nginx -t && /www/server/nginx/sbin/nginx -s reload
```

重载后完全退出浏览器再重新打开，避免继续使用旧 worker 的 HTTP/2 连接；访问 `https://telemetry.aurora-racing.com/login` 登录。验收正确密码能进入工作台、错误密码被拒绝、再次打开工作台需要重新登录，以及上传和分析正常。此修正仅针对工作台域名。服务器语法检查和浏览器验收不能由本地静态检查代替。

协议开关参考：[Nginx http2](https://nginx.org/en/docs/http/ngx_http_v2_module.html#http2)、[Nginx http3](https://nginx.org/en/docs/http/ngx_http_v3_module.html#http3)。

### 首次接入或替换整份配置

已根据 2026-10-13 提供的完整宝塔配置生成 [整站替换版](../deploy/telemetry/telemetry.aurora-racing.com.conf)：保留证书、证书校验 include、扩展 include、伪静态 include、日志路径，以及实际的 `256m` 上传限制。此文件是整个 `server` 块的替换版本，不能追加到原配置末尾；它与 `nginx-locations.conf` 是两种使用方式，不要同时粘贴。外部 include 的实际内容仍需在服务器通过 `nginx -t` 检查。

启用前先确认第 4 节的服务已启动、登录页文件已上传，且使用最新 Lua 版配置。旧版中任何 `auth_request` 指令（包括 `auth_request off`）都不能用于当前服务器。仅替换 Nginx 配置无法自动安装认证服务和登录页。

普通代理使用 `location /`，让原有敏感文件和证书校验正则规则继续参与匹配；`/login`、认证端点和首页使用精确匹配。匹配规则见 [Nginx 官方 location 说明](https://nginx.org/en/docs/http/ngx_http_core_module.html#location)。

只修改 `telemetry.aurora-racing.com` 的 HTTPS `server` 块：

1. 保留宝塔已有 SSL、证书路径、HTTP → HTTPS 跳转，以及 `/.well-known/acme-challenge/` 校验配置。
2. 选用整站替换版时，用其全文替换原 `server` 配置。选用片段方式时，用 `deploy/telemetry/nginx-locations.conf` 替换之前的根路径代理块（`location /` 或 `location ^~ /`），合并已有同名 location，避免重复。
3. 检查反向代理 include、静态资源 location、PHP 配置和任何其他业务 location：i3pro 的页面及 API 必须经过 Lua 认证检查。不要保留绕过认证的更具体路径。ACME、登录 HTML、登录资源和认证接口是公开的例外。
4. 登录页的 `/login-assets/` 需要 Nginx 原有 `mime.types` 配置，保证 JS 和 CSS 的 MIME 类型正确。
5. 检查并重载：

```bash
/www/server/nginx/sbin/nginx -t
```

只有显示配置检查成功后，才在宝塔中重载 Nginx。随后打开 `https://telemetry.aurora-racing.com/`，应跳到 `/login`。登录成功后进入原 i3pro 工作台。

## 6. 验收后再上传官网 dist

- 无痕窗口打开工作台根路径：跳到品牌登录页，不出现浏览器密码弹窗。
- 未登录访问 `/api/sessions`：返回 401；直接访问其他分析/上传接口同样受保护。
- 输入错误密码：留在页面并显示错误；正确密码：进入工作台。
- 使用真实小日志确认上传、分析、刷新页面和导出正常。
- 手机下表单不横向溢出，密码显示按钮、键盘、错误提示可用。
- 测试证书校验路径仍可访问。
- 完成后把官网 `dist/` 内容上传至原官网站点，再检查桌面最右侧和手机菜单最底部的入口。

入口指向工作台 `/login`。必须先部署新版登录页、认证服务和 Nginx 配置并验证，再更新官网入口；仅更新本地代码或官网 dist 无法改变线上旧 Basic Auth 的凭据缓存行为。

## 7. 会话与维护

每次打开工作台都要求重新验证密码：登录页不自动跳转，服务端每次密码验证成功只发放一次首页进入许可。许可在打开工作台首页时消耗，再次打开或刷新首页都会返回登录页。正在使用的工作台内，上传、分析等 API 继续使用当前会话，不会每个请求都要求输入密码。

API 会话保存在认证服务内存中，上限为 8 小时；这个时长不会允许跳过下一次打开工作台时的密码验证。Cookie 使用 `Secure`、`HttpOnly`、`SameSite=Strict` 且仅作用于工作台主机。重启认证服务会让所有人重新登录；更改或删除账号的密码记录会让该账号旧会话失效。账号仍共享原 i3pro 数据空间。

更新旧版时必须同时替换：官网 `dist/`、登录页部署包、`auth_service.py` 和 Nginx locations。重启 `aurora-telemetry-auth`，通过 `nginx -t` 后重载 Nginx。检查登录成功后再次点击官网入口、另开工作台首页和刷新首页，均应重新显示登录表单。

登录提交按来源 IP 限制为每 10 分钟最多 10 次；同一出口 IP 的成员共享额度。部署在 CDN/额外代理之后时，须先按该代理的可信来源配置 Nginx real IP，不能信任任意客户端传入的 IP 请求头。

使用原 `htpasswd -B` 命令改密码后，应重新执行第 4 节的文件 ACL 设置，并用 `runuser` 检查读取权限，因为某些 htpasswd 更新方式会替换文件。

需要退出时，可在工作台同域页面的浏览器控制台执行：

```javascript
await fetch('/auth/logout', { method: 'POST' });
location.assign('/login');
```

当前没有修改上游 i3pro 界面以加入退出按钮。公共设备使用后应退出会话。

查看服务问题：

```bash
journalctl -u aurora-telemetry-auth -n 100 --no-pager
```

如果接入异常，恢复备份的 Nginx Basic Auth 配置，通过 `nginx -t` 后重载。确认旧认证已恢复后可停止新认证服务；无需改动 i3pro 数据。
