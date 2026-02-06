import { useLiveQuery } from 'dexie-react-hooks'
import { type CSSProperties, type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'

import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { db } from '../db/appDb'
import { createSetlistItem, patchSetlist } from '../db/setlists'
import { getSongCodeMap, getSongCounts } from '../domain/setlistCalc'
import type { SetlistItem } from '../domain/types'
import SongPicker from '../components/SongPicker'

function RowDetailMenu(props: {
  idx: number
  hasEncore: boolean
  addItemBelow: (idx: number, type: SetlistItem['type']) => void
}) {
  const { idx, hasEncore, addItemBelow } = props

  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current
    const menuEl = menuRef.current
    if (!triggerEl || !menuEl) return

    const t = triggerEl.getBoundingClientRect()
    const m = menuEl.getBoundingClientRect()

    const gap = 6
    const margin = 10
    const vw = window.innerWidth
    const vh = window.innerHeight

    // 既存の見た目に合わせて「下・右寄せ」を基本配置にする
    let left = t.right - m.width
    let top = t.bottom + gap

    // 右/左のはみ出しを抑える
    left = Math.min(Math.max(left, margin), Math.max(margin, vw - margin - m.width))

    // 下に出せない場合は上にフリップ。それでも厳しい場合はクランプ。
    const bottomOverflow = top + m.height > vh - margin
    const topCandidate = t.top - gap - m.height
    if (bottomOverflow && topCandidate >= margin) {
      top = topCandidate
    } else {
      top = Math.min(Math.max(top, margin), Math.max(margin, vh - margin - m.height))
    }

    setPos({ top, left })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    // 初回描画後にサイズが取れるのでそこで位置決め
    updatePosition()
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return

    const onReposition = () => updatePosition()
    window.addEventListener('resize', onReposition)
    // スクロールコンテナ内でも追従できるよう capture で拾う
    document.addEventListener('scroll', onReposition, true)

    return () => {
      window.removeEventListener('resize', onReposition)
      document.removeEventListener('scroll', onReposition, true)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target
      if (!(target instanceof Node)) return

      const menuEl = menuRef.current
      const triggerEl = triggerRef.current
      if (!menuEl || !triggerEl) return
      if (menuEl.contains(target) || triggerEl.contains(target)) return

      close()
    }

    // capture: 子要素側で stopPropagation されても確実に検知
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [open, close])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          className="inlineMenuPopup inlineMenuPopup--portal"
          role="menu"
          aria-label="すぐ下に追加"
          style={
            pos
              ? ({ top: pos.top, left: pos.left } satisfies CSSProperties)
              : ({ top: 0, left: 0, visibility: 'hidden' } satisfies CSSProperties)
          }
        >
          <button
            type="button"
            className="inlineMenuItem"
            onClick={() => {
              close()
              addItemBelow(idx, 'SONG')
            }}
          >
            曲をすぐ下に追加
          </button>
          <button
            type="button"
            className="inlineMenuItem"
            onClick={() => {
              close()
              addItemBelow(idx, 'NOTE')
            }}
          >
            NOTEをすぐ下に追加
          </button>
          <button
            type="button"
            className="inlineMenuItem"
            onClick={() => {
              close()
              addItemBelow(idx, 'ENCORE_START')
            }}
            disabled={hasEncore}
            title={hasEncore ? 'Encoreは既に設定済みです' : undefined}
          >
            Encoreをすぐ下に追加
          </button>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="iconButton iconButton--compact"
        aria-label={`#${idx + 1} の詳細メニュー`}
        title="詳細メニュー"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setPos(null)
          setOpen((prev) => !prev)
        }}
      >
        <IconMore />
      </button>
      {menu}
    </>
  )
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" fill="currentColor" />
    </svg>
  )
}

