"""Opt-in adapter for i3pro 9c333382; upstream source files stay unchanged.

GPL-3.0, matching i3pro: https://github.com/fyl66/i3pro
Only the verified upstream functions below are transformed in memory. Hash and
replacement guards fail closed on any other version instead of guessing.
"""
from __future__ import annotations

import gc
import hashlib
import html
import inspect
import json
import os
import shutil
import tempfile
import threading
from pathlib import Path
from urllib.parse import quote, urlsplit

import numpy as np
import pandas as pd
from i3pro import csvlog, indexpage, library, server, txtlog
from i3pro.api import Response
from retention import Maintenance, Busy

LARGE_FILE = 8 * 1024 * 1024
MAX_MATRIX = 576 * 1024 * 1024
MAX_ROWS = 2_000_000
DISK_RESERVE = 128 * 1024 * 1024
CHUNK_ROWS = 4096
HASHES = {
    "csvlog": "b36e749b360165c6f0e612613e4827162424a5014e7f4057244f9269a41bd278",
    "txtlog": "d8b16840ed261dd8a405bb10246f3481fc7b0d50dcce6782c0faff7beaac5589",
    "library": "ed5fecd7f5d72c94154630120b5fea8efebde2f07537927b8b8f1111de7a65fe",
    "server": "4008c8d8b435c46f98686ff83de6afa9382bd74182d6ac28cf31c4a5b564d467",
    "indexpage": "88428279670b416d1b05a0cfd40dc0a4d29d89ff3fd4853c1526966706cd04cb",
}
_original_read_frame = txtlog.read_frame
_original_make_handler = server.make_handler
_original_open_session = csvlog.open_session
_installed = False


class TableLimitError(ValueError):
    """Capacity failure, distinct from invalid cell content."""


def verify_upstream():
    for module in (csvlog, txtlog, library, server, indexpage):
        content = Path(module.__file__).read_bytes().replace(b"\r\n", b"\n")
        if hashlib.sha256(content).hexdigest() != HASHES[module.__name__.split(".")[-1]]:
            raise RuntimeError(f"{module.__file__} 与已验证版本不同。请恢复原版启动文件并重新核对版本。")


def _transform(function, replacements, extra=None):
    source = inspect.getsource(function)
    for before, after in replacements:
        if source.count(before) != 1:
            raise RuntimeError(f"{function.__name__} 适配位置不匹配，已停止启用。")
        source = source.replace(before, after)
    namespace = dict(function.__globals__)
    namespace.update(extra or {})
    # Source is a hash-verified, installed upstream function, never user input.
    exec(compile(source, f"<aurora:{function.__name__}>", "exec"), namespace)
    return namespace[function.__name__]


