/*************************************************************
 * 스케치 무대 — 서버 v1 (Apps Script)
 *
 * 역할
 *  · 아이 그림·배경 저장 (Drive + Sheet)  · 강사 허용 스위치·명령 중계
 *  · Gemini 호출 (그림 바꾸기 · 배경 오리기 · 종류/능력 판정)
 *  · 프로젝터가 2~3초마다 새 그림·명령을 가져간다
 * 페이지(GitHub Pages)는 이 웹앱 주소로 JSON POST 를 보낸다.
 *
 * ── 처음 한 번만 ────────────────────────────────────────
 *  1) setApiKey  안 KEY 를 본인 키로 바꾸고 ▷ 실행 → 저장되면 그 줄은 되돌린다
 *  2) checkModels 실행 → IMAGE_MODELS / MODEL_TEXT 가 목록에 있는지 확인
 *  3) 배포 → 새 배포 → 웹 앱 → 실행: 나 / 액세스: 모든 사용자
 *  4) 나온 /exec 주소를 GitHub app.json 의 exec 에 넣는다
 *************************************************************/

/* ===== 설정 ===== */
var APP_VERSION  = 'stage-v1';
var TEACHER_KEY  = 'q1w2Q!W@';          // 강사 페이지가 보내는 열쇠. gate.js 암호와 같게 둔다
var SHEET_ID     = '';                  // 비우면 자동 생성
var SHEET_NAME   = 'items';
var FOLDER_NAME  = 'sketch_stage';      // Drive 폴더 (그림·배경 파일)
var SEAT_MAX     = 15;
var AI_LIMIT     = 10;                  // 자리당 하루 AI 호출
var TZ           = 'Asia/Seoul';
var API_BASE     = 'https://generativelanguage.googleapis.com/v1beta';

/* 그림 모델: 앞쪽(싼 것)부터. checkModels 로 이름 확인 */
var IMAGE_MODELS = ['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image', 'gemini-2.5-flash-image'];
/* 종류·능력 판정용 글 모델 */
var MODEL_TEXT   = 'gemini-3.1-flash-lite';

var STYLE_ADD = '부드러운 파스텔 색감의 3D 클레이 인형 느낌. 점토로 빚은 듯한 질감. 어린이가 보기 좋은 밝고 다정한 분위기.';

var HEADERS = ['id', 'time', 'seat', 'nick', 'kind', 'cat', 'abil', 'desc', 'rig', 'rigBox', 'fileId', 'state', 'world', 'seq'];
var COL = {}; HEADERS.forEach(function (h, i) { COL[h] = i; });

/* =========================================================
   처음 한 번만
   ========================================================= */
function setApiKey() {
  var KEY = '여기에_API_키_붙여넣기';
  if (KEY.indexOf('여기에') === 0) { Logger.log('KEY 값을 본인 키로 바꾼 다음 다시 실행하세요.'); return; }
  PropertiesService.getScriptProperties().setProperty('GEMINI_KEY', KEY.trim());
  Logger.log('키를 저장했습니다: ' + KEY.substring(0, 6) + '…(' + KEY.length + '자). 이제 KEY 줄을 되돌리고 저장하세요.');
}
function apiKey_() { return PropertiesService.getScriptProperties().getProperty('GEMINI_KEY') || ''; }

