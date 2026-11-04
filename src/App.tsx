import { LazyMotion, MotionConfig } from 'motion/react'
import { useSession } from './hooks/useSession'
import { AuthScreen } from './components/AuthScreen'
import { ChestScreen } from './components/ChestScreen'
import { ToastHost } from './components/ToastHost'
import { Mark } from './components/Icon'
import { T_BASE, loadMotionFeatures } from './lib/motion'

export function App() {
  const session = useSession()

  return (
    // reducedMotion="user": 시스템에서 동작 줄이기를 켜면 이동·크기·레이아웃 애니메이션이 꺼진다.
    <LazyMotion features={loadMotionFeatures} strict>
    <MotionConfig reducedMotion="user" transition={T_BASE}>
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
    </MotionConfig>
    </LazyMotion>
  )
}
