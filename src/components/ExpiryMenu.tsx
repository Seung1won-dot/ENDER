import { useEffect, useRef, useState } from 'react'
import type { ExtendBy } from '../lib/expiry'
import { Icon } from './Icon'

interface Props {
  /** "6일 남음" 같은 표시 문구 */
  label: string
  /** 1시간 미만이면 경고색 */
  soon: boolean
  onPick: (by: ExtendBy) => void
}

/** 남은 기간 표시 겸 연장 메뉴. 바깥 클릭이나 Esc 로 닫힌다. */
export function ExpiryMenu({ label, soon, onPick }: Props) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (by: ExtendBy) => {
    setOpen(false)
    onPick(by)
  }

  return (
    <span className="meta-wrap" ref={wrap}>
      <button
        type="button"
        className={soon ? 'meta-btn meta-soon' : 'meta-btn'}
        title="만료 바꾸기 (x)"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open && (
        <div className="menu" role="menu" aria-label="만료 바꾸기">
          <button type="button" role="menuitem" className="menu-item" onClick={() => pick('1d')}>
            <Icon name="clock" size={14} />
            1일 연장
          </button>
          <button type="button" role="menuitem" className="menu-item" onClick={() => pick('7d')}>
            <Icon name="clock" size={14} />
            7일 연장
          </button>
          <button type="button" role="menuitem" className="menu-item" onClick={() => pick('never')}>
            <Icon name="pin" size={14} />
            영구 보관
          </button>
        </div>
      )}
    </span>
  )
}
