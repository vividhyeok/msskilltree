# Codex CLI 개발 프롬프트 — Magic Survival Companion

## 0. 목표

현재 디렉터리에 함께 제공된 `seed-data/` JSON 파일을 사용해
**Magic Survival을 실제로 플레이하면서 옆의 태블릿에서 사용하는 조합/스킬 빌드 어시스턴트 웹앱**을 완성하라.

이 앱은 일반적인 공략 사이트가 아니다.

사용자는 스마트폰에서 Magic Survival을 플레이하다가 레벨업 화면에서 게임을 잠시 멈추고,
태블릿에서 **1~3번 정도 터치한 뒤 2~5초 안에 다시 게임으로 돌아간다.**

제품의 핵심 문장은 다음과 같다.

> **전략은 플레이어가 선택하고, 암기와 조합 가능성 계산은 앱이 대신한다.**

특히 다음과 같은 실패를 제거해야 한다.

> "화염구랑 합치는 게 전기충격이었나 낙뢰였나?"
>
> "이 특성을 찍으면 내가 목표로 하던 조합이 막히는 건가?"
>
> "아까 이 마법을 다른 조합에 이미 써버렸는데 이 조합도 되는 건가?"

이 앱은 이런 내용을 즉시 계산해서 보여줘야 한다.

---

# 1. 작업 전제

현재 디렉터리의 다음 파일을 **초기 source of truth**로 사용한다.

```text
seed-data/
  magics.json
  passives.json
  combinations.json
  rules.json
  metadata.json
  magic-survival-v0.992.bundle.json
```

`bundle.json`은 편의용이다.
실제 앱에서는 가능하면 분리된 JSON들을 사용한다.

**마법명, 특성명, 조합 조건을 React 컴포넌트에 하드코딩하지 마라.**

모든 화면과 조합 계산은 JSON 데이터에서 파생되어야 한다.

향후 게임 버전이 바뀌면 JSON만 교체/수정하여 UI와 엔진이 그대로 동작해야 한다.

현재 seed는 v0.992 기준 개발 시작용 데이터이며,
일부 항목은 사용자가 실제 게임 도감과 비교해 수정할 예정이다.

따라서 데이터에 잘못된 값이 발견되어도 UI 코드를 수정할 필요가 없는 구조를 만들어라.

---

# 2. 기술 스택

권장:

- React
- TypeScript
- Vite
- Tailwind CSS
- Vitest
- vite-plugin-pwa

필요하다면 작은 상태관리 라이브러리를 사용해도 되지만
이 규모에서 Redux 같은 무거운 구조는 사용하지 않는다.

백엔드 없음.
서버 DB 없음.
로그인 없음.

상태 저장은 `localStorage`.

최종 결과는 GitHub에 올리고 Vercel에서 정적 사이트로 바로 배포할 수 있어야 한다.

---

# 3. 기기 우선순위

가장 중요한 기기:

1. **태블릿 landscape — 최우선**
2. 태블릿 portrait
3. PC
4. 스마트폰

기준 viewport:

```text
Tablet landscape: 1024 x 768
Tablet portrait:   768 x 1024
Desktop:          1280 x 800
Mobile:            390 x 844
```

태블릿 landscape에서 가장 완성도가 높아야 한다.

Touch target 최소 44px.
핵심 버튼은 48~60px를 권장한다.

hover 없이는 사용할 수 없는 기능을 만들지 않는다.

---

# 4. 가장 중요한 UX 원칙

사용자는 웹사이트를 읽으러 온 것이 아니라 **게임 중 잠깐 조작하러 온 것**이다.

따라서 다음은 실패다.

- 첫 화면에 대시보드/소개 페이지
- 매번 검색창에 이름 입력
- 작은 드롭다운 여러 번 선택
- 여러 페이지 이동
- 긴 설명을 읽어야 함
- 조합 63개를 기본 화면에 전부 나열
- 작은 버튼
- hover 중심 UI
- 저장 버튼을 따로 눌러야 함
- 게임 중 입력 하나를 고치려고 설정 화면에 들어가야 함

