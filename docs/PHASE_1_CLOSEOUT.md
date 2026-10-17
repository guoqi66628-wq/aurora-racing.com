# 第一阶段收尾记录

记录日期：2026-10-15（Asia/Shanghai）。项目：Aurora Racing 官网及车队遥测工作台。

本阶段完成官网进入工作台、品牌登录、共享链接回跳、低内存分析、三人共用账号和定期清理的落地。用户在逐步部署后确认使用正常。本记录汇总当前状态，不要求重新执行安装流程。

## 1. 已完成的交付

| 项目 | 当前结果 |
| --- | --- |
| 官网入口 | 桌面导航最右侧、移动端汉堡菜单展开后的底部提供工作台入口 |
| 登录界面 | 延续官网黑白、极光紫和赛车视觉；独立登录页面与资源打包 |
| 账号 | 沿用已有 htpasswd 账号密码，全队共用；不新增退出登录按钮 |
| 多人使用 | 每台设备独立会话，不互相挤下线；用户确认最多三人使用的验收无问题 |
| 分享链接 | 未认证时跳转登录，认证后返回原场次并保留中文路径、channels、layout 等参数；用户确认成功 |
| 大 CSV | 分块读取、磁盘映射、避免重复矩阵复制，单场次缓存和串行处理；已恢复此前被拒绝的场次 |
| 定期清理 | 使用保护已启用，定时器已排期；首次只检查，不立即删除现有文件 |

官网仍以 React/Vite 静态展示为主体。认证服务和分析器独立运行在服务器，不把共享账号密码写入前端。

## 2. 实际访问与共享规则

- 工作台域名：`https://telemetry.aurora-racing.com`；官网：`https://aurora-racing.com`。
- 从外部重新进入工作台或分享场次需要新的密码检查；已有有效会话的站内导航、刷新和 API 请求可以继续使用。并非每个 HTTP 请求都重新输入密码。
- 会话有效期为 8 小时；三台设备各自保存 Cookie。认证服务重启会丢失内存中的会话，需要重新登录。
- 数据保存在公共目录，登录后全队共享，不按个人账号隔离。共享场次配置、注释等仍可能被后写入的内容覆盖，同一场次建议由一人修改共享设置。
- 三人可以同时打开页面；分析器一次处理一个请求，最多容纳 8 个处理中或等待的请求，等待上限 30 秒，繁忙返回 503。三人正常使用验收不等于三份大文件同时解析的性能保证。
- `/session/` 由认证服务校验后代理到本机分析器；根页面/API 仍保留现有 Lua 认证检查。不能据此宣称所有 Lua 依赖已移除。

## 3. 线上维护基线

以下来自本阶段用户贴出的服务器输出及部署步骤，不是本次收尾重新登录服务器采集的快照。

| 项目 | 基线 |
| --- | --- |
| 服务器资源 | 约 1.8 GiB 内存、1 GiB Swap、40 GB 系统盘；当时可用磁盘约 28 GB，随使用变化 |
| 分析器源码 | `/opt/i3pro`，固定提交 `9c333382e720c65a644c8652885bc822fcecbedc` |
| 分析器 Python | `/opt/i3pro/.venv/bin/python` |
| 分析器服务 | `i3pro.service`，用户/组均为 `i3pro`，监听 `127.0.0.1:8731` |
| 当前启动文件 | `/opt/aurora-i3pro-lowmem/run_service_lowmem.py` |
| 内存上限 | `MemoryMax=943718400`（900 MiB） |
| 原始启动文件 | `/opt/i3pro/run_service.py`，保留作回退参考 |
| 认证服务 | `aurora-telemetry-auth.service`，`/opt/aurora-telemetry-auth/auth_service.py`，监听 `127.0.0.1:8732` |
| 密码文件 | `/etc/i3pro-auth/htpasswd`；本仓库和记录不保存密码内容 |
| 登录静态文件 | `/srv/i3pro-login/telemetry-login.html` 及 `assets/` |
| 上传数据 | `/srv/i3pro/data` |
| 全局配置根目录 | `/srv/i3pro`（maths、worksheets 等） |
| 低内存配置 | `/etc/systemd/system/i3pro.service.d/aurora-lowmem.conf` |
| 清理集成配置 | `/etc/systemd/system/i3pro.service.d/aurora-retention.conf`，`AURORA_RETENTION=1` |
| 清理服务/定时器 | `aurora-i3pro-cleanup.service` / `aurora-i3pro-cleanup.timer` |
| 清理状态/锁 | `/srv/i3pro/.aurora-retention.json` / `.aurora-retention.lock` |

