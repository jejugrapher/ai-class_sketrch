/* Apps Script 서버 연결. app.json 의 exec 가 비어 있으면 아무것도 하지 않는다(같은 기기 창 간 통신만).
   StageServer.init(role, opts) — role: 'stage' | 'teacher' | 'kid'
   StageServer.call(action, data) → Promise(JSON). 이미지 받기: StageServer.image(fileId) → dataUrl (캐시) */
var StageServer = (function () {
  var exec = '', key = '', ready = null, imgCache = {};
  var base = document.currentScript ? document.currentScript.src.replace(/[^/]*$/, '') : '../';   // 스크립트 위치 = 저장소 루트
  function load() {
    if (ready) return ready;
    ready = fetch(base + 'app.json?t=' + Date.now()).then(function (r) { return r.json(); }).then(function (j) { exec = (j.exec || '').trim(); key = j.teacherKey || ''; return exec; }).catch(function () { return ''; });
    return ready;
  }
  function call(action, data) {
    return load().then(function (u) {
      if (!u) return null;
      var body = Object.assign({ action: action }, data || {});
      return fetch(u, { method: 'POST', body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (j) {   // text/plain → 사전 요청(preflight) 없음
        if (j && j.ok === false && /열쇠/.test(j.msg || '') && body.key !== undefined && sessionStorage.getItem('stageGatePw')) {   // 입력한 강사 암호가 서버 열쇠와 다름 → 다시 묻는다
          sessionStorage.removeItem('stageGateOk'); sessionStorage.removeItem('stageGatePw'); if (!window._gateReloading) { window._gateReloading = true; alert('강사 암호를 다시 입력해 주세요'); location.reload(); }
        }
        return j;
      });
    });
  }
  function image(fileId) {
    if (imgCache[fileId]) return Promise.resolve(imgCache[fileId]);
    return call('getImage', { fileId: fileId }).then(function (r) { if (r && r.ok) imgCache[fileId] = r.dataUrl; return r && r.ok ? r.dataUrl : null; });
  }
  /* 강사 열쇠: gate 에서 입력한 암호를 쓴다 */
  function teacherKey() { return sessionStorage.getItem('stageGatePw') || key; }

  function init(role, opts) {
    opts = opts || {};
    var wait = (role === 'teacher' && window.gateReady) ? window.gateReady : Promise.resolve();   // 강사: 암호 통과 뒤에 연결
    return wait.then(load).then(function (u) {
      if (!u) { if (opts.onOffline) opts.onOffline(); return false; }
      if (role === 'teacher') {
        StageBus.setServer({ post: function (m) {                           // 강사 명령 → 서버
          var k = teacherKey();
          if (m.type === 'allow') return call('setAllow', { key: k, allow: m.allow });
          if (m.type === 'remove') return call('removeItem', { key: k, id: m.id });
          if (m.type === 'removeItem') return null;                          // remove 와 함께 보내므로 생략
          if (m.type === 'defineWorld' && m.show) return call('showWorld', { key: k, id: m.id });
          if (m.type === 'wipe') return call('wipe', { key: k });
          if (m.type === 'status' || m.type === 'ping' || m.type === 'submitWorld' || m.type === 'sprite') return null;
          return call('command', { key: k, cmd: m });                        // world · scene · auto · clear · demo · sound · qr
        } }, 0);
      } else {
        /* 프로젝터·아이: 명령과 새 그림을 가져온다 */
        StageBus.setServer({ poll: function (since) {
          return call('poll', { since: since }).then(function (r) {
            if (!r || !r.ok) return null;
            var items = r.cmds.slice();
            var jobs = [];
            if (role === 'stage') {
              r.sprites.forEach(function (sp) { jobs.push(image(sp.fileId).then(function (d) { if (d) items.push({ type: 'sprite', id: sp.id, seat: sp.seat, nick: sp.nick, cat: sp.cat, desc: sp.desc, abil: sp.abil, rig: sp.rig, rigBox: sp.rigBox, dataUrl: d, transparent: true }); })); });
              items.forEach(function (c) { if (c.type === 'defineWorld' && c.fileId && !c.dataUrl) jobs.push(image(c.fileId).then(function (d) { c.dataUrl = d; })); });
            }
            return Promise.all(jobs).then(function () { return { items: items, lastId: r.lastId, allow: r.allow }; });
          });
        } }, role === 'stage' ? 2500 : 4000);
      }
      if (opts.onOnline) opts.onOnline(u);
      return true;
    });
  }
  return { init: init, call: call, image: image, exec: function () { return exec; }, teacherKey: teacherKey };
})();
