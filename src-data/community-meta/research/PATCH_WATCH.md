# Patch Watch

## Baseline
- 공식 Google Play: v0.992
- snapshot: 2026-09-06

## 0.993
2026-09-05 Reddit에 2026-09-07 예정 patch notes가 공유됨.
- 신규 Ultimate 4
- 신규 Special Artifact
- DoP 및 일부 Legendary/Synergy/밸런스 조정
- 적/버그 변경

## migration
출시 후:
1. deterministic data diff
2. 각 v0.992 rule을 `still_valid / changed / unknown / obsolete`로 표시
3. 최근 7일 커뮤니티 우선 수집
4. v0.993 archetype 별도 생성
5. v0.992 rule은 archive

UI에는 patch mismatch 시 짧은 stale 경고만 표시하면 충분.
