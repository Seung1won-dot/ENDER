import { useSession } from './hooks/useSession'
import { AuthScreen } from './components/AuthScreen'
import { ChestScreen } from './components/ChestScreen'
import { ToastHost } from './components/ToastHost'
import { Mark } from './components/Icon'

export function App() {
  const session = useSession()

  return (
    <>
      {session === undefined ? (
        <div className="boot" role="status" aria-label="불러오는 중">
          <Mark size={32} />
        </div>
      ) : session ? (
        <ChestScreen session={session} />
      ) : (
        <AuthScreen />
      )}
      <ToastHost />
    </>
  )
}
