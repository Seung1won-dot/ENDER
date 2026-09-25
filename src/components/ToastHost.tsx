import { useEffect, useRef, useState } from 'react'
import { subscribeToasts, type ToastMessage } from '../lib/toast'
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

  if (toasts.length === 0) return null
  return (
    <div ref={ref} popover="manual" className="toast-host" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.level}`}>
          <Icon name={t.level === 'error' ? 'alert' : 'check'} size={18} />
          {t.text}
        </div>
      ))}
    </div>
  )
}
