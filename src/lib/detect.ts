export type TextKind = 'text' | 'link'

const SINGLE_URL = /^https?:\/\/\S+$/i

export function isSafeHttpUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function detectKind(text: string): TextKind {
  const t = text.trim()
  if (!t || !SINGLE_URL.test(t)) return 'text'
  return isSafeHttpUrl(t) ? 'link' : 'text'
}

export function linkTitle(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    const seg = u.pathname.split('/').filter(Boolean)[0]
    return seg ? `${host}/${seg}` : host
  } catch {
    return url.slice(0, 60)
  }
}
