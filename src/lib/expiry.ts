export type ExpiryPreset = '1h' | '1d' | '7d' | 'never'

export const EXPIRY_PRESETS: ReadonlyArray<{ value: ExpiryPreset; label: string }> = [
  { value: '1h', label: '1시간' },
  { value: '1d', label: '1일' },
  { value: '7d', label: '7일' },
  { value: 'never', label: '영구' },
]

export const DEFAULT_EXPIRY: ExpiryPreset = '7d'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const PRESET_MS: Record<Exclude<ExpiryPreset, 'never'>, number> = {
  '1h': HOUR,
  '1d': DAY,
  '7d': 7 * DAY,
}

export function isExpiryPreset(v: unknown): v is ExpiryPreset {
  return v === '1h' || v === '1d' || v === '7d' || v === 'never'
}

export function computeExpiresAt(preset: ExpiryPreset, now: Date = new Date()): string | null {
  if (preset === 'never') return null
  return new Date(now.getTime() + PRESET_MS[preset]).toISOString()
}

export function describeRemaining(expiresAt: string | null, now: Date = new Date()): string | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - now.getTime()
  if (diff <= 0) return '만료됨'
  if (diff >= DAY) return `${Math.floor(diff / DAY)}일 남음`
  if (diff >= HOUR) return `${Math.floor(diff / HOUR)}시간 남음`
  const min = Math.floor(diff / 60000)
  return min >= 1 ? `${min}분 남음` : '곧 만료'
}
