import type { SongLibraryItem } from '../domain/types'
import { newId } from '../utils/id'
import { nowIso } from '../utils/time'
import { db } from './appDb'

export async function listSongLibraryItems(): Promise<SongLibraryItem[]> {
  return db.songLibrary.orderBy('updatedAt').reverse().toArray()
}

export async function getSongLibraryItem(id: string): Promise<SongLibraryItem | undefined> {
  return db.songLibrary.get(id)
}

export async function addSongLibraryItem(input: {
  title: string
  artist?: string
  comment?: string
  url?: string
}): Promise<SongLibraryItem> {
  const t = nowIso()
  const item: SongLibraryItem = {
    id: newId(),
    title: input.title,
    artist: input.artist ?? '',
    comment: input.comment ?? '',
    url: input.url ?? '',
    createdAt: t,
    updatedAt: t,
  }

  await db.songLibrary.add(item)
  return item
}

export async function bulkAddSongLibraryItems(items: SongLibraryItem[]): Promise<void> {
  await db.songLibrary.bulkAdd(items)
}

export async function updateSongLibraryItem(
  id: string,
  input: {
    title: string
    artist?: string
    comment?: string
    url?: string
  },
): Promise<void> {
  const t = nowIso()
  await db.songLibrary.update(id, {
    title: input.title,
    artist: input.artist ?? '',
    comment: input.comment ?? '',
    url: input.url ?? '',
    updatedAt: t,
  })
}

export async function deleteSongLibraryItem(id: string): Promise<void> {
  await db.songLibrary.delete(id)
}

export async function bulkDeleteSongLibraryItems(ids: string[]): Promise<void> {
  await db.songLibrary.bulkDelete(ids)
}
