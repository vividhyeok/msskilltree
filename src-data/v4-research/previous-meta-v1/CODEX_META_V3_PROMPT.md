# Codex 수정 프롬프트 — Magic Survival Companion V3

현재 저장소를 먼저 충분히 읽고 기존 기능/데이터/테스트를 이해한 뒤 수정해줘.

## 제품 목표

이 앱은 Magic Survival 백과사전이나 단순 조합 계산기가 아니다.

**실제 게임을 플레이하는 동안 옆 태블릿에서 몇 초만 보고, 혼자 했을 때보다 더 좋은 선택을 하게 해주는 Run Companion**으로 만들고 싶다.

현재 deterministic layer는 이미 가치가 높다.
- 정확한 마법 레벨/특성
- 조합 가능성
- 재료 소비
- 목표 충돌
- 조합 슬롯

이 기능은 최대한 보존해줘.

이제 이 폴더에 함께 제공된 `data/`와 `research/`를 바탕으로 그 위에 **Community Meta Layer**를 추가하고 싶다.

## Community Meta Layer

단순한 flat tier list가 아니다.

같은 마법/Artifact/시너지도:
- 사용자가 노리는 목표(파밍 / 첫 60분 / PB / 80분+)
- 현재 빌드 archetype
- 현재 시간대
- Class / Subject / Ultimate
- 현재 조합
- 이미 보유한 Artifact / 완성된 Synergy
- 시너지 완성까지 남은 기회비용
- patch
에 따라 가치가 바뀐다는 전제로 설계해줘.

앱은 가능하면 다음을 구분해야 한다.

- `이 조합은 만들 수 있다` → deterministic fact
- `현재 생존형 PE 빌드에서는 우선도가 높다` → community meta
- `초반에는 좋지만 40분 이후 가치가 낮다` → phase-dependent meta
- `시너지 완성이 가까워진 지금 가치가 올라갔다` → opportunity cost
- `커뮤니티 의견이 갈린다` → uncertainty

커뮤니티 의견을 객관적 게임 규칙처럼 표현하지 말고, 필요하면 짧은 이유/신뢰도/근거 맥락을 보여줘.

정확한 추천 알고리즘은 현재 코드와 supplied data를 보고 네가 설계해줘. 근거 없는 정밀 점수보다 설명 가능한 우선순위를 선호한다.

## Live-play UX

기능이 늘어나도 기본 Game Mode는 더 복잡해지면 안 된다.

가장 중요한 흐름:

> 게임에 3~4개의 선택지가 뜬다 → 태블릿을 본다 → 지금 내 계획에 필요한 것과 현재 상황에서 가치 있는 것이 바로 눈에 들어온다 → 실제 선택한 것만 기록하고 게임으로 돌아간다.

특히 현재 앱을 보고 느낀 문제:
- 마법 tile 위치가 Run 중 재정렬되면 눈이 매번 다시 찾아야 한다. Live mode에서는 공간 위치가 안정적인 쪽을 선호한다.
- `NEED NOW` 또는 그에 해당하는 “지금 뜨면 집을 것”이 UI의 주인공이어야 한다.
- Catalog/Audit/긴 설명/출처는 필요하지만 Live HUD의 주인공이 아니다.
- meta 정보가 추가돼도 대시보드처럼 만들지 마라.
- Artifact 선택은 마법 레벨업과 다른 이벤트이므로, 필요하면 별도의 빠른 decision mode로 분리해도 좋다.
- player level / MAX 전 남은 성장 예산 / MAX 후 성장강화 50 같은 정보는 실제 판단을 개선하는 최소 입력 방식으로 통합해도 좋다. 매 레벨마다 추가 입력을 강제하지 마라.

정확한 레이아웃, 컴포넌트 구조, 상태관리 방식은 네가 결정해줘.

## 제공 자료

- `data/meta-rules.v0.992.json`
- `data/build-archetypes.v0.992.json`
- `data/entities.v0.992.json`
- `data/phase-rules.v0.992.json`
- `data/source-index.json`
- `data/taxonomy.json`
- `data/patch-metadata.json`
- `research/*.md`

이것들은 **1차 seed**다.

주의:
- v0.992 snapshot
- v0.993가 2026-09-07 예정이라고 커뮤니티에 공유된 상태
- Naver Cafe와 Discord는 직접 전수 수집하지 못함
- 일부 번역명은 manual check 필요
- Reddit/DC/AtWiki는 서로 의견이 다를 수 있음

따라서 meta를 React 컴포넌트의 if문으로 하드코딩하지 말고, patch/context/source를 유지하는 data-driven 구조로 만들어줘.

## 추천 엔진에 바라는 사고방식

세부 알고리즘은 네가 결정하되 다음 원칙은 지켜줘.

1. deterministic engine으로 불가능한 선택을 먼저 제거.
2. 사용자의 goal/archetype/phase/context를 파악.
3. 직접 시너지, 역할, phase value, synergy completion proximity, opportunity cost, patch freshness, source confidence를 이용해 후보를 설명/정렬.
4. context가 부족하면 확신을 낮춤.
5. 의견이 갈리면 하나를 진리로 만들지 않음.
6. 사용자에게는 “현재 빌드에서 높음 / 후반 가치 상승 / 의견 갈림”처럼 이해 가능한 언어가 tier 문자보다 중요.

현재 `getRecommendedPlan`류의 “추가 레벨 최소화” 계산은 유용하지만 **전투 성능 추천과 분리**해줘. 유지한다면 의미가 드러나는 이름으로 바꿔도 좋다.

## 범위

이번 pass에 모든 Artifact/Ultimate/Class를 완전 구현할 필요는 없다.

대신:
- supplied seed가 충분한 부분부터 실제 플레이에 도움이 되는 기능을 완성하고
- 데이터만 늘리면 이후 자연스럽게 확장되는 구조를 만들고
- 이번 pass에 무엇을 구현할지는 코드베이스/UX를 보고 네가 판단해줘.

사용자가 오늘 바로 플레이하면서 체감할 개선을 우선한다.

## 검증

- 기존 deterministic 기능을 깨지 마라.
- test/build를 통과시켜라.
- 태블릿 live-play 상황으로 QA해라.
- meta data를 바꿨을 때 코드 수정 없이 추천이 바뀔 수 있는지 확인해라.
- patch mismatch/stale data를 안전하게 표현할 방법을 마련해라.

완료 후에는 구현 세부를 길게 나열하기보다:
- 어떤 판단을 새로 도와주는지
- deterministic과 meta를 어떻게 분리했는지
- Live HUD가 왜 더 빨라졌는지
- v0.993 업데이트 시 어디만 갱신하면 되는지
를 간단히 보고해줘.

이 문서와 research/data를 제품 맥락으로 사용하고, 구현 세부 결정은 네 판단으로 진행해줘.
