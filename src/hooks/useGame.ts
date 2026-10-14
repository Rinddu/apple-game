import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Direction, GameState, ParsedLevel } from '../game/types'
import type { AppleRoll } from '../game/engine'
import { createGameState, hydrateGameState, isSolved, tryMove, undo } from '../game/engine'
import { APPLE_POP_MS, BUMP_MS, CLEAR_DELAY_MS, MOVE_MS, SETTLE_MS } from '../game/constants'

interface ReducerState {
  game: GameState
  /** 플레이어가 바라보는 방향 — 랜턴 불빛과 흔들림 방향에 쓰인다 */
  facing: Direction
  /**
   * 펄스 신호는 "단조 증가하는 nonce" + "켜짐 여부" 쌍으로 표현한다.
   * nonce 는 되돌아가지 않으므로 React key 로 써서 CSS 애니메이션을 안전하게 재시작할 수 있다.
   */
  bumpNonce: number
  bumpActive: boolean
  settleNonce: number
  settleActive: boolean
  settleBoxId: number | null
  /** 사과를 주운 순간의 +1 연출 */
  pickNonce: number
  pickActive: boolean
  /** 다시 시작할 때마다 올라간다 — 사과 수가 0 으로 돌아간 것이 되돌리기 때문인지 구분한다 */
  epoch: number
}

type Action =
  /** roll 은 호출부에서 뽑아 넘긴다 — 리듀서는 순수해야 한다 (StrictMode 2회 호출) */
  | { type: 'move'; level: ParsedLevel; dir: Direction; roll: AppleRoll }
  | { type: 'undo' }
  | { type: 'restart'; level: ParsedLevel }
  | { type: 'endBump' }
  | { type: 'endSettle' }
  | { type: 'endPick' }

function initialState(level: ParsedLevel, initial: GameState | null, epoch = 0): ReducerState {
  return {
    game:
      initial && initial.levelId === level.data.id
        ? hydrateGameState(initial)
        : createGameState(level),
    facing: 'down',
    bumpNonce: 0,
    bumpActive: false,
    settleNonce: 0,
    settleActive: false,
    settleBoxId: null,
    pickNonce: 0,
    pickActive: false,
    epoch,
  }
}

function reducer(state: ReducerState, action: Action): ReducerState {
  switch (action.type) {
    case 'move': {
      const result = tryMove(action.level, state.game, action.dir, action.roll)
      if (!result.moved) {
        // 벽에 막힘 — 흔들림 피드백 (PRD §4.4)
        return {
          ...state,
          facing: action.dir,
          bumpNonce: state.bumpNonce + 1,
          bumpActive: true,
        }
      }
      const settled = result.settledBoxId !== null
      const picked = result.pickedApple !== null
      return {
        ...state,
        game: result.state,
        facing: action.dir,
        bumpActive: false,
        settleNonce: settled ? state.settleNonce + 1 : state.settleNonce,
        settleActive: settled ? true : state.settleActive,
        settleBoxId: settled ? result.settledBoxId : state.settleBoxId,
        pickNonce: picked ? state.pickNonce + 1 : state.pickNonce,
        pickActive: picked ? true : state.pickActive,
      }
    }
    case 'undo': {
      const previous = state.game.history[state.game.history.length - 1]
      if (!previous) return state
      return {
        ...state,
        game: undo(state.game),
        facing: previous.dir,
        bumpActive: false,
        settleActive: false,
        pickActive: false,
      }
    }
    case 'restart':
      return initialState(action.level, null, state.epoch + 1)
    case 'endBump':
      return state.bumpActive ? { ...state, bumpActive: false } : state
    case 'endSettle':
      return state.settleActive ? { ...state, settleActive: false } : state
    case 'endPick':
      return state.pickActive ? { ...state, pickActive: false } : state
    default:
      return state
  }
}

interface UseGameOptions {
  level: ParsedLevel
  /** 이어하기로 복원할 상태. 없거나 단계가 다르면 처음부터 시작한다. */
  initial: GameState | null
  reducedMotion: boolean
  onSolved: (moves: number) => void
}

