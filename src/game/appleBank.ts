import { createClient } from '@supabase/supabase-js'

// Vite 밖(렌더 테스트 등)에서는 import.meta.env 가 없을 수 있다.
const env = import.meta.env as ImportMetaEnv | undefined
const url = env?.VITE_SUPABASE_URL as string | undefined
const key = env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** 환경 변수가 없으면 사과는 저장되지 않지만 게임은 그대로 동작한다. */
const supabase = url && key ? createClient(url, key) : null

/** 사과 수를 담아 두는 테이블 — 첫 번째 행의 apple 컬럼 하나만 쓴다. */
const TABLE = 'Item table'

export interface AppleRecord {
  id: number
  apple: number
}

export async function fetchApples(): Promise<AppleRecord | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, apple')
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return { id: data.id as number, apple: (data.apple as number | null) ?? 0 }
}

export async function saveApples(id: number, apple: number): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from(TABLE).update({ apple }).eq('id', id)
  if (error) throw error
}
