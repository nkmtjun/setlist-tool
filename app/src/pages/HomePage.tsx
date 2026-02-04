import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { db } from '../db/appDb'
import { createSetlist, deleteSetlist, duplicateSetlist } from '../db/setlists'
import { getSongCounts } from '../domain/setlistCalc'
import type { Setlist } from '../domain/types'
import { parseSetlistExportV1, readTextFile } from '../io/setlistJson'
import { formatIsoDateTime } from '../utils/format'

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" fill="currentColor" />
    </svg>
  )
}

function IconIn() {
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

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm4 4H8a2 2 0 0 0-2 2v16h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 18H8V7h12v16Z"
        fill="currentColor"
      />
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

export default function HomePage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const setlists = useLiveQuery(
    () => db.setlists.orderBy('updatedAt').reverse().toArray(),
    [],
    [],
  )

  const rows = useMemo(() => {
    return (setlists ?? []).map((s) => {
      const counts = getSongCounts(s.items)
      return { s, counts }
    })
  }, [setlists])

  async function onCreate() {
    const s = await createSetlist()
    navigate(`/setlists/${s.id}`)
  }

  async function onDuplicate(s: Setlist) {
    const copy = await duplicateSetlist(s)
    navigate(`/setlists/${copy.id}`)
  }

  async function onDelete(s: Setlist) {
    const title = s.title || '（無題）'
    const ok = window.confirm(`「${title}」を削除しますか？`)
    if (!ok) return
    await deleteSetlist(s.id)
  }

  async function onImportJsonFile(file: File) {
    const text = await readTextFile(file)
    const exported = parseSetlistExportV1(text)
    await db.setlists.add(exported.setlist)
    navigate(`/setlists/${exported.setlist.id}`)
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <h1>セットリスト一覧</h1>
        <div className="pageActions">
          <button type="button" className="iconButton" title="新規作成" aria-label="新規作成" onClick={onCreate}>
            <IconPlus />
          </button>
          <button
            type="button"
            className="iconButton"
            title="JSONインポート"
            aria-label="JSONインポート"
            onClick={() => fileInputRef.current?.click()}
          >
            <IconIn />
          </button>
          <input
            ref={fileInputRef}
            className="srOnly"
            type="file"
            accept="application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              e.target.value = ''
              try {
                await onImportJsonFile(file)
              } catch (err) {
                const message = err instanceof Error ? err.message : 'JSONの読み込みに失敗しました'
                window.alert(message)
              }
            }}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="muted">まだセットリストがありません。</p>
      ) : (
        <div className="cardList">
          {rows.map(({ s, counts }) => (
            <article key={s.id} className="card">
              <div className="cardTitle">{s.title || '（無題）'}</div>
              <div className="cardMeta">
                曲数: 本編 {counts.main} / アンコール {counts.encore} / 合計 {counts.total}
              </div>
              <div className="cardMeta">更新: {formatIsoDateTime(s.updatedAt)}</div>
              <div className="cardActions">
                <button
                  type="button"
                  className="iconButton"
                  title="編集"
                  aria-label="編集"
                  onClick={() => navigate(`/setlists/${s.id}`)}
                >
                  <IconEdit />
                </button>
                <button
                  type="button"
                  className="iconButton"
                  title="出力 / 共有"
                  aria-label="出力 / 共有"
                  onClick={() => navigate(`/share/${s.id}`)}
                >
                  <IconShare />
                </button>
                <button type="button" className="iconButton" title="複製" aria-label="複製" onClick={() => onDuplicate(s)}>
                  <IconCopy />
                </button>
                <button
                  type="button"
                  className="iconButton iconButton--danger"
                  title="削除"
                  aria-label="削除"
                  onClick={() => onDelete(s)}
                >
                  <IconTrash />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