function checkModels() {
  var key = apiKey_(); if (!key) { Logger.log('먼저 setApiKey 를 실행하세요.'); return; }
  var res = UrlFetchApp.fetch(API_BASE + '/models', { method: 'get', headers: { 'x-goog-api-key': key }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) { Logger.log('목록을 못 받았습니다 (' + res.getResponseCode() + ')\n' + res.getContentText().substring(0, 800)); return; }
  var names = (JSON.parse(res.getContentText()).models || []).map(function (m) { return String(m.name || '').replace('models/', ''); });
  var out = ['총 ' + names.length + '개', ''];
  IMAGE_MODELS.forEach(function (m, i) { out.push('그림 ' + (i + 1) + ' = ' + m + ' → 목록에 있는가: ' + (names.indexOf(m) > -1)); });
  out.push('글 = ' + MODEL_TEXT + ' → 목록에 있는가: ' + (names.indexOf(MODEL_TEXT) > -1));
  out.push(''); out.push('--- image 가 들어간 모델 ---'); names.filter(function (n) { return /image|imagen/i.test(n); }).forEach(function (n) { out.push('· ' + n); });
  out.push(''); out.push('--- 전체 ---'); names.forEach(function (n) { out.push('· ' + n); });
  Logger.log(out.join('\n'));
}

/* 상태 한눈에 */
function check3() {
  var out = ['코드 버전: ' + APP_VERSION, '키: ' + (apiKey_() ? '있음' : '없음'), '허용: ' + JSON.stringify(getAllow_()), '명령 seq: ' + (props_().getProperty('CMD_SEQ') || 0), '항목 수: ' + Math.max(0, getSheet_().getLastRow() - 1), '최근 오류: ' + (props_().getProperty('LAST_ERROR') || '없음')];
  Logger.log(out.join('\n'));
}

/* =========================================================
   웹 입구
   ========================================================= */
function doGet(e) { return json_({ ok: true, ver: APP_VERSION, allow: getAllow_() }); }

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, msg: '요청을 읽지 못했어요' }); }
  try {
    var r = route_(req);
    return json_(r);
  } catch (err) {
    logError_(req.action + ': ' + err.message);
    return json_({ ok: false, msg: '서버 오류: ' + err.message });
  }
}
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function props_() { return PropertiesService.getScriptProperties(); }
function logError_(msg) { try { props_().setProperty('LAST_ERROR', Utilities.formatDate(new Date(), TZ, 'MM-dd HH:mm:ss') + ' | ' + String(msg).substring(0, 500)); } catch (e) {} }
function teacher_(req) { if (req.key !== TEACHER_KEY) throw new Error('강사 열쇠가 맞지 않아요'); }

function route_(req) {
  switch (req.action) {
    /* 공통 */
    case 'state':       return { ok: true, allow: getAllow_(), ver: APP_VERSION, seq: +(props_().getProperty('CMD_SEQ') || 0) };
    /* 아이 */
    case 'enter':       return enter_(req);
    case 'saveItem':    return saveItem_(req);
    case 'listItems':   return { ok: true, items: listItems_(req.seat) };
    case 'send':        return setState_(req.id, req.kind === 'world' ? 'submitted' : 'sent');
    case 'ai':          return ai_(req);
    case 'ctrl':        pushCmd_({ type: 'ctrl', id: String(req.id), dx: +req.dx || 0, dy: +req.dy || 0, act: req.act ? String(req.act) : '' }); return { ok: true };          // 조종 (Firebase 없을 때)
    case 'chat':        pushCmd_({ type: 'chat', id: String(req.id), seat: +req.seat, nick: String(req.nick || '').slice(0, 12), text: String(req.text || '').slice(0, 40) }); return { ok: true };
    /* 프로젝터 */
    case 'poll':        return poll_(req);
    case 'getImage':    return getImage_(req.fileId);
    /* 강사 */
    case 'setAllow':    teacher_(req); setAllow_(req.allow); pushCmd_({ type: 'allow', allow: req.allow }); return { ok: true };
    case 'command':     teacher_(req); pushCmd_(req.cmd); return { ok: true };
    case 'gallery':     teacher_(req); return { ok: true, items: listItems_(null, ['sent', 'submitted', 'shown']) };
    case 'removeItem':  teacher_(req); setState_(req.id, 'deleted'); pushCmd_({ type: 'remove', id: req.id }); return { ok: true };
    case 'showWorld':   teacher_(req); return showWorld_(req.id);
    case 'seats':       teacher_(req); return { ok: true, seats: seatUsage_() };
    case 'wipe':        teacher_(req); return wipe_();
    default:            return { ok: false, msg: '모르는 요청: ' + req.action };
  }
}

/* =========================================================
   허용 스위치 · 명령
   ========================================================= */
var ALLOW_DEFAULT = { draw: false, photo: false, ai: false, raw: false, world: false, gallery: false };
function getAllow_() { try { return JSON.parse(props_().getProperty('ALLOW') || '') || ALLOW_DEFAULT; } catch (e) { return ALLOW_DEFAULT; } }
function setAllow_(a) { var o = {}; Object.keys(ALLOW_DEFAULT).forEach(function (k) { o[k] = !!(a && a[k]); }); props_().setProperty('ALLOW', JSON.stringify(o)); }