앱 실행 즉시 `현재 Run` 화면으로 진입한다.

---

# 5. Tablet Landscape 기본 레이아웃

권장 구조:

```text
┌──────────────────────────────────────────────────────────────┐
│ Magic Survival Companion   조합 1/3   Undo   New Run       │
├───────────────────────────────────┬──────────────────────────┤
│                                   │                          │
│ 현재 보유/목표 표시                │   목표 조합              │
│                                   │                          │
│ 마법 카드 Grid                     │   지금 가능한 조합        │
│                                   │                          │
│ [화염구 Lv.4] [낙뢰 Lv.2] ...      │   한 단계 남은 조합       │
│                                   │                          │
│                                   │   선택한 마법의 조합 경로 │
└───────────────────────────────────┴──────────────────────────┘
```

대략 60:40 또는 65:35.

오른쪽 패널은 sticky.
사용자가 마법 Grid를 스크롤해도 목표와 관련 조합은 보이게 한다.

---

# 6. 마법 입력

`magics.json`에서 모든 액티브 마법 카드를 자동 생성한다.

카드 예:

```text
┌────────────┐
│ 화염구      │
│ Lv. 4 / 7  │
│            │
│ 목표 A     │
└────────────┘
```

기본 동작:

- 카드 1회 탭 → 레벨 +1
- 즉시 localStorage 저장
- 즉시 전체 조합 상태 재계산
- 짧은 100~150ms 정도의 시각 피드백

숫자를 키보드로 입력하게 하지 않는다.

잘못 눌렀을 때는 상단 `Undo` 한 번으로 바로 복원한다.

최소 최근 20개 action history를 유지한다.

---

# 7. 특성 선택

특성 선택 레벨에 도달하면 즉시 큰 선택 UI를 띄운다.

공격 마법은 일반적으로 Lv.7,
보조 마법은 Lv.5.

하지만 이 규칙 자체를 UI 코드에 하드코딩하지 말고
`magics.json -> traitStages`를 읽어라.

특히 **마력탄은 Lv.4와 Lv.7에 서로 다른 특성 단계가 있다.**

따라서 Run state는 반드시 이런 형태를 지원해야 한다.

```ts
selectedTraits: {
  magic_bolt: {
    4: "fireworks",
    7: "doppelganger"
  }
}
```

단일 `selectedTrait` 구조를 사용하지 마라.

태블릿에서는 큰 dialog/side sheet,
모바일에서는 bottom sheet가 적합하다.

---

# 8. 핵심 UX — 마법 하나를 눌렀을 때 미래 경로를 즉시 보여라

이 앱의 가장 중요한 화면 중 하나다.

예를 들어 사용자가 `화염구`를 선택하면 오른쪽 패널에서:

```text
🔥 화염구

대폭발
  → 데몬 방정식
     + 에너지탄 / 플레어

독가스
  → 겨울 폭풍
     + 눈보라 / 혹한기

  → 흑사병
     + 마력탄 / 난사

별자리
  → 백귀야행
     + 위성 / 도깨비불

  → 원점폭발
     + 에너지탄 / 플레어

  → 제네시스
     + 눈보라 / 별똥별
```

같이 **특성 → 가능한 조합 → 필요한 상대 마법/특성**을 한눈에 보여준다.

중요:

사용자가 전체 조합표를 암기하거나 검색할 필요가 없어야 한다.

---

# 9. 조합 상태 엔진

UI 안에서 즉흥적으로 계산하지 말고
별도의 pure-function 엔진을 만든다.

권장:

```text
src/engine/
  evaluateCombination.ts
  getRelevantCombinations.ts
  getCombinationConflicts.ts
  getMagicPaths.ts
  validateGameData.ts
```

상태:

```text
READY
IN_PROGRESS
AVAILABLE
BLOCKED
COMPLETED
```

의미:

### READY
모든 필수 마법/패시브/특성 조건이 충족됨.

### IN_PROGRESS
관련 마법을 이미 보유/성장 중이며 아직 요구 레벨이나 특성이 덜 완성됨.

