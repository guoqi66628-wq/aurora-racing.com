"""HTTP-level auth contract tests; htpasswd is mocked unless installed locally."""
import http.client
import json
import shutil
import subprocess
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

import auth_service as auth

CLIENT_CONNECTION = http.client.HTTPConnection

class AuthFixture(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = auth.ThreadingHTTPServer(("127.0.0.1", 0), auth.AuthHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.password_file = Path(self.directory.name) / "htpasswd"
        self.password_file.write_text("member:fixture-hash\n", encoding="utf-8")
        self.file_patch = patch.object(auth, "PASSWORD_FILE", self.password_file)
        self.file_patch.start()
        self.addCleanup(self.file_patch.stop)
        auth.STATE = auth.AuthState()

    def request(self, method, path, payload=None, cookie=None, origin=auth.ORIGIN, navigation=None):
        connection = CLIENT_CONNECTION(*self.server.server_address, timeout=3)
        headers = {"Content-Type": "application/json", "Origin": origin}
        if navigation is not None:
            headers.update(navigation)
        if cookie:
            headers["Cookie"] = cookie
        body = json.dumps(payload) if payload is not None else None
        connection.request(method, path, body=body, headers=headers)
        response = connection.getresponse()
        result = response.status, dict(response.getheaders()), response.read()
        connection.close()
        return result

    def login(self, code=0, username="member"):
        with patch.object(auth.subprocess, "run", return_value=subprocess.CompletedProcess([], code)) as run:
            result = self.request("POST", "/auth/login", {"username": username, "password": "test-password"})
            return result, run


class AuthenticationTests(AuthFixture):
    def test_anonymous_session_and_check_are_denied(self):
        self.assertEqual(self.request("GET", "/auth/check")[0], 401)
        status, headers, body = self.request("GET", "/auth/session")
        self.assertEqual(status, 401)
        self.assertEqual(json.loads(body), {"authenticated": False})
        self.assertNotIn("WWW-Authenticate", headers)
        self.assertEqual(headers["Cache-Control"], "no-store")

    def test_login_cookie_and_authenticated_request(self):
        (status, headers, body), run = self.login()
        self.assertEqual(status, 200)
        self.assertTrue(json.loads(body)["authenticated"])
        cookie = headers["Set-Cookie"]
        for flag in ("HttpOnly", "Secure", "SameSite=Strict", "Path=/"):
            self.assertIn(flag, cookie)
        self.assertNotIn("Domain=", cookie)
        self.assertNotIn("test-password", str(run.call_args.args))
        self.assertEqual(run.call_args.kwargs["input"], "test-password\n")
        self.assertEqual(self.request("GET", "/auth/check", cookie=cookie)[0], 204)
        self.assertEqual(self.request("GET", "/auth/session", cookie=cookie)[0], 200)

    def test_wrong_password_and_missing_user_do_not_create_session(self):
        for code, username in ((3, "member"), (6, "missing")):
            (status, headers, _), _run = self.login(code, username)
            self.assertEqual(status, 401)
            self.assertNotIn("Set-Cookie", headers)
        self.assertFalse(auth.STATE.sessions)

    def test_each_workspace_open_requires_a_new_password_check(self):
        self.assertEqual(self.request("GET", "/auth/check-entry")[0], 401)
        (_, headers, _), _run = self.login()
        cookie = headers["Set-Cookie"]
        self.assertEqual(self.request("GET", "/auth/check-entry", cookie=cookie)[0], 204)
        # The same cookie cannot open or refresh the workspace a second time.
        self.assertEqual(self.request("GET", "/auth/check-entry", cookie=cookie)[0], 401)
        # Existing analysis/upload requests remain authenticated.
        self.assertEqual(self.request("GET", "/auth/check", cookie=cookie)[0], 204)
        # An incorrect password does not renew entry permission.
        (status, _, _), _run = self.login(3)
        self.assertEqual(status, 401)
        self.assertEqual(self.request("GET", "/auth/check-entry", cookie=cookie)[0], 401)
        # A new successful password check grants a new single-use entry.
        (_, fresh_headers, _), _run = self.login()
        self.assertEqual(self.request("GET", "/auth/check-entry", cookie=fresh_headers["Set-Cookie"])[0], 204)

    def test_cross_origin_login_and_logout_are_rejected(self):
        for path in ("/auth/login", "/auth/logout"):
            self.assertEqual(self.request("POST", path, {}, origin="https://example.com")[0], 403)
        self.assertEqual(self.request("POST", "/auth/login", {}, origin="")[0], 403)

    def test_share_entry_requires_password_and_preserves_api_session(self):
        self.assertEqual(self.request("GET", "/auth/check-page")[0], 401)
        (_, headers, _), _run = self.login()
        cookie = headers["Set-Cookie"]
        self.assertEqual(self.request("GET", "/auth/check-page", cookie=cookie)[0], 204)
        # Opening another shared URL from outside must require credentials again.
        self.assertEqual(self.request("GET", "/auth/check-page", cookie=cookie)[0], 401)
        self.assertEqual(self.request("GET", "/auth/check", cookie=cookie)[0], 204)

    def test_internal_scene_navigation_requires_valid_session_and_metadata(self):
        (_, headers, _), _run = self.login()
        cookie = headers["Set-Cookie"]
        self.assertEqual(self.request("GET", "/auth/check-entry", cookie=cookie)[0], 204)
        for referer in (auth.ORIGIN + "/", auth.ORIGIN + "/session/example?channels=a"):
            navigation = {"X-Telemetry-Referer": referer, "X-Telemetry-Fetch-Site": "same-origin"}
            self.assertEqual(self.request("GET", "/auth/check-page", cookie=cookie, navigation=navigation)[0], 204)
            self.assertEqual(self.request("GET", "/auth/check-page", navigation=navigation)[0], 401)
        for referer, site in ((auth.ORIGIN + "/login", "same-origin"),
                              (auth.ORIGIN + "/", "cross-site"),
                              (auth.ORIGIN + "/", "none"),
                              (auth.ORIGIN + "/", ""),
                              ("https://example.com/", "same-origin"),
                              (auth.ORIGIN + ".example.com/", "same-origin"),
                              ("https://[", "same-origin")):
            navigation = {"X-Telemetry-Referer": referer, "X-Telemetry-Fetch-Site": site}
            self.assertEqual(self.request("GET", "/auth/check-page", cookie=cookie, navigation=navigation)[0], 401)

    def test_shared_account_devices_have_independent_sessions(self):
        (_, first, _), _run = self.login()
        (_, second, _), _run = self.login()
        (_, third, _), _run = self.login()
        cookies = [headers["Set-Cookie"] for headers in (first, second, third)]
        self.assertEqual(len(set(cookies)), 3)
        for cookie in cookies:
            self.assertEqual(self.request("GET", "/auth/check-page", cookie=cookie)[0], 204)
        self.request("POST", "/auth/logout", cookie=first["Set-Cookie"])
        self.assertEqual(self.request("GET", "/auth/check", cookie=first["Set-Cookie"])[0], 401)
        self.assertEqual(self.request("GET", "/auth/check", cookie=second["Set-Cookie"])[0], 204)
        self.assertEqual(self.request("GET", "/auth/check", cookie=third["Set-Cookie"])[0], 204)

    def test_logout_revokes_cookie(self):
        (_, headers, _), _run = self.login()
        cookie = headers["Set-Cookie"]
        status, headers, _ = self.request("POST", "/auth/logout", cookie=cookie)
        self.assertEqual(status, 200)
        self.assertIn("Max-Age=0", headers["Set-Cookie"])
        self.assertEqual(self.request("GET", "/auth/check", cookie=cookie)[0], 401)

    def test_changed_or_removed_password_revokes_session(self):
        for content in ("member:new-hash\n", ""):
            self.password_file.write_text("member:fixture-hash\n", encoding="utf-8")
            (_, headers, _), _run = self.login()
            self.password_file.write_text(content, encoding="utf-8")
            self.assertEqual(self.request("GET", "/auth/check", cookie=headers["Set-Cookie"])[0], 401)

    def test_expired_and_forged_sessions_are_denied(self):
        (_, headers, _), _run = self.login()
        with patch.object(auth.time, "monotonic", return_value=10**12):
            self.assertEqual(self.request("GET", "/auth/check", cookie=headers["Set-Cookie"])[0], 401)
        self.assertEqual(self.request("GET", "/auth/check", cookie=f"{auth.COOKIE}=forged")[0], 401)

    def test_rate_limit(self):
        for _ in range(auth.ATTEMPTS):
            (status, _, _), _run = self.login(3)
            self.assertEqual(status, 401)
        (status, headers, _), _run = self.login(3)
        self.assertEqual(status, 429)
        self.assertIn("Retry-After", headers)

    def test_invalid_payloads_do_not_reach_verifier(self):
        with patch.object(auth.subprocess, "run") as run:
            for payload in ([], {}, {"username": "-x", "password": "x"}, {"username": "member", "password": "a\nb"}, {"username": "member", "password": "x" * 5000}):
                self.assertEqual(self.request("POST", "/auth/login", payload)[0], 400)
            run.assert_not_called()

    def test_unavailable_verifier_fails_closed(self):
        for error in (FileNotFoundError(), subprocess.TimeoutExpired("htpasswd", 10)):
            with patch.object(auth.subprocess, "run", side_effect=error):
                status, headers, _ = self.request("POST", "/auth/login", {"username": "member", "password": "test-password"})
                self.assertEqual(status, 503)
                self.assertNotIn("Set-Cookie", headers)

    @unittest.skipUnless(shutil.which("htpasswd"), "Real htpasswd not installed on this machine")
    def test_real_htpasswd(self):
        executable = shutil.which("htpasswd")
        subprocess.run([executable, "-ciB", str(self.password_file), "member"], input="test-password\n", text=True, check=True, capture_output=True)
        with patch.object(auth, "HTPASSWD", executable):
            self.assertEqual(self.request("POST", "/auth/login", {"username": "member", "password": "test-password"})[0], 200)
            self.assertEqual(self.request("POST", "/auth/login", {"username": "member", "password": "wrong"})[0], 401)


class PageProxyTests(AuthFixture):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.seen = []
        cls.page = ("<!doctype html><p>共享场次</p>".encode("utf-8") + b"x" * 200000)
        class Backend(auth.BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_GET(self):
                cls.seen.append((self.command, self.path, dict(self.headers)))
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(cls.page)))
                self.send_header("Set-Cookie", "backend-cookie=must-not-leak")
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(cls.page)

            do_HEAD = do_GET
        cls.backend = auth.ThreadingHTTPServer(("127.0.0.1", 0), Backend)
        cls.backend_thread = threading.Thread(target=cls.backend.serve_forever, daemon=True)
        cls.backend_thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.backend.shutdown()
        cls.backend.server_close()
        cls.backend_thread.join()
        super().tearDownClass()

    def setUp(self):
        super().setUp()
        self.seen.clear()
        self.target_patch = patch.object(auth, "PAGE_BACKEND", self.backend.server_address)
        self.target_patch.start()
        self.addCleanup(self.target_patch.stop)
        self.uri = "/session/80%E5%AE%9A%E9%80%9F%E6%BB%91%E8%A1%8C?channels=G+Force+Lat%2CAMKFR&layout=a%2Bb%3D%3D"

    def test_anonymous_share_redirect_preserves_encoded_path_and_query(self):
        status, headers, _ = self.request("GET", self.uri)
        self.assertEqual(status, 302)
        target = urlsplit(headers["Location"])
        self.assertEqual(target.path, "/login")
        self.assertEqual(parse_qs(target.query)["next"], [self.uri])
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertFalse(self.seen)
        self.assertNotIn("WWW-Authenticate", headers)

    def test_login_then_share_streams_same_page_and_strips_credentials(self):
        (_, headers, _), _ = self.login()
        cookie = headers["Set-Cookie"]
        status, headers, body = self.request("GET", self.uri, cookie=cookie,
                                             navigation={"Authorization": "Basic must-not-leak"})
        self.assertEqual(status, 200)
        self.assertEqual(body, self.page)
        self.assertEqual(self.seen[0][1], self.uri)
        self.assertNotIn("Cookie", self.seen[0][2])
        self.assertNotIn("Authorization", self.seen[0][2])
        self.assertNotIn("Set-Cookie", headers)
        self.assertEqual(headers["Referrer-Policy"], "same-origin")
        # Reopening externally asks again; current analysis APIs retain access.
        self.assertEqual(self.request("GET", self.uri, cookie=cookie)[0], 302)
        self.assertEqual(self.request("GET", "/auth/check", cookie=cookie)[0], 204)

    def test_internal_navigation_still_requires_valid_cookie(self):
        (_, headers, _), _ = self.login()
        cookie = headers["Set-Cookie"]
        self.request("GET", "/auth/check-entry", cookie=cookie)
        metadata = {"Referer": auth.ORIGIN + "/", "Sec-Fetch-Site": "same-origin"}
        self.assertEqual(self.request("GET", self.uri, cookie=cookie, navigation=metadata)[0], 200)
        self.assertEqual(self.request("GET", self.uri, navigation=metadata)[0], 302)
        self.assertEqual(self.request("GET", self.uri, cookie=cookie, navigation={
            "Referer": "https://example.com/", "Sec-Fetch-Site": "same-origin"})[0], 302)
        self.assertEqual(len(self.seen), 1)

    def test_head_has_no_body_and_keeps_content_length(self):
        self.assertEqual(self.request("HEAD", self.uri)[0], 302)
        (_, headers, _), _ = self.login()
        status, headers, body = self.request("HEAD", self.uri, cookie=headers["Set-Cookie"])
        self.assertEqual(status, 200)
        self.assertEqual(body, b"")
        self.assertEqual(int(headers["Content-Length"]), len(self.page))
        self.assertEqual(self.seen[0][0], "HEAD")

    def test_invalid_scene_urls_never_reach_backend(self):
        for uri in ("/session/", "/session/../api", "/session/%2Fetc", "/session/%5Cname",
                    "/session/a/b", "/session/%00", "/session/a#fragment", "/session/%FF"):
            self.assertEqual(self.request("GET", uri)[0], 400, uri)
        for uri in ("//example.com/session/a", "https://example.com/session/a", "/api/sessions",
                    "/session/a\r\nX: injected"):
            self.assertFalse(auth.valid_scene_uri(uri), uri)
        self.assertFalse(self.seen)

    def test_forged_expired_and_revoked_sessions_redirect_without_backend(self):
        self.assertEqual(self.request("GET", self.uri, cookie=f"{auth.COOKIE}=forged")[0], 302)
        (_, headers, _), _ = self.login()
        cookie = headers["Set-Cookie"]
        with patch.object(auth.time, "monotonic", return_value=10**12):
            self.assertEqual(self.request("GET", self.uri, cookie=cookie)[0], 302)
        (_, headers, _), _ = self.login()
        cookie = headers["Set-Cookie"]
        self.request("POST", "/auth/logout", cookie=cookie)
        self.assertEqual(self.request("GET", self.uri, cookie=cookie)[0], 302)
        self.assertFalse(self.seen)

    def test_busy_does_not_consume_entry(self):
        (_, headers, _), _ = self.login()
        cookie = headers["Set-Cookie"]
        slots = auth.STATE.page_slots
        for _ in range(4):
            self.assertTrue(slots.acquire(blocking=False))
        try:
            status, headers, _ = self.request("GET", self.uri, cookie=cookie)
            self.assertEqual(status, 503)
            self.assertEqual(headers["Retry-After"], "3")
        finally:
            for _ in range(4):
                slots.release()
        self.assertEqual(self.request("GET", self.uri, cookie=cookie)[0], 200)

    def test_backend_unavailable_returns_502(self):
        (_, headers, _), _ = self.login()
        with patch.object(auth.http.client, "HTTPConnection") as factory:
            factory.return_value.getresponse.side_effect = ConnectionRefusedError
            status, _, body = self.request("GET", self.uri, cookie=headers["Set-Cookie"])
            self.assertEqual(status, 502)
            self.assertEqual(json.loads(body)["error"], "analyzer_unavailable")

    def test_missing_password_file_fails_closed(self):
        (_, headers, _), _ = self.login()
        self.password_file.unlink()
        self.assertEqual(self.request("GET", self.uri, cookie=headers["Set-Cookie"])[0], 503)
        self.assertFalse(self.seen)

    def test_stream_reads_are_bounded_and_backend_is_fixed(self):
        (_, headers, _), _ = self.login()
        with patch.object(auth.http.client, "HTTPConnection") as factory:
            connection = factory.return_value
            response = connection.getresponse.return_value
            response.status = 200
            response.getheader.side_effect = lambda name, default=None: {
                "Content-Type": "text/html", "Content-Length": str(auth.PAGE_CHUNK),
            }.get(name, default)
            response.read.side_effect = [b"x" * auth.PAGE_CHUNK, b""]
            status, _, body = self.request("GET", self.uri, cookie=headers["Set-Cookie"])
            self.assertEqual(status, 200)
            self.assertEqual(len(body), auth.PAGE_CHUNK)
            factory.assert_called_once_with(*self.backend.server_address, timeout=300)
            self.assertTrue(response.read.call_args_list)
            for call in response.read.call_args_list:
                self.assertEqual(call.args, (auth.PAGE_CHUNK,))
            connection.close.assert_called_once()


if __name__ == "__main__":
    unittest.main()
