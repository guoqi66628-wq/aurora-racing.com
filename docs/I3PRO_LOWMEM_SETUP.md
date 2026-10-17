# i3pro 低内存试运行补丁

2026-10-14。适用原版提交 `9c333382e720c65a644c8652885bc822fcecbedc`。这是待服务器实测的可回退补丁，不是已完成的线上修复。

2026-10-15 线上反馈：用户最初仍收到旧版 512 MiB 报错，重启 i3pro 后确认“可以了”。这说明当前版本可打开此前被拒绝的场次；此前 284 MiB 内存采样不视为该场次加载峰值，也不证明全部大文件或多人使用已验证。接下来按 [分享页面代理升级](I3PRO_SHARE_PROXY_SETUP.md) 继续。

## 已安装 512 MiB 版的更新步骤（当前执行这里）

旧版在服务器已通过 14 项测试，启动/列表正常，分析后的内存采样约 521 MiB、没有重启或同期内核错误。但另一个场次被容量保护拒绝，不能称全部文件已恢复：

- `80定速滑行.csv`：123,300 行 × 557 列，数值矩阵约 524.0 MiB；触发的是 512 MiB 矩阵限制，不是 200 万行限制。
- `cjh高避1.csv`：67,800 行 × 557 列，数值矩阵约 288.1 MiB。

本轮将矩阵限制小幅调至 576 MiB，并分别报告矩阵和行数超限，容量错误不再附带无关的文字列/时间格式提示。保留 systemd 900M 和其他限制。用户另提供最大约 234,895 KB 的 CSV 文件清单；这批文件的行列数未知，576 MiB 版本不保证支持全部文件，也不适用于大 Excel。截图中“XLS 工作表”已由用户确认实际后缀为 `.csv`。

1. 关闭分析页面，执行停止和备份（会暂时中断工作台）：

   ```bash
   systemctl stop i3pro && tar -czf /opt/aurora-i3pro-lowmem-before-576-$(date +%Y%m%d-%H%M%S).tar.gz -C /opt aurora-i3pro-lowmem
   ```

2. 将新包 `build/i3pro-lowmem-576.zip` 上传、解压覆盖 `/opt/aurora-i3pro-lowmem/` 中的同名文件。无需重建 drop-in、修改 Nginx 或重新上传场次。

3. 检查通过才启动：

   ```bash
   cd /opt/aurora-i3pro-lowmem && \
   /opt/i3pro/.venv/bin/python -B aurora_lowmem.py && \
   /opt/i3pro/.venv/bin/python -B -m unittest -v test_lowmem && \
   systemctl start i3pro
   ```

   预期 16 项测试通过。只打开已有的 `80定速滑行` 一次，核对曲线和通道，并执行第 2 节的内存/日志检查。若页面断开或明显卡顿，停止服务，不反复刷新。

4. 回退本轮修改时，先停止服务，从步骤 1 的备份恢复补丁目录，再运行旧版测试后启动。恢复后仍为 512 MiB 限制，524 MiB 场次仍会被拒绝。完全回退低内存启动方式见第 3 节。

同规模合成测试：123,300 行、557 列（矩阵 524.0 MiB；CSV 206,848,457 字节，文本长度与真实文件不同）。原版/补丁全部数据通道的数值摘要及生成页面哈希一致；Windows 工作集峰值分别为 1162.2 / 621.5 MiB，私有内存峰值 1670.2 / 615.8 MiB，解析加生成页面 6.249 / 5.672 秒。当前 16 项专项测试通过。Linux 真实数据下的峰值、衍生通道和多人使用仍待验收。

## 原因与行为

已确认服务器 `i3pro.service` 在 900 MiB 上限发生 cgroup OOM；临时升至 1100 MiB 也接近耗尽上限。服务器总 RAM 约 1.8 GiB，因此停止继续升限。用户已停止分析器；停止后 available 约 1.3 GiB。

