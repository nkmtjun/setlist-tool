import { useMemo, useState } from 'react'

import type { SongLibraryItem } from '../domain/types'

export default function SongPicker(props: {
  open: boolean
  items: SongLibraryItem[]
  onPick: (item: SongLibraryItem) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return props.items
    return props.items.filter((it) => `${it.title} ${it.artist}`.toLowerCase().includes(query))
  }, [props.items, q])

  if (!props.open) return null

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="overlayBackdrop" onClick={props.onClose} />
      <div className="overlayPanel">
        <div className="overlayHead">
          <div className="overlayTitle">楽曲ライブラリから選択</div>
          <button type="button" onClick={props.onClose}>
            閉じる
          </button>
        </div>
        <div className="overlayBody">
          <label className="field">
            <div className="fieldLabel">検索（曲名 / アーティスト）</div>
            <input
              className="textInput"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="検索"
              autoFocus
            />
          </label>

          {filtered.length === 0 ? (
            <p className="muted">該当する曲がありません。</p>
          ) : (
            <div className="pickerList">
              {filtered.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  className="pickerItem"
                  onClick={() => props.onPick(it)}
                >
                  <div className="pickerTitle">{it.title}</div>
                  <div className="pickerMeta">{it.artist || '（アーティスト未入力）'}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
