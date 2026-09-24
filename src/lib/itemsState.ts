import type { ItemRow } from './items'

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
