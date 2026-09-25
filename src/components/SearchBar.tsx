import { useEffect, useRef } from 'react'
import { Icon } from './Icon'

interface Props {
  value: string
  onChange: (v: string) => void
}

export function SearchBar({ value, onChange }: Props) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (e.key === '/' && !typing) {
        e.preventDefault()
        ref.current?.focus()
      } else if (e.key === 'Escape' && el === ref.current) {
        onChange('')
        ref.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onChange])

  return (
    <div className="search-wrap">
      <span className="search-icon">
        <Icon name="search" size={16} />
      </span>
      <input
        ref={ref}
        type="search"
        className="search"
        placeholder="검색"
        aria-label="검색"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <kbd className="search-kbd">/</kbd>
    </div>
  )
}
