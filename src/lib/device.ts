export const DEVICE_KEY = 'ec.device'

export function defaultDeviceName(ua: string): string {
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Linux|X11/.test(ua)) return 'Linux'
  return '기기'
}

function browserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function getDeviceName(
  storage: Pick<Storage, 'getItem'> | null = browserStorage(),
  ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
): string {
  const saved = storage?.getItem(DEVICE_KEY)
  return saved && saved.trim() ? saved : defaultDeviceName(ua)
}

export function setDeviceName(
  name: string,
  storage: Pick<Storage, 'setItem' | 'removeItem'> | null = browserStorage(),
): void {
  if (!storage) return
  const t = name.trim()
  if (t) storage.setItem(DEVICE_KEY, t)
  else storage.removeItem(DEVICE_KEY)
}
