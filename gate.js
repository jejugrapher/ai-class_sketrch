/* 접근 암호. 정적 페이지라 진짜 보안은 아니다(소스를 보면 해시가 보인다). 아이들이 강사 화면을 열지 못하게 막는 용도.
   암호 바꾸기: 아래 HASH 를 새 암호의 SHA-256 으로 교체.
   python3 -c "import hashlib;print(hashlib.sha256('새암호'.encode()).hexdigest())" */
(function () {
  var HASH = '8bb0cf6eb9b17d0f7d22b456f121257dc1254e1f01665370476383ea776df414';
  var KEY = 'stageGateOk';
  /* 암호 통과 뒤에 할 일은 window.gateReady.then(...) 으로 기다린다 (서버 연결 등) */
  var resolveGate; window.gateReady = new Promise(function (res) { resolveGate = res; });
  if (sessionStorage.getItem(KEY) === HASH && sessionStorage.getItem('stageGatePw')) { resolveGate(); return; }
  sessionStorage.removeItem(KEY);
  function sha256(str) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }); }
  function build() {
    var ov = document.createElement('div'); ov.id = 'gateOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0b3d91;display:flex;align-items:center;justify-content:center;font-family:-apple-system,"Apple SD Gothic Neo",sans-serif';
    ov.innerHTML = '<form style="background:#fff;border-radius:16px;padding:28px 26px;width:min(92vw,360px);box-shadow:0 10px 40px rgba(0,0,0,.3)">' +
      '<h2 style="margin:0 0 6px;font-size:20px;color:#0b3d91">강사용 화면</h2><p style="margin:0 0 16px;color:#556;font-size:14px">암호를 입력하세요</p>' +
      '<input id="gatePw" type="password" autocomplete="current-password" style="width:100%;box-sizing:border-box;font-size:18px;padding:12px;border:2px solid #cfd8e3;border-radius:10px">' +
      '<p id="gateMsg" style="min-height:18px;margin:8px 0;color:#b91c1c;font-size:13px"></p>' +
      '<button style="width:100%;font-size:17px;padding:12px;border:0;border-radius:10px;background:#1f6feb;color:#fff">들어가기</button></form>';
    document.body.appendChild(ov);
    var f = ov.querySelector('form'), pw = ov.querySelector('#gatePw'), msg = ov.querySelector('#gateMsg');
    pw.focus();
    f.onsubmit = function (e) { e.preventDefault(); sha256(pw.value).then(function (h) { if (h === HASH) { sessionStorage.setItem(KEY, HASH); sessionStorage.setItem('stageGatePw', pw.value); ov.remove(); resolveGate(); } else { msg.textContent = '암호가 다릅니다'; pw.value = ''; pw.focus(); } }); };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
