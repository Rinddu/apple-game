import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchApples, saveApples } from '../game/appleBank'

/**
 * 모은 사과 수를 Supabase 의 Item table.apple 에 지속시킨다.
 * 새로고침해도 사과가 남아 있도록 시작할 때 불러오고, 바뀔 때마다 바로 저장한다.
 */
export function useAppleBank() {
  const [apples, setApples] = useState(0)
  const rowIdRef = useRef<number | null>(null)
  /** 불러오기가 끝나기 전에 주운 사과 — 불러온 값에 더해 준다 */
  const pendingRef = useRef(0)
  const loadedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetchApples()
      .then((record) => {
        if (cancelled) return
        rowIdRef.current = record?.id ?? null
        loadedRef.current = true
        setApples(Math.max(0, (record?.apple ?? 0) + pendingRef.current))
        pendingRef.current = 0
      })
      .catch((error: unknown) => {
        // 불러오기에 실패해도 플레이는 막지 않는다 — 덮어쓰지 않도록 저장도 하지 않는다.
        console.error('[apples] 불러오기 실패', error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 사과는 드물게 바뀌므로 지연 없이 바로 저장한다 — 줍자마자 새로고침해도 남는다.
  useEffect(() => {
    const id = rowIdRef.current
    if (!loadedRef.current || id === null) return
    saveApples(id, apples).catch((error: unknown) => {
      console.error('[apples] 저장 실패', error)
    })
  }, [apples])

  const addApples = useCallback((delta: number) => {
    if (delta === 0) return
    if (!loadedRef.current) pendingRef.current += delta
    setApples((prev) => Math.max(0, prev + delta))
  }, [])

  return { apples, addApples }
}
