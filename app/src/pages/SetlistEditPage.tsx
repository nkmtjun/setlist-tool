import { useLiveQuery } from 'dexie-react-hooks'
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

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
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTargetId, setPickerTargetId] = useState<string | null>(null)
  const initializedRef = useRef(false)
  const saveTimerRef = useRef<number | null>(null)
  const lastSavedKeyRef = useRef<string>('')

  useEffect(() => {
    if (!setlist) return
    setTitle(setlist.title)
    setItems(setlist.items)
    initializedRef.current = true
    lastSavedKeyRef.current = JSON.stringify({ title: setlist.title, items: setlist.items })
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
          <button type="button" onClick={() => navigate(`/share/${setlistId}`)}>
            出力 / 共有
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
        <div className="rowActions">
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, createSetlistItem('SONG')])}
          >
            曲追加
          </button>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, createSetlistItem('NOTE')])}
          >
            NOTE追加
          </button>
          <button
            type="button"
            disabled={hasEncore}
            onClick={() => setItems((prev) => [...prev, createSetlistItem('ENCORE_START')])}
          >
            Encore区切り追加
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
                    head={
                      <>
                        <div className="rowBadge">{it.type}</div>
                        {it.type === 'SONG' ? <div className="rowCode">{codeMap[it.id] ?? ''}</div> : null}
                        <div className="rowIndex">#{idx + 1}</div>
                        <div className="rowHeadSpacer" />
                        <button type="button" disabled={idx === 0} onClick={() => moveIndex(idx, idx - 1)}>
                          上へ
                        </button>
                        <button
                          type="button"
                          disabled={idx === items.length - 1}
                          onClick={() => moveIndex(idx, idx + 1)}
                        >
                          下へ
                        </button>
                        <button
                          type="button"
                          onClick={() => setItems((prev) => prev.filter((x) => x.id !== it.id))}
                        >
                          行削除
                        </button>
                      </>
                    }
                  >
                    {it.type === 'SONG' ? (
                      <div className="rowBody">
                        <div className="rowSubActions">
                          <button
                            type="button"
                            onClick={() => {
                              setPickerTargetId(it.id)
                              setPickerOpen(true)
                            }}
                            disabled={(libraryItems ?? []).length === 0}
                          >
                            ライブラリから選択
                          </button>
                        </div>
                        <div className="grid2">
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
                        </div>
                        <label className="field">
                          <div className="fieldLabel">メモ（改行可）</div>
                          <textarea
                            className="textArea"
                            rows={3}
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
                    ) : null}

                    {it.type === 'NOTE' ? (
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

                    {it.type === 'ENCORE_START' ? (
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
          setPickerOpen(false)
          setPickerTargetId(null)
        }}
      />
    </section>
  )
}

function SortableRow(props: { id: string; head: ReactNode; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: props.id,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="row">
      <div className="rowHead">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="dragHandle"
          aria-label="ドラッグして並べ替え"
          {...attributes}
          {...listeners}
        >
          Move
        </button>
        {props.head}
      </div>
      {props.children}
    </div>
  )
}
