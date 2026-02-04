import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { db } from '../db/appDb'
import { createSetlist, deleteSetlist, duplicateSetlist } from '../db/setlists'
import { getSongCounts } from '../domain/setlistCalc'
import type { Setlist } from '../domain/types'
import { parseSetlistExportV1, readTextFile } from '../io/setlistJson'
import { formatIsoDateTime } from '../utils/format'

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
          <button type="button" onClick={onCreate}>
            新規作成
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            JSONインポート
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
                <button type="button" onClick={() => navigate(`/setlists/${s.id}`)}>
                  編集
                </button>
                <button type="button" onClick={() => navigate(`/share/${s.id}`)}>
                  出力
                </button>
                <button type="button" onClick={() => onDuplicate(s)}>
                  複製
                </button>
                <button type="button" className="dangerButton" onClick={() => onDelete(s)}>
                  削除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
