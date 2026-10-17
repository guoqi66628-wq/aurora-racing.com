# 分享链接修复：场次页面直接经过认证服务

日期：2026-10-15。适用于已安装现有品牌登录页、共享账号认证服务与低内存分析器的服务器。本次是本地已验证、线上待部署的增量更新。

后续状态：用户已完成部署并反馈分享成功。用户取消退出按钮，预期最多三人共用账号。当前继续 [三人共享与 15 天清理](I3PRO_RETENTION_SETUP.md)，本页下方操作保留作部署记录。

## 为什么换实现

之前新增的 `/session/` 使用 Lua 子请求检查，部署期间 Nginx 内核日志出现原生崩溃，触发原因仍未确定，不能宣称内存补丁解决了该故障。本次新增分享入口不调用 Lua：Nginx 将 `/session/...` 原路径交给现有的 8732 认证服务，它校验 Cookie/进入许可后，从固定的 `127.0.0.1:8731` 分块读取场次页面。

官网入口、根页面和 API 的原认证路径保持兼容；它们仍使用原来的 Lua 检查，因此这次不能声称完全移除了 Lua 或保证 Nginx 不再崩溃。HTTP/2、HTTP/3 继续关闭，不恢复 QUIC。

无需重建账号、修改密码、重新上传数据或再次改动 i3pro 的启动配置。当前 576 MiB 低内存补丁用户已反馈重启后可以打开此前被拒绝的场次；更大 CSV 与多人负载仍需分别验证。

## 访问规则

- 未登录的分享链接返回 302 到 `/login?next=...`，完整保留原路径和查询参数（含中文场次名、channels、layout 和加号）。
- 密码正确后，现有登录页面返回原场次；从外部重新进入需要新的密码检查。站内跳转允许有效 Cookie 配合浏览器的同源导航元信息继续使用；元信息不是身份凭据。
- 一个共享账号可在多台设备各自登录，退出一台设备不会撤销其他设备会话。刷新站内场次页面可能继续使用已有会话，不能理解为“每次 HTTP 请求都重新输入密码”。
- API 仍受原认证保护，匿名 API 返回 401；上传和导出不通过新增的页面转发路径。
- 页面仅代理 GET/HEAD，固定访问本机分析器，不接收客户端指定的上游。账号 Cookie、Authorization 不传给分析器，上游 Cookie 不传回浏览器。
- 最多同时转发 4 个页面，每次读取 64 KiB；繁忙返回 503、分析器不可用返回 502。它不把整份页面攒在认证进程内存中。保留认证服务 96M 内存限制。

## 第一步：更新认证服务（当前先执行这里）

先备份现有目录：

```bash
tar -czf /opt/aurora-telemetry-auth-before-share-$(date +%Y%m%d-%H%M%S).tar.gz -C /opt aurora-telemetry-auth
```

将 `build/telemetry-share-proxy.zip` 上传、解压覆盖到 `/opt/aurora-telemetry-auth/`，文件不要多套一层目录。包内只有 `auth_service.py`、`test_auth_service.py`、`nginx-share-proxy.conf` 和本文档；不包含账号文件、systemd 服务或 Nginx 全站配置。

执行：

```bash
cd /opt/aurora-telemetry-auth && \
/usr/bin/python3.11 -B -m unittest -v test_auth_service && \
systemctl restart aurora-telemetry-auth
```

服务器应有 25 项测试全部通过。重启会清除旧登录会话，队员需要重新登录；分析数据不受影响。只上传文件不重启不会更新正在运行的代码。

接着只测试本机的新入口（此时公网分享路径尚未改变）：

```bash
curl --retry 5 --retry-connrefused --retry-delay 1 --max-time 15 -sS -D - -o /dev/null \
  'http://127.0.0.1:8732/session/check?channels=A%2CB&layout=abc%3D'
systemctl status aurora-telemetry-auth --no-pager -l
```