/* 명령은 최근 60개를 번호 붙여 보관. 프로젝터·아이 화면은 자기가 본 번호 이후만 받는다 */
function pushCmd_(cmd) {
  var lock = LockService.getScriptLock(); lock.waitLock(5000);
  try {
    var p = props_(), seq = +(p.getProperty('CMD_SEQ') || 0) + 1;
    var list = []; try { list = JSON.parse(p.getProperty('CMDS') || '[]'); } catch (e) {}
    cmd.seq = seq; cmd.at = Date.now(); list.push(cmd); while (list.length > 60) list.shift();
    p.setProperty('CMDS', JSON.stringify(list)); p.setProperty('CMD_SEQ', String(seq));
    return seq;
  } finally { lock.releaseLock(); }
}
function cmdsSince_(since) { var list = []; try { list = JSON.parse(props_().getProperty('CMDS') || '[]'); } catch (e) {} return list.filter(function (c) { return c.seq > since; }); }

/* =========================================================
   아이
   ========================================================= */
function enter_(req) {
  var seat = +req.seat; if (!(seat >= 1 && seat <= SEAT_MAX)) return { ok: false, msg: '자리 번호가 이상해요' };
  var nick = String(req.nick || '').substring(0, 12).trim(); if (!nick) return { ok: false, msg: '별명을 정해요' };
  props_().setProperty('NICK_' + seat, nick);
  return { ok: true, allow: getAllow_(), items: listItems_(seat) };
}

/* 그림 또는 배경 저장. dataUrl → Drive 파일 */
function saveItem_(req) {
  var it = req.item || {}; var seat = +req.seat;
  if (!(seat >= 1 && seat <= SEAT_MAX)) return { ok: false, msg: '자리 번호가 이상해요' };
  if (!it.dataUrl) return { ok: false, msg: '그림이 없어요' };
  var file = saveDataUrl_(it.dataUrl, (it.kind === 'world' ? 'world_' : 'sprite_') + seat + '_' + Utilities.formatDate(new Date(), TZ, 'HHmmss'));
  var id = it.id || ((it.kind === 'world' ? 'w' : 'k') + seat + '_' + Date.now());
  var row = []; HEADERS.forEach(function () { row.push(''); });
  row[COL.id] = id; row[COL.time] = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'); row[COL.seat] = String(seat); row[COL.nick] = String(req.nick || props_().getProperty('NICK_' + seat) || '');
  row[COL.kind] = it.kind === 'world' ? 'world' : 'sprite'; row[COL.cat] = String(it.cat || ''); row[COL.abil] = it.abil ? JSON.stringify(it.abil) : ''; row[COL.desc] = String(it.desc || '').substring(0, 200);
  row[COL.rig] = String(it.rig || ''); row[COL.rigBox] = it.rigBox ? JSON.stringify(it.rigBox) : ''; row[COL.fileId] = file.getId(); row[COL.state] = 'kept';
  row[COL.world] = it.kind === 'world' ? JSON.stringify({ name: it.name || '', wkind: it.wkind || 'free', band: it.band || {} }) : ''; row[COL.seq] = '';
  getSheet_().appendRow(row);
  return { ok: true, id: id, fileId: file.getId() };
}
function saveDataUrl_(dataUrl, name) {
  var m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl); if (!m) throw new Error('그림 형식이 이상해요');
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name + (m[1] === 'image/png' ? '.png' : '.jpg'));
  return folder_(FOLDER_NAME).createFile(blob);
}

