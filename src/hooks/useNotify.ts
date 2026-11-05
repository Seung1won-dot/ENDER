import { useCallback, useEffect, useRef, useState } from 'react'
import type { ItemRow } from '../lib/items'
import { itemTitle } from '../lib/preview'

export const NOTIFY_KEY = 'ec.notify'
const BASE_TITLE = 'Ender Chest'

export function notifySupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function readNotifyPref(): boolean {
  try {
    return localStorage.getItem(NOTIFY_KEY) === '1'
  } catch {
    return false
  }
}

export function writeNotifyPref(on: boolean): void {
  try {
    if (on) localStorage.setItem(NOTIFY_KEY, '1')
    else localStorage.removeItem(NOTIFY_KEY)
  } catch {
    /* 저장 실패는 무시 */
  }
}

/**
 * 다른 기기에서 새 항목이 들어오면
 * - 창이 가려져 있을 때 탭 제목에 개수를 붙이고 (설정에서 켰으면) 시스템 알림을 띄운다.
 * - 아직 보지 않은 항목 id 를 돌려줘서 목록이 "새 항목" 점을 찍게 한다.
 */
export function useArrivals(items: ItemRow[], loading: boolean, myDevice: string) {
  const known = useRef<Set<string> | null>(null)
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const hiddenCount = useRef(0)

  useEffect(() => {
    if (loading) return
    if (known.current === null) {
      known.current = new Set(items.map((i) => i.id))
      return
    }
    const arrived = items.filter((i) => !known.current!.has(i.id))
    for (const i of items) known.current.add(i.id)
    const remote = arrived.filter(
      (i) => (i.source ?? '') !== myDevice && Date.now() - new Date(i.created_at).getTime() < 5 * 60_000,
    )
    if (remote.length === 0) return

    setFresh((prev) => {
      const next = new Set(prev)
      for (const i of remote) next.add(i.id)
      return next
    })

    if (document.visibilityState === 'hidden') {
      hiddenCount.current += remote.length
      document.title = `(${hiddenCount.current}) ${BASE_TITLE}`
      if (readNotifyPref() && notifySupported() && Notification.permission === 'granted') {
        const first = remote[0]!
        const body =
          remote.length === 1 ? itemTitle(first) : `${itemTitle(first)} 외 ${remote.length - 1}개`
        try {
          const n = new Notification(`${first.source ?? '다른 기기'}에서 넣었어요`, {
            body,
            tag: 'ender-chest-arrival',
            icon: '/icons/icon-192.png',
          })
          n.onclick = () => {
            window.focus()
            n.close()
          }
        } catch {
          /* 일부 브라우저(모바일)는 페이지에서 직접 알림을 만들 수 없다 */
        }
      }
    }
  }, [items, loading, myDevice])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        hiddenCount.current = 0
        document.title = BASE_TITLE
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const markSeen = useCallback(
    (id: string) =>
      setFresh((prev) => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      }),
    [],
  )

  return { fresh, markSeen }
}
