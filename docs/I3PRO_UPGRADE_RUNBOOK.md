# i3pro 后续升级流程

当前生产基线是上游提交 `9c333382e720c65a644c8652885bc822fcecbedc`，分析器运行在 `/opt/i3pro/.venv`，由 `/opt/aurora-i3pro-lowmem/run_service_lowmem.py` 启动。本文用于**未来指定目标版本时**准备升级；今天没有切换生产版本。

## 为什么不能直接 `git pull`

低内存适配器 `aurora_lowmem.py` 在启动时校验 i3pro 的 `csvlog.py`、`txtlog.py`、`library.py`、`server.py`、`indexpage.py` 五个文件的 SHA-256。任一文件改变，适配器会拒绝启动。它还依赖上游函数的具体结构；直接更新哈希而不适配代码会绕过保护，可能重新出现大 CSV 内存耗尽或错误结果。现有 1.8 GiB 服务器、900 MiB 服务上限也没有容错空间。

## 给新版 i3pro 的兼容要求

这些是**当前部署的对接条件**，不是要求上游项目永远不能修改。若新版改变其中任一项，应在候选版本中同步修改我们的适配器、认证代理或清理器，并完成相应验收，再切换生产。

| 对接面 | 尽量保持的行为 | 改动时需要同步处理 |
| --- | --- | --- |
| 启动与资源 | Python 3.11 环境可安装并通过 `i3pro.server.serve(roots, host, port, cache_size, port_attempts, maths_root, worksheets_root)` 启动；仅监听 `127.0.0.1:8731`，保持数据和配置位于 `/srv/i3pro` | 若入口或参数变化，修改 `run_service_lowmem.py`、systemd 启动命令；重新测 900 MiB 内存限制下的大文件和最多约 3 人的使用场景 |
| 低内存解析 | 现有补丁对 `csvlog`、`txtlog`、`library`、`server`、`indexpage` 的函数和缓存结构有精确依赖；大 CSV 按需加载，分析数值与原版一致 | 逐个核对五个模块，重新适配补丁与哈希，并比较解析值、单位、时间和页面结果；**不能只更新哈希**。若新版原生解决内存问题，可通过同等测试后再决定移除补丁 |
| 文件容量 | 当前补丁对超过 8 MiB 的 CSV/TXT 使用数值型分块读取，展开矩阵最多 576 MiB、最多 200 万行、最多 1024 列；大于 8 MiB 的 XLSX 和原始 CAN 帧 CSV 暂不支持 | 新版若增加格式或改变读取方式，应先验证典型约 123,300 × 557（约 524 MiB 矩阵）场次、磁盘临时空间、内存峰值与错误提示，再调整限制 |
| 页面与接口 | 首页 `/`、场次页 `/session/{编码后的场次名}`（保留原查询参数）、上传相关 `/api/import*` 或 `/api/upload*`、其他 `/api/*` 保持可经现有 Nginx 转发 | 路由、上传方法、页面跳转方式或 WebSocket/流式协议变化时，检查 Nginx、`auth_service.py` 的场次页代理和 `aurora_lowmem.py` 的上传识别；从匿名分享链接、登录、上传到分析完整复测 |
| 数据布局与清理 | 上传源文件继续存于 `/srv/i3pro/data` 的顶层，场次名及同名附属文件可关联；共享设置和保留期状态在 `/srv/i3pro` | 若目录、命名、文件后缀、附属文件或写入方式变化，修改 `retention.py` 的识别规则和测试。清理仍以首次登记时间计算 15 天，且仅删除已登记、未变化的文件；先执行 dry-run |
| 维护探针 | 运行适配器时 `/api/aurora/maintenance` 返回正确进程与数据根目录，`/api/aurora/activity` 可更新活动时间 | 若新版服务处理器结构变化，同步移植这两个端点及请求锁；否则清理服务应保持拒绝删除，而不能绕过探针 |

