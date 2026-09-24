import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { ITEMS_TABLE, listItems, type ItemRow } from '../lib/items'
import { mergeItem, withoutItem } from '../lib/itemsState'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'

export type LiveStatus = 'connecting' | 'live' | 'offline'

export function useItems(userId: string) {
  const [items, setItems] = useState<ItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<LiveStatus>('connecting')
  const reloading = useRef(false)

  const reload = useCallback(async () => {
    if (reloading.current) return
    reloading.current = true
    try {
      setItems(await listItems())
    } catch (e) {
      toast.error(`목록을 불러오지 못했어요: ${messageOf(e)}`)
    } finally {
      reloading.current = false
      setLoading(false)
    }
  }, [])

  const upsertLocal = useCallback((row: ItemRow) => setItems((prev) => mergeItem(prev, row)), [])
  const removeLocal = useCallback((id: string) => setItems((prev) => withoutItem(prev, id)), [])

  useEffect(() => {
    void reload()

    const onChange = (payload: RealtimePostgresChangesPayload<ItemRow>) => {
      if (payload.eventType === 'DELETE') {
        const old = payload.old as Partial<ItemRow>
        if (old.id) removeLocal(old.id)
        return
      }
      upsertLocal(payload.new as ItemRow)
    }

    const channel = supabase
      .channel(`items:${userId}`)
      .on<ItemRow>(
        'postgres_changes',
        { event: '*', schema: 'public', table: ITEMS_TABLE, filter: `user_id=eq.${userId}` },
        onChange,
      )
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          setStatus('live')
          void reload()
        } else if (s === 'CLOSED' || s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
          setStatus('offline')
        } else {
          setStatus('connecting')
        }
      })

    const onVisible = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [userId, reload, upsertLocal, removeLocal])

  return { items, loading, status, reload, removeLocal, upsertLocal }
}
