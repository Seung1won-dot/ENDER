import { useEffect, useRef, useState } from 'react'
import { subscribeToasts, toast, type ToastMessage } from '../lib/toast'
import { Icon } from './Icon'

const DEFAULT_TTL_MS = 3500

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
  const timers = useRef(new Map<number, number>())

  useEffect(() => {
    const remove = (id: number) => {
      const t = timers.current.get(id)
      if (t !== undefined) window.clearTimeout(t)
      timers.current.delete(id)
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }
    const unsubscribe = subscribeToasts((ev) => {
      if (ev.type === 'dismiss') {
        remove(ev.id)
        return
      }
      const t = ev.toast
      setToasts((prev) => [...prev, t])
      timers.current.set(
        t.id,
        window.setTimeout(() => remove(t.id), t.ttlMs ?? DEFAULT_TTL_MS),
      )
    })
    const pending = timers.current
    return () => {
      unsubscribe()
      pending.forEach((t) => window.clearTimeout(t))
      pending.clear()
    }
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
          <span className="toast-text">{t.text}</span>
          {t.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                t.action?.onClick()
                toast.dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