/* 시트 → 항목 목록. seat 가 있으면 그 자리만, states 가 있으면 그 상태만. 삭제된 것은 뺀다 */
function listItems_(seat, states) {
  var sh = getSheet_(), last = sh.getLastRow(); if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, HEADERS.length).getValues(), out = [];
  vals.forEach(function (v) {
    var st = String(v[COL.state]); if (st === 'deleted') return;
    if (seat && String(v[COL.seat]) !== String(seat)) return;
    if (states && states.indexOf(st) < 0) return;
    out.push(rowToItem_(v));
  });
  return out;
}
function rowToItem_(v) {
  var it = { id: v[COL.id], time: v[COL.time], seat: +v[COL.seat], nick: v[COL.nick], kind: v[COL.kind], cat: v[COL.cat], desc: v[COL.desc], rig: v[COL.rig] || null, fileId: v[COL.fileId], state: v[COL.state], seq: +v[COL.seq] || 0 };
  try { it.abil = v[COL.abil] ? JSON.parse(v[COL.abil]) : null; } catch (e) { it.abil = null; }
  try { it.rigBox = v[COL.rigBox] ? JSON.parse(v[COL.rigBox]) : null; } catch (e) { it.rigBox = null; }
  try { var w = v[COL.world] ? JSON.parse(v[COL.world]) : null; if (w) { it.name = w.name; it.wkind = w.wkind; it.band = w.band; } } catch (e) {}
  return it;
}
function findRow_(id) {
  var sh = getSheet_(), last = sh.getLastRow(); if (last < 2) return null;
  var ids = sh.getRange(2, COL.id + 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return { sh: sh, rowNum: i + 2 };
  return null;
}
/* 상태 바꾸기. 'sent' 면 프로젝터가 가져갈 수 있게 번호를 붙인다 */
function setState_(id, state) {
  var f = findRow_(id); if (!f) return { ok: false, msg: '항목을 찾지 못했어요' };
  f.sh.getRange(f.rowNum, COL.state + 1).setValue(state);
  if (state === 'sent') { var seq = pushCmd_({ type: 'spriteReady', id: id }); f.sh.getRange(f.rowNum, COL.seq + 1).setValue(String(seq)); }
  return { ok: true };
}

/* =========================================================
   프로젝터: 새 명령 + 새 그림
   ========================================================= */
function poll_(req) {
  var since = +req.since || 0, cmds = cmdsSince_(since), sprites = [];
  cmds.forEach(function (c) {
    if (c.type === 'spriteReady') { var f = findRow_(c.id); if (f) { var v = f.sh.getRange(f.rowNum, 1, 1, HEADERS.length).getValues()[0]; if (String(v[COL.state]) !== 'deleted') { var it = rowToItem_(v); it.seq = c.seq; sprites.push(it); } } }
  });
  var last = cmds.length ? cmds[cmds.length - 1].seq : since;
  return { ok: true, lastId: last, cmds: cmds.filter(function (c) { return c.type !== 'spriteReady'; }), sprites: sprites, allow: getAllow_() };
}
function getImage_(fileId) {
  var f = DriveApp.getFileById(fileId), b = f.getBlob();
  return { ok: true, dataUrl: 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()) };
}

/* =========================================================
   강사
   ========================================================= */
function showWorld_(id) {
  var f = findRow_(id); if (!f) return { ok: false, msg: '배경을 찾지 못했어요' };
  var v = f.sh.getRange(f.rowNum, 1, 1, HEADERS.length).getValues()[0], it = rowToItem_(v);
  f.sh.getRange(f.rowNum, COL.state + 1).setValue('shown');
  pushCmd_({ type: 'defineWorld', id: id, name: it.name, kind: it.wkind, band: it.band, desc: it.desc, fileId: it.fileId, show: true });
  return { ok: true };
}
function seatUsage_() {
  var out = {}, today = today_(), sh = getSheet_(), last = sh.getLastRow();
  for (var s = 1; s <= SEAT_MAX; s++) out[s] = { nick: props_().getProperty('NICK_' + s) || '', items: 0, ai: +(props_().getProperty('AI_' + today + '_' + s) || 0) };
  if (last >= 2) sh.getRange(2, 1, last - 1, HEADERS.length).getValues().forEach(function (v) { var s2 = +v[COL.seat]; if (out[s2] && String(v[COL.state]) !== 'deleted') out[s2].items++; });
  return out;
}
/* 수업 끝: 오늘 것 전부 삭제 표시 + Drive 파일 휴지통 + 명령·별명 초기화. 시트 행은 남긴다(기록) */
function wipe_() {
  var sh = getSheet_(), last = sh.getLastRow(), n = 0;
  if (last >= 2) {
    var vals = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
    vals.forEach(function (v, i) {
      if (String(v[COL.state]) === 'deleted') return;
      sh.getRange(i + 2, COL.state + 1).setValue('deleted'); n++;
      try { DriveApp.getFileById(v[COL.fileId]).setTrashed(true); } catch (e) {}
    });
  }
  var p = props_(); p.deleteProperty('CMDS'); for (var s = 1; s <= SEAT_MAX; s++) p.deleteProperty('NICK_' + s);
  setAllow_(ALLOW_DEFAULT);
  pushCmd_({ type: 'wipe' }); pushCmd_({ type: 'clear' }); pushCmd_({ type: 'allow', allow: ALLOW_DEFAULT });
  return { ok: true, deleted: n };
}

/* =========================================================
   AI (Gemini)
   mode: 'transform' 그림+설명 → 캐릭터 / 'cutout' 사진에서 대상만 / 'classify' 종류·능력만
   ========================================================= */
