# 서버(Apps Script) 만들기

**작성일:** 2026.08.22

## 1. 프로젝트 만들기
1. https://script.google.com → **새 프로젝트**
2. 왼쪽 `Code.gs` 내용을 지우고 이 폴더의 `Code.gs` 전체를 붙여넣기 → 저장 (프로젝트 이름: `sketch_stage`)
3. 편집기 위 함수 선택 상자에서 **`testRoundTrip`** 선택 → ▷ 실행
   - 처음 한 번 **권한 승인** 창이 뜬다 (Drive·스프레드시트·외부 연결). 본인 계정으로 승인
   - 실행 로그에 `저장: … 폴링 그림 수: 1` 이 나오면 시트·Drive 폴더가 만들어진 것

## 2. API 키 넣기
1. https://aistudio.google.com → API 키 발급 (이전 강의 때 키가 있으면 그것)
2. `Code.gs` 맨 위 `setApiKey()` 안 `var KEY = '여기에_API_키_붙여넣기';` 의 따옴표 안에 키를 넣는다
3. 함수 선택 상자에서 **`setApiKey`** → ▷ 실행 → 로그에 `키를 저장했습니다` 확인
4. **그 줄을 다시 `'여기에_API_키_붙여넣기'` 로 되돌리고 저장** (키는 스크립트 속성에만 남는다)
5. **`checkModels`** 실행 → `그림 1 = … → 목록에 있는가: true` 확인. false 면 로그의 "image 가 들어간 모델" 중 하나로 `IMAGE_MODELS` 를 바꾼다

## 3. 배포
1. 오른쪽 위 **배포 → 새 배포** → 유형 **웹 앱**
2. 실행 사용자: **나** / 액세스 권한: **모든 사용자** ← 이게 아니면 아이 기기에서 로그인 화면이 뜬다
3. 배포 → 나온 **웹 앱 URL**(`https://script.google.com/macros/s/…/exec`) 복사
4. GitHub 저장소의 `app.json` 을 열어 `exec` 값에 붙여넣고 Commit

```json
{ "exec": "https://script.google.com/macros/s/여기/exec", "teacherKey": "stage" }
```

5. 1~2분 뒤 강사 화면을 열면 상단에 **서버 연결됨**, 프로젝터 오른쪽 위에 **· 서버** 가 붙는다

## 4. 코드를 고친 뒤
- Apps Script 편집기에서 `Code.gs` 교체 → 저장 → **배포 → 배포 관리 → 연필 → 새 버전 → 배포**
- 이렇게 하면 URL 이 안 바뀐다. (「새 배포」를 누르면 URL 이 바뀌므로 app.json 도 고쳐야 한다)

## 5. 강사 열쇠
강사 화면이 서버에 보내는 열쇠는 `Code.gs` 의 `TEACHER_KEY` 이고, 강사 화면 암호(`gate.js`)와 같은 값이다.
암호를 바꾸면 둘 다 바꾼다.

## 6. 확인·문제
- `check3` 실행: 키 유무, 허용 상태, 명령 번호, 항목 수, 최근 오류
- Drive 폴더 `sketch_stage` 에 그림 파일, 스프레드시트 `sketch_stage_items` 에 기록이 쌓인다
- 한도는 이전 강의와 같다: 구글 API 하루 한도는 **한국 시간 오후 4시**에 초기화. 수업 전날 오후 4시 이후 시험 자제
- 자리당 하루 AI 횟수 `AI_LIMIT` (기본 10)

## 7. 서버 없이 시험하기 (개발용)
`mock_server.py` 는 Code.gs 와 같은 요청·응답을 흉내 낸다 (AI 는 그림을 그대로 돌려줌).
```
python3 apps-script/mock_server.py      # 127.0.0.1:8766
```
`app.json` 의 exec 를 `http://127.0.0.1:8766/exec` 로 바꾸고 로컬에서 세 화면을 연다.
