import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameState, ParsedLevel } from '../game/types'
import type { DpadSide } from '../game/storage'
import { useGame } from '../hooks/useGame'
import { useKeyboard, useReducedMotion, useSwipe } from '../hooks/useInput'
import { Board } from './Board'
import { Controls } from './Controls'
import { ClearOverlay, ConfirmDialog } from './Overlays'
import { AppleIcon, BackIcon, RuneSprite } from './sprites'
import { isGoal } from '../game/engine'

interface GameScreenProps {
  level: ParsedLevel
  /** 이어하기로 복원할 상태 */
  restore: GameState | null
  best: number | undefined
  /** Supabase 에 저장된, 지금까지 모은 사과 수 */
  apples: number
  onAppleDelta: (delta: number) => void
  dpadSide: DpadSide
  onSaveCurrent: (state: GameState | null) => void
  onRecordClear: (levelId: number, moves: number) => void
  onToggleDpadSide: () => void
  onExit: () => void
  onNextLevel: () => void
}

export function GameScreen({
  level,
  restore,
  best,
  apples,
  onAppleDelta,
  dpadSide,
  onSaveCurrent,
  onRecordClear,
  onToggleDpadSide,
  onExit,
  onNextLevel,
}: GameScreenProps) {
  const reducedMotion = useReducedMotion()
  const boardAreaRef = useRef<HTMLDivElement>(null)
  const [confirmRestart, setConfirmRestart] = useState(false)

  // 클리어한 순간의 기록 — 오버레이에서 "갱신 여부"를 보여주기 위해 직전 최고 기록을 잡아둔다.
  const bestBeforeRef = useRef(best)
  const [result, setResult] = useState<{ moves: number; previousBest: number | undefined } | null>(
    null,
  )

  const handleSolved = useCallback(
    (moves: number) => {
      setResult({ moves, previousBest: bestBeforeRef.current })
      onRecordClear(level.data.id, moves)
      onSaveCurrent(null) // 클리어한 단계는 "이어하기" 대상이 아니다.
    },
    [level.data.id, onRecordClear, onSaveCurrent],
  )

  const game = useGame({ level, initial: restore, reducedMotion, onSolved: handleSolved })

  // 단계가 바뀌면 기준 기록을 다시 잡는다.
  useEffect(() => {
    bestBeforeRef.current = best
    setResult(null)
    setConfirmRestart(false)
    // best 는 클리어 직후 갱신되므로 의존성에 넣지 않는다 — 단계가 바뀔 때만 초기화한다.
  }, [level])

  // 진행 상황 저장 (PRD §4.6)
  useEffect(() => {
    if (game.solved) return
    onSaveCurrent(game.game)
  }, [game.game, game.solved, onSaveCurrent])

  // 이 단계에서 주운(되돌린) 사과만큼 모은 사과 수에 더한다(뺀다).
  // 다시 시작해서 0 이 된 것은 이미 모은 사과를 잃는 것이 아니므로 반영하지 않는다.
  const appleBaseRef = useRef({ epoch: game.epoch, count: game.game.appleCount })
  useEffect(() => {
    const base = appleBaseRef.current
    const count = game.game.appleCount
    if (base.epoch === game.epoch && count !== base.count) onAppleDelta(count - base.count)
    appleBaseRef.current = { epoch: game.epoch, count }
  }, [game.epoch, game.game.appleCount, onAppleDelta])

  const inputEnabled = !confirmRestart && !game.clearVisible
  useSwipe(boardAreaRef, inputEnabled, game.move)
  useKeyboard(inputEnabled, game.move, game.undoMove)

  // Esc 로 다이얼로그를 닫는다.
  useEffect(() => {
    if (!confirmRestart) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirmRestart(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmRestart])

  const handleRestartRequest = useCallback(() => {
    if (game.game.moveCount === 0) {
      game.restart() // 아직 움직이지 않았다면 물어볼 것이 없다.
      return
    }
    setConfirmRestart(true)
  }, [game])

  const placed = game.game.boxes.filter((box) => isGoal(level, box.x, box.y)).length

  const isNewRecord =
    result !== null && (result.previousBest === undefined || result.moves < result.previousBest)

  return (
    <div className="screen">
      <div className="game">
        <header className="hud">
          <button type="button" className="icon-btn" onClick={onExit} aria-label="단계 목록으로">
            <BackIcon />
          </button>
          {/* 암벽에 새긴 단계 번호 — 화면에서 가장 큰 글자 */}
          <div className="hud__stage">
            <span className="hud__stage-no" aria-hidden="true">
              {level.data.id}
            </span>
            <div className="hud__stage-text">
              <h1 className="hud__stage-name">
                <span className="sr-only">{level.data.id}단계 </span>
                {level.data.name}
              </h1>
              <span className="hud__best">
                {best === undefined ? `최소 ${level.data.minMoves}수` : `최고 ${best}수`}
              </span>
            </div>
          </div>
          <div className="hud__spacer" />
          <div
            className={`hud__apples${game.pickActive ? ' hud__apples--pop' : ''}`}
            key={game.pickNonce}
          >
            <AppleIcon />
            <span className="hud__apple-count">{apples}</span>
            <span className="sr-only">개 사과 보유</span>
          </div>
          <div className="hud__moves">
            <span className="hud__moves-value">{game.game.moveCount}</span>
            <span className="hud__moves-unit">수</span>
          </div>
        </header>

        <Board
          level={level}
          game={game.game}
          facing={game.facing}
          bumpNonce={game.bumpNonce}
          bumpActive={game.bumpActive}
          settleNonce={game.settleNonce}
          settleActive={game.settleActive}
          settleBoxId={game.settleBoxId}
          areaRef={boardAreaRef}
        >
          {/* 룬 진행 표시 — 바닥의 룬과 같은 그림이 궤짝이 놓일 때마다 하나씩 켜진다 */}
          <div className="tally">
            <ol className="tally__runes" aria-hidden="true">
              {game.game.boxes.map((box, i) => (
                <li key={box.id} className={i < placed ? 'tally__rune tally__rune--lit' : 'tally__rune'}>
                  <RuneSprite />
                </li>
              ))}
            </ol>
            <span className="tally__text">
              궤짝 {placed}/{game.game.boxes.length}
            </span>
          </div>
        </Board>

        <Controls
          side={dpadSide}
          canUndo={game.canUndo}
          onMove={game.move}
          onUndo={game.undoMove}
          onRestart={handleRestartRequest}
          onToggleSide={onToggleDpadSide}
        />
      </div>

      {confirmRestart && (
        <ConfirmDialog
          title="처음부터 다시?"
          message={`${game.game.moveCount}수 진행한 내용이 사라집니다.`}
          confirmLabel="다시 시작"
          onConfirm={() => {
            setConfirmRestart(false)
            game.restart()
          }}
          onCancel={() => setConfirmRestart(false)}
        />
      )}

      {game.clearVisible && result && (
        <ClearOverlay
          levelId={level.data.id}
          levelName={level.data.name}
          moves={result.moves}
          minMoves={level.data.minMoves}
          best={best}
          isNewRecord={isNewRecord}
          onNext={onNextLevel}
          onRetry={game.restart}
          onList={onExit}
        />
      )}
    </div>
  )
}
