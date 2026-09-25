import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { addFileItem, addTextItem, cleanupExpired } from '../lib/items'
import { validateFile } from '../lib/files'
import { computeExpiresAt } from '../lib/expiry'
import { getDeviceName } from '../lib/device'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'
import { clearItemsCache } from '../lib/cache'
import { countByKind, filterByKind, filterItems, type KindFilter } from '../lib/itemsState'
import { useItems, type LiveStatus } from '../hooks/useItems'
import { useItemActions } from '../hooks/useItemActions'
import { useOnline } from '../hooks/useOnline'
import { useStoredExpiry } from '../hooks/useStoredExpiry'
import { usePaste } from '../hooks/usePaste'
import { useDropzone } from '../hooks/useDropzone'
import { useThumbUrls } from '../hooks/useSignedUrl'
import { ItemList } from './ItemList'
import { Composer } from './Composer'
import { DropOverlay } from './DropOverlay'
import { SearchBar } from './SearchBar'
import { FilterChips } from './FilterChips'
import { SettingsDialog } from './SettingsDialog'
import { Icon, Mark } from './Icon'

const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
const CLEANUP_EVERY_MS = 10 * 60 * 1000

const STATUS_LABEL: Record<LiveStatus, string> = {
  connecting: '연결 중',
  live: '실시간',
  offline: '오프라인',
}

export function ChestScreen({ session }: { session: Session }) {
  const userId = session.user.id
  const { items, loading, stale, error, status, reload, upsertLocal, removeLocal } = useItems(userId)
  const online = useOnline()
  const [expiry, setExpiry] = useStoredExpiry()
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const thumbUrls = useThumbUrls(items)
  const pending = useRef(0)
  const onAction = useItemActions({ upsertLocal, removeLocal, reload })

  // 서버에서 처음 받은 목록은 그냥 두고, 그 뒤에 나타난 항목만 "도착" 연출 대상으로 기억한다.
  const seen = useRef<Set<string> | null>(null)
  const fresh = useRef(new Set<string>())
  if (!stale) {
    if (seen.current === null) {
      seen.current = new Set(items.map((i) => i.id))
    } else {
      for (const it of items) {
        if (!seen.current.has(it.id)) {
          seen.current.add(it.id)
          fresh.current.add(it.id)
        }
      }
    }
  }

  const beginWork = useCallback(() => {
    pending.current += 1
    setBusy(true)
  }, [])
  const endWork = useCallback(() => {
    pending.current = Math.max(0, pending.current - 1)
    if (pending.current === 0) setBusy(false)
  }, [])

  // 만료 정리: 처음 열 때, 그리고 탭으로 돌아올 때(10분에 한 번까지만).
  const lastCleanup = useRef(0)
  useEffect(() => {
    const run = () => {
      if (Date.now() - lastCleanup.current < CLEANUP_EVERY_MS) return
      lastCleanup.current = Date.now()
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

  const searched = useMemo(() => filterItems(items, query), [items, query])
  const counts = useMemo(() => countByKind(searched), [searched])
  const visible = useMemo(() => filterByKind(searched, kind), [searched, kind])
  const filtered = query.trim() !== '' || kind !== 'all'
  const usedBytes = useMemo(() => items.reduce((sum, i) => sum + (i.file_size ?? 0), 0), [items])

  const clearFilters = useCallback(() => {
    setQuery('')
    setKind('all')
  }, [])

  const submitText = useCallback(
    async (text: string) => {
      beginWork()
      try {
        const row = await addTextItem({ text, source: getDeviceName(), expiresAt: computeExpiresAt(expiry) })
        upsertLocal(row)
      } catch (e) {
        toast.error(`넣지 못했어요: ${messageOf(e)}`)
      } finally {
        endWork()
      }
    },
    [expiry, upsertLocal, beginWork, endWork],
  )

  const submitFiles = useCallback(
    (files: File[]) => {
      void (async () => {
        beginWork()
        try {
          for (const file of files) {
            const problem = validateFile(file)
            if (problem) {
              toast.error(problem)
              continue
            }
            try {
              const row = await addFileItem(file, {
                userId,
                source: getDeviceName(),
                expiresAt: computeExpiresAt(expiry),
              })
              upsertLocal(row)
              toast.info(`${file.name} 넣었어요`)
            } catch (e) {
              toast.error(`${file.name} 업로드 실패: ${messageOf(e)}`)
            }
          }
        } finally {
          endWork()
        }
      })()
    },
    [expiry, userId, upsertLocal, beginWork, endWork],
  )

  const pasteText = useCallback((text: string) => void submitText(text), [submitText])
  usePaste(pasteText, submitFiles)
  const dragging = useDropzone(submitFiles)

  const logout = useCallback(() => {
    clearItemsCache()
    void supabase.auth.signOut()
  }, [])

  const shownStatus: LiveStatus = online ? status : 'offline'

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <Mark size={22} />
            <h1 className="brand-name">Ender Chest</h1>
          </div>
          <span className={`status status-${shownStatus}`} title={STATUS_LABEL[shownStatus]} role="status">
            <span className="status-dot" />
            <span className="status-label">{STATUS_LABEL[shownStatus]}</span>
          </span>
          <span className="spacer" />
          <SearchBar value={query} onChange={setQuery} />
          <button className="icon-btn" title="설정" aria-label="설정" onClick={() => setSettingsOpen(true)}>
            <Icon name="sliders" size={18} />
          </button>
        </div>
      </header>

      <main className="screen">
        <Composer
          expiry={expiry}
          onExpiryChange={setExpiry}
          onSubmitText={submitText}
          onPickFiles={submitFiles}
          busy={busy}
        />

        <FilterChips value={kind} counts={counts} onChange={setKind} />

        {items.length > 0 && !online && (
          <div className="banner" role="status">
            <Icon name="offline" size={16} />
            오프라인이에요. 마지막으로 본 목록을 보여 줘요.
          </div>
        )}
        {items.length > 0 && online && error && (
          <div className="banner banner-error" role="alert">
            <Icon name="alert" size={16} />
            목록을 새로 불러오지 못했어요.
            <button type="button" className="btn btn-ghost" onClick={() => void reload()}>
              <Icon name="refresh" size={14} />
              다시 시도
            </button>
          </div>
        )}

        <ItemList
          items={visible}
          loading={loading}
          error={error}
          online={online}
          filtered={filtered}
          canShare={canShare}
          thumbUrls={thumbUrls}
          freshIds={fresh.current}
          onAction={onAction}
          onClearFilters={clearFilters}
          onRetry={() => void reload()}
        />
      </main>

      <DropOverlay active={dragging} />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        email={session.user.email ?? ''}
        expiry={expiry}
        onExpiryChange={setExpiry}
        onDeviceChange={(name) => toast.info(`기기 이름: ${name}`)}
        onLogout={logout}
        usedBytes={usedBytes}
      />
    </>
  )
}
