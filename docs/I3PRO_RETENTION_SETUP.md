# 三人共享工作台与 15 天清理

更新：2026-10-15。用户已确认分享链接成功，取消退出按钮，预期同时使用不超过三人。本包不添加退出按钮或其他可见 UI。

## 当前并发策略

一个 htpasswd 账号可同时在三台设备登录；每个浏览器有独立 Cookie，不做单设备互踢，也不硬性限制三个人。现有认证代码无需再次部署。八小时登录有效期和每次从外部进入要求密码的规则继续保留。

登录并发不等于分析并发：同一时刻只处理一个分析请求，最多容纳八个正在处理/等待的请求，等待最多 30 秒；繁忙返回 503。三个用户可同时打开页面和操作，但大文件解析/切换会排队。保留一份场次缓存、576 MiB 数值表容量和 900M 服务内存限制，不能承诺三个人交替分析大型不同场次时都流畅。

上传的数据与场次设置全队共享，不按人隔离。不同设备的显示范围、通道选择通常由各自页面/分享链接决定；同一场次的注释、圈段或其他服务端配置若被同时修改，仍可能后写覆盖先写。建议同一场次由一人负责修改共享配置，其他人查看，不在本轮引入编辑权限系统。

## 清理规则

- 初始化时只登记现有数据，所有现有场次至少再保留 15 天，不按旧文件修改日期立即删除。
- 新上传的场次在上传/确认完成后登记；原始文件被替换或修改会重新计算该组保留期。同名主文件（例如同 stem 的 CSV/LD）作为一组，以新变更后的日期保留。
- 计划每 15 天清理一轮。实际实现每天北京时间 03:30 左右检查一次；距离上次成功清理不足 15 天只检查、不删除。忙碌或离线则留到下一次检查，因此通常保留约 15～31 天，持续使用的文件可能更久。
- 页面每分钟发送一次不包含用户名/密码的同源活动请求；最近 15 分钟有使用记录就延后整轮清理。三个人中的任意一人活动都能延后。
- 所有分析、上传、修改和下载请求与清理使用同一个跨进程文件锁。长任务执行期间清理拿不到锁；清理已开始时，新分析请求返回可重试的 503。
- 后台浏览器被系统挂起、断网、超过八小时认证失效等情况下可能停止活动请求。没有最近使用记录的已过期场次可能在下次计划清理被删除，不能保证只要旧标签页还存在就永不清理。启用后现有页面要重新加载，才带有活动请求。
- 只清理 `/srv/i3pro/data` 顶层、已登记且超过保留期的 `.csv/.ld/.xlsx/.txt/.tsv` 主文件及同名已知侧车（`.ldx`、圈段、注释、列映射等）；不递归，不按 JSON 中的路径删除，不处理孤立侧车、`.part`、DBC、子目录、全局 maths/worksheets 或账号。
- 原始 CAN 帧表、带 CAN 关联配置及其引用文件保守保留，防止拆散自动合并场次。符号链接、硬链接和无法确认的文件组也保留。
- 删除直接释放文件空间，没有回收站。删除后原分享链接不能再读取该场次；需要重新上传原文件。此方案不会为每个人建立单独副本。
- 维护状态损坏、真实分析器未启用互斥集成、PID 不一致、锁繁忙等情况不会删除。状态保存在 `/srv/i3pro/.aurora-retention.json`，锁为同目录 `.aurora-retention.lock`；不要手动删除锁文件。

## 1. 上传和自检（当前先执行）

先在无人使用时停止分析器、备份补丁目录。认证服务和 Nginx 不需要改动。

```bash
systemctl stop i3pro && \
tar -czf /opt/aurora-i3pro-lowmem-before-retention-$(date +%Y%m%d-%H%M%S).tar.gz \
  -C /opt aurora-i3pro-lowmem
```

上传 `build/i3pro-retention.zip`，解压覆盖到 `/opt/aurora-i3pro-lowmem/`，文件不能多套一层目录。包内是更新后的适配器、后台活动脚本、清理代码/测试、计划任务模板及本文档。首次更新默认没有启用清理集成，不会自动删除线上文件。

```bash
cd /opt/aurora-i3pro-lowmem && \
/opt/i3pro/.venv/bin/python -B aurora_lowmem.py && \
/opt/i3pro/.venv/bin/python -B -m unittest -v test_lowmem test_retention && \
systemctl start i3pro

systemctl show i3pro -p User -p Group -p ActiveState -p MemoryMax
```

应有 28 项测试通过。测试中的删除仅发生在自动创建的临时目录，不访问线上数据。预期服务用户/组均为 i3pro，ActiveState=active，MemoryMax=943718400。先把输出发回核对，再进行下面步骤。

## 2. 登记保留期并启用活动保护

以下命令假定已确认服务用户是 i3pro。用同一用户初始化，避免维护状态被 root 创建后服务无法读取。