本补丁用独立启动文件运行，不修改 `/opt/i3pro/src/`、旧启动文件、账号、认证服务或 Nginx。启动时校验五个相关上游文件的 SHA-256，版本不符则拒绝启动；运行时只替换经校验的函数。原始数据文件保持只读；原版导入、侧车配置等功能仍按原版保存文件。

- 超过 8 MiB 的数值 CSV/TXT 分块读取，写入临时二进制文件并用内存映射访问；保持 float64，不主动降采样或删除通道。
- 列表仅显示名称、格式、大小，不提前解析全部场次，因此不显示圈数和最快圈。点击后才分析。
- 切换场次先释放旧缓存；上传前也释放缓存。同一时间处理一个 HTTP 请求，包含在内最多容纳 8 个正在处理/等待的请求；等待超过 30 秒或满员返回 503，可稍后重试。
- 大表数据区须为数值（传感器空值允许，时间列空值不允许）；大表中的日期字符串、文本列、超过 8 MiB 的 Excel/原始 CAN 帧表返回说明，不自动退回高内存解析。小文件仍走原有读取器。
- 大表最多 200 万行、1024 列，展开的数值矩阵最多 576 MiB；这不是进程内存保证，衍生通道、渲染和导出仍可能额外分配内存。保留 systemd 900M 限制。
- 临时文件需要额外磁盘空间；建议 `/tmp` 至少留出 1 GiB。临时文件随最后一个映射释放而由系统清理，最多保留当前场次映射，不写到场次目录。若 `/tmp` 是 tmpfs，会占用内存，应先改用磁盘临时目录再测试。

## 1. 首次安装：上传、检查

本地包：`build/i3pro-lowmem-576.zip`。在宝塔新建 `/opt/aurora-i3pro-lowmem/`，上传并解压，不能多套一层目录。包内只有适配器、新启动文件、测试、开发基准脚本、许可证及本文档；没有原始日志或密码。

保持 i3pro 停止，关闭分析页面，然后执行：

```bash
cd /opt/aurora-i3pro-lowmem && \
/opt/i3pro/.venv/bin/python -B aurora_lowmem.py && \
/opt/i3pro/.venv/bin/python -B -m unittest -v test_lowmem

df -h /tmp /srv/i3pro
findmnt -T /tmp -o TARGET,FSTYPE,AVAIL
systemctl show i3pro -p ActiveState -p MemoryMax
```

预期源码校验通过、16 项测试全部 OK、服务仍 inactive，MemoryMax=943718400。测试只使用自动创建的临时数据，不接触 `/srv/i3pro/data`。开发基准脚本不需要在小内存服务器运行，也不需要额外安装 psutil。

**本轮先把以上输出发回核对，再进行下节的服务切换。** 特别需要确认 Python/pandas 在服务器的实际版本也通过测试，临时目录位于磁盘且空间足够。

## 2. 切换启动文件（检查通过后）

以下步骤改变生产分析器启动方式，不修改 Nginx。若同名 drop-in 已存在，命令拒绝覆盖，应先查看现有内容。

```bash
systemctl stop i3pro && \
systemctl set-property --runtime i3pro.service MemoryMax=900M && \
install -d -m 755 /etc/systemd/system/i3pro.service.d && \
(set -C; cat > /etc/systemd/system/i3pro.service.d/aurora-lowmem.conf <<'EOF'
[Service]
ExecStart=
ExecStart=/opt/i3pro/.venv/bin/python /opt/aurora-i3pro-lowmem/run_service_lowmem.py
EOF
) && systemctl daemon-reload && systemctl start i3pro

systemctl status i3pro --no-pager -l
curl --max-time 20 -sS -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:8731/
systemctl show i3pro -p MemoryCurrent -p MemoryMax -p NRestarts
free -h
```

启动命令只替换 ExecStart，保留原 service 的运行用户、工作目录、PrivateTmp 和资源限制。若服务不能读取新目录，先检查目录权限和 journal，不取消原有加固设置。不要将完整 service 改成以 root 运行。

