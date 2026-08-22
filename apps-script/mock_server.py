# Code.gs 와 같은 요청/응답을 흉내 내는 시험용 서버 (AI 는 그림을 그대로 돌려준다)
import json, time
from http.server import BaseHTTPRequestHandler, HTTPServer
ITEMS = []; CMDS = []; SEQ = [0]; ALLOW = {"draw": False, "photo": False, "ai": False, "raw": False, "world": False, "gallery": False}; NICKS = {}
KEY = '1234567'
def push(cmd):
    SEQ[0] += 1; cmd = dict(cmd); cmd['seq'] = SEQ[0]; CMDS.append(cmd); return SEQ[0]
def find(i):
    for it in ITEMS:
        if it['id'] == i: return it
def pub(it):
    o = {k: v for k, v in it.items() if k != 'dataUrl'}; o['fileId'] = it['id']; return o
def route(r):
    a = r.get('action')
    if a == 'state': return {"ok": True, "allow": ALLOW, "seq": SEQ[0]}
    if a == 'enter': NICKS[r['seat']] = r['nick']; return {"ok": True, "allow": ALLOW, "items": [pub(i) for i in ITEMS if i['seat'] == r['seat'] and i['state'] != 'deleted']}
    if a == 'saveItem':
        it = dict(r['item']); it['seat'] = r['seat']; it['nick'] = r.get('nick', ''); it['state'] = 'kept'; it.setdefault('id', 'x%d' % time.time()); ITEMS.append(it); return {"ok": True, "id": it['id'], "fileId": it['id']}
    if a == 'listItems': return {"ok": True, "items": [pub(i) for i in ITEMS if i['seat'] == r['seat'] and i['state'] != 'deleted']}
    if a == 'send':
        it = find(r['id']);
        if not it: return {"ok": False, "msg": "없음"}
        it['state'] = 'submitted' if r.get('kind') == 'world' else 'sent'
        if it['state'] == 'sent': it['seq'] = push({"type": "spriteReady", "id": it['id']})
        return {"ok": True}
    if a == 'ctrl': push({"type": "ctrl", "id": r['id'], "dx": r.get('dx', 0), "dy": r.get('dy', 0), "act": r.get('act', '')}); return {"ok": True}
    if a == 'chat': push({"type": "chat", "id": r['id'], "seat": r.get('seat'), "nick": r.get('nick', ''), "text": str(r.get('text', ''))[:40]}); return {"ok": True}
    if a == 'ai': return {"ok": True, "dataUrl": r['dataUrl'], "cat": "fish", "abil": None, "left": 9}
    if a == 'poll':
        since = r.get('since', 0); cs = [c for c in CMDS if c['seq'] > since]
        sprites = []
        for c in cs:
            if c['type'] == 'spriteReady':
                it = find(c['id'])
                if it and it['state'] != 'deleted': o = pub(it); o['seq'] = c['seq']; sprites.append(o)
        return {"ok": True, "lastId": cs[-1]['seq'] if cs else since, "cmds": [c for c in cs if c['type'] != 'spriteReady'], "sprites": sprites, "allow": ALLOW}
    if a == 'getImage':
        it = find(r['fileId']); return {"ok": True, "dataUrl": it['dataUrl']} if it else {"ok": False}
    if r.get('key') != KEY: return {"ok": False, "msg": "강사 열쇠가 맞지 않아요"}
    if a == 'setAllow': ALLOW.update({k: bool(r['allow'].get(k)) for k in ALLOW}); push({"type": "allow", "allow": ALLOW}); return {"ok": True}
    if a == 'command': push(r['cmd']); return {"ok": True}
    if a == 'gallery': return {"ok": True, "items": [pub(i) for i in ITEMS if i['state'] in ('sent', 'submitted', 'shown')]}
    if a == 'removeItem':
        it = find(r['id']);
        if it: it['state'] = 'deleted'
        push({"type": "remove", "id": r['id']}); return {"ok": True}
    if a == 'showWorld':
        it = find(r['id']); it['state'] = 'shown'; push({"type": "defineWorld", "id": it['id'], "name": it.get('name'), "kind": it.get('wkind'), "band": it.get('band'), "desc": it.get('desc'), "fileId": it['id'], "show": True}); return {"ok": True}
    if a == 'seats': return {"ok": True, "seats": {str(s): {"nick": NICKS.get(s, ''), "items": len([i for i in ITEMS if i['seat'] == s and i['state'] != 'deleted']), "ai": 0} for s in range(1, 16)}}
    if a == 'wipe':
        n = 0
        for it in ITEMS:
            if it['state'] != 'deleted': it['state'] = 'deleted'; n += 1
        CMDS.clear(); NICKS.clear(); ALLOW.update({k: False for k in ALLOW}); push({"type": "wipe"}); push({"type": "clear"}); push({"type": "allow", "allow": ALLOW}); return {"ok": True, "deleted": n}
    return {"ok": False, "msg": "모르는 요청 " + str(a)}
class H(BaseHTTPRequestHandler):
    def _send(self, obj):
        b = json.dumps(obj).encode(); self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self): self._send({"ok": True, "ver": "mock", "allow": ALLOW})
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0)); body = self.rfile.read(n)
        try: r = json.loads(body)
        except Exception: return self._send({"ok": False, "msg": "bad json"})
        self._send(route(r))
    def log_message(self, *a): pass
HTTPServer(('127.0.0.1', 8766), H).serve_forever()
