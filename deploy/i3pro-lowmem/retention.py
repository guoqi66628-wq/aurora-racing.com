"""Conservative retention for the shared flat i3pro upload directory.

Standard library only. The analyzer and cleaner take the same exclusive lock.
Only registered, unchanged, expired top-level log families may be removed.
"""
from contextlib import contextmanager
import argparse
import http.client
import json
import math
import os
from pathlib import Path
import stat
import tempfile
import time

DAY = 86400
PERIOD = 15 * DAY
IDLE_GRACE = 15 * 60
SOURCES = {".csv", ".ld", ".xlsx", ".txt", ".tsv"}
SIDECARS = (".ldx", ".laps.json", ".sections.json", ".gps.json", ".notes.json",
            ".maths.json", ".map.json", ".can.json")
DATA_ROOT = Path("/srv/i3pro/data")
STATE_ROOT = Path("/srv/i3pro")


class Busy(Exception):
    pass


@contextmanager
def file_lock(path):
    # Never remove the lock file: different inodes would defeat exclusion.
    with Path(path).open("a+b") as handle:
        if os.name == "nt":
            import msvcrt
            if handle.seek(0, 2) == 0:
                handle.write(b"\0")
                handle.flush()
            handle.seek(0)
            try:
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError as exc:
                raise Busy("analysis or cleanup is running") from exc
        else:
            import fcntl
            try:
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as exc:
                raise Busy("analysis or cleanup is running") from exc
        try:
            yield
        finally:
            if os.name == "nt":
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(handle, fcntl.LOCK_UN)


def stamp(path):
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
        raise ValueError("symlinks, special files and hard links are excluded")
    return [info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns]


def number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError("invalid retention timestamp")
    return value


