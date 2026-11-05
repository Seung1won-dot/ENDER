import { useEffect, useRef, useState } from 'react'
import type { ItemRow } from '../lib/items'
import { previewKindOf } from '../lib/preview'

const REFRESH_MS = 50 * 60 * 1000 // 서명 URL 은 60분. 50분마다 갱신. 발급 실패한 경로도 같은 주기로 재시도

/** 이미지 항목의 썸네일 주소. getUrl 은 서명 주소를 발급하는 함수. */
export function useThumbUrls(
  items: ItemRow[],
  getUrl: (path: string) => Promise<string>,
): Record<string, string | null> {
  const [urls, setUrls] = useState<Record<string, string | null>>({})
  const issuedAt = useRef<Record<string, number>>({})

  useEffect(() => {
    const now = Date.now()
    const need = items.filter(
      (it) =>
        it.kind === 'file' &&
        it.file_path &&
        previewKindOf(it) === 'image' &&
        (!(it.file_path in urls) || now - (issuedAt.current[it.file_path] ?? 0) > REFRESH_MS),
    )
    if (need.length === 0) return

    let cancelled = false
    void Promise.all(
      need.map(async (it) => {
        const path = it.file_path as string
        try {
          return [path, await getUrl(path)] as const
        } catch {
          return [path, null] as const
        }
      }),
    ).then((pairs) => {
      if (cancelled) return
      const t = Date.now()
      setUrls((prev) => {
        const next = { ...prev }
        for (const [p, u] of pairs) {
          next[p] = u
          issuedAt.current[p] = t
        }
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [items, urls, getUrl])

  return urls
}
