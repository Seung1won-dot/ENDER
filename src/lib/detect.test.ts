import { describe, expect, it } from 'vitest'
import { detectKind, isSafeHttpUrl, linkTitle } from './detect'

describe('detectKind', () => {
  it('일반 문장은 text', () => {
    expect(detectKind('오늘 회의 3시')).toBe('text')
  })
  it('http(s) URL 하나만 있으면 link', () => {
    expect(detectKind('https://example.com/a?b=1')).toBe('link')
    expect(detectKind('http://example.com')).toBe('link')
  })
  it('앞뒤 공백·줄바꿈은 무시', () => {
    expect(detectKind('  https://example.com \n')).toBe('link')
  })
  it('URL 뒤에 다른 글자가 있으면 text', () => {
    expect(detectKind('https://example.com 봐줘')).toBe('text')
  })
  it('여러 줄이면 text', () => {
    expect(detectKind('https://a.com\nhttps://b.com')).toBe('text')
  })
  it('http(s) 이외 스킴은 text', () => {
    expect(detectKind('ftp://files.example.com')).toBe('text')
    expect(detectKind('javascript:alert(1)')).toBe('text')
  })
  it('빈 문자열은 text', () => {
    expect(detectKind('')).toBe('text')
  })
})

describe('isSafeHttpUrl', () => {
  it('http/https 만 true', () => {
    expect(isSafeHttpUrl('https://a.com')).toBe(true)
    expect(isSafeHttpUrl('http://a.com')).toBe(true)
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('not a url')).toBe(false)
  })
})

describe('linkTitle', () => {
  it('www 제거 + 경로 첫 세그먼트', () => {
    expect(linkTitle('https://www.youtube.com/watch?v=abc')).toBe('youtube.com/watch')
  })
  it('경로 없으면 호스트만', () => {
    expect(linkTitle('https://github.com/')).toBe('github.com')
  })
  it('파싱 실패하면 원문 앞 60자', () => {
    expect(linkTitle('nope')).toBe('nope')
  })
})
