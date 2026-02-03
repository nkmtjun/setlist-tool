import type { SetlistItem } from './types'

export function getSongCounts(items: SetlistItem[]): {
  main: number
  encore: number
  total: number
} {
  let main = 0
  let encore = 0
  let isEncore = false

  for (const it of items) {
    if (it.type === 'ENCORE_START') {
      isEncore = true
      continue
    }
    if (it.type !== 'SONG') continue
    if (isEncore) encore += 1
    else main += 1
  }

  return { main, encore, total: main + encore }
}

export function getSongCodeMap(items: SetlistItem[]): Record<string, string> {
  const out: Record<string, string> = {}
  let mainNo = 0
  let encoreNo = 0
  let isEncore = false

  for (const it of items) {
    if (it.type === 'ENCORE_START') {
      isEncore = true
      continue
    }
    if (it.type !== 'SONG') continue

    if (isEncore) {
      encoreNo += 1
      out[it.id] = `EN${String(encoreNo).padStart(2, '0')}`
    } else {
      mainNo += 1
      out[it.id] = `M${String(mainNo).padStart(2, '0')}`
    }
  }

  return out
}
