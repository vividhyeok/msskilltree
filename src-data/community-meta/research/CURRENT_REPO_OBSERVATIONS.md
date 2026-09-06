# Current Repo Observations

현재 repo에서 좋은 기반:
- deterministic `evaluateCombination`
- consumed magic lock
- target conflict
- `getNeededMagicForTargets`
- focused paths
- localStorage/Undo
- Game Mode 분리

## 주의 1 — 현재 추천
현재 `getRecommendedPlan`은 ‘많은 조합 / 적은 추가레벨 / 기존 투자 활용’을 최적화하는 성격이다.
전투 meta 추천과 섞지 말고 ‘성장 효율/최소 추가레벨 경로’로 의미를 분리하는 것이 좋다.

## 주의 2 — Magic tile 위치
현재 magic 정렬이 투자/미투자/소비 상태에 따라 바뀌는 구조가 있다.
Live glance tool은 반복 플레이로 공간 위치를 외우는 것이 검색보다 빠르므로 Game Mode에서는 canonical fixed order를 권장한다.

## 주의 3 — HUD
TARGET / NEED NOW / PATHS 방향은 좋다.
다음 개선은 정보를 더 넣는 것보다 NEED NOW와 실제 decision urgency의 위계를 키우는 것.
Meta layer가 추가돼도 백과사전처럼 만들지 않는다.
