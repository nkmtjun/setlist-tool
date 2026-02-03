import type { Setlist, SetlistItem, SetlistItemType } from '../domain/types'
import { newId } from '../utils/id'
import { nowIso } from '../utils/time'
import { db } from './appDb'

export async function getSetlist(id: string): Promise<Setlist | undefined> {
  return db.setlists.get(id)
}

export async function listSetlists(): Promise<Setlist[]> {
  return db.setlists.orderBy('updatedAt').reverse().toArray()
}

export async function createSetlist(): Promise<Setlist> {
  const t = nowIso()
  const setlist: Setlist = {
    id: newId(),
    title: '新規セットリスト',
    items: [],
    createdAt: t,
    updatedAt: t,
  }

  await db.setlists.add(setlist)
  return setlist
}

export async function saveSetlist(setlist: Setlist): Promise<void> {
  await db.setlists.put({ ...setlist, updatedAt: nowIso() })
}

export async function patchSetlist(
  id: string,
  patch: Omit<Partial<Setlist>, 'id' | 'updatedAt' | 'createdAt'>,
): Promise<void> {
  await db.setlists.update(id, { ...patch, updatedAt: nowIso() })
}

export async function deleteSetlist(id: string): Promise<void> {
  await db.setlists.delete(id)
}

export async function duplicateSetlist(source: Setlist): Promise<Setlist> {
  const t = nowIso()

  const newItems: SetlistItem[] = source.items.map((it) => {
    const id = newId()
    if (it.type === 'SONG') return { ...it, id }
    if (it.type === 'NOTE') return { ...it, id }
    return { ...it, id }
  })

  const copy: Setlist = {
    ...source,
    id: newId(),
    title: `${source.title}（コピー）`,
    items: newItems,
    createdAt: t,
    updatedAt: t,
  }

  await db.setlists.add(copy)
  return copy
}

export function createSetlistItem(type: SetlistItemType): SetlistItem {
  const id = newId()
  if (type === 'SONG') return { id, type: 'SONG', title: '', artist: '', memo: '' }
  if (type === 'NOTE') return { id, type: 'NOTE', label: '', text: '' }
  return { id, type: 'ENCORE_START', memo: '' }
}
