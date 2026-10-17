"""Deletion tests operate only in a newly created temporary directory."""
import json
import os
from pathlib import Path
import tempfile
import unittest

from retention import Maintenance, Busy, PERIOD, IDLE_GRACE, file_lock


class RetentionTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.base = Path(self.directory.name).resolve()
        self.root = self.base / "data"
        self.root.mkdir()
        self.now = 1000000000
        self.manager = Maintenance(self.root, self.base, clock=lambda: self.now)

    def tearDown(self):
        self.directory.cleanup()

    def source(self, name="run.csv"):
        path = self.root / name
        path.write_text("Time,Speed\n0,1\n.01,2\n", encoding="utf-8")
        return path

    def initialize(self):
        self.manager.initialize()
        self.manager.begin_runtime(123)

    def test_existing_files_receive_full_retention_despite_old_mtime(self):
        source = self.source()
        os.utime(source, (1, 1))
        self.initialize()
        self.now += PERIOD - 1
        report = self.manager.cleanup(False, 123)
        self.assertEqual(report["skip_reason"], "not_due")
        self.assertTrue(source.exists())

    def test_expired_family_is_removed_but_global_and_unrelated_files_remain(self):
        source = self.source()
        sidecar = self.root / "run.notes.json"
        sidecar.write_text("[]", encoding="utf-8")
        unrelated = self.root / "other.json"
        unrelated.write_text("{}", encoding="utf-8")
        dbc = self.root / "dbc"
        dbc.mkdir()
        nested = dbc / "keep.csv"
        nested.write_text("keep", encoding="utf-8")
        global_maths = self.base / "global.json"
        global_maths.write_text("{}", encoding="utf-8")
        self.initialize()
        self.now += PERIOD + 1
        report = self.manager.cleanup(False, 123)
        self.assertEqual(report["deleted_files"], 2)
        self.assertFalse(source.exists())
        self.assertFalse(sidecar.exists())
        self.assertTrue(unrelated.exists() and nested.exists() and global_maths.exists())

    def test_dry_run_never_deletes_or_changes_state(self):
        source = self.source()
        self.initialize()
        before = self.manager.state_path.read_bytes()
        self.now += PERIOD + 1
        report = self.manager.cleanup(True, 123)
        self.assertEqual(report["files"], [source.name])
        self.assertEqual(report["deleted_files"], 0)
        self.assertTrue(source.exists())
        self.assertEqual(before, self.manager.state_path.read_bytes())

    def test_recent_activity_defers_without_resetting_due_date(self):
        source = self.source()
        self.initialize()
        self.now += PERIOD + 1
        with self.manager.request():
            pass
        due = self.manager.read()["last_sweep"]
        report = self.manager.cleanup(False, 123)
        self.assertEqual(report["skip_reason"], "recent_activity")
        self.assertEqual(self.manager.read()["last_sweep"], due)
        self.assertTrue(source.exists())
        self.now += IDLE_GRACE + 1
        self.assertEqual(self.manager.cleanup(False, 123)["deleted_files"], 1)

    def test_active_request_and_cleanup_are_mutually_exclusive(self):
        self.source()
        self.initialize()
        self.now += PERIOD + 1
        with self.manager.request():
            with self.assertRaises(Busy):
                self.manager.cleanup(False, 123)
        with file_lock(self.manager.lock_path):
            with self.assertRaises(Busy):
                with self.manager.request():
                    self.fail("request ran while cleaner held lock")

    def test_new_upload_and_replacement_receive_new_retention(self):
        original = self.source()
        self.initialize()
        self.now += PERIOD + 1
        with self.manager.request(register=True):
            self.source("new.csv")
            original.write_text("Time,Speed\n0,10\n1,11\n2,12\n", encoding="utf-8")
        self.now += IDLE_GRACE + 1
        self.assertEqual(self.manager.cleanup(False, 123)["deleted_files"], 0)
        self.assertTrue(original.exists())
        self.assertEqual(len(self.manager.read()["groups"]), 2)

    def test_missing_integration_pid_prevents_deletion(self):
        source = self.source()
        self.initialize()
        self.now += PERIOD + 1
        for pid in (None, 999):
            self.assertEqual(self.manager.cleanup(False, pid)["skip_reason"], "analyzer_not_verified")
        self.assertTrue(source.exists())

    def test_corrupt_state_fails_closed(self):
        source = self.source()
        self.initialize()
        self.manager.state_path.write_text('{"broken":', encoding="utf-8")
        self.now += PERIOD + 1
        with self.assertRaises(ValueError):
            self.manager.cleanup(False, 123)
        self.assertTrue(source.exists())

    def test_hardlinks_and_can_families_are_retained(self):
        source = self.source()
        outside = self.base / "outside.csv"
        os.link(source, outside)
        can = self.source("can.csv")
        associated = self.source("part2.csv")
        (self.root / "can.can.json").write_text(json.dumps({"sources": ["can.csv", "part2.csv"]}), encoding="utf-8")
        raw = self.source("raw.csv")
        raw.write_bytes(b'header\n0,="clock",1,2,3,4,5,6,7,8\n')
        self.initialize()
        self.now += PERIOD + 1
        self.assertEqual(self.manager.cleanup(False, 123)["deleted_files"], 0)
        self.assertTrue(all(path.exists() for path in (source, outside, can, associated, raw)))

    def test_missing_sidecar_only_never_becomes_a_deletion_target(self):
        (self.root / "orphan.notes.json").write_text("[]", encoding="utf-8")
        self.initialize()
        self.now += PERIOD + 1
        self.assertEqual(self.manager.cleanup(False, 123)["deleted_files"], 0)
        self.assertTrue((self.root / "orphan.notes.json").exists())

    def test_reinitialize_preserves_dates_and_second_sweep_waits_15_days(self):
        self.source()
        self.initialize()
        original = self.manager.read()
        self.now += PERIOD + 1
        self.manager.initialize()
        self.assertEqual(self.manager.read(), original)
        self.manager.cleanup(False, 123)
        self.assertEqual(self.manager.cleanup(False, 123)["skip_reason"], "not_due")


if __name__ == "__main__":
    unittest.main()
