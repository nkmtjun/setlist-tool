import { useLiveQuery } from 'dexie-react-hooks'
import Papa from 'papaparse'
import { useMemo, useRef, useState } from 'react'

import { db } from '../db/appDb'
import { bulkAddSongLibraryItems } from '../db/songLibrary'
import type { SongLibraryItem } from '../domain/types'
import { newId } from '../utils/id'
import { nowIso } from '../utils/time'

type ParsedRow = {
  title?: unknown
  artist?: unknown
  comment?: unknown
  url?: unknown
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeKey(title: string, artist: string): string {
  return JSON.stringify([title, artist])
}

export default function LibraryPage() {
  const [query, setQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const items = useLiveQuery(
    () => db.songLibrary.orderBy('updatedAt').reverse().toArray(),
    [],
    [],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items ?? []
    return (items ?? []).filter((it) => {
      const hay = `${it.title} ${it.artist}`.toLowerCase()
      return hay.includes(q)
    })
  }, [items, query])

  async function onImportCsv(file: File) {
    const raw = (await file.text()).replace(/^\uFEFF/, '')

    const parseWithHeader = Papa.parse<ParsedRow>(raw, {
      header: true,
      skipEmptyLines: true,
    })

    const hasHeader = (parseWithHeader.meta.fields ?? []).includes('title')
    const rows: ParsedRow[] = hasHeader
      ? parseWithHeader.data
      : Papa.parse<string[]>(raw, { header: false, skipEmptyLines: true }).data.map((r: string[]) => ({
          title: r[0],
          artist: r[1],
          comment: r[2],
          url: r[3],
        }))

    const existing = await db.songLibrary.toArray()
    const existingKeys = new Set(existing.map((it) => normalizeKey(it.title, it.artist)))

    const now = nowIso()
    const toInsert: SongLibraryItem[] = []
    const seenInFile = new Set<string>()

    for (const r of rows) {
      const title = asString(r.title).trim()
      if (!title) continue
      const artist = asString(r.artist).trim()
      const comment = asString(r.comment).trim()
      const url = asString(r.url).trim()

      const key = normalizeKey(title, artist)
      if (existingKeys.has(key)) continue
      if (seenInFile.has(key)) continue
      seenInFile.add(key)

      toInsert.push({
        id: newId(),
        title,
        artist,
        comment,
        url,
        createdAt: now,
        updatedAt: now,
      })
    }

    if (toInsert.length === 0) {
      window.alert('追加できる曲がありませんでした（空行/重複のみ）。')
      return
    }

    await bulkAddSongLibraryItems(toInsert)
    window.alert(`取り込み完了: ${toInsert.length} 件`) 
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <h1>楽曲ライブラリ</h1>
        <div className="pageActions">
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            CSVインポート
          </button>
          <input
            ref={fileInputRef}
            className="srOnly"
            type="file"
            accept="text/csv,.csv"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              e.target.value = ''
              try {
                await onImportCsv(file)
              } catch (err) {
                const message = err instanceof Error ? err.message : 'CSVの読み込みに失敗しました'
                window.alert(message)
              }
            }}
          />
        </div>
      </div>

      <div className="panel">
        <label className="field">
          <div className="fieldLabel">検索（曲名 / アーティスト）</div>
          <input
            className="textInput"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例: hello / 米津"
          />
        </label>
        <div className="counts">表示: {filtered.length} 件</div>
      </div>

      {filtered.length === 0 ? (
        <p className="muted">該当する曲がありません。</p>
      ) : (
        <div className="panel">
          <div className="libraryTable">
            <div className="libraryHead">
              <div>曲名</div>
              <div>アーティスト</div>
              <div>コメント</div>
              <div>URL</div>
            </div>
            {filtered.map((it) => (
              <div key={it.id} className="libraryRow">
                <div className="libraryCellStrong">{it.title}</div>
                <div>{it.artist}</div>
                <div className="libraryCellMuted">{it.comment}</div>
                <div className="libraryCellLink">
                  {it.url ? (
                    <a href={it.url} target="_blank" rel="noreferrer">
                      {it.url}
                    </a>
                  ) : (
                    <span className="libraryCellMuted">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
