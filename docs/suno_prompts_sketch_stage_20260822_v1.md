# 스케치 무대 음원 — Suno v5.5 프롬프트
**작성일:** 2026.08.22 · **용도:** 프로젝터 무대(stage) 효과음·장단 · **파일명 규칙:** 영문, mp3, 각 1MB 이내

## 공통 설정 (Suno 화면)
- **Custom 모드** · **Instrumental 켜기**(보컬 없음) · My Taste 끄기
- Weirdness 35~45% · Style Influence 80%
- 생성 후 필요한 길이만 잘라서 저장 (루프용은 첫 박 시작점에서 정확히 자르기)
- Remaster 사용 금지

> 1~2초짜리 효과음(첨벙·부글·환호)은 Suno가 잘 못 만듭니다. 환호는 아래 프롬프트로 만든 뒤 2~3초만 잘라 쓰고, **첨벙·부글은 지금 브라우저 합성음을 그대로 쓰거나** 무료 효과음 사이트(Pixabay Sound Effects, Freesound, CC0)에서 받는 편이 빠릅니다.

---

## 1. `dance_loop.mp3` — 춤 시간 (20~30초 반복)

**Style**
```
<quality:high> Korean Gugak Jangdan meets Bouncy Kids Pop, instrumental only, 108 BPM, C major, Jajinmori 12/8 groove. Buk barrel drum deep and round on the downbeat, Janggu hourglass drum with crisp tight "deong-gi-deok-kung" pattern, Kkwaenggwari small gong bright sparkling accents, playful marimba and bright plucked Gayageum riff carrying a simple pentatonic hook, light handclaps. Cheerful, bouncy, children jumping and spinning. Clean modern pop production, punchy drums upfront, wide stereo percussion, no reverb wash. Steady energy from first beat, seamless 8-bar loop structure, same groove repeating without build or drop. No vocals, no humming, no whistling, no vocalizations, no intro, starts on the downbeat.
```
**Exclude Styles**
```
vocals, humming, ballad, slow intro, EDM drop
```
**Lyrics (Instrumental 켜도 붙여 넣기)**
```
[Instrumental: Buk and Janggu groove, No Vocals, start on downbeat]
[Dynamic: f]
[Instrument: Janggu, Buk, Kkwaenggwari]
[Hook: Gayageum and Marimba pentatonic riff, 8 bars]
[Instrumental: same groove repeat, 8 bars]
[Hook: riff repeat with handclaps, 8 bars]
[Instrumental: same groove repeat, 8 bars]
[Outro: groove continues 4 bars]
[End]
```
**자르기:** 첫 8마디 시작점부터 32마디(약 71초 중 앞 30초)를 잘라 루프. 마지막 박이 첫 박과 이어지는지 확인.

---

## 2. `ssireum_loop.mp3` — 씨름 장단 (8~10초 반복)

**Style**
```
<quality:high> Korean traditional percussion only, Hwimori Jangdan, instrumental, 132 BPM, no melody. Buk barrel drum heavy thunderous hits, Janggu rapid driving "kung-deok-kung-deok" pattern, Jing large gong single deep strike every 4 bars, occasional Kkwaenggwari rattle building tension. Tense, competitive, wrestlers circling, crowd holding breath. Dry close-mic recording, punchy transients, minimal reverb, samulnori performance energy. Constant driving energy, no build, no drop, repeating 4-bar pattern. No vocals, no shouting, no humming, no melodic instruments, starts immediately on the first drum hit.
```
**Exclude Styles**
```
vocals, melody, synth, ballad, reverb wash
```
**Lyrics**
```
[Instrumental: Percussion Only, No Vocals, immediate start]
[Dynamic: ff]
[Instrument: Buk, Janggu, Jing, Kkwaenggwari]
[Instrumental: 4-bar Hwimori pattern repeat x8]
[Outro: pattern continues, Jing strike]
[End]
```
**자르기:** 징이 울리는 4마디 단위(약 7.3초)로 잘라 루프.

---

## 3. `win.mp3` — 이겼다! (2~3초)

