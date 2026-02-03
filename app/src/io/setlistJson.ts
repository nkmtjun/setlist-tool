import type { Setlist, SetlistExportV1, SetlistItem } from '../domain/types'
import { newId } from '../utils/id'
import { nowIso } from '../utils/time'

export const SETLIST_SCHEMA_VERSION_V1 = 'setlist-assist.v1' as const

export function toSetlistExportV1(setlist: Setlist): SetlistExportV1 {
  return {
    schemaVersion: SETLIST_SCHEMA_VERSION_V1,
    exportedAt: nowIso(),
    setlist,
  }
}

export function downloadJsonFile(filename: string, obj: unknown): void {
  const json = JSON.stringify(obj, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function safeFileName(name: string): string {
  return (name || 'setlist')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function sanitizeItemsForImport(input: unknown): SetlistItem[] {
  if (!Array.isArray(input)) return []

  const out: SetlistItem[] = []
  let encoreSeen = false

  for (const raw of input) {
    if (!isObject(raw)) continue
    const type = raw.type

    if (type === 'SONG') {
      out.push({
        id: newId(),
        type: 'SONG',
        title: asString(raw.title),
        artist: asString(raw.artist),
        memo: asString(raw.memo),
      })
      continue
    }

    if (type === 'NOTE') {
      out.push({
        id: newId(),
        type: 'NOTE',
        label: asString(raw.label),
        text: asString(raw.text),
      })
      continue
    }

    if (type === 'ENCORE_START') {
      if (encoreSeen) continue
      encoreSeen = true
      out.push({
        id: newId(),
        type: 'ENCORE_START',
        memo: asString(raw.memo),
      })
    }
  }

  return out
}

export function parseSetlistExportV1(text: string): SetlistExportV1 {
  const parsed = JSON.parse(text) as unknown
  if (!isObject(parsed)) throw new Error('JSONの形式が不正です')
  if (parsed.schemaVersion !== SETLIST_SCHEMA_VERSION_V1) {
    throw new Error('schemaVersionが不正です')
  }
  if (!isObject(parsed.setlist)) throw new Error('setlistが不正です')

  const setlist = parsed.setlist
  const title = asString(setlist.title, 'インポートしたセットリスト')

  const imported: Setlist = {
    id: newId(),
    title,
    items: sanitizeItemsForImport(setlist.items),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }

  return {
    schemaVersion: SETLIST_SCHEMA_VERSION_V1,
    exportedAt: nowIso(),
    setlist: imported,
  }
}

export async function readTextFile(file: File): Promise<string> {
  return await file.text()
}
