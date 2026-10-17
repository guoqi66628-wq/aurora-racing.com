"""Build and verify the incremental shared-page authentication update."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
source = root / "deploy" / "telemetry"
files = {name: source / name for name in (
    "auth_service.py", "test_auth_service.py", "nginx-share-proxy.conf",
)}
files["I3PRO_SHARE_PROXY_SETUP.md"] = root / "docs" / "I3PRO_SHARE_PROXY_SETUP.md"
destination = root / "build" / "telemetry-share-proxy.zip"
destination.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(destination, "w", ZIP_DEFLATED) as archive:
    for name, path in files.items():
        archive.writestr(name, path.read_bytes())
with ZipFile(destination) as archive:
    assert sorted(archive.namelist()) == sorted(files)
    for name, path in files.items():
        assert archive.read(name) == path.read_bytes(), name
    assert archive.testzip() is None
print(f"Packaged and verified {len(files)} files: {destination}")
