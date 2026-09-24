// src/lib/detect.ts, files.ts, expiry.ts 의 규칙을 Deno 용으로 복제. 바꾸면 양쪽 모두 수정.

export const MAX_FILE_BYTES = 50 * 1024 * 1024
const BLOCKED_EXT = new Set(['exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'vbs', 'jar', 'apk', 'dmg', 'pkg'])
const SINGLE_URL = /^https?:\/\/\S+$/i
const HOUR = 3600_000
const DAY = 24 * HOUR
const PRESET_MS: Record<string, number> = { '1h': HOUR, '1d': DAY, '7d': 7 * DAY }

export function isSafeHttpUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function detectKind(text: string): 'text' | 'link' {
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

export function fileExt(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const i = base.lastIndexOf('.')
  return i <= 0 ? '' : base.slice(i + 1).toLowerCase()
}

export function isBlockedFile(name: string): boolean {
  return BLOCKED_EXT.has(fileExt(name))
}

export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
  const trimmed = cleaned.slice(0, 100)
  return /[A-Za-z0-9]/.test(trimmed) ? trimmed : 'file'
}

export function computeExpiresAt(preset: string | null | undefined, now = new Date()): string | null {
  if (!preset || preset === 'never') return null
  const ms = PRESET_MS[preset]
  if (ms === undefined) return new Date(now.getTime() + PRESET_MS['7d']).toISOString()
  return new Date(now.getTime() + ms).toISOString()
}

export function buildTextPayload(text: string): { kind: 'text' | 'link'; title: string; content: string } {
  const trimmed = text.trim()
  const kind = detectKind(trimmed)
  const title = kind === 'link' ? linkTitle(trimmed) : (trimmed.split(/\r?\n/)[0] ?? '').slice(0, 80)
  return { kind, title, content: trimmed }
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
