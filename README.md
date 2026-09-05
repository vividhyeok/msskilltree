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

- 기본 Game Mode는 고정 순서의 마법 21개와 패시브 3개를 표시합니다. 검색·필터로 위치가 바뀌지 않습니다.
- **타일 본체**: 레벨을 바꾸지 않고 조합 경로만 확인합니다. **+ 버튼**: 레벨을 한 번 기록합니다. 특성 단계에서는 선택창이 열립니다.
- 오른쪽 **TARGET**은 목표와 진행 상황, **NEED NOW**는 아직 필요한 마법·현재 레벨·정확한 특성을 표시합니다. 경로 영역만 별도로 스크롤할 수 있습니다.
- 경로의 조합명을 누르면 즉시 목표 지정/해제. A/B/C 배지가 액티브와 패시브에 연결됩니다.
- 특성 선택은 연결 조합과 상대 재료를 먼저 표시하고 효과 수치는 상세에 둡니다. 목표를 막는 선택은 적용 전에 짧게 경고합니다.
- 준비된 목표의 `완료`를 누르면 재료가 잠기고 사용 불가능한 경로가 숨겨집니다. Undo로 최근 30개 변경을 복원합니다.
- 이미 선택한 특성은 해당 마법을 살펴본 뒤 경로 제목 옆 `Lv.N 특성`으로 수정합니다.
- 헤더 `더보기` 안에 전체 조합 검색, 저장한 빌드, 검수, 보너스 슬롯이 있습니다. 저장한 빌드를 불러오면 목표만 복원하고 레벨은 0부터 시작합니다.
- `/audit`에서 검수 메모와 corrections.json 내보내기를 사용합니다.
- HTTPS에서 한 번 방문 후 오프라인 사용 가능. 브라우저 메뉴에서 홈 화면에 설치할 수 있습니다.

1024×768에서는 높이 52px 헤더, 68px 타일의 6열 고정 Grid를 사용합니다. 모든 액티브와 패시브가 화면 안에 있고 body 스크롤이 없습니다. 태블릿 세로는 4열, 데스크톱은 7열, 모바일은 3열과 목표/경로 bottom sheet를 사용합니다. 기기 크기에 따른 열 수 외에는 마법 순서와 위치를 변경하지 않습니다.

## 데이터와 구조

`src-data/`의 분리 JSON이 source of truth입니다. 제공된 원본 seed를 보존했으며 bundle은 런타임에 사용하지 않습니다.

- `src/data.ts`: 타입, 데이터 조회, 요구조건 표시
- `src/engine/index.ts`: 순수 함수 조합 판정, 충돌, 경로, 검증, 효과
- `src/storage/index.ts`: 버전 있는 저장 형식과 검증
- `src/main.tsx`: 앱 상태, 헤더, 특성/빌드/검수 보조 화면
- `src/features/game-mode/`: 고정 타일, 목표/NEED NOW/경로 패널과 순수 derived selectors
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

## UX 회귀 검증

NEED NOW는 목표의 generic requirements를 순회하며 마법 ID, 필요 레벨, 특성 단계와 특성으로 묶습니다. 공유 재료의 배지는 합치되 막힌 목표와 가능한 목표는 분리합니다. 상태는 미보유/성장 중/특성 필요/준비/막힘/소비됨을 구분하며 완료 재료는 기본 필요 목록에서 제외합니다. 마력탄 4·7단계, 패시브 최소 레벨과 완료 선행 조건을 유지합니다.

Playwright는 저장한 빌드로 시작, 본체와 + 분리, 목표 충돌, 잘못된 특성 경고, 완료 후 잠금, Undo/재접속, 검수 내보내기, 오프라인 및 네 viewport를 검사합니다. 1024×768에서는 모든 21개 타일과 패시브의 viewport 포함, 44px hit area, body overflow 없음과 경로 스크롤 중 TARGET/NEED NOW 위치 고정을 검증합니다.