def read_frame(path, *, encoding, delimiter, skip, limit):
    """Keep previews/small mixed tables unchanged; spool large numeric tables.

    Floating point precision stays float64. The anonymous temporary file lives
    as long as the returned mapped columns and is removed by the OS on close.
    No persistent data/cache files are created alongside the user's source.
    """
    if limit is not None or Path(path).stat().st_size <= LARGE_FILE:
        return _original_read_frame(path, encoding=encoding, delimiter=delimiter, skip=skip, limit=limit)
    common = dict(header=None, skiprows=skip, skip_blank_lines=True,
                  on_bad_lines="skip", encoding=encoding, encoding_errors="replace",
                  dtype=np.float64, chunksize=CHUNK_ROWS)
    sep, engine = (r"\s+", "python") if delimiter == " " else (delimiter, "c")
    with tempfile.TemporaryFile(prefix="aurora-csv-") as spool:
        rows, width = 0, None
        try:
            with pd.read_csv(path, sep=sep, engine=engine, **common) as chunks:
                for chunk in chunks:
                    if width is None:
                        width = chunk.shape[1]
                    if width > 1024 or chunk.shape[1] != width:
                        raise ValueError("列数过多或不一致")
                    rows += len(chunk)
                    size = rows * width * 8
                    if rows > MAX_ROWS:
                        raise TableLimitError(
                            f"低内存模式：已读到 {rows:,} 行，超过 {MAX_ROWS:,} 行限制；"
                            "请按时段拆分后再导入，原文件未修改。")
                    if size > MAX_MATRIX:
                        raise TableLimitError(
                            f"低内存模式：已读到 {rows:,} 行 × {width} 列，"
                            f"数值矩阵已达 {size / 1024**2:.1f} MiB，"
                            f"超过 {MAX_MATRIX / 1024**2:g} MiB 限制；"
                            "请按时段拆分后再导入，原文件未修改。")
                    values = chunk.to_numpy(dtype=np.float64, copy=False)
                    if shutil.disk_usage(tempfile.gettempdir()).free < values.nbytes + DISK_RESERVE:
                        raise ValueError("临时磁盘空间不足；请释放空间后再导入")
                    values.tofile(spool)
                    del values, chunk
        except TableLimitError:
            raise
        except (ValueError, TypeError) as exc:
            raise ValueError(
                "低内存模式未能读取这份大表：" + str(exc) +
                "。超过 8 MiB 的 CSV/TXT 数据区需为数值（允许空值），时间需为相对秒。"
                "请移除文字列、转换时间格式，或按时段拆成小文件后再试；原文件未修改。"
            ) from exc
        if not rows or not width:
            return pd.DataFrame()
        spool.flush()
        mapped = np.memmap(spool, dtype=np.float64, mode="r", shape=(rows, width))
        frame = pd.DataFrame(mapped, copy=False)
        frame.attrs["aurora_disk_backed"] = True
        return frame


def open_session(path, **kwargs):
    """Apply format limits to both uploads and reopening stored sessions."""
    path = Path(path)
    if path.stat().st_size > LARGE_FILE:
        if path.suffix.lower() == ".xlsx":
            raise ValueError("低内存模式暂不加载超过 8 MiB 的 Excel；请导出数值 CSV 后再试。")
        if path.suffix.lower() == ".csv" and library.canlog.looks_like_frames(path):
            raise ValueError("低内存模式暂不加载超过 8 MiB 的原始 CAN 帧表；请先离线解码或分段。")
    return _original_open_session(path, **kwargs)


class LowMemoryLibrary(library.SessionLibrary):
    """Listing never opens logs. Analysis loads only the requested scene."""
    def drop_loaded(self):
        with self._lock:
            for log in self._cache.values():
                log.close()
            self._cache.clear()
            self._maths_cache.clear()
            self._maths_attached.clear()
            self._maths_errors.clear()
        gc.collect()

    def get(self, name):
        path = self.path_of(name)
        if path is not None and str(path) not in self._cache:
            # HTTP dispatch is serialized, so an active response never loses its log.
            self.drop_loaded()
        return super().get(name)

    def listing(self):
        return [dict(name=name, url=f"/session/{quote(name)}", file_size=path.stat().st_size,
                     pending=True, device=path.suffix.lstrip(".").upper())
                for name, path in self._paths().items()]


