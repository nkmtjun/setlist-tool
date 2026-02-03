import Dexie, { type Table } from 'dexie'
import type { Setlist, SongLibraryItem } from '../domain/types'

export class AppDb extends Dexie {
  songLibrary!: Table<SongLibraryItem, string>
  setlists!: Table<Setlist, string>

  constructor() {
    super('setlist-assist')

    this.version(1).stores({
      // 検索は少数運用想定のため、部分一致は基本的にアプリ側でフィルタする
      songLibrary: 'id, title, artist, updatedAt',
      setlists: 'id, updatedAt',
    })
  }
}

export const db = new AppDb()
