import type { ItemRow } from './items'
import { isImageMime } from './files'

export function isExpired(item: Pick<ItemRow, 'expires_at'>, now: Date = new Date()): boolean {
  return item.expires_at !== null && new Date(item.expires_at).getTime() <= now.getTime()
}

export function sortItems(items: ItemRow[]): ItemRow[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.created_at.localeCompare(a.created_at)
  })
}

export function mergeItem(items: ItemRow[], row: ItemRow, now: Date = new Date()): ItemRow[] {
  const rest = items.filter((x) => x.id !== row.id)
  if (isExpired(row, now)) return rest
  return sortItems([...rest, row])
}

export function withoutItem(items: ItemRow[], id: string): ItemRow[] {
  return items.filter((x) => x.id !== id)
}

export function filterItems(items: ItemRow[], query: string): ItemRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((x) =>
    [x.title, x.content, x.file_name].some((f) => typeof f === 'string' && f.toLowerCase().includes(q)),
  )
}

export type KindFilter = 'all' | 'text' | 'link' | 'image' | 'file'

export const KIND_FILTERS: ReadonlyArray<{ value: KindFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'text', label: '텍스트' },
  { value: 'link', label: '링크' },
  { value: 'image', label: '이미지' },
  { value: 'file', label: '파일' },
]

/** 항목이 속하는 필터 종류. 파일은 mime 으로 이미지/파일을 가른다. */
export function kindOf(item: Pick<ItemRow, 'kind' | 'mime_type'>): Exclude<KindFilter, 'all'> {
  if (item.kind === 'file') return isImageMime(item.mime_type) ? 'image' : 'file'
  return item.kind
}

export function filterByKind(items: ItemRow[], filter: KindFilter): ItemRow[] {
  if (filter === 'all') return items
  return items.filter((x) => kindOf(x) === filter)
}

export function countByKind(items: ReadonlyArray<Pick<ItemRow, 'kind' | 'mime_type'>>): Record<KindFilter, number> {
  const counts: Record<KindFilter, number> = { all: items.length, text: 0, link: 0, image: 0, file: 0 }
  for (const it of items) counts[kindOf(it)] += 1
  return counts
}