def make_handler(instance, buckets=server.render.DEFAULT_BUCKETS, maintenance=None):
    base = _original_make_handler(instance, buckets)
    processing = threading.Lock()
    waiting = threading.BoundedSemaphore(8)
    if maintenance is None and os.environ.get("AURORA_RETENTION") == "1":
        maintenance = Maintenance()
    activity_script = ""
    if maintenance is not None:
        maintenance.begin_runtime(os.getpid())
        activity_script = '<script id="aurora-activity">\n' + Path(__file__).with_name("activity.js").read_text(encoding="utf-8") + '\n</script>'

    class Handler(base):
        def _html(self, text, status=200):
            if activity_script and 'id="aurora-activity"' not in text:
                end = text.lower().rfind("</body>")
                text = text[:end] + activity_script + text[end:] if end >= 0 else text + activity_script
            return super()._html(text, status)

        def route(self, parts, query, method):
            if maintenance is not None and method in ("GET", "HEAD"):
                if parts == ["api", "aurora", "maintenance"]:
                    return Response(200, json.dumps({"retention": 1, "pid": os.getpid(),
                                                    "root": str(maintenance.root)}).encode("utf-8"))
                if parts == ["api", "aurora", "activity"]:
                    return Response(204, b"")
            return super().route(parts, query, method)

        def dispatch(self, method):
            reserved = waiting.acquire(blocking=False)
            acquired = reserved and processing.acquire(timeout=30)
            if not acquired:
                if reserved:
                    waiting.release()
                body = json.dumps({"error": "正在处理其他分析请求，请稍后重试。"}, ensure_ascii=False).encode("utf-8")
                try:
                    self.send(Response(503, body, headers=(("Retry-After", "3"),), close=True))
                except (BrokenPipeError, ConnectionResetError):
                    pass
                return
            guard = None
            try:
                path = urlsplit(self.path).path
                uploading = method in ("POST", "PUT") and path.startswith(("/api/import", "/api/upload"))
                # The cleaner's readiness probe must not count as user activity.
                if maintenance is not None and path != "/api/aurora/maintenance":
                    guard = maintenance.request(register=uploading)
                    try:
                        guard.__enter__()
                    except (Busy, OSError, ValueError):
                        guard = None
                        self.send(Response(503, json.dumps({"error": "正在维护或使用记录暂不可用，请稍后重试。"}, ensure_ascii=False).encode("utf-8"),
                                           headers=(("Retry-After", "3"),), close=True))
                        return
                if uploading:
                    instance.drop_loaded()
                super().dispatch(method)
            finally:
                try:
                    if guard is not None:
                        guard.__exit__(None, None, None)
                finally:
                    processing.release()
                    waiting.release()
    return Handler


def install():
    global _installed
    if _installed:
        return
    verify_upstream()
    # The original converter remains authoritative for naming, units and values.
    # For a valid mapped time column, avoid copying the complete numeric matrix.
    converter = _transform(csvlog.session_from_frame, [
        ("frame = frame.copy()", "frame = frame.copy(deep=not frame.attrs.get('aurora_disk_backed', False))"),
        ("good = np.isfinite(time)",
         "good = np.isfinite(time)\n    mapped_frame = frame.attrs.get('aurora_disk_backed', False)\n"
         "    if mapped_frame and not good.all():\n"
         "        raise ValueError('大文件的时间列含空值或无效值；请修正这些行后重新导入。')"),
        ("values = values[good]", "values = values if mapped_frame else values[good]"),
    ])
    pending = '''        if entry.get("pending"):
            name = html.escape(entry["name"])
            url = html.escape(entry["url"], quote=True)
            size = entry["file_size"] / (1024 * 1024)
            rows.append(f"<tr><td><a href='{url}'>{name}</a></td><td>{entry['device']}</td>"
                        f"<td colspan='5'>{size:.1f} MiB · 点击后加载分析</td></tr>")
            continue
'''
    page = _transform(indexpage.index_page, [
        ('        if "error" in entry:', pending + '        if "error" in entry:'),
        ('选择一个试车场次开始分析；所有数据都在本机解析，不上传。',
         '选择场次后加载分析。当前同一时间处理一个请求；其他请求短暂等待。'),
    ], {"html": html})
    txtlog.read_frame = read_frame
    csvlog.session_from_frame = converter
    csvlog.open_session = open_session
    indexpage.index_page = page
    server.index_page = page
    server.SessionLibrary = LowMemoryLibrary
    library.SessionLibrary = LowMemoryLibrary
    server.make_handler = make_handler
    _installed = True


if __name__ == "__main__":
    verify_upstream()
    print("版本及源码校验通过。")
