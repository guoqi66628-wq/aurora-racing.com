"""Loopback-only form authentication for the existing i3pro htpasswd file.

Python 3.11 standard library only. Nginx terminates HTTPS. Shared HTML pages
are authenticated here and streamed from a fixed loopback backend; existing
API/root checks remain compatible. Passwords use htpasswd stdin, never argv.
"""

import hashlib
import http.client
import json
import os
import secrets
import subprocess
import threading
import time
from http.cookies import CookieError, SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote, quote

ORIGIN = "https://telemetry.aurora-racing.com"
COOKIE = "__Host-aurora_telemetry"
PASSWORD_FILE = Path(os.environ.get("TELEMETRY_PASSWORD_FILE", "/etc/i3pro-auth/htpasswd"))
HTPASSWD = os.environ.get("TELEMETRY_HTPASSWD", "/usr/bin/htpasswd")
SESSION_TTL = 8 * 60 * 60
MAX_SESSIONS = 4096
MAX_CLIENTS = 4096
ATTEMPTS = 10
ATTEMPT_WINDOW = 600
PAGE_BACKEND = ("127.0.0.1", 8731)
PAGE_CHUNK = 64 * 1024


class AuthState:
    def __init__(self):
        self.sessions = {}
        self.attempts = {}
        self.lock = threading.Lock()
        self.verifiers = threading.BoundedSemaphore(4)
        self.page_slots = threading.BoundedSemaphore(4)

    def allow_attempt(self, address):
        now = time.monotonic()
        with self.lock:
            self.attempts = {key: value for key, value in self.attempts.items() if value[1] > now}
            count, reset = self.attempts.get(address, (0, now + ATTEMPT_WINDOW))
            if count >= ATTEMPTS or (address not in self.attempts and len(self.attempts) >= MAX_CLIENTS):
                return False
            self.attempts[address] = (count + 1, reset)
            return True

    def fingerprint(self, username):
        for line in PASSWORD_FILE.read_text(encoding="utf-8").splitlines():
            if line.partition(":")[0] == username:
                return hashlib.sha256(line.encode("utf-8")).hexdigest()
        return None

    def create_session(self, username, fingerprint):
        now = time.monotonic()
        token = secrets.token_urlsafe(32)
        with self.lock:
            self.sessions = {key: value for key, value in self.sessions.items() if value[1] > now}
            if len(self.sessions) >= MAX_SESSIONS:
                return None
            # A successful password check permits exactly one workspace entry.
            # API access remains valid after that entry is consumed.
            self.sessions[token] = (username, now + SESSION_TTL, fingerprint, True)
        return token

    def authenticated(self, token):
        with self.lock:
            session = self.sessions.get(token)
        if session is None:
            return False
        username, expires, fingerprint, _entry_available = session
        if expires <= time.monotonic() or self.fingerprint(username) != fingerprint:
            self.logout(token)
            return False
        return True

    def enter_workspace(self, token):
        if not self.authenticated(token):
            return False
        with self.lock:
            session = self.sessions.get(token)
            if session is None or not session[3]:
                return False
            self.sessions[token] = (*session[:3], False)
            return True

    def logout(self, token):
        with self.lock:
            self.sessions.pop(token, None)


STATE = AuthState()


def is_internal_navigation(referer, fetch_site):
    """Navigation UX only: a valid auth session is always required separately.

    External links, bookmarks, a different browser, and missing metadata require
    fresh credentials. Normal links inside an authenticated workspace may proceed.
    These headers are not a substitute for authenticating the cookie.
    """
    if fetch_site != "same-origin":
        return False
    try:
        url = urlsplit(referer)
        path = unquote(url.path)
        return (f"{url.scheme}://{url.netloc}" == ORIGIN
                and (path == "/" or path.startswith("/session/")))
    except ValueError:
        return False


