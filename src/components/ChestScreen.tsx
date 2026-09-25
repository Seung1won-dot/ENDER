import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  addFileItem,
  addTextItem,
  cleanupExpired,
  deleteItem,
  getDownloadUrl,
  getSignedUrl,
  setPinned,
  type ItemRow,
} from '../lib/items'
import { validateFile } from '../lib/files'
import { computeExpiresAt } from '../lib/expiry'
import { getDeviceName } from '../lib/device'
import { isSafeHttpUrl } from '../lib/detect'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'
import { countByKind, filterByKind, filterItems, type KindFilter } from '../lib/itemsState'
import { useItems, type LiveStatus } from '../hooks/useItems'
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
import type { ItemAction } from './ItemRowView'

const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

const STATUS_LABEL: Record<LiveStatus, string> = {
  connecting: '연결 중',
  live: '실시간',
  offline: '오프라인',
}

async function shareItem(item: ItemRow): Promise<void> {
  if (item.kind === 'file' && item.file_path) {
    const url = await getSignedUrl(item.file_path)
    const blob = await (await fetch(url)).blob()
    const file = new File([blob], item.file_name ?? 'file', { type: item.mime_type ?? blob.type })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: item.file_name ?? undefined })
      return
    }
    await navigator.share({ title: item.file_name ?? undefined, url })
    return
  }
  if (item.kind === 'link' && item.content) {
    await navigator.share({ title: item.title ?? undefined, url: item.content })
    return
  }
  await navigator.share({ text: item.content ?? '' })
}

export function ChestScreen({ session }: { session: Session }) {
  const userId = session.user.id
  const { items, loading, status, reload, upsertLocal, removeLocal } = useItems(userId)
  const [expiry, setExpiry] = useStoredExpiry()
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const thumbUrls = useThumbUrls(items)
  const pending = useRef(0)

  // 첫 화면에 있던 항목은 그냥 두고, 그 뒤에 나타난 항목만 "도착" 연출 대상으로 기억한다.
  const seen = useRef<Set<string> | null>(null)
  const fresh = useRef(new Set<string>())
  if (!loading) {
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

  useEffect(() => {
    void cleanupExpired()
      .then((n) => (n > 0 ? reload() : undefined))
      .catch((e) => console.warn('cleanupExpired', messageOf(e)))
  }, [reload])

  const searched = useMemo(() => filterItems(items, query), [items, query])
  const counts = useMemo(() => countByKind(searched), [searched])
  const visible = useMemo(() => filterByKind(searched, kind), [searched, kind])
  const filtered = query.trim() !== '' || kind !== 'all'

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

  const onAction = useCallback(
    (action: ItemAction, item: ItemRow) => {
      void (async () => {
        try {
          switch (action) {
            case 'copy':
              await navigator.clipboard.writeText(item.content ?? '')
              toast.info('복사했어요')
              break
            case 'open':
              if (item.content && isSafeHttpUrl(item.content)) {
                window.open(item.content, '_blank', 'noopener,noreferrer')
              }
              break
            case 'download': {
              if (!item.file_path) return
              const url = await getDownloadUrl(item.file_path, item.file_name ?? 'file')
              const a = document.createElement('a')
              a.href = url
              a.download = item.file_name ?? 'file'
              a.rel = 'noopener'
              document.body.appendChild(a)
              a.click()
              a.remove()
              break
            }
            case 'share':
              await shareItem(item)
              break
            case 'pin':
              upsertLocal({ ...item, pinned: !item.pinned })
              await setPinned(item.id, !item.pinned)
              break
            case 'delete':
              if (!window.confirm('이 항목을 삭제할까요?')) return
              removeLocal(item.id)
              await deleteItem(item)
              break
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
          toast.error(messageOf(e))
          void reload()
        }
      })()
    },
    [upsertLocal, removeLocal, reload],
  )

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <Mark size={22} />
            <h1 className="brand-name">Ender Chest</h1>
          </div>
          <span className={`status status-${status}`} title={STATUS_LABEL[status]} role="status">
            <span className="status-dot" />
            <span className="status-label">{STATUS_LABEL[status]}</span>
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

        <ItemList
          items={visible}
          loading={loading}
          filtered={filtered}
          canShare={canShare}
          thumbUrls={thumbUrls}
          freshIds={fresh.current}
          onAction={onAction}
          onClearFilters={clearFilters}
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
      />
    </>
  )
}