预期 `HTTP/1.0 302 Found` 和 `Location: /login?next=%2Fsession%2Fcheck...`；这里故意使用不存在的场次名，匿名请求必须先跳登录，不能访问分析器。返回 404 通常说明旧进程仍在运行或上传路径不正确。先将输出发回核对，再做第二步。

## 第二步：替换一个 Nginx location

先在宝塔备份工作台站点当前的完整配置。打开包内的 `nginx-share-proxy.conf`，全文放到工作台站点的 `server { ... }` 内：

- 如果有旧的 `location /session/ { ... }`，用新块整体替换，不能重复添加。
- 如果仍有旧的 `location = /_telemetry_page { ... }`，删除这个完整块；新方案不使用它。
- 若此前已撤回这两个块，只添加新 `/session/` 块。
- 不改 `/`、`/auth/`、登录页、证书、ACME、网站根目录等现有配置。不恢复 HTTP/2、HTTP/3 或 Alt-Svc 协议广告。

本步使用 `nginx-share-proxy.conf`，不要再从旧聊天复制 Lua 片段，不需要替换全站 Nginx 配置。

```bash
/www/server/nginx/sbin/nginx -t && /www/server/nginx/sbin/nginx -s reload
```

仅语法检查通过才重载。没有在本地运行用户的 Baota Nginx，因此必须在服务器执行这一步。

## 第三步：实际验收

1. 无痕窗口打开队员分享的完整链接，应显示现有品牌登录页。
2. 错误密码留在登录页；正确密码返回原场次，核对通道和布局。现有登录页必须是已经包含 `next` 返回逻辑的版本；若仍回列表，先核对其版本。
3. 从场次列表点击场次应正常进入；从外部重新打开分享链接应要求登录。两台设备使用共享账号各自验证，检查互不踢出。
4. 验证匿名数据 API 仍为 401：

   ```bash
   curl --http1.1 --max-time 15 -sS -o /dev/null -w 'HTTP %{http_code}\n' \
     https://telemetry.aurora-racing.com/api/sessions
   ```

5. 单人测试已有场次后观察资源和新日志，避免同时叠加大文件导入：

   ```bash
   systemctl show i3pro aurora-telemetry-auth -p Id -p ActiveState -p MemoryCurrent -p MemoryMax -p NRestarts
   free -h
   journalctl -k --since '5 minutes ago' -n 40 --no-pager
   ```

若仍出现 Nginx 崩溃、空响应或异常资源增长，先恢复第 2 步备份的 Nginx 配置，通过 `nginx -t` 后重载，再诊断。不能通过关闭认证来临时放行数据。

## 回退与验证范围

回退顺序：先恢复旧 Nginx 配置并检查重载，再从第 1 步备份恢复 `auth_service.py`/测试文件，重启认证服务。当前旧配置仍可使用新版服务的 `/auth/check*` 接口，因此不用在 Nginx 尚指向新入口时先降级服务。任何回退都不涉及 `/srv/i3pro/data`。

本地：25 项 HTTP 认证/页面代理测试中 24 项通过，真实 htpasswd 测试因 Windows 未安装该工具跳过；服务器必须全跑。覆盖匿名重定向、参数完整性、账号验证、过期/伪造/撤销 Cookie、站内导航、共享账号多设备、固定上游、凭据过滤、HEAD、繁忙响应和有界读取。登录返回地址测试 2 项通过。

另已接入固定提交的真实 i3pro 加 576 MiB 适配器，使用临时合成中文名 CSV 验证“匿名分享 → 登录接口 → 原场次 HTML（361,194 字节）→ 再次外部进入要求登录，API 会话保留”；此项密码验证器为模拟返回，不使用线上密码。真实 Nginx、生产文件、真实浏览器登录后的整条链路仍须按上文验收。

实现参考：[Nginx proxy_pass 文档](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass)（不带 URI 的转发保留原请求 URI）、[Python 3.11 HTTPResponse.read 文档](https://docs.python.org/3.11/library/http.client.html#http.client.HTTPResponse.read)（按指定大小读取）。

退出按钮已按用户要求取消；15 天清理改由独立更新包实现，本包不包含自动删除。
