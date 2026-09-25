import { useCallback, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { addFileItem, addTextItem, type ItemRow } from '../lib/items'
import { validateFile } from '../lib/files'
import { computeExpiresAt } from '../lib/expiry'
import { getDeviceName } from '../lib/device'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'
import { clearItemsCache } from '../lib/cache'
import { enrichLinkTitle } from '../lib/preview'
import { getTheme, setTheme, type Theme } from '../lib/theme'
import { countByKind, filterByKind, filterItems, type KindFilter } from '../lib/itemsState'
import { useItems, type LiveStatus } from '../hooks/useItems'
import { markLogout } from '../hooks/useSession'
import { useItemActions } from '../hooks/useItemActions'
import { useArrivals } from '../hooks/useArrivals'
import { useCleanup } from '../hooks/useCleanup'
import { useOnline } from '../hooks/useOnline'
import { useStoredExpiry } from '../hooks/useStoredExpiry'
import { usePaste } from '../hooks/usePaste'
import { useDropzone } from '../hooks/useDropzone'
import { useThumbUrls } from '../hooks/useSignedUrl'
import { TopBar } from './TopBar'
import { ItemList } from './ItemList'
import { Composer } from './Composer'
import { DropOverlay } from './DropOverlay'
import { FilterChips } from './FilterChips'
import { SettingsDialog } from './SettingsDialog'
import { Icon } from './Icon'

const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

export function ChestScreen({ session }: { session: Session }) {
  const userId = session.user.id
  const { items, loading, stale, error, status, reload, upsertLocal, removeLocal, patchLocal } = useItems(userId)
  const online = useOnline()
  const [expiry, setExpiry] = useStoredExpiry()
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const thumbUrls = useThumbUrls(items)
  const pending = useRef(0)
  const onAction = useItemActions({ upsertLocal, removeLocal, patchLocal, reload })
  const freshIds = useArrivals(items, !stale)
  useCleanup(reload)

  const beginWork = useCallback(() => {
    pending.current += 1
    setBusy(true)
  }, [])
  const endWork = useCallback(() => {
    pending.current = Math.max(0, pending.current - 1)
    if (pending.current === 0) setBusy(false)
  }, [])

  const searched = useMemo(() => filterItems(items, query), [items, query])
  const counts = useMemo(() => countByKind(searched), [searched])
  const visible = useMemo(() => filterByKind(searched, kind), [searched, kind])
  const filtered = query.trim() !== '' || kind !== 'all'
  const usedBytes = useMemo(() => items.reduce((sum, i) => sum + (i.file_size ?? 0), 0), [items])

  const clearFilters = useCallback(() => {
    setQuery('')
    setKind('all')
  }, [])

  // 링크는 넣은 뒤 페이지 제목을 가져와 현재 상태에 제목만 덧씌운다 (그 사이 고정·삭제한 것을 되돌리지 않음).
  const enrich = useCallback(
    (row: ItemRow) => {
      void enrichLinkTitle(row).then((r) => r && patchLocal(r.id, { title: r.title }))
    },
    [patchLocal],
  )

  const submitText = useCallback(
    async (text: string) => {
      beginWork()
      try {
        const row = await addTextItem({ text, source: getDeviceName(), expiresAt: computeExpiresAt(expiry) })
        upsertLocal(row)
        if (row.kind === 'link') enrich(row)
      } catch (e) {
        toast.error(`넣지 못했어요: ${messageOf(e)}`)
      } finally {
        endWork()
      }
    },
    [expiry, upsertLocal, enrich, beginWork, endWork],
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

  const changeTheme = useCallback((t: Theme) => {
    setTheme(t)
    setThemeState(t)
  }, [])

  const logout = useCallback(() => {
    markLogout()
    clearItemsCache()
    void supabase.auth.signOut()
  }, [])

  const shownStatus: LiveStatus = online ? status : 'offline'

  return (
    <>
      <TopBar status={shownStatus} query={query} onQueryChange={setQuery} onOpenSettings={() => setSettingsOpen(true)} />

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
          freshIds={freshIds}
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
        theme={theme}
        onThemeChange={changeTheme}
        onLogout={logout}
        usedBytes={usedBytes}
      />
    </>
  )
}
