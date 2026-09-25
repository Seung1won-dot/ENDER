import { useEffect, useRef } from 'react'
import type { ItemRow } from '../lib/items'

const APP_TITLE = 'Ender Chest'

/**
 * 서버에서 처음 받은 목록은 그냥 두고, 그 뒤에 나타난 항목 id 를 기억한다 ("도착" 연출용).
 * 탭이 숨겨진 동안 도착한 개수는 탭 제목에 "(2) Ender Chest" 로 보여 주고, 돌아오면 지운다.
 */
export function useArrivals(items: ItemRow[], ready: boolean): ReadonlySet<string> {
  const seen = useRef<Set<string> | null>(null)
  const fresh = useRef(new Set<string>())
  const unseen = useRef(0)

  if (ready) {
    if (seen.current === null) {
      seen.current = new Set(items.map((i) => i.id))
    } else {
      for (const it of items) {
        if (!seen.current.has(it.id)) {
          seen.current.add(it.id)
          fresh.current.add(it.id)
          if (document.visibilityState === 'hidden') unseen.current += 1
        }
      }
    }
  }

  useEffect(() => {
    document.title = unseen.current > 0 ? `(${unseen.current}) ${APP_TITLE}` : APP_TITLE
  })

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      unseen.current = 0
      document.title = APP_TITLE
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      document.title = APP_TITLE
    }
  }, [])

  return fresh.current
}