宝塔 Nginx 曾发生原生崩溃，确切触发原因未确定。本阶段沿用已验证可用的配置，HTTP/2、HTTP/3/QUIC 保持关闭；不要仅依据早期全站模板重新覆盖现有配置。

内存曾触及 cgroup 限制导致分析器被杀。现有适配器的数值矩阵上限为 576 MiB、行数上限为 200 万；文件文本大小不等于展开后内存大小。超过 8 MiB 的 CSV/TXT 数据区要求数值或空值，时间需为相对秒；不是通用大 Excel 解析方案。适配器验证固定版本源码哈希，上游升级前必须重新评估，不能直接拉取最新版替换。

## 4. 定期清理的准确含义

1. 每天北京时间 03:30 检查，加最多 5 分钟随机延迟；距离上次成功清理至少 15 天才允许下一轮。
2. 只处理登记后已满 15 天的合格文件组。初始化给现有文件完整的新保留期；新上传或替换主文件重新计时。通常实际保留约 15～31 天，持续使用时可能更久。
3. 页面每分钟发送活动信号，最近 15 分钟有活动则延后整轮清理。分析、上传、下载等请求与清理共用跨进程锁。
4. 后台标签页被系统冻结、断网或会话过期可能中断活动信号，不能保证一个长期闲置的标签页永远阻止清理。
5. 仅清理 `/srv/i3pro/data` 顶层已登记的支持格式及同名已知关联文件。子目录、全局配置、DBC、孤立关联文件、链接文件和关联不明确的 CAN 文件保留。
6. 删除不经过回收站，对应分享链接将无法再读取原场次。需长期保存的原始文件由队员在本地保留。
7. 状态损坏、锁忙或无法核实分析器集成时不执行删除。不要手动删除运行中的锁文件。

已收到的部署证据：

```text
维护接口：retention=1, pid=3842799, root=/srv/i3pro/data
只读预览：dry_run=true, skip_reason=not_due, deleted_files=0
定时器 NEXT：Fri 2026-10-16 03:32:16 CST
定时器 LAST：n/a（尚未首次执行）
```

PID 和下一次执行时间是当时的快照，不是固定配置。第一轮实际删除尚未发生，后续应检查执行日志，而非把“定时器已启用”视作长期运行已经验证。

## 5. 验证记录与限制

2026-10-15 本次收尾重新执行：

| 检查 | 结果 |
| --- | --- |
| `npm run lint` | 通过（TypeScript 静态检查） |
| `node scripts/test-telemetry-return.mjs` | 2 项通过 |
| `node scripts/test-telemetry-activity.mjs` | 5 项通过 |
| `test_lowmem` + `test_retention` | 28 项通过，删除测试仅操作临时测试目录 |
| `test_auth_service` | 24 项通过，1 项因本地 Windows 未安装真实 htpasswd 跳过 |

服务器侧已经完成认证、数据打开、分享返回和三人共用的用户验收。此前核心认证测试在服务器上通过真实 htpasswd 校验。本地测试不能替代所有格式、长时间负载或首轮线上清理验证。

历史合成压测摘要保存在 [256 列结果](phase1-evidence/lowmem-256-columns.json) 和 [557 列结果](phase1-evidence/lowmem-557-columns.json)。557 列、123,300 行、524 MiB 数值矩阵案例中，Windows 工作集峰值从 1162.2 MiB 降至 621.5 MiB，数值及页面哈希一致。这些是合成数据测量，不能作为 Linux cgroup 峰值保证。

此前完整上游回归在原版和适配版都存在相同的 Windows/缺失真实样本失败及跳过，未声称全量上游测试通过。当前收尾仅清理与记录，没有修改业务代码，没有重新发布官网或服务器，也没有重新做浏览器视觉验收。

## 6. 本地清理记录

本次仅清理本地项目，共删除 **90 个文件、364,978,629 字节（约 348.07 MiB）**。逐项清单见 [cleanup-manifest.json](phase1-evidence/cleanup-manifest.json)。

