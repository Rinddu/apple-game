/**
 * 레벨 검증 스크립트 (PRD §4.1 "모든 단계는 해가 존재함이 검증되어야 한다")
 *
 * - 맵 구조 검증: 직사각형, 플레이어 1명, 상자 수 == 목표 수, 테두리 벽
 * - BFS 최단 해 탐색 → 최소 이동 수(minMoves) 산출
 * - `--write` 로 levels.json 의 minMoves 를 갱신
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parse, solve, structuralErrors } from './solver.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const LEVELS_PATH = join(here, '..', 'src', 'game', 'levels.json')

const levels = JSON.parse(readFileSync(LEVELS_PATH, 'utf8'))
const write = process.argv.includes('--write')
let failed = 0

console.log('단계  크기     상자  결과')
console.log('─────────────────────────────────────────────────────────')

for (const level of levels) {
  const grid = parse(level.map)
  const errors = structuralErrors(level.map, grid)
  const size = `${grid.width}×${grid.height}`.padEnd(8)
  const label = String(level.id).padStart(2)
  const boxCount = String(grid.boxes.length).padStart(2)

  if (errors.length > 0) {
    failed++
    console.log(`${label}    ${size} ${boxCount}    ✗ ${errors.join(' / ')}`)
    continue
  }

  const started = Date.now()
  const result = solve(grid)
  const ms = Date.now() - started

  if (!result.solved) {
    failed++
    console.log(`${label}    ${size} ${boxCount}    ✗ 풀 수 없음 — ${result.reason}`)
    continue
  }

  level.minMoves = result.moves
  console.log(
    `${label}    ${size} ${boxCount}    ✓ 최소 ${String(result.moves).padStart(3)}수` +
      `  (탐색 ${result.states.toLocaleString()} 상태, ${ms}ms)`,
  )
}

console.log('─────────────────────────────────────────────────────────')
if (write && failed === 0) {
  writeFileSync(LEVELS_PATH, JSON.stringify(levels, null, 2) + '\n')
  console.log('minMoves 를 levels.json 에 기록했습니다.')
}
console.log(failed === 0 ? `전체 ${levels.length}단계 검증 통과` : `${failed}개 단계 실패`)
process.exit(failed === 0 ? 0 : 1)