建议给每次上游升级提供固定的提交 ID、变更清单和可锁定的依赖，并特别标出上述模块、路由、存储格式与新后台任务的改动。新版应能在独立目录安装和测试；不要让安装或首次启动自动迁移生产数据。升级前后各用同一份样本对比结果，并保留旧版源码、虚拟环境与数据备份以供回退。

## 每次升级按四步走

1. **指定版本并保留旧版。** 记录目标上游提交、变更说明和依赖版本。在独立目录准备新源码与虚拟环境，例如 `/opt/i3pro-next`，不在运行中的 `/opt/i3pro` 执行 `git pull` 或覆盖其 `.venv`。先备份 `/srv/i3pro/data`、`/srv/i3pro` 下的共享配置/保留期状态、当前源码/虚拟环境和两个 systemd unit。数据备份应有服务器以外的副本；若新版改变数据格式，回退必须连同相应旧数据一起考虑。
2. **离线兼容验证。** 用新虚拟环境运行现有适配器校验和 `test_lowmem`、`test_retention`；如版本校验失败，先根据新版源码修改适配器并重新建立哈希、功能和内存测试，不能只替换哈希。重点比较小文件、约 524 MiB 数值矩阵的大 CSV、上传/下载、分享链接、活动心跳和清理 dry-run。重型对比测试优先在开发机或隔离环境进行，不让生产服务器同时运行新旧两份大表解析。
3. **短暂停机切换。** 通过宝塔上传已测试的新版本包，检查依赖和系统盘余量。`i3pro.service` 的 `aurora-lowmem.conf` 中 `ExecStart` 指向新虚拟环境，`aurora-i3pro-cleanup.service` 的 `ExecStart` 也指向同一新虚拟环境；适配器目录及固定的 `127.0.0.1:8731` 端口保持一致。仅在测试通过后 `systemctl daemon-reload`、重启 `i3pro`。清理任务用 `retention.py --dry-run` 验证，**不要为了测试手动启动正式清理 service**。
4. **验收或回退。** 检查 `i3pro` active、8731 首页 200、维护接口 `retention=1`、匿名 API 401、登录、旧场次/新上传/分享和内存峰值。失败时恢复两个 unit 的旧虚拟环境路径并重启分析器；保留新版目录供排查。不要把数据目录回退到更早时间，除非已确认新版迁移导致旧版不能读取，并已安排一致性恢复。

升级前可先在服务器采集只读基线：

```bash
git -C /opt/i3pro rev-parse HEAD
systemctl cat i3pro.service
systemctl cat aurora-i3pro-cleanup.service
systemctl show i3pro -p ActiveState -p MemoryCurrent -p MemoryMax -p NRestarts
systemctl list-timers --all aurora-i3pro-cleanup.timer
```

候选版本装入独立虚拟环境后、切换服务前，适配器检查和专项测试使用候选解释器：

```bash
/opt/i3pro-next/.venv/bin/python -B /opt/aurora-i3pro-lowmem/aurora_lowmem.py
cd /opt/aurora-i3pro-lowmem
/opt/i3pro-next/.venv/bin/python -B -m unittest -v test_lowmem test_retention
```

以上命令只使用测试创建的临时数据；版本校验失败即停止升级，不继续修改生产 unit。`/opt/i3pro-next` 只是示例目录，实施时要与实际目标版本包一致。

## 可以省掉的重复工作

当新版本保持现有端口、API、数据格式和认证边界时，官网、登录页、共享账号、Nginx 及证书通常不需要重发。未来可以为**已指定且测试通过的提交**生成一次性升级包：内含新源码、适配器、依赖锁定信息、两个 unit 的路径变更和回退说明。服务器操作可收敛为上传候选包、运行预检、切换服务、检查健康状态。预检失败时不切换生产版本。

每次目标版本不同，都应先核对五个源码文件与数据/API 变化，因此不能做成不经检查的自动追最新。当前[上游仓库](https://github.com/fyl66/i3pro)和[第一阶段部署基线](PHASE_1_CLOSEOUT.md)是准备目标版本时的入口。
