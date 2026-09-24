import { useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { ItemRow } from '../lib/items'
import { useItems } from '../hooks/useItems'
import { ItemList } from './ItemList'
import type { ItemAction } from './ItemCard'

export function ChestScreen({ session }: { session: Session }) {
  const userId = session.user.id
  const { items, loading, status } = useItems(userId)

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

      <ItemList items={items} loading={loading} canShare={false} thumbUrls={{}} onAction={onAction} />
    </main>
  )
}
