# 실시간 조종·채팅 (Firebase) 설정 — 선택

**작성일:** 2026.08.22

아이가 폰의 화살표로 자기 그림을 움직이고 말풍선을 띄우는 기능은 두 가지 통로 중 하나로 간다.

| 통로 | 반응 속도 | 준비 |
|---|---|---|
| Firebase Realtime Database | 0.1~0.3초 | 아래 설정 (10분) |
| Apps Script (기본) | 1~3초, 뚝뚝 끊김 | 없음 — 이미 동작 |

Firebase 없이도 동작하지만, 조종이 끊겨 보인다. 수업에서 조종을 쓸 거면 Firebase 를 권한다. 무료 범위로 충분하다(동시 접속 100, 하루 전송 10GB).

## 1. 프로젝트 만들기
1. https://console.firebase.google.com → **프로젝트 추가** → 이름 `sketch-stage` → Google 애널리틱스 끄기 → 만들기
2. 왼쪽 **빌드 → Realtime Database → 데이터베이스 만들기** → 위치 아무거나(예: asia-southeast1) → **테스트 모드로 시작** → 사용 설정

## 2. 규칙
**규칙** 탭에서 아래로 바꾸고 게시. (`room` 아래만 열어 두고, 글자 수를 제한한다)
```json
{
  "rules": {
    "room": {
      "ctrl": {
        ".read": true,
        "$id": { ".write": true, ".validate": "newData.hasChildren(['dx','dy','t'])" }
      },
      "chat": {
        ".read": true, ".write": true,
        "$k": { ".validate": "newData.child('text').isString() && newData.child('text').val().length <= 40" }
      }
    }
  }
}
```
로그인 없이 쓰는 구조라 이 경로는 누구나 쓸 수 있다. 그림·기록은 여기 두지 않는다(Apps Script 쪽). 수업이 끝나면 데이터 탭에서 `room` 을 지워도 된다.

## 3. 웹앱 등록 → 설정값 복사
1. 프로젝트 개요 → **앱 추가 → 웹(</>)** → 닉네임 `stage` → 등록
2. 나오는 `firebaseConfig` 의 값들을 GitHub `app.json` 에 넣는다:
```json
{
  "exec": "https://script.google.com/macros/s/…/exec",
  "teacherKey": "stage",
  "firebase": {
    "apiKey": "…",
    "authDomain": "sketch-stage-xxxx.firebaseapp.com",
    "databaseURL": "https://sketch-stage-xxxx-default-rtdb.asia-southeast1.firebasedatabase.app",
    "projectId": "sketch-stage-xxxx"
  }
}
```
`databaseURL` 이 있어야 실시간 통로가 켜진다. (Firebase 의 apiKey 는 공개되어도 되는 식별자다. Gemini 키와 다르다)

## 4. 확인
프로젝터 오른쪽 위에 `· 실시간` 이 붙으면 Firebase 통로다. 아이 화면 조종 페이지의 "서버 경로라 조금 느리게" 문구가 사라진다.
