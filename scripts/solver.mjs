/**
 * 레벨 검증용 소코반 모델 + 최단해 탐색기.
 *
 * 게임 본체(src/game/engine.ts)와는 별개로 작성된 구현이다.
 * scripts/test-engine.ts 는 두 구현의 동작을 맞대어 보아 엔진의 정확성을 검증한다.
 */

export const DIRS = [
  { name: 'up', dx: 0, dy: -1 },
  { name: 'down', dx: 0, dy: 1 },
  { name: 'left', dx: -1, dy: 0 },
  { name: 'right', dx: 1, dy: 0 },
]

export function parse(map) {
  const height = map.length
  const width = Math.max(...map.map((row) => row.length))
  const walls = new Uint8Array(width * height)
  const goals = new Uint8Array(width * height)
  const boxes = []
  let player = -1

  for (let y = 0; y < height; y++) {
    const row = map[y].padEnd(width, ' ')
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const ch = row[x]
      if (ch === '#') walls[i] = 1
      if (ch === '.' || ch === '*' || ch === '+') goals[i] = 1
      if (ch === '$' || ch === '*') boxes.push(i)
      if (ch === '@' || ch === '+') player = i
    }
  }
  return { width, height, walls, goals, boxes, player }
}

/**
 * 한 칸 이동을 적용한다. 막혔으면 null 을 돌려준다.
 * boxes 는 정렬된 인덱스 배열이며, 반환값도 정렬 상태를 유지한다.
 */
export function step(grid, player, boxes, dir) {
  const { width, walls } = grid
  const px = player % width
  const py = (player / width) | 0
  const target = (py + dir.dy) * width + (px + dir.dx)
  if (walls[target]) return null

  const boxIndex = boxes.indexOf(target)
  if (boxIndex < 0) return { player: target, boxes, pushed: -1 }

  const beyond = (py + dir.dy * 2) * width + (px + dir.dx * 2)
  if (walls[beyond] || boxes.includes(beyond)) return null

  const nextBoxes = boxes.slice()
  nextBoxes[boxIndex] = beyond
  nextBoxes.sort((a, b) => a - b)
  return { player: target, boxes: nextBoxes, pushed: beyond }
}

export function structuralErrors(map, grid) {
  const errors = []
  const widths = new Set(map.map((row) => row.length))
  if (widths.size !== 1) errors.push(`행 길이가 일정하지 않음: ${[...widths].join(', ')}`)
  if (grid.player < 0) errors.push('플레이어(@)가 없음')
  if (map.join('').split('').filter((c) => c === '@' || c === '+').length > 1)
    errors.push('플레이어가 2명 이상')

  const goalCount = grid.goals.reduce((a, b) => a + b, 0)
  if (grid.boxes.length !== goalCount)
    errors.push(`상자 ${grid.boxes.length}개 / 목표 ${goalCount}개 불일치`)
  if (grid.boxes.length === 0) errors.push('상자가 없음')

  for (let x = 0; x < grid.width; x++) {
    if (!grid.walls[x] || !grid.walls[(grid.height - 1) * grid.width + x]) {
      errors.push('상/하단 테두리가 벽이 아님')
      break
    }
  }
  for (let y = 0; y < grid.height; y++) {
    if (!grid.walls[y * grid.width] || !grid.walls[y * grid.width + grid.width - 1]) {
      errors.push('좌/우측 테두리가 벽이 아님')
      break
    }
  }
  return errors
}

/**
 * 상자가 놓여도 되는 칸(= 목표까지 끌고 갈 수 있는 칸)을 역방향 BFS 로 계산한다.
 * 여기에 속하지 않는 칸에 상자가 놓이면 그 국면은 데드락이다.
 */
