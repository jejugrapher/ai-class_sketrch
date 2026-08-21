/* 실시간 조종·채팅 통로.
   1) app.json 에 firebase 설정이 있으면 Firebase Realtime Database (0.1~0.3초)
   2) 없으면 Apps Script 서버 (아이는 1초마다 모아 보내고, 프로젝터는 폴링으로 받음 → 1~3초 지연)
   3) 둘 다 없으면 같은 기기 창 간 통신
   StageRT.init(role) · sendCtrl(id, dx, dy) · sendChat(id, seat, nick, text) · onCtrl(cb) · onChat(cb) */
var StageRT = (function () {
  var mode = 'local', db = null, ctrlCb = [], chatCb = [], startedAt = Date.now(), pending = {}, flushTimer = null;
  var base = document.currentScript ? document.currentScript.src.replace(/[^/]*$/, '') : '../';
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function init(role) {
    return fetch(base + 'app.json?t=' + Date.now()).then(function (r) { return r.json(); }).catch(function () { return {}; }).then(function (cfg) {
      if (cfg.firebase && cfg.firebase.databaseURL) {
        return loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
          .then(function () { return loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js'); })
          .then(function () {
            firebase.initializeApp(cfg.firebase); db = firebase.database(); mode = 'firebase';
            if (role === 'stage') {
              db.ref('room/ctrl').on('child_changed', function (snap) { var v = snap.val(); if (v && v.t > startedAt - 5000) ctrlCb.forEach(function (f) { f(snap.key, v.dx, v.dy); }); });
              db.ref('room/ctrl').on('child_added', function (snap) { var v = snap.val(); if (v && v.t > startedAt - 5000) ctrlCb.forEach(function (f) { f(snap.key, v.dx, v.dy); }); });
              db.ref('room/chat').limitToLast(20).on('child_added', function (snap) { var v = snap.val(); if (v && v.t > startedAt - 2000) chatCb.forEach(function (f) { f(v.id, v.text, v.seat, v.nick); }); });
            }
            return mode;
          }).catch(function (e) { console.warn('firebase 실패, 서버 경로로', e); return initServer(cfg); });
      }
      return initServer(cfg);
    });
  }
  function initServer(cfg) { mode = (cfg.exec || '').trim() ? 'server' : 'local'; return mode; }
  /* 아이 → */
  function sendCtrl(id, dx, dy) {
    if (mode === 'firebase') { db.ref('room/ctrl/' + id).set({ dx: dx, dy: dy, t: firebase.database.ServerValue.TIMESTAMP }); return; }
    if (mode === 'server') { pending[id] = { type: 'ctrl', id: id, dx: dx, dy: dy }; if (!flushTimer) flushTimer = setTimeout(flush, 700); return; }
    StageBus.send({ type: 'ctrl', id: id, dx: dx, dy: dy });
  }
  function flush() { flushTimer = null; var list = Object.keys(pending).map(function (k) { return pending[k]; }); pending = {}; list.forEach(function (c) { StageServer.call('ctrl', c); }); }
  function sendChat(id, seat, nick, text) {
    text = String(text || '').slice(0, 40);
    if (mode === 'firebase') { db.ref('room/chat').push({ id: id, seat: seat, nick: nick, text: text, t: firebase.database.ServerValue.TIMESTAMP }); return; }
    if (mode === 'server') { StageServer.call('chat', { id: id, seat: seat, nick: nick, text: text }); return; }
    StageBus.send({ type: 'chat', id: id, text: text, seat: seat, nick: nick });
  }
  /* 프로젝터 ← (서버·창 간 통신 경로는 StageBus 메시지로 들어온다) */
  function onCtrl(f) { ctrlCb.push(f); } function onChat(f) { chatCb.push(f); }
  StageBus.on(function (m) {
    if (m.type === 'ctrl') ctrlCb.forEach(function (f) { f(m.id, m.dx, m.dy); });
    if (m.type === 'chat') chatCb.forEach(function (f) { f(m.id, m.text, m.seat, m.nick); });
  });
  return { init: init, sendCtrl: sendCtrl, sendChat: sendChat, onCtrl: onCtrl, onChat: onChat, mode: function () { return mode; } };
})();
