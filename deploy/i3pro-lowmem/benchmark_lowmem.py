"""Reproducible synthetic CSV comparison. Development only: requires psutil.

Usage: python benchmark_lowmem.py --output <new-or-existing-benchmark-directory>
The selected directory must not contain a file called synthetic.csv.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time


def worker(mode, directory):
    import numpy as np
    from i3pro import csvlog, render
    if mode == "lowmem":
        import aurora_lowmem
        aurora_lowmem.install()
    started = time.perf_counter()
    log = csvlog.open_session(directory / "synthetic.csv")
    digest = hashlib.sha256()
    for channel in log.channels:
        digest.update(channel.name.encode("utf-8"))
        digest.update(np.asarray(log.values(channel.name), dtype="<f8").tobytes())
    payload = render.build_payload(log, channels=[c.name for c in log.channels[:8]],
                                   api_base="/api", worksheets_dir=directory)
    page = render.render_page(payload)
    (directory / f"{mode}.html").write_text(page, encoding="utf-8")
    print(json.dumps(dict(mode=mode, channels=len(log.channels),
                          duration=log.duration, values_sha256=digest.hexdigest(),
                          html_sha256=hashlib.sha256(page.encode("utf-8")).hexdigest(),
                          seconds=round(time.perf_counter()-started, 3))))


def main(directory, rows=131072, columns=256):
    import psutil
    directory.mkdir(parents=True, exist_ok=True)
    source = directory / "synthetic.csv"
    names = ["Time", "GPS Speed", "G Force Lat"] + [f"Sensor {i}" for i in range(columns - 3)]
    suffix = ",".join(str(10 + i % 80) for i in range(columns - 3))
    with source.open("x", encoding="ascii", newline="\n") as handle:
        handle.write(",".join(names) + "\n")
        for row in range(rows):
            handle.write(f"{row / 100:.2f},{40 + row % 20},{(row % 11 - 5) / 100:.2f},{suffix}\n")
    results = []
    for mode in ("original", "lowmem"):
        with (directory / f"{mode}.out").open("w", encoding="utf-8") as out:
            with (directory / f"{mode}.err").open("w", encoding="utf-8") as err:
                child = subprocess.Popen([sys.executable, "-B", __file__, "--worker", mode,
                                          "--output", str(directory)], stdout=out, stderr=err)
                process = psutil.Process(child.pid)
                peak_rss = peak_private = 0
                while child.poll() is None:
                    try:
                        memory = process.memory_info()
                        peak_rss = max(peak_rss, memory.rss, getattr(memory, "peak_wset", 0))
                        peak_private = max(peak_private, getattr(memory, "private", 0))
                    except psutil.NoSuchProcess:
                        break
                    time.sleep(0.01)
        if child.wait() != 0:
            raise RuntimeError((directory / f"{mode}.err").read_text(encoding="utf-8"))
        result = json.loads((directory / f"{mode}.out").read_text(encoding="utf-8").splitlines()[-1])
        result.update(peak_rss_mib=round(peak_rss/2**20, 1),
                      peak_private_mib=round(peak_private/2**20, 1))
        results.append(result)
    assert results[0]["values_sha256"] == results[1]["values_sha256"], "Numeric values differ"
    assert results[0]["html_sha256"] == results[1]["html_sha256"], "Rendered pages differ"
    report = dict(python=sys.version, platform=sys.platform, file_bytes=source.stat().st_size,
                  rows=rows, columns=columns, matrix_mib=round(rows*columns*8/2**20, 1), results=results,
                  note="Synthetic Windows measurements are not Linux cgroup peak memory guarantees.")
    (directory / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--worker", choices=("original", "lowmem"))
    parser.add_argument("--rows", type=int, default=131072)
    parser.add_argument("--columns", type=int, default=256)
    args = parser.parse_args()
    if args.rows < 2 or args.columns < 4:
        parser.error("--rows must be >= 2 and --columns must be >= 4")
    if args.worker:
        worker(args.worker, args.output)
    else:
        main(args.output, args.rows, args.columns)
