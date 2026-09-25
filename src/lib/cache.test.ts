import { describe, expect, it } from 'vitest'
import type { ItemRow } from './items'
import { CACHE_LIMIT, cacheKey, parseItemsCache, serializeItemsCache } from './cache'

function row(id: string, over: Partial<ItemRow> = {}): ItemRow {
  return {
    id,
    user_id: 'u1',
    kind: 'text',
    title: null,
    content: `메모 ${id}`,
    file_path: null,
    file_name: null,
    file_size: null,
    mime_type: null,
    source: null,
    pinned: false,
    expires_at: null,
    created_at: '2026-09-25T00:00:00.000Z',
    ...over,
  }
}

describe('items cache', () => {
  it('키는 사용자별', () => {
    expect(cacheKey('u1')).toBe('ec.items.u1')
    expect(cacheKey('u2')).not.toBe(cacheKey('u1'))
  })
  it('직렬화 → 파싱 왕복', () => {
    const items = [row('a'), row('b', { kind: 'link', content: 'https://x.y' })]
    expect(parseItemsCache(serializeItemsCache(items))).toEqual(items)
  })
  it('최대 개수까지만 저장', () => {
    const many = Array.from({ length: CACHE_LIMIT + 50 }, (_, i) => row(String(i)))
    expect(parseItemsCache(serializeItemsCache(many)).length).toBe(CACHE_LIMIT)
  })
  it('깨진 값·모양이 다른 값은 빈 배열', () => {
    expect(parseItemsCache(null)).toEqual([])
    expect(parseItemsCache('{not json')).toEqual([])
    expect(parseItemsCache('{"v":1,"items":"x"}')).toEqual([])
    expect(parseItemsCache(JSON.stringify({ v: 999, items: [row('a')] }))).toEqual([])
    expect(parseItemsCache(JSON.stringify({ v: 1, items: [{ id: 'a' }] }))).toEqual([])
  })
})
