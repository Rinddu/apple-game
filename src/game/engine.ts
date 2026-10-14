import type { Apple, Box, Direction, GameState, LevelData, ParsedLevel, Vec } from './types'
import { DIRECTION_VECTORS, OPPOSITE } from './types'
import { APPLE_DROP_CHANCE } from './constants'

/**
 * 표준 소코반 텍스트 포맷(PRD §7)을 해석한다.
 * `#` 벽 / ` ` 바닥 / `@` 플레이어 / `+` 목표 위 플레이어 / `$` 상자 / `*` 목표 위 상자 / `.` 목표
 */
export function parseLevel(data: LevelData): ParsedLevel {
  const height = data.map.length
  const width = Math.max(...data.map.map((row) => row.length))
  const walls: boolean[] = new Array(width * height).fill(false)
  const goals: boolean[] = new Array(width * height).fill(false)
  const startBoxes: Box[] = []
  let startPlayer: Vec = { x: 1, y: 1 }
  let nextBoxId = 0

  for (let y = 0; y < height; y++) {
    const row = (data.map[y] ?? '').padEnd(width, ' ')
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      switch (row[x]) {
        case '#':
          walls[index] = true
          break
        case '.':
          goals[index] = true
          break
        case '*':
          goals[index] = true
          startBoxes.push({ id: nextBoxId++, x, y })
          break
        case '+':
          goals[index] = true
          startPlayer = { x, y }
          break
        case '$':
          startBoxes.push({ id: nextBoxId++, x, y })
          break
        case '@':
          startPlayer = { x, y }
          break
        default:
          break
      }
    }
  }

  return { data, width, height, walls, goals, startPlayer, startBoxes }
}

export function createGameState(level: ParsedLevel): GameState {
  return {
    levelId: level.data.id,
    player: { ...level.startPlayer },
    boxes: level.startBoxes.map((box) => ({ ...box })),
    apples: [],
    appleCount: 0,
    nextAppleId: 0,
    moveCount: 0,
    history: [],
  }
}

/**
 * 저장본을 복원할 때 쓴다. 사과 기능이 없던 저장본에는 관련 필드가 빠져 있으므로
 * 기본값으로 채워 넣는다 (기록을 버리지 않기 위해 저장 버전은 올리지 않는다).
 */
export function hydrateGameState(state: GameState): GameState {
  const apples = state.apples ?? []
  return {
    ...state,
    apples,
    appleCount: state.appleCount ?? 0,
    nextAppleId: state.nextAppleId ?? apples.reduce((max, apple) => Math.max(max, apple.id + 1), 0),
    history: (state.history ?? []).map((move) => ({
      ...move,
      pickedApple: move.pickedApple ?? null,
      crushedApple: move.crushedApple ?? null,
      droppedAppleId: move.droppedAppleId ?? null,
    })),
  }
}

export function indexOf(level: ParsedLevel, x: number, y: number): number {
  return y * level.width + x
}

export function isWall(level: ParsedLevel, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) return true
  return level.walls[indexOf(level, x, y)] === true
}

export function isGoal(level: ParsedLevel, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) return false
  return level.goals[indexOf(level, x, y)] === true
}

function boxAt(boxes: Box[], x: number, y: number): Box | undefined {
  return boxes.find((box) => box.x === x && box.y === y)
}

function appleAt(apples: Apple[], x: number, y: number): Apple | undefined {
  return apples.find((apple) => apple.x === x && apple.y === y)
}

/**
 * 이동에 성공했을 때 사과가 떨어질지 결정하는 난수 한 쌍.
 * 엔진과 리듀서를 순수하게 유지하기 위해(React StrictMode 는 리듀서를 두 번 호출한다)
 * 난수는 바깥에서 뽑아 주입한다.
 */
export interface AppleRoll {
  /** 0~1 — APPLE_DROP_CHANCE 보다 작으면 사과가 떨어진다 */
  chance: number
  /** 0~1 — 빈 바닥 칸 중 어디에 떨어질지 고르는 값 */
  spot: number
}

/**
 * 사과가 떨어질 칸을 고른다. 벽·목표 룬·상자·플레이어·다른 사과가 없는
 * 맨 바닥 칸만 후보다 — 룬을 가리지 않고, 떨어진 즉시 주워지지도 않는다.
 */
function pickDropSpot(
  level: ParsedLevel,
  player: Vec,
  boxes: Box[],
  apples: Apple[],
  spot: number,
): Vec | null {
  const candidates: Vec[] = []
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      if (isWall(level, x, y) || isGoal(level, x, y)) continue
      if (player.x === x && player.y === y) continue
      if (boxAt(boxes, x, y) || appleAt(apples, x, y)) continue
      candidates.push({ x, y })
    }
  }
  if (candidates.length === 0) return null
  const index = Math.min(candidates.length - 1, Math.floor(spot * candidates.length))
  return candidates[index] ?? null
}