列表应返回 200 且不加载大场次。随后只允许一名队员打开一个已有 CSV，不重复上传。核对图线、通道、时间范围，再逐步试切换场次/上传。

```bash
systemctl show i3pro -p ActiveState -p MemoryCurrent -p MemoryMax -p NRestarts
free -h
journalctl -u i3pro --since '5 minutes ago' -n 40 --no-pager
journalctl -k --since '5 minutes ago' -n 60 --no-pager
```

若内存再次贴近 900M、available 持续低于 200 MiB、卡顿或 OOM，先关闭分析页、`systemctl stop i3pro`，保留输出，不继续增限。一次成功不能证明所有日志和多人使用均稳定。Nginx 曾出现的原生崩溃仍需单独观察；本补丁不修复它，也不恢复此前撤下的分享 location。

## 3. 回退

只撤下本补丁创建的 drop-in，保留原始数据和旧启动文件。以下命令将其重命名为非 `.conf` 文件保存；若备份已存在会停止，避免覆盖。

```bash
systemctl stop i3pro && \
test ! -e /etc/systemd/system/i3pro.service.d/aurora-lowmem.conf.disabled && \
mv /etc/systemd/system/i3pro.service.d/aurora-lowmem.conf /etc/systemd/system/i3pro.service.d/aurora-lowmem.conf.disabled && \
systemctl daemon-reload
```

此时保持停止。确定只处理小文件后才执行 `systemctl start i3pro`。旧版仍可能因同一 100 MB CSV 耗尽内存，回退不意味着可以继续打开该大文件。

## 本地验证记录与限制

Windows、Python 3.13.7；服务器是 Linux/Python 3.11，因此需执行第 1 节。

- 自有回归测试：当前 16 项通过，含数据一致性、映射共享、版本校验、空值/精度/单位/生成时间、空间限制、延迟解析列表、缓存提前淘汰、上传提交及 HTTP 串行处理、繁忙时不读上传体；本轮新增矩阵边界和行数超限独立提示检查。
- 合成 CSV：101,532,080 字节，131,072 行、256 列（255 个数据通道）。原版和补丁全通道字节校验一致；生成的分析 HTML 也完全一致。
- 相同脚本采样：原版工作集峰值 603.6 MiB、私有内存峰值 1052.5 MiB；补丁分别 352.9 / 585.2 MiB。解析加页面生成 2.995 / 3.255 秒。Windows 工作集/私有内存不等于 Linux cgroup 计费，不能据此承诺真实文件不触发 900M 限制。
- 上游 434 项测试：原版与补丁均为相同的 2 项失败、140 项跳过；失败分别是 Windows 中文 `.bat` 启动和缺少真实 CAN 分卷数据；跳过主要因缺少金标准日志。没有观察到新增失败，不能称全量回归通过。
- `smoke_viewer.js` 对原版和补丁生成的相同页面均在第 1600 行报表断言处出错，未全通过；`verify_ld_vs_csv.py` 无可比较数据；`verify_clicks.py` 缺金标准日志，跳过。真实浏览器/金标准与队内原始 CSV 尚未验收。

复现数据测试（开发机器安装 psutil 后，在新输出目录运行）：

```bash
PYTHONPATH=/opt/i3pro/src:/opt/aurora-i3pro-lowmem python benchmark_lowmem.py --output /path/to/new-benchmark-dir
```

该脚本会生成约 101.5 MB 的合成文件和两份 HTML、JSON 测量报告，目录中已存在 `synthetic.csv` 时拒绝覆盖。不要在当前 2 GB 服务器上跑原版大文件基准。

复现 524 MiB 矩阵测试，在命令后追加 `--rows 123300 --columns 557`，并使用另一个新的输出目录。

分享链接、退出按钮、每 15 天清理一次过期数据仍属于后续步骤，本次不启用自动删除。
