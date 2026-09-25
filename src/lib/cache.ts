import type { ItemRow } from './items'

// 마지막으로 본 목록을 기기에 남겨 두어, 오프라인이거나 조회에 실패해도 빈 화면 대신 보여 준다.
export const CACHE_LIMIT = 200
const VERSION = 1
const PREFIX = 'ec.items.'

export function cacheKey(userId: string): string {
  return `${PREFIX}${userId}`
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

function isItemRow(x: unknown): x is ItemRow {
  return (
    isRecord(x) &&
    typeof x.id === 'string' &&
    typeof x.kind === 'string' &&
    typeof x.created_at === 'string' &&
    typeof x.pinned === 'boolean' &&
    'expires_at' in x
  )
}

export function serializeItemsCache(items: ItemRow[]): string {
  return JSON.stringify({ v: VERSION, items: items.slice(0, CACHE_LIMIT) })
}

export function parseItemsCache(json: string | null): ItemRow[] {
  if (!json) return []
  try {
    const parsed: unknown = JSON.parse(json)
    if (!isRecord(parsed) || parsed.v !== VERSION || !Array.isArray(parsed.items)) return []
    return parsed.items.every(isItemRow) ? parsed.items : []
  } catch {
    return []
  }
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readItemsCache(userId: string): ItemRow[] {
  return parseItemsCache(storage()?.getItem(cacheKey(userId)) ?? null)
}

export function writeItemsCache(userId: string, items: ItemRow[]): void {
  try {
    storage()?.setItem(cacheKey(userId), serializeItemsCache(items))
  } catch {
    /* 용량 초과 등은 무시. 캐시는 편의 기능이다 */
  }
}

/** 로그아웃 때 호출. 이 기기에 남은 목록 사본을 전부 지운다. */
export function clearItemsCache(): void {
  const s = storage()
  if (!s) return
  const keys: string[] = []
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i)
    if (k && k.startsWith(PREFIX)) keys.push(k)
  }
  keys.forEach((k) => s.removeItem(k))
}