export function useGame({ level, initial, reducedMotion, onSolved }: UseGameOptions) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(level, initial))

  const solved = useMemo(() => isSolved(level, state.game), [level, state.game])
  const [clearVisible, setClearVisible] = useState(false)

  // 입력 버퍼 — 애니메이션 중 들어온 입력을 1개까지 보관한다 (PRD §4.2).
  const lockedRef = useRef(false)
  const queuedRef = useRef<Direction | null>(null)
  const lockTimer = useRef<number | undefined>(undefined)
  const moveRef = useRef<(dir: Direction) => void>(() => {})
  const blockedRef = useRef(false)
  blockedRef.current = solved

  const move = useCallback(
    (dir: Direction) => {
      if (blockedRef.current) return
      // 사과 추첨은 리듀서 바깥에서 — 같은 수가 두 번 계산돼도 결과가 흔들리지 않는다.
      const roll: AppleRoll = { chance: Math.random(), spot: Math.random() }
      if (reducedMotion) {
        dispatch({ type: 'move', level, dir, roll })
        return
      }
      if (lockedRef.current) {
        queuedRef.current = dir
        return
      }
      dispatch({ type: 'move', level, dir, roll })
      lockedRef.current = true
      lockTimer.current = window.setTimeout(() => {
        lockedRef.current = false
        const queued = queuedRef.current
        queuedRef.current = null
        if (queued) moveRef.current(queued)
      }, MOVE_MS)
    },
    [level, reducedMotion],
  )
  moveRef.current = move

  // 화면을 떠나거나 단계가 바뀌면 잠금과 버퍼를 비운다.
  useEffect(
    () => () => {
      window.clearTimeout(lockTimer.current)
      lockedRef.current = false
      queuedRef.current = null
    },
    [level],
  )

  const undoMove = useCallback(() => {
    if (blockedRef.current) return
    queuedRef.current = null
    dispatch({ type: 'undo' })
  }, [])

  const restart = useCallback(() => {
    queuedRef.current = null
    setClearVisible(false)
    dispatch({ type: 'restart', level })
  }, [level])

  // 흔들림 / 안착 펄스는 정해진 시간 뒤 스스로 꺼진다.
  useEffect(() => {
    if (!state.bumpActive) return
    const timer = window.setTimeout(() => dispatch({ type: 'endBump' }), BUMP_MS)
    return () => window.clearTimeout(timer)
  }, [state.bumpActive, state.bumpNonce])

  useEffect(() => {
    if (!state.settleActive) return
    const timer = window.setTimeout(() => dispatch({ type: 'endSettle' }), SETTLE_MS)
    return () => window.clearTimeout(timer)
  }, [state.settleActive, state.settleNonce])

  useEffect(() => {
    if (!state.pickActive) return
    const timer = window.setTimeout(() => dispatch({ type: 'endPick' }), APPLE_POP_MS)
    return () => window.clearTimeout(timer)
  }, [state.pickActive, state.pickNonce])

  // 클리어 — 600ms 연출 후 결과 오버레이 (PRD §4.4).
  const onSolvedRef = useRef(onSolved)
  onSolvedRef.current = onSolved
  useEffect(() => {
    if (!solved) {
      setClearVisible(false)
      return
    }
    onSolvedRef.current(state.game.moveCount)
    const timer = window.setTimeout(
      () => setClearVisible(true),
      reducedMotion ? 0 : CLEAR_DELAY_MS,
    )
    return () => window.clearTimeout(timer)
  }, [solved, state.game.moveCount, reducedMotion])

  return {
    game: state.game,
    facing: state.facing,
    bumpNonce: state.bumpNonce,
    bumpActive: state.bumpActive,
    settleNonce: state.settleNonce,
    settleActive: state.settleActive,
    settleBoxId: state.settleBoxId,
    pickNonce: state.pickNonce,
    pickActive: state.pickActive,
    epoch: state.epoch,
    solved,
    clearVisible,
    move,
    undoMove,
    restart,
    canUndo: state.game.history.length > 0 && !solved,
  }
}
