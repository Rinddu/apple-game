/** PRD §7 데이터 모델 */

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Vec {
  x: number
  y: number
}

/** 상자는 애니메이션 연속성을 위해 안정적인 id 를 가진다. */
export interface Box extends Vec {
  id: number
}

/** 이동 중 떨어지는 사과 아이템. 상자처럼 안정적인 id 를 가진다. */
export interface Apple extends Vec {
  id: number
}

/** 되돌리기(undo)를 위해 기록하는 한 수 */
export interface Move {
  dir: Direction
  /** 이 수에서 밀린 상자의 id. 밀지 않았으면 null */
  pushedBoxId: number | null
  /** 이 수에서 주운 사과. 되돌리면 되살아나고 수집 수가 1 줄어든다 */
  pickedApple: Apple | null
  /** 이 수에서 상자에 깔려 사라진 사과. 되돌리면 되살아난다 */
  crushedApple: Apple | null
  /** 이 수에서 새로 떨어진 사과의 id. 되돌리면 사라진다 */
  droppedAppleId: number | null
}

/** levels.json 의 한 항목 */
export interface LevelData {
  id: number
  name: string
  map: string[]
  /** 검증된 최소 이동 수 (scripts/verify-levels.mjs 가 산출) */
  minMoves: number
}

/** 맵 문자열을 해석한 정적 데이터 — 플레이 중 변하지 않는다 */
export interface ParsedLevel {
  data: LevelData
  width: number
  height: number
  /** y * width + x 인덱스 기준 */
  walls: boolean[]
  goals: boolean[]
  startPlayer: Vec
  startBoxes: Box[]
}

/** 플레이 중 변하는 상태 */
export interface GameState {
  levelId: number
  player: Vec
  boxes: Box[]
  /** 바닥에 떨어져 있는, 아직 줍지 않은 사과들 */
  apples: Apple[]
  /** 이 단계에서 지금까지 주운 사과 수 */
  appleCount: number
  /** 다음에 떨어질 사과에 붙일 id — id 는 재사용하지 않는다 */
  nextAppleId: number
  moveCount: number
  history: Move[]
}

export const DIRECTION_VECTORS: Record<Direction, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}
