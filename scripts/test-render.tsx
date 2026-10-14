/**
 * 렌더 스모크 테스트.
 * 모든 화면과 10개 단계 전부가 오류 없이 렌더되는지 서버 렌더링으로 확인한다.
 */
import { renderToString } from 'react-dom/server'
import App from '../src/App'
import { GameScreen } from '../src/components/GameScreen'
import { LevelSelect } from '../src/components/LevelSelect'
import { TitleScreen } from '../src/components/TitleScreen'
import { ClearOverlay, ConfirmDialog, TutorialOverlay } from '../src/components/Overlays'
import { LEVELS, getLevel } from '../src/game/levels'
import { createGameState } from '../src/game/engine'
import type { Apple, GameState } from '../src/game/types'
import { INITIAL_PROGRESS } from '../src/game/storage'

// 브라우저 전역 최소 스텁 — useState 초기화 함수만 실행되므로 matchMedia 만 있으면 된다.
Object.defineProperty(globalThis, 'window', {
  value: { matchMedia: () => ({ matches: false }) },
  configurable: true,
})

const noop = () => {}
let checks = 0
let failures = 0

function check(name: string, render: () => string) {
  checks++
  try {
    const html = render()
    if (html.length < 50) throw new Error(`출력이 너무 짧음 (${html.length}자)`)
  } catch (error) {
    failures++
    console.error(`  ✗ ${name}: ${(error as Error).message}`)
    return
  }
  console.log(`  ✓ ${name}`)
}

console.log('화면 렌더')
check('App (시작 화면)', () => renderToString(<App />))
check('TitleScreen', () =>
  renderToString(
    <TitleScreen progress={INITIAL_PROGRESS} onContinue={noop} onSelect={noop} onTutorial={noop} />,
  ),
)
check('LevelSelect', () =>
  renderToString(
    <LevelSelect
      progress={{ ...INITIAL_PROGRESS, maxUnlocked: 4, best: { '1': 5, '2': 8, '3': 13 } }}
      onPick={noop}
      onBack={noop}
    />,
  ),
)
check('TutorialOverlay', () => renderToString(<TutorialOverlay onClose={noop} />))
check('ConfirmDialog', () =>
  renderToString(
    <ConfirmDialog
      title="처음부터 다시?"
      message="12수 진행한 내용이 사라집니다."
      confirmLabel="다시 시작"
      onConfirm={noop}
      onCancel={noop}
    />,
  ),
)
check('ClearOverlay (중간 단계)', () =>
  renderToString(
    <ClearOverlay
      levelId={3}
      levelName="둘씩 나란히"
      moves={13}
      minMoves={11}
      best={13}
      isNewRecord
      onNext={noop}
      onRetry={noop}
      onList={noop}
    />,
  ),
)
check('ClearOverlay (마지막 단계)', () =>
  renderToString(
    <ClearOverlay
      levelId={LEVELS.length}
      levelName="동굴의 심장"
      moves={50}
      minMoves={43}
      best={50}
      isNewRecord={false}
      onNext={noop}
      onRetry={noop}
      onList={noop}
    />,
  ),
)

console.log('\n단계별 게임 화면')
for (const data of LEVELS) {
  check(`${data.id}단계 · ${data.name}`, () => {
    const level = getLevel(data.id)
    if (!level) throw new Error('레벨을 불러오지 못함')
    if (level.startBoxes.length === 0) throw new Error('상자가 없음')
    const goalCount = level.goals.filter(Boolean).length
    if (goalCount !== level.startBoxes.length)
      throw new Error(`상자 ${level.startBoxes.length}개 / 목표 ${goalCount}개 불일치`)
    return renderToString(
      <GameScreen
        level={level}
        restore={null}
        best={undefined}
        apples={0}
        onAppleDelta={noop}
        dpadSide="right"
        onSaveCurrent={noop}
        onRecordClear={noop}
        onToggleDpadSide={noop}
        onExit={noop}
        onNextLevel={noop}
      />,
    )
  })
}


console.log('\n사과 아이템')
check('GameScreen (바닥에 사과 3개 · 2개 수집)', () => {
  const level = getLevel(1)
  if (!level) throw new Error('레벨을 불러오지 못함')

  // 벽·룬·상자·플레이어가 없는 맨 바닥 세 칸에 사과를 놓는다.
  const base = createGameState(level)
  const apples: Apple[] = []
  for (let y = 0; y < level.height && apples.length < 3; y++) {
    for (let x = 0; x < level.width && apples.length < 3; x++) {
      if (level.walls[y * level.width + x] || level.goals[y * level.width + x]) continue
      if (base.player.x === x && base.player.y === y) continue
      if (base.boxes.some((box) => box.x === x && box.y === y)) continue
      apples.push({ id: apples.length, x, y })
    }
  }
  if (apples.length !== 3) throw new Error('사과를 놓을 맨 바닥이 부족함')

  const html = renderToString(
    <GameScreen
      level={level}
      restore={{ ...base, apples, appleCount: 2, nextAppleId: 3 }}
      best={undefined}
      apples={7}
      onAppleDelta={noop}
      dpadSide="right"
      onSaveCurrent={noop}
      onRecordClear={noop}
      onToggleDpadSide={noop}
      onExit={noop}
      onNextLevel={noop}
    />,
  )
  const drawn = (html.match(/class="entity apple"/g) ?? []).length
  if (drawn !== 3) throw new Error(`사과가 ${drawn}개 렌더됨`)
  if (!html.includes('class="hud__apple-count">7<'))
    throw new Error('저장된 사과 수가 HUD 에 보이지 않음')
  return html
})

check('GameScreen (사과 기능 이전 저장본 복원)', () => {
  const level = getLevel(2)
  if (!level) throw new Error('레벨을 불러오지 못함')
  // 사과 필드가 아예 없는 옛 저장본 — hydrateGameState 가 채워야 한다.
  const legacy = {
    levelId: level.data.id,
    player: { ...level.startPlayer },
    boxes: level.startBoxes.map((box) => ({ ...box })),
    moveCount: 1,
    history: [{ dir: 'down', pushedBoxId: null }],
  } as unknown as GameState

  const html = renderToString(
    <GameScreen
      level={level}
      restore={legacy}
      best={undefined}
      apples={0}
      onAppleDelta={noop}
      dpadSide="left"
      onSaveCurrent={noop}
      onRecordClear={noop}
      onToggleDpadSide={noop}
      onExit={noop}
      onNextLevel={noop}
    />,
  )
  if (!html.includes('class="hud__apple-count">0<'))
    throw new Error('옛 저장본에서 사과 수가 0 으로 채워지지 않음')
  if (html.includes('class="entity apple"')) throw new Error('옛 저장본에 없던 사과가 생김')
  return html
})

console.log(`\n${'─'.repeat(40)}`)
console.log(failures === 0 ? `렌더 ${checks}건 전부 통과` : `렌더 ${checks}건 중 ${failures}건 실패`)
process.exit(failures === 0 ? 0 : 1)
