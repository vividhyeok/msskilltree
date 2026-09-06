# Codex V4 upgrade prompt — Magic Survival Companion

현재 저장소 `vividhyeok/msskilltree`를 먼저 읽고, 지금 구현되어 있는 기능과 테스트를 이해한 뒤 작업해줘.

이 ZIP은 이전 프롬프트를 세세하게 다시 지시하기 위한 것이 아니라, **현재 프로젝트가 다음 단계로 가는 데 필요한 제품 맥락과 조사 데이터를 제공하기 위한 자료팩**이다.

## 원하는 결과

현재 앱은 이미 “내가 정한 fusion 빌드를 실수 없이 완성하게 해주는 Companion”으로 실제 도움이 된다.

이제 목표는:

> **Magic Survival을 플레이하는 동안 옆 태블릿을 몇 초 봤을 때, 조합뿐 아니라 실제 Run 전체에서 더 좋은 결정을 하도록 돕는 Companion**

으로 확장하는 것이다.

단, 기능이 늘어날수록 Live UI는 복잡해지면 안 된다.

게임 중 사용자 경험의 기준은 항상:

> 게임에 선택지가 뜸 → 태블릿을 흘끗 봄 → 중요한 선택이 눈에 들어옴 → 실제 선택한 것만 최소 입력으로 기록 → 게임 복귀

다.

## 현재 잘 된 것은 보존

현재 repo의 다음 방향은 좋다.

- deterministic fusion engine
- trait-stage 처리
- target conflict
- carrier / material / condition
- `→ 승계`, `× 병합·소멸`
- semantic target colors
- NEED NOW / `지금 뜨면 고르세요`
- Undo / localStorage / offline
- deterministic과 Community Meta Layer 분리
- source / confidence / patch freshness
- 기존 성장 효율 경로와 전투 meta 추천을 구분

이것들을 다시 만드는 작업으로 시간을 쓰지 마라.

## 이번 자료팩에서 확인한 가장 큰 누락

`research/CURRENT_PRODUCT_GAPS.md`와 `data/authoritative/`를 읽어라.

특히:

1. 현재 deterministic passive가 3개뿐이지만 실제 일반 패시브는 10개다.
2. 특수 패시브 25종이 실제 레벨업 의사결정에 들어간다.
3. MAX 이후 성장강화는 별도 phase이며 9종 / 기본 50회다.
4. Class 24 / Subject 25 / Ultimate 24의 현재 catalog가 필요하다.
5. Artifact/Synergy는 현재 수동 비교 UX보다 더 자동화할 수 있다.
6. 시간대에 따라 Artifact 가치가 변하므로 optional Run timer가 meta context를 자동화할 수 있다.
7. 가능한 범위에서 현재 build의 CDR/생존/이속/CC/경제 같은 “부족한 축”을 설명할 수 있다.

## supplied data의 사용법

이 ZIP의 데이터는 종류가 다르다.

### `data/authoritative/`
공식/Namu/구조화 Wiki에서 확인한 게임 규칙·catalog·수치 seed.

### `data/meta/`
Wiki 편집자 평가처럼 **의견/전략**인 정보. 사실과 섞지 않는다.

### `previous-meta-v1/`
이전에 제공한 Reddit/DC/AtWiki 기반 Community Meta seed. 지금 repo에 이미 반영된 내용과 중복될 수 있으므로 무조건 복사하지 말고 현재 repo와 diff해서 필요한 것만 사용한다.

### `data/data-status.json`
완성도와 source conflict를 설명한다.

## 구현 방향은 네가 결정

React component 개수, CSS 수치, 상태관리 라이브러리, 점수식 같은 세부사항은 내가 고정하지 않는다.

현재 코드를 보고 가장 단순하고 유지보수 가능한 해법을 선택해줘.

다만 아래 원칙은 지켜줘.

### 1. deterministic과 meta는 계속 분리
“가능하다”와 “좋다”는 다른 질문이다.

### 2. 데이터로 확장
Class/Subject/Ultimate/Passive/Artifact/Synergy 이름을 component if문으로 늘리지 마라.

### 3. input cost 최소화
새 시스템을 추가할 때마다 “게임 중 사용자가 이것을 매번 입력해야 하나?”를 먼저 물어라.

예:
- phase를 매번 수동 선택하는 대신 Run timer로 자동 추론
- synergy 남은 재료 수를 매번 수동 입력하기보다 artifact inventory에서 계산
- Class/Subject는 pre-run에서 한 번
- 실제 선택한 item만 기록

### 4. Live HUD는 더 단순해질 수도 있음
현재 live search/filter, tile reorder 같은 것이 실제 glance 속도를 떨어뜨린다면 제거/secondary로 이동해도 된다.

21개 active magic은 반복 사용 시 **공간 기억**이 강력한 인터페이스다. Live mode에서 위치 안정성을 우선 검토해라.

### 5. NEED NOW가 주인공
일반 passive/special passive까지 들어와도 결국 사용자가 보고 싶은 것은:
- 지금 뜨면 집을 것
- 목표를 망가뜨리는 것
- 현재 빌드에서 특히 가치 있는 것
이다.

긴 근거는 눌렀을 때 보여도 된다.

### 6. Artifact decision을 실제 게임 event처럼 설계
현재 3~4 후보 dropdown 비교는 좋은 prototype이지만 live play에는 입력이 많다.
full inventory/recipe 정보가 있는 범위에서는 자동으로 synergy proximity를 계산하고 후보 선택 자체도 더 빠르게 만들 방법을 찾아라.

### 7. source conflict를 숨기지 마라
`DATA_CONFLICTS.md`를 읽고 더 최신 source를 우선하되 provenance를 보존한다.

## 이번 pass의 범위

모든 조사 데이터를 억지로 한 화면에 노출할 필요는 없다.

우선순위는 **사용자가 오늘 플레이하면서 체감할 개선**이다.

데이터 구조를 먼저 확장한 뒤, 어떤 기능을 live에 넣고 어떤 기능을 pre-run/secondary view로 둘지는 직접 판단해라.

Artifact 전체 catalog가 이 seed만으로 완전하지 않다면 가짜 완성을 하지 마라.
현재 repo의 existing artifact entities와 이 seed를 merge하고, 누락은 명확한 `unverified/incomplete` 상태로 남겨라.

## 검증

- 기존 saves migration
- existing unit/e2e tests 유지
- 새 deterministic data validation
- Class/Subject/Ultimate ID reference validation
- Ultimate → required fusion/class/subject eligibility tests
- passive/growth phase 구분 tests
- carrier/material 기존 regression
- tablet 1024×768 live glance QA
- build/lint/test/e2e

## 완료 보고

완료 후에는 코드 변경 목록보다 다음을 중심으로 말해줘.

- 이제 실제 Run에서 어떤 추가 판단을 도와주는가
- 사용자 입력을 무엇을 줄였는가
- deterministic/meta 경계를 어떻게 지켰는가
- 공급 데이터 중 무엇을 실제 반영했고 무엇을 검증 대기로 남겼는가
- 다음 패치에서 어떤 데이터 파일만 갱신하면 되는가

세부 구현은 네가 판단해서 진행해줘.
