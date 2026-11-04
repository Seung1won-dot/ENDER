import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { subscribeToasts, type ToastMessage } from '../lib/toast'
import { EASE, T_LAYOUT } from '../lib/motion'
import { Icon } from './Icon'

const TTL_MS = 3500

function isPopoverOpen(el: HTMLElement): boolean {
  try {
    return el.matches(':popover-open')
  } catch {
    return false
  }
}

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return subscribeToasts((t) => {
      setToasts((prev) => [...prev, t])
      window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), TTL_MS)
    })
  }, [])

  // popover 로 띄우면 <dialog> 가 열려 있어도 그 위(top layer)에 보인다. 미지원 브라우저는 일반 fixed 요소로 동작.
  useEffect(() => {
    const el = ref.current
    if (!el || typeof el.showPopover !== 'function') return
    if (toasts.length > 0 && !isPopoverOpen(el)) el.showPopover()
  }, [toasts.length])

  // 마지막 토스트가 사라지는 연출이 끝난 뒤에 popover 를 닫는다.
  function onExitComplete() {
    const el = ref.current
    if (el && toasts.length === 0 && typeof el.hidePopover === 'function' && isPopoverOpen(el)) el.hidePopover()
  }

  return (
    <div ref={ref} popover="manual" className="toast-host" role="status" aria-live="polite">
      <AnimatePresence initial={false} onExitComplete={onExitComplete}>
        {toasts.map((t) => (
          <m.div
            key={t.id}
            layout="position"
            className={`toast toast-${t.level}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4, transition: { duration: 0.16, ease: EASE } }}
            transition={{ duration: 0.2, ease: EASE, layout: T_LAYOUT }}
          >
            <Icon name={t.level === 'error' ? 'alert' : 'check'} size={18} />
            {t.text}
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
