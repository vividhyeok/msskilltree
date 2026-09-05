# Magic Survival Companion

게임 중 태블릿에서 마법 레벨을 탭으로 기록하고 조합 경로, 목표 충돌, 부족한 재료를 확인하는 한국어 오프라인 웹앱입니다. React + TypeScript + Vite, 서버·로그인·DB 없이 동작합니다.

## 실행

Node.js 22 LTS 권장.

```sh
npm ci
npm run dev
```

## 검증

```sh
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`lint`는 TypeScript strict 정적 검사입니다. Vitest는 데이터 검증·특성 단계·마법 잠금·패시브·특수 슬롯·저장을 검증합니다. Playwright는 Run 흐름, 네 화면 크기(1024×768, 768×1024, 1280×800, 390×844), 오프라인 복원을 검증합니다. GitHub Actions에서 푸시와 PR마다 모두 실행합니다.

## 사용

- 마법 카드 탭: 레벨 +1. 특성 단계에서는 큰 선택창이 열립니다.
- 우측 경로의 조합이나 조합 도감에서 목표 지정: A/B/C 배지가 관련 마법에 연결됩니다.
- 서로 같은 마법을 사용하는 목표는 충돌 경고가 표시됩니다.
- 목표를 막는 특성은 적용 전에 경고합니다. 카드 아래 `특성`으로 즉시 수정할 수 있습니다.
- 조건이 맞으면 `조합 완료`: 사용한 액티브 마법이 잠기고 후보가 재계산됩니다.
- Undo는 최근 30개 변경을 복원합니다. 완료·목표·보너스도 복원됩니다.
- `저장한 빌드`는 목표 계획만 저장하며, 불러올 때 새 Run으로 시작합니다.
- `/audit`에서 일치/수정 필요와 메모를 기록하고 corrections.json을 다운로드합니다.
- HTTPS에서 한 번 방문 후 오프라인 사용 가능. 브라우저 메뉴에서 홈 화면에 설치할 수 있습니다.

## 데이터와 구조

`src-data/`의 분리 JSON이 source of truth입니다. 제공된 원본 seed를 보존했으며 bundle은 런타임에 사용하지 않습니다.

- `src/data.ts`: 타입, 데이터 조회, 요구조건 표시
- `src/engine/index.ts`: 순수 함수 조합 판정, 충돌, 경로, 검증, 효과
- `src/storage/index.ts`: 버전 있는 저장 형식과 검증
- `src/main.tsx`: Run/특성/빌드/검수 화면
- `src/style.css`: 태블릿 우선 반응형 UI

레벨·특성은 `selectedTraits[magicId][stageLevel]`로 저장합니다. 마력탄 4/7단계를 독립 검사합니다. 조합 완료 순서에서 잠금과 효과를 계산하므로 Undo 시 잠금도 자동 복원됩니다. 엔진에는 조합 이름/ID별 분기문이 없습니다.

데이터는 제공된 v0.992 개발용 seed입니다. 게임에서 검증되지 않은 항목은 원본 verification 상태를 그대로 표시합니다. `/audit` 메모는 원본 JSON을 변경하지 않으며 추후 검수 내용을 반영할 때 JSON을 수정하면 됩니다. 게임 내 플레이어 레벨은 추적하지 않고 기본 최대 슬롯과 보너스만 계산합니다. 저장은 브라우저/기기별이며 기기 간 동기화되지 않습니다. 손상된 저장은 자동 덮어쓰지 않고 백업 후 초기화 기능을 제공합니다.

## Vercel 배포

[저장소를 Vercel로 가져오기](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvividhyeok%2Fmsskilltree)

기존 저장소 자동 배포는 Vercel의 Add New → Project에서 `vividhyeok/msskilltree`를 Import합니다. Framework: Vite, Root: 저장소 루트, Build: `npm run build`, Output: `dist`. 환경 변수는 필요 없습니다. `vercel.json`에 `/audit` 새로고침과 서비스워커 캐시 설정이 포함되어 있습니다.

CLI 사용 시:

```sh
vercel login
vercel link --yes
vercel git connect https://github.com/vividhyeok/msskilltree.git
vercel --prod
```

Git 연결 후 main 푸시마다 프로덕션, PR마다 미리보기 배포가 생성됩니다.

원 개발 요구사항은 CODEX_PROMPT.md, 데이터 메모는 DATA_NOTES.md에 보존했습니다.