function IconNote() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6 4h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm7 1.5V9h3.5L13 5.5ZM8 12h8v2H8v-2Zm0 4h6v2H8v-2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconEncore() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 4h16v4h-2V6H6v2H4V4Zm0 12h2v2h12v-2h2v4H4v-4Zm7-9h2v10h-2V7Zm-4 4h10v2H7v-2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconMusic() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z" fill="currentColor" />
    </svg>
  )
}

function IconUp() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5l6 6-1.41 1.41L13 8.83V19h-2V8.83L7.41 12.41 6 11l6-6Z" fill="currentColor" />
    </svg>
  )
}

function IconDown() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 19l-6-6 1.41-1.41L11 15.17V5h2v10.17l3.59-3.58L18 13l-6 6Z" fill="currentColor" />
    </svg>
  )
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

function IconLibrary() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 5h3v14H4V5Zm5-2h3v16H9V3Zm5 4h3v12h-3V7Zm5 2h3v10h-3V9Z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41Z" fill="currentColor" />
    </svg>
  )
}

function IconChevronUp() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m7.41 15.41 4.59-4.58 4.59 4.58L18 14l-6-6-6 6 1.41 1.41Z" fill="currentColor" />
    </svg>
  )
}

function IconShare() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42L17.59 5H14V3Z"
        fill="currentColor"
      />
      <path d="M5 5h7v2H7v12h12v-5h2v7H5V5Z" fill="currentColor" />
    </svg>
  )
}

function IconMore() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M10 6a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm0 6a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm0 6a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" fill="currentColor" />
    </svg>
  )
}

function renderTypeBadge(type: SetlistItem['type']) {
  if (type === 'SONG') {
    return (
      <div className="rowBadge rowBadge--song" aria-label="SONG">
        <IconMusic />
        <span className="srOnly">SONG</span>
      </div>
    )
  }
  if (type === 'ENCORE_START') {
    return <div className="rowBadge">ENCORE</div>
  }
  return <div className="rowBadge">NOTE</div>
}

function firstLine(text?: string | null): string {
  if (!text) return ''
  return text.replace(/\r\n/g, '\n').split('\n')[0]?.trim() ?? ''
}

