import type { GameState } from './types'

const STORAGE_KEY = 'cave-sokoban/progress'
const VERSION = 1

export type DpadSide = 'left' | 'right'

export interface Progress {
  version: number
  /** 해금된 최고 단계 번호 */
  maxUnlocked: number
  /** 단계별 최소 이동 수 기록 (levelId → moves) */
  best: Record<string, number>
  /** 진행 중이던 단계의 보드 상태 (PRD §4.6 이어하기) */
  current: GameState | null
  /** 한 손 조작을 위한 D-패드 배치 (PRD §4.2) */
  dpadSide: DpadSide
  /** 튜토리얼을 이미 봤는지 */
  seenTutorial: boolean
}

export const INITIAL_PROGRESS: Progress = {
  version: VERSION,
  maxUnlocked: 1,
  best: {},
  current: null,
  dpadSide: 'right',
  seenTutorial: false,
}

/** localStorage 를 쓸 수 없는 환경(프라이빗 모드 등)에서도 게임은 동작해야 한다. */
export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_PROGRESS
    const parsed = JSON.parse(raw) as Partial<Progress>
    if (parsed.version !== VERSION) return INITIAL_PROGRESS
    return {
      ...INITIAL_PROGRESS,
      ...parsed,
      best: parsed.best ?? {},
    }
  } catch {
    return INITIAL_PROGRESS
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // 저장 실패는 플레이를 막지 않는다.
  }
}
