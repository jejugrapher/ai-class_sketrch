/* 강사 페이지 ↔ 프로젝터 페이지 통신.
   1) 같은 브라우저(노트북에서 창 두 개): BroadcastChannel 로 즉시
   2) 다른 기기: Apps Script 를 통해 2~3초마다 (setServer 로 켬. 서버 코드 단계에서 연결)
   메시지: {type:'world'|'scene'|'auto'|'clear'|'demo'|'sprite'|'defineWorld'|'remove'|'sound'|'status', ...} */
var StageBus = (function () {
  var ch = ('BroadcastChannel' in window) ? new BroadcastChannel('sketch-stage') : null;
  var handlers = [], server = null, lastId = 0, timer = null;
  if (ch) ch.onmessage = function (e) { dispatch(e.data, 'local'); };
  function dispatch(msg, from) { handlers.forEach(function (h) { try { h(msg, from); } catch (err) { console.error(err); } }); }
  function send(msg) {
    if (ch) ch.postMessage(msg);
    if (server && server.post) server.post(msg);
  }
  function on(h) { handlers.push(h); }
  /* 서버 연결: {poll: function(lastId) → Promise<{items:[msg], lastId}>, post: function(msg)} */
  function setServer(s, intervalMs) {
    server = s; if (timer) clearInterval(timer);
    if (s && s.poll) timer = setInterval(function () {
      s.poll(lastId).then(function (r) { if (!r) return; (r.items || []).forEach(function (m) { dispatch(m, 'server'); }); if (r.lastId) lastId = r.lastId; }).catch(function () {});
    }, intervalMs || 2500);
  }
  return { send: send, on: on, setServer: setServer };
})();
