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

  function IconClose() {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.29 9.17 12 2.89 5.71 4.3 4.29 10.59 10.6 16.89 4.29l1.41 1.42Z"
          fill="currentColor"
        />
      </svg>
    )
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="overlayBackdrop" onClick={props.onClose} />
      <div className="overlayPanel">
        <div className="overlayHead">
          <div className="overlayTitle">楽曲ライブラリから選択</div>
          <button type="button" className="iconButton" title="閉じる" aria-label="閉じる" onClick={props.onClose}>
            <IconClose />
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