- 删除两批合成压测 CSV、生成页面及临时输出；保留小型 JSON 测量摘要。
- 删除重复解压的登录、认证、分享、低内存和清理部署目录，以及已被固定版本源码替代的零散参考 Python 文件。
- 删除旧 512 MiB 低内存压缩包 `build/i3pro-lowmem.zip`；保留 576 MiB 回退归档和当前清理升级包。
- 删除 `.glass-shots/` 调参截图、根目录旧 `dist.zip` / `dist.tar.gz` 和两份过期本地 Lighthouse 完整报告；历史性能评分摘要见 [lighthouse-summary.json](phase1-evidence/lighthouse-summary.json)。它们不是当前线上性能评分。
- `.gitignore` 补充旧构建压缩包、根目录 Lighthouse 原始报告和 Python 缓存规则。

保留源码、静态资源、测试、正式调试 HTML、专项文档、依赖目录、当前 `dist/`、已交付部署压缩包、固定版本 i3pro 参考源码及上游回归日志。保留 `.env.deploy` 等本地环境配置，未读取或记录其中的密钥。没有清理服务器数据、备份、日志或服务文件。

`dist.zip`、`dist.tar.gz` 和两份 Lighthouse 报告原先受 Git 跟踪，本轮删除会显示为待提交删除；历史版本仍可从 Git 查找。原有未提交的 Navbar、Specs、liquidGlass、构建配置等改动保留，本次没有自动提交或推送。

`build/` 被 Git 忽略，其保留归档只存在于当前工作区，不应视作异机备份。部署源码以 `deploy/` 和 `src/` 为维护入口。

## 7. 后续维护入口

优先参考：

- [三人共享与 15 天清理](I3PRO_RETENTION_SETUP.md)：当前运行策略、服务安装、停用与回退。
- [分享代理配置](I3PRO_SHARE_PROXY_SETUP.md)：当前 `/session/` 的认证代理路径。
- [低内存部署说明](I3PRO_LOWMEM_SETUP.md)：内存问题背景、576 MiB 更新与回退。部分测试数量为当时版本，以本记录为当前汇总。
- [登录部署说明](I3PRO_LOGIN_SETUP.md)：账号文件、登录静态文件和基础认证说明。
- [初始部署指南](I3PRO_DEPLOY_GUIDE.md)、[早期分享升级](I3PRO_SHARE_UPGRADE.md)：历史背景，不能覆盖后续增量配置。

常用只读检查（服务器执行）：

```bash
systemctl show i3pro -p ActiveState -p MemoryCurrent -p MemoryMax -p NRestarts
systemctl status aurora-telemetry-auth --no-pager
systemctl list-timers --all aurora-i3pro-cleanup.timer
journalctl -u aurora-i3pro-cleanup.service -n 30 --no-pager
df -h /srv/i3pro /tmp
runuser -u i3pro -- /opt/i3pro/.venv/bin/python -B \
  /opt/aurora-i3pro-lowmem/retention.py --dry-run
```

需要暂停自动删除时，仅停止定时器及可能正在运行的清理服务，不删除状态文件：

```bash
systemctl disable --now aurora-i3pro-cleanup.timer
systemctl stop aurora-i3pro-cleanup.service
```

重新生成交付物（本地，按需执行；不会发布）：

```bash
npm run build
npm run package:telemetry
python scripts/package-telemetry-share.py
python scripts/package-i3pro-retention.py
```

登录打包命令生成 `build/telemetry-login/` 目录；两个 Python 命令分别生成分享、清理升级 ZIP。旧 `telemetry-server.zip` 属于基础部署归档，不能直接覆盖现有认证服务当作最新更新。

## 8. 后续观察事项

- 首次定时检查和首轮到期清理后查看日志，确认跳过原因、删除结果和磁盘空间变化。
- 三人交替切换不同大场次时观察等待、503 和内存，不在当前服务器上盲目增大矩阵限额或并行解析数。
- 出现新格式、超大文件或 Nginx 再次异常时保留脱敏日志，分别定位，避免把所有断连都归因于账号。
- 需要个人权限、编辑冲突管理、长期归档或更多并发时另开下一阶段；本阶段保持共用账号和轻量运维。