export interface MoveResult {
  /** 벽이나 밀 수 없는 상자에 막혔으면 false — 흔들림 피드백(PRD §4.4)의 신호 */
  moved: boolean
  state: GameState
  /** 이 수에서 상자가 목표 위에 새로 안착했다면 그 상자의 id */
  settledBoxId: number | null
  /** 이 수에서 주운 사과 — 획득 연출의 신호 */
  pickedApple: Apple | null
}

/**
 * 한 칸 이동을 시도한다. 규칙은 PRD §3.
 * 상자는 밀기만 가능하고, 한 번에 하나만 밀 수 있다.
 */
export function tryMove(
  level: ParsedLevel,
  state: GameState,
  dir: Direction,
  roll?: AppleRoll,
): MoveResult {
  const blocked: MoveResult = { moved: false, state, settledBoxId: null, pickedApple: null }
  const vector = DIRECTION_VECTORS[dir]
  const nextX = state.player.x + vector.x
  const nextY = state.player.y + vector.y

  if (isWall(level, nextX, nextY)) {
    return blocked
  }

  const blocking = boxAt(state.boxes, nextX, nextY)
  let boxes = state.boxes
  let pushedBoxId: number | null = null
  let settledBoxId: number | null = null
  let crushedApple: Apple | null = null

  if (blocking) {
    const beyondX = nextX + vector.x
    const beyondY = nextY + vector.y
    // 상자 너머가 벽이거나 다른 상자면 밀 수 없다.
    if (isWall(level, beyondX, beyondY) || boxAt(state.boxes, beyondX, beyondY)) {
      return blocked
    }
    const wasOnGoal = isGoal(level, blocking.x, blocking.y)
    boxes = state.boxes.map((box) =>
      box.id === blocking.id ? { ...box, x: beyondX, y: beyondY } : box,
    )
    pushedBoxId = blocking.id
    if (!wasOnGoal && isGoal(level, beyondX, beyondY)) settledBoxId = blocking.id
    // 상자가 지나간 칸의 사과는 깔려서 사라진다.
    crushedApple = appleAt(state.apples, beyondX, beyondY) ?? null
  }

  // 플레이어가 들어선 칸의 사과를 줍는다 (+1).
  const pickedApple = appleAt(state.apples, nextX, nextY) ?? null

  let apples =
    pickedApple || crushedApple
      ? state.apples.filter((apple) => apple !== pickedApple && apple !== crushedApple)
      : state.apples
  let nextAppleId = state.nextAppleId
  let droppedAppleId: number | null = null

  // 이동할 때마다 APPLE_DROP_CHANCE 확률로 빈 바닥에 새 사과가 떨어진다.
  if (roll && roll.chance < APPLE_DROP_CHANCE) {
    const spot = pickDropSpot(level, { x: nextX, y: nextY }, boxes, apples, roll.spot)
    if (spot) {
      droppedAppleId = nextAppleId
      apples = [...apples, { id: nextAppleId, x: spot.x, y: spot.y }]
      nextAppleId++
    }
  }

  return {
    moved: true,
    settledBoxId,
    pickedApple,
    state: {
      ...state,
      player: { x: nextX, y: nextY },
      boxes,
      apples,
      appleCount: state.appleCount + (pickedApple ? 1 : 0),
      nextAppleId,
      moveCount: state.moveCount + 1,
      history: [...state.history, { dir, pushedBoxId, pickedApple, crushedApple, droppedAppleId }],
    },
  }
}

/** 직전 한 수를 되돌린다 (PRD §4.3, 무제한). */
export function undo(state: GameState): GameState {
  const last = state.history[state.history.length - 1]
  if (!last) return state

  const back = DIRECTION_VECTORS[OPPOSITE[last.dir]]
  const forward = DIRECTION_VECTORS[last.dir]
  const player = { x: state.player.x + back.x, y: state.player.y + back.y }

  // 상자를 밀었다면, 상자는 플레이어가 있던 칸으로 되돌아온다.
  const boxes = state.boxes.map((box) =>
    box.id === last.pushedBoxId
      ? { ...box, x: box.x - forward.x, y: box.y - forward.y }
      : box,
  )

  // 사과도 그 수 이전으로 — 떨어진 것은 사라지고, 줍거나 깔린 것은 되살아난다.
  let apples =
    last.droppedAppleId === null
      ? state.apples
      : state.apples.filter((apple) => apple.id !== last.droppedAppleId)
  if (last.crushedApple) apples = [...apples, last.crushedApple]
  if (last.pickedApple) apples = [...apples, last.pickedApple]

  return {
    ...state,
    player,
    boxes,
    apples,
    appleCount: state.appleCount - (last.pickedApple ? 1 : 0),
    moveCount: state.moveCount - 1,
    history: state.history.slice(0, -1),
  }
}

/** 모든 상자가 목표 위에 있으면 클리어 (PRD §3-5). */
export function isSolved(level: ParsedLevel, state: GameState): boolean {
  return state.boxes.every((box) => isGoal(level, box.x, box.y))
}
