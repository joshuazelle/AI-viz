"""Serve the anonymous public page locally."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


def make_server(page: Path, port: int = 8765) -> ThreadingHTTPServer:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            host = self.headers.get("Host", "")
            allowed = {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}
            if host not in allowed:
                self.send_error(403)
                return
            route = urlsplit(self.path).path
            if route in ("/", "/index.html"):
                target, content_type = page, "text/html; charset=utf-8"
            else:
                self.send_error(404)
                return
            try:
                content = target.read_bytes()
            except FileNotFoundError:
                self.send_error(404, "Local file unavailable")
                return
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(content)

        def log_message(self, format, *args):
            pass

    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


def serve(page: Path, port: int) -> None:
    if not page.is_file():
        raise FileNotFoundError("Build the essay first: python -m scrolly_pipeline build")
    with make_server(page, port) as server:
        print(f"Local preview: http://127.0.0.1:{server.server_port}/", flush=True)
        print("Anonymous public preview. Ctrl+C stops it.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