function ai_(req) {
  var key = apiKey_(); if (!key) return { ok: false, msg: '선생님이 아직 AI 키를 넣지 않았어요' };
  var seat = +req.seat, today = today_(), used = +(props_().getProperty('AI_' + today + '_' + seat) || 0);
  if (req.mode !== 'classify' && used >= AI_LIMIT) return { ok: false, msg: '오늘 AI는 ' + AI_LIMIT + '번까지예요. 선생님께 말해요' };
  var m = /^data:([^;]+);base64,(.+)$/.exec(req.dataUrl || ''); if (!m) return { ok: false, msg: '그림이 없어요' };
  var img = { inline_data: { mime_type: m[1], data: m[2] } }, desc = String(req.desc || '').substring(0, 200), guide = String(req.guide || '');

  /* 종류·능력 판정: 무대 규칙에 쓰는 형식 그대로 */
  var cls = classify_(img, desc, guide, key);

  if (req.mode === 'classify') return { ok: true, cat: cls.cat, abil: cls.abil };

  var prompt = req.mode === 'cutout'
    ? '이 사진에서 주인공이 되는 대상 하나만 남기고 배경을 완전히 지워 주세요. 대상은 그대로 두고, 배경은 아무 무늬 없는 순수한 흰색(#FFFFFF)으로 채워 주세요. 그림자도 넣지 마세요. 대상이 잘리지 않게 전체가 보이게 해 주세요.'
    : '어린이가 그린 이 그림을 바탕으로 캐릭터를 만들어 주세요. 아이가 그린 모양·색·특징(눈, 지느러미, 다리, 무늬)을 최대한 그대로 살리고 더 또렷하고 예쁘게 다듬어 주세요.\n' +
      (desc ? '아이의 설명: "' + desc + '"\n' : '') +
      (guide ? '이 그림은 "' + guideName_(guide) + '" 도안을 따라 그린 것입니다. 같은 자세(옆모습은 옆모습 그대로, 방향도 그대로)와 같은 구도를 유지해 주세요. 머리·다리·꼬리·날개의 위치를 원래 그림과 같은 자리에 두세요.\n' : '') +
      '캐릭터 하나만, 전신이 다 보이게, 배경은 아무 무늬 없는 순수한 흰색(#FFFFFF)으로. 그림자 없이. 글자 없이. ' + STYLE_ADD;

  var got = null, tries = [];
  for (var i = 0; i < IMAGE_MODELS.length && !got; i++) {
    var r = imageCall_(IMAGE_MODELS[i], [{ text: prompt }, img], key);
    tries.push(IMAGE_MODELS[i] + ' → ' + r.code);
    if (r.code === 200) { got = pickImage_(r.body); if (got) break; tries.push('   이미지 없음'); continue; }
    if ([429, 404, 403, 500, 502, 503, 504].indexOf(r.code) > -1) continue;
    tries.push('   ' + r.body.substring(0, 200));
  }
  if (!got) { logError_('AI 실패\n' + tries.join('\n')); return { ok: false, msg: '그림을 만들지 못했어요. 다시 해 볼까요?' }; }
  props_().setProperty('AI_' + today + '_' + seat, String(used + 1));
  return { ok: true, dataUrl: 'data:' + got.mime + ';base64,' + got.b64, cat: cls.cat, abil: cls.abil, left: AI_LIMIT - used - 1 };
}
function guideName_(g) { return { whale: '참고래', oarfish: '산갈치', crab: '게', clam: '조개', squid: '오징어', octopus: '문어', haenyeo: '해녀', person: '사람', bird: '새', raft: '뗏목', sailboat: '돛단배', car: '자동차', airplane: '비행기', paperplane: '종이비행기', submarine: '잠수함' }[g] || g; }