class Maintenance:
    def __init__(self, root=DATA_ROOT, state_root=STATE_ROOT, clock=time.time):
        self.root = Path(root).absolute()
        self.state_root = Path(state_root).absolute()
        # Reject redirected roots, including symlink ancestors.
        for path in (self.root, self.state_root):
            if not path.is_dir() or path.resolve() != path:
                raise ValueError(f"retention root must be a real directory: {path}")
        self.state_path = self.state_root / ".aurora-retention.json"
        self.lock_path = self.state_root / ".aurora-retention.lock"
        for path in (self.state_path, self.lock_path):
            if path.is_symlink() or (path.exists() and not stat.S_ISREG(path.stat().st_mode)):
                raise ValueError("retention metadata must be regular files")
        self.clock = clock

    def scan(self):
        if self.root.resolve() != self.root:
            raise ValueError("upload directory was redirected; stopped")
        groups = {}
        for path in sorted(self.root.iterdir()):
            if path.suffix.lower() in SOURCES:
                groups.setdefault(path.stem, []).append(path)
        result = {}
        protected = set()
        for stem, sources in groups.items():
            can_map = self.root / (stem + ".can.json")
            if os.path.lexists(can_map):
                protected.add(stem)
                try:
                    stamp(can_map)
                    with can_map.open("rb") as handle:
                        mapping = json.loads(handle.read(256 * 1024))
                    members = mapping.get("sources", [])
                    if not isinstance(members, list):
                        raise ValueError("invalid CAN source associations")
                    for name in members:
                        if isinstance(name, str):
                            protected.add(Path(name).stem)
                except (OSError, ValueError, AttributeError):
                    # Unreadable CAN associations: retain all CSV families.
                    protected.update(key for key, paths in groups.items()
                                     if any(p.suffix.lower() == ".csv" for p in paths))
            for path in sources:
                if path.suffix.lower() == ".csv":
                    try:
                        stamp(path)
                        with path.open("rb") as handle:
                            handle.readline(65536)
                            fields = handle.readline(65536).split(b",")
                        if len(fields) >= 10 and fields[1].startswith(b'=\"'):
                            protected.add(stem)  # Upstream's raw CAN framing marker.
                    except (OSError, ValueError):
                        protected.add(stem)
        for stem, sources in groups.items():
            if stem in protected:
                continue
            members = sources + [self.root / (stem + suffix) for suffix in SIDECARS
                                 if os.path.lexists(self.root / (stem + suffix))]
            try:
                snapshots = {path.name: stamp(path) for path in members}
            except (OSError, ValueError):
                continue  # An ambiguous family is retained in its entirety.
            result[stem] = {"files": snapshots,
                            "sources": {path.name: snapshots[path.name] for path in sources}}
        return result

    def read(self):
        data = json.loads(self.state_path.read_text(encoding="utf-8"))
        if (not isinstance(data, dict) or data.get("version") != 1
                or data.get("root") != str(self.root) or not isinstance(data.get("groups"), dict)):
            raise ValueError("retention state is invalid; no files will be deleted")
        number(data.get("last_activity"))
        number(data.get("last_sweep"))
        for record in data["groups"].values():
            if not isinstance(record, dict) or not isinstance(record.get("sources"), dict):
                raise ValueError("invalid retention group")
            number(record.get("first_seen"))
        return data

    def write(self, data):
        fd, name = tempfile.mkstemp(prefix=".aurora-retention-", suffix=".tmp", dir=self.state_root)
        try:
            with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
                json.dump(data, handle, ensure_ascii=False, allow_nan=False)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(name, self.state_path)
        finally:
            Path(name).unlink(missing_ok=True)

    def register(self, state, groups):
        previous = state["groups"]
        now = self.clock()
        state["groups"] = {
            stem: (previous[stem] if stem in previous and previous[stem]["sources"] == group["sources"]
                   else {"sources": group["sources"], "first_seen": now})
            for stem, group in groups.items()
        }

    def initialize(self):
        with file_lock(self.lock_path):
            if self.state_path.exists():
                self.read()
                return "already initialized; original retention dates kept"
            now = self.clock()
            data = {"version": 1, "root": str(self.root), "last_activity": now,
                    "last_sweep": now, "runtime_pid": None, "groups": {}}
            self.register(data, self.scan())
            self.write(data)
            return f"registered {len(data['groups'])} groups; no deletion before 15 days"

    def begin_runtime(self, pid):
        with file_lock(self.lock_path):
            state = self.read()
            self.register(state, self.scan())
            state.update(runtime_pid=pid, last_activity=self.clock())
            self.write(state)

    @contextmanager
    def request(self, register=False):
        with file_lock(self.lock_path):
            state = self.read()
            state["last_activity"] = self.clock()
            self.write(state)
            try:
                yield
            finally:
                if register:
                    self.register(state, self.scan())
                state["last_activity"] = self.clock()
                self.write(state)

    def cleanup(self, dry_run=True, expected_pid=None):
        with file_lock(self.lock_path):
            state = self.read()
            now = self.clock()
            groups = self.scan()
            self.register(state, groups)
            candidates = {stem: group for stem, group in groups.items()
                          if now - state["groups"][stem]["first_seen"] >= PERIOD}
            reason = None
            if now - state["last_sweep"] < PERIOD:
                reason = "not_due"
            elif now - state["last_activity"] < IDLE_GRACE:
                reason = "recent_activity"
            elif expected_pid is None or state.get("runtime_pid") != expected_pid:
                reason = "analyzer_not_verified"
            report = {"dry_run": dry_run, "skip_reason": reason,
                      "groups": list(candidates),
                      "files": [name for group in candidates.values() for name in group["files"]],
                      "bytes": sum(value[2] for group in candidates.values() for value in group["files"].values()),
                      "deleted_files": 0}
            if dry_run:
                return report
            # Persist new registrations even when cleanup is deferred. Never use
            # a log's old embedded date or mtime as its upload/retention date.
            self.write(state)
            if reason:
                return report
            for stem, group in candidates.items():
                # All names come from this scan, never from paths stored in JSON.
                if any(stamp(self.root / name) != value for name, value in group["files"].items()):
                    raise ValueError("files changed during cleanup; stopped")
                for name, value in group["files"].items():
                    target = self.root / name
                    if target.parent != self.root or target.resolve().parent != self.root or stamp(target) != value:
                        raise ValueError("cleanup boundary changed; stopped")
                    target.unlink()  # No recursion; source + known local sidecars only.
                    report["deleted_files"] += 1
                state["groups"].pop(stem, None)
            state["last_sweep"] = now
            self.write(state)
            return report


def live_analyzer():
    connection = http.client.HTTPConnection("127.0.0.1", 8731, timeout=5)
    try:
        connection.request("GET", "/api/aurora/maintenance")
        response = connection.getresponse()
        if response.status != 200:
            raise ValueError("analyzer has not enabled maintenance integration")
        data = json.loads(response.read(4096))
        if data.get("retention") != 1 or data.get("root") != str(DATA_ROOT):
            raise ValueError("unexpected maintenance integration")
        return int(data["pid"])
    finally:
        connection.close()


def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--initialize", action="store_true")
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--run-scheduled", action="store_true")
    args = parser.parse_args()
    maintenance = Maintenance()
    try:
        if args.initialize:
            print(maintenance.initialize())
            return
        try:
            pid = live_analyzer()
        except (OSError, ValueError, http.client.HTTPException):
            pid = None
        result = maintenance.cleanup(dry_run=args.dry_run, expected_pid=pid)
        print(json.dumps(result, ensure_ascii=False))
    except Busy:
        print(json.dumps({"skip_reason": "active_request", "deleted_files": 0}))


if __name__ == "__main__":
    main()
