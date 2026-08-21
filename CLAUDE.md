# CLAUDE.md

이 저장소를 다룰 때 먼저 읽는 지침이다.

## 무엇인가
어린이 AI 수업 "스케치 무대". 아이 그림이 프로젝터 무대에서 움직인다. 화면 세 개(`kid/` `teacher/` `stage/`)와 공통 엔진(`stage_engine.js`)으로 되어 있다. 자세한 구조는 `docs/structure_sketch_stage_20260822_v1.md`, 사용법은 `README.md`.

## 절대 어겨서는 안 되는 것
1. **API 키를 코드에 넣지 않는다.** 서버(Apps Script)의 `setApiKey()` 로 스크립트 속성에만 저장한다.
2. **아이의 이름·연락처·학교를 수집하지 않는다.** 자리 번호와 별명만 쓴다. 만 14세 미만 법정대리인 동의 절차를 피하는 근거다.
3. **한글 파일명을 쓰지 않는다.**
4. **슬로건, 여정 비유, 과장된 수식어를 쓰지 않는다.**

## 고칠 때
- `stage_engine.js` 는 프로젝터와 아이 화면 둘 다 쓴다. 한쪽만 보고 고치지 않는다.
- 규칙(카테고리×공간)은 `WORLDS[...].rule` 과 `motionFromAbilities()` 에 있다. 설명(abil)이 카테고리보다 우선한다.
- 아이 배경은 `defineWorld(id, {kind, band, img})` 로 등록한다. `band` 는 화면 높이 비율이다.
- 도안은 `stage_guides.js` 에 0~1000 좌표로 그린다. 고치면 `stage/guides_test.html` 로 확인한다.
- 도안의 움직임은 같은 파일의 `RIGS` 에 있다(부위 box·pivot·anim). 도안 좌표를 옮기면 RIGS 도 같이 옮긴다. 엔진 `buildRig()` 가 아이 그림에서 부위를 잘라 `partAngle()` 로 돌린다. `rigBox={ox,oy,s}` 는 도안 좌표→그림 좌표 변환(그림판 800 = 도안 1000 → s=0.8).
- 통신은 `stage_bus.js` 하나를 거친다. 메시지 종류: world · scene · auto · clear · demo · sprite · defineWorld · remove · sound · allow · submitWorld · wipe · status · ping.
- 바꾼 뒤 브라우저에서 실제로 눌러 확인한다. 추측으로 "된다"고 쓰지 않는다.

- 서버는 `apps-script/Code.gs` 하나. 요청은 `{action, ...}` JSON POST(text/plain → preflight 없음). 강사 요청은 `key`(= gate 암호) 필요. 명령은 번호(seq)를 붙여 최근 60개 보관, 프로젝터·아이는 `poll {since}` 로 받는다. 그림은 Drive, 기록은 시트 `items`.
- 같은 메시지가 창 간 통신과 서버 양쪽으로 올 수 있어 `mid` 로 중복을 걸러낸다(`stage_bus.js`).
- 서버 로직을 바꾸면 `apps-script/mock_server.py` 도 같이 맞춘다(로컬 시험용).

## 남은 일
실제 Apps Script 배포 후 Gemini 호출(그림 바꾸기·오리기·분류)과 AI 결과의 리그 적용을 실제 기기로 검증. 안 맞으면 프롬프트·`IMAGE_MODELS` 조정.
