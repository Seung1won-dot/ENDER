import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { cleanupExpired } from '../lib/items'
import { createSupabaseApi } from '../lib/supabaseApi'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'
import { useItems } from '../hooks/useItems'
import { useStoredExpiry } from '../hooks/useStoredExpiry'
import { ChestView } from './ChestView'
import { SettingsDialog } from './SettingsDialog'

export function ChestScreen({ session }: { session: Session }) {
  const userId = session.user.id
  const { items, loading, error, status, reload, upsertLocal, removeLocal } = useItems(userId)
  const api = useMemo(() => createSupabaseApi(userId), [userId])
  const [expiry, setExpiry] = useStoredExpiry()
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    void cleanupExpired()
      .then((n) => (n > 0 ? reload() : undefined))
      // 만료 정리는 다음 로드 때 다시 시도하면 되므로 화면에는 알리지 않는다.
      .catch((e) => {
        if (import.meta.env.DEV) console.warn('cleanupExpired', messageOf(e))
      })
  }, [reload])

  return (
    <>
      <ChestView
        items={items}
        loading={loading}
        error={error}
        status={status}
        reload={reload}
        upsertLocal={upsertLocal}
        removeLocal={removeLocal}
        api={api}
        email={session.user.email ?? ''}
        expiry={expiry}
        onExpiryChange={setExpiry}
        onOpenSettings={() => setSettingsOpen(true)}
      />
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