### AVAILABLE
현재 Run에서 아직 만들 수 있지만 해당 재료를 아직 얻지 않았음.

### BLOCKED
현재 Run의 선택 때문에 더 이상 만들 수 없음.

### COMPLETED
이미 완료 처리한 조합.

---

# 10. BLOCKED 판정은 이유까지 계산

예:

```text
블랙홀
사용 불가

위성 / 핵융합이
'플라즈마 광선'에 이미 사용됨
```

또는:

```text
데몬 방정식
사용 불가

화염구 최종 특성으로
'독가스'를 이미 선택함

필요 특성:
대폭발
```

`getBlockedReason()`을 별도로 구현하고
UI에서 이해 가능한 한국어 메시지로 보여준다.

---

# 11. 완료된 조합의 마법 잠금

`rules.json`의 규칙을 읽는다.

MVP에서는:

> 완료한 조합에 참여한 액티브 마법은
> 이후 다른 조합의 주력/재료로 다시 사용할 수 없다.

즉 조합 A를 완료하면 해당 조합의 `activeMagicLocks`를 Run state에 반영한다.

그 즉시 전체 조합 후보를 다시 계산한다.

예:

```text
데몬 방정식 완료
화염구 + 에너지탄 사용됨
```

이후 화염구 또는 에너지탄을 요구하는 다른 조합은 BLOCKED.

기본 화면에서는 BLOCKED를 숨기거나 아래로 보낸다.

`불가능한 조합 보기`를 눌렀을 때만 이유와 함께 보여줘도 된다.

---

# 12. 목표 조합 Pin

조합 카드를 누르면:

```text
[목표로 지정]
```

할 수 있어야 한다.

목표로 지정한 조합은 A / B / C 등의 badge를 부여한다.

예:

```text
A  데몬 방정식
   화염구 / 대폭발       ✓
   에너지탄 / 플레어     Lv.3
```

그리고 관련 마법 카드에도 `A` badge를 붙인다.

사용자가 화면을 보는 순간:

> "화염구랑 에너지탄은 서로 묶어둔 애들이구나."

를 알아야 한다.

---

# 13. 목표 간 충돌을 미리 경고

이 기능은 매우 중요하다.

예를 들어 목표 A와 목표 B가
동일한 액티브 마법을 서로 다른 조합에서 요구한다면:

```text
⚠ 목표 충돌

A 데몬 방정식
B 원점폭발

두 조합 모두 에너지탄을 사용합니다.
현재 규칙에서는 둘을 동시에 완성할 수 없습니다.
```

라고 즉시 보여준다.

또한 동일한 마법의 서로 다른 특성을 요구하는 경우도 충돌이다.

예:

```text
화염구
A → 대폭발 필요
B → 별자리 필요

동시 달성 불가
```

이것이 단순 조합표와 이 앱의 차이점이다.

---

# 14. 잘못된 특성 선택 경고

목표 조합이 요구하는 특성과 다른 특성을 누르려고 하면 적용 전에 경고한다.

예:

```text
이 선택을 하면 목표 A
'데몬 방정식'을 만들 수 없습니다.

필요:
화염구 → 대폭발

선택:
화염구 → 독가스

[그래도 선택]
[취소]
```

사용자의 선택은 막지 않는다.
기억 실수만 막는다.

---

# 15. 마력탄 예외

`combinations.json`의 `traitStage`를 정확히 검사한다.

예를 들어 `불꽃놀이` 조합은:

```text
마력탄 Lv.4 → 폭죽
+
에너지탄 → 플레어
```

만 요구한다.

따라서 마력탄 Lv.7에서 어떤 특성을 골랐는지는
해당 조합을 BLOCKED시키면 안 된다.

반대로 `폭풍의 지배자`가 Lv.7 `난사`를 요구한다면
Lv.4 특성은 상관 없어야 한다.

---

# 16. 패시브 요구조건

양자폭발, 텔레포트, 오버마인드 등은
일반적인 액티브 2개 조합이 아니다.

