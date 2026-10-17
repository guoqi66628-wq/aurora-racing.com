"""Opt-in launcher; keep the existing /opt/i3pro/run_service.py for rollback."""
from aurora_lowmem import install
from i3pro.server import serve

if __name__ == "__main__":
    install()
    serve(
        roots=["/srv/i3pro/data"], host="127.0.0.1", port=8731,
        cache_size=1, port_attempts=1,
        maths_root="/srv/i3pro", worksheets_root="/srv/i3pro",
    )
