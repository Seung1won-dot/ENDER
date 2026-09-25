export const MAX_FILE_BYTES = 50 * 1024 * 1024

const BLOCKED_EXT = new Set(['exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'vbs', 'jar', 'apk', 'dmg', 'pkg'])

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/heic': 'heic',
}

export function fileExt(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const i = base.lastIndexOf('.')
  if (i <= 0) return ''
  return base.slice(i + 1).toLowerCase()
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

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = bytes / 1024
  let u = 0
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024
    u++
  }
  return `${v.toFixed(1)} ${units[u]}`
}

export function isImageMime(mime: string | null | undefined): boolean {
  return typeof mime === 'string' && mime.startsWith('image/')
}

export function validateFile(file: { name: string; size: number }): string | null {
  if (isBlockedFile(file.name)) return `실행 파일은 넣을 수 없어요: ${file.name}`
  if (file.size <= 0) return `파일이 비어 있어요: ${file.name}`
  if (file.size > MAX_FILE_BYTES) return `50MB 를 넘는 파일이에요: ${file.name} (${formatSize(file.size)})`
  return null
}

/** 클립보드는 PNG 만 확실히 받으므로 다른 이미지 형식은 canvas 로 변환한다 (브라우저 전용). */
export async function toPngBlob(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') return blob
  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('이미지를 변환할 수 없어요')
    ctx.drawImage(bitmap, 0, 0)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지를 변환할 수 없어요'))), 'image/png'),
    )
  } finally {
    bitmap.close()
  }
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function clipboardFileName(original: string, mime: string, now: Date): string {
  const generic = original === '' || /^image\.[a-z0-9]+$/i.test(original)
  if (!generic) return original
  const ext = fileExt(original) || MIME_EXT[mime] || 'bin'
  const stamp =
    `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}` +
    `-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`
  return `pasted-${stamp}.${ext}`
}