`requirements[]`를 generic하게 처리한다.

지원 타입:

```text
activeMagic
passiveMagic
completedCombination
```

현재 seed에 포함된 대표 예:

```text
양자폭발
보호막 / 파괴장
+ 마력 발산

텔레포트
유체화 / 공간 왜곡
+ 집중

오버마인드
지능 Lv.5
+ 마법진 / 대마법진
```

UI도 같은 카드 구조에 억지로 끼우지 말고
요구조건의 타입을 읽어서 자연스럽게 표현한다.

---

# 17. 조합 슬롯

`rules.json`을 읽는다.

기본:

```text
Lv.25 → +1
Lv.50 → +1
Lv.75 → +1
기본 최대 3
```

하지만 사용자가 게임 중 매 레벨을 별도로 입력하게 만드는 것은 UX가 나쁘다.

MVP에서는 상단에:

```text
조합 1 / 3
```

를 표시한다.

필요하면 작은 `+ 보너스` 또는 `권능 +1` 토글을 제공해
권능의 영역을 얻었을 때 수동으로 +1 할 수 있게 한다.

`창조의 문` 완료 시 JSON effect를 읽고 +2를 자동 적용한다.

`데우스 엑스 마키나` 완료 시
JSON effect를 읽고 이후 조합을 차단한다.

이 숫자들을 컴포넌트에 하드코딩하지 않는다.

---

# 18. 특수 조합

### 창조의 문

JSON의:

```text
addCombinationSlots +2
```

효과를 엔진이 적용한다.

### 데우스 엑스 마키나

JSON의:

```text
completedCombination: overmind
combinationOrder: 3
blockFurtherCombinations
```

을 generic rule로 처리한다.

이름을 검사해서 if문을 쓰는 방식은 피한다.

나쁜 코드:

```ts
if (combo.id === "deus_ex_machina") ...
```

좋은 코드:

```ts
applyConditions(combo.conditions)
applyEffects(combo.effects)
```

---

# 19. 관련 조합 정렬

오른쪽 패널에 63개를 전부 보여주지 않는다.

우선순위:

1. 목표로 지정한 조합
2. READY
3. 현재 선택한 마법과 관련된 IN_PROGRESS
4. 한 조건만 더 채우면 되는 조합
5. 기타 AVAILABLE

BLOCKED는 기본 숨김.

사용자가 지금 무엇을 집어야 하는지
**검색 없이 1초 안에 파악**할 수 있어야 한다.

단, 앱은 최적 선택을 강요하지 않는다.

---

# 20. 앱은 추천 AI가 아니다

나쁜 예:

```text
지금 무조건 낙뢰를 고르세요.
```

좋은 예:

```text
낙뢰를 선택하면 현재 Run에서
다음 4개 조합 경로가 열립니다.
```

판단은 플레이어가 한다.

---

# 21. 빠른 입력을 위한 보조 UX

가능하면 다음을 구현한다.

- Undo
- 현재 보유 마법만 보기
- 목표 관련 마법만 보기
- 아직 선택하지 않은 마법만 보기
- 한국어 이름 검색

하지만 필터/검색이 메인 UX가 되어서는 안 된다.

---

# 22. Build 저장

현재 목표 조합 세트를 localStorage에 저장할 수 있게 한다.

예:

```text
즐겨찾는 빌드

- 번개
- 화염
- 테스트
```

저장되는 것은 목표 조합 계획이다.

새 Run에서 저장한 Build를 불러오면:

- 목표 조합은 복원
- 실제 마법 레벨은 0부터 시작

한다.

---

# 23. Auto Save

Save 버튼을 만들지 않는다.

다음 변경마다 자동 저장:

- 마법 레벨
- 특성
- 목표 조합
- 완료 조합
- 보너스 슬롯
- saved builds

브라우저 종료 후 다시 열어도 Run이 복원되어야 한다.

---

# 24. New Run

상단에 New Run.

누르면 confirmation.

초기화:

