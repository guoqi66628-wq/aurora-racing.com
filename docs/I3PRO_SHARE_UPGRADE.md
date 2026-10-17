# 工作台优化：第一步，分享链接登录后返回

**2026-10-15 更新：本文下方是旧方案与排障记录，不再按其中旧 Lua 步骤部署。当前执行 [分享页面代理升级](I3PRO_SHARE_PROXY_SETUP.md)。** 用户已确认 576 MiB 低内存补丁重启后可以打开此前被拒绝的场次；本轮准备仅替换分享页面入口的实现，待服务器部署验收。

最新反馈：分享代理已部署成功。用户明确取消退出按钮，最多三人共享账号；后续改为 [三人共享与定期清理](I3PRO_RETENTION_SETUP.md)。下方旧阶段计划不再要求实现退出按钮。

更新时间：2026-10-14。全队继续共用现有 htpasswd 账号和数据空间。

## 线上故障：先恢复稳定性

2026-10-14 用户部署后提供的内核日志显示两个问题，不能归为同一种故障：

- 16:18:13，`i3pro.service` 发生 `CONSTRAINT_MEMCG` OOM。内存 usage/limit 均为 921600 kB（900 MiB），当时 memory+swap 使用约 1.58 GiB。用户导入的是约 100 MB CSV。之后采样显示物理内存总量 1.8 GiB、available 369 MiB，1 GiB swap 已用约 917 MiB。不能凭文件体积估算解析内存，也不能直接取消内存上限。
- 16:16～16:22，多次 Nginx `segfault` / `general protection fault`，部分发生在 OOM 之前。该故障可能解释空响应；具体触发模块尚未确定，不能把增加内存当成已验证修复。

**以下升级步骤暂不继续推进。** 先在宝塔备份当前配置，撤回本轮新增的 `location = /_telemetry_page` 和 `location /session/` 两个完整块，保留原有认证与代理规则，执行 `nginx -t` 通过后重载。这样场次访问重新经过原 `location /` 的认证，分享未登录可能恢复为 401，不能删除原认证来放行。此回退是隔离验证，不保证消除全部 Nginx 崩溃。

关闭分析页面、停止提交大文件后，可重启 i3pro 释放当前进程持有的内存；这会中断分析/导入任务并清空内存缓存，不删除持久化数据。先用小文件验证原工作台访问、观察新的内核日志，再确定后续修复。不要执行 swapoff 清空交换空间，也不要再次叠加上传内存压力。退出按钮和 15 天清理仍待后续实施。

## 当前进度

当前下一步是 [低内存补丁试运行](I3PRO_LOWMEM_SETUP.md)，先完成其中第 1 节上传/校验。用户已确认固定提交和原始源码未修改；停止服务后 available 恢复约 1.3 GiB。本地适配器已有合成数据验证，但真实服务器文件与 Nginx 稳定性仍待验收。下方 1100M 是故障排查历史，不应重复执行增限测试。

后续进展：旧版补丁已安装，服务器测试 14 项通过、列表 HTTP 200；分析后的内存采样约 521 MiB、NRestarts=0、同期内核无新条目。另一个 123,300 行 × 557 列的场次被 512 MiB 容量保护拒绝（实际矩阵约 524 MiB）。现已准备 576 MiB 版及同规模合成验证，当前应执行低内存文档顶部的“已安装 512 MiB 版的更新步骤”，无需重复创建服务配置。对用户清单中更大的 CSV 和原有 Nginx 崩溃仍不能宣布已解决。

### 16:34 的再次 OOM 与临时测试

回退后用户日志仍显示 16:34:43 i3pro 内存 usage/limit 都为 921600 kB，memory+swap 1644512 kB。随后系统 available 536 MiB、swap 剩余 458 MiB。提供的有限日志片段不足以证明 Nginx 崩溃已彻底解决。

下一步建议单人单场次做一次可回退测试：关闭分析页面，临时将 i3pro 的 `MemoryMax` 从 900M 调到 1100M，重启释放旧状态，再打开已有场次一次。不直接取消限制、不重复导入大文件、不改永久 service 文件，也不改 swap。此数值是基于当前余量的试验预算，不保证足以处理所有 100 MB CSV。以下命令需由用户在服务器执行，助手尚未执行：

```bash
systemctl set-property --runtime i3pro.service MemoryMax=1100M && systemctl restart i3pro
systemctl show i3pro -p ActiveState -p MemoryMax -p MemoryCurrent -p NRestarts
```

