import { useNavigate, useParams } from 'react-router-dom'

import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef } from 'react'

import { db } from '../db/appDb'
import { getSongCodeMap } from '../domain/setlistCalc'
import type { SetlistItem } from '../domain/types'
import { downloadJsonFile, parseSetlistExportV1, readTextFile, safeFileName, toSetlistExportV1 } from '../io/setlistJson'
import ShareImageLayout from '../components/ShareImageLayout'
import { toPng } from 'html-to-image'

export default function SharePage() {
  const navigate = useNavigate()
  const { setlistId } = useParams()
  const importInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  const setlist = useLiveQuery(
    async () => {
      if (!setlistId) return undefined
      return await db.setlists.get(setlistId)
    },
    [setlistId],
    null,
  )

  const text = useMemo(() => {
    if (!setlist) return ''
    const codeMap = getSongCodeMap(setlist.items)
    return toCopyText(setlist.title, setlist.items, codeMap)
  }, [setlist])

  if (!setlistId) {
    return (
      <section className="page">
        <h1>出力 / 共有</h1>
        <p className="muted">IDが不正です。</p>
      </section>
    )
  }

  if (setlist === null) {
    return (
      <section className="page">
        <h1>出力 / 共有</h1>
        <p className="muted">読み込み中…</p>
      </section>
    )
  }

  if (!setlist) {
    return (
      <section className="page">
        <h1>出力 / 共有</h1>
        <p className="muted">見つかりませんでした。</p>
      </section>
    )
  }

  return (
    <section className="page">
      <h1>出力 / 共有</h1>

      <div className="panel">
        <div className="pageHeader">
          <h2 className="sectionTitle">コピー用テキスト</h2>
          <div className="pageActions">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text)
                  window.alert('コピーしました')
                } catch {
                  window.alert('コピーに失敗しました（ブラウザ権限をご確認ください）')
                }
              }}
            >
              コピー
            </button>
          </div>
        </div>
        <pre className="outputBox">{text}</pre>
      </div>

      <div className="panel">
        <div className="pageHeader">
          <h2 className="sectionTitle">セットリストJSON</h2>
          <div className="pageActions">
            <button
              type="button"
              onClick={() => {
                const exported = toSetlistExportV1(setlist)
                const name = safeFileName(setlist.title)
                downloadJsonFile(`${name || 'setlist'}.json`, exported)
              }}
            >
              エクスポート
            </button>
            <button type="button" onClick={() => importInputRef.current?.click()}>
              インポート
            </button>
            <input
              ref={importInputRef}
              className="srOnly"
              type="file"
              accept="application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                e.target.value = ''
                try {
                  const text = await readTextFile(file)
                  const exported = parseSetlistExportV1(text)
                  await db.setlists.add(exported.setlist)
                  window.alert('インポートしました')
                  navigate(`/setlists/${exported.setlist.id}`)
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'JSONの読み込みに失敗しました'
                  window.alert(message)
                }
              }}
            />
          </div>
        </div>
        <p className="muted">インポートは既存を上書きせず、新規セットリストとして保存します。</p>
      </div>

      <div className="panel">
        <div className="pageHeader">
          <h2 className="sectionTitle">PNG出力</h2>
          <div className="pageActions">
            <button
              type="button"
              onClick={async () => {
                try {
                  const el = imageRef.current
                  if (!el) return
                  const dataUrl = await toPng(el, {
                    backgroundColor: '#ffffff',
                    pixelRatio: 2,
                    cacheBust: true,
                  })
                  const name = safeFileName(setlist.title)
                  downloadDataUrl(`${name || 'setlist'}.png`, dataUrl)
                } catch {
                  window.alert('PNGの生成に失敗しました')
                }
              }}
            >
              PNG出力
            </button>
          </div>
        </div>
        <div className="sharePreview" ref={imageRef}>
          <ShareImageLayout setlist={setlist} />
        </div>
      </div>
    </section>
  )
}

function downloadDataUrl(filename: string, dataUrl: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

function toCopyText(title: string, items: SetlistItem[], codeMap: Record<string, string>): string {
  const lines: string[] = []
  lines.push(title || '（無題）')

  for (const it of items) {
    if (it.type === 'SONG') {
      const code = codeMap[it.id] ?? ''
      const t = (it.title ?? '').trim()
      const a = (it.artist ?? '').trim()
      const head = [code, formatSongTitleArtist(t, a)].filter(Boolean).join(' ')
      lines.push(`- ${head}`.trimEnd())

      const memo = (it.memo ?? '').replace(/\r\n/g, '\n').trimEnd()
      if (memo) {
        for (const m of memo.split('\n')) {
          if (!m) continue
          lines.push(`  - ${m}`)
        }
      }
      continue
    }

    if (it.type === 'NOTE') {
      const label = (it.label ?? '').trim() || 'NOTE'
      const text = (it.text ?? '').replace(/\r\n/g, '\n').trimEnd()
      if (!text) {
        lines.push(`- [${label}]`)
        continue
      }
      const [first, ...rest] = text.split('\n')
      lines.push(`- [${label}] ${first}`.trimEnd())
      for (const r of rest) {
        if (!r) continue
        lines.push(`  ${r}`)
      }
      continue
    }

    if (it.type === 'ENCORE_START') {
      lines.push('- Encore')
      const memo = (it.memo ?? '').replace(/\r\n/g, '\n').trimEnd()
      if (memo) {
        for (const m of memo.split('\n')) {
          if (!m) continue
          lines.push(`  - ${m}`)
        }
      }
    }
  }

  return lines.join('\n')
}

function formatSongTitleArtist(title: string, artist: string): string {
  if (title && artist) return `${title} - ${artist}`
  if (title) return title
  if (artist) return artist
  return ''
}