/* 그림+설명 → {cat, abil}. 설명이 있으면 설명이 우선 */
function classify_(img, desc, guide, key) {
  var fallback = { cat: guideCat_(guide), abil: null };
  try {
    var prompt = '이 그림(또는 사진)과 아이의 설명을 보고 JSON 으로만 답하세요. 다른 말은 쓰지 마세요.\n' +
      '형식: {"cat": 카테고리, "abil": {"fly":bool,"swim":bool,"surface":bool,"sink":bool,"ground":bool,"jump":bool} 또는 null}\n' +
      '카테고리는 다음 중 하나: fish(물고기), whale(고래·돌고래), shark(상어), sub(잠수함), clam(조개), crawler(게·문어·바닥 생물), bird(새), person(사람), animal(육지 동물), boat(배·뗏목), vehicle(자동차 등 땅 탈것), aircraft(비행기), light(풍선·종이비행기 등 가벼운 것), heavy(그 밖의 무거운 물건)\n' +
      'abil 은 아이의 설명에 능력이 적혀 있을 때만 채우고(예: "물속을 날아다니는 자동차" → fly:true, swim:true), 설명이 없거나 능력 언급이 없으면 null.\n' +
      (desc ? '아이의 설명: "' + desc + '"\n' : '설명 없음\n') + (guide ? '도안: ' + guideName_(guide) + '\n' : '');
    var res = UrlFetchApp.fetch(API_BASE + '/models/' + MODEL_TEXT + ':generateContent', { method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key },
      payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }, img] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }), muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return fallback;
    var txt = JSON.parse(res.getContentText()).candidates[0].content.parts[0].text, o = JSON.parse(txt);
    var cats = ['fish', 'whale', 'shark', 'sub', 'clam', 'crawler', 'bird', 'person', 'animal', 'boat', 'vehicle', 'aircraft', 'light', 'heavy'];
    return { cat: cats.indexOf(o.cat) > -1 ? o.cat : fallback.cat, abil: (o.abil && typeof o.abil === 'object') ? o.abil : null };
  } catch (e) { logError_('classify: ' + e.message); return fallback; }
}
function guideCat_(g) { return { whale: 'whale', oarfish: 'fish', crab: 'crawler', clam: 'clam', squid: 'fish', octopus: 'crawler', haenyeo: 'person', person: 'person', bird: 'bird', raft: 'boat', sailboat: 'boat', car: 'vehicle', airplane: 'aircraft', paperplane: 'light', submarine: 'sub' }[g] || 'fish'; }

function imageCall_(model, parts, key) {
  var res = UrlFetchApp.fetch(API_BASE + '/models/' + model + ':generateContent', { method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key }, payload: JSON.stringify({ contents: [{ parts: parts }] }), muteHttpExceptions: true });
  return { code: res.getResponseCode(), body: res.getContentText() };
}
function pickImage_(body) {
  try { var parts = JSON.parse(body).candidates[0].content.parts; for (var i = 0; i < parts.length; i++) { var d = parts[i].inlineData || parts[i].inline_data; if (d && d.data) return { b64: d.data, mime: d.mimeType || d.mime_type || 'image/png' }; } } catch (e) {}
  return null;
}

/* =========================================================
   시트 · 폴더 · 기타
   ========================================================= */
function getSpreadsheet_() {
  var p = props_();
  if (SHEET_ID) return SpreadsheetApp.openById(SHEET_ID);
  var saved = p.getProperty('AUTO_SHEET_ID'); if (saved) { try { return SpreadsheetApp.openById(saved); } catch (e) {} }
  var made = SpreadsheetApp.create('sketch_stage_items'); p.setProperty('AUTO_SHEET_ID', made.getId()); return made;
}
function getSheet_() {
  var ss = getSpreadsheet_(), sh = ss.getSheetByName(SHEET_NAME); if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) { sh.getRange(1, 1, sh.getMaxRows(), HEADERS.length).setNumberFormat('@'); sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]); sh.setFrozenRows(1); }
  return sh;
}
function folder_(name) { var it = DriveApp.getFoldersByName(name); return it.hasNext() ? it.next() : DriveApp.createFolder(name); }
function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }

/* 시험: 편집기에서 실행하면 서버 기능을 한 바퀴 돈다 (Drive·Sheet 권한 승인 창이 뜬다) */
function testRoundTrip() {
  var png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8DwHwMDAwMjABQKAgHbZ4JvAAAAAElFTkSuQmCC';
  var a = saveItem_({ seat: 1, nick: '시험', item: { kind: 'sprite', cat: 'fish', desc: '시험 그림', dataUrl: png } });
  var b = setState_(a.id, 'sent');
  var c = poll_({ since: 0 });
  Logger.log('저장: ' + JSON.stringify(a) + '\n보냄: ' + JSON.stringify(b) + '\n폴링 그림 수: ' + c.sprites.length + ' lastId=' + c.lastId);
  setState_(a.id, 'deleted');
}
