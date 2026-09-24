import { useCallback, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { addFileItem, addTextItem, type ItemRow } from '../lib/items'
import { validateFile } from '../lib/files'
import { computeExpiresAt } from '../lib/expiry'
import { getDeviceName } from '../lib/device'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'
import { useItems } from '../hooks/useItems'
import { useStoredExpiry } from '../hooks/useStoredExpiry'
import { usePaste } from '../hooks/usePaste'
import { useDropzone } from '../hooks/useDropzone'
import { ItemList } from './ItemList'
import { Composer } from './Composer'
import { DropOverlay } from './DropOverlay'
import type { ItemAction } from './ItemCard'

export function ChestScreen({ session }: { session: Session }) {
  const userId = session.user.id
  const { items, loading, status, upsertLocal } = useItems(userId)
  const [expiry, setExpiry] = useStoredExpiry()
  const [busy, setBusy] = useState(false)

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

  const onAction = useCallback((action: ItemAction, item: ItemRow) => {
    console.log('action', action, item.id)
  }, [])

  return (
    <main className="screen">
      <header className="topbar">
        <h1>
          📦 Ender Chest <span className={`dot dot-${status}`} title={status} />
        </h1>
        <button className="ghost" onClick={() => void supabase.auth.signOut()}>
          로그아웃
        </button>
      </header>

      <Composer
        expiry={expiry}
        onExpiryChange={setExpiry}
        onSubmitText={submitText}
        onPickFiles={submitFiles}
        busy={busy}
      />

      <ItemList items={items} loading={loading} canShare={false} thumbUrls={{}} onAction={onAction} />
      <DropOverlay active={dragging} />
    </main>
  )
}
