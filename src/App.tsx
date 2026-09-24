import { useSession } from './hooks/useSession'
import { AuthScreen } from './components/AuthScreen'
import { ChestScreen } from './components/ChestScreen'
import { ToastHost } from './components/ToastHost'

export function App() {
  const session = useSession()

  return (
    <>
      {session === undefined ? (
        <main className="screen">
          <p className="dim">불러오는 중…</p>
        </main>
      ) : session ? (
        <ChestScreen session={session} />
      ) : (
        <AuthScreen />
      )}
      <ToastHost />
    </>
  )
}
