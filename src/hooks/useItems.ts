import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { ITEMS_TABLE, listItems, type ItemRow } from '../lib/items'
import { isExpired, mergeItem, withoutItem } from '../lib/itemsState'
import { readItemsCache, writeItemsCache } from '../lib/cache'
import { pendingDeletes } from '../lib/pendingDeletes'
import { messageOf } from '../lib/errors'

export type LiveStatus = 'connecting' | 'live' | 'offline'

export function useItems(userId: string) {
  // 마지막으로 본 목록이 기기에 있으면 스켈레톤 대신 그것부터 보여 준다.
  const [items, setItems] = useState<ItemRow[]>(() => readItemsCache(userId).filter((i) => !isExpired(i)))
  const [loading, setLoading] = useState(items.length === 0)
  /** 서버에서 한 번도 못 받아 온 상태(캐시만 보고 있음) */
  const [stale, setStale] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<LiveStatus>('connecting')
  const reloading = useRef(false)
  const again = useRef(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // 재조회 중에 또 요청이 오면 버리지 않고 끝난 뒤 한 번 더 돈다.
  const reload = useCallback(async () => {
    if (reloading.current) {
      again.current = true
      return
    }
    reloading.current = true
    try {
      do {
        again.current = false
        const list = await listItems()
        setItems(list.filter((i) => !pendingDeletes.has(i.id)))
      } while (again.current)
      setError(null)
      setStale(false)
    } catch (e) {
      setError(messageOf(e))
    } finally {
      reloading.current = false
      setLoading(false)
    }
  }, [])

  const upsertLocal = useCallback((row: ItemRow) => {
    if (pendingDeletes.has(row.id)) return // 삭제 유예 중인 행은 Realtime 이 되살리지 않는다
    setItems((prev) => mergeItem(prev, row))
  }, [])
  const removeLocal = useCallback((id: string) => setItems((prev) => withoutItem(prev, id)), [])
  /** 현재 상태의 행에 일부 값만 덧씌운다. 행이 이미 없으면(삭제됨) 아무것도 하지 않는다. */
  const patchLocal = useCallback((id: string, patch: Partial<ItemRow>) => {
    setItems((prev) => {
      const cur = prev.find((x) => x.id === id)
      return cur ? mergeItem(prev, { ...cur, ...patch }) : prev
    })
  }, [])

  // 서버에서 받은 뒤로는 바뀔 때마다 기기에 남긴다.
  useEffect(() => {
    if (!stale) writeItemsCache(userId, items)
  }, [userId, items, stale])

  // 채널을 (다시) 구독한다. 이전 채널의 늦은 상태 콜백은 무시한다.
  const subscribe = useCallback(() => {
    if (channelRef.current) void supabase.removeChannel(channelRef.current)

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
        if (channelRef.current !== channel) return
        if (s === 'SUBSCRIBED') {
          setStatus('live')
          void reload()
        } else if (s === 'CLOSED' || s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
          setStatus('offline')
        } else {
          setStatus('connecting')
        }
      })
    channelRef.current = channel
  }, [userId, reload, upsertLocal, removeLocal])

  useEffect(() => {
    void reload()
    subscribe()

    // 절전에서 깨거나 탭으로 돌아왔을 때: 끊긴 채널이면 다시 구독하고, 어쨌든 전체를 다시 읽는다.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const ch = channelRef.current
      if (!ch || String(ch.state) !== 'joined') subscribe()
      void reload()
    }
    const onOnline = () => {
      subscribe()
      void reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      if (channelRef.current) void supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [userId, reload, subscribe])

  return { items, loading, stale, error, status, reload, removeLocal, upsertLocal, patchLocal }
}