```bash
runuser -u i3pro -- /opt/i3pro/.venv/bin/python -B \
  /opt/aurora-i3pro-lowmem/retention.py --initialize
```

应显示登记数量及至少 15 天后才允许删除；已初始化时保留原有日期，不重新计时。若权限错误先处理目录权限，不用 root 重试初始化。

新增单独的环境配置；同名文件已存在时不覆盖：

```bash
(set -C; cat > /etc/systemd/system/i3pro.service.d/aurora-retention.conf <<'EOF'
[Service]
Environment=AURORA_RETENTION=1
EOF
) && systemctl daemon-reload && systemctl restart i3pro

curl --max-time 15 -sS http://127.0.0.1:8731/api/aurora/maintenance
runuser -u i3pro -- /opt/i3pro/.venv/bin/python -B \
  /opt/aurora-i3pro-lowmem/retention.py --dry-run
```

预期接口返回 retention=1、实际 PID、root=/srv/i3pro/data；只读预览显示 dry_run=true、skip_reason=not_due、deleted_files=0。预览只列计划，不删除、不更新登记文件。

让所有已经打开工作台的队员重新加载页面，带上新的活动脚本。三台设备各自登录并打开场次，核对没有互踢；在浏览器网络面板可看到 `/api/aurora/activity` 每分钟返回 204。此接口在公网仍走现有 API 认证，匿名必须为 401。

## 3. 检查并安装定时任务

```bash
systemd-analyze verify \
  /opt/aurora-i3pro-lowmem/aurora-i3pro-cleanup.service \
  /opt/aurora-i3pro-lowmem/aurora-i3pro-cleanup.timer
systemd-analyze calendar '*-*-* 03:30:00 Asia/Shanghai'
```

确认无配置错误后安装。以下命令遇到已有同名 unit 会停止，避免覆盖未知任务。

```bash
test ! -e /etc/systemd/system/aurora-i3pro-cleanup.service && \
test ! -e /etc/systemd/system/aurora-i3pro-cleanup.timer && \
install -m 644 /opt/aurora-i3pro-lowmem/aurora-i3pro-cleanup.service /etc/systemd/system/ && \
install -m 644 /opt/aurora-i3pro-lowmem/aurora-i3pro-cleanup.timer /etc/systemd/system/ && \
systemctl daemon-reload && \
systemctl enable --now aurora-i3pro-cleanup.timer

systemctl list-timers --all aurora-i3pro-cleanup.timer
```

定时器每天检查，脚本通过持久化的上次成功清理时间控制实际 15 天间隔，不用“每月 1 日、16 日”近似 15 天。Persistent 补查关机错过的运行，不绕过保留期。参考 [systemd v239 定时器文档](https://raw.githubusercontent.com/systemd/systemd/v239/man/systemd.timer.xml) 和 [时间表达式文档](https://raw.githubusercontent.com/systemd/systemd/v239/man/systemd.time.xml)。

查看记录：

```bash
journalctl -u aurora-i3pro-cleanup.service -n 30 --no-pager
systemctl show i3pro -p MemoryCurrent -p MemoryMax -p NRestarts
```

日志中的 not_due 表示未到周期，recent_activity 表示近期有人使用，active_request 表示任务持锁，analyzer_not_verified 表示活动保护未核实。上述都表示本轮没有删除。

## 停用与回退

优先停用定时器，再停分析器；不会恢复已经删除的数据：

```bash
systemctl disable --now aurora-i3pro-cleanup.timer
systemctl stop aurora-i3pro-cleanup.service
systemctl stop i3pro
```

在宝塔将本轮新增的 `aurora-retention.conf` 改名为 `aurora-retention.conf.disabled`（若备份名已存在先检查，避免覆盖），恢复第 1 步备份的适配器目录，`systemctl daemon-reload && systemctl start i3pro`。保留 `.aurora-retention.json` 中的日期，不删除锁文件；若只是暂停自动删除，仅停定时器即可，活动保护可继续工作。

## 验证范围

本地 Windows：低内存/维护 Python 测试 28 项通过；后台活动 JavaScript 测试 5 项通过；认证测试 24 项通过、1 项缺少真实 htpasswd 跳过，其中三台设备登录各自保留有效会话。现有 HTTP 并发测试验证四个请求依次执行；本轮新增真实本地 HTTP 测试验证页面脚本注入、活动请求、只读就绪探测和维护期间返回 503。

清理测试覆盖过期删除、同名侧车、全局/目录保护、历史文件新保留期、新上传/替换重计时、只读预览、活动延后、锁互斥、PID 校验、状态损坏、硬链接与 CAN 保护。Windows 使用字节锁测试，Linux 使用 flock；Linux 权限、flock 分支、systemd 定时器和三台真实浏览器仍须服务器验证。没有执行线上清理，也没有加入退出按钮。
