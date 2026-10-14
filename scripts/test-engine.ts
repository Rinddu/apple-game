/**
 * 게임 엔진 검증.
 *
 * src/game/engine.ts (게임 본체) 와 scripts/solver.mjs (검증용 별도 구현) 를
 * 맞대어 보며 규칙이 정확히 같은지 확인한다.
 */
import { createGameState, isSolved, parseLevel, tryMove, undo } from '../src/game/engine'
import type { AppleRoll } from '../src/game/engine'
import { APPLE_DROP_CHANCE } from '../src/game/constants'
import type { Direction, GameState, ParsedLevel } from '../src/game/types'
import levels from '../src/game/levels.json'
// @ts-expect-error — 검증 전용 JS 모듈
import { DIRS, parse, solve, step } from './solver.mjs'

interface Grid {
  width: number
  height: number
  walls: Uint8Array
  goals: Uint8Array
  boxes: number[]
  player: number
}

let checks = 0
let failures = 0

function assert(condition: boolean, message: string): void {
  checks++
  if (!condition) {
    failures++
    console.error(`  ✗ ${message}`)
  }
}

/** 엔진 상태를 솔버의 표현(플레이어 인덱스 + 정렬된 상자 인덱스)으로 옮긴다. */
function toSolverShape(level: ParsedLevel, state: GameState) {
  return {
    player: state.player.y * level.width + state.player.x,
    boxes: state.boxes.map((box) => box.y * level.width + box.x).sort((a, b) => a - b),
  }
}

function sameShape(
  a: { player: number; boxes: number[] },
  b: { player: number; boxes: number[] },
): boolean {
  return a.player === b.player && a.boxes.join(',') === b.boxes.join(',')
}

/** 재현 가능한 난수 — 실패했을 때 같은 시나리오를 다시 돌릴 수 있도록 */
function makeRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

const DIR_NAMES: Direction[] = ['up', 'down', 'left', 'right']

/** 사과 시험에서 칸을 직접 계산하기 위한 방향 벡터 */
const DIRECTION_VECTORS_TEST: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

for (const data of levels) {
  const level = parseLevel(data)
  const grid = parse(data.map) as Grid
  console.log(`\n${data.id}단계 · ${data.name}`)

  // ── 1. 최단 해를 엔진으로 그대로 재생해 본다 ──────────────────
  const solution = solve(grid, { withPath: true }) as {
    solved: boolean
    moves: number
    path: Direction[]
  }
  assert(solution.solved, '솔버가 해를 찾지 못함')
  assert(solution.moves === data.minMoves, `minMoves 불일치: ${solution.moves} vs ${data.minMoves}`)

  const initial = createGameState(level)
  let state = initial
  let allMoved = true
  for (const dir of solution.path) {
    const result = tryMove(level, state, dir)
    if (!result.moved) allMoved = false
    state = result.state
  }
  assert(allMoved, '해의 모든 수가 엔진에서 유효하지 않음')
  assert(isSolved(level, state), '해를 다 두었는데 클리어 판정이 나지 않음')
  assert(state.moveCount === data.minMoves, `이동 수 집계 불일치: ${state.moveCount}`)
  assert(state.history.length === data.minMoves, '되돌리기 기록 길이 불일치')

  // ── 2. 끝까지 되돌리면 시작 상태와 정확히 같아야 한다 ─────────
  let rewound = state
  while (rewound.history.length > 0) rewound = undo(rewound)
  assert(
    sameShape(toSolverShape(level, rewound), toSolverShape(level, initial)),
    '전부 되돌렸는데 시작 상태와 다름',
  )
  assert(rewound.moveCount === 0, `되돌린 뒤 이동 수가 0이 아님: ${rewound.moveCount}`)
  assert(!isSolved(level, rewound), '시작 상태가 이미 클리어로 판정됨')

  // ── 3. 무작위 이동으로 두 구현을 맞대어 본다 ──────────────────
  const random = makeRandom(data.id * 7919 + 13)
  let engineState = createGameState(level)
  let modelPlayer = grid.player
  let modelBoxes = [...grid.boxes].sort((a, b) => a - b)
  let blockedSeen = 0
  let pushesSeen = 0

  for (let i = 0; i < 20_000; i++) {
    // 무작위 이동만 이어가면 상자가 금방 막혀 "미는" 경우를 거의 못 본다.
    // 주기적으로 처음으로 되돌려 밀기 상황을 충분히 만들어 준다.
    if (i > 0 && i % 60 === 0) {
      engineState = createGameState(level)
      modelPlayer = grid.player
      modelBoxes = [...grid.boxes].sort((a, b) => a - b)
    }
    const index = Math.floor(random() * 4) % 4
    const dir = DIR_NAMES[index] as Direction
    const result = tryMove(level, engineState, dir)
    const modelNext = step(grid, modelPlayer, modelBoxes, DIRS[index]) as {
      player: number
      boxes: number[]
      pushed: number
    } | null

    if (!result.moved) {
      blockedSeen++
      // 막힌 이동은 상태를 전혀 바꾸지 않아야 한다.
      if (result.state !== engineState || modelNext !== null) {
        assert(false, `${i}번째 수: 막힘 판정이 두 구현에서 다름 (${dir})`)
        break
      }
      continue
    }

    if (modelNext === null) {
      assert(false, `${i}번째 수: 엔진은 이동했는데 모델은 막힘 (${dir})`)
      break
    }
    if (modelNext.pushed >= 0) pushesSeen++

    engineState = result.state
    modelPlayer = modelNext.player
    modelBoxes = modelNext.boxes

    if (!sameShape(toSolverShape(level, engineState), modelNext)) {
      assert(false, `${i}번째 수 이후 두 구현의 보드가 어긋남 (${dir})`)
      break
    }

    // 클리어 판정도 같아야 한다.
    const engineSolved = isSolved(level, engineState)
    const modelSolved = modelBoxes.every((b) => grid.goals[b] === 1)
    if (engineSolved !== modelSolved) {
      assert(false, `${i}번째 수 이후 클리어 판정이 어긋남`)
      break
    }
  }
  assert(blockedSeen > 0, '막히는 경우를 한 번도 시험하지 못함')
  assert(pushesSeen > 0, '상자를 미는 경우를 한 번도 시험하지 못함')

  assert(pushesSeen >= 50, `밀기 시험 횟수가 너무 적음: ${pushesSeen}`)

  // ── 4. 무작위 이동 뒤에도 되돌리기가 완벽히 복원하는가 ────────
  let unwound = engineState
  while (unwound.history.length > 0) unwound = undo(unwound)
  assert(
    sameShape(toSolverShape(level, unwound), toSolverShape(level, createGameState(level))),
    '무작위 플레이 후 되돌리기가 시작 상태로 복원하지 못함',
  )

  console.log(
    `  최단해 ${data.minMoves}수 재생 · 무작위 20,000수 (막힘 ${blockedSeen}, 밀기 ${pushesSeen}) · 되돌리기 복원`,
  )
}


