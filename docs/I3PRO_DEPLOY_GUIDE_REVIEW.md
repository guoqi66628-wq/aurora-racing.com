# I3PRO_DEPLOY_GUIDE 审阅意见

审阅日期：2026-10-13（Asia/Shanghai）。
审阅对象：`docs/I3PRO_DEPLOY_GUIDE.md`（2026-10-12 版）。
核对依据：上游仓库 `fyl66/i3pro` 固定提交 `9c333382` 的 `src/i3pro/server.py`、`src/i3pro/cli.py`，以及本项目 `src/components/Navbar.tsx` 的当前实现。

结论：文档整体判断可靠，第 1 节选择子域名而非子路径的理由经源码核对成立。有 1 项会导致证书签发或续期失败，必须修正；另有 5 项建议调整。下文按优先级列出。

## 必须修正

### 1. `location ^~ /` 会吞掉证书验证路径，导致无法签发或续期证书

第 8 节的 `location ^~ /` 把该站点所有请求都转发给 i3pro。宝塔申请和续期证书时，会把校验文件写入站点根目录的 `/.well-known/acme-challenge/` 下，依赖 Web 服务器从磁盘返回它。转发之后这个请求会到达 i3pro，而 `server.py` 的 `route()` 对未知路径返回 `404 {"error": "no such path"}`，校验因此失败。

第 8 节已注明"保留宝塔用于证书验证的专用路径"，但只有在宝塔确实生成了这样一条 location 时才成立。若宝塔仅依赖站点根目录的默认静态返回（常见情况），这条通道就会被 `^~ /` 覆盖。

修正方式是在同一个 server 块内补一条更长的前缀 location：

```nginx
location ^~ /.well-known/acme-challenge/ {
    root /www/wwwroot/telemetry.aurora-racing.com;   # 与宝塔站点根目录一致
    default_type text/plain;
    auth_basic off;
    allow all;
}
```

三点说明：

- 前缀 location 之间按匹配长度决定优先级，与书写顺序无关。这条比 `/` 长，因此一定先命中，不需要挪到文件更前面。
- `auth_basic off;` 是防御性写法。当前配置里 `auth_basic` 写在 `location ^~ /` 内部，不会外溢到这条 location，但显式写明可以避免以后有人把它提到 server 层。
- 首次签发和每次续期都会走这条路径，因此它是长期依赖，不是一次性配置。

## 建议调整

### 2. `proxy_cache off` 与响应缓冲不是一回事

第 8 节的说明写"保持请求缓冲开启"，同时配置里有 `proxy_cache off;`。这两者容易混淆：

| 指令 | 作用 | 默认值 | 当前是否需要 |
| --- | --- | --- | --- |
| `proxy_request_buffering` | 缓冲**上传**的请求体 | `on` | **必须保持 on**，理由见第 3 条 |
| `proxy_buffering` | 缓冲**上游返回**的响应 | `on` | 建议改为 `off`，理由见下 |
| `proxy_cache` | 缓存上游响应供后续复用 | `off` | 保持 off，但它是默认值，写出来容易误导 |

`proxy_cache off;` 是默认值，可以删除。它不影响响应缓冲，保留会让人以为缓冲已经关闭。

关于 `proxy_buffering`：`server.py` 的 `send()` 在导出时走 `response.path` 流式发送文件，并设置 `Content-Length`，页面据此绘制真实进度。响应缓冲开启时，nginx 会先把整个文件写入 `proxy_temp` 再转发给客户端，结果是客户端在接收完成前收不到任何字节，进度条会长时间停在 0% 然后突然完成；同时 200MB 级别的导出会在 `proxy_temp` 多产生一份完整副本，占用本应留给日志的 39GB 磁盘。

因此建议改为 `proxy_buffering off;`。代价是 nginx 无法在客户端较慢时提前释放上游连接，Python 端会有一个线程被占用到下载结束。当前定位是车队内部共享工作台、并发很低，这个代价可以接受。

### 3. `client_max_body_size 50m` 与 `MemoryMax=900M` 的匹配关系

`server.py` 的 `_read_body()` 使用 `self.rfile.read(length)`，一次性把整个请求体读入内存，之后才落盘暂存。也就是说上传 50MB 会在 Python 进程内瞬时占用约 50MB 的字节对象，再叠加解析峰值。结合 `--cache 1` 常驻的已解析场次，900M 上限的余量比看起来小。

建议先按 `client_max_body_size 20m` 起步，用一份真实日志实测 `MemoryCurrent` 峰值后再放宽。文档第 8 节已经正确指出"50m 不是内存占用估算"，这里补充的是它与 `MemoryMax` 之间的实际耦合。

