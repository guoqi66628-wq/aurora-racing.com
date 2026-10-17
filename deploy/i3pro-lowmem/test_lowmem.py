"""Synthetic regression checks; never reads the team's data directory."""
import concurrent.futures
import gc
import http.client
import json
import os
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import quote
from http.server import ThreadingHTTPServer

import numpy as np
from i3pro import csvlog, library, server, txtlog
import aurora_lowmem as adapter
from retention import Maintenance, file_lock

ORIGINAL_CONVERTER = csvlog.session_from_frame
adapter.install()


class LowMemoryTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)

    def tearDown(self):
        gc.collect()
        self.directory.cleanup()

    def make_csv(self, name="sample.csv", content=None):
        path = self.root / name
        path.write_text(content or "Time,GPS Speed,G Force Lat,Sensor\n0,36,0.1,12\n0.01,37,-0.2,\n0.02,38,0.3,14\n", encoding="utf-8")
        return path

    def load_original(self, path, **kwargs):
        with patch.object(txtlog, "read_frame", adapter._original_read_frame), patch.object(csvlog, "session_from_frame", ORIGINAL_CONVERTER):
            return txtlog.read_text_session(path, **kwargs)

    def compare(self, path, **kwargs):
        original = self.load_original(path, **kwargs)
        with patch.object(adapter, "LARGE_FILE", 0):
            actual = txtlog.read_text_session(path, **kwargs)
        self.assertEqual([c.name for c in original.channels], [c.name for c in actual.channels])
        self.assertEqual(original.sample_rate, actual.sample_rate)
        self.assertEqual(original.report, actual.report)
        for channel in original.channels:
            np.testing.assert_array_equal(original.values(channel.name), actual.values(channel.name))
        return actual

    def test_numeric_values_units_nans_and_aliases_match(self):
        self.compare(self.make_csv())

    def test_precision_and_large_integers_match(self):
        self.compare(self.make_csv(content="Time,Sensor,Large\n0,1.23456789012345,9007199254740993\n.01,-0.0000000123456789,9007199254740995\n.02,1000000.00000001,9007199254740997\n"))

    def test_generated_time_matches(self):
        self.compare(self.make_csv(content="Sensor,Other\n1,2\n3,4\n5,6\n"), generate_rate=100)

    def test_semicolon_and_units_match(self):
        self.compare(self.make_csv(content="Time;GPS Speed;Sensor\ns;km/h;V\n0;36;1.23\n.01;37;2.34\n.02;38;3.45\n"), delimiter=";")

    def test_preview_and_small_mixed_text_unchanged(self):
        path = self.make_csv(content="Time,Sensor,Label\n0,2,first\n.01,3,second\n.02,4,third\n")
        self.assertEqual(len(txtlog.read_text_session(path).channels), 1)
        with patch.object(adapter, "LARGE_FILE", 0):
            self.assertTrue(txtlog.preview(path)["ready"])
            with self.assertRaisesRegex(ValueError, "低内存"):
                txtlog.read_text_session(path)

    def test_invalid_large_time_rejected(self):
        path = self.make_csv(content="Time,Sensor\n0,1\n,2\n.02,3\n")
        with patch.object(adapter, "LARGE_FILE", 0), self.assertRaisesRegex(ValueError, "时间列"):
            txtlog.read_text_session(path)

    def test_matrix_and_disk_limits(self):
        path = self.make_csv()
        with patch.object(adapter, "LARGE_FILE", 0), patch.object(adapter, "MAX_MATRIX", 1), self.assertRaisesRegex(adapter.TableLimitError, "数值矩阵"):
            txtlog.read_text_session(path)
        with patch.object(adapter, "LARGE_FILE", 0), patch.object(adapter, "DISK_RESERVE", 10**30), self.assertRaisesRegex(ValueError, "磁盘"):
            txtlog.read_text_session(path)

    def test_matrix_boundary_and_capacity_error_are_precise(self):
        path = self.make_csv()
        with patch.object(adapter, "LARGE_FILE", 0), patch.object(adapter, "MAX_MATRIX", 3 * 4 * 8):
            log = txtlog.read_text_session(path)
            self.assertEqual(len(log.values("GPS Speed")), 3)
        with patch.object(adapter, "LARGE_FILE", 0), patch.object(adapter, "MAX_MATRIX", 3 * 4 * 8 - 1):
            with self.assertRaises(adapter.TableLimitError) as failure:
                txtlog.read_text_session(path)
        self.assertIn("3 行 × 4 列", str(failure.exception))
        self.assertNotIn("移除文字列", str(failure.exception))

    def test_row_limit_is_reported_separately(self):
        path = self.make_csv()
        with patch.object(adapter, "LARGE_FILE", 0), patch.object(adapter, "MAX_ROWS", 2):
            with self.assertRaises(adapter.TableLimitError) as failure:
                txtlog.read_text_session(path)
        self.assertIn("超过 2 行限制", str(failure.exception))
        self.assertNotIn("数值矩阵", str(failure.exception))

    def test_columns_retain_mapping_without_matrix_copy(self):
        path = self.make_csv()
        with patch.object(adapter, "LARGE_FILE", 0):
            frame = txtlog.read_frame(path, encoding="utf-8", delimiter=",", skip=1, limit=None)
            log = csvlog.session_from_frame(path, [["Time", "GPS Speed", "G Force Lat", "Sensor"]], frame, header=0, unit_row=False)
        self.assertTrue(np.shares_memory(frame.to_numpy(), log.values("GPS Speed")))
        del frame
        gc.collect()
        np.testing.assert_array_equal(log.values("GPS Speed"), [36, 37, 38])

    def test_listing_does_not_parse_and_escapes_names(self):
        self.make_csv("a&b.csv")
        instance = adapter.LowMemoryLibrary([self.root])
        with patch.object(library, "open_session", side_effect=AssertionError("listing parsed a scene")):
            self.assertTrue(instance.listing()[0]["pending"])
            page = server.index_page(instance)
        self.assertIn("a&amp;b", page)
        self.assertIn("/session/a%26b", page)
        self.assertIn("点击后加载分析", page)

    def test_previous_scene_evicted_before_loading_next(self):
        self.make_csv("one.csv")
        self.make_csv("two.csv")
        instance = adapter.LowMemoryLibrary([self.root])
        instance.get("one")
        original = library.open_session
        def check(path, **kwargs):
            self.assertEqual(len(instance._cache), 0)
            return original(path, **kwargs)
        with patch.object(library, "open_session", side_effect=check):
            instance.get("two")
        self.assertEqual(len(instance._cache), 1)
        instance.drop_loaded()

    def test_source_version_guard(self):
        adapter.verify_upstream()
        with patch.dict(adapter.HASHES, csvlog="invalid"), self.assertRaises(RuntimeError):
            adapter.verify_upstream()

    def test_unsupported_large_excel_guard_applies_to_import(self):
        path = self.root / "example.xlsx"
        path.write_bytes(b"not really an excel file")
        with patch.object(adapter, "LARGE_FILE", 0), self.assertRaisesRegex(ValueError, "Excel"):
            csvlog.open_session(path)

    def test_busy_upload_is_rejected_without_reading_body(self):
        instance = adapter.LowMemoryLibrary([self.root])
        with patch.object(adapter.threading, "BoundedSemaphore") as semaphore:
            semaphore.return_value.acquire.return_value = False
            handler = adapter.make_handler(instance)
        request = object.__new__(handler)
        sent = []
        request.send = sent.append
        # No rfile exists: the rejection must not read an unbounded upload body.
        request.dispatch("PUT")
        self.assertEqual(sent[0].status, 503)
        self.assertTrue(sent[0].close)
        self.assertIn(("Retry-After", "3"), sent[0].headers)

    def test_maintenance_probe_heartbeat_and_cleanup_exclusion_over_http(self):
        data = self.root / "data"
        data.mkdir()
        (data / "sample.csv").write_text("Time,Sensor\n0,1\n.01,2\n.02,3\n", encoding="utf-8")
        now = [1000000000]
        maintenance = Maintenance(data, self.root, clock=lambda: now[0])
        maintenance.initialize()
        instance = adapter.LowMemoryLibrary([data], maths_root=self.root, worksheets_root=self.root)
        handler = adapter.make_handler(instance, maintenance=maintenance)
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        def request(path):
            connection = http.client.HTTPConnection("127.0.0.1", httpd.server_port, timeout=5)
            try:
                connection.request("GET", path)
                response = connection.getresponse()
                return response.status, response.read()
            finally:
                connection.close()
        try:
            now[0] += 100
            status, body = request("/api/aurora/maintenance")
            self.assertEqual(status, 200)
            self.assertEqual(json.loads(body)["pid"], os.getpid())
            self.assertEqual(maintenance.read()["last_activity"], now[0] - 100)
            self.assertEqual(request("/api/aurora/activity")[0], 204)
            self.assertEqual(maintenance.read()["last_activity"], now[0])
            for path in ("/", "/session/sample"):
                status, body = request(path)
                self.assertEqual(status, 200)
                self.assertEqual(body.count(b'id="aurora-activity"'), 1)
                self.assertNotIn(b"/auth/logout", body)
            # Readiness is serialized behind the previous response's final state
            # flush, but does not itself hold the maintenance file lock.
            self.assertEqual(request("/api/aurora/maintenance")[0], 200)
            with file_lock(maintenance.lock_path):
                self.assertEqual(request("/session/sample")[0], 503)
            self.assertEqual(request("/session/sample")[0], 200)
        finally:
            httpd.shutdown()
            httpd.server_close()
            thread.join()
            instance.drop_loaded()

    def test_http_home_session_import_and_serialization(self):
        self.make_csv()
        instance = adapter.LowMemoryLibrary([self.root], maths_root=self.root, worksheets_root=self.root)
        handler = adapter.make_handler(instance)
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        def request(path, method="GET", body=None):
            conn = http.client.HTTPConnection("127.0.0.1", httpd.server_port, timeout=30)
            try:
                conn.request(method, path, body=body)
                response = conn.getresponse()
                return response.status, response.read()
            finally:
                conn.close()
        try:
            status, body = request("/")
            self.assertEqual(status, 200)
            self.assertIn(b"/session/sample", body)
            with patch.object(adapter, "LARGE_FILE", 0):
                status, body = request("/session/sample?channels=GPS%20Speed")
                self.assertEqual(status, 200, body[:300])
                self.assertIn(b"GPS Speed", body)
                status, body = request("/api/import?name=uploaded.csv", "PUT", b"Time,Sensor\n0,1\n.01,2\n.02,3\n")
                self.assertEqual(status, 200, body)
                token = json.loads(body)["token"]
                status, body = request("/api/import/commit?token=" + quote(token), "POST", b"")
                self.assertEqual(status, 200, body)
                self.assertNotIn("warning", json.loads(body))
                self.assertFalse(instance._cache)
            active = 0
            maximum = 0
            def slow_route(self, parts, query, method):
                nonlocal active, maximum
                active += 1
                maximum = max(maximum, active)
                time.sleep(0.04)
                active -= 1
                return adapter.Response(200, b"ok")
            with patch.object(handler, "route", slow_route):
                with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
                    results = list(pool.map(lambda _: request("/"), range(4)))
                self.assertTrue(all(s == 200 for s, _ in results))
                self.assertEqual(maximum, 1)
        finally:
            httpd.shutdown()
            httpd.server_close()
            thread.join()
            instance.drop_loaded()


if __name__ == "__main__":
    unittest.main()
