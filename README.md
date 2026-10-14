# 동굴 소코반

동굴을 배경으로 한 10단계 소코반 퍼즐 게임. [02-prd.md](./02-prd.md) 의 요구사항을 구현했습니다.

React 19 + TypeScript + Vite 로 만들었고, 외부 이미지·폰트·서버 없이 동작합니다.

## 실행

```bash
npm install
npm run dev        # 개발 서버 (http://localhost:5173)
npm run build      # 프로덕션 빌드 → dist/
npm run preview    # 빌드 결과 미리보기
npm test           # 레벨 검증 + 엔진 교차 검증 + 렌더 스모크 테스트
```

## 구조

```
src/
├── game/              게임 규칙과 데이터 — UI 를 모른다
│   ├── levels.json    10단계 맵 (표준 소코반 텍스트 포맷)
│   ├── engine.ts      이동·밀기·되돌리기·클리어 판정
│   ├── storage.ts     localStorage 읽기/쓰기
│   └── constants.ts   애니메이션 지속시간 등 상수의 단일 출처
├── hooks/
│   ├── useGame.ts     게임 상태 리듀서 + 입력 버퍼 + 애니메이션 펄스
│   ├── useInput.ts    스와이프 / 키보드 / 모션 줄이기 감지
│   └── useProgress.ts 진행 상황 지속
├── components/        화면과 스프라이트 (모두 인라인 SVG)
└── styles/global.css  동굴 테마 디자인 토큰과 레이아웃

scripts/
├── solver.mjs           검증용 소코반 모델 + 최단해 BFS (게임 엔진과 별개 구현)
├── verify-levels.mjs    전 단계 해 존재 검증 및 minMoves 산출
├── test-engine.ts       엔진 ↔ 솔버 교차 검증
└── test-render.tsx      전 화면·전 단계 렌더 스모크 테스트
```

## PRD 대응

| PRD 항목 | 구현 |
|---|---|
| §3 게임 규칙 | `game/engine.ts` 의 `tryMove` — 밀기 전용, 한 번에 한 상자 |
| §4.1 10단계·순차 해금 | `game/levels.json`, `hooks/useProgress.ts` 의 `maxUnlocked` |
| §4.1 해 존재 검증 | `npm run verify-levels` — BFS 로 최단해를 찾아 `minMoves` 기록 |
| §4.2 스와이프 24px·주축 판정 | `hooks/useInput.ts` 의 `useSwipe` |
| §4.2 입력 버퍼 1개 | `hooks/useGame.ts` 의 `lockedRef` / `queuedRef` |
| §4.2 D-패드 좌/우 배치 | `components/Controls.tsx`, `progress.dpadSide` |
| §4.3 무제한 되돌리기 | `engine.ts` 의 `undo` + `GameState.history` |
| §4.3 재시작 확인 | `components/Overlays.tsx` 의 `ConfirmDialog` |
| §4.4 애니메이션 사양 | `game/constants.ts` 와 `styles/global.css` 의 `--move-ms` 등 |
| §4.4 `transform` 기반 | `.entity` 가 `translate3d` 만 트랜지션 |
| §4.4 모션 줄이기 | CSS 미디어 쿼리 + `useReducedMotion` |
| §4.5 동굴 테마 | `styles/global.css` 디자인 토큰, `components/sprites.tsx` |
| §4.6 진행 저장·이어하기 | `game/storage.ts`, `hooks/useProgress.ts` |
| §5 오프라인 | `public/sw.js` (빌드본에서만 등록) |
| §5 반응형 | `.board` 의 `--tile` 이 `min()` 으로 화면에 맞춰 계산 |
| §5 무음 | 사운드를 넣지 않음 |

## 사과 아이템 (PRD 외 추가 기능)

- 이동이 성공할 때마다 10% 확률(`APPLE_DROP_CHANCE`)로 사과 하나가 바닥에 떨어집니다.
- 떨어지는 칸은 벽·목표 룬·상자·플레이어·다른 사과가 없는 맨 바닥 중 무작위 한 칸입니다. 룬을 가리지 않고, 떨어진 즉시 주워지지도 않습니다.
- 사과를 밟으면 수집 수가 +1 되고 HUD 의 사과 칩이 한 번 부풉니다. 상자에 깔린 사과는 사라집니다.
- 되돌리기는 사과까지 그 수 이전으로 되돌립니다 — 떨어진 것은 사라지고, 줍거나 깔린 것은 원래 칸으로 돌아오며 수집 수도 함께 내려갑니다.
- 추첨은 리듀서 바깥(`useGame` 의 `move`)에서 뽑아 `tryMove` 에 넘깁니다. StrictMode 가 리듀서를 두 번 호출해도 결과가 흔들리지 않도록 엔진과 리듀서는 순수하게 유지합니다.

## 레벨 추가하기

`src/game/levels.json` 에 항목을 더한 뒤 검증기를 돌리면 됩니다.

```bash
npm run verify-levels -- --write   # 구조 검사 + 해 존재 확인 + minMoves 자동 기록
```

맵 문자: `#` 벽 / 공백 바닥 / `@` 플레이어 / `$` 상자 / `.` 목표 / `*` 목표 위 상자 / `+` 목표 위 플레이어
