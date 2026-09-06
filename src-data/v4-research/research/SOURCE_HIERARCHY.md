# Source hierarchy

이번 팩은 **커뮤니티 메타보다 먼저 공식/구조화 Wiki를 최대한 확보**하는 방향으로 다시 조사했다.

우선순위:

1. **Google Play 공식 앱 페이지** — 현재 공개 버전과 공식 패치 사실.
2. **현재 Namu 문서** — 한국어 이름, 특히 2026-08 궁극기 / 2026-07 학파처럼 AtWiki보다 최근인 값.
3. **Japanese AtWiki** — 게임 시스템을 표 형태로 가장 넓게 구조화한 자료. 공식은 아니므로 tier는 `editorial`로 분리.
4. **기존 Community Meta dataset** — Reddit/DC 등의 상황별 전략. deterministic fact와 절대 섞지 않는다.

### 중요한 원칙

- `가능/불가능`, 수치, 요구조건 = deterministic / factual layer.
- `S/A/B`, “기록런에 좋음” = editorial/meta layer.
- 두 source가 충돌하면 **더 최신이며 구체적으로 패치를 반영한 쪽을 우선**, conflict를 데이터에 남긴다.
- 게시글 원문을 앱에 저장하지 않고 정규화된 fact/rule + URL만 유지한다.
