import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'
import { filterItems } from '../lib/itemsState'
import { useItems } from '../hooks/useItems'
import { useStoredExpiry } from '../hooks/useStoredExpiry'
import { usePaste } from '../hooks/usePaste'
import { useDropzone } from '../hooks/useDropzone'
import { useThumbUrls } from '../hooks/useSignedUrl'
import { ItemList } from './ItemList'
import { Composer } from './Composer'
import { DropOverlay } from './DropOverlay'
import { SearchBar } from './SearchBar'
import { SettingsDialog } from './SettingsDialog'
import type { ItemAction } from './ItemCard'

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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [, setDeviceTick] = useState(0)
  const thumbUrls = useThumbUrls(items)

  useEffect(() => {
    void cleanupExpired()
      .then((n) => (n > 0 ? reload() : undefined))
      .catch((e) => console.warn('cleanupExpired', messageOf(e)))
  }, [reload])

  const visible = useMemo(() => filterItems(items, query), [items, query])

  const submitText = useCallback(
    async (text: string) => {
      setBusy(true)
      try {
        const row = await addTextItem({ text, source: getDeviceName(), expiresAt: computeExpiresAt(expiry) })
        upsertLocal(row)
      } catch (e) {
        toast.error(`넣지 못했어요: ${messageOf(e)}`)
      } finally {
        setBusy(false)
      }
    },
    [expiry, upsertLocal],
  )

  const submitFiles = useCallback(
    (files: File[]) => {
      void (async () => {
        setBusy(true)
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
          setBusy(false)
        }
      })()
    },
    [expiry, userId, upsertLocal],
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
              if (item.content) window.open(item.content, '_blank', 'noopener,noreferrer')
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
              if (!window.confirm('이 아이템을 삭제할까요?')) return
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
    <main className="screen">
      <header className="topbar">
        <h1>
          📦 Ender Chest <span className={`dot dot-${status}`} title={status} />
        </h1>
        <div className="row">
          <SearchBar value={query} onChange={setQuery} />
          <button className="ghost" title="설정" onClick={() => setSettingsOpen(true)}>
            ⚙
          </button>
        </div>
      </header>

      <Composer
        expiry={expiry}
        onExpiryChange={setExpiry}
        onSubmitText={submitText}
        onPickFiles={submitFiles}
        busy={busy}
      />

      {query && visible.length === 0 && !loading ? (
        <p className="dim">"{query}" 에 맞는 아이템이 없어요.</p>
      ) : (
        <ItemList items={visible} loading={loading} canShare={canShare} thumbUrls={thumbUrls} onAction={onAction} />
      )}

      <DropOverlay active={dragging} />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        email={session.user.email ?? ''}
        expiry={expiry}
        onExpiryChange={setExpiry}
        onDeviceChange={() => setDeviceTick((t) => t + 1)}
      />
    </main>
  )
}
