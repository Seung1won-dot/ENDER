import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { ExtendBy } from '../lib/expiry'
import { Icon } from './Icon'

interface Props {
  /** "6일 남음" 같은 표시 문구 */
  label: string
  /** 1시간 미만이면 경고색 */
  soon: boolean
  onPick: (by: ExtendBy) => void
}

const OPTIONS: ReadonlyArray<{ by: ExtendBy; label: string; icon: 'clock' | 'pin' }> = [
  { by: '1d', label: '1일 연장', icon: 'clock' },
  { by: '7d', label: '7일 연장', icon: 'clock' },
  { by: 'never', label: '영구 보관', icon: 'pin' },
]

/** 남은 기간 표시 겸 연장 메뉴. 열리면 첫 항목에 포커스, ↑↓ 이동, Esc·바깥 클릭으로 닫히며 트리거로 돌아온다. */
export function ExpiryMenu({ label, soon, onPick }: Props) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLSpanElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }
  const pick = (by: ExtendBy) => {
    close()
    onPick(by)
  }
  function onMenuKey(e: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(i + 1) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i - 1 + items.length) % items.length]?.focus()
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault()
      close()
    }
  }

  return (
    <span className="meta-wrap" ref={wrap}>
      <button
        ref={trigger}
        type="button"
        className={soon ? 'meta-btn meta-soon' : 'meta-btn'}
        title="만료 바꾸기 (x)"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) close()
        }}
      >
        {label}
      </button>
      {open && (
        <div ref={menu} className="menu" role="menu" aria-label="만료 바꾸기" onKeyDown={onMenuKey}>
          {OPTIONS.map((o) => (
            <button key={o.by} type="button" role="menuitem" className="menu-item" onClick={() => pick(o.by)}>
              <Icon name={o.icon} size={14} />
              {o.label}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}
