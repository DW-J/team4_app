from server import Handler


class handler(Handler):
    """Expose only the fortune POST endpoint on Vercel."""
    def allowed_origin(self):
        host = self.headers.get('Host', '')
        return bool(host) and self.headers.get('Origin') == f'https://{host}'

    def do_GET(self):
        self.send_error(405)