function liveSquares({ width, height, walls, goals }) {
  const live = new Uint8Array(width * height)
  const queue = []
  for (let i = 0; i < goals.length; i++) {
    if (goals[i] && !walls[i]) {
      live[i] = 1
      queue.push(i)
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head]
    const cx = cur % width
    const cy = (cur / width) | 0
    for (const { dx, dy } of DIRS) {
      const fx = cx + dx
      const fy = cy + dy
      const bx = cx + dx * 2
      const by = cy + dy * 2
      if (fx < 0 || fy < 0 || bx < 0 || by < 0) continue
      if (fx >= width || fy >= height || bx >= width || by >= height) continue
      const from = fy * width + fx
      const behind = by * width + bx
      if (walls[from] || walls[behind] || live[from]) continue
      live[from] = 1
      queue.push(from)
    }
  }
  return live
}

/** (index 를 포함하는) 2x2 영역이 벽/상자로 꽉 차고 그 중 목표 밖 상자가 있으면 데드락 */
function formsFrozenBlock(index, boxes, walls, goals, width) {
  const boxSet = new Set(boxes)
  const x = index % width
  const y = (index / width) | 0
  const blocked = (cx, cy) => {
    const i = cy * width + cx
    return walls[i] === 1 || boxSet.has(i)
  }
  for (const [ox, oy] of [
    [-1, -1],
    [-1, 0],
    [0, -1],
    [0, 0],
  ]) {
    const cells = [
      [x + ox, y + oy],
      [x + ox + 1, y + oy],
      [x + ox, y + oy + 1],
      [x + ox + 1, y + oy + 1],
    ]
    if (!cells.every(([cx, cy]) => blocked(cx, cy))) continue
    const inBlock = cells.map(([cx, cy]) => cy * width + cx).filter((i) => boxSet.has(i))
    if (inBlock.some((i) => !goals[i])) return true
  }
  return false
}

function encode(player, boxes) {
  let key = player.toString(36)
  for (let i = 0; i < boxes.length; i++) key += ',' + boxes[i].toString(36)
  return key
}

/**
 * 최단 해를 BFS 로 찾는다.
 * withPath 를 켜면 이동 방향 배열을 함께 돌려준다 (부모 포인터를 보관하므로 메모리를 더 쓴다).
 */
export function solve(grid, { maxStates = 4_000_000, withPath = false } = {}) {
  const { goals, boxes: startBoxes, player: startPlayer } = grid
  const live = liveSquares(grid)
  const isSolved = (boxes) => boxes.every((b) => goals[b])

  const start = [...startBoxes].sort((a, b) => a - b)
  if (isSolved(start)) return { solved: true, moves: 0, path: [], states: 0 }

  const seen = new Set([encode(startPlayer, start)])
  // withPath 일 때만 부모 추적용 노드를 보관한다.
  const nodes = withPath ? [{ player: startPlayer, boxes: start, parent: -1, dir: null }] : null
  let frontier = [{ player: startPlayer, boxes: start, id: 0 }]
  let depth = 0
  let states = 1

  while (frontier.length > 0) {
    depth++
    const next = []
    for (const state of frontier) {
      for (const dir of DIRS) {
        const moved = step(grid, state.player, state.boxes, dir)
        if (!moved) continue
        if (moved.pushed >= 0) {
          if (!live[moved.pushed]) continue
          if (
            !goals[moved.pushed] &&
            formsFrozenBlock(moved.pushed, moved.boxes, grid.walls, goals, grid.width)
          )
            continue
        }

        const key = encode(moved.player, moved.boxes)
        if (seen.has(key)) continue
        seen.add(key)
        states++
        if (states > maxStates) return { solved: false, reason: `상태 수 ${maxStates} 초과`, states }

        let id = 0
        if (nodes) {
          id = nodes.length
          nodes.push({ player: moved.player, boxes: moved.boxes, parent: state.id, dir: dir.name })
        }

        if (moved.pushed >= 0 && isSolved(moved.boxes)) {
          let path = null
          if (nodes) {
            path = []
            for (let cursor = id; cursor > 0; cursor = nodes[cursor].parent)
              path.unshift(nodes[cursor].dir)
          }
          return { solved: true, moves: depth, path, states }
        }
        next.push({ player: moved.player, boxes: moved.boxes, id })
      }
    }
    frontier = next
  }
  return { solved: false, reason: '도달 가능한 해가 없음', states }
}