- 마법 레벨
- 선택 특성
- 완료 조합
- 액티브 마법 lock
- action history

유지:

- saved builds
- UI preference

---

# 25. 모바일

390px에서는 2-column을 억지로 축소하지 않는다.

권장:

```text
현재 Run
마법 Grid

[조합 후보 4]
```

`조합 후보` 버튼을 누르면 bottom sheet.

PWA 설치 시 standalone으로 쓸 수 있게 한다.

---

# 26. PWA / Offline

seed JSON은 번들에 포함한다.

런타임에 Wiki를 크롤링하지 않는다.
사용 중 네트워크 요청 없이 모든 계산이 가능해야 한다.

PWA:

- installable
- offline
- standalone
- 빠른 startup

---

# 27. 데이터 Audit 화면

사용자가 실제 게임 도감과 seed 데이터를 비교할 예정이다.

개발용이지만 접근 가능한 `/audit` route를 만든다.

예:

```text
Data Audit
v0.992

12 / 63 확인

양자폭발

보호막 / 파괴장
+
마력 발산

현재 상태:
user_verified_game_screenshot

[일치]
[수정 필요]
```

브라우저만으로 원본 JSON 파일 자체를 수정할 필요는 없다.

대신 localStorage에 audit status / correction memo를 저장하고
`Export corrections.json` 버튼으로 다운로드할 수 있게 하면 좋다.

예:

```json
{
  "combinationId": "xxx",
  "field": "requirements[1]",
  "note": "게임에서는 낙뢰로 표시됨"
}
```

이렇게 하면 사용자가 검수 결과를 나중에 코드에 반영하기 쉽다.

이 기능 때문에 MVP가 늦어져서는 안 된다.
P0가 끝난 후 구현한다.

---

# 28. 디자인

어두운 게임 companion UI.

게임 원본 이미지를 무단 복제하지 않아도 된다.
처음에는 텍스트/심볼/간단한 CSS 아이콘으로 충분하다.

중요도:

1. 터치 정확성
2. 이름 가독성
3. 목표/충돌/완료 상태 인지
4. 정보 밀도
5. 시각적 완성도

비슷한 이름을 혼동하지 않도록
마법명/특성명을 작게 만들지 않는다.

---

# 29. 데이터 검증

앱 시작 전 또는 테스트에서 seed-data를 validation한다.

필수:

- magic id unique
- combination id unique
- trait id가 해당 magic에 실제 존재
- traitStage가 실제 stage와 일치
- passive id 존재
- completedCombination reference 존재
- activeMagicLocks 일관성
- unknown requirement/effect type 발견 시 실패

데이터 오류를 조용히 무시하지 않는다.

개발 모드에서는 명확한 오류를 출력한다.

---

# 30. 테스트

Vitest로 최소 다음을 작성한다.

### Trait conflict
화염구 대폭발을 요구하는 조합이 있는데
화염구 독가스를 선택하면 BLOCKED.

### Locked magic
완료한 조합에 사용한 마법을 요구하는 다른 조합은 BLOCKED.

### Magic Bolt Lv4/Lv7
Lv.4 폭죽을 요구하는 조합은 Lv.7 선택과 무관하게 가능.

### Passive requirement
양자폭발은 보호막/파괴장 + 마력 발산 조건을 모두 검사.

### Special
창조의 문 완료 시 슬롯 +2.

### Deus Ex Machina
오버마인드 미완료 → BLOCKED.
3번째 조합이 아님 → BLOCKED.
완료 후 추가 조합 → BLOCKED.

### Persistence
localStorage serialization/deserialization.

---

# 31. 완료 전 직접 검증할 UX Scenario

### Scenario A
화염구를 Lv.7까지 올리고 대폭발 선택.
즉시 대폭발을 사용하는 조합과 상대 재료가 보여야 한다.

### Scenario B
데몬 방정식을 목표 A로 pin.
화염구/에너지탄 카드에 A badge가 보여야 한다.

### Scenario C
에너지탄이 필요한 다른 조합을 B로 pin.
동일 마법 사용 충돌을 즉시 알려야 한다.

