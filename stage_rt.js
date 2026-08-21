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
              db.ref('room/chat').limitToLast(20).on('child_added', function (snap) { var v = snap.val(); if (v && v.t > startedAt - 2000) chatCb.forEach(function (f) { f(v.id, v.text, v.seat, v.nick); }); });
              Object.keys(watched).forEach(watchNow);             // 연결 전에 등록된 그림들
            }
            return mode;
          }).catch(function (e) { console.warn('firebase 실패, 서버 경로로', e); return initServer(cfg); });
      }
      return initServer(cfg);
    });
  }
  /* 프로젝터: 그림마다 room/ctrl/{id} 를 따로 구독한다 (규칙이 항목 단위여도 읽힌다) */
  var watched = {};
  function watch(id) { if (!id || watched[id] === 2) return; watched[id] = 1; if (db) watchNow(id); }
  function watchNow(id) {
    if (watched[id] === 2) return; watched[id] = 2;
    var lastN = {};
    db.ref('room/ctrl/' + id).on('value', function (snap) { var v = snap.val(); if (!v || v.t <= startedAt - 5000) return;
      if (v.act && v.n !== lastN[id]) { lastN[id] = v.n; ctrlCb.forEach(function (f) { f(id, 0, 0, v.act); }); return; }
      ctrlCb.forEach(function (f) { f(id, v.dx, v.dy); }); });
  }
  function unwatch(id) { if (db && watched[id]) db.ref('room/ctrl/' + id).off(); delete watched[id]; }
  function initServer(cfg) { mode = (cfg.exec || '').trim() ? 'server' : 'local'; return mode; }
  /* 아이 → */
  var actN = 0;
  function sendCtrl(id, dx, dy, act) {
    if (mode === 'firebase') { var v = { dx: dx, dy: dy, t: firebase.database.ServerValue.TIMESTAMP }; if (act) { v.act = act; v.n = ++actN; } db.ref('room/ctrl/' + id).set(v); return; }
    if (act) { if (mode === 'server') { StageServer.call('ctrl', { id: id, dx: 0, dy: 0, act: act }); } else StageBus.send({ type: 'ctrl', id: id, dx: 0, dy: 0, act: act }); return; }
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
    if (m.type === 'ctrl') ctrlCb.forEach(function (f) { f(m.id, m.dx, m.dy, m.act); });
    if (m.type === 'chat') chatCb.forEach(function (f) { f(m.id, m.text, m.seat, m.nick); });
  });
  /* ── 가까운 친구·친구하기·씨름 (Firebase 전용) ── */
  function ok() { return mode === 'firebase' && db; }
  function publishPos(map) { if (ok()) db.ref('room/pos').set(Object.assign({ _t: firebase.database.ServerValue.TIMESTAMP }, map)); }
  function onPos(cb) { if (ok()) db.ref('room/pos').on('value', function (s) { cb(s.val() || {}); }); }
  function sendReq(req) { if (ok()) db.ref('room/req').push(Object.assign({ t: firebase.database.ServerValue.TIMESTAMP }, req)); }
  function onReq(cb) { if (ok()) db.ref('room/req').limitToLast(10).on('child_added', function (s) { var v = s.val(); if (v && v.t > startedAt - 2000) cb(v, s.key); }); }
  function createMatch(m) { if (!ok()) return null; var ref = db.ref('room/match').push(Object.assign({ t: firebase.database.ServerValue.TIMESTAMP }, m)); return ref.key; }
  function onMatch(cb) { if (ok()) { var h = function (s) { var v = s.val(); if (v && v.t > startedAt - 5000) cb(v, s.key); }; db.ref('room/match').limitToLast(5).on('child_added', h); db.ref('room/match').limitToLast(5).on('child_changed', h); } }
  function setMatch(key, patch) { if (ok()) db.ref('room/match/' + key).update(patch); }
  function tap(key, id, inc) { if (ok()) db.ref('room/match/' + key + '/score/' + id).transaction(function (v) { return (v || 0) + (inc || 1); }); }
  return { init: init, sendCtrl: sendCtrl, sendChat: sendChat, onCtrl: onCtrl, onChat: onChat, watch: watch, unwatch: unwatch, mode: function () { return mode; },
           publishPos: publishPos, onPos: onPos, sendReq: sendReq, onReq: onReq, createMatch: createMatch, onMatch: onMatch, setMatch: setMatch, tap: tap };
})();
