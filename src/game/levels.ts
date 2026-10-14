import rawLevels from './levels.json'
import type { LevelData, ParsedLevel } from './types'
import { parseLevel } from './engine'

export const LEVELS = rawLevels as LevelData[]
export const TOTAL_LEVELS = LEVELS.length

const parsedCache = new Map<number, ParsedLevel>()

export function getLevel(id: number): ParsedLevel | null {
  const cached = parsedCache.get(id)
  if (cached) return cached

  const data = LEVELS.find((level) => level.id === id)
  if (!data) return null

  const parsed = parseLevel(data)
  parsedCache.set(id, parsed)
  return parsed
}
