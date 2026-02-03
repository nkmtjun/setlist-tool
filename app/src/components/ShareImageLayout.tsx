import type { Setlist, SetlistItem } from '../domain/types'
import { getSongCodeMap } from '../domain/setlistCalc'

export default function ShareImageLayout(props: { setlist: Setlist }) {
  const codeMap = getSongCodeMap(props.setlist.items)

  return (
    <div className="shareImageRoot">
      <div className="shareImageTitle">{props.setlist.title || '（無題）'}</div>
      <div className="shareImageList">
        {props.setlist.items.map((it) => (
          <ShareImageRow key={it.id} it={it} code={it.type === 'SONG' ? codeMap[it.id] ?? '' : ''} />
        ))}
      </div>
    </div>
  )
}

function ShareImageRow(props: { it: SetlistItem; code: string }) {
  const it = props.it

  if (it.type === 'ENCORE_START') {
    return (
      <div className="shareImageEncore">
        <div className="shareImageEncoreLabel">Encore</div>
        {it.memo ? <div className="shareImageSubText">{it.memo}</div> : null}
      </div>
    )
  }

  if (it.type === 'NOTE') {
    const label = it.label?.trim() || 'NOTE'
    return (
      <div className="shareImageRow note">
        <div className="shareImageRowMain">
          <span className="shareImageBadge">[{label}]</span>
        </div>
        {it.text ? <div className="shareImageSubText">{it.text}</div> : null}
      </div>
    )
  }

  const title = (it.title ?? '').trim()
  const artist = (it.artist ?? '').trim()
  return (
    <div className="shareImageRow song">
      <div className="shareImageRowMain">
        <span className="shareImageCode">{props.code}</span>
        <span className="shareImageSongTitle">{title || '（曲名未入力）'}</span>
        {artist ? <span className="shareImageSongArtist">- {artist}</span> : null}
      </div>
      {it.memo ? <div className="shareImageSubText">{it.memo}</div> : null}
    </div>
  )
}