### 4. 内存限制建议改为先软压制、再硬终止

`MemoryMax` 是硬限制，超过后由 cgroup 直接终止进程。在当前配置下的表现是服务消失、`Restart=on-failure` 重启、用户看到 502，而日志里往往只有一条 OOM 记录，不容易定位。

`MemoryHigh` 是软限制，超过后内核强制回收并压制进程（表现为变慢），不会立即终止。建议组合使用：

```ini
MemoryAccounting=true
MemoryHigh=800M
MemoryMax=1000M
MemorySwapMax=512M
```

先压制再终止，用户侧表现为"分析变慢"而不是"服务消失"，也更容易在监控里看出趋势。`MemorySwapMax` 建议显式设置并用 `systemctl show i3pro -p MemorySwapMax` 确认取值，不要依赖默认值。

配套前提是给服务器加 swap。1.8GB 总内存要同时承载宝塔面板、Nginx、i3pro，可能还有默认安装的 MySQL。从 39GB 磁盘中划出 2GB 做 swap 成本很低：

```bash
fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

建议同时把 `vm.swappiness` 降到 10 左右，避免正常运行时频繁换页。

### 5. 端口漂移无法从命令行关闭，应让它失败得更明显

`server.py` 的 `bind()` 会从 `--port` 起尝试后续最多 10 个端口；`cli.py` 的 `serve` 子命令**没有暴露**控制重试次数的参数（参数只有 `--data`、`--host`、`--port`、`--buckets`、`--cache`、`--open`、`--maths`、`--worksheets`）。因此 8731 被占用时，服务会静默监听 8732，systemd 显示 active，而 Nginx 固定转发 8731，用户看到 502。

文档第 6 节已经提醒要核对实际端口。可以再加一道自动检查，让漂移时直接失败而不是静默降级：

```ini
ExecStartPost=/bin/sh -c 'sleep 2; ss -lnt | grep -q ":8731 " || { echo "i3pro 未监听 8731（端口漂移）"; exit 1; }'
```

`ExecStartPost` 失败会使单元进入 failed 状态并触发重启，属于预期行为——Nginx 既然写死 8731，服务就不应该"成功"地跑在别的端口上。为避免无限重试，同时在 `[Unit]` 中加：

```ini
StartLimitIntervalSec=300
StartLimitBurst=5
```

这条值得加的原因是：`RestartSec=10` 与 systemd 默认的 10 秒统计窗口重叠后，重启不会触发默认的启动频率限制，服务会每 10 秒重试一次、无限持续下去。显式设置后，5 分钟内失败 5 次即停止，并停留在 failed 状态等待人工介入。

### 6. 服务器日志与磁盘预算

文档第 11 节规划了数据备份，但没有限制 systemd journal 的增长。长期运行的服务在 39GB 磁盘上需要给 journal 设上限：

```ini
# /etc/systemd/journald.conf
SystemMaxUse=200M
```

改完执行 `systemctl restart systemd-journald`。可用 `journalctl --disk-usage` 查看当前占用。

另外提一句 `CPUQuota=100%`（在 2 核机器上约等于 1 个核心）与 `proxy_read_timeout 300s` 之间存在取舍：限制 CPU 会让分析耗时接近翻倍，从而更容易触碰 300 秒上限。三者的关系建议在文档中写明，避免以后单独调整其中一项时产生意外。

## 已核对无误，不要改动

以下几处经源码核对确认正确，列出以便后续修改时避开：

1. **用子域名而非 `/telemetry/` 子路径**。`server.py` 的 `session_page()` 调用 `render.build_payload(..., api_base="/api")`，路由也按 `parts[0] == "api"`、`parts[0] == "session"` 解析，全部是根路径绝对引用。挂到子目录必然 404。第 1 节的理由成立。
2. **不需要任何 WebSocket 配置**。`server.py` 是纯标准库 `http.server` + `ThreadingHTTPServer`，全文件没有 WebSocket、SSE 或长轮询代码，页面通过普通 GET 返回完整 HTML。不要往配置里加 `map $http_upgrade` 那一套，它解决的不是这里的问题。
3. **`proxy_set_header Connection "";`**。当前没有 `upstream` 块，nginx 不会复用上游连接，这行实际不起作用，但也不会造成任何问题，可以保留。
4. **`proxy_request_buffering on` 必须保持开启**。这是本配置里最容易被"优化"掉的一项：`server.py` 的 `_content_length()` 依赖请求头里的 `Content-Length` 判断上传体积。关闭请求缓冲后，nginx 会改用 chunked 方式向上游转发，`_content_length()` 会返回 0，上传会被当成空内容处理。第 8 节的判断正确，原因比文档写的更硬。
5. **`htpasswd -cB`**。`-B` 使用 bcrypt 哈希，正确；首次使用 `-c` 创建、后续加账号不带 `-c`，文档已写明。
6. **三个线程数环境变量**。`pandas`、`numpy` 在 2 核机器上默认会展开多线程，将它们限制为 1 能避免与其他服务抢 CPU，设置正确。
7. **部署顺序**。先以 127.0.0.1 启动服务、再加密码保护、最后才开反向代理，中间态不可能被公网访问。第 3 节"新子域名初始页面暂时不要放入分析数据"与此一致。
8. **`--maths` 与 `--worksheets` 传 `/srv/i3pro`**。`cli.py` 中这两个参数是根目录，程序读取 `<root>/maths/global.json` 与 `<root>/worksheets/*.json`。第 5 节已把两个目录复制到 `/srv/i3pro/` 下，路径自洽。
9. **`--cache 1` 的语义**。对应 `cache_size`，含义是"内存中保留的已解析场次数量"，第 6 节的表格解释准确（不是用户数限制，也不是内存上限）。
10. **Navbar 代码片段**。已与 `src/components/Navbar.tsx` 当前实现比对：片段的 className 与第 209 行、第 333 行 NAV_ITEMS 渲染用的类名一致；用独立 `<a>` 而不调用 `handleNavClick` 也是对的，该函数会把未识别的 target 映射回首页。

## 文档自身的一致性

### 第 4 节的 Python 解释器需要与第 2 节对齐

第 2 节要求"如果系统 Python 过旧，使用独立安装且版本满足要求的 Python 创建虚拟环境"，但第 4 节直接执行 `python3 -m venv .venv`。如果系统 Python 是 3.9，这里会建出 3.9 的环境，之后所有 `.venv/bin/python` 都不满足 ≥3.10 的要求，错误会推迟到导入依赖时才暴露。

建议把第 4 节改为引用第 2 节确认过的解释器路径，例如：

```bash
/usr/bin/python3.11 -m venv /opt/i3pro/.venv
```

### 第 5 节的两条 cp 依赖上游目录实际存在

```bash
cp -r /opt/i3pro/worksheets /srv/i3pro/
cp -r /opt/i3pro/maths /srv/i3pro/
cp -r /opt/i3pro/i2pro_data/dbc /srv/i3pro/data/
```

这三条在克隆完成、`git checkout` 之后执行。建议在执行前加一步确认：

```bash
ls /opt/i3pro/worksheets /opt/i3pro/maths /opt/i3pro/i2pro_data
```

若 `i2pro_data/dbc` 在固定提交中不存在或为空，后面 CAN 解码会缺少 DBC，而错误会在导入数据时才出现。先确认目录再复制，比事后排查省事。

## 可选加固

以下不是必须项，按需要决定：

- **防止被内嵌**：在站点 server 块内加 `add_header X-Frame-Options DENY always;`，避免工作台被其他页面以 iframe 嵌套。
- **跨站请求的说明**：HTTP Basic 认证在浏览器缓存凭据后会自动随请求发送，i3pro 本身没有 CSRF 令牌。理论上第三方页面可以触发状态变更请求（响应会被浏览器同源策略挡住，但副作用已经发生）。考虑到这是车队内部工具、地址不外发，风险可接受，但值得在文档里作为已知边界写一句，而不是留作隐含前提。
- **CDN 与源站地址**：官网 `public/` 资源走 CDN，如果主域名已通过 CDN 隐藏源站 IP，那么新增 `telemetry` 的 A 记录直连服务器会重新暴露源站 IP。如果主域名本身就直连服务器，则无新增暴露。
- **多账号与权限**：文档已说明第一版共享数据空间、无只读/编辑角色。后续如果需要按人隔离，属于功能改造而非部署配置，届时 `auth_basic` 需要替换为应用层认证。

## 上线前建议补充的验证

沿用第 10 节的验收清单，以下三项与本次审阅直接相关，建议加入：

- [ ] `curl -I https://telemetry.aurora-racing.com/.well-known/acme-challenge/测试串` 返回 404 而不是 401，且响应头不含代理特征，确认该路径未被 `^~ /` 接管。
- [ ] 续期演练：`certbot renew --dry-run`（或宝塔面板的续期测试）通过，确认第 1 条的修正有效。
- [ ] 上传一份接近上限的文件，同时用 `systemctl show i3pro -p MemoryCurrent -p MemoryPeak` 观察峰值，据此确定 `client_max_body_size` 与内存限制的最终取值。