**Style**
```
<quality:high> Korean victory fanfare, instrumental, 120 BPM, C major, very short. One huge Jing gong strike ringing long, immediately followed by a triumphant Taepyeongso double-reed ascending three-note call and a bright brass stab, confetti-like Kkwaenggwari shimmer, big Buk drum hit on the final note. Triumphant, joyful, a child winning a game. Punchy, bright, wide stereo. Single fanfare burst then natural ring-out, under 4 seconds of material, no groove, no repeat. No vocals, no humming, no cheering, no intro.
```
**Exclude Styles**
```
vocals, humming, groove, drums loop, slow
```
**Lyrics**
```
[Instrumental: Single Fanfare Burst, No Vocals]
[Dynamic: ff]
[Instrument: Jing, Taepyeongso, Brass, Buk]
[Big Finish]
[Instrumental: gong ring-out 3 seconds]
[End]
```
**자르기:** 징 타격 직전부터 울림 끝까지 2.5~3초.

---

## 4. `friend.mp3` — 친구 만남 징글 (2초)

**Style**
```
<quality:high> Tiny cheerful jingle, instrumental, 120 BPM, G major, two seconds of material. Bright marimba and music box playing a quick ascending four-note pentatonic arpeggio, soft Gayageum pluck doubling it, small bell ding on the last note, light Janggu tap. Warm, friendly, two friends meeting and smiling. Clean, close, sparkling, dry. One short phrase then silence, no groove, no repeat. No vocals, no humming, no drums loop, no intro.
```
**Exclude Styles**
```
vocals, humming, drums loop, reverb wash, dark
```
**Lyrics**
```
[Instrumental: One Short Jingle, No Vocals]
[Dynamic: mf]
[Instrument: Marimba, Music Box, Gayageum, Bell]
[Instrumental: ascending four-note phrase once]
[End]
```

---

## 5. `enter.mp3` — 새 작품 등장 (1초)

**Style**
```
<quality:high> Ultra short UI sound, instrumental, 120 BPM, C major, one second. A single bright rising two-note "ppyo-rong" blip: glassy marimba tone sliding up a fifth with a soft bubble pop, tiny Kkwaenggwari tick on top. Cute, surprising, something popping into view. Clean, dry, close. One sound then silence, no groove, no repeat. No vocals, no humming, no drums, no intro.
```
**Exclude Styles**
```
vocals, humming, drums, pad, reverb wash
```
**Lyrics**
```
[Instrumental: Single Blip, No Vocals]
[Dynamic: mf]
[Instrument: Marimba, Kkwaenggwari]
[Instrumental: rising two-note blip once]
[End]
```
**자르기:** 가장 깔끔한 한 번만 1초로.

---

## 6. `cheer.mp3` — 환호 (2~3초) ※ Suno로는 보조 수단

Suno는 가사 없는 군중 소리를 불안정하게 만듭니다. 시도할 경우:

**Style**
```
<quality:high> Crowd cheer sound only, no music, a small group of children cheering "wa-a-a" and clapping excitedly at a sports match, bright room, natural, close, 3 seconds, no instruments, no melody, no singing.
```
**Exclude Styles**
```
music, instruments, singing, melody, reverb wash
```
**Lyrics**
```
[Crowd: children cheering and clapping, no words]
[End]
```
실패하면 Pixabay Sound Effects에서 "kids cheering" CC0 음원으로 대체.

---

## 7. `splash.mp3` / `bubble.mp3` — 물 효과음
Suno 비권장. 현재 브라우저 합성음 유지 또는 무료 효과음(Pixabay "water splash", "bubbles") 사용.

---

## 체크리스트
- [ ] Style 모두 950자 이내 (위 항목 최대 약 780자)
- [ ] Exclude Styles 각 5개 이하
- [ ] `<quality:high>` 최상단
- [ ] Lyrics 끝 `[End]`
- [ ] Instrumental 토글 켬 (보컬 방지 이중 안전장치)
- [ ] 루프 2종은 첫 박 기준으로 잘라 이음새 확인
