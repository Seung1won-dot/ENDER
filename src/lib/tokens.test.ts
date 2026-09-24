import { describe, expect, it } from 'vitest'
import { TOKEN_PREFIX, base64url, generateToken, hex, sha256Hex } from './tokens'

describe('base64url', () => {
  it('RFC 4648 §5, 패딩 없음', () => {
    expect(base64url(new Uint8Array([]))).toBe('')
    expect(base64url(new Uint8Array([0xfb, 0xff]))).toBe('-_8')
    expect(base64url(new Uint8Array([104, 101, 108, 108, 111]))).toBe('aGVsbG8')
  })
})

describe('hex', () => {
  it('소문자 2자리', () => {
    expect(hex(new Uint8Array([0, 1, 255]).buffer)).toBe('0001ff')
  })
})

describe('sha256Hex', () => {
  it('알려진 해시', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})

describe('generateToken', () => {
  it('ec_ 접두 + 32바이트 base64url (43자)', () => {
    const t = generateToken((n) => new Uint8Array(n).fill(7))
    expect(t.startsWith(TOKEN_PREFIX)).toBe(true)
    expect(t.length).toBe(TOKEN_PREFIX.length + 43)
    expect(t).toMatch(/^ec_[A-Za-z0-9_-]+$/)
  })
  it('기본 난수는 매번 다르다', () => {
    expect(generateToken()).not.toBe(generateToken())
  })
})
