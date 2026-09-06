# Naver Cafe ingestion

현재 조사 환경에서는 네이버 카페 본문 전수 크롤링이 제한되어 직접 수집하지 못했습니다.

향후 사용자가 접근 가능한 범위와 서비스 이용 조건을 지키면서 자료를 export하면 다음 형태로 ingestion하는 것을 권장합니다.

```json
{
  "url": "...",
  "publishedAt": "2026-09-...",
  "patch": "0.993",
  "title": "...",
  "claimKo": "핵심 주장 요약",
  "context": {"goal":"record_run"}
}
```

## 처리 순서
1. patch/date 확인
2. 핵심 주장 추출
3. entity 이름 매핑
4. goal/archetype/phase 태깅
5. 반대 주장 검색
6. source id 부여
7. 기존 meta rule과 merge
8. confidence/contradiction 갱신

앱 DB에 게시글 원문을 통째로 복제할 필요는 없습니다.
보존할 것은 claim, context, patch, source URL, date, confidence, contradiction입니다.
