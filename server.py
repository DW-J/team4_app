"""Local development server for 마음풀이 and the OpenAI fortune endpoint."""
import datetime
import json
import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
MODEL = 'gpt-4.1-mini'
STATIC = {'/': ROOT / 'index.html', '/index.html': ROOT / 'index.html',
          '/styles.css': ROOT / 'styles.css', '/app.js': ROOT / 'app.js'}
ASSETS = {'guardian-gold.png', 'guardian-white.png', 'clouds.png', 'background-music.mp3'}


def validate_birth(data):
    if not isinstance(data, dict) or set(data) - {'birthDate', 'birthTime'}:
        raise ValueError('입력 정보를 확인해 주세요.')
    date = data.get('birthDate', '')
    time = data.get('birthTime', '')
    if not isinstance(date, str) or len(date) != 10 or not isinstance(time, str):
        raise ValueError('생년월일과 시간을 확인해 주세요.')
    try:
        parsed = datetime.date.fromisoformat(date)
        if parsed > datetime.date.today() or parsed.year < 1900:
            raise ValueError()
        if time:
            if len(time) != 5 or datetime.time.fromisoformat(time).strftime('%H:%M') != time:
                raise ValueError()
    except ValueError:
        raise ValueError('1900년 이후의 올바른 생년월일과 시간을 입력해 주세요.') from None
    return date, time


def generate_fortune(date, time, key):
    prompt = (f'양력 생년월일: {date}, 태어난 시간: {time or "모름"}. '
              '위 정보를 바탕으로 사주에서 영감을 받은 짧고 따뜻한 한국어 창작 해석을 제공하세요. '
              '정확한 사주팔자나 만세력을 계산했다고 주장하지 마세요. '
              '성격과 강점, 돌아볼 점, 일상에서 해볼 작은 실천을 포함하세요. '
              '의료, 법률, 재정 등의 중요한 결정을 예언하거나 단정하지 마세요.')
    payload = json.dumps({'model': MODEL, 'input': prompt, 'store': False, 'max_output_tokens': 800}, ensure_ascii=False).encode('utf-8')
    request = Request('https://api.openai.com/v1/responses', data=payload,
                      headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {key}'}, method='POST')
    with urlopen(request, timeout=45) as response:
        result = json.load(response)
    parts = [part.get('text', '') for item in result.get('output', [])
             if item.get('type') == 'message' for part in item.get('content', [])
             if part.get('type') == 'output_text']
    text = ''.join(parts).strip()
    if not text:
        raise ValueError('해석을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    return text


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Do not log personal input or API responses.

    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split('?', 1)[0]
        file = STATIC.get(path)
        if path.startswith('/assets/') and path[8:] in ASSETS:
            file = ROOT / 'assets' / path[8:]
        if file is None or not file.is_file():
            self.send_error(404)
            return
        body = file.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', mimetypes.guess_type(file.name)[0] or 'application/octet-stream')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def allowed_origin(self):
        host = self.headers.get('Host', '')
        return host in ('localhost:8000', '127.0.0.1:8000') and self.headers.get('Origin') == f'http://{host}'

    def do_POST(self):
        if self.path != '/api/fortune':
            self.send_error(404)
            return
        if not self.allowed_origin():
            self.send_json(403, {'error': '로컬 앱에서 요청해 주세요.'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length <= 0 or length > 1024 or self.headers.get_content_type() != 'application/json':
                raise ValueError('입력 정보를 확인해 주세요.')
            date, time = validate_birth(json.loads(self.rfile.read(length)))
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
            self.send_json(400, {'error': '생년월일과 시간을 확인해 주세요.'})
            return
        key = os.environ.get('OPENAI_API_KEY', '').strip()
        if not key:
            self.send_json(503, {'error': 'OPENAI_API_KEY가 설정되지 않았습니다. README의 실행 방법을 확인해 주세요.'})
            return
        try:
            result = generate_fortune(date, time, key)
        except HTTPError as exc:
            if exc.code in (400, 401, 403):
                message = 'OpenAI API 키 또는 모델 접근 권한을 확인해 주세요.'
            elif exc.code == 404:
                message = 'OpenAI 모델을 사용할 수 없습니다. 서버의 모델 설정을 확인해 주세요.'
            elif exc.code == 503:
                message = 'OpenAI 서비스가 혼잡합니다. 잠시 후 다시 시도해 주세요.'
            elif exc.code == 429:
                message = 'OpenAI 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.'
            else:
                message = 'OpenAI 서비스에서 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
            self.send_json(502, {'error': message})
            return
        except (URLError, TimeoutError, ValueError, KeyError):
            self.send_json(502, {'error': 'OpenAI 연결 또는 응답에 문제가 있습니다. 잠시 후 다시 시도해 주세요.'})
            return
        self.send_json(200, {'result': result})


if __name__ == '__main__':
    print('마음풀이 실행 중: http://localhost:8000 (종료: Ctrl+C)', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8000), Handler).serve_forever()
