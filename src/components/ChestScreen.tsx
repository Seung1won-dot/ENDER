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
import { useItems } from '../hooks/useItems'
import { useStoredExpiry } from '../hooks/useStoredExpiry'
import { usePaste } from '../hooks/usePaste'
import { useDropzone } from '../hooks/useDropzone'
import { useThumbUrls } from '../hooks/useSignedUrl'
import { ItemList } from './ItemList'
import { Composer } from './Composer'
import { DropOverlay } from './DropOverlay'
import { TopBar } from './TopBar'
import { FilterChips } from './FilterChips'
import { SettingsDialog } from './SettingsDialog'
import type { ItemAction } from './ItemRowView'

const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

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

  // 성공하면 true. 행이 "복사됨" 같은 짧은 확인 표시를 띄울 때 쓴다.
  const onAction = useCallback(
    (action: ItemAction, item: ItemRow): Promise<boolean> => {
      return (async () => {
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
              if (!item.file_path) return false
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
              if (!window.confirm('이 항목을 삭제할까요?')) return false
              removeLocal(item.id)
              await deleteItem(item)
              break
          }
          return true
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return false
          toast.error(messageOf(e))
          void reload()
          return false
        }
      })()
    },
    [upsertLocal, removeLocal, reload],
  )

  return (
    <>
      <TopBar status={status} query={query} onQueryChange={setQuery} onOpenSettings={() => setSettingsOpen(true)} />

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
          filterKey={`${kind}|${query.trim().toLowerCase()}`}
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
