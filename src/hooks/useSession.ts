import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import { clearItemsCache } from '../lib/cache'

let explicitLogout = false

/** 로그아웃 버튼을 누르기 직전에 호출. 그러면 세션이 사라져도 "만료" 안내를 띄우지 않는다. */
export function markLogout(): void {
  explicitLogout = true
}

export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSession(data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_OUT') {
        // 어떤 이유로든 세션이 끝나면 기기에 남긴 목록 사본은 지운다. 입력 중이던 초안은 세션 저장소에 남는다.
        clearItemsCache()
        if (!explicitLogout) toast.info('로그인이 만료됐어요. 다시 로그인해 주세요.')
        explicitLogout = false
      }
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return session
}
