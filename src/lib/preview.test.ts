import { describe, expect, it } from 'vitest'
import { countBySource, dayLabel, domainOf, extBadge, groupByDay, itemTitle, previewKindOf, textExcerpt, totalFileBytes } from './preview'
import { buildPatch } from './items'

const file = (file_name: string, mime_type: string | null, file_size = 1000) =>
  ({ kind: 'file' as const, file_name, mime_type, file_size })

describe('previewKindOf', () => {
  it('종류별 미리보기 방식', () => {
    expect(previewKindOf({ kind: 'text', mime_type: null, file_name: null, file_size: null })).toBe('text')
    expect(previewKindOf({ kind: 'link', mime_type: null, file_name: null, file_size: null })).toBe('link')
    expect(previewKindOf(file('a.png', 'image/png'))).toBe('image')
    expect(previewKindOf(file('a.heic', 'image/heic'))).toBe('none')
    expect(previewKindOf(file('a.mov', 'application/octet-stream'))).toBe('video')
    expect(previewKindOf(file('a.m4a', ''))).toBe('audio')
    expect(previewKindOf(file('보고서.pdf', 'application/pdf'))).toBe('pdf')
    expect(previewKindOf(file('train.py', 'text/x-python'))).toBe('code')
    expect(previewKindOf(file('big.log', 'text/plain', 2 * 1024 * 1024))).toBe('none')
    expect(previewKindOf(file('a.zip', 'application/zip'))).toBe('none')
  })
})

describe('표시 도우미', () => {
  it('extBadge', () => {
    expect(extBadge('report.final.docx')).toBe('DOCX')
    expect(extBadge('archive.tar.gz')).toBe('GZ')
    expect(extBadge('README')).toBe('FILE')
  })
  it('domainOf', () => {
    expect(domainOf('https://www.github.com/x')).toBe('github.com')
    expect(domainOf('not a url')).toBeNull()
  })
  it('itemTitle·textExcerpt', () => {
    expect(itemTitle({ kind: 'text', title: null, content: '\n\n  첫 줄\n둘째', file_name: null })).toBe('첫 줄')
    expect(itemTitle({ kind: 'text', title: null, content: '   ', file_name: null })).toBe('빈 메모')
    expect(textExcerpt('제목\n a \n\n b ')).toBe('a  b')
  })
})

describe('묶기·합계', () => {
  const now = new Date(2026, 10, 5, 15, 0)
  it('dayLabel', () => {
    expect(dayLabel(new Date(2026, 10, 5, 1), now)).toBe('오늘')
    expect(dayLabel(new Date(2026, 10, 4, 23), now)).toBe('어제')
    expect(dayLabel(new Date(2026, 10, 2, 9), now)).toBe('11월 2일 월요일')
    expect(dayLabel(new Date(2025, 10, 2, 9), now)).toBe('2025년 11월 2일')
  })
  it('groupByDay 는 순서를 지키며 날짜별로 나눈다', () => {
    const rows = [
      { id: 'a', created_at: new Date(2026, 10, 5, 12).toISOString() },
      { id: 'b', created_at: new Date(2026, 10, 5, 9).toISOString() },
      { id: 'c', created_at: new Date(2026, 10, 3, 9).toISOString() },
    ]
    const g = groupByDay(rows, now)
    expect(g.map((x) => [x.label, x.items.map((i) => i.id)])).toEqual([
      ['오늘', ['a', 'b']],
      ['11월 3일 화요일', ['c']],
    ])
  })
  it('countBySource·totalFileBytes', () => {
    expect(countBySource([{ source: 'Mac' }, { source: 'iPhone' }, { source: 'Mac' }, { source: null }])).toEqual([
      { source: 'Mac', count: 2 },
      { source: 'iPhone', count: 1 },
      { source: '알 수 없음', count: 1 },
    ])
    expect(totalFileBytes([{ kind: 'file', file_size: 10 }, { kind: 'text', file_size: null }, { kind: 'file', file_size: 5 }])).toBe(15)
  })
})

describe('buildPatch', () => {
  it('글을 고치면 종류·제목을 다시 계산한다', () => {
    expect(buildPatch({ text: ' https://example.com ' })).toEqual({
      kind: 'link',
      title: 'example.com',
      content: 'https://example.com',
    })
    expect(buildPatch({ pinned: true, expires_at: null })).toEqual({ pinned: true, expires_at: null })
  })
})
