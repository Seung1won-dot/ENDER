import { useEffect, useRef } from 'react'
import { cleanupExpired } from '../lib/items'
import { messageOf } from '../lib/errors'

const EVERY_MS = 10 * 60 * 1000

/** 만료 정리: 처음 열 때, 그리고 탭으로 돌아올 때 (10분에 한 번까지만). 지운 게 있으면 목록을 다시 읽는다. */
export function useCleanup(reload: () => Promise<void>): void {
  const last = useRef(0)

  useEffect(() => {
    const run = () => {
      if (Date.now() - last.current < EVERY_MS) return
      last.current = Date.now()
      void cleanupExpired()
        .then((n) => (n > 0 ? reload() : undefined))
        .catch((e) => console.warn('cleanupExpired', messageOf(e)))
    }
    run()
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload])
}
