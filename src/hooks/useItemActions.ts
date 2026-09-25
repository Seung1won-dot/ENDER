import { useCallback, useEffect, useRef } from 'react'
import {
  buildTextUpdate,
  deleteItem,
  fetchFileBlob,
  getDownloadUrl,
  getSignedUrl,
  setExpiresAt,
  setPinned,
  updateTextItem,
  type ItemRow,
} from '../lib/items'
import { isImageMime, toPngBlob } from '../lib/files'
import { extendExpiresAt } from '../lib/expiry'
import { isSafeHttpUrl } from '../lib/detect'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'
import type { ActionExtra, ItemAction } from '../components/ItemRowView'

export const UNDO_MS = 5000

interface Deps {
  upsertLocal: (row: ItemRow) => void
  removeLocal: (id: string) => void
  reload: () => Promise<void>
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

/** 이미지 항목을 클립보드에 PNG 로 넣는다. Safari 는 사용자 동작 안에서 write 가 시작돼야 해서 Promise 형을 먼저 쓴다. */
async function copyImage(item: ItemRow): Promise<void> {
  if (!item.file_path) return
  if (typeof ClipboardItem === 'undefined') throw new Error('이 브라우저는 이미지 복사를 지원하지 않아요')
  const png = fetchFileBlob(item.file_path).then(toPngBlob)
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
  } catch (e) {
    if (!(e instanceof TypeError)) throw e
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': await png })])
  }
}

function download(url: string, name: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** 항목 한 줄의 동작들. 삭제는 5초 유예 후 실제로 지우고 그 사이 되돌릴 수 있다. */
export function useItemActions({ upsertLocal, removeLocal, reload }: Deps) {
  const pendingDeletes = useRef(new Map<string, number>())

  // 화면을 떠나면(로그아웃 등) 유예 중인 삭제는 취소한다. 지워지지 않는 쪽이 안전하다.
  useEffect(() => {
    const pending = pendingDeletes.current
    return () => {
      pending.forEach((t) => window.clearTimeout(t))
      pending.clear()
    }
  }, [])

  const scheduleDelete = useCallback(
    (item: ItemRow) => {
      const prev = pendingDeletes.current.get(item.id)
      if (prev !== undefined) window.clearTimeout(prev)
      removeLocal(item.id)
      const timer = window.setTimeout(() => {
        pendingDeletes.current.delete(item.id)
        deleteItem(item).catch((e) => {
          toast.error(`삭제하지 못했어요: ${messageOf(e)}`)
          upsertLocal(item)
        })
      }, UNDO_MS)
      pendingDeletes.current.set(item.id, timer)
      toast.action(
        '삭제했어요',
        {
          label: '되돌리기',
          onClick: () => {
            window.clearTimeout(timer)
            pendingDeletes.current.delete(item.id)
            upsertLocal(item)
          },
        },
        UNDO_MS,
      )
    },
    [removeLocal, upsertLocal],
  )

  return useCallback(
    (action: ItemAction, item: ItemRow, extra?: ActionExtra) => {
      void (async () => {
        try {
          switch (action) {
            case 'copy':
              if (item.kind === 'file') {
                if (!isImageMime(item.mime_type)) return
                await copyImage(item)
                toast.info('이미지를 복사했어요')
              } else {
                await navigator.clipboard.writeText(item.content ?? '')
                toast.info('복사했어요')
              }
              break
            case 'open':
              if (item.content && isSafeHttpUrl(item.content)) {
                window.open(item.content, '_blank', 'noopener,noreferrer')
              }
              break
            case 'download':
              if (!item.file_path) return
              download(await getDownloadUrl(item.file_path, item.file_name ?? 'file'), item.file_name ?? 'file')
              break
            case 'share':
              await shareItem(item)
              break
            case 'pin':
              upsertLocal({ ...item, pinned: !item.pinned })
              await setPinned(item.id, !item.pinned)
              break
            case 'delete':
              scheduleDelete(item)
              break
            case 'extend': {
              if (!extra?.by) return
              const next = extendExpiresAt(item.expires_at, extra.by)
              upsertLocal({ ...item, expires_at: next })
              await setExpiresAt(item.id, next)
              toast.info(next === null ? '영구 보관으로 바꿨어요' : '만료를 연장했어요')
              break
            }
            case 'edit': {
              if (!extra?.text) return
              upsertLocal({ ...item, ...buildTextUpdate(extra.text) })
              upsertLocal(await updateTextItem(item.id, extra.text))
              break
            }
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
          toast.error(messageOf(e))
          void reload()
        }
      })()
    },
    [upsertLocal, reload, scheduleDelete],
  )
}
