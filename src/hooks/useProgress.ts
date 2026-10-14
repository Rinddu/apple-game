import { useCallback, useEffect, useRef, useState } from 'react'
import type { DpadSide, Progress } from '../game/storage'
import { loadProgress, saveProgress } from '../game/storage'
import type { GameState } from '../game/types'
import { TOTAL_LEVELS } from '../game/levels'

/** 진행 상황을 localStorage 에 지속시킨다 (PRD §4.6). */
export function useProgress() {
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const saveTimer = useRef<number | undefined>(undefined)

  // 이동마다 쓰지 않도록 살짝 지연시켜 묶어서 저장한다.
  useEffect(() => {
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => saveProgress(progress), 200)
    return () => window.clearTimeout(saveTimer.current)
  }, [progress])

  // 탭을 닫거나 백그라운드로 보낼 때는 즉시 저장한다.
  useEffect(() => {
    const flush = () => saveProgress(progress)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', flush)
    }
  }, [progress])

  const saveCurrent = useCallback((current: GameState | null) => {
    setProgress((prev) => (prev.current === current ? prev : { ...prev, current }))
  }, [])

  const recordClear = useCallback((levelId: number, moves: number) => {
    setProgress((prev) => {
      const key = String(levelId)
      const previousBest = prev.best[key]
      return {
        ...prev,
        maxUnlocked: Math.min(TOTAL_LEVELS, Math.max(prev.maxUnlocked, levelId + 1)),
        best: {
          ...prev.best,
          [key]: previousBest === undefined ? moves : Math.min(previousBest, moves),
        },
      }
    })
  }, [])

  const setDpadSide = useCallback((dpadSide: DpadSide) => {
    setProgress((prev) => ({ ...prev, dpadSide }))
  }, [])

  const markTutorialSeen = useCallback(() => {
    setProgress((prev) => (prev.seenTutorial ? prev : { ...prev, seenTutorial: true }))
  }, [])

  return { progress, saveCurrent, recordClear, setDpadSide, markTutorialSeen }
}