def valid_scene_uri(uri):
    """Only a single local scene page, with its original query kept verbatim."""
    if len(uri) > 8192 or not uri.isascii() or any(ord(c) <= 32 or ord(c) == 127 for c in uri):
        return False
    try:
        parsed = urlsplit(uri)
        path = unquote(parsed.path, errors="strict")
        if parsed.scheme or parsed.netloc or parsed.fragment or "\\" in uri or "\\" in path:
            return False
        if any(ord(c) < 32 or ord(c) == 127 for c in path):
            return False
        parts = path.split("/")
        # Match the login page's allowed return targets, including trailing slash.
        return (len(parts) in (3, 4) and parts[:2] == ["", "session"]
                and parts[2] not in ("", ".", "..")
                and (len(parts) == 3 or parts[3] == ""))
    except (ValueError, UnicodeError):
        return False


class AuthHandler(BaseHTTPRequestHandler):
    server_version = "AuroraAuth"
    sys_version = ""

    def log_message(self, _format, *args):
        # Request bodies, cookies, usernames, and credentials must not be logged.
        pass

    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def reply(self, status, body=None, cookie=None, headers=()):
        data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else b""
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(data)))
        if cookie is not None:
            self.send_header("Set-Cookie", cookie)
        if status == 429:
            self.send_header("Retry-After", str(ATTEMPT_WINDOW))
        for name, value in headers:
            self.send_header(name, value)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def token(self):
        cookies = SimpleCookie()
        try:
            cookies.load(self.headers.get("Cookie", ""))
        except CookieError:
            return ""
        value = cookies.get(COOKIE)
        return value.value if value else ""

    def do_GET(self):
        if self.path.startswith("/session/"):
            self.scene_page()
            return
        if self.path not in ("/auth/check", "/auth/check-entry", "/auth/check-page", "/auth/session"):
            self.reply(404, {"error": "not_found"})
            return
        try:
            token = self.token()
            if self.path == "/auth/check-entry":
                authenticated = STATE.enter_workspace(token)
            elif self.path == "/auth/check-page":
                authenticated = STATE.enter_workspace(token) or (
                    STATE.authenticated(token) and is_internal_navigation(
                        self.headers.get("X-Telemetry-Referer", ""),
                        self.headers.get("X-Telemetry-Fetch-Site", ""),
                    )
                )
            else:
                authenticated = STATE.authenticated(token)
        except (OSError, UnicodeError):
            self.reply(503, {"error": "authentication_unavailable"})
            return
        if self.path in ("/auth/check", "/auth/check-entry", "/auth/check-page"):
            self.reply(204 if authenticated else 401)
        else:
            self.reply(200 if authenticated else 401, {"authenticated": authenticated})

    def do_HEAD(self):
        self.do_GET()

    def scene_page(self):
        if not valid_scene_uri(self.path):
            self.reply(400, {"error": "invalid_scene_url"})
            return
        if self.headers.get("Transfer-Encoding") or self.headers.get("Content-Length", "0") != "0":
            self.reply(400, {"error": "page_body_not_allowed"})
            return
        # Reserve before consuming the one-use entry, so a busy response can retry.
        state = STATE
        if not state.page_slots.acquire(blocking=False):
            self.reply(503, {"error": "page_proxy_busy"}, headers=(("Retry-After", "3"),))
            return
        backend = None
        started = False
        try:
            try:
                token = self.token()
                allowed = state.enter_workspace(token) or (
                    state.authenticated(token) and is_internal_navigation(
                        self.headers.get("Referer", ""), self.headers.get("Sec-Fetch-Site", "")))
            except (OSError, UnicodeError):
                self.reply(503, {"error": "authentication_unavailable"})
                return
            if not allowed:
                self.reply(302, headers=(("Location", "/login?next=" + quote(self.path, safe="")),))
                return
            backend = http.client.HTTPConnection(*PAGE_BACKEND, timeout=300)
            # Fixed backend and explicit headers: no cookies, passwords, or client
            # proxy/authorization headers are forwarded to the analyzer.
            backend.request(self.command, self.path, headers={
                "Host": "telemetry.aurora-racing.com", "Connection": "close",
                "Accept-Encoding": "identity",
            })
            response = backend.getresponse()
            length = response.getheader("Content-Length")
            if length is not None and (not length.isdigit() or int(length) < 0):
                raise http.client.HTTPException("invalid upstream length")
            started = True
            self.send_response(response.status)
            self.send_header("Content-Type", response.getheader("Content-Type", "application/octet-stream"))
            if length is not None:
                self.send_header("Content-Length", length)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Referrer-Policy", "same-origin")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            if self.command != "HEAD":
                while block := response.read(PAGE_CHUNK):
                    self.wfile.write(block)
        except (OSError, http.client.HTTPException, ValueError):
            # Once headers have been sent, terminate a failed stream instead of
            # appending an error JSON body to a partial HTML response.
            if not started:
                self.reply(502, {"error": "analyzer_unavailable"})
        finally:
            self.close_connection = True
            if backend is not None:
                backend.close()
            state.page_slots.release()

    def do_POST(self):
        if self.path not in ("/auth/login", "/auth/logout"):
            self.reply(404, {"error": "not_found"})
            return
        if self.headers.get("Origin") != ORIGIN:
            self.reply(403, {"error": "invalid_origin"})
            return
        if self.path == "/auth/logout":
            STATE.logout(self.token())
            self.reply(200, {"authenticated": False}, f"{COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict")
            return
        address = self.headers.get("X-Real-IP", self.client_address[0])
        if not STATE.allow_attempt(address):
            self.reply(429, {"error": "too_many_attempts"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 4096 or self.headers.get_content_type() != "application/json":
                # Drain only a small rejected body so closing the socket does not
                # reset it before the client receives our 400 response. Nginx
                # separately rejects login requests larger than 4 KiB.
                if 0 < length <= 8192:
                    self.rfile.read(length)
                raise ValueError
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError
            username, password = payload.get("username"), payload.get("password")
            if not isinstance(username, str) or not isinstance(password, str):
                raise ValueError
            if (not username or username.startswith("-") or not password
                    or len(username.encode("utf-8")) > 255 or len(password.encode("utf-8")) > 255
                    or any(char in username for char in ":\r\n\0")
                    or any(char in password for char in "\r\n\0")):
                raise ValueError
        except (ValueError, UnicodeError, TimeoutError):
            self.reply(400, {"error": "invalid_request"})
            return

        if not STATE.verifiers.acquire(blocking=False):
            self.reply(429, {"error": "too_many_attempts"})
            return
        try:
            fingerprint = STATE.fingerprint(username)
            verified = subprocess.run(
                [HTPASSWD, "-vi", str(PASSWORD_FILE), username],
                input=password + "\n", text=True, encoding="utf-8", timeout=10,
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False,
            )
            if verified.returncode == 3 or fingerprint is None:
                self.reply(401, {"authenticated": False})
                return
            if verified.returncode != 0:
                self.reply(503, {"error": "authentication_unavailable"})
                return
            if STATE.fingerprint(username) != fingerprint:
                self.reply(401, {"authenticated": False})
                return
            token = STATE.create_session(username, fingerprint)
            if token is None:
                self.reply(503, {"error": "authentication_unavailable"})
                return
            self.reply(200, {"authenticated": True}, f"{COOKIE}={token}; Path=/; Max-Age={SESSION_TTL}; HttpOnly; Secure; SameSite=Strict")
        except (OSError, UnicodeError, subprocess.TimeoutExpired):
            self.reply(503, {"error": "authentication_unavailable"})
        finally:
            STATE.verifiers.release()


if __name__ == "__main__":
    # Check prerequisites at startup; do not silently accept a missing password file.
    PASSWORD_FILE.read_text(encoding="utf-8")
    if not Path(HTPASSWD).is_file():
        raise SystemExit("htpasswd executable unavailable")
    ThreadingHTTPServer(("127.0.0.1", 8732), AuthHandler).serve_forever()