// ── 사과 아이템 ───────────────────────────────────────────────────
// 떨어짐(10%) · 주움(+1) · 되돌리기 복원을 규칙별로 확인한다.
console.log('\n사과 아이템')
{
  const level = parseLevel(levels[0]!)
  const never: AppleRoll = { chance: 1, spot: 0 }
  const always: AppleRoll = { chance: 0, spot: 0 }

  // 떨어질 칸 후보는 벽·룬이 아닌 맨 바닥뿐이다.
  const plainFloors = (() => {
    let count = 0
    for (let y = 0; y < level.height; y++)
      for (let x = 0; x < level.width; x++)
        if (!level.walls[y * level.width + x] && !level.goals[y * level.width + x]) count++
    return count
  })()
  assert(plainFloors > 1, '시험할 맨 바닥 칸이 부족함')

  // 1. roll 을 주지 않거나 확률에서 빗나가면 사과는 떨어지지 않는다.
  const fresh = createGameState(level)
  assert(fresh.apples.length === 0 && fresh.appleCount === 0, '시작 상태에 사과가 있음')
  const dirs: Direction[] = ['up', 'down', 'left', 'right']
  let quiet = fresh
  for (const dir of dirs) {
    quiet = tryMove(level, quiet, dir).state
    quiet = tryMove(level, quiet, dir, never).state
  }
  assert(quiet.apples.length === 0, 'roll 없이/빗나갔는데 사과가 떨어짐')

  // 2. 확률에 맞으면 한 수에 사과 하나가, 플레이어가 아닌 빈 바닥에 떨어진다.
  let dropped: GameState | null = null
  for (const dir of dirs) {
    const result = tryMove(level, fresh, dir, always)
    if (!result.moved) continue
    dropped = result.state
    break
  }
  assert(dropped !== null, '사과 떨어짐을 시험할 이동을 찾지 못함')
  if (dropped) {
    assert(dropped.apples.length === 1, `한 수에 사과가 ${dropped.apples.length}개 떨어짐`)
    const apple = dropped.apples[0]!
    assert(!level.walls[apple.y * level.width + apple.x], '사과가 벽 위에 떨어짐')
    assert(!level.goals[apple.y * level.width + apple.x], '사과가 목표 룬 위에 떨어짐')
    assert(
      !(apple.x === dropped.player.x && apple.y === dropped.player.y),
      '사과가 플레이어 발밑에 떨어져 즉시 주워짐',
    )
    assert(
      !dropped.boxes.some((box) => box.x === apple.x && box.y === apple.y),
      '사과가 상자 위에 떨어짐',
    )
    assert(dropped.appleCount === 0, '떨어지기만 했는데 수집 수가 올라감')
    assert(dropped.nextAppleId === 1, `사과 id 발급이 어긋남: ${dropped.nextAppleId}`)

    // 3. 사과를 밟으면 +1, 사과는 사라진다.
    let picked: { state: GameState; dir: Direction } | null = null
    for (const dir of dirs) {
      const vector = DIRECTION_VECTORS_TEST[dir]
      const from: GameState = {
        ...dropped,
        player: { x: apple.x - vector.x, y: apple.y - vector.y },
      }
      if (from.player.x < 0 || from.player.y < 0) continue
      if (level.walls[from.player.y * level.width + from.player.x]) continue
      if (from.boxes.some((box) => box.x === from.player.x && box.y === from.player.y)) continue
      const result = tryMove(level, from, dir, never)
      if (!result.moved) continue
      if (result.pickedApple === null) continue
      picked = { state: result.state, dir }
      break
    }
    assert(picked !== null, '사과를 주울 수 있는 이동을 찾지 못함')
    if (picked) {
      assert(picked.state.appleCount === 1, `사과를 줍고도 +1 이 아님: ${picked.state.appleCount}`)
      assert(picked.state.apples.length === 0, '주운 사과가 바닥에 남음')

      // 4. 되돌리면 사과가 되살아나고 수집 수도 되돌아간다.
      const back = undo(picked.state)
      assert(back.appleCount === 0, `되돌린 뒤 수집 수가 0이 아님: ${back.appleCount}`)
      assert(
        back.apples.length === 1 &&
          back.apples[0]!.x === apple.x &&
          back.apples[0]!.y === apple.y &&
          back.apples[0]!.id === apple.id,
        '되돌렸는데 사과가 원래 칸으로 돌아오지 않음',
      )
    }
    // 5. 떨어진 직후 되돌리면 그 사과는 사라진다.
    const undone = undo(dropped)
    assert(undone.apples.length === 0, '되돌렸는데 떨어진 사과가 남음')
  }

  // 6. 상자에 깔린 사과는 사라지고, 되돌리면 되살아난다.
  {
    const base = createGameState(level)
    let crushCase: { before: GameState; after: GameState } | null = null
    for (const dir of dirs) {
      const vector = DIRECTION_VECTORS_TEST[dir]
      const boxCell = { x: base.player.x + vector.x, y: base.player.y + vector.y }
      const box = base.boxes.find((b) => b.x === boxCell.x && b.y === boxCell.y)
      if (!box) continue
      const beyond = { x: boxCell.x + vector.x, y: boxCell.y + vector.y }
      const before: GameState = { ...base, apples: [{ id: 99, x: beyond.x, y: beyond.y }] }
      const result = tryMove(level, before, dir, never)
      if (!result.moved) continue
      crushCase = { before, after: result.state }
      break
    }
    if (crushCase) {
      assert(crushCase.after.apples.length === 0, '상자가 지나간 사과가 남아 있음')
      assert(crushCase.after.appleCount === 0, '깔린 사과가 수집으로 집계됨')
      const back = undo(crushCase.after)
      assert(back.apples.length === 1 && back.apples[0]!.id === 99, '깔린 사과가 되돌아오지 않음')
    }
  }

  // 7. 확률은 10% — 성공한 이동 중 chance < 0.1 인 수에서만, 그리고 그때는 반드시 떨어져야 한다.
  {
    const trials = 10_000
    let moved = 0
    let expected = 0
    let drops = 0
    let state = createGameState(level)
    // 고정 시드 난수 — 실패해도 같은 시나리오를 다시 돌릴 수 있다.
    const random = makeRandom(4242)
    for (let i = 0; i < trials; i++) {
      const chance = random()
      const dir = dirs[Math.floor(random() * 4) % 4]!
      const result = tryMove(level, state, dir, { chance, spot: random() })
      if (!result.moved) continue
      moved++
      if (chance < APPLE_DROP_CHANCE) expected++
      // 같은 수에 사과를 줍기도 하면 개수는 그대로일 수 있으니 기록으로 센다.
      const last = result.state.history[result.state.history.length - 1]!
      if (last.droppedAppleId !== null) drops++
      // 바닥이 사과로 가득 차 떨어질 자리가 없어지지 않도록 주기적으로 처음으로 돌린다.
      state = result.state.apples.length > 3 ? createGameState(level) : result.state
    }
    assert(moved > 1000, `성공한 이동이 너무 적어 확률을 볼 수 없음: ${moved}`)
    assert(drops === expected, `추첨에 당첨된 수와 떨어진 수가 다름: ${drops} vs ${expected}`)
    const ratio = drops / moved
    assert(
      Math.abs(ratio - APPLE_DROP_CHANCE) < 0.02,
      `떨어진 비율이 ${APPLE_DROP_CHANCE} 에서 벗어남: ${ratio.toFixed(3)}`,
    )
    console.log(`  성공한 이동 ${moved}수 중 ${drops}회 떨어짐 (${(ratio * 100).toFixed(1)}%)`)
  }
}
console.log('  떨어짐 · 주움(+1) · 깔림 · 되돌리기 복원 확인')

console.log(`\n${'─'.repeat(57)}`)
if (failures === 0) console.log(`검사 ${checks}건 전부 통과`)
else console.error(`검사 ${checks}건 중 ${failures}건 실패`)
process.exit(failures === 0 ? 0 : 1)
