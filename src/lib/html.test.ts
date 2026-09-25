import { describe, expect, it } from 'vitest'
import { extractTitle, isFetchableUrl } from '../../supabase/functions/_shared/html'

describe('extractTitle', () => {
  it('og:title 을 title 보다 우선', () => {
    expect(
      extractTitle('<html><head><title>사이트</title><meta property="og:title" content="글 제목"></head></html>'),
    ).toBe('글 제목')
  })
  it('title 태그의 공백·엔티티 정리', () => {
    expect(extractTitle('<title>\n  My Page &amp; More &#39;x&#39; \n</title>')).toBe("My Page & More 'x'")
  })
  it('meta 속성 순서가 바뀌어도 읽는다', () => {
    expect(extractTitle('<meta content="X" property="og:title">')).toBe('X')
  })
  it('없거나 비어 있으면 null', () => {
    expect(extractTitle('<p>hi</p>')).toBeNull()
    expect(extractTitle('<title>   </title>')).toBeNull()
  })
  it('200자로 자른다', () => {
    expect(extractTitle(`<title>${'a'.repeat(300)}</title>`)?.length).toBe(200)
  })
})

describe('isFetchableUrl', () => {
  it('공개 http(s) 호스트만', () => {
    expect(isFetchableUrl('https://example.com/a')).toBe(true)
    expect(isFetchableUrl('http://example.com')).toBe(true)
  })
  it('IP·localhost·다른 스킴은 거부', () => {
    expect(isFetchableUrl('http://127.0.0.1/')).toBe(false)
    expect(isFetchableUrl('http://10.0.0.5/')).toBe(false)
    expect(isFetchableUrl('http://localhost:5173')).toBe(false)
    expect(isFetchableUrl('http://[::1]/')).toBe(false)
    expect(isFetchableUrl('ftp://example.com')).toBe(false)
    expect(isFetchableUrl('not a url')).toBe(false)
  })
})
