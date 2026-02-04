import { useLiveQuery } from 'dexie-react-hooks'
import Papa from 'papaparse'
import { useMemo, useRef, useState } from 'react'

import { db } from '../db/appDb'
import { bulkAddSongLibraryItems, bulkDeleteSongLibraryItems, deleteSongLibraryItem, updateSongLibraryItem } from '../db/songLibrary'
import type { SongLibraryItem } from '../domain/types'
import { newId } from '../utils/id'
import { nowIso } from '../utils/time'

type ParsedRow = {
  title?: unknown
  artist?: unknown
  comment?: unknown
  url?: unknown
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM6 7h12l-1 14H7L6 7Z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 4h11a2 2 0 0 1 2 2v4h-2V6H4v12h11v-4h2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        fill="currentColor"
      />
      <path d="M12 8v3H4v2h8v3l4-4-4-4Z" fill="currentColor" />
    </svg>
  )
}

function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 4h11a2 2 0 0 1 2 2v4h-2V6H4v12h11v-4h2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        fill="currentColor"
      />
      <path d="M12 8 8 12l4 4v-3h8v-2h-8V8Z" fill="currentColor" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25Zm14.71-9.04a1.003 1.003 0 0 0 0-1.42l-1.5-1.5a1.003 1.003 0 0 0-1.42 0l-1.12 1.12 3.75 3.75 1.29-1.29Z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.29 9.17 12 2.89 5.71 4.3 4.29 10.59 10.6 16.89 4.29l1.41 1.42Z" fill="currentColor" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m9 16.17-3.88-3.88L3.7 13.7 9 19l12-12-1.41-1.41L9 16.17Z" fill="currentColor" />
    </svg>
  )
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeKey(title: string, artist: string): string {
  return JSON.stringify([title, artist])
}

export default function LibraryPage() {
  const [query, setQuery] = useState('')
  const [editingItem, setEditingItem] = useState<SongLibraryItem | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    artist: '',
    comment: '',
    url: '',
  })
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

  function openEdit(item: SongLibraryItem) {
    setEditingItem(item)
    setEditForm({
      title: item.title,
      artist: item.artist,
      comment: item.comment,
      url: item.url,
    })
  }

  function closeEdit() {
    setEditingItem(null)
  }

  async function onSaveEdit() {
    if (!editingItem) return
    const title = editForm.title.trim()
    if (!title) {
      window.alert('曲名は必須です。')
      return
    }
    await updateSongLibraryItem(editingItem.id, {
      title,
      artist: editForm.artist.trim(),
      comment: editForm.comment.trim(),
      url: editForm.url.trim(),
    })
    setEditingItem(null)
  }

  function downloadCsvFile(filename: string, csv: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
  }

  async function onExportCsv() {
    const currentItems = items ?? []
    if (currentItems.length === 0) {
      window.alert('エクスポートできる曲がありません。')
      return
    }
    const csv = Papa.unparse(
      currentItems.map((it) => ({
        title: it.title,
        artist: it.artist,
        comment: it.comment,
        url: it.url,
      })),
      { header: true },
    )
    downloadCsvFile(`song-library-${nowIso().slice(0, 10)}.csv`, csv)
  }

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
          <button
            type="button"
            className="iconButton iconButton--danger"
            title="一括削除"
            aria-label="一括削除"
            onClick={async () => {
              const currentItems = items ?? []
              if (currentItems.length === 0) {
                window.alert('削除できる曲がありません。')
                return
              }
              if (!window.confirm(`登録済みの ${currentItems.length} 件を一括削除します。よろしいですか？`)) {
                return
              }
              await bulkDeleteSongLibraryItems(currentItems.map((it) => it.id))
            }}
          >
            <IconTrash />
          </button>
          <button type="button" className="iconButton" title="CSV一括エクスポート" aria-label="CSV一括エクスポート" onClick={onExportCsv}>
            <IconDownload />
          </button>
          <button
            type="button"
            className="iconButton"
            title="CSVインポート"
            aria-label="CSVインポート"
            onClick={() => fileInputRef.current?.click()}
          >
            <IconUpload />
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

      <details className="panel detailsPanel">
        <summary className="detailsSummary">CSVの作り方（形式 / 取り込みルール）</summary>
        <div className="detailsBody">
          <div className="field">
            <p className="muted">手順: 右上の「CSVインポート」→ CSVファイルを選択すると取り込みが開始されます。</p>
            <p className="muted">
              列は <code>title</code>, <code>artist</code>, <code>comment</code>, <code>url</code> を使用します（5列目以降は無視）。
            </p>
            <p className="muted">
              ヘッダ行あり推奨：1行目に列名を入れ、ヘッダに <code>title</code> が含まれる場合は列名で読み取ります。ヘッダがない場合は 1〜4列目を順に割り当てます。
            </p>
            <p className="muted">
              文字コードは UTF-8（BOMあり/なし対応）。各セルの前後空白は自動で trim され、<code>title</code> が空の行はスキップします。
            </p>
            <p className="muted">
              重複は <code>title</code> + <code>artist</code> の完全一致で判定し、既存データ／同一CSV内の重複は取り込みません。
            </p>
          </div>

          <div className="field">
            <div className="fieldLabel">CSV例</div>
            <pre className="outputBox">{`title,artist,comment,url
Lemon,米津玄師,キー:+2,https://example.com/lemon
シーソーゲーム,Mr.Children,,`}</pre>
          </div>
          <div className="field">
            <div className="fieldLabel">テスト用CSV</div>
            <a href="/test-library.csv" download>
              test-library.csv をダウンロード
            </a>
          </div>
        </div>
      </details>

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
              <div>操作</div>
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
                <div className="libraryActions">
                  <button type="button" className="iconButton" title="編集" aria-label="編集" onClick={() => openEdit(it)}>
                    <IconEdit />
                  </button>
                  <button
                    type="button"
                    className="iconButton iconButton--danger"
                    title="削除"
                    aria-label="削除"
                    onClick={async () => {
                      if (!window.confirm('この曲を削除しますか？')) return
                      await deleteSongLibraryItem(it.id)
                    }}
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {editingItem ? (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="overlayBackdrop" onClick={closeEdit} />
          <div className="overlayPanel">
            <div className="overlayHead">
              <div className="overlayTitle">楽曲情報を編集</div>
              <button type="button" className="iconButton" title="閉じる" aria-label="閉じる" onClick={closeEdit}>
                <IconClose />
              </button>
            </div>
            <div className="overlayBody">
              <label className="field">
                <div className="fieldLabel">曲名（必須）</div>
                <input
                  className="textInput"
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </label>
              <label className="field">
                <div className="fieldLabel">アーティスト</div>
                <input
                  className="textInput"
                  value={editForm.artist}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, artist: e.target.value }))}
                />
              </label>
              <label className="field">
                <div className="fieldLabel">コメント</div>
                <textarea
                  className="textArea"
                  rows={3}
                  value={editForm.comment}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, comment: e.target.value }))}
                />
              </label>
              <label className="field">
                <div className="fieldLabel">URL</div>
                <input
                  className="textInput"
                  value={editForm.url}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, url: e.target.value }))}
                />
              </label>
              <div className="rowActions">
                <button type="button" className="iconButton" title="保存" aria-label="保存" onClick={onSaveEdit}>
                  <IconCheck />
                </button>
                <button type="button" className="iconButton" title="キャンセル" aria-label="キャンセル" onClick={closeEdit}>
                  <IconClose />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
