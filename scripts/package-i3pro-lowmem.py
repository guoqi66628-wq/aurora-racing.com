"""Package only the reviewed source files; no telemetry or credentials."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
source = root / "deploy" / "i3pro-lowmem"
files = {name: source / name for name in (
    "aurora_lowmem.py", "run_service_lowmem.py", "test_lowmem.py",
    "benchmark_lowmem.py", "LICENSE",
    "retention.py", "activity.js", "test_retention.py",
)}
files["I3PRO_LOWMEM_SETUP.md"] = root / "docs" / "I3PRO_LOWMEM_SETUP.md"
destination = root / "build" / "i3pro-lowmem-576.zip"
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
