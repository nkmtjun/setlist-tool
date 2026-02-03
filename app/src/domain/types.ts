export type SetlistItemType = 'SONG' | 'NOTE' | 'ENCORE_START'

export type SetlistItem =
  | {
      id: string
      type: 'SONG'
      title?: string
      artist?: string
      memo?: string
    }
  | {
      id: string
      type: 'NOTE'
      label: string
      text?: string
    }
  | {
      id: string
      type: 'ENCORE_START'
      memo?: string
    }

export type Setlist = {
  id: string
  title: string
  items: SetlistItem[]
  createdAt: string
  updatedAt: string
}

export type SongLibraryItem = {
  id: string
  title: string
  artist: string
  comment: string
  url: string
  createdAt: string
  updatedAt: string
}

export type SetlistExportV1 = {
  schemaVersion: 'setlist-assist.v1'
  exportedAt: string
  setlist: Setlist
}