目标 MemoryMax 为 1153433600 字节；`--runtime` 调整在服务器重启后消失（[systemd 官方说明](https://github.com/systemd/systemd/blob/v239/man/systemctl.xml)）。若再次 OOM、系统明显卡顿或 available 持续低于 200 MiB，停止该测试；不要继续逐次提高上限。回退时先停止任务释放内存，再降低限制，避免对正在使用超过 900M 的进程直接降限：

```bash
systemctl stop i3pro && systemctl set-property --runtime i3pro.service MemoryMax=900M && systemctl start i3pro
```

后续需按实际解析峰值决定程序优化、离线预处理或服务器扩容。仅通过这一轮也不意味着分享回退、Nginx 稳定性或多人并发已验收。

### 1100M 测试停止条件已触发

用户在 16:39 提供的结果：`MemoryCurrent=1153302528`、`MemoryMax=1153433600`（距上限仅 128 KiB），整机 available 164 MiB，swap 使用 709 MiB。`NRestarts=0` 仅代表该阶段尚未自动重启，不等于负载稳定。已建议关闭所有分析页并停止 i3pro，停止上调限制；停止后可将临时 MemoryMax 恢复到 900M，诊断期间不自动启动，不删除持久化数据。

只读核对指南固定提交源码发现：`txtlog.read_frame` 整表调用 pandas.read_csv；`csvlog.session_from_frame` 按列生成数值数组及有效时间行筛选副本；`SessionLibrary.listing` 在缓存失效时遍历 summary，而 summary 会加载场次。`get` 在读取新场次后才淘汰旧缓存。以上均为潜在峰值来源，尚未用用户 CSV 量测各处占比。更改前需核实服务器 HEAD、工作区差异及实际启动文件，不能直接覆盖用户可能已改过的分析器源码。

- 第一阶段：本地已实现分享页面认证、登录后返回原场次、保留 channels/layout 参数；待用户部署及服务器验收。
- 第二阶段：待加入工作台退出按钮。已有退出接口只撤销当前浏览器会话，不影响另一台设备。
- 第三阶段：待核对上游文件关联和运行中的上传/分析任务，再实现自动清理、过期提示。计划每 15 天执行一次，仅清理上传超过 15 天的场次（通常保留约 15～30 天，活动场次可能更久）。本次没有启用清理，也没有删除任何线上数据。

## 第一阶段的行为

- 官网 `/login` 仍每次要求密码；根路径 `/` 仍使用一次性进入许可。
- `/session/<场次>?channels=...&layout=...` 无有效进入许可时跳到 `/login?next=...`。
- 正确密码获得一次进入许可，登录页仅允许返回本站根路径或单个场次页面；外站、API、登录页循环和异常路径均返回根路径。
- 已认证浏览器在工作台内部点击场次链接时继续使用当前会话；浏览器必须提供工作台来源和 `Sec-Fetch-Site: same-origin`。从外部聊天、书签、地址栏进入或缺少这些信息时需重新登录。
- 导航来源只用于判断是否显示登录表单，不作为身份凭据。后端始终验证 Cookie；未登录 API 仍返回 401。它不是按标签页隔离的身份系统。站内场次页面的刷新可能继续使用当前会话；根路径刷新仍需登录。
- 登录会话仍有效 8 小时；在同一浏览器重新登录会替换当前 Cookie；不同设备登录互不踢出。
- 本次保留 HTTPS、HTTP/1.1 和现有 256 MB 上传限制。

## 操作顺序

先通过宝塔备份现有登录页面、`/opt/aurora-telemetry-auth/auth_service.py` 和工作台 Nginx 配置（包括伪静态配置）。

### 1. 更新认证服务

将 `build/telemetry-server.zip` 上传到 `/opt/aurora-telemetry-auth/` 并解压覆盖。文件应直接位于该目录，不能多套一层目录。本轮只需替换 Python 代码和测试，不需要重新安装 service、创建账号或改密码。

在服务器执行：

```bash
cd /opt/aurora-telemetry-auth
PYTHONDONTWRITEBYTECODE=1 /usr/bin/python3.11 -m unittest -v test_auth_service && systemctl restart aurora-telemetry-auth
```

测试应有 15 项；服务器应全部通过。重启认证服务会要求现有使用者重新登录，但不会删除分析数据。

### 2. 更新登录页

将 `build/telemetry-login.zip` 解压到 `/srv/i3pro-login/`，覆盖 HTML 和 assets。确认是：

```text
/srv/i3pro-login/telemetry-login.html
/srv/i3pro-login/assets/...
```

本次无需更新官网 dist，也无需重新上传 CDN 图片。

### 3. 增加两个 location

打开 `deploy/telemetry/nginx-share-locations.conf`，把其全文粘贴到宝塔工作台站点配置的 `server { ... }` 内，可放在 `access_log` 前。这是新增的两个 location；不替换现有 `/`、`/login` 或 `/auth/` 配置。若已经粘贴过，更新同名块而不是重复添加。

注意：`nginx-locations.conf` 是完整 location 集合，`telemetry.aurora-racing.com.conf` 是完整站点配置，`nginx-share-locations.conf` 才是本轮增量片段。三者不要叠加粘贴。

保持 `http2 off;`、`http3 off;`，不要恢复 QUIC 监听。

保存后执行：

```bash
/www/server/nginx/sbin/nginx -t && /www/server/nginx/sbin/nginx -s reload
```

### 4. 验收

1. 在无痕窗口打开队友分享的原始链接，应显示品牌登录页，不显示 401。
2. 输入错误密码应留在登录页；正确密码应回到原场次。核对地址中的 channels/layout 和实际通道、布局。
3. 在工作台内部点击场次应连续使用；复制链接到地址栏或另一个浏览器打开应要求登录。
4. 两台设备使用同一账号登录，均应可分析；确认上传和分析正常。
5. 未登录访问 `/api/sessions` 仍返回 401。

本地验证：认证测试 14 项通过、1 项因本机没有 htpasswd 跳过（服务器应运行全部 15 项）；返回地址测试 2 项通过；TypeScript 检查和生产构建通过；服务部署包 6 个文件均与源码一致。全站 CDN 检查仍有 37 个连接失败，本轮不更新官网；单独通过 curl 复核登录页背景图、Logo 和字体 CSS 均返回 200。完整 Nginx 配置仍需服务器 `nginx -t`；本地测试不代替真实浏览器中的分享流程验收。

出现问题时，先恢复备份的 Nginx 配置并检查重载，再恢复登录页面和 Python 文件、重启认证服务。任何回滚都不涉及 i3pro 数据目录。
