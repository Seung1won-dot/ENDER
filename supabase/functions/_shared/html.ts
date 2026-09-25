// 링크 미리보기용 HTML 제목 추출. Deno(Edge Function)와 vitest 양쪽에서 쓰므로 런타임 전용 API 는 fetchTitle 에만.

const MAX_TITLE = 200
const MAX_BYTES = 200_000
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code.startsWith('#')) {
      const n = code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m
    }
    return ENTITIES[code.toLowerCase()] ?? m
  })
}

function clean(s: string): string | null {
  const t = decodeEntities(s).replace(/\s+/g, ' ').trim()
  return t ? t.slice(0, MAX_TITLE) : null
}

/** og:title 을 우선, 없으면 <title>. 둘 다 없으면 null. */
export function extractTitle(html: string): string | null {
  const head = html.slice(0, 300_000)
  for (const meta of head.match(/<meta\s+[^>]*>/gi) ?? []) {
    if (!/property\s*=\s*["']og:title["']/i.test(meta)) continue
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(meta)
    const t = content ? clean(content[1] ?? '') : null
    if (t) return t
  }
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)
  return title ? clean(title[1] ?? '') : null
}

/** 공개 웹의 http(s) 주소만. IP 리터럴·localhost 는 내부망 요청을 막기 위해 거부. */
export function isFetchableUrl(s: string): boolean {
  let u: URL
  try {
    u = new URL(s)
  } catch {
    return false
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
  const h = u.hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false
  if (h.includes(':')) return false // IPv6 리터럴
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return false // IPv4 리터럴
  return true
}

/** 페이지 앞부분(최대 200KB)만 받아 제목을 뽑는다. 실패는 전부 null. */
export async function fetchTitle(url: string, timeoutMs = 5000): Promise<string | null> {
  if (!isFetchableUrl(url)) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
        'user-agent': 'Mozilla/5.0 (compatible; EnderChest/1.0; +https://github.com/Seung1won-dot/ENDER)',
      },
    })
    if (!res.ok || !res.body) return null
    if (!/html|xml/i.test(res.headers.get('content-type') ?? '')) return null

    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      total += value.length
    }
    void reader.cancel().catch(() => undefined)

    const buf = new Uint8Array(total)
    let offset = 0
    for (const c of chunks) {
      buf.set(c, offset)
      offset += c.length
    }
    return extractTitle(new TextDecoder('utf-8', { fatal: false }).decode(buf))
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
