import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function ChestScreen({ session }: { session: Session }) {
  return (
    <main className="screen">
      <header className="topbar">
        <h1>📦 Ender Chest</h1>
        <button className="ghost" onClick={() => void supabase.auth.signOut()}>
          로그아웃
        </button>
      </header>
      <p className="dim">{session.user.email} 로 로그인됨. 상자는 비어 있어요.</p>
    </main>
  )
}
