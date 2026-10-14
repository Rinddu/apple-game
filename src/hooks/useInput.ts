import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Direction } from '../game/types'
import { SWIPE_THRESHOLD_PX } from '../game/constants'

/** OS 의 "모션 줄이기" 설정을 따른다 (PRD §4.4). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
}

/** 방향키 / WASD (PRD §4.2). Z 로 되돌리기. */
export function useKeyboard(
  enabled: boolean,
  onMove: (dir: Direction) => void,
  onUndo: () => void,
) {
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const dir = KEY_MAP[event.key] ?? KEY_MAP[event.key.toLowerCase()]
      if (dir) {
        event.preventDefault() // 화살표로 페이지가 스크롤되지 않도록
        onMove(dir)
        return
      }
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault()
        onUndo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, onMove, onUndo])
}

/**
 * 스와이프 감지 (PRD §4.2).
 * - 최소 24px 를 넘어야 인식한다.
 * - 가로/세로 중 성분이 더 큰 축으로만 판정해 흔들림에 의한 오인식을 줄인다.
 * - 한 번 인식하면 손을 뗄 때까지 추가 입력을 내지 않는다 ("스와이프 1회 = 1칸").
 */
export function useSwipe(
  targetRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  onSwipe: (dir: Direction) => void,
) {
  const handlerRef = useRef(onSwipe)
  handlerRef.current = onSwipe

  useEffect(() => {
    const node = targetRef.current
    if (!node || !enabled) return

    let startX = 0
    let startY = 0
    let tracking = false
    let fired = false

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return
      startX = touch.clientX
      startY = touch.clientY
      tracking = true
      fired = false
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking || fired) return
      const touch = event.touches[0]
      if (!touch) return
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)
      if (Math.max(absX, absY) < SWIPE_THRESHOLD_PX) return

      event.preventDefault() // 보드 위에서의 당겨서 새로고침·스크롤 방지
      fired = true
      if (absX > absY) handlerRef.current(dx > 0 ? 'right' : 'left')
      else handlerRef.current(dy > 0 ? 'down' : 'up')
    }

    const onTouchEnd = () => {
      tracking = false
      fired = false
    }

    node.addEventListener('touchstart', onTouchStart, { passive: true })
    node.addEventListener('touchmove', onTouchMove, { passive: false })
    node.addEventListener('touchend', onTouchEnd)
    node.addEventListener('touchcancel', onTouchEnd)
    return () => {
      node.removeEventListener('touchstart', onTouchStart)
      node.removeEventListener('touchmove', onTouchMove)
      node.removeEventListener('touchend', onTouchEnd)
      node.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [targetRef, enabled])
}
