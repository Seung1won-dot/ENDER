import { describe, expect, it } from 'vitest'
import type { ItemRow } from './items'
import { buildFilePath, buildTextPayload, buildTextUpdate } from './items'
import { countByKind, filterByKind, filterItems, isExpired, mergeItem, sortItems, withoutItem } from './itemsState'

function row(over: Partial<ItemRow> & { id: string }): ItemRow {
  return {
    user_id: 'u1',
    kind: 'text',
    title: null,
    content: null,
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

const now = new Date('2026-09-25T12:00:00.000Z')

describe('buildTextPayload', () => {
  it('URL 은 link + 호스트 제목', () => {
    const p = buildTextPayload({ text: ' https://www.youtube.com/watch?v=x ', source: 'Mac', expiresAt: null })
    expect(p).toEqual({
      kind: 'link',
      title: 'youtube.com/watch',
      content: 'https://www.youtube.com/watch?v=x',
      source: 'Mac',
      expires_at: null,
    })
  })
  it('텍스트는 첫 줄 80자를 제목으로', () => {
    const long = 'a'.repeat(100)
    const p = buildTextPayload({ text: `${long}\n둘째 줄`, source: 'PC', expiresAt: '2026-10-02T00:00:00.000Z' })
    expect(p.kind).toBe('text')
    expect(p.title).toBe('a'.repeat(80))
    expect(p.content).toBe(`${long}\n둘째 줄`)
    expect(p.expires_at).toBe('2026-10-02T00:00:00.000Z')
  })
  it('내용이 공백만이면 예외', () => {
    expect(() => buildTextPayload({ text: '   ', source: 'PC', expiresAt: null })).toThrow()
  })
})

describe('buildTextUpdate', () => {
  it('내용을 바꾸면 제목도 다시 만든다', () => {
    expect(buildTextUpdate('수정된 첫 줄\n둘째 줄')).toEqual({ kind: 'text', title: '수정된 첫 줄', content: '수정된 첫 줄\n둘째 줄' })
  })
  it('URL 하나로 바꾸면 링크로 재분류', () => {
    expect(buildTextUpdate(' https://github.com/a/b ')).toEqual({
      kind: 'link',
      title: 'github.com/a',
      content: 'https://github.com/a/b',
    })
  })
  it('빈 내용은 예외', () => {
    expect(() => buildTextUpdate(' \n ')).toThrow()
  })
})

describe('buildFilePath', () => {
  it('uid/uuid-정규화이름', () => {
    expect(buildFilePath('u1', '회의 (최종).pdf', 'abc-123')).toBe('u1/abc-123-_.pdf')
  })
})

describe('isExpired', () => {
  it('null 은 만료 아님, 과거는 만료', () => {
    expect(isExpired({ expires_at: null }, now)).toBe(false)
    expect(isExpired({ expires_at: '2026-09-25T11:59:59.000Z' }, now)).toBe(true)
    expect(isExpired({ expires_at: '2026-09-25T12:00:01.000Z' }, now)).toBe(false)
  })
})

describe('sortItems', () => {
  it('고정 먼저, 그 다음 최신순', () => {
    const a = row({ id: 'a', created_at: '2026-09-25T01:00:00Z' })
    const b = row({ id: 'b', created_at: '2026-09-25T03:00:00Z' })
    const c = row({ id: 'c', created_at: '2026-09-25T02:00:00Z', pinned: true })
    expect(sortItems([a, b, c]).map((x) => x.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('mergeItem', () => {
  const a = row({ id: 'a', created_at: '2026-09-25T01:00:00Z' })
  const b = row({ id: 'b', created_at: '2026-09-25T02:00:00Z' })
  it('새 id 는 삽입 후 정렬', () => {
    const c = row({ id: 'c', created_at: '2026-09-25T03:00:00Z' })
    expect(mergeItem([b, a], c, now).map((x) => x.id)).toEqual(['c', 'b', 'a'])
  })
  it('같은 id 는 교체', () => {
    const b2 = { ...b, pinned: true }
    const out = mergeItem([b, a], b2, now)
    expect(out.length).toBe(2)
    expect(out[0]).toEqual(b2)
  })
  it('만료된 행은 제거', () => {
    const bExpired = { ...b, expires_at: '2026-09-25T00:00:00Z' }
    expect(mergeItem([b, a], bExpired, now).map((x) => x.id)).toEqual(['a'])
  })
})

describe('withoutItem', () => {
  it('id 제거', () => {
    expect(withoutItem([row({ id: 'a' }), row({ id: 'b' })], 'a').map((x) => x.id)).toEqual(['b'])
  })
})

describe('filterItems', () => {
  const items = [
    row({ id: '1', title: '회의록', content: '9월 정기 회의' }),
    row({ id: '2', kind: 'link', title: 'github.com/foo', content: 'https://github.com/foo' }),
    row({ id: '3', kind: 'file', file_name: 'Report_FINAL.pdf' }),
  ]
  it('빈 쿼리는 원본', () => {
    expect(filterItems(items, '  ')).toBe(items)
  })
  it('제목·본문·파일명 부분 일치, 대소문자 무시', () => {
    expect(filterItems(items, '정기').map((x) => x.id)).toEqual(['1'])
    expect(filterItems(items, 'GITHUB').map((x) => x.id)).toEqual(['2'])
    expect(filterItems(items, 'final').map((x) => x.id)).toEqual(['3'])
  })
})

describe('filterByKind', () => {
  const items = [
    row({ id: 't', kind: 'text', content: '메모' }),
    row({ id: 'l', kind: 'link', content: 'https://example.com' }),
    row({ id: 'i', kind: 'file', file_name: 'shot.png', mime_type: 'image/png' }),
    row({ id: 'f', kind: 'file', file_name: 'paper.pdf', mime_type: 'application/pdf' }),
    row({ id: 'n', kind: 'file', file_name: 'blob', mime_type: null }),
  ]
  it('all 은 원본 그대로', () => {
    expect(filterByKind(items, 'all')).toBe(items)
  })
  it('text·link 는 kind 로', () => {
    expect(filterByKind(items, 'text').map((x) => x.id)).toEqual(['t'])
    expect(filterByKind(items, 'link').map((x) => x.id)).toEqual(['l'])
  })
  it('image 는 image/* 파일만, file 은 그 외 파일(mime 없음 포함)', () => {
    expect(filterByKind(items, 'image').map((x) => x.id)).toEqual(['i'])
    expect(filterByKind(items, 'file').map((x) => x.id)).toEqual(['f', 'n'])
  })
  it('countByKind 는 종류별 개수와 전체', () => {
    expect(countByKind(items)).toEqual({ all: 5, text: 1, link: 1, image: 1, file: 2 })
    expect(countByKind([])).toEqual({ all: 0, text: 0, link: 0, image: 0, file: 0 })
  })
})