### Scenario D
데몬 방정식 완료 처리.
화염구/에너지탄을 쓰는 다른 조합이 BLOCKED되어 기본 후보에서 사라져야 한다.

### Scenario E
실수로 레벨을 한 번 더 터치.
Undo 한 번으로 복원.

### Scenario F
태블릿 브라우저 종료 후 재실행.
현재 Run 그대로 복원.

---

# 32. 우선순위

## P0 — 반드시 완성

- JSON-driven architecture
- data validation
- Tablet-first Run UI
- 모든 액티브 마법 카드 생성
- 레벨 탭 입력
- 다단계 trait 지원
- 관련 조합 경로 표시
- 목표 조합 pin
- 목표 충돌 판정
- READY / IN_PROGRESS / AVAILABLE / BLOCKED / COMPLETED
- 조합 완료 후 active magic lock
- Undo
- localStorage
- responsive
- production build 성공

## P1

- saved builds
- PWA/offline
- quick filters
- search
- manual bonus combination slot
- audit page / corrections export

## P2

- 애니메이션 polish
- 추가 설명 UI
- 더 세밀한 디자인

P2 때문에 P0를 희생하지 마라.

---

# 33. 프로젝트 구조 예시

```text
src/
  data/
    magics.json
    passives.json
    combinations.json
    rules.json
    metadata.json

  engine/
    evaluateCombination.ts
    getRelevantCombinations.ts
    getMagicPaths.ts
    conflictEngine.ts
    applyEffects.ts
    validateGameData.ts

  features/
    run/
    magic/
    combinations/
    builds/
    audit/

  storage/
    runStorage.ts
    buildStorage.ts

  types/
    game-data.ts
    run-state.ts
```

더 좋은 구조가 있다면 바꿔도 된다.

---

# 34. Git / GitHub / Vercel

현재 디렉터리가 빈 폴더라면 프로젝트를 생성한다.

Git repository가 아니면 초기화한다.

최종적으로 최소 다음이 성공해야 한다.

```bash
npm install
npm run test
npm run build
```

가능하다면 lint도 구성해 실행한다.

GitHub 인증이 이미 되어 있고 remote 생성/push가 가능한 환경이면
깔끔한 commit으로 push까지 진행한다.

그렇지 않으면 로컬 repo를 완성하고
마지막에 사용자가 실행할 최소 GitHub push 명령만 알려준다.

Vercel에서 별도 backend 없이 배포되어야 한다.

---

# 35. Responsive QA

최소 다음 viewport를 확인한다.

```text
1024x768  ← 가장 중요
768x1024
1280x800
390x844
```

가능한 환경이면 브라우저 자동화/스크린샷으로 확인하고
overflow, 잘린 버튼, 지나치게 작은 touch target을 수정한다.

---

# 36. 완료 판단 기준

다음 질문에 YES여야 한다.

> 사용자가 스마트폰에서 Magic Survival을 하다가 레벨업했을 때,
> 태블릿을 잠깐 1~3번 터치하는 것으로 선택을 기록하고,
> 그 선택으로 가능한 조합과 막힌 조합을 즉시 이해한 뒤,
> 다시 게임으로 돌아갈 수 있는가?

그리고 특히:

> 사용자가 조합 이름과 재료/특성을 외울 필요가 없어졌는가?

YES가 아니면 기능을 늘리지 말고 UX를 먼저 수정한다.

---

# 37. 구현 시작

1. `seed-data/`를 읽고 schema/type부터 정의한다.
2. 데이터 validation을 먼저 만든다.
3. 조합/충돌 엔진을 pure function으로 구현하고 테스트한다.
4. Tablet-first Run UI를 구현한다.
5. localStorage/Undo를 붙인다.
6. responsive/PWA를 마무리한다.
7. 테스트와 production build를 실행한다.
8. README를 작성한다.
9. Git 상태를 정리한다.

불필요한 확인 질문은 하지 말고,
위 요구사항 내에서 합리적인 설계 판단은 직접 내려 완성하라.
