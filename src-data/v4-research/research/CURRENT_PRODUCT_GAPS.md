# Current product gaps → next target

현재 repo는 이미 잘하는 것이 많다.

- 21 active magic / 63 fusion
- trait stage
- target conflict
- carrier / material / condition
- `→ 승계`, `× 병합·소멸`
- NEED NOW
- Community Meta Layer
- artifact compare seed
- source/confidence/patch freshness

다음 병목은 **엔진보다 게임 지식 범위와 live input cost**다.

## 1. 일반 패시브가 3개뿐
실제 현재 일반 패시브는 10개다. 레벨업 3택에서는 액티브뿐 아니라 일반 패시브가 계속 등장하므로, 이것을 관리하지 않으면 “지금 뜬 3개 중 무엇을 고를까”의 절반만 이해한다.

## 2. 특수 패시브를 실 Run 상태로 관리하지 않음
25개 seed를 제공했다. 특히 봉인/무언영창/타임키퍼/개척자/마나공장/플로리스트 등은 생존·경제 의사결정에 중요하다.

## 3. Ultimate/Class/Subject가 일부 seed에 그침
현재 Namu 기준 Ultimate 24개 요구조건을 제공했다. Class 24, Subject 25도 같이 넣었다. 이들은 **pre-run setup / eligibility**로 쓰고 live HUD를 어지럽히지 않는 편이 좋다.

## 4. ArtifactChoice가 아직 수동적
현재는 후보 3개 드롭다운 + 시너지 근접도 수동 입력이다. 방향은 좋지만 게임 중에는 느리다.

목표:
- 보유 AF inventory를 기록
- candidate 3~4개만 빠르게 선택
- synergy recipe가 있으면 완성도 자동 계산
- 이미 기록한 context/stat과 결합해서 이유를 한 줄로 설명

## 5. phase 입력이 수동
optional **Run timer** 한 번 시작하면 phase를 자동으로 추론할 수 있다. 시간대에 따라 가치가 역전하는 AF가 실제로 존재한다.

## 6. “빌드 상태”를 요약하지 못함
가능한 verified stat에서 다음 축을 derived profile로 만들 가치가 있다.

- offense
- cooldown
- mobility
- survivability
- crowd control
- economy / leveling
- pickup
- execution / enemy-HP reduction

점수 자체가 목적이 아니다. 예: “CDR은 이미 충분히 높고 생존 수단이 부족함” 같은 설명을 만드는 근거다.

## 7. Live UI
현재 `지금 뜨면 고르세요` 방향은 정확하다. 다음 수정은 화면에 더 많은 것을 추가하는 것보다:
- magic spatial position 안정화
- live search/filter의 필요성 재검토
- NEED NOW의 시각 우선순위 강화
- event별 quick mode 분리
가 더 중요하다.