export default function SetlistEditPage() {
  const navigate = useNavigate()
  const { setlistId } = useParams()

  const setlist = useLiveQuery(
    async () => {
      if (!setlistId) return undefined
      return await db.setlists.get(setlistId)
    },
    [setlistId],
    null,
  )

  const [title, setTitle] = useState('')
  const [items, setItems] = useState<SetlistItem[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTargetId, setPickerTargetId] = useState<string | null>(null)
  const initializedRef = useRef(false)
  const saveTimerRef = useRef<number | null>(null)
  const lastSavedKeyRef = useRef<string>('')

  useEffect(() => {
    if (!setlist) return

    let cancelled = false
    const nextTitle = setlist.title
    const nextItems = setlist.items

    queueMicrotask(() => {
      if (cancelled) return
      setTitle(nextTitle)
      setItems(nextItems)
      initializedRef.current = true
      lastSavedKeyRef.current = JSON.stringify({ title: nextTitle, items: nextItems })
    })

    return () => {
      cancelled = true
    }
  }, [setlist])

  useEffect(() => {
    if (!initializedRef.current) return
    if (!setlistId) return

    const key = JSON.stringify({ title, items })
    if (key === lastSavedKeyRef.current) return

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(async () => {
      await patchSetlist(setlistId, { title, items })
      lastSavedKeyRef.current = key
    }, 350)

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [title, items, setlistId])

  const counts = useMemo(() => getSongCounts(items), [items])
  const hasEncore = useMemo(() => items.some((it) => it.type === 'ENCORE_START'), [items])
  const codeMap = useMemo(() => getSongCodeMap(items), [items])

  const libraryItems = useLiveQuery(
    () => db.songLibrary.orderBy('updatedAt').reverse().toArray(),
    [],
    [],
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function moveIndex(from: number, to: number) {
    setItems((prev) => {
      if (from < 0 || from >= prev.length) return prev
      if (to < 0 || to >= prev.length) return prev
      return arrayMove(prev, from, to)
    })
  }

  function addItem(type: SetlistItem['type']) {
    const item = createSetlistItem(type)
    setItems((prev) => [...prev, item])
    setExpandedId(item.id)
  }

  function addItemBelow(index: number, type: SetlistItem['type']) {
    const item = createSetlistItem(type)
    setItems((prev) => {
      const next = [...prev]
      next.splice(index + 1, 0, item)
      return next
    })
    setExpandedId(item.id)
  }

  async function confirmDeleteItem(itemId: string) {
    const ok = window.confirm('この行を削除しますか？')
    if (ok) {
      setItems((prev) => prev.filter((x) => x.id !== itemId))
      setExpandedId((prev) => (prev === itemId ? null : prev))
    }
  }

  function renderSummary(it: SetlistItem) {
    if (it.type === 'SONG') {
      const title = it.title?.trim() || '（未入力）'
      const artist = it.artist?.trim() || '（未入力）'
      const memoFull = (it.memo ?? '').replace(/\r\n/g, '\n').trim() || '（未入力）'
      const memo = firstLine(it.memo) || '（未入力）'
      return (
        <div className="rowSummary rowSummary--song">
          <span className="rowSummaryLabel">曲名</span>
          <span className="rowSummaryLabel">アーティスト</span>
          <span className="rowSummaryLabel">メモ</span>
          <span className="rowSummaryValue" title={title}>
            {title}
          </span>
          <span className="rowSummaryValue" title={artist}>
            {artist}
          </span>
          <span className="rowSummaryValue" title={memoFull}>
            {memo}
          </span>
        </div>
      )
    }
    if (it.type === 'NOTE') {
      const label = it.label?.trim() || '（未入力）'
      const textFull = (it.text ?? '').replace(/\r\n/g, '\n').trim() || '（未入力）'
      const text = firstLine(it.text) || '（未入力）'
      return (
        <div className="rowSummary rowSummary--note">
          <span className="rowSummaryLabel">ラベル</span>
          <span className="rowSummaryLabel">本文</span>
          <span className="rowSummaryLabel rowSummaryPlaceholder" aria-hidden="true">
            _
          </span>
          <span className="rowSummaryValue" title={label}>
            {label}
          </span>
          <span className="rowSummaryValue" title={textFull}>
            {text}
          </span>
          <span className="rowSummaryValue rowSummaryPlaceholder" aria-hidden="true">
            _
          </span>
        </div>
      )
    }

    const memoFull = (it.memo ?? '').replace(/\r\n/g, '\n').trim() || '（未入力）'
    const memo = firstLine(it.memo) || '（未入力）'
    return (
      <div className="rowSummary rowSummary--encore">
        <span className="rowSummaryLabel">Encoreメモ</span>
        <span className="rowSummaryLabel rowSummaryPlaceholder" aria-hidden="true">
          _
        </span>
        <span className="rowSummaryLabel rowSummaryPlaceholder" aria-hidden="true">
          _
        </span>
        <span className="rowSummaryValue" title={memoFull}>
          {memo}
        </span>
        <span className="rowSummaryValue rowSummaryPlaceholder" aria-hidden="true">
          _
        </span>
        <span className="rowSummaryValue rowSummaryPlaceholder" aria-hidden="true">
          _
        </span>
      </div>
    )
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    if (active.id === over.id) return

    setItems((prev) => {
      const from = prev.findIndex((x) => x.id === String(active.id))
      const to = prev.findIndex((x) => x.id === String(over.id))
      if (from < 0 || to < 0) return prev
      return arrayMove(prev, from, to)
    })
  }

  if (!setlistId) {
    return (
      <section className="page">
        <h1>セットリスト編集</h1>
        <p className="muted">IDが不正です。</p>
      </section>
    )
  }

  if (setlist === null) {
    return (
      <section className="page">
        <h1>セットリスト編集</h1>
        <p className="muted">読み込み中…</p>
      </section>
    )
  }

  if (!setlist) {
    return (
      <section className="page">
        <h1>セットリスト編集</h1>
        <p className="muted">見つかりませんでした。</p>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <h1>セットリスト編集</h1>
        <div className="pageActions">
          <button
            type="button"
            className="iconButton"
            title="出力 / 共有"
            aria-label="出力 / 共有"
            onClick={() => navigate(`/share/${setlistId}`)}
          >
            <IconShare />
          </button>
        </div>
      </div>

      <div className="panel">
        <label className="field">
          <div className="fieldLabel">タイトル</div>
          <input
            className="textInput"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトル"
          />
        </label>
        <div className="counts">
          曲数: 本編 {counts.main} / アンコール {counts.encore} / 合計 {counts.total}
        </div>
      </div>

      <div className="panel">
        <div className="rowActions rowActions--sticky">
          <button
            type="button"
            className="iconButton"
            title="曲追加"
            aria-label="曲追加"
            onClick={() => addItem('SONG')}
          >
            <IconPlus />
          </button>
          <button
            type="button"
            className="iconButton"
            title="NOTE追加"
            aria-label="NOTE追加"
            onClick={() => addItem('NOTE')}
          >
            <IconNote />
          </button>
          <button
            type="button"
            disabled={hasEncore}
            className="iconButton"
            title={hasEncore ? 'Encoreは既に設定済みです' : 'Encore区切り追加'}
            aria-label="Encore区切り追加"
            onClick={() => addItem('ENCORE_START')}
          >
            <IconEncore />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="muted">行がありません。</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((x) => x.id)} strategy={verticalListSortingStrategy}>
              <div className="rows">
                {items.map((it, idx) => (
                  <SortableRow
                    key={it.id}
                    id={it.id}
                    isExpanded={expandedId === it.id}
                    head={
                      <>
                        <button
                          type="button"
                          className="iconButton iconButton--compact"
                          title={expandedId === it.id ? '折りたたむ' : '展開する'}
                          aria-label={expandedId === it.id ? '折りたたむ' : '展開する'}
                          onClick={() => setExpandedId((prev) => (prev === it.id ? null : it.id))}
                        >
                          {expandedId === it.id ? <IconChevronUp /> : <IconChevronDown />}
                        </button>
                        {renderTypeBadge(it.type)}
                        <div
                          className={`rowCode${it.type === 'SONG' ? '' : ' rowCode--placeholder'}`}
                          aria-hidden={it.type === 'SONG' ? undefined : true}
                        >
                          {it.type === 'SONG' ? (codeMap[it.id] ?? '') : 'M00'}
                        </div>
                        <div className="rowIndex">#{idx + 1}</div>
                        {renderSummary(it)}
                        <div className="rowHeadSpacer" />
                        <button
                          type="button"
                          className="iconButton iconButton--compact"
                          title="上へ"
                          aria-label="上へ"
                          disabled={idx === 0}
                          onClick={() => moveIndex(idx, idx - 1)}
                        >
                          <IconUp />
                        </button>
                        <button
                          type="button"
                          className="iconButton iconButton--compact"
                          title="下へ"
                          aria-label="下へ"
                          disabled={idx === items.length - 1}
                          onClick={() => moveIndex(idx, idx + 1)}
                        >
                          <IconDown />
                        </button>
                        <RowDetailMenu idx={idx} hasEncore={hasEncore} addItemBelow={addItemBelow} />
                        <button
                          type="button"
                          className="iconButton iconButton--compact iconButton--danger"
                          title="行削除"
                          aria-label="行削除"
                          onClick={() => confirmDeleteItem(it.id)}
                        >
                          <IconTrash />
                        </button>
                      </>
                    }
                  >
                    {expandedId === it.id && it.type === 'SONG' ? (
                      <div className="rowBody songEditorBody">
                        <div className="rowSubActions">
                          <span
                            className="iconButtonTooltipWrap"
                            title={(libraryItems ?? []).length === 0 ? '楽曲ライブラリが未登録です' : undefined}
                          >
                            <button
                              type="button"
                              className="iconButton"
                              title={(libraryItems ?? []).length === 0 ? undefined : 'ライブラリから選択'}
                              aria-label="ライブラリから選択"
                              onClick={() => {
                                setPickerTargetId(it.id)
                                setPickerOpen(true)
                              }}
                              disabled={(libraryItems ?? []).length === 0}
                            >
                              <IconLibrary />
                            </button>
                          </span>
                        </div>
                        <div className="songEditorGrid songEditorRow">
                          <label className="field">
                            <div className="fieldLabel">曲名</div>
                            <input
                              className="textInput"
                              value={it.title ?? ''}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((x) =>
                                    x.id === it.id && x.type === 'SONG' ? { ...x, title: e.target.value } : x,
                                  ),
                                )
                              }
                            />
                          </label>
                          <label className="field">
                            <div className="fieldLabel">アーティスト</div>
                            <input
                              className="textInput"
                              value={it.artist ?? ''}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((x) =>
                                    x.id === it.id && x.type === 'SONG' ? { ...x, artist: e.target.value } : x,
                                  ),
                                )
                              }
                            />
                          </label>
                          <label className="field">
                            <div className="fieldLabel">メモ（改行可）</div>
                            <textarea
                              className="textArea"
                              rows={2}
                              value={it.memo ?? ''}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((x) =>
                                    x.id === it.id && x.type === 'SONG' ? { ...x, memo: e.target.value } : x,
                                  ),
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>
                    ) : null}

                    {expandedId === it.id && it.type === 'NOTE' ? (
                      <div className="rowBody">
                        <label className="field">
                          <div className="fieldLabel">ラベル</div>
                          <input
                            className="textInput"
                            value={it.label}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((x) =>
                                  x.id === it.id && x.type === 'NOTE' ? { ...x, label: e.target.value } : x,
                                ),
                              )
                            }
                            placeholder="例: MC / 幕間 / Wアンコール"
                          />
                        </label>
                        <label className="field">
                          <div className="fieldLabel">本文（改行可）</div>
                          <textarea
                            className="textArea"
                            rows={3}
                            value={it.text ?? ''}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((x) =>
                                  x.id === it.id && x.type === 'NOTE' ? { ...x, text: e.target.value } : x,
                                ),
                              )
                            }
                          />
                        </label>
                      </div>
                    ) : null}

                    {expandedId === it.id && it.type === 'ENCORE_START' ? (
                      <div className="rowBody">
                        <div className="encoreLabel">Encore</div>
                        <label className="field">
                          <div className="fieldLabel">メモ（改行可）</div>
                          <textarea
                            className="textArea"
                            rows={2}
                            value={it.memo ?? ''}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((x) =>
                                  x.id === it.id && x.type === 'ENCORE_START'
                                    ? { ...x, memo: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                      </div>
                    ) : null}
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <SongPicker
        open={pickerOpen}
        items={libraryItems ?? []}
        onClose={() => {
          setPickerOpen(false)
          setPickerTargetId(null)
        }}
        onPick={(song) => {
          const targetId = pickerTargetId
          if (!targetId) return
          setItems((prev) =>
            prev.map((x) => (x.id === targetId && x.type === 'SONG' ? { ...x, title: song.title, artist: song.artist } : x)),
          )
          setExpandedId(targetId)
          setPickerOpen(false)
          setPickerTargetId(null)
        }}
      />
    </section>
  )
}

function SortableRow(props: { id: string; head: ReactNode; children: ReactNode; isExpanded: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: props.id,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={`row${props.isExpanded ? ' rowExpanded' : ' rowCollapsed'}`}>
      <div className="rowHead">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="dragHandle"
          aria-label="ドラッグして並べ替え"
          {...attributes}
          {...listeners}
        >
          <span aria-hidden="true">⋮⋮</span>
        </button>
        {props.head}
      </div>
      {props.children}
    </div>
  )
}
