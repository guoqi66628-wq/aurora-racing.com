"""Package the optional activity-aware retention update without any user data."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
source = root / "deploy" / "i3pro-lowmem"
names = ("aurora_lowmem.py", "run_service_lowmem.py", "retention.py", "activity.js",
         "test_lowmem.py", "test_retention.py", "aurora-i3pro-cleanup.service",
         "aurora-i3pro-cleanup.timer", "LICENSE")
files = {name: source / name for name in names}
files["I3PRO_RETENTION_SETUP.md"] = root / "docs" / "I3PRO_RETENTION_SETUP.md"
destination = root / "build" / "i3pro-retention.zip"
destination.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(destination, "w", ZIP_DEFLATED) as archive:
    for name, path in files.items():
        archive.writestr(name, path.read_bytes())
with ZipFile(destination) as archive:
    assert sorted(archive.namelist()) == sorted(files)
    for name, path in files.items():
        assert archive.read(name) == path.read_bytes()
    assert archive.testzip() is None
print(f"Packaged and verified {len(files)} files: {destination}")
